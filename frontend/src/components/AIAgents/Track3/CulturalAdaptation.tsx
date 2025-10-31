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
  Globe,
  Languages,
  Users,
  Heart,
  BookOpen,
  Calendar,
  Music,
  Utensils,
  Home,
  Star,
  AlertCircle,
  CheckCircle,
  Info,
  MapPin,
  Clock,
  MessageSquare,
  Sparkles,
  Shield,
  HandshakeIcon,
  Gift,
  Palette,
  Church,
  FileDown,
  Send,
  Loader2,
  Flag,
  Compass
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, CulturalAdaptationData } from '../types';
import { useToast } from '@/components/ui/use-toast';

interface CulturalDimension {
  dimension: string;
  localScore: number;
  visitorScore: number;
  gap: number;
  recommendation: string;
}

interface CulturalGuideline {
  category: string;
  do: string[];
  dont: string[];
  importance: 'critical' | 'high' | 'medium' | 'low';
}

interface LanguageSupport {
  language: string;
  proficiency: 'native' | 'fluent' | 'conversational' | 'basic';
  coverage: number;
  resources: string[];
}

interface CulturalEvent {
  name: string;
  date: string;
  type: string;
  significance: string;
  touristParticipation: 'welcome' | 'observe-only' | 'restricted';
}

