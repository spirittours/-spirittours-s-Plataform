import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Switch,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Slider,
  Stack,
  Badge,
  Snackbar,
  CircularProgress
} from '@mui/material';

import {
  Hotel as HotelIcon,
  DirectionsBus as BusIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Send as SendIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  TrendingDown as DiscountIcon,
  LocalOffer as OfferIcon,
  Calculate as CalculateIcon,
  Groups as GroupsIcon,
  CalendarToday as CalendarIcon,
  SingleBed as SingleBedIcon,
  KingBed as DoubleBedIcon,
  FamilyRestroom as TripleBedIcon,
  FreeBreakfast as BreakfastIcon,
  LunchDining as LunchIcon,
  DinnerDining as DinnerIcon,
  Wifi as WifiIcon,
  Pool as PoolIcon,
  Spa as SpaIcon,
  FitnessCenter as GymIcon,
  LocalParking as ParkingIcon,
  AcUnit as AirConditionIcon,
  RoomService as RoomServiceIcon,
  BusinessCenter as BusinessCenterIcon,
  Pets as PetsIcon,
  SmokeFree as SmokeFreeIcon,
  AccessTime as ClockIcon,
  Speed as SpeedIcon,
  Star as StarIcon,
  EmojiEvents as WinnerIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  CompareArrows as CompareIcon,
  Notifications as NotificationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  Euro as EuroIcon,
  AttachFile as AttachmentIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  CloudUpload as UploadIcon,
  CheckBox as CheckedIcon,
  CheckBoxOutlineBlank as UncheckedIcon,
  RadioButtonChecked as RadioCheckedIcon,
  RadioButtonUnchecked as RadioUncheckedIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Verified as VerifiedIcon,
  NewReleases as UrgentIcon,
  FlashOn as FlashIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as ChartIcon,
  Person as PersonIcon,
  SupervisorAccount as ManagerIcon,
  SupportAgent as SupportIcon,
  HelpOutline as HelpIcon,
  Lightbulb as TipIcon,
  AutoAwesome as AutoIcon,
  Psychology as AIIcon
} from '@mui/icons-material';

// Configuración del proveedor (Hotel)
const PROVIDER_CONFIG = {
  hotel: {
    id: 'HTL-001',
    name: 'Legacy Nazareth Hotel',
    category: 4,
    location: 'Nazaret',
    email: 'reservations@legacynazareth.com',
    phone: '+972-4-1234567',
    contactPerson: 'Sarah Cohen',
    logo: null
  },
  roomTypes: {
    SINGLE: { 
      name: 'Habitación Sencilla',
      basePrice: 120,
      maxOccupancy: 1,
      available: 25
    },
    DOUBLE: {
      name: 'Habitación Doble',
      basePrice: 85,
      maxOccupancy: 2,
      available: 40
    },
    TRIPLE: {
      name: 'Habitación Triple',
      basePrice: 110,
      maxOccupancy: 3,
      available: 15
    },
    SUITE: {
      name: 'Suite',
      basePrice: 200,
      maxOccupancy: 4,
      available: 5
    }
  },
  mealPlans: {
    ROOM_ONLY: { name: 'Solo Alojamiento', pricePerPerson: 0 },
    BREAKFAST: { name: 'Desayuno Incluido', pricePerPerson: 15 },
    HALF_BOARD: { name: 'Media Pensión', pricePerPerson: 40 },
    FULL_BOARD: { name: 'Pensión Completa', pricePerPerson: 65 }
  },
  amenities: [
    'wifi', 'parking', 'pool', 'gym', 'spa', 'restaurant', 
    'bar', 'room-service', 'laundry', 'business-center'
  ],
  specialServices: {
    KOSHER_MEALS: 'Comidas Kosher',
    SHABBAT_ELEVATOR: 'Elevador de Shabbat',
    PRAYER_ROOM: 'Sala de Oración',
    RELIGIOUS_GUIDANCE: 'Guía Religioso'
  }
};

