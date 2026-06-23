/* eslint-disable */
"use client";

import { useEffect, useState } from 'react';
import { feedService, Post } from '@/services/feed.service';
import { Heart, MessageCircle, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Don't fetch if the user isn't authenticated — the layout guard
    // will redirect to /login, and firing the request would only
    // produce a 401 error toast on the login page.
    if (!isAuthenticated) return;

    let cancelled = false;

    const fetchExplore = async () => {
      try {
        setLoading(true);
        // Using getFeed as a fallback for explore since we don't have a dedicated explore endpoint
        const data = await feedService.getFeed();
        if (!cancelled) {
          // getFeed returns Post[]
          setPosts(Array.isArray(data) ? data : []);
        }
      } catch (error: any) {
        // Silently ignore auth errors — the interceptor will handle
        // the redirect; showing a toast here just confuses the user.
        const status = error?.response?.status;
        if (status === 401 || status === 403) return;

        if (!cancelled) {
          toast.error('Failed to load explore feed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchExplore();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (loading) {
    return <div className="flex justify-center mt-20 text-muted-foreground">Loading explore...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto pt-8 px-4 overflow-y-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Compass className="w-6 h-6" /> Explore</h1>
      </div>

      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {posts.map(post => (
          <div 
            key={post._id} 
            className="relative aspect-square group cursor-pointer bg-secondary"
            onClick={() => router.push(`/profile/${post.author?._id}`)}
          >
            {post.images && post.images.length > 0 && (
              <Image src={post.images[0] as string} alt="Post" fill className="object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-lg">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 fill-white" /> {post.likesCount || 0}
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6 fill-white" /> {post.commentsCount || 0}
              </div>
            </div>
          </div>
        ))}
      </div>
      {posts.length === 0 && (
        <div className="text-center text-muted-foreground mt-20">No posts to explore yet.</div>
      )}
    </div>
  );
}
