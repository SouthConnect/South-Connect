import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@prisma/client';

/** Manages personal task management for authenticated users. */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all tasks for the given user, ordered by status then most recently created. */
  findAll(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Creates a new task for the given user. Defaults to TODO status. */
  create(userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        status: (dto.status as TaskStatus) ?? TaskStatus.TODO,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        url: dto.url,
        relatedItemId: dto.relatedItemId,
        relatedItemType: dto.relatedItemType,
      },
    });
  }

  /**
   * Updates an existing task.
   *
   * @throws NotFoundException  when the task does not exist.
   * @throws ForbiddenException when the requester does not own the task.
   */
  async update(id: string, userId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException('Not your task');

    return this.prisma.task.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status as TaskStatus | undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        url: dto.url,
      },
    });
  }

  /**
   * Deletes a task.
   *
   * @throws NotFoundException  when the task does not exist.
   * @throws ForbiddenException when the requester does not own the task.
   */
  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException('Not your task');

    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }
}
