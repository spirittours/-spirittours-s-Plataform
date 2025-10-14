import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RadioGroup,
  Fab,
  Drawer,
  ListSubheader,
  Menu,
  Slider,
  Box as MuiBox,
  styled
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
  SingleBed as SingleBedIcon,
  KingBed as DoubleBedIcon,
  FamilyRestroom as TripleBedIcon,
  ChildCare as ChildIcon,
  Accessible as AccessibleIcon,
  Wifi as WifiIcon,
  Pool as PoolIcon,
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
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  MoreVert as MoreVertIcon,
  MoreHoriz as MoreHorizIcon,
  Update as UpdateIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Extension as ExtensionIcon,
  AllInclusive as AllInclusiveIcon,
  NoMeals as NoMealsIcon,
  SetMeal as SetMealIcon,
  DomainAdd as DomainAddIcon,
  AddBusiness as AddBusinessIcon,
  ManageSearch as ManageSearchIcon,
  FindInPage as FindInPageIcon,
  ContactMail as ContactMailIcon,
  ContactPhone as ContactPhoneIcon,
  Contacts as ContactsIcon,
  Badge as BadgeIcon,
  CreditScore as CreditScoreIcon,
  Payment as PaymentIcon,
  Euro as EuroIcon,
  AttachMoney as DollarIcon,
  CurrencyPound as PoundIcon,
  CurrencyYen as YenIcon,
  CurrencyRupee as RupeeIcon,
  History as HistoryIcon,
  Pending as PendingPaymentIcon,
  CheckCircleOutline as ConfirmedPaymentIcon,
  HighlightOff as CancelledPaymentIcon,
  Loop as ProcessingIcon,
  Autorenew as AutorenewIcon,
  SyncAlt as SyncIcon,
  CloudSync as CloudSyncIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Language as LanguageIcon,
  Public as PublicIcon,
  Map as MapIcon,
  Place as PlaceIcon,
  MyLocation as MyLocationIcon,
  Navigation as NavigationIcon,
  NearMe as NearMeIcon,
  LocationSearching as LocationSearchingIcon,
  PinDrop as PinDropIcon,
  AddLocation as AddLocationIcon,
  EditLocation as EditLocationIcon,
  WrongLocation as WrongLocationIcon,
  SupervisorAccount as SupervisorIcon,
  ManageAccounts as ManageAccountsIcon,
  SwitchAccount as SwitchAccountIcon,
  GroupAdd as GroupAddIcon,
  GroupRemove as GroupRemoveIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  PersonSearch as PersonSearchIcon,
  Engineering as EngineeringIcon,
  Construction as ConstructionIcon,
  Build as BuildIcon,
  Architecture as ArchitectureIcon,
  HomeWork as HomeWorkIcon,
  Foundation as FoundationIcon,
  Gavel as GavelIcon,
  Policy as PolicyIcon,
  Rule as RuleIcon,
  FactCheck as FactCheckIcon,
  TaskAlt as TaskAltIcon,
  Done as DoneIcon,
  DoneAll as DoneAllIcon,
  DoneOutline as DoneOutlineIcon,
  RemoveDone as RemoveDoneIcon
} from '@mui/icons-material';

