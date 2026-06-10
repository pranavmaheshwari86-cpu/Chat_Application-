import { Controller, Post, Body } from '@nestjs/common';
import type { AuthUser, JwtPayload } from '@chat/shared';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('smart-replies')
  @ApiOperation({ summary: 'Generate smart reply suggestions' })
  async getSmartReplies(@Body('context') context: string[]) {
    const replies = await this.aiService.generateSmartReplies(context);
    return { data: replies };
  }

  @Post('translate')
  @ApiOperation({ summary: 'Translate a message' })
  async translateMessage(
    @Body('content') content: string,
    @Body('targetLanguage') targetLanguage: string,
  ) {
    const translated = await this.aiService.translateMessage(
      content,
      targetLanguage,
    );
    return { data: translated };
  }

  @Post('moderate')
  @ApiOperation({ summary: 'Moderate message content' })
  async moderateContent(@Body('content') content: string) {
    const result = await this.aiService.moderateContent(content);
    return { data: result };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate generic AI response' })
  async generateResponse(
    @Body('messages') messages: any[],
    @Body('prompt') prompt: string,
    @CurrentUser() user: AuthUser,
  ) {
    const response = await this.aiService.generateResponse(
      messages || prompt,
      user,
    );
    return { response };
  }
}
