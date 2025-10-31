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
  BookOpen,
  Brain,
  Search,
  FileText,
  Tag,
  Star,
  TrendingUp,
  Users,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  Filter,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  Target,
  Award,
  Zap,
  Clock,
  Calendar,
  Globe,
  Link,
  Download,
  Upload,
  Archive,
  FileDown,
  Send,
  Loader2,
  Plus,
  Database,
  Lightbulb
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, KnowledgeData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface KnowledgeItem {
  id: string;
  title: string;
  type: 'article' | 'guide' | 'tutorial' | 'research' | 'faq' | 'video';
  category: string;
  quality_score: number;
  relevance_score: number;
  views: number;
  likes: number;
  lastUpdated: string;
  tags: string[];
  status: 'published' | 'draft' | 'archived';
}

interface ContentQualityMetric {
  metric: string;
  score: number;
  target: number;
  status: 'excellent' | 'good' | 'needs-improvement';
}

interface CategoryInsight {
  category: string;
  items: number;
  views: number;
  engagement: number;
  growth: number;
}

interface SearchInsight {
  query: string;
  frequency: number;
  results: number;
  avgClickRate: number;
}

const KnowledgeCurator: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentType, setContentType] = useState('');
  const [category, setCategory] = useState('');
  const [minQualityScore, setMinQualityScore] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeData | null>(null);

  const knowledgeItems: KnowledgeItem[] = knowledgeResults ? [
    {
      id: 'kb-001',
      title: 'Complete Guide to Sustainable Tourism',
      type: 'guide',
      category: 'Sustainability',
      quality_score: 92,
      relevance_score: 95,
      views: 15420,
      likes: 1240,
      lastUpdated: '2 days ago',
      tags: ['sustainability', 'eco-tourism', 'best-practices'],
      status: 'published'
    },
    {
      id: 'kb-002',
      title: 'Cultural Etiquette: Asia Travel Tips',
      type: 'article',
      category: 'Culture',
      quality_score: 88,
      relevance_score: 90,
      views: 12350,
      likes: 980,
      lastUpdated: '5 days ago',
      tags: ['culture', 'asia', 'etiquette', 'travel-tips'],
      status: 'published'
    },
    {
      id: 'kb-003',
      title: 'Emergency Response Protocols',
      type: 'guide',
      category: 'Safety',
      quality_score: 95,
      relevance_score: 88,
      views: 8900,
      likes: 750,
      lastUpdated: '1 week ago',
      tags: ['safety', 'emergency', 'protocols', 'crisis'],
      status: 'published'
    },
    {
      id: 'kb-004',
      title: 'Accessibility Features Tutorial',
      type: 'tutorial',
      category: 'Accessibility',
      quality_score: 90,
      relevance_score: 92,
      views: 6750,
      likes: 620,
      lastUpdated: '3 days ago',
      tags: ['accessibility', 'wcag', 'inclusive-design'],
      status: 'published'
    },
    {
      id: 'kb-005',
      title: 'Carbon Offset Programs Research',
      type: 'research',
      category: 'Environment',
      quality_score: 87,
      relevance_score: 85,
      views: 4200,
      likes: 340,
      lastUpdated: '1 month ago',
      tags: ['carbon', 'environment', 'research', 'offsets'],
      status: 'published'
    }
  ] : [];

  const qualityMetrics: ContentQualityMetric[] = knowledgeResults ? [
    {
      metric: 'Content Accuracy',
      score: knowledgeResults.quality_score || 88,
      target: 95,
      status: 'good'
    },
    {
      metric: 'Relevance Score',
      score: knowledgeResults.relevance_score || 92,
      target: 90,
      status: 'excellent'
    },
    {
      metric: 'User Engagement',
      score: 78,
      target: 85,
      status: 'good'
    },
    {
      metric: 'Content Freshness',
      score: 82,
      target: 90,
      status: 'good'
    },
    {
      metric: 'Search Performance',
      score: 75,
      target: 80,
      status: 'needs-improvement'
    },
    {
      metric: 'Knowledge Coverage',
      score: 85,
      target: 95,
      status: 'good'
    }
  ] : [];

  const categoryInsights: CategoryInsight[] = [
    { category: 'Sustainability', items: 124, views: 45200, engagement: 85, growth: 12 },
    { category: 'Culture', items: 98, views: 38900, engagement: 78, growth: 8 },
    { category: 'Safety', items: 76, views: 32100, engagement: 92, growth: 15 },
    { category: 'Accessibility', items: 54, views: 21500, engagement: 88, growth: 20 },
    { category: 'Environment', items: 89, views: 28700, engagement: 72, growth: 10 }
  ];

  const searchInsights: SearchInsight[] = [
    { query: 'sustainable tourism practices', frequency: 1240, results: 45, avgClickRate: 68 },
    { query: 'cultural etiquette guidelines', frequency: 980, results: 32, avgClickRate: 72 },
    { query: 'emergency procedures', frequency: 850, results: 28, avgClickRate: 85 },
    { query: 'accessibility standards', frequency: 620, results: 18, avgClickRate: 78 },
    { query: 'carbon offset programs', frequency: 540, results: 22, avgClickRate: 65 }
  ];

  const contentTypeData = [
    { type: 'Articles', count: 156, color: '#3B82F6' },
    { type: 'Guides', count: 98, color: '#10B981' },
    { type: 'Tutorials', count: 67, color: '#F59E0B' },
    { type: 'Research', count: 45, color: '#8B5CF6' },
    { type: 'FAQs', count: 112, color: '#EF4444' },
    { type: 'Videos', count: 34, color: '#14B8A6' }
  ];

  const engagementData = [
    { month: 'Jan', views: 12400, likes: 890, shares: 230 },
    { month: 'Feb', views: 15200, likes: 1120, shares: 310 },
    { month: 'Mar', views: 18900, likes: 1450, shares: 380 },
    { month: 'Apr', views: 22100, likes: 1680, shares: 450 },
    { month: 'May', views: 25600, likes: 1920, shares: 520 },
    { month: 'Jun', views: 28400, likes: 2150, shares: 610 }
  ];

  const handleKnowledgeSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a search query',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.curateKnowledge({
        query: searchQuery,
        content_type: contentType,
        category: category,
        min_quality_score: parseFloat(minQualityScore) || 0,
        include_analytics: true
      });

      if (response.status === 'success' && response.data) {
        setKnowledgeResults(response.data);
        toast({
          title: 'Search Complete',
          description: 'Knowledge base results have been curated'
        });
      } else {
        throw new Error(response.error || 'Search failed');
      }
    } catch (error) {
      console.error('Knowledge search error:', error);
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Failed to search knowledge base',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setKnowledgeResults({
        knowledge_id: 'know-' + Date.now(),
        query: searchQuery,
        total_results: 45,
        curated_items: [
          {
            id: 'kb-001',
            title: 'Complete Guide to Sustainable Tourism',
            type: 'guide',
            category: 'Sustainability',
            quality_score: 92,
            relevance_score: 95,
            summary: 'Comprehensive guide covering sustainable tourism practices, certifications, and implementation strategies',
            tags: ['sustainability', 'eco-tourism', 'best-practices'],
            url: '/knowledge/sustainable-tourism-guide',
            author: 'Sustainability Team',
            published: '2024-01-15',
            lastUpdated: '2024-03-10'
          },
          {
            id: 'kb-002',
            title: 'Cultural Etiquette: Asia Travel Tips',
            type: 'article',
            category: 'Culture',
            quality_score: 88,
            relevance_score: 90,
            summary: 'Essential cultural etiquette guidelines for travelers visiting Asian destinations',
            tags: ['culture', 'asia', 'etiquette', 'travel-tips'],
            url: '/knowledge/asia-cultural-etiquette',
            author: 'Cultural Team',
            published: '2024-02-20',
            lastUpdated: '2024-03-25'
          }
        ],
        quality_score: 88,
        relevance_score: 92,
        categories_covered: ['Sustainability', 'Culture', 'Safety', 'Accessibility'],
        top_tags: ['sustainability', 'culture', 'safety', 'eco-tourism', 'etiquette'],
        knowledge_gaps: [
          'Limited content on emerging destinations',
          'Need more video tutorials',
          'Insufficient multilingual content',
          'More case studies required'
        ],
        recommendations: [
          'Create video content for top searched topics',
          'Expand coverage of emerging markets',
          'Develop interactive tutorials',
          'Add multilingual support for key articles',
          'Update older content with latest information'
        ],
        search_performance: {
          precision: 0.85,
          recall: 0.78,
          avg_relevance: 0.88
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs-improvement': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="w-4 h-4" />;
      case 'guide': return <BookOpen className="w-4 h-4" />;
      case 'tutorial': return <Lightbulb className="w-4 h-4" />;
      case 'research': return <Database className="w-4 h-4" />;
      case 'faq': return <MessageSquare className="w-4 h-4" />;
      case 'video': return <Eye className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const exportKnowledgeReport = () => {
    if (!knowledgeResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      search: { query: searchQuery, filters: { type: contentType, category } },
      results: knowledgeResults,
      items: knowledgeItems,
      metrics: qualityMetrics,
      insights: { categories: categoryInsights, searches: searchInsights }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Knowledge curation report has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
            Knowledge Curator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="content-type">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="content-type">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="article">Articles</SelectItem>
                    <SelectItem value="guide">Guides</SelectItem>
                    <SelectItem value="tutorial">Tutorials</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="faq">FAQs</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="sustainability">Sustainability</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="environment">Environment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quality">Min Quality Score</Label>
                <Select value={minQualityScore} onValueChange={setMinQualityScore}>
                  <SelectTrigger id="quality">
                    <SelectValue placeholder="Any quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Quality</SelectItem>
                    <SelectItem value="90">90+ (Excellent)</SelectItem>
                    <SelectItem value="75">75+ (Good)</SelectItem>
                    <SelectItem value="60">60+ (Acceptable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleKnowledgeSearch} 
              disabled={loading || !searchQuery.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Curating Knowledge...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search & Curate Knowledge
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {knowledgeResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Search Results</span>
                <Badge className="bg-purple-100 text-purple-800">
                  {knowledgeResults.total_results} items found
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded">
                  <Award className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <p className="text-sm text-gray-600">Quality</p>
                  <p className="font-semibold">{knowledgeResults.quality_score}%</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <Target className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-sm text-gray-600">Relevance</p>
                  <p className="font-semibold">{knowledgeResults.relevance_score}%</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <Tag className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="font-semibold">{knowledgeResults.categories_covered.length}</p>
                </div>
                <div className="text-center p-3 border rounded">
                  <Zap className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                  <p className="text-sm text-gray-600">Precision</p>
                  <p className="font-semibold">
                    {(knowledgeResults.search_performance.precision * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content Types Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={contentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, count }) => `${type}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {contentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="views" fill="#3B82F6" />
                    <Bar dataKey="likes" fill="#10B981" />
                    <Bar dataKey="shares" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="items" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="gaps">Gaps</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              {knowledgeItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span>{item.title}</span>
                      </div>
                      <Badge variant="outline">{item.category}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Award className="w-4 h-4 text-purple-600" />
                          <span className={getQualityColor(item.quality_score)}>
                            Quality: {item.quality_score}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span>Relevance: {item.relevance_score}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-gray-600" />
                          <span>{item.views.toLocaleString()} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                          <span>{item.likes.toLocaleString()} likes</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Updated: {item.lastUpdated}</span>
                        <Badge className={
                          item.status === 'published' ? 'bg-green-100 text-green-800' :
                          item.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {qualityMetrics.map((metric) => (
                      <div key={metric.metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{metric.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${getStatusColor(metric.status)}`}>
                              {metric.score}%
                            </span>
                            <span className="text-xs text-gray-500">
                              (Target: {metric.target}%)
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

            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryInsights.map((cat, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{cat.category}</span>
                          <Badge className={cat.growth > 15 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            +{cat.growth}% growth
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Items</p>
                            <p className="font-semibold">{cat.items}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Views</p>
                            <p className="font-semibold">{cat.views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Engagement</p>
                            <p className="font-semibold">{cat.engagement}%</p>
                          </div>
                        </div>
                        <Progress value={cat.engagement} className="h-2 mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Search Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchInsights.map((insight, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{insight.query}</span>
                          <Badge variant="outline">{insight.frequency} searches</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>{insight.results} results</span>
                          <span>•</span>
                          <span>CTR: {insight.avgClickRate}%</span>
                        </div>
                        <Progress value={insight.avgClickRate} className="h-1 mt-2" />
                      </div>
                    ))}
                  </div>

                  <Alert className="mt-4">
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Top Tags:</strong> {knowledgeResults.top_tags.join(', ')}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gaps" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Gaps & Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        Identified Gaps
                      </h4>
                      <div className="space-y-2">
                        {knowledgeResults.knowledge_gaps.map((gap, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm">{gap}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        Recommendations
                      </h4>
                      <div className="space-y-2">
                        {knowledgeResults.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 border rounded">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            <span className="text-sm flex-1">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={exportKnowledgeReport} className="w-full" variant="outline">
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Knowledge Curation Report
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

export default KnowledgeCurator;