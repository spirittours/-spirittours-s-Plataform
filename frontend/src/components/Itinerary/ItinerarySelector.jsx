"""
Itinerary Selector Component
Allows clients to choose from system templates, create custom, or provide their own
"""

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Badge,
  Avatar,
  Rating,
  Tooltip,
  Divider,
  LinearProgress,
  CircularProgress,
  Skeleton,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Switch,
  FormControlLabel,
  Slider,
  InputAdornment,
  Collapse,
  Fade,
  Zoom,
  TextareaAutosize,
  FormGroup,
  Checkbox
} from '@mui/material';

import {
  Map,
  Route,
  Place,
  Hotel,
  Restaurant,
  DirectionsCar,
  FlightTakeoff,
  AccessTime,
  AttachMoney,
  Group,
  CalendarMonth,
  Edit,
  Save,
  Cancel,
  Add,
  Remove,
  Delete,
  ContentCopy,
  Visibility,
  VisibilityOff,
  ExpandMore,
  ExpandLess,
  Star,
  StarBorder,
  Favorite,
  FavoriteBorder,
  Share,
  Download,
  Upload,
  Print,
  CheckCircle,
  RadioButtonUnchecked,
  RadioButtonChecked,
  Schedule,
  LocationOn,
  Person,
  Language,
  Category,
  TrendingUp,
  Assignment,
  AssignmentTurnedIn,
  LibraryBooks,
  CreateNewFolder,
  TextFields,
  LocationSearching,
  Psychology,
  AutoAwesome,
  Tune,
  SwapVert,
  Timeline,
  Explore,
  Beach,
  Hiking,
  Museum,
  Church,
  ShoppingBag,
  LocalDining,
  PhotoCamera,
  Nature,
  Castle,
  Spa,
  SportsSoccer,
  TheaterComedy,
  MusicNote,
  Nightlife,
  WineBar,
  Coffee,
  DirectionsBus,
  DirectionsBike,
  DirectionsWalk,
  DirectionsBoat,
  Train,
  AirplanemodeActive
} from '@mui/icons-material';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Services
import { itineraryService } from '../../services/itineraryService';
import { notificationService } from '../../services/notificationService';

const CREATION_MODES = {
  SYSTEM_TEMPLATE: {
    label: 'Itinerarios del Sistema',
    description: 'Selecciona de nuestra colección de itinerarios probados',
    icon: LibraryBooks,
    color: '#2196F3'
  },
  CUSTOM_CREATE: {
    label: 'Crear Personalizado',
    description: 'Diseña tu itinerario día por día desde cero',
    icon: CreateNewFolder,
    color: '#4CAF50'
  },
  CLIENT_PROVIDED: {
    label: 'Mi Propio Itinerario',
    description: 'Proporciona tu itinerario y nosotros lo cotizamos',
    icon: TextFields,
    color: '#FF9800'
  },
  POINTS_OF_INTEREST: {
    label: 'Puntos de Interés',
    description: 'Indica los lugares que quieres visitar y optimizamos la ruta',
    icon: LocationSearching,
    color: '#9C27B0'
  },
  AI_GENERATED: {
    label: 'Generación con IA',
    description: 'Deja que la IA cree el itinerario perfecto para ti',
    icon: AutoAwesome,
    color: '#00BCD4'
  }
};

const CATEGORIES = {
  CULTURAL: { label: 'Cultural', icon: Museum, color: '#8B4513' },
  ADVENTURE: { label: 'Aventura', icon: Hiking, color: '#228B22' },
  NATURE: { label: 'Naturaleza', icon: Nature, color: '#32CD32' },
  BEACH: { label: 'Playa', icon: Beach, color: '#00CED1' },
  RELIGIOUS: { label: 'Religioso', icon: Church, color: '#4B0082' },
  GASTRONOMIC: { label: 'Gastronómico', icon: Restaurant, color: '#FF6347' },
  SHOPPING: { label: 'Compras', icon: ShoppingBag, color: '#FF1493' },
  WELLNESS: { label: 'Bienestar', icon: Spa, color: '#9370DB' },
  HISTORICAL: { label: 'Histórico', icon: Castle, color: '#8B7355' },
  NIGHTLIFE: { label: 'Vida Nocturna', icon: Nightlife, color: '#1E90FF' }
};

