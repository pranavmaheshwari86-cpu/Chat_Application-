'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { Shield, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<{ totalUsers: number; totalConversations: number; totalMessages: number; flaggedMessages: number } | null>(null);
  const [recentUsers, setRecentUsers] = useState<{ _id: string; displayName: string; email: string; role: string; createdAt: string }[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Check if user is admin, if not redirect
    if ((user as { role?: string })?.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchAdminData = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setStats(res.data.stats);
        setRecentUsers(res.data.recentUsers);
      } catch (err) {
        console.error('Failed to fetch admin data', err);
      }
    };

    fetchAdminData();
  }, [user, isAuthenticated, router]);

  if ((user as { role?: string })?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversations</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Messages</CardTitle>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flaggedMessages}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Recent Users</h2>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
              <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
              <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentUsers.map((u) => (
              <tr key={u._id} className="hover:bg-muted/50 transition-colors">
                <td className="p-4">{u.displayName}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {u.role || 'user'}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <Button variant="outline" size="sm" onClick={() => {
                    api.post(`/admin/users/${u._id}/role`, { role: u.role === 'admin' ? 'user' : 'admin' })
                      .then(() => window.location.reload());
                  }}>
                    Toggle Role
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
