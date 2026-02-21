import { IsString, IsOptional, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @IsString()
  url: string;
  @IsString()
  filename: string;
  @IsOptional()
  size?: number;
  @IsOptional()
  mimeType?: string;
}

export class CreateMessageDto {
  @IsString()
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}
