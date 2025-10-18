import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Slider,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff,
  Psychology as TestIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Psychology as AIIcon,
  Refresh as RefreshIcon,
  PlayArrow as ActivateIcon,
  Info as InfoIcon,
  ArrowUpward,
  ArrowDownward,
  Link as LinkIcon,
  Functions as FunctionsIcon,
  RemoveRedEye as VisionIcon,
  Speed as StreamIcon,
} from '@mui/icons-material';
import axios from 'axios';

// Constants
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
interface AIProviderConfig {
  id: string;
  provider: string;
  api_key: string;
  api_endpoint?: string;
  default_model: string;
  available_models: string[];
  max_tokens: number;
  temperature: number;
  priority: number;
  rate_limit_rpm?: number;
  rate_limit_tpm?: number;
  monthly_budget?: number;
  supports_streaming: boolean;
  supports_functions: boolean;
  supports_vision: boolean;
  is_active: boolean;
  is_default: boolean;
  status: string;
  last_test_at?: string;
  last_test_success?: boolean;
  created_at: string;
}

interface AIFormData {
  provider: string;
  api_key: string;
  api_endpoint?: string;
  default_model: string;
  max_tokens: number;
  temperature: number;
  priority: number;
  rate_limit_rpm?: number;
  rate_limit_tpm?: number;
  monthly_budget?: number;
}

interface ProviderTemplate {
  name: string;
  api_endpoint: string;
  default_model: string;
  available_models: string[];
  supports_streaming: boolean;
  supports_functions: boolean;
  supports_vision: boolean;
  description: string;
  setup_instructions: string;
}

interface TestResult {
  success: boolean;
  message: string;
  response?: string;
  details?: any;
}

const PROVIDER_INFO = [
  {
    value: 'openai',
    label: 'OpenAI',
    icon: '🤖',
    color: '#412991',
    recommended: true,
    description: 'GPT-4, GPT-3.5-Turbo - Líder en IA conversacional',
  },
  {
    value: 'google',
    label: 'Google Gemini',
    icon: '🔮',
    color: '#4285F4',
    recommended: true,
    description: 'Gemini Pro, Ultra - IA multimodal de Google',
  },
  {
    value: 'anthropic',
    label: 'Anthropic Claude',
    icon: '🧠',
    color: '#D4A574',
    recommended: true,
    description: 'Claude 3 Opus, Sonnet, Haiku - Conversación avanzada',
  },
  {
    value: 'xai',
    label: 'X.AI Grok',
    icon: '🚀',
    color: '#1DA1F2',
    recommended: false,
    description: 'Grok-1 - IA con humor y contexto en tiempo real',
  },
  {
    value: 'meta',
    label: 'Meta AI',
    icon: '🦙',
    color: '#0668E1',
    recommended: false,
    description: 'Llama 3, Llama 2 - Modelos open source',
  },
  {
    value: 'qwen',
    label: 'Qwen/Alibaba',
    icon: '☁️',
    color: '#FF6A00',
    recommended: false,
    description: 'Qwen 72B - IA multilingüe de Alibaba',
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    icon: '🔍',
    color: '#2C3E50',
    recommended: false,
    description: 'DeepSeek Chat, Coder - Especializado en código',
  },
  {
    value: 'mistral',
    label: 'Mistral AI',
    icon: '🌊',
    color: '#F7931A',
    recommended: false,
    description: 'Mistral Large, Medium - IA europea eficiente',
  },
  {
    value: 'cohere',
    label: 'Cohere',
    icon: '🎯',
    color: '#39CCCC',
    recommended: false,
    description: 'Command, Command-Light - Especializado en empresas',
  },
  {
    value: 'local',
    label: 'Local (Ollama/LM Studio)',
    icon: '💻',
    color: '#27AE60',
    recommended: false,
    description: 'Modelos locales sin costo de API',
  },
];

