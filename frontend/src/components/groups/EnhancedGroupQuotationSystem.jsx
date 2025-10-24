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
  RadioGroup,
  ListItemButton,
  Skeleton,
  Fab,
  Drawer,
  Box as MuiBox,
  Container,
  useTheme,
  useMediaQuery,
  TablePagination,
  FormHelperText,
  ButtonGroup,
  ToggleButton as MuiToggleButton,
  Breadcrumbs,
  Link,
  Slider,
  Menu,
  Popover,
  Zoom,
  Fade,
  Grow,
  Slide
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
  ToggleOff as ToggleOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Update as UpdateIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  MoreHoriz as MoreHorizIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ArrowDropUp as ArrowUpIcon,
  ArrowDropDown as ArrowDownIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  FirstPage as FirstIcon,
  LastPage as LastIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  Palette as ThemeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as ExitFullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Autorenew as AutorenewIcon,
  Cached as CachedIcon,
  CloudUpload as CloudIcon,
  CloudDownload as CloudDownloadIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as PerformanceIcon,
  BugReport as BugIcon,
  Code as CodeIcon,
  IntegrationInstructions as APIIcon,
  WebAsset as WebIcon,
  Smartphone as MobileIcon,
  Tablet as TabletIcon,
  Computer as DesktopIcon,
  Tv as TVIcon,
  Watch as WatchIcon,
  SportsEsports as GameIcon,
  Headphones as AudioIcon,
  Mic as MicIcon,
  Videocam as VideoIcon,
  PhotoCamera as CameraIcon,
  Image as ImageIcon,
  Brush as BrushIcon,
  ColorLens as ColorIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  FormatAlignJustify as AlignJustifyIcon,
  FormatListBulleted as ListIcon,
  FormatListNumbered as NumberedListIcon,
  IndeterminateCheckBox as IndeterminateIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPrevIcon,
  FastForward as FastForwardIcon,
  FastRewind as FastRewindIcon,
  VolumeUp as VolumeUpIcon,
  VolumeDown as VolumeDownIcon,
  VolumeMute as MuteIcon,
  VolumeOff as VolumeOffIcon,
  Shuffle as ShuffleIcon,
  Repeat as RepeatIcon,
  RepeatOne as RepeatOneIcon,
  PlaylistAdd as PlaylistAddIcon,
  PlaylistPlay as PlaylistIcon,
  Queue as QueueIcon,
  QueueMusic as QueueMusicIcon,
  LibraryMusic as MusicLibraryIcon,
  LibraryBooks as LibraryIcon,
  LibraryAdd as LibraryAddIcon,
  Movie as MovieIcon,
  Theaters as TheatersIcon,
  SportsSoccer as SoccerIcon,
  SportsBasketball as BasketballIcon,
  SportsFootball as FootballIcon,
  SportsTennis as TennisIcon,
  SportsGolf as GolfIcon,
  Pool as SwimmingIcon,
  FitnessCenter as FitnessIcon,
  DirectionsRun as RunningIcon,
  DirectionsBike as BikeIcon,
  DirectionsWalk as WalkIcon,
  DirectionsCar as CarIcon,
  DirectionsBus as TransitIcon,
  DirectionsSubway as SubwayIcon,
  DirectionsTrain as TrainIcon,
  DirectionsBoat as BoatIcon,
  LocalTaxi as TaxiIcon,
  LocalShipping as ShippingIcon,
  LocalHospital as HospitalIcon,
  LocalPharmacy as PharmacyIcon,
  LocalMall as MallIcon,
  LocalGroceryStore as GroceryIcon,
  LocalDining as DiningIcon,
  LocalCafe as CafeIcon,
  LocalPizza as PizzaIcon,
  Cake as CakeIcon,
  ChildFriendly as ChildFriendlyIcon,
  MedicalServices as MedicalIcon,
  HealthAndSafety as SafetyIcon,
  Sanitizer as SanitizerIcon,
  Coronavirus as CovidIcon,
  Masks as MaskIcon,
  CleanHands as HandwashIcon,
  SocialDistance as DistanceIcon,
  Elderly as ElderlyIcon,
  PregnantWoman as PregnantIcon,
  Blind as BlindIcon,
  HearingDisabled as DeafIcon,
  WheelchairPickup as WheelchairIcon,
  AccessibleForward as AccessibleIcon2,
  NotAccessible as NotAccessibleIcon,
  ElevatorIcon,
  StairsIcon,
  EscalatorIcon,
  BathroomIcon,
  BathtubIcon,
  ShowerIcon,
  ExtensionOffIcon
} from '@mui/icons-material';

