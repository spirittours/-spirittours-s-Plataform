import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Paper,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Person as HumanIcon,
  Psychology as HybridIcon,
  AutoAwesome as AutoIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  PlayArrow as RunningIcon
} from '@mui/icons-material';

const MODES = {
  'ai-only': {
    name: 'Solo IA',
    icon: <AIIcon />,
    color: 'primary',
    description: 'Todas las tareas asignadas a IA automáticamente',
    aiPercentage: 100,
    humanPercentage: 0
  },
  'human-only': {
    name: 'Solo Humanos',
    icon: <HumanIcon />,
    color: 'secondary',
    description: 'Todas las tareas asignadas a agentes humanos',
    aiPercentage: 0,
    humanPercentage: 100
  },
  'hybrid': {
    name: 'Híbrido',
    icon: <HybridIcon />,
    color: 'success',
    description: 'Asignación inteligente entre IA y humanos',
    aiPercentage: 80,
    humanPercentage: 20
  },
  'smart-auto': {
    name: 'Smart Auto',
    icon: <AutoIcon />,
    color: 'info',
    description: 'Aprendizaje automático basado en resultados',
    aiPercentage: 'Variable',
    humanPercentage: 'Variable'
  }
};

export default function HybridAgentControl() {
  const [currentMode, setCurrentMode] = useState('hybrid');
  const [stats, setStats] = useState(null);
  const [humanAgents, setHumanAgents] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch agent stats
      const statsRes = await fetch('/api/email-config/agent/stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch human agents
      const agentsRes = await fetch('/api/email-config/agent/humans');
      const agentsData = await agentsRes.json();
      setHumanAgents(agentsData.agents || []);

      // Fetch recent tasks
      const tasksRes = await fetch('/api/email-config/agent/tasks/recent');
      const tasksData = await tasksRes.json();
      setRecentTasks(tasksData.tasks || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleModeChange = async (newMode) => {
    if (!newMode) return; // Toggle button requires at least one selected
    
    setLoading(true);
    try {
      const response = await fetch('/api/email-config/agent/mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      
      if (response.ok) {
        setCurrentMode(newMode);
        await fetchData();
      }
    } catch (error) {
      console.error('Error changing mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentStatusToggle = async (agentId, newStatus) => {
    try {
      await fetch(`/api/email-config/agent/humans/${agentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      await fetchData();
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'in-progress':
        return <RunningIcon color="primary" />;
      case 'pending':
        return <PendingIcon color="disabled" />;
      default:
        return <PendingIcon />;
    }
  };

  const aiSuccessRate = stats?.aiStats?.successRate || 0;
  const humanSuccessRate = stats?.humanStats?.successRate || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Control de Agentes Híbridos
      </Typography>

      {/* Mode Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Modo de Operación
          </Typography>

          <Box sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={currentMode}
              exclusive
              onChange={(e, value) => handleModeChange(value)}
              fullWidth
              disabled={loading}
            >
              {Object.entries(MODES).map(([key, mode]) => (
                <ToggleButton key={key} value={key}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Box sx={{ mb: 1 }}>{mode.icon}</Box>
                    <Typography variant="body2">{mode.name}</Typography>
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Alert severity="info" icon={MODES[currentMode].icon}>
            <Typography variant="body2">
              <strong>{MODES[currentMode].name}:</strong>{' '}
              {MODES[currentMode].description}
            </Typography>
          </Alert>

          {/* Distribution Display */}
          {(currentMode === 'hybrid' || currentMode === 'smart-auto') && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Distribución de Tareas
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
                    <AIIcon sx={{ fontSize: 40, color: 'primary.contrastText' }} />
                    <Typography variant="h4" sx={{ color: 'primary.contrastText' }}>
                      {stats?.distribution?.aiPercentage || 80}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
                      Tareas IA
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light' }}>
                    <HumanIcon sx={{ fontSize: 40, color: 'secondary.contrastText' }} />
                    <Typography variant="h4" sx={{ color: 'secondary.contrastText' }}>
                      {stats?.distribution?.humanPercentage || 20}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'secondary.contrastText' }}>
                      Tareas Humanas
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <AIIcon />
                </Avatar>
                <Typography variant="h6">Agentes IA</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tareas Completadas
                  </Typography>
                  <Typography variant="h5">
                    {stats?.aiStats?.tasksCompleted || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tasa de Éxito
                  </Typography>
                  <Typography variant="h5" color={aiSuccessRate > 90 ? 'success.main' : 'warning.main'}>
                    {aiSuccessRate.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={aiSuccessRate}
                    color={aiSuccessRate > 90 ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tiempo Promedio
                  </Typography>
                  <Typography variant="h6">
                    {stats?.aiStats?.avgTime?.toFixed(1) || 0}s
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Costo por Tarea
                  </Typography>
                  <Typography variant="h6">
                    ${stats?.aiStats?.costPerTask?.toFixed(3) || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <HumanIcon />
                </Avatar>
                <Typography variant="h6">Agentes Humanos</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tareas Completadas
                  </Typography>
                  <Typography variant="h5">
                    {stats?.humanStats?.tasksCompleted || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tasa de Éxito
                  </Typography>
                  <Typography variant="h5" color={humanSuccessRate > 95 ? 'success.main' : 'warning.main'}>
                    {humanSuccessRate.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={humanSuccessRate}
                    color={humanSuccessRate > 95 ? 'success' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Tiempo Promedio
                  </Typography>
                  <Typography variant="h6">
                    {stats?.humanStats?.avgTime?.toFixed(0) || 0}s
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Costo por Tarea
                  </Typography>
                  <Typography variant="h6">
                    ${stats?.humanStats?.costPerTask?.toFixed(2) || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Human Agents List */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Agentes Humanos Disponibles
          </Typography>

          <List>
            {humanAgents.map((agent, index) => (
              <React.Fragment key={agent.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: agent.available ? 'success.main' : 'grey.500' }}>
                      <HumanIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {agent.name}
                        <Chip
                          label={agent.available ? 'Disponible' : 'Ocupado'}
                          color={agent.available ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" component="div">
                          Tareas asignadas: {agent.assignedTasks}
                        </Typography>
                        <Typography variant="caption" component="div">
                          Capacidad: {agent.currentCapacity}/{agent.maxCapacity}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(agent.currentCapacity / agent.maxCapacity) * 100}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAgentStatusToggle(
                      agent.id,
                      agent.available ? 'unavailable' : 'available'
                    )}
                  >
                    {agent.available ? 'Desactivar' : 'Activar'}
                  </Button>
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          {humanAgents.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No hay agentes humanos configurados. 
              <Button size="small" sx={{ ml: 2 }}>
                Agregar Agente
              </Button>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tareas Recientes
          </Typography>

          <List>
            {recentTasks.slice(0, 10).map((task, index) => (
              <React.Fragment key={task.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemAvatar>
                    {getTaskStatusIcon(task.status)}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {task.type}
                        <Chip
                          icon={task.assignedTo === 'ai' ? <AIIcon /> : <HumanIcon />}
                          label={task.assignedTo === 'ai' ? 'IA' : 'Humano'}
                          size="small"
                          color={task.assignedTo === 'ai' ? 'primary' : 'secondary'}
                        />
                        <Chip
                          label={task.priority}
                          size="small"
                          color={
                            task.priority === 'critical' ? 'error' :
                            task.priority === 'high' ? 'warning' :
                            'default'
                          }
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" component="div">
                          {task.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(task.createdAt).toLocaleString()}
                          {task.completedAt && ` • Completado en ${task.duration}s`}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          {recentTasks.length === 0 && (
            <Alert severity="info">
              No hay tareas recientes para mostrar
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
