import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '@chat/shared';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a new voice or video call' })
  initiateCall(@CurrentUser() user: AuthUser, @Body() dto: InitiateCallDto) {
    return this.callsService.initiateCall(
      user.userId,
      dto.participantIds,
      dto.type,
      dto.conversationId,
      dto.communityId,
      dto.channelId,
    );
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept an incoming call' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  acceptCall(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.callsService.acceptCall(id, user.userId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an incoming call' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  rejectCall(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.callsService.rejectCall(id, user.userId);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'End an active call' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  endCall(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.callsService.endCall(id, user.userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get call history for the authenticated user' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default 20, max 100)',
  })
  getCallHistory(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: number,
  ) {
    return this.callsService.getCallHistory(
      user.userId,
      limit ? Number(limit) : undefined,
    );
  }
}
