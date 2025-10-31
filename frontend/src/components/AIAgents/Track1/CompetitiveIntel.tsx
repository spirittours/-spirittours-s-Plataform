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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ThumbsUp,
  Share2,
  MapPin,
  Calendar,
  Zap,
  Shield,
  Lightbulb,
  FileDown,
  Send,
  Loader2
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, CompetitiveIntelData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  RadarChart,
  Radar,
  BarChart,
  Bar,
  LineChart,
  Line,
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

interface Competitor {
  name: string;
  market_position: number;
  market_share: number;
  pricing_strategy: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface MarketTrend {
  trend: string;
  impact: 'high' | 'medium' | 'low';
  direction: 'up' | 'down' | 'stable';
  description: string;
}

interface PricingComparison {
  competitor: string;
  avgPrice: number;
  discount: number;
  value: number;
}

const CompetitiveIntel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [intelResults, setIntelResults] = useState<CompetitiveIntelData | null>(null);

  const competitorData: Competitor[] = intelResults ? [
    {
      name: 'Competitor A',
      market_position: 1,
      market_share: 28.5,
      pricing_strategy: 'Premium',
      strengths: ['Brand recognition', 'Quality service', 'Customer loyalty'],
      weaknesses: ['High prices', 'Limited destinations', 'Slow innovation'],
      opportunities: ['Emerging markets', 'Digital transformation', 'Sustainability'],
      threats: ['New entrants', 'Price competition', 'Economic downturn']
    },
    {
      name: 'Competitor B',
      market_position: 2,
      market_share: 22.3,
      pricing_strategy: 'Competitive',
      strengths: ['Wide network', 'Competitive pricing', 'Technology'],
      weaknesses: ['Service quality', 'Brand perception', 'Customer support'],
      opportunities: ['Partnership opportunities', 'Market expansion', 'Product innovation'],
      threats: ['Regulatory changes', 'Market saturation', 'Customer churn']
    },
    {
      name: 'Your Company',
      market_position: 3,
      market_share: 18.7,
      pricing_strategy: 'Value-based',
      strengths: ['Innovation', 'Customer service', 'Flexibility'],
      weaknesses: ['Market reach', 'Brand awareness', 'Resources'],
      opportunities: ['Digital marketing', 'Niche markets', 'Strategic partnerships'],
      threats: ['Competitive pressure', 'Market consolidation', 'Technology disruption']
    }
  ] : [];

  const marketTrends: MarketTrend[] = [
    {
      trend: 'Digital Booking Growth',
      impact: 'high',
      direction: 'up',
      description: '45% increase in online bookings year-over-year'
    },
    {
      trend: 'Sustainable Tourism',
      impact: 'high',
      direction: 'up',
      description: 'Rising demand for eco-friendly travel options'
    },
    {
      trend: 'Personalization',
      impact: 'medium',
      direction: 'up',
      description: 'AI-driven personalized experiences gaining traction'
    },
    {
      trend: 'Price Sensitivity',
      impact: 'high',
      direction: 'stable',
      description: 'Customers increasingly comparing prices across platforms'
    },
    {
      trend: 'Last-minute Bookings',
      impact: 'medium',
      direction: 'down',
      description: 'Shift towards advance planning and bookings'
    }
  ];

  const pricingComparison: PricingComparison[] = [
    { competitor: 'Competitor A', avgPrice: 1250, discount: 10, value: 85 },
    { competitor: 'Competitor B', avgPrice: 980, discount: 18, value: 78 },
    { competitor: 'Your Company', avgPrice: 1050, discount: 15, value: 88 },
    { competitor: 'Competitor C', avgPrice: 850, discount: 25, value: 65 }
  ];

  const marketShareData = [
    { name: 'Competitor A', value: 28.5, color: '#3B82F6' },
    { name: 'Competitor B', value: 22.3, color: '#10B981' },
    { name: 'Your Company', value: 18.7, color: '#F59E0B' },
    { name: 'Competitor C', value: 15.2, color: '#8B5CF6' },
    { name: 'Others', value: 15.3, color: '#94A3B8' }
  ];

  const performanceMetrics = [
    { metric: 'Customer Satisfaction', yours: 88, compA: 85, compB: 78 },
    { metric: 'Price Competitiveness', yours: 82, compA: 75, compB: 92 },
    { metric: 'Service Quality', yours: 90, compA: 92, compB: 80 },
    { metric: 'Digital Experience', yours: 85, compA: 88, compB: 82 },
    { metric: 'Brand Awareness', yours: 75, compA: 95, compB: 85 },
    { metric: 'Innovation', yours: 92, compA: 78, compB: 82 }
  ];

  const handleAnalysis = async () => {
    if (!companyName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide your company name',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.analyzeCompetition({
        company_name: companyName,
        industry: industry,
        region: region,
        competitors: competitors.split(',').map(c => c.trim()),
        analysis_depth: 'comprehensive'
      });

