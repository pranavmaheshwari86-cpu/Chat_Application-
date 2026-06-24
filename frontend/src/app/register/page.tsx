/* eslint-disable */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";
import LightRays from "@/components/ui/LightRays";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://server-production-373b.up.railway.app/api"}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
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
      
      if (!res.ok) throw new Error(data?.error?.message || data?.message || "Registration failed");
      
      const payload = data.data || data;
      const rawUser = payload.user;
      const accessToken = payload.accessToken;
      
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
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-[oklch(0.18_0.02_260)] via-[oklch(0.14_0.015_240)] to-[oklch(0.10_0.01_220)]">
        <LightRays raysOrigin="left" raysColor="#10b981" raysSpeed={1.5} followMouse={true} />
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-emerald-500/10 to-transparent blur-3xl"
            animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-violet-500/10 to-transparent blur-3xl"
            animate={{ y: [0, -25, 0], x: [0, 15, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="relative z-10 max-w-md px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Join FlashChat</h1>
            <p className="mt-4 text-lg text-white/60 leading-relaxed">
              Create your account and start
              <br />
              connecting in seconds.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center px-4 lg:w-1/2 relative overflow-hidden">
        <LightRays raysOrigin="right" raysColor="#10b981" raysSpeed={1.5} followMouse={true} />
        <motion.div className="w-full max-w-md relative z-10" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FlashChat</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">Get started for free — no credit card required</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <Input id="username" placeholder="johndoe" value={form.username} onChange={(e) => update("username", e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium">Display Name</label>
                <Input id="displayName" placeholder="John Doe" value={form.displayName} onChange={(e) => update("displayName", e.target.value)} required className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="h-11 w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Create account <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
