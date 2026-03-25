import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

enum AllowedRole {
  USER = 'USER',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  name?: string;

  // Seul le rôle USER est autorisé à l'inscription publique
  // Le rôle ADMIN ne peut être attribué que manuellement en base
  @IsOptional()
  @IsEnum(AllowedRole)
  role?: AllowedRole;
}

