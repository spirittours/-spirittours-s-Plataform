/**
 * GPS Tracking Map Component
 * 
 * Mapa interactivo para rastreo GPS en tiempo real:
 * - Visualización de ubicación actual del vehículo/guía
 * - Ruta histórica con timestamps
 * - Puntos de interés (pickup, dropoff, paradas)
 * - Información del viaje en tiempo real
 * - Actualización automática cada 30 segundos
 * - Compartir ubicación en tiempo real
 * - Estimación de tiempo de llegada (ETA)
 * 
 * Integra con: backend/routes/trips.routes.js
 * 
 * NOTA: Requiere Mapbox API key en .env:
 * REACT_APP_MAPBOX_TOKEN=your_mapbox_token
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Paper,
  Grid,
  CircularProgress,
  Switch,
  FormControlLabel,
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
  MyLocation as LocationIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  Room as MarkerIcon,
  Timeline as RouteIcon,
  Speed as SpeedIcon,
  AccessTime as TimeIcon,
  PersonPin as DriverIcon,
  Flag as FlagIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Navigation as NavigationIcon
} from '@mui/icons-material';
import axios from 'axios';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Types
interface GPSLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  accuracy?: number;
  heading?: number;
}

interface TripLocation {
  trip_id: string;
  current_location: GPSLocation;
  location_history: GPSLocation[];
  tracking_enabled: boolean;
  last_update: string;
  estimated_arrival?: string;
  distance_remaining?: number;
}

interface TripDetails {
  trip_id: string;
  booking_reference: string;
  status: string;
  departure_location: string;
  arrival_location: string;
  departure_time: string;
  guide_name?: string;
  vehicle_info?: string;
}

interface MapMarker {
  id: string;
  type: 'current' | 'start' | 'end' | 'waypoint';
  position: [number, number];
  label: string;
  color: string;
}

const GPSTrackingMap: React.FC<{ tripId: string }> = ({ tripId }) => {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [locationData, setLocationData] = useState<TripLocation | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mapbox token (should be in .env)
  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example';

  // Load data on mount
  useEffect(() => {
    loadTripData();
    initializeMap();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [tripId]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refreshLocation();
      }, 30000); // 30 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Initialize map (placeholder for actual Mapbox integration)
  const initializeMap = () => {
    // NOTE: This is a placeholder. In production, you would use:
    // mapboxgl.accessToken = MAPBOX_TOKEN;
    // const map = new mapboxgl.Map({
    //   container: mapContainerRef.current,
    //   style: 'mapbox://styles/mapbox/streets-v11',
    //   center: [-74.5, 40],
    //   zoom: 12
    // });
    // mapRef.current = map;
    
    setMapReady(true);
  };

  // Load trip data
  const loadTripData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load trip details
      const tripResponse = await axios.get(`${API_BASE_URL}/trips/${tripId}`);
      setTripDetails(tripResponse.data.data);

      // Load location data
      await loadLocationData();

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading trip data:', err);
      setError(err.response?.data?.message || 'Error al cargar datos del viaje');
      setLoading(false);
    }
  };

  // Load location data
  const loadLocationData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/trips/${tripId}/location`);
      const data = response.data.data;
      setLocationData(data);

      // Update map with new location
      if (data.current_location && mapRef.current) {
        updateMapLocation(data.current_location);
      }
    } catch (err: any) {
      console.error('Error loading location:', err);
    }
  };

  // Refresh location
  const refreshLocation = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    await loadLocationData();
    setRefreshing(false);
  };

  // Update map location (placeholder)
  const updateMapLocation = (location: GPSLocation) => {
    // NOTE: In production, you would update the map marker:
    // mapRef.current.flyTo({
    //   center: [location.longitude, location.latitude],
    //   zoom: 15
    // });
    
    console.log('Updating map to location:', location);
  };

  // Enable/disable tracking
  const toggleTracking = async () => {
    try {
      const newStatus = !locationData?.tracking_enabled;
      
      await axios.post(`${API_BASE_URL}/trips/${tripId}/tracking`, {
        enabled: newStatus
      });

      await loadLocationData();
      alert(`Rastreo ${newStatus ? 'habilitado' : 'deshabilitado'} correctamente`);
    } catch (err: any) {
      alert('Error al cambiar estado de rastreo: ' + (err.response?.data?.message || err.message));
    }
  };

  // Share location
  const handleShareLocation = () => {
    const url = `${window.location.origin}/track/${tripId}`;
    setShareUrl(url);
    setShareDialogOpen(true);
  };

  // Copy share URL
  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('✅ URL copiado al portapapeles');
  };

  // Format time remaining
  const formatTimeRemaining = (isoDate?: string): string => {
    if (!isoDate) return 'N/A';
    
    const now = new Date();
    const arrival = new Date(isoDate);
    const diff = arrival.getTime() - now.getTime();
    
    if (diff < 0) return 'Retrasado';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          <NavigationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Rastreo GPS en Tiempo Real
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-actualizar"
          />
          <IconButton onClick={refreshLocation} disabled={refreshing} color="primary">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={handleShareLocation}
            sx={{ ml: 1 }}
          >
            Compartir
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Tracking Status */}
      {!locationData?.tracking_enabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Rastreo Deshabilitado</AlertTitle>
          El rastreo GPS está deshabilitado para este viaje.
          <Button size="small" onClick={toggleTracking} sx={{ ml: 2 }}>
            Habilitar Rastreo
          </Button>
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Map Container */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              {/* Placeholder Map */}
              <Box
                ref={mapContainerRef}
                sx={{
                  width: '100%',
                  height: '500px',
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  backgroundImage: 'url(https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-74.5,40,12,0/800x500?access_token=' + MAPBOX_TOKEN + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {/* Current Location Marker */}
                {locationData?.current_location && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      animation: 'pulse 2s infinite'
                    }}
                  >
                    <LocationIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  </Box>
                )}

                {/* Map Controls Overlay */}
                <Paper
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    p: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.95)'
                  }}
                >
                  <Typography variant="caption" display="block" gutterBottom>
                    <strong>NOTA:</strong> Integración con Mapbox
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Para producción, integrar mapboxgl.js
                  </Typography>
                </Paper>
              </Box>

              {/* Animation keyframes */}
              <style>
                {`
                  @keyframes pulse {
                    0% {
                      transform: translate(-50%, -50%) scale(1);
                      opacity: 1;
                    }
                    50% {
                      transform: translate(-50%, -50%) scale(1.1);
                      opacity: 0.8;
                    }
                    100% {
                      transform: translate(-50%, -50%) scale(1);
                      opacity: 1;
                    }
                  }
                `}
              </style>
            </CardContent>
          </Card>
        </Grid>

        {/* Trip Info Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Trip Details Card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Detalles del Viaje
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Referencia
                </Typography>
                <Typography variant="body1">
                  <strong>{tripDetails?.booking_reference}</strong>
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  Estado
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={tripDetails?.status.toUpperCase()}
                    color={tripDetails?.status === 'in_progress' ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  <StartIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Origen
                </Typography>
                <Typography variant="body2">
                  {tripDetails?.departure_location}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="textSecondary">
                  <FlagIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Destino
                </Typography>
                <Typography variant="body2">
                  {tripDetails?.arrival_location}
                </Typography>
              </Box>

              {tripDetails?.guide_name && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    <DriverIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Guía/Conductor
                  </Typography>
                  <Typography variant="body2">
                    {tripDetails.guide_name}
                  </Typography>
                </Box>
              )}

              {tripDetails?.vehicle_info && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Vehículo
                  </Typography>
                  <Typography variant="body2">
                    {tripDetails.vehicle_info}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Real-time Info Card */}
          {locationData?.current_location && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📍 Ubicación Actual
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'primary.light', color: 'white' }}>
                      <TimeIcon fontSize="small" />
                      <Typography variant="caption" display="block">
                        ETA
                      </Typography>
                      <Typography variant="h6">
                        {formatTimeRemaining(locationData.estimated_arrival)}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'success.light', color: 'white' }}>
                      <SpeedIcon fontSize="small" />
                      <Typography variant="caption" display="block">
                        Velocidad
                      </Typography>
                      <Typography variant="h6">
                        {locationData.current_location.speed?.toFixed(0) || '0'} km/h
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.100' }}>
                      <RouteIcon fontSize="small" />
                      <Typography variant="caption" display="block">
                        Distancia Restante
                      </Typography>
                      <Typography variant="h6">
                        {locationData.distance_remaining?.toFixed(1) || 'N/A'} km
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" color="textSecondary" display="block">
                  Última actualización
                </Typography>
                <Typography variant="body2">
                  {new Date(locationData.last_update).toLocaleString('es-ES')}
                </Typography>

                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                  Coordenadas
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {locationData.current_location.latitude.toFixed(6)}, {locationData.current_location.longitude.toFixed(6)}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Location History */}
          {locationData?.location_history && locationData.location_history.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Historial de Ubicaciones
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List dense>
                  {locationData.location_history.slice(0, 5).map((loc, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <MarkerIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={new Date(loc.timestamp).toLocaleTimeString('es-ES')}
                        secondary={`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                      />
                    </ListItem>
                  ))}
                </List>

                {locationData.location_history.length > 5 && (
                  <Typography variant="caption" color="textSecondary">
                    +{locationData.location_history.length - 5} ubicaciones más
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <ShareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Compartir Ubicación en Tiempo Real
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Enlace de Rastreo Público</AlertTitle>
            Cualquier persona con este enlace podrá ver la ubicación en tiempo real del viaje.
          </Alert>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              wordBreak: 'break-all'
            }}
          >
            {shareUrl}
          </Paper>

          <Button
            fullWidth
            variant="contained"
            onClick={copyShareUrl}
            sx={{ mt: 2 }}
          >
            Copiar Enlace
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GPSTrackingMap;
