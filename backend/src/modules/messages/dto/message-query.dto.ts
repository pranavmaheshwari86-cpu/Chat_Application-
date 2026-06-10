import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ enum: ['before', 'after'] })
  @IsString()
  @IsOptional()
  direction?: 'before' | 'after';
}
