import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gem, Star, TrendingUp, Award, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const LuxuryUpsell: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState('');
  const [upsells, setUpsells] = useState<any>(null);

  const handleGenerate = () => {
    if (!booking) {
      toast({ title: 'Error', description: 'Enter booking details', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setUpsells({
        opportunities: [
          { service: 'VIP Airport Transfer', value: 150, probability: 75, description: 'Premium car service with meet & greet' },
          { service: 'Suite Upgrade', value: 280, probability: 62, description: 'Luxury suite with ocean view' },
          { service: 'Spa Package', value: 420, probability: 58, description: 'Full day wellness experience' }
        ],
        total_potential: 850
      });
      setLoading(false);
      toast({ title: 'Upsells Generated', description: 'Premium opportunities identified' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="w-6 h-6 text-purple-600" />
            LuxuryUpsell AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Booking ID or Customer Profile</Label>
            <Input value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="Enter booking details..." />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <>Generate Upsell Opportunities</>}
          </Button>
        </CardContent>
      </Card>

      {upsells && (
        <>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-purple-600" />
                  <span className="font-medium">Total Upsell Potential</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">${upsells.total_potential}</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {upsells.opportunities.map((opp: any, i: number) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-bold">{opp.service}</h3>
                        <Badge className="bg-purple-100 text-purple-800">{opp.probability}% likely</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{opp.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">${opp.value}</p>
                      <p className="text-xs text-gray-600">Additional revenue</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${opp.probability}%` }}></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LuxuryUpsell;
