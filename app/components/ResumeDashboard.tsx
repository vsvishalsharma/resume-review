import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Resume {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'approved' | 'needs_revision' | 'rejected' | null;
  score: number | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const ResumeDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResumes = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch resumes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user, fetchResumes]);

  const downloadResume = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: Resume['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'needs_revision':
        return <AlertCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: Resume['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'needs_revision':
        return 'destructive';
      case 'rejected':
        return 'destructive';
    }
  };

  if (loading) {
    return <div>Loading your resumes...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">My Resumes</h2>
        <p className="text-muted-foreground">
          Track the status of your submitted resumes
        </p>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No resumes uploaded yet</p>
            <p className="text-muted-foreground">
              Upload your first resume to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <CardTitle className="text-lg">{resume.file_name}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    {resume.score && (
                      <Badge variant="outline">
                        Score: {resume.score}/100
                      </Badge>
                    )}
                    <Badge variant={getStatusVariant(resume.status)}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(resume.status)}
                        <span className="capitalize">{resume.status?.replace('_', ' ') || 'Pending'}</span>
                      </span>
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Uploaded on {new Date(resume.created_at).toLocaleDateString()}
                  {resume.reviewed_at && (
                    <span> • Reviewed on {new Date(resume.reviewed_at).toLocaleDateString()}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resume.admin_notes && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Admin Notes:</p>
                    <p className="text-sm text-muted-foreground">{resume.admin_notes}</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Size: {(resume.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadResume(resume.file_path, resume.file_name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeDashboard;