import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImproveReviewDto {
  @ApiProperty({ example: 'session-cuid-123' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'looks good' })
  @IsString()
  @MinLength(1)
  comment: string;
}
