export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
  displayName?: string;
  accountType?: 'personal' | 'creator' | 'business' | 'org';
  headline?: string;
  skills?: string[];
  portfolio?: Array<{ title: string; url: string; thumbnail?: string }>;
  socialLinks?: { website?: string; twitter?: string; github?: string; linkedin?: string };
  trustScore?: number;
  badges?: Array<{ type: string; label: string; awardedAt: Date }>;
  interests?: string[];
  location?: string;
}

export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
}
