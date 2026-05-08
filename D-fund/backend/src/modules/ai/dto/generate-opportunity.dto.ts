import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { OpportunityType } from '@prisma/client';

export class GenerateOpportunityDto {
  @IsEnum(OpportunityType)
  type: OpportunityType;

  /** A brief description of what the user wants to post (max 500 chars). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  context: string;
}
