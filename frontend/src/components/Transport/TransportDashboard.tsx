import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Tab,
  Tabs,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  Badge,
  Tooltip,
  Divider,
  LinearProgress,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  DirectionsBus,
  LocalShipping,
  Groups,
  Assignment,
  RequestQuote,
  CheckCircle,
  Schedule,
  Warning,
  Add,
  Refresh,
  FilterList,
  Visibility,
  Edit,
  Send,
  AttachMoney,
  Timer,
  Phone,
  Email,
  WhatsApp,
  NavigateNext,
} from '@mui/icons-material';
import { useTransport } from '../../hooks/useTransport';
import ServiceRequestForm from './ServiceRequestForm';
import QuoteEvaluation from './QuoteEvaluation';
import ProviderManagement from './ProviderManagement';
import VehicleDriverAssignment from './VehicleDriverAssignment';
import TransportCalendar from './TransportCalendar';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
      id={`transport-tabpanel-${index}`}
      aria-labelledby={`transport-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TransportDashboard: React.FC = () => {
  const {
    stats,
    requests,
    pendingConfirmations,
    activeProviders,
    loadDashboard,
    createServiceRequest,
    sendQuoteRequests,
    selectQuote,
    escalateRequest,
  } = useTransport();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showQuoteEvaluation, setShowQuoteEvaluation] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    dateRange: 'today',
    urgent: false,
  });
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
    // Cargar dashboard cada 30 segundos
    const interval = setInterval(() => {
      loadDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateRequest = async (requestData: any) => {
    setLoading(true);
    try {
      await createServiceRequest(requestData);
      setShowRequestForm(false);
      loadDashboard();
      addNotification('Solicitud creada exitosamente', 'success');
    } catch (error) {
      addNotification('Error al crear solicitud', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuotes = async (requestId: string) => {
    setLoading(true);
    try {
      await sendQuoteRequests(requestId);
      loadDashboard();
      addNotification('Cotizaciones enviadas a proveedores', 'success');
    } catch (error) {
      addNotification('Error al enviar cotizaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuote = async (requestId: string, quoteId: string) => {
    setLoading(true);
    try {
      await selectQuote(requestId, quoteId);
      loadDashboard();
      addNotification('Servicio confirmado exitosamente', 'success');
    } catch (error) {
      addNotification('Error al confirmar servicio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (requestId: string) => {
    setLoading(true);
    try {
      await escalateRequest(requestId);
      addNotification('Solicitud escalada a nuevos proveedores', 'info');
    } catch (error) {
      addNotification('Error al escalar solicitud', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'default',
      pending_quotes: 'warning',
      quotes_received: 'info',
      confirmed: 'success',
      in_progress: 'primary',
      completed: 'success',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getPriorityIcon = (priority: number) => {
    if (priority === 1) return <Warning color="error" />;
    if (priority === 2) return <Schedule color="warning" />;
    return null;
  };

  const formatDate = (date: string) => {
    const d = parseISO(date);
    if (isToday(d)) return 'Hoy';
    if (isTomorrow(d)) return 'Mañana';
    return format(d, 'dd/MM/yyyy', { locale: es });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          🚌 Gestión de Transporte
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Panel de control para solicitudes de servicio y gestión de proveedores
        </Typography>
      </Box>

      {/* Notifications */}
      <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 1300 }}>
        {notifications.map((notif) => (
          <Alert
            key={notif.id}
            severity={notif.type}
            sx={{ mb: 1, minWidth: 300 }}
            onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
          >
            {notif.message}
          </Alert>
        ))}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DirectionsBus sx={{ mr: 2, color: 'primary.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Proveedores Activos
                  </Typography>
                  <Typography variant="h5">{stats?.active_providers || 0}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">
                  Vehículos: {stats?.total_vehicles || 0}
                </Typography>
                <Typography variant="caption" color="success.main">
                  Disponibles: {stats?.available_vehicles || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Groups sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Conductores
                  </Typography>
                  <Typography variant="h5">{stats?.total_drivers || 0}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">
                  En servicio: {stats?.drivers_on_duty || 0}
                </Typography>
                <Typography variant="caption" color="success.main">
                  Disponibles: {stats?.available_drivers || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Badge badgeContent={pendingConfirmations?.length || 0} color="error">
                  <Assignment sx={{ mr: 2, color: 'warning.main' }} />
                </Badge>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Solicitudes Pendientes
                  </Typography>
                  <Typography variant="h5">{stats?.pending_requests || 0}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="error.main">
                  Urgentes: {stats?.urgent_requests || 0}
                </Typography>
                <Typography variant="caption">
                  Esperando cotización: {stats?.quotes_pending || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ mr: 2, color: 'success.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Servicios Hoy
                  </Typography>
                  <Typography variant="h5">{stats?.services_today || 0}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">
                  Esta semana: {stats?.services_this_week || 0}
                </Typography>
                <Typography variant="caption" color="primary.main">
                  Confirmados: {stats?.confirmed_services || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => setShowRequestForm(true)}
        >
          Nueva Solicitud
        </Button>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadDashboard}>
          Actualizar
        </Button>
        <Button variant="outlined" startIcon={<FilterList />}>
          Filtros
        </Button>
      </Box>

      {/* Main Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="transport tabs">
            <Tab label="Solicitudes Activas" />
            <Tab label="Evaluación de Cotizaciones" />
            <Tab label="Calendario" />
            <Tab label="Proveedores" />
            <Tab label="Vehículos y Conductores" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {/* Active Requests */}
          <Grid container spacing={2}>
            {requests?.map((request: any) => (
              <Grid item xs={12} key={request.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">
                          {request.request_number}
                          {getPriorityIcon(request.priority_level)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {request.service_type} - {formatDate(request.service_date)} a las{' '}
                          {request.pickup_time}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={request.status}
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                        {request.is_urgent && <Chip label="URGENTE" color="error" size="small" />}
                      </Box>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Recogida
                        </Typography>
                        <Typography variant="body2">{request.pickup_location}</Typography>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Destino
                        </Typography>
                        <Typography variant="body2">
                          {request.dropoff_location || 'Por definir'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="text.secondary">
                          Pasajeros
                        </Typography>
                        <Typography variant="body2">{request.total_passengers}</Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="text.secondary">
                          Vehículo
                        </Typography>
                        <Typography variant="body2">
                          {request.vehicle_type_required || 'Cualquiera'}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {request.lead_passenger_phone && (
                          <Tooltip title="Llamar pasajero">
                            <IconButton size="small" color="primary">
                              <Phone />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Ver detalles">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {request.status === 'draft' && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Send />}
                            onClick={() => handleSendQuotes(request.id)}
                          >
                            Enviar a Proveedores
                          </Button>
                        )}
                        {request.status === 'pending_quotes' && request.quotes_received === 0 && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleEscalate(request.id)}
                          >
                            Escalar
                          </Button>
                        )}
                        {request.status === 'quotes_received' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AttachMoney />}
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowQuoteEvaluation(true);
                            }}
                          >
                            Evaluar Cotizaciones ({request.quotes_received})
                          </Button>
                        )}
                        {request.status === 'confirmed' && (
                          <Chip
                            icon={<CheckCircle />}
                            label={`Confirmado - ${request.confirmation_number}`}
                            color="success"
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Progress bar for quote deadline */}
                    {request.quote_deadline && request.status === 'pending_quotes' && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption">Tiempo para cotizaciones</Typography>
                          <Typography variant="caption" color="warning.main">
                            <Timer fontSize="small" /> Vence:{' '}
                            {format(parseISO(request.quote_deadline), 'HH:mm')}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={60} color="warning" />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {(!requests || requests.length === 0) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    No hay solicitudes activas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Crea una nueva solicitud para comenzar
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <QuoteEvaluation
            request={selectedRequest}
            onSelectQuote={handleSelectQuote}
            onClose={() => setShowQuoteEvaluation(false)}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <TransportCalendar />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <ProviderManagement />
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <VehicleDriverAssignment />
        </TabPanel>
      </Paper>

      {/* Dialogs */}
      <Dialog open={showRequestForm} onClose={() => setShowRequestForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nueva Solicitud de Servicio</DialogTitle>
        <DialogContent>
          <ServiceRequestForm
            onSubmit={handleCreateRequest}
            onCancel={() => setShowRequestForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showQuoteEvaluation}
        onClose={() => setShowQuoteEvaluation(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Evaluación de Cotizaciones</DialogTitle>
        <DialogContent>
          <QuoteEvaluation
            request={selectedRequest}
            onSelectQuote={handleSelectQuote}
            onClose={() => setShowQuoteEvaluation(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TransportDashboard;