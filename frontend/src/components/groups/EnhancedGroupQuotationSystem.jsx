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
  Backdrop,
  Fab,
  ButtonGroup,
  ListSubheader,
  FormHelperText,
  Container,
  Drawer,
  AppBar,
  Toolbar,
  useTheme,
  alpha,
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
  ChatBubble as ChatIcon,
  Forum as ForumIcon,
  LiveHelp as HelpIcon,
  Feedback as FeedbackIcon,
  ThumbUp as ThumbUpIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  Bookmark as BookmarkIcon,
  Flag as FlagIcon,
  Report as ReportIcon,
  Block as BlockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  RadioButtonChecked as RadioCheckedIcon,
  RadioButtonUnchecked as RadioUncheckedIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  SwapVert as SwapIcon,
  Update as UpdateIcon,
  Schedule as ScheduleIcon,
  DateRange as DateRangeIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWalletOutlined as WalletOutlinedIcon,
  MonetizationOn as MonetizationIcon,
  Euro as EuroIcon,
  AttachMoney as DollarIcon,
  LocalAtm as AtmIcon,
  Gavel as GavelIcon,
  Policy as PolicyIcon,
  Rule as RuleIcon,
  FactCheck as FactCheckIcon,
  AssignmentLate as LateIcon,
  AssignmentReturn as ReturnIcon,
  Extension as ExtensionIcon,
  ExtensionOff as ExtensionOffIcon,
  Autorenew as AutorenewIcon,
  Loop as LoopIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  CloudSync as CloudSyncIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Router as RouterIcon,
  Hub as HubIcon,
  Lan as LanIcon,
  WifiTethering as TetheringIcon,
  Cast as CastIcon,
  CastConnected as CastConnectedIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Approval as ApprovalIcon,
  ThumbUpAlt as ApproveIcon,
  ThumbDownAlt as RejectIcon,
  PendingActions as PendingActionsIcon,
  HowToReg as RegisteredIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  GroupAdd as GroupAddIcon,
  GroupRemove as GroupRemoveIcon,
  ManageAccounts as ManageAccountsIcon,
  Badge as BadgeIcon,
  ContactMail as ContactMailIcon,
  AlternateEmail as AlternateEmailIcon,
  MarkEmailUnread as UnreadIcon,
  Drafts as DraftsIcon,
  Inbox as InboxIcon,
  Outbox as OutboxIcon,
  SendAndArchive as ArchiveIcon,
  QueryStats as StatsIcon,
  DataUsage as DataIcon,
  DonutLarge as DonutIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  BubbleChart as BubbleChartIcon,
  Insights as InsightsIcon,
  TrendingFlat as FlatIcon,
  Equalizer as EqualizerIcon,
  Functions as FunctionsIcon,
  Transform as TransformIcon,
  Timeline as TimelineIcon,
  ViewTimeline as ViewTimelineIcon,
  WaterfallChart as WaterfallIcon,
  StackedLineChart as StackedIcon,
  Leaderboard as LeaderboardIcon,
  CandlestickChart as CandlestickIcon
} from '@mui/icons-material';

