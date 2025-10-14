import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
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
  AvatarGroup,
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
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Rating,
  SpeedDial,
  SpeedDialAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CardActions,
  Checkbox,
  FormGroup,
  Radio,
  RadioGroup
} from '@mui/material';

import {
  Groups as GroupsIcon,
  Hotel as HotelIcon,
  DirectionsBus as BusIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as MoneyIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Flight as FlightIcon,
  LocalActivity as ActivityIcon,
  Spa as SpaIcon,
  Museum as MuseumIcon,
  Tour as TourIcon,
  BeachAccess as BeachIcon,
  Hiking as HikingIcon,
  AccountBalance as MonumentIcon,
  Church as ChurchIcon,
  Mosque as MosqueIcon,
  Synagogue as SynagogueIcon,
  Temple as TempleIcon,
  SingleBed as SingleBedIcon,
  KingBed as DoubleBedIcon,
  FamilyRestroom as TripleBedIcon,
  ChildCare as ChildIcon,
  Accessible as AccessibleIcon,
  Wifi as WifiIcon,
  Pool as PoolIcon,
  Spa as SpaServiceIcon,
  FitnessCenter as GymIcon,
  LocalParking as ParkingIcon,
  AcUnit as AirConditionIcon,
  FreeBreakfast as BreakfastIcon,
  LunchDining as LunchIcon,
  DinnerDining as DinnerIcon,
  LocalBar as BarIcon,
  RoomService as RoomServiceIcon,
  MeetingRoom as MeetingRoomIcon,
  BusinessCenter as BusinessCenterIcon,
  LocalLaundryService as LaundryIcon,
  Pets as PetsIcon,
  SmokeFree as SmokeFreeIcon,
  LocalOffer as OfferIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CompareArrows as CompareIcon,
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as ConfirmedIcon,
  PendingActions as PendingIcon,
  HourglassEmpty as WaitingIcon,
  Speed as SpeedIcon,
  EmojiEvents as WinnerIcon,
  WorkspacePremium as PremiumIcon,
  Verified as VerifiedIcon,
  NewReleases as NewIcon,
  Whatshot as HotIcon,
  LocalFireDepartment as UrgentIcon,
  AccessTime as DeadlineIcon,
  NotificationsActive as NotificationIcon,
  MarkEmailRead as EmailReadIcon,
  ForwardToInbox as ForwardEmailIcon,
  AttachFile as AttachmentIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Calculate as CalculateIcon,
  Percent as PercentIcon,
  CurrencyExchange as CurrencyIcon,
  AccountBalanceWallet as WalletIcon,
  Paid as PaidIcon,
  RequestQuote as QuoteIcon,
  ReceiptLong as InvoiceIcon,
  QrCode2 as QrCodeIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Security as SecurityIcon,
  VerifiedUser as VerifiedUserIcon,
  AdminPanelSettings as AdminIcon,
  SupportAgent as SupportIcon,
  HeadsetMic as CallCenterIcon,
  ChatBubble as ChatIcon,
  Forum as ForumIcon,
  QuestionAnswer as QAIcon,
  LiveHelp as HelpIcon,
  Feedback as FeedbackIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  StarHalf as StarHalfIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Flag as FlagIcon,
  Report as ReportIcon,
  Block as BlockIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  RadioButtonChecked as RadioCheckedIcon,
  RadioButtonUnchecked as RadioUncheckedIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';

// Configuración de destinos y zonas
const DESTINATIONS = {
  HOLY_LAND: {
    name: 'Tierra Santa',
    zones: {
      NAZARETH: {
        name: 'Nazaret',
        hotels: [
          { id: 'NAZ001', name: 'Golden Crown Hotel', category: 4, basePrice: 85 },
          { id: 'NAZ002', name: 'Legacy Nazareth', category: 4, basePrice: 90 },
          { id: 'NAZ003', name: 'Ramada Nazareth', category: 4, basePrice: 95 },
          { id: 'NAZ004', name: 'Plaza Hotel', category: 3, basePrice: 65 }
        ]
      },
      DEAD_SEA: {
        name: 'Mar Muerto',
        hotels: [
          { id: 'DS001', name: 'Isrotel Dead Sea', category: 5, basePrice: 180 },
          { id: 'DS002', name: 'David Dead Sea', category: 5, basePrice: 190 },
          { id: 'DS003', name: 'Crown Plaza Dead Sea', category: 5, basePrice: 170 },
          { id: 'DS004', name: 'Leonardo Club', category: 4, basePrice: 140 },
          { id: 'DS005', name: 'Spa Club', category: 4, basePrice: 130 },
          { id: 'DS006', name: 'Oasis Hotel', category: 3, basePrice: 95 }
        ]
      },
      BETHLEHEM: {
        name: 'Belén',
        hotels: [
          { id: 'BET001', name: 'Manger Square Hotel', category: 4, basePrice: 75 },
          { id: 'BET002', name: 'Paradise Hotel', category: 4, basePrice: 70 },
          { id: 'BET003', name: 'Saint Gabriel Hotel', category: 4, basePrice: 80 },
          { id: 'BET004', name: 'Shepherd Hotel', category: 3, basePrice: 55 },
          { id: 'BET005', name: 'Bethlehem Hotel', category: 3, basePrice: 60 },
          { id: 'BET006', name: 'Nativity Hotel', category: 3, basePrice: 58 },
          { id: 'BET007', name: 'Star Hotel', category: 3, basePrice: 62 },
          { id: 'BET008', name: 'Angels Hotel', category: 4, basePrice: 85 }
        ]
      },
      JERUSALEM: {
        name: 'Jerusalén',
        hotels: [
          { id: 'JER001', name: 'King David Hotel', category: 5, basePrice: 350 },
          { id: 'JER002', name: 'Dan Jerusalem', category: 5, basePrice: 280 },
          { id: 'JER003', name: 'Leonardo Jerusalem', category: 4, basePrice: 150 },
          { id: 'JER004', name: 'Prima Kings', category: 4, basePrice: 130 }
        ]
      }
    }
  }
};

// Tipos de servicios adicionales
const ADDITIONAL_SERVICES = {
  MEALS: {
    BREAKFAST: { name: 'Desayuno', pricePerPerson: 15 },
    LUNCH: { name: 'Almuerzo', pricePerPerson: 25 },
    DINNER: { name: 'Cena', pricePerPerson: 30 },
    FULL_BOARD: { name: 'Pensión Completa', pricePerPerson: 65 },
    HALF_BOARD: { name: 'Media Pensión', pricePerPerson: 40 }
  },
  TRANSPORT: {
    BUS_STANDARD: { name: 'Autobús Estándar', pricePerDay: 500, capacity: 50 },
    BUS_LUXURY: { name: 'Autobús de Lujo', pricePerDay: 750, capacity: 45 },
    MINIBUS: { name: 'Minibús', pricePerDay: 350, capacity: 20 },
    VAN: { name: 'Van', pricePerDay: 250, capacity: 12 }
  },
  GUIDES: {
    PROFESSIONAL: { name: 'Guía Profesional', pricePerDay: 350 },
    RELIGIOUS: { name: 'Guía Religioso', pricePerDay: 400 },
    MULTILINGUAL: { name: 'Guía Multilingüe', pricePerDay: 450 }
  },
  ENTRANCES: {
    HOLY_SITES: { name: 'Sitios Santos', pricePerPerson: 45 },
    MUSEUMS: { name: 'Museos', pricePerPerson: 35 },
    ARCHAEOLOGICAL: { name: 'Sitios Arqueológicos', pricePerPerson: 40 }
  }
};

// Estados de cotización
const QUOTATION_STATUS = {
  DRAFT: { label: 'Borrador', color: 'default', icon: <EditIcon /> },
  SENT: { label: 'Enviada', color: 'info', icon: <SendIcon /> },
  WAITING: { label: 'Esperando Respuestas', color: 'warning', icon: <WaitingIcon /> },
  RECEIVED: { label: 'Respuestas Recibidas', color: 'success', icon: <CheckCircleIcon /> },
  COMPARING: { label: 'Comparando', color: 'primary', icon: <CompareIcon /> },
  SELECTED: { label: 'Seleccionada', color: 'success', icon: <ConfirmedIcon /> },
  CONFIRMED: { label: 'Confirmada', color: 'success', icon: <VerifiedIcon /> },
  CANCELLED: { label: 'Cancelada', color: 'error', icon: <CancelIcon /> }
};

const GroupQuotationSystem = () => {
  // Estado principal
  const [activeTab, setActiveTab] = useState(0);
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [hotelResponses, setHotelResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Estado del formulario de nueva cotización
  const [newQuotation, setNewQuotation] = useState({
    id: null,
    clientInfo: {
      agencyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      country: '',
      type: 'AGENCY' // AGENCY, TOUR_OPERATOR, CORPORATE, RELIGIOUS_GROUP
    },
    groupInfo: {
      groupName: '',
      totalPax: 30,
      freeSpots: 1, // Gratuidades
      singleRooms: 2,
      doubleRooms: 13,
      tripleRooms: 0,
      childrenUnder12: 0,
      specialNeeds: {
        wheelchair: 0,
        dietary: [],
        other: ''
      }
    },
    itinerary: {
      arrivalDate: '',
      departureDate: '',
      totalNights: 9,
      zones: [
        { zone: 'NAZARETH', nights: 3, hotels: [], mealPlan: 'HALF_BOARD' },
        { zone: 'DEAD_SEA', nights: 1, hotels: [], mealPlan: 'HALF_BOARD' },
        { zone: 'BETHLEHEM', nights: 5, hotels: [], mealPlan: 'HALF_BOARD' }
      ]
    },
    services: {
      transport: {
        type: 'BUS_LUXURY',
        includeAirportTransfer: true,
        dailyTransport: true
      },
      guide: {
        type: 'RELIGIOUS',
        languages: ['Spanish', 'English'],
        fullTime: true
      },
      entrances: {
        included: ['HOLY_SITES'],
        optional: ['MUSEUMS']
      },
      extras: {
        tips: false,
        insurance: false,
        waterDaily: true,
        wifi: false
      }
    },
    preferences: {
      hotelCategory: 4, // 3, 4, 5 estrellas
      maxBudgetPerPerson: 1500,
      paymentTerms: 'NET30',
      specialRequests: '',
      competitiveBidding: true, // Activar competencia entre hoteles
      autoSelectBest: false, // Selección automática del mejor precio
      deadlineHours: 48 // Plazo para responder
    },
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    sentAt: null,
    responses: [],
    selectedCombination: null,
    totalPrice: 0,
    commission: 0.10 // 10% comisión Spirit Tours
  });
  
  // Estado de diálogos
  const [openNewQuotation, setOpenNewQuotation] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [openResponseDialog, setOpenResponseDialog] = useState(false);
  const [openComparisonDialog, setOpenComparisonDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [selectedHotelResponse, setSelectedHotelResponse] = useState(null);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Timer para countdown de respuestas
  const [timeRemaining, setTimeRemaining] = useState({});
  
  useEffect(() => {
    // Simular carga de cotizaciones existentes
    loadQuotations();
    
    // Actualizar timers cada minuto
    const timer = setInterval(() => {
      updateTimers();
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Calcular precio total de la cotización
  const calculateQuotationPrice = () => {
    const { groupInfo, itinerary, services, preferences } = newQuotation;
    const totalPax = groupInfo.totalPax - groupInfo.freeSpots;
    let basePrice = 0;
    let servicesPrice = 0;
    
    // Calcular alojamiento (estimado)
    itinerary.zones.forEach(zone => {
      const avgHotelPrice = preferences.hotelCategory === 5 ? 150 :
                          preferences.hotelCategory === 4 ? 90 : 60;
      basePrice += avgHotelPrice * zone.nights * (groupInfo.doubleRooms + groupInfo.singleRooms);
    });
    
    // Calcular transporte
    const transportDays = itinerary.totalNights + 1;
    const transport = ADDITIONAL_SERVICES.TRANSPORT[services.transport.type];
    servicesPrice += transport.pricePerDay * transportDays;
    
    // Calcular guía
    const guide = ADDITIONAL_SERVICES.GUIDES[services.guide.type];
    servicesPrice += guide.pricePerDay * transportDays;
    
    // Calcular entradas
    services.entrances.included.forEach(entrance => {
      const entrancePrice = ADDITIONAL_SERVICES.ENTRANCES[entrance];
      servicesPrice += entrancePrice.pricePerPerson * totalPax;
    });
    
    // Calcular comidas
    itinerary.zones.forEach(zone => {
      const mealPlan = ADDITIONAL_SERVICES.MEALS[zone.mealPlan];
      servicesPrice += mealPlan.pricePerPerson * totalPax * zone.nights;
    });
    
    const subtotal = basePrice + servicesPrice;
    const commission = subtotal * newQuotation.commission;
    const total = subtotal + commission;
    
    return {
      basePrice,
      servicesPrice,
      subtotal,
      commission,
      total,
      pricePerPerson: total / totalPax
    };
  };
  
  // Generar ID único para cotización
  const generateQuotationId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GRP-${year}${month}-${random}`;
  };
  
  // Cargar cotizaciones existentes
  const loadQuotations = async () => {
    setLoading(true);
    try {
      // Simular carga desde API
      const mockQuotations = [
        {
          id: 'GRP-202410-0001',
          clientInfo: {
            agencyName: 'Holy Land Tours Agency',
            contactPerson: 'John Smith',
            email: 'john@holylandtours.com',
            phone: '+1234567890'
          },
          groupInfo: {
            groupName: 'Pilgrimage November 2025',
            totalPax: 45,
            freeSpots: 2
          },
          status: 'WAITING',
          createdAt: '2024-10-10T10:00:00Z',
          sentAt: '2024-10-10T10:30:00Z',
          responses: 12,
          totalPrice: 67500,
          pricePerPerson: 1500
        },
        {
          id: 'GRP-202410-0002',
          clientInfo: {
            agencyName: 'Catholic Journeys',
            contactPerson: 'Maria Garcia',
            email: 'maria@catholicjourneys.com'
          },
          groupInfo: {
            groupName: 'Easter Holy Land 2025',
            totalPax: 30
          },
          status: 'RECEIVED',
          responses: 24,
          totalPrice: 45000,
          pricePerPerson: 1500
        }
      ];
      
      setQuotations(mockQuotations);
    } catch (error) {
      console.error('Error loading quotations:', error);
      showSnackbar('Error al cargar cotizaciones', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Enviar cotización a hoteles
  const sendQuotationToHotels = async () => {
    setLoading(true);
    try {
      const quotationId = generateQuotationId();
      const quotationWithId = { ...newQuotation, id: quotationId };
      
      // Preparar emails para cada hotel en cada zona
      const emailBatches = [];
      
      quotationWithId.itinerary.zones.forEach(zone => {
        const zoneData = DESTINATIONS.HOLY_LAND.zones[zone.zone];
        const hotels = zoneData.hotels;
        
        hotels.forEach(hotel => {
          const emailData = {
            hotelId: hotel.id,
            hotelName: hotel.name,
            quotationId: quotationId,
            zone: zoneData.name,
            checkIn: calculateCheckInDate(zone),
            checkOut: calculateCheckOutDate(zone),
            nights: zone.nights,
            rooms: {
              single: newQuotation.groupInfo.singleRooms,
              double: newQuotation.groupInfo.doubleRooms,
              triple: newQuotation.groupInfo.tripleRooms
            },
            mealPlan: zone.mealPlan,
            totalPax: newQuotation.groupInfo.totalPax,
            specialRequests: newQuotation.preferences.specialRequests,
            deadline: new Date(Date.now() + newQuotation.preferences.deadlineHours * 3600000),
            responseUrl: `https://providers.spirittours.com/quote/${quotationId}/${hotel.id}`,
            competitiveBidding: newQuotation.preferences.competitiveBidding
          };
          
          emailBatches.push(emailData);
        });
      });
      
      // Simular envío de emails
      console.log('Enviando cotización a hoteles:', emailBatches);
      
      // Actualizar estado
      quotationWithId.status = 'SENT';
      quotationWithId.sentAt = new Date().toISOString();
      
      setQuotations([quotationWithId, ...quotations]);
      setOpenSendDialog(false);
      setOpenNewQuotation(false);
      resetQuotationForm();
      
      showSnackbar(`Cotización ${quotationId} enviada a ${emailBatches.length} hoteles`, 'success');
      
      // Simular recepción de respuestas después de un delay
      setTimeout(() => {
        simulateHotelResponses(quotationId);
      }, 5000);
      
    } catch (error) {
      console.error('Error sending quotation:', error);
      showSnackbar('Error al enviar cotización', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Simular respuestas de hoteles
  const simulateHotelResponses = (quotationId) => {
    const responses = [];
    const quotation = quotations.find(q => q.id === quotationId) || newQuotation;
    
    quotation.itinerary.zones.forEach(zone => {
      const zoneData = DESTINATIONS.HOLY_LAND.zones[zone.zone];
      const hotels = zoneData.hotels;
      
      // Simular que 70-90% de hoteles responden
      const respondingHotels = hotels.filter(() => Math.random() > 0.2);
      
      respondingHotels.forEach(hotel => {
        // Variar precios basado en demanda simulada
        const demandFactor = 0.8 + Math.random() * 0.4; // 80% - 120%
        const seasonFactor = 1.0; // Podría variar por temporada
        const competitionDiscount = quotation.preferences.competitiveBidding ? 0.9 : 1.0;
        
        const basePrice = hotel.basePrice * demandFactor * seasonFactor * competitionDiscount;
        
        const response = {
          id: `RESP-${hotel.id}-${Date.now()}`,
          quotationId: quotationId,
          hotelId: hotel.id,
          hotelName: hotel.name,
          zone: zone.zone,
          category: hotel.category,
          pricing: {
            singleRoom: basePrice * 1.5,
            doubleRoom: basePrice,
            tripleRoom: basePrice * 1.3,
            childDiscount: 0.3, // 30% descuento niños
            mealPlans: {
              BREAKFAST: 15,
              HALF_BOARD: 40,
              FULL_BOARD: 65
            }
          },
          totalPrice: calculateHotelTotalPrice(basePrice, quotation.groupInfo, zone.nights),
          availability: true,
          validUntil: new Date(Date.now() + 7 * 24 * 3600000), // Válido por 7 días
          specialOffers: Math.random() > 0.7 ? generateSpecialOffer() : null,
          amenities: generateAmenities(hotel.category),
          responseTime: new Date().toISOString(),
          notes: generateHotelNotes(),
          competitiveAdvantage: generateCompetitiveAdvantage()
        };
        
        responses.push(response);
      });
    });
    
    // Actualizar estado con respuestas
    setHotelResponses(prevResponses => [...prevResponses, ...responses]);
    
    // Actualizar cotización
    setQuotations(prevQuotations => 
      prevQuotations.map(q => 
        q.id === quotationId 
          ? { ...q, status: 'RECEIVED', responses: responses.length }
          : q
      )
    );
    
    showSnackbar(`Recibidas ${responses.length} respuestas de hoteles`, 'info');
  };
  
  // Calcular precio total del hotel
  const calculateHotelTotalPrice = (basePrice, groupInfo, nights) => {
    const singlePrice = basePrice * 1.5 * groupInfo.singleRooms * nights;
    const doublePrice = basePrice * groupInfo.doubleRooms * 2 * nights;
    const triplePrice = basePrice * 1.3 * groupInfo.tripleRooms * 3 * nights;
    
    return singlePrice + doublePrice + triplePrice;
  };
  
  // Generar oferta especial
  const generateSpecialOffer = () => {
    const offers = [
      { type: 'EARLY_BOOKING', discount: 10, description: 'Descuento por reserva anticipada' },
      { type: 'FREE_UPGRADE', value: 'Room upgrade', description: 'Upgrade de habitación gratis' },
      { type: 'FREE_SPA', value: 'Spa access', description: 'Acceso gratuito al spa' },
      { type: 'COMPLIMENTARY_DINNER', value: 1, description: 'Una cena de cortesía' }
    ];
    
    return offers[Math.floor(Math.random() * offers.length)];
  };
  
  // Generar amenidades del hotel
  const generateAmenities = (category) => {
    const baseAmenities = ['wifi', 'parking', 'breakfast'];
    const midAmenities = ['pool', 'gym', 'restaurant', 'bar'];
    const luxuryAmenities = ['spa', 'concierge', 'room-service', 'business-center'];
    
    if (category >= 5) return [...baseAmenities, ...midAmenities, ...luxuryAmenities];
    if (category >= 4) return [...baseAmenities, ...midAmenities];
    return baseAmenities;
  };
  
  // Generar notas del hotel
  const generateHotelNotes = () => {
    const notes = [
      'Ubicación céntrica cerca de sitios santos',
      'Renovado recientemente con habitaciones modernas',
      'Experiencia en grupos de peregrinación',
      'Menú especial para dietas religiosas',
      'Capilla disponible para servicios religiosos',
      'Personal multilingüe 24/7'
    ];
    
    return notes[Math.floor(Math.random() * notes.length)];
  };
  
  // Generar ventaja competitiva
  const generateCompetitiveAdvantage = () => {
    const advantages = [
      { factor: 'PRICE', value: 'Mejor precio garantizado' },
      { factor: 'LOCATION', value: 'Más cerca de los sitios santos' },
      { factor: 'EXPERIENCE', value: '20 años atendiendo grupos religiosos' },
      { factor: 'FACILITIES', value: 'Instalaciones renovadas 2024' },
      { factor: 'SERVICE', value: 'Servicio 5 estrellas al precio de 4' }
    ];
    
    return advantages[Math.floor(Math.random() * advantages.length)];
  };
  
  // Comparar y analizar respuestas
  const analyzeResponses = (quotationId) => {
    const responses = hotelResponses.filter(r => r.quotationId === quotationId);
    
    // Agrupar por zona
    const responsesByZone = {};
    responses.forEach(response => {
      if (!responsesByZone[response.zone]) {
        responsesByZone[response.zone] = [];
      }
      responsesByZone[response.zone].push(response);
    });
    
    // Ordenar por precio en cada zona
    Object.keys(responsesByZone).forEach(zone => {
      responsesByZone[zone].sort((a, b) => a.totalPrice - b.totalPrice);
    });
    
    // Generar combinaciones posibles
    const combinations = generateCombinations(responsesByZone);
    
    // Ordenar combinaciones por precio total
    combinations.sort((a, b) => a.totalPrice - b.totalPrice);
    
    return {
      responsesByZone,
      combinations,
      bestPrice: combinations[0],
      bestValue: findBestValue(combinations),
      mostPopular: findMostPopular(combinations)
    };
  };
  
  // Generar todas las combinaciones posibles de hoteles
  const generateCombinations = (responsesByZone) => {
    const zones = Object.keys(responsesByZone);
    const combinations = [];
    
    // Función recursiva para generar combinaciones
    const generateCombination = (index, currentCombination) => {
      if (index === zones.length) {
        const totalPrice = currentCombination.reduce((sum, hotel) => sum + hotel.totalPrice, 0);
        const avgCategory = currentCombination.reduce((sum, hotel) => sum + hotel.category, 0) / currentCombination.length;
        
        combinations.push({
          hotels: currentCombination,
          totalPrice,
          avgCategory,
          hasSpecialOffers: currentCombination.some(h => h.specialOffers),
          id: currentCombination.map(h => h.hotelId).join('-')
        });
        return;
      }
      
      const zone = zones[index];
      responsesByZone[zone].forEach(hotel => {
        generateCombination(index + 1, [...currentCombination, hotel]);
      });
    };
    
    generateCombination(0, []);
    
    // Limitar a top 10 combinaciones si hay muchas
    return combinations.slice(0, 10);
  };
  
  // Encontrar mejor relación calidad-precio
  const findBestValue = (combinations) => {
    return combinations.reduce((best, current) => {
      const currentValue = current.avgCategory / current.totalPrice;
      const bestValue = best.avgCategory / best.totalPrice;
      return currentValue > bestValue ? current : best;
    });
  };
  
  // Encontrar combinación más popular (basado en categoría)
  const findMostPopular = (combinations) => {
    return combinations.reduce((best, current) => {
      return current.avgCategory > best.avgCategory ? current : best;
    });
  };
  
  // Calcular fechas de check-in y check-out
  const calculateCheckInDate = (zone) => {
    // Lógica para calcular fecha de entrada basada en el itinerario
    return new Date().toISOString().split('T')[0];
  };
  
  const calculateCheckOutDate = (zone) => {
    // Lógica para calcular fecha de salida basada en el itinerario
    return new Date().toISOString().split('T')[0];
  };
  
  // Actualizar timers de respuestas pendientes
  const updateTimers = () => {
    const timers = {};
    quotations.forEach(quotation => {
      if (quotation.status === 'SENT' || quotation.status === 'WAITING') {
        const deadline = new Date(quotation.sentAt);
        deadline.setHours(deadline.getHours() + (quotation.preferences?.deadlineHours || 48));
        
        const now = new Date();
        const diff = deadline - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / 3600000);
          const minutes = Math.floor((diff % 3600000) / 60000);
          timers[quotation.id] = `${hours}h ${minutes}m`;
        } else {
          timers[quotation.id] = 'Expirado';
        }
      }
    });
    setTimeRemaining(timers);
  };
  
  // Reset formulario
  const resetQuotationForm = () => {
    setNewQuotation({
      id: null,
      clientInfo: {
        agencyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        country: '',
        type: 'AGENCY'
      },
      groupInfo: {
        groupName: '',
        totalPax: 30,
        freeSpots: 1,
        singleRooms: 2,
        doubleRooms: 13,
        tripleRooms: 0,
        childrenUnder12: 0,
        specialNeeds: {
          wheelchair: 0,
          dietary: [],
          other: ''
        }
      },
      itinerary: {
        arrivalDate: '',
        departureDate: '',
        totalNights: 9,
        zones: [
          { zone: 'NAZARETH', nights: 3, hotels: [], mealPlan: 'HALF_BOARD' },
          { zone: 'DEAD_SEA', nights: 1, hotels: [], mealPlan: 'HALF_BOARD' },
          { zone: 'BETHLEHEM', nights: 5, hotels: [], mealPlan: 'HALF_BOARD' }
        ]
      },
      services: {
        transport: {
          type: 'BUS_LUXURY',
          includeAirportTransfer: true,
          dailyTransport: true
        },
        guide: {
          type: 'RELIGIOUS',
          languages: ['Spanish', 'English'],
          fullTime: true
        },
        entrances: {
          included: ['HOLY_SITES'],
          optional: ['MUSEUMS']
        },
        extras: {
          tips: false,
          insurance: false,
          waterDaily: true,
          wifi: false
        }
      },
      preferences: {
        hotelCategory: 4,
        maxBudgetPerPerson: 1500,
        paymentTerms: 'NET30',
        specialRequests: '',
        competitiveBidding: true,
        autoSelectBest: false,
        deadlineHours: 48
      },
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      sentAt: null,
      responses: [],
      selectedCombination: null,
      totalPrice: 0,
      commission: 0.10
    });
    setCurrentStep(0);
  };
  
  // Mostrar snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Confirmar selección de hoteles
  const confirmHotelSelection = async (combination) => {
    try {
      // Enviar confirmación a hoteles seleccionados
      const confirmations = combination.hotels.map(hotel => ({
        hotelId: hotel.hotelId,
        quotationId: selectedQuotation.id,
        confirmationNumber: `CNF-${Date.now()}-${hotel.hotelId}`,
        status: 'CONFIRMED'
      }));
      
      console.log('Enviando confirmaciones:', confirmations);
      
      // Actualizar estado de cotización
      setQuotations(prevQuotations =>
        prevQuotations.map(q =>
          q.id === selectedQuotation.id
            ? { ...q, status: 'CONFIRMED', selectedCombination: combination }
            : q
        )
      );
      
      showSnackbar('Reserva confirmada con los hoteles seleccionados', 'success');
      setOpenConfirmDialog(false);
      setOpenComparisonDialog(false);
    } catch (error) {
      console.error('Error confirming selection:', error);
      showSnackbar('Error al confirmar la selección', 'error');
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Sistema de Cotización de Grupos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión inteligente de cotizaciones con competencia entre proveedores
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenNewQuotation(true)}
                size="large"
              >
                Nueva Cotización
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadQuotations}
              >
                Actualizar
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Cotizaciones Activas
                  </Typography>
                  <Typography variant="h4">
                    {quotations.filter(q => q.status === 'WAITING' || q.status === 'SENT').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <QuoteIcon />
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
                  <Typography color="text.secondary" gutterBottom>
                    Respuestas Pendientes
                  </Typography>
                  <Typography variant="h4">
                    {quotations.reduce((sum, q) => 
                      q.status === 'WAITING' ? sum + (24 - (q.responses || 0)) : sum, 0
                    )}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <WaitingIcon />
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
                  <Typography color="text.secondary" gutterBottom>
                    Tasa de Respuesta
                  </Typography>
                  <Typography variant="h4">
                    78%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendingUpIcon />
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
                  <Typography color="text.secondary" gutterBottom>
                    Ahorro Promedio
                  </Typography>
                  <Typography variant="h4">
                    15%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tabs principales */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Cotizaciones Activas" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="Respuestas de Hoteles" icon={<HotelIcon />} iconPosition="start" />
          <Tab label="Comparación de Precios" icon={<CompareIcon />} iconPosition="start" />
          <Tab label="Historial" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Analytics" icon={<AnalyticsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
      {/* Contenido de tabs */}
      {activeTab === 0 && (
        <Box>
          {/* Lista de cotizaciones */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID Cotización</TableCell>
                  <TableCell>Cliente/Agencia</TableCell>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Fechas</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Respuestas</TableCell>
                  <TableCell align="center">Tiempo Restante</TableCell>
                  <TableCell align="right">Precio Total</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : quotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No hay cotizaciones activas
                    </TableCell>
                  </TableRow>
                ) : (
                  quotations.map((quotation) => (
                    <TableRow key={quotation.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {quotation.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {quotation.clientInfo.agencyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {quotation.clientInfo.contactPerson}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {quotation.groupInfo.groupName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {quotation.groupInfo.totalPax} pax
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          Check-in: {quotation.itinerary?.arrivalDate || 'TBD'}<br />
                          Check-out: {quotation.itinerary?.departureDate || 'TBD'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={QUOTATION_STATUS[quotation.status]?.label}
                          color={QUOTATION_STATUS[quotation.status]?.color}
                          size="small"
                          icon={QUOTATION_STATUS[quotation.status]?.icon}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Badge badgeContent={quotation.responses} color="primary">
                          <EmailIcon />
                        </Badge>
                      </TableCell>
                      <TableCell align="center">
                        {timeRemaining[quotation.id] && (
                          <Chip
                            label={timeRemaining[quotation.id]}
                            size="small"
                            color={timeRemaining[quotation.id] === 'Expirado' ? 'error' : 'warning'}
                            icon={<TimerIcon />}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {quotation.totalPrice && (
                          <>
                            <Typography variant="body2" fontWeight="bold">
                              ${quotation.totalPrice.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${quotation.pricePerPerson}/pax
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1}>
                          {quotation.status === 'RECEIVED' && (
                            <Tooltip title="Comparar Respuestas">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setSelectedQuotation(quotation);
                                  setOpenComparisonDialog(true);
                                }}
                              >
                                <CompareIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Ver Detalles">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedQuotation(quotation);
                                setOpenResponseDialog(true);
                              }}
                            >
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Descargar">
                            <IconButton size="small">
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box>
          {/* Respuestas de hoteles */}
          <Grid container spacing={3}>
            {hotelResponses.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No hay respuestas de hoteles aún
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              hotelResponses.map((response) => (
                <Grid item xs={12} md={6} lg={4} key={response.id}>
                  <Card>
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <HotelIcon />
                        </Avatar>
                      }
                      title={response.hotelName}
                      subheader={`Zona: ${response.zone}`}
                      action={
                        <Rating value={response.category} readOnly />
                      }
                    />
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h5" color="primary">
                          ${response.totalPrice.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Precio total para el grupo
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Habitación Sencilla
                          </Typography>
                          <Typography variant="body2">
                            ${response.pricing.singleRoom}/noche
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Habitación Doble
                          </Typography>
                          <Typography variant="body2">
                            ${response.pricing.doubleRoom}/noche
                          </Typography>
                        </Grid>
                      </Grid>
                      
                      {response.specialOffers && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                          <AlertTitle>Oferta Especial</AlertTitle>
                          {response.specialOffers.description}
                        </Alert>
                      )}
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Ventaja Competitiva:
                        </Typography>
                        <Typography variant="body2">
                          {response.competitiveAdvantage?.value}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Amenidades:
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {response.amenities?.map((amenity, index) => (
                            <Chip
                              key={index}
                              label={amenity}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => setSelectedHotelResponse(response)}>
                        Ver Detalles
                      </Button>
                      <Button size="small" color="primary">
                        Seleccionar
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      )}
      
      {/* Diálogo de nueva cotización */}
      <Dialog
        open={openNewQuotation}
        onClose={() => setOpenNewQuotation(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5">
            Nueva Cotización de Grupo
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={currentStep} orientation="vertical">
              {/* Step 1: Información del Cliente */}
              <Step>
                <StepLabel>Información del Cliente</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nombre de la Agencia"
                        value={newQuotation.clientInfo.agencyName}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          clientInfo: { ...newQuotation.clientInfo, agencyName: e.target.value }
                        })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Persona de Contacto"
                        value={newQuotation.clientInfo.contactPerson}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          clientInfo: { ...newQuotation.clientInfo, contactPerson: e.target.value }
                        })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={newQuotation.clientInfo.email}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          clientInfo: { ...newQuotation.clientInfo, email: e.target.value }
                        })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Teléfono"
                        value={newQuotation.clientInfo.phone}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          clientInfo: { ...newQuotation.clientInfo, phone: e.target.value }
                        })}
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={() => setCurrentStep(1)} variant="contained">
                      Siguiente
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              {/* Step 2: Información del Grupo */}
              <Step>
                <StepLabel>Información del Grupo</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nombre del Grupo"
                        value={newQuotation.groupInfo.groupName}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          groupInfo: { ...newQuotation.groupInfo, groupName: e.target.value }
                        })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Total Pasajeros"
                        type="number"
                        value={newQuotation.groupInfo.totalPax}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          groupInfo: { ...newQuotation.groupInfo, totalPax: parseInt(e.target.value) }
                        })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Gratuidades"
                        type="number"
                        value={newQuotation.groupInfo.freeSpots}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          groupInfo: { ...newQuotation.groupInfo, freeSpots: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Hab. Sencillas"
                        type="number"
                        value={newQuotation.groupInfo.singleRooms}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          groupInfo: { ...newQuotation.groupInfo, singleRooms: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Hab. Dobles"
                        type="number"
                        value={newQuotation.groupInfo.doubleRooms}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          groupInfo: { ...newQuotation.groupInfo, doubleRooms: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Hab. Triples"
                        type="number"
                        value={newQuotation.groupInfo.tripleRooms}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          groupInfo: { ...newQuotation.groupInfo, tripleRooms: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={() => setCurrentStep(0)} sx={{ mr: 1 }}>
                      Anterior
                    </Button>
                    <Button onClick={() => setCurrentStep(2)} variant="contained">
                      Siguiente
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              {/* Step 3: Itinerario */}
              <Step>
                <StepLabel>Itinerario y Alojamiento</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Fecha de Llegada"
                        type="date"
                        value={newQuotation.itinerary.arrivalDate}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          itinerary: { ...newQuotation.itinerary, arrivalDate: e.target.value }
                        })}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Fecha de Salida"
                        type="date"
                        value={newQuotation.itinerary.departureDate}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          itinerary: { ...newQuotation.itinerary, departureDate: e.target.value }
                        })}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                    
                    {/* Zonas del itinerario */}
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>
                        Distribución de Noches por Zona
                      </Typography>
                      {newQuotation.itinerary.zones.map((zone, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={3}>
                              <Typography variant="body1">
                                {DESTINATIONS.HOLY_LAND.zones[zone.zone].name}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={2}>
                              <TextField
                                fullWidth
                                label="Noches"
                                type="number"
                                value={zone.nights}
                                onChange={(e) => {
                                  const updatedZones = [...newQuotation.itinerary.zones];
                                  updatedZones[index].nights = parseInt(e.target.value);
                                  setNewQuotation({
                                    ...newQuotation,
                                    itinerary: { ...newQuotation.itinerary, zones: updatedZones }
                                  });
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <FormControl fullWidth>
                                <InputLabel>Plan de Comidas</InputLabel>
                                <Select
                                  value={zone.mealPlan}
                                  onChange={(e) => {
                                    const updatedZones = [...newQuotation.itinerary.zones];
                                    updatedZones[index].mealPlan = e.target.value;
                                    setNewQuotation({
                                      ...newQuotation,
                                      itinerary: { ...newQuotation.itinerary, zones: updatedZones }
                                    });
                                  }}
                                  label="Plan de Comidas"
                                >
                                  <MenuItem value="BREAKFAST">Solo Desayuno</MenuItem>
                                  <MenuItem value="HALF_BOARD">Media Pensión</MenuItem>
                                  <MenuItem value="FULL_BOARD">Pensión Completa</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="caption" color="text.secondary">
                                {DESTINATIONS.HOLY_LAND.zones[zone.zone].hotels.length} hoteles disponibles
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={() => setCurrentStep(1)} sx={{ mr: 1 }}>
                      Anterior
                    </Button>
                    <Button onClick={() => setCurrentStep(3)} variant="contained">
                      Siguiente
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              {/* Step 4: Servicios Adicionales */}
              <Step>
                <StepLabel>Servicios Adicionales</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Transporte</InputLabel>
                        <Select
                          value={newQuotation.services.transport.type}
                          onChange={(e) => setNewQuotation({
                            ...newQuotation,
                            services: {
                              ...newQuotation.services,
                              transport: { ...newQuotation.services.transport, type: e.target.value }
                            }
                          })}
                          label="Tipo de Transporte"
                        >
                          <MenuItem value="BUS_STANDARD">Autobús Estándar (50 pax)</MenuItem>
                          <MenuItem value="BUS_LUXURY">Autobús de Lujo (45 pax)</MenuItem>
                          <MenuItem value="MINIBUS">Minibús (20 pax)</MenuItem>
                          <MenuItem value="VAN">Van (12 pax)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Tipo de Guía</InputLabel>
                        <Select
                          value={newQuotation.services.guide.type}
                          onChange={(e) => setNewQuotation({
                            ...newQuotation,
                            services: {
                              ...newQuotation.services,
                              guide: { ...newQuotation.services.guide, type: e.target.value }
                            }
                          })}
                          label="Tipo de Guía"
                        >
                          <MenuItem value="PROFESSIONAL">Guía Profesional</MenuItem>
                          <MenuItem value="RELIGIOUS">Guía Religioso</MenuItem>
                          <MenuItem value="MULTILINGUAL">Guía Multilingüe</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={() => setCurrentStep(2)} sx={{ mr: 1 }}>
                      Anterior
                    </Button>
                    <Button onClick={() => setCurrentStep(4)} variant="contained">
                      Siguiente
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              {/* Step 5: Preferencias y Competencia */}
              <Step>
                <StepLabel>Preferencias de Competencia</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Alert severity="info">
                        <AlertTitle>Sistema de Competencia</AlertTitle>
                        Al activar la competencia, los hoteles sabrán que están compitiendo con otros proveedores 
                        y ofrecerán sus mejores precios.
                      </Alert>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newQuotation.preferences.competitiveBidding}
                            onChange={(e) => setNewQuotation({
                              ...newQuotation,
                              preferences: { ...newQuotation.preferences, competitiveBidding: e.target.checked }
                            })}
                          />
                        }
                        label="Activar Competencia entre Hoteles"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Plazo para Responder (horas)"
                        type="number"
                        value={newQuotation.preferences.deadlineHours}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          preferences: { ...newQuotation.preferences, deadlineHours: parseInt(e.target.value) }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Presupuesto Máximo por Persona"
                        type="number"
                        value={newQuotation.preferences.maxBudgetPerPerson}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          preferences: { ...newQuotation.preferences, maxBudgetPerPerson: parseFloat(e.target.value) }
                        })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Categoría de Hotel Preferida</InputLabel>
                        <Select
                          value={newQuotation.preferences.hotelCategory}
                          onChange={(e) => setNewQuotation({
                            ...newQuotation,
                            preferences: { ...newQuotation.preferences, hotelCategory: e.target.value }
                          })}
                          label="Categoría de Hotel Preferida"
                        >
                          <MenuItem value={3}>3 Estrellas</MenuItem>
                          <MenuItem value={4}>4 Estrellas</MenuItem>
                          <MenuItem value={5}>5 Estrellas</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Solicitudes Especiales"
                        multiline
                        rows={3}
                        value={newQuotation.preferences.specialRequests}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          preferences: { ...newQuotation.preferences, specialRequests: e.target.value }
                        })}
                        placeholder="Ej: Habitaciones conectadas, menú kosher, acceso para sillas de ruedas..."
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button onClick={() => setCurrentStep(3)} sx={{ mr: 1 }}>
                      Anterior
                    </Button>
                    <Button 
                      onClick={() => setOpenSendDialog(true)} 
                      variant="contained"
                      color="primary"
                      startIcon={<SendIcon />}
                    >
                      Revisar y Enviar
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewQuotation(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmación de envío */}
      <Dialog
        open={openSendDialog}
        onClose={() => setOpenSendDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Confirmar Envío de Cotización</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Importante</AlertTitle>
            La cotización será enviada a todos los hoteles en las zonas seleccionadas. 
            {newQuotation.preferences.competitiveBidding && 
              " Los hoteles serán informados de que están compitiendo por el mejor precio."
            }
          </Alert>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>Resumen de la Cotización</Typography>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Cliente</Typography>
                  <Typography variant="body1">{newQuotation.clientInfo.agencyName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Grupo</Typography>
                  <Typography variant="body1">{newQuotation.groupInfo.groupName}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Total Pasajeros</Typography>
                  <Typography variant="body1">{newQuotation.groupInfo.totalPax}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Fechas</Typography>
                  <Typography variant="body1">
                    {newQuotation.itinerary.arrivalDate} - {newQuotation.itinerary.departureDate}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>Hoteles a Contactar</Typography>
            {newQuotation.itinerary.zones.map((zone, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {DESTINATIONS.HOLY_LAND.zones[zone.zone].name} - {zone.nights} noches
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {DESTINATIONS.HOLY_LAND.zones[zone.zone].hotels.map(hotel => (
                      <ListItem key={hotel.id}>
                        <ListItemIcon>
                          <HotelIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={hotel.name}
                          secondary={`${hotel.category} estrellas - Precio base: $${hotel.basePrice}/noche`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
          
          <Box>
            <Typography variant="h6" gutterBottom>Estimación de Costos</Typography>
            <Paper sx={{ p: 2 }}>
              {(() => {
                const pricing = calculateQuotationPrice();
                return (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Alojamiento (estimado)</Typography>
                      <Typography variant="body1">${pricing.basePrice.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Servicios</Typography>
                      <Typography variant="body1">${pricing.servicesPrice.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Comisión Spirit Tours (10%)</Typography>
                      <Typography variant="body1">${pricing.commission.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Total Estimado</Typography>
                      <Typography variant="h5" color="primary">
                        ${pricing.total.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${pricing.pricePerPerson.toFixed(2)} por persona
                      </Typography>
                    </Grid>
                  </Grid>
                );
              })()}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)}>Cancelar</Button>
          <Button 
            onClick={sendQuotationToHotels} 
            variant="contained" 
            color="primary"
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            disabled={loading}
          >
            Enviar Cotización
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de comparación de precios */}
      <Dialog
        open={openComparisonDialog}
        onClose={() => setOpenComparisonDialog(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5">
            Comparación de Ofertas - {selectedQuotation?.id}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedQuotation && (() => {
            const analysis = analyzeResponses(selectedQuotation.id);
            
            return (
              <Box>
                {/* Mejores opciones */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <WinnerIcon /> Mejor Precio
                        </Typography>
                        <Typography variant="h4">
                          ${analysis.bestPrice?.totalPrice.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Ahorro: ${((analysis.combinations[analysis.combinations.length - 1]?.totalPrice || 0) - analysis.bestPrice?.totalPrice).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'primary.light' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <StarIcon /> Mejor Calidad-Precio
                        </Typography>
                        <Typography variant="h4">
                          ${analysis.bestValue?.totalPrice.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Categoría promedio: {analysis.bestValue?.avgCategory.toFixed(1)} ⭐
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'secondary.light' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <PremiumIcon /> Más Popular
                        </Typography>
                        <Typography variant="h4">
                          ${analysis.mostPopular?.totalPrice.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Categoría promedio: {analysis.mostPopular?.avgCategory.toFixed(1)} ⭐
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {/* Tabla de combinaciones */}
                <Typography variant="h6" gutterBottom>
                  Top 10 Combinaciones de Hoteles
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ranking</TableCell>
                        <TableCell>Combinación de Hoteles</TableCell>
                        <TableCell align="center">Categoría Promedio</TableCell>
                        <TableCell align="center">Ofertas Especiales</TableCell>
                        <TableCell align="right">Precio Total</TableCell>
                        <TableCell align="right">Por Persona</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.combinations.map((combination, index) => (
                        <TableRow key={combination.id} hover>
                          <TableCell>
                            {index === 0 && <Chip label="Mejor Precio" color="success" size="small" />}
                            {index === 1 && <Chip label="2do Mejor" color="primary" size="small" />}
                            {index === 2 && <Chip label="3er Mejor" color="default" size="small" />}
                            {index > 2 && `#${index + 1}`}
                          </TableCell>
                          <TableCell>
                            {combination.hotels.map(h => h.hotelName).join(' → ')}
                          </TableCell>
                          <TableCell align="center">
                            <Rating value={combination.avgCategory} readOnly size="small" />
                          </TableCell>
                          <TableCell align="center">
                            {combination.hasSpecialOffers && (
                              <Chip label="Ofertas" color="success" size="small" icon={<OfferIcon />} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight="bold">
                              ${combination.totalPrice.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            ${(combination.totalPrice / (selectedQuotation.groupInfo.totalPax - selectedQuotation.groupInfo.freeSpots)).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => {
                                setSelectedQuotation({ ...selectedQuotation, selectedCombination: combination });
                                setOpenConfirmDialog(true);
                              }}
                            >
                              Seleccionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComparisonDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmación de selección */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Selección de Hoteles</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Confirmación de Reserva</AlertTitle>
            Al confirmar, se enviará la reserva a los hoteles seleccionados y se bloqueará el espacio.
          </Alert>
          
          {selectedQuotation?.selectedCombination && (
            <Box>
              <Typography variant="h6" gutterBottom>Hoteles Seleccionados:</Typography>
              <List>
                {selectedQuotation.selectedCombination.hotels.map((hotel, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <HotelIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={hotel.hotelName}
                      secondary={`Zona: ${hotel.zone} - Precio: $${hotel.totalPrice.toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Total: ${selectedQuotation.selectedCombination.totalPrice.toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancelar</Button>
          <Button 
            onClick={() => confirmHotelSelection(selectedQuotation?.selectedCombination)}
            variant="contained"
            color="primary"
            startIcon={<CheckCircleIcon />}
          >
            Confirmar Reserva
          </Button>
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
      
      {/* Speed Dial para acciones rápidas */}
      <SpeedDial
        ariaLabel="Acciones Rápidas"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedIcon />}
      >
        <SpeedDialAction
          icon={<AddIcon />}
          tooltipTitle="Nueva Cotización"
          onClick={() => setOpenNewQuotation(true)}
        />
        <SpeedDialAction
          icon={<RefreshIcon />}
          tooltipTitle="Actualizar"
          onClick={loadQuotations}
        />
        <SpeedDialAction
          icon={<AnalyticsIcon />}
          tooltipTitle="Ver Analytics"
          onClick={() => setActiveTab(4)}
        />
        <SpeedDialAction
          icon={<HelpIcon />}
          tooltipTitle="Ayuda"
        />
      </SpeedDial>
    </Box>
  );
};

export default GroupQuotationSystem;