import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

