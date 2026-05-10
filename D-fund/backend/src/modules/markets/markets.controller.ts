import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MarketsService } from './markets.service';
import { CreateMarketDto, UpdateMarketDto } from './dto/market.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Exposes geographic market reference data.
 * The GET list endpoint is public (used by filters and forms).
 * Write operations are restricted to ADMIN users.
 */
@ApiTags('markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  /** Returns all markets ordered alphabetically. */
  @ApiOperation({ summary: 'List all markets' })
  @Get()
  findAll() {
    return this.marketsService.findAll();
  }

  /** Admin: creates a new market. */
  @ApiOperation({ summary: 'Create a market (admin only)' })
  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateMarketDto) {
    return this.marketsService.create(dto);
  }

  /** Admin: updates an existing market. */
  @ApiOperation({ summary: 'Update a market (admin only)' })
  @Put(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateMarketDto) {
    return this.marketsService.update(id, dto);
  }

  /** Admin: deletes a market. */
  @ApiOperation({ summary: 'Delete a market (admin only)' })
  @Delete(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIdPipe) id: string) {
    return this.marketsService.remove(id);
  }
}
