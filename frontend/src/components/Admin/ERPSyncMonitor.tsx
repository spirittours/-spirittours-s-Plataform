/**
 * ERP Sync Monitor
 * Monitor en tiempo real del estado de sincronizaciones ERP
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, CircularProgress, Grid, Card, CardContent,
  LinearProgress, Chip, Button, IconButton, Tooltip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Refresh as RefreshIcon, CheckCircle, Error, PendingActions } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface ERPSyncMonitorProps {
  branchId: string | null;
  erpConfigs: any[];
}

interface SyncActivity {
  id: string;
  entity_type: string;
  entity_id: string;
  direction: 'to_erp' | 'from_erp';
  status: 'pending' | 'success' | 'error';
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  erp_provider: string;
}

const ERPSyncMonitor: React.FC<ERPSyncMonitorProps> = ({ branchId, erpConfigs }) => {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<SyncActivity[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    successful: 0,
    failed: 0,
    total: 0
  });

  useEffect(() => {
    if (branchId) {
      fetchSyncActivities();
      const interval = setInterval(fetchSyncActivities, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [branchId]);

  const fetchSyncActivities = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/erp-hub/sync/activities/${branchId}`, {
        params: { limit: 50 }
      });
      setActivities(response.data.activities || []);
      setStats(response.data.stats || { pending: 0, successful: 0, failed: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching sync activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'pending': return <PendingActions color="warning" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Monitor de Sincronización en Tiempo Real
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={fetchSyncActivities}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Sincronizaciones
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Exitosas
              </Typography>
              <Typography variant="h4" color="success.main">{stats.successful}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Fallidas
              </Typography>
              <Typography variant="h4" color="error.main">{stats.failed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Pendientes
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activities Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : activities.length === 0 ? (
        <Alert severity="info">No hay actividades de sincronización recientes</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Estado</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>ERP</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Duración</TableCell>
                <TableCell>Mensaje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Chip 
                      icon={getStatusIcon(activity.status)}
                      label={activity.status}
                      color={getStatusColor(activity.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{activity.entity_type}</TableCell>
                  <TableCell>
                    {activity.direction === 'to_erp' ? 'Spirit → ERP' : 'ERP → Spirit'}
                  </TableCell>
                  <TableCell>{activity.erp_provider}</TableCell>
                  <TableCell>
                    {format(new Date(activity.started_at), 'dd/MM/yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    {activity.completed_at 
                      ? `${Math.round((new Date(activity.completed_at).getTime() - new Date(activity.started_at).getTime()) / 1000)}s`
                      : 'En progreso...'}
                  </TableCell>
                  <TableCell>
                    {activity.error_message ? (
                      <Tooltip title={activity.error_message}>
                        <Typography variant="body2" color="error" noWrap>
                          {activity.error_message.substring(0, 50)}...
                        </Typography>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ERPSyncMonitor;
