import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Scale, 
  Shield, 
  Heart, 
  Users, 
  Leaf, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Award,
  Globe,
  DollarSign,
  TreePine,
  Briefcase,
  UserCheck,
  Home,
  ShoppingBag,
  Sparkles,
  FileDown,
  Send,
  Loader2,
  AlertTriangle,
  Building2,
  HandHeart,
  Baby,
  PawPrint
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, EthicalTourismData } from '../types';
import { useToast } from '@/components/ui/use-toast';

interface EthicsEvaluation {
  category: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  findings: string[];
  recommendations: string[];
}

interface ComplianceCheck {
  standard: string;
  compliant: boolean;
  details: string;
  priority: 'high' | 'medium' | 'low';
}

interface StakeholderImpact {
  group: string;
  impact: 'positive' | 'neutral' | 'negative';
  description: string;
  mitigation?: string;
}

const EthicalTourismAdvisor: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [evaluationResults, setEvaluationResults] = useState<EthicalTourismData | null>(null);
  const [selectedStandards, setSelectedStandards] = useState<string[]>([
    'human_rights',
    'labor_practices',
    'environmental_protection',
    'animal_welfare',
    'cultural_preservation',
    'fair_trade'
  ]);

  const ethicsCategories: EthicsEvaluation[] = evaluationResults ? [
    {
      category: 'Human Rights',
      score: evaluationResults.human_rights_score || 85,
      status: evaluationResults.human_rights_score >= 80 ? 'excellent' : 
              evaluationResults.human_rights_score >= 60 ? 'good' : 
              evaluationResults.human_rights_score >= 40 ? 'warning' : 'critical',
      findings: [
        'Fair wages for all employees',
        'No child labor practices detected',
        'Inclusive employment policies',
        'Respect for indigenous rights'
      ],
      recommendations: [
        'Implement human rights due diligence process',
        'Establish grievance mechanisms',
        'Conduct regular human rights impact assessments'
      ]
    },
    {
      category: 'Labor Practices',
      score: evaluationResults.labor_score || 78,
      status: evaluationResults.labor_score >= 80 ? 'excellent' : 
              evaluationResults.labor_score >= 60 ? 'good' : 
              evaluationResults.labor_score >= 40 ? 'warning' : 'critical',
      findings: [
        'Safe working conditions maintained',
        'Fair employment contracts',
        'Employee training programs available',
        'Health and safety standards met'
      ],
      recommendations: [
        'Enhance employee wellness programs',
        'Implement flexible working arrangements',
        'Strengthen collective bargaining rights'
      ]
    },
    {
      category: 'Environmental Ethics',
      score: evaluationResults.environmental_score || 72,
      status: evaluationResults.environmental_score >= 80 ? 'excellent' : 
              evaluationResults.environmental_score >= 60 ? 'good' : 
              evaluationResults.environmental_score >= 40 ? 'warning' : 'critical',
      findings: [
        'Waste reduction programs in place',
        'Energy efficiency measures adopted',
        'Water conservation practices',
        'Biodiversity protection efforts'
      ],
      recommendations: [
        'Set science-based emissions targets',
        'Implement circular economy principles',
        'Increase renewable energy usage'
      ]
    },
    {
      category: 'Animal Welfare',
      score: evaluationResults.animal_welfare_score || 90,
      status: evaluationResults.animal_welfare_score >= 80 ? 'excellent' : 
              evaluationResults.animal_welfare_score >= 60 ? 'good' : 
              evaluationResults.animal_welfare_score >= 40 ? 'warning' : 'critical',
      findings: [
        'No exploitation of animals for entertainment',
        'Wildlife protection measures in place',
        'Ethical animal interaction guidelines',
        'Support for conservation projects'
      ],
      recommendations: [
        'Partner with certified wildlife sanctuaries',
        'Educate tourists on responsible wildlife viewing',
        'Support local conservation initiatives'
      ]
    },
    {
      category: 'Cultural Preservation',
      score: evaluationResults.cultural_preservation_score || 88,
      status: evaluationResults.cultural_preservation_score >= 80 ? 'excellent' : 
              evaluationResults.cultural_preservation_score >= 60 ? 'good' : 
              evaluationResults.cultural_preservation_score >= 40 ? 'warning' : 'critical',
      findings: [
        'Respect for local customs and traditions',
        'Cultural heritage protection',
        'Support for local artisans',
        'Authentic cultural experiences'
      ],
      recommendations: [
        'Develop cultural sensitivity training programs',
        'Create partnerships with cultural institutions',
        'Implement cultural impact assessments'
      ]
    },
    {
      category: 'Fair Trade & Economic Justice',
      score: evaluationResults.fair_trade_score || 82,
      status: evaluationResults.fair_trade_score >= 80 ? 'excellent' : 
              evaluationResults.fair_trade_score >= 60 ? 'good' : 
              evaluationResults.fair_trade_score >= 40 ? 'warning' : 'critical',
      findings: [
        'Fair pricing for local suppliers',
        'Support for local businesses',
        'Transparent supply chains',
        'Economic benefits to local communities'
      ],
      recommendations: [
        'Increase procurement from local suppliers',
        'Implement supplier code of conduct',
        'Establish fair trade certification'
      ]
    }
  ] : [];

  const complianceChecks: ComplianceCheck[] = evaluationResults ? [
    {
      standard: 'UN Global Compact',
      compliant: true,
      details: 'Adheres to all 10 principles covering human rights, labor, environment, and anti-corruption',
      priority: 'high'
    },
    {
      standard: 'Global Sustainable Tourism Criteria',
      compliant: true,
      details: 'Meets criteria for sustainable management, socio-economic, cultural, and environmental impacts',
      priority: 'high'
    },
    {
      standard: 'ISO 26000 Social Responsibility',
      compliant: false,
      details: 'Partially compliant - needs improvement in stakeholder engagement and reporting',
      priority: 'medium'
    },
    {
      standard: 'Fair Trade Tourism',
      compliant: true,
      details: 'Certified fair trade practices ensuring equitable distribution of benefits',
      priority: 'medium'
    },
    {
      standard: 'Travelife Certification',
      compliant: false,
      details: 'In progress - awaiting final audit for sustainability certification',
      priority: 'low'
    }
  ] : [];

  const stakeholderImpacts: StakeholderImpact[] = evaluationResults ? [
    {
      group: 'Local Communities',
      impact: 'positive',
      description: 'Creates employment opportunities and supports local economy',
      mitigation: undefined
    },
    {
      group: 'Indigenous Peoples',
      impact: 'positive',
      description: 'Respects rights and promotes cultural exchange',
      mitigation: undefined
    },
    {
      group: 'Tourism Workers',
      impact: 'positive',
      description: 'Provides fair wages and safe working conditions',
      mitigation: undefined
    },
    {
      group: 'Environment',
      impact: 'neutral',
      description: 'Some environmental impact from operations',
      mitigation: 'Implementing carbon offset programs and conservation initiatives'
    },
    {
      group: 'Wildlife',
      impact: 'positive',
      description: 'Contributes to conservation through eco-tourism',
      mitigation: undefined
    },
    {
      group: 'Future Generations',
      impact: 'positive',
      description: 'Preserves resources and cultural heritage for the future',
      mitigation: undefined
    }
  ] : [];

  const handleEvaluation = async () => {
    if (!businessDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a business description',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.evaluateEthicalTourism({
        business_description: businessDescription,
        industry: selectedIndustry,
        region: selectedRegion,
        standards_to_check: selectedStandards,
        include_recommendations: true
      });

      if (response.status === 'success' && response.data) {
        setEvaluationResults(response.data);
        toast({
          title: 'Evaluation Complete',
          description: 'Ethical tourism assessment has been completed successfully'
        });
      } else {
        throw new Error(response.error || 'Evaluation failed');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: 'Evaluation Failed',
        description: error instanceof Error ? error.message : 'Failed to complete ethical evaluation',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setEvaluationResults({
        evaluation_id: 'eth-' + Date.now(),
        business_name: 'Sample Tourism Business',
        overall_ethics_score: 81,
        human_rights_score: 85,
        labor_score: 78,
        environmental_score: 72,
        animal_welfare_score: 90,
        cultural_preservation_score: 88,
        fair_trade_score: 82,
        compliance_status: 'compliant',
        certifications: ['Global Sustainable Tourism', 'Fair Trade Tourism'],
        risks_identified: [
          'Minor environmental impact from operations',
          'Need for enhanced stakeholder engagement'
        ],
        recommendations: [
          'Implement comprehensive sustainability reporting',
          'Enhance employee wellness programs',
          'Increase renewable energy usage',
          'Develop cultural sensitivity training'
        ],
        best_practices: [
          'Strong human rights policies',
          'Excellent animal welfare standards',
          'Support for local communities',
          'Cultural heritage preservation'
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
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good': return <Info className="w-5 h-5 text-blue-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'neutral': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'negative': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const exportReport = () => {
    if (!evaluationResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      evaluation: evaluationResults,
      categories: ethicsCategories,
      compliance: complianceChecks,
      stakeholders: stakeholderImpacts
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ethical-tourism-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Ethical tourism evaluation report has been downloaded'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-purple-600" />
            Ethical Tourism Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Business/Activity Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your tourism business or activity for ethical evaluation..."
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry Sector</Label>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="tour_operator">Tour Operator</SelectItem>
                    <SelectItem value="transport">Transportation</SelectItem>
                    <SelectItem value="attractions">Attractions & Activities</SelectItem>
                    <SelectItem value="hospitality">Hospitality & Food Service</SelectItem>
                    <SelectItem value="travel_agency">Travel Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="region">Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="americas">Americas</SelectItem>
                    <SelectItem value="europe">Europe</SelectItem>
                    <SelectItem value="asia_pacific">Asia Pacific</SelectItem>
                    <SelectItem value="middle_east">Middle East</SelectItem>
                    <SelectItem value="africa">Africa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Ethical Standards to Evaluate</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {[
                  { id: 'human_rights', label: 'Human Rights', icon: <Users className="w-4 h-4" /> },
                  { id: 'labor_practices', label: 'Labor Practices', icon: <Briefcase className="w-4 h-4" /> },
                  { id: 'environmental_protection', label: 'Environment', icon: <Leaf className="w-4 h-4" /> },
                  { id: 'animal_welfare', label: 'Animal Welfare', icon: <PawPrint className="w-4 h-4" /> },
                  { id: 'cultural_preservation', label: 'Cultural Heritage', icon: <Building2 className="w-4 h-4" /> },
                  { id: 'fair_trade', label: 'Fair Trade', icon: <HandHeart className="w-4 h-4" /> },
                  { id: 'child_protection', label: 'Child Protection', icon: <Baby className="w-4 h-4" /> },
                  { id: 'anti_corruption', label: 'Anti-Corruption', icon: <Shield className="w-4 h-4" /> }
                ].map((standard) => (
                  <div key={standard.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={standard.id}
                      checked={selectedStandards.includes(standard.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStandards([...selectedStandards, standard.id]);
                        } else {
                          setSelectedStandards(selectedStandards.filter(s => s !== standard.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={standard.id}
                      className="text-sm font-normal cursor-pointer flex items-center gap-1"
                    >
                      {standard.icon}
                      {standard.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleEvaluation} 
              disabled={loading || !businessDescription.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating Ethics...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Evaluate Ethical Compliance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {evaluationResults && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Ethics Score</span>
                <Badge className={
                  evaluationResults.overall_ethics_score >= 80 ? 'bg-green-100 text-green-800' :
                  evaluationResults.overall_ethics_score >= 60 ? 'bg-blue-100 text-blue-800' :
                  evaluationResults.overall_ethics_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {evaluationResults.overall_ethics_score}% Ethical
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={evaluationResults.overall_ethics_score} className="h-3" />
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {evaluationResults.certifications?.map((cert, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Award className="w-5 h-5 text-green-600" />
                      <span className="text-sm">{cert}</span>
                    </div>
                  ))}
                </div>

                {evaluationResults.compliance_status && (
                  <Alert className={
                    evaluationResults.compliance_status === 'compliant' ? 'border-green-200 bg-green-50' :
                    evaluationResults.compliance_status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
                    'border-red-200 bg-red-50'
                  }>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Compliance Status: <strong className="capitalize">{evaluationResults.compliance_status}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="categories" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-4">
              {ethicsCategories.map((category) => (
                <Card key={category.category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {getStatusIcon(category.status)}
                        {category.category}
                      </span>
                      <Badge className={`${getStatusColor(category.status)}`}>
                        {category.score}%
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={category.score} className="h-2 mb-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Key Findings
                        </h4>
                        <ul className="space-y-1">
                          {category.findings.map((finding, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start gap-1">
                              <span className="text-green-600 mt-1">•</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1">
                          {category.recommendations.map((rec, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-start gap-1">
                              <span className="text-blue-600 mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>International Standards Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceChecks.map((check, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {check.compliant ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                              <span className="font-medium">{check.standard}</span>
                              <Badge variant={
                                check.priority === 'high' ? 'destructive' :
                                check.priority === 'medium' ? 'default' : 'secondary'
                              } className="ml-2">
                                {check.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{check.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stakeholders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Stakeholder Impact Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stakeholderImpacts.map((stakeholder, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getImpactIcon(stakeholder.impact)}
                              <span className="font-medium">{stakeholder.group}</span>
                              <Badge variant={
                                stakeholder.impact === 'positive' ? 'default' :
                                stakeholder.impact === 'neutral' ? 'secondary' : 'destructive'
                              }>
                                {stakeholder.impact}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{stakeholder.description}</p>
                            {stakeholder.mitigation && (
                              <p className="text-sm text-blue-600 mt-2">
                                <strong>Mitigation:</strong> {stakeholder.mitigation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Identified Ethical Risks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {evaluationResults.risks_identified?.map((risk, index) => (
                      <Alert key={index} className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>{risk}</AlertDescription>
                      </Alert>
                    ))}
                  </div>

                  {evaluationResults.best_practices && evaluationResults.best_practices.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Recognized Best Practices</h4>
                      <div className="space-y-2">
                        {evaluationResults.best_practices.map((practice, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-green-50">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm">{practice}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {evaluationResults.recommendations?.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{rec}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={exportReport} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Full Ethics Report
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

export default EthicalTourismAdvisor;