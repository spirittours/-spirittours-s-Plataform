/**
 * Dashboard Unificado - Vista Central del Sistema
 * Integra todas las métricas, IA, y funcionalidades en un solo lugar
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  People,
  AttachMoney,
  FlightTakeoff,
  SmartToy,
  Notifications,
  Settings,
  Refresh,
  Assessment,
  Security,
  Speed,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';

interface DashboardMetrics {
  revenue: {
    today: number;
    month: number;
    growth: number;
  };
  bookings: {
    total: number;
    active: number;
    pending: number;
  };
  customers: {
    total: number;
    new: number;
    active: number;
  };
  ai_agents: {
    active: number;
    tasks_completed: number;
    avg_response_time: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const UnifiedDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [realtimeData, setRealtimeData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    
    // Actualización en tiempo real cada 30 segundos
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dashboard/unified');
      setMetrics(response.data.metrics);
      setRealtimeData(response.data.realtime);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Componente de métrica rápida
  const MetricCard = ({ title, value, icon, color, trend }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mt: 1, mb: 1 }}>
              {value}
            </Typography>
            {trend && (
              <Chip
                label={`${trend > 0 ? '+' : ''}${trend}%`}
                size="small"
                color={trend > 0 ? 'success' : 'error'}
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  // Datos de ejemplo para gráficos
  const revenueChartData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Ingresos 2024',
        data: [65000, 75000, 82000, 95000, 110000, 125000],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const bookingsDistributionData = {
    labels: ['Vuelos', 'Hoteles', 'Paquetes', 'Tours', 'Otros'],
    datasets: [
      {
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
          '#6b7280',
        ],
      },
    ],
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard Unificado
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Vista completa del sistema Spirit Tours
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={loadDashboardData} sx={{ mr: 1 }}>
            <Refresh />
          </IconButton>
          <IconButton sx={{ mr: 1 }}>
            <Notifications />
          </IconButton>
          <IconButton>
            <Settings />
          </IconButton>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Main Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Ingresos del Mes"
            value={`$${metrics?.revenue.month.toLocaleString() || 0}`}
            icon={<AttachMoney />}
            color="#10b981"
            trend={metrics?.revenue.growth || 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Reservas Activas"
            value={metrics?.bookings.active || 0}
            icon={<FlightTakeoff />}
            color="#3b82f6"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Clientes Totales"
            value={metrics?.customers.total || 0}
            icon={<People />}
            color="#f59e0b"
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Agentes IA Activos"
            value={metrics?.ai_agents.active || 0}
            icon={<SmartToy />}
            color="#8b5cf6"
            trend={null}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Assessment />} label="Analytics" />
          <Tab icon={<SmartToy />} label="IA & Agentes" />
          <Tab icon={<Speed />} label="Performance" />
          <Tab icon={<Security />} label="Seguridad" />
          <Tab icon={<TrendingUp />} label="Insights" />
        </Tabs>

        {/* Tab 1: Analytics */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Evolución de Ingresos
                  </Typography>
                  <Line
                    data={revenueChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución de Reservas
                  </Typography>
                  <Doughnut
                    data={bookingsDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: IA & Agentes */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Estado de Agentes IA
                  </Typography>
                  <List>
                    {[
                      { name: 'CustomerProphetAgent', status: 'active', tasks: 245 },
                      { name: 'RevenueMaximizerAgent', status: 'active', tasks: 189 },
                      { name: 'BookingOptimizerAgent', status: 'active', tasks: 312 },
                      { name: 'SecurityGuardAgent', status: 'active', tasks: 567 },
                    ].map((agent, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: '#8b5cf6' }}>
                              <SmartToy />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={agent.name}
                            secondary={`${agent.tasks} tareas completadas`}
                          />
                          <Chip label="Activo" color="success" size="small" />
                        </ListItem>
                        {index < 3 && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rendimiento de IA
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Tiempo de Respuesta Promedio
                    </Typography>
                    <Box display="flex" alignItems="center" sx={{ mt: 1, mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={85}
                        sx={{ flex: 1, mr: 2 }}
                      />
                      <Typography variant="body2">0.8s</Typography>
                    </Box>

                    <Typography variant="body2" color="textSecondary">
                      Tasa de Éxito
                    </Typography>
                    <Box display="flex" alignItems="center" sx={{ mt: 1, mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={94}
                        sx={{ flex: 1, mr: 2 }}
                        color="success"
                      />
                      <Typography variant="body2">94%</Typography>
                    </Box>

                    <Typography variant="body2" color="textSecondary">
                      Uso de Recursos
                    </Typography>
                    <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={67}
                        sx={{ flex: 1, mr: 2 }}
                        color="warning"
                      />
                      <Typography variant="body2">67%</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 3: Performance */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Métricas de Rendimiento del Sistema
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    {[
                      { label: 'API Response Time', value: '45ms', status: 'excellent' },
                      { label: 'Database Query Time', value: '12ms', status: 'excellent' },
                      { label: 'Cache Hit Rate', value: '89%', status: 'good' },
                      { label: 'Uptime', value: '99.9%', status: 'excellent' },
                    ].map((metric, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            {metric.label}
                          </Typography>
                          <Typography variant="h5" sx={{ mt: 1 }}>
                            {metric.value}
                          </Typography>
                          <Chip
                            label={metric.status}
                            size="small"
                            color={metric.status === 'excellent' ? 'success' : 'primary'}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 4: Seguridad */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado de Seguridad
              </Typography>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#10b981' }}>
                      <Security />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Firewall Activo"
                    secondary="Todas las conexiones protegidas"
                  />
                  <Chip label="OK" color="success" />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#10b981' }}>
                      <Security />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Encriptación SSL/TLS"
                    secondary="Certificados válidos hasta 2025"
                  />
                  <Chip label="OK" color="success" />
                </ListItem>
                <Divider variant="inset" component="li" />
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#f59e0b' }}>
                      <Security />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Intentos de acceso bloqueados"
                    secondary="12 intentos en las últimas 24h"
                  />
                  <Chip label="Atención" color="warning" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 5: Insights */}
        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Insights y Recomendaciones IA
              </Typography>
              <List>
                {[
                  {
                    title: 'Oportunidad de Upsell',
                    description: 'El 35% de clientes premium están listos para upgrade',
                    action: 'Lanzar campaña',
                  },
                  {
                    title: 'Optimización de Inventario',
                    description: 'Reducir stock de tours de baja demanda en 20%',
                    action: 'Ver detalles',
                  },
                  {
                    title: 'Tendencia de Mercado',
                    description: 'Destinos de playa aumentaron 45% en búsquedas',
                    action: 'Ajustar precios',
                  },
                ].map((insight, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#3b82f6' }}>
                          <TrendingUp />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={insight.title}
                        secondary={insight.description}
                      />
                      <Button variant="outlined" size="small">
                        {insight.action}
                      </Button>
                    </ListItem>
                    {index < 2 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default UnifiedDashboard;
