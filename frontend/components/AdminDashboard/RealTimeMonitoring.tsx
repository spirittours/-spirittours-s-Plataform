"""
Real-Time Administrative Dashboard for Virtual Guide System
Complete monitoring and control of all tours, guides, and transport
"""

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Badge,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  LinearProgress,
  CircularProgress,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Tooltip,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';

import {
  Map as MapIcon,
  Person,
  DirectionsCar,
  Warning,
  CheckCircle,
  Error,
  Info,
  LocationOn,
  Navigation,
  Group,
  Mic,
  MicOff,
  VolumeUp,
  VolumeOff,
  Speed,
  Timeline,
  Assessment,
  Notifications,
  Message,
  VideoCall,
  Security,
  VerifiedUser,
  Report,
  PersonPin,
  LocalActivity,
  Language,
  Psychology,
  EmojiEmotions,
  RecordVoiceOver,
  SupportAgent,
  AdminPanelSettings,
  Dashboard as DashboardIcon,
  Refresh,
  Search,
  FilterList,
  MoreVert,
  Send,
  Block,
  PlayArrow,
  Pause,
  Stop,
  SkipNext,
  Settings
} from '@mui/icons-material';

import { GoogleMap, Marker, Polyline, InfoWindow, HeatmapLayer } from '@react-google-maps/api';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import io from 'socket.io-client';
import { format, formatDistance, subMinutes } from 'date-fns';

// Types and Interfaces
interface VirtualGuide {
  id: string;
  name: string;
  personality: string;
  language: string;
  status: 'active' | 'paused' | 'inactive';
  currentGroup: string;
  groupSize: number;
  satisfaction: number;
  interactions: number;
  currentLocation: { lat: number; lng: number };
  isSpeaking: boolean;
  currentExplanation?: string;
}

interface TourGroup {
  id: string;
  name: string;
  guideId: string;
  size: number;
  status: 'preparing' | 'in_progress' | 'completed' | 'delayed';
  currentLocation: { lat: number; lng: number };
  nextDestination: string;
  progress: number;
  alerts: Alert[];
  verificationStatus: 'verified' | 'pending' | 'suspicious';
}

interface Driver {
  id: string;
  name: string;
  vehicleId: string;
  status: 'available' | 'assigned' | 'driving' | 'break';
  location: { lat: number; lng: number };
  speed: number;
  heading: number;
  verificationScore: number;
  fraudIndicators: string[];
}

interface Alert {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  groupId?: string;
  driverId?: string;
  resolved: boolean;
}

