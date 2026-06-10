"use client";

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, Bell, Settings } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize query from URL if we are on the search page
  const [query, setQuery] = useState(searchParams?.get('q') || "");

  useEffect(() => {
    const q = searchParams?.get('q');
    if (q !== null && q !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      router.replace(`/search?q=${encodeURIComponent(val)}`);
    } else {
      router.replace(`/search`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="flex justify-between items-center px-3 sm:px-5 md:px-8 h-14 sm:h-16 w-full bg-[#0b0f10] border-b border-[#40484b]/30 z-30 shrink-0">
      {/* Command Bar (Search) */}
      <div className="flex-1 max-w-2xl min-w-0">
        <div className="relative flex items-center bg-[#191c1e]/60 border border-[#40484b]/50 rounded-xl group hover:border-[#E2B859]/50 focus-within:border-[#E2B859]/50 transition-colors shadow-inner">
          <Search className="absolute left-3 sm:left-3.5 h-4 w-4 text-[#8a9296] group-focus-within:text-[#E2B859] transition-colors shrink-0" />
          <input 
            ref={inputRef}
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-[#e1e3e4] text-[14px] pl-9 sm:pl-10 pr-4 sm:pr-16 py-2 sm:py-2.5 focus:ring-0 focus:outline-none placeholder:text-[#8a9296]" 
            placeholder="Search…" 
            type="text"
          />
          <div className="absolute right-2.5 hidden sm:flex items-center gap-1 pointer-events-none">
            <kbd className="font-semibold text-[11px] bg-[#303435] px-1.5 py-0.5 rounded-md text-[#c0c8cb] border border-[#40484b] tracking-wider shadow-sm">⌘K</kbd>
          </div>
        </div>
      </div>
      
      {/* Trailing Actions */}
      <div className="flex items-center gap-1 sm:gap-2 ml-3 sm:ml-6">
        <Link href="/notifications" className="text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors relative p-1.5 sm:p-2">
          <Bell className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
          <span className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#E2B859] border-2 border-[#0b0f10]"></span>
        </Link>
        <Link href="/settings" className="text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors p-1.5 sm:p-2">
          <Settings className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        </Link>
      </div>
    </header>
  );
}
