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
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Heart,
  Activity,
  Sparkles,
  Sun,
  Moon,
  Apple,
  Dumbbell,
  Brain,
  Wind,
  Droplet,
  Mountain,
  Smile,
  Coffee,
  Battery,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Target,
  Calendar,
  Clock,
  Star,
  Award,
  FileDown,
  Send,
  Loader2,
  Zap,
  Flame
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, WellnessData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  RadarChart,
  Radar,
  LineChart,
  Line,
  BarChart,
  Bar,
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

interface WellnessPillar {
  pillar: string;
  score: number;
  target: number;
  status: 'optimal' | 'good' | 'needs-attention' | 'critical';
  icon: React.ReactNode;
}

interface WellnessActivity {
  category: string;
  activity: string;
  duration: number;
  frequency: string;
  benefits: string[];
  intensity: 'low' | 'moderate' | 'high';
}

interface HealthMetric {
  metric: string;
  current: number;
  optimal: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
}

interface WellnessPlan {
  day: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
}

const WellnessOptimizer: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [age, setAge] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [healthGoals, setHealthGoals] = useState<string[]>([
    'stress_reduction',
    'fitness',
    'sleep_quality',
    'nutrition'
  ]);
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [currentConditions, setCurrentConditions] = useState('');
  const [stressLevel, setStressLevel] = useState([5]);
  const [sleepHours, setSleepHours] = useState([7]);
  const [wellnessResults, setWellnessResults] = useState<WellnessData | null>(null);

  const wellnessPillars: WellnessPillar[] = wellnessResults ? [
    {
      pillar: 'Physical Fitness',
      score: wellnessResults.fitness_score || 72,
      target: 85,
      status: 'good',
      icon: <Dumbbell className="w-5 h-5" />
    },
    {
      pillar: 'Mental Health',
      score: wellnessResults.mental_health_score || 68,
      target: 80,
      status: 'needs-attention',
      icon: <Brain className="w-5 h-5" />
    },
    {
      pillar: 'Nutrition',
      score: wellnessResults.nutrition_score || 78,
      target: 90,
      status: 'good',
      icon: <Apple className="w-5 h-5" />
    },
    {
      pillar: 'Sleep Quality',
      score: wellnessResults.sleep_score || 65,
      target: 85,
      status: 'needs-attention',
      icon: <Moon className="w-5 h-5" />
    },
    {
      pillar: 'Stress Management',
      score: wellnessResults.stress_management_score || 60,
      target: 80,
      status: 'needs-attention',
      icon: <Wind className="w-5 h-5" />
    },
    {
      pillar: 'Hydration',
      score: wellnessResults.hydration_score || 82,
      target: 90,
      status: 'good',
      icon: <Droplet className="w-5 h-5" />
    }
  ] : [];

  const recommendedActivities: WellnessActivity[] = wellnessResults ? [
    {
      category: 'Fitness',
      activity: 'Morning Yoga',
      duration: 30,
      frequency: 'Daily',
      benefits: ['Flexibility', 'Stress relief', 'Energy boost'],
      intensity: 'low'
    },
    {
      category: 'Fitness',
      activity: 'Cardio Training',
      duration: 45,
      frequency: '3x per week',
      benefits: ['Heart health', 'Weight management', 'Endurance'],
      intensity: 'high'
    },
    {
      category: 'Mental',
      activity: 'Meditation',
      duration: 15,
      frequency: 'Daily',
      benefits: ['Stress reduction', 'Mental clarity', 'Emotional balance'],
      intensity: 'low'
    },
    {
      category: 'Mental',
      activity: 'Mindfulness Walk',
      duration: 20,
      frequency: 'Daily',
      benefits: ['Mental reset', 'Nature connection', 'Perspective'],
      intensity: 'low'
    },
    {
      category: 'Nutrition',
      activity: 'Meal Prep Sunday',
      duration: 120,
      frequency: 'Weekly',
      benefits: ['Healthy eating', 'Time saving', 'Portion control'],
      intensity: 'low'
    },
    {
      category: 'Recovery',
      activity: 'Spa Treatment',
      duration: 90,
      frequency: 'Monthly',
      benefits: ['Deep relaxation', 'Muscle recovery', 'Self-care'],
      intensity: 'low'
    }
  ] : [];

  const healthMetrics: HealthMetric[] = [
    { metric: 'Resting Heart Rate', current: 68, optimal: 60, unit: 'bpm', trend: 'improving' },
    { metric: 'Blood Pressure', current: 125, optimal: 120, unit: 'mmHg', trend: 'stable' },
    { metric: 'Body Mass Index', current: 24.5, optimal: 22, unit: 'kg/m²', trend: 'improving' },
    { metric: 'Sleep Duration', current: 7, optimal: 8, unit: 'hours', trend: 'stable' },
    { metric: 'Water Intake', current: 2.2, optimal: 2.5, unit: 'liters', trend: 'improving' },
    { metric: 'Daily Steps', current: 8500, optimal: 10000, unit: 'steps', trend: 'improving' }
  ];

  const weeklyPlan: WellnessPlan[] = [
    {
      day: 'Monday',
      morning: ['30min Yoga', 'Healthy breakfast', 'Hydration (500ml)'],
      afternoon: ['45min Cardio', 'Balanced lunch', 'Power nap (20min)'],
      evening: ['Light dinner', '15min Meditation', 'Sleep by 10 PM']
    },
    {
      day: 'Tuesday',
      morning: ['20min Stretching', 'Protein smoothie', 'Morning walk'],
      afternoon: ['Strength training', 'Lean protein lunch', 'Mindful break'],
      evening: ['Healthy dinner', 'Relaxing bath', 'Reading time']
    },
    {
      day: 'Wednesday',
      morning: ['30min Pilates', 'Oatmeal breakfast', 'Breathing exercises'],
      afternoon: ['45min Swimming', 'Salad lunch', 'Hydration check'],
      evening: ['Light dinner', 'Gentle yoga', 'Sleep routine']
    }
  ];

  const progressData = [
    { week: 'Week 1', fitness: 60, mental: 55, nutrition: 65, sleep: 58 },
    { week: 'Week 2', fitness: 65, mental: 60, nutrition: 70, sleep: 62 },
    { week: 'Week 3', fitness: 68, mental: 63, nutrition: 73, sleep: 65 },
    { week: 'Week 4', fitness: 72, mental: 68, nutrition: 78, sleep: 65 },
    { week: 'Current', fitness: 72, mental: 68, nutrition: 78, sleep: 65 }
  ];

  const wellnessRadarData = wellnessPillars.map(p => ({
    pillar: p.pillar,
    score: p.score,
    target: p.target
  }));

  const handleWellnessAssessment = async () => {
    if (!userName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide your information',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.optimizeWellness({
        user_name: userName,
        age: parseInt(age) || 30,
        fitness_level: fitnessLevel,
        health_goals: healthGoals,
        dietary_preferences: dietaryPreferences.split(',').map(p => p.trim()),
        current_conditions: currentConditions.split(',').map(c => c.trim()),
        stress_level: stressLevel[0],
        sleep_hours: sleepHours[0]
      });

      if (response.status === 'success' && response.data) {
        setWellnessResults(response.data);
        toast({
          title: 'Assessment Complete',
          description: 'Your personalized wellness plan has been generated'
        });
      } else {
        throw new Error(response.error || 'Assessment failed');
      }
    } catch (error) {
      console.error('Wellness assessment error:', error);
      toast({
        title: 'Assessment Failed',
        description: error instanceof Error ? error.message : 'Failed to complete wellness assessment',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setWellnessResults({
        wellness_id: 'well-' + Date.now(),
        overall_wellness_score: 71,
        fitness_score: 72,
        mental_health_score: 68,
        nutrition_score: 78,
        sleep_score: 65,
        stress_management_score: 60,
        hydration_score: 82,
        personalized_plan: {
          fitness: [
            '30 minutes yoga daily',
            '45 minutes cardio 3x per week',
            'Strength training 2x per week'
          ],
          nutrition: [
            'Balanced meals with lean protein',
            'Increase vegetable intake',
            'Reduce processed foods',
            'Stay hydrated - 2.5L water daily'
          ],
          mental_health: [
            '15 minutes daily meditation',
            'Mindfulness practices',
            'Quality social connections',
            'Stress management techniques'
          ],
          sleep: [
            'Consistent sleep schedule',
            'Create bedtime routine',
            'Limit screen time before bed',
            'Optimize sleep environment'
          ]
        },
        recommended_activities: [
          { activity: 'Morning Yoga', frequency: 'Daily', duration: 30, type: 'fitness' },
          { activity: 'Meditation', frequency: 'Daily', duration: 15, type: 'mental' },
          { activity: 'Cardio Training', frequency: '3x week', duration: 45, type: 'fitness' },
          { activity: 'Spa Treatment', frequency: 'Monthly', duration: 90, type: 'recovery' }
        ],
        health_metrics: {
          heart_rate: 68,
          blood_pressure: '125/80',
          bmi: 24.5,
          sleep_quality: 65,
          stress_level: stressLevel[0],
          activity_level: 'moderate'
        },
        wellness_tips: [
          'Start your day with hydration',
          'Take regular movement breaks',
          'Practice gratitude daily',
          'Prioritize sleep quality',
          'Connect with nature regularly'
        ],
        improvement_priority: [
          'Increase sleep duration to 8 hours',
          'Enhance stress management practices',
          'Build consistent exercise routine',
          'Improve nutritional balance'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs-attention': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'stable': return <Activity className="w-4 h-4 text-blue-600" />;
      case 'declining': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const exportWellnessPlan = () => {
    if (!wellnessResults) return;

    const plan = {
      timestamp: new Date().toISOString(),
      user: { name: userName, age, fitnessLevel },
      assessment: wellnessResults,
      pillars: wellnessPillars,
      activities: recommendedActivities,
      metrics: healthMetrics,
      weeklyPlan
    };

    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellness-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Plan Exported',
      description: 'Your personalized wellness plan has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-teal-600" />
            Wellness Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  placeholder="Enter your name..."
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Your age..."
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fitness-level">Current Fitness Level</Label>
                <Select value={fitnessLevel} onValueChange={setFitnessLevel}>
                  <SelectTrigger id="fitness-level">
                    <SelectValue placeholder="Select fitness level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="athlete">Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dietary">Dietary Preferences (comma-separated)</Label>
                <Input
                  id="dietary"
                  placeholder="e.g., vegetarian, gluten-free..."
                  value={dietaryPreferences}
                  onChange={(e) => setDietaryPreferences(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="conditions">Current Health Conditions (comma-separated)</Label>
              <Input
                id="conditions"
                placeholder="e.g., allergies, injuries, chronic conditions..."
                value={currentConditions}
                onChange={(e) => setCurrentConditions(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Current Stress Level</Label>
                <Badge>{stressLevel[0]}/10</Badge>
              </div>
              <Slider
                value={stressLevel}
                onValueChange={setStressLevel}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Average Sleep Hours</Label>
                <Badge>{sleepHours[0]} hours</Badge>
              </div>
              <Slider
                value={sleepHours}
                onValueChange={setSleepHours}
                min={4}
                max={12}
                step={0.5}
                className="w-full"
              />
            </div>

            <div>
              <Label>Health & Wellness Goals</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { id: 'stress_reduction', label: 'Stress Reduction', icon: <Wind className="w-4 h-4" /> },
                  { id: 'fitness', label: 'Fitness', icon: <Dumbbell className="w-4 h-4" /> },
                  { id: 'sleep_quality', label: 'Sleep Quality', icon: <Moon className="w-4 h-4" /> },
                  { id: 'nutrition', label: 'Nutrition', icon: <Apple className="w-4 h-4" /> },
                  { id: 'weight_management', label: 'Weight', icon: <Target className="w-4 h-4" /> },
                  { id: 'energy', label: 'Energy', icon: <Zap className="w-4 h-4" /> }
                ].map((goal) => (
                  <div key={goal.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal.id}
                      checked={healthGoals.includes(goal.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setHealthGoals([...healthGoals, goal.id]);
                        } else {
                          setHealthGoals(healthGoals.filter(g => g !== goal.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={goal.id}
                      className="text-sm font-normal cursor-pointer flex items-center gap-1"
                    >
                      {goal.icon}
                      {goal.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleWellnessAssessment} 
              disabled={loading || !userName.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Wellness Plan...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Personalized Wellness Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {wellnessResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Wellness Score</span>
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-teal-600" />
                  <span className="text-2xl font-bold text-teal-600">
                    {wellnessResults.overall_wellness_score}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={wellnessResults.overall_wellness_score} className="h-4 mb-4" />
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your wellness journey is progressing well! Focus on the priority areas below for optimal results.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wellness Dimensions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={wellnessRadarData}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="pillar" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Current"
                      dataKey="score"
                      stroke="#14B8A6"
                      fill="#14B8A6"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Target"
                      dataKey="target"
                      stroke="#94A3B8"
                      fill="#94A3B8"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="fitness" stroke="#14B8A6" strokeWidth={2} />
                    <Line type="monotone" dataKey="mental" stroke="#8B5CF6" strokeWidth={2} />
                    <Line type="monotone" dataKey="nutrition" stroke="#F59E0B" strokeWidth={2} />
                    <Line type="monotone" dataKey="sleep" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pillars" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="pillars">Pillars</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="plan">Weekly Plan</TabsTrigger>
              <TabsTrigger value="tips">Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="pillars" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Wellness Pillars Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {wellnessPillars.map((pillar) => (
                      <div key={pillar.pillar} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pillar.icon}
                            <span className="font-medium">{pillar.pillar}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${getStatusColor(pillar.status)}`}>
                              {pillar.score}%
                            </span>
                            <span className="text-xs text-gray-500">
                              (Target: {pillar.target}%)
                            </span>
                          </div>
                        </div>
                        <Progress value={pillar.score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              {recommendedActivities.map((activity, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{activity.activity}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">{activity.category}</Badge>
                        <Badge className={getIntensityColor(activity.intensity)}>
                          {activity.intensity}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{activity.duration} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{activity.frequency}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Benefits:</p>
                      <div className="flex flex-wrap gap-2">
                        {activity.benefits.map((benefit, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Health Metrics Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {healthMetrics.map((metric, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{metric.metric}</span>
                          {getTrendIcon(metric.trend)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Current: {metric.current} {metric.unit}</span>
                          <span>Optimal: {metric.optimal} {metric.unit}</span>
                        </div>
                        <Progress 
                          value={(metric.current / metric.optimal) * 100} 
                          className="h-2 mt-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              {weeklyPlan.map((day, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{day.day}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sun className="w-4 h-4 text-yellow-600" />
                          <span className="font-medium text-sm">Morning</span>
                        </div>
                        <ul className="space-y-1">
                          {day.morning.map((item, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-orange-600" />
                          <span className="font-medium text-sm">Afternoon</span>
                        </div>
                        <ul className="space-y-1">
                          {day.afternoon.map((item, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Moon className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-sm">Evening</span>
                        </div>
                        <ul className="space-y-1">
                          {day.evening.map((item, idx) => (
                            <li key={idx} className="text-sm flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="tips" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Wellness Tips & Priorities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        Daily Wellness Tips
                      </h4>
                      <div className="space-y-2">
                        {wellnessResults.wellness_tips?.map((tip, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-teal-50 rounded">
                            <Star className="w-4 h-4 text-teal-600" />
                            <span className="text-sm">{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-600" />
                        Priority Improvements
                      </h4>
                      <div className="space-y-2">
                        {wellnessResults.improvement_priority?.map((priority, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 border rounded">
                            <div className="bg-orange-100 p-1 rounded">
                              <Flame className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="text-sm flex-1">{priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={exportWellnessPlan} className="w-full" variant="outline">
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Complete Wellness Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default WellnessOptimizer;