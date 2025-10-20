/**
 * Live Journey Control Dashboard for Administrators
 * Real-time monitoring and control of all active tours and transports
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent,
  IconButton,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert,
  AlertTitle,
  Badge,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';

import {
  Map as MapIcon,
  LocationOn,
  DirectionsCar,
  Warning,
  CheckCircle,
  Error,
  Person,
  Group,
  Phone,
  Message,
  NotificationsActive,
  Timeline,
  Speed,
  Navigation,
  CameraAlt,
  QrCode2,
  GpsFixed,
  Report,
  Emergency,
  Restaurant,
  Hotel,
  Flight,
  Timer,
  TrendingUp,
  Refresh,
  PlayArrow,
  Pause,
  Stop,
  VolumeUp,
  Psychology,
  SmartToy
} from '@mui/icons-material';

import { GoogleMap, DirectionsRenderer, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { io, Socket } from 'socket.io-client';
import { format, differenceInMinutes } from 'date-fns';

// Types
interface ActiveJourney {
  journeyId: string;
  tripId: string;
  tourName: string;
  startDate: Date;
  status: string;
  stage: string;
  groupSize: number;
  guide: VirtualGuide;
  transport: TransportService;
  passengers: Passenger[];
  currentLocation: Location;
  nextDestination: Destination;
  alerts: Alert[];
  timeline: TimelineEvent[];
}

interface VirtualGuide {
  guideId: string;
  name: string;
  personality: string;
  language: string;
  isActive: boolean;
  isSpeaking: boolean;
  currentExplanation?: string;
  interactionCount: number;
  satisfaction: number;
}

interface TransportService {
  serviceId: string;
  driverName: string;
  driverPhone: string;
  vehicleInfo: VehicleInfo;
  status: string;
  pickupVerified: boolean;
  dropoffVerified: boolean;
  currentLocation: Location;
  speed: number;
  eta: Date;
  routeEfficiency: number;
  tracking: boolean;
}

interface Passenger {
  id: string;
  name: string;
  phone: string;
  status: string;
  location?: Location;
  sharingLocation: boolean;
  lastContact: Date;
}

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: Date;
}

interface VehicleInfo {
  plate: string;
  model: string;
  color: string;
  capacity: number;
}

interface Destination {
  name: string;
  location: Location;
  arrivalTime: Date;
  timeAtLocation: number;
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
}

interface TimelineEvent {
  time: Date;
  event: string;
  details: string;
  type: string;
}

// Component
const LiveJourneyControl: React.FC = () => {
  // State
  const [activeJourneys, setActiveJourneys] = useState<ActiveJourney[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<ActiveJourney | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [mapCenter, setMapCenter] = useState({ lat: 31.7683, lng: 35.2137 }); // Jerusalem
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [communicationDialog, setCommunicationDialog] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  
  // WebSocket
  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io('/admin-monitoring', {
      auth: {
        token: localStorage.getItem('adminToken')
      }
    });

    socketRef.current.on('journey:update', (data) => {
      updateJourney(data);
    });

    socketRef.current.on('alert:new', (alert) => {
      handleNewAlert(alert);
    });

    socketRef.current.on('location:update', (data) => {
      updateLocation(data);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActiveJourneys();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Fetch active journeys
  const fetchActiveJourneys = async () => {
    try {
      const response = await fetch('/api/admin/journeys/active');
      const data = await response.json();
      setActiveJourneys(data);
    } catch (error) {
      console.error('Error fetching journeys:', error);
    }
  };

  // Update journey data
  const updateJourney = (journeyData: Partial<ActiveJourney>) => {
    setActiveJourneys(prev => 
      prev.map(j => j.journeyId === journeyData.journeyId 
        ? { ...j, ...journeyData } 
        : j
      )
    );
  };

  // Handle new alert
  const handleNewAlert = (alert: Alert) => {
    // Update journey with new alert
    setActiveJourneys(prev =>
      prev.map(j => {
        if (j.journeyId === alert.journeyId) {
          return {
            ...j,
            alerts: [...j.alerts, alert]
          };
        }
        return j;
      })
    );

    // Show notification if critical
    if (alert.severity === 'critical') {
      showNotification('Critical Alert', alert.description);
    }
  };

  // Update location
  const updateLocation = (data: { journeyId: string; location: Location; type: string }) => {
    setActiveJourneys(prev =>
      prev.map(j => {
        if (j.journeyId === data.journeyId) {
          if (data.type === 'driver') {
            return {
              ...j,
              transport: {
                ...j.transport,
                currentLocation: data.location
              }
            };
          } else {
            return {
              ...j,
              currentLocation: data.location
            };
          }
        }
        return j;
      })
    );
  };

  // Send message
  const sendMessage = async (journeyId: string, message: string, recipients: string[]) => {
    try {
      await fetch('/api/admin/communication/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          message,
          recipients,
          priority: 'normal'
        })
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Verify service
  const verifyService = async (serviceId: string, stage: 'pickup' | 'dropoff') => {
    try {
      const response = await fetch(`/api/admin/transport/verify/${stage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId })
      });
      const result = await response.json();
      
      if (result.success) {
        showNotification('Success', `${stage} verified successfully`);
      }
    } catch (error) {
      console.error('Error verifying service:', error);
    }
  };

  // Change guide personality
  const changeGuidePersonality = async (journeyId: string, newPersonality: string) => {
    try {
      await fetch('/api/admin/guide/personality', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId,
          personality: newPersonality
        })
      });
    } catch (error) {
      console.error('Error changing personality:', error);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string, resolution: string) => {
    try {
      await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // Show notification
  const showNotification = (title: string, message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo.png'
      });
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'success',
      delayed: 'warning',
      issue: 'error',
      completed: 'default',
      scheduled: 'info'
    };
    return statusColors[status] || 'default';
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#ff5722',
      critical: '#d32f2f'
    };
    return colors[severity] || '#757575';
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" component="h1" gutterBottom>
              Live Journey Control Center
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Monitoring {activeJourneys.length} active journeys
            </Typography>
          </Grid>
          
          <Grid item>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto Refresh"
              />
              
              <FormControl size="small">
                <Select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                >
                  <MenuItem value={5000}>5s</MenuItem>
                  <MenuItem value={10000}>10s</MenuItem>
                  <MenuItem value={30000}>30s</MenuItem>
                  <MenuItem value={60000}>1m</MenuItem>
                </Select>
              </FormControl>
              
              <IconButton onClick={fetchActiveJourneys}>
                <Refresh />
              </IconButton>
              
              <Badge badgeContent={activeJourneys.filter(j => 
                j.alerts.some(a => !a.resolved && a.severity === 'critical')
              ).length} color="error">
                <NotificationsActive />
              </Badge>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Journey List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '80vh', overflow: 'auto' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Active Journeys
              </Typography>
              
              <List>
                {activeJourneys.map((journey) => (
                  <ListItem
                    key={journey.journeyId}
                    button
                    selected={selectedJourney?.journeyId === journey.journeyId}
                    onClick={() => setSelectedJourney(journey)}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={journey.alerts.filter(a => !a.resolved).length}
                        color="error"
                      >
                        <Avatar sx={{ bgcolor: getStatusColor(journey.status) }}>
                          <Group />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={journey.tourName}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {journey.groupSize} passengers • {journey.guide.personality}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Stage: {journey.stage}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {journey.transport.tracking && (
                              <Chip
                                size="small"
                                icon={<GpsFixed />}
                                label="Tracking"
                                color="primary"
                              />
                            )}
                            {journey.alerts.some(a => !a.resolved) && (
                              <Chip
                                size="small"
                                icon={<Warning />}
                                label="Alerts"
                                color="warning"
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {selectedJourney ? (
            <Paper sx={{ height: '80vh' }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab icon={<MapIcon />} label="Map" />
                <Tab icon={<SmartToy />} label="AI Guide" />
                <Tab icon={<DirectionsCar />} label="Transport" />
                <Tab icon={<Group />} label="Passengers" />
                <Tab icon={<Warning />} label="Alerts" />
                <Tab icon={<Timeline />} label="Timeline" />
                <Tab icon={<Message />} label="Communication" />
              </Tabs>

              <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
                {/* Map Tab */}
                {activeTab === 0 && (
                  <Box sx={{ height: '100%' }}>
                    <GoogleMap
                      center={mapCenter}
                      zoom={13}
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      onLoad={(map) => { mapRef.current = map; }}
                    >
                      {/* Driver location */}
                      {selectedJourney.transport.currentLocation && (
                        <Marker
                          position={{
                            lat: selectedJourney.transport.currentLocation.lat,
                            lng: selectedJourney.transport.currentLocation.lng
                          }}
                          icon={{
                            url: '/icons/car.svg',
                            scaledSize: new google.maps.Size(40, 40)
                          }}
                          title="Driver Location"
                        />
                      )}

                      {/* Passenger locations */}
                      {selectedJourney.passengers
                        .filter(p => p.sharingLocation && p.location)
                        .map(passenger => (
                          <Marker
                            key={passenger.id}
                            position={{
                              lat: passenger.location!.lat,
                              lng: passenger.location!.lng
                            }}
                            icon={{
                              url: '/icons/person.svg',
                              scaledSize: new google.maps.Size(30, 30)
                            }}
                            title={passenger.name}
                          />
                        ))}

                      {/* Next destination */}
                      {selectedJourney.nextDestination && (
                        <Marker
                          position={{
                            lat: selectedJourney.nextDestination.location.lat,
                            lng: selectedJourney.nextDestination.location.lng
                          }}
                          icon={{
                            url: '/icons/destination.svg',
                            scaledSize: new google.maps.Size(35, 35)
                          }}
                          title={selectedJourney.nextDestination.name}
                        />
                      )}
                    </GoogleMap>

                    {/* Map overlay info */}
                    <Paper
                      sx={{
                        position: 'absolute',
                        top: 80,
                        left: 20,
                        p: 2,
                        maxWidth: 300
                      }}
                    >
                      <Typography variant="subtitle2" gutterBottom>
                        Current Status
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Speed />
                        <Typography variant="body2">
                          {selectedJourney.transport.speed} km/h
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Timer />
                        <Typography variant="body2">
                          ETA: {format(new Date(selectedJourney.transport.eta), 'HH:mm')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp />
                        <Typography variant="body2">
                          Route Efficiency: {selectedJourney.transport.routeEfficiency}%
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                )}

                {/* AI Guide Tab */}
                {activeTab === 1 && (
                  <Box>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box>
                            <Typography variant="h6">
                              {selectedJourney.guide.name}
                            </Typography>
                            <Chip
                              label={selectedJourney.guide.personality}
                              color="primary"
                              size="small"
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {selectedJourney.guide.isActive ? (
                              <Chip
                                icon={<CheckCircle />}
                                label="Active"
                                color="success"
                              />
                            ) : (
                              <Chip
                                icon={<Error />}
                                label="Inactive"
                                color="error"
                              />
                            )}
                            
                            {selectedJourney.guide.isSpeaking && (
                              <Chip
                                icon={<VolumeUp />}
                                label="Speaking"
                                color="info"
                              />
                            )}
                          </Box>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="textSecondary">
                              Language
                            </Typography>
                            <Typography variant="body1">
                              {selectedJourney.guide.language}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="body2" color="textSecondary">
                              Interactions
                            </Typography>
                            <Typography variant="body1">
                              {selectedJourney.guide.interactionCount}
                            </Typography>
                          </Grid>
                          
                          <Grid item xs={6}>
                            <Typography variant="body2" color="textSecondary">
                              Satisfaction
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">
                                {selectedJourney.guide.satisfaction}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={selectedJourney.guide.satisfaction}
                                sx={{ ml: 2, flexGrow: 1 }}
                              />
                            </Box>
                          </Grid>
                        </Grid>

                        {selectedJourney.guide.currentExplanation && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Currently Explaining:
                            </Typography>
                            <Typography variant="body2">
                              {selectedJourney.guide.currentExplanation}
                            </Typography>
                          </Box>
                        )}

                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<Psychology />}
                            onClick={() => {
                              // Open personality change dialog
                            }}
                          >
                            Change Personality
                          </Button>
                          
                          <Button
                            variant="outlined"
                            startIcon={<Pause />}
                          >
                            Pause Guide
                          </Button>
                          
                          <Button
                            variant="outlined"
                            startIcon={<Message />}
                          >
                            Send Script
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Transport Tab */}
                {activeTab === 2 && (
                  <Box>
                    <Card sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Transport Service
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Driver
                              </Typography>
                              <Typography variant="body1">
                                {selectedJourney.transport.driverName}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone fontSize="small" />
                                <Typography variant="body2">
                                  {selectedJourney.transport.driverPhone}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" color="textSecondary">
                                Vehicle
                              </Typography>
                              <Typography variant="body1">
                                {selectedJourney.transport.vehicleInfo.model}
                              </Typography>
                              <Typography variant="body2">
                                {selectedJourney.transport.vehicleInfo.color} • {selectedJourney.transport.vehicleInfo.plate}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <IconButton
                              color={selectedJourney.transport.pickupVerified ? 'success' : 'default'}
                            >
                              <LocationOn />
                            </IconButton>
                            <Typography variant="caption" display="block">
                              Pickup {selectedJourney.transport.pickupVerified ? 'Verified' : 'Pending'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ textAlign: 'center' }}>
                            <IconButton
                              color={selectedJourney.transport.tracking ? 'primary' : 'default'}
                            >
                              <GpsFixed />
                            </IconButton>
                            <Typography variant="caption" display="block">
                              Tracking {selectedJourney.transport.tracking ? 'Active' : 'Inactive'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ textAlign: 'center' }}>
                            <IconButton
                              color={selectedJourney.transport.dropoffVerified ? 'success' : 'default'}
                            >
                              <CheckCircle />
                            </IconButton>
                            <Typography variant="caption" display="block">
                              Dropoff {selectedJourney.transport.dropoffVerified ? 'Verified' : 'Pending'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => verifyService(selectedJourney.transport.serviceId, 'pickup')}
                            disabled={selectedJourney.transport.pickupVerified}
                          >
                            Verify Pickup
                          </Button>
                          
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => verifyService(selectedJourney.transport.serviceId, 'dropoff')}
                            disabled={selectedJourney.transport.dropoffVerified}
                          >
                            Verify Dropoff
                          </Button>
                          
                          <Button
                            variant="outlined"
                            startIcon={<Phone />}
                          >
                            Call Driver
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Passengers Tab */}
                {activeTab === 3 && (
                  <Box>
                    <List>
                      {selectedJourney.passengers.map((passenger) => (
                        <Card key={passenger.id} sx={{ mb: 1 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Box>
                                <Typography variant="subtitle1">
                                  {passenger.name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {passenger.phone}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                  label={passenger.status}
                                  color={passenger.status === 'onboard' ? 'success' : 'default'}
                                  size="small"
                                />
                                
                                {passenger.sharingLocation && (
                                  <Chip
                                    icon={<LocationOn />}
                                    label="Location"
                                    color="primary"
                                    size="small"
                                  />
                                )}
                              </Box>
                            </Box>
                            
                            <Typography variant="caption" color="textSecondary">
                              Last contact: {format(new Date(passenger.lastContact), 'HH:mm')}
                            </Typography>
                            
                            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                              <IconButton size="small">
                                <Phone />
                              </IconButton>
                              <IconButton size="small">
                                <Message />
                              </IconButton>
                              <IconButton size="small">
                                <LocationOn />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Alerts Tab */}
                {activeTab === 4 && (
                  <Box>
                    {selectedJourney.alerts.length === 0 ? (
                      <Alert severity="success">
                        <AlertTitle>No Active Alerts</AlertTitle>
                        All systems operating normally
                      </Alert>
                    ) : (
                      <List>
                        {selectedJourney.alerts
                          .filter(a => !a.resolved)
                          .map((alert) => (
                            <Alert
                              key={alert.id}
                              severity={alert.severity as any}
                              sx={{ mb: 1 }}
                              action={
                                <Button
                                  color="inherit"
                                  size="small"
                                  onClick={() => resolveAlert(alert.id, 'Resolved by admin')}
                                >
                                  Resolve
                                </Button>
                              }
                            >
                              <AlertTitle>{alert.title}</AlertTitle>
                              {alert.description}
                              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                {format(new Date(alert.timestamp), 'HH:mm:ss')}
                              </Typography>
                            </Alert>
                          ))}
                      </List>
                    )}
                  </Box>
                )}

                {/* Timeline Tab */}
                {activeTab === 5 && (
                  <Box>
                    <List>
                      {selectedJourney.timeline.map((event, index) => (
                        <ListItem key={index}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              <Timeline />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={event.event}
                            secondary={
                              <>
                                {event.details}
                                <Typography variant="caption" display="block">
                                  {format(new Date(event.time), 'HH:mm:ss')}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Communication Tab */}
                {activeTab === 6 && (
                  <Box>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Send Message
                        </Typography>
                        
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type your message..."
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                        
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            onClick={() => {
                              sendMessage(
                                selectedJourney.journeyId,
                                messageText,
                                ['all']
                              );
                              setMessageText('');
                            }}
                          >
                            Send to All
                          </Button>
                          
                          <Button variant="outlined">
                            Send to Driver
                          </Button>
                          
                          <Button variant="outlined">
                            Send to Guide
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Select a journey to view details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveJourneyControl;