/**
 * Communication Dashboard
 * 
 * Real-time monitoring dashboard for intelligent communication system
 * Features:
 * - Real-time metrics
 * - Queue status
 * - Agent performance
 * - Channel statistics
 * - AI performance
 * - Alerts and notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Message as MessageIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';

// Types
interface RealtimeMetrics {
  timestamp: string;
  active_conversations: number;
  queued_conversations: number;
  agents: {
    available: number;
    busy: number;
    away: number;
    offline: number;
    total: number;
  };
  messages_per_minute: number;
  avg_response_time: number;
  avg_wait_time: number;
}

interface RoutingStats {
  routing: {
    total_messages: number;
    ai_handled: number;
    human_handled: number;
    ai_percentage: number;
    human_percentage: number;
  };
  time_wasters: {
    detected: number;
    percentage: number;
    avg_score: number;
  };
  departments: Record<string, number>;
  customer_types: Record<string, number>;
}

interface AgentPerformance {
  agents: Array<{
    agent_id: string;
    name: string;
    status: string;
    current_load: number;
    max_concurrent: number;
    total_conversations: number;
    successful_closures: number;
    success_rate: number;
    average_response_time: number;
  }>;
  summary: {
    total_agents: number;
    avg_success_rate: number;
    avg_response_time: number;
    total_conversations: number;
  };
}

interface ChannelStats {
  channels: Record<string, {
    messages: number;
    active_conversations: number;
    avg_response_time: number;
    satisfaction_rate: number;
  }>;
  most_popular: string;
  fastest_response: string;
  highest_satisfaction: string;
}

interface Alert {
  severity: 'error' | 'warning' | 'info' | 'success';
  type: string;
  message: string;
  timestamp: string;
  department?: string;
}

const API_BASE = '/api/communication-dashboard';

const CommunicationDashboard: React.FC = () => {
  // State
  const [currentTab, setCurrentTab] = useState(0);
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [routingStats, setRoutingStats] = useState<RoutingStats | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/metrics/realtime`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError('Error fetching metrics');
      console.error(err);
    }
  }, []);

  const fetchRoutingStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/metrics/routing-stats?period=today`);
      if (!response.ok) throw new Error('Failed to fetch routing stats');
      const data = await response.json();
      setRoutingStats(data);
    } catch (err) {
      console.error('Error fetching routing stats:', err);
    }
  }, []);

  const fetchAgentPerformance = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/metrics/agent-performance?period=today`);
      if (!response.ok) throw new Error('Failed to fetch agent performance');
      const data = await response.json();
      setAgentPerformance(data);
    } catch (err) {
      console.error('Error fetching agent performance:', err);
    }
  }, []);

  const fetchChannelStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/metrics/channel-stats?period=today`);
      if (!response.ok) throw new Error('Failed to fetch channel stats');
      const data = await response.json();
      setChannelStats(data);
    } catch (err) {
      console.error('Error fetching channel stats:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts/active`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchRoutingStats(),
      fetchAgentPerformance(),
      fetchChannelStats(),
      fetchAlerts(),
    ]);
    setLoading(false);
  }, [fetchMetrics, fetchRoutingStats, fetchAgentPerformance, fetchChannelStats, fetchAlerts]);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${API_BASE}/ws/realtime`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    websocket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'metrics_update') {
        setMetrics((prev) => prev ? { ...prev, ...update.data } : null);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Render loading state
  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dashboard de Comunicación
        </Typography>
        <Box display="flex" gap={2}>
          <Badge badgeContent={alerts.length} color="error">
            <Tooltip title="Alertas activas">
              <IconButton>
                <WarningIcon />
              </IconButton>
            </Tooltip>
          </Badge>
          <Tooltip title="Refrescar">
            <IconButton onClick={fetchAllData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Box mb={3}>
          {alerts.map((alert, index) => (
            <Alert key={index} severity={alert.severity} sx={{ mb: 1 }}>
              <AlertTitle>{alert.type}</AlertTitle>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Metrics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Conversaciones Activas
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.active_conversations || 0}
                  </Typography>
                </Box>
                <MessageIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    En Cola
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.queued_conversations || 0}
                  </Typography>
                </Box>
                <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Agentes Disponibles
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.agents.available || 0} / {metrics?.agents.total || 0}
                  </Typography>
                </Box>
                <PeopleIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(metrics?.agents.available || 0) / (metrics?.agents.total || 1) * 100}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Tiempo Respuesta Promedio
                  </Typography>
                  <Typography variant="h4">
                    {Math.round(metrics?.avg_response_time || 0)}s
                  </Typography>
                </Box>
                <SpeedIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
          <Tab label="Estadísticas de Routing" />
          <Tab label="Performance de Agentes" />
          <Tab label="Estadísticas por Canal" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && routingStats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribución AI vs Humano
                </Typography>
                <Box mt={2}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>AI Manejados</Typography>
                    <Typography fontWeight="bold">
                      {routingStats.routing.ai_percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={routingStats.routing.ai_percentage}
                    color="primary"
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                  />
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Humanos Manejados</Typography>
                    <Typography fontWeight="bold">
                      {routingStats.routing.human_percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={routingStats.routing.human_percentage}
                    color="secondary"
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detección de Preguntones
                </Typography>
                <Box mt={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography>Detectados</Typography>
                    <Chip 
                      label={`${routingStats.time_wasters.detected} (${routingStats.time_wasters.percentage.toFixed(1)}%)`}
                      color="warning"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography>Score Promedio</Typography>
                    <Chip 
                      label={routingStats.time_wasters.avg_score.toFixed(1)}
                      color="error"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Distribución por Departamento
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Departamento</TableCell>
                        <TableCell align="right">Mensajes</TableCell>
                        <TableCell align="right">Porcentaje</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(routingStats.departments).map(([dept, count]) => (
                        <TableRow key={dept}>
                          <TableCell>{dept.replace(/_/g, ' ')}</TableCell>
                          <TableCell align="right">{count}</TableCell>
                          <TableCell align="right">
                            {((count / routingStats.routing.total_messages) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentTab === 1 && agentPerformance && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumen
                </Typography>
                <Box mt={2}>
                  <Box mb={2}>
                    <Typography color="textSecondary" variant="body2">Total Agentes</Typography>
                    <Typography variant="h5">{agentPerformance.summary.total_agents}</Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography color="textSecondary" variant="body2">Tasa Éxito Promedio</Typography>
                    <Typography variant="h5">{agentPerformance.summary.avg_success_rate.toFixed(1)}%</Typography>
                  </Box>
                  <Box>
                    <Typography color="textSecondary" variant="body2">Tiempo Respuesta Promedio</Typography>
                    <Typography variant="h5">{Math.round(agentPerformance.summary.avg_response_time)}s</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance por Agente
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Agente</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Conversaciones</TableCell>
                        <TableCell align="right">Tasa Éxito</TableCell>
                        <TableCell align="right">Tiempo Resp.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agentPerformance.agents.map((agent) => (
                        <TableRow key={agent.agent_id}>
                          <TableCell>{agent.name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={agent.status}
                              size="small"
                              color={
                                agent.status === 'available' ? 'success' :
                                agent.status === 'busy' ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            {agent.current_load} / {agent.max_concurrent}
                          </TableCell>
                          <TableCell align="right">{agent.success_rate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{Math.round(agent.average_response_time)}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentTab === 2 && channelStats && (
        <Grid container spacing={3}>
          {Object.entries(channelStats.channels).map(([channel, stats]) => (
            <Grid item xs={12} md={6} key={channel}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom textTransform="capitalize">
                    {channel}
                  </Typography>
                  <Grid container spacing={2} mt={1}>
                    <Grid item xs={6}>
                      <Typography color="textSecondary" variant="body2">Mensajes</Typography>
                      <Typography variant="h6">{stats.messages}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="textSecondary" variant="body2">Conversaciones Activas</Typography>
                      <Typography variant="h6">{stats.active_conversations}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="textSecondary" variant="body2">Tiempo Respuesta</Typography>
                      <Typography variant="h6">{stats.avg_response_time.toFixed(1)}s</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography color="textSecondary" variant="body2">Satisfacción</Typography>
                      <Typography variant="h6">{stats.satisfaction_rate.toFixed(1)} ⭐</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CommunicationDashboard;
