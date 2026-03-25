import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        btoCProfile: true,
        btoBProfile: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        btoCProfile: true,
        btoBProfile: true,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      include: {
        btoCProfile: true,
        btoBProfile: true,
      },
    });
  }

  async updateProfilePic(userId: string, profilePic: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePic,
      },
      include: {
        btoCProfile: true,
        btoBProfile: true,
      },
    });
  }
}

