/**
 * Executive Dashboard
 * High-level KPIs and strategic metrics for executives
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  ShoppingCart,
  Star,
  CalendarToday,
  Business,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';

const COLORS = {
  primary: '#1976d2',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
};

interface MetricCardProps {
  title: string;
  value: string;
  target: string;
  progress: number;
  icon: React.ReactNode;
  trend: 'up' | 'down';
  trendValue: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  target,
  progress,
  icon,
  trend,
  trendValue,
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: COLORS.primary, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="textSecondary">
              Target: {target}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: progress >= 100 ? COLORS.success : COLORS.warning,
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
          {trend === 'up' ? (
            <TrendingUp sx={{ color: COLORS.success, fontSize: 20 }} />
          ) : (
            <TrendingDown sx={{ color: COLORS.error, fontSize: 20 }} />
          )}
          <Typography
            variant="body2"
            sx={{ color: trend === 'up' ? COLORS.success : COLORS.error }}
          >
            {trendValue} vs last period
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const ExecutiveDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboard('executive');
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading executive dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
  const strategicMetrics = [
    {
      title: 'Monthly Revenue',
      value: '€2.4M',
      target: '€2.5M',
      progress: 96,
      icon: <AttachMoney />,
      trend: 'up' as const,
      trendValue: '+12.5%',
    },
    {
      title: 'Customer Acquisition',
      value: '1,245',
      target: '1,500',
      progress: 83,
      icon: <People />,
      trend: 'up' as const,
      trendValue: '+8.3%',
    },
    {
      title: 'Conversion Rate',
      value: '4.2%',
      target: '5.0%',
      progress: 84,
      icon: <ShoppingCart />,
      trend: 'down' as const,
      trendValue: '-1.2%',
    },
    {
      title: 'Customer Satisfaction',
      value: '4.6/5.0',
      target: '4.5/5.0',
      progress: 92,
      icon: <Star />,
      trend: 'up' as const,
      trendValue: '+0.3',
    },
  ];

  const monthlyTrends = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    revenue: Math.random() * 1000000 + 1500000,
    bookings: Math.random() * 500 + 800,
    customers: Math.random() * 300 + 400,
  }));

  const businessHealthData = [
    { subject: 'Revenue Growth', A: 85, fullMark: 100 },
    { subject: 'Customer Satisfaction', A: 92, fullMark: 100 },
    { subject: 'Market Share', A: 68, fullMark: 100 },
    { subject: 'Operational Efficiency', A: 78, fullMark: 100 },
    { subject: 'Innovation Index', A: 72, fullMark: 100 },
    { subject: 'Brand Strength', A: 88, fullMark: 100 },
  ];

  const topInitiatives = [
    {
      name: 'AI Agent Deployment',
      status: 'On Track',
      progress: 85,
      impact: 'High',
      owner: 'Tech Team',
    },
    {
      name: 'B2B Portal Launch',
      status: 'At Risk',
      progress: 62,
      impact: 'High',
      owner: 'Product Team',
    },
    {
      name: 'Mobile App Update',
      status: 'On Track',
      progress: 94,
      impact: 'Medium',
      owner: 'Mobile Team',
    },
    {
      name: 'Market Expansion',
      status: 'Completed',
      progress: 100,
      impact: 'High',
      owner: 'Strategy Team',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading executive dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Executive Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Strategic insights and high-level performance metrics
        </Typography>
      </Box>

      {/* Strategic Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {strategicMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <MetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Main Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Monthly Performance */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                12-Month Performance Overview
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyTrends}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Revenue (€)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="bookings"
                    stroke={COLORS.success}
                    fillOpacity={1}
                    fill="url(#colorBookings)"
                    name="Bookings"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Health Radar */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Business Health Index
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={businessHealthData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Strategic Initiatives */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Strategic Initiatives
              </Typography>
              <List>
                {topInitiatives.map((initiative, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: COLORS.primary }}>
                          <Business />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {initiative.name}
                            </Typography>
                            <Chip
                              label={initiative.status}
                              size="small"
                              color={
                                initiative.status === 'Completed'
                                  ? 'success'
                                  : initiative.status === 'At Risk'
                                  ? 'error'
                                  : 'primary'
                              }
                            />
                            <Chip
                              label={`${initiative.impact} Impact`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              Owner: {initiative.owner}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={initiative.progress}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="body2" fontWeight="medium">
                                {initiative.progress}%
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < topInitiatives.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;
