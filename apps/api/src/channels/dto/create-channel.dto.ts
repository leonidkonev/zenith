import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChannelDto {
  /** Stored as-is: spaces, capitals, emojis, Unicode allowed (no slug/lowercase). */
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  type: 'text' | 'voice' | 'category';

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}