// Configuración de base de datos de hoteles
const HOTEL_DATABASE = {
  verified: [
    // Hoteles verificados en el sistema
    { id: 'HTL001', name: 'Legacy Nazareth Hotel', location: 'Nazaret', category: 4, verified: true, email: 'reservations@legacy.com', phone: '+972-4-1234567' },
    { id: 'HTL002', name: 'Golden Crown Hotel', location: 'Nazaret', category: 4, verified: true, email: 'info@goldencrown.com', phone: '+972-4-2345678' },
    { id: 'HTL003', name: 'Ramada Nazareth', location: 'Nazaret', category: 4, verified: true, email: 'ramada@nazareth.com', phone: '+972-4-3456789' },
    { id: 'HTL004', name: 'Plaza Hotel Nazareth', location: 'Nazaret', category: 3, verified: true, email: 'plaza@nazareth.com', phone: '+972-4-4567890' },
    { id: 'HTL005', name: 'Isrotel Dead Sea', location: 'Mar Muerto', category: 5, verified: true, email: 'deadse@isrotel.com', phone: '+972-8-1234567' },
    { id: 'HTL006', name: 'David Dead Sea', location: 'Mar Muerto', category: 5, verified: true, email: 'david@deadsea.com', phone: '+972-8-2345678' },
    { id: 'HTL007', name: 'Crown Plaza Dead Sea', location: 'Mar Muerto', category: 5, verified: true, email: 'crown@deadsea.com', phone: '+972-8-3456789' },
    { id: 'HTL008', name: 'Leonardo Club Dead Sea', location: 'Mar Muerto', category: 4, verified: true, email: 'leonardo@deadsea.com', phone: '+972-8-4567890' },
    { id: 'HTL009', name: 'Manger Square Hotel', location: 'Belén', category: 4, verified: true, email: 'info@mangersquare.com', phone: '+970-2-1234567' },
    { id: 'HTL010', name: 'Paradise Hotel Bethlehem', location: 'Belén', category: 4, verified: true, email: 'paradise@bethlehem.com', phone: '+970-2-2345678' },
    { id: 'HTL011', name: 'Saint Gabriel Hotel', location: 'Belén', category: 4, verified: true, email: 'gabriel@bethlehem.com', phone: '+970-2-3456789' },
    { id: 'HTL012', name: 'Shepherd Hotel', location: 'Belén', category: 3, verified: true, email: 'shepherd@bethlehem.com', phone: '+970-2-4567890' }
  ],
  pending: [
    // Hoteles pendientes de verificación
  ],
  suggested: [
    // Hoteles sugeridos por clientes
  ]
};

// Configuración de planes de comidas
const MEAL_PLANS = {
  RO: { code: 'RO', name: 'Solo Alojamiento', description: 'Room Only - Sin comidas', icon: <HotelIcon /> },
  BB: { code: 'BB', name: 'Alojamiento y Desayuno', description: 'Bed & Breakfast', icon: <BreakfastIcon /> },
  HB: { code: 'HB', name: 'Media Pensión', description: 'Desayuno y Cena', icon: <RestaurantIcon /> },
  FB: { code: 'FB', name: 'Pensión Completa', description: 'Desayuno, Almuerzo y Cena', icon: <DinnerIcon /> },
  AI: { code: 'AI', name: 'Todo Incluido', description: 'All Inclusive - Comidas y Bebidas', icon: <LocalBarIcon /> }
};

// Estados de cotización
const QUOTATION_STATUS = {
  DRAFT: { label: 'Borrador', color: 'default', icon: <EditIcon /> },
  SENT: { label: 'Enviada', color: 'info', icon: <SendIcon /> },
  WAITING: { label: 'Esperando Respuestas', color: 'warning', icon: <WaitingIcon /> },
  RECEIVED: { label: 'Respuestas Recibidas', color: 'success', icon: <CheckCircleIcon /> },
  EXTENDED: { label: 'Extendida', color: 'primary', icon: <ExtensionIcon /> },
  NEGOTIATING: { label: 'Negociando', color: 'warning', icon: <CompareIcon /> },
  DEPOSIT_PENDING: { label: 'Esperando Depósito', color: 'warning', icon: <PaymentIcon /> },
  DEPOSIT_RECEIVED: { label: 'Depósito Recibido', color: 'success', icon: <PaidIcon /> },
  CONFIRMED: { label: 'Confirmada', color: 'success', icon: <VerifiedIcon /> },
  CANCELLED: { label: 'Cancelada', color: 'error', icon: <CancelIcon /> },
  EXPIRED: { label: 'Expirada', color: 'error', icon: <EventBusyIcon /> }
};

