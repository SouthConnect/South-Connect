import { IsEnum } from 'class-validator';
import { OpportunityStatus } from '@prisma/client';

export class AdminUpdateStatusDto {
  @IsEnum(OpportunityStatus)
  status: OpportunityStatus;
}
