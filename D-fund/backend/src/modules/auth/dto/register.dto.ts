import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';

enum AllowedRole {
  USER = 'USER',
}

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(AllowedRole)
  role?: AllowedRole;
}
