import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Percent, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const BookingOptimizer: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentRate, setCurrentRate] = useState('');
  const [optimizationData, setOptimizationData] = useState<any>(null);

  const handleOptimize = async () => {
    if (!currentRate) {
      toast({ title: 'Error', description: 'Please enter conversion rate', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setOptimizationData({
        current_rate: parseFloat(currentRate),
        optimized_rate: parseFloat(currentRate) * 1.35,
        improvement: 35,
        recommendations: ['Simplify checkout', 'Add trust badges', 'Reduce form fields', 'Optimize mobile']
      });
      setLoading(false);
      toast({ title: 'Optimization Complete', description: 'Conversion strategies generated' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-600" />
            BookingOptimizer AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="rate">Current Conversion Rate (%)</Label>
            <Input id="rate" type="number" value={currentRate} onChange={(e) => setCurrentRate(e.target.value)} placeholder="e.g., 3.5" className="mt-1" />
          </div>
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</> : <>Optimize Conversion</>}
          </Button>
        </CardContent>
      </Card>

      {optimizationData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Current Rate</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{optimizationData.current_rate}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Optimized Rate</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-green-600">{optimizationData.optimized_rate.toFixed(1)}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Improvement</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-blue-600">+{optimizationData.improvement}%</p></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {optimizationData.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-600" />
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

export default BookingOptimizer;
