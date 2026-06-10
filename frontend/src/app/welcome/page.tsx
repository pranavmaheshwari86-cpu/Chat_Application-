"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ArrowRight, Zap, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Sub-80ms real-time messaging powered by WebSocket technology.",
    },
    {
      icon: Shield,
      title: "Secure by Design",
      description: "End-to-end encryption with JWT authentication and refresh token rotation.",
    },
    {
      icon: Globe,
      title: "Built to Scale",
      description: "Redis-backed Socket.IO adapter for seamless horizontal scaling.",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/4 -left-1/4 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-violet-500/[0.07] to-transparent blur-3xl"
          animate={{ y: [0, 50, 0], x: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 h-[700px] w-[700px] rounded-full bg-gradient-to-tl from-blue-500/[0.07] to-transparent blur-3xl"
          animate={{ y: [0, -40, 0], x: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-emerald-500/[0.04] to-cyan-500/[0.04] blur-2xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">FlashChat</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/login")}>
            Sign in
          </Button>
          <Button onClick={() => router.push("/register")}>
            Get started
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-24 text-center lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-muted-foreground">Now in beta — free to use</span>
          </motion.div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Messaging that feels
            <br />
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              like the future
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            FlashChat brings you lightning-fast real-time messaging with a premium experience.
            Built with modern architecture for teams and individuals who expect the best.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base" onClick={() => router.push("/register")}>
              Start chatting — free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" onClick={() => router.push("/login")}>
              Sign in
            </Button>
          </div>
        </motion.div>

        {/* Mock UI preview */}
        <motion.div
          className="mx-auto mt-20 max-w-4xl"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="relative rounded-xl border border-border/50 bg-card/30 p-1 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
                <div className="mx-auto flex h-6 w-64 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                  flashchat.app/chat
                </div>
              </div>

              {/* Fake chat preview */}
              <div className="flex h-80">
                {/* Sidebar preview */}
                <div className="hidden w-60 border-r border-border p-3 sm:block">
                  {["Sarah Chen", "Engineering Team", "Alex Rivera"].map((name, i) => (
                    <div
                      key={name}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${i === 0 ? "bg-accent" : ""}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                        {name.split(" ").map(w => w[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {i === 0 ? "Hey! Have you seen..." : i === 1 ? "Deployment went smooth..." : "Let me send you the..."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Messages preview */}
                <div className="flex flex-1 flex-col">
                  <div className="flex-1 space-y-3 p-4">
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted shrink-0 mt-0.5" />
                      <div className="rounded-2xl rounded-bl-md bg-secondary px-3 py-1.5 text-xs max-w-[70%]">
                        Hey! Have you seen the new design specs? 🎨
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-1.5 text-xs max-w-[70%]">
                        Yes! They look incredible ✨
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted shrink-0 mt-0.5" />
                      <div className="rounded-2xl rounded-bl-md bg-secondary px-3 py-1.5 text-xs max-w-[70%]">
                        That was exactly the vibe — quiet luxury 🖤
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border p-3">
                    <div className="h-8 rounded-lg bg-muted/50 border border-border" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          className="mt-24 grid gap-8 sm:grid-cols-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {features.map((feature) => (
            <div key={feature.title} className="group rounded-xl border border-border/50 bg-card/50 p-6 text-left backdrop-blur-sm transition-all hover:border-border hover:bg-card">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} FlashChat. Crafted with precision.
        </p>
      </footer>
    </div>
  );
}
