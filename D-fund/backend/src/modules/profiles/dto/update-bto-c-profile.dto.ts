import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating an individual talent profile (BtoC).
 * All fields are optional to support partial updates.
 */
export class UpdateBtoCProfileDto {
  /** Free-text description of the talent profile. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** General tags and skills. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  tags?: string[];

  /** Industries of interest. */
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

  /** Spoken languages. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  languages?: string[];

  /** Business skills. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  businessSkills?: string[];

  /** Technical skills. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  techSkills?: string[];

  /** Seniority level (e.g. Junior, Mid, Senior). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  countries?: string[];

  /** Regions of interest for opportunities. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  regions?: string[];

  /** Types of opportunities being sought. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  opportunityTypes?: string[];
}
