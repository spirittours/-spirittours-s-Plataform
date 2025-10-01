import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Skeleton,
  Container,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Badge,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics,
  Assessment,
  Timeline,
  Insights,
  PredictiveText,
  AutoGraph,
  Dashboard,
  SmartToy,
  Psychology,
  BubbleChart,
  ShowChart,
  BarChart,
  PieChart,
  Refresh,
  Settings,
  Fullscreen,
  Download,
  Share,
  Notifications,
  Warning,
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut, Scatter, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import { format, subDays, subHours } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import Plot from 'react-plotly.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

// Types and Interfaces
interface KPIMetric {
  id: string;
  title: string;
  value: number;
  change: number;
  changePercent: number;
  target?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  severity: 'success' | 'warning' | 'error' | 'info';
  description?: string;
}

interface AnalyticsInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'trend' | 'recommendation' | 'alert';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  action?: string;
  timestamp: Date;
}

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'plotly';
  data: any;
  options?: any;
  plotlyData?: any;
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'insight' | 'table' | 'custom';
  size: 'small' | 'medium' | 'large' | 'xl';
  data: any;
  refreshInterval?: number;
  position: { x: number; y: number };
}

interface FilterOptions {
  dateRange: string;
  metrics: string[];
  userSegments: string[];
  models: string[];
  customFilters: Record<string, any>;
}