const AIProviderManualConfig: React.FC = () => {
  // State
  const [configs, setConfigs] = useState<AIProviderConfig[]>([]);
  const [templates, setTemplates] = useState<Record<string, ProviderTemplate>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null);
  const [providerInfoDialogOpen, setProviderInfoDialogOpen] = useState(false);
  const [selectedProviderInfo, setSelectedProviderInfo] = useState<typeof PROVIDER_INFO[0] | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<AIFormData>({
    provider: 'openai',
    api_key: '',
    api_endpoint: '',
    default_model: 'gpt-4',
    max_tokens: 2000,
    temperature: 0.7,
    priority: 1,
    rate_limit_rpm: 3500,
    rate_limit_tpm: 90000,
    monthly_budget: undefined,
  });
  const [showAPIKey, setShowAPIKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Test State
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testPrompt, setTestPrompt] = useState('Hola, ¿funciona correctamente?');

  // Load configurations and templates on mount
  useEffect(() => {
    loadConfigs();
    loadTemplates();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE}/api/configuration/ai-providers`);
      setConfigs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar configuraciones de IA');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/configuration/ai-providers/templates`);
      setTemplates(response.data);
    } catch (err) {
      console.error('Error loading AI provider templates:', err);
    }
  };

  const handleOpenDialog = (config?: AIProviderConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        provider: config.provider,
        api_key: '', // Don't populate API key for security
        api_endpoint: config.api_endpoint,
        default_model: config.default_model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        priority: config.priority,
        rate_limit_rpm: config.rate_limit_rpm,
        rate_limit_tpm: config.rate_limit_tpm,
        monthly_budget: config.monthly_budget,
      });
    } else {
      setEditingConfig(null);
      const defaultTemplate = templates['openai'];
      setFormData({
        provider: 'openai',
        api_key: '',
        api_endpoint: defaultTemplate?.api_endpoint || '',
        default_model: defaultTemplate?.default_model || 'gpt-4',
        max_tokens: 2000,
        temperature: 0.7,
        priority: 1,
        rate_limit_rpm: 3500,
        rate_limit_tpm: 90000,
        monthly_budget: undefined,
      });
    }
    setTestResult(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setTestResult(null);
    setError(null);
    setShowAdvanced(false);
  };

  const handleProviderChange = (provider: string) => {
    const template = templates[provider];
    if (template) {
      setFormData(prev => ({
        ...prev,
        provider: provider,
        api_endpoint: template.api_endpoint,
        default_model: template.default_model,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        provider: provider,
      }));
    }
    setError(null);
  };

  const handleFieldChange = (field: keyof AIFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.api_key.trim() && !editingConfig) {
      setError('La API Key es requerida');
      return false;
    }
    if (!formData.default_model.trim()) {
      setError('El modelo por defecto es requerido');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (editingConfig) {
        // Update existing config
        const updateData = { ...formData };
        if (!updateData.api_key) {
          // If API key is empty, don't send it (keep existing)
          delete (updateData as any).api_key;
        }
        
        await axios.put(`${API_BASE}/api/configuration/ai-providers/${editingConfig.id}`, updateData);
        setSuccess('Configuración actualizada exitosamente');
      } else {
        // Create new config
        await axios.post(`${API_BASE}/api/configuration/ai-providers`, formData);
        setSuccess('Configuración creada exitosamente');
      }
      
      await loadConfigs();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta configuración de proveedor de IA?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await axios.delete(`${API_BASE}/api/configuration/ai-providers/${configId}`);
      setSuccess('Configuración eliminada exitosamente');
      await loadConfigs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (configId?: string) => {
    const idToTest = configId || editingConfig?.id;
    
    if (!idToTest) {
      if (!validateForm()) {
        return;
      }
      setError('Primero debe guardar la configuración antes de probarla');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/configuration/ai-providers/${idToTest}/test`,
        { prompt: testPrompt }
      );
      
      setTestResult({
        success: response.data.success,
        message: response.data.message,
        response: response.data.response,
        details: response.data,
      });
      
      // Reload configs to update test status
      await loadConfigs();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.detail || 'Error al probar configuración',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleActivate = async (configId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const config = configs.find(c => c.id === configId);
      if (config) {
        await axios.put(`${API_BASE}/api/configuration/ai-providers/${configId}`, {
          ...config,
          is_active: true,
        });
        setSuccess('Configuración activada exitosamente');
        await loadConfigs();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al activar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePriority = async (configId: string, direction: 'up' | 'down') => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;
    
    const newPriority = direction === 'up' ? config.priority + 1 : config.priority - 1;
    
    setLoading(true);
    try {
      await axios.put(`${API_BASE}/api/configuration/ai-providers/${configId}`, {
        ...config,
        priority: Math.max(0, newPriority),
      });
      await loadConfigs();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cambiar prioridad');
    } finally {
      setLoading(false);
    }
  };

  const getProviderInfo = (provider: string) => {
    return PROVIDER_INFO.find(p => p.value === provider);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'error':
        return 'error';
      case 'not_configured':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'error':
        return 'Error';
      case 'not_configured':
        return 'No Configurado';
      default:
        return status;
    }
  };

  const currentTemplate = templates[formData.provider];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          Configuración de Proveedores de IA
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConfigs}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Proveedor
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Configure uno o más proveedores de IA para el chatbot de práctica y análisis inteligente.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Prioridad:</strong> El sistema usará el proveedor con mayor prioridad primero. Si falla, intentará con el siguiente.
        </Typography>
      </Alert>

      {loading && !dialogOpen ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AIIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No hay proveedores de IA configurados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure su primer proveedor de IA para habilitar el chatbot
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Configurar Primer Proveedor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Proveedor</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Características</TableCell>
                <TableCell align="center">Prioridad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Última Prueba</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs
                .sort((a, b) => b.priority - a.priority)
                .map((config) => {
                  const providerInfo = getProviderInfo(config.provider);
                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: providerInfo?.color }}>
                            <Typography>{providerInfo?.icon}</Typography>
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {providerInfo?.label || config.provider}
                            </Typography>
                            {config.is_default && (
                              <Chip label="Por Defecto" size="small" color="primary" />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{config.default_model}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tokens: {config.max_tokens} | Temp: {config.temperature}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {config.supports_streaming && (
                            <Tooltip title="Streaming">
                              <Chip icon={<StreamIcon />} label="Stream" size="small" />
                            </Tooltip>
                          )}
                          {config.supports_functions && (
                            <Tooltip title="Functions">
                              <Chip icon={<FunctionsIcon />} label="Func" size="small" />
                            </Tooltip>
                          )}
                          {config.supports_vision && (
                            <Tooltip title="Vision">
                              <Chip icon={<VisionIcon />} label="Vision" size="small" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleChangePriority(config.id, 'up')}
                            disabled={loading}
                          >
                            <ArrowUpward fontSize="small" />
                          </IconButton>
                          <Chip label={config.priority} size="small" />
                          <IconButton
                            size="small"
                            onClick={() => handleChangePriority(config.id, 'down')}
                            disabled={loading || config.priority === 0}
                          >
                            <ArrowDownward fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(config.status)}
                          color={getStatusColor(config.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {config.last_test_at ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {config.last_test_success ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <ErrorIcon color="error" fontSize="small" />
                            )}
                            <Typography variant="caption">
                              {new Date(config.last_test_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No probado
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          {!config.is_active && (
                            <Tooltip title="Activar">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleActivate(config.id)}
                              >
                                <ActivateIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(config)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(config.id)}
                              disabled={config.is_default}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingConfig ? 'Editar Proveedor de IA' : 'Nuevo Proveedor de IA'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Configure un proveedor de IA para habilitar el chatbot de práctica y análisis inteligente.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Proveedor de IA</InputLabel>
                  <Select
                    value={formData.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    label="Proveedor de IA"
                    disabled={!!editingConfig}
                  >
                    {PROVIDER_INFO.map((provider) => (
                      <MenuItem key={provider.value} value={provider.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{provider.icon}</Typography>
                          <Typography>{provider.label}</Typography>
                          {provider.recommended && (
                            <Chip label="Recomendado" size="small" color="primary" />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {currentTemplate && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>{currentTemplate.name}</strong>: {currentTemplate.description}
                    </Typography>
                    {currentTemplate.setup_instructions && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {currentTemplate.setup_instructions}
                      </Typography>
                    )}
                  </Alert>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required={!editingConfig}
                  type={showAPIKey ? 'text' : 'password'}
                  label="API Key"
                  value={formData.api_key}
                  onChange={(e) => handleFieldChange('api_key', e.target.value)}
                  placeholder="Ingrese su API Key"
                  helperText={editingConfig ? 'Dejar vacío para mantener la actual' : 'Esta clave será encriptada'}
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

              {currentTemplate?.available_models && currentTemplate.available_models.length > 0 && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Modelo por Defecto</InputLabel>
                    <Select
                      value={formData.default_model}
                      onChange={(e) => handleFieldChange('default_model', e.target.value)}
                      label="Modelo por Defecto"
                    >
                      {currentTemplate.available_models.map((model: string) => (
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
                  value={formData.priority}
                  onChange={(e) => handleFieldChange('priority', parseInt(e.target.value))}
                  helperText="Mayor número = mayor prioridad"
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Máximo de Tokens"
                  value={formData.max_tokens}
                  onChange={(e) => handleFieldChange('max_tokens', parseInt(e.target.value))}
                  helperText="Longitud máxima de respuesta"
                  inputProps={{ min: 100, max: 32000 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ px: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Temperatura: {formData.temperature}
                  </Typography>
                  <Slider
                    value={formData.temperature}
                    onChange={(e, value) => handleFieldChange('temperature', value)}
                    min={0}
                    max={2}
                    step={0.1}
                    marks={[
                      { value: 0, label: '0 (Determinista)' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2 (Creativo)' },
                    ]}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAdvanced}
                      onChange={(e) => setShowAdvanced(e.target.checked)}
                    />
                  }
                  label="Mostrar opciones avanzadas"
                />
              </Grid>

              {showAdvanced && (
                <>
                  <Grid item xs={12}>
                    <Divider />
                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                      Opciones Avanzadas
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="API Endpoint (opcional)"
                      value={formData.api_endpoint || ''}
                      onChange={(e) => handleFieldChange('api_endpoint', e.target.value)}
                      helperText="Dejar vacío para usar el endpoint por defecto"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rate Limit RPM"
                      value={formData.rate_limit_rpm || ''}
                      onChange={(e) => handleFieldChange('rate_limit_rpm', parseInt(e.target.value))}
                      helperText="Solicitudes por minuto"
                      inputProps={{ min: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rate Limit TPM"
                      value={formData.rate_limit_tpm || ''}
                      onChange={(e) => handleFieldChange('rate_limit_tpm', parseInt(e.target.value))}
                      helperText="Tokens por minuto"
                      inputProps={{ min: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Presupuesto Mensual"
                      value={formData.monthly_budget || ''}
                      onChange={(e) => handleFieldChange('monthly_budget', parseFloat(e.target.value))}
                      helperText="USD (opcional)"
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>

                  {currentTemplate && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            Características del Proveedor
                          </Typography>
                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                {currentTemplate.supports_streaming ? <CheckCircleIcon color="success" /> : <ErrorIcon color="disabled" />}
                              </ListItemIcon>
                              <ListItemText primary="Streaming" secondary="Respuestas en tiempo real" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                {currentTemplate.supports_functions ? <CheckCircleIcon color="success" /> : <ErrorIcon color="disabled" />}
                              </ListItemIcon>
                              <ListItemText primary="Functions" secondary="Llamadas a funciones" />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                {currentTemplate.supports_vision ? <CheckCircleIcon color="success" /> : <ErrorIcon color="disabled" />}
                              </ListItemIcon>
                              <ListItemText primary="Vision" secondary="Análisis de imágenes" />
                            </ListItem>
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </>
              )}

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Probar Configuración
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Prompt de Prueba"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Ingrese un prompt para probar"
                    size="small"
                    multiline
                    rows={2}
                  />
                  <Button
                    variant="outlined"
                    startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
                    onClick={() => handleTest()}
                    disabled={testing || loading}
                  >
                    Probar
                  </Button>
                </Box>

                {testResult && (
                  <Alert
                    severity={testResult.success ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    {testResult.message}
                    {testResult.response && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Respuesta:</strong> {testResult.response}
                      </Typography>
                    )}
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Guardando...' : editingConfig ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIProviderManualConfig;
