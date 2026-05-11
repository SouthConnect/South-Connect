import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  // Optional idempotency key — if provided the server returns the same message
  // on retries instead of creating a duplicate (covers network-retry edge cases).
  @IsOptional()
  @IsUUID()
  clientMessageId?: string;
}
