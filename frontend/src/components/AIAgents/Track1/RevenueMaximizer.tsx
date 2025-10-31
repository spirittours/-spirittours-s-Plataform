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
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  BarChart3,
  ArrowUpRight,
  Zap,
  Calendar,
  Users,
  Award,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  FileDown,
  Send,
  Loader2
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, RevenueMaximizerData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const RevenueMaximizer: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [category, setCategory] = useState('');
  const [seasonality, setSeasonality] = useState('');
  const [revenueResults, setRevenueResults] = useState<RevenueMaximizerData | null>(null);

  const revenueData = [
    { month: 'Jan', current: 45000, optimized: 52000 },
    { month: 'Feb', current: 48000, optimized: 56000 },
    { month: 'Mar', current: 52000, optimized: 61000 },
    { month: 'Apr', current: 58000, optimized: 68000 },
    { month: 'May', current: 65000, optimized: 77000 },
    { month: 'Jun', current: 72000, optimized: 86000 }
  ];

  const handleOptimization = async () => {
    if (!productName.trim() || !currentPrice) {
      toast({
        title: 'Validation Error',
        description: 'Please provide product details',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.optimizeRevenue({
        product_name: productName,
        current_price: parseFloat(currentPrice),
        category,
        seasonality,
        market_conditions: 'normal'
      });

      if (response.status === 'success' && response.data) {
        setRevenueResults(response.data);
        toast({
          title: 'Optimization Complete',
          description: 'Revenue optimization strategies have been generated'
        });
      } else {
        throw new Error(response.error || 'Optimization failed');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      setRevenueResults({
        optimization_id: 'opt-' + Date.now(),
        current_revenue: parseFloat(currentPrice) * 100,
        optimized_revenue: parseFloat(currentPrice) * 118,
        improvement_percentage: 18,
        recommendations: [
          { strategy: 'Dynamic Pricing', impact: 'high', expected_increase: 12 },
          { strategy: 'Upselling Bundle', impact: 'medium', expected_increase: 8 },
          { strategy: 'Early Bird Discount', impact: 'medium', expected_increase: 6 },
          { strategy: 'Loyalty Program', impact: 'high', expected_increase: 10 }
        ]
      });
      toast({
        title: 'Using Sample Data',
        description: 'Showing sample optimization results'
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
            <DollarSign className="w-6 h-6 text-green-600" />
            RevenueMaximizer AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product">Product/Service Name</Label>
                <Input
                  id="product"
                  placeholder="Enter product name..."
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="price">Current Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter current price..."
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="tours">Tours & Activities</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="packages">Travel Packages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="seasonality">Seasonality</Label>
                <Select value={seasonality} onValueChange={setSeasonality}>
                  <SelectTrigger id="seasonality">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Season</SelectItem>
                    <SelectItem value="mid">Mid Season</SelectItem>
                    <SelectItem value="low">Low Season</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleOptimization} 
              disabled={loading || !productName.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing Revenue...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Optimize Revenue Strategy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {revenueResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-700">
                  ${revenueResults.current_revenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Optimized Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  ${revenueResults.optimized_revenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                  <p className="text-3xl font-bold text-green-600">
                    +{revenueResults.improvement_percentage}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Additional Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  ${(revenueResults.optimized_revenue - revenueResults.current_revenue).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="current" stroke="#94A3B8" strokeWidth={2} name="Current" />
                  <Line type="monotone" dataKey="optimized" stroke="#10B981" strokeWidth={2} name="Optimized" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueResults.recommendations?.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium">{rec.strategy}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={
                          rec.impact === 'high' ? 'bg-green-100 text-green-800' :
                          rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {rec.impact} impact
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          +{rec.expected_increase}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={rec.expected_increase * 5} className="h-2" />
                  </div>
                ))}
              </div>

              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Recommended Action:</strong> Implement dynamic pricing strategy for maximum revenue impact
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RevenueMaximizer;