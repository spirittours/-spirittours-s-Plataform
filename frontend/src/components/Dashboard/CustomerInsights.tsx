import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, People, Star } from '@mui/icons-material';
import { CustomerMetrics } from '../../types/dashboard.types';
import apiClient from '../../services/apiClient';

interface CustomerSegment {
  tier: string;
  count: number;
  percentage: number;
  color: string;
}

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  bookingsCount: number;
  tier: string;
}

interface RetentionData {
  month: string;
  rate: number;
}

const TIER_COLORS = {
  VIP: '#FFD700',
  GOLD: '#FFA500',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
  REGULAR: '#808080',
};

const CustomerInsights: React.FC = () => {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [lifetimeValueData, setLifetimeValueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchCustomerInsights();
  }, [period]);

  const fetchCustomerInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, segmentsRes, topCustomersRes, retentionRes, ltvRes] = await Promise.all([
        apiClient.get<CustomerMetrics>(`/api/analytics/customers/metrics?period=${period}`),
        apiClient.get<CustomerSegment[]>(`/api/analytics/customers/segments?period=${period}`),
        apiClient.get<TopCustomer[]>(`/api/analytics/customers/top?limit=10&period=${period}`),
        apiClient.get<RetentionData[]>(`/api/analytics/customers/retention?period=${period}`),
        apiClient.get<any[]>(`/api/analytics/customers/lifetime-value?period=${period}`),
      ]);

      setMetrics(metricsRes.data);
      setSegments(segmentsRes.data);
      setTopCustomers(topCustomersRes.data);
      setRetentionData(retentionRes.data);
      setLifetimeValueData(ltvRes.data);
    } catch (err: any) {
      console.error('Error fetching customer insights:', err);
      setError(err.response?.data?.message || 'Failed to load customer insights');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value);
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
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) return null;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Customer Insights
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select value={period} onChange={handlePeriodChange} label="Period">
            <MenuItem value="day">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <People sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total Customers
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {metrics.totalCustomers}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {metrics.newCustomersGrowth >= 0 ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={metrics.newCustomersGrowth >= 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(metrics.newCustomersGrowth).toFixed(1)}% vs last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                New Customers
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {metrics.newCustomers}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {period === 'day' && 'Today'}
                {period === 'week' && 'This week'}
                {period === 'month' && 'This month'}
                {period === 'year' && 'This year'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Retention Rate
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {metrics.retentionRate.toFixed(1)}%
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {metrics.retentionRateChange >= 0 ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={metrics.retentionRateChange >= 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(metrics.retentionRateChange).toFixed(1)}% vs last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Avg Lifetime Value
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                ${metrics.averageLifetimeValue.toFixed(2)}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {metrics.lifetimeValueGrowth >= 0 ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography
                  variant="body2"
                  color={metrics.lifetimeValueGrowth >= 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(metrics.lifetimeValueGrowth).toFixed(1)}% vs last period
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={3}>
        {/* Customer Segmentation Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Customer Segmentation
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="count"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.tier}: ${entry.percentage.toFixed(1)}%`}
                >
                  {segments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Retention Rate Trend */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Retention Rate Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Retention Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Lifetime Value Distribution */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Customer Lifetime Value Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lifetimeValueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" name="Number of Customers" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Customers Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Top 10 Customers
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="right">Total Spent</TableCell>
                <TableCell align="right">Bookings</TableCell>
                <TableCell align="center">Tier</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topCustomers.map((customer, index) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {index < 3 && (
                        <Star
                          sx={{
                            mr: 1,
                            color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                          }}
                        />
                      )}
                      <Typography variant="body2" fontWeight={index < 3 ? 'bold' : 'normal'}>
                        {customer.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      ${customer.totalSpent.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{customer.bookingsCount}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={customer.tier}
                      size="small"
                      sx={{
                        bgcolor: TIER_COLORS[customer.tier as keyof typeof TIER_COLORS] || '#808080',
                        color: '#fff',
                        fontWeight: 'bold',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default CustomerInsights;
