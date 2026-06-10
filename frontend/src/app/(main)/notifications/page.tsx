/* eslint-disable */
"use client";

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

// Placeholder until we implement full notification frontend
export default function NotificationsPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto pt-8 px-4 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6" /> Notifications</h1>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full border-2 border-muted flex items-center justify-center mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No notifications yet</h2>
        <p className="text-sm">When someone likes or comments on your post, it will show up here.</p>
      </div>
    </div>
  );
}
