import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  goalLetter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalLink2?: string;

  @IsOptional()
  @IsString()
  referralCodeUsed?: string;
}
