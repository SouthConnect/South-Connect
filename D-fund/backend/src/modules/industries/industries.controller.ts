import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IndustriesService } from './industries.service';
import { CreateIndustryDto, UpdateIndustryDto } from './dto/industry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

/**
 * Exposes industry reference data.
 * The GET list endpoint is public (used by filters and forms).
 * Write operations are restricted to ADMIN users.
 */
@ApiTags('industries')
@Controller('industries')
@Throttle({ default: {} })
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  /** Returns all industries ordered alphabetically. */
  @ApiOperation({ summary: 'List all industries' })
  @Get()
  findAll() {
    return this.industriesService.findAll();
  }

  /** Admin: creates a new industry. */
  @ApiOperation({ summary: 'Create an industry (admin only)' })
  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateIndustryDto) {
    return this.industriesService.create(dto);
  }

  /** Admin: updates an existing industry. */
  @ApiOperation({ summary: 'Update an industry (admin only)' })
  @Put(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateIndustryDto) {
    return this.industriesService.update(id, dto);
  }

  /** Admin: deletes an industry. */
  @ApiOperation({ summary: 'Delete an industry (admin only)' })
  @Delete(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIdPipe) id: string) {
    return this.industriesService.remove(id);
  }
}
