/**
 * Unified Analytics Dashboard - SPRINT 5
 * 
 * Single source of truth for all business metrics
 * Consolidates data from CRM, Sales, Projects, Automation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  Assignment,
  Speed,
  ShowChart,
  Refresh,
  Download,
  Info,
} from '@mui/icons-material';
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
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';

interface UnifiedDashboardProps {
  workspaceId: string;
}

interface DashboardMetrics {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalContacts: number;
    totalDeals: number;
    totalRevenue: number;
    activeProjects: number;
    winRate: number;
    conversionRate: number;
    engagementRate: number;
  };
  crm: any;
  sales: any;
  activity: any;
  projects: any;
  automation: any;
  growth: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ workspaceId }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [workspaceId, dateRange]);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        `/api/analytics/${workspaceId}/dashboard`,
        {
          params: { dateRange },
        }
      );

      setMetrics(response.data.data);
    } catch (err: any) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.response?.data?.error || 'Failed to load metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardMetrics();
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(
        `/api/analytics/${workspaceId}/export`,
        {
          params: { dateRange, format: 'csv' },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting analytics:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  if (loading && !refreshing) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  const { summary, crm, sales, activity, projects, automation, growth } = metrics;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            📊 Unified Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Single source of truth for all business metrics
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export CSV">
            <IconButton onClick={handleExport}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {refreshing && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Contacts
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(summary.totalContacts)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" ml={0.5}>
                      {crm.contactGrowth}% growth
                    </Typography>
                  </Box>
                </Box>
                <People sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(summary.totalRevenue)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {growth.revenueGrowthMoM.isPositive ? (
                      <TrendingUp fontSize="small" color="success" />
                    ) : (
                      <TrendingDown fontSize="small" color="error" />
                    )}
                    <Typography
                      variant="caption"
                      color={
                        growth.revenueGrowthMoM.isPositive
                          ? 'success.main'
                          : 'error.main'
                      }
                      ml={0.5}
                    >
                      {growth.revenueGrowthMoM.growthRate}% MoM
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney
                  sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Projects
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(summary.activeProjects)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      {projects.onTimeRate}% on-time rate
                    </Typography>
                  </Box>
                </Box>
                <Assignment
                  sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Win Rate
                  </Typography>
                  <Typography variant="h4">
                    {formatPercentage(summary.winRate)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Chip
                      label={`${formatNumber(sales.wonDeals)} won`}
                      size="small"
                      color="success"
                    />
                  </Box>
                </Box>
                <ShowChart
                  sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Health Score */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">
              Business Health Score
            </Typography>
            <Chip
              label={growth.overallHealthScore.status.toUpperCase()}
              color={
                growth.overallHealthScore.status === 'excellent'
                  ? 'success'
                  : growth.overallHealthScore.status === 'good'
                  ? 'primary'
                  : growth.overallHealthScore.status === 'fair'
                  ? 'warning'
                  : 'error'
              }
            />
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Speed sx={{ fontSize: 48, color: 'primary.main' }} />
            <Box flex={1}>
              <LinearProgress
                variant="determinate"
                value={growth.overallHealthScore.score}
                sx={{ height: 12, borderRadius: 6 }}
                color={
                  growth.overallHealthScore.score >= 70
                    ? 'success'
                    : growth.overallHealthScore.score >= 50
                    ? 'primary'
                    : growth.overallHealthScore.score >= 30
                    ? 'warning'
                    : 'error'
                }
              />
              <Typography variant="caption" color="text.secondary" mt={0.5}>
                Score: {growth.overallHealthScore.score}/100
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Contact Growth
              </Typography>
              <Box display="flex" alignItems="center">
                {growth.contactGrowthMoM.isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography variant="h6" ml={1}>
                  {growth.contactGrowthMoM.growthRate}%
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Deal Growth
              </Typography>
              <Box display="flex" alignItems="center">
                {growth.dealGrowthMoM.isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography variant="h6" ml={1}>
                  {growth.dealGrowthMoM.growthRate}%
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Revenue Growth
              </Typography>
              <Box display="flex" alignItems="center">
                {growth.revenueGrowthMoM.isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography variant="h6" ml={1}>
                  {growth.revenueGrowthMoM.growthRate}%
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Activity Growth
              </Typography>
              <Box display="flex" alignItems="center">
                {growth.activityGrowthMoM.isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography variant="h6" ml={1}>
                  {growth.activityGrowthMoM.growthRate}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={4}>
        {/* Revenue by Month */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sales.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="_id"
                    tickFormatter={(val) => `${val.month}/${val.year}`}
                  />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Deals by Stage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline by Stage
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sales.dealsByStage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} mb={4}>
        {/* Leads by Source */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leads by Source
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={crm.leadsBySource}
                    dataKey="count"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {crm.leadsBySource.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Automation Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Automation
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Active Workflows
                  </Typography>
                  <Typography variant="h4">
                    {automation.activeWorkflows}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    {automation.successRate}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Executions
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(automation.totalExecutions)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Time Saved
                  </Typography>
                  <Typography variant="h4">
                    {automation.timeSaved.hours}h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({automation.timeSaved.days} days)
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Metrics */}
      <Grid container spacing={3}>
        {/* CRM Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CRM Performance
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Lead Conversion Rate
                  </Typography>
                  <Typography variant="h5">
                    {crm.conversionRate}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Qualified Leads
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(crm.qualifiedLeads)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    New Contacts (Period)
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(crm.newContacts)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sales Performance
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Deal Size
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(sales.averageDealSize)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pipeline Value
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(sales.pipelineValue)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Sales Velocity
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(sales.salesVelocity)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity & Engagement
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Engagement Rate
                  </Typography>
                  <Typography variant="h5">
                    {activity.engagementRate}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Activities/Day
                  </Typography>
                  <Typography variant="h5">
                    {activity.averageActivitiesPerDay}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Activities
                  </Typography>
                  <Typography variant="h5">
                    {formatNumber(activity.totalActivities)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UnifiedDashboard;
