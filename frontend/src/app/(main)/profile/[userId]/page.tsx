/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/services/api";
import dynamic from "next/dynamic";
import Image from "next/image";
import ProfilePosts from "@/components/profile/ProfilePosts";

const ProfileEditModal = dynamic(() => import("@/components/profile/ProfileEditModal"), {
  ssr: false,
});

interface ProfileData {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  headline?: string;
  location?: string;
  skills?: string[];
  accountType?: string;
  trustScore?: number;
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isOwnProfile = currentUser?._id === userId || (currentUser as any)?.id === userId || (currentUser as any)?.userId === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        if (isOwnProfile && currentUser) {
          setProfile(currentUser as any);
        }
        
        const endpoint = isOwnProfile ? "/users/me" : `/users/${userId}`;
        const res = await api.get(endpoint);
        setProfile(res.data?.data || res.data);

        // Fetch follow status if not own profile
        if (!isOwnProfile && currentUser) {
          const followRes = await api.get(`/follows/status/${userId}`);
          setIsFollowing(followRes.data?.isFollowing || false);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, isOwnProfile, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || isActionLoading) return;
    try {
      setIsActionLoading(true);
      if (isFollowing) {
        await api.delete(`/follows/${userId}`);
        setIsFollowing(false);
      } else {
        await api.post(`/follows/${userId}`);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Failed to toggle follow status:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || isActionLoading) return;
    try {
      setIsActionLoading(true);
      // Create or get existing direct conversation
      const res = await api.post('/conversations', { participantId: userId });
      const conversationId = res.data?._id || res.data?.data?._id;
      if (conversationId) {
        router.push(`/direct/inbox?c=${conversationId}`);
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant">Profile not found</div>;
  }

  return (
    <main className="min-h-screen font-body-md text-body-md text-on-surface">
      <div className="max-w-[1000px] mx-auto px-gutter md:px-page-margin py-12">
        {/* Profile Hero Section */}
        <div className="relative mb-section-gap">
          {/* Banner */}
          <div className="h-64 md:h-80 w-full rounded-xl overflow-hidden relative group">
            <div className="absolute inset-0 metallic-gradient opacity-20"></div>
            <Image 
              fill
              className="object-cover grayscale brightness-50 group-hover:scale-105 transition-transform duration-1000" 
              alt="Profile Banner" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKPrhtV1i6TJPHSWZi656xblALwaZ3gdE9my2p20aqXBKWuFjDhPFohHQ7_Cs_rGDNN6pxjnhVVPMdcQ6bPyo9WM2Sk6ps4LJbfYMD1cn9hg3kkCEffHYIWYe4_WSsZrsHusGj6vMuDzYGiKoTrw760pdOmWUBIdeq4bnHnAUvoEkAK-P9UFkSKssVDgDszF622F0l6obA_jEeHw_2_tHwA5BSYYhV9DdipY1Ahtl8ur63fLR4GLYMXzhDJDxfxPtSY4BGqlmR0uY"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60"></div>
          </div>
          
          {/* Avatar Overlay */}
          <div className="absolute -bottom-16 left-8 md:left-12 flex items-end gap-6">
            <div className="bg-background rounded-xl">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl border-4 border-background overflow-hidden bg-surface-container-highest flex items-center justify-center relative shadow-lg">
                {profile.avatar ? (
                  <Image src={profile.avatar} alt="Profile" fill className="object-cover" />
                ) : (
                  <span className="text-6xl md:text-7xl font-display-xl text-primary drop-shadow-lg uppercase">
                    {profile.displayName?.charAt(0) || "U"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Profile Action */}
          <div className="absolute -bottom-12 right-0">
            {isOwnProfile ? (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-8 py-3 rounded-lg metallic-gradient text-background font-label-sm text-label-sm uppercase tracking-widest font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={handleMessage}
                  disabled={isActionLoading}
                  className="px-6 py-3 rounded-lg bg-surface-container border border-outline text-on-surface font-label-sm text-label-sm uppercase tracking-widest font-bold hover:bg-surface-container-high transition-all shadow-lg flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  Message
                </button>
                <button 
                  onClick={handleFollowToggle}
                  disabled={isActionLoading}
                  className={`px-8 py-3 rounded-lg font-label-sm text-label-sm uppercase tracking-widest font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg ${
                    isFollowing 
                      ? "bg-surface-container border border-outline text-on-surface hover:bg-surface-container-high"
                      : "metallic-gradient text-background"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Grid */}
        <div className="mt-24">
          
          {/* Primary Info */}
          <div className="space-y-8">
            <div className="text-reveal">
              <h2 className="font-headline-lg text-headline-lg md:text-display-xl text-on-surface mb-2">{profile.displayName}</h2>
              <p className="text-on-surface-variant font-medium tracking-wide">@{profile.username}</p>
            </div>
            
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>business_center</span>
                <span className="font-label-sm text-label-sm text-on-surface">{profile.accountType || "Personal"}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-outline-variant/10">
                <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span className="font-label-sm text-label-sm text-on-surface">Trust Score: {profile.trustScore || 50}</span>
              </div>
              {profile.location && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-outline-variant/10">
                  <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                  <span className="font-label-sm text-label-sm text-on-surface">{profile.location}</span>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-xl p-8">
              <h3 className="font-headline-lg text-2xl text-primary mb-6">About</h3>
              <p className="text-on-surface-variant leading-relaxed">
                {profile.headline && <span className="block mb-2 font-bold text-on-surface">{profile.headline}</span>}
                {profile.bio || "A creative technologist and curator of digital experiences. Focused on the intersection of high-end aesthetics and functional precision. Currently building the future of atmospheric interfaces at Aura Labs."}
              </p>
            </div>
          </div>
        </div>

        {/* User Posts Section */}
        <section className="mt-16">
          <ProfilePosts userId={userId} />
        </section>
      </div>

      {isOwnProfile && (
        <ProfileEditModal 
          isOpen={isEditModalOpen} 
          onClose={() => {
            setIsEditModalOpen(false);
            api.get("/users/me").then(res => setProfile(res.data));
          }} 
        />
      )}
    </main>
  );
}
