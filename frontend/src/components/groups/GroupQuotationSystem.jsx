import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Tooltip,
  Badge,
  Avatar,
  Collapse,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Stack,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  Rating,
  Slider,
  FormGroup,
  Checkbox,
  Radio,
  RadioGroup,
  DatePicker,
  DateRangePicker,
  TimePicker,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
  Zoom,
  Fade,
  Grow,
  Slide
} from '@mui/material';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import {
  Groups as GroupsIcon,
  Hotel as HotelIcon,
  DirectionsBus as BusIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as AttachMoneyIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timer as TimerIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CompareArrows as CompareArrowsIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  LocalOffer as LocalOfferIcon,
  Loyalty as LoyaltyIcon,
  Stars as StarsIcon,
  StarBorder as StarBorderIcon,
  Flight as FlightIcon,
  Train as TrainIcon,
  DirectionsCar as DirectionsCarIcon,
  DirectionsBoat as DirectionsBoatIcon,
  Tour as TourIcon,
  Museum as MuseumIcon,
  Church as ChurchIcon,
  Beach as BeachIcon,
  Hiking as HikingIcon,
  SportsEsports as SportsEsportsIcon,
  Spa as SpaIcon,
  MedicalServices as MedicalServicesIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Gavel as GavelIcon,
  VerifiedUser as VerifiedUserIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Chat as ChatIcon,
  Forum as ForumIcon,
  QuestionAnswer as QuestionAnswerIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  HighQuality as HighQualityIcon,
  MoneyOff as MoneyOffIcon,
  EmojiEvents as EmojiEventsIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  Verified as VerifiedIcon,
  NewReleases as NewReleasesIcon,
  Whatshot as WhatshotIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

// Tipos de servicios para cotización
const SERVICE_TYPES = {
  ACCOMMODATION: {
    name: 'Accommodation',
    icon: <HotelIcon />,
    color: 'primary',
    fields: ['checkIn', 'checkOut', 'roomType', 'mealPlan', 'occupancy']
  },
  TRANSPORTATION: {
    name: 'Transportation',
    icon: <BusIcon />,
    color: 'success',
    fields: ['vehicleType', 'duration', 'distance', 'driverIncluded']
  },
  GUIDED_TOURS: {
    name: 'Guided Tours',
    icon: <TourIcon />,
    color: 'info',
    fields: ['language', 'duration', 'entranceFees', 'guideType']
  },
  MEALS: {
    name: 'Meals',
    icon: <RestaurantIcon />,
    color: 'warning',
    fields: ['mealType', 'cuisine', 'dietary', 'beverages']
  },
  ACTIVITIES: {
    name: 'Activities',
    icon: <HikingIcon />,
    color: 'secondary',
    fields: ['activityType', 'duration', 'difficulty', 'equipment']
  },
  FLIGHTS: {
    name: 'Flights',
    icon: <FlightIcon />,
    color: 'error',
    fields: ['class', 'luggage', 'flexibility', 'airline']
  }
};

// Estados de cotización
const QUOTATION_STATUS = {
  DRAFT: { label: 'Draft', color: 'default', icon: <EditIcon /> },
  SENT: { label: 'Sent to Providers', color: 'info', icon: <SendIcon /> },
  PENDING: { label: 'Awaiting Responses', color: 'warning', icon: <TimerIcon /> },
  PARTIAL: { label: 'Partial Responses', color: 'warning', icon: <WarningIcon /> },
  COMPLETE: { label: 'All Responses Received', color: 'success', icon: <CheckCircleIcon /> },
  APPROVED: { label: 'Client Approved', color: 'success', icon: <VerifiedIcon /> },
  CONFIRMED: { label: 'Confirmed with Providers', color: 'primary', icon: <VerifiedUserIcon /> },
  CANCELLED: { label: 'Cancelled', color: 'error', icon: <ErrorIcon /> }
};

// Planes de comidas
const MEAL_PLANS = {
  RO: { name: 'Room Only', icon: <HotelIcon /> },
  BB: { name: 'Bed & Breakfast', icon: <RestaurantIcon /> },
  HB: { name: 'Half Board (Breakfast + Dinner)', icon: <RestaurantIcon /> },
  FB: { name: 'Full Board (All Meals)', icon: <RestaurantIcon /> },
  AI: { name: 'All Inclusive', icon: <StarsIcon /> }
};

// Sistema de puntuación para proveedores
const PROVIDER_SCORING = {
  PRICE: { weight: 0.35, name: 'Price Competitiveness' },
  RESPONSE_TIME: { weight: 0.20, name: 'Response Speed' },
  QUALITY: { weight: 0.25, name: 'Service Quality' },
  RELIABILITY: { weight: 0.15, name: 'Reliability' },
  FLEXIBILITY: { weight: 0.05, name: 'Terms Flexibility' }
};

const GroupQuotationSystem = () => {
  // State principal
  const [activeTab, setActiveTab] = useState(0);
  const [quotations, setQuotations] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State para nueva cotización
  const [newQuotation, setNewQuotation] = useState({
    id: null,
    groupName: '',
    agencyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    arrivalDate: null,
    departureDate: null,
    numberOfPax: 0,
    freePersons: 0,
    itinerary: [],
    services: [],
    specialRequests: '',
    budget: { min: 0, max: 0, currency: 'USD' },
    deadline: null,
    status: 'DRAFT',
    competitionMode: 'OPEN', // OPEN, INVITED, HYBRID
    autoSelect: false,
    scoringCriteria: { ...PROVIDER_SCORING }
  });
  
  // State para respuestas de proveedores
  const [providerResponses, setProviderResponses] = useState([]);
  const [comparisonMatrix, setComparisonMatrix] = useState(null);
  
  // State para diálogos
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProviderPortal, setShowProviderPortal] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // State para notificaciones
  const [notifications, setNotifications] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Ejemplo de itinerario para Tierra Santa
  const HOLY_LAND_ITINERARY_TEMPLATE = {
    name: 'Holy Land Classic Tour',
    duration: 10,
    segments: [
      {
        location: 'Nazareth',
        nights: 3,
        hotels: ['Golden Crown Hotel', 'Legacy Hotel', 'Plaza Hotel', 'Rimonim Nazareth'],
        activities: ['Annunciation Church', 'Mount Tabor', 'Cana of Galilee'],
        meals: 'HB'
      },
      {
        location: 'Dead Sea',
        nights: 1,
        hotels: ['David Dead Sea', 'Isrotel Dead Sea', 'Herods Dead Sea', 'Crowne Plaza', 'Leonardo Club', 'Lot Spa Hotel'],
        activities: ['Dead Sea Float', 'Masada', 'Qumran'],
        meals: 'HB'
      },
      {
        location: 'Bethlehem',
        nights: 5,
        hotels: ['Paradise Hotel', 'Manger Square Hotel', 'Grand Hotel', 'Jacir Palace', 'Bethlehem Hotel', 'Saint Gabriel Hotel', 'Nativity Hotel', 'Ambassador Hotel'],
        activities: ['Nativity Church', 'Shepherds Field', 'Jerusalem Old City', 'Via Dolorosa', 'Holy Sepulchre'],
        meals: 'HB'
      }
    ]
  };
  
  // Cargar datos al montar
  useEffect(() => {
    loadQuotations();
    loadProviders();
    setupWebSocket();
  }, []);
  
  // WebSocket para actualizaciones en tiempo real
  const setupWebSocket = () => {
    // Simulación de WebSocket para actualizaciones en tiempo real
    const ws = {
      onProviderResponse: (callback) => {
        // Simular respuestas de proveedores
        setInterval(() => {
          const mockResponse = {
            quotationId: selectedQuotation?.id,
            providerId: Math.floor(Math.random() * 100),
            providerName: `Hotel ${Math.floor(Math.random() * 10)}`,
            timestamp: new Date().toISOString(),
            status: 'NEW_OFFER'
          };
          callback(mockResponse);
        }, 30000); // Cada 30 segundos
      }
    };
    
    ws.onProviderResponse((response) => {
      handleNewProviderResponse(response);
    });
  };
  
  // Funciones de carga
  const loadQuotations = async () => {
    setLoading(true);
    try {
      // Simular carga desde API
      const mockQuotations = [
        {
          id: 'RFQ-2024-001',
          groupName: 'Catholic Pilgrimage November 2025',
          agencyName: 'Faith Tours USA',
          arrivalDate: '2025-11-01',
          departureDate: '2025-11-10',
          numberOfPax: 45,
          status: 'PENDING',
          responsesReceived: 12,
          totalRequested: 18,
          bestPrice: 1250,
          deadline: '2024-11-15'
        },
        {
          id: 'RFQ-2024-002',
          groupName: 'Baptist Church Group',
          agencyName: 'Holy Land Experts',
          arrivalDate: '2025-03-15',
          departureDate: '2025-03-25',
          numberOfPax: 30,
          status: 'COMPLETE',
          responsesReceived: 15,
          totalRequested: 15,
          bestPrice: 1450,
          deadline: '2024-11-20'
        }
      ];
      
      setQuotations(mockQuotations);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadProviders = async () => {
    try {
      // Simular carga de proveedores
      const mockProviders = [
        {
          id: 'PROV-001',
          name: 'Golden Crown Hotel Nazareth',
          type: 'HOTEL',
          location: 'Nazareth',
          rating: 4.5,
          responseRate: 95,
          averageResponseTime: '2 hours',
          competitiveScore: 8.5,
          email: 'sales@goldencrown.com',
          categories: ['3-star', '4-star'],
          specialties: ['Religious Groups', 'Pilgrimage']
        },
        {
          id: 'PROV-002',
          name: 'Holy Land Transport Services',
          type: 'TRANSPORT',
          location: 'Jerusalem',
          rating: 4.8,
          responseRate: 98,
          averageResponseTime: '1 hour',
          competitiveScore: 9.2,
          email: 'dispatch@hltransport.com',
          fleet: ['Luxury Coaches', 'Mini Buses', 'VIP Vans']
        }
      ];
      
      setProviders(mockProviders);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };
  
  // Función para crear nueva cotización
  const handleCreateQuotation = async () => {
    try {
      const quotationId = `RFQ-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(3, '0')}`;
      
      const quotation = {
        ...newQuotation,
        id: quotationId,
        createdAt: new Date().toISOString(),
        status: 'DRAFT'
      };
      
      // Enviar RFQ a proveedores
      if (quotation.status === 'SENT') {
        await sendRFQToProviders(quotation);
      }
      
      setQuotations([quotation, ...quotations]);
      setShowCreateDialog(false);
      showSnackbar(`Quotation ${quotationId} created successfully`, 'success');
      
      // Resetear formulario
      resetQuotationForm();
    } catch (error) {
      console.error('Error creating quotation:', error);
      showSnackbar('Error creating quotation', 'error');
    }
  };
  
  // Enviar RFQ a proveedores
  const sendRFQToProviders = async (quotation) => {
    try {
      const providers = selectProvidersForRFQ(quotation);
      
      for (const provider of providers) {
        // Enviar email a cada proveedor
        const emailData = {
          to: provider.email,
          subject: `RFQ ${quotation.id}: ${quotation.groupName}`,
          template: 'RFQ_REQUEST',
          data: {
            quotationId: quotation.id,
            groupName: quotation.groupName,
            arrivalDate: quotation.arrivalDate,
            departureDate: quotation.departureDate,
            numberOfPax: quotation.numberOfPax,
            responseLink: `${window.location.origin}/provider-portal/rfq/${quotation.id}`,
            deadline: quotation.deadline,
            competitionNote: quotation.competitionMode === 'OPEN' 
              ? '⚡ This is a competitive RFQ. Other providers are also being invited to quote.'
              : ''
          }
        };
        
        // Simular envío de email
        console.log('Sending RFQ to provider:', emailData);
        
        // Registrar en el sistema
        await recordRFQSent(quotation.id, provider.id);
      }
      
      // Actualizar estado de cotización
      updateQuotationStatus(quotation.id, 'SENT');
      
      // Notificar al usuario
      showSnackbar(`RFQ sent to ${providers.length} providers`, 'success');
      
      // Crear notificación
      addNotification({
        type: 'RFQ_SENT',
        message: `RFQ ${quotation.id} sent to ${providers.length} providers`,
        timestamp: new Date().toISOString(),
        quotationId: quotation.id
      });
    } catch (error) {
      console.error('Error sending RFQ:', error);
      showSnackbar('Error sending RFQ to providers', 'error');
    }
  };
  
  // Seleccionar proveedores para RFQ
  const selectProvidersForRFQ = (quotation) => {
    let selectedProviders = [];
    
    // Filtrar proveedores basándose en el itinerario
    quotation.itinerary.forEach(segment => {
      // Hoteles para cada ubicación
      const hotelsInLocation = providers.filter(p => 
        p.type === 'HOTEL' && 
        p.location === segment.location
      );
      
      // Agregar todos los hoteles de la ubicación (competencia)
      selectedProviders = [...selectedProviders, ...hotelsInLocation];
    });
    
    // Agregar proveedores de transporte
    const transportProviders = providers.filter(p => p.type === 'TRANSPORT');
    selectedProviders = [...selectedProviders, ...transportProviders];
    
    // Agregar proveedores de otros servicios
    quotation.services.forEach(service => {
      const serviceProviders = providers.filter(p => 
        p.type === service.type && 
        !selectedProviders.includes(p)
      );
      selectedProviders = [...selectedProviders, ...serviceProviders];
    });
    
    return selectedProviders;
  };
  
  // Manejar respuesta de proveedor
  const handleNewProviderResponse = (response) => {
    setProviderResponses(prev => [...prev, response]);
    
    // Actualizar contador de respuestas
    const quotation = quotations.find(q => q.id === response.quotationId);
    if (quotation) {
      quotation.responsesReceived = (quotation.responsesReceived || 0) + 1;
      
      // Verificar si todas las respuestas fueron recibidas
      if (quotation.responsesReceived >= quotation.totalRequested) {
        updateQuotationStatus(quotation.id, 'COMPLETE');
        generateComparisonMatrix(quotation.id);
      } else {
        updateQuotationStatus(quotation.id, 'PARTIAL');
      }
    }
    
    // Notificar al usuario
    addNotification({
      type: 'PROVIDER_RESPONSE',
      message: `New offer received from ${response.providerName}`,
      timestamp: response.timestamp,
      quotationId: response.quotationId
    });
  };
  
  // Generar matriz de comparación
  const generateComparisonMatrix = (quotationId) => {
    const responses = providerResponses.filter(r => r.quotationId === quotationId);
    
    // Agrupar por segmento/servicio
    const matrix = {};
    
    responses.forEach(response => {
      if (!matrix[response.segment]) {
        matrix[response.segment] = [];
      }
      
      // Calcular puntuación
      const score = calculateProviderScore(response);
      
      matrix[response.segment].push({
        ...response,
        score,
        rank: 0 // Se calculará después
      });
    });
    
    // Ordenar y rankear
    Object.keys(matrix).forEach(segment => {
      matrix[segment].sort((a, b) => b.score - a.score);
      matrix[segment].forEach((item, index) => {
        item.rank = index + 1;
      });
    });
    
    setComparisonMatrix(matrix);
    
    // Auto-selección si está habilitada
    if (newQuotation.autoSelect) {
      autoSelectBestOptions(matrix);
    }
  };
  
  // Calcular puntuación de proveedor
  const calculateProviderScore = (response) => {
    let score = 0;
    const criteria = newQuotation.scoringCriteria;
    
    // Precio (35%)
    const priceScore = (1 - (response.price / response.maxPrice)) * 100;
    score += priceScore * criteria.PRICE.weight;
    
    // Tiempo de respuesta (20%)
    const responseTimeHours = (new Date() - new Date(response.sentAt)) / (1000 * 60 * 60);
    const responseScore = Math.max(0, 100 - (responseTimeHours * 10));
    score += responseScore * criteria.RESPONSE_TIME.weight;
    
    // Calidad (25%)
    const qualityScore = (response.providerRating / 5) * 100;
    score += qualityScore * criteria.QUALITY.weight;
    
    // Confiabilidad (15%)
    const reliabilityScore = response.providerReliability || 80;
    score += reliabilityScore * criteria.RELIABILITY.weight;
    
    // Flexibilidad (5%)
    const flexibilityScore = response.flexibleTerms ? 100 : 50;
    score += flexibilityScore * criteria.FLEXIBILITY.weight;
    
    return score;
  };
  
  // Auto-seleccionar mejores opciones
  const autoSelectBestOptions = (matrix) => {
    const selection = {};
    
    Object.keys(matrix).forEach(segment => {
      // Seleccionar top 3 opciones
      selection[segment] = matrix[segment].slice(0, 3);
    });
    
    // Generar cotización final
    generateFinalQuotation(selection);
  };
  
  // Generar cotización final
  const generateFinalQuotation = (selection) => {
    let totalCost = 0;
    const finalQuotation = {
      options: []
    };
    
    // Calcular todas las combinaciones posibles
    // Por simplicidad, tomamos la mejor de cada segmento
    Object.keys(selection).forEach(segment => {
      const bestOption = selection[segment][0];
      totalCost += bestOption.price * newQuotation.numberOfPax;
      
      finalQuotation.options.push({
        segment,
        provider: bestOption.providerName,
        price: bestOption.price,
        total: bestOption.price * newQuotation.numberOfPax
      });
    });
    
    // Agregar markup de Spirit Tours (10-15%)
    const markup = totalCost * 0.12;
    finalQuotation.subtotal = totalCost;
    finalQuotation.markup = markup;
    finalQuotation.total = totalCost + markup;
    finalQuotation.perPerson = finalQuotation.total / (newQuotation.numberOfPax - newQuotation.freePersons);
    
    return finalQuotation;
  };
  
  // Confirmar con proveedores seleccionados
  const confirmWithProviders = async (selectedProviders) => {
    try {
      for (const provider of selectedProviders) {
        // Enviar confirmación
        const confirmationData = {
          to: provider.email,
          subject: `CONFIRMATION: ${newQuotation.id}`,
          template: 'BOOKING_CONFIRMATION',
          data: {
            quotationId: newQuotation.id,
            groupName: newQuotation.groupName,
            dates: `${newQuotation.arrivalDate} - ${newQuotation.departureDate}`,
            numberOfPax: newQuotation.numberOfPax,
            confirmationLink: `${window.location.origin}/provider-portal/confirm/${newQuotation.id}`,
            services: provider.services
          }
        };
        
        console.log('Sending confirmation:', confirmationData);
        
        // Actualizar estado
        await updateProviderStatus(provider.id, newQuotation.id, 'CONFIRMED');
      }
      
      // Enviar notificación a proveedores no seleccionados
      const rejectedProviders = providers.filter(p => 
        !selectedProviders.find(sp => sp.id === p.id)
      );
      
      for (const provider of rejectedProviders) {
        await notifyRejectedProvider(provider, newQuotation.id);
      }
      
      updateQuotationStatus(newQuotation.id, 'CONFIRMED');
      showSnackbar('Booking confirmed with selected providers', 'success');
    } catch (error) {
      console.error('Error confirming with providers:', error);
      showSnackbar('Error confirming booking', 'error');
    }
  };
  
  // Funciones auxiliares
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };
  
  const updateQuotationStatus = (quotationId, status) => {
    setQuotations(prev => prev.map(q => 
      q.id === quotationId ? { ...q, status } : q
    ));
  };
  
  const resetQuotationForm = () => {
    setNewQuotation({
      id: null,
      groupName: '',
      agencyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      arrivalDate: null,
      departureDate: null,
      numberOfPax: 0,
      freePersons: 0,
      itinerary: [],
      services: [],
      specialRequests: '',
      budget: { min: 0, max: 0, currency: 'USD' },
      deadline: null,
      status: 'DRAFT',
      competitionMode: 'OPEN',
      autoSelect: false,
      scoringCriteria: { ...PROVIDER_SCORING }
    });
    setCurrentStep(0);
  };
  
  const recordRFQSent = async (quotationId, providerId) => {
    // Registrar en base de datos
    console.log(`RFQ ${quotationId} sent to provider ${providerId}`);
  };
  
  const updateProviderStatus = async (providerId, quotationId, status) => {
    // Actualizar estado en base de datos
    console.log(`Provider ${providerId} status for ${quotationId}: ${status}`);
  };
  
  const notifyRejectedProvider = async (provider, quotationId) => {
    // Notificar a proveedor no seleccionado
    console.log(`Notifying rejected provider ${provider.id} for ${quotationId}`);
  };
  
  // Calcular estadísticas
  const statistics = useMemo(() => {
    const stats = {
      totalQuotations: quotations.length,
      pendingResponses: quotations.filter(q => q.status === 'PENDING' || q.status === 'PARTIAL').length,
      completedQuotations: quotations.filter(q => q.status === 'COMPLETE').length,
      averageResponseRate: 0,
      totalProvidersEngaged: 0,
      averageSavings: 0
    };
    
    // Calcular tasa de respuesta promedio
    const responseRates = quotations.map(q => 
      q.totalRequested > 0 ? (q.responsesReceived / q.totalRequested) * 100 : 0
    );
    stats.averageResponseRate = responseRates.reduce((a, b) => a + b, 0) / responseRates.length || 0;
    
    // Total de proveedores comprometidos
    stats.totalProvidersEngaged = new Set(providerResponses.map(r => r.providerId)).size;
    
    return stats;
  }, [quotations, providerResponses]);
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header con estadísticas */}
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" color="white" gutterBottom>
                <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Group Quotation System
              </Typography>
              <Typography variant="body1" color="white" sx={{ opacity: 0.9 }}>
                Competitive RFQ Management with Real-time Provider Bidding
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="white">
                      {statistics.totalQuotations}
                    </Typography>
                    <Typography variant="caption" color="white" sx={{ opacity: 0.8 }}>
                      Total RFQs
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="white">
                      {statistics.pendingResponses}
                    </Typography>
                    <Typography variant="caption" color="white" sx={{ opacity: 0.8 }}>
                      Pending
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="white">
                      {statistics.averageResponseRate.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="white" sx={{ opacity: 0.8 }}>
                      Response Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="white">
                      {statistics.totalProvidersEngaged}
                    </Typography>
                    <Typography variant="caption" color="white" sx={{ opacity: 0.8 }}>
                      Providers
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Action Buttons */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            sx={{
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              color: 'white'
            }}
          >
            Create New RFQ
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<TourIcon />}
            onClick={() => {
              // Pre-llenar con template de Tierra Santa
              setNewQuotation(prev => ({
                ...prev,
                groupName: 'Holy Land Pilgrimage',
                itinerary: HOLY_LAND_ITINERARY_TEMPLATE.segments
              }));
              setShowCreateDialog(true);
            }}
            color="secondary"
          >
            Use Holy Land Template
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<CompareArrowsIcon />}
            onClick={() => setShowComparisonDialog(true)}
            disabled={!comparisonMatrix}
          >
            Compare Offers
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AnalyticsIcon />}
            onClick={() => setActiveTab(2)}
          >
            Analytics
          </Button>
        </Box>
        
        {/* Main Content Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Active RFQs" icon={<AssignmentIcon />} iconPosition="start" />
            <Tab label="Provider Responses" icon={<QuestionAnswerIcon />} iconPosition="start" />
            <Tab label="Analytics" icon={<BarChartIcon />} iconPosition="start" />
            <Tab label="Provider Management" icon={<BusinessIcon />} iconPosition="start" />
            <Tab label="Templates" icon={<AssignmentTurnedInIcon />} iconPosition="start" />
          </Tabs>
        </Paper>
        
        {/* Tab Content */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {loading ? (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress />
                </Box>
              </Grid>
            ) : quotations.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 5, textAlign: 'center' }}>
                  <GroupsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    No Active Quotations
                  </Typography>
                  <Typography color="text.secondary" paragraph>
                    Create your first RFQ to start receiving competitive offers from providers
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create First RFQ
                  </Button>
                </Paper>
              </Grid>
            ) : (
              quotations.map((quotation) => {
                const status = QUOTATION_STATUS[quotation.status] || QUOTATION_STATUS.DRAFT;
                const progress = quotation.totalRequested > 0 
                  ? (quotation.responsesReceived / quotation.totalRequested) * 100 
                  : 0;
                
                return (
                  <Grid item xs={12} md={6} lg={4} key={quotation.id}>
                    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
                      {/* Status Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: 20,
                          zIndex: 1
                        }}
                      >
                        <Chip
                          label={status.label}
                          color={status.color}
                          icon={status.icon}
                          size="small"
                        />
                      </Box>
                      
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {quotation.groupName}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Chip
                            label={quotation.id}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`${quotation.numberOfPax} pax`}
                            size="small"
                            icon={<PeopleIcon />}
                          />
                        </Box>
                        
                        <List dense>
                          <ListItem>
                            <ListItemIcon>
                              <BusinessIcon />
                            </ListItemIcon>
                            <ListItemText 
                              primary={quotation.agencyName}
                              secondary="Agency"
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`${quotation.arrivalDate} - ${quotation.departureDate}`}
                              secondary="Travel Dates"
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <TimerIcon />
                            </ListItemIcon>
                            <ListItemText 
                              primary={quotation.deadline}
                              secondary="Response Deadline"
                            />
                          </ListItem>
                        </List>
                        
                        {/* Response Progress */}
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Provider Responses
                            </Typography>
                            <Typography variant="body2" color="primary">
                              {quotation.responsesReceived}/{quotation.totalRequested}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        
                        {/* Best Price */}
                        {quotation.bestPrice && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                            <Typography variant="body2" color="success.dark">
                              Best Price
                            </Typography>
                            <Typography variant="h5" color="success.dark">
                              ${quotation.bestPrice}
                            </Typography>
                            <Typography variant="caption" color="success.dark">
                              per person
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Actions */}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              setSelectedQuotation(quotation);
                              setShowComparisonDialog(true);
                            }}
                            disabled={quotation.responsesReceived === 0}
                          >
                            View Offers
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => {
                              // Enviar recordatorio
                              console.log('Send reminder for', quotation.id);
                            }}
                          >
                            <NotificationsIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              // Ver detalles
                              setSelectedQuotation(quotation);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })
            )}
          </Grid>
        )}
        
        {/* Create RFQ Dialog */}
        <Dialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          maxWidth="lg"
          fullWidth
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5">
                Create New Group RFQ
              </Typography>
              <Chip
                label={`Step ${currentStep + 1} of 5`}
                color="primary"
                size="small"
              />
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
              <Step>
                <StepLabel>Basic Information</StepLabel>
              </Step>
              <Step>
                <StepLabel>Itinerary</StepLabel>
              </Step>
              <Step>
                <StepLabel>Services</StepLabel>
              </Step>
              <Step>
                <StepLabel>Competition Settings</StepLabel>
              </Step>
              <Step>
                <StepLabel>Review & Send</StepLabel>
              </Step>
            </Stepper>
            
            {/* Step 1: Basic Information */}
            {currentStep === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Group Name"
                    value={newQuotation.groupName}
                    onChange={(e) => setNewQuotation({ ...newQuotation, groupName: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Agency Name"
                    value={newQuotation.agencyName}
                    onChange={(e) => setNewQuotation({ ...newQuotation, agencyName: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Person"
                    value={newQuotation.contactPerson}
                    onChange={(e) => setNewQuotation({ ...newQuotation, contactPerson: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={newQuotation.email}
                    onChange={(e) => setNewQuotation({ ...newQuotation, email: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={newQuotation.phone}
                    onChange={(e) => setNewQuotation({ ...newQuotation, phone: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Arrival Date"
                    type="date"
                    value={newQuotation.arrivalDate}
                    onChange={(e) => setNewQuotation({ ...newQuotation, arrivalDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Departure Date"
                    type="date"
                    value={newQuotation.departureDate}
                    onChange={(e) => setNewQuotation({ ...newQuotation, departureDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Number of Passengers"
                    type="number"
                    value={newQuotation.numberOfPax}
                    onChange={(e) => setNewQuotation({ ...newQuotation, numberOfPax: parseInt(e.target.value) })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Free Persons"
                    type="number"
                    value={newQuotation.freePersons}
                    onChange={(e) => setNewQuotation({ ...newQuotation, freePersons: parseInt(e.target.value) })}
                    helperText="Tour leaders, drivers, etc."
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Response Deadline"
                    type="datetime-local"
                    value={newQuotation.deadline}
                    onChange={(e) => setNewQuotation({ ...newQuotation, deadline: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
              </Grid>
            )}
            
            {/* Step 2: Itinerary */}
            {currentStep === 1 && (
              <Box>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Itinerary Segments</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      // Agregar segmento
                      setNewQuotation(prev => ({
                        ...prev,
                        itinerary: [...prev.itinerary, { location: '', nights: 1, hotels: [] }]
                      }));
                    }}
                  >
                    Add Segment
                  </Button>
                </Box>
                
                {newQuotation.itinerary.map((segment, index) => (
                  <Paper key={index} sx={{ p: 3, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Location"
                          value={segment.location}
                          onChange={(e) => {
                            const updated = [...newQuotation.itinerary];
                            updated[index].location = e.target.value;
                            setNewQuotation({ ...newQuotation, itinerary: updated });
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <TextField
                          fullWidth
                          label="Nights"
                          type="number"
                          value={segment.nights}
                          onChange={(e) => {
                            const updated = [...newQuotation.itinerary];
                            updated[index].nights = parseInt(e.target.value);
                            setNewQuotation({ ...newQuotation, itinerary: updated });
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          multiple
                          options={providers.filter(p => p.type === 'HOTEL' && p.location === segment.location)}
                          getOptionLabel={(option) => option.name}
                          value={segment.hotels}
                          onChange={(event, newValue) => {
                            const updated = [...newQuotation.itinerary];
                            updated[index].hotels = newValue;
                            setNewQuotation({ ...newQuotation, itinerary: updated });
                          }}
                          renderInput={(params) => (
                            <TextField {...params} label="Hotels to Quote" />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <IconButton
                          color="error"
                          onClick={() => {
                            const updated = newQuotation.itinerary.filter((_, i) => i !== index);
                            setNewQuotation({ ...newQuotation, itinerary: updated });
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Box>
            )}
            
            {/* Step 3: Services */}
            {currentStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>Required Services</Typography>
                <Grid container spacing={2}>
                  {Object.entries(SERVICE_TYPES).map(([key, service]) => (
                    <Grid item xs={12} md={4} key={key}>
                      <Paper
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: newQuotation.services.find(s => s.type === key) ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => {
                          const exists = newQuotation.services.find(s => s.type === key);
                          if (exists) {
                            setNewQuotation({
                              ...newQuotation,
                              services: newQuotation.services.filter(s => s.type !== key)
                            });
                          } else {
                            setNewQuotation({
                              ...newQuotation,
                              services: [...newQuotation.services, { type: key, details: {} }]
                            });
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {service.icon}
                          <Typography sx={{ ml: 1 }}>{service.name}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Special Requests"
                  value={newQuotation.specialRequests}
                  onChange={(e) => setNewQuotation({ ...newQuotation, specialRequests: e.target.value })}
                  sx={{ mt: 3 }}
                  helperText="Any specific requirements or preferences for the group"
                />
              </Box>
            )}
            
            {/* Step 4: Competition Settings */}
            {currentStep === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>Competition Settings</Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Competition Mode</InputLabel>
                      <Select
                        value={newQuotation.competitionMode}
                        onChange={(e) => setNewQuotation({ ...newQuotation, competitionMode: e.target.value })}
                        label="Competition Mode"
                      >
                        <MenuItem value="OPEN">
                          <Box>
                            <Typography>Open Competition</Typography>
                            <Typography variant="caption" color="text.secondary">
                              All providers can see they're competing
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="BLIND">
                          <Box>
                            <Typography>Blind Competition</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Providers don't know about competition
                            </Typography>
                          </Box>
                        </MenuItem>
                        <MenuItem value="HYBRID">
                          <Box>
                            <Typography>Hybrid</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Some providers compete, others exclusive
                            </Typography>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={newQuotation.autoSelect}
                          onChange={(e) => setNewQuotation({ ...newQuotation, autoSelect: e.target.checked })}
                        />
                      }
                      label="Auto-select best options based on scoring"
                    />
                  </Grid>
                  
                  {newQuotation.autoSelect && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>Scoring Criteria Weights</Typography>
                      {Object.entries(newQuotation.scoringCriteria).map(([key, criteria]) => (
                        <Box key={key} sx={{ mb: 2 }}>
                          <Typography variant="body2">{criteria.name}</Typography>
                          <Slider
                            value={criteria.weight * 100}
                            onChange={(e, value) => {
                              setNewQuotation({
                                ...newQuotation,
                                scoringCriteria: {
                                  ...newQuotation.scoringCriteria,
                                  [key]: { ...criteria, weight: value / 100 }
                                }
                              });
                            }}
                            valueLabelDisplay="auto"
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 50, label: '50%' },
                              { value: 100, label: '100%' }
                            ]}
                          />
                        </Box>
                      ))}
                    </Grid>
                  )}
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Minimum Budget"
                      type="number"
                      value={newQuotation.budget.min}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        budget: { ...newQuotation.budget, min: parseFloat(e.target.value) }
                      })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Maximum Budget"
                      type="number"
                      value={newQuotation.budget.max}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        budget: { ...newQuotation.budget, max: parseFloat(e.target.value) }
                      })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* Step 5: Review & Send */}
            {currentStep === 4 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>Review Your RFQ</AlertTitle>
                  This RFQ will be sent to {providers.length} providers based on your itinerary and service requirements.
                </Alert>
                
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Summary</Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Group Name</Typography>
                      <Typography variant="body1" gutterBottom>{newQuotation.groupName}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Agency</Typography>
                      <Typography variant="body1" gutterBottom>{newQuotation.agencyName}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Travel Dates</Typography>
                      <Typography variant="body1" gutterBottom>
                        {newQuotation.arrivalDate} - {newQuotation.departureDate}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Passengers</Typography>
                      <Typography variant="body1" gutterBottom>
                        {newQuotation.numberOfPax} pax ({newQuotation.freePersons} free)
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Itinerary</Typography>
                      <List dense>
                        {newQuotation.itinerary.map((segment, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <LocationIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${segment.location} - ${segment.nights} nights`}
                              secondary={`${segment.hotels?.length || 0} hotels will receive RFQ`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Competition Mode</Typography>
                      <Chip
                        label={newQuotation.competitionMode}
                        color="primary"
                        icon={<GavelIcon />}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                Back
              </Button>
            )}
            {currentStep < 4 ? (
              <Button
                variant="contained"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleCreateQuotation}
                sx={{
                  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                  color: 'white'
                }}
              >
                Send RFQ to Providers
              </Button>
            )}
          </DialogActions>
        </Dialog>
        
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        {/* Speed Dial for Quick Actions */}
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<AddIcon />}
            tooltipTitle="Create RFQ"
            onClick={() => setShowCreateDialog(true)}
          />
          <SpeedDialAction
            icon={<TourIcon />}
            tooltipTitle="Holy Land Template"
            onClick={() => {
              setNewQuotation(prev => ({
                ...prev,
                groupName: 'Holy Land Pilgrimage',
                itinerary: HOLY_LAND_ITINERARY_TEMPLATE.segments
              }));
              setShowCreateDialog(true);
            }}
          />
          <SpeedDialAction
            icon={<NotificationsIcon />}
            tooltipTitle="Send Reminders"
            onClick={() => {
              console.log('Send reminders to pending providers');
            }}
          />
        </SpeedDial>
      </Box>
    </LocalizationProvider>
  );
};

export default GroupQuotationSystem;