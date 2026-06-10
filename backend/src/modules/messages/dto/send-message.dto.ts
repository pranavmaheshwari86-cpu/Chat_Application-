import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import sanitizeHtml from 'sanitize-html';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  VOICE = 'voice',
  GIF = 'gif',
}

export class AttachmentDto {
  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  size?: number;
}

export class SendMessageDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => o.type === MessageType.TEXT)
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  @Transform(({ value }) =>
    typeof value === 'string' ? sanitizeHtml(value) : value,
  )
  content?: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'Number of seconds until the message expires',
  })
  @IsOptional()
  expiresIn?: number;
}
