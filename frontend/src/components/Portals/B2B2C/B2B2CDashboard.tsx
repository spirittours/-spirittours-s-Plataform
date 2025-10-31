/**
 * B2B2C Portal Dashboard
 * Partner-to-consumer portal with customer management and commissions
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
  Tab,
  Tabs,
} from '@mui/material';
import {
  People,
  Euro,
  ShoppingCart,
  TrendingUp,
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
import toast from 'react-hot-toast';

const B2B2CDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    // Mock data
    setDashboardData({
      total_customers: 1245,
      total_revenue: 89500,
      total_commissions: 13425,
      active_bookings: 156,
      monthly_data: Array.from({ length: 6 }, (_, i) => ({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
        customers: Math.random() * 500 + 200,
        revenue: Math.random() * 20000 + 10000,
      })),
      customers: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          bookings: 3,
          revenue: 2700,
          status: 'active',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          bookings: 5,
          revenue: 4500,
          status: 'active',
        },
      ],
    });
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
        B2B2C Partner Portal
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
        Manage your customers, bookings, and commission earnings
      </Typography>

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Total Customers',
            value: dashboardData?.total_customers,
            icon: <People />,
            color: '#1976d2',
          },
          {
            title: 'Total Revenue',
            value: `€${dashboardData?.total_revenue?.toLocaleString()}`,
            icon: <Euro />,
            color: '#4caf50',
          },
          {
            title: 'Commissions Earned',
            value: `€${dashboardData?.total_commissions?.toLocaleString()}`,
            icon: <TrendingUp />,
            color: '#ff9800',
          },
          {
            title: 'Active Bookings',
            value: dashboardData?.active_bookings,
            icon: <ShoppingCart />,
            color: '#f44336',
          },
        ].map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {kpi.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {kpi.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: kpi.color, fontSize: 40 }}>{kpi.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Customer Growth
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dashboardData?.monthly_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="customers" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Revenue Trend
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dashboardData?.monthly_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#4caf50" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Customer Management */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Customer Management
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Bookings</TableCell>
                  <TableCell align="right">Total Revenue</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardData?.customers?.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell align="center">{customer.bookings}</TableCell>
                    <TableCell align="right">€{customer.revenue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={customer.status}
                        size="small"
                        color={customer.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="outlined">
                        View
                      </Button>
                    </TableCell>
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

export default B2B2CDashboard;
