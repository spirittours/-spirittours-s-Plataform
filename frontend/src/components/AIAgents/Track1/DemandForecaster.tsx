import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DemandForecaster: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [forecast, setForecast] = useState<any>(null);

  const handleForecast = () => {
    if (!destination) {
      toast({ title: 'Error', description: 'Enter destination', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setForecast({ predicted_demand: 8500, capacity: 10000, utilization: 85 });
      setLoading(false);
      toast({ title: 'Forecast Complete', description: 'Demand prediction generated' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-600" />
            DemandForecaster AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Enter destination..." />
          </div>
          <Button onClick={handleForecast} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Forecasting...</> : <>Generate Forecast</>}
          </Button>
        </CardContent>
      </Card>
      {forecast && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{forecast.predicted_demand}</p><p className="text-sm text-gray-600">Predicted Demand</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{forecast.capacity}</p><p className="text-sm text-gray-600">Capacity</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{forecast.utilization}%</p><p className="text-sm text-gray-600">Utilization</p></CardContent></Card>
        </div>
      )}
    </div>
  );
};

export default DemandForecaster;
