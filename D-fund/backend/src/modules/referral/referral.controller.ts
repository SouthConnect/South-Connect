import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

class CreateReferralDto {
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.referralService.findAllForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateReferralDto) {
    return this.referralService.create(user.id, dto.opportunityId, dto.type as any);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.referralService.findByCode(code);
  }
}
