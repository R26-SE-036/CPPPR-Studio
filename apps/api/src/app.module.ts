import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { ChatModule } from './chat/chat.module';
import { PeerReviewModule } from './peer-review/peer-review.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PromptsModule } from './prompts/prompts.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Config available globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    SessionsModule,
    CollaborationModule,
    ChatModule,
    PeerReviewModule,
    AnalyticsModule,
    PromptsModule,
    DashboardModule,
  ],
})
export class AppModule {}