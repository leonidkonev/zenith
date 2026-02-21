import { IsString, MaxLength } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  rootMessageId: string;

  @IsString()
  @MaxLength(100)
  title: string;
}
