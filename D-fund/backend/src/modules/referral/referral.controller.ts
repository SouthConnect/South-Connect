import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SkipEmailVerification } from '../../common/decorators/skip-email-verification.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReferralType, User } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

class CreateReferralDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  opportunityId?: string;

  @IsOptional()
  @IsEnum(ReferralType)
  type?: ReferralType;
}

/**
 * Exposes endpoints for managing and resolving referral codes.
 * Authenticated routes require a valid JWT. GET /code/:code is intentionally public.
 */
@ApiTags('referral')
@ApiBearerAuth('JWT')
@Controller('referral')
@Throttle({ default: {} })
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** Returns all referral codes and stats for the authenticated user. */
  @Get()
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  findAll(@CurrentUser() user: User) {
    return this.referralService.findAllForUser(user.id);
  }

  /** Creates a new referral code for the authenticated user. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  @Throttle({ auth: {} })
  create(@CurrentUser() user: User, @Body() dto: CreateReferralDto) {
    return this.referralService.create(user.id, dto.opportunityId, dto.type);
  }

  /** Resolves a referral code — public, no JWT required. */
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.referralService.findByCode(code);
  }
}
