import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SystemConfigDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Show/hide passwords
  const [showPasswords, setShowPasswords] = useState({});

  // Form states
  const [whatsappConfig, setWhatsappConfig] = useState({
    phoneNumberId: '',
    accessToken: '',
    webhookVerifyToken: '',
    apiVersion: 'v18.0'
  });

  const [openaiConfig, setOpenaiConfig] = useState({
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 500
  });

  const [sendgridConfig, setSendgridConfig] = useState({
    apiKey: '',
    fromEmail: '',
    fromName: 'Spirit Tours'
  });

  const [facebookConfig, setFacebookConfig] = useState({
    pageAccessToken: '',
    pageId: '',
    instagramBusinessId: ''
  });

  const [linkedinConfig, setLinkedinConfig] = useState({
    accessToken: '',
    organizationId: ''
  });

  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  const [generalConfig, setGeneralConfig] = useState({
    companyName: 'Spirit Tours',
    timezone: 'America/Mexico_City',
    currency: 'USD',
    language: 'es',
    webhookUrl: '',
    dashboardUrl: ''
  });

  useEffect(() => {
    fetchConfig();
    fetchStatus();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system-config/all');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setWhatsappConfig(data.config.whatsapp);
        setOpenaiConfig(data.config.openai);
        setSendgridConfig(data.config.sendgrid);
        setFacebookConfig(data.config.facebook);
        setLinkedinConfig(data.config.linkedin);
        setTwilioConfig(data.config.twilio);
        setGeneralConfig(data.config.general);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/system-config/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración de WhatsApp guardada exitosamente' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar configuración' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setTesting(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: whatsappConfig.phoneNumberId,
          accessToken: whatsappConfig.accessToken
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Credenciales válidas! ${data.data?.phoneNumber || 'Conectado'}` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${data.error}: ${data.details || ''}` 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al probar credenciales' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveOpenAI = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/openai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openaiConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración de OpenAI guardada exitosamente' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTesting(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: openaiConfig.apiKey })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: '✅ API Key de OpenAI válida!' });
      } else {
        setMessage({ type: 'error', text: '❌ API Key inválida' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al probar API Key' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSendGrid = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/sendgrid', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendgridConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración de SendGrid guardada' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFacebook = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/facebook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facebookConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración de Facebook guardada' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLinkedIn = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/linkedin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkedinConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración de LinkedIn guardada' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTwilio = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/twilio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración de Twilio guardada' });
        await fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system-config/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalConfig)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración general guardada' });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  const toggleShowPassword = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const getStatusChip = (service) => {
    if (!status || !status[service]) return <Chip label="Unknown" size="small" />;
    
    const serviceStatus = status[service];
    
    if (serviceStatus.enabled && serviceStatus.configured) {
      return <Chip label="Activo" color="success" size="small" icon={<CheckIcon />} />;
    } else if (serviceStatus.configured) {
      return <Chip label="Configurado" color="warning" size="small" icon={<WarningIcon />} />;
    } else {
      return <Chip label="No configurado" color="error" size="small" icon={<ErrorIcon />} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Configuración del Sistema
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => { fetchConfig(); fetchStatus(); }}
        >
          Actualizar
        </Button>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage(null)}
          sx={{ mb: 3 }}
        >
          {message.text}
        </Alert>
      )}

      <Card>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="WhatsApp" />
          <Tab label="OpenAI (GPT-4)" />
          <Tab label="SendGrid" />
          <Tab label="Facebook/Instagram" />
          <Tab label="LinkedIn" />
          <Tab label="Twilio SMS" />
          <Tab label="General" />
        </Tabs>

        {/* WhatsApp Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">WhatsApp Business API</Typography>
            {getStatusChip('whatsapp')}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Necesitas una cuenta de WhatsApp Business API. 
            <a href="/docs/SETUP_GUIDE_WHATSAPP.md" target="_blank"> Ver guía completa</a>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number ID"
                value={whatsappConfig.phoneNumberId}
                onChange={(e) => setWhatsappConfig({...whatsappConfig, phoneNumberId: e.target.value})}
                placeholder="123456789012345"
                helperText="Obtén esto en Meta WhatsApp Manager"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Access Token"
                type={showPasswords['whatsapp_token'] ? 'text' : 'password'}
                value={whatsappConfig.accessToken}
                onChange={(e) => setWhatsappConfig({...whatsappConfig, accessToken: e.target.value})}
                placeholder="EAAG..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('whatsapp_token')}>
                        {showPasswords['whatsapp_token'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Token de acceso permanente de Meta"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Webhook Verify Token"
                type={showPasswords['webhook_token'] ? 'text' : 'password'}
                value={whatsappConfig.webhookVerifyToken}
                onChange={(e) => setWhatsappConfig({...whatsappConfig, webhookVerifyToken: e.target.value})}
                placeholder="tu_token_secreto_aqui"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('webhook_token')}>
                        {showPasswords['webhook_token'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText="Token secreto para verificar webhook"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSaveWhatsApp}
                  disabled={saving || !whatsappConfig.phoneNumberId || !whatsappConfig.accessToken}
                >
                  Guardar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={20} /> : <CheckIcon />}
                  onClick={handleTestWhatsApp}
                  disabled={testing || !whatsappConfig.phoneNumberId || !whatsappConfig.accessToken}
                >
                  Probar Conexión
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* OpenAI Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">OpenAI GPT-4</Typography>
            {getStatusChip('openai')}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Necesitas una API key de OpenAI. 
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener"> Obtener aquí</a>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key"
                type={showPasswords['openai_key'] ? 'text' : 'password'}
                value={openaiConfig.apiKey}
                onChange={(e) => setOpenaiConfig({...openaiConfig, apiKey: e.target.value})}
                placeholder="sk-..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('openai_key')}>
                        {showPasswords['openai_key'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Modelo"
                value={openaiConfig.model}
                onChange={(e) => setOpenaiConfig({...openaiConfig, model: e.target.value})}
                select
              >
                <MenuItem value="gpt-4">GPT-4 (Recomendado)</MenuItem>
                <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Más barato)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Temperature"
                type="number"
                value={openaiConfig.temperature}
                onChange={(e) => setOpenaiConfig({...openaiConfig, temperature: parseFloat(e.target.value)})}
                inputProps={{ min: 0, max: 2, step: 0.1 }}
                helperText="0 = Preciso, 2 = Creativo"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSaveOpenAI}
                  disabled={saving || !openaiConfig.apiKey}
                >
                  Guardar
                </Button>
                <Button
                  variant="outlined"
                  startIcon={testing ? <CircularProgress size={20} /> : <CheckIcon />}
                  onClick={handleTestOpenAI}
                  disabled={testing || !openaiConfig.apiKey}
                >
                  Probar API Key
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* SendGrid Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">SendGrid Email</Typography>
            {getStatusChip('sendgrid')}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API Key"
                type={showPasswords['sendgrid_key'] ? 'text' : 'password'}
                value={sendgridConfig.apiKey}
                onChange={(e) => setSendgridConfig({...sendgridConfig, apiKey: e.target.value})}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('sendgrid_key')}>
                        {showPasswords['sendgrid_key'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="From Email"
                type="email"
                value={sendgridConfig.fromEmail}
                onChange={(e) => setSendgridConfig({...sendgridConfig, fromEmail: e.target.value})}
                placeholder="noreply@spirittours.com"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="From Name"
                value={sendgridConfig.fromName}
                onChange={(e) => setSendgridConfig({...sendgridConfig, fromName: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveSendGrid}
                disabled={saving || !sendgridConfig.apiKey}
              >
                Guardar
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Facebook/Instagram Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Facebook & Instagram</Typography>
            {getStatusChip('facebook')}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Page Access Token"
                type={showPasswords['fb_token'] ? 'text' : 'password'}
                value={facebookConfig.pageAccessToken}
                onChange={(e) => setFacebookConfig({...facebookConfig, pageAccessToken: e.target.value})}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('fb_token')}>
                        {showPasswords['fb_token'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Page ID"
                value={facebookConfig.pageId}
                onChange={(e) => setFacebookConfig({...facebookConfig, pageId: e.target.value})}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Instagram Business ID"
                value={facebookConfig.instagramBusinessId}
                onChange={(e) => setFacebookConfig({...facebookConfig, instagramBusinessId: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveFacebook}
                disabled={saving}
              >
                Guardar
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* LinkedIn Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">LinkedIn</Typography>
            {getStatusChip('linkedin')}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Access Token"
                type={showPasswords['li_token'] ? 'text' : 'password'}
                value={linkedinConfig.accessToken}
                onChange={(e) => setLinkedinConfig({...linkedinConfig, accessToken: e.target.value})}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('li_token')}>
                        {showPasswords['li_token'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Organization ID"
                value={linkedinConfig.organizationId}
                onChange={(e) => setLinkedinConfig({...linkedinConfig, organizationId: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveLinkedIn}
                disabled={saving}
              >
                Guardar
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Twilio Tab */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Twilio SMS</Typography>
            {getStatusChip('twilio')}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Account SID"
                value={twilioConfig.accountSid}
                onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Auth Token"
                type={showPasswords['twilio_token'] ? 'text' : 'password'}
                value={twilioConfig.authToken}
                onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => toggleShowPassword('twilio_token')}>
                        {showPasswords['twilio_token'] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={twilioConfig.phoneNumber}
                onChange={(e) => setTwilioConfig({...twilioConfig, phoneNumber: e.target.value})}
                placeholder="+1234567890"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveTwilio}
                disabled={saving}
              >
                Guardar
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* General Tab */}
        <TabPanel value={tabValue} index={6}>
          <Typography variant="h6" gutterBottom>
            Configuración General
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Nombre de la Empresa"
                value={generalConfig.companyName}
                onChange={(e) => setGeneralConfig({...generalConfig, companyName: e.target.value})}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Timezone"
                value={generalConfig.timezone}
                onChange={(e) => setGeneralConfig({...generalConfig, timezone: e.target.value})}
                select
              >
                <MenuItem value="America/Mexico_City">Ciudad de México (GMT-6)</MenuItem>
                <MenuItem value="America/Cancun">Cancún (GMT-5)</MenuItem>
                <MenuItem value="America/Los_Angeles">Los Angeles (GMT-8)</MenuItem>
                <MenuItem value="America/New_York">New York (GMT-5)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Moneda"
                value={generalConfig.currency}
                onChange={(e) => setGeneralConfig({...generalConfig, currency: e.target.value})}
                select
              >
                <MenuItem value="USD">USD ($)</MenuItem>
                <MenuItem value="MXN">MXN ($)</MenuItem>
                <MenuItem value="EUR">EUR (€)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Idioma"
                value={generalConfig.language}
                onChange={(e) => setGeneralConfig({...generalConfig, language: e.target.value})}
                select
              >
                <MenuItem value="es">Español</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Webhook URL Base"
                value={generalConfig.webhookUrl}
                onChange={(e) => setGeneralConfig({...generalConfig, webhookUrl: e.target.value})}
                placeholder="https://api.spirittours.com"
                helperText="URL base para webhooks"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dashboard URL"
                value={generalConfig.dashboardUrl}
                onChange={(e) => setGeneralConfig({...generalConfig, dashboardUrl: e.target.value})}
                placeholder="https://dashboard.spirittours.com"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveGeneral}
                disabled={saving}
              >
                Guardar
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Services Status Overview */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estado de los Servicios
          </Typography>

          <Grid container spacing={2}>
            {status && Object.entries(status).map(([service, data]) => (
              <Grid item xs={12} sm={6} md={4} key={service}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {service}
                      </Typography>
                      {data.enabled && data.configured ? (
                        <CheckIcon color="success" />
                      ) : data.configured ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {data.enabled && data.configured ? 'Activo y configurado' :
                       data.configured ? 'Configurado pero inactivo' :
                       'No configurado'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
