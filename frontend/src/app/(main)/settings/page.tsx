"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Bell, Shield, Palette, Moon, Sun,
  Camera, Save, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { generateAvatarInitials } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    username: user?.username || "",
    bio: user?.bio || "",
    email: user?.email || "",
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    updateUser(form);
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="hidden w-48 shrink-0 space-y-1 md:block">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage your public profile information
                  </p>
                </div>

                {/* Avatar section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      {user?.avatar && <AvatarImage src={user.avatar} />}
                      <AvatarFallback className="text-lg">
                        {generateAvatarInitials(user?.displayName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm">
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username}</p>
                  </div>
                </div>

                <Separator />

                {/* Form */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display Name</label>
                    <Input
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input value={form.email} disabled className="h-10 opacity-60" />
                    <p className="text-xs text-muted-foreground">
                      Contact support to change your email address
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      maxLength={200}
                      rows={3}
                      className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Tell us about yourself…"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {form.bio.length}/200
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save changes
                  </Button>
                </div>
              </motion.div>
            )}

            {activeTab === "appearance" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-lg font-semibold">Appearance</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Customize the look and feel of FlashChat
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "System", icon: Palette },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      className="flex flex-col items-center gap-3 rounded-xl border border-border p-4 transition-all hover:bg-accent/50 data-[active=true]:border-primary data-[active=true]:bg-primary/5"
                      data-active={theme.id === "dark"}
                    >
                      <theme.icon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Configure how you receive notifications</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Desktop notifications", desc: "Show desktop push notifications for new messages" },
                    { label: "Sound", desc: "Play a sound when you receive a new message" },
                    { label: "Mention alerts", desc: "Get notified when someone @mentions you" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <div className="h-6 w-10 cursor-pointer rounded-full bg-primary p-0.5">
                        <div className="h-5 w-5 translate-x-4 rounded-full bg-primary-foreground transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "privacy" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold">Privacy</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Control your privacy settings</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Show online status", desc: "Let others see when you are online" },
                    { label: "Read receipts", desc: "Let others know when you have read their messages" },
                    { label: "Last seen", desc: "Show your last active time to others" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <div className="h-6 w-10 cursor-pointer rounded-full bg-primary p-0.5">
                        <div className="h-5 w-5 translate-x-4 rounded-full bg-primary-foreground transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
