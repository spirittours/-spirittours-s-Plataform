/**
 * ERP Sync Logs
 * Visor de logs detallados de operaciones ERP
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, TextField, Grid
} from '@mui/material';
import { Download as DownloadIcon, FilterList as FilterIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

interface ERPSyncLogsProps {
  branchId: string | null;
  erpConfigs: any[];
}

const ERPSyncLogs: React.FC<ERPSyncLogsProps> = ({ branchId, erpConfigs }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  useEffect(() => {
    if (branchId) {
      fetchLogs();
    }
  }, [branchId, filterProvider, filterStatus]);

  const fetchLogs = async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filterProvider !== 'all') params.provider = filterProvider;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      const response = await axios.get(`/api/erp-hub/logs/${branchId}`, { params });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = async () => {
    try {
      const response = await axios.get(`/api/erp-hub/logs/${branchId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `erp-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Logs de Sincronización</Typography>
        <Button startIcon={<DownloadIcon />} onClick={handleExportLogs}>
          Exportar Logs
        </Button>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Proveedor ERP</InputLabel>
            <Select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} label="Proveedor ERP">
              <MenuItem value="all">Todos</MenuItem>
              {erpConfigs.map(config => (
                <MenuItem key={config.id} value={config.erp_provider}>{config.erp_provider}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Estado">
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="success">Exitoso</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Desde"
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Hasta"
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {/* Logs Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">No se encontraron logs con los filtros seleccionados</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>ERP</TableCell>
                <TableCell>Operación</TableCell>
                <TableCell>Entidad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Detalles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                  <TableCell>{log.erp_provider}</TableCell>
                  <TableCell>{log.operation_type}</TableCell>
                  <TableCell>{log.entity_type}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.status} 
                      color={log.status === 'success' ? 'success' : log.status === 'error' ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {log.error_message || log.details || '-'}
                    </Typography>
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

export default ERPSyncLogs;
