import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Divider,
  Avatar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Email as EmailIcon,
  Psychology as AIIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  Visibility,
  VisibilityOff,
  PlayArrow as TestIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  ArrowForward,
  ArrowBack,
  RestartAlt,
} from '@mui/icons-material';
import axios from 'axios';

// Constants
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
interface WizardProgress {
  current_step: number;
  completed_steps: number[];
  step_data: Record<string, any>;
  is_completed: boolean;
}

interface SMTPConfig {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
}

interface AIProviderConfig {
  provider: string;
  api_key: string;
  default_model: string;
  max_tokens: number;
  temperature: number;
  priority: number;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface Props {
  onComplete: () => void;
}

const WIZARD_STEPS = [
  { label: 'Bienvenida', description: 'Introducción al asistente de configuración' },
  { label: 'Configuración SMTP', description: 'Configure el sistema de correo electrónico' },
  { label: 'Proveedores de IA', description: 'Configure proveedores de inteligencia artificial' },
  { label: 'Ajustes del Sistema', description: 'Configure preferencias generales' },
  { label: 'Pruebas', description: 'Verifique todas las configuraciones' },
  { label: 'Finalización', description: 'Resumen y confirmación' },
];

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5)', icon: '🤖', recommended: true },
  { value: 'google', label: 'Google Gemini', icon: '🔮', recommended: true },
  { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠', recommended: true },
  { value: 'xai', label: 'X.AI Grok', icon: '🚀', recommended: false },
  { value: 'meta', label: 'Meta AI (Llama)', icon: '🦙', recommended: false },
  { value: 'qwen', label: 'Qwen/Alibaba', icon: '☁️', recommended: false },
  { value: 'deepseek', label: 'DeepSeek', icon: '🔍', recommended: false },
  { value: 'mistral', label: 'Mistral AI', icon: '🌊', recommended: false },
  { value: 'cohere', label: 'Cohere', icon: '🎯', recommended: false },
  { value: 'local', label: 'Local (Ollama/LM Studio)', icon: '💻', recommended: false },
];

