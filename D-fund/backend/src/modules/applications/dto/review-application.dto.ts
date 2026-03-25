import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStage } from '@prisma/client';

const reviewableStages = [
  ApplicationStage.OWNER_REVIEW,
  ApplicationStage.SUCCESS,
  ApplicationStage.ARCHIVED,
] as const;

type ReviewableStage = typeof reviewableStages[number];

export class ReviewApplicationDto {
  @IsOptional()
  @IsString()
  feedbackTitle?: string;

  @IsOptional()
  @IsString()
  reviewFeedback?: string;

  @IsEnum(reviewableStages)
  stage: ReviewableStage;
}
