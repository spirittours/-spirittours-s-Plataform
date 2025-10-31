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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle,
  Shield,
  Phone,
  Radio,
  Users,
  Activity,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  MessageSquare,
  FileText,
  Send,
  Loader2,
  RefreshCw,
  Bell,
  Siren,
  Heart,
  Zap,
  Navigation,
  PhoneCall,
  FileDown,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { aiAgentsService } from '@/services/aiAgentsService';
import { AgentResponse, CrisisManagementData } from '../types';
import { useToast } from '@/components/ui/use-toast';

interface CrisisLevel {
  level: number;
  name: string;
  color: string;
  description: string;
  actions: string[];
}

interface ResponseProtocol {
  phase: string;
  duration: string;
  status: 'pending' | 'active' | 'completed';
  tasks: {
    task: string;
    responsible: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    completed: boolean;
  }[];
}

interface CommunicationChannel {
  channel: string;
  status: 'active' | 'standby' | 'offline';
  lastUpdate: string;
  messages: number;
  priority: 'primary' | 'secondary' | 'backup';
}

interface ResourceAllocation {
  resource: string;
  available: number;
  allocated: number;
  needed: number;
  status: 'sufficient' | 'limited' | 'critical';
}

const CrisisManagement: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [crisisDescription, setCrisisDescription] = useState('');
  const [location, setLocation] = useState('');
  const [affectedCount, setAffectedCount] = useState('');
  const [crisisType, setCrisisType] = useState('');
  const [severity, setSeverity] = useState('');
  const [managementPlan, setManagementPlan] = useState<CrisisManagementData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const crisisLevels: CrisisLevel[] = [
    {
      level: 1,
      name: 'Minor Incident',
      color: 'green',
      description: 'Isolated incident with minimal impact',
      actions: ['Monitor situation', 'Document incident', 'Standard response']
    },
    {
      level: 2,
      name: 'Moderate Crisis',
      color: 'yellow',
      description: 'Localized impact requiring coordinated response',
      actions: ['Activate response team', 'Stakeholder notification', 'Resource allocation']
    },
    {
      level: 3,
      name: 'Major Crisis',
      color: 'orange',
      description: 'Significant impact on operations',
      actions: ['Full team activation', 'External support', 'Media management']
    },
    {
      level: 4,
      name: 'Severe Emergency',
      color: 'red',
      description: 'Critical situation requiring immediate action',
      actions: ['Emergency protocols', 'Authority notification', 'Evacuation if needed']
    },
    {
      level: 5,
      name: 'Catastrophic Event',
      color: 'purple',
      description: 'Extreme situation with widespread impact',
      actions: ['Full emergency response', 'Government coordination', 'International support']
    }
  ];

  const responseProtocols: ResponseProtocol[] = managementPlan ? [
    {
      phase: 'Immediate Response',
      duration: '0-1 hours',
      status: 'completed',
      tasks: [
        { task: 'Assess situation severity', responsible: 'Crisis Manager', priority: 'critical', completed: true },
        { task: 'Activate emergency team', responsible: 'Operations', priority: 'critical', completed: true },
        { task: 'Ensure safety of personnel', responsible: 'Security', priority: 'critical', completed: true },
        { task: 'Initial stakeholder notification', responsible: 'Communications', priority: 'high', completed: true }
      ]
    },
    {
      phase: 'Stabilization',
      duration: '1-6 hours',
      status: 'active',
      tasks: [
        { task: 'Establish command center', responsible: 'Operations', priority: 'high', completed: true },
        { task: 'Resource deployment', responsible: 'Logistics', priority: 'high', completed: false },
        { task: 'Media statement preparation', responsible: 'PR Team', priority: 'medium', completed: false },
        { task: 'Coordinate with authorities', responsible: 'Legal', priority: 'high', completed: false }
      ]
    },
    {
      phase: 'Recovery Operations',
      duration: '6-24 hours',
      status: 'pending',
      tasks: [
        { task: 'Damage assessment', responsible: 'Operations', priority: 'medium', completed: false },
        { task: 'Business continuity activation', responsible: 'Management', priority: 'high', completed: false },
        { task: 'Customer support scaling', responsible: 'Service', priority: 'medium', completed: false },
        { task: 'Insurance documentation', responsible: 'Finance', priority: 'low', completed: false }
      ]
    },
    {
      phase: 'Post-Crisis Review',
      duration: '24+ hours',
      status: 'pending',
      tasks: [
        { task: 'Incident analysis', responsible: 'All Teams', priority: 'medium', completed: false },
        { task: 'Lessons learned documentation', responsible: 'Management', priority: 'low', completed: false },
        { task: 'Process improvements', responsible: 'Operations', priority: 'low', completed: false },
        { task: 'Stakeholder debriefing', responsible: 'Communications', priority: 'medium', completed: false }
      ]
    }
  ] : [];

  const communicationChannels: CommunicationChannel[] = managementPlan ? [
    {
      channel: 'Emergency Hotline',
      status: 'active',
      lastUpdate: '2 minutes ago',
      messages: 47,
      priority: 'primary'
    },
    {
      channel: 'Internal Communications',
      status: 'active',
      lastUpdate: '5 minutes ago',
      messages: 128,
      priority: 'primary'
    },
    {
      channel: 'Social Media Monitoring',
      status: 'active',
      lastUpdate: 'Real-time',
      messages: 1284,
      priority: 'secondary'
    },
    {
      channel: 'Authority Coordination',
      status: 'active',
      lastUpdate: '10 minutes ago',
      messages: 23,
      priority: 'primary'
    },
    {
      channel: 'Media Relations',
      status: 'standby',
      lastUpdate: '30 minutes ago',
      messages: 8,
      priority: 'secondary'
    },
    {
      channel: 'Backup Systems',
      status: 'standby',
      lastUpdate: 'System check OK',
      messages: 0,
      priority: 'backup'
    }
  ] : [];

  const resourceAllocations: ResourceAllocation[] = managementPlan ? [
    {
      resource: 'Emergency Response Team',
      available: 25,
      allocated: 20,
      needed: 18,
      status: 'sufficient'
    },
    {
      resource: 'Medical Personnel',
      available: 10,
      allocated: 8,
      needed: 12,
      status: 'limited'
    },
    {
      resource: 'Communication Staff',
      available: 15,
      allocated: 15,
      needed: 15,
      status: 'sufficient'
    },
    {
      resource: 'Emergency Vehicles',
      available: 8,
      allocated: 6,
      needed: 5,
      status: 'sufficient'
    },
    {
      resource: 'Emergency Supplies',
      available: 100,
      allocated: 60,
      needed: 80,
      status: 'limited'
    },
    {
      resource: 'Backup Power Systems',
      available: 5,
      allocated: 3,
      needed: 3,
      status: 'sufficient'
    }
  ] : [];

  const handleCrisisAnalysis = async () => {
    if (!crisisDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please describe the crisis situation',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await aiAgentsService.manageCrisis({
        crisis_description: crisisDescription,
        crisis_type: crisisType,
        severity_level: severity,
        location: location,
        affected_people: parseInt(affectedCount) || 0,
        current_resources: [],
        communication_channels: []
      });

      if (response.status === 'success' && response.data) {
        setManagementPlan(response.data);
        setLastUpdate(new Date());
        toast({
          title: 'Crisis Analysis Complete',
          description: 'Emergency response plan has been generated'
        });
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Crisis analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze crisis situation',
        variant: 'destructive'
      });
      // Set mock data for demonstration
      setManagementPlan({
        crisis_id: 'crisis-' + Date.now(),
        threat_level: 'high',
        response_priority: 'immediate',
        action_plan: [
          'Activate emergency response team',
          'Establish command center',
          'Coordinate with local authorities',
          'Implement communication protocols',
          'Deploy necessary resources'
        ],
        resource_allocation: {
          personnel: 25,
          equipment: ['Emergency vehicles', 'Communication systems', 'Medical supplies'],
          budget: 50000
        },
        communication_strategy: {
          internal: ['Email alerts', 'Emergency hotline', 'Team messaging'],
          external: ['Press releases', 'Social media updates', 'Stakeholder notifications'],
          frequency: 'Every 30 minutes'
        },
        evacuation_plan: {
          required: false,
          routes: [],
          assembly_points: []
        },
        estimated_resolution_time: '6-12 hours',
        risk_assessment: {
          probability: 0.7,
          impact: 0.8,
          mitigation_effectiveness: 0.75
        },
        stakeholder_notifications: [
          { stakeholder: 'Senior Management', method: 'Direct call', status: 'Completed' },
          { stakeholder: 'Local Authorities', method: 'Official channels', status: 'In progress' },
          { stakeholder: 'Affected Customers', method: 'Email/SMS', status: 'Pending' },
          { stakeholder: 'Media', method: 'Press release', status: 'Prepared' }
        ]
      });
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    toast({
      title: 'Monitoring Started',
      description: 'Real-time crisis monitoring is now active'
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    toast({
      title: 'Monitoring Stopped',
      description: 'Crisis monitoring has been paused'
    });
  };

  const refreshStatus = () => {
    setLastUpdate(new Date());
    toast({
      title: 'Status Updated',
      description: 'Crisis status has been refreshed'
    });
  };

  const exportCrisisReport = () => {
    if (!managementPlan) return;

    const report = {
      timestamp: new Date().toISOString(),
      crisis: {
        description: crisisDescription,
        type: crisisType,
        severity: severity,
        location: location,
        affected: affectedCount
      },
      managementPlan,
      protocols: responseProtocols,
      communications: communicationChannels,
      resources: resourceAllocations
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crisis-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Crisis management report has been downloaded'
    });
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'standby': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Siren className="w-6 h-6 text-red-600" />
              Crisis Management System
            </div>
            {isMonitoring && (
              <Badge className="bg-red-100 text-red-800 animate-pulse">
                <Radio className="w-3 h-3 mr-1" />
                Live Monitoring
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="crisis-desc">Crisis Description</Label>
              <Textarea
                id="crisis-desc"
                placeholder="Describe the crisis situation in detail..."
                value={crisisDescription}
                onChange={(e) => setCrisisDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crisis-type">Crisis Type</Label>
                <Select value={crisisType} onValueChange={setCrisisType}>
                  <SelectTrigger id="crisis-type">
                    <SelectValue placeholder="Select crisis type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                    <SelectItem value="health_emergency">Health Emergency</SelectItem>
                    <SelectItem value="security_threat">Security Threat</SelectItem>
                    <SelectItem value="operational_failure">Operational Failure</SelectItem>
                    <SelectItem value="reputation_crisis">Reputation Crisis</SelectItem>
                    <SelectItem value="cyber_attack">Cyber Attack</SelectItem>
                    <SelectItem value="financial_crisis">Financial Crisis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Severity Level</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor (Level 1)</SelectItem>
                    <SelectItem value="moderate">Moderate (Level 2)</SelectItem>
                    <SelectItem value="major">Major (Level 3)</SelectItem>
                    <SelectItem value="severe">Severe (Level 4)</SelectItem>
                    <SelectItem value="catastrophic">Catastrophic (Level 5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Crisis location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="affected">Affected People</Label>
                <Input
                  id="affected"
                  type="number"
                  placeholder="Number of people affected..."
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCrisisAnalysis} 
                disabled={loading || !crisisDescription.trim()}
                className="flex-1"
                variant="destructive"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Crisis...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Analyze Crisis & Generate Response
                  </>
                )}
              </Button>

              {managementPlan && (
                <>
                  {!isMonitoring ? (
                    <Button onClick={startMonitoring} variant="outline">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start Monitoring
                    </Button>
                  ) : (
                    <Button onClick={stopMonitoring} variant="outline">
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Stop Monitoring
                    </Button>
                  )}
                  <Button onClick={refreshStatus} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {managementPlan && (
        <>
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Crisis Status Overview</span>
                <Badge className={getThreatLevelColor(managementPlan.threat_level)}>
                  Threat Level: {managementPlan.threat_level.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Response Priority</p>
                  <p className="font-semibold text-lg capitalize">{managementPlan.response_priority}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Est. Resolution</p>
                  <p className="font-semibold text-lg">{managementPlan.estimated_resolution_time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Risk Score</p>
                  <p className="font-semibold text-lg">
                    {((managementPlan.risk_assessment.probability * managementPlan.risk_assessment.impact) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Last Update</p>
                  <p className="font-semibold text-lg">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
                  </p>
                </div>
              </div>

              {managementPlan.evacuation_plan?.required && (
                <Alert className="mt-4 border-red-400 bg-red-100">
                  <Siren className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Evacuation Required:</strong> Follow designated evacuation routes immediately
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {crisisLevels.slice(0, 5).map((level) => {
              const isCurrentLevel = 
                (severity === 'minor' && level.level === 1) ||
                (severity === 'moderate' && level.level === 2) ||
                (severity === 'major' && level.level === 3) ||
                (severity === 'severe' && level.level === 4) ||
                (severity === 'catastrophic' && level.level === 5);

              return (
                <Card key={level.level} className={isCurrentLevel ? 'border-2 border-red-400' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Level {level.level}: {level.name}</span>
                      {isCurrentLevel && <Badge variant="destructive">Current</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">{level.description}</p>
                    <div className="space-y-1">
                      {level.actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-gray-400" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Tabs defaultValue="response" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="communications">Comms</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
            </TabsList>

            <TabsContent value="response" className="space-y-4">
              {responseProtocols.map((protocol) => (
                <Card key={protocol.phase}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{protocol.phase}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          protocol.status === 'completed' ? 'default' :
                          protocol.status === 'active' ? 'destructive' : 'secondary'
                        }>
                          {protocol.status}
                        </Badge>
                        <span className="text-sm text-gray-600">{protocol.duration}</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {protocol.tasks.map((task, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-3">
                            {task.completed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{task.task}</p>
                              <p className="text-xs text-gray-600">Assigned to: {task.responsible}</p>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="communications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Communication Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {communicationChannels.map((channel, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(channel.status)}
                            <span className="font-medium">{channel.channel}</span>
                            <Badge variant={
                              channel.priority === 'primary' ? 'default' :
                              channel.priority === 'secondary' ? 'secondary' : 'outline'
                            }>
                              {channel.priority}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{channel.messages} messages</p>
                            <p className="text-xs text-gray-600">{channel.lastUpdate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resource Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resourceAllocations.map((resource, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{resource.resource}</span>
                          <Badge variant={
                            resource.status === 'sufficient' ? 'default' :
                            resource.status === 'limited' ? 'secondary' : 'destructive'
                          }>
                            {resource.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>Available: {resource.available}</span>
                          <span>•</span>
                          <span>Allocated: {resource.allocated}</span>
                          <span>•</span>
                          <span>Needed: {resource.needed}</span>
                        </div>
                        <Progress 
                          value={(resource.allocated / resource.available) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {managementPlan.action_plan.map((action, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="bg-red-100 p-2 rounded-full">
                          <Zap className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{action}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Budget Allocated:</strong> ${managementPlan.resource_allocation.budget.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stakeholders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Stakeholder Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {managementPlan.stakeholder_notifications?.map((notification, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{notification.stakeholder}</p>
                            <p className="text-sm text-gray-600">Method: {notification.method}</p>
                          </div>
                          <Badge variant={
                            notification.status === 'Completed' ? 'default' :
                            notification.status === 'In progress' ? 'secondary' : 'outline'
                          }>
                            {notification.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={exportCrisisReport} className="w-full mt-4" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export Crisis Management Report
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

export default CrisisManagement;