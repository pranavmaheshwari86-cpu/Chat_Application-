"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import CallOverlay from '@/components/calls/CallOverlay';
import { cn } from '@/lib/utils';
import { Home, Search, Compass, MessageSquare, Bell } from 'lucide-react';

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isInitializing) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitializing, router]);

  if (isInitializing || !isAuthenticated) {
    return <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  const MOBILE_NAV = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Messages', href: '/direct/inbox', icon: MessageSquare },
    { label: 'Alerts', href: '/notifications', icon: Bell },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 relative z-20 bg-background/50">
        <Header />
        <main className="flex-1 overflow-y-auto relative pb-14 md:pb-0">
          {children}
        </main>
        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[#0b0f10]/95 backdrop-blur-xl border-t border-[#40484b]/30 h-14 px-1 safe-area-bottom">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors",
                  isActive ? "text-[#E2B859]" : "text-[#8a9296]"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <CallOverlay />
    </div>
  );
}
