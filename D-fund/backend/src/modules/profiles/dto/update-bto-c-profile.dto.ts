import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating an individual talent profile (BtoC).
 * All fields are optional to support partial updates.
 */
export class UpdateBtoCProfileDto {
  /** Free-text description of the talent profile. */
  @IsOptional()
  @IsString()
  description?: string;

  /** General tags and skills. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Industries of interest. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  /** Target geographic markets. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketFocus?: string[];

  /** Spoken languages. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  /** Business skills. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessSkills?: string[];

  /** Technical skills. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techSkills?: string[];

  /** Seniority level (e.g. Junior, Mid, Senior). */
  @IsOptional()
  @IsString()
  seniorityLevel?: string;

  /** Whether the talent is actively looking for opportunities. */
  @IsOptional()
  @IsBoolean()
  lookingForOpportunities?: boolean;

  /** Whether the talent accepts remote positions. */
  @IsOptional()
  @IsBoolean()
  remote?: boolean;

  /** Countries of interest for opportunities. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  /** Regions of interest for opportunities. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  /** Types of opportunities being sought. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opportunityTypes?: string[];
}
