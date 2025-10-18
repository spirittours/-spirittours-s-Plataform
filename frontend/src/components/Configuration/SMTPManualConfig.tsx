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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff,
  Send as TestIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  PlayArrow as ActivateIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

// Constants
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Types
interface SMTPConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  timeout: number;
  is_active: boolean;
  is_default: boolean;
  status: string;
  last_test_at?: string;
  last_test_success?: boolean;
  created_at: string;
}

interface SMTPFormData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  timeout: number;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

const SMTP_PRESETS = [
  {
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    instructions: 'Usa tu email de Gmail y una contraseña de aplicación (no tu contraseña normal)',
  },
  {
    name: 'Outlook/Office365',
    host: 'smtp-mail.outlook.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    instructions: 'Usa tu email de Outlook/Hotmail y tu contraseña normal',
  },
  {
    name: 'Yahoo',
    host: 'smtp.mail.yahoo.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    instructions: 'Usa tu email de Yahoo y una contraseña de aplicación',
  },
  {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    use_tls: true,
    use_ssl: false,
    instructions: 'Usuario: "apikey", Contraseña: tu API Key de SendGrid',
  },
  {
    name: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    use_tls: true,
    use_ssl: false,
    instructions: 'Usa las credenciales SMTP de tu cuenta Mailgun',
  },
];

