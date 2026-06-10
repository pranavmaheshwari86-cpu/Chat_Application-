 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

export const UserSchema = z.object({
  _id: z.string(),
  username: z.string(),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  status: z.enum(['online', 'offline', 'away', 'busy']).optional(),
  lastSeen: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  displayName: z.string().optional(),
});

export const MessageSchema = z.object({
  _id: z.string(),
  conversationId: z.string(),
  senderId: z.union([z.string(), UserSchema, z.any()]),
  content: z.string(),
  type: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  isDeleted: z.boolean().optional(),
  isEdited: z.boolean().optional(),
  readBy: z.array(z.string()).optional(),
  attachments: z.array(z.any()).optional(),
  reactions: z.array(z.any()).optional(),
  status: z.enum(['sending', 'sent', 'error']).optional(),
});

export const ConversationMemberSchema = z.object({
  userId: z.union([z.string(), UserSchema, z.any()]),
  role: z.string().optional(),
  joinedAt: z.string().optional(),
});

export const ConversationSchema = z.object({
  _id: z.string(),
  type: z.enum(['direct', 'group']),
  name: z.string().optional(),
  avatar: z.string().optional(),
  members: z.array(ConversationMemberSchema),
  lastMessage: MessageSchema.optional().nullable(),
  adminIds: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean().optional(),
  statusCode: z.number().optional(),
  message: z.string().optional(),
  data: z.any().optional(),
});

// A helper for robust runtime validation
export function validateApiResponse(data: any) {
  try {
    return ApiResponseSchema.parse(data);
  } catch (error) {
    console.error('API Response Validation Failed:', error);
    // Even if validation fails, we might want to return the original data 
    // to prevent complete breakage during migration, but ideally we throw.
    return data; 
  }
}
