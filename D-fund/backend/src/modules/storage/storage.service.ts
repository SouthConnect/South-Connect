import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service de gestion du stockage de fichiers via Supabase Storage
 * Gère l'upload, la suppression et la génération d'URLs signées pour les fichiers
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly projectUrl: string;
  private readonly serviceRoleKey: string;

  constructor(private readonly configService: ConfigService) {
    this.projectUrl = this.configService.get<string>('SUPABASE_URL');
    this.serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!this.projectUrl || !this.serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured. File uploads will be disabled.',
      );
    } else {
      this.supabase = createClient(this.projectUrl, this.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  /**
   * Upload un fichier dans un bucket Supabase
   * @param bucket - Nom du bucket (ex: 'images', 'avatars', 'files')
   * @param path - Chemin du fichier dans le bucket (ex: 'opportunities/123/image.jpg')
   * @param file - Buffer ou File du fichier à uploader
   * @param contentType - Type MIME du fichier (ex: 'image/jpeg')
   * @returns URL publique du fichier uploadé
   */
  async uploadFile(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    try {
      const { data, error } = await this.supabase.storage.from(bucket).upload(path, file, {
        contentType,
        upsert: true, // Remplace le fichier s'il existe déjà
      });

      if (error) {
        this.logger.error(`Failed to upload file to ${bucket}/${path}: ${error.message}`);
        throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
      }

      // Génère une URL publique (ou signée si besoin)
      const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(path);

      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Supprime un fichier d'un bucket Supabase
   * @param bucket - Nom du bucket
   * @param path - Chemin du fichier à supprimer
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path]);

      if (error) {
        this.logger.error(`Failed to delete file ${bucket}/${path}: ${error.message}`);
        // On ne throw pas d'erreur si le fichier n'existe pas déjà
        if (!error.message.includes('not found')) {
          throw new InternalServerErrorException(`Failed to delete file: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Génère une URL signée pour un fichier privé (valide temporairement)
   * @param bucket - Nom du bucket
   * @param path - Chemin du fichier
   * @param expiresIn - Durée de validité en secondes (défaut: 3600 = 1h)
   * @returns URL signée temporaire
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    try {
      const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

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
   * Valide le type MIME d'un fichier image
   * @param contentType - Type MIME à valider
   * @returns true si c'est une image valide
   */
  isValidImageType(contentType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return allowedTypes.includes(contentType.toLowerCase());
  }

  /**
   * Génère un chemin unique pour un fichier uploadé
   * @param prefix - Préfixe du chemin (ex: 'opportunities', 'avatars')
   * @param id - Identifiant de la ressource (ex: opportunityId, userId)
   * @param filename - Nom original du fichier
   * @returns Chemin unique (ex: 'opportunities/123/abc123-image.jpg')
   */
  generateFilePath(prefix: string, id: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = filename.split('.').pop() || 'jpg';
    return `${prefix}/${id}/${timestamp}-${random}.${extension}`;
  }
}
