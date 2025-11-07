/**
 * DashboardWidgets Component
 * 
 * Real-time statistics widgets for CRM dashboard
 * Displays key metrics, charts, and recent activities
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  LinearProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  VideoCall as VideoIcon,
  Warning as WarningIcon,
  LocalFireDepartment as HotIcon,
} from '@mui/icons-material';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const DashboardWidgets = ({ workspaceId }) => {
  const [loading, setLoading] = useState(true);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (workspaceId) {
      fetchDashboardData();
      // Refresh every 30 seconds
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [workspaceId]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [metricsRes, statsRes] = await Promise.all([
        axios.get(`/api/crm/statistics/dashboard/${workspaceId}`, { headers }),
        axios.get(`/api/crm/statistics/workspace/${workspaceId}`, { headers }),
      ]);

      setDashboardMetrics(metricsRes.data.data);
      setStatistics(statsRes.data.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'email': return <EmailIcon />;
      case 'call': return <PhoneIcon />;
      case 'meeting': return <VideoIcon />;
      case 'whatsapp': return <WhatsAppIcon />;
      default: return <AssignmentIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!dashboardMetrics || !statistics) {
    return (
      <Box p={3}>
        <Typography>No data available</Typography>
      </Box>
    );
  }

  const dealStats = statistics.deals || {};
  const contactStats = statistics.contacts || {};
  const activityStats = statistics.activities || {};

  // Chart data
  const dealValueChartData = {
    labels: ['Total Value', 'Won Value', 'Lost Value', 'Expected Value'],
    datasets: [
      {
        label: 'Deal Values',
        data: [
          dealStats.totalValue || 0,
          dealStats.wonValue || 0,
          dealStats.lostValue || 0,
          dealStats.totalExpectedValue || 0,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
      },
    ],
  };

  const priorityChartData = {
    labels: ['Low', 'Medium', 'High', 'Urgent'],
    datasets: [
      {
        data: [
          dealStats.priorityDistribution?.low || 0,
          dealStats.priorityDistribution?.medium || 0,
          dealStats.priorityDistribution?.high || 0,
          dealStats.priorityDistribution?.urgent || 0,
        ],
        backgroundColor: [
          'rgba(201, 203, 207, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
      },
    ],
  };

  const leadQualityChartData = {
    labels: ['Hot', 'Warm', 'Cold'],
    datasets: [
      {
        data: [
          contactStats.qualityDistribution?.hot || 0,
          contactStats.qualityDistribution?.warm || 0,
          contactStats.qualityDistribution?.cold || 0,
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(54, 162, 235, 0.6)',
        ],
      },
    ],
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Deals
                  </Typography>
                  <Typography variant="h4">{dealStats.total || 0}</Typography>
                  <Typography variant="caption" color="primary">
                    {dealStats.activeDeals || 0} active
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <AssignmentIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pipeline Value
                  </Typography>
                  <Typography variant="h4">{formatCurrency(dealStats.totalValue)}</Typography>
                  <Typography variant="caption" color="success.main">
                    {formatCurrency(dealStats.wonValue)} won
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <MoneyIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Contacts
                  </Typography>
                  <Typography variant="h4">{contactStats.total || 0}</Typography>
                  <Typography variant="caption" color="warning.main">
                    {contactStats.leads || 0} leads
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <PeopleIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Win Rate
                  </Typography>
                  <Typography variant="h4">
                    {dealStats.winRate?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="caption" color="secondary">
                    {dealStats.wonDeals || 0} / {(dealStats.wonDeals || 0) + (dealStats.lostDeals || 0)} closed
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 56, height: 56 }}>
                  <TrendingUpIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deal Values
              </Typography>
              <Box height={250}>
                <Bar
                  data={dealValueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Deal Priority Distribution
              </Typography>
              <Box height={250} display="flex" justifyContent="center" alignItems="center">
                <Doughnut
                  data={priorityChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lead Quality Distribution
              </Typography>
              <Box height={250} display="flex" justifyContent="center" alignItems="center">
                <Doughnut
                  data={leadQualityChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Hot Leads and Rotten Deals Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <HotIcon color="error" />
                Hot Leads ({dashboardMetrics.hotLeads?.length || 0})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {dashboardMetrics.hotLeads?.slice(0, 5).map((lead) => (
                  <ListItem key={lead._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'error.main' }}>
                        {lead.first_name?.[0] || '?'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${lead.first_name || ''} ${lead.last_name || ''}`}
                      secondary={
                        <Box>
                          <Typography variant="caption">{lead.email}</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={lead.leadScore || 0}
                            sx={{ mt: 0.5 }}
                            color="error"
                          />
                        </Box>
                      }
                    />
                    <Chip
                      label={`${lead.leadScore || 0}%`}
                      size="small"
                      color="error"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <WarningIcon color="warning" />
                Rotten Deals ({dashboardMetrics.rottenDeals?.length || 0})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {dashboardMetrics.rottenDeals?.slice(0, 5).map((deal) => (
                  <ListItem key={deal._id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <WarningIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={deal.title}
                      secondary={
                        <Box>
                          <Typography variant="caption">
                            {formatCurrency(deal.value)}
                          </Typography>
                          <Typography variant="caption" display="block" color="warning.main">
                            No activity for {Math.floor((Date.now() - new Date(deal.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))} days
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activities */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activities
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {dashboardMetrics.recentActivities?.slice(0, 10).map((activity) => (
                  <ListItem key={activity._id}>
                    <ListItemAvatar>
                      <Avatar>{getActivityIcon(activity.type)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.type}
                      secondary={
                        <>
                          {activity.description || activity.metadata?.summary || 'No description'}
                          <Typography variant="caption" display="block">
                            {new Date(activity.createdAt).toLocaleString()}
                          </Typography>
                        </>
                      }
                    />
                    <Chip
                      label={activity.entityType}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardWidgets;
