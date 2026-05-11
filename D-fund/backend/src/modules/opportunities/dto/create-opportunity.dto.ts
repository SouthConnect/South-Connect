import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Local enums mirroring Prisma values to avoid circular import issues in production builds.
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
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  punchline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsEnum(OpportunityTypeEnum)
  type: OpportunityTypeEnum;

  @IsOptional()
  @IsEnum(OpportunityStatusEnum)
  status?: OpportunityStatusEnum;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  featureId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(100)
  applicationProcessId?: string;

  @IsOptional()
  @IsBoolean()
  needToCheckApplicant?: boolean;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  image?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  backgroundImage?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
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
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pricingUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  pricingDetails?: string;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  aiPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
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
