import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';

enum TaskStatus {
  TODO = 'TODO',
  WORKING_ON_IT = 'WORKING_ON_IT',
  IDEA = 'IDEA',
  DONE = 'DONE',
}

export class CreateTaskDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  relatedItemId?: string;

  @IsOptional()
  @IsString()
  relatedItemType?: string;
}
