import { IsMongoId, IsNotEmpty } from 'class-validator';
import { SendMessageDto } from '../../modules/messages/dto/send-message.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SendWsMessageDto extends SendMessageDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  conversationId: string;
}
