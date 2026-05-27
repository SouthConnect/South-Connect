import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
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
 * All authenticated routes require a valid JWT.
 */
@ApiTags('referral')
@ApiBearerAuth('JWT')
@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** Returns all referral codes and stats for the authenticated user. */
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.referralService.findAllForUser(user.id);
  }

  /** Creates a new referral code for the authenticated user. */
  @Post()
  @Throttle({ auth: {} })
  create(@CurrentUser() user: User, @Body() dto: CreateReferralDto) {
    return this.referralService.create(user.id, dto.opportunityId, dto.type);
  }

  /** Resolves a referral code (public — no JWT required by this endpoint). */
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.referralService.findByCode(code);
  }
}
