import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Call, CallDocument } from './schemas/call.schema';

@Injectable()
export class CallsService {
  constructor(
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async initiateCall(
    initiatorId: string,
    participantIds: string[],
    type: 'voice' | 'video',
    conversationId?: string,
    communityId?: string,
    channelId?: string,
  ): Promise<CallDocument> {
    if (participantIds.includes(initiatorId)) {
      throw new BadRequestException('Cannot call yourself');
    }

    const participants = participantIds.map((id) => ({
      userId: new Types.ObjectId(id),
      status: 'pending',
    }));

    const call = new this.callModel({
      initiatorId: new Types.ObjectId(initiatorId),
      participants,
      type,
      status: 'ringing',
      ...(conversationId && {
        conversationId: new Types.ObjectId(conversationId),
      }),
      ...(communityId && { communityId: new Types.ObjectId(communityId) }),
      ...(channelId && { channelId: new Types.ObjectId(channelId) }),
    });

    const savedCall = await call.save();
    this.eventEmitter.emit('call.initiated', savedCall);
    return savedCall;
  }

  async acceptCall(callId: string, userId: string): Promise<CallDocument> {
    const call = await this.findCallOrThrow(callId);

    this.assertCallNotEnded(call);

    const participant = this.findParticipantOrThrow(call, userId);

    if (participant.status === 'joined') {
      throw new BadRequestException('Already joined this call');
    }

    participant.status = 'joined';
    participant.joinedAt = new Date();

    // First participant to join transitions the call to active
    if (call.status === 'ringing') {
      call.status = 'active';
      call.startedAt = new Date();
    }

    const savedCall = await call.save();
    this.eventEmitter.emit('call.accepted', { call: savedCall, userId });
    return savedCall;
  }

  async rejectCall(callId: string, userId: string): Promise<CallDocument> {
    const call = await this.findCallOrThrow(callId);

    this.assertCallNotEnded(call);

    const participant = this.findParticipantOrThrow(call, userId);

    if (participant.status !== 'pending') {
      throw new BadRequestException(
        `Cannot decline a call with status "${participant.status}"`,
      );
    }

    participant.status = 'declined';

    // If all participants declined, mark the entire call as declined
    const allDeclined = call.participants.every((p) => p.status === 'declined');
    if (allDeclined) {
      call.status = 'declined';
      call.endedAt = new Date();
    }

    const savedCall = await call.save();
    this.eventEmitter.emit('call.rejected', { call: savedCall, userId });
    return savedCall;
  }

  async endCall(callId: string, userId: string): Promise<CallDocument> {
    const call = await this.findCallOrThrow(callId);

    // Only the initiator or a joined participant can end a call
    const isInitiator = call.initiatorId.toString() === userId;
    const isParticipant = call.participants.some(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (p) => p.userId.toString() === userId,
    );

    if (!isInitiator && !isParticipant) {
      throw new ForbiddenException('Not authorized to end this call');
    }

    if (call.status === 'ended') {
      throw new BadRequestException('Call has already ended');
    }

    const now = new Date();
    call.status = 'ended';
    call.endedAt = now;

    // Calculate duration in seconds if the call was active
    if (call.startedAt) {
      call.duration = Math.round(
        (now.getTime() - new Date(call.startedAt).getTime()) / 1000,
      );
    } else {
      call.duration = 0;
    }

    // Mark all pending participants as missed
    call.participants.forEach((p) => {
      if (p.status === 'pending') {
        p.status = 'missed';
      }
      if (p.status === 'joined' && !p.leftAt) {
        p.leftAt = now;
      }
    });

    const savedCall = await call.save();
    this.eventEmitter.emit('call.ended', { call: savedCall, userId });
    return savedCall;
  }

  async getCallHistory(userId: string, limit = 20): Promise<CallDocument[]> {
    const userObjectId = new Types.ObjectId(userId);

    return this.callModel
      .find({
        $or: [
          { initiatorId: userObjectId },
          { 'participants.userId': userObjectId },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .populate('initiatorId', 'username displayName avatar')
      .populate('participants.userId', 'username displayName avatar')
      .exec();
  }

  private async findCallOrThrow(callId: string): Promise<CallDocument> {
    const call = await this.callModel.findById(callId);
    if (!call) {
      throw new NotFoundException('Call not found');
    }
    return call;
  }

  private findParticipantOrThrow(
    call: CallDocument,
    userId: string,
  ): Record<string, any> {
    const participant = call.participants.find(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (p) => p.userId.toString() === userId,
    );
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this call');
    }
    return participant;
  }

  private assertCallNotEnded(call: CallDocument): void {
    if (call.status === 'ended' || call.status === 'declined') {
      throw new BadRequestException('Call has already ended');
    }
  }
}