// Enhanced hotel database with more details
const HOTEL_DATABASE = {
  NAZARETH: [
    { 
      id: 'NAZ001', 
      name: 'Golden Crown Hotel', 
      category: 4, 
      basePrice: 85,
      email: 'reservations@goldencrown.com',
      phone: '+972-4-123-4567',
      address: 'Paul VI Street, Nazareth',
      amenities: ['wifi', 'parking', 'pool', 'spa', 'restaurant'],
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0,
      lastPriceUpdate: null
    },
    { 
      id: 'NAZ002', 
      name: 'Legacy Nazareth', 
      category: 4, 
      basePrice: 90,
      email: 'info@legacynazareth.com',
      phone: '+972-4-234-5678',
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0
    },
    { 
      id: 'NAZ003', 
      name: 'Ramada Nazareth', 
      category: 4, 
      basePrice: 95,
      email: 'nazareth@ramada.com',
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0
    },
    { 
      id: 'NAZ004', 
      name: 'Plaza Hotel', 
      category: 3, 
      basePrice: 65,
      email: 'plaza@nazareth-hotels.com',
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0
    }
  ],
  DEAD_SEA: [
    { 
      id: 'DS001', 
      name: 'Isrotel Dead Sea', 
      category: 5, 
      basePrice: 180,
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0
    },
    { 
      id: 'DS002', 
      name: 'David Dead Sea', 
      category: 5, 
      basePrice: 190,
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0
    }
  ],
  BETHLEHEM: [
    { 
      id: 'BET001', 
      name: 'Manger Square Hotel', 
      category: 4, 
      basePrice: 75,
      selected: false,
      canSeeCompetitorPrices: false,
      priceUpdateCount: 0
    }
  ]
};

// Meal plans configuration
const MEAL_PLANS = {
  BB: { 
    code: 'BB',
    name: 'Bed & Breakfast',
    description: 'Alojamiento con desayuno',
    icon: <BreakfastIcon />,
    pricePerPerson: 0
  },
  HB: { 
    code: 'HB',
    name: 'Half Board',
    description: 'Media pensión (desayuno y cena)',
    icon: <RestaurantIcon />,
    pricePerPerson: 35
  },
  FB: { 
    code: 'FB',
    name: 'Full Board',
    description: 'Pensión completa (desayuno, almuerzo y cena)',
    icon: <DiningIcon />,
    pricePerPerson: 60
  },
  AI: { 
    code: 'AI',
    name: 'All Inclusive',
    description: 'Todo incluido',
    icon: <LocalBarIcon />,
    pricePerPerson: 100
  }
};

// Payment and cancellation policies
const PAYMENT_POLICIES = {
  STANDARD: {
    deposit: 500,
    depositPercentage: 0.20, // 20%
    finalPaymentDays: 30,
    description: 'Depósito del 20% (mínimo $500), pago final 30 días antes'
  },
  FLEXIBLE: {
    deposit: 300,
    depositPercentage: 0.15,
    finalPaymentDays: 15,
    description: 'Depósito del 15% (mínimo $300), pago final 15 días antes'
  },
  STRICT: {
    deposit: 1000,
    depositPercentage: 0.30,
    finalPaymentDays: 45,
    description: 'Depósito del 30% (mínimo $1000), pago final 45 días antes'
  }
};

const CANCELLATION_POLICIES = {
  FLEXIBLE: {
    name: 'Flexible',
    rules: [
      { daysBefor: 30, penalty: 0 },
      { daysBefore: 15, penalty: 0.25 },
      { daysBefore: 7, penalty: 0.50 },
      { daysBefore: 0, penalty: 1.00 }
    ]
  },
  MODERATE: {
    name: 'Moderada',
    rules: [
      { daysBefore: 45, penalty: 0.10 },
      { daysBefore: 30, penalty: 0.25 },
      { daysBefore: 15, penalty: 0.50 },
      { daysBefore: 7, penalty: 0.75 },
      { daysBefore: 0, penalty: 1.00 }
    ]
  },
  STRICT: {
    name: 'Estricta',
    rules: [
      { daysBefore: 60, penalty: 0.25 },
      { daysBefore: 30, penalty: 0.50 },
      { daysBefore: 0, penalty: 1.00 }
    ]
  }
};

// Quotation status workflow
const QUOTATION_STATUS = {
  DRAFT: { 
    label: 'Borrador', 
    color: 'default', 
    icon: <EditIcon />,
    nextSteps: ['SENT']
  },
  SENT: { 
    label: 'Enviada', 
    color: 'info', 
    icon: <SendIcon />,
    nextSteps: ['WAITING', 'CANCELLED']
  },
  WAITING: { 
    label: 'Esperando Respuestas', 
    color: 'warning', 
    icon: <WaitingIcon />,
    nextSteps: ['RECEIVED', 'EXTENDED', 'EXPIRED']
  },
  RECEIVED: { 
    label: 'Respuestas Recibidas', 
    color: 'success', 
    icon: <CheckCircleIcon />,
    nextSteps: ['COMPARING', 'EXTENDED']
  },
  COMPARING: { 
    label: 'Comparando', 
    color: 'primary', 
    icon: <CompareIcon />,
    nextSteps: ['SELECTED', 'NEGOTIATING']
  },
  NEGOTIATING: {
    label: 'Negociando',
    color: 'warning',
    icon: <CompareIcon />,
    nextSteps: ['SELECTED', 'CANCELLED']
  },
  SELECTED: { 
    label: 'Seleccionada', 
    color: 'success', 
    icon: <ConfirmedIcon />,
    nextSteps: ['DEPOSIT_PENDING']
  },
  DEPOSIT_PENDING: {
    label: 'Esperando Depósito',
    color: 'warning',
    icon: <PaidIcon />,
    nextSteps: ['CONFIRMED', 'CANCELLED']
  },
  CONFIRMED: { 
    label: 'Confirmada', 
    color: 'success', 
    icon: <VerifiedIcon />,
    nextSteps: ['IN_PROGRESS', 'CANCELLED']
  },
  IN_PROGRESS: {
    label: 'En Proceso',
    color: 'info',
    icon: <ProgressIcon />,
    nextSteps: ['COMPLETED', 'ISSUES']
  },
  COMPLETED: {
    label: 'Completada',
    color: 'success',
    icon: <CheckCircleIcon />,
    nextSteps: []
  },
  CANCELLED: { 
    label: 'Cancelada', 
    color: 'error', 
    icon: <CancelIcon />,
    nextSteps: []
  },
  EXPIRED: {
    label: 'Expirada',
    color: 'error',
    icon: <TimerIcon />,
    nextSteps: ['DRAFT']
  },
  EXTENDED: {
    label: 'Extendida',
    color: 'info',
    icon: <UpdateIcon />,
    nextSteps: ['RECEIVED', 'EXPIRED']
  }
};

