/**
 * Configuration Dashboard
 * Panel principal de configuración del sistema
 * 
 * Características:
 * - Selector de modo: Wizard guiado vs Manual avanzado
 * - Vista de estado del sistema
 * - Acceso a configuraciones SMTP y AI
 * - Testing de conexiones
 * - Audit log de cambios
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Paper,
  Alert,
  AlertTitle,
  Stack,
  Chip,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AutoAwesome as WizardIcon,
  Build as ManualIcon,
  Email as EmailIcon,
  SmartToy as AIIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import axios from 'axios';

// Import sub-components
import ConfigurationWizard from './ConfigurationWizard';
import SMTPManualConfig from './SMTPManualConfig';
import AIProviderManualConfig from './AIProviderManualConfig';

// ============================================================================
// INTERFACES
// ============================================================================

interface SystemStatus {
  smtp: {
    total_configs: number;
    active_configs: number;
    has_default: boolean;
  };
  ai_providers: {
    total_configs: number;
    active_configs: number;
    has_default: boolean;
    providers_configured: string[];
  };
  wizard_completed: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ConfigurationDashboard: React.FC = () => {
  // State Management
  const [configMode, setConfigMode] = useState<'select' | 'wizard' | 'manual'>('select');
  const [currentTab, setCurrentTab] = useState(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modeSelectionOpen, setModeSelectionOpen] = useState(true);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/configuration/status`);
      setSystemStatus(response.data);
      
      // If wizard already completed, suggest manual mode
      if (response.data.wizard_completed) {
        setModeSelectionOpen(false);
        setConfigMode('manual');
      }
    } catch (error) {
      console.error('Error loading system status:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // MODE SELECTION
  // ============================================================================

  const handleModeSelect = (mode: 'wizard' | 'manual') => {
    setConfigMode(mode);
    setModeSelectionOpen(false);
  };

  const handleChangeMode = () => {
    setModeSelectionOpen(true);
    setConfigMode('select');
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderSystemStatusCard = () => {
    if (!systemStatus) return null;

    const smtpConfigured = systemStatus.smtp.has_default;
    const aiConfigured = systemStatus.ai_providers.has_default;
    const allConfigured = smtpConfigured && aiConfigured;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: allConfigured ? 'success.main' : 'warning.main' }}>
              {allConfigured ? <CheckIcon /> : <WarningIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6">Estado del Sistema</Typography>
              <Typography variant="caption" color="text.secondary">
                {allConfigured ? 'Sistema configurado correctamente' : 'Configuración incompleta'}
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={2}>
            {/* SMTP Status */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: smtpConfigured ? 'success.light' : 'warning.light' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <EmailIcon sx={{ fontSize: 40, color: smtpConfigured ? 'success.dark' : 'warning.dark' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Configuración SMTP
                    </Typography>
                    <Typography variant="body2">
                      {systemStatus.smtp.active_configs} configuraciones activas
                    </Typography>
                    {smtpConfigured ? (
                      <Chip label="Configurado" size="small" color="success" sx={{ mt: 1 }} />
                    ) : (
                      <Chip label="Pendiente" size="small" color="warning" sx={{ mt: 1 }} />
                    )}
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* AI Providers Status */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: aiConfigured ? 'success.light' : 'warning.light' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <AIIcon sx={{ fontSize: 40, color: aiConfigured ? 'success.dark' : 'warning.dark' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Proveedores de IA
                    </Typography>
                    <Typography variant="body2">
                      {systemStatus.ai_providers.active_configs} proveedores activos
                    </Typography>
                    {aiConfigured ? (
                      <Chip label="Configurado" size="small" color="success" sx={{ mt: 1 }} />
                    ) : (
                      <Chip label="Pendiente" size="small" color="warning" sx={{ mt: 1 }} />
                    )}
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {systemStatus.ai_providers.providers_configured.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Proveedores configurados:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                {systemStatus.ai_providers.providers_configured.map(provider => (
                  <Chip 
                    key={provider} 
                    label={provider.toUpperCase()} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderModeSelectionDialog = () => (
    <Dialog 
      open={modeSelectionOpen} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={!systemStatus?.wizard_completed}
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold" textAlign="center">
          ⚙️ Configuración del Sistema
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Elige cómo deseas configurar el sistema
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Wizard Mode */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                }
              }}
              onClick={() => handleModeSelect('wizard')}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    margin: '0 auto',
                    bgcolor: 'primary.main',
                    mb: 2
                  }}
                >
                  <WizardIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Wizard Guiado
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Configuración paso a paso con asistencia
                </Typography>
                
                <Box sx={{ textAlign: 'left', mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    ✓ Perfecto para:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Primera configuración<br />
                    • Usuarios sin experiencia técnica<br />
                    • Configuración rápida y sencilla<br />
                    • Validación automática de cada paso
                  </Typography>
                </Box>

                <Chip 
                  label="Recomendado para principiantes" 
                  color="primary" 
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Manual Mode */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': { 
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                }
              }}
              onClick={() => handleModeSelect('manual')}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    margin: '0 auto',
                    bgcolor: 'secondary.main',
                    mb: 2
                  }}
                >
                  <ManualIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" gutterBottom fontWeight="bold">
                  Configuración Manual
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Control total y acceso avanzado
                </Typography>
                
                <Box sx={{ textAlign: 'left', mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom color="secondary">
                    ✓ Perfecto para:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Usuarios con experiencia<br />
                    • Configuración personalizada<br />
                    • Múltiples proveedores de IA<br />
                    • Control completo de opciones
                  </Typography>
                </Box>

                <Chip 
                  label="Para usuarios avanzados" 
                  color="secondary" 
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {systemStatus?.wizard_completed && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <AlertTitle>Wizard Completado</AlertTitle>
            Ya completaste el wizard de configuración. Puedes usar el modo manual para ajustes avanzados.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {systemStatus?.wizard_completed && (
          <Button onClick={() => setModeSelectionOpen(false)}>
            Cancelar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const renderWizardMode = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          🧙‍♂️ Wizard de Configuración
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ManualIcon />}
          onClick={handleChangeMode}
        >
          Cambiar a Manual
        </Button>
      </Stack>

      <ConfigurationWizard onComplete={() => {
        loadSystemStatus();
        setConfigMode('manual');
      }} />
    </Box>
  );

  const renderManualMode = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          🔧 Configuración Manual
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<WizardIcon />}
            onClick={handleChangeMode}
          >
            Cambiar a Wizard
          </Button>
          <Button
            variant="contained"
            startIcon={<ViewIcon />}
            onClick={loadSystemStatus}
          >
            Actualizar Estado
          </Button>
        </Stack>
      </Stack>

      {renderSystemStatusCard()}

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Configuración SMTP" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="Proveedores de IA" icon={<AIIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {currentTab === 0 && <SMTPManualConfig onConfigChange={loadSystemStatus} />}
        {currentTab === 1 && <AIProviderManualConfig onConfigChange={loadSystemStatus} />}
      </Box>
    </Box>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Typography>Cargando configuración...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ⚙️ Configuración del Sistema
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configura SMTP, proveedores de IA y ajustes generales del sistema
        </Typography>
      </Box>

      {/* Mode Selection Dialog */}
      {renderModeSelectionDialog()}

      {/* Content based on selected mode */}
      {configMode === 'wizard' && renderWizardMode()}
      {configMode === 'manual' && renderManualMode()}
    </Container>
  );
};

export default ConfigurationDashboard;
