import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  Tab,
  Tabs,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  CalendarMonth,
  Notifications,
  Settings,
  MoreVert,
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Share,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Info,
  Assignment,
  LocalOffer,
  Star,
  ShoppingCart,
  AccountBalance,
  Timeline,
  Analytics,
  Speed,
  Refresh
} from '@mui/icons-material';
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
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface DashboardMetrics {
  totalRevenue: number;
  revenueChange: number;
  totalBookings: number;
  bookingsChange: number;
  activeUsers: number;
  usersChange: number;
  averageOrderValue: number;
  aovChange: number;
  conversionRate: number;
  crChange: number;
  customerSatisfaction: number;
  csChange: number;
}

interface RecentBooking {
  id: string;
  customerName: string;
  tourName: string;
  amount: number;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'refunded';
}

interface TopTour {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  time: string;
  read: boolean;
}

const MainDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [topTours, setTopTours] = useState<TopTour[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [bookingData, setBookingData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all dashboard data in parallel
      const [metricsRes, bookingsRes, toursRes, notificationsRes, analyticsRes] = await Promise.all([
        axios.get(`/api/dashboard/metrics?period=${selectedPeriod}`, { headers }),
        axios.get('/api/dashboard/recent-bookings', { headers }),
        axios.get('/api/dashboard/top-tours', { headers }),
        axios.get('/api/dashboard/notifications', { headers }),
        axios.get(`/api/dashboard/analytics?period=${selectedPeriod}`, { headers })
      ]);

      setMetrics(metricsRes.data);
      setRecentBookings(bookingsRes.data.bookings);
      setTopTours(toursRes.data.tours);
      setNotifications(notificationsRes.data.notifications);
      setRevenueData(analyticsRes.data.revenue);
      setBookingData(analyticsRes.data.bookings);
      setCategoryData(analyticsRes.data.categories);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
      case 'refunded':
        return 'error';
      default:
        return 'default';
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

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const CHART_COLORS = ['#1976d2', '#42a5f5', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc'];

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change: number;
    icon: React.ReactNode;
    color?: string;
  }> = ({ title, value, change, icon, color = '#1976d2' }) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {value}
            </Typography>
            <Box display="flex" alignItems="center">
              {change > 0 ? (
                <TrendingUp sx={{ color: 'success.main', fontSize: 20, mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ color: 'error.main', fontSize: 20, mr: 0.5 }} />
              )}
              <Typography
                variant="body2"
                color={change > 0 ? 'success.main' : 'error.main'}
              >
                {formatPercentage(change)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                vs last period
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const QuickActions = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Add />}
            onClick={() => navigate('/booking/new')}
          >
            New Booking
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<People />}
            onClick={() => navigate('/customers')}
          >
            Customers
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Assignment />}
            onClick={() => navigate('/tours')}
          >
            Tours
          </Button>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Analytics />}
            onClick={() => navigate('/analytics')}
          >
            Analytics
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dashboard Overview
        </Typography>
        <Box display="flex" gap={2}>
          <Chip
            label={selectedPeriod === '7d' ? 'Last 7 Days' : selectedPeriod === '30d' ? 'Last 30 Days' : 'Last Year'}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            onDelete={() => {}}
            deleteIcon={<MoreVert />}
          />
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <Refresh className={refreshing ? 'spinning' : ''} />
            </IconButton>
          </Tooltip>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => { setSelectedPeriod('7d'); setAnchorEl(null); }}>
            Last 7 Days
          </MenuItem>
          <MenuItem onClick={() => { setSelectedPeriod('30d'); setAnchorEl(null); }}>
            Last 30 Days
          </MenuItem>
          <MenuItem onClick={() => { setSelectedPeriod('1y'); setAnchorEl(null); }}>
            Last Year
          </MenuItem>
        </Menu>
      </Box>

      {/* Quick Actions */}
      <QuickActions />

      {/* Metrics Grid */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics?.totalRevenue || 0)}
              change={metrics?.revenueChange || 0}
              icon={<AttachMoney />}
              color="#4caf50"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <MetricCard
              title="Bookings"
              value={metrics?.totalBookings || 0}
              change={metrics?.bookingsChange || 0}
              icon={<ShoppingCart />}
              color="#2196f3"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <MetricCard
              title="Active Users"
              value={metrics?.activeUsers || 0}
              change={metrics?.usersChange || 0}
              icon={<People />}
              color="#ff9800"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <MetricCard
              title="Avg Order Value"
              value={formatCurrency(metrics?.averageOrderValue || 0)}
              change={metrics?.aovChange || 0}
              icon={<LocalOffer />}
              color="#9c27b0"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <MetricCard
              title="Conversion Rate"
              value={`${metrics?.conversionRate || 0}%`}
              change={metrics?.crChange || 0}
              icon={<Speed />}
              color="#00bcd4"
            />
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          {loading ? (
            <Skeleton variant="rectangular" height={140} />
          ) : (
            <MetricCard
              title="Satisfaction"
              value={`${metrics?.customerSatisfaction || 0}/5`}
              change={metrics?.csChange || 0}
              icon={<Star />}
              color="#ffc107"
            />
          )}
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Revenue Trend
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={320} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1976d2"
                    fill="#1976d2"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#4caf50"
                    fill="#4caf50"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Bookings by Category
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={320} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Tables Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Recent Bookings
              </Typography>
              <Button size="small" onClick={() => navigate('/bookings')}>
                View All
              </Button>
            </Box>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
              ))
            ) : (
              <List>
                {recentBookings.map((booking) => (
                  <ListItem key={booking.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                        {booking.customerName.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={booking.customerName}
                      secondary={
                        <Box>
                          <Typography variant="body2" component="span">
                            {booking.tourName}
                          </Typography>
                          <Box display="flex" gap={1} mt={0.5}>
                            <Chip
                              label={booking.status}
                              size="small"
                              color={getStatusColor(booking.status)}
                            />
                            <Chip
                              label={booking.paymentStatus}
                              size="small"
                              variant="outlined"
                              color={getStatusColor(booking.paymentStatus)}
                            />
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(booking.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(booking.date), 'MMM dd, yyyy')}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Top Performing Tours
              </Typography>
              <Button size="small" onClick={() => navigate('/tours')}>
                View All
              </Button>
            </Box>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
              ))
            ) : (
              <List>
                {topTours.map((tour, index) => (
                  <ListItem key={tour.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: CHART_COLORS[index] }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={tour.name}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {tour.bookings} bookings
                          </Typography>
                          <Rating value={tour.rating} readOnly size="small" />
                          {tour.trend === 'up' && (
                            <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                          )}
                          {tour.trend === 'down' && (
                            <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(tour.revenue)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Notifications Alert */}
      {notifications.filter(n => !n.read).length > 0 && (
        <Box position="fixed" bottom={20} right={20}>
          <Alert 
            severity="info" 
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => navigate('/notifications')}
              >
                View All
              </Button>
            }
          >
            You have {notifications.filter(n => !n.read).length} unread notifications
          </Alert>
        </Box>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Container>
  );
};

export default MainDashboard;