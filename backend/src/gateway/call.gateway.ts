import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { ClientEvents, ServerEvents } from '../common/constants/socket-events';
import type { AuthenticatedSocket } from '@chat/shared';
import type { CallDocument } from '../modules/calls/schemas/call.schema';

@WebSocketGateway({ namespace: '/' })
@UseGuards(WsAuthGuard)
export class CallGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallGateway.name);

  // --- Client -> Server Signaling Events ---

  @SubscribeMessage(ClientEvents.CALL_SIGNAL)
  handleCallSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      toUserId: string;
      signalData: Record<string, unknown>;
      callId: string;
    },
  ) {
    this.logger.debug(
      `Signal from ${client.user.userId} to ${payload.toUserId} for call ${payload.callId}`,
    );

    // Relay signal to the target user's personal room
    this.server
      .to(`user:${payload.toUserId}`)
      .emit(ServerEvents.CALL_SIGNAL_RECEIVED, {
        fromUserId: client.user.userId,
        callId: payload.callId,
        signalData: payload.signalData,
      });

    return { success: true };
  }

  // --- Server -> Client Events (from EventEmitter) ---

  @OnEvent('call.initiated')
  handleCallInitiated(call: CallDocument) {
    const initiatorIdStr = call.initiatorId.toString();

    // Notify all pending participants
    call.participants.forEach((p) => {
      const participantIdStr = String(p.userId);
      if (p.status === 'pending') {
        this.server
          .to(`user:${participantIdStr}`)
          .emit(ServerEvents.CALL_INCOMING, {
            callId: call._id,
            initiatorId: initiatorIdStr,
            type: call.type,
            conversationId: call.conversationId,
          });
      }
    });
  }

  @OnEvent('call.accepted')
  handleCallAccepted(payload: { call: CallDocument; userId: string }) {
    const { call, userId } = payload;

    // Notify initiator that someone accepted
    this.server
      .to(`user:${call.initiatorId.toString()}`)
      .emit(ServerEvents.CALL_ACCEPTED, {
        callId: call._id,
        userId,
      });

    // Notify other participants (optional, depending on group call semantics)
    call.participants.forEach((p) => {
      const pIdStr = String(p.userId);
      if (pIdStr !== userId) {
        this.server.to(`user:${pIdStr}`).emit(ServerEvents.CALL_ACCEPTED, {
          callId: call._id,
          userId,
        });
      }
    });
  }

  @OnEvent('call.rejected')
  handleCallRejected(payload: { call: CallDocument; userId: string }) {
    const { call, userId } = payload;

    // Notify initiator
    this.server
      .to(`user:${call.initiatorId.toString()}`)
      .emit(ServerEvents.CALL_REJECTED, {
        callId: call._id,
        userId,
      });
  }

  @OnEvent('call.ended')
  handleCallEnded(payload: { call: CallDocument; userId: string }) {
    const { call, userId } = payload;

    // Broadcast end to everyone involved
    this.server
      .to(`user:${call.initiatorId.toString()}`)
      .emit(ServerEvents.CALL_ENDED, {
        callId: call._id,
        endedBy: userId,
      });

    call.participants.forEach((p) => {
      this.server.to(`user:${String(p.userId)}`).emit(ServerEvents.CALL_ENDED, {
        callId: call._id,
        endedBy: userId,
      });
    });
  }
}
