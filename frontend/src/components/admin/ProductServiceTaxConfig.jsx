import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  Collapse,
  InputAdornment,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  CircularProgress,
  Checkbox,
  FormGroup,
  Radio,
  RadioGroup,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tab,
  Tabs,
  Avatar,
  AvatarGroup,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack
} from '@mui/material';

import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Category as CategoryIcon,
  Public as PublicIcon,
  AttachMoney as AttachMoneyIcon,
  LocalOffer as LocalOfferIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Calculate as CalculateIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Language as LanguageIcon,
  Flag as FlagIcon,
  Store as StoreIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon,
  AccountBalance as AccountBalanceIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Tour as TourIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  DirectionsCar as DirectionsCarIcon,
  Restaurant as RestaurantIcon,
  SportsEsports as SportsEsportsIcon,
  Spa as SpaIcon,
  Beach as BeachIcon,
  Hiking as HikingIcon,
  Museum as MuseumIcon,
  TheaterComedy as TheaterComedyIcon,
  PhotoCamera as PhotoCameraIcon,
  School as SchoolIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Elderly as ElderlyIcon,
  ChildCare as ChildCareIcon,
  Accessible as AccessibleIcon,
  MoneyOff as MoneyOffIcon,
  Percent as PercentIcon,
  TaxiAlert as TaxiAlertIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  CreditCard as CreditCardIcon,
  LocalAtm as LocalAtmIcon
} from '@mui/icons-material';

// Country configuration with tax details
const COUNTRIES = {
  USA: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    taxName: 'Sales Tax',
    defaultTaxRate: 0.08,
    taxIdFormat: 'EIN',
    invoicePrefix: 'USA',
    dateFormat: 'MM/DD/YYYY',
    phonePrefix: '+1',
    exemptionRules: ['Non-profit', 'Government', 'Reseller', 'Educational']
  },
  MEX: {
    code: 'MX',
    name: 'Mexico',
    currency: 'MXN',
    taxName: 'IVA',
    defaultTaxRate: 0.16,
    taxIdFormat: 'RFC',
    invoicePrefix: 'MEX',
    requiresCFDI: true,
    dateFormat: 'DD/MM/YYYY',
    phonePrefix: '+52',
    exemptionRules: ['Frontera', 'Exportación', 'Educativo', 'Médico']
  },
  DUB: {
    code: 'AE',
    name: 'Dubai/UAE',
    currency: 'AED',
    taxName: 'VAT',
    defaultTaxRate: 0.05,
    taxIdFormat: 'TRN',
    invoicePrefix: 'DUB',
    dateFormat: 'DD/MM/YYYY',
    phonePrefix: '+971',
    exemptionRules: ['Healthcare', 'Education', 'Export', 'Residential']
  },
  ESP: {
    code: 'ES',
    name: 'Spain',
    currency: 'EUR',
    taxName: 'IVA',
    defaultTaxRate: 0.21,
    reducedRate: 0.10,
    superReducedRate: 0.04,
    taxIdFormat: 'NIF/CIF',
    invoicePrefix: 'ESP',
    dateFormat: 'DD/MM/YYYY',
    phonePrefix: '+34',
    exemptionRules: ['Intracomunitario', 'Exportación', 'Sanitario', 'Educativo']
  },
  ISR: {
    code: 'IL',
    name: 'Israel',
    currency: 'ILS',
    taxName: 'VAT',
    defaultTaxRate: 0.17,
    taxIdFormat: 'Company Number',
    invoicePrefix: 'ISR',
    dateFormat: 'DD/MM/YYYY',
    phonePrefix: '+972',
    exemptionRules: ['Export', 'Eilat Zone', 'Tourist Services', 'Educational']
  }
};

