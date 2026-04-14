import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExplainCodeDto {
  @ApiProperty({ example: 'session-cuid-123' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'function bubbleSort(arr) { ... }' })
  @IsString()
  @MinLength(5)
  code: string;

  @ApiProperty({ example: 'javascript', required: false })
  @IsString()
  @IsOptional()
  language?: string;
}
