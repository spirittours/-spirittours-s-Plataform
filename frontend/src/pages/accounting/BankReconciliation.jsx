/**
 * Bank Reconciliation Interface
 * Automated daily bank reconciliation with discrepancy detection
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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Warning,
  Error,
  TrendingUp,
  TrendingDown,
  Search,
  Upload,
  Download,
  Visibility,
  CompareArrows,
  AccountBalance,
  Receipt,
  Money,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';

const RECONCILIATION_STATUS = {
  conciliado: { label: 'Conciliado', color: 'success', icon: <CheckCircle /> },
  con_diferencias: { label: 'Con Diferencias', color: 'warning', icon: <Warning /> },
  pendiente: { label: 'Pendiente', color: 'info', icon: <CompareArrows /> },
  error: { label: 'Error', color: 'error', icon: <Error /> },
};

function BankReconciliation() {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState(null);

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    sucursal_id: localStorage.getItem('sucursal_id') || '',
    fecha_conciliacion: new Date(),
    cuenta_bancaria_id: '',
    saldo_inicial_banco: 0,
    saldo_final_banco: 0,
    movimientos_banco: [],
  });

  const [bankMovements, setBankMovements] = useState([]);
  const [systemMovements, setSystemMovements] = useState([]);
  const [matchedMovements, setMatchedMovements] = useState(new Set());
  const [reconciliationSummary, setReconciliationSummary] = useState(null);

  // Notification
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const steps = ['Información Bancaria', 'Cargar Movimientos', 'Conciliar', 'Confirmar'];

  useEffect(() => {
    fetchReconciliations();
  }, []);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounting/reconciliation/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setReconciliations(data.data.reconciliations || []);
      }
    } catch (error) {
      console.error('Error fetching reconciliations:', error);
      showNotification('Error al cargar conciliaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemMovements = async (fecha) => {
    try {
      const response = await fetch(
        `/api/accounting/reconciliation/system-movements?fecha=${fecha.toISOString().split('T')[0]}&sucursal_id=${formData.sucursal_id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setSystemMovements(data.data.movements || []);
      }
    } catch (error) {
      console.error('Error fetching system movements:', error);
      showNotification('Error al cargar movimientos del sistema', 'error');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Parse CSV/Excel file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Simple CSV parsing (assuming format: fecha,concepto,referencia,monto,tipo)
        const content = e.target.result;
        const lines = content.split('\n').slice(1); // Skip header
        
        const movements = lines
          .filter(line => line.trim())
          .map((line, index) => {
            const [fecha, concepto, referencia, monto, tipo] = line.split(',');
            return {
              id: `bank-${index}`,
              fecha: fecha.trim(),
              concepto: concepto.trim(),
              referencia: referencia.trim(),
              monto: parseFloat(monto.trim()),
              tipo: tipo.trim().toLowerCase(),
              matched: false,
            };
          });

        setBankMovements(movements);
        setFormData({ ...formData, movimientos_banco: movements });
        showNotification(`${movements.length} movimientos cargados exitosamente`, 'success');
      } catch (error) {
        console.error('Error parsing file:', error);
        showNotification('Error al procesar el archivo', 'error');
      }
    };
    reader.readAsText(file);
  };

  const autoMatch = () => {
    const matched = new Set();
    const tolerance = 0.01; // $0.01 tolerance for floating point

    bankMovements.forEach((bankMov) => {
      systemMovements.forEach((sysMov) => {
        // Match criteria: same date, same amount (within tolerance), same type
        if (
          bankMov.fecha === sysMov.fecha &&
          Math.abs(bankMov.monto - sysMov.monto) <= tolerance &&
          bankMov.tipo === sysMov.tipo &&
          !matched.has(`bank-${bankMov.id}`) &&
          !matched.has(`system-${sysMov.movimiento_id}`)
        ) {
          matched.add(`bank-${bankMov.id}`);
          matched.add(`system-${sysMov.movimiento_id}`);
        }
      });
    });

    setMatchedMovements(matched);
    showNotification(`${matched.size / 2} movimientos conciliados automáticamente`, 'success');
  };

  const calculateSummary = () => {
    const totalBankIngresos = bankMovements
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    
    const totalBankEgresos = bankMovements
      .filter(m => m.tipo === 'egreso')
      .reduce((sum, m) => sum + Math.abs(m.monto), 0);

    const totalSystemIngresos = systemMovements
      .filter(m => m.tipo_movimiento === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    
    const totalSystemEgresos = systemMovements
      .filter(m => m.tipo_movimiento === 'egreso')
      .reduce((sum, m) => sum + Math.abs(m.monto), 0);

    const bankBalance = formData.saldo_inicial_banco + totalBankIngresos - totalBankEgresos;
    const systemBalance = totalSystemIngresos - totalSystemEgresos;
    const diferencia = Math.abs(bankBalance - systemBalance);

    const unmatchedBank = bankMovements.filter(m => !matchedMovements.has(`bank-${m.id}`));
    const unmatchedSystem = systemMovements.filter(m => !matchedMovements.has(`system-${m.movimiento_id}`));

    return {
      totalBankIngresos,
      totalBankEgresos,
      totalSystemIngresos,
      totalSystemEgresos,
      bankBalance,
      systemBalance,
      diferencia,
      unmatchedBank,
      unmatchedSystem,
      matchedCount: matchedMovements.size / 2,
      estado: diferencia < 50 ? 'conciliado' : 'con_diferencias',
    };
  };

  const handlePerformReconciliation = async () => {
    const summary = calculateSummary();

    try {
      const response = await fetch('/api/accounting/reconciliation/bank', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sucursal_id: formData.sucursal_id,
          fecha: formData.fecha_conciliacion.toISOString().split('T')[0],
          saldo_inicial_banco: formData.saldo_inicial_banco,
          saldo_final_banco: formData.saldo_final_banco,
          movimientos_banco: bankMovements,
          movimientos_conciliados: Array.from(matchedMovements),
          diferencia: summary.diferencia,
          usuario_id: localStorage.getItem('user_id'),
        }),
      });

      const data = await response.json();
      if (data.success) {
        showNotification('Conciliación realizada exitosamente', 'success');
        setCreateDialogOpen(false);
        resetForm();
        fetchReconciliations();
      } else {
        showNotification(data.message || 'Error al realizar conciliación', 'error');
      }
    } catch (error) {
      console.error('Error performing reconciliation:', error);
      showNotification('Error al realizar conciliación', 'error');
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      fetchSystemMovements(formData.fecha_conciliacion);
    } else if (activeStep === 2) {
      const summary = calculateSummary();
      setReconciliationSummary(summary);
    }
    setActiveStep((prev) => prev + 1);
  };

  const resetForm = () => {
    setFormData({
      sucursal_id: localStorage.getItem('sucursal_id') || '',
      fecha_conciliacion: new Date(),
      cuenta_bancaria_id: '',
      saldo_inicial_banco: 0,
      saldo_final_banco: 0,
      movimientos_banco: [],
    });
    setBankMovements([]);
    setSystemMovements([]);
    setMatchedMovements(new Set());
    setReconciliationSummary(null);
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
          Conciliación Bancaria
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => window.open('/api/accounting/reconciliation/export?formato=excel', '_blank')}
          >
            Exportar Histórico
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Nueva Conciliación
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Conciliaciones Hoy
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {reconciliations.filter(r => {
                      const today = new Date().toISOString().split('T')[0];
                      return r.fecha_conciliacion.split('T')[0] === today;
                    }).length}
                  </Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Conciliadas
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {reconciliations.filter(r => r.estado_conciliacion === 'conciliado').length}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Con Diferencias
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {reconciliations.filter(r => r.estado_conciliacion === 'con_diferencias').length}
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Diferencia Promedio
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    $
                    {reconciliations.length > 0
                      ? Math.round(
                          reconciliations.reduce((sum, r) => sum + (r.diferencia || 0), 0) /
                            reconciliations.length
                        )
                      : 0}
                  </Typography>
                </Box>
                <CompareArrows sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reconciliations History Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Sucursal</strong></TableCell>
              <TableCell align="right"><strong>Saldo Sistema</strong></TableCell>
              <TableCell align="right"><strong>Saldo Banco</strong></TableCell>
              <TableCell align="right"><strong>Diferencia</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Movimientos</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Cargando...</TableCell>
              </TableRow>
            ) : reconciliations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No hay conciliaciones registradas</TableCell>
              </TableRow>
            ) : (
              reconciliations.slice(0, 10).map((recon) => (
                <TableRow key={recon.reconciliacion_id} hover>
                  <TableCell>
                    {new Date(recon.fecha_conciliacion).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>{recon.sucursal_nombre}</TableCell>
                  <TableCell align="right">
                    ${recon.total_sistema?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell align="right">
                    ${recon.total_banco?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={recon.diferencia > 50 ? 'error.main' : 'success.main'}
                    >
                      ${Math.abs(recon.diferencia || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={RECONCILIATION_STATUS[recon.estado_conciliacion]?.icon}
                      label={RECONCILIATION_STATUS[recon.estado_conciliacion]?.label}
                      color={RECONCILIATION_STATUS[recon.estado_conciliacion]?.color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${recon.total_movimientos || 0} movs`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver Detalles">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedReconciliation(recon);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Reconciliation Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>Nueva Conciliación Bancaria</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Step 1: Bank Information */}
            {activeStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Ingrese la información bancaria del día a conciliar
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Fecha de Conciliación"
                    value={formData.fecha_conciliacion}
                    onChange={(newValue) => setFormData({ ...formData, fecha_conciliacion: newValue })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Cuenta Bancaria</InputLabel>
                    <Select
                      value={formData.cuenta_bancaria_id}
                      label="Cuenta Bancaria"
                      onChange={(e) => setFormData({ ...formData, cuenta_bancaria_id: e.target.value })}
                    >
                      <MenuItem value="cuenta-1">BBVA - **** 1234</MenuItem>
                      <MenuItem value="cuenta-2">Santander - **** 5678</MenuItem>
                      <MenuItem value="cuenta-3">Banamex - **** 9012</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Saldo Inicial Banco"
                    type="number"
                    value={formData.saldo_inicial_banco}
                    onChange={(e) => setFormData({ ...formData, saldo_inicial_banco: parseFloat(e.target.value) })}
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Saldo Final Banco"
                    type="number"
                    value={formData.saldo_final_banco}
                    onChange={(e) => setFormData({ ...formData, saldo_final_banco: parseFloat(e.target.value) })}
                    InputProps={{ startAdornment: '$' }}
                  />
                </Grid>
              </Grid>
            )}

            {/* Step 2: Upload Bank Movements */}
            {activeStep === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Cargue el archivo de movimientos bancarios (formato CSV: fecha,concepto,referencia,monto,tipo)
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<Upload />}
                    sx={{ py: 4 }}
                  >
                    Cargar Archivo de Movimientos Bancarios
                    <input
                      type="file"
                      hidden
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </Button>
                </Grid>
                {bankMovements.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Movimientos Bancarios Cargados: {bankMovements.length}
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <TableContainer sx={{ maxHeight: 300 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Concepto</TableCell>
                                <TableCell>Referencia</TableCell>
                                <TableCell align="right">Monto</TableCell>
                                <TableCell>Tipo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {bankMovements.slice(0, 5).map((mov, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{mov.fecha}</TableCell>
                                  <TableCell>{mov.concepto}</TableCell>
                                  <TableCell>{mov.referencia}</TableCell>
                                  <TableCell align="right">
                                    ${mov.monto.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={mov.tipo}
                                      color={mov.tipo === 'ingreso' ? 'success' : 'error'}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        {bankMovements.length > 5 && (
                          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                            ... y {bankMovements.length - 5} movimientos más
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Step 3: Match Movements */}
            {activeStep === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
                      Concilie los movimientos bancarios con los del sistema
                    </Alert>
                    <Button
                      variant="contained"
                      onClick={autoMatch}
                      startIcon={<CompareArrows />}
                    >
                      Auto-Conciliar
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Movimientos Bancarios ({bankMovements.length})
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {bankMovements.map((mov) => (
                          <ListItem
                            key={mov.id}
                            sx={{
                              backgroundColor: matchedMovements.has(`bank-${mov.id}`)
                                ? 'success.light'
                                : 'transparent',
                            }}
                          >
                            <ListItemIcon>
                              <Checkbox
                                checked={matchedMovements.has(`bank-${mov.id}`)}
                                disabled
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${mov.concepto} - $${mov.monto.toLocaleString()}`}
                              secondary={`${mov.fecha} | ${mov.referencia}`}
                            />
                            {mov.tipo === 'ingreso' ? (
                              <TrendingUp color="success" />
                            ) : (
                              <TrendingDown color="error" />
                            )}
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Movimientos Sistema ({systemMovements.length})
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                        {systemMovements.map((mov) => (
                          <ListItem
                            key={mov.movimiento_id}
                            sx={{
                              backgroundColor: matchedMovements.has(`system-${mov.movimiento_id}`)
                                ? 'success.light'
                                : 'transparent',
                            }}
                          >
                            <ListItemIcon>
                              <Checkbox
                                checked={matchedMovements.has(`system-${mov.movimiento_id}`)}
                                disabled
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${mov.concepto} - $${mov.monto.toLocaleString()}`}
                              secondary={`${mov.fecha} | ${mov.folio}`}
                            />
                            {mov.tipo_movimiento === 'ingreso' ? (
                              <TrendingUp color="success" />
                            ) : (
                              <TrendingDown color="error" />
                            )}
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Step 4: Summary */}
            {activeStep === 3 && reconciliationSummary && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert 
                    severity={reconciliationSummary.estado === 'conciliado' ? 'success' : 'warning'}
                  >
                    {reconciliationSummary.estado === 'conciliado'
                      ? '✅ La conciliación está completa sin diferencias significativas'
                      : `⚠️ Hay una diferencia de $${reconciliationSummary.diferencia.toLocaleString()} que requiere revisión`}
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Resumen Bancario</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Saldo Inicial:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" align="right">
                            ${formData.saldo_inicial_banco.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="success.main">+ Ingresos:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" align="right" color="success.main">
                            ${reconciliationSummary.totalBankIngresos.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="error.main">- Egresos:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" align="right" color="error.main">
                            ${reconciliationSummary.totalBankEgresos.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}><Divider /></Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6">Saldo Final:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" align="right">
                            ${reconciliationSummary.bankBalance.toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Resumen Sistema</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">Movimientos:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" align="right">
                            {systemMovements.length}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="success.main">+ Ingresos:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" align="right" color="success.main">
                            ${reconciliationSummary.totalSystemIngresos.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="error.main">- Egresos:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" align="right" color="error.main">
                            ${reconciliationSummary.totalSystemEgresos.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}><Divider /></Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6">Saldo Final:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="h6" align="right">
                            ${reconciliationSummary.systemBalance.toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Estadísticas de Conciliación</Typography>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'success.light' }}>
                            <Typography variant="h4" color="success.dark">
                              {reconciliationSummary.matchedCount}
                            </Typography>
                            <Typography variant="body2">Movimientos Conciliados</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'warning.light' }}>
                            <Typography variant="h4" color="warning.dark">
                              {reconciliationSummary.unmatchedBank.length}
                            </Typography>
                            <Typography variant="body2">Banco Sin Conciliar</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'warning.light' }}>
                            <Typography variant="h4" color="warning.dark">
                              {reconciliationSummary.unmatchedSystem.length}
                            </Typography>
                            <Typography variant="body2">Sistema Sin Conciliar</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'info.light' }}>
                            <Typography variant="h4" color="info.dark">
                              ${reconciliationSummary.diferencia.toLocaleString()}
                            </Typography>
                            <Typography variant="body2">Diferencia Total</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Navigation Buttons */}
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button
                onClick={() => setActiveStep((prev) => prev - 1)}
                disabled={activeStep === 0}
              >
                Atrás
              </Button>
              <Box>
                <Button onClick={() => setCreateDialogOpen(false)} sx={{ mr: 2 }}>
                  Cancelar
                </Button>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handlePerformReconciliation}
                    startIcon={<CheckCircle />}
                  >
                    Confirmar Conciliación
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={
                      (activeStep === 0 && !formData.cuenta_bancaria_id) ||
                      (activeStep === 1 && bankMovements.length === 0)
                    }
                  >
                    Siguiente
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
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

export default BankReconciliation;
