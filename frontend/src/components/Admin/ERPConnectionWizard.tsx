/**
 * ERP Connection Wizard
 * 
 * Asistente paso a paso para conectar nuevos sistemas ERP.
 * Maneja el flujo completo de OAuth 2.0 y configuración inicial.
 * 
 * Funcionalidades:
 * - Selección de proveedor ERP por región
 * - Flujo OAuth 2.0 automático
 * - Configuración de opciones de sincronización
 * - Validación de conexión
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface ERPConnectionWizardProps {
  open: boolean;
  onClose: () => void;
  branchId: string | null;
  onSuccess: () => void;
}

interface ERPProvider {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  features: string[];
}

const steps = ['Seleccionar ERP', 'Autenticación OAuth', 'Configuración', 'Verificación'];

const ERPConnectionWizard: React.FC<ERPConnectionWizardProps> = ({
  open,
  onClose,
  branchId,
  onSuccess
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [availableProviders, setAvailableProviders] = useState<ERPProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);

  // Configuration options
  const [syncCustomers, setSyncCustomers] = useState(true);
  const [syncInvoices, setSyncInvoices] = useState(true);
  const [syncPayments, setSyncPayments] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    if (open && branchId) {
      fetchAvailableProviders();
    }
  }, [open, branchId]);

  useEffect(() => {
    // Listen for OAuth callback
    const handleOAuthCallback = (event: MessageEvent) => {
      if (event.data.type === 'OAUTH_CALLBACK_SUCCESS') {
        handleOAuthSuccess(event.data.state, event.data.code);
      } else if (event.data.type === 'OAUTH_CALLBACK_ERROR') {
        handleOAuthError(event.data.error);
      }
    };

    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, [oauthState]);

  const fetchAvailableProviders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/erp-hub/available-adapters/${branchId}`);
      setAvailableProviders(response.data.adapters || []);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      toast.error('Error al cargar proveedores ERP disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Step 1: Provider selected, initiate OAuth
      if (!selectedProvider) {
        setError('Por favor selecciona un proveedor ERP');
        return;
      }
      await initiateOAuth();
    } else if (activeStep === 1) {
      // Step 2: OAuth completed, move to configuration
      setActiveStep(2);
    } else if (activeStep === 2) {
      // Step 3: Configuration saved, test connection
      await testConnection();
    } else if (activeStep === 3) {
      // Step 4: Verification complete, finish
      onSuccess();
      handleClose();
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedProvider('');
    setOauthUrl(null);
    setOauthState(null);
    setConnectionTested(false);
    setError(null);
    onClose();
  };

  const initiateOAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      const redirectUri = `${window.location.origin}/oauth-callback`;
      
      const response = await axios.post('/api/erp-hub/oauth/authorize', {
        sucursalId: branchId,
        provider: selectedProvider,
        redirectUri: redirectUri
      });

      const { authorizationUrl, state } = response.data;
      
      setOauthUrl(authorizationUrl);
      setOauthState(state);

      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        authorizationUrl,
        'ERP OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

    } catch (err: any) {
      console.error('Error initiating OAuth:', err);
      setError(err.response?.data?.error || 'Error al iniciar autenticación');
      toast.error('Error al iniciar autenticación OAuth');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSuccess = async (state: string, code: string) => {
    if (state !== oauthState) {
      setError('Estado OAuth inválido');
      return;
    }

    try {
      setLoading(true);
      
      // Exchange code for tokens
      await axios.post('/api/erp-hub/oauth/callback', {
        state: state,
        code: code
      });

      toast.success('Autenticación exitosa');
      setActiveStep(2); // Move to configuration step
      
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      setError(err.response?.data?.error || 'Error en callback OAuth');
      toast.error('Error al completar autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthError = (errorMessage: string) => {
    setError(`Error OAuth: ${errorMessage}`);
    toast.error(`Error en autenticación: ${errorMessage}`);
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save configuration first
      await axios.post(`/api/erp-hub/config/${branchId}/sync-options`, {
        provider: selectedProvider,
        syncCustomers,
        syncInvoices,
        syncPayments,
        autoSync
      });

      // Test connection
      const response = await axios.post(`/api/erp-hub/test-connection/${branchId}`, {
        provider: selectedProvider
      });

      if (response.data.success && response.data.connected) {
        setConnectionTested(true);
        toast.success('Conexión verificada exitosamente');
        setActiveStep(3); // Move to final step
      } else {
        throw new Error('Conexión no pudo ser verificada');
      }

    } catch (err: any) {
      console.error('Connection test error:', err);
      setError(err.response?.data?.error || 'Error al verificar conexión');
      toast.error('Error al verificar conexión');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selecciona el Sistema ERP a Conectar
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Estos son los sistemas ERP recomendados para tu región
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {availableProviders.map((provider) => (
                  <Grid item xs={12} key={provider.id}>
                    <Card 
                      variant={selectedProvider === provider.id ? 'outlined' : 'elevation'}
                      sx={{ 
                        border: selectedProvider === provider.id ? 2 : 0,
                        borderColor: 'primary.main'
                      }}
                    >
                      <CardActionArea onClick={() => setSelectedProvider(provider.id)}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6">
                              {provider.name}
                            </Typography>
                            <Chip 
                              label={provider.priority.toUpperCase()} 
                              color={getPriorityColor(provider.priority)} 
                              size="small" 
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {provider.description}
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            {provider.features.map((feature, idx) => (
                              <Chip 
                                key={idx}
                                label={feature} 
                                size="small" 
                                sx={{ mr: 1, mt: 1 }}
                                icon={<CheckIcon />}
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Autenticación OAuth 2.0
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Se abrió una nueva ventana para autenticación. Por favor autoriza el acceso de Spirit Tours 
                a tu cuenta de {availableProviders.find(p => p.id === selectedProvider)?.name}.
              </Typography>
            </Alert>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <CircularProgress sx={{ mr: 2 }} />
                <Typography>Esperando autorización...</Typography>
              </Box>
            )}

            {oauthUrl && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  ¿No se abrió la ventana de autorización?
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => window.open(oauthUrl, 'ERP OAuth')}
                >
                  Abrir Ventana de Autorización
                </Button>
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuración de Sincronización
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Configura qué datos deseas sincronizar con tu sistema ERP
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1">Sincronizar Clientes</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Los clientes de Spirit Tours se sincronizarán automáticamente
                    </Typography>
                  </Box>
                  <Button
                    variant={syncCustomers ? 'contained' : 'outlined'}
                    onClick={() => setSyncCustomers(!syncCustomers)}
                  >
                    {syncCustomers ? 'Activado' : 'Desactivado'}
                  </Button>
                </Box>
              </FormControl>

              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1">Sincronizar Facturas</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Las facturas generadas se enviarán al ERP automáticamente
                    </Typography>
                  </Box>
                  <Button
                    variant={syncInvoices ? 'contained' : 'outlined'}
                    onClick={() => setSyncInvoices(!syncInvoices)}
                  >
                    {syncInvoices ? 'Activado' : 'Desactivado'}
                  </Button>
                </Box>
              </FormControl>

              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1">Sincronizar Pagos</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Los pagos recibidos se registrarán en el ERP
                    </Typography>
                  </Box>
                  <Button
                    variant={syncPayments ? 'contained' : 'outlined'}
                    onClick={() => setSyncPayments(!syncPayments)}
                  >
                    {syncPayments ? 'Activado' : 'Desactivado'}
                  </Button>
                </Box>
              </FormControl>

              <FormControl fullWidth>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1">Sincronización Automática</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Los datos se sincronizarán automáticamente sin intervención manual
                    </Typography>
                  </Box>
                  <Button
                    variant={autoSync ? 'contained' : 'outlined'}
                    onClick={() => setAutoSync(!autoSync)}
                  >
                    {autoSync ? 'Activado' : 'Desactivado'}
                  </Button>
                </Box>
              </FormControl>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Verificación de Conexión
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <CircularProgress sx={{ mr: 2 }} />
                <Typography>Verificando conexión...</Typography>
              </Box>
            ) : connectionTested ? (
              <Alert severity="success" icon={<CheckIcon />}>
                <Typography variant="h6" gutterBottom>
                  ¡Conexión Exitosa!
                </Typography>
                <Typography variant="body2">
                  Tu sistema ERP ha sido conectado correctamente y está listo para sincronizar datos.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold">Configuración:</Typography>
                  <Typography variant="body2">• Clientes: {syncCustomers ? 'Activo' : 'Inactivo'}</Typography>
                  <Typography variant="body2">• Facturas: {syncInvoices ? 'Activo' : 'Inactivo'}</Typography>
                  <Typography variant="body2">• Pagos: {syncPayments ? 'Activo' : 'Inactivo'}</Typography>
                  <Typography variant="body2">• Auto-Sync: {autoSync ? 'Activo' : 'Inactivo'}</Typography>
                </Box>
              </Alert>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  Haz clic en "Siguiente" para verificar la conexión con tu sistema ERP.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Conectar Sistema ERP
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            {renderStepContent()}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={handleBack} disabled={loading}>
            Atrás
          </Button>
        )}
        <Button 
          onClick={handleNext} 
          variant="contained"
          disabled={loading || (activeStep === 0 && !selectedProvider)}
        >
          {activeStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ERPConnectionWizard;
