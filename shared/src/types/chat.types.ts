 
import type { User } from './user.types';

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface DeliveredReceipt {
  userId: string;
  deliveredAt: string;
}

export interface Attachment {
  _id: string;
  type: 'image' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // for audio/video
  width?: number;
  height?: number;
}

export interface Reaction {
  emoji: string;
  userId: string;
  createdAt: string;
}

export interface ReplyTo {
  _id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  content: string;
  type?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  isPinned?: boolean;
  expiresAt?: string;
  isFlagged?: boolean;
  readBy?: ReadReceipt[];
  deliveredTo?: DeliveredReceipt[];
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: ReplyTo;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationLastMessage {
  _id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: string;
  createdAt: Date | string;
}

export interface ConversationMember {
  userId: string | User;
  role?: string;
  joinedAt?: string;
  unreadCount?: number;
  isArchived?: boolean;
}

export interface ConversationSettings {
  onlyAdminsCanSend?: boolean;
  onlyAdminsCanEdit?: boolean;
  disappearingMessages?: {
    enabled: boolean;
    duration: number;
  };
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  members: ConversationMember[];
  lastMessage?: ConversationLastMessage;
  adminIds?: string[];
  settings?: ConversationSettings;
  inviteCode?: string;
  directKey?: string;
  isE2E?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt: string;
}
