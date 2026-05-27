import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from './storage.service';

/**
 * Proxies file upload and deletion requests to Supabase Storage.
 * All endpoints require a valid JWT.
 *
 * Files are validated for type (images only) and size (max 5 MB) before being
 * forwarded to the storage layer.
 */
@ApiTags('storage')
@ApiBearerAuth('JWT')
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  /** Maximum accepted file size in bytes (5 MB). */
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  /** Storage buckets that callers are allowed to target. */
  private static readonly ALLOWED_BUCKETS = ['images', 'avatars', 'covers', 'attachments'];

  constructor(private readonly storageService: StorageService) {}

  /**
   * Uploads an image file and returns its public URL.
   *
   * Expects a `multipart/form-data` body with:
   * - `file`       — the image file
   * - `prefix`     — storage path prefix (e.g. 'opportunities', 'avatars')
   * - `resourceId` — ID of the resource that owns this file
   * - `bucket`     — optional target bucket (defaults to 'images')
   *
   * @throws BadRequestException when validation fails.
   */
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('bucket') bucket?: string,
    @Body('prefix') prefix?: string,
    @Body('resourceId') resourceId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const targetBucket = StorageController.ALLOWED_BUCKETS.includes(bucket ?? '') ? (bucket as string) : 'images';

    const isValid = targetBucket === 'attachments'
      ? this.storageService.isValidAttachmentType(file.mimetype)
      : this.storageService.isValidImageType(file.mimetype);

    if (!isValid) {
      const allowed = targetBucket === 'attachments'
        ? 'JPEG, PNG, WebP, PDF, DOC, DOCX'
        : 'JPEG, PNG, WebP, GIF';
      throw new BadRequestException(`Invalid file type. Allowed: ${allowed}`);
    }

    if (!this.storageService.isMimeConsistentWithBuffer(file.buffer, file.mimetype)) {
      throw new BadRequestException('File content does not match its declared type');
    }

    if (file.size > StorageController.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5 MB limit');
    }

    if (!prefix || !resourceId) {
      throw new BadRequestException('prefix and resourceId are required');
    }
    const filePath = this.storageService.generateFilePath(prefix!, resourceId!, file.mimetype);

    const publicUrl = await this.storageService.uploadFile(
      targetBucket,
      filePath,
      file.buffer,
      file.mimetype,
    );

    return { url: publicUrl, path: filePath, bucket: targetBucket, size: file.size };
  }

  /**
   * Deletes a file from storage.
   *
   * The path must begin with the authenticated user's ID so that users can
   * only delete their own files. Paths outside the user's namespace are rejected.
   *
   * @throws BadRequestException when `bucket` or `path` is missing or unauthorised.
   */
  @Delete('file')
  async deleteFile(
    @Body('bucket') bucket: string,
    @Body('path') path: string,
    @CurrentUser() user: any,
  ) {
    if (!bucket || !path) throw new BadRequestException('Bucket and path are required');

    if (!StorageController.ALLOWED_BUCKETS.includes(bucket)) {
      throw new BadRequestException('Invalid bucket');
    }

    if (!path || path.includes('..') || path.includes('//') || !/^[a-zA-Z0-9/_.\-]+$/.test(path)) {
      throw new BadRequestException('Invalid path format');
    }

    // Path format from generateFilePath: {prefix}/{resourceId}/{timestamp}-{random}.{ext}
    // We enforce that resourceId matches the authenticated user's ID.
    const parts = path.split('/');
    if (parts.length < 2 || parts[1] !== user.id) {
      throw new BadRequestException('You are not allowed to delete this file');
    }

    await this.storageService.deleteFile(bucket, path);
    return { message: 'File deleted successfully' };
  }
}
