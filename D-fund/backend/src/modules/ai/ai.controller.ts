import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { rateLimit } from '../../common/rate-limit';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { GenerateOpportunityDto } from './dto/generate-opportunity.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Generates a structured opportunity draft (name, punchline, description, tags)
   * from a brief user-provided context. Requires authentication.
   *
   * The result is intended to pre-fill the opportunity creation form —
   * nothing is saved to the database by this endpoint.
   */
  @Post('generate-opportunity')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: rateLimit(3), ttl: 60_000 } })
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Generate an opportunity draft with AI (auth required)' })
  generate(@Body() dto: GenerateOpportunityDto) {
    return this.aiService.generateOpportunity(dto.type, dto.context);
  }
}
