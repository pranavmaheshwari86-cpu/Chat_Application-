 
import { create } from 'zustand';
import type { User } from '@chat/shared';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isInitializing: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    })),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  checkAuth: async () => {
    // If user already has a valid session (just logged in or registered),
    // skip the refresh call to avoid overwriting the auth state.
    const currentState = useAuthStore.getState();
    if (currentState.accessToken && currentState.isAuthenticated) {
      set({ isInitializing: false });
      return;
    }

    try {
      const { data } = await api.post('/auth/refresh');
      const newAccessToken = data?.data?.accessToken || data?.accessToken;
      const userPayload = data?.data?.user || data?.user;
      if (newAccessToken && userPayload) {
        // Normalize backend id
        const normalizedUser = {
          ...userPayload,
          _id: userPayload._id || userPayload.id,
        };
        set({ user: normalizedUser, accessToken: newAccessToken, isAuthenticated: true, isInitializing: false });
      } else if (newAccessToken) {
        set({ accessToken: newAccessToken, isAuthenticated: true, isInitializing: false });
      } else {
        set({ user: null, accessToken: null, isAuthenticated: false, isInitializing: false });
      }
    } catch (_error) {
      set({ user: null, accessToken: null, isAuthenticated: false, isInitializing: false });
    }
  }
}));

// Optimized Selectors
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsAuthInitializing = () => useAuthStore((state) => state.isInitializing);
export const useAuthActions = () => useAuthStore((state) => ({
  setAuth: state.setAuth,
  setAccessToken: state.setAccessToken,
  updateUser: state.updateUser,
  logout: state.logout,
  checkAuth: state.checkAuth,
}));
