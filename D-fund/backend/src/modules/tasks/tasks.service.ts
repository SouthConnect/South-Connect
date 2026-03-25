import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

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

  async update(id: string, userId: string, dto: Partial<CreateTaskDto>) {
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

  async remove(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException('Not your task');

    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }
}
