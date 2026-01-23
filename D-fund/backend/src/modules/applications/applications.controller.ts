import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, ReviewApplicationDto, UpdateApplicationDto } from './dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // Candidatures pour une opportunité (vue Owner)
  @Get('opportunity/:opportunityId')
  findByOpportunity(@Param('opportunityId') opportunityId: string) {
    return this.applicationsService.findByOpportunity(opportunityId);
  }

  // Candidatures d'un user (vue candidat)
  @Get('user/:userId')
  findForUser(@Param('userId') userId: string) {
    return this.applicationsService.findForUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, user.id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.submit(id, user.id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard)
  review(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.applicationsService.review(id, user.id, dto);
  }
}


