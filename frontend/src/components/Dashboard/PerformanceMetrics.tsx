import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  ShoppingCart,
  People,
  Tour as TourIcon,
  Payment,
  Star,
  Speed,
  CheckCircle,
} from '@mui/icons-material';
import { KPI } from '../../types/dashboard.types';
import apiClient from '../../services/apiClient';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

interface KPIsByCategory {
  revenue: KPI[];
  operations: KPI[];
  customers: KPI[];
  marketing: KPI[];
}

const getKPIIcon = (name: string) => {
  const iconMap: { [key: string]: React.ReactElement } = {
    'Total Revenue': <AttachMoney />,
    'Revenue Growth': <TrendingUp />,
    'Average Order Value': <AttachMoney />,
    'Total Bookings': <ShoppingCart />,
    'Booking Conversion Rate': <CheckCircle />,
    'Cancellation Rate': <TrendingDown />,
    'Total Customers': <People />,
    'Customer Retention Rate': <Star />,
    'Customer Satisfaction': <Star />,
    'Active Tours': <TourIcon />,
    'Payment Success Rate': <Payment />,
    'Average Response Time': <Speed />,
  };
  return iconMap[name] || <Speed />;
};

const getStatusColor = (status: 'good' | 'warning' | 'critical'): 'success' | 'warning' | 'error' => {
  return status === 'good' ? 'success' : status === 'warning' ? 'warning' : 'error';
};

const PerformanceMetrics: React.FC = () => {
  const [kpis, setKpis] = useState<KPIsByCategory>({
    revenue: [],
    operations: [],
    customers: [],
    marketing: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchPerformanceMetrics();
  }, [period]);

  const fetchPerformanceMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<KPIsByCategory>(
        `/api/analytics/performance/kpis?period=${period}`
      );

      setKpis(response.data);
    } catch (err: any) {
      console.error('Error fetching performance metrics:', err);
      setError(err.response?.data?.message || 'Failed to load performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setPeriod(event.target.value);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderKPICard = (kpi: KPI) => {
    const progressPercentage = kpi.target ? (kpi.current / kpi.target) * 100 : 0;
    const trendColor = kpi.trend >= 0 ? 'success.main' : 'error.main';
    const TrendIcon = kpi.trend >= 0 ? TrendingUp : TrendingDown;

    return (
      <Grid item xs={12} sm={6} md={4} key={kpi.name}>
        <Card>
          <CardContent>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="center">
                <Box
                  sx={{
                    mr: 1,
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {getKPIIcon(kpi.name)}
                </Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {kpi.name}
                </Typography>
              </Box>
              <Chip
                label={kpi.status}
                size="small"
                color={getStatusColor(kpi.status)}
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>

            {/* Current Value */}
            <Typography variant="h4" fontWeight="bold" mb={1}>
              {kpi.unit === 'currency' && '$'}
              {typeof kpi.current === 'number' ? kpi.current.toLocaleString() : kpi.current}
              {kpi.unit === 'percentage' && '%'}
            </Typography>

            {/* Trend */}
            <Box display="flex" alignItems="center" mb={2}>
              <TrendIcon fontSize="small" sx={{ color: trendColor, mr: 0.5 }} />
              <Typography variant="body2" sx={{ color: trendColor }}>
                {Math.abs(kpi.trend).toFixed(1)}% vs last period
              </Typography>
            </Box>

            {/* Target Progress */}
            {kpi.target && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" color="text.secondary">
                    Target Progress
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">
                    {kpi.unit === 'currency' && '$'}
                    {typeof kpi.target === 'number' ? kpi.target.toLocaleString() : kpi.target}
                    {kpi.unit === 'percentage' && '%'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(progressPercentage, 100)}
                  color={progressPercentage >= 100 ? 'success' : progressPercentage >= 75 ? 'primary' : 'warning'}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {progressPercentage.toFixed(1)}% achieved
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
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

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Performance Metrics
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select value={period} onChange={handlePeriodChange} label="Period">
            <MenuItem value="day">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Category Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Revenue" icon={<AttachMoney />} iconPosition="start" />
          <Tab label="Operations" icon={<Speed />} iconPosition="start" />
          <Tab label="Customers" icon={<People />} iconPosition="start" />
          <Tab label="Marketing" icon={<Star />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Revenue KPIs */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {kpis.revenue.map((kpi) => renderKPICard(kpi))}
        </Grid>
      </TabPanel>

      {/* Operations KPIs */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {kpis.operations.map((kpi) => renderKPICard(kpi))}
        </Grid>
      </TabPanel>

      {/* Customer KPIs */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {kpis.customers.map((kpi) => renderKPICard(kpi))}
        </Grid>
      </TabPanel>

      {/* Marketing KPIs */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {kpis.marketing.map((kpi) => renderKPICard(kpi))}
        </Grid>
      </TabPanel>

      {/* Summary Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Performance Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h3" color="success.main" fontWeight="bold">
                {kpis.revenue.filter((k) => k.status === 'good').length +
                  kpis.operations.filter((k) => k.status === 'good').length +
                  kpis.customers.filter((k) => k.status === 'good').length +
                  kpis.marketing.filter((k) => k.status === 'good').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Good Performance
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h3" color="warning.main" fontWeight="bold">
                {kpis.revenue.filter((k) => k.status === 'warning').length +
                  kpis.operations.filter((k) => k.status === 'warning').length +
                  kpis.customers.filter((k) => k.status === 'warning').length +
                  kpis.marketing.filter((k) => k.status === 'warning').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Needs Attention
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h3" color="error.main" fontWeight="bold">
                {kpis.revenue.filter((k) => k.status === 'critical').length +
                  kpis.operations.filter((k) => k.status === 'critical').length +
                  kpis.customers.filter((k) => k.status === 'critical').length +
                  kpis.marketing.filter((k) => k.status === 'critical').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Critical Issues
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box textAlign="center">
              <Typography variant="h3" color="primary.main" fontWeight="bold">
                {kpis.revenue.length +
                  kpis.operations.length +
                  kpis.customers.length +
                  kpis.marketing.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Metrics
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default PerformanceMetrics;
