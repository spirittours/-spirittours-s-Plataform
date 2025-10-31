import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Palette,
  MapPin,
  Heart,
  Star,
  Sparkles,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Camera,
  Utensils,
  Hotel,
  Plane,
  Mountain,
  Music,
  ShoppingBag,
  Trophy,
  Target,
  TrendingUp,
  CheckCircle,
  Info,
  FileDown,
  Send,
  Loader2
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, ExperienceCuratorData } from '../types';
import { useToast } from '@/components/ui/use-toast';

const ExperienceCurator: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [interests, setInterests] = useState('');
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [curatedExperience, setCuratedExperience] = useState<ExperienceCuratorData | null>(null);

  const handleCuration = async () => {
    if (!destination.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a destination',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.curateExperience({
        destination,
        interests: interests.split(',').map(i => i.trim()),
        budget,
        duration: parseInt(duration) || 7,
        travel_style: travelStyle,
        group_size: parseInt(groupSize) || 2
      });

      if (response.status === 'success' && response.data) {
        setCuratedExperience(response.data);
        toast({
          title: 'Experience Curated',
          description: 'Personalized travel experience has been created'
        });
      } else {
        throw new Error(response.error || 'Curation failed');
      }
    } catch (error) {
      console.error('Curation error:', error);
      setCuratedExperience({
        experience_id: 'exp-' + Date.now(),
        title: `Personalized ${destination} Experience`,
        description: `A carefully curated ${duration}-day journey through ${destination}, tailored to your interests and preferences.`,
        personalization_score: 0.92,
        customer_segment: travelStyle || 'adventure',
        recommendations: [
          {
            type: 'attraction',
            name: 'Historic City Center',
            description: 'Explore centuries of history and culture',
            rating: 4.8,
            duration: 180,
            cost: 25
          },
          {
            type: 'restaurant',
            name: 'Local Cuisine Experience',
            description: 'Authentic traditional dishes',
            rating: 4.9,
            duration: 120,
            cost: 65
          },
          {
            type: 'activity',
            name: 'Adventure Tour',
            description: 'Guided outdoor adventure',
            rating: 4.7,
            duration: 240,
            cost: 120
          }
        ]
      });
      toast({
        title: 'Using Sample Data',
        description: 'Showing sample curated experience',
        variant: 'default'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-pink-600" />
            ExperienceCurator AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  placeholder="Where do you want to go?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="7"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="interests">Interests (comma-separated)</Label>
              <Input
                id="interests"
                placeholder="e.g., history, food, adventure, culture..."
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="budget">Budget Level</Label>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger id="budget">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget-Friendly</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="ultra_luxury">Ultra Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="style">Travel Style</Label>
                <Select value={travelStyle} onValueChange={setTravelStyle}>
                  <SelectTrigger id="style">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="family">Family-Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="group">Group Size</Label>
                <Input
                  id="group"
                  type="number"
                  placeholder="2"
                  value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button 
              onClick={handleCuration} 
              disabled={loading || !destination.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Curating Experience...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Curate Personalized Experience
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {curatedExperience && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{curatedExperience.title}</span>
                <Badge className="bg-pink-100 text-pink-800">
                  {(curatedExperience.personalization_score * 100).toFixed(0)}% Match
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{curatedExperience.description}</p>
              <Progress value={curatedExperience.personalization_score * 100} className="h-3" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {curatedExperience.recommendations?.map((rec, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {rec.type === 'attraction' && <Camera className="w-5 h-5 text-blue-600" />}
                        {rec.type === 'restaurant' && <Utensils className="w-5 h-5 text-orange-600" />}
                        {rec.type === 'activity' && <Mountain className="w-5 h-5 text-green-600" />}
                        <h3 className="font-semibold text-lg">{rec.name}</h3>
                        <Badge variant="outline">{rec.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span>{rec.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{rec.duration} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span>${rec.cost}</span>
                        </div>
                      </div>
                    </div>
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

export default ExperienceCurator;