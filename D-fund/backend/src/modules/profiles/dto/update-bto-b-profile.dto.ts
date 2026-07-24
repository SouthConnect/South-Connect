import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating a company profile (BtoB).
 * All fields are optional to support partial updates.
 */
export class UpdateBtoBProfileDto {
  /** Company display name. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  /** URL or storage path of the company logo. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  /** URL or storage path of the company header image. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  headerImage?: string;

  /** Short tagline for the company. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  punchline?: string;

  /** Short description of the company. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** Long-form description of the company. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  longDescription?: string;

  /** Company website URL. */
  @IsOptional()
  @IsUrl()
  website?: string;

  /** Company LinkedIn profile URL. */
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  /** City where the company is based. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;

  /** Country where the company is based. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  country?: string;

  /** Company founding date (ISO 8601). */
  @IsOptional()
  @IsDateString()
  foundationDate?: string;

  /** Development stage (e.g. Ideation, MVP, Growth, Scale). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  developmentStage?: string;

  /** Industries the company operates in. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  industries?: string[];

  /** Target geographic markets. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  marketFocus?: string[];
}
