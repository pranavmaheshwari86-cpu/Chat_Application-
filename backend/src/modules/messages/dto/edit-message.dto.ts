import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import sanitizeHtml from 'sanitize-html';

export class EditMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value) : value,
  )
  content: string;
}
