import React, { useState, useEffect } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Target,
  Brain,
  User,
  TrendingUp,
  Sparkles,
  Settings,
  ChevronRight,
  Star,
  Heart,
  ShoppingBag,
  MapPin,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  Users,
  Zap,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  FileDown,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle,
  Info,
  Filter,
  Layers
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, PersonalizationData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

interface UserProfile {
  attribute: string;
  value: number;
  category: string;
}

interface PersonalizationMetric {
  metric: string;
  current: number;
  target: number;
  improvement: number;
  status: 'excellent' | 'good' | 'needs-improvement';
}

interface RecommendationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  relevanceScore: number;
  reason: string;
  tags: string[];
}

interface BehaviorPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: string;
  impact: 'high' | 'medium' | 'low';
}

const PersonalizationEngine: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [sessionData, setSessionData] = useState('');
  const [personalizationResults, setPersonalizationResults] = useState<PersonalizationData | null>(null);
  const [activeModel, setActiveModel] = useState('collaborative');
  const [confidenceThreshold, setConfidenceThreshold] = useState([0.7]);
  const [realTimeMode, setRealTimeMode] = useState(false);

  const userProfile: UserProfile[] = personalizationResults ? [
    { attribute: 'Adventure', value: 85, category: 'interests' },
    { attribute: 'Culture', value: 72, category: 'interests' },
    { attribute: 'Relaxation', value: 45, category: 'interests' },
    { attribute: 'Budget', value: 60, category: 'preferences' },
    { attribute: 'Luxury', value: 78, category: 'preferences' },
    { attribute: 'Social', value: 90, category: 'behavior' },
    { attribute: 'Planner', value: 55, category: 'behavior' },
    { attribute: 'Spontaneous', value: 70, category: 'behavior' }
  ] : [];

  const engagementData = [
    { time: '00:00', engagement: 45, clicks: 12, views: 89 },
    { time: '04:00', engagement: 38, clicks: 8, views: 67 },
    { time: '08:00', engagement: 72, clicks: 23, views: 145 },
    { time: '12:00', engagement: 89, clicks: 34, views: 223 },
    { time: '16:00', engagement: 95, clicks: 42, views: 267 },
    { time: '20:00', engagement: 78, clicks: 28, views: 189 }
  ];

  const personalizationMetrics: PersonalizationMetric[] = personalizationResults ? [
    {
      metric: 'Click-Through Rate',
      current: personalizationResults.engagement_score * 100 || 78,
      target: 85,
      improvement: 12,
      status: 'good'
    },
    {
      metric: 'Conversion Rate',
      current: personalizationResults.conversion_probability * 100 || 34,
      target: 45,
      improvement: 8,
      status: 'needs-improvement'
    },
    {
      metric: 'User Satisfaction',
      current: 92,
      target: 95,
      improvement: 5,
      status: 'excellent'
    },
    {
      metric: 'Recommendation Accuracy',
      current: personalizationResults.recommendation_score * 100 || 87,
      target: 90,
      improvement: 15,
      status: 'good'
    },
    {
      metric: 'Engagement Duration',
      current: 68,
      target: 75,
      improvement: 22,
      status: 'good'
    }
  ] : [];

  const recommendations: RecommendationItem[] = personalizationResults?.recommendations?.map((rec, index) => ({
    id: `rec-${index}`,
    type: rec.type || 'experience',
    title: rec.title || `Recommendation ${index + 1}`,
    description: rec.description || 'Personalized recommendation based on your preferences',
    relevanceScore: rec.score || 0.85,
    reason: rec.reason || 'Based on your recent activity',
    tags: rec.tags || ['adventure', 'culture']
  })) || [];

  const behaviorPatterns: BehaviorPattern[] = personalizationResults ? [
    {
      pattern: 'Morning Browser',
      frequency: 78,
      lastOccurrence: '2 hours ago',
      impact: 'high'
    },
    {
      pattern: 'Weekend Planner',
      frequency: 92,
      lastOccurrence: '3 days ago',
      impact: 'high'
    },
    {
      pattern: 'Mobile User',
      frequency: 65,
      lastOccurrence: '1 hour ago',
      impact: 'medium'
    },
    {
      pattern: 'Deal Seeker',
      frequency: 45,
      lastOccurrence: '1 week ago',
      impact: 'medium'
    },
    {
      pattern: 'Social Sharer',
      frequency: 30,
      lastOccurrence: '2 weeks ago',
      impact: 'low'
    }
  ] : [];

  const segmentDistribution = [
    { segment: 'Adventure Seekers', value: 30, color: '#3B82F6' },
    { segment: 'Culture Enthusiasts', value: 25, color: '#8B5CF6' },
    { segment: 'Luxury Travelers', value: 20, color: '#F59E0B' },
    { segment: 'Budget Conscious', value: 15, color: '#10B981' },
    { segment: 'Family Oriented', value: 10, color: '#EF4444' }
  ];

  const handlePersonalization = async () => {
    if (!userId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a user ID or session data',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.personalizeExperience({
        user_id: userId,
        session_data: sessionData ? JSON.parse(sessionData) : {},
        preferences: {
          interests: ['adventure', 'culture'],
          budget_range: 'medium',
          travel_style: 'exploratory'
        },
        context: {
          device: 'web',
          location: 'unknown',
          time: new Date().toISOString()
        }
      });

      if (response.status === 'success' && response.data) {
        setPersonalizationResults(response.data);
        toast({
          title: 'Personalization Complete',
          description: 'User profile and recommendations have been generated'
        });
      } else {
        throw new Error(response.error || 'Personalization failed');
      }
    } catch (error) {
      console.error('Personalization error:', error);
      toast({
        title: 'Personalization Failed',
        description: error instanceof Error ? error.message : 'Failed to generate personalization',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setPersonalizationResults({
        personalization_id: 'pers-' + Date.now(),
        user_segment: 'adventure_culture_seeker',
        interests_profile: {
          adventure: 0.85,
          culture: 0.72,
          relaxation: 0.45,
          luxury: 0.78,
          budget: 0.60
        },
        behavior_patterns: [
          'Morning browser - most active 8-11 AM',
          'Weekend trip planner',
          'Prefers mobile booking',
          'Responds well to limited-time offers'
        ],
        recommendations: [
          {
            type: 'destination',
            title: 'Hidden Temples of Cambodia',
            description: 'Explore ancient Angkor Wat and lesser-known temples',
            score: 0.92,
            reason: 'Matches your interest in culture and adventure',
            tags: ['culture', 'adventure', 'history']
          },
          {
            type: 'activity',
            title: 'Mountain Trek in Nepal',
            description: '7-day Himalayan trekking experience',
            score: 0.88,
            reason: 'Perfect for your adventurous spirit',
            tags: ['adventure', 'nature', 'challenge']
          },
          {
            type: 'tour',
            title: 'Street Food & Culture Tour',
            description: 'Authentic local experiences in Bangkok',
            score: 0.85,
            reason: 'Combines cultural exploration with adventure',
            tags: ['culture', 'food', 'local']
          }
        ],
        engagement_score: 0.78,
        conversion_probability: 0.34,
        recommendation_score: 0.87,
        next_best_action: 'Show personalized adventure packages',
        ui_customizations: {
          theme: 'adventurous',
          layout: 'image-focused',
          content_priority: ['experiences', 'destinations', 'reviews']
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshPersonalization = () => {
    setPersonalizationResults(null);
    handlePersonalization();
  };

  const exportProfile = () => {
    if (!personalizationResults) return;

    const profile = {
      timestamp: new Date().toISOString(),
      personalization: personalizationResults,
      metrics: personalizationMetrics,
      patterns: behaviorPatterns,
      recommendations
    };

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-profile-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Profile Exported',
      description: 'User personalization profile has been downloaded'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs-improvement': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (realTimeMode && personalizationResults) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        setPersonalizationResults(prev => prev ? {
          ...prev,
          engagement_score: Math.min(1, prev.engagement_score + (Math.random() - 0.5) * 0.05)
        } : null);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [realTimeMode, personalizationResults]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-indigo-600" />
              ML Personalization Engine
            </div>
            {realTimeMode && (
              <Badge className="bg-green-100 text-green-800 animate-pulse">
                <Activity className="w-3 h-3 mr-1" />
                Real-time Mode
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-id">User ID / Session ID</Label>
                <Input
                  id="user-id"
                  placeholder="Enter user or session identifier..."
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="model">ML Model</Label>
                <Select value={activeModel} onValueChange={setActiveModel}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select ML model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaborative">Collaborative Filtering</SelectItem>
                    <SelectItem value="content">Content-Based</SelectItem>
                    <SelectItem value="hybrid">Hybrid Model</SelectItem>
                    <SelectItem value="deep_learning">Deep Learning</SelectItem>
                    <SelectItem value="reinforcement">Reinforcement Learning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="session-data">Session Data (Optional JSON)</Label>
              <Input
                id="session-data"
                placeholder='{"page_views": 10, "time_spent": 300, ...}'
                value={sessionData}
                onChange={(e) => setSessionData(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Confidence Threshold</Label>
                <span className="text-sm text-gray-600">{(confidenceThreshold[0] * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={confidenceThreshold}
                onValueChange={setConfidenceThreshold}
                min={0.5}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <Label htmlFor="real-time" className="cursor-pointer">
                  Real-time Personalization
                </Label>
              </div>
              <Switch
                id="real-time"
                checked={realTimeMode}
                onCheckedChange={setRealTimeMode}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handlePersonalization} 
                disabled={loading || !userId.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing User...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Generate Personalization
                  </>
                )}
              </Button>

              {personalizationResults && (
                <Button onClick={refreshPersonalization} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {personalizationResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">User Segment</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-indigo-100 text-indigo-800">
                  {personalizationResults.user_segment.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  Primary interests: Adventure & Culture
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Engagement Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {(personalizationResults.engagement_score * 100).toFixed(0)}%
                  </span>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <Progress value={personalizationResults.engagement_score * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conversion Probability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {(personalizationResults.conversion_probability * 100).toFixed(0)}%
                  </span>
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <Progress value={personalizationResults.conversion_probability * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Interest Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={userProfile.filter(p => p.category === 'interests')}>
                      <PolarGrid strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="attribute" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Interest Level"
                        dataKey="value"
                        stroke="#6366F1"
                        fill="#6366F1"
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {Object.entries(personalizationResults.interests_profile).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 border rounded">
                        <span className="capitalize">{key}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={value * 100} className="w-20" />
                          <span className="text-sm font-medium">{(value * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Personalized Recommendations</span>
                    <Badge>
                      Score: {(personalizationResults.recommendation_score * 100).toFixed(0)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {rec.type}
                            </Badge>
                            <h4 className="font-medium">{rec.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.floor(rec.relevanceScore * 5)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-600">
                              {(rec.relevanceScore * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex gap-1">
                            {rec.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Alert className="mt-4">
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Next Best Action:</strong> {personalizationResults.next_best_action}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Behavior Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {behaviorPatterns.map((pattern, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{pattern.pattern}</span>
                          <Badge className={getImpactColor(pattern.impact)}>
                            {pattern.impact} impact
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Frequency: {pattern.frequency}%</span>
                          <span>Last: {pattern.lastOccurrence}</span>
                        </div>
                        <Progress value={pattern.frequency} className="mt-2" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Detected Patterns</h4>
                    <div className="space-y-2">
                      {personalizationResults.behavior_patterns.map((pattern, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{pattern}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personalization Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {personalizationMetrics.map((metric) => (
                      <div key={metric.metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{metric.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${getStatusColor(metric.status)}`}>
                              {metric.current.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              (Target: {metric.target}%)
                            </span>
                          </div>
                        </div>
                        <Progress value={metric.current} className="h-2" />
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <TrendingUp className="w-3 h-3 text-green-600" />
                          <span>+{metric.improvement}% improvement</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="#6366F1"
                        strokeWidth={2}
                        name="Engagement %"
                      />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Clicks"
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        name="Views"
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 border rounded">
                      <Eye className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-sm text-gray-600">Avg. Views</p>
                      <p className="font-semibold">156/session</p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <ThumbsUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <p className="text-sm text-gray-600">Interactions</p>
                      <p className="font-semibold">28/session</p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                      <p className="text-sm text-gray-600">Avg. Duration</p>
                      <p className="font-semibold">8.5 min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="segments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Segmentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={segmentDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ segment, value }) => `${segment}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {segmentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="mt-4">
                    <h4 className="font-medium mb-2">UI Customizations</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Theme</span>
                        <Badge>{personalizationResults.ui_customizations?.theme || 'default'}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Layout</span>
                        <Badge>{personalizationResults.ui_customizations?.layout || 'standard'}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Content Priority</span>
                        <div className="flex gap-1">
                          {personalizationResults.ui_customizations?.content_priority?.slice(0, 3).map((item) => (
                            <Badge key={item} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={exportProfile} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Personalization Profile
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

export default PersonalizationEngine;