const CulturalAdaptation: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [visitorOrigin, setVisitorOrigin] = useState('');
  const [travelDates, setTravelDates] = useState('');
  const [groupType, setGroupType] = useState('');
  const [interests, setInterests] = useState('');
  const [adaptationResults, setAdaptationResults] = useState<CulturalAdaptationData | null>(null);

  const culturalDimensions: CulturalDimension[] = adaptationResults ? [
    {
      dimension: 'Power Distance',
      localScore: 75,
      visitorScore: 40,
      gap: 35,
      recommendation: 'Show respect for hierarchy and formal titles'
    },
    {
      dimension: 'Individualism',
      localScore: 25,
      visitorScore: 85,
      gap: 60,
      recommendation: 'Emphasize group harmony and collective experiences'
    },
    {
      dimension: 'Uncertainty Avoidance',
      localScore: 80,
      visitorScore: 50,
      gap: 30,
      recommendation: 'Provide clear structure and detailed information'
    },
    {
      dimension: 'Long-term Orientation',
      localScore: 90,
      visitorScore: 45,
      gap: 45,
      recommendation: 'Respect traditions while explaining their historical context'
    },
    {
      dimension: 'Indulgence',
      localScore: 30,
      visitorScore: 70,
      gap: 40,
      recommendation: 'Balance between restraint and freedom of expression'
    }
  ] : [];

  const culturalGuidelines: CulturalGuideline[] = adaptationResults ? [
    {
      category: 'Greetings & Social Interaction',
      do: [
        'Bow slightly when greeting elders',
        'Use both hands when giving or receiving items',
        'Remove shoes when entering homes or temples',
        'Dress modestly, especially at religious sites'
      ],
      dont: [
        'Touch someone\'s head',
        'Point with your finger',
        'Show affection publicly',
        'Use left hand for eating or greeting'
      ],
      importance: 'critical'
    },
    {
      category: 'Dining Etiquette',
      do: [
        'Wait for the eldest to start eating',
        'Try all dishes offered',
        'Compliment the food',
        'Leave a small amount on your plate'
      ],
      dont: [
        'Refuse food or drink initially',
        'Stick chopsticks upright in rice',
        'Pass food with chopsticks',
        'Finish everything on your plate'
      ],
      importance: 'high'
    },
    {
      category: 'Religious Sites',
      do: [
        'Cover shoulders and knees',
        'Remove shoes before entering',
        'Walk clockwise around sacred objects',
        'Maintain silence or speak softly'
      ],
      dont: [
        'Take photos without permission',
        'Touch religious artifacts',
        'Turn your back to Buddha statues',
        'Wear revealing clothing'
      ],
      importance: 'critical'
    },
    {
      category: 'Business & Negotiations',
      do: [
        'Exchange business cards with both hands',
        'Build personal relationships first',
        'Show patience in negotiations',
        'Respect hierarchical decision-making'
      ],
      dont: [
        'Rush business discussions',
        'Be overly direct or confrontational',
        'Ignore protocol and formalities',
        'Make decisions without consultation'
      ],
      importance: 'medium'
    }
  ] : [];

  const languageSupport: LanguageSupport[] = adaptationResults ? [
    {
      language: adaptationResults.language_support?.primary || 'Local Language',
      proficiency: 'native',
      coverage: 100,
      resources: ['Local guides', 'Signage', 'Official documents']
    },
    {
      language: 'English',
      proficiency: 'conversational',
      coverage: 60,
      resources: ['Tourist areas', 'Hotels', 'Major restaurants']
    },
    {
      language: 'Mandarin',
      proficiency: 'basic',
      coverage: 30,
      resources: ['Some tourist guides', 'Major hotels']
    },
    {
      language: 'Spanish',
      proficiency: 'basic',
      coverage: 15,
      resources: ['Limited tourist services']
    }
  ] : [];

  const culturalEvents: CulturalEvent[] = adaptationResults ? [
    {
      name: 'Harvest Festival',
      date: 'October 15-17',
      type: 'Traditional',
      significance: 'Celebration of agricultural abundance',
      touristParticipation: 'welcome'
    },
    {
      name: 'Temple Anniversary',
      date: 'November 3',
      type: 'Religious',
      significance: 'Sacred ceremony for local deity',
      touristParticipation: 'observe-only'
    },
    {
      name: 'New Year Celebration',
      date: 'December 31 - January 2',
      type: 'Cultural',
      significance: 'Traditional new year rituals',
      touristParticipation: 'welcome'
    },
    {
      name: 'Coming of Age Ceremony',
      date: 'January 15',
      type: 'Social',
      significance: 'Youth transition to adulthood',
      touristParticipation: 'restricted'
    }
  ] : [];

  const handleCulturalAnalysis = async () => {
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
      const response = await aiAgentsService.adaptCulturally({
        destination: destination,
        visitor_origin: visitorOrigin,
        travel_dates: travelDates,
        group_composition: groupType,
        interests: interests.split(',').map(i => i.trim()),
        language_preferences: ['English']
      });

      if (response.status === 'success' && response.data) {
        setAdaptationResults(response.data);
        toast({
          title: 'Analysis Complete',
          description: 'Cultural adaptation guidelines have been generated'
        });
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Cultural analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to generate cultural guidelines',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setAdaptationResults({
        adaptation_id: 'cult-' + Date.now(),
        destination_culture: destination || 'Southeast Asian Culture',
        visitor_culture: visitorOrigin || 'Western Culture',
        cultural_distance_score: 0.72,
        key_differences: [
          'Collectivist vs Individualist society',
          'High-context vs Low-context communication',
          'Hierarchical vs Egalitarian structures',
          'Indirect vs Direct feedback style'
        ],
        dos_and_donts: {
          dos: [
            'Remove shoes when entering homes',
            'Use respectful greetings',
            'Dress modestly at religious sites',
            'Accept hospitality graciously'
          ],
          donts: [
            'Touch people\'s heads',
            'Point with feet',
            'Public displays of affection',
            'Raise voice in public'
          ]
        },
        communication_tips: [
          'Use indirect communication style',
          'Pay attention to non-verbal cues',
          'Show respect through formal language',
          'Avoid confrontational discussions'
        ],
        etiquette_guidelines: {
          greetings: 'Slight bow with hands together',
          dining: 'Wait for elders to eat first',
          gifts: 'Present with both hands',
          dress_code: 'Conservative, cover shoulders and knees'
        },
        religious_considerations: [
          'Buddhism is the primary religion',
          'Remove shoes in temples',
          'Don\'t point feet at Buddha statues',
          'Photography may be restricted'
        ],
        local_customs: [
          'Morning alms giving to monks',
          'Festival celebrations throughout the year',
          'Traditional markets and bargaining',
          'Community-centered activities'
        ],
        language_support: {
          primary: 'Local Language',
          secondary: ['English', 'Mandarin'],
          useful_phrases: [
            'Hello - Sawadee',
            'Thank you - Khop khun',
            'Sorry - Khor thot',
            'How much - Tao rai'
          ]
        },
        sensitivity_level: 'high',
        adaptation_recommendations: [
          'Attend cultural orientation session',
          'Learn basic local phrases',
          'Research religious customs',
          'Prepare modest clothing'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getParticipationColor = (type: string) => {
    switch (type) {
      case 'welcome': return 'text-green-600';
      case 'observe-only': return 'text-yellow-600';
      case 'restricted': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const exportGuidelines = () => {
    if (!adaptationResults) return;

    const guidelines = {
      timestamp: new Date().toISOString(),
      destination: destination,
      origin: visitorOrigin,
      adaptation: adaptationResults,
      dimensions: culturalDimensions,
      guidelines: culturalGuidelines,
      events: culturalEvents,
      languages: languageSupport
    };

    const blob = new Blob([JSON.stringify(guidelines, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cultural-guidelines-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Guidelines Exported',
      description: 'Cultural adaptation guidelines have been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Cultural Adaptation Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="destination">Destination Culture/Country</Label>
                <Input
                  id="destination"
                  placeholder="e.g., Japan, Thailand, Morocco..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="origin">Visitor Origin/Culture</Label>
                <Input
                  id="origin"
                  placeholder="e.g., United States, Europe, China..."
                  value={visitorOrigin}
                  onChange={(e) => setVisitorOrigin(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dates">Travel Dates</Label>
                <Input
                  id="dates"
                  type="text"
                  placeholder="e.g., October 15-25, 2024"
                  value={travelDates}
                  onChange={(e) => setTravelDates(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="group">Group Type</Label>
                <Select value={groupType} onValueChange={setGroupType}>
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Select group type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo Traveler</SelectItem>
                    <SelectItem value="couple">Couple</SelectItem>
                    <SelectItem value="family">Family with Children</SelectItem>
                    <SelectItem value="friends">Friends Group</SelectItem>
                    <SelectItem value="business">Business Delegation</SelectItem>
                    <SelectItem value="educational">Educational Tour</SelectItem>
                    <SelectItem value="senior">Senior Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="interests">Cultural Interests (comma-separated)</Label>
              <Input
                id="interests"
                placeholder="e.g., temples, local cuisine, festivals, art, music..."
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleCulturalAnalysis} 
              disabled={loading || !destination.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Cultural Context...
                </>
              ) : (
                <>
                  <Compass className="mr-2 h-4 w-4" />
                  Generate Cultural Guidelines
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {adaptationResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Cultural Distance Analysis</span>
                <Badge className={getSensitivityColor(adaptationResults.sensitivity_level)}>
                  {adaptationResults.sensitivity_level} sensitivity
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Cultural Distance Score</span>
                  <span className="text-2xl font-bold">
                    {(adaptationResults.cultural_distance_score * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={adaptationResults.cultural_distance_score * 100} className="h-3" />
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Destination:</strong> {adaptationResults.destination_culture}<br />
                    <strong>Visitor:</strong> {adaptationResults.visitor_culture}
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-medium mb-2">Key Cultural Differences</h4>
                  <div className="space-y-2">
                    {adaptationResults.key_differences.map((diff, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">{diff}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="guidelines" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
              <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
              <TabsTrigger value="language">Language</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="customs">Customs</TabsTrigger>
            </TabsList>

            <TabsContent value="guidelines" className="space-y-4">
              {culturalGuidelines.map((guideline) => (
                <Card key={guideline.category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{guideline.category}</span>
                      <Badge className={getSensitivityColor(guideline.importance)}>
                        {guideline.importance}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Do's
                        </h4>
                        <ul className="space-y-1">
                          {guideline.do.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          Don'ts
                        </h4>
                        <ul className="space-y-1">
                          {guideline.dont.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-red-600 mt-0.5">✗</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle>Communication Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {adaptationResults.communication_tips.map((tip, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{tip}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dimensions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cultural Dimensions Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {culturalDimensions.map((dimension) => (
                      <div key={dimension.dimension} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{dimension.dimension}</span>
                          <Badge variant={dimension.gap > 40 ? 'destructive' : dimension.gap > 20 ? 'secondary' : 'default'}>
                            Gap: {dimension.gap}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <span>Local: {dimension.localScore}</span>
                          <span>•</span>
                          <span>Visitor: {dimension.visitorScore}</span>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded">
                          <div
                            className="absolute h-2 bg-blue-600 rounded"
                            style={{ width: `${dimension.localScore}%` }}
                          />
                          <div
                            className="absolute h-1 bg-orange-600 rounded mt-0.5"
                            style={{ width: `${dimension.visitorScore}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">{dimension.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Language Support & Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {languageSupport.map((lang, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Languages className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{lang.language}</span>
                          </div>
                          <Badge variant={
                            lang.proficiency === 'native' ? 'default' :
                            lang.proficiency === 'fluent' ? 'secondary' : 'outline'
                          }>
                            {lang.proficiency}
                          </Badge>
                        </div>
                        <Progress value={lang.coverage} className="h-2 mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Coverage: {lang.coverage}%</p>
                        <div className="flex flex-wrap gap-1">
                          {lang.resources.map((resource, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {adaptationResults.language_support?.useful_phrases && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Useful Phrases</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {adaptationResults.language_support.useful_phrases.map((phrase, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                            {phrase}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cultural Events & Festivals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {culturalEvents.map((event, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-purple-600" />
                              <span className="font-medium">{event.name}</span>
                            </div>
                            <p className="text-sm text-gray-600">{event.date}</p>
                          </div>
                          <Badge variant="outline">{event.type}</Badge>
                        </div>
                        <p className="text-sm mb-2">{event.significance}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Tourist Participation:</span>
                          <span className={`text-sm font-medium ${getParticipationColor(event.touristParticipation)}`}>
                            {event.touristParticipation.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Local Customs & Traditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Church className="w-4 h-4 text-purple-600" />
                        Religious Considerations
                      </h4>
                      <div className="space-y-2">
                        {adaptationResults.religious_considerations.map((consideration, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                            <Info className="w-4 h-4 text-purple-600" />
                            <span className="text-sm">{consideration}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-red-600" />
                        Local Customs
                      </h4>
                      <div className="space-y-2">
                        {adaptationResults.local_customs.map((custom, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded">
                            <Star className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm">{custom}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-green-600" />
                        Etiquette Guidelines
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(adaptationResults.etiquette_guidelines).map(([key, value]) => (
                          <div key={key} className="p-3 border rounded">
                            <p className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                            <p className="text-sm font-medium mt-1">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Adaptation Recommendations
                      </h4>
                      <div className="space-y-2">
                        {adaptationResults.adaptation_recommendations.map((rec, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button onClick={exportGuidelines} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Cultural Guidelines
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default CulturalAdaptation;