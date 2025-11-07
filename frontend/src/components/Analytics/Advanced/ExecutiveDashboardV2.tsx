/**
 * Executive Dashboard V2 - Sprint 25 (Fase 7)
 * 
 * Comprehensive executive dashboard with real-time KPIs, trend analysis,
 * and interactive visualizations.
 * 
 * Features:
 * - Executive KPI cards with trends
 * - Health score indicator
 * - Period-over-period comparisons
 * - Interactive charts (Revenue, Customers, Performance)
 * - Metric breakdowns with progress bars
 * - Responsive grid layout
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Avatar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove as TrendingFlat,
  AttachMoney,
  People,
  Star,
  Speed,
  TrendingUpOutlined,
  Refresh,
  InfoOutlined
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  category?: string;
}

interface ExecutiveKPIs {
  workspaceId: string;
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  generatedAt: string;
  revenueMetrics: any;
  customerMetrics: any;
  operationalMetrics: any;
  employeeMetrics: any;
  growthMetrics: any;
  healthScore: any;
  comparison: any;
  summary: any;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, trend, icon, color, category }) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend === 'up') return <TrendingUp fontSize="small" sx={{ color: 'success.main' }} />;
    if (trend === 'down') return <TrendingDown fontSize="small" sx={{ color: 'error.main' }} />;
    return <TrendingFlat fontSize="small" sx={{ color: 'grey.500' }} />;
  };

  const getCategoryColor = (cat?: string) => {
    const colors: Record<string, string> = {
      excellent: '#4caf50',
      good: '#8bc34a',
      fair: '#ffc107',
      poor: '#ff9800',
      critical: '#f44336'
    };
    return colors[cat || 'good'] || '#9e9e9e';
  };

  return (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color }}>
            {icon}
          </Avatar>
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between">
          {change !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {getTrendIcon()}
              <Typography
                variant="body2"
                color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
                fontWeight="medium"
              >
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs previous period
              </Typography>
            </Box>
          )}

          {category && (
            <Chip
              label={category.replace('_', ' ').toUpperCase()}
              size="small"
              sx={{
                bgcolor: getCategoryColor(category),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem'
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const ExecutiveDashboardV2: React.FC = () => {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null);

  const workspaceId = 'workspace123'; // TODO: Get from context

  useEffect(() => {
    fetchKPIs();
  }, [period]);

  const fetchKPIs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/${workspaceId}/executive/kpis?period=${period}&includeComparison=true`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch KPIs');
      }

      const result = await response.json();
      setKpis(result.data);
    } catch (err: any) {
      console.error('Error fetching KPIs:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#8bc34a';
    if (score >= 40) return '#ffc107';
    if (score >= 20) return '#ff9800';
    return '#f44336';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!kpis) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No data available
      </Alert>
    );
  }

  const healthScoreData = Object.entries(kpis.healthScore.breakdown).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value
  }));

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Executive Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(kpis.period.startDate).toLocaleDateString()} - {new Date(kpis.period.endDate).toLocaleDateString()}
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} label="Period">
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>

          <IconButton onClick={fetchKPIs} color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Health Score Card */}
      <Card sx={{ mb: 3, borderLeft: `8px solid ${getHealthScoreColor(kpis.healthScore.totalScore)}` }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <Box textAlign="center">
                <Typography variant="h2" fontWeight="bold" color={getHealthScoreColor(kpis.healthScore.totalScore)}>
                  {kpis.healthScore.totalScore}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Overall Health Score
                </Typography>
                <Chip
                  label={kpis.healthScore.category.replace('_', ' ').toUpperCase()}
                  sx={{
                    bgcolor: getHealthScoreColor(kpis.healthScore.totalScore),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Score Breakdown
              </Typography>
              {Object.entries(kpis.healthScore.breakdown).map(([key, value]: [string, any]) => (
                <Box key={key} mb={1.5}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Typography>
                    <Typography variant="caption" fontWeight="medium">
                      {value}/100
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={value}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getHealthScoreColor(value)
                      }
                    }}
                  />
                </Box>
              ))}
            </Grid>

            <Grid item xs={12} md={4}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={healthScoreData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {healthScoreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(kpis.summary.totalRevenue)}
            change={kpis.comparison?.revenue.change}
            trend={kpis.comparison?.revenue.trend}
            icon={<AttachMoney />}
            color="#4caf50"
            category={kpis.revenueMetrics.category}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Customers"
            value={formatNumber(kpis.summary.totalCustomers)}
            change={kpis.comparison?.customers.change}
            trend={kpis.comparison?.customers.trend}
            icon={<People />}
            color="#2196f3"
            category={kpis.customerMetrics.category}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Avg. Satisfaction"
            value={kpis.summary.customerSatisfaction.toFixed(2)}
            change={kpis.comparison?.satisfaction.change}
            trend={kpis.comparison?.satisfaction.trend}
            icon={<Star />}
            color="#ff9800"
            category={kpis.customerMetrics.category}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Growth Rate"
            value={`${kpis.summary.growthRate.toFixed(1)}%`}
            trend={kpis.growthMetrics.trend}
            icon={<TrendingUpOutlined />}
            color="#9c27b0"
            category={kpis.growthMetrics.category}
          />
        </Grid>
      </Grid>

      {/* Detailed Metrics */}
      <Grid container spacing={3}>
        {/* Revenue Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Revenue Metrics
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Total Revenue</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(kpis.revenueMetrics.totalRevenue)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Booking Count</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(kpis.revenueMetrics.bookingCount)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Average Order Value</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(kpis.revenueMetrics.averageOrderValue)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Revenue Per Day</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(kpis.revenueMetrics.revenuePerDay)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Customer Metrics
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Total Customers</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(kpis.customerMetrics.totalCustomers)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">New Customers</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(kpis.customerMetrics.newCustomers)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Retention Rate</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {kpis.customerMetrics.retentionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={kpis.customerMetrics.retentionRate}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Average Satisfaction</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {kpis.customerMetrics.averageSatisfaction.toFixed(2)} / 5.0
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Operational Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Operational Metrics
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Conversion Rate</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {kpis.operationalMetrics.conversionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={kpis.operationalMetrics.conversionRate}
                    sx={{ height: 8, borderRadius: 4 }}
                    color="success"
                  />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Total Inquiries</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(kpis.operationalMetrics.totalInquiries)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Total Conversions</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(kpis.operationalMetrics.totalConversions)}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Avg. Response Time</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {kpis.operationalMetrics.averageResponseTime.toFixed(0)}s
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Growth Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Growth Metrics
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Revenue Growth</Typography>
                    <Typography variant="body2" fontWeight="medium" color={kpis.growthMetrics.revenueGrowthRate >= 0 ? 'success.main' : 'error.main'}>
                      {kpis.growthMetrics.revenueGrowthRate >= 0 ? '+' : ''}{kpis.growthMetrics.revenueGrowthRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.abs(kpis.growthMetrics.revenueGrowthRate), 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={kpis.growthMetrics.revenueGrowthRate >= 0 ? 'success' : 'error'}
                  />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Customer Growth</Typography>
                    <Typography variant="body2" fontWeight="medium" color={kpis.growthMetrics.customerGrowthRate >= 0 ? 'success.main' : 'error.main'}>
                      {kpis.growthMetrics.customerGrowthRate >= 0 ? '+' : ''}{kpis.growthMetrics.customerGrowthRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.abs(kpis.growthMetrics.customerGrowthRate), 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={kpis.growthMetrics.customerGrowthRate >= 0 ? 'success' : 'error'}
                  />
                </Box>

                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Overall Growth</Typography>
                    <Typography variant="body2" fontWeight="medium" color={kpis.growthMetrics.overallGrowthRate >= 0 ? 'success.main' : 'error.main'}>
                      {kpis.growthMetrics.overallGrowthRate >= 0 ? '+' : ''}{kpis.growthMetrics.overallGrowthRate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.abs(kpis.growthMetrics.overallGrowthRate), 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={kpis.growthMetrics.overallGrowthRate >= 0 ? 'success' : 'error'}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboardV2;