      if (response.status === 'success' && response.data) {
        setIntelResults(response.data);
        toast({
          title: 'Analysis Complete',
          description: 'Competitive intelligence report has been generated'
        });
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Competitive analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze competition',
        variant: 'destructive'
      });
      // Set mock data
      setIntelResults({
        competitor_id: 'comp-' + Date.now(),
        name: companyName,
        market_position: 3,
        strengths: ['Innovation', 'Customer service', 'Flexibility', 'Technology adoption'],
        weaknesses: ['Market reach', 'Brand awareness', 'Marketing budget', 'Scale'],
        opportunities: ['Digital expansion', 'Niche markets', 'Partnerships', 'Sustainability focus'],
        threats: ['Intense competition', 'Price wars', 'Market consolidation', 'Economic uncertainty']
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
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

  const exportReport = () => {
    if (!intelResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      company: companyName,
      analysis: intelResults,
      competitors: competitorData,
      trends: marketTrends,
      pricing: pricingComparison,
      marketShare: marketShareData
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competitive-intel-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Competitive intelligence report has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-6 h-6 text-purple-600" />
            CompetitiveIntel AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="company">Your Company Name</Label>
              <Input
                id="company"
                placeholder="Enter your company name..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tourism">Tourism & Travel</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="region">Region/Market</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north_america">North America</SelectItem>
                    <SelectItem value="europe">Europe</SelectItem>
                    <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                    <SelectItem value="latin_america">Latin America</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="competitors">Known Competitors (comma-separated)</Label>
              <Input
                id="competitors"
                placeholder="e.g., Company A, Company B, Company C..."
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleAnalysis} 
              disabled={loading || !companyName.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Competition...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze Competitive Landscape
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {intelResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Market Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <Award className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-3xl font-bold">#{intelResults.market_position}</p>
                    <p className="text-sm text-gray-600">in market</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Market Share</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <PieChartIcon className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-3xl font-bold">18.7%</p>
                  <p className="text-sm text-gray-600">of total market</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Competitive Index</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-3xl font-bold">7.8/10</p>
                  <p className="text-sm text-gray-600">strength score</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold">+12%</p>
                  <p className="text-sm text-gray-600">YoY growth</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market Share Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={marketShareData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {marketShareData.map((entry, index) => (
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
                <CardTitle className="text-base">Competitive Positioning</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={performanceMetrics}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Your Company" dataKey="yours" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                    <Radar name="Competitor A" dataKey="compA" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Radar name="Competitor B" dataKey="compB" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="swot" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="swot">SWOT</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="swot" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelResults.strengths.map((strength, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">✓</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelResults.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-red-600">✗</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                      <Lightbulb className="w-5 h-5" />
                      Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelResults.opportunities.map((opp, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-blue-600">→</span>
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                      <Shield className="w-5 h-5" />
                      Threats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {intelResults.threats.map((threat, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-600">⚠</span>
                          {threat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="competitors" className="space-y-4">
              {competitorData.map((comp, index) => (
                <Card key={index} className={comp.name === 'Your Company' ? 'border-orange-300 bg-orange-50' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{comp.name}</span>
                      <div className="flex gap-2">
                        <Badge>Position #{comp.market_position}</Badge>
                        <Badge variant="outline">{comp.market_share}% share</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span><strong>Strategy:</strong> {comp.pricing_strategy}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1 text-green-600">Strengths</p>
                          <ul className="text-xs space-y-1">
                            {comp.strengths.slice(0, 3).map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1 text-red-600">Weaknesses</p>
                          <ul className="text-xs space-y-1">
                            {comp.weaknesses.slice(0, 3).map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pricingComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="competitor" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgPrice" fill="#3B82F6" name="Avg Price ($)" />
                      <Bar dataKey="discount" fill="#10B981" name="Discount (%)" />
                      <Bar dataKey="value" fill="#F59E0B" name="Value Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Market Trends Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marketTrends.map((trend, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTrendIcon(trend.direction)}
                            <span className="font-medium">{trend.trend}</span>
                          </div>
                          <Badge className={getImpactColor(trend.impact)}>
                            {trend.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{trend.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strategic Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert className="border-green-200 bg-green-50">
                      <Zap className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        <strong>Priority 1:</strong> Expand digital marketing to increase brand awareness and reach
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-blue-200 bg-blue-50">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <strong>Priority 2:</strong> Leverage innovation strength to differentiate from competitors
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-purple-200 bg-purple-50">
                      <Target className="h-4 w-4 text-purple-600" />
                      <AlertDescription>
                        <strong>Priority 3:</strong> Focus on niche markets where larger competitors are underserving
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-orange-200 bg-orange-50">
                      <Users className="h-4 w-4 text-orange-600" />
                      <AlertDescription>
                        <strong>Priority 4:</strong> Build strategic partnerships to expand market reach
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Button onClick={exportReport} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Competitive Intelligence Report
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

export default CompetitiveIntel;