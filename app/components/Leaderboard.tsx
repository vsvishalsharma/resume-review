import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  score: number;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const Leaderboard: React.FC = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // First get resumes with scores
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('id, score, user_id')
        .not('score', 'is', null)
        .eq('status', 'approved')
        .order('score', { ascending: false })
        .limit(10);

      if (resumeError) throw resumeError;

      // Then get profiles for these users
      if (resumeData && resumeData.length > 0) {
        const userIds = resumeData.map(resume => resume.user_id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        // Combine the data
        const leaderboardEntries = resumeData.map(resume => ({
          id: resume.id,
          score: resume.score!,
          profiles: profileData?.find(profile => profile.user_id === resume.user_id) || {
            full_name: null,
            email: 'Unknown'
          }
        }));

        setEntries(leaderboardEntries);
      } else {
        setEntries([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch leaderboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return 'default';
      case 2:
      case 3:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div>Loading leaderboard...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-6 w-6" />
          <span>Resume Leaderboard</span>
        </CardTitle>
        <CardDescription>
          Top-scoring approved resumes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No scores yet</p>
            <p className="text-muted-foreground">
              Be the first to get your resume scored!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => {
              const rank = index + 1;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    rank <= 3 ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRankIcon(rank)}
                      <Badge variant={getRankBadgeVariant(rank)}>
                        #{rank}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">
                        {entry.profiles.full_name || entry.profiles.email}
                      </p>
                      {entry.profiles.full_name && (
                        <p className="text-sm text-muted-foreground">
                          {entry.profiles.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-bold">
                    {entry.score}/100
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;