import { IsOptional, IsString, IsMongoId, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MessageQueryDto {
  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional({ enum: ['before', 'after'] })
  @IsString()
  @IsOptional()
  @IsIn(['before', 'after'])
  direction?: 'before' | 'after';
}
