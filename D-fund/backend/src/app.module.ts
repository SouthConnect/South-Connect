import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { MessagesModule } from './modules/messages/messages.module';
import { SocialModule } from './modules/social/social.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OpportunitiesModule,
    ApplicationsModule,
    ProfilesModule,
    MessagesModule,
    SocialModule,
  ],
})
export class AppModule {}

