/**
 * 🎛️ AI CONTROL PANEL - ADMIN DASHBOARD
 * Panel de Control Multi-IA para Administradores
 * Spirit Tours Platform
 * 
 * Permite a los administradores:
 * - Configurar múltiples proveedores de IA
 * - Seleccionar qué IA usar para cada tarea
 * - Optimizar costos y rendimiento
 * - Monitorear uso y gastos en tiempo real
 * - A/B testing entre modelos
 * - Failover automático
 * 
 * @author GenSpark AI Developer
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Slider,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondary,
  FormGroup,
  Checkbox,
  Radio,
  RadioGroup,
  Autocomplete,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

import {
  Settings,
  Add,
  Delete,
  Edit,
  Save,
  Cancel,
  CloudUpload,
  CloudDownload,
  MonetizationOn,
  Speed,
  Security,
  Assessment,
  Warning,
  CheckCircle,
  Error,
  Info,
  Refresh,
  PlayArrow,
  Stop,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Timer,
  Memory,
  Storage,
  BugReport,
  Build,
  Code,
  Psychology,
  SmartToy,
  Lightbulb,
  AutoAwesome,
  ExpandMore,
  ExpandLess,
  CompareArrows,
  SyncAlt,
  Timeline,
  Analytics,
  ElectricBolt,
  Api,
  Key,
  Lock,
  LockOpen,
  Verified,
  CloudSync,
  CloudOff,
  DashboardCustomize,
  ModelTraining,
  Science,
  Insights,
  TuneSharp
} from '@mui/icons-material';

import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, ChartTooltip, Legend);

// Types
interface AIProvider {
  id: string;
  name: string;
  type: 'openai_gpt4' | 'openai_gpt5' | 'anthropic_claude' | 'google_gemini' | 'google_gemini_ultra' | 'meta_llama' | 'qwen' | 'deepseek' | 'grok' | 'mistral' | 'cohere' | 'custom';
  enabled: boolean;
  apiKey: string;
  endpoint?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  costPer1kTokens: number;
  priority: number;
  rateLimit: number;
  timeout: number;
  capabilities: string[];
  customParams: Record<string, any>;
  performance: {
    avgLatency: number;
    successRate: number;
    totalRequests: number;
    totalCost: number;
  };
}

interface TaskMapping {
  taskType: string;
  taskName: string;
  providers: string[];
  strategy: 'single' | 'fallback' | 'parallel' | 'round_robin' | 'cost_optimized' | 'quality_optimized';
  votingThreshold?: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

interface CostReport {
  provider: string;
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
  trend: 'up' | 'down' | 'stable';
  projectedMonthly: number;
}

interface TestResult {
  provider: string;
  success: boolean;
  latency: number;
  response: string;
  error?: string;
}

const AIControlPanel: React.FC = () => {
  // State
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [taskMappings, setTaskMappings] = useState<TaskMapping[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [costReports, setCostReports] = useState<CostReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'warning' | 'info' });
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<'cost' | 'quality' | 'balanced'>('balanced');

  // Available AI Providers
  const availableProviders = [
    { id: 'openai_gpt4', name: 'OpenAI GPT-4', icon: '🤖' },
    { id: 'openai_gpt5', name: 'OpenAI GPT-5 (Future)', icon: '🚀' },
    { id: 'anthropic_claude', name: 'Anthropic Claude 3', icon: '🧠' },
    { id: 'google_gemini', name: 'Google Gemini Pro', icon: '✨' },
    { id: 'google_gemini_ultra', name: 'Google Gemini Ultra', icon: '💎' },
    { id: 'meta_llama', name: 'Meta Llama 3', icon: '🦙' },
    { id: 'qwen', name: 'Qwen Turbo', icon: '🐉' },
    { id: 'deepseek', name: 'DeepSeek Coder', icon: '🔍' },
    { id: 'grok', name: 'xAI Grok', icon: '🎯' },
    { id: 'mistral', name: 'Mistral Large', icon: '🌪️' },
    { id: 'cohere', name: 'Cohere Command', icon: '🎨' },
    { id: 'custom', name: 'Custom Model', icon: '⚙️' }
  ];

  // Task Types
  const taskTypes = [
    { id: 'text_generation', name: 'Text Generation' },
    { id: 'chat_completion', name: 'Chat Completion' },
    { id: 'code_generation', name: 'Code Generation' },
    { id: 'translation', name: 'Translation' },
    { id: 'summarization', name: 'Summarization' },
    { id: 'sentiment_analysis', name: 'Sentiment Analysis' },
    { id: 'image_generation', name: 'Image Generation' },
    { id: 'embeddings', name: 'Embeddings' },
    { id: 'tour_design', name: 'Tour Design' },
    { id: 'customer_service', name: 'Customer Service' }
  ];

  // Load data on mount
  useEffect(() => {
    loadProviders();
    loadTaskMappings();
    loadCostReports();
  }, []);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/admin/ai/providers');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const loadTaskMappings = async () => {
    try {
      const response = await fetch('/api/admin/ai/task-mappings');
      const data = await response.json();
      setTaskMappings(data);
    } catch (error) {
      console.error('Error loading task mappings:', error);
    }
  };

  const loadCostReports = async () => {
    try {
      const response = await fetch('/api/admin/ai/cost-reports');
      const data = await response.json();
      setCostReports(data);
    } catch (error) {
      console.error('Error loading cost reports:', error);
    }
  };

  const saveProvider = async (provider: AIProvider) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai/providers', {
        method: provider.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider)
      });

      if (response.ok) {
        showNotification('Provider saved successfully', 'success');
        loadProviders();
        setEditingProvider(null);
        setShowAddProvider(false);
      } else {
        throw new Error('Failed to save provider');
      }
    } catch (error) {
      showNotification('Error saving provider', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      const response = await fetch(`/api/admin/ai/providers/${providerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('Provider deleted successfully', 'success');
        loadProviders();
      }
    } catch (error) {
      showNotification('Error deleting provider', 'error');
    }
  };

  const testProvider = async (provider: AIProvider) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id })
      });

      const result = await response.json();
      setTestResults([...testResults, result]);
      showNotification(result.success ? 'Test successful' : 'Test failed', result.success ? 'success' : 'error');
    } catch (error) {
      showNotification('Error testing provider', 'error');
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers: providers.filter(p => p.enabled).map(p => p.id) })
      });

      const results = await response.json();
      setBenchmarkResults(results);
      showNotification('Benchmark completed', 'success');
    } catch (error) {
      showNotification('Error running benchmark', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyStrategy = async (strategy: 'cost' | 'quality' | 'balanced') => {
    setSelectedStrategy(strategy);
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/ai/apply-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy })
      });

      if (response.ok) {
        showNotification(`${strategy} strategy applied`, 'success');
        loadTaskMappings();
      }
    } catch (error) {
      showNotification('Error applying strategy', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ open: true, message, severity });
  };

  // Render Provider Card
  const renderProviderCard = (provider: AIProvider) => (
    <Card key={provider.id} sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <Typography variant="h6" component="span">
              {availableProviders.find(p => p.id === provider.type)?.icon} {provider.name}
            </Typography>
            <Switch
              checked={provider.enabled}
              onChange={(e) => {
                const updated = { ...provider, enabled: e.target.checked };
                saveProvider(updated);
              }}
              sx={{ ml: 2 }}
            />
            {provider.enabled && (
              <Chip 
                label="Active" 
                color="success" 
                size="small" 
                sx={{ ml: 1 }}
                icon={<CheckCircle />}
              />
            )}
          </Box>
          <Box>
            <IconButton onClick={() => testProvider(provider)} size="small" title="Test Provider">
              <PlayArrow />
            </IconButton>
            <IconButton onClick={() => setEditingProvider(provider)} size="small" title="Edit">
              <Edit />
            </IconButton>
            <IconButton onClick={() => deleteProvider(provider.id)} size="small" color="error" title="Delete">
              <Delete />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">Model</Typography>
            <Typography variant="body1">{provider.model}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">Cost per 1K tokens</Typography>
            <Typography variant="body1">${provider.costPer1kTokens}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">API Endpoint</Typography>
            <Typography variant="body1" noWrap>{provider.endpoint || 'Default'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary">Rate Limit</Typography>
            <Typography variant="body1">{provider.rateLimit} req/min</Typography>
          </Grid>
        </Grid>

        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">Capabilities</Typography>
          <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
            {provider.capabilities.map(cap => (
              <Chip key={cap} label={cap} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>

        <Box mt={2} p={1} bgcolor="grey.100" borderRadius={1}>
          <Grid container spacing={1}>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Avg Latency</Typography>
              <Typography variant="body2">{provider.performance.avgLatency.toFixed(2)}s</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Success Rate</Typography>
              <Typography variant="body2">{(provider.performance.successRate * 100).toFixed(1)}%</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Total Requests</Typography>
              <Typography variant="body2">{provider.performance.totalRequests}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Total Cost</Typography>
              <Typography variant="body2">${provider.performance.totalCost.toFixed(2)}</Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );

  // Render Task Mapping
  const renderTaskMapping = (mapping: TaskMapping) => (
    <Accordion key={mapping.taskType}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography>{taskTypes.find(t => t.id === mapping.taskType)?.name || mapping.taskType}</Typography>
        <Chip 
          label={mapping.strategy} 
          size="small" 
          sx={{ ml: 2 }}
          color={mapping.strategy === 'cost_optimized' ? 'success' : mapping.strategy === 'quality_optimized' ? 'primary' : 'default'}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Strategy</InputLabel>
              <Select
                value={mapping.strategy}
                label="Strategy"
                onChange={(e) => {
                  const updated = { ...mapping, strategy: e.target.value as any };
                  // Save updated mapping
                }}
              >
                <MenuItem value="single">Single Provider</MenuItem>
                <MenuItem value="fallback">Fallback</MenuItem>
                <MenuItem value="parallel">Parallel</MenuItem>
                <MenuItem value="round_robin">Round Robin</MenuItem>
                <MenuItem value="cost_optimized">Cost Optimized</MenuItem>
                <MenuItem value="quality_optimized">Quality Optimized</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              size="small"
              options={providers.filter(p => p.enabled).map(p => p.id)}
              value={mapping.providers}
              onChange={(e, value) => {
                const updated = { ...mapping, providers: value };
                // Save updated mapping
              }}
              renderInput={(params) => (
                <TextField {...params} label="Providers" placeholder="Select providers" />
              )}
            />
          </Grid>
          {mapping.strategy === 'parallel' && (
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Voting Threshold: {mapping.votingThreshold}</Typography>
              <Slider
                value={mapping.votingThreshold || 0.7}
                onChange={(e, value) => {
                  const updated = { ...mapping, votingThreshold: value as number };
                  // Save updated mapping
                }}
                min={0.5}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={mapping.cacheEnabled}
                  onChange={(e) => {
                    const updated = { ...mapping, cacheEnabled: e.target.checked };
                    // Save updated mapping
                  }}
                />
              }
              label="Enable Cache"
            />
            {mapping.cacheEnabled && (
              <TextField
                type="number"
                size="small"
                label="Cache TTL (seconds)"
                value={mapping.cacheTTL}
                onChange={(e) => {
                  const updated = { ...mapping, cacheTTL: parseInt(e.target.value) };
                  // Save updated mapping
                }}
                sx={{ ml: 2, width: 150 }}
              />
            )}
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );

  // Cost Chart Data
  const costChartData = {
    labels: costReports.map(r => r.provider),
    datasets: [
      {
        label: 'Daily Cost',
        data: costReports.map(r => r.daily),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Projected Monthly',
        data: costReports.map(r => r.projectedMonthly),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      }
    ]
  };

  // Performance Chart Data
  const performanceChartData = {
    labels: providers.map(p => p.name),
    datasets: [
      {
        label: 'Average Latency (s)',
        data: providers.map(p => p.performance.avgLatency),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Success Rate (%)',
        data: providers.map(p => p.performance.successRate * 100),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      }
    ]
  };

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            <SmartToy sx={{ mr: 1, verticalAlign: 'middle' }} />
            AI Control Panel
          </Typography>
          <Box>
            <ToggleButtonGroup
              value={selectedStrategy}
              exclusive
              onChange={(e, value) => value && applyStrategy(value)}
              size="small"
              sx={{ mr: 2 }}
            >
              <ToggleButton value="cost">
                <AttachMoney /> Cost
              </ToggleButton>
              <ToggleButton value="balanced">
                <CompareArrows /> Balanced
              </ToggleButton>
              <ToggleButton value="quality">
                <ElectricBolt /> Quality
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddProvider(true)}
              sx={{ mr: 1 }}
            >
              Add Provider
            </Button>
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              onClick={runBenchmark}
              disabled={loading}
            >
              Run Benchmark
            </Button>
          </Box>
        </Box>

        <Tabs value={selectedTab} onChange={(e, value) => setSelectedTab(value)} sx={{ mb: 3 }}>
          <Tab label="Providers" icon={<Psychology />} />
          <Tab label="Task Mappings" icon={<SyncAlt />} />
          <Tab label="Cost Analysis" icon={<MonetizationOn />} />
          <Tab label="Performance" icon={<Speed />} />
          <Tab label="Test Results" icon={<BugReport />} />
        </Tabs>

        {/* Providers Tab */}
        {selectedTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {providers.length === 0 ? (
                <Alert severity="info">
                  No AI providers configured. Click "Add Provider" to get started.
                </Alert>
              ) : (
                providers.map(provider => renderProviderCard(provider))
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <Insights sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Quick Stats
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Active Providers" secondary={providers.filter(p => p.enabled).length} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Total Requests" secondary={providers.reduce((sum, p) => sum + p.performance.totalRequests, 0)} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Total Cost" secondary={`$${providers.reduce((sum, p) => sum + p.performance.totalCost, 0).toFixed(2)}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Avg Success Rate" secondary={`${(providers.reduce((sum, p) => sum + p.performance.successRate, 0) / providers.length * 100).toFixed(1)}%`} />
                  </ListItem>
                </List>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Recommendations
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><TrendingUp color="success" /></ListItemIcon>
                    <ListItemText primary="Enable Qwen for cost-effective translations" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><ElectricBolt color="primary" /></ListItemIcon>
                    <ListItemText primary="Use GPT-4 for complex tour designs" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><AttachMoney color="warning" /></ListItemIcon>
                    <ListItemText primary="Consider caching for frequent queries" />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Task Mappings Tab */}
        {selectedTab === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Configure which AI providers handle specific tasks. You can use single providers or combine multiple for better results.
            </Alert>
            {taskTypes.map(taskType => {
              const mapping = taskMappings.find(m => m.taskType === taskType.id) || {
                taskType: taskType.id,
                taskName: taskType.name,
                providers: [],
                strategy: 'single' as const,
                cacheEnabled: false,
                cacheTTL: 3600
              };
              return renderTaskMapping(mapping);
            })}
          </Box>
        )}

        {/* Cost Analysis Tab */}
        {selectedTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Cost by Provider</Typography>
                <Bar data={costChartData} />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell align="right">Monthly</TableCell>
                        <TableCell align="right">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {costReports.map(report => (
                        <TableRow key={report.provider}>
                          <TableCell>{report.provider}</TableCell>
                          <TableCell align="right">${report.monthly.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {report.trend === 'up' ? <TrendingUp color="error" /> : 
                             report.trend === 'down' ? <TrendingDown color="success" /> :
                             <Remove />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Performance Tab */}
        {selectedTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                <Line data={performanceChartData} />
              </Paper>
            </Grid>
            {benchmarkResults && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Benchmark Results</Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Provider</TableCell>
                          <TableCell>Avg Latency</TableCell>
                          <TableCell>Success Rate</TableCell>
                          <TableCell>Cost Efficiency</TableCell>
                          <TableCell>Overall Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(benchmarkResults.results).map(([provider, results]: any) => (
                          <TableRow key={provider}>
                            <TableCell>{provider}</TableCell>
                            <TableCell>{results.avg_latency.toFixed(2)}s</TableCell>
                            <TableCell>{(results.success_rate * 100).toFixed(1)}%</TableCell>
                            <TableCell>${results.avg_cost.toFixed(4)}</TableCell>
                            <TableCell>
                              <LinearProgress 
                                variant="determinate" 
                                value={results.overall_score * 100} 
                                sx={{ height: 10, borderRadius: 5 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* Test Results Tab */}
        {selectedTab === 4 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {testResults.length === 0 ? (
                <Alert severity="info">
                  No test results yet. Test providers from the Providers tab.
                </Alert>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Provider</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Latency</TableCell>
                        <TableCell>Response</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {testResults.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>{result.provider}</TableCell>
                          <TableCell>
                            {result.success ? 
                              <CheckCircle color="success" /> : 
                              <Error color="error" />
                            }
                          </TableCell>
                          <TableCell>{result.latency.toFixed(2)}s</TableCell>
                          <TableCell>{result.response.substring(0, 100)}...</TableCell>
                          <TableCell>{result.error || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>
          </Grid>
        )}

        {/* Add/Edit Provider Dialog */}
        <Dialog 
          open={showAddProvider || !!editingProvider} 
          onClose={() => {
            setShowAddProvider(false);
            setEditingProvider(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingProvider ? 'Edit Provider' : 'Add AI Provider'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Provider Type</InputLabel>
                  <Select
                    value={editingProvider?.type || ''}
                    label="Provider Type"
                    onChange={(e) => {
                      if (editingProvider) {
                        setEditingProvider({ ...editingProvider, type: e.target.value as any });
                      }
                    }}
                  >
                    {availableProviders.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Provider Name"
                  value={editingProvider?.name || ''}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, name: e.target.value });
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Key"
                  type="password"
                  value={editingProvider?.apiKey || ''}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, apiKey: e.target.value });
                    }
                  }}
                  InputProps={{
                    endAdornment: <Key />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Model"
                  value={editingProvider?.model || ''}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, model: e.target.value });
                    }
                  }}
                  helperText="e.g., gpt-4-turbo-preview, claude-3-opus"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Endpoint (Optional)"
                  value={editingProvider?.endpoint || ''}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, endpoint: e.target.value });
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Tokens"
                  value={editingProvider?.maxTokens || 2000}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, maxTokens: parseInt(e.target.value) });
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Temperature"
                  value={editingProvider?.temperature || 0.7}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, temperature: parseFloat(e.target.value) });
                    }
                  }}
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cost per 1K Tokens"
                  value={editingProvider?.costPer1kTokens || 0.01}
                  onChange={(e) => {
                    if (editingProvider) {
                      setEditingProvider({ ...editingProvider, costPer1kTokens: parseFloat(e.target.value) });
                    }
                  }}
                  InputProps={{
                    startAdornment: '$'
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Capabilities</Typography>
                <FormGroup row>
                  {taskTypes.map(task => (
                    <FormControlLabel
                      key={task.id}
                      control={
                        <Checkbox
                          checked={editingProvider?.capabilities.includes(task.id) || false}
                          onChange={(e) => {
                            if (editingProvider) {
                              const capabilities = e.target.checked
                                ? [...editingProvider.capabilities, task.id]
                                : editingProvider.capabilities.filter(c => c !== task.id);
                              setEditingProvider({ ...editingProvider, capabilities });
                            }
                          }}
                        />
                      }
                      label={task.name}
                    />
                  ))}
                </FormGroup>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowAddProvider(false);
              setEditingProvider(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={() => editingProvider && saveProvider(editingProvider)}
              disabled={loading}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>

        {/* Loading Overlay */}
        {loading && (
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(0, 0, 0, 0.5)"
            zIndex={9999}
          >
            <CircularProgress size={60} />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default AIControlPanel;