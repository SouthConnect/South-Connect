import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO pour la mise à jour d'un profil talent (BtoC)
 * Tous les champs sont optionnels pour permettre des mises à jour partielles
 */
export class UpdateBtoCProfileDto {
  /** Description du profil talent */
  @IsOptional()
  @IsString()
  description?: string;

  /** Tags et compétences générales */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Industries d'intérêt */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  /** Marchés géographiques ciblés */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketFocus?: string[];

  /** Langues parlées */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  /** Compétences business */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessSkills?: string[];

  /** Compétences techniques */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techSkills?: string[];

  /** Niveau de séniorité (Junior, Mid, Senior, etc.) */
  @IsOptional()
  @IsString()
  seniorityLevel?: string;

  /** Indique si le talent recherche activement des opportunités */
  @IsOptional()
  @IsBoolean()
  lookingForOpportunities?: boolean;

  /** Accepte le travail en remote */
  @IsOptional()
  @IsBoolean()
  remote?: boolean;

  /** Pays d'intérêt pour les opportunités */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  /** Régions d'intérêt pour les opportunités */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  /** Types d'opportunités recherchées */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opportunityTypes?: string[];
}
