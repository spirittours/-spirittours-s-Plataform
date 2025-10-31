/**
 * Payments Dashboard
 * Transaction history, payment methods, and analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Grid,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Receipt,
  CreditCard,
  Delete,
  Star,
  StarBorder,
  Payment,
  TrendingUp,
  CheckCircle,
  Error,
  Add,
} from '@mui/icons-material';
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
import toast from 'react-hot-toast';
import { paymentsService } from '../../services/paymentsService';
import PaymentCheckout from './PaymentCheckout';

const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336'];

const PaymentsDashboard: React.FC = () => {
  const [tab Value, setTabValue] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Mock data
      setTransactions([
        {
          id: 'txn_001',
          amount: 450.0,
          currency: 'EUR',
          status: 'succeeded',
          payment_method: 'Visa •••• 4242',
          description: 'Madrid Tour Booking',
          created_at: '2024-10-28',
          receipt_url: '#',
        },
        {
          id: 'txn_002',
          amount: 890.0,
          currency: 'EUR',
          status: 'succeeded',
          payment_method: 'PayPal',
          description: 'Barcelona Package',
          created_at: '2024-10-25',
          receipt_url: '#',
        },
        {
          id: 'txn_003',
          amount: 1200.0,
          currency: 'EUR',
          status: 'pending',
          payment_method: 'Mastercard •••• 5555',
          description: 'Sevilla Experience',
          created_at: '2024-10-29',
          receipt_url: '#',
        },
      ]);

      setPaymentMethods([
        {
          id: 'pm_001',
          type: 'card',
          brand: 'Visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
          is_default: true,
        },
        {
          id: 'pm_002',
          type: 'card',
          brand: 'Mastercard',
          last4: '5555',
          exp_month: 8,
          exp_year: 2026,
          is_default: false,
        },
      ]);

      setStats({
        total_transactions: 24,
        total_amount: 12450,
        successful_payments: 22,
        pending_payments: 2,
        monthly_data: Array.from({ length: 6 }, (_, i) => ({
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
          amount: Math.random() * 3000 + 1000,
        })),
        payment_methods_breakdown: [
          { name: 'Credit Card', value: 65 },
          { name: 'PayPal', value: 25 },
          { name: 'Bank Transfer', value: 10 },
        ],
      });
    } catch (error) {
      toast.error('Failed to load payment data');
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await paymentsService.setDefaultPaymentMethod(methodId);
      toast.success('Default payment method updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update default method');
    }
  };

  const handleDeleteMethod = async (methodId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;
    try {
      await paymentsService.deletePaymentMethod(methodId);
      toast.success('Payment method deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete payment method');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Payments Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage transactions, payment methods, and view analytics
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setShowCheckout(true)}>
          New Payment
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Total Transactions',
            value: stats?.total_transactions,
            icon: <Receipt />,
            color: '#1976d2',
          },
          {
            title: 'Total Amount',
            value: `€${stats?.total_amount?.toLocaleString()}`,
            icon: <Payment />,
            color: '#4caf50',
          },
          {
            title: 'Successful',
            value: stats?.successful_payments,
            icon: <CheckCircle />,
            color: '#4caf50',
          },
          {
            title: 'Pending',
            value: stats?.pending_payments,
            icon: <Error />,
            color: '#ff9800',
          },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, fontSize: 40 }}>{stat.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Monthly Revenue
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.monthly_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="amount" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Payment Methods
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats?.payment_methods_breakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {stats?.payment_methods_breakdown?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Transactions" />
          <Tab label="Payment Methods" />
        </Tabs>

        <CardContent>
          {tabValue === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Payment Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{txn.id}</TableCell>
                      <TableCell>{txn.description}</TableCell>
                      <TableCell align="right">
                        {txn.currency} {txn.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{txn.payment_method}</TableCell>
                      <TableCell>
                        <Chip label={txn.status} size="small" color={getStatusColor(txn.status)} />
                      </TableCell>
                      <TableCell>{txn.created_at}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download Receipt">
                          <IconButton size="small">
                            <Receipt />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tabValue === 1 && (
            <Grid container spacing={2}>
              {paymentMethods.map((method) => (
                <Grid item xs={12} md={6} key={method.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CreditCard sx={{ fontSize: 40 }} />
                          <Box>
                            <Typography variant="h6">
                              {method.brand} •••• {method.last4}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Expires {method.exp_month}/{method.exp_year}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          <IconButton onClick={() => handleSetDefault(method.id)}>
                            {method.is_default ? <Star color="primary" /> : <StarBorder />}
                          </IconButton>
                          <IconButton onClick={() => handleDeleteMethod(method.id)} color="error">
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>
                      {method.is_default && <Chip label="Default" size="small" color="primary" />}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              <Grid item xs={12} md={6}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => toast.info('Add new payment method')}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body1">Add Payment Method</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onClose={() => setShowCheckout(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Payment</DialogTitle>
        <DialogContent>
          <PaymentCheckout
            amount={450}
            currency="EUR"
            description="Test Payment"
            onSuccess={() => {
              setShowCheckout(false);
              loadData();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PaymentsDashboard;