// Configuración del sistema mejorado
const SYSTEM_CONFIG = {
  quotation: {
    defaultValidityDays: 7,
    maxExtensionDays: 7,
    maxPriceUpdates: 3,
    depositAmount: {
      min: 500,
      max: 1000,
      percentage: 0.20 // 20% del total
    }
  },
  visibility: {
    defaultShowPrices: false, // Por defecto los hoteles NO ven precios de otros
    adminCanOverride: true,
    perHotelOverride: true
  },
  mealPlans: {
    RO: { code: 'RO', name: 'Room Only', description: 'Solo Alojamiento', icon: <NoMealsIcon /> },
    BB: { code: 'BB', name: 'Bed & Breakfast', description: 'Alojamiento con Desayuno', icon: <BreakfastIcon /> },
    HB: { code: 'HB', name: 'Half Board', description: 'Media Pensión (Desayuno y Cena)', icon: <SetMealIcon /> },
    FB: { code: 'FB', name: 'Full Board', description: 'Pensión Completa (Desayuno, Almuerzo y Cena)', icon: <RestaurantIcon /> },
    AI: { code: 'AI', name: 'All Inclusive', description: 'Todo Incluido', icon: <AllInclusiveIcon /> }
  },
  paymentTerms: {
    DEPOSIT: 'Depósito requerido para confirmación',
    NET30: 'Pago a 30 días',
    NET60: 'Pago a 60 días',
    PREPAID: 'Pago anticipado completo',
    INSTALLMENTS: 'Pagos parciales'
  },
  cancellationPolicies: {
    FLEXIBLE: {
      name: 'Flexible',
      description: 'Cancelación gratuita hasta 7 días antes',
      penalty: 0
    },
    MODERATE: {
      name: 'Moderada',
      description: 'Cancelación gratuita hasta 14 días antes',
      penalty: 0.25
    },
    STRICT: {
      name: 'Estricta', 
      description: 'Cancelación con 50% de penalidad',
      penalty: 0.50
    },
    NON_REFUNDABLE: {
      name: 'No Reembolsable',
      description: 'Sin reembolso en caso de cancelación',
      penalty: 1.00
    }
  },
  quotationStatus: {
    DRAFT: { label: 'Borrador', color: 'default', icon: <EditIcon /> },
    SENT: { label: 'Enviada', color: 'info', icon: <SendIcon /> },
    WAITING: { label: 'Esperando', color: 'warning', icon: <WaitingIcon /> },
    RECEIVED: { label: 'Respuestas Recibidas', color: 'primary', icon: <EmailReadIcon /> },
    EXTENDED: { label: 'Extendida', color: 'info', icon: <ExtensionIcon /> },
    NEGOTIATING: { label: 'Negociando', color: 'warning', icon: <CompareIcon /> },
    SELECTED: { label: 'Seleccionado', color: 'success', icon: <CheckCircleIcon /> },
    DEPOSIT_PENDING: { label: 'Esperando Depósito', color: 'warning', icon: <PendingPaymentIcon /> },
    DEPOSIT_RECEIVED: { label: 'Depósito Recibido', color: 'success', icon: <ConfirmedPaymentIcon /> },
    CONFIRMED: { label: 'Confirmado', color: 'success', icon: <VerifiedIcon /> },
    CANCELLED: { label: 'Cancelado', color: 'error', icon: <CancelIcon /> },
    EXPIRED: { label: 'Expirado', color: 'error', icon: <EventBusyIcon /> }
  }
};

// Base de datos de hoteles existentes
const HOTELS_DATABASE = {
  verified: [
    {
      id: 'HTL001',
      name: 'Grand Plaza Hotel',
      location: 'Jerusalem',
      category: 5,
      email: 'reservations@grandplaza.com',
      phone: '+972-2-1234567',
      verified: true,
      priceRange: { min: 150, max: 300 },
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant'],
      commission: 0.15
    },
    {
      id: 'HTL002',
      name: 'Legacy Nazareth',
      location: 'Nazareth',
      category: 4,
      email: 'info@legacynazareth.com',
      phone: '+972-4-2345678',
      verified: true,
      priceRange: { min: 80, max: 150 },
      amenities: ['wifi', 'parking', 'restaurant'],
      commission: 0.12
    },
    {
      id: 'HTL003',
      name: 'Dead Sea Resort',
      location: 'Dead Sea',
      category: 5,
      email: 'booking@deadsearesort.com',
      phone: '+972-8-3456789',
      verified: true,
      priceRange: { min: 200, max: 400 },
      amenities: ['wifi', 'pool', 'spa', 'beach', 'restaurant'],
      commission: 0.18
    }
  ],
  pending: [],
  rejected: []
};

