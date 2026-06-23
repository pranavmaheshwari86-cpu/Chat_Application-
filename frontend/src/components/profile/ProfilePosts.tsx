"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import api from "@/services/api";
import CreatePostModal from "./CreatePostModal";
import { Copy, Heart, MessageSquare } from "lucide-react";

interface PostData {
  _id: string;
  images: string[];
  caption?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface ProfilePostsProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function ProfilePosts({ userId, isOwnProfile }: ProfilePostsProps) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/posts/user/${userId}`);
      // Based on typical nestjs response wrappers:
      setPosts(res.data?.data || res.data || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <section className="mt-section-gap">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">Posts</h3>
          <p className="text-on-surface-variant">Gallery of recent updates</p>
        </div>
        {isOwnProfile && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2 rounded-lg metallic-gradient text-background font-label-sm text-label-sm uppercase tracking-widest font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Post
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">photo_library</span>
          <p className="text-on-surface font-headline-md text-xl mb-2">No Posts Yet</p>
          <p className="text-on-surface-variant">
            {isOwnProfile ? "Share your first photo or update with your network." : "This user hasn't posted anything yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post._id} className="aspect-square rounded-xl overflow-hidden glass-panel group relative cursor-pointer">
              <Image 
                fill 
                className="object-cover group-hover:scale-110 transition-transform duration-700" 
                alt="Post Thumbnail" 
                src={post.images[0] || "/flashchat_logo.png"}
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              {/* Multiple images indicator */}
              {post.images.length > 1 && (
                <div className="absolute top-3 right-3 bg-background/60 backdrop-blur-md p-1.5 rounded text-on-surface">
                  <Copy className="w-4 h-4" />
                </div>
              )}
              {/* Hover overlay with stats */}
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-on-surface font-bold text-lg">
                  <Heart fill="currentColor" className="w-6 h-6" />
                  <span>{post.likesCount || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface font-bold text-lg">
                  <MessageSquare fill="currentColor" className="w-6 h-6" />
                  <span>{post.commentsCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreatePostModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onPostCreated={fetchPosts}
        />
      )}
    </section>
  );
}
