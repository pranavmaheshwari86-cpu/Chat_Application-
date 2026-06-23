 
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { Conversation, ConversationMember } from '@chat/shared';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { conversations } = useChatStore();

  const currentUserId = user?._id;
  const totalUnreadCount = conversations.reduce((total: number, conv: Conversation) => {
    const member = conv.members?.find((m: ConversationMember) => {
      const mId = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
      return String(mId) === String(currentUserId);
    });
    return total + (member?.unreadCount || 0);
  }, 0);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const NAV_ITEMS = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Search', href: '/search', icon: 'search' },
    { label: 'Explore', href: '/explore', icon: 'explore' },
    { label: 'Messages', href: '/direct/inbox', icon: 'chat' },
    { label: 'Notifications', href: '/notifications', icon: 'notifications' },
    { label: 'Create', href: '/create', icon: 'add_box' },
  ];

  return (
    <aside className="hidden md:flex flex-col h-screen p-4 bg-surface-container/40 backdrop-blur-xl w-sidebar-width border-r border-white/10 shadow-xl shrink-0 z-50">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <Image 
          src="/flashchat_logo.png" 
          alt="FlashChat Logo" 
          width={64} 
          height={64} 
          className="rounded-lg shadow-[0_0_15px_rgba(242,202,80,0.3)] border border-white/5 object-cover"
        />
        <div>
          <h1 className="font-headline-md text-[20px] font-bold text-primary tracking-tight m-0">FlashChat</h1>
        </div>
      </div>
      
      {/* CTA */}
      <Link href="/direct/inbox" className="w-full mb-6 bg-primary text-on-primary py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary-fixed transition-all duration-200 active:duration-75 scale-95 active:scale-90 shadow-[0_4px_14px_0_rgba(173,198,255,0.39)]">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        New Message
      </Link>
      
      {/* Navigation Tabs */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.label} 
              href={item.href} 
              className={cn(
                "nav-item transition-all duration-200 active:duration-75 scale-95 active:scale-90 group",
                isActive 
                  ? "bg-white/10 backdrop-blur-md text-primary shadow-[inset_1px_0_0_0_rgba(255,255,255,0.1)] border border-white/5" 
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              )}
            >
              <div className="relative flex items-center justify-center">
                <span className="material-symbols-outlined transition-colors group-hover:text-primary" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                {item.label === 'Messages' && totalUnreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-[#131313] bg-primary rounded-full border border-[#131313] shadow-[0_0_10px_rgba(173,198,255,0.4)]">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
      
      {/* Bottom Section */}
      <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
        <Link 
          href="/ai" 
          className={cn(
            "nav-item transition-all duration-200 active:duration-75 scale-95 active:scale-90 group",
            pathname === "/ai" 
              ? "bg-white/10 backdrop-blur-md text-primary shadow-[inset_1px_0_0_0_rgba(255,255,255,0.1)] border border-white/5" 
              : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          )}
        >
          <span className="material-symbols-outlined transition-colors group-hover:text-primary" style={{ fontVariationSettings: pathname === "/ai" ? "'FILL' 1" : "'FILL' 0" }}>smart_toy</span>
          AI Chatbot
        </Link>
        <Link 
          href={`/profile/${user?._id || (user as any)?.id || (user as any)?.userId}`} 
          className={cn(
            "nav-item transition-all duration-200 active:duration-75 scale-95 active:scale-90 group",
            pathname.includes(`/profile/${user?._id || (user as any)?.id || (user as any)?.userId}`)
              ? "bg-white/10 backdrop-blur-md text-primary shadow-[inset_1px_0_0_0_rgba(255,255,255,0.1)] border border-white/5" 
              : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          )}
        >
          <Avatar className={cn("w-8 h-8 border", pathname.includes(`/profile/${user?._id || (user as any)?.id || (user as any)?.userId}`) ? "border-primary" : "border-surface-variant")}>
            {user?.avatar && <AvatarImage src={user.avatar} alt={user?.username || "Profile"} className="object-cover" />}
            <AvatarFallback className="bg-surface-variant text-on-surface-variant text-xs">
              {user?.username ? user.username.charAt(0).toUpperCase() : "P"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{user?.username || 'Profile'}</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="nav-item text-on-error hover:bg-on-error/10 scale-95 active:scale-90 w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