const EnhancedGroupQuotationSystem = () => {
  // Estado principal del sistema
  const [currentUser, setCurrentUser] = useState({
    type: 'ADMIN', // ADMIN, B2B, B2B2C, HOTEL
    permissions: {
      canSeeAllPrices: true,
      canEditQuotations: true,
      canApprovePayments: true,
      canAddHotels: true,
      canOverrideVisibility: true
    }
  });

  // Estado de cotizaciones
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Estado del formulario de nueva cotización
  const [newQuotation, setNewQuotation] = useState({
    id: null,
    groupInfo: {
      name: '',
      size: 30,
      country: '',
      type: 'LEISURE', // LEISURE, RELIGIOUS, CORPORATE, EDUCATIONAL
      specialRequests: '',
      leader: {
        name: '',
        email: '',
        phone: '',
        whatsapp: ''
      }
    },
    dates: {
      arrival: '',
      departure: '',
      flexibility: false,
      alternativeDates: []
    },
    accommodation: {
      mealPlan: 'HB',
      roomDistribution: {
        single: 0,
        double: 0,
        triple: 0,
        child: 0
      },
      specialNeeds: []
    },
    hotelSelection: {
      mode: 'MANUAL', // MANUAL, AUTO, MIXED
      selectedHotels: [],
      excludedHotels: [],
      preferredCategories: [4, 5],
      maxHotels: 10
    },
    visibilitySettings: {
      showPricesToHotels: false, // Por defecto NO
      hotelSpecificVisibility: {} // { hotelId: boolean }
    },
    paymentTerms: {
      depositRequired: true,
      depositAmount: 500,
      paymentSchedule: 'NET30',
      cancellationPolicy: 'MODERATE',
      customTerms: ''
    },
    tracking: {
      createdAt: new Date().toISOString(),
      createdBy: null,
      lastModified: null,
      modifiedBy: null,
      history: []
    },
    status: 'DRAFT',
    validUntil: null,
    extensions: [],
    responses: [],
    selectedOffer: null,
    payments: [],
    internalNotes: '',
    clientNotes: ''
  });

  // Estado para agregar nuevo hotel
  const [newHotelForm, setNewHotelForm] = useState({
    open: false,
    data: {
      name: '',
      location: '',
      category: 4,
      contactPerson: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      description: '',
      amenities: [],
      notes: '',
      requestedBy: null
    }
  });

  // Estado de seguimiento de modificaciones
  const [priceUpdateTracking, setPriceUpdateTracking] = useState({});
  // Formato: { quotationId: { hotelId: { count: 0, lastUpdate: date, history: [] } } }

  // Estado de permisos de visualización
  const [visibilityPermissions, setVisibilityPermissions] = useState({});
  // Formato: { quotationId: { hotelId: boolean } }

  // Estados de UI
  const [showHotelSelector, setShowHotelSelector] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
  const [showTrackingTimeline, setShowTrackingTimeline] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Función para seleccionar hoteles manualmente
  const handleHotelSelection = (hotels) => {
    setNewQuotation(prev => ({
      ...prev,
      hotelSelection: {
        ...prev.hotelSelection,
        selectedHotels: hotels
      }
    }));
    
    // Inicializar configuración de visibilidad para cada hotel
    const visibilityConfig = {};
    hotels.forEach(hotel => {
      visibilityConfig[hotel.id] = SYSTEM_CONFIG.visibility.defaultShowPrices;
    });
    
    setNewQuotation(prev => ({
      ...prev,
      visibilitySettings: {
        ...prev.visibilitySettings,
        hotelSpecificVisibility: visibilityConfig
      }
    }));
  };

  // Función para agregar hotel no existente
  const handleAddNewHotel = async () => {
    const { data } = newHotelForm;
    
    // Validar datos
    if (!data.name || !data.email || !data.phone) {
      showSnackbar('Por favor complete los campos obligatorios', 'error');
      return;
    }

    setLoading(true);
    try {
      // Crear nuevo hotel en estado pendiente
      const newHotel = {
        id: `HTL_TEMP_${Date.now()}`,
        ...data,
        verified: false,
        status: 'PENDING',
        addedBy: currentUser.id,
        addedAt: new Date().toISOString()
      };

      // Agregar a la base de datos temporal
      HOTELS_DATABASE.pending.push(newHotel);
      
      // Agregar a la selección actual si está creando cotización
      if (newQuotation.hotelSelection.mode === 'MANUAL') {
        handleHotelSelection([...newQuotation.hotelSelection.selectedHotels, newHotel]);
      }

      showSnackbar('Hotel agregado. Pendiente de verificación por el administrador', 'success');
      setNewHotelForm({ ...newHotelForm, open: false });
      
      // Enviar notificación al admin
      await sendAdminNotification('NEW_HOTEL_ADDED', newHotel);
      
    } catch (error) {
      console.error('Error adding hotel:', error);
      showSnackbar('Error al agregar el hotel', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Control de visibilidad de precios para hoteles
  const togglePriceVisibility = (quotationId, hotelId = null) => {
    if (!currentUser.permissions.canOverrideVisibility && currentUser.type !== 'ADMIN') {
      showSnackbar('No tiene permisos para cambiar la visibilidad', 'error');
      return;
    }

    if (hotelId) {
      // Toggle para hotel específico
      setVisibilityPermissions(prev => ({
        ...prev,
        [quotationId]: {
          ...prev[quotationId],
          [hotelId]: !prev[quotationId]?.[hotelId]
        }
      }));
      
      // Registrar el cambio
      logActivity('VISIBILITY_CHANGED', {
        quotationId,
        hotelId,
        newValue: !visibilityPermissions[quotationId]?.[hotelId],
        changedBy: currentUser.id
      });
    } else {
      // Toggle global para todos los hoteles
      const quotation = quotations.find(q => q.id === quotationId);
      const allHotels = quotation?.hotelSelection.selectedHotels || [];
      const newVisibility = {};
      
      allHotels.forEach(hotel => {
        newVisibility[hotel.id] = !quotation.visibilitySettings.showPricesToHotels;
      });
      
      setVisibilityPermissions(prev => ({
        ...prev,
        [quotationId]: newVisibility
      }));
    }
    
    showSnackbar('Configuración de visibilidad actualizada', 'success');
  };

  // Sistema de actualización de precios limitado
  const handlePriceUpdate = (quotationId, hotelId, newPrice) => {
    const quotation = quotations.find(q => q.id === quotationId);
    
    // Verificar si la cotización está confirmada
    if (quotation?.status === 'CONFIRMED') {
      showSnackbar('No se pueden modificar precios en cotizaciones confirmadas', 'error');
      return;
    }

    // Verificar límite de actualizaciones
    const trackingKey = `${quotationId}_${hotelId}`;
    const currentTracking = priceUpdateTracking[trackingKey] || { count: 0, history: [] };
    
    if (currentTracking.count >= SYSTEM_CONFIG.quotation.maxPriceUpdates) {
      showSnackbar('Ha alcanzado el límite de actualizaciones. Contacte al administrador', 'warning');
      
      // Enviar solicitud al admin
      sendAdminNotification('PRICE_UPDATE_REQUEST', {
        quotationId,
        hotelId,
        requestedPrice: newPrice,
        currentPrice: getCurrentPrice(quotationId, hotelId),
        updateCount: currentTracking.count
      });
      
      return;
    }

    // Actualizar el precio
    const updatedHistory = [
      ...currentTracking.history,
      {
        previousPrice: getCurrentPrice(quotationId, hotelId),
        newPrice,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.id
      }
    ];

    setPriceUpdateTracking(prev => ({
      ...prev,
      [trackingKey]: {
        count: currentTracking.count + 1,
        lastUpdate: new Date().toISOString(),
        history: updatedHistory
      }
    }));

    // Actualizar el precio en la cotización
    updateQuotationPrice(quotationId, hotelId, newPrice);
    
    showSnackbar(`Precio actualizado. Actualizaciones restantes: ${SYSTEM_CONFIG.quotation.maxPriceUpdates - currentTracking.count - 1}`, 'success');
  };

  // Extensión de cotización
  const handleExtendQuotation = (quotationId, hotelIds = []) => {
    const quotation = quotations.find(q => q.id === quotationId);
    
    if (!quotation) return;
    
    // Verificar si ya se extendió
    if (quotation.extensions.length > 0) {
      showSnackbar('Esta cotización ya fue extendida anteriormente', 'warning');
      return;
    }

    const extensionDate = new Date();
    extensionDate.setDate(extensionDate.getDate() + SYSTEM_CONFIG.quotation.maxExtensionDays);
    
    const extension = {
      id: `EXT_${Date.now()}`,
      extendedAt: new Date().toISOString(),
      extendedUntil: extensionDate.toISOString(),
      hotels: hotelIds.length > 0 ? hotelIds : quotation.hotelSelection.selectedHotels.map(h => h.id),
      requestedBy: currentUser.id
    };

    // Actualizar cotización
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        return {
          ...q,
          validUntil: extensionDate.toISOString(),
          extensions: [...q.extensions, extension],
          status: 'EXTENDED'
        };
      }
      return q;
    }));

    // Notificar a los hoteles seleccionados
    extension.hotels.forEach(hotelId => {
      sendHotelNotification(hotelId, 'QUOTATION_EXTENDED', {
        quotationId,
        extendedUntil: extensionDate.toISOString(),
        groupName: quotation.groupInfo.name
      });
    });

    showSnackbar('Cotización extendida por 7 días adicionales', 'success');
  };

  // Proceso de confirmación con depósito
  const handleDepositPayment = async (quotationId, paymentData) => {
    const quotation = quotations.find(q => q.id === quotationId);
    
    if (!quotation) return;

    setLoading(true);
    try {
      // Procesar el pago del depósito
      const payment = {
        id: `PAY_${Date.now()}`,
        type: 'DEPOSIT',
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        method: paymentData.method,
        reference: paymentData.reference,
        status: 'PENDING',
        processedAt: new Date().toISOString(),
        processedBy: currentUser.id
      };

      // Actualizar estado de la cotización
      setQuotations(prev => prev.map(q => {
        if (q.id === quotationId) {
          return {
            ...q,
            status: 'DEPOSIT_PENDING',
            payments: [...q.payments, payment]
          };
        }
        return q;
      }));

      // Simular confirmación de pago (en producción sería async con gateway)
      setTimeout(() => {
        confirmPayment(quotationId, payment.id);
      }, 3000);

      showSnackbar('Procesando pago del depósito...', 'info');
    } catch (error) {
      console.error('Error processing deposit:', error);
      showSnackbar('Error al procesar el pago', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar pago y crear grupo
  const confirmPayment = (quotationId, paymentId) => {
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        const payment = q.payments.find(p => p.id === paymentId);
        if (payment) {
          payment.status = 'CONFIRMED';
        }
        
        // Crear grupo en el sistema
        createGroupFromQuotation(q);
        
        return {
          ...q,
          status: 'CONFIRMED',
          confirmedAt: new Date().toISOString()
        };
      }
      return q;
    }));

    showSnackbar('¡Depósito confirmado! Grupo creado en el sistema', 'success');
  };

  // Crear grupo desde cotización confirmada
  const createGroupFromQuotation = (quotation) => {
    const group = {
      id: `GRP_${Date.now()}`,
      quotationId: quotation.id,
      name: quotation.groupInfo.name,
      size: quotation.groupInfo.size,
      leader: quotation.groupInfo.leader,
      dates: quotation.dates,
      hotels: quotation.selectedOffer?.hotels || [],
      status: 'ACTIVE',
      payments: quotation.payments,
      tracking: {
        createdAt: new Date().toISOString(),
        milestones: [
          {
            type: 'GROUP_CREATED',
            date: new Date().toISOString(),
            description: 'Grupo creado tras confirmación de depósito'
          }
        ]
      }
    };

    // Aquí se guardaría en la base de datos
    console.log('Grupo creado:', group);
    
    // Notificar a todos los involucrados
    sendGroupCreationNotifications(group);
  };

  // Sistema de tracking y auditoría
  const logActivity = (type, data) => {
    const activity = {
      id: `ACT_${Date.now()}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      user: currentUser.id,
      ip: 'xxx.xxx.xxx.xxx' // En producción obtener IP real
    };

    // Guardar en el log (en producción sería en base de datos)
    console.log('Activity logged:', activity);
  };

  // Funciones de notificación
  const sendAdminNotification = async (type, data) => {
    console.log('Admin notification:', { type, data });
    // Implementar envío real de notificaciones
  };

  const sendHotelNotification = async (hotelId, type, data) => {
    console.log('Hotel notification:', { hotelId, type, data });
    // Implementar envío real de notificaciones
  };

  const sendGroupCreationNotifications = async (group) => {
    console.log('Group creation notifications:', group);
    // Notificar a cliente, hoteles, admin, etc.
  };

  // Funciones auxiliares
  const getCurrentPrice = (quotationId, hotelId) => {
    const quotation = quotations.find(q => q.id === quotationId);
    const response = quotation?.responses.find(r => r.hotelId === hotelId);
    return response?.price || 0;
  };

  const updateQuotationPrice = (quotationId, hotelId, newPrice) => {
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        const responses = q.responses.map(r => {
          if (r.hotelId === hotelId) {
            return { ...r, price: newPrice, lastUpdated: new Date().toISOString() };
          }
          return r;
        });
        return { ...q, responses };
      }
      return q;
    }));
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Calcular estadísticas
  const statistics = useMemo(() => {
    return {
      total: quotations.length,
      active: quotations.filter(q => ['SENT', 'WAITING', 'EXTENDED'].includes(q.status)).length,
      pending: quotations.filter(q => q.status === 'DEPOSIT_PENDING').length,
      confirmed: quotations.filter(q => q.status === 'CONFIRMED').length,
      revenue: quotations.filter(q => q.status === 'CONFIRMED')
        .reduce((sum, q) => sum + (q.payments.reduce((s, p) => s + p.amount, 0)), 0)
    };
  }, [quotations]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header con información del usuario */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
              Sistema Avanzado de Cotización de Grupos
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
              Gestión inteligente con competencia controlada entre proveedores
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip
                icon={<PersonIcon />}
                label={`Usuario: ${currentUser.type}`}
                sx={{ bgcolor: 'white' }}
              />
              {currentUser.permissions.canOverrideVisibility && (
                <Chip
                  icon={<VisibilityIcon />}
                  label="Control de Visibilidad"
                  color="success"
                  sx={{ bgcolor: 'white', color: 'success.main' }}
                />
              )}
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowHotelSelector(true)}
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
                size="large"
              >
                Nueva Cotización
              </Button>
              <IconButton
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                onClick={() => setLoading(!loading)}
              >
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3">
                    {statistics.active}
                  </Typography>
                  <Typography variant="body1">
                    Cotizaciones Activas
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <AssignmentIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3">
                    {statistics.pending}
                  </Typography>
                  <Typography variant="body1">
                    Esperando Depósito
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <PendingPaymentIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3">
                    {statistics.confirmed}
                  </Typography>
                  <Typography variant="body1">
                    Grupos Confirmados
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <VerifiedIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h3">
                    ${statistics.revenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body1">
                    Ingresos Totales
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <MoneyIcon fontSize="large" />
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
          <Tab label="Selección de Hoteles" icon={<HotelIcon />} iconPosition="start" />
          <Tab label="Control de Visibilidad" icon={<VisibilityIcon />} iconPosition="start" />
          <Tab label="Seguimiento y Pagos" icon={<PaymentIcon />} iconPosition="start" />
          <Tab label="Configuración" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Contenido de los tabs */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID / Grupo</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fechas</TableCell>
                <TableCell>Pax</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell align="center">Hoteles</TableCell>
                <TableCell align="center">Respuestas</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Válido Hasta</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Box sx={{ py: 4 }}>
                      <Typography variant="h6" color="text.secondary">
                        No hay cotizaciones activas
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setShowHotelSelector(true)}
                        sx={{ mt: 2 }}
                      >
                        Crear Primera Cotización
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={quotation.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {quotation.id}
                      </Typography>
                      <Typography variant="caption">
                        {quotation.groupInfo.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {quotation.groupInfo.leader.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {quotation.groupInfo.country}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {quotation.dates.arrival}
                      </Typography>
                      <br />
                      <Typography variant="caption">
                        {quotation.dates.departure}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Badge badgeContent={quotation.groupInfo.size} color="primary">
                        <GroupsIcon />
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={SYSTEM_CONFIG.mealPlans[quotation.accommodation.mealPlan]?.code}
                        size="small"
                        icon={SYSTEM_CONFIG.mealPlans[quotation.accommodation.mealPlan]?.icon}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <AvatarGroup max={3}>
                        {quotation.hotelSelection.selectedHotels.map((hotel, idx) => (
                          <Avatar key={idx} sx={{ width: 30, height: 30 }}>
                            <HotelIcon fontSize="small" />
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <Typography variant="caption">
                        {quotation.hotelSelection.selectedHotels.length} seleccionados
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Badge 
                        badgeContent={quotation.responses.length} 
                        color="success"
                      >
                        <EmailIcon />
                      </Badge>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={SYSTEM_CONFIG.quotationStatus[quotation.status]?.label}
                        color={SYSTEM_CONFIG.quotationStatus[quotation.status]?.color}
                        size="small"
                        icon={SYSTEM_CONFIG.quotationStatus[quotation.status]?.icon}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {quotation.validUntil ? (
                        <Box>
                          <Typography variant="caption">
                            {new Date(quotation.validUntil).toLocaleDateString()}
                          </Typography>
                          {quotation.extensions.length > 0 && (
                            <Chip
                              label="Extendida"
                              size="small"
                              color="info"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Ver Detalles">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedQuotation(quotation)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        
                        {quotation.status === 'WAITING' && quotation.extensions.length === 0 && (
                          <Tooltip title="Extender 7 días">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleExtendQuotation(quotation.id)}
                            >
                              <ExtensionIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {quotation.status === 'SELECTED' && (
                          <Tooltip title="Procesar Depósito">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedQuotation(quotation);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <PaymentIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {currentUser.permissions.canOverrideVisibility && (
                          <Tooltip title="Configurar Visibilidad">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => {
                                setSelectedQuotation(quotation);
                                setShowVisibilitySettings(true);
                              }}
                            >
                              {quotation.visibilitySettings.showPricesToHotels ? 
                                <VisibilityIcon /> : <VisibilityOffIcon />}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Selección de Hoteles */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader
                  title="Hoteles Disponibles"
                  subheader="Seleccione los hoteles para enviar la cotización"
                  action={
                    <Button
                      startIcon={<AddBusinessIcon />}
                      onClick={() => setNewHotelForm({ ...newHotelForm, open: true })}
                    >
                      Agregar Hotel Nuevo
                    </Button>
                  }
                />
                <CardContent>
                  <Grid container spacing={2}>
                    {HOTELS_DATABASE.verified.map((hotel) => (
                      <Grid item xs={12} md={6} key={hotel.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <Box>
                                <Typography variant="h6">
                                  {hotel.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {hotel.location}
                                </Typography>
                                <Rating value={hotel.category} readOnly size="small" />
                                <Box sx={{ mt: 1 }}>
                                  {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                                    <Chip
                                      key={idx}
                                      label={amenity}
                                      size="small"
                                      sx={{ mr: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                              <Checkbox
                                checked={newQuotation.hotelSelection.selectedHotels
                                  .some(h => h.id === hotel.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleHotelSelection([
                                      ...newQuotation.hotelSelection.selectedHotels,
                                      hotel
                                    ]);
                                  } else {
                                    handleHotelSelection(
                                      newQuotation.hotelSelection.selectedHotels
                                        .filter(h => h.id !== hotel.id)
                                    );
                                  }
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {HOTELS_DATABASE.pending.length > 0 && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="h6" gutterBottom>
                        Hoteles Pendientes de Verificación
                      </Typography>
                      <Grid container spacing={2}>
                        {HOTELS_DATABASE.pending.map((hotel) => (
                          <Grid item xs={12} md={6} key={hotel.id}>
                            <Card variant="outlined" sx={{ opacity: 0.7 }}>
                              <CardContent>
                                <Chip
                                  label="Pendiente"
                                  color="warning"
                                  size="small"
                                  sx={{ mb: 1 }}
                                />
                                <Typography variant="h6">
                                  {hotel.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {hotel.location}
                                </Typography>
                                <Typography variant="caption">
                                  Agregado por: {hotel.addedBy}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader
                  title="Resumen de Selección"
                  subheader={`${newQuotation.hotelSelection.selectedHotels.length} hoteles seleccionados`}
                />
                <CardContent>
                  <List>
                    {newQuotation.hotelSelection.selectedHotels.map((hotel) => (
                      <ListItem key={hotel.id}>
                        <ListItemIcon>
                          <HotelIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={hotel.name}
                          secondary={hotel.location}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => {
                              handleHotelSelection(
                                newQuotation.hotelSelection.selectedHotels
                                  .filter(h => h.id !== hotel.id)
                              );
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  
                  {newQuotation.hotelSelection.selectedHotels.length > 0 && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<SendIcon />}
                      sx={{ mt: 2 }}
                    >
                      Enviar Cotización
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Control de Visibilidad */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Control de Visibilidad de Precios</AlertTitle>
            Por defecto, los hoteles NO pueden ver los precios de otros competidores. 
            Puede activar la visibilidad para hoteles específicos o globalmente.
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Configuración de Visibilidad por Cotización"
                  subheader="Controle qué hoteles pueden ver precios de competidores"
                  action={
                    <FormControlLabel
                      control={
                        <Switch
                          checked={SYSTEM_CONFIG.visibility.defaultShowPrices}
                          onChange={(e) => {
                            SYSTEM_CONFIG.visibility.defaultShowPrices = e.target.checked;
                            showSnackbar(
                              `Visibilidad por defecto: ${e.target.checked ? 'ACTIVADA' : 'DESACTIVADA'}`,
                              'info'
                            );
                          }}
                        />
                      }
                      label="Visibilidad Global"
                    />
                  }
                />
                <CardContent>
                  {quotations.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" align="center">
                      No hay cotizaciones activas
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Cotización</TableCell>
                            <TableCell>Hotel</TableCell>
                            <TableCell align="center">Puede Ver Precios</TableCell>
                            <TableCell align="center">Última Modificación</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {quotations.map(quotation => 
                            quotation.hotelSelection.selectedHotels.map(hotel => (
                              <TableRow key={`${quotation.id}_${hotel.id}`}>
                                <TableCell>{quotation.id}</TableCell>
                                <TableCell>{hotel.name}</TableCell>
                                <TableCell align="center">
                                  <Chip
                                    icon={visibilityPermissions[quotation.id]?.[hotel.id] ? 
                                      <VisibilityIcon /> : <VisibilityOffIcon />}
                                    label={visibilityPermissions[quotation.id]?.[hotel.id] ? 
                                      'SÍ' : 'NO'}
                                    color={visibilityPermissions[quotation.id]?.[hotel.id] ? 
                                      'success' : 'default'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="caption">
                                    {new Date().toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Switch
                                    checked={visibilityPermissions[quotation.id]?.[hotel.id] || false}
                                    onChange={() => togglePriceVisibility(quotation.id, hotel.id)}
                                    disabled={!currentUser.permissions.canOverrideVisibility}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          {/* Seguimiento y Pagos */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardHeader
                  title="Seguimiento de Cotizaciones"
                  subheader="Timeline de actividades y pagos"
                />
                <CardContent>
                  <Timeline position="alternate">
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary">
                        {new Date().toLocaleString()}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="primary">
                          <AssignmentIcon />
                        </TimelineDot>
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="h6">Cotización Creada</Typography>
                        <Typography variant="body2">ID: GRP-2024-001</Typography>
                      </TimelineContent>
                    </TimelineItem>
                    
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary">
                        {new Date().toLocaleString()}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="info">
                          <SendIcon />
                        </TimelineDot>
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="h6">Enviada a Hoteles</Typography>
                        <Typography variant="body2">10 hoteles notificados</Typography>
                      </TimelineContent>
                    </TimelineItem>
                    
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary">
                        {new Date().toLocaleString()}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color="warning">
                          <PendingPaymentIcon />
                        </TimelineDot>
                        <TimelineConnector />
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="h6">Esperando Depósito</Typography>
                        <Typography variant="body2">$500 USD pendiente</Typography>
                      </TimelineContent>
                    </TimelineItem>
                    
                    <TimelineItem>
                      <TimelineOppositeContent color="text.secondary">
                        Pendiente
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot>
                          <ConfirmedPaymentIcon />
                        </TimelineDot>
                      </TimelineSeparator>
                      <TimelineContent>
                        <Typography variant="h6">Confirmación Final</Typography>
                        <Typography variant="body2">Grupo confirmado</Typography>
                      </TimelineContent>
                    </TimelineItem>
                  </Timeline>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardHeader
                  title="Resumen de Pagos"
                  subheader="Estado financiero de cotizaciones"
                />
                <CardContent>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <PendingPaymentIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Depósitos Pendientes"
                        secondary="$2,500"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ConfirmedPaymentIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Depósitos Confirmados"
                        secondary="$5,000"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PaymentIcon color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Pagos Totales"
                        secondary="$25,000"
                      />
                    </ListItem>
                  </List>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Políticas de Pago Activas
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(SYSTEM_CONFIG.cancellationPolicies).map(([key, policy]) => (
                      <Chip
                        key={key}
                        label={policy.name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Diálogo para agregar nuevo hotel */}
      <Dialog
        open={newHotelForm.open}
        onClose={() => setNewHotelForm({ ...newHotelForm, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Agregar Nuevo Hotel a la Base de Datos
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Si el hotel que busca no está en nuestra base de datos, puede agregarlo aquí. 
            Será revisado por un administrador antes de ser activado.
          </Alert>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre del Hotel"
                value={newHotelForm.data.name}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, name: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ubicación"
                value={newHotelForm.data.location}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, location: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={newHotelForm.data.category}
                  onChange={(e) => setNewHotelForm({
                    ...newHotelForm,
                    data: { ...newHotelForm.data, category: e.target.value }
                  })}
                  label="Categoría"
                >
                  <MenuItem value={3}>3 Estrellas</MenuItem>
                  <MenuItem value={4}>4 Estrellas</MenuItem>
                  <MenuItem value={5}>5 Estrellas</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Persona de Contacto"
                value={newHotelForm.data.contactPerson}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, contactPerson: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newHotelForm.data.email}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, email: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={newHotelForm.data.phone}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, phone: e.target.value }
                })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sitio Web"
                value={newHotelForm.data.website}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, website: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección Completa"
                value={newHotelForm.data.address}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, address: e.target.value }
                })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas o Información Adicional"
                value={newHotelForm.data.notes}
                onChange={(e) => setNewHotelForm({
                  ...newHotelForm,
                  data: { ...newHotelForm.data, notes: e.target.value }
                })}
                multiline
                rows={3}
                placeholder="Cualquier información que nos ayude a contactar o verificar el hotel"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewHotelForm({ ...newHotelForm, open: false })}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddNewHotel}
            variant="contained"
            disabled={!newHotelForm.data.name || !newHotelForm.data.email}
          >
            Agregar Hotel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de procesamiento de depósito */}
      <Dialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Procesar Depósito de Confirmación
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Se requiere un depósito para confirmar la reserva del grupo
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Monto del Depósito"
                type="number"
                defaultValue={SYSTEM_CONFIG.quotation.depositAmount.min}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Método de Pago</InputLabel>
                <Select defaultValue="TRANSFER">
                  <MenuItem value="TRANSFER">Transferencia Bancaria</MenuItem>
                  <MenuItem value="CARD">Tarjeta de Crédito</MenuItem>
                  <MenuItem value="CHECK">Cheque</MenuItem>
                  <MenuItem value="CASH">Efectivo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Referencia de Pago"
                placeholder="Número de transacción o referencia"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedQuotation) {
                handleDepositPayment(selectedQuotation.id, {
                  amount: SYSTEM_CONFIG.quotation.depositAmount.min,
                  method: 'TRANSFER',
                  reference: 'REF123456'
                });
              }
              setShowPaymentDialog(false);
            }}
          >
            Procesar Depósito
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
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

export default EnhancedGroupQuotationSystem;