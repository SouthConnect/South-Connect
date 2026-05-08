import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

/**
 * Accepts user feedback submissions.
 * Rate-limited to 5 requests per minute to prevent spam.
 */
@ApiTags('feedback')
@ApiBearerAuth('JWT')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /** Submits a feedback entry from the authenticated user. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ auth: {} })
  submit(@CurrentUser() user: User, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.submit(user, dto);
  }
}
