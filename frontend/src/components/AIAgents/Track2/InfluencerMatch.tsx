import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, Users, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const InfluencerMatch: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState('');
  const [matches, setMatches] = useState<any>(null);

  const handleMatch = () => {
    if (!campaign) {
      toast({ title: 'Error', description: 'Enter campaign details', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setMatches({
        top_matches: [
          { name: '@travel_guru', followers: 125000, engagement: 8.5, fit_score: 92, estimated_cost: 3500 },
          { name: '@adventure_seeker', followers: 89000, engagement: 9.2, fit_score: 88, estimated_cost: 2800 },
          { name: '@luxury_lifestyle', followers: 210000, engagement: 6.8, fit_score: 85, estimated_cost: 5200 }
        ]
      });
      setLoading(false);
      toast({ title: 'Matches Found', description: 'Top influencers identified' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-600" />
            InfluencerMatch AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Campaign Description</Label>
            <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Describe your campaign..." />
          </div>
          <Button onClick={handleMatch} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finding Matches...</> : <>Find Influencers</>}
          </Button>
        </CardContent>
      </Card>

      {matches && (
        <div className="space-y-4">
          {matches.top_matches.map((influencer: any, i: number) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {influencer.name.charAt(1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold">{influencer.name}</p>
                      <p className="text-sm text-gray-600">{influencer.followers.toLocaleString()} followers</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{influencer.fit_score}% Match</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-sm font-medium">{influencer.engagement}%</p>
                    <p className="text-xs text-gray-600">Engagement</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <p className="text-sm font-medium">${influencer.estimated_cost}</p>
                    <p className="text-xs text-gray-600">Est. Cost</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <Star className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
                    <p className="text-sm font-medium">{influencer.fit_score}%</p>
                    <p className="text-xs text-gray-600">Fit Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InfluencerMatch;
