import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, Users, DollarSign, Target, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MarketEntry: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = () => {
    if (!market) {
      toast({ title: 'Error', description: 'Enter target market', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setAnalysis({
        market_attractiveness: 85,
        entry_difficulty: 'medium',
        estimated_investment: 250000,
        roi_projection: 180,
        recommendations: ['Local partnerships essential', 'Adapt pricing strategy', 'Focus on digital channels']
      });
      setLoading(false);
      toast({ title: 'Analysis Complete', description: 'Market entry strategy generated' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            MarketEntry AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Target Market</Label>
            <Input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Enter market/country..." />
          </div>
          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Analyze Market Entry</>}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-center">{analysis.market_attractiveness}%</p>
                <p className="text-sm text-gray-600 text-center">Attractiveness</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-center capitalize">{analysis.entry_difficulty}</p>
                <p className="text-sm text-gray-600 text-center">Entry Difficulty</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold text-center">${(analysis.estimated_investment / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-600 text-center">Investment</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold text-center">{analysis.roi_projection}%</p>
                <p className="text-sm text-gray-600 text-center">ROI (24mo)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Entry Strategy Recommendations</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">{i + 1}</Badge>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MarketEntry;
