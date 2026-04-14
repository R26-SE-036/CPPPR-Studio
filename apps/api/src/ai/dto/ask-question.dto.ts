import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({ example: 'session-cuid-123' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'Summarize our collaboration session' })
  @IsString()
  @MinLength(3)
  question: string;
}
