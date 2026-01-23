import { IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  opportunityId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  goalLetter?: string;

  @IsOptional()
  @IsString()
  referralCodeUsed?: string;
}
