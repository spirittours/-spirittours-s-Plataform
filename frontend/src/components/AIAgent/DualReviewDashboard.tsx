/**
 * Dual Review Dashboard - React Component
 * 
 * Dashboard para que administradores y contables gestionen el sistema de revisión dual.
 * Permite activar/desactivar procesamiento automático, configurar umbrales y gestionar
 * la cola de revisiones pendientes.
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Badge,
  IconButton,
  Tooltip,
  LinearProgress,
  FormGroup,
  Checkbox
} from '@mui/material';
import {
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Settings as SettingsIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assessment as StatsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

interface DualReviewConfig {
  autoProcessing: {
    enabled: boolean;
    label: string;
    lastModifiedBy?: string;
    lastModifiedAt?: Date;
  };
  autoProcessingThresholds: {
    maxAmount: {
      USD: number;
      MXN: number;
    };
    riskScore: {
      maxScore: number;
      description: string;
    };
    fraudConfidence: {
      maxConfidence: number;
      description: string;
    };
  };
  mandatoryReviewCases: {
    newVendor: boolean;
    newCustomer: boolean;
    highRiskCountry: boolean;
    executiveExpense: boolean;
    intercompanyTransaction: boolean;
    foreignCurrency: boolean;
    manualJournalEntry: boolean;
  };
}

interface ReviewQueueItem {
  _id: string;
  transactionId: string;
  transactionType: string;
  transactionData: {
    amount: number;
    currency: string;
    description: string;
    date: Date;
  };
  aiAnalysis: {
    riskScore: number;
    fraudConfidence: number;
    recommendations: string[];
  };
  reviewReason: {
    type: string;
    details: string;
  };
  status: string;
  priority: string;
  createdAt: Date;
  dueDate: Date;
  assignedTo?: {
    name: string;
    email: string;
  };
}

interface Props {
  organizationId: string;
  branchId?: string;
  country: 'USA' | 'Mexico';
  userRole: 'admin' | 'headAccountant' | 'accountant' | 'assistant';
}

const DualReviewDashboard: React.FC<Props> = ({ 
  organizationId, 
  branchId, 
  country,
  userRole 
}) => {
  // Estados
  const [config, setConfig] = useState<DualReviewConfig | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState({
    reason: '',
    comments: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // Cargar datos al montar
  useEffect(() => {
    loadConfig();
    loadReviewQueue();
    loadStatistics();
  }, [organizationId, branchId, country]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTab === 1) { // Solo refrescar cola si está visible
        loadReviewQueue();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentTab]);

  /**
   * Cargar configuración
   */
  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ai-agent/dual-review/config', {
        params: { organizationId, branchId, country }
      });
      setConfig(response.data.data);
    } catch (error: any) {
      showSnackbar('Error al cargar configuración', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cargar cola de revisiones
   */
  const loadReviewQueue = async () => {
    try {
      const response = await axios.get('/api/ai-agent/dual-review/queue', {
        params: { organizationId, branchId, limit: 100 }
      });
      setReviewQueue(response.data.data);
    } catch (error: any) {
      showSnackbar('Error al cargar cola de revisiones', 'error');
      console.error(error);
    }
  };

  /**
   * Cargar estadísticas
   */
  const loadStatistics = async () => {
    try {
      const response = await axios.get('/api/ai-agent/dual-review/statistics', {
        params: { organizationId }
      });
      setStatistics(response.data.data);
    } catch (error: any) {
      showSnackbar('Error al cargar estadísticas', 'error');
      console.error(error);
    }
  };

  /**
   * 🔴 Toggle procesamiento automático ON/OFF
   */
  const handleToggleAutoProcessing = async (enabled: boolean) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai-agent/dual-review/toggle', {
        organizationId,
        branchId,
        country,
        enabled
      });
      
      setConfig(response.data.data);
      showSnackbar(response.data.message, 'success');
    } catch (error: any) {
      showSnackbar('Error al cambiar procesamiento automático', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar umbrales
   */
  const handleUpdateThresholds = async () => {
    try {
      setLoading(true);
      const response = await axios.put('/api/ai-agent/dual-review/config', {
        organizationId,
        branchId,
        country,
        updates: {
          autoProcessingThresholds: config?.autoProcessingThresholds
        }
      });
      
      setConfig(response.data.data);
      showSnackbar('Umbrales actualizados exitosamente', 'success');
    } catch (error: any) {
      showSnackbar('Error al actualizar umbrales', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar casos de revisión obligatoria
   */
  const handleUpdateMandatoryCases = async () => {
    try {
      setLoading(true);
      const response = await axios.put('/api/ai-agent/dual-review/config', {
        organizationId,
        branchId,
        country,
        updates: {
          mandatoryReviewCases: config?.mandatoryReviewCases
        }
      });
      
      setConfig(response.data.data);
      showSnackbar('Casos obligatorios actualizados', 'success');
    } catch (error: any) {
      showSnackbar('Error al actualizar casos obligatorios', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Aprobar transacción
   */
  const handleApprove = async () => {
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      await axios.post('/api/ai-agent/dual-review/approve', {
        queueItemId: selectedItem._id,
        decision: reviewDecision
      });
      
      showSnackbar('Transacción aprobada exitosamente', 'success');
      setReviewDialogOpen(false);
      loadReviewQueue();
      loadStatistics();
    } catch (error: any) {
      showSnackbar('Error al aprobar transacción', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Rechazar transacción
   */
  const handleReject = async () => {
    if (!selectedItem || !reviewDecision.reason) {
      showSnackbar('Debe proporcionar una razón para el rechazo', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/ai-agent/dual-review/reject', {
        queueItemId: selectedItem._id,
        decision: reviewDecision
      });
      
      showSnackbar('Transacción rechazada', 'success');
      setReviewDialogOpen(false);
      loadReviewQueue();
      loadStatistics();
    } catch (error: any) {
      showSnackbar('Error al rechazar transacción', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mostrar snackbar
   */
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  /**
   * Obtener color de prioridad
   */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  /**
   * Formatear moneda
   */
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (!config) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Sistema de Revisión Dual AI + Humano
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadConfig();
            loadReviewQueue();
            loadStatistics();
          }}
        >
          Refrescar
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label="Configuración" icon={<SettingsIcon />} iconPosition="start" />
        <Tab 
          label={
            <Badge badgeContent={reviewQueue.filter(r => r.status === 'pending').length} color="error">
              Cola de Revisión
            </Badge>
          } 
          icon={<WarningIcon />} 
          iconPosition="start" 
        />
        <Tab label="Estadísticas" icon={<StatsIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 1: Configuración */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          {/* 🔴 Toggle Principal */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Procesamiento Automático IA
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.autoProcessing.enabled 
                        ? '✅ ACTIVADO: El AI procesa automáticamente transacciones que cumplan los umbrales'
                        : '🔴 DESACTIVADO: Todas las transacciones requieren revisión humana'
                      }
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.autoProcessing.enabled}
                        onChange={(e) => handleToggleAutoProcessing(e.target.checked)}
                        color="primary"
                        size="medium"
                        disabled={loading || userRole === 'assistant'}
                      />
                    }
                    label=""
                  />
                </Box>
                
                {config.autoProcessing.lastModifiedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Última modificación: {new Date(config.autoProcessing.lastModifiedAt).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Umbrales de Procesamiento Automático */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Umbrales de Monto
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Monto máximo para procesamiento automático
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>
                    USD: {formatCurrency(config.autoProcessingThresholds.maxAmount.USD, 'USD')}
                  </Typography>
                  <Slider
                    value={config.autoProcessingThresholds.maxAmount.USD}
                    onChange={(_, value) => {
                      setConfig({
                        ...config,
                        autoProcessingThresholds: {
                          ...config.autoProcessingThresholds,
                          maxAmount: {
                            ...config.autoProcessingThresholds.maxAmount,
                            USD: value as number
                          }
                        }
                      });
                    }}
                    min={1000}
                    max={100000}
                    step={1000}
                    marks={[
                      { value: 1000, label: '$1K' },
                      { value: 50000, label: '$50K' },
                      { value: 100000, label: '$100K' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `$${(value / 1000).toFixed(0)}K`}
                    disabled={loading || userRole === 'assistant'}
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>
                    MXN: {formatCurrency(config.autoProcessingThresholds.maxAmount.MXN, 'MXN')}
                  </Typography>
                  <Slider
                    value={config.autoProcessingThresholds.maxAmount.MXN}
                    onChange={(_, value) => {
                      setConfig({
                        ...config,
                        autoProcessingThresholds: {
                          ...config.autoProcessingThresholds,
                          maxAmount: {
                            ...config.autoProcessingThresholds.maxAmount,
                            MXN: value as number
                          }
                        }
                      });
                    }}
                    min={20000}
                    max={2000000}
                    step={10000}
                    marks={[
                      { value: 20000, label: '$20K' },
                      { value: 1000000, label: '$1M' },
                      { value: 2000000, label: '$2M' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `$${(value / 1000).toFixed(0)}K`}
                    disabled={loading || userRole === 'assistant'}
                  />
                </Box>

                <Button
                  variant="contained"
                  onClick={handleUpdateThresholds}
                  disabled={loading || userRole === 'assistant'}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Guardar Umbrales de Monto
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Umbrales de Riesgo y Fraude */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Umbrales de Riesgo y Fraude
                </Typography>
                
                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>
                    Score de Riesgo Máximo: {config.autoProcessingThresholds.riskScore.maxScore}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    {config.autoProcessingThresholds.riskScore.description}
                  </Typography>
                  <Slider
                    value={config.autoProcessingThresholds.riskScore.maxScore}
                    onChange={(_, value) => {
                      setConfig({
                        ...config,
                        autoProcessingThresholds: {
                          ...config.autoProcessingThresholds,
                          riskScore: {
                            ...config.autoProcessingThresholds.riskScore,
                            maxScore: value as number
                          }
                        }
                      });
                    }}
                    min={0}
                    max={100}
                    step={5}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                    valueLabelDisplay="auto"
                    disabled={loading || userRole === 'assistant'}
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>
                    Confianza de Fraude Máxima: {config.autoProcessingThresholds.fraudConfidence.maxConfidence}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                    {config.autoProcessingThresholds.fraudConfidence.description}
                  </Typography>
                  <Slider
                    value={config.autoProcessingThresholds.fraudConfidence.maxConfidence}
                    onChange={(_, value) => {
                      setConfig({
                        ...config,
                        autoProcessingThresholds: {
                          ...config.autoProcessingThresholds,
                          fraudConfidence: {
                            ...config.autoProcessingThresholds.fraudConfidence,
                            maxConfidence: value as number
                          }
                        }
                      });
                    }}
                    min={0}
                    max={100}
                    step={5}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                    valueLabelDisplay="auto"
                    disabled={loading || userRole === 'assistant'}
                  />
                </Box>

                <Button
                  variant="contained"
                  onClick={handleUpdateThresholds}
                  disabled={loading || userRole === 'assistant'}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Guardar Umbrales de Riesgo
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Casos de Revisión Obligatoria */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Casos de Revisión Obligatoria
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Transacciones que SIEMPRE requieren revisión humana (ignoran umbrales)
                </Typography>
                
                <FormGroup sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.newVendor}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  newVendor: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="Proveedor Nuevo"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.newCustomer}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  newCustomer: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="Cliente Nuevo"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.highRiskCountry}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  highRiskCountry: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="País Alto Riesgo"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.executiveExpense}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  executiveExpense: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="Gasto de Ejecutivos"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.intercompanyTransaction}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  intercompanyTransaction: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="Transacción Entre Empresas"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.foreignCurrency}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  foreignCurrency: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="Moneda Extranjera"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={config.mandatoryReviewCases.manualJournalEntry}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                mandatoryReviewCases: {
                                  ...config.mandatoryReviewCases,
                                  manualJournalEntry: e.target.checked
                                }
                              });
                            }}
                            disabled={loading || userRole === 'assistant'}
                          />
                        }
                        label="Asiento Manual"
                      />
                    </Grid>
                  </Grid>
                </FormGroup>

                <Button
                  variant="contained"
                  onClick={handleUpdateMandatoryCases}
                  disabled={loading || userRole === 'assistant'}
                  sx={{ mt: 2 }}
                >
                  Guardar Casos Obligatorios
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Cola de Revisión */}
      {currentTab === 1 && (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Prioridad</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Riesgo</TableCell>
                    <TableCell>Fraude</TableCell>
                    <TableCell>Razón</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Creado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviewQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay transacciones pendientes de revisión
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reviewQueue.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <Chip 
                            label={item.priority.toUpperCase()} 
                            color={getPriorityColor(item.priority)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{item.transactionType}</TableCell>
                        <TableCell>
                          {formatCurrency(item.transactionData.amount, item.transactionData.currency)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${item.aiAnalysis.riskScore}%`}
                            color={item.aiAnalysis.riskScore > 60 ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${item.aiAnalysis.fraudConfidence}%`}
                            color={item.aiAnalysis.fraudConfidence > 60 ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={item.reviewReason.details}>
                            <Chip label={item.reviewReason.type} size="small" />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip label={item.status} size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(item.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedItem(item);
                              setReviewDialogOpen(true);
                            }}
                            disabled={userRole === 'assistant'}
                          >
                            Revisar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Estadísticas */}
      {currentTab === 2 && statistics && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Revisadas</Typography>
                <Typography variant="h3">{statistics.inMemoryStats.totalReviewed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Auto-Procesadas</Typography>
                <Typography variant="h3" color="success.main">
                  {statistics.inMemoryStats.autoProcessed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Aprobadas</Typography>
                <Typography variant="h3" color="primary.main">
                  {statistics.inMemoryStats.approved}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Rechazadas</Typography>
                <Typography variant="h3" color="error.main">
                  {statistics.inMemoryStats.rejected}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6">Tiempo Promedio de Revisión</Typography>
                <Typography variant="h4">
                  {statistics.avgReviewTimeMinutes.toFixed(1)} minutos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog de Revisión */}
      <Dialog 
        open={reviewDialogOpen} 
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Revisar Transacción</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Tipo:</strong> {selectedItem.transactionType}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Monto:</strong> {formatCurrency(
                        selectedItem.transactionData.amount, 
                        selectedItem.transactionData.currency
                      )}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Descripción:</strong> {selectedItem.transactionData.description}
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid item xs={6}>
                  <Alert severity={selectedItem.aiAnalysis.riskScore > 60 ? 'error' : 'success'}>
                    <Typography variant="body2">
                      <strong>Score de Riesgo:</strong> {selectedItem.aiAnalysis.riskScore}%
                    </Typography>
                  </Alert>
                </Grid>
                
                <Grid item xs={6}>
                  <Alert severity={selectedItem.aiAnalysis.fraudConfidence > 60 ? 'error' : 'success'}>
                    <Typography variant="body2">
                      <strong>Confianza de Fraude:</strong> {selectedItem.aiAnalysis.fraudConfidence}%
                    </Typography>
                  </Alert>
                </Grid>
                
                {selectedItem.aiAnalysis.recommendations.length > 0 && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      <Typography variant="body2" gutterBottom>
                        <strong>Recomendaciones AI:</strong>
                      </Typography>
                      <ul>
                        {selectedItem.aiAnalysis.recommendations.map((rec, i) => (
                          <li key={i}><Typography variant="body2">{rec}</Typography></li>
                        ))}
                      </ul>
                    </Alert>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    label="Razón de la Decisión"
                    multiline
                    rows={2}
                    fullWidth
                    value={reviewDecision.reason}
                    onChange={(e) => setReviewDecision({
                      ...reviewDecision,
                      reason: e.target.value
                    })}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Comentarios Adicionales"
                    multiline
                    rows={3}
                    fullWidth
                    value={reviewDecision.comments}
                    onChange={(e) => setReviewDecision({
                      ...reviewDecision,
                      comments: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setReviewDialogOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleReject}
            color="error"
            startIcon={<RejectIcon />}
            disabled={loading}
          >
            Rechazar
          </Button>
          <Button 
            onClick={handleApprove}
            color="success"
            startIcon={<ApproveIcon />}
            variant="contained"
            disabled={loading}
          >
            Aprobar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      {snackbar.open && (
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
};

export default DualReviewDashboard;