const SMTPManualConfig: React.FC = () => {
  // State
  const [configs, setConfigs] = useState<SMTPConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SMTPConfig | null>(null);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<SMTPFormData>({
    name: '',
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'Sistema de Capacitación',
    use_tls: true,
    use_ssl: false,
    timeout: 30,
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Test State
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Load configurations on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE}/api/configuration/smtp`);
      setConfigs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar configuraciones SMTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config?: SMTPConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        host: config.host,
        port: config.port,
        username: config.username,
        password: '', // Don't populate password for security
        from_email: config.from_email,
        from_name: config.from_name,
        use_tls: config.use_tls,
        use_ssl: config.use_ssl,
        timeout: config.timeout,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        name: '',
        host: '',
        port: 587,
        username: '',
        password: '',
        from_email: '',
        from_name: 'Sistema de Capacitación',
        use_tls: true,
        use_ssl: false,
        timeout: 30,
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
  };

  const handleFieldChange = (field: keyof SMTPFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.host.trim()) {
      setError('El host SMTP es requerido');
      return false;
    }
    if (!formData.username.trim()) {
      setError('El usuario es requerido');
      return false;
    }
    if (!editingConfig && !formData.password.trim()) {
      setError('La contraseña es requerida');
      return false;
    }
    if (!formData.from_email.trim()) {
      setError('El correo del remitente es requerido');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.from_email)) {
      setError('El formato del correo del remitente no es válido');
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
        if (!updateData.password) {
          // If password is empty, don't send it (keep existing)
          delete (updateData as any).password;
        }
        
        await axios.put(`${API_BASE}/api/configuration/smtp/${editingConfig.id}`, updateData);
        setSuccess('Configuración actualizada exitosamente');
      } else {
        // Create new config
        await axios.post(`${API_BASE}/api/configuration/smtp`, formData);
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
    if (!window.confirm('¿Está seguro de eliminar esta configuración SMTP?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await axios.delete(`${API_BASE}/api/configuration/smtp/${configId}`);
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
      // Need to save first
      if (!validateForm()) {
        return;
      }
      setError('Primero debe guardar la configuración antes de probarla');
      return;
    }
    
    if (!testEmail) {
      setError('Ingrese un correo de prueba');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/configuration/smtp/${idToTest}/test`,
        { test_email: testEmail }
      );
      
      setTestResult({
        success: response.data.success,
        message: response.data.message,
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
      // To activate, we update the config with is_active=true
      // Backend should handle making it the default if needed
      const config = configs.find(c => c.id === configId);
      if (config) {
        await axios.put(`${API_BASE}/api/configuration/smtp/${configId}`, {
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

  const handleApplyPreset = (preset: typeof SMTP_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      name: `Configuración ${preset.name}`,
      host: preset.host,
      port: preset.port,
      use_tls: preset.use_tls,
      use_ssl: preset.use_ssl,
    }));
    setPresetDialogOpen(false);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          Configuración SMTP Manual
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
            Nueva Configuración
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
          Configure uno o más servidores SMTP para enviar correos automáticos (recordatorios, certificados, notificaciones).
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>Nota:</strong> Puede tener múltiples configuraciones. La configuración marcada como "Por Defecto" será usada automáticamente.
        </Typography>
      </Alert>

      {loading && !dialogOpen ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <EmailIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No hay configuraciones SMTP
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Cree su primera configuración SMTP para comenzar
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Crear Primera Configuración
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Host</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Remitente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Última Prueba</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {config.name}
                      {config.is_default && (
                        <Chip label="Por Defecto" size="small" color="primary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {config.host}:{config.port}
                    {config.use_tls && <Chip label="TLS" size="small" sx={{ ml: 1 }} />}
                    {config.use_ssl && <Chip label="SSL" size="small" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{config.username}</TableCell>
                  <TableCell>
                    {config.from_name} {'<'}{config.from_email}{'>'}
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
              ))}
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
          {editingConfig ? 'Editar Configuración SMTP' : 'Nueva Configuración SMTP'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">
                  ¿Necesita ayuda? Use un preset para servicios comunes
                </Typography>
                <Button
                  size="small"
                  onClick={() => setPresetDialogOpen(true)}
                >
                  Ver Presets
                </Button>
              </Box>
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre de la Configuración"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="ej: Servidor Principal"
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  required
                  label="Host SMTP"
                  value={formData.host}
                  onChange={(e) => handleFieldChange('host', e.target.value)}
                  placeholder="ej: smtp.gmail.com"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Puerto"
                  value={formData.port}
                  onChange={(e) => handleFieldChange('port', parseInt(e.target.value))}
                  helperText="587 (TLS) o 465 (SSL)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Usuario / Email"
                  value={formData.username}
                  onChange={(e) => handleFieldChange('username', e.target.value)}
                  placeholder="ej: notificaciones@empresa.com"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required={!editingConfig}
                  type={showPassword ? 'text' : 'password'}
                  label="Contraseña"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  helperText={editingConfig ? 'Dejar vacío para mantener la actual' : ''}
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
                  value={formData.from_email}
                  onChange={(e) => handleFieldChange('from_email', e.target.value)}
                  placeholder="ej: capacitacion@empresa.com"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nombre del Remitente"
                  value={formData.from_name}
                  onChange={(e) => handleFieldChange('from_name', e.target.value)}
                  placeholder="ej: Sistema de Capacitación"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timeout (segundos)"
                  value={formData.timeout}
                  onChange={(e) => handleFieldChange('timeout', parseInt(e.target.value))}
                  inputProps={{ min: 10, max: 120 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.use_tls}
                        onChange={(e) => handleFieldChange('use_tls', e.target.checked)}
                      />
                    }
                    label="Usar TLS (Puerto 587)"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.use_ssl}
                        onChange={(e) => handleFieldChange('use_ssl', e.target.checked)}
                      />
                    }
                    label="Usar SSL (Puerto 465)"
                  />
                </Box>
              </Grid>

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
                    type="email"
                    label="Correo de Prueba"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Ingrese un correo para enviar prueba"
                    size="small"
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

      {/* Presets Dialog */}
      <Dialog
        open={presetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configuraciones Predefinidas</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {SMTP_PRESETS.map((preset) => (
              <Grid item xs={12} key={preset.name}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {preset.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Host:</strong> {preset.host}:{preset.port}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Seguridad:</strong> {preset.use_tls ? 'TLS' : preset.use_ssl ? 'SSL' : 'Ninguna'}
                    </Typography>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        {preset.instructions}
                      </Typography>
                    </Alert>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      Aplicar Este Preset
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SMTPManualConfig;