// Product/Service categories with icons and default tax settings
const PRODUCT_CATEGORIES = {
  // Tours & Experiences
  SPIRITUAL_TOUR: {
    name: 'Spiritual Tour',
    icon: <SpaIcon />,
    defaultTaxExempt: false,
    exemptInCountries: ['ISR'], // Religious tours exempt in Israel
    description: 'Spiritual and religious guided tours'
  },
  ADVENTURE_TOUR: {
    name: 'Adventure Tour',
    icon: <HikingIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    description: 'Adventure and outdoor activities'
  },
  CULTURAL_TOUR: {
    name: 'Cultural Tour',
    icon: <MuseumIcon />,
    defaultTaxExempt: false,
    exemptInCountries: ['ESP'], // Cultural activities reduced tax in Spain
    reducedTaxCountries: ['ESP'],
    description: 'Museums, historical sites, cultural experiences'
  },
  EDUCATIONAL_TOUR: {
    name: 'Educational Tour',
    icon: <SchoolIcon />,
    defaultTaxExempt: true, // Often exempt
    exemptInCountries: ['USA', 'MEX', 'ESP', 'ISR'],
    description: 'Educational programs and workshops'
  },
  
  // Transportation
  FLIGHT: {
    name: 'Flight',
    icon: <FlightIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    specialTaxRules: true, // International flights have special rules
    description: 'Domestic and international flights'
  },
  GROUND_TRANSPORT: {
    name: 'Ground Transport',
    icon: <DirectionsCarIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    description: 'Bus, car rental, transfers'
  },
  
  // Accommodation
  HOTEL: {
    name: 'Hotel',
    icon: <HotelIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    additionalTaxes: ['Tourism Tax', 'City Tax'],
    description: 'Hotel and accommodation services'
  },
  
  // Food & Beverage
  RESTAURANT: {
    name: 'Restaurant',
    icon: <RestaurantIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    reducedTaxCountries: ['ESP'], // Reduced rate in Spain for food
    description: 'Dining and catering services'
  },
  
  // Entertainment
  ENTERTAINMENT: {
    name: 'Entertainment',
    icon: <TheaterComedyIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    description: 'Shows, concerts, entertainment'
  },
  
  // Special Services
  MEDICAL_TOURISM: {
    name: 'Medical Tourism',
    icon: <BusinessIcon />,
    defaultTaxExempt: true, // Usually exempt
    exemptInCountries: ['USA', 'MEX', 'DUB', 'ESP', 'ISR'],
    description: 'Medical and health tourism services'
  },
  
  // Package Deals
  PACKAGE: {
    name: 'Package Deal',
    icon: <LocalOfferIcon />,
    defaultTaxExempt: false,
    mixedTaxRules: true, // Components may have different tax rates
    description: 'Combined tour packages'
  },
  
  // Digital Services
  DIGITAL_SERVICE: {
    name: 'Digital Service',
    icon: <SportsEsportsIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    description: 'Online tours, digital guides, virtual experiences'
  },
  
  // Photography
  PHOTOGRAPHY: {
    name: 'Photography Service',
    icon: <PhotoCameraIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    description: 'Professional photography during tours'
  },
  
  // Group Services
  GROUP_TOUR: {
    name: 'Group Tour',
    icon: <GroupsIcon />,
    defaultTaxExempt: false,
    volumeDiscountEligible: true,
    description: 'Group bookings and corporate events'
  },
  
  // Special Demographics
  SENIOR_TOUR: {
    name: 'Senior Tour',
    icon: <ElderlyIcon />,
    defaultTaxExempt: false,
    reducedTaxCountries: ['ESP'],
    description: 'Tours designed for senior citizens'
  },
  
  FAMILY_PACKAGE: {
    name: 'Family Package',
    icon: <FamilyRestroomIcon />,
    defaultTaxExempt: false,
    exemptInCountries: [],
    description: 'Family-oriented tour packages'
  },
  
  ACCESSIBLE_TOUR: {
    name: 'Accessible Tour',
    icon: <AccessibleIcon />,
    defaultTaxExempt: true, // Often exempt or reduced
    exemptInCountries: ['USA', 'ESP', 'ISR'],
    reducedTaxCountries: ['MEX', 'DUB'],
    description: 'Tours for people with disabilities'
  }
};

