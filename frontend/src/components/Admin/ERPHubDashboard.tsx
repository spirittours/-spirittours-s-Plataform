/**
 * ERP Hub Dashboard
 * 
 * Panel de administración central para gestión de integraciones ERP.
 * Permite configurar conexiones, monitorear sincronizaciones, y gestionar mapeos.
 * 
 * Funcionalidades:
 * - Conectar/desconectar sistemas ERP (QuickBooks, Xero, FreshBooks, etc.)
 * - Monitorear estado de sincronizaciones en tiempo real
 * - Ver logs de operaciones
 * - Configurar mapeos de cuentas contables
 * - Gestionar autenticación OAuth 2.0
 * 
 * @component
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Sync as SyncIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// Components
import ERPConnectionWizard from './ERPConnectionWizard';
import ERPSyncMonitor from './ERPSyncMonitor';
import ERPSyncLogs from './ERPSyncLogs';
import ERPAccountMapping from './ERPAccountMapping';

// Types
interface Branch {
  id: string;
  nombre: string;
  pais_codigo: string;
}

interface ERPConfig {
  id: string;
  sucursal_id: string;
  erp_provider: string;
  erp_region: string;
  is_connected: boolean;
  sync_enabled: boolean;
  last_sync: string | null;
  created_at: string;
  sync_status?: {
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    last_error: string | null;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`erp-tabpanel-${index}`}
      aria-labelledby={`erp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ERPHubDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [erpConfigs, setERPConfigs] = useState<ERPConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  
  // Dialog states
  const [connectionWizardOpen, setConnectionWizardOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [configToDisconnect, setConfigToDisconnect] = useState<ERPConfig | null>(null);

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Fetch ERP configs when branch is selected
  useEffect(() => {
    if (selectedBranch) {
      fetchERPConfigs(selectedBranch);
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get('/api/branches');
      setBranches(response.data.branches || []);
      if (response.data.branches.length > 0 && !selectedBranch) {
        setSelectedBranch(response.data.branches[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast.error('Error al cargar sucursales');
    }
  };

  const fetchERPConfigs = async (branchId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/erp-hub/config/branch/${branchId}`);
      setERPConfigs(response.data.configs || []);
    } catch (error: any) {
      console.error('Error fetching ERP configs:', error);
      toast.error('Error al cargar configuraciones ERP');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleConnectERP = () => {
    setConnectionWizardOpen(true);
  };

  const handleDisconnectERP = (config: ERPConfig) => {
    setConfigToDisconnect(config);
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = async () => {
    if (!configToDisconnect) return;

    try {
      await axios.post(`/api/erp-hub/disconnect/${configToDisconnect.id}`);
      toast.success(`Desconectado de ${configToDisconnect.erp_provider}`);
      setDisconnectDialogOpen(false);
      setConfigToDisconnect(null);
      if (selectedBranch) {
        fetchERPConfigs(selectedBranch);
      }
    } catch (error: any) {
      console.error('Error disconnecting ERP:', error);
      toast.error('Error al desconectar ERP');
    }
  };

  const handleToggleSync = async (config: ERPConfig) => {
    try {
      await axios.post(`/api/erp-hub/config/${config.id}/toggle-sync`, {
        sync_enabled: !config.sync_enabled
      });
      toast.success(
        config.sync_enabled 
          ? 'Sincronización desactivada' 
          : 'Sincronización activada'
      );
      if (selectedBranch) {
        fetchERPConfigs(selectedBranch);
      }
    } catch (error: any) {
      console.error('Error toggling sync:', error);
      toast.error('Error al cambiar configuración de sincronización');
    }
  };

  const handleManualSync = async (config: ERPConfig) => {
    try {
      setSyncingNow(true);
      await axios.post(`/api/erp-hub/sync/manual`, {
        sucursalId: config.sucursal_id,
        erpProvider: config.erp_provider
      });
      toast.success('Sincronización iniciada');
      if (selectedBranch) {
        fetchERPConfigs(selectedBranch);
      }
    } catch (error: any) {
      console.error('Error starting manual sync:', error);
      toast.error('Error al iniciar sincronización');
    } finally {
      setSyncingNow(false);
    }
  };

  const getProviderColor = (provider: string): 'primary' | 'secondary' | 'success' | 'warning' => {
    const colors: Record<string, any> = {
      quickbooks: 'primary',
      xero: 'secondary',
      freshbooks: 'success',
      contpaqi: 'warning',
    };
    return colors[provider.toLowerCase()] || 'default';
  };

  const getProviderName = (provider: string, region: string): string => {
    const names: Record<string, string> = {
      quickbooks: 'QuickBooks Online',
      xero: 'Xero',
      freshbooks: 'FreshBooks',
      contpaqi: 'CONTPAQi',
      aspel: 'Aspel',
      alegra: 'Alegra',
    };
    return `${names[provider.toLowerCase()] || provider} (${region.toUpperCase()})`;
  };

  const selectedBranchData = branches.find(b => b.id === selectedBranch);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AccountBalanceIcon sx={{ mr: 2, fontSize: 40 }} />
          ERP Hub - Integraciones Contables
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión centralizada de integraciones con sistemas ERP y contables
        </Typography>
      </Box>

      {/* Branch Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Sucursal Seleccionada
              </Typography>
              {selectedBranchData && (
                <Chip 
                  label={`${selectedBranchData.nombre} - ${selectedBranchData.pais_codigo}`}
                  color="primary"
                  size="medium"
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                startIcon={<LinkIcon />}
                onClick={handleConnectERP}
                size="medium"
              >
                Conectar Nuevo ERP
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Connected ERPs Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Sistemas ERP Conectados
          </Typography>
          {loading ? (
            <CircularProgress />
          ) : erpConfigs.length === 0 ? (
            <Alert severity="info">
              No hay sistemas ERP conectados para esta sucursal. 
              Haz clic en "Conectar Nuevo ERP" para comenzar.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {erpConfigs.map((config) => (
                <Grid item xs={12} md={6} lg={4} key={config.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Chip 
                          label={getProviderName(config.erp_provider, config.erp_region)}
                          color={getProviderColor(config.erp_provider)}
                          size="small"
                        />
                        {config.is_connected ? (
                          <Chip 
                            icon={<CheckIcon />}
                            label="Conectado" 
                            color="success" 
                            size="small"
                          />
                        ) : (
                          <Chip 
                            icon={<ErrorIcon />}
                            label="Desconectado" 
                            color="error" 
                            size="small"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Sincronización: {config.sync_enabled ? 'Activa' : 'Inactiva'}
                      </Typography>
                      
                      {config.last_sync && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Última sync: {format(new Date(config.last_sync), 'dd/MM/yyyy HH:mm')}
                        </Typography>
                      )}

                      {config.sync_status && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Sincronizaciones: {config.sync_status.successful_syncs} / {config.sync_status.total_syncs} exitosas
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={(config.sync_status.successful_syncs / config.sync_status.total_syncs) * 100}
                            color={config.sync_status.failed_syncs > 0 ? 'warning' : 'success'}
                          />
                        </Box>
                      )}

                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Tooltip title="Sincronizar ahora">
                          <IconButton 
                            color="primary" 
                            size="small"
                            onClick={() => handleManualSync(config)}
                            disabled={!config.is_connected || syncingNow}
                          >
                            <SyncIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={config.sync_enabled ? 'Desactivar sync' : 'Activar sync'}>
                          <IconButton 
                            color="secondary" 
                            size="small"
                            onClick={() => handleToggleSync(config)}
                            disabled={!config.is_connected}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desconectar">
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => handleDisconnectERP(config)}
                          >
                            <LinkOffIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="ERP Hub tabs">
            <Tab icon={<TimelineIcon />} iconPosition="start" label="Monitor de Sincronización" />
            <Tab icon={<RefreshIcon />} iconPosition="start" label="Logs de Operaciones" />
            <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="Mapeo de Cuentas" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <ERPSyncMonitor 
            branchId={selectedBranch} 
            erpConfigs={erpConfigs}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ERPSyncLogs 
            branchId={selectedBranch}
            erpConfigs={erpConfigs}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <ERPAccountMapping 
            branchId={selectedBranch}
            erpConfigs={erpConfigs}
          />
        </TabPanel>
      </Card>

      {/* Connection Wizard Dialog */}
      <ERPConnectionWizard
        open={connectionWizardOpen}
        onClose={() => setConnectionWizardOpen(false)}
        branchId={selectedBranch}
        onSuccess={() => {
          setConnectionWizardOpen(false);
          if (selectedBranch) {
            fetchERPConfigs(selectedBranch);
          }
        }}
      />

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
      >
        <DialogTitle>Confirmar Desconexión</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas desconectar {configToDisconnect && getProviderName(configToDisconnect.erp_provider, configToDisconnect.erp_region)}?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta acción no eliminará los datos sincronizados previamente, pero detendrá futuras sincronizaciones.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmDisconnect} color="error" variant="contained">
            Desconectar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ERPHubDashboard;
