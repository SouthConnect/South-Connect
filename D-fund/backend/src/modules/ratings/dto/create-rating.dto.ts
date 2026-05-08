import { IsString, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateRatingDto {
  /** ID of the rated item (opportunity ID or user ID). */
  @IsString()
  @MaxLength(100)
  itemId: string;

  /** Rating value from 1 (lowest) to 5 (highest). */
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
