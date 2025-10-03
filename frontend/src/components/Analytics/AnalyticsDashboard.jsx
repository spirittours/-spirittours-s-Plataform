/**
 * Advanced Analytics Dashboard
 * Comprehensive real-time analytics dashboard for enterprise B2C/B2B/B2B2C platform.
 * 
 * Features:
 * - Real-time KPI widgets
 * - Interactive charts and graphs
 * - Customizable dashboard layout
 * - WebSocket live updates
 * - Export capabilities
 * - Multi-business model filtering
 * - Responsive design
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Menu,
  MenuList,
  MenuItem as MenuOption,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert,
  Tooltip,
  Badge
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  ShoppingCart,
  Assessment,
  SmartToy,
  Timeline
} from '@mui/icons-material';

import { useWebSocket } from '../../hooks/useWebSocket';
import { analyticsAPI } from '../../services/api';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

// Constants
const TIME_FRAMES = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year'
};

const BUSINESS_MODELS = {
  ALL: null,
  B2C: 'b2c',
  B2B: 'b2b',
  B2B2C: 'b2b2c'
};

const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#ed6c02',
  info: '#0288d1',
  gradient: ['#1976d2', '#42a5f5', '#90caf9']
};

const KPI_CONFIG = {
  totalBookings: {
    title: 'Total Bookings',
    icon: ShoppingCart,
    color: 'primary',
    format: 'number'
  },
  totalRevenue: {
    title: 'Total Revenue',
    icon: AttachMoney,
    color: 'success',
    format: 'currency'
  },
  conversionRate: {
    title: 'Conversion Rate',
    icon: TrendingUp,
    color: 'info',
    format: 'percentage'
  },
  aiSatisfactionScore: {
    title: 'AI Satisfaction',
    icon: SmartToy,
    color: 'secondary',
    format: 'number',
    suffix: '/5.0'
  },
  userRetentionRate: {
    title: 'User Retention',
    icon: People,
    color: 'warning',
    format: 'percentage'
  },
  systemUptime: {
    title: 'System Uptime',
    icon: Timeline,
    color: 'success',
    format: 'percentage'
  }
};

// KPI Widget Component
const KPIWidget = ({ title, value, previousValue, icon: Icon, color, format, suffix }) => {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
        return formatNumber(value) + (suffix || '');
      default:
        return value?.toString() || '0';
    }
  }, [value, format, suffix]);

  const trend = useMemo(() => {
    if (previousValue === undefined || previousValue === null) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 0.1
    };
  }, [value, previousValue]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {formattedValue}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend.isNeutral ? null : trend.isPositive ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={trend.isNeutral ? 'textSecondary' : trend.isPositive ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {trend.isNeutral ? 'No change' : `${formatPercentage(trend.value)}`}
                </Typography>
              </Box>
            )}
          </Box>
          <Icon color={color} sx={{ fontSize: 40, opacity: 0.7 }} />
        </Box>
      </CardContent>
    </Card>
  );
};

// Chart Widget Component
const ChartWidget = ({ title, data, type, height = 300, config = {} }) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            {config.lines?.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <ChartTooltip />
            <Area
              type="monotone"
              dataKey={config.dataKey || "value"}
              stroke={CHART_COLORS.primary}
              fillOpacity={1}
              fill="url(#colorGradient)"
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            {config.bars?.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]}
              />
            ))}
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]} />
              ))}
            </Pie>
            <ChartTooltip />
          </PieChart>
        );
      
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box height={height}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
const AnalyticsDashboard = () => {
  const [timeFrame, setTimeFrame] = useState(TIME_FRAMES.DAY);
  const [businessModel, setBusinessModel] = useState(BUSINESS_MODELS.ALL);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    kpis: {},
    bookings: {},
    payments: {},
    aiUsage: {},
    userEngagement: {}
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  // WebSocket connection for real-time updates
  const { 
    connected: wsConnected, 
    send: wsSend, 
    lastMessage 
  } = useWebSocket('/api/analytics/ws/real-time', {
    enabled: realTimeEnabled,
    onMessage: (data) => {
      if (data.type === 'analytics_update') {
        setDashboardData(prev => ({
          ...prev,
          ...data.data
        }));
      } else if (data.type === 'initial_data') {
        setDashboardData(prev => ({
          ...prev,
          ...data.data
        }));
        setLoading(false);
      }
    },
    reconnectAttempts: 5,
    reconnectInterval: 3000
  });

  // Load initial analytics data
  const loadAnalyticsData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [kpisRes, bookingsRes, paymentsRes, aiUsageRes, engagementRes] = await Promise.all([
        analyticsAPI.getKPIs(timeFrame),
        analyticsAPI.getBookingAnalytics(timeFrame, businessModel),
        analyticsAPI.getPaymentAnalytics(timeFrame),
        analyticsAPI.getAIUsageAnalytics(timeFrame),
        analyticsAPI.getUserEngagementAnalytics(timeFrame)
      ]);

      setDashboardData({
        kpis: kpisRes.data,
        bookings: bookingsRes.data,
        payments: paymentsRes.data,
        aiUsage: aiUsageRes.data,
        userEngagement: engagementRes.data
      });

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [timeFrame, businessModel]);

  // Initial load
  useEffect(() => {
    if (!realTimeEnabled) {
      loadAnalyticsData();
    }
  }, [loadAnalyticsData, realTimeEnabled]);

  // Handle time frame change
  const handleTimeFrameChange = (event) => {
    setTimeFrame(event.target.value);
  };

  // Handle business model change
  const handleBusinessModelChange = (event) => {
    setBusinessModel(event.target.value);
  };

  // Handle real-time toggle
  const handleRealTimeToggle = (event) => {
    setRealTimeEnabled(event.target.checked);
    if (!event.target.checked) {
      loadAnalyticsData();
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    loadAnalyticsData();
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      setExportMenuAnchor(null);
      
      const response = await analyticsAPI.exportAnalytics('booking', format, timeFrame);
      
      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics_${timeFrame}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data. Please try again.');
    }
  };

  // Process chart data
  const processChartData = useCallback((data, type) => {
    if (!data || !data.period_data) return [];
    
    switch (type) {
      case 'bookingTrends':
        return data.period_data.map(item => ({
          period: new Date(item.period).toLocaleDateString(),
          bookings: item.booking_count,
          revenue: item.total_revenue,
          confirmed: item.confirmed_bookings
        }));
      
      case 'paymentMethods':
        return Object.entries(data.payment_methods || {}).map(([method, stats]) => ({
          name: method,
          value: stats.total_transactions,
          amount: stats.total_amount
        }));
      
      case 'agentPerformance':
        return (data.agent_performance || []).slice(0, 10).map(agent => ({
          name: agent.agent_name.substring(0, 10) + '...',
          queries: agent.query_count,
          satisfaction: agent.avg_satisfaction,
          responseTime: agent.avg_response_time_ms
        }));
      
      default:
        return [];
    }
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Analytics Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          {/* Real-time indicator */}
          <Badge
            color={wsConnected && realTimeEnabled ? "success" : "error"}
            variant="dot"
          >
            <FormControlLabel
              control={
                <Switch
                  checked={realTimeEnabled}
                  onChange={handleRealTimeToggle}
                  color="primary"
                />
              }
              label="Real-time"
            />
          </Badge>

          {/* Time frame selector */}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Frame</InputLabel>
            <Select
              value={timeFrame}
              onChange={handleTimeFrameChange}
              label="Time Frame"
            >
              {Object.entries(TIME_FRAMES).map(([key, value]) => (
                <MenuItem key={key} value={value}>
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Business model filter */}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Business Model</InputLabel>
            <Select
              value={businessModel || 'all'}
              onChange={handleBusinessModelChange}
              label="Business Model"
            >
              <MenuItem value="all">All Models</MenuItem>
              {Object.entries(BUSINESS_MODELS).map(([key, value]) => {
                if (key === 'ALL') return null;
                return (
                  <MenuItem key={key} value={value}>
                    {key}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Action buttons */}
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={realTimeEnabled}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export">
            <IconButton onClick={(e) => setExportMenuAnchor(e.currentTarget)}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        {Object.entries(KPI_CONFIG).map(([key, config]) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={key}>
            <KPIWidget
              title={config.title}
              value={dashboardData.kpis[key]}
              icon={config.icon}
              color={config.color}
              format={config.format}
              suffix={config.suffix}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Booking Trends */}
        <Grid item xs={12} lg={8}>
          <ChartWidget
            title="Booking Trends"
            data={processChartData(dashboardData.bookings, 'bookingTrends')}
            type="area"
            config={{ dataKey: 'bookings' }}
          />
        </Grid>

        {/* Payment Methods */}
        <Grid item xs={12} lg={4}>
          <ChartWidget
            title="Payment Methods"
            data={processChartData(dashboardData.payments, 'paymentMethods')}
            type="pie"
          />
        </Grid>

        {/* Revenue Trends */}
        <Grid item xs={12} lg={6}>
          <ChartWidget
            title="Revenue Analysis"
            data={processChartData(dashboardData.bookings, 'bookingTrends')}
            type="line"
            config={{
              lines: [
                { dataKey: 'revenue' },
                { dataKey: 'bookings' }
              ]
            }}
          />
        </Grid>

        {/* AI Agent Performance */}
        <Grid item xs={12} lg={6}>
          <ChartWidget
            title="AI Agent Performance"
            data={processChartData(dashboardData.aiUsage, 'agentPerformance')}
            type="bar"
            config={{
              bars: [
                { dataKey: 'queries' },
                { dataKey: 'satisfaction' }
              ]
            }}
          />
        </Grid>
      </Grid>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuOption onClick={() => handleExport('json')}>
          Export as JSON
        </MenuOption>
        <MenuOption onClick={() => handleExport('csv')}>
          Export as CSV
        </MenuOption>
      </Menu>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Dashboard configuration options will be available here.
            Future features include:
          </Typography>
          <ul>
            <li>Custom widget layouts</li>
            <li>Alert thresholds</li>
            <li>Auto-refresh intervals</li>
            <li>Custom date ranges</li>
            <li>Dashboard themes</li>
          </ul>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AnalyticsDashboard;