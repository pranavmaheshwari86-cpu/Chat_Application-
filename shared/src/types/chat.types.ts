 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from './user.types';

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User | any;
  content: string;
  type?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  isPinned?: boolean;
  expiresAt?: string;
  isFlagged?: boolean;
  readBy?: string[];
  attachments?: any[];
  reactions?: any[];
  status?: 'sending' | 'sent' | 'error';
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationMember {
  userId: string | User | any;
  role?: string;
  joinedAt?: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  members: ConversationMember[];
  lastMessage?: Message;
  adminIds?: string[];
  createdAt?: string;
  updatedAt: string;
}
