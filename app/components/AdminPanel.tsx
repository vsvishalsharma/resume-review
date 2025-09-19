import React, { useEffect, useState } from 'react';
import { FileText, Download, Eye, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResumeWithProfile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: 'pending' | 'approved' | 'needs_revision' | 'rejected';
  score: number | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const AdminPanel: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [resumes, setResumes] = useState<ResumeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchAllResumes();
    }
  }, [profile]);

  const fetchAllResumes = async () => {
    try {
      // First get all resumes
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });

      if (resumeError) throw resumeError;

      // Then get all profiles for these users
      if (resumeData && resumeData.length > 0) {
        const userIds = resumeData.map(resume => resume.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        // Combine the data
        const resumesWithProfiles = resumeData.map(resume => ({
          ...resume,
          profiles: profileData?.find(profile => profile.user_id === resume.user_id) || {
            full_name: null,
            email: 'Unknown'
          }
        }));

        setResumes(resumesWithProfiles);
      } else {
        setResumes([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch resumes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateResume = async (
    resumeId: string,
    status: 'pending' | 'approved' | 'needs_revision' | 'rejected',
    score: number | null,
    adminNotes: string
  ) => {
    setUpdating(resumeId);
    try {
      const { error } = await supabase
        .from('resumes')
        .update({
          status,
          score,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', resumeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Resume updated successfully',
      });

      fetchAllResumes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update resume',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

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
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const viewResume = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to view resume',
        variant: 'destructive',
      });
    }
  };

  if (!profile?.is_admin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-muted-foreground">
            You don't have admin privileges
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div>Loading resumes...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <p className="text-muted-foreground">
          Review and manage all submitted resumes
        </p>
      </div>

      <div className="grid gap-6">
        {resumes.map((resume) => (
          <ResumeReviewCard
            key={resume.id}
            resume={resume}
            onUpdate={updateResume}
            onDownload={downloadResume}
            onView={viewResume}
            updating={updating === resume.id}
          />
        ))}
      </div>
    </div>
  );
};

interface ResumeReviewCardProps {
  resume: ResumeWithProfile;
  onUpdate: (id: string, status: 'pending' | 'approved' | 'needs_revision' | 'rejected', score: number | null, notes: string) => void;
  onDownload: (filePath: string, fileName: string) => void;
  onView: (filePath: string) => void;
  updating: boolean;
}

const ResumeReviewCard: React.FC<ResumeReviewCardProps> = ({
  resume,
  onUpdate,
  onDownload,
  onView,
  updating,
}) => {
  const [status, setStatus] = useState(resume.status);
  const [score, setScore] = useState(resume.score?.toString() || '');
  const [notes, setNotes] = useState(resume.admin_notes || '');

  const handleSave = () => {
    const scoreValue = score ? parseInt(score) : null;
    if (scoreValue && (scoreValue < 0 || scoreValue > 100)) {
      return;
    }
    onUpdate(resume.id, status, scoreValue, notes);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{resume.file_name}</CardTitle>
            <CardDescription>
              Submitted by {resume.profiles.full_name || resume.profiles.email} on{' '}
              {new Date(resume.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {(resume.file_size / 1024 / 1024).toFixed(2)} MB
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(resume.file_path)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(resume.file_path, resume.file_name)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: 'pending' | 'approved' | 'needs_revision' | 'rejected') => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="needs_revision">Needs Revision</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="score">Score (0-100)</Label>
            <Input
              id="score"
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Enter score"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Admin Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for the applicant..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={updating}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {updating ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;