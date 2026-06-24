"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // After Google OAuth redirect, the backend sets an accessToken cookie.
    // We read it, store it in Zustand, then clear the cookie.
    const readTokenAndRedirect = async () => {
      try {
        // Read the accessToken from the cookie set by the backend
        const cookies = document.cookie.split(";").reduce((acc, c) => {
          const trimmed = c.trim();
          const idx = trimmed.indexOf("=");
          if (idx === -1) return acc;
          const key = trimmed.slice(0, idx);
          const val = trimmed.slice(idx + 1);
          acc[key] = val;
          return acc;
        }, {} as Record<string, string>);

        const accessToken = cookies["accessToken"];

        if (accessToken) {
          // Clear the temporary cookie
          document.cookie = "accessToken=; path=/; max-age=0";

          // Set the token in the auth store
          useAuthStore.getState().setAccessToken(accessToken);

          // Fetch user profile using the token
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://server-production-373b.up.railway.app/api";
          const res = await fetch(`${apiUrl}/users/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (res.ok) {
            const data = await res.json();
            const userData = data?.data || data;
            const user = {
              _id: userData._id || userData.id,
              email: userData.email,
              username: userData.username,
              displayName: userData.displayName,
              avatar: userData.avatar,
              status: userData.status || "online",
              bio: userData.bio,
            };
            useAuthStore.getState().setAuth(user, accessToken);
          }
        } else {
          // No cookie — try refreshing via the refresh token cookie
          await checkAuth();
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        await checkAuth();
      }

      router.replace("/");
    };

    readTokenAndRedirect();
  }, [router, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-on-surface-variant text-lg">Signing you in...</p>
      </div>
    </div>
  );
}
