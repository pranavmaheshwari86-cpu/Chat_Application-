import { IsMongoId, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: '60d5ecb8b392d7001f3e3a4b' })
  @IsMongoId()
  @IsNotEmpty()
  participantId: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Enable end-to-end encryption',
  })
  @IsOptional()
  @IsBoolean()
  isE2E?: boolean;
}
