import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Smartphone, Mail, MessageSquare, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MultiChannel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<string[]>(['email', 'sms']);
  const [strategy, setStrategy] = useState<any>(null);

  const handleOptimize = () => {
    if (channels.length === 0) {
      toast({ title: 'Error', description: 'Select at least one channel', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setStrategy({ selected: channels, reach: 125000, engagement: 68, conversions: 3200 });
      setLoading(false);
      toast({ title: 'Strategy Complete', description: 'Multi-channel strategy generated' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-violet-600" />
            MultiChannel AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label>Select Channels</Label>
          {[
            { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
            { id: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'push', label: 'Push Notifications', icon: <Smartphone className="w-4 h-4" /> },
            { id: 'social', label: 'Social Media', icon: <Globe className="w-4 h-4" /> }
          ].map(ch => (
            <div key={ch.id} className="flex items-center space-x-2">
              <Checkbox checked={channels.includes(ch.id)} onCheckedChange={(checked) => {
                if (checked) setChannels([...channels, ch.id]);
                else setChannels(channels.filter(c => c !== ch.id));
              }} />
              <Label className="flex items-center gap-2">{ch.icon}{ch.label}</Label>
            </div>
          ))}
          <Button onClick={handleOptimize} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Optimizing...</> : <>Optimize Strategy</>}
          </Button>
        </CardContent>
      </Card>
      {strategy && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{strategy.reach.toLocaleString()}</p><p className="text-sm text-gray-600">Total Reach</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-blue-600">{strategy.engagement}%</p><p className="text-sm text-gray-600">Engagement</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{strategy.conversions}</p><p className="text-sm text-gray-600">Conversions</p></CardContent></Card>
        </div>
      )}
    </div>
  );
};

export default MultiChannel;
