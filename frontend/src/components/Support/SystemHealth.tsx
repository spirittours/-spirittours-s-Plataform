import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Paper,
} from '@mui/material';
import { CheckCircle, Warning, Error as ErrorIcon, Build } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { SystemHealth as SystemHealthType, HealthStatus, SystemComponent } from '../../types/support.types';
import apiClient from '../../services/apiClient';

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<SystemHealthType>('/api/support/system-health');
      setHealth(response.data);
    } catch (err) {
      toast.error('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: HealthStatus) => {
    const icons = {
      healthy: <CheckCircle sx={{ color: 'success.main' }} />,
      degraded: <Warning sx={{ color: 'warning.main' }} />,
      down: <ErrorIcon sx={{ color: 'error.main' }} />,
      maintenance: <Build sx={{ color: 'info.main' }} />,
    };
    return icons[status];
  };

  const getStatusColor = (status: HealthStatus) => {
    const colors: Record<HealthStatus, any> = {
      healthy: 'success',
      degraded: 'warning',
      down: 'error',
      maintenance: 'info',
    };
    return colors[status];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading || !health) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const healthyComponents = health.components.filter(c => c.status === HealthStatus.HEALTHY).length;
  const degradedComponents = health.components.filter(c => c.status === HealthStatus.DEGRADED).length;
  const downComponents = health.components.filter(c => c.status === HealthStatus.DOWN).length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">System Health</Typography>
        <Chip
          label={health.overall}
          color={getStatusColor(health.overall)}
          icon={getStatusIcon(health.overall)}
        />
      </Box>

      {health.overall !== HealthStatus.HEALTHY && (
        <Alert severity={health.overall === HealthStatus.DOWN ? 'error' : 'warning'} sx={{ mb: 3 }}>
          System is currently {health.overall}. Some features may be unavailable.
        </Alert>
      )}

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">System Uptime</Typography>
              <Typography variant="h5" fontWeight="bold">{formatUptime(health.uptime)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Healthy Components</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">{healthyComponents}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Degraded</Typography>
              <Typography variant="h5" fontWeight="bold" color="warning.main">{degradedComponents}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Down</Typography>
              <Typography variant="h5" fontWeight="bold" color="error.main">{downComponents}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <List>
          {health.components.map((component, idx) => (
            <React.Fragment key={component.name}>
              {idx > 0 && <Divider />}
              <ListItem>
                <Box display="flex" alignItems="center" width="100%" gap={2}>
                  {getStatusIcon(component.status)}
                  <Box flex={1}>
                    <Typography variant="body1" fontWeight="medium">{component.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uptime: {formatUptime(component.uptime)} | Response: {component.responseTime}ms
                    </Typography>
                    {component.lastError && (
                      <Typography variant="caption" color="error.main" display="block">
                        Last Error: {component.lastError}
                      </Typography>
                    )}
                  </Box>
                  <Chip label={component.status} size="small" color={getStatusColor(component.status)} />
                </Box>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>System Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">Version</Typography>
              <Typography variant="body1" fontWeight="medium">{health.version}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">Last Checked</Typography>
              <Typography variant="body1" fontWeight="medium">
                {new Date(health.lastChecked).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SystemHealth;
