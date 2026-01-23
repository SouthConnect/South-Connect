import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { OpportunityStatus, OpportunityType } from '@prisma/client';

export class CreateOpportunityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  punchline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(OpportunityType)
  type: OpportunityType;

  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @IsOptional()
  @IsString()
  featureId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  remote?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  applicationProcessId?: string;

  @IsOptional()
  @IsBoolean()
  needToCheckApplicant?: boolean;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @IsOptional()
  @IsString()
  file?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  markets?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  pricingUnit?: string;

  @IsOptional()
  @IsString()
  pricingDetails?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsString()
  aiPrompt?: string;

  @IsOptional()
  @IsString()
  aiOutput?: string;

  @IsOptional()
  @IsBoolean()
  boosted?: boolean;

  @IsOptional()
  @IsDateString()
  boostedUntil?: string;

  @IsOptional()
  @IsBoolean()
  qualified?: boolean;

  @IsOptional()
  @IsBoolean()
  referralAvailable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  referralAmount?: number;
}
