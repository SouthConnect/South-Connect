import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional() @IsBoolean() emailApplicationSubmitted?: boolean;
  @IsOptional() @IsBoolean() emailApplicationReviewed?: boolean;
  @IsOptional() @IsBoolean() emailApplicationAccepted?: boolean;
  @IsOptional() @IsBoolean() emailOpportunityApproved?: boolean;
  @IsOptional() @IsBoolean() emailOpportunityRejected?: boolean;
  @IsOptional() @IsBoolean() emailNewMessage?: boolean;
  @IsOptional() @IsBoolean() emailNewFollower?: boolean;

  @IsOptional() @IsBoolean() inAppApplicationSubmitted?: boolean;
  @IsOptional() @IsBoolean() inAppApplicationReviewed?: boolean;
  @IsOptional() @IsBoolean() inAppApplicationAccepted?: boolean;
  @IsOptional() @IsBoolean() inAppOpportunityApproved?: boolean;
  @IsOptional() @IsBoolean() inAppOpportunityRejected?: boolean;
  @IsOptional() @IsBoolean() inAppNewMessage?: boolean;
  @IsOptional() @IsBoolean() inAppNewFollower?: boolean;
}
