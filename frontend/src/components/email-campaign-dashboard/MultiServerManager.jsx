import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  LinearProgress,
  Tooltip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  PlayArrow as TestIcon
} from '@mui/icons-material';

export default function MultiServerManager() {
  const [servers, setServers] = useState([]);
  const [presets, setPresets] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    dailyLimit: 500,
    ipAddress: ''
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch current servers
      const serversRes = await fetch('/api/email-config/smtp/servers');
      const serversData = await serversRes.json();
      setServers(serversData.servers || []);

      // Fetch available presets
      const presetsRes = await fetch('/api/email-config/multi-server/presets');
      const presetsData = await presetsRes.json();
      setPresets(Object.entries(presetsData.presets || {}).map(([id, preset]) => ({
        id,
        ...preset
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddServer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-config/smtp/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({
          name: '',
          host: '',
          port: 587,
          secure: false,
          user: '',
          password: '',
          dailyLimit: 500,
          ipAddress: ''
        });
        await fetchData();
      }
    } catch (error) {
      console.error('Error adding server:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!window.confirm('¿Estás seguro de eliminar este servidor?')) return;

    try {
      await fetch(`/api/email-config/smtp/server/${serverId}`, {
        method: 'DELETE'
      });
      await fetchData();
    } catch (error) {
      console.error('Error deleting server:', error);
    }
  };

  const handleTestServer = async (serverId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email-config/smtp/server/${serverId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      setTestResult(result);
      setTestDialogOpen(true);
    } catch (error) {
      console.error('Error testing server:', error);
      setTestResult({ success: false, error: error.message });
      setTestDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPreset = async (presetId) => {
    if (!window.confirm(`¿Cargar preset "${presetId}"? Esto reemplazará la configuración actual.`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/email-config/multi-server/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId })
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error loading preset:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'unhealthy':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="disabled" />;
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Gestión Multi-Servidor
        </Typography>
        <Box>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Agregar Servidor
          </Button>
        </Box>
      </Box>

      {/* Current Servers */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Servidores SMTP Configurados ({servers.length})
          </Typography>

          {servers.length === 0 ? (
            <Alert severity="info">
              No hay servidores configurados. Agrega tu primer servidor SMTP o carga un preset.
            </Alert>
          ) : (
            <List>
              {servers.map((server, index) => (
                <React.Fragment key={server.id || index}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Box>
                        <Tooltip title="Probar servidor">
                          <IconButton
                            onClick={() => handleTestServer(server.id)}
                            disabled={loading}
                          >
                            <TestIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            onClick={() => handleDeleteServer(server.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getHealthIcon(server.health)}
                          <Typography variant="subtitle1">
                            {server.name}
                          </Typography>
                          <Chip
                            label={server.health || 'unknown'}
                            size="small"
                            color={getHealthColor(server.health)}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="div">
                            {server.host}:{server.port} • IP: {server.ipAddress || 'Auto-detect'}
                          </Typography>
                          <Typography variant="body2" component="div" color="textSecondary">
                            Usado hoy: {server.usedToday || 0} / {server.dailyLimit}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={((server.usedToday || 0) / server.dailyLimit) * 100}
                            color={server.usedToday > server.dailyLimit * 0.8 ? 'warning' : 'primary'}
                            sx={{ mt: 1, width: '300px' }}
                          />
                          {server.warmup?.enabled && (
                            <Chip
                              label={`Warmup: Día ${server.warmup.currentDay}/6`}
                              size="small"
                              color="info"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Available Presets */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Presets Disponibles
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Carga configuraciones predefinidas según tus necesidades
          </Typography>

          <Grid container spacing={2}>
            {presets.map((preset) => (
              <Grid item xs={12} md={6} lg={4} key={preset.id}>
                <Paper
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: 6,
                      cursor: 'pointer'
                    }
                  }}
                  onClick={() => handleLoadPreset(preset.id)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6">
                      {preset.name}
                    </Typography>
                    <Chip
                      label={preset.tier}
                      size="small"
                      color={
                        preset.tier === 'Starter' ? 'default' :
                        preset.tier === 'Professional' ? 'primary' :
                        preset.tier === 'Business' ? 'secondary' :
                        preset.tier === 'Enterprise' ? 'error' :
                        'success'
                      }
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2, flexGrow: 1 }}>
                    {preset.description}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Capacidad
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {preset.capacity?.daily?.toLocaleString()} emails/día
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Servidores
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {preset.serverCount} SMTP
                        {preset.sendgrid && ' + SendGrid'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Costo Mensual
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary.main">
                        ${preset.cost?.monthly}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Setup
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        ${preset.cost?.setup}
                      </Typography>
                    </Grid>
                  </Grid>

                  {preset.recommended && (
                    <Chip
                      label="✨ Recomendado"
                      color="success"
                      size="small"
                      sx={{ mt: 2, alignSelf: 'flex-start' }}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Add Server Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Servidor SMTP</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Host SMTP"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            margin="normal"
            placeholder="smtp.gmail.com"
            required
          />
          <Grid container spacing={2}>
            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Puerto"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                margin="normal"
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Seguro</InputLabel>
                <Select
                  value={formData.secure}
                  onChange={(e) => setFormData({ ...formData, secure: e.target.value })}
                >
                  <MenuItem value={false}>No (STARTTLS)</MenuItem>
                  <MenuItem value={true}>Sí (SSL/TLS)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField
            fullWidth
            label="Usuario"
            value={formData.user}
            onChange={(e) => setFormData({ ...formData, user: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Contraseña"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Límite Diario"
            type="number"
            value={formData.dailyLimit}
            onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })}
            margin="normal"
            helperText="Número máximo de emails que puede enviar por día"
          />
          <TextField
            fullWidth
            label="Dirección IP (Opcional)"
            value={formData.ipAddress}
            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
            margin="normal"
            placeholder="Auto-detectar"
            helperText="Dejar vacío para auto-detectar"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAddServer}
            disabled={loading || !formData.name || !formData.host || !formData.user || !formData.password}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Resultado de la Prueba</DialogTitle>
        <DialogContent>
          {testResult?.success ? (
            <Alert severity="success" icon={<HealthyIcon />}>
              ¡Servidor conectado exitosamente!
              <Typography variant="body2" sx={{ mt: 1 }}>
                Tiempo de respuesta: {testResult.responseTime}ms
              </Typography>
            </Alert>
          ) : (
            <Alert severity="error" icon={<ErrorIcon />}>
              Error al conectar con el servidor
              <Typography variant="body2" sx={{ mt: 1 }}>
                {testResult?.error || 'Error desconocido'}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
