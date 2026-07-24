import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Wraps Supabase Storage for file upload, deletion, and signed-URL generation.
 *
 * The Supabase client is initialised with the service-role key so that operations
 * bypass RLS policies. When `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are not
 * configured the service logs a warning and every method throws until the client is available.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const projectUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!projectUrl || !serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured — file uploads are disabled.',
      );
    } else {
      this.supabase = createClient(projectUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          // Abort any Supabase Storage request that stalls for more than 30 s
          fetch: (url, init) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 30_000);
            return fetch(url, { ...init, signal: controller.signal }).finally(() =>
              clearTimeout(id),
            );
          },
        },
      });
    }
  }

  /**
   * Uploads a file to a Supabase Storage bucket and returns its public URL.
   *
   * Existing files at the same path are overwritten (upsert).
   *
   * @param bucket      - Target bucket name (e.g. 'images', 'avatars').
   * @param path        - Destination path within the bucket.
   * @param file        - File content as a Buffer.
   * @param contentType - MIME type of the file (e.g. 'image/jpeg').
   * @returns Public URL of the uploaded file.
   * @throws InternalServerErrorException when the client is not configured or upload fails.
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.supabase) throw new InternalServerErrorException('Storage service not configured');

    try {
      const { error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, { contentType, upsert: true });

      if (error) {
        this.logger.error(`Failed to upload to ${bucket}/${path}: ${error.message}`);
        throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
      }

      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Deletes a file from a Supabase Storage bucket.
   * "Not found" errors are swallowed because the desired end state (file absent) is already met.
   *
   * @param bucket - Target bucket name.
   * @param path   - Path of the file to remove.
   * @throws InternalServerErrorException on unexpected deletion errors.
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    if (!this.supabase) throw new InternalServerErrorException('Storage service not configured');

    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path]);
      if (error && !error.message.includes('not found')) {
        this.logger.error(`Failed to delete ${bucket}/${path}: ${error.message}`);
        throw new InternalServerErrorException(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Creates a time-limited signed URL for a private file.
   *
   * @param bucket    - Target bucket name.
   * @param path      - Path of the file.
   * @param expiresIn - Validity period in seconds (default: 3600 = 1 hour).
   * @returns Signed URL.
   * @throws InternalServerErrorException when URL generation fails.
   */
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    if (!this.supabase) throw new InternalServerErrorException('Storage service not configured');

    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        this.logger.error(`Failed to create signed URL for ${bucket}/${path}: ${error.message}`);
        throw new InternalServerErrorException(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error(`Error creating signed URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create signed URL');
    }
  }

  /**
   * Returns whether the given MIME type is an allowed image format.
   * Accepted types: JPEG, PNG, WebP, GIF.
   */
  isValidImageType(contentType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(contentType.toLowerCase());
  }

  /**
   * Returns whether the given MIME type is an allowed document or image format.
   * Used for the `attachments` bucket which accepts CVs, portfolios, etc.
   */
  isValidAttachmentType(contentType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedTypes.includes(contentType.toLowerCase());
  }

  /**
   * Verifies the actual file content (magic bytes) matches the declared MIME type.
   * Prevents MIME spoofing: a JS file renamed to .jpg and sent with image/jpeg Content-Type.
   *
   * Checks only the first few bytes — fast and allocation-free.
   */
  isMimeConsistentWithBuffer(buffer: Buffer, declaredMime: string): boolean {
    if (!buffer || buffer.length < 4) return false;
    const mime = declaredMime.toLowerCase();

    // JPEG: FF D8 FF
    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mime === 'image/png') {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    }
    // WebP: RIFF????WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
    if (mime === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    // GIF: GIF87a or GIF89a
    if (mime === 'image/gif') {
      const sig = buffer.toString('ascii', 0, 6);
      return sig === 'GIF87a' || sig === 'GIF89a';
    }
    // PDF: %PDF
    if (mime === 'application/pdf') {
      return buffer.toString('ascii', 0, 4) === '%PDF';
    }
    // DOC (OLE2 Compound): D0 CF 11 E0
    if (mime === 'application/msword') {
      return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    }
    // DOCX (ZIP/PK): 50 4B 03 04
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    }
    // Unknown MIME — reject
    return false;
  }

  /**
   * Generates a unique, path-traversal-safe storage path for an uploaded file.
   *
   * Pattern: `{prefix}/{resourceId}/{timestamp}-{random}.{extension}`
   *
   * @param prefix           - Storage path prefix (e.g. 'opportunities', 'avatars').
   * @param id               - ID of the owning resource.
   * @param mimetypeOrFilename - MIME type used to derive the file extension.
   */
  generateFilePath(prefix: string, id: string, mimetypeOrFilename: string): string {
    const mimeExtMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const extension = mimeExtMap[mimetypeOrFilename] || 'bin';

    // Sanitise prefix and id to prevent path traversal attacks
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');

    return `${safePrefix}/${safeId}/${timestamp}-${random}.${extension}`;
  }
}