// Políticas de cancelación predefinidas
const CANCELLATION_POLICIES = {
  FLEXIBLE: {
    name: 'Flexible',
    description: 'Cancelación gratuita hasta 24 horas antes',
    deposit: 500,
    finalPaymentDays: 7,
    penalties: [
      { daysBeforeArrival: 1, penalty: 100 },
      { daysBeforeArrival: 7, penalty: 50 },
      { daysBeforeArrival: 14, penalty: 25 },
      { daysBeforeArrival: 30, penalty: 0 }
    ]
  },
  MODERATE: {
    name: 'Moderada',
    description: 'Cancelación con penalidades escalonadas',
    deposit: 750,
    finalPaymentDays: 14,
    penalties: [
      { daysBeforeArrival: 7, penalty: 100 },
      { daysBeforeArrival: 14, penalty: 75 },
      { daysBeforeArrival: 30, penalty: 50 },
      { daysBeforeArrival: 45, penalty: 25 },
      { daysBeforeArrival: 60, penalty: 0 }
    ]
  },
  STRICT: {
    name: 'Estricta',
    description: 'Depósito no reembolsable',
    deposit: 1000,
    finalPaymentDays: 30,
    penalties: [
      { daysBeforeArrival: 30, penalty: 100 },
      { daysBeforeArrival: 60, penalty: 50 },
      { daysBeforeArrival: 90, penalty: 25 }
    ]
  }
};

// Permisos de usuario
const USER_PERMISSIONS = {
  ADMIN: {
    canSeeAllPrices: true,
    canModifyPolicies: true,
    canExtendQuotations: true,
    canOverrideRestrictions: true,
    canAddNewHotels: true,
    canApproveChanges: true
  },
  BRANCH_MANAGER: {
    canSeeAllPrices: true,
    canModifyPolicies: true,
    canExtendQuotations: true,
    canOverrideRestrictions: false,
    canAddNewHotels: true,
    canApproveChanges: true
  },
  AGENT: {
    canSeeAllPrices: false,
    canModifyPolicies: false,
    canExtendQuotations: true,
    canOverrideRestrictions: false,
    canAddNewHotels: false,
    canApproveChanges: false
  },
  CLIENT: {
    canSeeAllPrices: false,
    canModifyPolicies: false,
    canExtendQuotations: false,
    canOverrideRestrictions: false,
    canAddNewHotels: false,
    canApproveChanges: false
  }
};

