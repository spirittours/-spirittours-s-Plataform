/**
 * Accounts Receivable (CXC) Management Interface
 * Complete CRUD and payment management for customer accounts
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
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Payment,
  Search,
  FilterList,
  Download,
  MoreVert,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';

const STATUS_COLORS = {
  pendiente: 'warning',
  parcial: 'info',
  cobrado: 'success',
  vencido: 'error',
  incobrable: 'default',
  cancelada: 'default',
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  cobrado: 'Cobrado',
  vencido: 'Vencido',
  incobrable: 'Incobrable',
  cancelada: 'Cancelada',
};

function AccountsReceivable() {
  const [cxcList, setCxcList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCxc, setSelectedCxc] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_email: '',
    cliente_telefono: '',
    reservacion_id: '',
    monto_total: '',
    tipo_tarifa: 'menudeo',
    descripcion: '',
    fecha_salida: null,
  });

  const [paymentData, setPaymentData] = useState({
    monto: '',
    forma_pago: 'efectivo',
    referencia: '',
    fecha_pago: new Date(),
    notas: '',
  });

  // Notifications
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCxcList();
  }, [page, rowsPerPage, statusFilter, searchQuery]);

  const fetchCxcList = async () => {
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

      const response = await fetch(`/api/accounting/cxc?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCxcList(data.data.cxc_list || []);
        setTotalCount(data.data.total_count || 0);
      }
    } catch (error) {
      console.error('Error fetching CXC list:', error);
      showNotification('Error al cargar cuentas por cobrar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCxc = async () => {
    try {
      const response = await fetch('/api/accounting/cxc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          sucursal_id: localStorage.getItem('sucursal_id'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('CXC creada exitosamente', 'success');
        setCreateDialogOpen(false);
        resetForm();
        fetchCxcList();
      } else {
        showNotification(data.message || 'Error al crear CXC', 'error');
      }
    } catch (error) {
      console.error('Error creating CXC:', error);
      showNotification('Error al crear CXC', 'error');
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedCxc) return;

    try {
      const response = await fetch(`/api/accounting/cxc/${selectedCxc.cxc_id}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          usuario_id: localStorage.getItem('user_id'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Pago registrado exitosamente', 'success');
        setPaymentDialogOpen(false);
        resetPaymentForm();
        fetchCxcList();
      } else {
        showNotification(data.message || 'Error al registrar pago', 'error');
      }
    } catch (error) {
      console.error('Error registering payment:', error);
      showNotification('Error al registrar pago', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        formato: 'excel',
        ...(statusFilter !== 'all' && { estado: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
        ...(dateFrom && { fecha_desde: dateFrom.toISOString().split('T')[0] }),
        ...(dateTo && { fecha_hasta: dateTo.toISOString().split('T')[0] }),
      });

      window.open(`/api/accounting/reports/accounts-receivable?${params}`, '_blank');
    } catch (error) {
      console.error('Error exporting data:', error);
      showNotification('Error al exportar datos', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_nombre: '',
      cliente_email: '',
      cliente_telefono: '',
      reservacion_id: '',
      monto_total: '',
      tipo_tarifa: 'menudeo',
      descripcion: '',
      fecha_salida: null,
    });
  };

  const resetPaymentForm = () => {
    setPaymentData({
      monto: '',
      forma_pago: 'efectivo',
      referencia: '',
      fecha_pago: new Date(),
      notas: '',
    });
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Cuentas por Cobrar (CXC)
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Exportar
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nueva CXC
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
              placeholder="Buscar por folio, cliente..."
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
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="cobrado">Cobrado</MenuItem>
                <MenuItem value="vencido">Vencido</MenuItem>
                <MenuItem value="incobrable">Incobrable</MenuItem>
                <MenuItem value="cancelada">Cancelada</MenuItem>
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
              onClick={fetchCxcList}
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
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Fecha Emisión</strong></TableCell>
              <TableCell align="right"><strong>Monto Total</strong></TableCell>
              <TableCell align="right"><strong>Monto Pendiente</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Días Vencido</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Cargando...</TableCell>
              </TableRow>
            ) : cxcList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No hay cuentas por cobrar</TableCell>
              </TableRow>
            ) : (
              cxcList.map((cxc) => (
                <TableRow key={cxc.cxc_id} hover>
                  <TableCell>{cxc.folio_cxc}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{cxc.cliente_nombre}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {cxc.cliente_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(cxc.fecha_emision).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell align="right">
                    ${cxc.monto_total.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    ${cxc.monto_pendiente.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[cxc.estado_cxc] || cxc.estado_cxc}
                      color={STATUS_COLORS[cxc.estado_cxc] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {cxc.dias_vencido > 0 ? (
                      <Chip
                        label={`${cxc.dias_vencido} días`}
                        color="error"
                        size="small"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalles">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCxc(cxc);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {cxc.estado_cxc !== 'cobrado' && cxc.estado_cxc !== 'cancelada' && (
                      <Tooltip title="Registrar Pago">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedCxc(cxc);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          <Payment />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Más opciones">
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Tooltip>
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
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Create CXC Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Nueva Cuenta por Cobrar</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre del Cliente"
                value={formData.cliente_nombre}
                onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email del Cliente"
                type="email"
                value={formData.cliente_email}
                onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono del Cliente"
                value={formData.cliente_telefono}
                onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ID de Reservación"
                value={formData.reservacion_id}
                onChange={(e) => setFormData({ ...formData, reservacion_id: e.target.value })}
                required
              />
            </Grid>
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
                <InputLabel>Tipo de Tarifa</InputLabel>
                <Select
                  value={formData.tipo_tarifa}
                  label="Tipo de Tarifa"
                  onChange={(e) => setFormData({ ...formData, tipo_tarifa: e.target.value })}
                >
                  <MenuItem value="menudeo">Menudeo</MenuItem>
                  <MenuItem value="mayoreo">Mayoreo</MenuItem>
                  <MenuItem value="corporativo">Corporativo</MenuItem>
                </Select>
              </FormControl>
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
              <DatePicker
                label="Fecha de Salida"
                value={formData.fecha_salida}
                onChange={(newValue) => setFormData({ ...formData, fecha_salida: newValue })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateCxc}>Crear CXC</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          {selectedCxc && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Folio: {selectedCxc.folio_cxc}<br />
                Cliente: {selectedCxc.cliente_nombre}<br />
                Monto Pendiente: ${selectedCxc.monto_pendiente.toLocaleString()}
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
                    helperText={`Máximo: $${selectedCxc.monto_pendiente.toLocaleString()}`}
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
                      <MenuItem value="efectivo">Efectivo</MenuItem>
                      <MenuItem value="tarjeta">Tarjeta</MenuItem>
                      <MenuItem value="transferencia">Transferencia</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
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
          <Button variant="contained" onClick={handleRegisterPayment}>Registrar Pago</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', right: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AccountsReceivable;
