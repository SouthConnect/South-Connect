import { Body, Controller, Get, Param, Post, Put, UseGuards, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplicationOwnerGuard } from '../../common/guards/application-owner.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, ReviewApplicationDto, UpdateApplicationDto } from './dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // Candidatures pour une opportunité (vue Owner)
  @Get('opportunity/:opportunityId')
  @UseGuards(JwtAuthGuard)
  findByOpportunity(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.findByOpportunityForOwner(opportunityId, user.id);
  }

  // Candidatures d'un user (vue candidat)
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findForUser(@Param('userId') userId: string, @CurrentUser() user: User) {
    // On ne permet pas de récupérer les candidatures d'un autre user
    if (user.id !== userId) {
      throw new ForbiddenException('You can only access your own applications');
    }
    return this.applicationsService.findForUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, ApplicationOwnerGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, user.id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, ApplicationOwnerGuard)
  submit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.submit(id, user.id);
  }

  @Put(':id/review')
  @UseGuards(JwtAuthGuard, ApplicationOwnerGuard)
  review(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.applicationsService.review(id, user.id, dto);
  }
}


