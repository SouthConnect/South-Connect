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

// Enums locaux alignés sur les valeurs Prisma, pour éviter les problèmes d'import en prod
export enum OpportunityTypeEnum {
  JOB_OPPORTUNITY = 'JOB_OPPORTUNITY',
  TALENT_PROFILE = 'TALENT_PROFILE',
  CO_FOUNDER_OPPORTUNITY = 'CO_FOUNDER_OPPORTUNITY',
  CO_FOUNDER_PROFILE = 'CO_FOUNDER_PROFILE',
  BUSINESS_IDEA = 'BUSINESS_IDEA',
  SUPPORT_OFFER = 'SUPPORT_OFFER',
  SERVICE_LISTING = 'SERVICE_LISTING',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  DEAL_FLOW = 'DEAL_FLOW',
  INVESTOR_THESIS = 'INVESTOR_THESIS',
  INVESTOR_PROFILE = 'INVESTOR_PROFILE',
  FUNDING_OPPORTUNITY = 'FUNDING_OPPORTUNITY',
  EVENT = 'EVENT',
  CALL_FOR_STARTUPS = 'CALL_FOR_STARTUPS',
  MENTORSHIP_BA_OFFER = 'MENTORSHIP_BA_OFFER',
  PROJECT_SEEKING_SUPPORT = 'PROJECT_SEEKING_SUPPORT',
  VENTURE_PROGRAM = 'VENTURE_PROGRAM',
  CHILL_WORK_SPOT = 'CHILL_WORK_SPOT',
  MARKET_ADVISOR = 'MARKET_ADVISOR',
}

export enum OpportunityStatusEnum {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

export class CreateOpportunityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  punchline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(OpportunityTypeEnum)
  type: OpportunityTypeEnum;

  @IsOptional()
  @IsEnum(OpportunityStatusEnum)
  status?: OpportunityStatusEnum;

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