// Main Dashboard Component
const RealTimeMonitoringDashboard: React.FC = () => {
  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [guides, setGuides] = useState<VirtualGuide[]>([]);
  const [groups, setGroups] = useState<TourGroup[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<VirtualGuide | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<TourGroup | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 31.7683, lng: 35.2137 }); // Jerusalem
  const [mapZoom, setMapZoom] = useState(11);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  
  // Dialog States
  const [guideControlDialog, setGuideControlDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [verificationDialog, setVerificationDialog] = useState(false);
  
  // WebSocket Connection
  const socketRef = useRef<any>(null);
  
  // Connect to WebSocket
  useEffect(() => {
    socketRef.current = io('ws://localhost:3001', {
      transports: ['websocket']
    });
    
    // Listen for real-time updates
    socketRef.current.on('guide_update', (data: VirtualGuide) => {
      setGuides(prev => prev.map(g => g.id === data.id ? data : g));
    });
    
    socketRef.current.on('group_update', (data: TourGroup) => {
      setGroups(prev => prev.map(g => g.id === data.id ? data : g));
    });
    
    socketRef.current.on('driver_update', (data: Driver) => {
      setDrivers(prev => prev.map(d => d.id === data.id ? data : d));
    });
    
    socketRef.current.on('new_alert', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100)); // Keep last 100 alerts
      handleNewAlert(alert);
    });
    
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);
  
  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);
  
  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [guidesRes, groupsRes, driversRes, alertsRes] = await Promise.all([
        fetch('/api/admin/guides'),
        fetch('/api/admin/groups'),
        fetch('/api/admin/drivers'),
        fetch('/api/admin/alerts')
      ]);
      
      setGuides(await guidesRes.json());
      setGroups(await groupsRes.json());
      setDrivers(await driversRes.json());
      setAlerts(await alertsRes.json());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };
  
  // Handle new alerts
  const handleNewAlert = (alert: Alert) => {
    if (alert.level === 'critical' || alert.level === 'high') {
      // Show notification for high priority alerts
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Critical Alert', {
          body: alert.message,
          icon: '/logo.png'
        });
      }
    }
  };
  
  // Map Component
  const MapView: React.FC = () => (
    <Paper sx={{ height: '100%', position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '600px' }}
        center={mapCenter}
        zoom={mapZoom}
        options={{
          fullscreenControl: true,
          mapTypeControl: true,
          streetViewControl: false
        }}
      >
        {/* Tour Groups */}
        {groups.map(group => (
          <Marker
            key={group.id}
            position={group.currentLocation}
            icon={{
              url: '/icons/group-marker.png',
              scaledSize: new google.maps.Size(40, 40)
            }}
            onClick={() => setSelectedGroup(group)}
          />
        ))}
        
        {/* Drivers */}
        {drivers.map(driver => (
          <Marker
            key={driver.id}
            position={driver.location}
            icon={{
              url: driver.fraudIndicators.length > 0 
                ? '/icons/driver-warning.png'
                : '/icons/driver-marker.png',
              scaledSize: new google.maps.Size(30, 30),
              rotation: driver.heading
            }}
            onClick={() => setSelectedDriver(driver)}
          />
        ))}
        
        {/* Routes */}
        {groups.map(group => group.route && (
          <Polyline
            key={`route-${group.id}`}
            path={group.route}
            options={{
              strokeColor: group.status === 'delayed' ? '#FF0000' : '#4CAF50',
              strokeOpacity: 0.8,
              strokeWeight: 3
            }}
          />
        ))}
        
        {/* Heatmap */}
        {showHeatmap && (
          <HeatmapLayer
            data={[...groups, ...drivers].map(item => ({
              location: new google.maps.LatLng(
                item.currentLocation?.lat || item.location?.lat,
                item.currentLocation?.lng || item.location?.lng
              ),
              weight: 1
            }))}
          />
        )}
        
        {/* Info Windows */}
        {selectedGroup && (
          <InfoWindow
            position={selectedGroup.currentLocation}
            onCloseClick={() => setSelectedGroup(null)}
          >
            <Box>
              <Typography variant="h6">{selectedGroup.name}</Typography>
              <Typography>Size: {selectedGroup.size} people</Typography>
              <Typography>Status: {selectedGroup.status}</Typography>
              <Typography>Progress: {selectedGroup.progress}%</Typography>
            </Box>
          </InfoWindow>
        )}
        
        {selectedDriver && (
          <InfoWindow
            position={selectedDriver.location}
            onCloseClick={() => setSelectedDriver(null)}
          >
            <Box>
              <Typography variant="h6">{selectedDriver.name}</Typography>
              <Typography>Speed: {selectedDriver.speed} km/h</Typography>
              <Typography>Verification: {selectedDriver.verificationScore}%</Typography>
              {selectedDriver.fraudIndicators.length > 0 && (
                <Alert severity="warning">
                  Fraud Indicators: {selectedDriver.fraudIndicators.join(', ')}
                </Alert>
              )}
            </Box>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Map Controls */}
      <Box sx={{ position: 'absolute', top: 10, right: 10 }}>
        <SpeedDial
          ariaLabel="Map controls"
          icon={<Settings />}
          direction="down"
        >
          <SpeedDialAction
            icon={<Refresh />}
            tooltipTitle="Refresh"
            onClick={() => fetchDashboardData()}
          />
          <SpeedDialAction
            icon={showHeatmap ? <VolumeOff /> : <VolumeUp />}
            tooltipTitle="Toggle Heatmap"
            onClick={() => setShowHeatmap(!showHeatmap)}
          />
          <SpeedDialAction
            icon={<LocationOn />}
            tooltipTitle="Center Map"
            onClick={() => setMapCenter({ lat: 31.7683, lng: 35.2137 })}
          />
        </SpeedDial>
      </Box>
    </Paper>
  );
  
  // Virtual Guides Panel
  const VirtualGuidesPanel: React.FC = () => (
    <Grid container spacing={2}>
      {guides.map(guide => (
        <Grid item xs={12} md={6} lg={4} key={guide.id}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              border: guide.status === 'active' ? '2px solid #4CAF50' : '1px solid #e0e0e0'
            }}
            onClick={() => setSelectedGuide(guide)}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: getPersonalityColor(guide.personality), mr: 2 }}>
                    {getPersonalityIcon(guide.personality)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{guide.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {guide.personality}
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Chip 
                    label={guide.status}
                    color={guide.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                  {guide.isSpeaking && (
                    <Tooltip title="Currently speaking">
                      <VolumeUp color="primary" />
                    </Tooltip>
                  )}
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Group
                  </Typography>
                  <Typography variant="body1">
                    {guide.currentGroup || 'None'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Group Size
                  </Typography>
                  <Typography variant="body1">
                    {guide.groupSize} people
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Satisfaction
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <LinearProgress 
                      variant="determinate" 
                      value={guide.satisfaction} 
                      sx={{ flex: 1, mr: 1 }}
                    />
                    <Typography variant="body2">
                      {guide.satisfaction}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Interactions
                  </Typography>
                  <Typography variant="body1">
                    {guide.interactions}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box mt={2} display="flex" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGuide(guide);
                    setGuideControlDialog(true);
                  }}
                >
                  Control
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Message />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGuide(guide);
                    setMessageDialog(true);
                  }}
                >
                  Message
                </Button>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePauseGuide(guide);
                  }}
                >
                  {guide.status === 'active' ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
  
  // Transport Verification Panel
  const TransportVerificationPanel: React.FC = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Driver</TableCell>
            <TableCell>Vehicle</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Speed</TableCell>
            <TableCell>Verification</TableCell>
            <TableCell>Fraud Score</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {drivers.map(driver => (
            <TableRow 
              key={driver.id}
              sx={{ 
                backgroundColor: driver.fraudIndicators.length > 0 
                  ? 'rgba(255, 0, 0, 0.1)' 
                  : 'inherit' 
              }}
            >
              <TableCell>{driver.name}</TableCell>
              <TableCell>{driver.vehicleId}</TableCell>
              <TableCell>
                <Chip 
                  label={driver.status}
                  color={getDriverStatusColor(driver.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <IconButton 
                  size="small"
                  onClick={() => {
                    setMapCenter(driver.location);
                    setMapZoom(15);
                  }}
                >
                  <LocationOn />
                </IconButton>
              </TableCell>
              <TableCell>{driver.speed} km/h</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <CircularProgress 
                    variant="determinate" 
                    value={driver.verificationScore}
                    size={30}
                    color={driver.verificationScore > 80 ? 'success' : 'warning'}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {driver.verificationScore}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                {driver.fraudIndicators.length > 0 ? (
                  <Tooltip title={driver.fraudIndicators.join(', ')}>
                    <Chip 
                      label="Suspicious"
                      color="error"
                      size="small"
                      icon={<Warning />}
                    />
                  </Tooltip>
                ) : (
                  <Chip 
                    label="Clear"
                    color="success"
                    size="small"
                    icon={<CheckCircle />}
                  />
                )}
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <IconButton 
                    size="small"
                    onClick={() => handleVerifyDriver(driver)}
                  >
                    <VerifiedUser />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={() => handleContactDriver(driver)}
                  >
                    <Message />
                  </IconButton>
                  {driver.fraudIndicators.length > 0 && (
                    <IconButton 
                      size="small"
                      color="error"
                      onClick={() => handleBlockDriver(driver)}
                    >
                      <Block />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Alerts Panel
  const AlertsPanel: React.FC = () => (
    <List>
      {alerts.map(alert => (
        <ListItem 
          key={alert.id}
          sx={{ 
            backgroundColor: getAlertBackgroundColor(alert.level),
            mb: 1,
            borderRadius: 1
          }}
        >
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: getAlertColor(alert.level) }}>
              {getAlertIcon(alert.level)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={alert.message}
            secondary={
              <Box>
                <Typography variant="caption">
                  {formatDistance(alert.timestamp, new Date(), { addSuffix: true })}
                </Typography>
                {alert.groupId && (
                  <Chip 
                    label={`Group: ${alert.groupId}`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
                {alert.driverId && (
                  <Chip 
                    label={`Driver: ${alert.driverId}`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            }
          />
          <ListItemSecondaryAction>
            {!alert.resolved && (
              <Button
                size="small"
                variant="contained"
                onClick={() => handleResolveAlert(alert)}
              >
                Resolve
              </Button>
            )}
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );
  
  // Helper functions
  const getPersonalityColor = (personality: string): string => {
    const colors: Record<string, string> = {
      'professional': '#1976d2',
      'friendly': '#4caf50',
      'comedian': '#ff9800',
      'maternal': '#e91e63',
      'youth': '#9c27b0',
      'storyteller': '#673ab7',
      'insider': '#009688',
      'kids': '#ffeb3b',
      'romantic': '#f44336',
      'spiritual': '#00bcd4'
    };
    return colors[personality.toLowerCase()] || '#757575';
  };
  
  const getPersonalityIcon = (personality: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      'professional': <Person />,
      'friendly': <EmojiEmotions />,
      'comedian': <RecordVoiceOver />,
      'maternal': <SupportAgent />,
      'youth': <Psychology />,
      'storyteller': <RecordVoiceOver />,
      'insider': <PersonPin />,
      'kids': <EmojiEmotions />,
      'romantic': <Favorite />,
      'spiritual': <Psychology />
    };
    return icons[personality.toLowerCase()] || <Person />;
  };
  
  const getDriverStatusColor = (status: string): any => {
    const colors: Record<string, any> = {
      'available': 'success',
      'assigned': 'primary',
      'driving': 'info',
      'break': 'warning'
    };
    return colors[status] || 'default';
  };
  
  const getAlertColor = (level: string): string => {
    const colors: Record<string, string> = {
      'critical': '#d32f2f',
      'high': '#f57c00',
      'medium': '#fbc02d',
      'low': '#388e3c'
    };
    return colors[level] || '#757575';
  };
  
  const getAlertBackgroundColor = (level: string): string => {
    const colors: Record<string, string> = {
      'critical': 'rgba(211, 47, 47, 0.1)',
      'high': 'rgba(245, 124, 0, 0.1)',
      'medium': 'rgba(251, 192, 45, 0.1)',
      'low': 'rgba(56, 142, 60, 0.1)'
    };
    return colors[level] || 'transparent';
  };
  
  const getAlertIcon = (level: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      'critical': <Error />,
      'high': <Warning />,
      'medium': <Info />,
      'low': <CheckCircle />
    };
    return icons[level] || <Info />;
  };
  
  // Action handlers
  const handlePauseGuide = async (guide: VirtualGuide) => {
    try {
      const newStatus = guide.status === 'active' ? 'paused' : 'active';
      await fetch(`/api/admin/guides/${guide.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      // Update will come through WebSocket
    } catch (error) {
      console.error('Failed to update guide status:', error);
    }
  };
  
  const handleVerifyDriver = async (driver: Driver) => {
    setSelectedDriver(driver);
    setVerificationDialog(true);
  };
  
  const handleContactDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setMessageDialog(true);
  };
  
  const handleBlockDriver = async (driver: Driver) => {
    if (confirm(`Block driver ${driver.name}? This action cannot be undone.`)) {
      try {
        await fetch(`/api/admin/drivers/${driver.id}/block`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Failed to block driver:', error);
      }
    }
  };
  
  const handleResolveAlert = async (alert: Alert) => {
    try {
      await fetch(`/api/admin/alerts/${alert.id}/resolve`, {
        method: 'POST'
      });
      // Update will come through WebSocket
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };
  
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Real-Time Control Center
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Chip 
            label={`${groups.filter(g => g.status === 'in_progress').length} Active Tours`}
            color="primary"
          />
          <Chip 
            label={`${guides.filter(g => g.status === 'active').length} Active Guides`}
            color="success"
          />
          <Badge badgeContent={alerts.filter(a => !a.resolved).length} color="error">
            <Notifications />
          </Badge>
          <FormControlLabel
            control={
              <Switch 
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto-refresh"
          />
        </Box>
      </Box>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="Live Map" icon={<MapIcon />} />
        <Tab label="Virtual Guides" icon={<Psychology />} />
        <Tab label="Transport Verification" icon={<VerifiedUser />} />
        <Tab label="Alerts" icon={<Warning />} />
        <Tab label="Analytics" icon={<Assessment />} />
      </Tabs>
      
      {/* Tab Panels */}
      {activeTab === 0 && <MapView />}
      {activeTab === 1 && <VirtualGuidesPanel />}
      {activeTab === 2 && <TransportVerificationPanel />}
      {activeTab === 3 && <AlertsPanel />}
      {activeTab === 4 && <AnalyticsPanel />}
      
      {/* Guide Control Dialog */}
      <GuideControlDialog
        open={guideControlDialog}
        guide={selectedGuide}
        onClose={() => setGuideControlDialog(false)}
      />
      
      {/* Message Dialog */}
      <MessageDialog
        open={messageDialog}
        recipient={selectedGuide || selectedDriver}
        onClose={() => setMessageDialog(false)}
      />
      
      {/* Verification Dialog */}
      <VerificationDialog
        open={verificationDialog}
        driver={selectedDriver}
        onClose={() => setVerificationDialog(false)}
      />
    </Box>
  );
};

export default RealTimeMonitoringDashboard;