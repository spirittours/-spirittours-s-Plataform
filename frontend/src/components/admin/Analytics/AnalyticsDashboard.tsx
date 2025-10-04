/**
 * Analytics Dashboard Component
 * 
 * Comprehensive analytics dashboard with visualizations
 * 
 * Features:
 * - Real-time metrics cards
 * - Engagement trends (line charts)
 * - Platform comparison (bar charts)
 * - Sentiment distribution (pie chart)
 * - Follower growth tracking
 * - ROI calculator
 * - Export to CSV
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ThumbUp,
  Comment,
  Share,
  People,
  AttachMoney,
  Download,
  Refresh,
  Insights,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
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
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import * as analyticsApi from '../../../api/analyticsApi';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Metric card component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color = 'primary' }) => {
  const isPositive = change && change > 0;
  const changeColor = isPositive ? 'success.main' : 'error.main';

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                <Typography variant="body2" sx={{ color: changeColor }}>
                  {Math.abs(change).toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const AnalyticsDashboard: React.FC = () => {
  // Filter state
  const [platform, setPlatform] = useState('');
  const [days, setDays] = useState(30);

  // Fetch dashboard data
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['analytics-dashboard', platform, days],
    queryFn: () => analyticsApi.getDashboard({
      platform: platform || undefined,
      days,
    }),
  });

  // Fetch ROI data
  const { data: roiData } = useQuery({
    queryKey: ['analytics-roi', platform, days],
    queryFn: () => analyticsApi.getROI({
      platform: platform || undefined,
      days,
    }),
  });

  // Fetch platform comparison
  const { data: platformComparison } = useQuery({
    queryKey: ['platform-comparison', days],
    queryFn: () => analyticsApi.getPlatformComparison({ days }),
  });

  // Export handler
  const handleExport = async (type: string) => {
    try {
      const blob = await analyticsApi.exportAnalytics({
        export_type: type,
        platform: platform || undefined,
        format: 'csv',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${type}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Export failed');
    }
  };

  // Prepare sentiment pie chart data
  const sentimentData = dashboard ? [
    { name: 'Positive', value: dashboard.sentiment_score.positive_count },
    { name: 'Negative', value: dashboard.sentiment_score.negative_count },
    { name: 'Neutral', value: dashboard.sentiment_score.neutral_count },
  ] : [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              <Insights sx={{ mr: 1, verticalAlign: 'middle' }} />
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track performance, engagement, and ROI across all platforms
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              startIcon={<Download />}
              variant="outlined"
              onClick={() => handleExport('engagement')}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Platform</InputLabel>
                <Select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  label="Platform"
                >
                  <MenuItem value="">All Platforms</MenuItem>
                  <MenuItem value="facebook">Facebook</MenuItem>
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                  <MenuItem value="youtube">YouTube</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Period</InputLabel>
                <Select value={days} onChange={(e) => setDays(Number(e.target.value))} label="Time Period">
                  <MenuItem value={7}>Last 7 Days</MenuItem>
                  <MenuItem value={30}>Last 30 Days</MenuItem>
                  <MenuItem value={90}>Last 90 Days</MenuItem>
                  <MenuItem value={365}>Last Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : dashboard ? (
          <>
            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Posts"
                  value={dashboard.total_posts.total}
                  icon={<Insights sx={{ color: 'primary.main' }} />}
                  color="primary"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Likes"
                  value={dashboard.total_engagement.likes.toLocaleString()}
                  icon={<ThumbUp sx={{ color: 'info.main' }} />}
                  color="info"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Comments"
                  value={dashboard.total_engagement.comments.toLocaleString()}
                  icon={<Comment sx={{ color: 'success.main' }} />}
                  color="success"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Total Shares"
                  value={dashboard.total_engagement.shares.toLocaleString()}
                  icon={<Share sx={{ color: 'warning.main' }} />}
                  color="warning"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Engagement Rate"
                  value={`${dashboard.total_engagement.engagement_rate.toFixed(2)}%`}
                  icon={<TrendingUp sx={{ color: 'success.main' }} />}
                  color="success"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Follower Growth"
                  value={dashboard.follower_growth.total_growth.toLocaleString()}
                  change={15.5}
                  icon={<People sx={{ color: 'primary.main' }} />}
                  color="primary"
                />
              </Grid>

              {roiData && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                      title="ROI"
                      value={`${roiData.roi_percentage.toFixed(0)}%`}
                      change={roiData.roi_percentage > 0 ? 100 : -100}
                      icon={<AttachMoney sx={{ color: 'success.main' }} />}
                      color="success"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                      title="Total Value"
                      value={`$${roiData.estimated_value.toFixed(2)}`}
                      icon={<AttachMoney sx={{ color: 'warning.main' }} />}
                      color="warning"
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {/* Engagement Trend Chart */}
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Engagement Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.engagement_by_day}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="likes" stroke={COLORS[0]} strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" stroke={COLORS[1]} strokeWidth={2} />
                  <Line type="monotone" dataKey="shares" stroke={COLORS[2]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>

            <Grid container spacing={3}>
              {/* Platform Comparison Chart */}
              {platformComparison && (
                <Grid item xs={12} lg={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Platform Performance
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={platformComparison.platforms}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="platform" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="posts" fill={COLORS[0]} />
                        <Bar dataKey="likes" fill={COLORS[1]} />
                        <Bar dataKey="comments" fill={COLORS[2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              )}

              {/* Sentiment Distribution Chart */}
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Sentiment Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Top Performing Posts */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Top Performing Posts
                  </Typography>
                  <Grid container spacing={2}>
                    {dashboard.top_performing_posts.slice(0, 3).map((post: any, index: number) => (
                      <Grid item xs={12} md={4} key={post.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Chip label={post.platform} size="small" color="primary" />
                              <Chip
                                label={`${post.engagement_rate.toFixed(2)}%`}
                                size="small"
                                color="success"
                              />
                            </Box>
                            <Typography variant="body2" sx={{ mb: 2, height: 60, overflow: 'hidden' }}>
                              {post.content}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-around' }}>
                              <Box sx={{ textAlign: 'center' }}>
                                <ThumbUp fontSize="small" color="action" />
                                <Typography variant="caption" display="block">
                                  {post.likes}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'center' }}>
                                <Comment fontSize="small" color="action" />
                                <Typography variant="caption" display="block">
                                  {post.comments}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'center' }}>
                                <Share fontSize="small" color="action" />
                                <Typography variant="caption" display="block">
                                  {post.shares}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>

              {/* ROI Breakdown */}
              {roiData && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      ROI Analysis
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="success.main">
                            ${roiData.costs.total.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total AI Cost
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="primary.main">
                            ${roiData.estimated_value.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Engagement Value
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="success.main">
                            {roiData.roi_percentage.toFixed(0)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ROI Percentage
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="h4" color="info.main">
                            {days} days
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Analysis Period
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Calculation Method:</strong> Likes ($0.05 each) + Comments ($0.25 each) +
                        Shares ($0.50 each) - AI Content Cost ($0.01 per post)
                      </Typography>
                    </Alert>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        ) : (
          <Alert severity="info">No analytics data available for the selected filters</Alert>
        )}
      </Box>
    </Container>
  );
};

export default AnalyticsDashboard;
