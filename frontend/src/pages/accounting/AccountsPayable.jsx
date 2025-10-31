/**
 * Accounts Payable (CXP) Management Interface
 * Complete workflow for supplier payments with multi-level authorization
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
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  Payment,
  Search,
  FilterList,
  Download,
  Warning,
  Person,
  AttachMoney,
  Business,
  Description,
  History,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';

const STATUS_COLORS = {
  borrador: 'default',
  pendiente_revision: 'info',
  pendiente_autorizacion: 'warning',
  autorizada: 'success',
  rechazada: 'error',
  pagada: 'success',
  cancelada: 'default',
};

const STATUS_LABELS = {
  borrador: 'Borrador',
  pendiente_revision: 'Pendiente Revisión',
  pendiente_autorizacion: 'Pendiente Autorización',
  autorizada: 'Autorizada',
  rechazada: 'Rechazada',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
};

const AUTHORIZATION_LEVELS = {
  supervisor: { limit: 5000, label: 'Supervisor' },
  gerente: { limit: 20000, label: 'Gerente' },
  gerente_plus: { limit: 50000, label: 'Gerente + 2 Aprobadores' },
  director: { limit: Infinity, label: 'Director' },
};

function AccountsPayable() {
  const [cxpList, setCxpList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // User info
  const [userRole, setUserRole] = useState('gerente');
  const [authorizationLimit, setAuthorizationLimit] = useState(20000);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [authorizationDialogOpen, setAuthorizationDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCxp, setSelectedCxp] = useState(null);

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    proveedor_id: '',
    tipo_gasto: 'operativo',
    concepto: '',
    descripcion: '',
    monto_total: '',
    moneda: 'MXN',
    fecha_vencimiento: null,
    centro_costos: '',
    proyecto_id: '',
    documentos_soporte: [],
  });

  const [authorizationData, setAuthorizationData] = useState({
    comentario: '',
    nivel_autorizacion: '',
  });

  const [paymentData, setPaymentData] = useState({
    monto: '',
    forma_pago: 'transferencia',
    referencia: '',
    fecha_pago: new Date(),
    notas: '',
  });

  // Notifications
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const steps = ['Información Básica', 'Detalles de Pago', 'Documentos'];

  useEffect(() => {
    fetchCxpList();
    fetchSuppliers();
    loadUserInfo();
  }, [page, rowsPerPage, statusFilter, searchQuery]);

  const loadUserInfo = () => {
    const role = localStorage.getItem('user_role') || 'gerente';
    setUserRole(role);
    
    // Set authorization limit based on role
    switch (role) {
      case 'supervisor':
        setAuthorizationLimit(5000);
        break;
      case 'gerente':
        setAuthorizationLimit(20000);
        break;
      case 'director':
        setAuthorizationLimit(Infinity);
        break;
      default:
        setAuthorizationLimit(0);
    }
  };

  const fetchCxpList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...(statusFilter !== 'all' && { estado: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateFrom && { fecha_desde: dateFrom.toISOString().split('T')[0] }),
        ...(dateTo && { fecha_hasta: dateTo.toISOString().split('T')[0] }),
      });

      const response = await fetch(`/api/accounting/cxp?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCxpList(data.data.cxp_list || []);
        setTotalCount(data.data.total_count || 0);
      }
    } catch (error) {
      console.error('Error fetching CXP list:', error);
      showNotification('Error al cargar cuentas por pagar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/accounting/suppliers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSuppliersList(data.data.suppliers || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleCreateCxp = async () => {
    try {
      const response = await fetch('/api/accounting/cxp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sucursal_id: localStorage.getItem('sucursal_id'),
          usuario_creacion_id: localStorage.getItem('user_id'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('CXP creada exitosamente', 'success');
        setCreateDialogOpen(false);
        resetForm();
        fetchCxpList();
      } else {
        showNotification(data.message || 'Error al crear CXP', 'error');
      }
    } catch (error) {
      console.error('Error creating CXP:', error);
      showNotification('Error al crear CXP', 'error');
    }
  };

  const handleAuthorizeCxp = async () => {
    if (!selectedCxp) return;

    try {
      const response = await fetch(`/api/accounting/cxp/${selectedCxp.cxp_id}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_autorizador_id: localStorage.getItem('user_id'),
          comentario: authorizationData.comentario,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('CXP autorizada exitosamente', 'success');
        setAuthorizationDialogOpen(false);
        setAuthorizationData({ comentario: '', nivel_autorizacion: '' });
        fetchCxpList();
      } else {
        showNotification(data.message || 'Error al autorizar CXP', 'error');
      }
    } catch (error) {
      console.error('Error authorizing CXP:', error);
      showNotification('Error al autorizar CXP', 'error');
    }
  };

  const handleRejectCxp = async () => {
    if (!selectedCxp) return;

    try {
      const response = await fetch(`/api/accounting/cxp/${selectedCxp.cxp_id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: localStorage.getItem('user_id'),
          motivo_rechazo: authorizationData.comentario,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('CXP rechazada', 'success');
        setAuthorizationDialogOpen(false);
        setAuthorizationData({ comentario: '', nivel_autorizacion: '' });
        fetchCxpList();
      } else {
        showNotification(data.message || 'Error al rechazar CXP', 'error');
      }
    } catch (error) {
      console.error('Error rejecting CXP:', error);
      showNotification('Error al rechazar CXP', 'error');
    }
  };

  const handlePayCxp = async () => {
    if (!selectedCxp) return;

    try {
      const response = await fetch(`/api/accounting/cxp/${selectedCxp.cxp_id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          usuario_pago_id: localStorage.getItem('user_id'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Pago registrado exitosamente', 'success');
        setPaymentDialogOpen(false);
        resetPaymentForm();
        fetchCxpList();
      } else {
        showNotification(data.message || 'Error al registrar pago', 'error');
      }
    } catch (error) {
      console.error('Error paying CXP:', error);
      showNotification('Error al registrar pago', 'error');
    }
  };

  const canAuthorize = (cxp) => {
    if (!cxp) return false;
    return cxp.monto_total <= authorizationLimit;
  };

  const getRequiredAuthorizationLevel = (amount) => {
    if (amount < 5000) return 'supervisor';
    if (amount < 20000) return 'gerente';
    if (amount < 50000) return 'gerente_plus';
    return 'director';
  };

  const resetForm = () => {
    setFormData({
      proveedor_id: '',
      tipo_gasto: 'operativo',
      concepto: '',
      descripcion: '',
      monto_total: '',
      moneda: 'MXN',
      fecha_vencimiento: null,
      centro_costos: '',
      proyecto_id: '',
      documentos_soporte: [],
    });
    setActiveStep(0);
  };

  const resetPaymentForm = () => {
    setPaymentData({
      monto: '',
      forma_pago: 'transferencia',
      referencia: '',
      fecha_pago: new Date(),
      notas: '',
    });
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Cuentas por Pagar (CXP)
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Límite de autorización: ${authorizationLimit.toLocaleString()} ({userRole})
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => window.open('/api/accounting/reports/accounts-payable?formato=excel', '_blank')}
          >
            Exportar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nueva CXP
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por folio, proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={statusFilter}
                label="Estado"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
                <MenuItem value="pendiente_revision">Pendiente Revisión</MenuItem>
                <MenuItem value="pendiente_autorizacion">Pendiente Autorización</MenuItem>
                <MenuItem value="autorizada">Autorizada</MenuItem>
                <MenuItem value="rechazada">Rechazada</MenuItem>
                <MenuItem value="pagada">Pagada</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Fecha Desde"
              value={dateFrom}
              onChange={(newValue) => setDateFrom(newValue)}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <DatePicker
              label="Fecha Hasta"
              value={dateTo}
              onChange={(newValue) => setDateTo(newValue)}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={fetchCxpList}
            >
              Filtrar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell><strong>Folio</strong></TableCell>
              <TableCell><strong>Proveedor</strong></TableCell>
              <TableCell><strong>Concepto</strong></TableCell>
              <TableCell><strong>Fecha Emisión</strong></TableCell>
              <TableCell align="right"><strong>Monto Total</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Nivel Requerido</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Cargando...</TableCell>
              </TableRow>
            ) : cxpList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No hay cuentas por pagar</TableCell>
              </TableRow>
            ) : (
              cxpList.map((cxp) => (
                <TableRow key={cxp.cxp_id} hover>
                  <TableCell>{cxp.folio_cxp}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{cxp.proveedor_nombre}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      RFC: {cxp.proveedor_rfc}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{cxp.concepto}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cxp.tipo_gasto}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(cxp.fecha_emision).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      ${cxp.monto_total.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cxp.moneda}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[cxp.estado_cxp] || cxp.estado_cxp}
                      color={STATUS_COLORS[cxp.estado_cxp] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={AUTHORIZATION_LEVELS[getRequiredAuthorizationLevel(cxp.monto_total)]?.label}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalles">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCxp(cxp);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {cxp.estado_cxp === 'pendiente_autorizacion' && canAuthorize(cxp) && (
                      <Tooltip title="Autorizar/Rechazar">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedCxp(cxp);
                            setAuthorizationDialogOpen(true);
                          }}
                        >
                          <Warning />
                        </IconButton>
                      </Tooltip>
                    )}
                    {cxp.estado_cxp === 'autorizada' && (
                      <Tooltip title="Registrar Pago">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setSelectedCxp(cxp);
                            setPaymentData({ ...paymentData, monto: cxp.monto_total });
                            setPaymentDialogOpen(true);
                          }}
                        >
                          <Payment />
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

      {/* Create CXP Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Nueva Cuenta por Pagar</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Step 1: Basic Information */}
            {activeStep === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Proveedor</InputLabel>
                    <Select
                      value={formData.proveedor_id}
                      label="Proveedor"
                      onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                    >
                      {suppliersList.map((supplier) => (
                        <MenuItem key={supplier.proveedor_id} value={supplier.proveedor_id}>
                          {supplier.nombre_comercial} - {supplier.rfc}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Gasto</InputLabel>
                    <Select
                      value={formData.tipo_gasto}
                      label="Tipo de Gasto"
                      onChange={(e) => setFormData({ ...formData, tipo_gasto: e.target.value })}
                    >
                      <MenuItem value="operativo">Operativo</MenuItem>
                      <MenuItem value="administrativo">Administrativo</MenuItem>
                      <MenuItem value="servicios">Servicios</MenuItem>
                      <MenuItem value="nomina">Nómina</MenuItem>
                      <MenuItem value="impuestos">Impuestos</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Centro de Costos"
                    value={formData.centro_costos}
                    onChange={(e) => setFormData({ ...formData, centro_costos: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Concepto"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descripción"
                    multiline
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!formData.proveedor_id || !formData.concepto}
                  >
                    Siguiente
                  </Button>
                </Grid>
              </Grid>
            )}

            {/* Step 2: Payment Details */}
            {activeStep === 1 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Monto Total"
                    type="number"
                    value={formData.monto_total}
                    onChange={(e) => setFormData({ ...formData, monto_total: e.target.value })}
                    required
                    InputProps={{
                      startAdornment: '$',
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Moneda</InputLabel>
                    <Select
                      value={formData.moneda}
                      label="Moneda"
                      onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                    >
                      <MenuItem value="MXN">MXN - Peso Mexicano</MenuItem>
                      <MenuItem value="USD">USD - Dólar Americano</MenuItem>
                      <MenuItem value="EUR">EUR - Euro</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <DatePicker
                    label="Fecha de Vencimiento"
                    value={formData.fecha_vencimiento}
                    onChange={(newValue) => setFormData({ ...formData, fecha_vencimiento: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                {formData.monto_total && (
                  <Grid item xs={12}>
                    <Alert 
                      severity={
                        formData.monto_total >= 50000 ? 'error' : 
                        formData.monto_total >= 20000 ? 'warning' : 'info'
                      }
                    >
                      <Typography variant="body2">
                        <strong>Nivel de autorización requerido:</strong>{' '}
                        {AUTHORIZATION_LEVELS[getRequiredAuthorizationLevel(parseFloat(formData.monto_total))]?.label}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => setActiveStep(0)}>Atrás</Button>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(2)}
                      disabled={!formData.monto_total}
                    >
                      Siguiente
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}

            {/* Step 3: Documents */}
            {activeStep === 2 && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Adjunte los documentos soporte (facturas, cotizaciones, contratos)
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<Description />}
                  >
                    Cargar Documentos
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        // Handle file upload
                        console.log('Files:', e.target.files);
                      }}
                    />
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Resumen</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Proveedor:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">
                            {suppliersList.find(s => s.proveedor_id === formData.proveedor_id)?.nombre_comercial}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Concepto:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2">{formData.concepto}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Monto:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" color="primary">
                            ${parseFloat(formData.monto_total).toLocaleString()} {formData.moneda}
                          </Typography>
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
                      onClick={handleCreateCxp}
                      startIcon={<CheckCircle />}
                    >
                      Crear CXP
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Authorization Dialog */}
      <Dialog open={authorizationDialogOpen} onClose={() => setAuthorizationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Autorizar/Rechazar CXP</DialogTitle>
        <DialogContent>
          {selectedCxp && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Folio:</strong> {selectedCxp.folio_cxp}<br />
                  <strong>Proveedor:</strong> {selectedCxp.proveedor_nombre}<br />
                  <strong>Monto:</strong> ${selectedCxp.monto_total.toLocaleString()}<br />
                  <strong>Concepto:</strong> {selectedCxp.concepto}
                </Typography>
              </Alert>
              <TextField
                fullWidth
                label="Comentarios"
                multiline
                rows={4}
                value={authorizationData.comentario}
                onChange={(e) => setAuthorizationData({ ...authorizationData, comentario: e.target.value })}
                placeholder="Ingrese sus comentarios sobre la autorización o rechazo..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleRejectCxp}
            color="error"
            startIcon={<Cancel />}
          >
            Rechazar
          </Button>
          <Button onClick={() => setAuthorizationDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleAuthorizeCxp}
            startIcon={<CheckCircle />}
          >
            Autorizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pago a Proveedor</DialogTitle>
        <DialogContent>
          {selectedCxp && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Folio: {selectedCxp.folio_cxp}<br />
                Proveedor: {selectedCxp.proveedor_nombre}<br />
                Monto Total: ${selectedCxp.monto_total.toLocaleString()}
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Monto del Pago"
                    type="number"
                    value={paymentData.monto}
                    onChange={(e) => setPaymentData({ ...paymentData, monto: e.target.value })}
                    required
                    InputProps={{
                      startAdornment: '$',
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Forma de Pago</InputLabel>
                    <Select
                      value={paymentData.forma_pago}
                      label="Forma de Pago"
                      onChange={(e) => setPaymentData({ ...paymentData, forma_pago: e.target.value })}
                    >
                      <MenuItem value="transferencia">Transferencia</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="efectivo">Efectivo</MenuItem>
                      <MenuItem value="tarjeta">Tarjeta</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Referencia / No. Transacción"
                    value={paymentData.referencia}
                    onChange={(e) => setPaymentData({ ...paymentData, referencia: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <DatePicker
                    label="Fecha de Pago"
                    value={paymentData.fecha_pago}
                    onChange={(newValue) => setPaymentData({ ...paymentData, fecha_pago: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notas"
                    multiline
                    rows={2}
                    value={paymentData.notas}
                    onChange={(e) => setPaymentData({ ...paymentData, notas: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handlePayCxp}>Registrar Pago</Button>
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

export default AccountsPayable;
