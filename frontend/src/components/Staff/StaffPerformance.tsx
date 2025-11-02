import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Avatar,
  Rating,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Star,
  AttachMoney,
  EventAvailable,
} from '@mui/icons-material';
import {
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
} from 'recharts';
import { TourGuide, PerformanceMetrics } from '../../types/staff.types';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

const StaffPerformance: React.FC = () => {
  const [guides, setGuides] = useState<TourGuide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  useEffect(() => {
    fetchGuides();
  }, []);

  useEffect(() => {
    if (guides.length > 0) {
      preparePerformanceData();
    }
  }, [guides, selectedGuide]);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TourGuide[]>('/api/staff/guides');
      setGuides(response.data);
    } catch (err: any) {
      console.error('Error fetching guides:', err);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const preparePerformanceData = () => {
    if (selectedGuide === 'all') {
      const aggregated = guides.reduce((acc, guide) => {
        guide.performance.monthlyStats.forEach((stat) => {
          const key = `${stat.month}-${stat.year}`;
          if (!acc[key]) {
            acc[key] = { month: stat.month, tours: 0, revenue: 0, rating: 0, count: 0 };
          }
          acc[key].tours += stat.tours;
          acc[key].revenue += stat.revenue;
          acc[key].rating += stat.rating;
          acc[key].count += 1;
        });
        return acc;
      }, {} as Record<string, any>);

      const data = Object.values(aggregated).map((item: any) => ({
        ...item,
        rating: item.rating / item.count,
      }));
      setPerformanceData(data);
    } else {
      const guide = guides.find((g) => g.id === selectedGuide);
      if (guide) {
        setPerformanceData(guide.performance.monthlyStats);
      }
    }
  };

  const getAverageMetrics = (): PerformanceMetrics => {
    if (selectedGuide === 'all') {
      const total = guides.reduce(
        (acc, guide) => ({
          totalTours: acc.totalTours + guide.performance.totalTours,
          completedTours: acc.completedTours + guide.performance.completedTours,
          cancelledTours: acc.cancelledTours + guide.performance.cancelledTours,
          noShows: acc.noShows + guide.performance.noShows,
          averageRating: acc.averageRating + guide.performance.averageRating,
          totalReviews: acc.totalReviews + guide.performance.totalReviews,
          onTimePercentage: acc.onTimePercentage + guide.performance.onTimePercentage,
          customerSatisfaction: acc.customerSatisfaction + guide.performance.customerSatisfaction,
          revenueGenerated: acc.revenueGenerated + guide.performance.revenueGenerated,
          tips: acc.tips + guide.performance.tips,
          responseTime: acc.responseTime + guide.performance.responseTime,
          completionRate: acc.completionRate + guide.performance.completionRate,
          repeatCustomers: acc.repeatCustomers + guide.performance.repeatCustomers,
          monthlyStats: [],
          strengths: [],
          improvementAreas: [],
        }),
        {
          totalTours: 0,
          completedTours: 0,
          cancelledTours: 0,
          noShows: 0,
          averageRating: 0,
          totalReviews: 0,
          onTimePercentage: 0,
          customerSatisfaction: 0,
          revenueGenerated: 0,
          tips: 0,
          responseTime: 0,
          completionRate: 0,
          repeatCustomers: 0,
          monthlyStats: [],
          strengths: [],
          improvementAreas: [],
        }
      );

      return {
        ...total,
        averageRating: total.averageRating / guides.length,
        onTimePercentage: total.onTimePercentage / guides.length,
        customerSatisfaction: total.customerSatisfaction / guides.length,
        completionRate: total.completionRate / guides.length,
        responseTime: total.responseTime / guides.length,
      };
    } else {
      const guide = guides.find((g) => g.id === selectedGuide);
      return guide?.performance || ({} as PerformanceMetrics);
    }
  };

  const metrics = getAverageMetrics();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Staff Performance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and analyze team performance metrics
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Select Guide</InputLabel>
          <Select
            value={selectedGuide}
            onChange={(e) => setSelectedGuide(e.target.value)}
            label="Select Guide"
          >
            <MenuItem value="all">All Guides</MenuItem>
            {guides.map((guide) => (
              <MenuItem key={guide.id} value={guide.id}>
                {guide.firstName} {guide.lastName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <EventAvailable sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Tours
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {metrics.totalTours}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metrics.completedTours} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Star sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Average Rating
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {metrics.averageRating?.toFixed(1) || 0}
              </Typography>
              <Rating value={metrics.averageRating || 0} readOnly size="small" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Revenue Generated
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${metrics.revenueGenerated?.toLocaleString() || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tips: ${metrics.tips?.toLocaleString() || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Completion Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {metrics.completionRate?.toFixed(0) || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.completionRate || 0}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Tours Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tours" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Additional Metrics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={2}>
                On-Time Performance
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={metrics.onTimePercentage || 0}
                  sx={{ flex: 1, height: 8, borderRadius: 1 }}
                  color="success"
                />
                <Typography variant="body2" fontWeight="bold">
                  {metrics.onTimePercentage?.toFixed(0) || 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={2}>
                Customer Satisfaction
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <LinearProgress
                  variant="determinate"
                  value={metrics.customerSatisfaction || 0}
                  sx={{ flex: 1, height: 8, borderRadius: 1 }}
                  color="primary"
                />
                <Typography variant="body2" fontWeight="bold">
                  {metrics.customerSatisfaction?.toFixed(0) || 0}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={2}>
                Repeat Customers
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {metrics.repeatCustomers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffPerformance;
