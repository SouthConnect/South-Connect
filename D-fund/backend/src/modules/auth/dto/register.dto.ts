import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
  Equals,
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
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
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

  /** Must be explicitly true — enforces that the user ticked the terms/privacy checkbox. */
  @Equals(true, { message: 'You must accept the Terms of Service and Privacy Policy.' })
  acceptTerms: boolean;
}
