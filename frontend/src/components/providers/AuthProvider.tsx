"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore(state => state.checkAuth);
  
  useEffect(() => {
    // Run exactly once on mount to establish secure session without local tokens
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}
