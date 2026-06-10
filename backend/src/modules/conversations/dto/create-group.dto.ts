import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Engineering Team' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Main channel for engineering team' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: [String],
    example: ['60d5ecb8b392d7001f3e3a4b', '60d5ecb8b392d7001f3e3a4c'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  memberIds?: string[];
}