const ConfigurationWizard: React.FC<Props> = ({ onComplete }) => {
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wizardProgress, setWizardProgress] = useState<WizardProgress | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  // SMTP Configuration State
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
    name: 'Default SMTP',
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'Sistema de Capacitación',
    use_tls: true,
    use_ssl: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [smtpTestResult, setSMTPTestResult] = useState<TestResult | null>(null);
  const [smtpTesting, setSMTPTesting] = useState(false);
  const [smtpConfigId, setSMTPConfigId] = useState<string | null>(null);
  
  // AI Provider Configuration State
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [aiProviderConfig, setAIProviderConfig] = useState<AIProviderConfig>({
    provider: 'openai',
    api_key: '',
    default_model: 'gpt-4',
    max_tokens: 2000,
    temperature: 0.7,
    priority: 1,
  });
  const [showAPIKey, setShowAPIKey] = useState(false);
  const [aiTestResult, setAITestResult] = useState<TestResult | null>(null);
  const [aiTesting, setAITesting] = useState(false);
  const [aiProviderConfigId, setAIProviderConfigId] = useState<string | null>(null);
  const [aiProviderTemplates, setAIProviderTemplates] = useState<Record<string, any>>({});
  
  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    enable_reminders: true,
    reminder_frequency: 'daily',
    enable_chatbot: true,
    chatbot_default_persona: 'priest',
    enable_gamification: true,
    enable_certificates: true,
  });
  
  // Testing State
  const [allTestsResult, setAllTestsResult] = useState<{
    smtp: boolean;
    ai: boolean;
    overall: boolean;
  } | null>(null);
  
  // Error State
  const [error, setError] = useState<string | null>(null);

  // Load wizard progress and AI provider templates on mount
  useEffect(() => {
    loadWizardProgress();
    loadAIProviderTemplates();
  }, []);

  const loadWizardProgress = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/configuration/wizard/progress`);
      const progress = response.data;
      setWizardProgress(progress);
      
      if (progress.current_step) {
        setActiveStep(progress.current_step);
      }
      
      if (progress.completed_steps) {
        setCompletedSteps(new Set(progress.completed_steps));
      }
      
      // Load saved step data if exists
      if (progress.step_data) {
        if (progress.step_data.smtp) {
          setSMTPConfig(prev => ({ ...prev, ...progress.step_data.smtp }));
          if (progress.step_data.smtp.config_id) {
            setSMTPConfigId(progress.step_data.smtp.config_id);
          }
        }
        if (progress.step_data.ai_provider) {
          setAIProviderConfig(prev => ({ ...prev, ...progress.step_data.ai_provider }));
          if (progress.step_data.ai_provider.config_id) {
            setAIProviderConfigId(progress.step_data.ai_provider.config_id);
          }
        }
        if (progress.step_data.system_settings) {
          setSystemSettings(prev => ({ ...prev, ...progress.step_data.system_settings }));
        }
      }
    } catch (err) {
      console.error('Error loading wizard progress:', err);
    }
  };

  const loadAIProviderTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/configuration/ai-providers/templates`);
      setAIProviderTemplates(response.data);
    } catch (err) {
      console.error('Error loading AI provider templates:', err);
    }
  };

  const saveWizardProgress = async (step: number, stepData?: any) => {
    try {
      const payload = {
        step_number: step,
        step_data: stepData || {},
        is_completed: step === WIZARD_STEPS.length - 1,
      };
      
      await axios.post(`${API_BASE}/api/configuration/wizard/step`, payload);
      
      // Update local state
      const newCompleted = new Set(completedSteps);
      newCompleted.add(step);
      setCompletedSteps(newCompleted);
    } catch (err) {
      console.error('Error saving wizard progress:', err);
      throw err;
    }
  };

  // SMTP Configuration Functions
  const handleSMTPFieldChange = (field: keyof SMTPConfig, value: any) => {
    setSMTPConfig(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const validateSMTPConfig = (): boolean => {
    if (!smtpConfig.host.trim()) {
      setError('El host SMTP es requerido');
      return false;
    }
    if (!smtpConfig.username.trim()) {
      setError('El usuario SMTP es requerido');
      return false;
    }
    if (!smtpConfig.password.trim()) {
      setError('La contraseña SMTP es requerida');
      return false;
    }
    if (!smtpConfig.from_email.trim()) {
      setError('El correo del remitente es requerido');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(smtpConfig.from_email)) {
      setError('El formato del correo del remitente no es válido');
      return false;
    }
    
    return true;
  };

  const saveSMTPConfig = async (): Promise<boolean> => {
    if (!validateSMTPConfig()) {
      return false;
    }

    setLoading(true);
    setError(null);
    
    try {
      let response;
      if (smtpConfigId) {
        // Update existing config
        response = await axios.put(`${API_BASE}/api/configuration/smtp/${smtpConfigId}`, smtpConfig);
      } else {
        // Create new config
        response = await axios.post(`${API_BASE}/api/configuration/smtp`, smtpConfig);
        setSMTPConfigId(response.data.id);
      }
      
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar configuración SMTP');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testSMTPConfig = async () => {
    if (!smtpConfigId) {
      // Need to save first
      const saved = await saveSMTPConfig();
      if (!saved) {
        return;
      }
    }
    
    setSMTPTesting(true);
    setSMTPTestResult(null);
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/configuration/smtp/${smtpConfigId}/test`,
        { test_email: smtpConfig.from_email }
      );
      
      setSMTPTestResult({
        success: response.data.success,
        message: response.data.message,
        details: response.data,
      });
    } catch (err: any) {
      setSMTPTestResult({
        success: false,
        message: err.response?.data?.detail || 'Error al probar configuración SMTP',
      });
    } finally {
      setSMTPTesting(false);
    }
  };

  // AI Provider Configuration Functions
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    
    // Load template defaults for this provider
    const template = aiProviderTemplates[provider];
    if (template) {
      setAIProviderConfig(prev => ({
        ...prev,
        provider: provider,
        default_model: template.default_model || '',
      }));
    } else {
      setAIProviderConfig(prev => ({
        ...prev,
        provider: provider,
      }));
    }
    
    setError(null);
  };

  const handleAIFieldChange = (field: keyof AIProviderConfig, value: any) => {
    setAIProviderConfig(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const validateAIConfig = (): boolean => {
    if (!aiProviderConfig.api_key.trim()) {
      setError('La API Key es requerida');
      return false;
    }
    if (!aiProviderConfig.default_model.trim()) {
      setError('El modelo por defecto es requerido');
      return false;
    }
    return true;
  };

  const saveAIProviderConfig = async (): Promise<boolean> => {
    if (!validateAIConfig()) {
      return false;
    }

    setLoading(true);
    setError(null);
    
    try {
      let response;
      if (aiProviderConfigId) {
        // Update existing config
        response = await axios.put(
          `${API_BASE}/api/configuration/ai-providers/${aiProviderConfigId}`,
          aiProviderConfig
        );
      } else {
        // Create new config
        response = await axios.post(
          `${API_BASE}/api/configuration/ai-providers`,
          aiProviderConfig
        );
        setAIProviderConfigId(response.data.id);
      }
      
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar configuración del proveedor de IA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const testAIProviderConfig = async () => {
    if (!aiProviderConfigId) {
      // Need to save first
      const saved = await saveAIProviderConfig();
      if (!saved) {
        return;
      }
    }
    
    setAITesting(true);
    setAITestResult(null);
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/configuration/ai-providers/${aiProviderConfigId}/test`,
        { prompt: '¿Funciona correctamente?' }
      );
      
      setAITestResult({
        success: response.data.success,
        message: response.data.message,
        details: response.data,
      });
    } catch (err: any) {
      setAITestResult({
        success: false,
        message: err.response?.data?.detail || 'Error al probar configuración del proveedor de IA',
      });
    } finally {
      setAITesting(false);
    }
  };

  // Navigation Functions
  const handleNext = async () => {
    setError(null);
    
    // Validate and save current step data
    let stepData: any = {};
    
    if (activeStep === 1) {
      // SMTP Configuration Step
      const saved = await saveSMTPConfig();
      if (!saved) {
        return;
      }
      stepData = {
        smtp: {
          ...smtpConfig,
          password: '***hidden***', // Don't save password in progress
          config_id: smtpConfigId,
        },
      };
    } else if (activeStep === 2) {
      // AI Provider Configuration Step
      const saved = await saveAIProviderConfig();
      if (!saved) {
        return;
      }
      stepData = {
        ai_provider: {
          ...aiProviderConfig,
          api_key: '***hidden***', // Don't save API key in progress
          config_id: aiProviderConfigId,
        },
      };
    } else if (activeStep === 3) {
      // System Settings Step
      stepData = {
        system_settings: systemSettings,
      };
    } else if (activeStep === 4) {
      // Testing Step - run all tests
      await runAllTests();
      if (!allTestsResult?.overall) {
        setError('Algunas pruebas fallaron. Por favor, revise las configuraciones.');
        return;
      }
    }
    
    // Save progress
    try {
      await saveWizardProgress(activeStep, stepData);
    } catch (err) {
      setError('Error al guardar progreso');
      return;
    }
    
    // Move to next step
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };

  const handleReset = () => {
    setActiveStep(0);
    setCompletedSteps(new Set());
    setSMTPTestResult(null);
    setAITestResult(null);
    setAllTestsResult(null);
    setError(null);
  };

  const runAllTests = async () => {
    setLoading(true);
    
    try {
      // Test SMTP
      let smtpSuccess = false;
      if (smtpConfigId) {
        try {
          const smtpResponse = await axios.post(
            `${API_BASE}/api/configuration/smtp/${smtpConfigId}/test`,
            { test_email: smtpConfig.from_email }
          );
          smtpSuccess = smtpResponse.data.success;
        } catch (err) {
          smtpSuccess = false;
        }
      }
      
      // Test AI Provider
      let aiSuccess = false;
      if (aiProviderConfigId) {
        try {
          const aiResponse = await axios.post(
            `${API_BASE}/api/configuration/ai-providers/${aiProviderConfigId}/test`,
            { prompt: 'Test de conectividad' }
          );
          aiSuccess = aiResponse.data.success;
        } catch (err) {
          aiSuccess = false;
        }
      }
      
      setAllTestsResult({
        smtp: smtpSuccess,
        ai: aiSuccess,
        overall: smtpSuccess && aiSuccess,
      });
      
      return smtpSuccess && aiSuccess;
    } catch (err) {
      setAllTestsResult({
        smtp: false,
        ai: false,
        overall: false,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // Save final wizard completion
    try {
      await saveWizardProgress(WIZARD_STEPS.length - 1, { completed: true });
      onComplete();
    } catch (err) {
      setError('Error al finalizar el wizard');
    }
  };

  // Render Step Content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderWelcomeStep();
      case 1:
        return renderSMTPConfigStep();
      case 2:
        return renderAIProviderConfigStep();
      case 3:
        return renderSystemSettingsStep();
      case 4:
        return renderTestingStep();
      case 5:
        return renderCompletionStep();
      default:
        return null;
    }
  };

  // Step 0: Welcome
  const renderWelcomeStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoIcon color="primary" />
        Bienvenido al Asistente de Configuración
      </Typography>
      
      <Alert severity="info" sx={{ my: 2 }}>
        Este asistente le guiará a través de la configuración inicial del sistema de capacitación.
      </Alert>
      
      <Card sx={{ my: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ¿Qué vamos a configurar?
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <EmailIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Sistema de Correo Electrónico (SMTP)"
                secondary="Para enviar recordatorios, notificaciones y certificados"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <AIIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Proveedores de Inteligencia Artificial"
                secondary="Para el chatbot de práctica y análisis de respuestas"
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Ajustes del Sistema"
                secondary="Preferencias generales y funcionalidades"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
      
      <Alert severity="success" sx={{ my: 2 }}>
        <Typography variant="body2">
          <strong>Tiempo estimado:</strong> 10-15 minutos
        </Typography>
        <Typography variant="body2">
          Puede pausar y continuar en cualquier momento. Su progreso se guardará automáticamente.
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Comenzar
        </Button>
      </Box>
    </Box>
  );

  // Step 1: SMTP Configuration
  const renderSMTPConfigStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon color="primary" />
        Configuración del Sistema de Correo Electrónico
      </Typography>
      
      <Alert severity="info" sx={{ my: 2 }}>
        Configure su servidor SMTP para enviar correos automáticos (recordatorios, certificados, notificaciones).
      </Alert>
      
      <Paper sx={{ p: 3, my: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre de la Configuración"
              value={smtpConfig.name}
              onChange={(e) => handleSMTPFieldChange('name', e.target.value)}
              placeholder="ej: Servidor Principal"
            />
          </Grid>
          
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              required
              label="Host SMTP"
              value={smtpConfig.host}
              onChange={(e) => handleSMTPFieldChange('host', e.target.value)}
              placeholder="ej: smtp.gmail.com"
              helperText="Servidor de correo saliente"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              required
              type="number"
              label="Puerto"
              value={smtpConfig.port}
              onChange={(e) => handleSMTPFieldChange('port', parseInt(e.target.value))}
              helperText="Común: 587 (TLS), 465 (SSL)"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Usuario / Email"
              value={smtpConfig.username}
              onChange={(e) => handleSMTPFieldChange('username', e.target.value)}
              placeholder="ej: notificaciones@empresa.com"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              type={showPassword ? 'text' : 'password'}
              label="Contraseña"
              value={smtpConfig.password}
              onChange={(e) => handleSMTPFieldChange('password', e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              type="email"
              label="Correo del Remitente"
              value={smtpConfig.from_email}
              onChange={(e) => handleSMTPFieldChange('from_email', e.target.value)}
              placeholder="ej: capacitacion@empresa.com"
              helperText="Dirección que aparecerá como remitente"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nombre del Remitente"
              value={smtpConfig.from_name}
              onChange={(e) => handleSMTPFieldChange('from_name', e.target.value)}
              placeholder="ej: Sistema de Capacitación"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={smtpConfig.use_tls}
                    onChange={(e) => handleSMTPFieldChange('use_tls', e.target.checked)}
                  />
                }
                label="Usar TLS (Recomendado para puerto 587)"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={smtpConfig.use_ssl}
                    onChange={(e) => handleSMTPFieldChange('use_ssl', e.target.checked)}
                  />
                }
                label="Usar SSL (Recomendado para puerto 465)"
              />
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={smtpTesting ? <CircularProgress size={20} /> : <TestIcon />}
            onClick={testSMTPConfig}
            disabled={smtpTesting || loading}
          >
            Probar Conexión
          </Button>
          
          {smtpTestResult && (
            <Alert
              severity={smtpTestResult.success ? 'success' : 'error'}
              sx={{ flex: 1 }}
            >
              {smtpTestResult.message}
            </Alert>
          )}
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Anterior
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Siguiente'}
        </Button>
      </Box>
    </Box>
  );

  // Step 2: AI Provider Configuration
  const renderAIProviderConfigStep = () => {
    const template = aiProviderTemplates[selectedProvider];
    
    return (
      <Box>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          Configuración de Proveedores de IA
        </Typography>
        
        <Alert severity="info" sx={{ my: 2 }}>
          Configure al menos un proveedor de IA para habilitar el chatbot de práctica y análisis inteligente.
        </Alert>
        
        <Paper sx={{ p: 3, my: 3 }}>
          <Typography variant="h6" gutterBottom>
            Seleccione un Proveedor de IA
          </Typography>
          
          <Grid container spacing={2} sx={{ my: 2 }}>
            {AI_PROVIDERS.map((provider) => (
              <Grid item xs={12} sm={6} md={4} key={provider.value}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: 2,
                    borderColor: selectedProvider === provider.value ? 'primary.main' : 'transparent',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                  onClick={() => handleProviderChange(provider.value)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h4">{provider.icon}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">{provider.label}</Typography>
                        {provider.recommended && (
                          <Chip label="Recomendado" size="small" color="primary" />
                        )}
                      </Box>
                      {selectedProvider === provider.value && (
                        <CheckCircleIcon color="primary" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          {template && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Proveedor:</strong> {template.name}
              </Typography>
              <Typography variant="body2">
                <strong>Modelos disponibles:</strong> {template.available_models?.join(', ')}
              </Typography>
              <Typography variant="body2">
                <strong>Características:</strong>{' '}
                {template.supports_streaming && '🔄 Streaming'}{' '}
                {template.supports_functions && '⚙️ Funciones'}{' '}
                {template.supports_vision && '👁️ Visión'}
              </Typography>
            </Alert>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                type={showAPIKey ? 'text' : 'password'}
                label="API Key"
                value={aiProviderConfig.api_key}
                onChange={(e) => handleAIFieldChange('api_key', e.target.value)}
                placeholder={`Ingrese su ${AI_PROVIDERS.find(p => p.value === selectedProvider)?.label} API Key`}
                helperText="Esta clave será encriptada antes de almacenarse"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowAPIKey(!showAPIKey)}
                        edge="end"
                      >
                        {showAPIKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {template && template.available_models && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Modelo por Defecto</InputLabel>
                  <Select
                    value={aiProviderConfig.default_model}
                    onChange={(e) => handleAIFieldChange('default_model', e.target.value)}
                    label="Modelo por Defecto"
                  >
                    {template.available_models.map((model: string) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Prioridad"
                value={aiProviderConfig.priority}
                onChange={(e) => handleAIFieldChange('priority', parseInt(e.target.value))}
                helperText="Mayor número = mayor prioridad (para múltiples proveedores)"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Máximo de Tokens"
                value={aiProviderConfig.max_tokens}
                onChange={(e) => handleAIFieldChange('max_tokens', parseInt(e.target.value))}
                helperText="Longitud máxima de respuesta"
                inputProps={{ min: 100, max: 32000 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Temperatura"
                value={aiProviderConfig.temperature}
                onChange={(e) => handleAIFieldChange('temperature', parseFloat(e.target.value))}
                helperText="Creatividad (0.0 = determinista, 1.0 = creativo)"
                inputProps={{ min: 0, max: 2, step: 0.1 }}
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={aiTesting ? <CircularProgress size={20} /> : <TestIcon />}
              onClick={testAIProviderConfig}
              disabled={aiTesting || loading}
            >
              Probar Conexión
            </Button>
            
            {aiTestResult && (
              <Alert
                severity={aiTestResult.success ? 'success' : 'error'}
                sx={{ flex: 1 }}
              >
                {aiTestResult.message}
                {aiTestResult.details?.response && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Respuesta: {aiTestResult.details.response}
                  </Typography>
                )}
              </Alert>
            )}
          </Box>
        </Paper>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={handleBack}
          >
            Anterior
          </Button>
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Siguiente'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Step 3: System Settings
  const renderSystemSettingsStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon color="primary" />
        Ajustes del Sistema
      </Typography>
      
      <Alert severity="info" sx={{ my: 2 }}>
        Configure las preferencias generales del sistema de capacitación.
      </Alert>
      
      <Paper sx={{ p: 3, my: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Sistema de Recordatorios
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={systemSettings.enable_reminders}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    enable_reminders: e.target.checked,
                  }))}
                />
              }
              label="Habilitar recordatorios automáticos por correo"
            />
            
            {systemSettings.enable_reminders && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Frecuencia de Recordatorios</InputLabel>
                <Select
                  value={systemSettings.reminder_frequency}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    reminder_frequency: e.target.value,
                  }))}
                  label="Frecuencia de Recordatorios"
                >
                  <MenuItem value="daily">Diario</MenuItem>
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="biweekly">Quincenal</MenuItem>
                </Select>
              </FormControl>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Chatbot de Práctica
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={systemSettings.enable_chatbot}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    enable_chatbot: e.target.checked,
                  }))}
                />
              }
              label="Habilitar chatbot de práctica con IA"
            />
            
            {systemSettings.enable_chatbot && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Persona por Defecto</InputLabel>
                <Select
                  value={systemSettings.chatbot_default_persona}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    chatbot_default_persona: e.target.value,
                  }))}
                  label="Persona por Defecto"
                >
                  <MenuItem value="priest">Padre Miguel (Sacerdote)</MenuItem>
                  <MenuItem value="pastor">Pastor David (Pastor Evangélico)</MenuItem>
                  <MenuItem value="travel_leader">María González (Líder de Grupo)</MenuItem>
                  <MenuItem value="regular_client">Carlos Méndez (Cliente Regular)</MenuItem>
                  <MenuItem value="difficult_client">Sra. Rodríguez (Cliente Difícil)</MenuItem>
                </Select>
              </FormControl>
            )}
          </Grid>
          
          <Grid item xs={12}>
            <Divider />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Gamificación y Certificados
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={systemSettings.enable_gamification}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    enable_gamification: e.target.checked,
                  }))}
                />
              }
              label="Habilitar sistema de puntos, logros y tabla de posiciones"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={systemSettings.enable_certificates}
                  onChange={(e) => setSystemSettings(prev => ({
                    ...prev,
                    enable_certificates: e.target.checked,
                  }))}
                />
              }
              label="Generar certificados automáticamente al completar módulos"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Anterior
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleNext}
        >
          Siguiente
        </Button>
      </Box>
    </Box>
  );

  // Step 4: Testing
  const renderTestingStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TestIcon color="primary" />
        Pruebas de Configuración
      </Typography>
      
      <Alert severity="info" sx={{ my: 2 }}>
        Vamos a verificar que todas las configuraciones funcionen correctamente.
      </Alert>
      
      <Paper sx={{ p: 3, my: 3 }}>
        {!allTestsResult ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Presione el botón para ejecutar las pruebas
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <TestIcon />}
              onClick={runAllTests}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Ejecutando Pruebas...' : 'Ejecutar Todas las Pruebas'}
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Resultados de las Pruebas
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  {allTestsResult.smtp ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Configuración SMTP"
                  secondary={
                    allTestsResult.smtp
                      ? 'Conexión exitosa. El sistema puede enviar correos.'
                      : 'Error en la conexión. Revise la configuración SMTP.'
                  }
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {allTestsResult.ai ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <ErrorIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Proveedor de IA"
                  secondary={
                    allTestsResult.ai
                      ? 'Conexión exitosa. El chatbot está listo para funcionar.'
                      : 'Error en la conexión. Revise la configuración del proveedor de IA.'
                  }
                />
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            {allTestsResult.overall ? (
              <Alert severity="success">
                <Typography variant="h6" gutterBottom>
                  ✅ Todas las pruebas pasaron exitosamente
                </Typography>
                <Typography variant="body2">
                  Su sistema está configurado correctamente y listo para usar.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error">
                <Typography variant="h6" gutterBottom>
                  ❌ Algunas pruebas fallaron
                </Typography>
                <Typography variant="body2">
                  Por favor, vuelva a los pasos anteriores para corregir las configuraciones con errores.
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={runAllTests}
                disabled={loading}
              >
                Volver a Probar
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Anterior
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={!allTestsResult?.overall}
        >
          Finalizar
        </Button>
      </Box>
    </Box>
  );

  // Step 5: Completion
  const renderCompletionStep = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
        ¡Configuración Completada!
      </Typography>
      
      <Alert severity="success" sx={{ my: 2 }}>
        El sistema ha sido configurado exitosamente y está listo para ser utilizado.
      </Alert>
      
      <Paper sx={{ p: 3, my: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resumen de Configuración
        </Typography>
        
        <Grid container spacing={2} sx={{ my: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <EmailIcon />
                  </Avatar>
                  <Typography variant="h6">Sistema SMTP</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Host:</strong> {smtpConfig.host}:{smtpConfig.port}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Usuario:</strong> {smtpConfig.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Remitente:</strong> {smtpConfig.from_name} {'<'}{smtpConfig.from_email}{'>'}
                </Typography>
                <Chip
                  label="Configurado ✓"
                  color="success"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <AIIcon />
                  </Avatar>
                  <Typography variant="h6">Proveedor de IA</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Proveedor:</strong>{' '}
                  {AI_PROVIDERS.find(p => p.value === aiProviderConfig.provider)?.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Modelo:</strong> {aiProviderConfig.default_model}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Temperatura:</strong> {aiProviderConfig.temperature}
                </Typography>
                <Chip
                  label="Configurado ✓"
                  color="success"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Funcionalidades Habilitadas
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color={systemSettings.enable_reminders ? 'success' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Recordatorios Automáticos"
              secondary={systemSettings.enable_reminders ? `Frecuencia: ${systemSettings.reminder_frequency}` : 'Deshabilitado'}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color={systemSettings.enable_chatbot ? 'success' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Chatbot de Práctica"
              secondary={systemSettings.enable_chatbot ? `Persona por defecto: ${systemSettings.chatbot_default_persona}` : 'Deshabilitado'}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color={systemSettings.enable_gamification ? 'success' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Gamificación"
              secondary={systemSettings.enable_gamification ? 'Puntos, logros y tabla de posiciones' : 'Deshabilitado'}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color={systemSettings.enable_certificates ? 'success' : 'disabled'} />
            </ListItemIcon>
            <ListItemText
              primary="Certificados"
              secondary={systemSettings.enable_certificates ? 'Generación automática habilitada' : 'Deshabilitado'}
            />
          </ListItem>
        </List>
      </Paper>
      
      <Alert severity="info" sx={{ my: 2 }}>
        <Typography variant="body2">
          <strong>Próximos pasos:</strong>
        </Typography>
        <Typography variant="body2">
          1. Cree módulos de capacitación en el panel de administración
        </Typography>
        <Typography variant="body2">
          2. Agregue lecciones, videos y materiales
        </Typography>
        <Typography variant="body2">
          3. Configure cuestionarios y evaluaciones
        </Typography>
        <Typography variant="body2">
          4. Invite a los empleados a comenzar su capacitación
        </Typography>
      </Alert>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Anterior
        </Button>
        <Button
          variant="contained"
          color="success"
          size="large"
          endIcon={<CheckCircleIcon />}
          onClick={handleComplete}
        >
          Completar Configuración
        </Button>
      </Box>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {WIZARD_STEPS.map((step, index) => (
            <Step key={step.label} completed={completedSteps.has(index)}>
              <StepLabel
                optional={
                  <Typography variant="caption">{step.description}</Typography>
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {renderStepContent(index)}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Container>
  );
};

export default ConfigurationWizard;
