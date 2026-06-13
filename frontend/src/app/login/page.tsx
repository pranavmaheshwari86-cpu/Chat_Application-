/* eslint-disable */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await fetch(
        `${apiUrl}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        }
      );
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned an invalid response. The backend might be offline or running on the wrong port.");
      }

      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Login failed");
      }

      // Backend wraps response: { success, data: { accessToken, user } }
      const payload = data.data || data;
      const rawUser = payload.user;
      const accessToken = payload.accessToken;
      
      // Normalize: backend sends `id`, store expects `_id`
      const user = {
        _id: rawUser._id || rawUser.id,
        email: rawUser.email,
        username: rawUser.username,
        displayName: rawUser.displayName,
        avatar: rawUser.avatar,
        status: rawUser.status || 'online',
        bio: rawUser.bio,
      };

      setAuth(user, accessToken);
      router.push("/");
     
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("Cannot reach the server. Please ensure the backend is running on port 3001.");
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/auth/google`;
  };

  return (
    <div className="bg-[#020617] w-full text-[#e1e3e4] font-body min-h-screen antialiased selection:bg-[#E2B859] selection:text-[#101415]">
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-input {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }
        .glass-input:focus-within {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(226, 184, 89, 0.5);
          box-shadow: 0 0 15px rgba(226, 184, 89, 0.1);
        }
        .text-gradient {
          background: linear-gradient(135deg, #E2B859 0%, #9A7B33 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      ` }} />
      <main className="min-h-screen flex w-full">
        {/* BEGIN: LeftBrandingPanel */}
        <section className="hidden lg:flex w-5/12 bg-[#0b0f10] relative overflow-hidden flex-col items-center justify-center p-12 border-r border-[#40484b]/30">
          {/* Ambient light effect */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E2B859]/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center max-w-md">
            {/* Logo */}
            <div className="mb-10 p-6 bg-[#101415] rounded-sm border border-[#40484b]/50 shadow-2xl">
              <Image 
                alt="FlashChat Logo" 
                width={64}
                height={64}
                className="object-contain rounded-lg" 
                src="/flashchat_logo.png"
              />
            </div>
            
            <h1 className="font-heading text-5xl font-semibold mb-6 tracking-tight text-white">
              FlashChat
            </h1>
            
            <p className="text-xl text-[#c0c8cb] font-light leading-relaxed mb-12">
              Where conversations feel <span className="italic text-[#E2B859]/90">effortless</span>.<br/>
              Premium messaging, reimagined.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-auto">
              <span className="px-4 py-1.5 rounded-sm border border-[#40484b]/60 text-xs text-[#c0c8cb] bg-[#191c1e]/50 backdrop-blur-sm tracking-wide">
                End-to-End Encrypted
              </span>
              <span className="px-4 py-1.5 rounded-sm border border-[#40484b]/60 text-xs text-[#c0c8cb] bg-[#191c1e]/50 backdrop-blur-sm tracking-wide">
                Real-Time
              </span>
              <span className="px-4 py-1.5 rounded-sm border border-[#40484b]/60 text-xs text-[#c0c8cb] bg-[#191c1e]/50 backdrop-blur-sm tracking-wide">
                AI-Powered
              </span>
            </div>
          </div>
          
          {/* Small bottom logo mark */}
          <div className="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-[#252829] border border-[#40484b] flex items-center justify-center">
            <span className="text-xs font-heading font-bold text-[#E2B859]">N&apos;</span>
          </div>
        </section>
        {/* END: LeftBrandingPanel */}

        {/* BEGIN: RightLoginForm */}
        <section className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-32 bg-[#020617] relative z-0">
          {/* Subtle ambient light right side */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-[#0b0f10]/50 to-transparent pointer-events-none -z-10"></div>
          
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h2 className="font-heading text-4xl lg:text-5xl font-medium text-white mb-3 tracking-tight">
                Welcome back
              </h2>
              <p className="text-[#c0c8cb] text-sm font-light tracking-wide">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-[#e1e3e4] mb-2" htmlFor="email">Email</label>
                <div className="mt-1 relative glass-input rounded-sm">
                  <input 
                    autoComplete="email" 
                    className="block w-full px-4 py-3 bg-transparent border-0 text-white placeholder-[#c0c8cb]/50 focus:ring-0 text-[16px] transition-colors rounded-sm" 
                    id="email" 
                    name="email" 
                    placeholder="name@example.com" 
                    required 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[#e1e3e4]" htmlFor="password">Password</label>
                  <Link className="text-xs font-medium text-[#c0c8cb] hover:text-[#E2B859] transition-colors" href="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
                <div className="mt-1 relative glass-input rounded-sm flex items-center pr-3">
                  <input 
                    autoComplete="current-password" 
                    className="block w-full px-4 py-3 bg-transparent border-0 text-white placeholder-[#c0c8cb]/50 focus:ring-0 text-[16px] transition-colors rounded-sm" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    required 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    className="text-[#c0c8cb] hover:text-[#e1e3e4] focus:outline-none p-1" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </>
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  disabled={isLoading}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-[#101415] bg-gradient-to-r from-[#E2B859] to-[#9A7B33] hover:from-[#9A7B33] hover:to-[#E2B859] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E2B859] focus:ring-offset-[#020617] transition-all duration-300 items-center group disabled:opacity-70 disabled:cursor-not-allowed" 
                  type="submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <svg className="ml-2 h-4 w-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="mt-8 relative">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#40484b]/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#020617] text-[#c0c8cb] tracking-widest uppercase">
                  OR
                </span>
              </div>
            </div>

            {/* Social Login */}
            <div className="mt-8">
              <button 
                className="w-full flex justify-center items-center py-3 px-4 border border-[#40484b]/40 rounded-sm shadow-sm bg-[#191c1e]/30 hover:bg-[#191c1e]/60 text-sm font-medium text-white transition-colors duration-300" 
                type="button"
                onClick={handleGoogleLogin}
              >
                {/* Google G Logo SVG */}
                <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Register Link */}
            <p className="mt-10 text-center text-sm text-[#c0c8cb] font-light">
              Don&apos;t have an account? 
              <Link className="font-medium text-white hover:text-[#E2B859] transition-colors ml-1" href="/register">Create one</Link>
            </p>
          </div>
        </section>
        {/* END: RightLoginForm */}
      </main>
    </div>
  );
}
