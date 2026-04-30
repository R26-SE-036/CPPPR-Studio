import { IsString, IsObject } from 'class-validator';

export class PredictPairStateDto {
  @IsString()
  sessionId: string;

  @IsObject()
  features: Record<string, any>;
}