export default function ItinerarySelector({ onItinerarySelected, groupProfile, quotationData }) {
  // State Management
  const [currentMode, setCurrentMode] = useState('SYSTEM_TEMPLATE');
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // System Templates State
  const [systemItineraries, setSystemItineraries] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateFilters, setTemplateFilters] = useState({
    category: '',
    destination: '',
    duration_min: 1,
    duration_max: 30,
    max_budget: 10000,
    tags: []
  });
  
  // Custom Creation State
  const [customItinerary, setCustomItinerary] = useState({
    duration_days: 5,
    destination: '',
    days: []
  });
  
  // Client Provided State
  const [clientItinerary, setClientItinerary] = useState({
    itinerary_text: '',
    duration_days: null,
    destination: ''
  });
  
  // Points of Interest State
  const [pointsOfInterest, setPointsOfInterest] = useState([]);
  const [newPoint, setNewPoint] = useState({
    name: '',
    address: '',
    duration: 60,
    type: 'visit',
    description: ''
  });
  
  // AI Generation State
  const [aiPreferences, setAiPreferences] = useState({
    interests: [],
    pace: 'MODERATE',
    budget_level: 'STANDARD',
    special_requirements: '',
    must_include: '',
    avoid: ''
  });
  
  // UI State
  const [expandedDay, setExpandedDay] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCostEstimate, setShowCostEstimate] = useState(false);
  
  // Dialog States
  const [openTemplateDetails, setOpenTemplateDetails] = useState(false);
  const [openEditDay, setOpenEditDay] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  
  // Results
  const [finalItinerary, setFinalItinerary] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);
  
  // ==================== DATA FETCHING ====================
  
  useEffect(() => {
    if (currentMode === 'SYSTEM_TEMPLATE') {
      fetchSystemItineraries();
    }
  }, [currentMode, templateFilters]);
  
  const fetchSystemItineraries = async () => {
    setLoading(true);
    try {
      const response = await itineraryService.getSystemItineraries(templateFilters);
      setSystemItineraries(response.data);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      notificationService.error('Error al cargar itinerarios');
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== MODE HANDLERS ====================
  
  const handleModeSelect = (mode) => {
    setCurrentMode(mode);
    setActiveStep(0);
    
    // Initialize mode-specific data
    if (mode === 'CUSTOM_CREATE') {
      initializeCustomItinerary();
    } else if (mode === 'POINTS_OF_INTEREST') {
      setPointsOfInterest([]);
    }
  };
  
  const initializeCustomItinerary = () => {
    const days = [];
    for (let i = 1; i <= customItinerary.duration_days; i++) {
      days.push({
        day: i,
        title: `Día ${i}`,
        description: '',
        activities: [],
        locations: [],
        meals: {
          breakfast: 'Incluido',
          lunch: 'Por definir',
          dinner: 'Por definir'
        },
        accommodation: 'Hotel estándar',
        transportation: 'Transporte privado',
        notes: ''
      });
    }
    setCustomItinerary({ ...customItinerary, days });
  };
  
  // ==================== TEMPLATE SELECTION ====================
  
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setOpenTemplateDetails(true);
  };
  
  const handleTemplateConfirm = async () => {
    setLoading(true);
    try {
      const itineraryData = {
        creation_type: 'FROM_TEMPLATE',
        template_id: selectedTemplate.id,
        modifications: {},
        group_size: groupProfile?.totalPassengers || 1,
        service_level: groupProfile?.accommodationPreference || 'STANDARD'
      };
      
      const response = await itineraryService.createClientItinerary(itineraryData);
      setFinalItinerary(response.data.itinerary);
      setCostEstimate(response.data.cost_estimate);
      setShowPreview(true);
      
      notificationService.success('Itinerario seleccionado exitosamente');
    } catch (error) {
      console.error('Error selecting template:', error);
      notificationService.error('Error al seleccionar itinerario');
    } finally {
      setLoading(false);
      setOpenTemplateDetails(false);
    }
  };
  
  // ==================== CUSTOM CREATION ====================
  
  const handleAddActivity = (dayIndex, activity) => {
    const updatedDays = [...customItinerary.days];
    updatedDays[dayIndex].activities.push(activity);
    setCustomItinerary({ ...customItinerary, days: updatedDays });
  };
  
  const handleRemoveActivity = (dayIndex, activityIndex) => {
    const updatedDays = [...customItinerary.days];
    updatedDays[dayIndex].activities.splice(activityIndex, 1);
    setCustomItinerary({ ...customItinerary, days: updatedDays });
  };
  
  const handleDayEdit = (dayIndex) => {
    setEditingDay(dayIndex);
    setOpenEditDay(true);
  };
  
  const handleSaveDay = () => {
    setOpenEditDay(false);
    notificationService.success('Día actualizado');
  };
  
  const handleCustomItinerarySubmit = async () => {
    setLoading(true);
    try {
      const itineraryData = {
        creation_type: 'CUSTOM_CREATED',
        ...customItinerary,
        group_size: groupProfile?.totalPassengers || 1,
        service_level: groupProfile?.accommodationPreference || 'STANDARD',
        optimize_routes: true
      };
      
      const response = await itineraryService.createClientItinerary(itineraryData);
      setFinalItinerary(response.data.itinerary);
      setCostEstimate(response.data.cost_estimate);
      setShowPreview(true);
      
      notificationService.success('Itinerario personalizado creado');
    } catch (error) {
      console.error('Error creating custom itinerary:', error);
      notificationService.error('Error al crear itinerario');
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== CLIENT PROVIDED ====================
  
  const handleClientItinerarySubmit = async () => {
    if (!clientItinerary.itinerary_text.trim()) {
      notificationService.warning('Por favor proporciona tu itinerario');
      return;
    }
    
    setLoading(true);
    try {
      const itineraryData = {
        creation_type: 'CLIENT_PROVIDED',
        ...clientItinerary,
        group_size: groupProfile?.totalPassengers || 1,
        service_level: groupProfile?.accommodationPreference || 'STANDARD'
      };
      
      const response = await itineraryService.createClientItinerary(itineraryData);
      setFinalItinerary(response.data.itinerary);
      setCostEstimate(response.data.cost_estimate);
      setShowPreview(true);
      
      notificationService.success('Itinerario procesado exitosamente');
    } catch (error) {
      console.error('Error processing client itinerary:', error);
      notificationService.error('Error al procesar itinerario');
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== POINTS OF INTEREST ====================
  
  const handleAddPoint = () => {
    if (!newPoint.name.trim()) {
      notificationService.warning('Por favor ingresa el nombre del lugar');
      return;
    }
    
    setPointsOfInterest([...pointsOfInterest, { ...newPoint, id: Date.now() }]);
    setNewPoint({
      name: '',
      address: '',
      duration: 60,
      type: 'visit',
      description: ''
    });
  };
  
  const handleRemovePoint = (pointId) => {
    setPointsOfInterest(pointsOfInterest.filter(p => p.id !== pointId));
  };
  
  const handlePointsSubmit = async () => {
    if (pointsOfInterest.length === 0) {
      notificationService.warning('Por favor agrega al menos un punto de interés');
      return;
    }
    
    setLoading(true);
    try {
      const itineraryData = {
        creation_type: 'POINTS_OF_INTEREST',
        points_of_interest: pointsOfInterest,
        duration_days: customItinerary.duration_days,
        preferences: {
          pace: aiPreferences.pace,
          interests: groupProfile?.interests || []
        },
        group_size: groupProfile?.totalPassengers || 1,
        service_level: groupProfile?.accommodationPreference || 'STANDARD'
      };
      
      const response = await itineraryService.createClientItinerary(itineraryData);
      setFinalItinerary(response.data.itinerary);
      setCostEstimate(response.data.cost_estimate);
      setShowPreview(true);
      
      notificationService.success('Ruta optimizada creada');
    } catch (error) {
      console.error('Error creating from points:', error);
      notificationService.error('Error al crear ruta');
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== DRAG AND DROP ====================
  
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reordenar dentro del mismo día
      const dayIndex = parseInt(source.droppableId.split('-')[1]);
      const updatedDays = [...customItinerary.days];
      const [removed] = updatedDays[dayIndex].activities.splice(source.index, 1);
      updatedDays[dayIndex].activities.splice(destination.index, 0, removed);
      setCustomItinerary({ ...customItinerary, days: updatedDays });
    } else {
      // Mover entre días
      const sourceDayIndex = parseInt(source.droppableId.split('-')[1]);
      const destDayIndex = parseInt(destination.droppableId.split('-')[1]);
      const updatedDays = [...customItinerary.days];
      const [removed] = updatedDays[sourceDayIndex].activities.splice(source.index, 1);
      updatedDays[destDayIndex].activities.splice(destination.index, 0, removed);
      setCustomItinerary({ ...customItinerary, days: updatedDays });
    }
  };
  
  // ==================== RENDER COMPONENTS ====================
  
  const renderModeSelection = () => (
    <Grid container spacing={3}>
      {Object.entries(CREATION_MODES).map(([key, mode]) => (
        <Grid item xs={12} md={6} lg={4} key={key}>
          <Card
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: currentMode === key ? 3 : 1,
              borderColor: currentMode === key ? mode.color : 'divider',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}
            onClick={() => handleModeSelect(key)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: mode.color, mr: 2 }}>
                  <mode.icon />
                </Avatar>
                <Typography variant="h6">
                  {mode.label}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {mode.description}
              </Typography>
              {currentMode === key && (
                <Chip
                  label="Seleccionado"
                  color="primary"
                  size="small"
                  sx={{ mt: 2 }}
                  icon={<CheckCircle />}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
  
  const renderSystemTemplates = () => (
    <Box>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={templateFilters.category}
                onChange={(e) => setTemplateFilters({ ...templateFilters, category: e.target.value })}
                label="Categoría"
              >
                <MenuItem value="">Todas</MenuItem>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <cat.icon sx={{ color: cat.color, fontSize: 20 }} />
                      {cat.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Destino"
              value={templateFilters.destination}
              onChange={(e) => setTemplateFilters({ ...templateFilters, destination: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LocationOn /></InputAdornment>
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography gutterBottom>
              Duración: {templateFilters.duration_min}-{templateFilters.duration_max} días
            </Typography>
            <Slider
              value={[templateFilters.duration_min, templateFilters.duration_max]}
              onChange={(e, value) => setTemplateFilters({
                ...templateFilters,
                duration_min: value[0],
                duration_max: value[1]
              })}
              min={1}
              max={30}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Presupuesto Máximo"
              value={templateFilters.max_budget}
              onChange={(e) => setTemplateFilters({ 
                ...templateFilters, 
                max_budget: parseInt(e.target.value) || 0
              })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Templates Grid */}
      <Grid container spacing={3}>
        {loading ? (
          [...Array(6)].map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          systemItineraries.map((itinerary) => (
            <Grid item xs={12} md={6} lg={4} key={itinerary.id}>
              <Card>
                {itinerary.images?.length > 0 && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={itinerary.images[0]}
                    alt={itinerary.name}
                  />
                )}
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {itinerary.name}
                    </Typography>
                    {itinerary.is_featured && (
                      <Chip label="Destacado" color="warning" size="small" icon={<Star />} />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {itinerary.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={itinerary.destination}
                      size="small"
                      icon={<LocationOn />}
                    />
                    <Chip
                      label={`${itinerary.duration_days} días`}
                      size="small"
                      icon={<CalendarMonth />}
                    />
                    <Chip
                      label={`$${itinerary.base_price}/persona`}
                      size="small"
                      icon={<AttachMoney />}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Rating value={itinerary.rating} readOnly size="small" />
                    <Typography variant="caption">
                      ({itinerary.total_bookings} reservas)
                    </Typography>
                  </Box>
                  
                  {itinerary.highlights?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Incluye:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {itinerary.highlights.slice(0, 3).map((highlight, idx) => (
                          <Chip
                            key={idx}
                            label={highlight}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleTemplateSelect(itinerary)}
                  >
                    Ver Detalles
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => {
                      setSelectedTemplate(itinerary);
                      handleTemplateConfirm();
                    }}
                  >
                    Seleccionar
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
  
  const renderCustomCreation = () => (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Destino"
              value={customItinerary.destination}
              onChange={(e) => setCustomItinerary({ ...customItinerary, destination: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LocationOn /></InputAdornment>
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="number"
              label="Duración (días)"
              value={customItinerary.duration_days}
              onChange={(e) => {
                const days = parseInt(e.target.value) || 1;
                setCustomItinerary({ ...customItinerary, duration_days: days });
                initializeCustomItinerary();
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><CalendarMonth /></InputAdornment>
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={initializeCustomItinerary}
              sx={{ height: '56px' }}
            >
              Crear Estructura
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Days Editor with Drag and Drop */}
      {customItinerary.days.length > 0 && (
        <DragDropContext onDragEnd={onDragEnd}>
          {customItinerary.days.map((day, dayIndex) => (
            <Accordion
              key={day.day}
              expanded={expandedDay === dayIndex}
              onChange={() => setExpandedDay(expandedDay === dayIndex ? null : dayIndex)}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    {day.day}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{day.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {day.activities.length} actividades • {day.locations.length} lugares
                    </Typography>
                  </Box>
                  <IconButton onClick={(e) => {
                    e.stopPropagation();
                    handleDayEdit(dayIndex);
                  }}>
                    <Edit />
                  </IconButton>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Droppable droppableId={`day-${dayIndex}`}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minHeight: 100,
                        bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                        p: 2,
                        borderRadius: 1
                      }}
                    >
                      {day.activities.map((activity, actIndex) => (
                        <Draggable
                          key={`activity-${dayIndex}-${actIndex}`}
                          draggableId={`activity-${dayIndex}-${actIndex}`}
                          index={actIndex}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                mb: 1,
                                opacity: snapshot.isDragging ? 0.5 : 1
                              }}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography>{activity.name || activity}</Typography>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRemoveActivity(dayIndex, actIndex)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </Box>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
                
                <Button
                  startIcon={<Add />}
                  onClick={() => {
                    const activityName = prompt('Nombre de la actividad:');
                    if (activityName) {
                      handleAddActivity(dayIndex, activityName);
                    }
                  }}
                  sx={{ mt: 1 }}
                >
                  Agregar Actividad
                </Button>
              </AccordionDetails>
            </Accordion>
          ))}
        </DragDropContext>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={handleCustomItinerarySubmit}
          disabled={loading || customItinerary.days.length === 0}
        >
          Crear Itinerario Personalizado
        </Button>
      </Box>
    </Box>
  );
  
  const renderClientProvided = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Proporciona tu Itinerario
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Describe tu itinerario día por día o pega un itinerario que ya tengas preparado.
        Nosotros lo procesaremos y te proporcionaremos una cotización completa.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Tu Itinerario"
            placeholder="Día 1: Llegada a Lima, traslado al hotel, city tour por la tarde...
Día 2: Vuelo a Cusco, aclimatación, visita al mercado de San Pedro...
Día 3: Valle Sagrado - Pisac y Ollantaytambo..."
            value={clientItinerary.itinerary_text}
            onChange={(e) => setClientItinerary({ ...clientItinerary, itinerary_text: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Destino Principal"
            value={clientItinerary.destination}
            onChange={(e) => setClientItinerary({ ...clientItinerary, destination: e.target.value })}
            helperText="Ej: Perú, Costa Rica, etc."
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Duración (días)"
            value={clientItinerary.duration_days || ''}
            onChange={(e) => setClientItinerary({ 
              ...clientItinerary, 
              duration_days: parseInt(e.target.value) || null
            })}
            helperText="Opcional - lo detectaremos del texto"
          />
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              component="label"
            >
              Subir Documento
              <input type="file" hidden accept=".txt,.doc,.docx,.pdf" />
            </Button>
            
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleClientItinerarySubmit}
              disabled={loading || !clientItinerary.itinerary_text.trim()}
            >
              Procesar y Cotizar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
  
  const renderPointsOfInterest = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Agregar Puntos de Interés
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Nombre del Lugar"
              value={newPoint.name}
              onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
              placeholder="Ej: Machu Picchu"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Dirección o Ubicación"
              value={newPoint.address}
              onChange={(e) => setNewPoint({ ...newPoint, address: e.target.value })}
              placeholder="Ej: Cusco, Perú"
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="number"
              label="Duración (min)"
              value={newPoint.duration}
              onChange={(e) => setNewPoint({ ...newPoint, duration: parseInt(e.target.value) || 60 })}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddPoint}
              sx={{ height: '56px' }}
            >
              Agregar
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Points List */}
      {pointsOfInterest.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lugares a Visitar ({pointsOfInterest.length})
          </Typography>
          
          <List>
            {pointsOfInterest.map((point, index) => (
              <ListItem key={point.id}>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {index + 1}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={point.name}
                  secondary={`${point.address} • ${point.duration} minutos`}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleRemovePoint(point.id)}>
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Días disponibles"
                value={customItinerary.duration_days}
                onChange={(e) => setCustomItinerary({ 
                  ...customItinerary, 
                  duration_days: parseInt(e.target.value) || 1
                })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ritmo del viaje</InputLabel>
                <Select
                  value={aiPreferences.pace}
                  onChange={(e) => setAiPreferences({ ...aiPreferences, pace: e.target.value })}
                  label="Ritmo del viaje"
                >
                  <MenuItem value="RELAXED">Relajado</MenuItem>
                  <MenuItem value="MODERATE">Moderado</MenuItem>
                  <MenuItem value="INTENSIVE">Intensivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Optimizar ruta automáticamente"
            />
            
            <Button
              variant="contained"
              size="large"
              startIcon={<Route />}
              onClick={handlePointsSubmit}
              disabled={loading || pointsOfInterest.length === 0}
            >
              Crear Ruta Optimizada
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Map Preview */}
      {pointsOfInterest.length > 0 && showMap && (
        <Paper sx={{ p: 2, height: 400 }}>
          <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Add markers for points */}
          </MapContainer>
        </Paper>
      )}
    </Box>
  );
  
  // ==================== MAIN RENDER ====================
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Selección de Itinerario
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Elige cómo quieres crear tu itinerario: desde nuestras plantillas, personalizado, o proporciona el tuyo.
        </Typography>
      </Box>
      
      {/* Mode Selection */}
      {!finalItinerary && (
        <Box sx={{ mb: 3 }}>
          {renderModeSelection()}
        </Box>
      )}
      
      {/* Content based on selected mode */}
      {!finalItinerary && currentMode && (
        <Fade in={true}>
          <Box sx={{ mt: 3 }}>
            {currentMode === 'SYSTEM_TEMPLATE' && renderSystemTemplates()}
            {currentMode === 'CUSTOM_CREATE' && renderCustomCreation()}
            {currentMode === 'CLIENT_PROVIDED' && renderClientProvided()}
            {currentMode === 'POINTS_OF_INTEREST' && renderPointsOfInterest()}
          </Box>
        </Fade>
      )}
      
      {/* Preview Dialog */}
      {finalItinerary && showPreview && (
        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Itinerario Finalizado</Typography>
              <IconButton onClick={() => setShowPreview(false)}>
                <Cancel />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Itinerary Preview */}
            <Box sx={{ mb: 3 }}>
              {finalItinerary.days?.map((day) => (
                <Accordion key={day.day}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">
                      Día {day.day}: {day.title}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{day.description}</Typography>
                    {/* Add more details */}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
            
            {/* Cost Estimate */}
            {costEstimate && (
              <Alert severity="info">
                <Typography variant="subtitle1">
                  Costo Estimado: ${costEstimate.cost_per_person} por persona
                </Typography>
                <Typography variant="body2">
                  Total para {groupProfile?.totalPassengers || 1} personas: ${costEstimate.total_cost}
                </Typography>
              </Alert>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setShowPreview(false)}>
              Modificar
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                onItinerarySelected(finalItinerary, costEstimate);
                setShowPreview(false);
              }}
            >
              Confirmar y Continuar
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}