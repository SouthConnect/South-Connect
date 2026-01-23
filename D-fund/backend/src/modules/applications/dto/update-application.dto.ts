import { IsOptional, IsString } from 'class-validator';

export class UpdateApplicationDto {
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
