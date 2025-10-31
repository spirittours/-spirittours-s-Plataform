/**
 * Real-Time Dashboard
 * Live monitoring with WebSocket updates and real-time metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Badge,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  FiberManualRecord,
  Warning,
  CheckCircle,
  Error,
  Info,
  Speed,
  TrendingUp,
  People,
  ShoppingCart,
  Refresh,
  Pause,
  PlayArrow,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';

const COLORS = {
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  neutral: '#9e9e9e',
};

interface LiveMetric {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: number;
}

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'booking' | 'payment' | 'user' | 'system';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

const RealtimeDashboard: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([
    { name: 'Active Users', value: 1247, unit: '', status: 'normal', trend: 5.2 },
    { name: 'Server Response', value: 125, unit: 'ms', status: 'normal', trend: -2.1 },
    { name: 'Orders/Minute', value: 34, unit: '', status: 'warning', trend: 12.3 },
    { name: 'Error Rate', value: 0.12, unit: '%', status: 'normal', trend: -0.05 },
  ]);

  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const maxDataPoints = 30;

  // Simulate real-time data updates
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      // Update metrics
      setLiveMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * 10,
          trend: (Math.random() - 0.5) * 5,
        }))
      );

      // Add new data point
      setRealtimeData((prev) => {
        const newData = [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            users: Math.random() * 1000 + 500,
            requests: Math.random() * 500 + 300,
            revenue: Math.random() * 5000 + 3000,
          },
        ];
        return newData.slice(-maxDataPoints);
      });

      // Randomly add activity log
      if (Math.random() > 0.7) {
        const activities = [
          {
            type: 'booking' as const,
            message: 'New booking: Madrid Tour - €450',
            severity: 'info' as const,
          },
          {
            type: 'payment' as const,
            message: 'Payment received: €1,200',
            severity: 'info' as const,
          },
          {
            type: 'user' as const,
            message: 'New user registration from Spain',
            severity: 'info' as const,
          },
          {
            type: 'system' as const,
            message: 'API response time increased',
            severity: 'warning' as const,
          },
        ];

        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        setActivityLog((prev) => [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            ...randomActivity,
          },
          ...prev.slice(0, 19),
        ]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await analyticsService.getRealtimeAlerts();
        setAlerts(data.alerts || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle sx={{ color: COLORS.success }} />;
      case 'warning':
        return <Warning sx={{ color: COLORS.warning }} />;
      case 'critical':
        return <Error sx={{ color: COLORS.error }} />;
      default:
        return <Info sx={{ color: COLORS.info }} />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <ShoppingCart sx={{ color: COLORS.info }} />;
      case 'payment':
        return <CheckCircle sx={{ color: COLORS.success }} />;
      case 'user':
        return <People sx={{ color: COLORS.info }} />;
      default:
        return <Info sx={{ color: COLORS.neutral }} />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Real-Time Dashboard
          </Typography>
          <Chip
            icon={<FiberManualRecord sx={{ fontSize: 12 }} />}
            label="LIVE"
            color="error"
            size="small"
            sx={{ animation: 'pulse 2s infinite' }}
          />
        </Box>
        <Tooltip title={isPaused ? 'Resume' : 'Pause'}>
          <IconButton onClick={() => setIsPaused(!isPaused)} color="primary">
            {isPaused ? <PlayArrow /> : <Pause />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Critical Alerts */}
      {alerts.filter((a) => a.severity === 'critical').length > 0 && (
        <Box sx={{ mb: 3 }}>
          {alerts
            .filter((a) => a.severity === 'critical')
            .map((alert, index) => (
              <Alert key={index} severity="error" sx={{ mb: 1 }}>
                <strong>{alert.category}:</strong> {alert.message}
              </Alert>
            ))}
        </Box>
      )}

      {/* Live Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {liveMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {metric.name}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {metric.value.toFixed(metric.unit === '%' ? 2 : 0)}
                      {metric.unit}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUp
                        sx={{
                          fontSize: 16,
                          color: metric.trend > 0 ? COLORS.success : COLORS.error,
                          transform: metric.trend < 0 ? 'scaleY(-1)' : 'none',
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: metric.trend > 0 ? COLORS.success : COLORS.error,
                        }}
                      >
                        {Math.abs(metric.trend).toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                  {getStatusIcon(metric.status)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Real-Time Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Active Users */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Active Users (Live)
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={realtimeData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke={COLORS.info}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* API Requests */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                API Requests/Second (Live)
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={realtimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activity Feed */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                Live Activity Feed
              </Typography>
              <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
                <List>
                  {activityLog.map((activity, index) => (
                    <ListItem key={activity.id} divider={index < activityLog.length - 1}>
                      <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                      <ListItemText
                        primary={activity.message}
                        secondary={activity.timestamp.toLocaleTimeString()}
                      />
                      <Chip
                        label={activity.severity}
                        size="small"
                        color={
                          activity.severity === 'error'
                            ? 'error'
                            : activity.severity === 'warning'
                            ? 'warning'
                            : 'default'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                System Health
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    45%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={45} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    62%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={62} color="warning" />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Disk I/O</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    32%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={32} color="success" />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Network</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    78%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={78} color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
};

export default RealtimeDashboard;
