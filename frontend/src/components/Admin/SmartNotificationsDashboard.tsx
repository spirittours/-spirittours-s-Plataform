/**
 * Smart Notifications Dashboard Component
 * 
 * Dashboard completo para administradores que muestra:
 * - Analytics de costos en tiempo real
 * - Distribución de canales (WhatsApp, Email, SMS)
 * - Tracking de presupuesto mensual
 * - Calculadora de ROI y ahorros
 * - Controles para habilitar/deshabilitar canales
 * - Configuración de presupuesto SMS
 * - Logs de notificaciones recientes
 * - Recomendaciones de optimización de costos
 * 
 * Integra con: backend/routes/smart_notifications.routes.js
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  AttachMoney as MoneyIcon,
  NotificationsActive as NotifIcon,
  BarChart as ChartIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Types
interface NotificationSettings {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  sms_monthly_budget: number;
  sms_current_spending: number;
  default_strategy: string;
}

interface ChannelStats {
  channel_used: string;
  total_notifications: number;
  total_cost: number;
  total_saved: number;
  successful: number;
  failed: number;
  success_rate: number;
}

interface AnalyticsSummary {
  total_notifications: number;
  total_cost_incurred: number;
  total_cost_saved: number;
  roi: number;
  whatsapp_percentage: number;
  email_percentage: number;
  sms_percentage: number;
}

interface NotificationLog {
  log_id: string;
  notification_type: string;
  channel_used: string;
  status: string;
  cost_incurred: number;
  cost_saved: number;
  created_at: string;
  recipient_email?: string;
  recipient_phone?: string;
}

interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  potential_savings?: number;
  action?: string;
}

const SmartNotificationsDashboard: React.FC = () => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // Dialogs
  const [settingsDialogOpen, setSettingsDialogOpen] = useState<boolean>(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState<boolean>(false);
  
  // Form states
  const [newSmsBudget, setNewSmsBudget] = useState<number>(100);
  const [newStrategy, setNewStrategy] = useState<string>('cost_optimized');
  
  // Date range
  const [dateRange, setDateRange] = useState<string>('30'); // Last 30 days
  const [currentTab, setCurrentTab] = useState<number>(0);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [dateRange]);

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadSettings(),
        loadAnalytics(),
        loadRecentLogs()
      ]);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Error al cargar datos');
      setLoading(false);
    }
  };

  // Load settings
  const loadSettings = async () => {
    const response = await axios.get(`${API_BASE_URL}/smart-notifications/settings`);
    setSettings(response.data.data);
  };

  // Load analytics
  const loadAnalytics = async () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    
    const response = await axios.get(`${API_BASE_URL}/smart-notifications/analytics`, {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }
    });
    
    setAnalytics(response.data.summary);
    setChannelStats(response.data.by_channel);
    setRecommendations(response.data.recommendations || []);
  };

  // Load recent logs
  const loadRecentLogs = async () => {
    const response = await axios.get(`${API_BASE_URL}/smart-notifications/logs`, {
      params: { limit: 10 }
    });
    setRecentLogs(response.data.data);
  };

  // Update settings
  const updateSettings = async (field: string, value: any) => {
    try {
      await axios.put(`${API_BASE_URL}/smart-notifications/settings`, {
        [field]: value
      });
      
      await loadSettings();
      alert('Configuración actualizada correctamente');
    } catch (err: any) {
      alert('Error al actualizar configuración: ' + (err.response?.data?.message || err.message));
    }
  };

  // Update SMS budget
  const updateSmsBudget = async () => {
    try {
      await axios.put(`${API_BASE_URL}/smart-notifications/settings/sms-budget`, {
        monthly_budget: newSmsBudget
      });
      
      await loadSettings();
      setBudgetDialogOpen(false);
      alert('Presupuesto SMS actualizado correctamente');
    } catch (err: any) {
      alert('Error al actualizar presupuesto: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reset SMS spending
  const resetSmsSpending = async () => {
    if (!confirm('¿Resetear el gasto de SMS del mes actual?')) return;
    
    try {
      await axios.post(`${API_BASE_URL}/smart-notifications/settings/reset-sms-spending`);
      await loadSettings();
      alert('Gasto de SMS reseteado correctamente');
    } catch (err: any) {
      alert('Error al resetear gasto: ' + (err.response?.data?.message || err.message));
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Colors for charts
  const COLORS = {
    whatsapp: '#25D366',
    email: '#EA4335',
    sms: '#FF9800'
  };

  // Prepare pie chart data
  const pieChartData = channelStats.map(stat => ({
    name: stat.channel_used.toUpperCase(),
    value: stat.total_notifications,
    cost: stat.total_cost
  }));

  // Prepare cost comparison data
  const costComparisonData = [
    {
      name: 'Costo Actual',
      value: analytics?.total_cost_incurred || 0
    },
    {
      name: 'Ahorro Logrado',
      value: analytics?.total_cost_saved || 0
    }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <NotifIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Smart Notifications Dashboard
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialogOpen(true)}
          >
            Configuración
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Date Range Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small">
          <InputLabel>Período</InputLabel>
          <Select
            value={dateRange}
            label="Período"
            onChange={(e) => setDateRange(e.target.value)}
          >
            <MenuItem value="7">Últimos 7 días</MenuItem>
            <MenuItem value="30">Últimos 30 días</MenuItem>
            <MenuItem value="90">Últimos 90 días</MenuItem>
            <MenuItem value="365">Último año</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="📊 Resumen" />
        <Tab label="💰 Costos" />
        <Tab label="📋 Logs" />
        <Tab label="💡 Recomendaciones" />
      </Tabs>

      {/* Tab 1: Summary */}
      {currentTab === 0 && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Total Notifications */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Notificaciones
                  </Typography>
                  <Typography variant="h4">
                    {analytics?.total_notifications.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Últimos {dateRange} días
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Cost Incurred */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Costo Total
                  </Typography>
                  <Typography variant="h4" color="error">
                    ${analytics?.total_cost_incurred.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Gastado en envíos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Cost Saved */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Ahorro Total
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    ${analytics?.total_cost_saved.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Ahorrado vs SMS
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* ROI */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    ROI
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {analytics?.roi ? `${(analytics.roi * 100).toFixed(0)}%` : '∞'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Retorno de inversión
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Channel Status Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* WhatsApp */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderLeft: `4px solid ${COLORS.whatsapp}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        <WhatsAppIcon sx={{ mr: 1, color: COLORS.whatsapp, verticalAlign: 'middle' }} />
                        WhatsApp
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.whatsapp_percentage.toFixed(0) || 0}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        de las notificaciones
                      </Typography>
                    </Box>
                    <Switch
                      checked={settings?.whatsapp_enabled || false}
                      onChange={(e) => updateSettings('whatsapp_enabled', e.target.checked)}
                      color="success"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderLeft: `4px solid ${COLORS.email}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        <EmailIcon sx={{ mr: 1, color: COLORS.email, verticalAlign: 'middle' }} />
                        Email
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.email_percentage.toFixed(0) || 0}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        de las notificaciones
                      </Typography>
                    </Box>
                    <Switch
                      checked={settings?.email_enabled || false}
                      onChange={(e) => updateSettings('email_enabled', e.target.checked)}
                      color="error"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* SMS */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderLeft: `4px solid ${COLORS.sms}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">
                        <SmsIcon sx={{ mr: 1, color: COLORS.sms, verticalAlign: 'middle' }} />
                        SMS
                      </Typography>
                      <Typography variant="h4">
                        {analytics?.sms_percentage.toFixed(0) || 0}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        de las notificaciones
                      </Typography>
                    </Box>
                    <Switch
                      checked={settings?.sms_enabled || false}
                      onChange={(e) => updateSettings('sms_enabled', e.target.checked)}
                      color="warning"
                    />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Gasto: ${settings?.sms_current_spending.toFixed(2) || '0.00'} / ${settings?.sms_monthly_budget.toFixed(2) || '0.00'}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={((settings?.sms_current_spending || 0) / (settings?.sms_monthly_budget || 1)) * 100}
                      sx={{ mt: 1 }}
                      color={
                        ((settings?.sms_current_spending || 0) / (settings?.sms_monthly_budget || 1)) > 0.8
                          ? 'error'
                          : 'primary'
                      }
                    />
                    <Button
                      size="small"
                      onClick={() => setBudgetDialogOpen(true)}
                      sx={{ mt: 1 }}
                    >
                      Ajustar Presupuesto
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Pie Chart - Distribution */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución por Canal
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Bar Chart - Cost Comparison */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparación de Costos
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8">
                        {costComparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#f44336' : '#4caf50'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Tab 2: Costs */}
      {currentTab === 1 && (
        <Grid container spacing={3}>
          {/* Channel Stats Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estadísticas Detalladas por Canal
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Canal</TableCell>
                        <TableCell align="right">Total Envíos</TableCell>
                        <TableCell align="right">Exitosos</TableCell>
                        <TableCell align="right">Fallidos</TableCell>
                        <TableCell align="right">Tasa Éxito</TableCell>
                        <TableCell align="right">Costo Total</TableCell>
                        <TableCell align="right">Ahorro Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {channelStats.map((stat) => (
                        <TableRow key={stat.channel_used}>
                          <TableCell>
                            <Chip
                              label={stat.channel_used.toUpperCase()}
                              color={
                                stat.channel_used === 'whatsapp'
                                  ? 'success'
                                  : stat.channel_used === 'email'
                                  ? 'error'
                                  : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">{stat.total_notifications}</TableCell>
                          <TableCell align="right">{stat.successful}</TableCell>
                          <TableCell align="right">{stat.failed}</TableCell>
                          <TableCell align="right">{stat.success_rate.toFixed(1)}%</TableCell>
                          <TableCell align="right">
                            <Typography color="error">
                              ${stat.total_cost.toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography color="success.main">
                              ${stat.total_saved.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* SMS Budget Control */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Control de Presupuesto SMS
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Presupuesto Mensual: ${settings?.sms_monthly_budget.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Gasto Actual: ${settings?.sms_current_spending.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Disponible: ${((settings?.sms_monthly_budget || 0) - (settings?.sms_current_spending || 0)).toFixed(2)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={((settings?.sms_current_spending || 0) / (settings?.sms_monthly_budget || 1)) * 100}
                  sx={{ mb: 2, height: 10, borderRadius: 5 }}
                  color={
                    ((settings?.sms_current_spending || 0) / (settings?.sms_monthly_budget || 1)) > 0.8
                      ? 'error'
                      : 'primary'
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setBudgetDialogOpen(true)}
                  >
                    Ajustar Presupuesto
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={resetSmsSpending}
                  >
                    Resetear Gasto
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Cost Projection */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Proyección de Ahorro Anual
                </Typography>
                <Box sx={{ my: 2 }}>
                  <Typography variant="body1">
                    <strong>Si todo fuera SMS:</strong>
                  </Typography>
                  <Typography variant="h5" color="error">
                    ${((analytics?.total_cost_incurred || 0) + (analytics?.total_cost_saved || 0)).toFixed(2)} / mes
                  </Typography>
                  <Typography variant="h6" color="error">
                    ${(((analytics?.total_cost_incurred || 0) + (analytics?.total_cost_saved || 0)) * 12).toFixed(2)} / año
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ my: 2 }}>
                  <Typography variant="body1">
                    <strong>Con sistema inteligente:</strong>
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    ${(analytics?.total_cost_incurred || 0).toFixed(2)} / mes
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    ${((analytics?.total_cost_incurred || 0) * 12).toFixed(2)} / año
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="body1">
                    <strong>Ahorro Anual:</strong>
                  </Typography>
                  <Typography variant="h4" color="primary">
                    ${((analytics?.total_cost_saved || 0) * 12).toFixed(2)}
                  </Typography>
                  <Chip
                    label={`${(((analytics?.total_cost_saved || 0) / ((analytics?.total_cost_incurred || 0) + (analytics?.total_cost_saved || 0))) * 100).toFixed(0)}% de reducción`}
                    color="success"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Logs */}
      {currentTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notificaciones Recientes
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Canal</TableCell>
                    <TableCell>Destinatario</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Costo</TableCell>
                    <TableCell align="right">Ahorro</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentLogs.map((log) => (
                    <TableRow key={log.log_id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.notification_type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            log.channel_used === 'whatsapp' ? <WhatsAppIcon /> :
                            log.channel_used === 'email' ? <EmailIcon /> :
                            <SmsIcon />
                          }
                          label={log.channel_used.toUpperCase()}
                          color={
                            log.channel_used === 'whatsapp' ? 'success' :
                            log.channel_used === 'email' ? 'error' :
                            'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {log.recipient_email || log.recipient_phone || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            log.status === 'sent' ? <SuccessIcon /> :
                            log.status === 'failed' ? <ErrorIcon /> :
                            <WarningIcon />
                          }
                          label={log.status}
                          color={
                            log.status === 'sent' ? 'success' :
                            log.status === 'failed' ? 'error' :
                            'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography color={log.cost_incurred > 0 ? 'error' : 'textSecondary'}>
                          ${log.cost_incurred.toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="success.main">
                          ${log.cost_saved.toFixed(4)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Recommendations */}
      {currentTab === 3 && (
        <Grid container spacing={3}>
          {recommendations.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="success">
                <AlertTitle>¡Excelente!</AlertTitle>
                No hay recomendaciones de optimización. El sistema está funcionando de manera óptima.
              </Alert>
            </Grid>
          ) : (
            recommendations.map((rec, index) => (
              <Grid item xs={12} key={index}>
                <Alert
                  severity={rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info'}
                  action={
                    rec.action && (
                      <Button color="inherit" size="small">
                        {rec.action}
                      </Button>
                    )
                  }
                >
                  <AlertTitle>
                    {rec.type === 'cost_optimization' ? '💰 Optimización de Costos' :
                     rec.type === 'channel_health' ? '🏥 Salud del Canal' :
                     rec.type === 'budget_alert' ? '⚠️ Alerta de Presupuesto' :
                     '💡 Recomendación'}
                  </AlertTitle>
                  {rec.message}
                  {rec.potential_savings && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Ahorro potencial:</strong> ${rec.potential_savings.toFixed(2)}
                    </Typography>
                  )}
                </Alert>
              </Grid>
            ))
          )}

          {/* General Recommendations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💡 Mejores Prácticas
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" paragraph>
                    • <strong>Habilita WhatsApp:</strong> Es el canal más económico (gratis) y tiene alta tasa de entrega.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>Usa Email como respaldo:</strong> Gratuito y confiable para información importante.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>Reserva SMS para emergencias:</strong> Solo cuando WhatsApp y Email fallen o no estén disponibles.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>Monitorea tu presupuesto SMS:</strong> Establece límites mensuales para evitar sobrecostos.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • <strong>Verifica disponibilidad de WhatsApp:</strong> El sistema lo hace automáticamente cada 24 horas.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuración de Notificaciones</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings?.whatsapp_enabled || false}
                  onChange={(e) => updateSettings('whatsapp_enabled', e.target.checked)}
                />
              }
              label="Habilitar WhatsApp"
            />
            <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
              Canal gratuito con alta tasa de entrega
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.email_enabled || false}
                  onChange={(e) => updateSettings('email_enabled', e.target.checked)}
                />
              }
              label="Habilitar Email"
            />
            <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
              Canal gratuito ideal para información detallada
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={settings?.sms_enabled || false}
                  onChange={(e) => updateSettings('sms_enabled', e.target.checked)}
                />
              }
              label="Habilitar SMS"
            />
            <Typography variant="caption" display="block" color="textSecondary" sx={{ ml: 4, mb: 2 }}>
              Canal de pago - usar solo como último recurso
            </Typography>

            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth>
              <InputLabel>Estrategia de Envío</InputLabel>
              <Select
                value={settings?.default_strategy || 'cost_optimized'}
                label="Estrategia de Envío"
                onChange={(e) => updateSettings('default_strategy', e.target.value)}
              >
                <MenuItem value="cost_optimized">Optimizado por Costo (Recomendado)</MenuItem>
                <MenuItem value="smart_cascade">Cascada Inteligente</MenuItem>
                <MenuItem value="priority_based">Basado en Prioridad</MenuItem>
                <MenuItem value="channel_preference">Preferencia de Usuario</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 1 }}>
              Define cómo se selecciona el canal de envío
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onClose={() => setBudgetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajustar Presupuesto SMS</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <TextField
              fullWidth
              label="Presupuesto Mensual ($)"
              type="number"
              value={newSmsBudget}
              onChange={(e) => setNewSmsBudget(parseFloat(e.target.value))}
              helperText="Establece el límite máximo de gasto mensual en SMS"
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>Información</AlertTitle>
              El sistema te alertará cuando alcances el 80% del presupuesto.
              Los envíos de SMS se bloquearán al alcanzar el 100%.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetDialogOpen(false)}>Cancelar</Button>
          <Button onClick={updateSmsBudget} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmartNotificationsDashboard;
