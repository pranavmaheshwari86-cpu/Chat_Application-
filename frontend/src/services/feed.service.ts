 
/* eslint-disable @typescript-eslint/no-explicit-any */
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

export const feedService = {
  getFeed: async (limit = 10, skip = 0) => {
    const response = await api.get<Post[]>(`/feed?limit=${limit}&skip=${skip}`);
    // After Axios interceptor: response = { success, data: [...posts] }
    const posts = (response as any)?.data || (Array.isArray(response) ? response : []);
    return posts;
  },

  likePost: async (postId: string) => {
    const response = await api.post<{ success: boolean; likesCount: number }>(`/posts/${postId}/like`);
    return (response as any)?.data || response;
  },

  unlikePost: async (postId: string) => {
    const response = await api.post<{ success: boolean; likesCount: number }>(`/posts/${postId}/unlike`);
    return (response as any)?.data || response;
  }
};
