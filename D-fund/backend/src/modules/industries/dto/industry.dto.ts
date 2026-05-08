import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateIndustryDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateIndustryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
