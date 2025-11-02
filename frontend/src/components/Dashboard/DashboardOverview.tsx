import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { TrendingUp, TrendingDown, AttachMoney, People, EventAvailable, ShoppingCart } from '@mui/icons-material';
import apiClient from '../../services/apiClient';
import { DashboardStats } from '../../types/dashboard.types';

const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await apiClient.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (!stats) return <Typography>No data available</Typography>;

  const widgets = [
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, growth: stats.revenueGrowth, icon: <AttachMoney /> },
    { title: 'Total Bookings', value: stats.totalBookings, growth: stats.bookingsGrowth, icon: <ShoppingCart /> },
    { title: 'Active Customers', value: stats.activeCustomers, growth: stats.customersGrowth, icon: <People /> },
    { title: 'Avg Booking Value', value: `$${stats.averageBookingValue.toFixed(2)}`, growth: 0, icon: <EventAvailable /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant=\"h4\" gutterBottom>Dashboard Overview</Typography>
      <Grid container spacing={3}>
        {widgets.map((widget, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color=\"textSecondary\" gutterBottom>{widget.title}</Typography>
                    <Typography variant=\"h5\">{widget.value}</Typography>
                    {widget.growth !== 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {widget.growth > 0 ? <TrendingUp color=\"success\" /> : <TrendingDown color=\"error\" />}
                        <Typography variant=\"body2\" color={widget.growth > 0 ? 'success.main' : 'error.main'}>
                          {Math.abs(widget.growth)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ color: 'primary.main', fontSize: 40 }}>{widget.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default DashboardOverview;
