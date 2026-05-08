import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarketDto, UpdateMarketDto } from './dto/market.dto';

/** Manages geographic market reference data used to tag opportunities and profiles. */
@Injectable()
export class MarketsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all markets ordered alphabetically. */
  findAll() {
    return this.prisma.market.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Creates a new market.
   *
   * @throws ConflictException when a market with the same name already exists.
   */
  async create(dto: CreateMarketDto) {
    const existing = await this.prisma.market.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Market "${dto.name}" already exists`);
    return this.prisma.market.create({ data: dto });
  }

  /**
   * Updates a market by ID.
   *
   * @throws NotFoundException when the market does not exist.
   * @throws ConflictException when the new name conflicts with an existing market.
   */
  async update(id: string, dto: UpdateMarketDto) {
    const market = await this.prisma.market.findUnique({ where: { id } });
    if (!market) throw new NotFoundException('Market not found');

    if (dto.name && dto.name !== market.name) {
      const conflict = await this.prisma.market.findUnique({ where: { name: dto.name } });
      if (conflict) throw new ConflictException(`Market "${dto.name}" already exists`);
    }

    return this.prisma.market.update({ where: { id }, data: dto });
  }

  /**
   * Deletes a market by ID.
   *
   * @throws NotFoundException when the market does not exist.
   */
  async remove(id: string) {
    const market = await this.prisma.market.findUnique({ where: { id } });
    if (!market) throw new NotFoundException('Market not found');
    await this.prisma.market.delete({ where: { id } });
    return { success: true };
  }
}
