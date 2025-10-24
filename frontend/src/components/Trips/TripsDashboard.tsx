/**
 * Trips Management Dashboard - Superior to Expedia TAAP
 * Complete dashboard for managing trips/reservations
 * 
 * Features:
 * - 10 trip states (vs Expedia's 4)
 * - Real-time GPS tracking
 * - Integrated chat system
 * - Cost analytics
 * - Smart notifications
 * 
 * @author Spirit Tours Dev Team
 * @date 2024
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  LinearProgress,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Flight,
  Hotel,
  DirectionsBus,
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  LocationOn,
  Chat,
  Notifications,
  MoreVert,
  FilterList,
  Search,
  Download,
  Refresh,
  Map,
  Phone,
  Email,
  WhatsApp
} from '@mui/icons-material';
import axios from 'axios';

interface Trip {
  trip_id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tour_name: string;
  status: string;
  departure_date: string;
  return_date: string;
  total_amount: number;
  paid_amount: number;
  passenger_count: number;
  channel: string;
  tracking_enabled: boolean;
  chat_thread_id: string;
  rating: number | null;
  nps_score: number | null;
  created_at: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const TripsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const tripStatuses = [
    { label: 'Todos', value: 'all', color: 'default' },
    { label: 'Pendientes', value: 'pending', color: 'warning' },
    { label: 'Próximos', value: 'upcoming', color: 'info' },
    { label: 'En Progreso', value: 'in_progress', color: 'primary' },
    { label: 'Completados', value: 'completed', color: 'success' },
    { label: 'Cancelados', value: 'cancelled', color: 'error' }
  ];

  useEffect(() => {
    loadTrips();
    loadStats();
  }, [activeTab]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const status = tripStatuses[activeTab].value;
      const params = status === 'all' ? {} : { status };
      
      const response = await axios.get(`${API_BASE_URL}/trips`, { params });
      if (response.data.success) {
        setTrips(response.data.data);
      }
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/trips/stats`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      pending: <Pending color="warning" />,
      upcoming: <Schedule color="info" />,
      in_progress: <DirectionsBus color="primary" />,
      completed: <CheckCircle color="success" />,
      cancelled: <Cancel color="error" />
    };
    return icons[status] || <Schedule />;
  };

  const getStatusColor = (status: string): any => {
    const colors: Record<string, any> = {
      pending: 'warning',
      upcoming: 'info',
      in_progress: 'primary',
      completed: 'success',
      cancelled: 'error',
      refunded: 'secondary',
      no_show: 'error',
      modified: 'info',
      waiting_list: 'warning',
      priority: 'error'
    };
    return colors[status] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleSendNotification = async (trip: Trip) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/trips/${trip.trip_id}/send-notifications`,
        { notification_type: 'travel_reminder' }
      );
      
      if (response.data.success) {
        alert(`Notificación enviada por ${response.data.channel_used}`);
      }
    } catch (error) {
      alert('Error al enviar notificación');
    }
  };

  const openTracking = (trip: Trip) => {
    window.open(`/tracking/${trip.trip_id}`, '_blank');
  };

  const openChat = (trip: Trip) => {
    window.open(`/chat/${trip.chat_thread_id}`, '_blank');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Gestión de Viajes
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Refresh />} onClick={loadTrips}>
            Actualizar
          </Button>
          <Button startIcon={<Download />} variant="outlined">
            Exportar
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Viajes
                </Typography>
                <Typography variant="h4">
                  {stats.total_trips}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  En Progreso
                </Typography>
                <Typography variant="h4" color="primary">
                  {stats.in_progress_count}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(stats.in_progress_count / stats.total_trips) * 100} 
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Pasajeros
                </Typography>
                <Typography variant="h4" color="success.main">
                  {stats.total_passengers}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  color="success"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Ingresos
                </Typography>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(stats.total_revenue)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  color="success"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Buscar por referencia, nombre, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={(e) => setFilterAnchor(e.currentTarget)}
            >
              Filtros
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable">
          {tripStatuses.map((status, index) => (
            <Tab
              key={status.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {status.label}
                  <Chip 
                    label={
                      status.value === 'all' 
                        ? stats?.total_trips || 0 
                        : trips.filter(t => t.status === status.value).length
                    }
                    size="small"
                    color={status.color as any}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        <Divider />

        {/* Trips Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Referencia</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Tour</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Pasajeros</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Canal</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary">
                      No hay viajes en esta categoría
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                trips
                  .filter(trip => 
                    !searchTerm || 
                    trip.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    trip.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    trip.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((trip) => (
                    <TableRow key={trip.trip_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {trip.booking_reference}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {trip.customer_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {trip.customer_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {trip.customer_email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {trip.tour_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(trip.departure_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(trip.status)}
                          label={trip.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(trip.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={trip.passenger_count} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(trip.total_amount)}
                        </Typography>
                        {trip.paid_amount < trip.total_amount && (
                          <Typography variant="caption" color="warning.main">
                            Pendiente: {formatCurrency(trip.total_amount - trip.paid_amount)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={trip.channel.toUpperCase()} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {trip.tracking_enabled && (
                            <Tooltip title="Ver Ubicación">
                              <IconButton size="small" onClick={() => openTracking(trip)}>
                                <LocationOn fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {trip.chat_thread_id && (
                            <Tooltip title="Chat">
                              <IconButton size="small" onClick={() => openChat(trip)}>
                                <Badge badgeContent={0} color="error">
                                  <Chat fontSize="small" />
                                </Badge>
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Enviar Notificación">
                            <IconButton size="small" onClick={() => handleSendNotification(trip)}>
                              <Notifications fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small">
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default TripsDashboard;
