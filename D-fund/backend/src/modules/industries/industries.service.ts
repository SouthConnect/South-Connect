import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIndustryDto, UpdateIndustryDto } from './dto/industry.dto';

/** Manages industry reference data used to tag opportunities and profiles. */
@Injectable()
export class IndustriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all industries ordered alphabetically. */
  findAll() {
    return this.prisma.industry.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Creates a new industry.
   *
   * @throws ConflictException when an industry with the same name already exists.
   */
  async create(dto: CreateIndustryDto) {
    const existing = await this.prisma.industry.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Industry "${dto.name}" already exists`);
    return this.prisma.industry.create({ data: dto });
  }

  /**
   * Updates an industry by ID.
   *
   * @throws NotFoundException when the industry does not exist.
   * @throws ConflictException when the new name conflicts with an existing industry.
   */
  async update(id: string, dto: UpdateIndustryDto) {
    const industry = await this.prisma.industry.findUnique({ where: { id } });
    if (!industry) throw new NotFoundException('Industry not found');

    if (dto.name && dto.name !== industry.name) {
      const conflict = await this.prisma.industry.findUnique({ where: { name: dto.name } });
      if (conflict) throw new ConflictException(`Industry "${dto.name}" already exists`);
    }

    return this.prisma.industry.update({ where: { id }, data: dto });
  }

  /**
   * Deletes an industry by ID.
   *
   * @throws NotFoundException when the industry does not exist.
   */
  async remove(id: string) {
    const industry = await this.prisma.industry.findUnique({ where: { id } });
    if (!industry) throw new NotFoundException('Industry not found');
    await this.prisma.industry.delete({ where: { id } });
    return { success: true };
  }
}
