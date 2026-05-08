import { IsString, IsOptional, IsEnum, IsDateString, IsUrl, MaxLength } from 'class-validator';

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
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relatedItemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relatedItemType?: string;
}
