import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStage } from '@prisma/client';

export class ReviewApplicationDto {
  @IsOptional()
  @IsString()
  feedbackTitle?: string;

  @IsOptional()
  @IsString()
  reviewFeedback?: string;

  @IsEnum(ApplicationStage)
  stage: ApplicationStage;
}