// Estrategias de precio competitivo
const PRICING_STRATEGIES = {
  AGGRESSIVE: {
    name: 'Agresiva',
    description: 'Precio más bajo posible para ganar',
    discount: 0.15,
    icon: <TrendingDownIcon />,
    color: 'error'
  },
  COMPETITIVE: {
    name: 'Competitiva',
    description: 'Precio justo con buen margen',
    discount: 0.08,
    icon: <CompareIcon />,
    color: 'primary'
  },
  PREMIUM: {
    name: 'Premium',
    description: 'Precio alto con servicios extra',
    discount: 0,
    icon: <StarIcon />,
    color: 'warning'
  },
  DYNAMIC: {
    name: 'Dinámica',
    description: 'Ajuste según demanda',
    discount: null,
    icon: <AutoIcon />,
    color: 'info'
  }
};

const ProviderResponsePortal = () => {
  // Estado principal
  const [quotationData, setQuotationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [competitorCount, setCompetitorCount] = useState(0);
  
  // Estado de la respuesta
  const [response, setResponse] = useState({
    pricing: {
      singleRoom: PROVIDER_CONFIG.roomTypes.SINGLE.basePrice,
      doubleRoom: PROVIDER_CONFIG.roomTypes.DOUBLE.basePrice,
      tripleRoom: PROVIDER_CONFIG.roomTypes.TRIPLE.basePrice,
      suiteRoom: PROVIDER_CONFIG.roomTypes.SUITE.basePrice,
      childDiscount: 0.30, // 30% descuento niños
      groupDiscount: 0, // Descuento adicional por grupo
      earlyBookingDiscount: 0,
      seasonalAdjustment: 0
    },
    mealPlans: {
      BREAKFAST: 15,
      HALF_BOARD: 40,
      FULL_BOARD: 65
    },
    availability: {
      confirmed: false,
      alternativeDates: [],
      waitingList: false,
      cancellationPolicy: 'FLEXIBLE' // FLEXIBLE, MODERATE, STRICT
    },
    specialOffers: [],
    amenitiesIncluded: ['wifi', 'parking', 'breakfast'],
    extraServices: [],
    notes: '',
    attachments: [],
    strategy: 'COMPETITIVE',
    autoAdjustPrice: false,
    beatCompetitors: false,
    guaranteedBestPrice: false
  });
  
  // Estado de cálculos
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    discount: 0,
    taxes: 0,
    total: 0,
    pricePerPerson: 0,
    profit: 0,
    profitMargin: 0
  });
  
  // Estado de UI
  const [showCompetitorInfo, setShowCompetitorInfo] = useState(false);
  const [showPriceCalculator, setShowPriceCalculator] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Simular carga de datos de cotización
  useEffect(() => {
    loadQuotationData();
    startCountdown();
    
    // Actualizar cálculos cuando cambian los precios
    const interval = setInterval(() => {
      calculateTotalPrice();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [response.pricing]);
  
  // Cargar datos de la cotización
  const loadQuotationData = async () => {
    setLoading(true);
    try {
      // Simular llamada API para obtener datos de la cotización
      // En producción, esto vendría de la URL params y API call
      const mockData = {
        quotationId: 'GRP-202410-0001',
        agency: {
          name: 'Holy Land Tours Agency',
          contactPerson: 'John Smith',
          email: 'john@holylandtours.com',
          phone: '+1234567890',
          country: 'USA'
        },
        group: {
          name: 'Pilgrimage November 2025',
          totalPax: 45,
          freeSpots: 2,
          singleRooms: 5,
          doubleRooms: 18,
          tripleRooms: 2,
          children: 3
        },
        dates: {
          checkIn: '2025-11-01',
          checkOut: '2025-11-04',
          nights: 3
        },
        requirements: {
          mealPlan: 'HALF_BOARD',
          specialRequests: 'Habitaciones cerca del elevador, menú kosher disponible',
          maxBudget: 1500,
          competitiveBidding: true
        },
        deadline: new Date(Date.now() + 24 * 3600000), // 24 horas desde ahora
        competitors: {
          count: 4,
          averageCategory: 4,
          priceRange: { min: 75, max: 95 }
        }
      };
      
      setQuotationData(mockData);
      setCompetitorCount(mockData.competitors.count);
      
      // Si hay competencia, mostrar información
      if (mockData.requirements.competitiveBidding) {
        setShowCompetitorInfo(true);
      }
      
    } catch (error) {
      console.error('Error loading quotation:', error);
      showSnackbar('Error al cargar la cotización', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Iniciar countdown
  const startCountdown = () => {
    const timer = setInterval(() => {
      if (quotationData?.deadline) {
        const now = new Date();
        const deadline = new Date(quotationData.deadline);
        const diff = deadline - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / 3600000);
          const minutes = Math.floor((diff % 3600000) / 60000);
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining('Expirado');
          clearInterval(timer);
        }
      }
    }, 60000); // Actualizar cada minuto
    
    return () => clearInterval(timer);
  };
  
  // Calcular precio total
  const calculateTotalPrice = () => {
    if (!quotationData) return;
    
    const { group, dates } = quotationData;
    const { pricing, mealPlans } = response;
    
    // Calcular alojamiento
    const singleRoomTotal = pricing.singleRoom * group.singleRooms * dates.nights;
    const doubleRoomTotal = pricing.doubleRoom * group.doubleRooms * dates.nights * 2;
    const tripleRoomTotal = pricing.tripleRoom * group.tripleRooms * dates.nights * 3;
    
    const roomSubtotal = singleRoomTotal + doubleRoomTotal + tripleRoomTotal;
    
    // Calcular comidas
    const mealPlan = quotationData.requirements.mealPlan;
    const mealCost = mealPlans[mealPlan] * (group.totalPax - group.freeSpots) * dates.nights;
    
    // Aplicar descuentos
    const groupDiscountAmount = roomSubtotal * (pricing.groupDiscount / 100);
    const earlyBookingDiscountAmount = roomSubtotal * (pricing.earlyBookingDiscount / 100);
    const childDiscountAmount = (group.children * pricing.doubleRoom * dates.nights) * (pricing.childDiscount);
    
    const totalDiscount = groupDiscountAmount + earlyBookingDiscountAmount + childDiscountAmount;
    
    const subtotal = roomSubtotal + mealCost;
    const total = subtotal - totalDiscount;
    const pricePerPerson = total / (group.totalPax - group.freeSpots);
    
    // Calcular profit (asumiendo 70% de costo)
    const cost = total * 0.7;
    const profit = total - cost;
    const profitMargin = (profit / total) * 100;
    
    setCalculations({
      subtotal,
      discount: totalDiscount,
      taxes: 0, // Se calcularía según el país
      total,
      pricePerPerson,
      profit,
      profitMargin
    });
  };
  
  // Aplicar estrategia de precios
  const applyPricingStrategy = (strategy) => {
    const baseStrategy = PRICING_STRATEGIES[strategy];
    
    if (strategy === 'DYNAMIC') {
      // Precio dinámico basado en ocupación y demanda
      const occupancyRate = 0.75; // Simular 75% de ocupación
      const demandFactor = occupancyRate > 0.8 ? 1.1 : 0.95;
      
      setResponse({
        ...response,
        pricing: {
          ...response.pricing,
          singleRoom: PROVIDER_CONFIG.roomTypes.SINGLE.basePrice * demandFactor,
          doubleRoom: PROVIDER_CONFIG.roomTypes.DOUBLE.basePrice * demandFactor,
          tripleRoom: PROVIDER_CONFIG.roomTypes.TRIPLE.basePrice * demandFactor
        },
        strategy
      });
    } else {
      // Aplicar descuento de estrategia
      const discount = baseStrategy.discount;
      
      setResponse({
        ...response,
        pricing: {
          ...response.pricing,
          singleRoom: PROVIDER_CONFIG.roomTypes.SINGLE.basePrice * (1 - discount),
          doubleRoom: PROVIDER_CONFIG.roomTypes.DOUBLE.basePrice * (1 - discount),
          tripleRoom: PROVIDER_CONFIG.roomTypes.TRIPLE.basePrice * (1 - discount),
          groupDiscount: discount * 100
        },
        strategy
      });
    }
    
    showSnackbar(`Estrategia ${baseStrategy.name} aplicada`, 'success');
  };
  
  // Agregar oferta especial
  const addSpecialOffer = (type) => {
    const offers = {
      EARLY_BOOKING: {
        type: 'EARLY_BOOKING',
        description: 'Descuento por reserva anticipada',
        value: 10,
        unit: 'percent'
      },
      FREE_UPGRADE: {
        type: 'FREE_UPGRADE',
        description: 'Upgrade gratuito de categoría de habitación',
        value: 'Suite',
        unit: 'text'
      },
      FREE_SPA: {
        type: 'FREE_SPA',
        description: 'Acceso gratuito al spa y piscina',
        value: 'Incluido',
        unit: 'text'
      },
      WELCOME_GIFT: {
        type: 'WELCOME_GIFT',
        description: 'Regalo de bienvenida en la habitación',
        value: 'Vino y frutas',
        unit: 'text'
      },
      FREE_TRANSFER: {
        type: 'FREE_TRANSFER',
        description: 'Traslado aeropuerto gratuito',
        value: 'Ida y vuelta',
        unit: 'text'
      }
    };
    
    const offer = offers[type];
    if (offer) {
      setResponse({
        ...response,
        specialOffers: [...response.specialOffers, offer]
      });
      showSnackbar('Oferta especial agregada', 'success');
    }
  };
  
  // Usar AI para optimizar precio
  const useAIPricing = () => {
    setShowAIAssistant(true);
    
    // Simular análisis AI
    setTimeout(() => {
      // Precio optimizado por AI basado en:
      // - Historial de reservas
      // - Competencia
      // - Temporada
      // - Ocupación
      
      const aiOptimizedPrices = {
        singleRoom: 115,
        doubleRoom: 82,
        tripleRoom: 105,
        groupDiscount: 5,
        earlyBookingDiscount: 3
      };
      
      setResponse({
        ...response,
        pricing: {
          ...response.pricing,
          ...aiOptimizedPrices
        }
      });
      
      showSnackbar('Precios optimizados por AI aplicados', 'info');
      setShowAIAssistant(false);
    }, 2000);
  };
  
  // Validar respuesta antes de enviar
  const validateResponse = () => {
    const errors = [];
    
    if (response.pricing.doubleRoom <= 0) {
      errors.push('El precio de habitación doble es requerido');
    }
    
    if (!response.availability.confirmed && response.availability.alternativeDates.length === 0) {
      errors.push('Debe confirmar disponibilidad o sugerir fechas alternativas');
    }
    
    if (response.beatCompetitors && response.pricing.groupDiscount < 5) {
      errors.push('Para superar competidores, considere ofrecer al menos 5% de descuento');
    }
    
    return errors;
  };
  
  // Enviar respuesta
  const submitResponse = async () => {
    const errors = validateResponse();
    
    if (errors.length > 0) {
      showSnackbar(errors[0], 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Preparar datos para envío
      const responseData = {
        quotationId: quotationData.quotationId,
        hotelId: PROVIDER_CONFIG.hotel.id,
        hotelName: PROVIDER_CONFIG.hotel.name,
        response: {
          ...response,
          calculations,
          submittedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 7 * 24 * 3600000).toISOString() // Válido por 7 días
        }
      };
      
      console.log('Enviando respuesta:', responseData);
      
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessDialog(true);
      showSnackbar('Respuesta enviada exitosamente', 'success');
      
    } catch (error) {
      console.error('Error submitting response:', error);
      showSnackbar('Error al enviar la respuesta', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Mostrar snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  if (loading && !quotationData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header con información del hotel */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                <HotelIcon />
              </Avatar>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {PROVIDER_CONFIG.hotel.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label={`${PROVIDER_CONFIG.hotel.category} Estrellas`} icon={<StarIcon />} />
                  <Chip label={PROVIDER_CONFIG.hotel.location} icon={<LocationIcon />} />
                  <Chip label={PROVIDER_CONFIG.hotel.contactPerson} icon={<PersonIcon />} />
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            {timeRemaining && (
              <Alert 
                severity={timeRemaining === 'Expirado' ? 'error' : 'warning'}
                icon={<TimerIcon />}
              >
                <AlertTitle>Tiempo Restante</AlertTitle>
                {timeRemaining}
              </Alert>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Información de la cotización */}
      {quotationData && (
        <Grid container spacing={3}>
          {/* Panel izquierdo - Detalles de la cotización */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Detalles de la Cotización"
                subheader={`ID: ${quotationData.quotationId}`}
                avatar={<QuoteIcon />}
              />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemIcon><BusinessIcon /></ListItemIcon>
                    <ListItemText
                      primary={quotationData.agency.name}
                      secondary={quotationData.agency.contactPerson}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><GroupsIcon /></ListItemIcon>
                    <ListItemText
                      primary={quotationData.group.name}
                      secondary={`${quotationData.group.totalPax} pasajeros`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CalendarIcon /></ListItemIcon>
                    <ListItemText
                      primary={`${quotationData.dates.checkIn} - ${quotationData.dates.checkOut}`}
                      secondary={`${quotationData.dates.nights} noches`}
                    />
                  </ListItem>
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Distribución de Habitaciones
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <SingleBedIcon />
                      <Typography variant="h6">{quotationData.group.singleRooms}</Typography>
                      <Typography variant="caption">Sencillas</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <DoubleBedIcon />
                      <Typography variant="h6">{quotationData.group.doubleRooms}</Typography>
                      <Typography variant="caption">Dobles</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 1, textAlign: 'center' }}>
                      <TripleBedIcon />
                      <Typography variant="h6">{quotationData.group.tripleRooms}</Typography>
                      <Typography variant="caption">Triples</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info">
                    <AlertTitle>Requisitos Especiales</AlertTitle>
                    {quotationData.requirements.specialRequests}
                  </Alert>
                </Box>
              </CardContent>
            </Card>
            
            {/* Información de competencia */}
            {showCompetitorInfo && (
              <Card>
                <CardHeader
                  title="Análisis de Competencia"
                  subheader="Sistema de ofertas competitivas activo"
                  avatar={
                    <Badge badgeContent={competitorCount} color="error">
                      <CompareIcon />
                    </Badge>
                  }
                />
                <CardContent>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Hay {competitorCount} hoteles más cotizando para este grupo
                  </Alert>
                  
                  <Typography variant="body2" gutterBottom>
                    Rango de precios esperado:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip 
                      label={`Mín: $${quotationData.competitors.priceRange.min}`}
                      color="success"
                      size="small"
                    />
                    <Chip 
                      label={`Máx: $${quotationData.competitors.priceRange.max}`}
                      color="error"
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    Categoría promedio competidores:
                  </Typography>
                  <Rating value={quotationData.competitors.averageCategory} readOnly />
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Estrategias Recomendadas:
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(PRICING_STRATEGIES).map(([key, strategy]) => (
                      <Button
                        key={key}
                        variant={response.strategy === key ? 'contained' : 'outlined'}
                        color={strategy.color}
                        size="small"
                        startIcon={strategy.icon}
                        onClick={() => applyPricingStrategy(key)}
                        fullWidth
                      >
                        {strategy.name}
                      </Button>
                    ))}
                  </Stack>
                  
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="info"
                      startIcon={<AIIcon />}
                      onClick={useAIPricing}
                      fullWidth
                    >
                      Optimizar con AI
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>
          
          {/* Panel central - Formulario de respuesta */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader
                title="Formulario de Cotización"
                subheader="Complete los detalles de su oferta"
                action={
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={`Paso ${currentStep + 1} de 4`}
                      color="primary"
                    />
                    <IconButton onClick={() => setShowPriceCalculator(true)}>
                      <CalculateIcon />
                    </IconButton>
                  </Stack>
                }
              />
              <CardContent>
                <Stepper activeStep={currentStep} sx={{ mb: 3 }}>
                  <Step>
                    <StepLabel>Precios</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Disponibilidad</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Ofertas</StepLabel>
                  </Step>
                  <Step>
                    <StepLabel>Revisión</StepLabel>
                  </Step>
                </Stepper>
                
                {/* Paso 1: Precios */}
                {currentStep === 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Tarifas por Habitación (por noche)
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Habitación Sencilla"
                          type="number"
                          value={response.pricing.singleRoom}
                          onChange={(e) => setResponse({
                            ...response,
                            pricing: { ...response.pricing, singleRoom: parseFloat(e.target.value) }
                          })}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={`Base: $${PROVIDER_CONFIG.roomTypes.SINGLE.basePrice}`}>
                                  <InfoIcon fontSize="small" />
                                </Tooltip>
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Habitación Doble"
                          type="number"
                          value={response.pricing.doubleRoom}
                          onChange={(e) => setResponse({
                            ...response,
                            pricing: { ...response.pricing, doubleRoom: parseFloat(e.target.value) }
                          })}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={`Base: $${PROVIDER_CONFIG.roomTypes.DOUBLE.basePrice}`}>
                                  <InfoIcon fontSize="small" />
                                </Tooltip>
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Habitación Triple"
                          type="number"
                          value={response.pricing.tripleRoom}
                          onChange={(e) => setResponse({
                            ...response,
                            pricing: { ...response.pricing, tripleRoom: parseFloat(e.target.value) }
                          })}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={`Base: $${PROVIDER_CONFIG.roomTypes.TRIPLE.basePrice}`}>
                                  <InfoIcon fontSize="small" />
                                </Tooltip>
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Descuento para Niños"
                          type="number"
                          value={response.pricing.childDiscount * 100}
                          onChange={(e) => setResponse({
                            ...response,
                            pricing: { ...response.pricing, childDiscount: parseFloat(e.target.value) / 100 }
                          })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                          }}
                        />
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Typography variant="h6" gutterBottom>
                      Descuentos Especiales
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Descuento por Grupo"
                          type="number"
                          value={response.pricing.groupDiscount}
                          onChange={(e) => setResponse({
                            ...response,
                            pricing: { ...response.pricing, groupDiscount: parseFloat(e.target.value) }
                          })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Descuento Reserva Anticipada"
                          type="number"
                          value={response.pricing.earlyBookingDiscount}
                          onChange={(e) => setResponse({
                            ...response,
                            pricing: { ...response.pricing, earlyBookingDiscount: parseFloat(e.target.value) }
                          })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={response.guaranteedBestPrice}
                              onChange={(e) => setResponse({
                                ...response,
                                guaranteedBestPrice: e.target.checked
                              })}
                            />
                          }
                          label="Garantizar Mejor Precio"
                        />
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 3 }}>
                      <Button
                        variant="contained"
                        onClick={() => setCurrentStep(1)}
                      >
                        Siguiente
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {/* Paso 2: Disponibilidad */}
                {currentStep === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Confirmación de Disponibilidad
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={response.availability.confirmed}
                          onChange={(e) => setResponse({
                            ...response,
                            availability: { ...response.availability, confirmed: e.target.checked }
                          })}
                        />
                      }
                      label="Confirmo disponibilidad para las fechas solicitadas"
                    />
                    
                    {!response.availability.confirmed && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Si no tiene disponibilidad, puede sugerir fechas alternativas
                      </Alert>
                    )}
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Typography variant="h6" gutterBottom>
                      Política de Cancelación
                    </Typography>
                    
                    <FormControl fullWidth>
                      <Select
                        value={response.availability.cancellationPolicy}
                        onChange={(e) => setResponse({
                          ...response,
                          availability: { ...response.availability, cancellationPolicy: e.target.value }
                        })}
                      >
                        <MenuItem value="FLEXIBLE">
                          Flexible - Cancelación gratuita hasta 24 horas antes
                        </MenuItem>
                        <MenuItem value="MODERATE">
                          Moderada - Cancelación gratuita hasta 7 días antes
                        </MenuItem>
                        <MenuItem value="STRICT">
                          Estricta - Cancelación con 50% de penalidad
                        </MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      <Button onClick={() => setCurrentStep(0)}>
                        Anterior
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setCurrentStep(2)}
                      >
                        Siguiente
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {/* Paso 3: Ofertas Especiales */}
                {currentStep === 2 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Ofertas Especiales y Valores Agregados
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Agregar ofertas especiales puede aumentar sus posibilidades de ganar la cotización
                    </Alert>
                    
                    <Grid container spacing={2}>
                      {Object.entries({
                        EARLY_BOOKING: 'Descuento Reserva Anticipada',
                        FREE_UPGRADE: 'Upgrade de Habitación Gratis',
                        FREE_SPA: 'Spa Gratuito',
                        WELCOME_GIFT: 'Regalo de Bienvenida',
                        FREE_TRANSFER: 'Traslado Gratuito'
                      }).map(([key, label]) => (
                        <Grid item xs={12} md={6} key={key}>
                          <Button
                            variant={response.specialOffers.find(o => o.type === key) ? 'contained' : 'outlined'}
                            onClick={() => addSpecialOffer(key)}
                            startIcon={<OfferIcon />}
                            fullWidth
                          >
                            {label}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Typography variant="h6" gutterBottom>
                      Notas Adicionales
                    </Typography>
                    
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Comentarios o información adicional"
                      value={response.notes}
                      onChange={(e) => setResponse({ ...response, notes: e.target.value })}
                      placeholder="Ej: Experiencia con grupos religiosos, ubicación cerca de sitios santos, etc."
                    />
                    
                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      <Button onClick={() => setCurrentStep(1)}>
                        Anterior
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setCurrentStep(3)}
                      >
                        Siguiente
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {/* Paso 4: Revisión y Envío */}
                {currentStep === 3 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Resumen de su Cotización
                    </Typography>
                    
                    <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Precio Total Estimado</Typography>
                          <Typography variant="h4">
                            ${calculations.total.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2">Precio por Persona</Typography>
                          <Typography variant="h4">
                            ${calculations.pricePerPerson.toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                    
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>Habitación Sencilla</TableCell>
                            <TableCell align="right">${response.pricing.singleRoom}/noche</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Habitación Doble</TableCell>
                            <TableCell align="right">${response.pricing.doubleRoom}/noche</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Habitación Triple</TableCell>
                            <TableCell align="right">${response.pricing.tripleRoom}/noche</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Descuento Grupo</TableCell>
                            <TableCell align="right">{response.pricing.groupDiscount}%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Disponibilidad</TableCell>
                            <TableCell align="right">
                              {response.availability.confirmed ? (
                                <Chip label="Confirmada" color="success" size="small" />
                              ) : (
                                <Chip label="Por Confirmar" color="warning" size="small" />
                              )}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Ofertas Especiales</TableCell>
                            <TableCell align="right">
                              {response.specialOffers.length} incluidas
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {response.guaranteedBestPrice && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <AlertTitle>Mejor Precio Garantizado</AlertTitle>
                        Está garantizando el mejor precio disponible
                      </Alert>
                    )}
                    
                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      <Button onClick={() => setCurrentStep(2)}>
                        Anterior
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setConfirmDialog(true)}
                        startIcon={<SendIcon />}
                      >
                        Enviar Cotización
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Diálogo de confirmación */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirmar Envío de Cotización</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Una vez enviada, la cotización será vinculante por 7 días
          </Alert>
          
          <Typography variant="body1">
            ¿Está seguro de enviar esta cotización?
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Precio Total: ${calculations.total.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Precio por Persona: ${calculations.pricePerPerson.toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancelar</Button>
          <Button 
            onClick={() => {
              setConfirmDialog(false);
              submitResponse();
            }}
            variant="contained"
            color="primary"
          >
            Confirmar y Enviar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de éxito */}
      <Dialog open={successDialog} onClose={() => setSuccessDialog(false)}>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            ¡Cotización Enviada Exitosamente!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Su cotización ha sido enviada a Spirit Tours.
            Le notificaremos cuando el cliente tome una decisión.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              ID de Cotización: {quotationData?.quotationId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Válida hasta: {new Date(Date.now() + 7 * 24 * 3600000).toLocaleDateString()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialog(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Calculadora de precios */}
      <Dialog 
        open={showPriceCalculator} 
        onClose={() => setShowPriceCalculator(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Calculadora de Precios</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Desglose de Costos
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Subtotal Alojamiento</TableCell>
                    <TableCell align="right">${calculations.subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Descuentos Aplicados</TableCell>
                    <TableCell align="right">-${calculations.discount.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>${calculations.total.toFixed(2)}</strong></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Margen de Ganancia</TableCell>
                    <TableCell align="right">{calculations.profitMargin.toFixed(1)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Precio sugerido para ser competitivo: ${(calculations.total * 0.95).toFixed(2)}
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPriceCalculator(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProviderResponsePortal;