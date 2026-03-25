import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfilePicDto } from './dto/update-profile-pic.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Put('me/profile-pic')
  @UseGuards(JwtAuthGuard)
  updateProfilePic(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfilePicDto,
  ) {
    return this.usersService.updateProfilePic(user.id, dto.profilePic);
  }
}

