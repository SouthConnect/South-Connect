import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('audit')
@ApiBearerAuth('JWT')
@Controller('audit')
@Throttle({ default: {} })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Admin: retourne le journal d'audit des actions administratives. */
  @ApiOperation({ summary: 'Retrieve admin audit log (admin only)' })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.auditService.findAll(
      take ? Math.min(parseInt(take, 10), 100) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
  }
}
