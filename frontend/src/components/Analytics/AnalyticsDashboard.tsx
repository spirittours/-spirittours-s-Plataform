/**
 * Analytics Dashboard - Main Component
 * Real-time analytics with interactive charts and KPIs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  PieChart as PieChartIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { analyticsService } from '../../services/analyticsService';

// Color palette
const COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  b2c: '#8884d8',
  b2b: '#82ca9d',
  b2b2c: '#ffc658',
};

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c', '#d0ed57'];

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, trend, icon, color }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUpIcon sx={{ color: COLORS.success }} />;
    if (trend === 'down') return <TrendingDownIcon sx={{ color: COLORS.error }} />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return COLORS.success;
    if (trend === 'down') return COLORS.error;
    return COLORS.info;
  };

  return (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mt: 1, mb: 1, fontWeight: 'bold' }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getTrendIcon()}
                <Typography
                  variant="body2"
                  sx={{ color: getTrendColor(), fontWeight: 'medium' }}
                >
                  {change > 0 ? '+' : ''}
                  {change.toFixed(2)}%
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                backgroundColor: color || COLORS.primary,
                borderRadius: '50%',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('daily');
  const [dashboardType, setDashboardType] = useState('executive');
  
  // Data states
  const [realtimeKPIs, setRealtimeKPIs] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [bookingsData, setBookingsData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Auto-refresh timer
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const [kpis, revenue, bookings, customers, alertsData] = await Promise.all([
        analyticsService.getRealtimeKPIs(),
        analyticsService.getMetric('revenue', timeRange),
        analyticsService.getMetric('bookings', timeRange),
        analyticsService.getMetric('customers', timeRange),
        analyticsService.getRealtimeAlerts(),
      ]);

      setRealtimeKPIs(kpis);
      setRevenueData(revenue);
      setBookingsData(bookings);
      setCustomersData(customers);
      setAlerts(alertsData.alerts || []);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  const handleRefresh = () => {
    setCountdown(30);
    fetchDashboardData(false);
  };

  const handleExport = async () => {
    try {
      toast.loading('Generating report...');
      const report = await analyticsService.generateReport('financial', timeRange);
      toast.success('Report generated successfully!');
      console.log('Report:', report);
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  // Generate mock chart data for revenue trends
  const generateRevenueChartData = () => {
    if (!revenueData) return [];
    
    const days = timeRange === 'monthly' ? 30 : timeRange === 'weekly' ? 7 : 12;
    return Array.from({ length: days }, (_, i) => ({
      name: timeRange === 'monthly' ? `Day ${i + 1}` : timeRange === 'weekly' ? `Day ${i + 1}` : `Month ${i + 1}`,
      revenue: Math.random() * 100000 + 50000,
      bookings: Math.random() * 500 + 200,
    }));
  };

  // Generate business model breakdown data
  const generateBusinessModelData = () => {
    if (!revenueData?.current_period?.breakdown) return [];
    
    const breakdown = revenueData.current_period.breakdown;
    return [
      { name: 'B2C', value: breakdown.b2c || 0, color: COLORS.b2c },
      { name: 'B2B', value: breakdown.b2b || 0, color: COLORS.b2b },
      { name: 'B2B2C', value: breakdown.b2b2c || 0, color: COLORS.b2b2c },
    ];
  };

  // Generate top destinations data
  const generateDestinationsData = () => {
    if (!bookingsData?.popular_destinations) return [];
    return bookingsData.popular_destinations.slice(0, 5);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Real-time business intelligence and performance metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="real_time">Real-time</MenuItem>
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={autoRefresh ? `Auto-refresh in ${countdown}s` : 'Auto-refresh disabled'}>
            <Chip
              label={autoRefresh ? `${countdown}s` : 'Manual'}
              color={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={refreshing} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export report">
            <IconButton onClick={handleExport} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {alerts.slice(0, 2).map((alert, index) => (
            <Alert
              key={index}
              severity={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
              sx={{ mb: 1 }}
            >
              <strong>{alert.category}:</strong> {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Revenue"
            value={`€${revenueData?.current_period?.total_revenue?.toLocaleString() || '0'}`}
            change={revenueData?.change?.percentage}
            trend={revenueData?.change?.trend}
            icon={<AssessmentIcon sx={{ color: 'white' }} />}
            color={COLORS.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Bookings"
            value={bookingsData?.total_bookings?.toLocaleString() || '0'}
            change={5.2}
            trend="up"
            icon={<ShowChartIcon sx={{ color: 'white' }} />}
            color={COLORS.success}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Conversion Rate"
            value={`${bookingsData?.conversion_rate?.toFixed(2) || '0'}%`}
            change={1.8}
            trend="up"
            icon={<PieChartIcon sx={{ color: 'white' }} />}
            color={COLORS.warning}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Avg Booking Value"
            value={`€${bookingsData?.average_booking_value?.toFixed(2) || '0'}`}
            change={-2.1}
            trend="down"
            icon={<AssessmentIcon sx={{ color: 'white' }} />}
            color={COLORS.info}
          />
        </Grid>
      </Grid>

      {/* Main Charts */}
      <Grid container spacing={3}>
        {/* Revenue Trends */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Revenue & Bookings Trends
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={generateRevenueChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.6}
                    name="Revenue (€)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="bookings"
                    stroke={COLORS.success}
                    fill={COLORS.success}
                    fillOpacity={0.6}
                    name="Bookings"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Model Breakdown */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Revenue by Business Model
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={generateBusinessModelData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generateBusinessModelData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Destinations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Top Destinations
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generateDestinationsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="destination" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="bookings" fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Sources */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Revenue Sources
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData?.top_revenue_sources || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="percentage" fill={COLORS.success} name="% of Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
