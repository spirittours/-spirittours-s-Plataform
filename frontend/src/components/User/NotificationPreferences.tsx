/**
 * User Notification Preferences Component
 * 
 * Permite a los usuarios configurar sus preferencias de notificaciones:
 * - Habilitar/deshabilitar cada canal (WhatsApp, Email, SMS)
 * - Configurar números de teléfono y WhatsApp
 * - Seleccionar tipos de notificaciones a recibir
 * - Establecer frecuencia de notificaciones
 * - Configurar horarios de "no molestar"
 * - Verificar disponibilidad de WhatsApp
 * 
 * Integra con: backend/routes/smart_notifications.routes.js
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Grid,
  Alert,
  AlertTitle,
  Chip,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  NotificationsActive as NotifIcon,
  Save as SaveIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Types
interface UserPreferences {
  user_id: string;
  email: string;
  phone_number?: string;
  whatsapp_number?: string;
  allow_whatsapp: boolean;
  allow_email: boolean;
  allow_sms: boolean;
  notification_types: string[];
  frequency_limit?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  language: string;
  timezone: string;
}

interface NotificationType {
  type: string;
  label: string;
  description: string;
  recommended: boolean;
}

interface ChannelStatus {
  channel: string;
  available: boolean;
  verified: boolean;
  last_checked?: string;
  error?: string;
}

const NotificationPreferences: React.FC<{ userId: string }> = ({ userId }) => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus[]>([]);
  const [verifyingWhatsApp, setVerifyingWhatsApp] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState<boolean>(false);
  const [testChannel, setTestChannel] = useState<string>('');
  const [testingSend, setTestingSend] = useState<boolean>(false);

  // Notification types available
  const notificationTypes: NotificationType[] = [
    {
      type: 'booking_confirmation',
      label: 'Confirmación de Reserva',
      description: 'Recibe confirmación inmediata cuando hagas una reserva',
      recommended: true
    },
    {
      type: 'travel_reminder',
      label: 'Recordatorio de Viaje',
      description: 'Recordatorios 24h y 2h antes de tu viaje',
      recommended: true
    },
    {
      type: 'trip_updates',
      label: 'Actualizaciones del Viaje',
      description: 'Cambios en horarios, puntos de encuentro, etc.',
      recommended: true
    },
    {
      type: 'cancellation_notice',
      label: 'Avisos de Cancelación',
      description: 'Notificación si tu viaje es cancelado',
      recommended: true
    },
    {
      type: 'payment_receipt',
      label: 'Recibos de Pago',
      description: 'Confirmación de pagos y reembolsos',
      recommended: true
    },
    {
      type: 'promotional_offers',
      label: 'Ofertas Promocionales',
      description: 'Descuentos y ofertas especiales',
      recommended: false
    },
    {
      type: 'newsletter',
      label: 'Newsletter',
      description: 'Noticias y actualizaciones de la plataforma',
      recommended: false
    },
    {
      type: 'feedback_request',
      label: 'Solicitud de Feedback',
      description: 'Invitaciones para calificar tu experiencia',
      recommended: false
    }
  ];

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  // Check for changes
  useEffect(() => {
    if (preferences && originalPreferences) {
      const changed = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
      setHasChanges(changed);
    }
  }, [preferences, originalPreferences]);

  // Load user preferences
  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/smart-notifications/user-preferences/${userId}`);
      const prefs = response.data.data;

      setPreferences(prefs);
      setOriginalPreferences(JSON.parse(JSON.stringify(prefs))); // Deep clone

      // Load channel status
      await loadChannelStatus();

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      setError(err.response?.data?.message || 'Error al cargar preferencias');
      setLoading(false);
    }
  };

  // Load channel availability status
  const loadChannelStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/smart-notifications/user-preferences/${userId}/channel-status`);
      setChannelStatus(response.data.data);
    } catch (err: any) {
      console.error('Error loading channel status:', err);
    }
  };

  // Update preference field
  const updateField = (field: keyof UserPreferences, value: any) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [field]: value
    });
  };

  // Toggle notification type
  const toggleNotificationType = (type: string) => {
    if (!preferences) return;

    const types = preferences.notification_types || [];
    const newTypes = types.includes(type)
      ? types.filter(t => t !== type)
      : [...types, type];

    updateField('notification_types', newTypes);
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);

      await axios.put(`${API_BASE_URL}/smart-notifications/user-preferences/${userId}`, preferences);

      setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));
      setHasChanges(false);
      setSaveSuccess(true);

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(err.response?.data?.message || 'Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  // Reset to original
  const resetPreferences = () => {
    if (originalPreferences) {
      setPreferences(JSON.parse(JSON.stringify(originalPreferences)));
      setHasChanges(false);
    }
  };

  // Verify WhatsApp availability
  const verifyWhatsApp = async () => {
    if (!preferences?.whatsapp_number) {
      alert('Por favor ingresa tu número de WhatsApp primero');
      return;
    }

    try {
      setVerifyingWhatsApp(true);

      const response = await axios.post(`${API_BASE_URL}/smart-notifications/verify-whatsapp`, {
        phone_number: preferences.whatsapp_number
      });

      if (response.data.success && response.data.data.has_whatsapp) {
        alert('✅ Número de WhatsApp verificado correctamente');
        await loadChannelStatus();
      } else {
        alert('⚠️ No se pudo verificar WhatsApp en este número. Puedes usar Email o SMS como alternativa.');
      }
    } catch (err: any) {
      alert('Error al verificar WhatsApp: ' + (err.response?.data?.message || err.message));
    } finally {
      setVerifyingWhatsApp(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      setTestingSend(true);

      await axios.post(`${API_BASE_URL}/smart-notifications/send`, {
        user_id: userId,
        notification_type: 'test_notification',
        force_channel: testChannel || undefined,
        priority: 'low',
        subject: 'Notificación de Prueba',
        content: 'Esta es una notificación de prueba para verificar tu configuración.',
        variables: {}
      });

      alert(`✅ Notificación de prueba enviada correctamente${testChannel ? ` por ${testChannel.toUpperCase()}` : ''}`);
      setTestDialogOpen(false);
    } catch (err: any) {
      alert('Error al enviar notificación de prueba: ' + (err.response?.data?.message || err.message));
    } finally {
      setTestingSend(false);
    }
  };

  // Get channel status icon
  const getChannelStatusIcon = (channel: string) => {
    const status = channelStatus.find(s => s.channel === channel);
    if (!status) return <InfoIcon color="disabled" />;

    if (status.verified) {
      return <VerifiedIcon color="success" />;
    } else if (status.available) {
      return <SuccessIcon color="success" />;
    } else {
      return <ErrorIcon color="error" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!preferences) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        No se pudieron cargar las preferencias del usuario.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <NotifIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Preferencias de Notificaciones
        </Typography>
        <Box>
          {hasChanges && (
            <Button
              variant="outlined"
              onClick={resetPreferences}
              sx={{ mr: 1 }}
            >
              Cancelar
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={savePreferences}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </Box>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSaveSuccess(false)}>
          <AlertTitle>✅ Guardado Correctamente</AlertTitle>
          Tus preferencias han sido actualizadas exitosamente.
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Changes Alert */}
      {hasChanges && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Cambios Pendientes</AlertTitle>
          Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicarlos.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Channel Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📱 Canales de Notificación
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Selecciona cómo quieres recibir notificaciones
              </Typography>

              {/* WhatsApp */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WhatsAppIcon sx={{ mr: 1, color: '#25D366' }} />
                    <Typography variant="subtitle1">WhatsApp</Typography>
                    {getChannelStatusIcon('whatsapp')}
                  </Box>
                  <Switch
                    checked={preferences.allow_whatsapp}
                    onChange={(e) => updateField('allow_whatsapp', e.target.checked)}
                    color="success"
                  />
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  label="Número de WhatsApp"
                  value={preferences.whatsapp_number || ''}
                  onChange={(e) => updateField('whatsapp_number', e.target.value)}
                  placeholder="+1234567890"
                  disabled={!preferences.allow_whatsapp}
                  sx={{ mb: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={verifyWhatsApp}
                  disabled={!preferences.allow_whatsapp || !preferences.whatsapp_number || verifyingWhatsApp}
                  fullWidth
                >
                  {verifyingWhatsApp ? 'Verificando...' : 'Verificar WhatsApp'}
                </Button>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    ✅ Gratis • Alta tasa de entrega • Respuesta rápida
                  </Typography>
                </Alert>
              </Paper>

              {/* Email */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, color: '#EA4335' }} />
                    <Typography variant="subtitle1">Email</Typography>
                    {getChannelStatusIcon('email')}
                  </Box>
                  <Switch
                    checked={preferences.allow_email}
                    onChange={(e) => updateField('allow_email', e.target.checked)}
                    color="error"
                  />
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  label="Correo Electrónico"
                  value={preferences.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  type="email"
                  disabled={!preferences.allow_email}
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    ✅ Gratis • Ideal para información detallada
                  </Typography>
                </Alert>
              </Paper>

              {/* SMS */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SmsIcon sx={{ mr: 1, color: '#FF9800' }} />
                    <Typography variant="subtitle1">SMS</Typography>
                    {getChannelStatusIcon('sms')}
                  </Box>
                  <Switch
                    checked={preferences.allow_sms}
                    onChange={(e) => updateField('allow_sms', e.target.checked)}
                    color="warning"
                  />
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  label="Número de Teléfono"
                  value={preferences.phone_number || ''}
                  onChange={(e) => updateField('phone_number', e.target.value)}
                  placeholder="+1234567890"
                  disabled={!preferences.allow_sms}
                />
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    ⚠️ Usado solo como último recurso • Costo: $0.05-0.15 por mensaje
                  </Typography>
                </Alert>
              </Paper>

              <Divider sx={{ my: 2 }} />

              <Button
                variant="outlined"
                fullWidth
                onClick={() => setTestDialogOpen(true)}
              >
                🧪 Enviar Notificación de Prueba
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔔 Tipos de Notificaciones
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Selecciona qué notificaciones quieres recibir
              </Typography>

              <List>
                {notificationTypes.map((notifType) => (
                  <ListItem
                    key={notifType.type}
                    dense
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={preferences.notification_types?.includes(notifType.type) || false}
                        onChange={() => toggleNotificationType(notifType.type)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {notifType.label}
                          {notifType.recommended && (
                            <Chip label="Recomendado" size="small" color="primary" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      }
                      secondary={notifType.description}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚙️ Configuración Avanzada
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Frecuencia de Notificaciones</InputLabel>
                <Select
                  value={preferences.frequency_limit || 'unlimited'}
                  label="Frecuencia de Notificaciones"
                  onChange={(e) => updateField('frequency_limit', e.target.value)}
                >
                  <MenuItem value="unlimited">Sin límite</MenuItem>
                  <MenuItem value="daily">Máximo 1 por día</MenuItem>
                  <MenuItem value="weekly">Máximo 1 por semana</MenuItem>
                  <MenuItem value="important_only">Solo importantes</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Idioma</InputLabel>
                <Select
                  value={preferences.language || 'es'}
                  label="Idioma"
                  onChange={(e) => updateField('language', e.target.value)}
                >
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="pt">Português</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Zona Horaria</InputLabel>
                <Select
                  value={preferences.timezone || 'America/New_York'}
                  label="Zona Horaria"
                  onChange={(e) => updateField('timezone', e.target.value)}
                >
                  <MenuItem value="America/New_York">Eastern Time (US)</MenuItem>
                  <MenuItem value="America/Chicago">Central Time (US)</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time (US)</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time (US)</MenuItem>
                  <MenuItem value="America/Mexico_City">Ciudad de México</MenuItem>
                  <MenuItem value="America/Bogota">Bogotá</MenuItem>
                  <MenuItem value="America/Lima">Lima</MenuItem>
                  <MenuItem value="America/Santiago">Santiago</MenuItem>
                  <MenuItem value="America/Buenos_Aires">Buenos Aires</MenuItem>
                  <MenuItem value="Europe/Madrid">Madrid</MenuItem>
                  <MenuItem value="Europe/London">London</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Quiet Hours */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Horario "No Molestar"
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                No recibirás notificaciones durante este horario (excepto emergencias)
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Desde"
                    type="time"
                    value={preferences.quiet_hours_start || '22:00'}
                    onChange={(e) => updateField('quiet_hours_start', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Hasta"
                    type="time"
                    value={preferences.quiet_hours_end || '08:00'}
                    onChange={(e) => updateField('quiet_hours_end', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                Las notificaciones de alta prioridad (cancelaciones, emergencias) se enviarán siempre.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Information Card */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💡 ¿Sabías que...?
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>WhatsApp es gratis:</strong> No tiene costo para ti ni para nosotros. Es el canal más eficiente.
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>Email es confiable:</strong> Perfecto para recibos y documentación detallada.
              </Typography>
              <Typography variant="body2" paragraph>
                • <strong>SMS es el respaldo:</strong> Solo se usa si WhatsApp y Email no están disponibles.
              </Typography>
              <Typography variant="body2">
                • <strong>Sistema inteligente:</strong> Elegimos automáticamente el mejor canal según tu disponibilidad.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Test Notification Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🧪 Enviar Notificación de Prueba</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Enviaremos una notificación de prueba a tus canales configurados para que verifiques que todo funciona correctamente.
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Canal Específico (Opcional)</InputLabel>
            <Select
              value={testChannel}
              label="Canal Específico (Opcional)"
              onChange={(e) => setTestChannel(e.target.value)}
            >
              <MenuItem value="">Automático (sistema elige)</MenuItem>
              <MenuItem value="whatsapp" disabled={!preferences.allow_whatsapp}>
                WhatsApp
              </MenuItem>
              <MenuItem value="email" disabled={!preferences.allow_email}>
                Email
              </MenuItem>
              <MenuItem value="sms" disabled={!preferences.allow_sms}>
                SMS
              </MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info" sx={{ mt: 2 }}>
            Si no seleccionas un canal, el sistema elegirá automáticamente según tu configuración y disponibilidad.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={sendTestNotification}
            variant="contained"
            disabled={testingSend}
          >
            {testingSend ? 'Enviando...' : 'Enviar Prueba'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationPreferences;
