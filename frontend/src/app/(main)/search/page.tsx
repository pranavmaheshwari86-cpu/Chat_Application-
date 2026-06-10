/* eslint-disable */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import api from "@/services/api";

interface SearchUser {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (value: string) => {
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get<SearchUser[]>(`/search/users?q=${value}`);
      const users = (res as any)?.data || (Array.isArray(res) ? res : []);
      setResults(Array.isArray(users) ? users : []);
    } catch (error) {
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const currentQuery = searchParams.get('q') || "";
  
  useEffect(() => {
    if (currentQuery) {
      performSearch(currentQuery);
    } else {
      setResults([]);
    }
  }, [currentQuery]);

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto pt-10 px-4">
      {/* Search Input moved to Global Header */}
      
      {loading && (
        <div className="flex justify-center mb-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {results.map((user) => (
          <div 
            key={user._id}
            className="flex items-center gap-4 p-3 hover:bg-secondary/80 rounded-xl cursor-pointer transition-colors"
            onClick={() => router.push(`/profile/${user._id}`)}
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{user.username}</span>
              {user.displayName && <span className="text-xs text-muted-foreground">{user.displayName}</span>}
            </div>
          </div>
        ))}
        {currentQuery.length >= 2 && !loading && results.length === 0 && (
          <div className="text-center text-muted-foreground mt-10">
            No users found matching "{currentQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
