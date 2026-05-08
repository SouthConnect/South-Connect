import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** AI prompt shown to the seeker (applicant) */
  @IsOptional()
  @IsString()
  aiPrompt?: string;

  /** Label for the person seeking this opportunity (e.g. "Candidat", "Investisseur") */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  seekerName?: string;

  /** Label for the person creating this opportunity (e.g. "Recruteur", "Startup") */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  creatorName?: string;

  /** Context description shown to the seeker */
  @IsOptional()
  @IsString()
  seekerScenario?: string;

  /** Context description shown to the creator */
  @IsOptional()
  @IsString()
  creatorScenario?: string;

  /** How the opportunities of this type are displayed (Post, Gallery, Map…) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayType?: string;

  /** When true, users can interact with the opportunity without submitting an application */
  @IsOptional()
  @IsBoolean()
  noApplicationNeeded?: boolean;
}
