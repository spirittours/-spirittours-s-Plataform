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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Pencil,
  Sparkles,
  Globe,
  TrendingUp,
  Target,
  Eye,
  Share2,
  ThumbsUp,
  MessageSquare,
  Search,
  Zap,
  Award,
  Clock,
  Users,
  FileText,
  Image,
  Video,
  Mic,
  Code,
  CheckCircle,
  AlertCircle,
  Info,
  Copy,
  Download,
  RefreshCw,
  Send,
  Loader2,
  BarChart3,
  Languages
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, ContentMasterData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
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

interface GeneratedContent {
  id: string;
  type: string;
  title: string;
  content: string;
  seoScore: number;
  readabilityScore: number;
  engagementScore: number;
  wordCount: number;
  keywords: string[];
  language: string;
}

interface ContentMetric {
  metric: string;
  score: number;
  benchmark: number;
  status: 'excellent' | 'good' | 'needs-improvement';
}

interface ABTestVariant {
  variant: string;
  headline: string;
  cta: string;
  predictedCTR: number;
  engagement: number;
}

const ContentMaster: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contentTopic, setContentTopic] = useState('');
  const [contentType, setContentType] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('');
  const [keywords, setKeywords] = useState('');
  const [contentLength, setContentLength] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [enableSEO, setEnableSEO] = useState(true);
  const [enableABTest, setEnableABTest] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<ContentMasterData | null>(null);

  const contentMetrics: ContentMetric[] = generatedContent ? [
    {
      metric: 'SEO Optimization',
      score: generatedContent.seo_optimized ? 92 : 65,
      benchmark: 85,
      status: generatedContent.seo_optimized ? 'excellent' : 'needs-improvement'
    },
    {
      metric: 'Readability',
      score: 88,
      benchmark: 80,
      status: 'excellent'
    },
    {
      metric: 'Engagement Potential',
      score: generatedContent.engagement_score || 85,
      benchmark: 75,
      status: 'excellent'
    },
    {
      metric: 'Keyword Density',
      score: 78,
      benchmark: 70,
      status: 'good'
    },
    {
      metric: 'Mobile Optimization',
      score: 95,
      benchmark: 90,
      status: 'excellent'
    },
    {
      metric: 'Content Uniqueness',
      score: 98,
      benchmark: 95,
      status: 'excellent'
    }
  ] : [];

  const abTestVariants: ABTestVariant[] = [
    {
      variant: 'A - Original',
      headline: 'Discover Paradise: Your Dream Vacation Awaits',
      cta: 'Book Now',
      predictedCTR: 3.2,
      engagement: 68
    },
    {
      variant: 'B - Emotional',
      headline: 'Create Unforgettable Memories in Paradise',
      cta: 'Start Your Journey',
      predictedCTR: 4.1,
      engagement: 82
    },
    {
      variant: 'C - Urgent',
      headline: 'Limited Time: Exclusive Paradise Getaway',
      cta: 'Claim Your Spot',
      predictedCTR: 5.8,
      engagement: 91
    },
    {
      variant: 'D - Value',
      headline: 'Paradise Made Affordable: Luxury for Less',
      cta: 'See Deals',
      predictedCTR: 4.5,
      engagement: 76
    }
  ];

  const performanceData = [
    { week: 'Week 1', views: 1200, engagement: 45, conversions: 38 },
    { week: 'Week 2', views: 2100, engagement: 62, conversions: 52 },
    { week: 'Week 3', views: 3400, engagement: 78, conversions: 68 },
    { week: 'Week 4', views: 4800, engagement: 85, conversions: 82 }
  ];

  const contentQualityRadar = [
    { aspect: 'Originality', score: 98 },
    { aspect: 'Clarity', score: 92 },
    { aspect: 'Engagement', score: 85 },
    { aspect: 'SEO', score: 88 },
    { aspect: 'Readability', score: 90 },
    { aspect: 'Value', score: 87 }
  ];

  const handleGenerateContent = async () => {
    if (!contentTopic.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a content topic',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.generateContent({
        topic: contentTopic,
        content_type: contentType,
        target_audience: targetAudience,
        tone: tone,
        keywords: keywords.split(',').map(k => k.trim()),
        length: contentLength,
        languages: selectedLanguages,
        seo_optimize: enableSEO,
        include_ab_test: enableABTest
      });

      if (response.status === 'success' && response.data) {
        setGeneratedContent(response.data);
        toast({
          title: 'Content Generated',
          description: 'Your AI-powered content has been created successfully'
        });
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Content generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate content',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setGeneratedContent({
        content_id: 'content-' + Date.now(),
        content_type: contentType || 'blog_post',
        title: `${contentTopic}: Your Complete Guide`,
        content: `# ${contentTopic}: Your Complete Guide\n\n## Introduction\n\nWelcome to the ultimate guide on ${contentTopic}. In this comprehensive article, we'll explore everything you need to know to make the most of your experience.\n\n## Key Highlights\n\n- Expert insights and recommendations\n- Practical tips and strategies\n- Real-world examples and case studies\n- Step-by-step implementation guide\n\n## Main Content\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\n### Section 1: Understanding the Basics\n\nPellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.\n\n### Section 2: Advanced Strategies\n\nDonec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.\n\n### Section 3: Best Practices\n\nVestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci.\n\n## Conclusion\n\nBy following these guidelines and recommendations, you'll be well-equipped to succeed with ${contentTopic}. Start implementing these strategies today!\n\n---\n\n*Generated by ContentMaster AI - Your AI-powered content creation assistant*`,
        seo_optimized: enableSEO,
        engagement_score: 85,
        ai_generated: true,
        metadata: {
          word_count: 245,
          reading_time: '2 min',
          seo_score: 92,
          readability_score: 88,
          keywords: keywords.split(',').map(k => k.trim()),
          target_audience: targetAudience || 'general',
          tone: tone || 'professional',
          language: selectedLanguages[0] || 'en'
        },
        variations: enableABTest ? [
          { variant: 'A', headline: `${contentTopic}: Your Complete Guide`, ctr_prediction: 3.2 },
          { variant: 'B', headline: `Master ${contentTopic}: Expert Insights`, ctr_prediction: 4.1 },
          { variant: 'C', headline: `The Ultimate ${contentTopic} Strategy`, ctr_prediction: 5.8 }
        ] : [],
        performance_prediction: {
          estimated_views: 5000,
          estimated_engagement: 82,
          estimated_conversions: 68
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const copyContent = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.content);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard'
      });
    }
  };

  const downloadContent = () => {
    if (!generatedContent) return;

    const blob = new Blob([generatedContent.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedContent.content_id}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Content has been downloaded'
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="w-6 h-6 text-blue-600" />
            ContentMaster AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">Content Topic/Subject</Label>
              <Input
                id="topic"
                placeholder="What do you want to write about?"
                value={contentTopic}
                onChange={(e) => setContentTopic(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog_post">Blog Post</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="email">Email Campaign</SelectItem>
                    <SelectItem value="product_description">Product Description</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                    <SelectItem value="ad_copy">Ad Copy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select value={targetAudience} onValueChange={setTargetAudience}>
                  <SelectTrigger id="audience">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Public</SelectItem>
                    <SelectItem value="business">Business Professionals</SelectItem>
                    <SelectItem value="travelers">Travelers</SelectItem>
                    <SelectItem value="millennials">Millennials</SelectItem>
                    <SelectItem value="families">Families</SelectItem>
                    <SelectItem value="luxury">Luxury Seekers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tone">Tone & Style</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger id="tone">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="inspirational">Inspirational</SelectItem>
                    <SelectItem value="humorous">Humorous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="length">Content Length</Label>
                <Select value={contentLength} onValueChange={setContentLength}>
                  <SelectTrigger id="length">
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (300-500 words)</SelectItem>
                    <SelectItem value="medium">Medium (500-1000 words)</SelectItem>
                    <SelectItem value="long">Long (1000-2000 words)</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive (2000+ words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="keywords">Target Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                placeholder="e.g., travel, tourism, vacation, adventure"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Languages (Multi-language Support)</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'es', label: 'Spanish' },
                  { id: 'fr', label: 'French' },
                  { id: 'de', label: 'German' },
                  { id: 'it', label: 'Italian' },
                  { id: 'pt', label: 'Portuguese' },
                  { id: 'ja', label: 'Japanese' },
                  { id: 'zh', label: 'Chinese' }
                ].map((lang) => (
                  <div key={lang.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={lang.id}
                      checked={selectedLanguages.includes(lang.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLanguages([...selectedLanguages, lang.id]);
                        } else {
                          setSelectedLanguages(selectedLanguages.filter(l => l !== lang.id));
                        }
                      }}
                    />
                    <Label htmlFor={lang.id} className="text-sm font-normal cursor-pointer">
                      {lang.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <Label htmlFor="seo" className="cursor-pointer">
                  Enable SEO Optimization
                </Label>
              </div>
              <Checkbox
                id="seo"
                checked={enableSEO}
                onCheckedChange={(checked) => setEnableSEO(checked as boolean)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <Label htmlFor="abtest" className="cursor-pointer">
                  Generate A/B Test Variants
                </Label>
              </div>
              <Checkbox
                id="abtest"
                checked={enableABTest}
                onCheckedChange={(checked) => setEnableABTest(checked as boolean)}
              />
            </div>

            <Button 
              onClick={handleGenerateContent} 
              disabled={loading || !contentTopic.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate AI Content
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedContent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Generated Content</span>
                <div className="flex gap-2">
                  <Button onClick={copyContent} variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button onClick={downloadContent} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-xl mb-2">{generatedContent.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {generatedContent.metadata?.keywords?.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="prose max-w-none p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {generatedContent.content}
                  </pre>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded">
                    <FileText className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                    <p className="text-sm text-gray-600">Words</p>
                    <p className="font-semibold">{generatedContent.metadata?.word_count}</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <p className="text-sm text-gray-600">Reading Time</p>
                    <p className="font-semibold">{generatedContent.metadata?.reading_time}</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Search className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <p className="text-sm text-gray-600">SEO Score</p>
                    <p className="font-semibold">{generatedContent.metadata?.seo_score}%</p>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <Eye className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                    <p className="text-sm text-gray-600">Readability</p>
                    <p className="font-semibold">{generatedContent.metadata?.readability_score}%</p>
                  </div>
                </div>

                {generatedContent.seo_optimized && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Content is fully optimized for search engines with proper keyword placement and structure.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Quality Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={contentQualityRadar}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="aspect" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Quality Score"
                      dataKey="score"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="engagement" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="conversions" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="metrics" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="abtest">A/B Tests</TabsTrigger>
              <TabsTrigger value="seo">SEO Analysis</TabsTrigger>
              <TabsTrigger value="multilang">Languages</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contentMetrics.map((metric) => (
                      <div key={metric.metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{metric.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${getStatusColor(metric.status)}`}>
                              {metric.score}%
                            </span>
                            <span className="text-xs text-gray-500">
                              (Benchmark: {metric.benchmark}%)
                            </span>
                          </div>
                        </div>
                        <Progress value={metric.score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="abtest" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>A/B Test Variants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {abTestVariants.map((variant, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={variant.predictedCTR > 5 ? 'default' : 'secondary'}>
                            {variant.variant}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              CTR: {variant.predictedCTR}%
                            </span>
                            <span className="text-sm text-gray-600">
                              Engagement: {variant.engagement}%
                            </span>
                          </div>
                        </div>
                        <h4 className="font-medium mb-1">{variant.headline}</h4>
                        <p className="text-sm text-gray-600">CTA: {variant.cta}</p>
                        <Progress value={variant.engagement} className="h-2 mt-2" />
                      </div>
                    ))}
                  </div>

                  <Alert className="mt-4">
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Recommendation:</strong> Variant C shows the highest predicted performance
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Keyword Optimization</h4>
                      <div className="flex flex-wrap gap-2">
                        {generatedContent.metadata?.keywords?.map((keyword) => (
                          <Badge key={keyword} className="bg-blue-100 text-blue-800">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">SEO Checklist</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Optimized title tag</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Meta description included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Header tags properly structured</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Keyword density optimal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Internal linking opportunities identified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm">Mobile-friendly formatting</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">
                          {generatedContent.metadata?.seo_score}%
                        </p>
                        <p className="text-sm text-gray-600">SEO Score</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p className="text-2xl font-bold text-blue-600">
                          {generatedContent.metadata?.readability_score}%
                        </p>
                        <p className="text-sm text-gray-600">Readability</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <p className="text-2xl font-bold text-purple-600">
                          {generatedContent.engagement_score}%
                        </p>
                        <p className="text-sm text-gray-600">Engagement</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="multilang" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Multi-language Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedLanguages.map((lang) => (
                      <div key={lang} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Languages className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">
                              {lang === 'en' ? 'English' : 
                               lang === 'es' ? 'Spanish' :
                               lang === 'fr' ? 'French' :
                               lang === 'de' ? 'German' :
                               lang === 'it' ? 'Italian' :
                               lang === 'pt' ? 'Portuguese' :
                               lang === 'ja' ? 'Japanese' : 'Chinese'}
                            </span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            Available
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Alert className="mt-4">
                    <Globe className="h-4 w-4" />
                    <AlertDescription>
                      Content can be automatically translated to {selectedLanguages.length} language(s) while maintaining SEO optimization.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ContentMaster;