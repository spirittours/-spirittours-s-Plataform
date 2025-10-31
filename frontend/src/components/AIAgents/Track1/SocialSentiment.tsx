import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, TrendingUp, ThumbsUp, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SocialSentiment: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [sentimentData, setSentimentData] = useState<any>(null);

  const handleAnalysis = async () => {
    if (!brandName.trim()) {
      toast({ title: 'Error', description: 'Please enter brand name', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setSentimentData({
        overall_sentiment: 78,
        positive: 65,
        neutral: 25,
        negative: 10,
        mentions: 15420,
        reach: 2850000
      });
      setLoading(false);
      toast({ title: 'Analysis Complete', description: 'Sentiment analysis generated' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-cyan-600" />
            SocialSentiment AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="brand">Brand Name</Label>
            <Input id="brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Enter brand name..." className="mt-1" />
          </div>
          <Button onClick={handleAnalysis} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Analyze Sentiment</>}
          </Button>
        </CardContent>
      </Card>

      {sentimentData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Overall Sentiment</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{sentimentData.overall_sentiment}%</p>
              <Progress value={sentimentData.overall_sentiment} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Total Mentions</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{sentimentData.mentions.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Reach</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{sentimentData.reach.toLocaleString()}</p></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SocialSentiment;