const EnhancedGroupQuotationSystem = ({ userRole = 'ADMIN' }) => {
  const theme = useTheme();
  const permissions = USER_PERMISSIONS[userRole];
  
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
    groupInfo: {
      groupName: '',
      totalPax: 30,
      country: '',
      clientType: 'B2B', // B2B, B2B2C, B2C
      description: '',
      specialRequests: ''
    },
    dates: {
      arrivalDate: '',
      departureDate: '',
      flexibleDates: false,
      alternativeDates: []
    },
    accommodation: {
      mealPlan: 'HB', // RO, BB, HB, FB, AI
      roomDistribution: {
        single: 0,
        double: 15,
        triple: 0,
        child: 0
      }
    },
    hotelSelection: {
      mode: 'MANUAL', // MANUAL, AUTO, MIXED
      selectedHotels: [], // IDs de hoteles seleccionados manualmente
      suggestedHotels: [], // Hoteles nuevos sugeridos por el cliente
      zones: [] // Zonas donde buscar hoteles
    },
    visibility: {
      priceTransparency: false, // Por defecto, hoteles NO ven precios de otros
      hotelExceptions: [], // Hoteles específicos que SÍ pueden ver precios
      allowPriceUpdates: true, // Permitir actualización de precios
      updateLimit: 2, // Límite de actualizaciones por hotel
    },
    timeline: {
      quotationValidDays: 7, // Validez inicial de la cotización
      extensionsAllowed: 1, // Cuántas extensiones permitidas
      extensionDays: 7, // Días por extensión
      currentExtensions: 0,
      expiryDate: null,
      autoExpire: true
    },
    policies: {
      cancellationPolicy: 'MODERATE',
      depositAmount: 750,
      depositPercentage: 10,
      usePercentage: false,
      finalPaymentDays: 14,
      customPenalties: [],
      paymentMethods: ['CREDIT_CARD', 'BANK_TRANSFER'],
      requiresApproval: false, // Si requiere aprobación del admin
      approvedBy: null,
      approvalDate: null
    },
    tracking: {
      status: 'DRAFT',
      createdBy: userRole,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      modificationHistory: [],
      deposits: [],
      payments: [],
      confirmations: []
    },
    communications: {
      emails: [],
      notifications: [],
      hotelResponses: [],
      clientMessages: []
    }
  });
  
  // Estado para agregar nuevo hotel
  const [newHotelForm, setNewHotelForm] = useState({
    open: false,
    hotelName: '',
    location: '',
    category: 3,
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    notes: '',
    suggestedBy: 'CLIENT'
  });
  
  // Estado de diálogos
  const [dialogs, setDialogs] = useState({
    newQuotation: false,
    selectHotels: false,
    addNewHotel: false,
    priceComparison: false,
    extendQuotation: false,
    depositPayment: false,
    policyEditor: false,
    hotelResponses: false,
    approvalRequest: false
  });
  
  // Estado de filtros y búsqueda
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'ALL',
    dateRange: { start: null, end: null },
    groupSize: 'ALL',
    location: 'ALL'
  });
  
  // Estado de configuración de visibilidad
  const [visibilitySettings, setVisibilitySettings] = useState({
    globalTransparency: false, // Configuración global del admin
    hotelOverrides: {}, // Hotel ID -> boolean (puede ver precios)
  });
  
  // Estado de hoteles seleccionados
  const [selectedHotelsForQuotation, setSelectedHotelsForQuotation] = useState([]);
  const [availableHotels, setAvailableHotels] = useState(HOTEL_DATABASE.verified);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Cargar datos al montar
  useEffect(() => {
    loadQuotations();
    loadHotelDatabase();
    checkPermissions();
  }, []);
  
  // Verificar permisos del usuario
  const checkPermissions = () => {
    if (!permissions.canSeeAllPrices) {
      // Limitar visibilidad de precios
      console.log('Usuario con permisos limitados');
    }
  };
  
  // Cargar cotizaciones existentes
  const loadQuotations = async () => {
    setLoading(true);
    try {
      // Simular carga desde API
      const mockQuotations = [
        {
          id: 'GRP-202410-0001',
          groupInfo: {
            groupName: 'Peregrinación Tierra Santa 2025',
            totalPax: 45,
            country: 'USA',
            clientType: 'B2B'
          },
          dates: {
            arrivalDate: '2025-11-01',
            departureDate: '2025-11-10'
          },
          tracking: {
            status: 'WAITING',
            createdAt: '2024-10-10T10:00:00Z'
          },
          hotelSelection: {
            selectedHotels: ['HTL001', 'HTL005', 'HTL009'],
            mode: 'MANUAL'
          },
          visibility: {
            priceTransparency: false,
            allowPriceUpdates: true,
            updateLimit: 2
          },
          timeline: {
            quotationValidDays: 7,
            extensionsAllowed: 1,
            currentExtensions: 0,
            expiryDate: '2024-10-17T23:59:59Z'
          }
        },
        {
          id: 'GRP-202410-0002',
          groupInfo: {
            groupName: 'Catholic Pilgrimage Easter 2025',
            totalPax: 30,
            country: 'MEX',
            clientType: 'B2B2C'
          },
          dates: {
            arrivalDate: '2025-04-15',
            departureDate: '2025-04-25'
          },
          tracking: {
            status: 'DEPOSIT_PENDING',
            createdAt: '2024-10-08T14:00:00Z'
          },
          hotelSelection: {
            selectedHotels: ['HTL002', 'HTL006', 'HTL010'],
            mode: 'MANUAL'
          }
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
  
  // Cargar base de datos de hoteles
  const loadHotelDatabase = async () => {
    try {
      // En producción, esto vendría de la API
      setAvailableHotels([...HOTEL_DATABASE.verified, ...HOTEL_DATABASE.pending]);
    } catch (error) {
      console.error('Error loading hotels:', error);
    }
  };
  
  // Generar ID único para cotización
  const generateQuotationId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GRP-${year}${month}-${random}`;
  };
  
  // Manejar selección manual de hoteles
  const handleHotelSelection = (hotelId) => {
    const isSelected = selectedHotelsForQuotation.includes(hotelId);
    
    if (isSelected) {
      setSelectedHotelsForQuotation(prev => prev.filter(id => id !== hotelId));
    } else {
      setSelectedHotelsForQuotation(prev => [...prev, hotelId]);
    }
  };
  
  // Agregar nuevo hotel a la base de datos
  const handleAddNewHotel = async () => {
    try {
      const newHotel = {
        id: `HTL${Date.now()}`,
        ...newHotelForm,
        verified: false,
        addedBy: userRole,
        addedAt: new Date().toISOString()
      };
      
      // Agregar a hoteles pendientes
      HOTEL_DATABASE.pending.push(newHotel);
      
      // También agregarlo a la selección actual si el cliente lo sugirió
      if (newHotelForm.suggestedBy === 'CLIENT') {
        setNewQuotation(prev => ({
          ...prev,
          hotelSelection: {
            ...prev.hotelSelection,
            suggestedHotels: [...prev.hotelSelection.suggestedHotels, newHotel]
          }
        }));
      }
      
      showSnackbar('Hotel agregado exitosamente. Pendiente de verificación.', 'success');
      
      // Reset form
      setNewHotelForm({
        open: false,
        hotelName: '',
        location: '',
        category: 3,
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        notes: '',
        suggestedBy: 'CLIENT'
      });
      
      setDialogs({ ...dialogs, addNewHotel: false });
      
    } catch (error) {
      console.error('Error adding new hotel:', error);
      showSnackbar('Error al agregar hotel', 'error');
    }
  };
  
  // Enviar cotización a hoteles seleccionados
  const sendQuotationToSelectedHotels = async () => {
    setLoading(true);
    try {
      const quotationId = generateQuotationId();
      const quotationWithId = {
        ...newQuotation,
        id: quotationId,
        hotelSelection: {
          ...newQuotation.hotelSelection,
          selectedHotels: selectedHotelsForQuotation
        }
      };
      
      // Preparar notificaciones para cada hotel
      const notifications = selectedHotelsForQuotation.map(hotelId => {
        const hotel = availableHotels.find(h => h.id === hotelId);
        return {
          hotelId,
          hotelName: hotel.name,
          quotationId,
          groupName: newQuotation.groupInfo.groupName,
          dates: newQuotation.dates,
          pax: newQuotation.groupInfo.totalPax,
          mealPlan: newQuotation.accommodation.mealPlan,
          canSeePrices: visibilitySettings.hotelOverrides[hotelId] || visibilitySettings.globalTransparency,
          responseUrl: `https://providers.spirittours.com/quote/${quotationId}/${hotelId}`,
          deadline: new Date(Date.now() + newQuotation.timeline.quotationValidDays * 24 * 3600000)
        };
      });
      
      console.log('Enviando cotización a hoteles:', notifications);
      
      // Actualizar estado
      quotationWithId.tracking.status = 'SENT';
      quotationWithId.tracking.lastModified = new Date().toISOString();
      quotationWithId.timeline.expiryDate = new Date(
        Date.now() + newQuotation.timeline.quotationValidDays * 24 * 3600000
      ).toISOString();
      
      setQuotations([quotationWithId, ...quotations]);
      setDialogs({ ...dialogs, newQuotation: false });
      resetQuotationForm();
      
      showSnackbar(`Cotización ${quotationId} enviada a ${selectedHotelsForQuotation.length} hoteles`, 'success');
      
    } catch (error) {
      console.error('Error sending quotation:', error);
      showSnackbar('Error al enviar cotización', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Extender plazo de cotización
  const handleExtendQuotation = async (quotationId, hotelIds = []) => {
    try {
      const quotation = quotations.find(q => q.id === quotationId);
      
      if (quotation.timeline.currentExtensions >= quotation.timeline.extensionsAllowed) {
        showSnackbar('No se permiten más extensiones para esta cotización', 'error');
        return;
      }
      
      // Actualizar cotización
      const updatedQuotations = quotations.map(q => {
        if (q.id === quotationId) {
          const newExpiryDate = new Date(q.timeline.expiryDate);
          newExpiryDate.setDate(newExpiryDate.getDate() + q.timeline.extensionDays);
          
          return {
            ...q,
            timeline: {
              ...q.timeline,
              currentExtensions: q.timeline.currentExtensions + 1,
              expiryDate: newExpiryDate.toISOString()
            },
            tracking: {
              ...q.tracking,
              status: 'EXTENDED',
              lastModified: new Date().toISOString()
            }
          };
        }
        return q;
      });
      
      setQuotations(updatedQuotations);
      
      // Notificar a hoteles seleccionados
      if (hotelIds.length > 0) {
        console.log(`Notificando extensión a hoteles: ${hotelIds.join(', ')}`);
        // Aquí se enviarían las notificaciones
      }
      
      showSnackbar('Cotización extendida exitosamente', 'success');
      
    } catch (error) {
      console.error('Error extending quotation:', error);
      showSnackbar('Error al extender cotización', 'error');
    }
  };
  
  // Manejar actualización de precio por hotel
  const handleHotelPriceUpdate = async (quotationId, hotelId, newPrice, updateCount) => {
    const quotation = quotations.find(q => q.id === quotationId);
    
    // Verificar si el hotel puede actualizar
    if (!quotation.visibility.allowPriceUpdates) {
      showSnackbar('Las actualizaciones de precio no están permitidas', 'error');
      return;
    }
    
    if (updateCount >= quotation.visibility.updateLimit) {
      showSnackbar('Límite de actualizaciones alcanzado. Contacte al administrador.', 'warning');
      return;
    }
    
    // Si la cotización está confirmada, no permitir cambios
    if (quotation.tracking.status === 'CONFIRMED') {
      showSnackbar('No se pueden modificar precios en cotizaciones confirmadas', 'error');
      return;
    }
    
    // Actualizar precio
    const updatedResponse = {
      hotelId,
      price: newPrice,
      updateCount: updateCount + 1,
      timestamp: new Date().toISOString()
    };
    
    // Guardar respuesta actualizada
    setHotelResponses(prev => [...prev, updatedResponse]);
    
    showSnackbar('Precio actualizado exitosamente', 'success');
  };
  
  // Procesar depósito
  const handleDepositPayment = async (quotationId, depositInfo) => {
    try {
      const { amount, method, reference, date } = depositInfo;
      
      const updatedQuotations = quotations.map(q => {
        if (q.id === quotationId) {
          return {
            ...q,
            tracking: {
              ...q.tracking,
              status: 'DEPOSIT_RECEIVED',
              deposits: [...(q.tracking.deposits || []), {
                amount,
                method,
                reference,
                date,
                processedBy: userRole,
                processedAt: new Date().toISOString()
              }]
            }
          };
        }
        return q;
      });
      
      setQuotations(updatedQuotations);
      
      // Crear grupo en el sistema para seguimiento
      createGroupForTracking(quotationId);
      
      showSnackbar(`Depósito de $${amount} procesado exitosamente`, 'success');
      
    } catch (error) {
      console.error('Error processing deposit:', error);
      showSnackbar('Error al procesar depósito', 'error');
    }
  };
  
  // Crear grupo para seguimiento
  const createGroupForTracking = async (quotationId) => {
    const quotation = quotations.find(q => q.id === quotationId);
    
    const trackingGroup = {
      id: `TRK-${quotationId}`,
      quotationId,
      groupName: quotation.groupInfo.groupName,
      status: 'ACTIVE',
      timeline: {
        created: new Date().toISOString(),
        arrival: quotation.dates.arrivalDate,
        departure: quotation.dates.departureDate
      },
      payments: {
        total: 0, // Se calculará
        paid: quotation.tracking.deposits.reduce((sum, d) => sum + d.amount, 0),
        pending: 0 // Se calculará
      },
      tasks: [],
      documents: [],
      communications: []
    };
    
    console.log('Grupo creado para seguimiento:', trackingGroup);
    
    // Aquí se guardaría en la base de datos
  };
  
  // Manejar cambio de políticas
  const handlePolicyChange = async (quotationId, newPolicies) => {
    // Verificar permisos
    if (!permissions.canModifyPolicies) {
      showSnackbar('No tiene permisos para modificar políticas', 'error');
      return;
    }
    
    // Si requiere aprobación y el usuario no es admin
    if (newPolicies.requiresApproval && userRole !== 'ADMIN') {
      // Enviar para aprobación
      console.log('Enviando cambios para aprobación del administrador');
      showSnackbar('Cambios enviados para aprobación del administrador', 'info');
      return;
    }
    
    // Aplicar cambios
    const updatedQuotations = quotations.map(q => {
      if (q.id === quotationId) {
        return {
          ...q,
          policies: {
            ...newPolicies,
            approvedBy: userRole,
            approvalDate: new Date().toISOString()
          },
          tracking: {
            ...q.tracking,
            modificationHistory: [...q.tracking.modificationHistory, {
              type: 'POLICY_CHANGE',
              by: userRole,
              at: new Date().toISOString(),
              changes: newPolicies
            }]
          }
        };
      }
      return q;
    });
    
    setQuotations(updatedQuotations);
    showSnackbar('Políticas actualizadas exitosamente', 'success');
  };
  
  // Configurar visibilidad de precios para hoteles
  const handleVisibilityToggle = (hotelId = null) => {
    if (!permissions.canSeeAllPrices) {
      showSnackbar('No tiene permisos para cambiar la visibilidad de precios', 'error');
      return;
    }
    
    if (hotelId) {
      // Toggle para hotel específico
      setVisibilitySettings(prev => ({
        ...prev,
        hotelOverrides: {
          ...prev.hotelOverrides,
          [hotelId]: !prev.hotelOverrides[hotelId]
        }
      }));
      
      const newStatus = !visibilitySettings.hotelOverrides[hotelId];
      showSnackbar(
        `Hotel ${hotelId} ${newStatus ? 'ahora puede' : 'ya no puede'} ver precios de competidores`,
        'info'
      );
    } else {
      // Toggle global
      setVisibilitySettings(prev => ({
        ...prev,
        globalTransparency: !prev.globalTransparency
      }));
      
      showSnackbar(
        `Transparencia de precios ${!visibilitySettings.globalTransparency ? 'activada' : 'desactivada'} globalmente`,
        'info'
      );
    }
  };
  
  // Reset formulario de cotización
  const resetQuotationForm = () => {
    setNewQuotation({
      id: null,
      groupInfo: {
        groupName: '',
        totalPax: 30,
        country: '',
        clientType: 'B2B',
        description: '',
        specialRequests: ''
      },
      dates: {
        arrivalDate: '',
        departureDate: '',
        flexibleDates: false,
        alternativeDates: []
      },
      accommodation: {
        mealPlan: 'HB',
        roomDistribution: {
          single: 0,
          double: 15,
          triple: 0,
          child: 0
        }
      },
      hotelSelection: {
        mode: 'MANUAL',
        selectedHotels: [],
        suggestedHotels: [],
        zones: []
      },
      visibility: {
        priceTransparency: false,
        hotelExceptions: [],
        allowPriceUpdates: true,
        updateLimit: 2
      },
      timeline: {
        quotationValidDays: 7,
        extensionsAllowed: 1,
        extensionDays: 7,
        currentExtensions: 0,
        expiryDate: null,
        autoExpire: true
      },
      policies: {
        cancellationPolicy: 'MODERATE',
        depositAmount: 750,
        depositPercentage: 10,
        usePercentage: false,
        finalPaymentDays: 14,
        customPenalties: [],
        paymentMethods: ['CREDIT_CARD', 'BANK_TRANSFER'],
        requiresApproval: false,
        approvedBy: null,
        approvalDate: null
      },
      tracking: {
        status: 'DRAFT',
        createdBy: userRole,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        modificationHistory: [],
        deposits: [],
        payments: [],
        confirmations: []
      },
      communications: {
        emails: [],
        notifications: [],
        hotelResponses: [],
        clientMessages: []
      }
    });
    
    setSelectedHotelsForQuotation([]);
    setCurrentStep(0);
  };
  
  // Mostrar snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Filtrar cotizaciones
  const filteredQuotations = useMemo(() => {
    return quotations.filter(quotation => {
      if (filters.status !== 'ALL' && quotation.tracking.status !== filters.status) {
        return false;
      }
      
      if (filters.searchTerm && !quotation.groupInfo.groupName.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [quotations, filters]);
  
  // Calcular estadísticas
  const statistics = useMemo(() => {
    const stats = {
      total: quotations.length,
      active: quotations.filter(q => ['SENT', 'WAITING', 'EXTENDED', 'NEGOTIATING'].includes(q.tracking.status)).length,
      pending: quotations.filter(q => q.tracking.status === 'DEPOSIT_PENDING').length,
      confirmed: quotations.filter(q => q.tracking.status === 'CONFIRMED').length,
      expired: quotations.filter(q => q.tracking.status === 'EXPIRED').length
    };
    
    return stats;
  }, [quotations]);
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)` }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 40 }} />
              Sistema Avanzado de Cotización de Grupos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gestión inteligente con selección manual de hoteles y control de visibilidad
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`Usuario: ${userRole}`} 
                color="primary" 
                icon={<PersonIcon />}
                sx={{ mr: 1 }}
              />
              {permissions.canSeeAllPrices && (
                <Chip 
                  label="Acceso Total a Precios" 
                  color="success" 
                  icon={<VisibilityIcon />}
                  sx={{ mr: 1 }}
                />
              )}
              {permissions.canModifyPolicies && (
                <Chip 
                  label="Puede Modificar Políticas" 
                  color="warning" 
                  icon={<PolicyIcon />}
                />
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="column" spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogs({ ...dialogs, newQuotation: true })}
                size="large"
                sx={{ 
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                  boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                }}
              >
                Nueva Cotización Grupal
              </Button>
              
              {userRole === 'ADMIN' && (
                <Button
                  variant="outlined"
                  startIcon={visibilitySettings.globalTransparency ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  onClick={() => handleVisibilityToggle()}
                  size="small"
                >
                  {visibilitySettings.globalTransparency ? 'Ocultar' : 'Mostrar'} Precios Globalmente
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="caption">
                    Cotizaciones Activas
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {statistics.active}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main, width: 56, height: 56 }}>
                  <QuoteIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="caption">
                    Esperando Depósito
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {statistics.pending}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main, width: 56, height: 56 }}>
                  <PaymentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="caption">
                    Confirmadas
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {statistics.confirmed}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main, width: 56, height: 56 }}>
                  <VerifiedIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="caption">
                    Expiradas
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {statistics.expired}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.main, width: 56, height: 56 }}>
                  <EventBusyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Continuará en la siguiente parte... */}
      
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

export default EnhancedGroupQuotationSystem;