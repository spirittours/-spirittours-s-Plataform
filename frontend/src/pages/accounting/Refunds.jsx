/**
 * Refunds Management Interface
 * Handle refund requests with automatic calculation based on departure date
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Tooltip,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  Search,
  Info,
  AttachMoney,
  CalendarToday,
  Person,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';

const STATUS_COLORS = {
  pendiente_autorizacion: 'warning',
  autorizado: 'info',
  procesado: 'success',
  rechazado: 'error',
  cancelado: 'default',
};

const STATUS_LABELS = {
  pendiente_autorizacion: 'Pendiente Autorización',
  autorizado: 'Autorizado',
  procesado: 'Procesado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

// Refund policy configuration
const REFUND_POLICY = [
  { days: 30, percentage: 100, label: '30+ días: 100% reembolso' },
  { days: 14, percentage: 90, label: '14-29 días: 90% reembolso' },
  { days: 7, percentage: 75, label: '7-13 días: 75% reembolso' },
  { days: 2, percentage: 50, label: '2-6 días: 50% reembolso' },
  { days: 0, percentage: 0, label: '0-1 días: Sin reembolso' },
];

function Refunds() {
  const [refundsList, setRefundsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    cxc_id: '',
    cxc_folio: '',
    cliente_nombre: '',
    monto_pagado: 0,
    fecha_salida: null,
    motivo_cancelacion: '',
    notas_adicionales: '',
  });

  const [calculatedRefund, setCalculatedRefund] = useState(null);

  // Notifications
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const steps = ['Buscar CXC', 'Calcular Reembolso', 'Confirmar'];

  useEffect(() => {
    fetchRefundsList();
  }, [page, rowsPerPage, statusFilter]);

  const fetchRefundsList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...(statusFilter !== 'all' && { estado: statusFilter }),
      });

      const response = await fetch(`/api/accounting/refunds?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setRefundsList(data.data.refunds_list || []);
        setTotalCount(data.data.total_count || 0);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
      showNotification('Error al cargar reembolsos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCxc = async () => {
    if (!formData.cxc_folio) {
      showNotification('Por favor ingrese un folio de CXC', 'warning');
      return;
    }

    try {
      const response = await fetch(`/api/accounting/cxc/search?folio=${formData.cxc_folio}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success && data.data) {
        setFormData({
          ...formData,
          cxc_id: data.data.cxc_id,
          cliente_nombre: data.data.cliente_nombre,
          monto_pagado: data.data.monto_pagado || data.data.monto_total,
          fecha_salida: new Date(data.data.fecha_salida),
        });
        setActiveStep(1);
        calculateRefund(data.data.monto_pagado, new Date(data.data.fecha_salida));
      } else {
        showNotification('CXC no encontrado o no elegible para reembolso', 'error');
      }
    } catch (error) {
      console.error('Error searching CXC:', error);
      showNotification('Error al buscar CXC', 'error');
    }
  };

  const calculateRefund = (montoPagado, fechaSalida) => {
    const today = new Date();
    const departure = new Date(fechaSalida);
    const daysUntilDeparture = Math.ceil((departure - today) / (1000 * 60 * 60 * 24));

    let porcentajeReembolsado = 0;
    let policyApplied = '';

    if (daysUntilDeparture >= 30) {
      porcentajeReembolsado = 100;
      policyApplied = '30+ días: 100% reembolso';
    } else if (daysUntilDeparture >= 14) {
      porcentajeReembolsado = 90;
      policyApplied = '14-29 días: 90% reembolso';
    } else if (daysUntilDeparture >= 7) {
      porcentajeReembolsado = 75;
      policyApplied = '7-13 días: 75% reembolso';
    } else if (daysUntilDeparture >= 2) {
      porcentajeReembolsado = 50;
      policyApplied = '2-6 días: 50% reembolso';
    } else {
      porcentajeReembolsado = 0;
      policyApplied = '0-1 días: Sin reembolso';
    }

    const montoReembolso = (montoPagado * porcentajeReembolsado) / 100;
    const montoRetenido = montoPagado - montoReembolso;

    setCalculatedRefund({
      daysUntilDeparture,
      porcentajeReembolsado,
      montoReembolso,
      montoRetenido,
      policyApplied,
    });
  };

  const handleCreateRefund = async () => {
    try {
      const response = await fetch('/api/accounting/refunds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cxc_id: formData.cxc_id,
          motivo_cancelacion: formData.motivo_cancelacion,
          notas_adicionales: formData.notas_adicionales,
          usuario_creacion_id: localStorage.getItem('user_id'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Reembolso creado exitosamente', 'success');
        setCreateDialogOpen(false);
        resetForm();
        fetchRefundsList();
      } else {
        showNotification(data.message || 'Error al crear reembolso', 'error');
      }
    } catch (error) {
      console.error('Error creating refund:', error);
      showNotification('Error al crear reembolso', 'error');
    }
  };

  const handleAuthorizeRefund = async (refundId) => {
    try {
      const response = await fetch(`/api/accounting/refunds/${refundId}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_autorizador_id: localStorage.getItem('user_id'),
          comentario: 'Autorizado desde interfaz web',
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Reembolso autorizado exitosamente', 'success');
        fetchRefundsList();
      } else {
        showNotification(data.message || 'Error al autorizar reembolso', 'error');
      }
    } catch (error) {
      console.error('Error authorizing refund:', error);
      showNotification('Error al autorizar reembolso', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      cxc_id: '',
      cxc_folio: '',
      cliente_nombre: '',
      monto_pagado: 0,
      fecha_salida: null,
      motivo_cancelacion: '',
      notas_adicionales: '',
    });
    setCalculatedRefund(null);
    setActiveStep(0);
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Gestión de Reembolsos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Nuevo Reembolso
        </Button>
      </Box>

      {/* Refund Policy Card */}
      <Card sx={{ mb: 3, backgroundColor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Info sx={{ mr: 1 }} />
            Política de Reembolso
          </Typography>
          <Grid container spacing={2}>
            {REFUND_POLICY.map((policy, index) => (
              <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {policy.percentage}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {policy.days === 0 ? '0-1 días' : `${policy.days}+ días`}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por folio, cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={statusFilter}
                label="Estado"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pendiente_autorizacion">Pendiente Autorización</MenuItem>
                <MenuItem value="autorizado">Autorizado</MenuItem>
                <MenuItem value="procesado">Procesado</MenuItem>
                <MenuItem value="rechazado">Rechazado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell><strong>Folio Reembolso</strong></TableCell>
              <TableCell><strong>Folio CXC</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell align="right"><strong>Monto Pagado</strong></TableCell>
              <TableCell align="right"><strong>Monto Reembolso</strong></TableCell>
              <TableCell align="center"><strong>Porcentaje</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Cargando...</TableCell>
              </TableRow>
            ) : refundsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No hay reembolsos registrados</TableCell>
              </TableRow>
            ) : (
              refundsList.map((refund) => (
                <TableRow key={refund.reembolso_id} hover>
                  <TableCell>{refund.folio_reembolso}</TableCell>
                  <TableCell>{refund.cxc_folio}</TableCell>
                  <TableCell>{refund.cliente_nombre}</TableCell>
                  <TableCell align="right">
                    ${refund.monto_pagado.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      ${refund.monto_reembolso.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${refund.porcentaje_reembolsado}%`}
                      color={refund.porcentaje_reembolsado >= 75 ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[refund.estado_reembolso] || refund.estado_reembolso}
                      color={STATUS_COLORS[refund.estado_reembolso] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalles">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedRefund(refund);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {refund.estado_reembolso === 'pendiente_autorizacion' && (
                      <Tooltip title="Autorizar">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleAuthorizeRefund(refund.reembolso_id)}
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Filas por página:"
        />
      </TableContainer>

      {/* Create Refund Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Nuevo Reembolso</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Step 1: Search CXC */}
            {activeStep === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Ingrese el folio de la cuenta por cobrar para la cual desea procesar el reembolso
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Folio CXC"
                    placeholder="CXC-202510-XXXXXX"
                    value={formData.cxc_folio}
                    onChange={(e) => setFormData({ ...formData, cxc_folio: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSearchCxc();
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSearchCxc}
                    startIcon={<Search />}
                  >
                    Buscar CXC
                  </Button>
                </Grid>
              </Grid>
            )}

            {/* Step 2: Calculate Refund */}
            {activeStep === 1 && calculatedRefund && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Person sx={{ mr: 1 }} />
                            <Typography variant="body2" color="textSecondary">Cliente:</Typography>
                          </Box>
                          <Typography variant="h6">{formData.cliente_nombre}</Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <CalendarToday sx={{ mr: 1 }} />
                            <Typography variant="body2" color="textSecondary">Fecha de Salida:</Typography>
                          </Box>
                          <Typography variant="h6">
                            {formData.fecha_salida?.toLocaleDateString('es-MX')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Política aplicada:</strong> {calculatedRefund.policyApplied}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Días hasta la salida:</strong> {calculatedRefund.daysUntilDeparture} días
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.100' }}>
                    <Typography variant="body2" color="textSecondary">Monto Pagado</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      ${formData.monto_pagado.toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light' }}>
                    <Typography variant="body2" color="textSecondary">Monto a Reembolsar</Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.dark">
                      ${calculatedRefund.montoReembolso.toLocaleString()}
                    </Typography>
                    <Chip
                      label={`${calculatedRefund.porcentajeReembolsado}%`}
                      color="success"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'error.light' }}>
                    <Typography variant="body2" color="textSecondary">Monto Retenido</Typography>
                    <Typography variant="h5" fontWeight="bold" color="error.dark">
                      ${calculatedRefund.montoRetenido.toLocaleString()}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Motivo de Cancelación"
                    multiline
                    rows={3}
                    value={formData.motivo_cancelacion}
                    onChange={(e) => setFormData({ ...formData, motivo_cancelacion: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas Adicionales"
                    multiline
                    rows={2}
                    value={formData.notas_adicionales}
                    onChange={(e) => setFormData({ ...formData, notas_adicionales: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => setActiveStep(0)}>Atrás</Button>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(2)}
                      disabled={!formData.motivo_cancelacion}
                    >
                      Continuar
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* Step 3: Confirm */}
            {activeStep === 2 && calculatedRefund && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Por favor revise la información antes de confirmar el reembolso
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Resumen del Reembolso</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Cliente:</Typography>
                          <Typography variant="body1">{formData.cliente_nombre}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Folio CXC:</Typography>
                          <Typography variant="body1">{formData.cxc_folio}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Monto Reembolso:</Typography>
                          <Typography variant="h6" color="success.main">
                            ${calculatedRefund.montoReembolso.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Porcentaje:</Typography>
                          <Typography variant="h6">
                            {calculatedRefund.porcentajeReembolsado}%
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="textSecondary">Motivo:</Typography>
                          <Typography variant="body1">{formData.motivo_cancelacion}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => setActiveStep(1)}>Atrás</Button>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleCreateRefund}
                      startIcon={<CheckCircle />}
                    >
                      Confirmar Reembolso
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetForm();
          }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Refunds;
