"use client";
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Upload, FileText, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResumeUpload from '@/components/ResumeUpload';
import ResumeDashboard from '@/components/ResumeDashboard';
import AdminPanel from '@/components/AdminPanel';
import Leaderboard from '@/components/Leaderboard';

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Wait for auth state to resolve before deciding on redirects.
  if (loading) {
    return null; // or a spinner component if you have one
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Resume Review Platform</h1>
              <p className="text-muted-foreground">
                Welcome back, {profile?.full_name || user.email}
                {profile?.is_admin && (
                  <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    ADMIN
                  </span>
                )}
              </p>
            </div>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>My Resumes</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Leaderboard</span>
            </TabsTrigger>
            {profile?.is_admin && (
              <TabsTrigger value="admin" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">Upload Resume</h2>
              <ResumeUpload onUploadComplete={handleUploadComplete} />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <ResumeDashboard key={refreshKey} />
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Leaderboard />
          </TabsContent>

          {profile?.is_admin && (
            <TabsContent value="admin" className="space-y-6">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;