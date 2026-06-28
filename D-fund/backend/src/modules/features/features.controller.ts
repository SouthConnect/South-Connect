import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@Controller('features')
@Throttle({ default: {} })
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  /** Public — returns all features (used in opportunity creation forms). */
  @Get()
  findAll() {
    return this.featuresService.findAll();
  }

  /** Public — returns a single feature by id. */
  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: string) {
    return this.featuresService.findOne(id);
  }

  /** Admin only — creates a new feature. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }

  /** Admin only — updates a feature. */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIdPipe) id: string, @Body() dto: UpdateFeatureDto) {
    return this.featuresService.update(id, dto);
  }

  /** Admin only — deletes a feature. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIdPipe) id: string) {
    return this.featuresService.remove(id);
  }
}
