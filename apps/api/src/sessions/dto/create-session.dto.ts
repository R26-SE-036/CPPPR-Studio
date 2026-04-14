import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'Bubble Sort Workshop' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ default: 'java', required: false })
  @IsString()
  @IsOptional()
  @IsIn(['java'], { message: 'Only Java is supported as a language' })
  language?: string;
}
