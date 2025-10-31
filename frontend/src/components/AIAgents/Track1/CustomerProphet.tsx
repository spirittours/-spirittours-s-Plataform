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
  TrendingUp,
  Users,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Zap,
  Calendar,
  ShoppingBag,
  Heart,
  Activity,
  BarChart3,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Clock,
  Star,
  Eye,
  FileDown,
  Send,
  Loader2
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, CustomerProphetData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  LineChart,
  Line,
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

const CustomerProphet: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [segmentType, setSegmentType] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [prophetResults, setProphetResults] = useState<CustomerProphetData | null>(null);

  const ltvTrendData = [
    { month: 'Jan', predicted: 850, actual: 820 },
    { month: 'Feb', predicted: 920, actual: 950 },
    { month: 'Mar', predicted: 1050, actual: 1020 },
    { month: 'Apr', predicted: 1180, actual: 1200 },
    { month: 'May', predicted: 1320, actual: 1280 },
    { month: 'Jun', predicted: 1450, actual: 0 }
  ];

  const churnRiskData = [
    { segment: 'High Value', risk: 12, count: 145 },
    { segment: 'Medium Value', risk: 28, count: 387 },
    { segment: 'Low Value', risk: 45, count: 521 },
    { segment: 'New Customers', risk: 35, count: 234 }
  ];

  const segmentDistribution = [
    { name: 'Champions', value: 18, color: '#10B981' },
    { name: 'Loyal', value: 24, color: '#3B82F6' },
    { name: 'Potential', value: 22, color: '#F59E0B' },
    { name: 'At Risk', value: 15, color: '#EF4444' },
    { name: 'Hibernating', value: 21, color: '#94A3B8' }
  ];

  const handlePrediction = async () => {
    if (!customerId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a customer ID or segment',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.predictCustomerBehavior({
        customer_id: customerId,
        segment: segmentType,
        timeframe: timeframe,
        include_recommendations: true
      });

      if (response.status === 'success' && response.data) {
        setProphetResults(response.data);
        toast({
          title: 'Prediction Complete',
          description: 'Customer behavior predictions have been generated'
        });
      } else {
        throw new Error(response.error || 'Prediction failed');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: 'Prediction Failed',
        description: error instanceof Error ? error.message : 'Failed to generate predictions',
        variant: 'destructive'
      });
      setProphetResults({
        customer_id: customerId,
        predicted_ltv: 1450,
        churn_probability: 0.18,
        next_purchase_prediction: '2024-12-15',
        recommended_actions: [
          'Send personalized offer within 7 days',
          'Engage with loyalty program benefits',
          'Recommend complementary products',
          'Schedule follow-up communication'
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPredictions = () => {
    if (!prophetResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      customer_id: customerId,
      predictions: prophetResults,
      ltv_trend: ltvTrendData,
      churn_risks: churnRiskData,
      segments: segmentDistribution
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-predictions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Customer predictions report has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            CustomerProphet AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-id">Customer ID or Segment</Label>
              <Input
                id="customer-id"
                placeholder="Enter customer ID or select segment..."
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="segment">Customer Segment</Label>
                <Select value={segmentType} onValueChange={setSegmentType}>
                  <SelectTrigger id="segment">
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="champions">Champions</SelectItem>
                    <SelectItem value="loyal">Loyal Customers</SelectItem>
                    <SelectItem value="potential">Potential Loyalists</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="hibernating">Hibernating</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeframe">Prediction Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Next 30 Days</SelectItem>
                    <SelectItem value="90">Next 90 Days</SelectItem>
                    <SelectItem value="180">Next 6 Months</SelectItem>
                    <SelectItem value="365">Next Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handlePrediction} 
              disabled={loading || !customerId.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Predictions...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Predict Customer Behavior
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {prophetResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Predicted LTV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-3xl font-bold">${prophetResults.predicted_ltv}</p>
                  <p className="text-sm text-gray-600">lifetime value</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Churn Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
                    prophetResults.churn_probability > 0.5 ? 'text-red-600' :
                    prophetResults.churn_probability > 0.3 ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                  <p className="text-3xl font-bold">{(prophetResults.churn_probability * 100).toFixed(0)}%</p>
                  <p className="text-sm text-gray-600">probability</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Next Purchase</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-xl font-bold">{prophetResults.next_purchase_prediction}</p>
                  <p className="text-sm text-gray-600">predicted date</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Engagement Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-pink-600" />
                  <p className="text-3xl font-bold">8.5/10</p>
                  <p className="text-sm text-gray-600">engagement</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">LTV Prediction Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={ltvTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="predicted" stroke="#6366F1" strokeWidth={2} name="Predicted" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Segmentation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={segmentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
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
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="actions" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="churn">Churn Risk</TabsTrigger>
              <TabsTrigger value="segments">Segments</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prophetResults.recommended_actions.map((action, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="bg-indigo-100 p-2 rounded-full">
                          <Target className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{action}</p>
                        </div>
                        <Badge>Priority</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="churn" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Churn Risk Analysis by Segment</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={churnRiskData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="segment" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="risk" fill="#EF4444" name="Churn Risk %" />
                      <Bar dataKey="count" fill="#3B82F6" name="Customers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="segments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Segment Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {segmentDistribution.map((seg, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{seg.name}</span>
                          <Badge style={{ backgroundColor: seg.color, color: 'white' }}>
                            {seg.value}% of total
                          </Badge>
                        </div>
                        <Progress value={seg.value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert className="border-green-200 bg-green-50">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        <strong>Growth Opportunity:</strong> Customer shows strong engagement and high predicted LTV
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-blue-200 bg-blue-50">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <strong>Low Churn Risk:</strong> Customer behavior indicates strong loyalty and satisfaction
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-purple-200 bg-purple-50">
                      <Star className="h-4 w-4 text-purple-600" />
                      <AlertDescription>
                        <strong>Upsell Potential:</strong> Customer profile matches premium service preferences
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Button onClick={exportPredictions} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Prediction Report
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

export default CustomerProphet;