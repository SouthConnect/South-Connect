import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

/**
 * Controller pour la gestion des uploads de fichiers
 * Tous les endpoints nécessitent une authentification JWT
 */
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Upload un fichier image
   * @param file - Fichier uploadé via multipart/form-data
   * @param bucket - Nom du bucket (optionnel, défaut: 'images')
   * @param path - Chemin personnalisé (optionnel, généré automatiquement si non fourni)
   * @returns URL publique du fichier uploadé
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('bucket') bucket?: string,
    @Body('path') path?: string,
    @Body('prefix') prefix?: string,
    @Body('resourceId') resourceId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validation du type de fichier (images uniquement pour l'instant)
    if (!this.storageService.isValidImageType(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: JPEG, PNG, WebP, GIF`,
      );
    }

    // Validation de la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const targetBucket = bucket || 'images';
    let filePath: string;

    if (path) {
      filePath = path;
    } else if (prefix && resourceId) {
      filePath = this.storageService.generateFilePath(prefix, resourceId, file.originalname);
    } else {
      throw new BadRequestException('Either path or (prefix + resourceId) must be provided');
    }

    const publicUrl = await this.storageService.uploadFile(
      targetBucket,
      filePath,
      file.buffer,
      file.mimetype,
    );

    return {
      url: publicUrl,
      path: filePath,
      bucket: targetBucket,
      size: file.size,
      contentType: file.mimetype,
    };
  }

  /**
   * Supprime un fichier
   * @param bucket - Nom du bucket
   * @param path - Chemin du fichier à supprimer
   */
  @Delete('file')
  async deleteFile(@Body('bucket') bucket: string, @Body('path') path: string) {
    if (!bucket || !path) {
      throw new BadRequestException('Bucket and path are required');
    }

    await this.storageService.deleteFile(bucket, path);

    return { message: 'File deleted successfully' };
  }
}
