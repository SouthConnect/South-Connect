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
}
