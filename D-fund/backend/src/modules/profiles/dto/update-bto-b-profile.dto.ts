import { IsArray, IsDateString, IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO pour la mise à jour d'un profil entreprise (BtoB)
 * Tous les champs sont optionnels pour permettre des mises à jour partielles
 */
export class UpdateBtoBProfileDto {
  /** Nom de l'entreprise */
  @IsOptional()
  @IsString()
  companyName?: string;

  /** URL ou chemin du logo de l'entreprise */
  @IsOptional()
  @IsString()
  logo?: string;

  /** URL ou chemin de l'image d'en-tête */
  @IsOptional()
  @IsString()
  headerImage?: string;

  /** Phrase d'accroche de l'entreprise */
  @IsOptional()
  @IsString()
  punchline?: string;

  /** Description courte de l'entreprise */
  @IsOptional()
  @IsString()
  description?: string;

  /** Description détaillée de l'entreprise */
  @IsOptional()
  @IsString()
  longDescription?: string;

  /** URL du site web de l'entreprise */
  @IsOptional()
  @IsUrl()
  website?: string;

  /** URL du profil LinkedIn de l'entreprise */
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  /** Ville où se trouve l'entreprise */
  @IsOptional()
  @IsString()
  city?: string;

  /** Pays où se trouve l'entreprise */
  @IsOptional()
  @IsString()
  country?: string;

  /** Date de fondation de l'entreprise (format ISO 8601) */
  @IsOptional()
  @IsDateString()
  foundationDate?: string;

  /** Stade de développement (Ideation, MVP, Growth, Scale) */
  @IsOptional()
  @IsString()
  developmentStage?: string;

  /** Industries dans lesquelles l'entreprise opère */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  /** Marchés géographiques ciblés par l'entreprise */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketFocus?: string[];
}
