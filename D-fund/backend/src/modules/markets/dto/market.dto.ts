import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class CreateMarketDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  image?: string;
}

export class UpdateMarketDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  image?: string;
}