// Tax exemption reasons
const EXEMPTION_REASONS = {
  NON_PROFIT: 'Non-profit organization',
  GOVERNMENT: 'Government entity',
  EDUCATIONAL: 'Educational institution',
  MEDICAL: 'Medical/Healthcare service',
  RELIGIOUS: 'Religious organization',
  EXPORT: 'Export service',
  RESELLER: 'Reseller certificate',
  DIPLOMATIC: 'Diplomatic exemption',
  SPECIAL_ZONE: 'Special economic zone',
  VOLUME_AGREEMENT: 'Volume purchase agreement',
  SEASONAL: 'Seasonal promotion',
  LOYALTY: 'Loyalty program benefit',
  EMPLOYEE: 'Employee benefit',
  DISABILITY: 'Disability accommodation',
  AGE: 'Age-based exemption (senior/child)',
  CULTURAL: 'Cultural preservation',
  ENVIRONMENTAL: 'Environmental initiative',
  HUMANITARIAN: 'Humanitarian purpose',
  OTHER: 'Other (specify in notes)'
};

// Customer types for exemption eligibility
const CUSTOMER_TYPES = {
  B2C: { name: 'Individual Consumer', defaultExempt: false },
  B2B: { name: 'Business', defaultExempt: false },
  B2B2C: { name: 'Travel Agency', defaultExempt: false },
  NONPROFIT: { name: 'Non-Profit', defaultExempt: true },
  GOVERNMENT: { name: 'Government', defaultExempt: true },
  EDUCATIONAL: { name: 'Educational', defaultExempt: true },
  RELIGIOUS: { name: 'Religious', defaultExempt: true },
  MEDICAL: { name: 'Medical', defaultExempt: true }
};

