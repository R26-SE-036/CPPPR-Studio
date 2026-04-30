import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MongoDbService } from './mongodb.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [PrismaService, MongoDbService, RedisService],
  exports: [PrismaService, MongoDbService, RedisService],
})
export class CommonModule {}
