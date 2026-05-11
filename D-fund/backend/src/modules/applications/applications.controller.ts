import { Body, Controller, ForbiddenException, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplicationOwnerGuard } from '../../common/guards/application-owner.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto, ReviewApplicationDto, UpdateApplicationDto } from './dto';

/**
 * Exposes endpoints for managing job/opportunity applications.
 *
 * Two perspectives are supported:
 * - **Candidate** — creates, edits, and submits their own applications.
 * - **Opportunity owner** — lists and reviews applications for their opportunities.
 *
 * The `ApplicationOwnerGuard` ensures mutation routes are only accessible to the
 * application's candidate.
 */
@ApiTags('applications')
@ApiBearerAuth('JWT')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * Returns all applications for an opportunity.
   * Only the opportunity owner may call this endpoint.
   */
  @Get('opportunity/:opportunityId')
  @UseGuards(JwtAuthGuard)
  findByOpportunity(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.findByOpportunityForOwner(opportunityId, user.id);
  }

  /**
   * Returns the authenticated user's own applications.
   * Users may only access their own application list.
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  findForUser(@Param('userId') userId: string, @CurrentUser() user: User) {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only access your own applications');
    }
    return this.applicationsService.findForUser(userId);
  }

  /** Creates a new application in DRAFT stage for the authenticated user. Rate-limited to 5/min. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ auth: {} })
  create(@CurrentUser() user: User, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.id, dto);
  }

  /** Updates a DRAFT application's content. Only the applicant may call this. */
  @Put(':id')
  @UseGuards(JwtAuthGuard, ApplicationOwnerGuard)
  update(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: User, @Body() dto: UpdateApplicationDto) {
    return this.applicationsService.update(id, user.id, dto);
  }

  /** Submits a DRAFT application for review. Only the applicant may call this. Rate-limited to 3/min. */
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, ApplicationOwnerGuard)
  @Throttle({ strict: {} })
  submit(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: User) {
    return this.applicationsService.submit(id, user.id);
  }

  /** Allows the opportunity owner to review and update the stage of an application. */
  @Put(':id/review')
  @UseGuards(JwtAuthGuard)
  review(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: User, @Body() dto: ReviewApplicationDto) {
    return this.applicationsService.review(id, user.id, dto);
  }
}
