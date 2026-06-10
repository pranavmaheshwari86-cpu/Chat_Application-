/* eslint-disable */
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
        </motion.div>

        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          This page doesn&apos;t exist. Maybe the conversation moved elsewhere?
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Button>
          </Link>
          <Link href="/">
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" />
              Open chat
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