const EnhancedGroupQuotationSystem = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Main state
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // User permissions state
  const [userRole, setUserRole] = useState('ADMIN'); // ADMIN, MANAGER, AGENT, CLIENT
  const [permissions, setPermissions] = useState({
    canCreateQuotation: true,
    canEditQuotation: true,
    canDeleteQuotation: true,
    canViewAllPrices: true,
    canTogglePriceVisibility: true,
    canApproveDiscounts: true,
    canModifyPolicies: true,
    canExtendDeadlines: true,
    canProcessPayments: true
  });
  
  // New quotation form state
  const [newQuotation, setNewQuotation] = useState({
    // Basic Information
    id: null,
    groupName: '',
    clientType: 'B2B', // B2B, B2B2C, B2C
    clientInfo: {
      agencyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      country: '',
      language: 'ES',
      preferredCommunication: 'EMAIL' // EMAIL, WHATSAPP, PHONE
    },
    
    // Group Details
    groupInfo: {
      totalPax: 30,
      adults: 28,
      children: 2,
      infants: 0,
      freeSpots: 1,
      singleRooms: 2,
      doubleRooms: 13,
      tripleRooms: 0,
      quadRooms: 0,
      specialNeeds: {
        wheelchair: 0,
        dietary: [],
        medical: [],
        other: ''
      },
      groupType: 'RELIGIOUS', // CORPORATE, EDUCATIONAL, LEISURE, RELIGIOUS, SPORTS
      ageRange: {
        min: 25,
        max: 70
      }
    },
    
    // Itinerary
    itinerary: {
      arrivalDate: '',
      departureDate: '',
      totalNights: 9,
      zones: [],
      flexibleDates: false,
      alternativeDates: []
    },
    
    // Hotel Selection
    hotelSelection: {
      method: 'MANUAL', // ALL, MANUAL, CATEGORY, SMART
      selectedHotels: [], // Manually selected hotels
      categoryFilter: null, // 3, 4, 5 stars
      priceRange: {
        min: null,
        max: null
      },
      mustHaveAmenities: [],
      preferredBrands: []
    },
    
    // Services
    services: {
      mealPlan: 'HB', // BB, HB, FB, AI
      transport: {
        required: true,
        type: 'BUS_LUXURY',
        includeAirportTransfer: true,
        dailyTransport: true
      },
      guide: {
        required: true,
        type: 'PROFESSIONAL',
        languages: ['Spanish', 'English'],
        specialization: 'RELIGIOUS'
      },
      entrances: {
        included: [],
        optional: []
      },
      extras: []
    },
    
    // Competition Settings
    competitionSettings: {
      enableCompetition: true,
      showPricesToHotels: false, // NEW: By default hotels can't see other prices
      hotelPriceVisibility: {}, // NEW: Per-hotel visibility settings
      maxPriceUpdates: 2, // NEW: Maximum times a hotel can update price
      allowNegotiation: true,
      deadlineHours: 168, // 7 days default
      autoExtend: false,
      extensionHours: 168 // 7 more days if extended
    },
    
    // Policies
    policies: {
      payment: 'STANDARD',
      cancellation: 'MODERATE',
      customTerms: '',
      requiresApproval: false,
      approvalLevel: 'MANAGER' // MANAGER, DIRECTOR, ADMIN
    },
    
    // Tracking
    tracking: {
      status: 'DRAFT',
      createdAt: null,
      createdBy: null,
      sentAt: null,
      expiresAt: null,
      extendedAt: null,
      confirmedAt: null,
      depositReceivedAt: null,
      completedAt: null,
      lastModified: null,
      modifiedBy: null
    },
    
    // Financial
    financial: {
      estimatedTotal: 0,
      quotedTotal: 0,
      depositAmount: 0,
      depositPaid: false,
      depositPaidAt: null,
      finalPaymentAmount: 0,
      finalPaymentPaid: false,
      finalPaymentPaidAt: null,
      commission: 0.10,
      currency: 'USD'
    },
    
    // Responses
    responses: [],
    selectedResponse: null,
    negotiations: [],
    
    // Audit trail
    auditLog: []
  });
  
  // Dialog states
  const [openNewQuotation, setOpenNewQuotation] = useState(false);
  const [openHotelSelector, setOpenHotelSelector] = useState(false);
  const [openAddNewHotel, setOpenAddNewHotel] = useState(false);
  const [openPriceVisibilitySettings, setOpenPriceVisibilitySettings] = useState(false);
  const [openExtendDialog, setOpenExtendDialog] = useState(false);
  const [openDepositDialog, setOpenDepositDialog] = useState(false);
  const [openTrackingDialog, setOpenTrackingDialog] = useState(false);
  const [openComparisonDialog, setOpenComparisonDialog] = useState(false);
  const [openNegotiationDialog, setOpenNegotiationDialog] = useState(false);
  
  // New hotel form
  const [newHotel, setNewHotel] = useState({
    name: '',
    category: 4,
    zone: '',
    email: '',
    phone: '',
    contactPerson: '',
    address: '',
    website: '',
    notes: '',
    amenities: []
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'ALL',
    dateRange: 'ALL',
    client: '',
    zone: 'ALL'
  });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Load initial data
  useEffect(() => {
    loadQuotations();
    checkUserPermissions();
  }, []);
  
  // Check user permissions based on role
  const checkUserPermissions = () => {
    switch(userRole) {
      case 'ADMIN':
        setPermissions({
          canCreateQuotation: true,
          canEditQuotation: true,
          canDeleteQuotation: true,
          canViewAllPrices: true,
          canTogglePriceVisibility: true,
          canApproveDiscounts: true,
          canModifyPolicies: true,
          canExtendDeadlines: true,
          canProcessPayments: true
        });
        break;
      case 'MANAGER':
        setPermissions({
          canCreateQuotation: true,
          canEditQuotation: true,
          canDeleteQuotation: false,
          canViewAllPrices: true,
          canTogglePriceVisibility: true,
          canApproveDiscounts: true,
          canModifyPolicies: false,
          canExtendDeadlines: true,
          canProcessPayments: true
        });
        break;
      case 'AGENT':
        setPermissions({
          canCreateQuotation: true,
          canEditQuotation: true,
          canDeleteQuotation: false,
          canViewAllPrices: false,
          canTogglePriceVisibility: false,
          canApproveDiscounts: false,
          canModifyPolicies: false,
          canExtendDeadlines: false,
          canProcessPayments: false
        });
        break;
      case 'CLIENT':
        setPermissions({
          canCreateQuotation: true,
          canEditQuotation: false,
          canDeleteQuotation: false,
          canViewAllPrices: false,
          canTogglePriceVisibility: false,
          canApproveDiscounts: false,
          canModifyPolicies: false,
          canExtendDeadlines: true,
          canProcessPayments: true
        });
        break;
    }
  };
  
  // Load quotations
  const loadQuotations = async () => {
    setLoading(true);
    try {
      // Simulate API call
      const mockData = [
        {
          id: 'GRP-202411-0001',
          groupName: 'Pilgrimage November 2025',
          clientInfo: {
            agencyName: 'Holy Land Tours',
            contactPerson: 'John Smith'
          },
          tracking: {
            status: 'WAITING',
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          },
          responses: 5,
          financial: {
            estimatedTotal: 45000
          }
        }
      ];
      
      setQuotations(mockData);
    } catch (error) {
      console.error('Error loading quotations:', error);
      showSnackbar('Error loading quotations', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Hotel selection handler
  const handleHotelSelection = (hotelId, zone) => {
    setNewQuotation(prev => {
      const selectedHotels = [...prev.hotelSelection.selectedHotels];
      const hotelIndex = selectedHotels.findIndex(h => h.id === hotelId);
      
      if (hotelIndex > -1) {
        // Remove hotel
        selectedHotels.splice(hotelIndex, 1);
      } else {
        // Add hotel with default visibility settings
        selectedHotels.push({
          id: hotelId,
          zone: zone,
          canSeeCompetitorPrices: false, // Default: cannot see other prices
          maxPriceUpdates: 2,
          currentPriceUpdates: 0
        });
      }
      
      return {
        ...prev,
        hotelSelection: {
          ...prev.hotelSelection,
          selectedHotels
        }
      };
    });
  };
  
  // Toggle price visibility for specific hotel
  const toggleHotelPriceVisibility = (hotelId) => {
    if (!permissions.canTogglePriceVisibility) {
      showSnackbar('No tiene permisos para cambiar la visibilidad de precios', 'error');
      return;
    }
    
    setNewQuotation(prev => {
      const visibility = { ...prev.competitionSettings.hotelPriceVisibility };
      visibility[hotelId] = !visibility[hotelId];
      
      return {
        ...prev,
        competitionSettings: {
          ...prev.competitionSettings,
          hotelPriceVisibility: visibility
        }
      };
    });
    
    // Log the action
    addAuditLog('PRICE_VISIBILITY_TOGGLED', { hotelId });
  };
  
  // Add new hotel to database
  const handleAddNewHotel = async () => {
    try {
      // Validate hotel data
      if (!newHotel.name || !newHotel.email || !newHotel.zone) {
        showSnackbar('Por favor complete los campos requeridos', 'error');
        return;
      }
      
      // Add to database (simulated)
      const hotelData = {
        ...newHotel,
        id: `CUSTOM-${Date.now()}`,
        basePrice: 0,
        selected: true,
        canSeeCompetitorPrices: false,
        priceUpdateCount: 0,
        isCustom: true,
        addedBy: userRole,
        addedAt: new Date().toISOString()
      };
      
      // In real implementation, save to database
      console.log('Adding new hotel:', hotelData);
      
      // Add to selected hotels
      handleHotelSelection(hotelData.id, hotelData.zone);
      
      // Reset form and close dialog
      setNewHotel({
        name: '',
        category: 4,
        zone: '',
        email: '',
        phone: '',
        contactPerson: '',
        address: '',
        website: '',
        notes: '',
        amenities: []
      });
      setOpenAddNewHotel(false);
      
      showSnackbar('Hotel agregado exitosamente', 'success');
    } catch (error) {
      console.error('Error adding hotel:', error);
      showSnackbar('Error al agregar el hotel', 'error');
    }
  };
  
  // Extend quotation deadline
  const handleExtendDeadline = (quotationId) => {
    if (!permissions.canExtendDeadlines && userRole !== 'CLIENT') {
      showSnackbar('No tiene permisos para extender plazos', 'error');
      return;
    }
    
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        const newExpiry = new Date(q.tracking.expiresAt);
        newExpiry.setDate(newExpiry.getDate() + 7); // Add 7 days
        
        // Send notifications to selected hotels
        sendExtensionNotifications(q.hotelSelection.selectedHotels);
        
        return {
          ...q,
          tracking: {
            ...q.tracking,
            expiresAt: newExpiry,
            extendedAt: new Date().toISOString(),
            status: 'EXTENDED'
          }
        };
      }
      return q;
    }));
    
    showSnackbar('Plazo extendido por 7 días más', 'success');
    addAuditLog('DEADLINE_EXTENDED', { quotationId, days: 7 });
  };
  
  // Process deposit payment
  const handleDepositPayment = (quotationId, amount) => {
    if (!permissions.canProcessPayments) {
      showSnackbar('No tiene permisos para procesar pagos', 'error');
      return;
    }
    
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        return {
          ...q,
          tracking: {
            ...q.tracking,
            status: 'CONFIRMED'
          },
          financial: {
            ...q.financial,
            depositAmount: amount,
            depositPaid: true,
            depositPaidAt: new Date().toISOString()
          }
        };
      }
      return q;
    }));
    
    // Create group in system for tracking
    createGroupTracking(quotationId);
    
    showSnackbar(`Depósito de $${amount} procesado exitosamente`, 'success');
    addAuditLog('DEPOSIT_RECEIVED', { quotationId, amount });
  };
  
  // Create group tracking after deposit
  const createGroupTracking = (quotationId) => {
    // Create a new group entity for ongoing tracking
    const group = {
      id: `GROUP-${quotationId}`,
      quotationId,
      status: 'ACTIVE',
      milestones: [
        { name: 'Deposit Received', completed: true, date: new Date() },
        { name: 'Final Payment', completed: false, dueDate: null },
        { name: 'Rooming List', completed: false, dueDate: null },
        { name: 'Special Requests', completed: false, dueDate: null },
        { name: 'Check-in', completed: false, date: null },
        { name: 'Check-out', completed: false, date: null }
      ]
    };
    
    console.log('Group tracking created:', group);
  };
  
  // Allow hotel to update price (with limits)
  const handleHotelPriceUpdate = (quotationId, hotelId, newPrice) => {
    const quotation = quotations.find(q => q.id === quotationId);
    const hotel = quotation?.hotelSelection.selectedHotels.find(h => h.id === hotelId);
    
    if (!hotel) {
      showSnackbar('Hotel no encontrado', 'error');
      return;
    }
    
    // Check if quotation is confirmed
    if (quotation.tracking.status === 'CONFIRMED') {
      showSnackbar('No se pueden modificar precios después de la confirmación', 'error');
      return;
    }
    
    // Check update limit
    if (hotel.currentPriceUpdates >= hotel.maxPriceUpdates) {
      showSnackbar('Ha alcanzado el límite de actualizaciones de precio. Contacte al administrador.', 'warning');
      return;
    }
    
    // Update price
    setQuotations(prev => prev.map(q => {
      if (q.id === quotationId) {
        const updatedHotels = q.hotelSelection.selectedHotels.map(h => {
          if (h.id === hotelId) {
            return {
              ...h,
              currentPriceUpdates: h.currentPriceUpdates + 1,
              lastPriceUpdate: new Date().toISOString()
            };
          }
          return h;
        });
        
        return {
          ...q,
          hotelSelection: {
            ...q.hotelSelection,
            selectedHotels: updatedHotels
          }
        };
      }
      return q;
    }));
    
    showSnackbar('Precio actualizado exitosamente', 'success');
    addAuditLog('HOTEL_PRICE_UPDATED', { quotationId, hotelId, newPrice });
  };
  
  // Send extension notifications
  const sendExtensionNotifications = (hotels) => {
    hotels.forEach(hotel => {
      // Simulate sending email
      console.log(`Sending extension notification to hotel ${hotel.id}`);
    });
  };
  
  // Add audit log entry
  const addAuditLog = (action, details) => {
    const logEntry = {
      action,
      details,
      user: userRole,
      timestamp: new Date().toISOString()
    };
    
    console.log('Audit log:', logEntry);
  };
  
  // Calculate total with selected services
  const calculateTotal = () => {
    const { groupInfo, itinerary, services } = newQuotation;
    const totalPax = groupInfo.totalPax - groupInfo.freeSpots;
    
    let total = 0;
    
    // Add accommodation estimate
    total += (groupInfo.singleRooms * 100 + groupInfo.doubleRooms * 150 + groupInfo.tripleRooms * 180) * itinerary.totalNights;
    
    // Add meal plan
    const mealPlanCost = MEAL_PLANS[services.mealPlan].pricePerPerson * totalPax * itinerary.totalNights;
    total += mealPlanCost;
    
    // Add services
    if (services.transport.required) {
      total += 500 * itinerary.totalNights; // Transport estimate
    }
    
    if (services.guide.required) {
      total += 350 * itinerary.totalNights; // Guide estimate
    }
    
    return total;
  };
  
  // Show snackbar
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Generate quotation ID
  const generateQuotationId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GRP-${year}${month}-${random}`;
  };
  
  // Send quotation to selected hotels
  const sendQuotation = async () => {
    try {
      setLoading(true);
      
      const quotationId = generateQuotationId();
      const quotationData = {
        ...newQuotation,
        id: quotationId,
        tracking: {
          ...newQuotation.tracking,
          status: 'SENT',
          createdAt: new Date().toISOString(),
          createdBy: userRole,
          sentAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + newQuotation.competitionSettings.deadlineHours * 60 * 60 * 1000).toISOString()
        }
      };
      
      // Send to selected hotels only
      const selectedHotels = newQuotation.hotelSelection.selectedHotels;
      
      if (selectedHotels.length === 0) {
        showSnackbar('Por favor seleccione al menos un hotel', 'error');
        return;
      }
      
      // Prepare email data for each hotel
      selectedHotels.forEach(hotel => {
        const emailData = {
          hotelId: hotel.id,
          quotationId: quotationId,
          groupName: newQuotation.groupName,
          canSeeCompetitorPrices: newQuotation.competitionSettings.hotelPriceVisibility[hotel.id] || false,
          deadline: quotationData.tracking.expiresAt,
          responseUrl: `https://providers.spirittours.com/quote/${quotationId}/${hotel.id}`
        };
        
        console.log('Sending to hotel:', emailData);
      });
      
      // Add to quotations list
      setQuotations([quotationData, ...quotations]);
      
      // Close dialog and reset
      setOpenNewQuotation(false);
      resetQuotationForm();
      
      showSnackbar(`Cotización ${quotationId} enviada a ${selectedHotels.length} hoteles`, 'success');
      addAuditLog('QUOTATION_SENT', { quotationId, hotelCount: selectedHotels.length });
      
    } catch (error) {
      console.error('Error sending quotation:', error);
      showSnackbar('Error al enviar la cotización', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset quotation form
  const resetQuotationForm = () => {
    setNewQuotation({
      id: null,
      groupName: '',
      clientType: 'B2B',
      clientInfo: {
        agencyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        country: '',
        language: 'ES',
        preferredCommunication: 'EMAIL'
      },
      groupInfo: {
        totalPax: 30,
        adults: 28,
        children: 2,
        infants: 0,
        freeSpots: 1,
        singleRooms: 2,
        doubleRooms: 13,
        tripleRooms: 0,
        quadRooms: 0,
        specialNeeds: {
          wheelchair: 0,
          dietary: [],
          medical: [],
          other: ''
        },
        groupType: 'RELIGIOUS',
        ageRange: {
          min: 25,
          max: 70
        }
      },
      itinerary: {
        arrivalDate: '',
        departureDate: '',
        totalNights: 9,
        zones: [],
        flexibleDates: false,
        alternativeDates: []
      },
      hotelSelection: {
        method: 'MANUAL',
        selectedHotels: [],
        categoryFilter: null,
        priceRange: {
          min: null,
          max: null
        },
        mustHaveAmenities: [],
        preferredBrands: []
      },
      services: {
        mealPlan: 'HB',
        transport: {
          required: true,
          type: 'BUS_LUXURY',
          includeAirportTransfer: true,
          dailyTransport: true
        },
        guide: {
          required: true,
          type: 'PROFESSIONAL',
          languages: ['Spanish', 'English'],
          specialization: 'RELIGIOUS'
        },
        entrances: {
          included: [],
          optional: []
        },
        extras: []
      },
      competitionSettings: {
        enableCompetition: true,
        showPricesToHotels: false,
        hotelPriceVisibility: {},
        maxPriceUpdates: 2,
        allowNegotiation: true,
        deadlineHours: 168,
        autoExtend: false,
        extensionHours: 168
      },
      policies: {
        payment: 'STANDARD',
        cancellation: 'MODERATE',
        customTerms: '',
        requiresApproval: false,
        approvalLevel: 'MANAGER'
      },
      tracking: {
        status: 'DRAFT',
        createdAt: null,
        createdBy: null,
        sentAt: null,
        expiresAt: null,
        extendedAt: null,
        confirmedAt: null,
        depositReceivedAt: null,
        completedAt: null,
        lastModified: null,
        modifiedBy: null
      },
      financial: {
        estimatedTotal: 0,
        quotedTotal: 0,
        depositAmount: 0,
        depositPaid: false,
        depositPaidAt: null,
        finalPaymentAmount: 0,
        finalPaymentPaid: false,
        finalPaymentPaidAt: null,
        commission: 0.10,
        currency: 'USD'
      },
      responses: [],
      selectedResponse: null,
      negotiations: [],
      auditLog: []
    });
    setCurrentStep(0);
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Sistema Avanzado de Cotización de Grupos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión inteligente con control de visibilidad de precios y competencia limitada
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenNewQuotation(true)}
                size="large"
                disabled={!permissions.canCreateQuotation}
              >
                Nueva Cotización
              </Button>
            </Stack>
          </Grid>
        </Grid>
        
        {/* User role indicator */}
        <Box sx={{ mt: 2 }}>
          <Chip 
            label={`Rol: ${userRole}`}
            color="primary"
            icon={<AdminIcon />}
          />
        </Box>
      </Paper>
      
      {/* Main content continues... */}
      {/* Due to length, I'll create the dialog components */}
      
      {/* New Quotation Dialog */}
      <Dialog
        open={openNewQuotation}
        onClose={() => setOpenNewQuotation(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Nueva Cotización de Grupo
          <Typography variant="caption" display="block">
            Los hoteles NO podrán ver precios de competidores por defecto
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={currentStep} orientation="vertical">
            {/* Step 1: Group Information */}
            <Step>
              <StepLabel>Información del Grupo</StepLabel>
              <StepContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nombre del Grupo"
                      value={newQuotation.groupName}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        groupName: e.target.value
                      })}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="País de Origen"
                      value={newQuotation.clientInfo.country}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        clientInfo: { ...newQuotation.clientInfo, country: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Total Personas"
                      type="number"
                      value={newQuotation.groupInfo.totalPax}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        groupInfo: { ...newQuotation.groupInfo, totalPax: parseInt(e.target.value) }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={9}>
                    <FormControl fullWidth>
                      <InputLabel>Plan de Comidas</InputLabel>
                      <Select
                        value={newQuotation.services.mealPlan}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          services: { ...newQuotation.services, mealPlan: e.target.value }
                        })}
                        label="Plan de Comidas"
                      >
                        {Object.entries(MEAL_PLANS).map(([key, plan]) => (
                          <MenuItem key={key} value={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {plan.icon}
                              <Box sx={{ ml: 2 }}>
                                <Typography variant="body1">{plan.name}</Typography>
                                <Typography variant="caption">{plan.description}</Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Button onClick={() => setCurrentStep(1)} variant="contained">
                    Siguiente
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            {/* Step 2: Hotel Selection */}
            <Step>
              <StepLabel>Selección de Hoteles</StepLabel>
              <StepContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Control de Transparencia</AlertTitle>
                  Por defecto, los hoteles NO pueden ver los precios de sus competidores. 
                  Puede activar esta opción individualmente para cada hotel.
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenAddNewHotel(true)}
                      sx={{ mb: 2 }}
                    >
                      Agregar Hotel No Registrado
                    </Button>
                  </Grid>
                  
                  {Object.entries(HOTEL_DATABASE).map(([zone, hotels]) => (
                    <Grid item xs={12} key={zone}>
                      <Typography variant="h6" gutterBottom>
                        {zone}
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell padding="checkbox">Seleccionar</TableCell>
                              <TableCell>Hotel</TableCell>
                              <TableCell>Categoría</TableCell>
                              <TableCell>Ver Precios Competencia</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {hotels.map(hotel => {
                              const isSelected = newQuotation.hotelSelection.selectedHotels.some(h => h.id === hotel.id);
                              const canSeePrices = newQuotation.competitionSettings.hotelPriceVisibility[hotel.id] || false;
                              
                              return (
                                <TableRow key={hotel.id}>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      checked={isSelected}
                                      onChange={() => handleHotelSelection(hotel.id, zone)}
                                    />
                                  </TableCell>
                                  <TableCell>{hotel.name}</TableCell>
                                  <TableCell>
                                    <Rating value={hotel.category} readOnly size="small" />
                                  </TableCell>
                                  <TableCell>
                                    <FormControlLabel
                                      control={
                                        <Switch
                                          checked={canSeePrices}
                                          onChange={() => toggleHotelPriceVisibility(hotel.id)}
                                          disabled={!isSelected || !permissions.canTogglePriceVisibility}
                                        />
                                      }
                                      label={canSeePrices ? 'Sí' : 'No'}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={() => setCurrentStep(0)}>
                    Anterior
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(2)} 
                    variant="contained"
                    disabled={newQuotation.hotelSelection.selectedHotels.length === 0}
                  >
                    Siguiente ({newQuotation.hotelSelection.selectedHotels.length} hoteles seleccionados)
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            {/* Step 3: Competition Settings */}
            <Step>
              <StepLabel>Configuración de Competencia</StepLabel>
              <StepContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      <AlertTitle>Límites de Modificación</AlertTitle>
                      Los hoteles podrán modificar sus precios máximo {newQuotation.competitionSettings.maxPriceUpdates} veces.
                      Después deberán contactar al administrador.
                    </Alert>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Plazo para Responder (días)"
                      type="number"
                      value={newQuotation.competitionSettings.deadlineHours / 24}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        competitionSettings: {
                          ...newQuotation.competitionSettings,
                          deadlineHours: parseInt(e.target.value) * 24
                        }
                      })}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">días</InputAdornment>
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Máximo de Actualizaciones de Precio"
                      type="number"
                      value={newQuotation.competitionSettings.maxPriceUpdates}
                      onChange={(e) => setNewQuotation({
                        ...newQuotation,
                        competitionSettings: {
                          ...newQuotation.competitionSettings,
                          maxPriceUpdates: parseInt(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={newQuotation.competitionSettings.allowNegotiation}
                          onChange={(e) => setNewQuotation({
                            ...newQuotation,
                            competitionSettings: {
                              ...newQuotation.competitionSettings,
                              allowNegotiation: e.target.checked
                            }
                          })}
                        />
                      }
                      label="Permitir negociación después de la primera oferta"
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={() => setCurrentStep(1)}>
                    Anterior
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} variant="contained">
                    Siguiente
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            {/* Step 4: Payment Policies */}
            <Step>
              <StepLabel>Políticas de Pago y Cancelación</StepLabel>
              <StepContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Política de Pago</InputLabel>
                      <Select
                        value={newQuotation.policies.payment}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          policies: { ...newQuotation.policies, payment: e.target.value }
                        })}
                        label="Política de Pago"
                        disabled={!permissions.canModifyPolicies}
                      >
                        {Object.entries(PAYMENT_POLICIES).map(([key, policy]) => (
                          <MenuItem key={key} value={key}>
                            <Box>
                              <Typography variant="body1">{key}</Typography>
                              <Typography variant="caption">{policy.description}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Política de Cancelación</InputLabel>
                      <Select
                        value={newQuotation.policies.cancellation}
                        onChange={(e) => setNewQuotation({
                          ...newQuotation,
                          policies: { ...newQuotation.policies, cancellation: e.target.value }
                        })}
                        label="Política de Cancelación"
                        disabled={!permissions.canModifyPolicies}
                      >
                        {Object.entries(CANCELLATION_POLICIES).map(([key, policy]) => (
                          <MenuItem key={key} value={key}>
                            {policy.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {!permissions.canModifyPolicies && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        Solo administradores pueden modificar las políticas. 
                        Contacte a su supervisor para cambios.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button onClick={() => setCurrentStep(2)}>
                    Anterior
                  </Button>
                  <Button 
                    onClick={sendQuotation} 
                    variant="contained"
                    color="primary"
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    disabled={loading}
                  >
                    Enviar Cotización
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>
      
      {/* Add New Hotel Dialog */}
      <Dialog
        open={openAddNewHotel}
        onClose={() => setOpenAddNewHotel(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Agregar Hotel No Registrado</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Si el hotel no está en nuestra base de datos, agregue la información para contactarlo.
          </Alert>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nombre del Hotel"
                value={newHotel.name}
                onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Zona/Ciudad</InputLabel>
                <Select
                  value={newHotel.zone}
                  onChange={(e) => setNewHotel({ ...newHotel, zone: e.target.value })}
                  label="Zona/Ciudad"
                  required
                >
                  <MenuItem value="NAZARETH">Nazaret</MenuItem>
                  <MenuItem value="DEAD_SEA">Mar Muerto</MenuItem>
                  <MenuItem value="BETHLEHEM">Belén</MenuItem>
                  <MenuItem value="JERUSALEM">Jerusalén</MenuItem>
                  <MenuItem value="OTHER">Otra</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Rating
                value={newHotel.category}
                onChange={(e, value) => setNewHotel({ ...newHotel, category: value })}
              />
              <FormHelperText>Categoría del Hotel</FormHelperText>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email de Reservas"
                type="email"
                value={newHotel.email}
                onChange={(e) => setNewHotel({ ...newHotel, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={newHotel.phone}
                onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Persona de Contacto"
                value={newHotel.contactPerson}
                onChange={(e) => setNewHotel({ ...newHotel, contactPerson: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={newHotel.address}
                onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sitio Web"
                value={newHotel.website}
                onChange={(e) => setNewHotel({ ...newHotel, website: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas / Información Adicional"
                multiline
                rows={3}
                value={newHotel.notes}
                onChange={(e) => setNewHotel({ ...newHotel, notes: e.target.value })}
                placeholder="Cualquier información que nos ayude a contactar o identificar el hotel"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddNewHotel(false)}>Cancelar</Button>
          <Button onClick={handleAddNewHotel} variant="contained">
            Agregar y Seleccionar
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
    </Box>
  );
};

export default EnhancedGroupQuotationSystem;