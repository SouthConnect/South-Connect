import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';

/**
 * Manages the Feature catalogue — each Feature represents a type of opportunity
 * (e.g. JOB_OPPORTUNITY, CO_FOUNDER_OPPORTUNITY) and carries the AI prompt
 * configuration and UX copy (seeker / creator labels and scenarios) used when
 * users interact with opportunities of that type.
 */
@Injectable()
export class FeaturesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all features ordered by `order` asc, then name asc. */
  findAll() {
    return this.prisma.feature.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  /** Returns a single feature by id.
   * @throws NotFoundException when no feature matches. */
  async findOne(id: string) {
    const feature = await this.prisma.feature.findUnique({ where: { id } });
    if (!feature) throw new NotFoundException('Feature not found');
    return feature;
  }

  /**
   * Creates a new feature.
   * @throws ConflictException when a feature with that name already exists.
   */
  async create(dto: CreateFeatureDto) {
    const existing = await this.prisma.feature.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`A feature named "${dto.name}" already exists`);

    return this.prisma.feature.create({ data: dto });
  }

  /**
   * Updates a feature by id.
   * @throws NotFoundException when no feature matches.
   * @throws ConflictException when the new name conflicts with an existing feature.
   */
  async update(id: string, dto: UpdateFeatureDto) {
    await this.findOne(id); // ensure it exists

    if (dto.name) {
      const conflict = await this.prisma.feature.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`A feature named "${dto.name}" already exists`);
    }

    return this.prisma.feature.update({ where: { id }, data: dto });
  }

  /**
   * Deletes a feature by id.
   * @throws NotFoundException when no feature matches.
   */
  async remove(id: string) {
    await this.findOne(id); // ensure it exists
    await this.prisma.feature.delete({ where: { id } });
    return { message: 'Feature deleted successfully' };
  }
}
