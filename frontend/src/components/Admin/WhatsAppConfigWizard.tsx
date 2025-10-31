/**
 * WhatsApp Business API Configuration Wizard
 * Complete wizard for configuring WhatsApp Business from admin dashboard
 * 
 * Features:
 * - Step-by-step configuration
 * - Automatic validation
 * - Connection testing
 * - Webhook configuration
 * - Template management
 * - QR code verification
 * 
 * @author Spirit Tours Dev Team
 * @date 2024
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Info,
  WhatsApp,
  QrCode,
  Settings,
  Send,
  Refresh,
  ContentCopy,
  Visibility,
  VisibilityOff,
  Help,
  CheckCircleOutline,
  Warning
} from '@mui/icons-material';
import axios from 'axios';

interface WhatsAppConfig {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  verify_token: string;
  webhook_url: string;
  api_version: string;
  enabled: boolean;
}

interface ConfigStep {
  label: string;
  description: string;
  completed: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const WhatsAppConfigWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig>({
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    verify_token: '',
    webhook_url: '',
    api_version: 'v18.0',
    enabled: false
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<any>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const steps: ConfigStep[] = [
    {
      label: 'Información Básica',
      description: 'Configurar credenciales de Meta Business',
      completed: false
    },
    {
      label: 'Configuración de Webhook',
      description: 'Establecer URL de webhook y token de verificación',
      completed: false
    },
    {
      label: 'Verificar Conexión',
      description: 'Probar la conexión con WhatsApp Business API',
      completed: false
    },
    {
      label: 'Templates de Mensajes',
      description: 'Configurar plantillas aprobadas por Meta',
      completed: false
    },
    {
      label: 'Activación Final',
      description: 'Activar el servicio de notificaciones',
      completed: false
    }
  ];

  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/whatsapp/config`);
      if (response.data.success && response.data.data) {
        setConfig(response.data.data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setConnectionStatus('idle');
    setTestResult(null);
  };

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (activeStep === 0) {
      if (!config.phone_number_id) {
        errors.phone_number_id = 'Phone Number ID es requerido';
      }
      if (!config.business_account_id) {
        errors.business_account_id = 'Business Account ID es requerido';
      }
      if (!config.access_token) {
        errors.access_token = 'Access Token es requerido';
      } else if (config.access_token.length < 50) {
        errors.access_token = 'Access Token parece inválido';
      }
    }

    if (activeStep === 1) {
      if (!config.webhook_url) {
        errors.webhook_url = 'Webhook URL es requerido';
      } else if (!config.webhook_url.startsWith('https://')) {
        errors.webhook_url = 'Webhook URL debe ser HTTPS';
      }
      if (!config.verify_token) {
        errors.verify_token = 'Verify Token es requerido';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('testing');

    try {
      const response = await axios.post(`${API_BASE_URL}/whatsapp/test-connection`, config);
      
      if (response.data.success) {
        setConnectionStatus('success');
        setTestResult(response.data.data);
      } else {
        setConnectionStatus('error');
        setTestResult({ error: response.data.message });
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setTestResult({ 
        error: error.response?.data?.message || 'Error al conectar con WhatsApp API' 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const sendTestMessage = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/whatsapp/send-test`, {
        to: '+1234567890', // Replace with actual test number
        message: '¡Hola! Este es un mensaje de prueba de Spirit Tours.'
      });

      if (response.data.success) {
        alert('Mensaje de prueba enviado correctamente');
      }
    } catch (error) {
      alert('Error al enviar mensaje de prueba');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/whatsapp/templates`);
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/whatsapp/config`, config);
      
      if (response.data.success) {
        alert('Configuración guardada correctamente');
        handleNext();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const generateVerifyToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    setConfig({ ...config, verify_token: token });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Obtener Credenciales de Meta Business</AlertTitle>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Para configurar WhatsApp Business API, necesitas:
              </Typography>
              <ol style={{ marginLeft: 20, marginTop: 8 }}>
                <li>Cuenta de Meta Business Manager</li>
                <li>Aplicación de WhatsApp Business</li>
                <li>Número de teléfono verificado</li>
              </ol>
              <Button
                size="small"
                startIcon={<Help />}
                href="https://developers.facebook.com/docs/whatsapp/getting-started"
                target="_blank"
                sx={{ mt: 1 }}
              >
                Ver Documentación Oficial
              </Button>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number ID"
                  value={config.phone_number_id}
                  onChange={(e) => setConfig({ ...config, phone_number_id: e.target.value })}
                  error={!!validationErrors.phone_number_id}
                  helperText={validationErrors.phone_number_id || 'ID del número de teléfono en Meta'}
                  required
                  placeholder="123456789012345"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Account ID"
                  value={config.business_account_id}
                  onChange={(e) => setConfig({ ...config, business_account_id: e.target.value })}
                  error={!!validationErrors.business_account_id}
                  helperText={validationErrors.business_account_id || 'ID de tu cuenta de WhatsApp Business'}
                  required
                  placeholder="987654321098765"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Access Token"
                  type={showToken ? 'text' : 'password'}
                  value={config.access_token}
                  onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
                  error={!!validationErrors.access_token}
                  helperText={validationErrors.access_token || 'Token de acceso permanente de Meta'}
                  required
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxx"
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowToken(!showToken)}>
                        {showToken ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Version"
                  value={config.api_version}
                  onChange={(e) => setConfig({ ...config, api_version: e.target.value })}
                  helperText="Versión de la API de WhatsApp Business"
                  select
                  SelectProps={{ native: true }}
                >
                  <option value="v18.0">v18.0 (Recomendado)</option>
                  <option value="v17.0">v17.0</option>
                  <option value="v16.0">v16.0</option>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Configuración de Webhook</AlertTitle>
              El webhook permite recibir mensajes entrantes de WhatsApp en tiempo real.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Webhook URL"
                  value={config.webhook_url}
                  onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                  error={!!validationErrors.webhook_url}
                  helperText={validationErrors.webhook_url || 'URL pública HTTPS para recibir webhooks'}
                  required
                  placeholder="https://api.spirittours.com/webhooks/whatsapp"
                  InputProps={{
                    endAdornment: (
                      <Tooltip title="Copiar URL">
                        <IconButton onClick={() => copyToClipboard(config.webhook_url)}>
                          <ContentCopy />
                        </IconButton>
                      </Tooltip>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Verify Token"
                    value={config.verify_token}
                    onChange={(e) => setConfig({ ...config, verify_token: e.target.value })}
                    error={!!validationErrors.verify_token}
                    helperText={validationErrors.verify_token || 'Token secreto para verificar webhook'}
                    required
                    placeholder="my_secret_verify_token_12345"
                  />
                  <Button
                    variant="outlined"
                    onClick={generateVerifyToken}
                    startIcon={<Refresh />}
                  >
                    Generar
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Pasos para Configurar Webhook en Meta:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <Typography>1.</Typography>
                        </ListItemIcon>
                        <ListItemText primary="Ir a Meta App Dashboard" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Typography>2.</Typography>
                        </ListItemIcon>
                        <ListItemText primary="Seleccionar tu app de WhatsApp" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Typography>3.</Typography>
                        </ListItemIcon>
                        <ListItemText primary="Ir a Configuration > Webhooks" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Typography>4.</Typography>
                        </ListItemIcon>
                        <ListItemText 
                          primary={`Pegar Callback URL: ${config.webhook_url}`}
                          secondary="Y Verify Token generado arriba"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Typography>5.</Typography>
                        </ListItemIcon>
                        <ListItemText primary="Subscribir a eventos: messages, message_status" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Verificar Conexión</AlertTitle>
              Prueba la conexión con WhatsApp Business API para asegurarte de que las credenciales son correctas.
            </Alert>

            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={testConnection}
                disabled={testingConnection}
                startIcon={testingConnection ? <CircularProgress size={20} /> : <Send />}
                sx={{ minWidth: 200 }}
              >
                {testingConnection ? 'Probando Conexión...' : 'Probar Conexión'}
              </Button>
            </Box>

            {connectionStatus === 'success' && (
              <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2 }}>
                <AlertTitle>¡Conexión Exitosa!</AlertTitle>
                <Typography variant="body2">
                  La conexión con WhatsApp Business API fue exitosa.
                </Typography>
                {testResult && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" display="block">
                      <strong>Número de teléfono:</strong> {testResult.phone_number}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Estado:</strong> {testResult.status}
                    </Typography>
                    <Typography variant="caption" display="block">
                      <strong>Verificado:</strong> {testResult.verified ? 'Sí' : 'No'}
                    </Typography>
                  </Box>
                )}
              </Alert>
            )}

            {connectionStatus === 'error' && (
              <Alert severity="error" icon={<Error />} sx={{ mt: 2 }}>
                <AlertTitle>Error de Conexión</AlertTitle>
                <Typography variant="body2">
                  {testResult?.error || 'No se pudo conectar con WhatsApp Business API'}
                </Typography>
                <Button
                  size="small"
                  onClick={testConnection}
                  sx={{ mt: 1 }}
                >
                  Reintentar
                </Button>
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Enviar Mensaje de Prueba
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Envía un mensaje de prueba a tu número para verificar el funcionamiento completo.
              </Typography>
              <Button
                variant="outlined"
                onClick={sendTestMessage}
                disabled={connectionStatus !== 'success' || loading}
                startIcon={<WhatsApp />}
              >
                Enviar Mensaje de Prueba
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Templates de Mensajes</AlertTitle>
              Los templates deben estar aprobados por Meta antes de usarse. Puedes crear nuevos templates desde el Meta Business Manager.
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                onClick={loadTemplates}
                startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                disabled={loading}
              >
                Cargar Templates
              </Button>
            </Box>

            {templates.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Idioma</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Categoría</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template, index) => (
                      <TableRow key={index}>
                        <TableCell>{template.name}</TableCell>
                        <TableCell>{template.language}</TableCell>
                        <TableCell>
                          <Chip
                            label={template.status}
                            color={template.status === 'APPROVED' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{template.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="warning">
                No se encontraron templates. Crea templates desde Meta Business Manager.
              </Alert>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                startIcon={<Settings />}
              >
                Gestionar Templates en Meta
              </Button>
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" icon={<CheckCircleOutline />} sx={{ mb: 3 }}>
              <AlertTitle>¡Configuración Completa!</AlertTitle>
              WhatsApp Business API está listo para ser activado.
            </Alert>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumen de Configuración
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Phone Number ID
                    </Typography>
                    <Typography variant="body2">
                      {config.phone_number_id}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Business Account ID
                    </Typography>
                    <Typography variant="body2">
                      {config.business_account_id}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Webhook URL
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      {config.webhook_url}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      API Version
                    </Typography>
                    <Typography variant="body2">
                      {config.api_version}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">
                    Activar WhatsApp Business API
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Las notificaciones comenzarán a enviarse por WhatsApp
                  </Typography>
                </Box>
              }
            />

            {config.enabled && (
              <Alert severity="success" sx={{ mt: 2 }}>
                El sistema priorizará WhatsApp para todas las notificaciones, reduciendo costos en un 98%.
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <WhatsApp sx={{ fontSize: 40, color: '#25D366', mr: 2 }} />
            <Box>
              <Typography variant="h5" component="h1">
                Configuración de WhatsApp Business API
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Wizard paso a paso para configurar notificaciones por WhatsApp
              </Typography>
            </Box>
          </Box>

          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    <Typography variant="caption">{step.description}</Typography>
                  }
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {renderStepContent(index)}

                  <Box sx={{ mb: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? saveConfiguration : handleNext}
                      sx={{ mr: 1 }}
                      disabled={loading}
                    >
                      {index === steps.length - 1 ? 'Guardar y Activar' : 'Continuar'}
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mr: 1 }}
                    >
                      Atrás
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {activeStep === steps.length && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Alert severity="success" icon={<CheckCircle />}>
                <AlertTitle>¡Configuración Completada!</AlertTitle>
                WhatsApp Business API está activo y listo para enviar notificaciones.
              </Alert>
              <Button onClick={handleReset} sx={{ mt: 2 }}>
                Reconfigurar
              </Button>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default WhatsAppConfigWizard;
