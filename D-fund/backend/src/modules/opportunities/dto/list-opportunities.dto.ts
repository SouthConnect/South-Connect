import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
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
}
