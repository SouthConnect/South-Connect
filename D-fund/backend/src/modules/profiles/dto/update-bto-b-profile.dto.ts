import { IsArray, IsDateString, IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO for updating a company profile (BtoB).
 * All fields are optional to support partial updates.
 */
export class UpdateBtoBProfileDto {
  /** Company display name. */
  @IsOptional()
  @IsString()
  companyName?: string;

  /** URL or storage path of the company logo. */
  @IsOptional()
  @IsString()
  logo?: string;

  /** URL or storage path of the company header image. */
  @IsOptional()
  @IsString()
  headerImage?: string;

  /** Short tagline for the company. */
  @IsOptional()
  @IsString()
  punchline?: string;

  /** Short description of the company. */
  @IsOptional()
  @IsString()
  description?: string;

  /** Long-form description of the company. */
  @IsOptional()
  @IsString()
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
  city?: string;

  /** Country where the company is based. */
  @IsOptional()
  @IsString()
  country?: string;

  /** Company founding date (ISO 8601). */
  @IsOptional()
  @IsDateString()
  foundationDate?: string;

  /** Development stage (e.g. Ideation, MVP, Growth, Scale). */
  @IsOptional()
  @IsString()
  developmentStage?: string;

  /** Industries the company operates in. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  /** Target geographic markets. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketFocus?: string[];
}
