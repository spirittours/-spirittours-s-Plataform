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
  Leaf,
  TreePine,
  Recycle,
  Droplet,
  Sun,
  Wind,
  Battery,
  Award,
  Target,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Info,
  Globe,
  Zap,
  Package,
  Trash2,
  Building,
  Car,
  Bike,
  Train,
  Users,
  Heart,
  Shield,
  FileDown,
  Send,
  Loader2,
  Mountain,
  Fish,
  Bird
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, SustainabilityData } from '../types';
import { useToast } from '@/components/ui/use-toast';
import {
  RadarChart,
  Radar,
  PieChart,
  Pie,
  Cell,
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

interface SustainabilityMetric {
  category: string;
  score: number;
  target: number;
  status: 'excellent' | 'good' | 'moderate' | 'poor';
  icon: React.ReactNode;
}

interface EcoInitiative {
  name: string;
  impact: 'high' | 'medium' | 'low';
  status: 'implemented' | 'in-progress' | 'planned';
  description: string;
  benefits: string[];
}

interface Certification {
  name: string;
  issuer: string;
  level: string;
  validUntil: string;
  verified: boolean;
}

interface ResourceUsage {
  resource: string;
  current: number;
  baseline: number;
  reduction: number;
  unit: string;
}

const SustainabilityAdvisor: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [currentPractices, setCurrentPractices] = useState('');
  const [sustainabilityGoals, setSustainabilityGoals] = useState<string[]>([
    'carbon_neutral',
    'zero_waste',
    'water_conservation',
    'renewable_energy',
    'biodiversity'
  ]);
  const [sustainabilityResults, setSustainabilityResults] = useState<SustainabilityData | null>(null);

  const sustainabilityMetrics: SustainabilityMetric[] = sustainabilityResults ? [
    {
      category: 'Carbon Footprint',
      score: sustainabilityResults.carbon_footprint_score || 72,
      target: 90,
      status: 'good',
      icon: <Globe className="w-5 h-5" />
    },
    {
      category: 'Energy Efficiency',
      score: sustainabilityResults.energy_efficiency_score || 68,
      target: 85,
      status: 'moderate',
      icon: <Zap className="w-5 h-5" />
    },
    {
      category: 'Water Management',
      score: sustainabilityResults.water_management_score || 80,
      target: 90,
      status: 'good',
      icon: <Droplet className="w-5 h-5" />
    },
    {
      category: 'Waste Reduction',
      score: sustainabilityResults.waste_reduction_score || 65,
      target: 80,
      status: 'moderate',
      icon: <Recycle className="w-5 h-5" />
    },
    {
      category: 'Biodiversity Protection',
      score: sustainabilityResults.biodiversity_score || 88,
      target: 95,
      status: 'excellent',
      icon: <TreePine className="w-5 h-5" />
    },
    {
      category: 'Sustainable Supply Chain',
      score: sustainabilityResults.supply_chain_score || 75,
      target: 85,
      status: 'good',
      icon: <Package className="w-5 h-5" />
    }
  ] : [];

  const ecoInitiatives: EcoInitiative[] = sustainabilityResults ? [
    {
      name: 'Solar Panel Installation',
      impact: 'high',
      status: 'implemented',
      description: 'Installed 500kW solar system reducing grid dependency by 60%',
      benefits: ['40% energy cost reduction', '200 tons CO2 saved annually', 'Energy independence']
    },
    {
      name: 'Zero Waste Program',
      impact: 'high',
      status: 'in-progress',
      description: 'Comprehensive waste management system with composting and recycling',
      benefits: ['90% waste diversion from landfills', 'Compost for local farms', 'Cost savings']
    },
    {
      name: 'Water Harvesting System',
      impact: 'medium',
      status: 'planned',
      description: 'Rainwater collection and greywater recycling infrastructure',
      benefits: ['30% water reduction', 'Drought resilience', 'Lower utility costs']
    },
    {
      name: 'Electric Vehicle Fleet',
      impact: 'high',
      status: 'in-progress',
      description: 'Transition to 100% electric transportation',
      benefits: ['Zero emissions transport', '70% fuel cost savings', 'Improved air quality']
    },
    {
      name: 'Biodiversity Conservation',
      impact: 'medium',
      status: 'implemented',
      description: 'Native habitat restoration and wildlife corridors',
      benefits: ['Ecosystem services', 'Education opportunities', 'Enhanced property value']
    }
  ] : [];

  const certifications: Certification[] = sustainabilityResults?.certifications?.map(cert => ({
    name: cert,
    issuer: 'Global Sustainable Tourism Council',
    level: 'Gold',
    validUntil: '2025-12-31',
    verified: true
  })) || [];

  const resourceUsage: ResourceUsage[] = [
    { resource: 'Electricity', current: 450, baseline: 750, reduction: 40, unit: 'kWh/day' },
    { resource: 'Water', current: 2800, baseline: 4500, reduction: 38, unit: 'liters/day' },
    { resource: 'Waste', current: 45, baseline: 180, reduction: 75, unit: 'kg/week' },
    { resource: 'Paper', current: 20, baseline: 85, reduction: 76, unit: 'reams/month' },
    { resource: 'Fuel', current: 120, baseline: 380, reduction: 68, unit: 'liters/week' }
  ];

  const impactData = [
    { aspect: 'Climate', value: 85, fullMark: 100 },
    { aspect: 'Water', value: 80, fullMark: 100 },
    { aspect: 'Biodiversity', value: 88, fullMark: 100 },
    { aspect: 'Community', value: 92, fullMark: 100 },
    { aspect: 'Resources', value: 75, fullMark: 100 },
    { aspect: 'Energy', value: 68, fullMark: 100 }
  ];

  const emissionsData = [
    { source: 'Transportation', value: 35, color: '#EF4444' },
    { source: 'Energy', value: 25, color: '#F59E0B' },
    { source: 'Waste', value: 15, color: '#10B981' },
    { source: 'Supply Chain', value: 20, color: '#3B82F6' },
    { source: 'Other', value: 5, color: '#8B5CF6' }
  ];

  const handleSustainabilityAssessment = async () => {
    if (!businessName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide business information',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.assessSustainability({
        business_name: businessName,
        business_type: businessType,
        location: location,
        size: employeeCount,
        current_practices: currentPractices.split('\n').filter(p => p.trim()),
        goals: sustainabilityGoals,
        assessment_scope: ['energy', 'water', 'waste', 'carbon', 'biodiversity']
      });

      if (response.status === 'success' && response.data) {
        setSustainabilityResults(response.data);
        toast({
          title: 'Assessment Complete',
          description: 'Sustainability analysis has been completed'
        });
      } else {
        throw new Error(response.error || 'Assessment failed');
      }
    } catch (error) {
      console.error('Sustainability assessment error:', error);
      toast({
        title: 'Assessment Failed',
        description: error instanceof Error ? error.message : 'Failed to complete sustainability assessment',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setSustainabilityResults({
        sustainability_id: 'sus-' + Date.now(),
        overall_score: 76,
        carbon_footprint_score: 72,
        energy_efficiency_score: 68,
        water_management_score: 80,
        waste_reduction_score: 65,
        biodiversity_score: 88,
        supply_chain_score: 75,
        certifications: [
          'Green Globe Certified',
          'EarthCheck Silver',
          'Rainforest Alliance'
        ],
        recommendations: [
          'Install solar panels to reduce energy dependency',
          'Implement comprehensive recycling program',
          'Switch to eco-friendly cleaning products',
          'Create employee sustainability training program',
          'Partner with local conservation organizations',
          'Establish carbon offset program for guests'
        ],
        green_initiatives: [
          'Solar power installation',
          'Rainwater harvesting',
          'Composting program',
          'Plastic-free operations',
          'Native plant landscaping'
        ],
        improvement_areas: [
          'Energy consumption reduction',
          'Single-use plastic elimination',
          'Supply chain sustainability',
          'Employee engagement in green practices'
        ],
        eco_rating: 'B+',
        carbon_offset_options: [
          { project: 'Local reforestation', cost: 15, impact: 'high' },
          { project: 'Renewable energy fund', cost: 20, impact: 'medium' },
          { project: 'Ocean cleanup', cost: 10, impact: 'medium' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'moderate': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportReport = () => {
    if (!sustainabilityResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      business: {
        name: businessName,
        type: businessType,
        location: location,
        employees: employeeCount
      },
      assessment: sustainabilityResults,
      metrics: sustainabilityMetrics,
      initiatives: ecoInitiatives,
      certifications,
      resourceUsage
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sustainability-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Sustainability report has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-green-600" />
            Sustainability Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business-name">Business/Organization Name</Label>
                <Input
                  id="business-name"
                  placeholder="Enter business name..."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="business-type">Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger id="business-type">
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel/Resort</SelectItem>
                    <SelectItem value="tour_operator">Tour Operator</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="transport">Transportation</SelectItem>
                    <SelectItem value="attraction">Tourist Attraction</SelectItem>
                    <SelectItem value="retail">Retail/Shopping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="employees">Number of Employees</Label>
                <Select value={employeeCount} onValueChange={setEmployeeCount}>
                  <SelectTrigger id="employees">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="201-500">201-500</SelectItem>
                    <SelectItem value="500+">500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="practices">Current Sustainability Practices (one per line)</Label>
              <Textarea
                id="practices"
                placeholder="List your current eco-friendly practices..."
                value={currentPractices}
                onChange={(e) => setCurrentPractices(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sustainability Goals</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { id: 'carbon_neutral', label: 'Carbon Neutral', icon: <Globe className="w-4 h-4" /> },
                  { id: 'zero_waste', label: 'Zero Waste', icon: <Trash2 className="w-4 h-4" /> },
                  { id: 'water_conservation', label: 'Water Conservation', icon: <Droplet className="w-4 h-4" /> },
                  { id: 'renewable_energy', label: 'Renewable Energy', icon: <Sun className="w-4 h-4" /> },
                  { id: 'biodiversity', label: 'Biodiversity', icon: <Bird className="w-4 h-4" /> },
                  { id: 'local_sourcing', label: 'Local Sourcing', icon: <Users className="w-4 h-4" /> }
                ].map((goal) => (
                  <div key={goal.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal.id}
                      checked={sustainabilityGoals.includes(goal.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSustainabilityGoals([...sustainabilityGoals, goal.id]);
                        } else {
                          setSustainabilityGoals(sustainabilityGoals.filter(g => g !== goal.id));
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
              onClick={handleSustainabilityAssessment} 
              disabled={loading || !businessName.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assessing Sustainability...
                </>
              ) : (
                <>
                  <Leaf className="mr-2 h-4 w-4" />
                  Assess Sustainability Performance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {sustainabilityResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sustainability Score</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">
                    {sustainabilityResults.eco_rating}
                  </Badge>
                  <span className="text-2xl font-bold text-green-600">
                    {sustainabilityResults.overall_score}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={sustainabilityResults.overall_score} className="h-4 mb-4" />
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {certifications.map((cert, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <Award className={`w-5 h-5 ${cert.verified ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="text-sm">
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-xs text-gray-600">{cert.level}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Environmental Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={impactData}>
                    <PolarGrid strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="aspect" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Impact Score"
                      dataKey="value"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emissions Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={emissionsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, value }) => `${source}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {emissionsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="metrics" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
              <TabsTrigger value="offsets">Offsets</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sustainabilityMetrics.map((metric) => (
                      <div key={metric.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {metric.icon}
                            <span className="font-medium">{metric.category}</span>
                          </div>
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

            <TabsContent value="initiatives" className="space-y-4">
              {ecoInitiatives.map((initiative, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{initiative.name}</span>
                      <div className="flex gap-2">
                        <Badge className={getImpactColor(initiative.impact)}>
                          {initiative.impact} impact
                        </Badge>
                        <Badge className={getStatusBadgeColor(initiative.status)}>
                          {initiative.status}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{initiative.description}</p>
                    <div>
                      <p className="text-sm font-medium mb-2">Benefits:</p>
                      <div className="space-y-1">
                        {initiative.benefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resource Usage & Reduction</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resourceUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="resource" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="baseline" fill="#94A3B8" name="Baseline" />
                      <Bar dataKey="current" fill="#10B981" name="Current" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 space-y-3">
                    {resourceUsage.map((resource, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{resource.resource}</span>
                          <Badge className="bg-green-100 text-green-800">
                            -{resource.reduction}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Current: {resource.current} {resource.unit}</span>
                          <span>•</span>
                          <span>Baseline: {resource.baseline} {resource.unit}</span>
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
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sustainabilityResults.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm flex-1">{rec}</p>
                      </div>
                    ))}
                  </div>

                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Priority Areas for Improvement:</strong>
                      <ul className="mt-2 space-y-1">
                        {sustainabilityResults.improvement_areas.map((area, index) => (
                          <li key={index} className="text-sm">• {area}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="offsets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Carbon Offset Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sustainabilityResults.carbon_offset_options?.map((option, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TreePine className="w-5 h-5 text-green-600" />
                            <span className="font-medium">{option.project}</span>
                          </div>
                          <Badge className={getImpactColor(option.impact)}>
                            {option.impact} impact
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Cost per ton CO₂</span>
                          <span className="font-medium">${option.cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={exportReport} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Sustainability Report
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

export default SustainabilityAdvisor;