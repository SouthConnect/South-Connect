import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  goalLetter?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  externalLink?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  externalLink2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referralCodeUsed?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  attachmentUrl?: string;
}
