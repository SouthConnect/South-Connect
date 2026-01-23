import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OpportunityStatus, OpportunityType } from '@prisma/client';

export class ListOpportunitiesDto {
  @IsOptional()
  @Type(() => Number)
  take?: number;

  @IsOptional()
  @Type(() => Number)
  skip?: number;

  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @IsOptional()
  @IsEnum(OpportunityType)
  type?: OpportunityType;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
