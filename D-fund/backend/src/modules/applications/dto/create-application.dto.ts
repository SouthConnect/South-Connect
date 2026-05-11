import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @MaxLength(36)
  opportunityId: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  goalLetter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referralCodeUsed?: string;
}
