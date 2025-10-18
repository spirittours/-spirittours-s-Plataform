"""
Guide Management Dashboard Component
Complete interface for managing tour guides
"""

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Badge,
  Autocomplete,
  Rating,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondary,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Skeleton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Checkbox,
  FormGroup,
  FormLabel,
  RadioGroup,
  Radio,
  InputAdornment,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

import {
  Person,
  PersonAdd,
  Edit,
  Delete,
  Search,
  FilterList,
  CalendarMonth,
  AttachMoney,
  Language,
  School,
  Star,
  StarBorder,
  CheckCircle,
  Cancel,
  Schedule,
  LocationOn,
  Email,
  Phone,
  Assignment,
  AssignmentTurnedIn,
  Warning,
  Info,
  ExpandMore,
  Add,
  Remove,
  Upload,
  Download,
  Print,
  Share,
  Settings,
  Notifications,
  Badge as BadgeIcon,
  VerifiedUser,
  Group,
  TrendingUp,
  AccessTime,
  MonetizationOn,
  EventAvailable,
  EventBusy,
  WorkHistory,
  Reviews,
  ContactPhone,
  Description,
  CreditCard,
  AccountBalance,
  DirectionsCar,
  Translate,
  Psychology,
  EmojiEvents,
  Report,
  CheckBox,
  CheckBoxOutlineBlank
} from '@mui/icons-material';

