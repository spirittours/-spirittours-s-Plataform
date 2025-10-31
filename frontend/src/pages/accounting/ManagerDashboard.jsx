/**
 * Manager Dashboard - Accounting Overview
 * Provides comprehensive view of accounts, payments, alerts for branch managers
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  Warning,
  CheckCircle,
  AccessTime,
  Refresh,
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/accounting/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setDashboardData(data);
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

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Mock data for demonstration
  const mockData = {
    summary: {
      total_cxc: 1250000,
      total_cxc_pendiente: 450000,
      total_cxc_vencido: 75000,
      total_cxp: 890000,
      total_cxp_autorizado: 650000,
      total_pagos_hoy: 125000,
      total_reembolsos_pendientes: 45000,
    },
    alerts: [
      {
        id: 1,
        tipo: 'cuentas_vencidas',
        severidad: 'high',
        mensaje: '5 cuentas vencidas requieren atención inmediata',
        fecha: '2025-10-28T10:30:00Z',
      },
      {
        id: 2,
        tipo: 'autorizacion_pendiente',
        severidad: 'medium',
        mensaje: '3 CXP pendientes de autorización (Total: $85,000)',
        fecha: '2025-10-28T09:15:00Z',
      },
      {
        id: 3,
        tipo: 'conciliacion',
        severidad: 'low',
        mensaje: 'Conciliación bancaria de ayer con diferencia de $250',
        fecha: '2025-10-28T08:00:00Z',
      },
    ],
    cxc_by_status: [
      { name: 'Pendiente', value: 35, amount: 450000 },
      { name: 'Parcial', value: 28, amount: 350000 },
      { name: 'Cobrado', value: 180, amount: 2250000 },
      { name: 'Vencido', value: 12, amount: 75000 },
    ],
    cxp_by_status: [
      { name: 'Pendiente Revisión', value: 8, amount: 120000 },
      { name: 'Pendiente Autorización', value: 5, amount: 85000 },
      { name: 'Autorizado', value: 12, amount: 650000 },
      { name: 'Pagado', value: 45, amount: 560000 },
    ],
    revenue_trend: [
      { fecha: '2025-10-22', ingresos: 45000, egresos: 28000 },
      { fecha: '2025-10-23', ingresos: 52000, egresos: 31000 },
      { fecha: '2025-10-24', ingresos: 48000, egresos: 27000 },
      { fecha: '2025-10-25', ingresos: 61000, egresos: 35000 },
      { fecha: '2025-10-26', ingresos: 49000, egresos: 29000 },
      { fecha: '2025-10-27', ingresos: 58000, egresos: 33000 },
      { fecha: '2025-10-28', ingresos: 55000, egresos: 30000 },
    ],
  };

  const data = dashboardData || mockData;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard de Contabilidad
        </Typography>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Actualizar
        </Button>
      </Box>

      {/* Alerts Section */}
      {data.alerts && data.alerts.length > 0 && (
        <Box mb={3}>
          {data.alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.severidad === 'high' ? 'error' : alert.severidad === 'medium' ? 'warning' : 'info'}
              sx={{ mb: 1 }}
              action={
                <IconButton size="small" color="inherit">
                  <CheckCircle />
                </IconButton>
              }
            >
              {alert.mensaje}
            </Alert>
          ))}
        </Box>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total CXC
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ${data.summary.total_cxc.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Pendiente: ${data.summary.total_cxc_pendiente.toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total CXP
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ${data.summary.total_cxp.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Autorizado: ${data.summary.total_cxp_autorizado.toLocaleString()}
                  </Typography>
                </Box>
                <Receipt sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Pagos Hoy
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    ${data.summary.total_pagos_hoy.toLocaleString()}
                  </Typography>
                  <Chip
                    icon={<TrendingUp />}
                    label="+12.5%"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <TrendingUp sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    CXC Vencido
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    ${data.summary.total_cxc_vencido.toLocaleString()}
                  </Typography>
                  <Chip
                    icon={<Warning />}
                    label="Requiere atención"
                    color="error"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <AccessTime sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab label="Flujo de Efectivo" />
          <Tab label="Cuentas por Cobrar" />
          <Tab label="Cuentas por Pagar" />
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Tendencia de Ingresos y Egresos (Últimos 7 días)
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Line
                    type="monotone"
                    dataKey="egresos"
                    stroke="#FF8042"
                    strokeWidth={2}
                    name="Egresos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                CXC por Estado
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.cxc_by_status}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.cxc_by_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Montos por Estado
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.cxc_by_status}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#8884d8" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                CXP por Estado
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.cxp_by_status}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.cxp_by_status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Montos por Estado
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.cxp_by_status}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#FF8042" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default ManagerDashboard;
