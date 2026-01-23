import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto, ListOpportunitiesDto, UpdateOpportunityDto } from './dto';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  findAll(@Query() query: ListOpportunitiesDto) {
    return this.opportunitiesService.findAll(query);
  }

  @Get('user/:userId')
  findByOwner(@Param('userId') userId: string, @Query() query: ListOpportunitiesDto) {
    return this.opportunitiesService.findByOwner(userId, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunitiesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.opportunitiesService.remove(id, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.opportunitiesService.findOne(id);
  }
}