import { DatePicker, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { es } from 'date-fns/locale';
import { format, parseISO, addDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';

// Import services
import { guideService } from '../../services/guideService';
import { notificationService } from '../../services/notificationService';

const GUIDE_TYPES = {
  LICENSED_NATIONAL: 'Guía Licenciado Nacional',
  LICENSED_LOCAL: 'Guía Licenciado Local',
  TOUR_LEADER: 'Guía Acompañante / Tour Leader',
  SPECIALIZED: 'Guía Especializado',
  INTERPRETER: 'Intérprete',
  DRIVER_GUIDE: 'Conductor-Guía',
  ASSISTANT: 'Asistente de Guía'
};

const SPECIALIZATIONS = {
  ARCHAEOLOGY: 'Arqueología',
  NATURE: 'Naturaleza',
  ADVENTURE: 'Aventura',
  CULTURAL: 'Cultural',
  HISTORICAL: 'Histórico',
  GASTRONOMIC: 'Gastronómico',
  RELIGIOUS: 'Religioso',
  PHOTOGRAPHY: 'Fotografía',
  BIRDWATCHING: 'Observación de Aves',
  DIVING: 'Buceo',
  TREKKING: 'Trekking',
  WINE: 'Enoturismo'
};

const LANGUAGES = [
  'Español', 'Inglés', 'Francés', 'Alemán', 'Italiano', 
  'Portugués', 'Chino', 'Japonés', 'Ruso', 'Árabe',
  'Hebreo', 'Hindi', 'Coreano', 'Holandés', 'Polaco'
];

const PAYMENT_TYPES = {
  PER_HOUR: 'Por Hora',
  HALF_DAY: 'Medio Día',
  PER_DAY: 'Por Día',
  PER_WEEK: 'Por Semana',
  PER_GROUP: 'Por Grupo',
  PER_PERSON: 'Por Persona',
  FIXED_RATE: 'Tarifa Fija'
};

export default function GuideManagementDashboard() {
  // State Management
  const [currentTab, setCurrentTab] = useState(0);
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    guideType: '',
    specialization: '',
    language: '',
    city: '',
    minRating: 0,
    isActive: true,
    isAvailable: null
  });
  
  // Dialog States
  const [openAddGuide, setOpenAddGuide] = useState(false);
  const [openEditGuide, setOpenEditGuide] = useState(false);
  const [openAssignment, setOpenAssignment] = useState(false);
  const [openAvailability, setOpenAvailability] = useState(false);
  const [openRates, setOpenRates] = useState(false);
  const [openStatistics, setOpenStatistics] = useState(false);
  
  // Form States
  const [guideForm, setGuideForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    guideType: 'TOUR_LEADER',
    licenseNumber: '',
    licenseExpiry: null,
    languages: ['Español'],
    specializations: [],
    yearsExperience: 0,
    city: '',
    address: '',
    bio: '',
    hasVehicle: false,
    vehicleCapacity: 0,
    photo: null
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    guideId: '',
    packageId: '',
    assignmentDate: new Date(),
    startTime: '08:00',
    endTime: '17:00',
    hours: 8,
    serviceType: 'FULL_DAY',
    languagesRequired: ['Español'],
    meetingPoint: '',
    specialRequirements: ''
  });
  
  const [availabilityCalendar, setAvailabilityCalendar] = useState({});
  const [guideRates, setGuideRates] = useState([]);
  const [statistics, setStatistics] = useState({});
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Notifications
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // ==================== DATA FETCHING ====================
  
  useEffect(() => {
    fetchGuides();
  }, [filters, searchTerm]);
  
  const fetchGuides = async () => {
    setLoading(true);
    try {
      const response = await guideService.getGuides({
        search: searchTerm,
        ...filters
      });
      setGuides(response.data);
    } catch (error) {
      console.error('Error fetching guides:', error);
      showNotification('Error al cargar guías', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchGuideDetails = async (guideId) => {
    try {
      const response = await guideService.getGuideById(guideId);
      setSelectedGuide(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching guide details:', error);
      showNotification('Error al cargar detalles del guía', 'error');
    }
  };
  
  const fetchGuideAvailability = async (guideId, startDate, endDate) => {
    try {
      const response = await guideService.checkAvailability(guideId, {
        startDate,
        endDate
      });
      setAvailabilityCalendar(response.data.calendar);
      return response.data;
    } catch (error) {
      console.error('Error fetching availability:', error);
      showNotification('Error al cargar disponibilidad', 'error');
    }
  };
  
  const fetchGuideStatistics = async (guideId) => {
    try {
      const response = await guideService.getStatistics(guideId);
      setStatistics(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      showNotification('Error al cargar estadísticas', 'error');
    }
  };

  // ==================== CRUD OPERATIONS ====================
  
  const handleCreateGuide = async () => {
    setLoading(true);
    try {
      const response = await guideService.createGuide(guideForm);
      showNotification('Guía creado exitosamente', 'success');
      setOpenAddGuide(false);
      resetGuideForm();
      fetchGuides();
    } catch (error) {
      console.error('Error creating guide:', error);
      showNotification('Error al crear guía', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateGuide = async () => {
    setLoading(true);
    try {
      const response = await guideService.updateGuide(selectedGuide.id, guideForm);
      showNotification('Guía actualizado exitosamente', 'success');
      setOpenEditGuide(false);
      fetchGuides();
    } catch (error) {
      console.error('Error updating guide:', error);
      showNotification('Error al actualizar guía', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteGuide = async (guideId) => {
    if (!window.confirm('¿Está seguro de eliminar este guía?')) return;
    
    setLoading(true);
    try {
      await guideService.deleteGuide(guideId);
      showNotification('Guía eliminado exitosamente', 'success');
      fetchGuides();
    } catch (error) {
      console.error('Error deleting guide:', error);
      showNotification('Error al eliminar guía', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ASSIGNMENT OPERATIONS ====================
  
  const handleCreateAssignment = async () => {
    setLoading(true);
    try {
      const response = await guideService.assignGuide(assignmentForm);
      showNotification('Asignación creada exitosamente', 'success');
      setOpenAssignment(false);
      resetAssignmentForm();
      
      // Send notification to guide
      await notificationService.sendGuideNotification(assignmentForm.guideId, {
        type: 'NEW_ASSIGNMENT',
        data: response.data
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      showNotification('Error al crear asignación', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmAssignment = async (assignmentId) => {
    try {
      await guideService.confirmAssignment(assignmentId);
      showNotification('Asignación confirmada', 'success');
      fetchGuideDetails(selectedGuide.id);
    } catch (error) {
      console.error('Error confirming assignment:', error);
      showNotification('Error al confirmar asignación', 'error');
    }
  };

  // ==================== AVAILABILITY MANAGEMENT ====================
  
  const handleUpdateAvailability = async (guideId, availabilityData) => {
    setLoading(true);
    try {
      await guideService.setAvailability(guideId, availabilityData);
      showNotification('Disponibilidad actualizada', 'success');
      fetchGuideAvailability(guideId, new Date(), addDays(new Date(), 30));
    } catch (error) {
      console.error('Error updating availability:', error);
      showNotification('Error al actualizar disponibilidad', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== RATE MANAGEMENT ====================
  
  const handleCreateRate = async (guideId, rateData) => {
    setLoading(true);
    try {
      await guideService.createRate(guideId, rateData);
      showNotification('Tarifa creada exitosamente', 'success');
      fetchGuideDetails(guideId);
    } catch (error) {
      console.error('Error creating rate:', error);
      showNotification('Error al crear tarifa', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== UTILITY FUNCTIONS ====================
  
  const resetGuideForm = () => {
    setGuideForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      guideType: 'TOUR_LEADER',
      licenseNumber: '',
      licenseExpiry: null,
      languages: ['Español'],
      specializations: [],
      yearsExperience: 0,
      city: '',
      address: '',
      bio: '',
      hasVehicle: false,
      vehicleCapacity: 0,
      photo: null
    });
  };
  
  const resetAssignmentForm = () => {
    setAssignmentForm({
      guideId: '',
      packageId: '',
      assignmentDate: new Date(),
      startTime: '08:00',
      endTime: '17:00',
      hours: 8,
      serviceType: 'FULL_DAY',
      languagesRequired: ['Español'],
      meetingPoint: '',
      specialRequirements: ''
    });
  };
  
  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };
  
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // ==================== RENDER COMPONENTS ====================
  
  const renderGuideList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Foto</TableCell>
            <TableCell>Nombre</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Idiomas</TableCell>
            <TableCell>Especializaciones</TableCell>
            <TableCell>Rating</TableCell>
            <TableCell>Ciudad</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            [...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
              </TableRow>
            ))
          ) : (
            guides
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((guide) => (
                <TableRow key={guide.id} hover>
                  <TableCell>
                    <Avatar src={guide.photoUrl} alt={guide.fullName}>
                      {guide.firstName[0]}{guide.lastName[0]}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {guide.fullName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {guide.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={GUIDE_TYPES[guide.guideType]} 
                      size="small"
                      color={guide.guideType === 'LICENSED_NATIONAL' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {guide.languages?.slice(0, 3).map((lang, idx) => (
                        <Chip 
                          key={idx}
                          label={lang} 
                          size="small" 
                          variant="outlined"
                          icon={<Translate fontSize="small" />}
                        />
                      ))}
                      {guide.languages?.length > 3 && (
                        <Chip 
                          label={`+${guide.languages.length - 3}`} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {guide.specializations?.slice(0, 2).map((spec, idx) => (
                        <Chip 
                          key={idx}
                          label={SPECIALIZATIONS[spec]} 
                          size="small" 
                          color="secondary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Rating value={guide.rating} readOnly size="small" />
                      <Typography variant="caption">
                        ({guide.totalReviews})
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{guide.city}</TableCell>
                  <TableCell>
                    <Chip 
                      label={guide.isActive ? 'Activo' : 'Inactivo'}
                      color={guide.isActive ? 'success' : 'default'}
                      size="small"
                      icon={guide.isActive ? <CheckCircle /> : <Cancel />}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Ver detalles">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            fetchGuideDetails(guide.id);
                            setOpenStatistics(true);
                          }}
                        >
                          <Info />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedGuide(guide);
                            setGuideForm(guide);
                            setOpenEditGuide(true);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Calendario">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedGuide(guide);
                            fetchGuideAvailability(guide.id, new Date(), addDays(new Date(), 30));
                            setOpenAvailability(true);
                          }}
                        >
                          <CalendarMonth />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Asignar">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setAssignmentForm({ ...assignmentForm, guideId: guide.id });
                            setOpenAssignment(true);
                          }}
                        >
                          <Assignment />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton 
                          size="small"
                          color="error"
                          onClick={() => handleDeleteGuide(guide.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={guides.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Guías por página:"
      />
    </TableContainer>
  );
  
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Buscar guías"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Guía</InputLabel>
            <Select
              value={filters.guideType}
              onChange={(e) => setFilters({ ...filters, guideType: e.target.value })}
              label="Tipo de Guía"
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(GUIDE_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Especialización</InputLabel>
            <Select
              value={filters.specialization}
              onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
              label="Especialización"
            >
              <MenuItem value="">Todas</MenuItem>
              {Object.entries(SPECIALIZATIONS).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={2}>
          <Autocomplete
            size="small"
            options={LANGUAGES}
            value={filters.language}
            onChange={(e, value) => setFilters({ ...filters, language: value })}
            renderInput={(params) => (
              <TextField {...params} label="Idioma" />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={2}>
          <TextField
            fullWidth
            label="Ciudad"
            variant="outlined"
            size="small"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} md={1}>
          <FormControlLabel
            control={
              <Switch
                checked={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.checked })}
              />
            }
            label="Activos"
          />
        </Grid>
      </Grid>
    </Paper>
  );
  
  const renderStatisticsCards = () => {
    const totalGuides = guides.length;
    const activeGuides = guides.filter(g => g.isActive).length;
    const avgRating = guides.reduce((acc, g) => acc + g.rating, 0) / totalGuides || 0;
    const licensedGuides = guides.filter(g => g.guideType.includes('LICENSED')).length;
    
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Guías
                  </Typography>
                  <Typography variant="h4">
                    {totalGuides}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {activeGuides} activos
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Group />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Calificación Promedio
                  </Typography>
                  <Typography variant="h4">
                    {avgRating.toFixed(1)}
                  </Typography>
                  <Rating value={avgRating} readOnly size="small" />
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Guías Licenciados
                  </Typography>
                  <Typography variant="h4">
                    {licensedGuides}
                  </Typography>
                  <Typography variant="caption">
                    {((licensedGuides / totalGuides) * 100).toFixed(0)}% del total
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <VerifiedUser />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Idiomas Cubiertos
                  </Typography>
                  <Typography variant="h4">
                    {[...new Set(guides.flatMap(g => g.languages || []))].length}
                  </Typography>
                  <Typography variant="caption">
                    Multi-idioma disponible
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Translate />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // ==================== MAIN RENDER ====================
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={es}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Gestión de Guías Turísticos
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenAddGuide(true)}
          >
            Agregar Guía
          </Button>
        </Box>
        
        {/* Statistics Cards */}
        {renderStatisticsCards()}
        
        {/* Tabs */}
        <Paper sx={{ mb: 2 }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Lista de Guías" icon={<Group />} />
            <Tab label="Calendario" icon={<CalendarMonth />} />
            <Tab label="Asignaciones" icon={<Assignment />} />
            <Tab label="Tarifas" icon={<AttachMoney />} />
            <Tab label="Estadísticas" icon={<TrendingUp />} />
          </Tabs>
        </Paper>
        
        {/* Tab Content */}
        {currentTab === 0 && (
          <>
            {renderFilters()}
            {renderGuideList()}
          </>
        )}
        
        {currentTab === 1 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Calendario de Disponibilidad
            </Typography>
            {/* Calendar component would go here */}
          </Paper>
        )}
        
        {currentTab === 2 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Asignaciones Activas
            </Typography>
            {/* Assignments list would go here */}
          </Paper>
        )}
        
        {currentTab === 3 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Gestión de Tarifas
            </Typography>
            {/* Rates management would go here */}
          </Paper>
        )}
        
        {currentTab === 4 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Estadísticas y Reportes
            </Typography>
            {/* Statistics charts would go here */}
          </Paper>
        )}
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}