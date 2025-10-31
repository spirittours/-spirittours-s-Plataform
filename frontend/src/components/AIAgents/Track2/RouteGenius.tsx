import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, DollarSign, TrendingDown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const RouteGenius: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [optimization, setOptimization] = useState<any>(null);

  const handleOptimize = () => {
    if (!origin || !destination) {
      toast({ title: 'Error', description: 'Enter origin and destination', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setOptimization({
        optimal_route: 'Route A via Highway 101',
        distance: 245,
        estimated_time: 180,
        cost_savings: 45,
        fuel_efficiency: 92,
        waypoints: ['Stop 1', 'Stop 2', 'Stop 3']
      });
      setLoading(false);
      toast({ title: 'Route Optimized', description: 'Best route calculated' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-6 h-6 text-green-600" />
            RouteGenius AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Origin</Label>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Starting point..." />
          </div>
          <div>
            <Label>Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="End point..." />
          </div>
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</> : <>Optimize Route</>}
          </Button>
        </CardContent>
      </Card>

      {optimization && (
        <>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-5 h-5 text-green-600" />
                <p className="font-bold">{optimization.optimal_route}</p>
              </div>
              <p className="text-sm text-gray-600">Recommended optimal route</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{optimization.distance}</p>
                <p className="text-sm text-gray-600">km</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold">{optimization.estimated_time}</p>
                <p className="text-sm text-gray-600">minutes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">${optimization.cost_savings}</p>
                <p className="text-sm text-gray-600">savings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <TrendingDown className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold">{optimization.fuel_efficiency}%</p>
                <p className="text-sm text-gray-600">efficiency</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Route Waypoints</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {optimization.waypoints.map((wp: string, i: number) => (
                  <li key={i} className="flex items-center gap-3">
                    <Badge>{i + 1}</Badge>
                    <span>{wp}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RouteGenius;
