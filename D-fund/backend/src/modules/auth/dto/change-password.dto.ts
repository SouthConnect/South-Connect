import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.',
  })
  newPassword: string;
}
