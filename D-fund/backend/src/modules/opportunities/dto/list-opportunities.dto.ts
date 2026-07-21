import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { OpportunityStatusEnum, OpportunityTypeEnum } from './create-opportunity.dto';

export enum SortEnum {
  NEWEST = 'newest',
  TRENDING = 'trending',
}

export class ListOpportunitiesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsEnum(OpportunityStatusEnum)
  status?: OpportunityStatusEnum;

  @IsOptional()
  @IsEnum(OpportunityTypeEnum)
  type?: OpportunityTypeEnum;

  // Comma-separated list of types for multi-category filtering (e.g. "JOB_OPPORTUNITY,TALENT_PROFILE").
  // Takes precedence over `type` when both are provided.
  @IsOptional()
  @IsString()
  types?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(SortEnum)
  sort?: SortEnum;

  /** Cursor-based pagination: ID of the last item from the previous page. */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  cursor?: string;

  /** Filter by country (exact match, case-insensitive). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  /** Filter to remote-only (true) or on-site-only (false) opportunities. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  remote?: boolean;

  /** Return only opportunities created on or after this ISO 8601 date. */
  @IsOptional()
  @IsISO8601()
  createdAfter?: string;
}
