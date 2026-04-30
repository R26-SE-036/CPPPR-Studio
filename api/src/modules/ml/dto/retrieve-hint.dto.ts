import { IsString, IsArray } from 'class-validator';

export class RetrieveHintDto {
  @IsString()
  sessionId: string;

  @IsString()
  questionId: string;

  @IsArray()
  conceptTags: string[];

  @IsString()
  errorContext?: string;
}
