 
import api from './api';

export interface Post {
  _id: string;
  caption?: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  author: {
    _id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  error?: string;
}

function unwrapResponse<T>(res: ApiResponse<ApiResponse<T> | T>): T {
  const body = res.data;
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as T;
}

export const feedService = {
  getFeed: async (limit = 10, skip = 0): Promise<Post[]> => {
    const response = await api.get(`/feed?limit=${limit}&skip=${skip}`);
    return unwrapResponse<Post[]>(response);
  },

  likePost: async (postId: string) => {
    const response = await api.post(`/posts/${postId}/like`);
    return unwrapResponse<{ success: boolean; likesCount: number }>(response);
  },

  unlikePost: async (postId: string) => {
    const response = await api.post(`/posts/${postId}/unlike`);
    return unwrapResponse<{ success: boolean; likesCount: number }>(response);
  }
};
