import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinSessionDto {
  @ApiProperty({ example: 'ABC123' })
  @IsString()
  @Length(6, 6)
  roomCode: string;
}