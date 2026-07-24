import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipEmailVerification } from '../../common/decorators/skip-email-verification.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

/**
 * Exposes personal task management for the authenticated user.
 * All routes require a valid JWT.
 * Email verification not required — tasks are private personal data.
 */
@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@SkipEmailVerification()
@Throttle({ default: {} })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** Returns all tasks belonging to the authenticated user. */
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.tasksService.findAll(user.id);
  }

  /** Creates a new task for the authenticated user. */
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  /** Updates a task. Only the task owner may call this endpoint. */
  @Put(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, user.id, dto);
  }

  /** Deletes a task. Only the task owner may call this endpoint. */
  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseIdPipe) id: string) {
    return this.tasksService.remove(id, user.id);
  }
}
