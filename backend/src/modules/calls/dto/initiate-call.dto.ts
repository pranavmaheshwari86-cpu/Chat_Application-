import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';

export class InitiateCallDto {
  @ApiProperty({ description: 'IDs of users to call', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  participantIds: string[];

  @ApiProperty({ description: 'Call type', enum: ['voice', 'video'] })
  @IsEnum(['voice', 'video'])
  @IsNotEmpty()
  type: 'voice' | 'video';

  @ApiPropertyOptional({ description: 'Associated conversation ID' })
  @IsOptional()
  @IsMongoId()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Associated community ID' })
  @IsOptional()
  @IsMongoId()
  communityId?: string;

  @ApiPropertyOptional({ description: 'Associated channel ID' })
  @IsOptional()
  @IsMongoId()
  channelId?: string;
}
