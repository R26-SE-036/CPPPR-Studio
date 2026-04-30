import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { CodeRunnerModule } from '../code-runner/code-runner.module';
import { MlModule } from '../ml/ml.module';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [CodeRunnerModule, MlModule],
  providers: [WebsocketGateway, PrismaService],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