const ProductServiceTaxConfig = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [exemptions, setExemptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterExemptStatus, setFilterExemptStatus] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  
  // Dialog states
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showTaxRuleDialog, setShowTaxRuleDialog] = useState(false);
  const [showExemptionDialog, setShowExemptionDialog] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Edit states
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [editingExemption, setEditingExemption] = useState(null);
  
  // Form states for new product/service
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'SPIRITUAL_TOUR',
    description: '',
    sku: '',
    basePrice: 0,
    currency: 'USD',
    taxSettings: {},
    active: true
  });
  
  // Form states for tax rule
  const [newTaxRule, setNewTaxRule] = useState({
    name: '',
    description: '',
    priority: 1,
    conditions: {
      countries: [],
      categories: [],
      customerTypes: [],
      priceRange: { min: null, max: null },
      dateRange: { start: null, end: null }
    },
    action: {
      type: 'EXEMPT', // EXEMPT, REDUCE, OVERRIDE
      value: 0
    },
    active: true
  });
  
  // Form states for exemption certificate
  const [newExemption, setNewExemption] = useState({
    customerName: '',
    customerId: '',
    customerType: 'B2C',
    reason: 'OTHER',
    certificateNumber: '',
    countries: [],
    products: [],
    categories: [],
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: null,
    notes: '',
    active: true
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Load data on component mount
  useEffect(() => {
    loadProducts();
    loadTaxRules();
    loadExemptions();
  }, []);
  
  // Initialize tax settings for each country when creating a product
  useEffect(() => {
    if (newProduct.category) {
      const category = PRODUCT_CATEGORIES[newProduct.category];
      const taxSettings = {};
      
      Object.entries(COUNTRIES).forEach(([countryCode, country]) => {
        const isExempt = category.defaultTaxExempt || 
                        category.exemptInCountries?.includes(countryCode);
        const isReduced = category.reducedTaxCountries?.includes(countryCode);
        
        let rate = country.defaultTaxRate;
        if (isExempt) {
          rate = 0;
        } else if (isReduced && country.reducedRate) {
          rate = country.reducedRate;
        }
        
        taxSettings[countryCode] = {
          exempt: isExempt,
          rate: rate,
          taxName: country.taxName,
          requiresCertificate: isExempt && !category.defaultTaxExempt
        };
      });
      
      setNewProduct(prev => ({ ...prev, taxSettings }));
    }
  }, [newProduct.category]);
  
  // Data loading functions (simulated)
  const loadProducts = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual API
      const mockProducts = [
        {
          id: 1,
          name: 'Jerusalem Holy Sites Tour',
          category: 'SPIRITUAL_TOUR',
          sku: 'JHST-001',
          basePrice: 150,
          currency: 'USD',
          description: '8-hour guided tour of Jerusalem holy sites',
          taxSettings: {
            USA: { exempt: false, rate: 0.08, taxName: 'Sales Tax' },
            MEX: { exempt: false, rate: 0.16, taxName: 'IVA' },
            DUB: { exempt: false, rate: 0.05, taxName: 'VAT' },
            ESP: { exempt: false, rate: 0.10, taxName: 'IVA' }, // Reduced cultural rate
            ISR: { exempt: true, rate: 0, taxName: 'VAT' } // Religious exemption
          },
          active: true,
          createdAt: '2024-01-15'
        },
        {
          id: 2,
          name: 'Medical Check-up Package',
          category: 'MEDICAL_TOURISM',
          sku: 'MED-001',
          basePrice: 2500,
          currency: 'USD',
          description: 'Comprehensive medical examination and consultation',
          taxSettings: {
            USA: { exempt: true, rate: 0, taxName: 'Sales Tax' },
            MEX: { exempt: true, rate: 0, taxName: 'IVA' },
            DUB: { exempt: true, rate: 0, taxName: 'VAT' },
            ESP: { exempt: true, rate: 0, taxName: 'IVA' },
            ISR: { exempt: true, rate: 0, taxName: 'VAT' }
          },
          active: true,
          createdAt: '2024-02-01'
        },
        {
          id: 3,
          name: 'Desert Safari Adventure',
          category: 'ADVENTURE_TOUR',
          sku: 'DSA-001',
          basePrice: 200,
          currency: 'AED',
          description: '6-hour desert safari with dinner',
          taxSettings: {
            USA: { exempt: false, rate: 0.08, taxName: 'Sales Tax' },
            MEX: { exempt: false, rate: 0.16, taxName: 'IVA' },
            DUB: { exempt: false, rate: 0.05, taxName: 'VAT' },
            ESP: { exempt: false, rate: 0.21, taxName: 'IVA' },
            ISR: { exempt: false, rate: 0.17, taxName: 'VAT' }
          },
          active: true,
          createdAt: '2024-02-15'
        }
      ];
      
      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      showSnackbar('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadTaxRules = async () => {
    try {
      // Simulated API call
      const mockRules = [
        {
          id: 1,
          name: 'Educational Institution Exemption',
          description: 'Tax exemption for educational institutions',
          priority: 1,
          conditions: {
            customerTypes: ['EDUCATIONAL'],
            countries: ['USA', 'MEX', 'ESP', 'ISR']
          },
          action: { type: 'EXEMPT', value: 0 },
          active: true
        },
        {
          id: 2,
          name: 'Spain Cultural Activities Reduction',
          description: 'Reduced tax rate for cultural activities in Spain',
          priority: 2,
          conditions: {
            countries: ['ESP'],
            categories: ['CULTURAL_TOUR', 'MUSEUM']
          },
          action: { type: 'REDUCE', value: 0.10 },
          active: true
        }
      ];
      
      setTaxRules(mockRules);
    } catch (error) {
      console.error('Error loading tax rules:', error);
    }
  };
  
  const loadExemptions = async () => {
    try {
      // Simulated API call
      const mockExemptions = [
        {
          id: 1,
          customerName: 'Harvard University',
          customerId: 'CUST-EDU-001',
          customerType: 'EDUCATIONAL',
          reason: 'EDUCATIONAL',
          certificateNumber: 'EDU-2024-001',
          countries: ['USA'],
          categories: ['EDUCATIONAL_TOUR', 'GROUP_TOUR'],
          validFrom: '2024-01-01',
          validUntil: '2024-12-31',
          active: true
        },
        {
          id: 2,
          customerName: 'Red Cross International',
          customerId: 'CUST-NPO-001',
          customerType: 'NONPROFIT',
          reason: 'NON_PROFIT',
          certificateNumber: 'NPO-2024-002',
          countries: ['USA', 'MEX', 'ESP'],
          products: [], // All products
          categories: [], // All categories
          validFrom: '2024-01-01',
          validUntil: '2025-12-31',
          active: true
        }
      ];
      
      setExemptions(mockExemptions);
    } catch (error) {
      console.error('Error loading exemptions:', error);
    }
  };
  
  // Helper functions
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const calculateTaxAmount = (product, country, quantity = 1) => {
    const baseAmount = product.basePrice * quantity;
    const taxSettings = product.taxSettings[country];
    
    if (!taxSettings || taxSettings.exempt) {
      return 0;
    }
    
    return baseAmount * taxSettings.rate;
  };
  
  const applyTaxRules = (product, customer, country) => {
    // Check exemption certificates first
    const activeExemption = exemptions.find(ex => 
      ex.active &&
      ex.customerId === customer.id &&
      ex.countries.includes(country) &&
      (ex.categories.length === 0 || ex.categories.includes(product.category)) &&
      (ex.products.length === 0 || ex.products.includes(product.id))
    );
    
    if (activeExemption) {
      return { exempt: true, rate: 0, reason: activeExemption.reason };
    }
    
    // Apply tax rules by priority
    const applicableRules = taxRules
      .filter(rule => rule.active)
      .filter(rule => {
        const conditions = rule.conditions;
        
        // Check country
        if (conditions.countries?.length > 0 && !conditions.countries.includes(country)) {
          return false;
        }
        
        // Check category
        if (conditions.categories?.length > 0 && !conditions.categories.includes(product.category)) {
          return false;
        }
        
        // Check customer type
        if (conditions.customerTypes?.length > 0 && !conditions.customerTypes.includes(customer.type)) {
          return false;
        }
        
        // Check price range
        if (conditions.priceRange?.min && product.basePrice < conditions.priceRange.min) {
          return false;
        }
        if (conditions.priceRange?.max && product.basePrice > conditions.priceRange.max) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
    
    if (applicableRules.length > 0) {
      const rule = applicableRules[0];
      
      if (rule.action.type === 'EXEMPT') {
        return { exempt: true, rate: 0, ruleApplied: rule.name };
      } else if (rule.action.type === 'REDUCE' || rule.action.type === 'OVERRIDE') {
        return { exempt: false, rate: rule.action.value, ruleApplied: rule.name };
      }
    }
    
    // Return default tax settings
    return product.taxSettings[country];
  };
  
  // CRUD operations
  const handleAddProduct = () => {
    const product = {
      ...newProduct,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    setProducts([...products, product]);
    setShowAddProductDialog(false);
    resetProductForm();
    showSnackbar('Product/Service added successfully', 'success');
  };
  
  const handleUpdateProduct = (productId, updates) => {
    setProducts(products.map(p => 
      p.id === productId ? { ...p, ...updates } : p
    ));
    setEditingProduct(null);
    showSnackbar('Product/Service updated successfully', 'success');
  };
  
  const handleDeleteProduct = (productId) => {
    if (window.confirm('Are you sure you want to delete this product/service?')) {
      setProducts(products.filter(p => p.id !== productId));
      showSnackbar('Product/Service deleted successfully', 'success');
    }
  };
  
  const handleToggleTaxExempt = (productId, country) => {
    setProducts(products.map(product => {
      if (product.id === productId) {
        const currentSettings = product.taxSettings[country];
        return {
          ...product,
          taxSettings: {
            ...product.taxSettings,
            [country]: {
              ...currentSettings,
              exempt: !currentSettings.exempt,
              rate: !currentSettings.exempt ? 0 : COUNTRIES[country].defaultTaxRate
            }
          }
        };
      }
      return product;
    }));
  };
  
  const handleBulkTaxUpdate = () => {
    const updates = {};
    selectedProducts.forEach(productId => {
      // Apply bulk tax settings
    });
    
    setShowBulkEditDialog(false);
    setSelectedProducts([]);
    showSnackbar(`Updated tax settings for ${selectedProducts.length} products`, 'success');
  };
  
  const handleAddTaxRule = () => {
    const rule = {
      ...newTaxRule,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    setTaxRules([...taxRules, rule].sort((a, b) => a.priority - b.priority));
    setShowTaxRuleDialog(false);
    resetTaxRuleForm();
    showSnackbar('Tax rule added successfully', 'success');
  };
  
  const handleAddExemption = () => {
    const exemption = {
      ...newExemption,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    setExemptions([...exemptions, exemption]);
    setShowExemptionDialog(false);
    resetExemptionForm();
    showSnackbar('Tax exemption certificate added successfully', 'success');
  };
  
  const handleExportConfiguration = () => {
    const config = {
      products,
      taxRules,
      exemptions,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tax_configuration_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSnackbar('Configuration exported successfully', 'success');
  };
  
  const handleImportConfiguration = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          
          if (config.products) setProducts(config.products);
          if (config.taxRules) setTaxRules(config.taxRules);
          if (config.exemptions) setExemptions(config.exemptions);
          
          showSnackbar('Configuration imported successfully', 'success');
          setShowImportDialog(false);
        } catch (error) {
          showSnackbar('Error importing configuration', 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  
  // Reset form functions
  const resetProductForm = () => {
    setNewProduct({
      name: '',
      category: 'SPIRITUAL_TOUR',
      description: '',
      sku: '',
      basePrice: 0,
      currency: 'USD',
      taxSettings: {},
      active: true
    });
  };
  
  const resetTaxRuleForm = () => {
    setNewTaxRule({
      name: '',
      description: '',
      priority: 1,
      conditions: {
        countries: [],
        categories: [],
        customerTypes: [],
        priceRange: { min: null, max: null },
        dateRange: { start: null, end: null }
      },
      action: {
        type: 'EXEMPT',
        value: 0
      },
      active: true
    });
  };
  
  const resetExemptionForm = () => {
    setNewExemption({
      customerName: '',
      customerId: '',
      customerType: 'B2C',
      reason: 'OTHER',
      certificateNumber: '',
      countries: [],
      products: [],
      categories: [],
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: null,
      notes: '',
      active: true
    });
  };
  
  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !product.sku.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (filterCategory !== 'ALL' && product.category !== filterCategory) {
        return false;
      }
      
      // Exempt status filter
      if (filterExemptStatus !== 'ALL') {
        const isExempt = product.taxSettings[selectedCountry]?.exempt;
        if (filterExemptStatus === 'EXEMPT' && !isExempt) return false;
        if (filterExemptStatus === 'TAXABLE' && isExempt) return false;
      }
      
      return true;
    });
  }, [products, searchTerm, filterCategory, filterExemptStatus, selectedCountry]);
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>
              <MoneyOffIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Product & Service Tax Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage tax settings, exemptions, and VAT/IVA rules for all products and services
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setShowImportDialog(true)}
              >
                Import
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportConfiguration}
              >
                Export
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowAddProductDialog(true)}
              >
                Add Product/Service
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      
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
          <Tab label="Products & Services" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="Tax Rules" icon={<CalculateIcon />} iconPosition="start" />
          <Tab label="Exemption Certificates" icon={<ReceiptIcon />} iconPosition="start" />
          <Tab label="Country Settings" icon={<PublicIcon />} iconPosition="start" />
          <Tab label="Reports" icon={<AssignmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
                      <MenuItem key={key} value={key}>
                        {category.icon} {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Tax Status</InputLabel>
                  <Select
                    value={filterExemptStatus}
                    onChange={(e) => setFilterExemptStatus(e.target.value)}
                    label="Tax Status"
                  >
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="TAXABLE">Taxable</MenuItem>
                    <MenuItem value="EXEMPT">Tax Exempt</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Country</InputLabel>
                  <Select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    label="Country"
                  >
                    {Object.entries(COUNTRIES).map(([code, country]) => (
                      <MenuItem key={code} value={code}>
                        <FlagIcon sx={{ mr: 1 }} /> {country.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                {selectedProducts.length > 0 && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => setShowBulkEditDialog(true)}
                  >
                    Edit {selectedProducts.length} Selected
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          {/* Products Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedProducts.length > 0 && selectedProducts.length < filteredProducts.length}
                      checked={filteredProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(filteredProducts.map(p => p.id));
                        } else {
                          setSelectedProducts([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Product/Service</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Base Price</TableCell>
                  <TableCell align="center">{COUNTRIES[selectedCountry].taxName} Status</TableCell>
                  <TableCell align="right">Tax Rate</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((product) => {
                    const taxSettings = product.taxSettings[selectedCountry] || {};
                    const category = PRODUCT_CATEGORIES[product.category];
                    
                    return (
                      <TableRow key={product.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.id]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {category?.icon}
                            <Box sx={{ ml: 2 }}>
                              <Typography variant="body1">{product.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.description}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={category?.name}
                            size="small"
                            icon={category?.icon}
                          />
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell align="right">
                          {product.currency} {product.basePrice.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={!taxSettings.exempt}
                            onChange={() => handleToggleTaxExempt(product.id, selectedCountry)}
                            color={taxSettings.exempt ? 'default' : 'primary'}
                          />
                          <Typography variant="caption" display="block">
                            {taxSettings.exempt ? 'Exempt' : 'Taxable'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {taxSettings.exempt ? (
                            <Chip label="0%" color="success" size="small" />
                          ) : (
                            <Chip 
                              label={`${(taxSettings.rate * 100).toFixed(1)}%`}
                              color="primary"
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => setEditingProduct(product)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredProducts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box>
          {/* Tax Rules */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Tax Rules Engine</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowTaxRuleDialog(true)}
              >
                Add Tax Rule
              </Button>
            </Box>
            
            <List>
              {taxRules.map((rule, index) => (
                <React.Fragment key={rule.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip 
                            label={`Priority ${rule.priority}`}
                            size="small"
                            color="primary"
                            sx={{ mr: 2 }}
                          />
                          <Typography variant="subtitle1">{rule.name}</Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">{rule.description}</Typography>
                          <Box sx={{ mt: 1 }}>
                            {rule.conditions.countries?.length > 0 && (
                              <Chip label={`Countries: ${rule.conditions.countries.join(', ')}`} size="small" sx={{ mr: 1 }} />
                            )}
                            {rule.conditions.categories?.length > 0 && (
                              <Chip label={`Categories: ${rule.conditions.categories.length}`} size="small" sx={{ mr: 1 }} />
                            )}
                            {rule.conditions.customerTypes?.length > 0 && (
                              <Chip label={`Customer Types: ${rule.conditions.customerTypes.join(', ')}`} size="small" />
                            )}
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <Chip 
                              label={`Action: ${rule.action.type} ${rule.action.type !== 'EXEMPT' ? `(${(rule.action.value * 100).toFixed(1)}%)` : ''}`}
                              color={rule.action.type === 'EXEMPT' ? 'success' : 'warning'}
                              size="small"
                            />
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={rule.active}
                        onChange={() => handleToggleRule(rule.id)}
                      />
                      <IconButton size="small" onClick={() => setEditingRule(rule)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteRule(rule.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < taxRules.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}
      
      {activeTab === 2 && (
        <Box>
          {/* Exemption Certificates */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Tax Exemption Certificates</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowExemptionDialog(true)}
              >
                Add Certificate
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Certificate #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Countries</TableCell>
                    <TableCell>Valid Until</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exemptions.map((exemption) => (
                    <TableRow key={exemption.id}>
                      <TableCell>
                        <Typography variant="body2">{exemption.customerName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {exemption.customerId}
                        </Typography>
                      </TableCell>
                      <TableCell>{exemption.certificateNumber}</TableCell>
                      <TableCell>
                        <Chip 
                          label={CUSTOMER_TYPES[exemption.customerType]?.name}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{EXEMPTION_REASONS[exemption.reason]}</TableCell>
                      <TableCell>
                        {exemption.countries.map(c => (
                          <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell>
                        {exemption.validUntil || 'No Expiration'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={exemption.active ? 'Active' : 'Inactive'}
                          color={exemption.active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => setEditingExemption(exemption)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
      
      {activeTab === 3 && (
        <Box>
          {/* Country Settings */}
          <Grid container spacing={3}>
            {Object.entries(COUNTRIES).map(([code, country]) => (
              <Grid item xs={12} md={6} key={code}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FlagIcon sx={{ mr: 2 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{country.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {country.code} • {country.currency}
                        </Typography>
                      </Box>
                      <Chip label={country.taxName} color="primary" />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Default Rate</Typography>
                        <Typography variant="h6">{(country.defaultTaxRate * 100).toFixed(1)}%</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Invoice Prefix</Typography>
                        <Typography variant="h6">{country.invoicePrefix}</Typography>
                      </Grid>
                      {country.reducedRate && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Reduced Rate</Typography>
                          <Typography variant="h6">{(country.reducedRate * 100).toFixed(1)}%</Typography>
                        </Grid>
                      )}
                      {country.superReducedRate && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Super Reduced</Typography>
                          <Typography variant="h6">{(country.superReducedRate * 100).toFixed(1)}%</Typography>
                        </Grid>
                      )}
                    </Grid>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Exemption Rules
                      </Typography>
                      <Box>
                        {country.exemptionRules.map((rule, idx) => (
                          <Chip key={idx} label={rule} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                        ))}
                      </Box>
                    </Box>
                    
                    {country.requiresCFDI && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <AlertTitle>CFDI Required</AlertTitle>
                        This country requires CFDI electronic invoicing
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      {activeTab === 4 && (
        <Box>
          {/* Reports */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Tax Summary by Country</Typography>
                  {Object.entries(COUNTRIES).map(([code, country]) => {
                    const countryProducts = products.filter(p => !p.taxSettings[code]?.exempt);
                    const exemptProducts = products.filter(p => p.taxSettings[code]?.exempt);
                    
                    return (
                      <Box key={code} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">{country.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Taxable: {countryProducts.length} | Exempt: {exemptProducts.length}
                        </Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Category Analysis</Typography>
                  {Object.entries(PRODUCT_CATEGORIES).slice(0, 5).map(([key, category]) => {
                    const categoryProducts = products.filter(p => p.category === key);
                    
                    return (
                      <Box key={key} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">{category.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Products: {categoryProducts.length}
                        </Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Active Exemptions</Typography>
                  <Typography variant="h3" color="primary">
                    {exemptions.filter(e => e.active).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total value: Calculate based on orders
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Add Product Dialog */}
      <Dialog 
        open={showAddProductDialog} 
        onClose={() => setShowAddProductDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Product/Service</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Product/Service Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  label="Category"
                >
                  {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
                    <MenuItem key={key} value={key}>
                      {category.icon} {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SKU"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Price"
                type="number"
                value={newProduct.basePrice}
                onChange={(e) => setNewProduct({ ...newProduct, basePrice: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={newProduct.currency}
                  onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                  label="Currency"
                >
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="MXN">MXN</MenuItem>
                  <MenuItem value="AED">AED</MenuItem>
                  <MenuItem value="ILS">ILS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              />
            </Grid>
            
            {/* Tax Settings per Country */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>Tax Settings by Country</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Country</TableCell>
                      <TableCell align="center">Tax Exempt</TableCell>
                      <TableCell align="right">Tax Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(COUNTRIES).map(([code, country]) => {
                      const settings = newProduct.taxSettings[code] || {};
                      return (
                        <TableRow key={code}>
                          <TableCell>{country.name}</TableCell>
                          <TableCell align="center">
                            <Switch
                              checked={settings.exempt || false}
                              onChange={(e) => {
                                setNewProduct({
                                  ...newProduct,
                                  taxSettings: {
                                    ...newProduct.taxSettings,
                                    [code]: {
                                      ...settings,
                                      exempt: e.target.checked,
                                      rate: e.target.checked ? 0 : country.defaultTaxRate
                                    }
                                  }
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {settings.exempt ? '0%' : `${((settings.rate || country.defaultTaxRate) * 100).toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddProductDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddProduct}
            variant="contained"
            disabled={!newProduct.name}
          >
            Add Product
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
          tooltipTitle="Add Product"
          onClick={() => setShowAddProductDialog(true)}
        />
        <SpeedDialAction
          icon={<CalculateIcon />}
          tooltipTitle="Add Tax Rule"
          onClick={() => setShowTaxRuleDialog(true)}
        />
        <SpeedDialAction
          icon={<ReceiptIcon />}
          tooltipTitle="Add Exemption"
          onClick={() => setShowExemptionDialog(true)}
        />
        <SpeedDialAction
          icon={<DownloadIcon />}
          tooltipTitle="Export Config"
          onClick={handleExportConfiguration}
        />
      </SpeedDial>
    </Box>
  );
};

export default ProductServiceTaxConfig;