const BusinessIntelligenceDashboard: React.FC = () => {
  const theme = useTheme();
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPIMetric[]>([]);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '7d',
    metrics: ['usage', 'performance', 'cost'],
    userSegments: ['all'],
    models: ['all'],
    customFilters: {}
  });
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [notifications, setNotifications] = useState<AnalyticsInsight[]>([]);

  // Real-time data refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshDashboard();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  // Dashboard data loading
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel data loading
      const [kpiData, insightData, widgetData] = await Promise.all([
        fetchKPIData(),
        fetchInsights(),
        fetchWidgetData()
      ]);

      setKpis(kpiData);
      setInsights(insightData);
      setWidgets(widgetData);
      
      // Extract notifications from insights
      const criticalInsights = insightData.filter(
        insight => insight.impact === 'high' || insight.type === 'alert'
      );
      setNotifications(criticalInsights);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  // API calls
  const fetchKPIData = async (): Promise<KPIMetric[]> => {
    const response = await fetch('/api/v1/analytics/kpis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters })
    });

    if (!response.ok) throw new Error('Failed to fetch KPI data');
    
    const data = await response.json();
    return data.kpis || mockKPIData();
  };

  const fetchInsights = async (): Promise<AnalyticsInsight[]> => {
    const response = await fetch('/api/v1/analytics/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        filters,
        includeRecommendations: true,
        confidenceThreshold: 0.7
      })
    });

    if (!response.ok) throw new Error('Failed to fetch insights');
    
    const data = await response.json();
    return data.insights || mockInsights();
  };

  const fetchWidgetData = async (): Promise<DashboardWidget[]> => {
    const response = await fetch('/api/v1/analytics/widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters })
    });

    if (!response.ok) throw new Error('Failed to fetch widget data');
    
    const data = await response.json();
    return data.widgets || mockWidgets();
  };

  // Mock data generators (for development/demo)
  const mockKPIData = (): KPIMetric[] => [
    {
      id: 'total_requests',
      title: 'Total AI Requests',
      value: 145632,
      change: 12540,
      changePercent: 9.4,
      unit: 'requests',
      trend: 'up',
      severity: 'success',
      description: 'Total AI model requests processed'
    },
    {
      id: 'avg_response_time',
      title: 'Avg Response Time',
      value: 847,
      change: -23,
      changePercent: -2.6,
      target: 800,
      unit: 'ms',
      trend: 'down',
      severity: 'success',
      description: 'Average API response time'
    },
    {
      id: 'total_cost',
      title: 'Total Costs',
      value: 28456,
      change: 1834,
      changePercent: 6.9,
      unit: '$',
      trend: 'up',
      severity: 'warning',
      description: 'Total operational costs'
    },
    {
      id: 'active_users',
      title: 'Active Users',
      value: 3247,
      change: 189,
      changePercent: 6.2,
      unit: 'users',
      trend: 'up',
      severity: 'success',
      description: 'Monthly active users'
    },
    {
      id: 'model_accuracy',
      title: 'Avg Model Accuracy',
      value: 94.7,
      change: 0.3,
      changePercent: 0.3,
      target: 95.0,
      unit: '%',
      trend: 'up',
      severity: 'info',
      description: 'Average accuracy across all models'
    },
    {
      id: 'error_rate',
      title: 'Error Rate',
      value: 0.8,
      change: -0.2,
      changePercent: -20.0,
      target: 1.0,
      unit: '%',
      trend: 'down',
      severity: 'success',
      description: 'System error rate'
    }
  ];

  const mockInsights = (): AnalyticsInsight[] => [
    {
      id: 'usage_surge_prediction',
      type: 'prediction',
      title: 'Usage Surge Predicted',
      description: 'AI models predict a 35% increase in requests over the next 3 days based on historical patterns and external factors.',
      confidence: 0.87,
      impact: 'high',
      action: 'Scale infrastructure proactively',
      timestamp: new Date()
    },
    {
      id: 'cost_optimization',
      type: 'recommendation',
      title: 'Cost Optimization Opportunity',
      description: 'Switching 23% of GPT-4 requests to Claude 3.5 Sonnet could save $2,340/month while maintaining quality.',
      confidence: 0.92,
      impact: 'high',
      action: 'Implement load balancer optimization',
      timestamp: new Date()
    },
    {
      id: 'performance_anomaly',
      type: 'anomaly',
      title: 'Performance Anomaly Detected',
      description: 'Response times for vision models increased by 40% in the last 2 hours. Investigating potential bottleneck.',
      confidence: 0.95,
      impact: 'medium',
      action: 'Check vision model infrastructure',
      timestamp: new Date()
    },
    {
      id: 'user_behavior_trend',
      type: 'trend',
      title: 'Emerging User Pattern',
      description: 'Enterprise users are increasingly using multimodal AI (text+image) requests, growing 150% this month.',
      confidence: 0.78,
      impact: 'medium',
      action: 'Optimize multimodal pricing',
      timestamp: new Date()
    }
  ];

  const mockWidgets = (): DashboardWidget[] => [
    {
      id: 'usage_trend',
      title: 'Usage Trends',
      type: 'chart',
      size: 'large',
      position: { x: 0, y: 0 },
      data: generateUsageTrendData()
    },
    {
      id: 'cost_breakdown',
      title: 'Cost Breakdown',
      type: 'chart',
      size: 'medium',
      position: { x: 1, y: 0 },
      data: generateCostBreakdownData()
    },
    {
      id: 'performance_metrics',
      title: 'Performance Metrics',
      type: 'chart',
      size: 'medium',
      position: { x: 0, y: 1 },
      data: generatePerformanceData()
    },
    {
      id: 'model_usage',
      title: 'Model Usage Distribution',
      type: 'chart',
      size: 'medium',
      position: { x: 1, y: 1 },
      data: generateModelUsageData()
    }
  ];

  // Chart data generators
  const generateUsageTrendData = (): ChartData => {
    const days = Array.from({ length: 7 }, (_, i) => 
      format(subDays(new Date(), 6 - i), 'MMM dd')
    );
    
    return {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          {
            label: 'API Requests',
            data: [12400, 15600, 18200, 16800, 19500, 22100, 25400],
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.main + '20',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Unique Users',
            data: [2100, 2450, 2680, 2520, 2890, 3120, 3400],
            borderColor: theme.palette.secondary.main,
            backgroundColor: theme.palette.secondary.main + '20',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' as const },
          title: { display: true, text: 'Usage Trends (7 Days)' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };
  };

  const generateCostBreakdownData = (): ChartData => {
    return {
      type: 'doughnut',
      data: {
        labels: ['API Costs', 'Infrastructure', 'Storage', 'Monitoring', 'Other'],
        datasets: [{
          data: [15420, 8960, 2340, 1180, 560],
          backgroundColor: [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.error.main
          ],
          borderWidth: 2,
          borderColor: theme.palette.background.paper
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' as const },
          title: { display: true, text: 'Cost Distribution' }
        }
      }
    };
  };

  const generatePerformanceData = (): ChartData => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    
    return {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Response Time (ms)',
            data: Array.from({ length: 24 }, () => 
              Math.floor(Math.random() * 200 + 600)
            ),
            borderColor: theme.palette.info.main,
            backgroundColor: theme.palette.info.main + '20',
            yAxisID: 'y'
          },
          {
            label: 'Error Rate (%)',
            data: Array.from({ length: 24 }, () => 
              Math.random() * 2
            ),
            borderColor: theme.palette.error.main,
            backgroundColor: theme.palette.error.main + '20',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' as const }
        },
        scales: {
          y: { 
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            title: { display: true, text: 'Response Time (ms)' }
          },
          y1: {
            type: 'linear' as const,
            display: true,
            position: 'right' as const,
            title: { display: true, text: 'Error Rate (%)' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    };
  };

  const generateModelUsageData = (): ChartData => {
    return {
      type: 'bar',
      data: {
        labels: ['GPT-4', 'Claude 3.5', 'Gemini Pro', 'Qwen', 'DeepSeek', 'Others'],
        datasets: [{
          label: 'Requests',
          data: [45000, 32000, 28000, 18000, 12000, 8000],
          backgroundColor: [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.success.main,
            theme.palette.warning.main,
            theme.palette.info.main,
            theme.palette.error.main
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Model Usage (Requests)' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };
  };

  // Component renderers
  const renderKPICard = (kpi: KPIMetric) => (
    <Card key={kpi.id} elevation={2}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {kpi.title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {kpi.unit === '$' ? '$' : ''}{kpi.value.toLocaleString()}{kpi.unit !== '$' ? kpi.unit : ''}
            </Typography>
            {kpi.target && (
              <Typography variant="body2" color="textSecondary">
                Target: {kpi.target.toLocaleString()}{kpi.unit}
              </Typography>
            )}
          </Box>
          <Box textAlign="right">
            <Chip
              icon={kpi.trend === 'up' ? <TrendingUp /> : kpi.trend === 'down' ? <TrendingDown /> : undefined}
              label={`${kpi.change > 0 ? '+' : ''}${kpi.changePercent.toFixed(1)}%`}
              color={
                kpi.severity === 'success' ? 'success' :
                kpi.severity === 'warning' ? 'warning' :
                kpi.severity === 'error' ? 'error' : 'default'
              }
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
        {kpi.description && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {kpi.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderInsightCard = (insight: AnalyticsInsight) => (
    <Card key={insight.id} elevation={1} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Box>
            {insight.type === 'prediction' && <PredictiveText color="primary" />}
            {insight.type === 'anomaly' && <Warning color="warning" />}
            {insight.type === 'trend' && <TrendingUp color="info" />}
            {insight.type === 'recommendation' && <Psychology color="success" />}
            {insight.type === 'alert' && <Error color="error" />}
          </Box>
          <Box flex={1}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="h6" fontWeight="600">
                {insight.title}
              </Typography>
              <Chip
                label={`${(insight.confidence * 100).toFixed(0)}% confidence`}
                size="small"
                color={insight.confidence > 0.8 ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
              {insight.description}
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Chip
                label={insight.impact}
                size="small"
                color={
                  insight.impact === 'high' ? 'error' :
                  insight.impact === 'medium' ? 'warning' : 'success'
                }
              />
              {insight.action && (
                <Button size="small" variant="outlined" startIcon={<SmartToy />}>
                  {insight.action}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const renderChart = (widget: DashboardWidget) => {
    const chartData = widget.data as ChartData;
    
    if (chartData.type === 'plotly' && chartData.plotlyData) {
      return (
        <Plot
          data={chartData.plotlyData.data}
          layout={{
            ...chartData.plotlyData.layout,
            autosize: true,
            margin: { l: 40, r: 40, t: 40, b: 40 }
          }}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />
      );
    }

    const ChartComponent = {
      line: Line,
      bar: Bar,
      pie: Pie,
      doughnut: Doughnut,
      scatter: Scatter,
      radar: Radar
    }[chartData.type];

    if (!ChartComponent) return null;

    return (
      <ChartComponent
        data={chartData.data}
        options={{
          ...chartData.options,
          maintainAspectRatio: false
        }}
        height={300}
      />
    );
  };

  const renderWidget = (widget: DashboardWidget) => {
    const getGridSize = (size: string) => {
      switch (size) {
        case 'small': return { xs: 12, md: 3 };
        case 'medium': return { xs: 12, md: 6 };
        case 'large': return { xs: 12, md: 9 };
        case 'xl': return { xs: 12, md: 12 };
        default: return { xs: 12, md: 6 };
      }
    };

    return (
      <Grid item {...getGridSize(widget.size)} key={widget.id}>
        <Card elevation={2} sx={{ height: widget.type === 'chart' ? 400 : 'auto' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="600">
                {widget.title}
              </Typography>
              <IconButton size="small">
                <Fullscreen />
              </IconButton>
            </Box>
            {widget.type === 'chart' && renderChart(widget)}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} md={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={150} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" action={
          <Button onClick={refreshDashboard}>Retry</Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Business Intelligence Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            AI-powered analytics and insights for your platform
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <Badge badgeContent={notifications.length} color="error">
            <IconButton>
              <Notifications />
            </IconButton>
          </Badge>
          <Tooltip title="Refresh Dashboard">
            <IconButton onClick={refreshDashboard} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>
          <IconButton onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={filters.dateRange}
                label="Time Range"
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Metrics</InputLabel>
              <Select
                multiple
                value={filters.metrics}
                label="Metrics"
                onChange={(e) => setFilters(prev => ({ ...prev, metrics: e.target.value as string[] }))}
              >
                <MenuItem value="usage">Usage</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="cost">Cost</MenuItem>
                <MenuItem value="quality">Quality</MenuItem>
                <MenuItem value="users">Users</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item flex={1}>
            {refreshing && <LinearProgress />}
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map(renderKPICard)}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Charts and Widgets */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            {widgets.map(renderWidget)}
          </Grid>
        </Grid>

        {/* Insights Panel */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              <Box display="flex" alignItems="center" gap={1}>
                <Insights color="primary" />
                AI Insights & Recommendations
              </Box>
            </Typography>
            {insights.map(renderInsightCard)}
          </Paper>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Box py={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Auto Refresh"
            />
            
            {autoRefresh && (
              <Box mt={2}>
                <Typography gutterBottom>
                  Refresh Interval: {refreshInterval}s
                </Typography>
                <Slider
                  value={refreshInterval}
                  onChange={(_, value) => setRefreshInterval(value as number)}
                  min={10}
                  max={300}
                  step={10}
                  marks={[
                    { value: 10, label: '10s' },
                    { value: 60, label: '1m' },
                    { value: 300, label: '5m' }
                  ]}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default BusinessIntelligenceDashboard;