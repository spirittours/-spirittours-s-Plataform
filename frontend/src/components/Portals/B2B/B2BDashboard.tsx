/**
 * B2B Portal Dashboard
 * Partner dashboard with commissions, bookings, and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  Euro,
  ShoppingCart,
  People,
  Download,
  Visibility,
  Receipt,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import toast from 'react-hot-toast';
import { portalsService } from '../../../services/portalsService';

const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336'];

const B2BDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      setDashboardData({
        total_revenue: 125000,
        total_commissions: 18750,
        pending_commissions: 4500,
        total_bookings: 342,
        commission_rate: 15,
        monthly_trend: Array.from({ length: 6 }, (_, i) => ({
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
          revenue: Math.random() * 30000 + 15000,
          commissions: Math.random() * 4500 + 2000,
        })),
      });

      setCommissions([
        {
          id: '1',
          booking_ref: 'BK-2024-001',
          customer: 'Madrid Tours',
          amount: 450.0,
          commission: 67.5,
          status: 'paid',
          date: '2024-10-15',
        },
        {
          id: '2',
          booking_ref: 'BK-2024-002',
          customer: 'Barcelona Express',
          amount: 890.0,
          commission: 133.5,
          status: 'pending',
          date: '2024-10-20',
        },
        {
          id: '3',
          booking_ref: 'BK-2024-003',
          customer: 'Valencia Tours',
          amount: 670.0,
          commission: 100.5,
          status: 'approved',
          date: '2024-10-22',
        },
      ]);

      setRecentBookings([
        {
          id: '1',
          reference: 'BK-2024-004',
          customer: 'Corporate Travel Ltd',
          destination: 'Madrid',
          amount: 1200,
          status: 'confirmed',
          date: '2024-10-28',
        },
        {
          id: '2',
          reference: 'BK-2024-005',
          customer: 'Business Solutions Inc',
          destination: 'Barcelona',
          amount: 2500,
          status: 'pending',
          date: '2024-10-29',
        },
      ]);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const pendingCommissions = commissions.filter((c) => c.status === 'approved').map((c) => c.id);
    if (pendingCommissions.length === 0) {
      toast.error('No approved commissions to request payout');
      return;
    }
    try {
      await portalsService.requestCommissionPayout(pendingCommissions);
      toast.success('Payout request submitted successfully!');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to request payout');
    }
  };

  const handleExport = async () => {
    try {
      await portalsService.exportCommissionData(undefined, 'csv');
      toast.success('Commission data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            B2B Partner Portal
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your bookings, commissions, and business analytics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExport}>
            Export
          </Button>
          <Button variant="contained" startIcon={<Euro />} onClick={handleRequestPayout}>
            Request Payout
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    €{dashboardData?.total_revenue?.toLocaleString()}
                  </Typography>
                </Box>
                <Euro sx={{ fontSize: 40, color: '#1976d2' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Commissions
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    €{dashboardData?.total_commissions?.toLocaleString()}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Commissions
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    €{dashboardData?.pending_commissions?.toLocaleString()}
                  </Typography>
                </Box>
                <Receipt sx={{ fontSize: 40, color: '#ff9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Bookings
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {dashboardData?.total_bookings}
                  </Typography>
                </Box>
                <ShoppingCart sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Revenue & Commission Trends
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData?.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#1976d2" name="Revenue (€)" />
                  <Line
                    type="monotone"
                    dataKey="commissions"
                    stroke="#4caf50"
                    name="Commissions (€)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Commission Rate
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {dashboardData?.commission_rate}%
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Your current commission rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Commission History */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Commission History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Booking Ref</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>{commission.booking_ref}</TableCell>
                    <TableCell>{commission.customer}</TableCell>
                    <TableCell align="right">€{commission.amount.toFixed(2)}</TableCell>
                    <TableCell align="right">€{commission.commission.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={commission.status}
                        size="small"
                        color={
                          commission.status === 'paid'
                            ? 'success'
                            : commission.status === 'approved'
                            ? 'primary'
                            : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>{commission.date}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Recent Bookings
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.reference}</TableCell>
                    <TableCell>{booking.customer}</TableCell>
                    <TableCell>{booking.destination}</TableCell>
                    <TableCell align="right">€{booking.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={booking.status}
                        size="small"
                        color={booking.status === 'confirmed' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>{booking.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default B2BDashboard;
