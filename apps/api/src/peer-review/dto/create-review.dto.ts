import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewCommentDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  @Min(1)
  lineNumber: number;

  @ApiProperty({ example: 'This variable name is unclear' })
  @IsString()
  content: string;
}

export class CreateReviewDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @IsString()
  revieweeId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  overallScore?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  rubricScores?: Record<string, number>;

  @ApiProperty({ type: [ReviewCommentDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewCommentDto)
  @IsOptional()
  comments?: ReviewCommentDto[];
}