import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: '60d5ecb8b392d7001f3e3a4b' })
  @IsMongoId()
  @IsNotEmpty()
  participantId: string;
}
