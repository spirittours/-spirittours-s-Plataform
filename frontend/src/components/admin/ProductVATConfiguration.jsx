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
  AvatarGroup
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
  Percent as PercentIcon
} from '@mui/icons-material';

// Country configurations with VAT/IVA details
const COUNTRIES = {
  USA: {
    code: 'USA',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    vatName: 'Sales Tax',
    defaultVatRate: 0.08,
    vatRates: [0, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10],
    vatOptional: true,
    vatByState: true,
    requiresTaxId: false,
    invoicePrefix: 'USA',
    language: 'en'
  },
  MEX: {
    code: 'MEX',
    name: 'Mexico',
    flag: '🇲🇽',
    currency: 'MXN',
    vatName: 'IVA',
    defaultVatRate: 0.16,
    vatRates: [0, 0.08, 0.16],
    vatOptional: false,
    vatByState: false,
    requiresTaxId: true,
    taxIdName: 'RFC',
    invoicePrefix: 'MEX',
    language: 'es'
  },
  ESP: {
    code: 'ESP',
    name: 'Spain',
    flag: '🇪🇸',
    currency: 'EUR',
    vatName: 'IVA',
    defaultVatRate: 0.21,
    vatRates: [0, 0.04, 0.10, 0.21],
    vatOptional: false,
    vatByState: false,
    requiresTaxId: true,
    taxIdName: 'NIF/CIF',
    invoicePrefix: 'ESP',
    language: 'es'
  },
  ISR: {
    code: 'ISR',
    name: 'Israel',
    flag: '🇮🇱',
    currency: 'ILS',
    vatName: 'VAT',
    defaultVatRate: 0.17,
    vatRates: [0, 0.17],
    vatOptional: false,
    vatByState: false,
    requiresTaxId: true,
    taxIdName: 'VAT ID',
    invoicePrefix: 'ISR',
    language: 'he'
  },
  ARE: {
    code: 'ARE',
    name: 'Dubai (UAE)',
    flag: '🇦🇪',
    currency: 'AED',
    vatName: 'VAT',
    defaultVatRate: 0.05,
    vatRates: [0, 0.05],
    vatOptional: true,
    vatByState: false,
    requiresTaxId: true,
    taxIdName: 'TRN',
    invoicePrefix: 'DXB',
    language: 'ar'
  }
};

// Product categories with default VAT settings
const PRODUCT_CATEGORIES = {
  TOUR: {
    id: 'TOUR',
    name: 'Tours & Experiences',
    icon: <LocalOfferIcon />,
    defaultVatExempt: false,
    description: 'Guided tours, activities, and experiences'
  },
  PACKAGE: {
    id: 'PACKAGE',
    name: 'Travel Packages',
    icon: <BusinessIcon />,
    defaultVatExempt: false,
    description: 'Complete travel packages including accommodation'
  },
  ACCOMMODATION: {
    id: 'ACCOMMODATION',
    name: 'Accommodation',
    icon: <StoreIcon />,
    defaultVatExempt: false,
    description: 'Hotels, apartments, and lodging'
  },
  TRANSPORT: {
    id: 'TRANSPORT',
    name: 'Transportation',
    icon: <LocalOfferIcon />,
    defaultVatExempt: true,
    description: 'International transport services'
  },
  FOOD: {
    id: 'FOOD',
    name: 'Food & Beverage',
    icon: <ShoppingCartIcon />,
    defaultVatExempt: false,
    description: 'Restaurant services and catering'
  },
  INSURANCE: {
    id: 'INSURANCE',
    name: 'Travel Insurance',
    icon: <AssignmentIcon />,
    defaultVatExempt: true,
    description: 'Travel and medical insurance products'
  },
  DIGITAL: {
    id: 'DIGITAL',
    name: 'Digital Services',
    icon: <LanguageIcon />,
    defaultVatExempt: false,
    description: 'Online services and digital products'
  },
  EQUIPMENT: {
    id: 'EQUIPMENT',
    name: 'Equipment Rental',
    icon: <Inventory />,
    defaultVatExempt: false,
    description: 'Sports and travel equipment rental'
  }
};

// VAT rule types
const VAT_RULE_TYPES = {
  GLOBAL: 'global',
  CATEGORY: 'category',
  PRODUCT: 'product',
  COUNTRY: 'country',
  CUSTOMER: 'customer',
  DATE_RANGE: 'date_range',
  AMOUNT: 'amount',
  PROMOTION: 'promotion'
};

// Customer types for VAT rules
const CUSTOMER_TYPES = {
  B2C: { id: 'B2C', name: 'B2C - Individual', vatApplies: true },
  B2B: { id: 'B2B', name: 'B2B - Business', vatApplies: false },
  B2B2C: { id: 'B2B2C', name: 'B2B2C - Reseller', vatApplies: false },
  GOVERNMENT: { id: 'GOVERNMENT', name: 'Government', vatApplies: false },
  NGO: { id: 'NGO', name: 'Non-Profit/NGO', vatApplies: false },
  EDUCATIONAL: { id: 'EDUCATIONAL', name: 'Educational', vatApplies: false }
};

const ProductVATConfiguration = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [vatRules, setVatRules] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // New product/service form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'TOUR',
    basePrice: 0,
    currency: 'USD',
    vatExempt: false,
    vatRules: {},
    description: '',
    sku: '',
    active: true
  });

  // New VAT rule form state
  const [newRule, setNewRule] = useState({
    name: '',
    type: VAT_RULE_TYPES.CATEGORY,
    priority: 1,
    conditions: {},
    vatExempt: false,
    vatRate: null,
    countries: [],
    categories: [],
    customerTypes: [],
    dateRange: { start: null, end: null },
    minAmount: null,
    maxAmount: null,
    active: true
  });

  // Load initial data
  useEffect(() => {
    loadProducts();
    loadVatRules();
    loadSavedConfiguration();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Simulate API call
      const mockProducts = [
        {
          id: 1,
          name: 'Barcelona City Tour',
          category: 'TOUR',
          sku: 'BCN-CITY-001',
          basePrice: 75,
          currency: 'EUR',
          vatExempt: false,
          vatRules: {
            ESP: { exempt: false, rate: 0.21 },
            MEX: { exempt: true, rate: 0 },
            USA: { exempt: false, rate: 0.08 }
          },
          active: true,
          description: 'Full day guided tour of Barcelona'
        },
        {
          id: 2,
          name: 'Dubai Desert Safari',
          category: 'TOUR',
          sku: 'DXB-DST-001',
          basePrice: 350,
          currency: 'AED',
          vatExempt: true,
          vatRules: {
            ARE: { exempt: true, rate: 0 }
          },
          active: true,
          description: 'Premium desert safari experience'
        },
        {
          id: 3,
          name: 'Mexico City Food Tour',
          category: 'TOUR',
          sku: 'MEX-FOOD-001',
          basePrice: 1200,
          currency: 'MXN',
          vatExempt: false,
          vatRules: {
            MEX: { exempt: false, rate: 0.16 }
          },
          active: true,
          description: 'Authentic Mexican cuisine experience'
        },
        {
          id: 4,
          name: 'Travel Insurance Plus',
          category: 'INSURANCE',
          sku: 'INS-PLUS-001',
          basePrice: 150,
          currency: 'USD',
          vatExempt: true,
          vatRules: {},
          active: true,
          description: 'Comprehensive travel insurance'
        },
        {
          id: 5,
          name: 'Barcelona Hotel Package',
          category: 'PACKAGE',
          sku: 'BCN-PKG-001',
          basePrice: 450,
          currency: 'EUR',
          vatExempt: false,
          vatRules: {
            ESP: { exempt: false, rate: 0.10 },
            ISR: { exempt: false, rate: 0.17 }
          },
          active: true,
          description: '3 nights hotel + city tour'
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

  const loadVatRules = async () => {
    try {
      // Simulate API call
      const mockRules = [
        {
          id: 1,
          name: 'B2B VAT Exemption',
          type: VAT_RULE_TYPES.CUSTOMER,
          priority: 1,
          customerTypes: ['B2B', 'B2B2C'],
          vatExempt: true,
          active: true,
          countries: ['ALL']
        },
        {
          id: 2,
          name: 'Insurance Products Exemption',
          type: VAT_RULE_TYPES.CATEGORY,
          priority: 2,
          categories: ['INSURANCE'],
          vatExempt: true,
          active: true,
          countries: ['ALL']
        },
        {
          id: 3,
          name: 'International Transport Exemption',
          type: VAT_RULE_TYPES.CATEGORY,
          priority: 3,
          categories: ['TRANSPORT'],
          vatExempt: true,
          active: true,
          countries: ['ESP', 'MEX']
        },
        {
          id: 4,
          name: 'Small Amount Exemption',
          type: VAT_RULE_TYPES.AMOUNT,
          priority: 4,
          maxAmount: 50,
          vatExempt: true,
          active: true,
          countries: ['USA']
        },
        {
          id: 5,
          name: 'NGO Exemption',
          type: VAT_RULE_TYPES.CUSTOMER,
          priority: 5,
          customerTypes: ['NGO', 'EDUCATIONAL'],
          vatExempt: true,
          active: true,
          countries: ['ALL']
        }
      ];

      setVatRules(mockRules);
    } catch (error) {
      console.error('Error loading VAT rules:', error);
    }
  };

  const loadSavedConfiguration = () => {
    try {
      const saved = localStorage.getItem('vatConfiguration');
      if (saved) {
        const config = JSON.parse(saved);
        if (config.products) setProducts(config.products);
        if (config.rules) setVatRules(config.rules);
      }
    } catch (error) {
      console.error('Error loading saved configuration:', error);
    }
  };

  const saveConfiguration = () => {
    try {
      const config = {
        products,
        vatRules,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('vatConfiguration', JSON.stringify(config));
      showSnackbar('Configuration saved successfully', 'success');
    } catch (error) {
      console.error('Error saving configuration:', error);
      showSnackbar('Error saving configuration', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Product CRUD operations
  const handleAddProduct = () => {
    const product = {
      ...newProduct,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      vatRules: {}
    };

    // Initialize VAT rules for each country
    Object.keys(COUNTRIES).forEach(country => {
      const countryConfig = COUNTRIES[country];
      const category = PRODUCT_CATEGORIES[newProduct.category];
      
      product.vatRules[country] = {
        exempt: newProduct.vatExempt || category.defaultVatExempt,
        rate: newProduct.vatExempt ? 0 : countryConfig.defaultVatRate
      };
    });

    setProducts([...products, product]);
    setShowAddDialog(false);
    setNewProduct({
      name: '',
      category: 'TOUR',
      basePrice: 0,
      currency: 'USD',
      vatExempt: false,
      vatRules: {},
      description: '',
      sku: '',
      active: true
    });
    showSnackbar('Product added successfully', 'success');
  };

  const handleUpdateProduct = (productId, updates) => {
    setProducts(products.map(p => 
      p.id === productId ? { ...p, ...updates } : p
    ));
    setEditingProduct(null);
    showSnackbar('Product updated successfully', 'success');
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== productId));
      showSnackbar('Product deleted successfully', 'success');
    }
  };

  const handleToggleVATExempt = (productId, country = null) => {
    setProducts(products.map(product => {
      if (product.id === productId) {
        if (country) {
          // Toggle VAT exemption for specific country
          const currentExempt = product.vatRules[country]?.exempt || false;
          return {
            ...product,
            vatRules: {
              ...product.vatRules,
              [country]: {
                exempt: !currentExempt,
                rate: !currentExempt ? 0 : COUNTRIES[country].defaultVatRate
              }
            }
          };
        } else {
          // Toggle global VAT exemption
          const newExempt = !product.vatExempt;
          const newVatRules = {};
          
          Object.keys(COUNTRIES).forEach(c => {
            newVatRules[c] = {
              exempt: newExempt,
              rate: newExempt ? 0 : COUNTRIES[c].defaultVatRate
            };
          });

          return {
            ...product,
            vatExempt: newExempt,
            vatRules: newVatRules
          };
        }
      }
      return product;
    }));
  };

  const handleUpdateVATRate = (productId, country, rate) => {
    setProducts(products.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          vatRules: {
            ...product.vatRules,
            [country]: {
              ...product.vatRules[country],
              rate: parseFloat(rate)
            }
          }
        };
      }
      return product;
    }));
  };

  // VAT Rules CRUD operations
  const handleAddRule = () => {
    const rule = {
      ...newRule,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    setVatRules([...vatRules, rule].sort((a, b) => a.priority - b.priority));
    setShowRuleDialog(false);
    setNewRule({
      name: '',
      type: VAT_RULE_TYPES.CATEGORY,
      priority: 1,
      conditions: {},
      vatExempt: false,
      vatRate: null,
      countries: [],
      categories: [],
      customerTypes: [],
      dateRange: { start: null, end: null },
      minAmount: null,
      maxAmount: null,
      active: true
    });
    showSnackbar('VAT rule added successfully', 'success');
  };

  const handleDeleteRule = (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setVatRules(vatRules.filter(r => r.id !== ruleId));
      showSnackbar('VAT rule deleted successfully', 'success');
    }
  };

  const handleToggleRule = (ruleId) => {
    setVatRules(vatRules.map(rule => 
      rule.id === ruleId ? { ...rule, active: !rule.active } : rule
    ));
  };

  // Bulk operations
  const handleBulkVATToggle = (exempt) => {
    const updatedProducts = products.map(product => {
      if (selectedProducts.includes(product.id)) {
        const newVatRules = {};
        Object.keys(COUNTRIES).forEach(country => {
          newVatRules[country] = {
            exempt: exempt,
            rate: exempt ? 0 : COUNTRIES[country].defaultVatRate
          };
        });
        return {
          ...product,
          vatExempt: exempt,
          vatRules: newVatRules
        };
      }
      return product;
    });
    
    setProducts(updatedProducts);
    setSelectedProducts([]);
    setBulkEditMode(false);
    showSnackbar(`${selectedProducts.length} products updated`, 'success');
  };

  // Export/Import configuration
  const handleExportConfiguration = () => {
    const config = {
      products,
      vatRules,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vat_configuration_${new Date().toISOString().split('T')[0]}.json`;
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
          if (config.vatRules) setVatRules(config.vatRules);
          showSnackbar('Configuration imported successfully', 'success');
        } catch (error) {
          console.error('Error importing configuration:', error);
          showSnackbar('Error importing configuration', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  // Calculate effective VAT for a product
  const calculateEffectiveVAT = (product, country, customerType = 'B2C') => {
    // Check product-specific rules
    if (product.vatRules && product.vatRules[country]) {
      if (product.vatRules[country].exempt) return 0;
      return product.vatRules[country].rate;
    }

    // Check global rules
    const applicableRules = vatRules.filter(rule => {
      if (!rule.active) return false;
      if (rule.countries.length > 0 && !rule.countries.includes('ALL') && !rule.countries.includes(country)) return false;
      
      switch (rule.type) {
        case VAT_RULE_TYPES.CUSTOMER:
          return rule.customerTypes.includes(customerType);
        case VAT_RULE_TYPES.CATEGORY:
          return rule.categories.includes(product.category);
        case VAT_RULE_TYPES.AMOUNT:
          if (rule.minAmount && product.basePrice < rule.minAmount) return false;
          if (rule.maxAmount && product.basePrice > rule.maxAmount) return false;
          return true;
        default:
          return false;
      }
    }).sort((a, b) => a.priority - b.priority);

    if (applicableRules.length > 0) {
      const rule = applicableRules[0];
      if (rule.vatExempt) return 0;
      if (rule.vatRate !== null) return rule.vatRate;
    }

    // Default to country's default rate
    return COUNTRIES[country]?.defaultVatRate || 0;
  };

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (selectedCategory !== 'ALL' && product.category !== selectedCategory) return false;
      if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !product.sku.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (selectedCountry !== 'ALL' && product.vatRules[selectedCountry] === undefined) return false;
      return true;
    });
  }, [products, selectedCategory, searchTerm, selectedCountry]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
              <PercentIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
              VAT/IVA Configuration Manager
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Configure tax exemptions and rates per product, service, and country
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveConfiguration}
              sx={{ 
                mr: 2, 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              Save Changes
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadProducts}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'white' }
              }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4">
                {products.length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={`${products.filter(p => p.active).length} active`} 
                  size="small" 
                  color="success" 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                VAT Exempt Products
              </Typography>
              <Typography variant="h4">
                {products.filter(p => p.vatExempt).length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  {((products.filter(p => p.vatExempt).length / products.length) * 100).toFixed(1)}% of total
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active VAT Rules
              </Typography>
              <Typography variant="h4">
                {vatRules.filter(r => r.active).length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip 
                  label={`${vatRules.length} total`} 
                  size="small" 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Countries Configured
              </Typography>
              <Typography variant="h4">
                {Object.keys(COUNTRIES).length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <AvatarGroup max={4}>
                  {Object.values(COUNTRIES).map(country => (
                    <Avatar key={country.code} sx={{ width: 24, height: 24, fontSize: '1rem' }}>
                      {country.flag}
                    </Avatar>
                  ))}
                </AvatarGroup>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Products & Services" icon={<ShoppingCartIcon />} iconPosition="start" />
          <Tab label="VAT Rules" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="Country Settings" icon={<PublicIcon />} iconPosition="start" />
          <Tab label="Reports" icon={<TrendingUpIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Products & Services Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Filters and Search */}
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {Object.values(PRODUCT_CATEGORIES).map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {cat.icon}
                          <Typography sx={{ ml: 1 }}>{cat.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
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
                    <MenuItem value="ALL">All Countries</MenuItem>
                    {Object.values(COUNTRIES).map(country => (
                      <MenuItem key={country.code} value={country.code}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography sx={{ mr: 1 }}>{country.flag}</Typography>
                          <Typography>{country.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={5} sx={{ textAlign: 'right' }}>
                {bulkEditMode ? (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleBulkVATToggle(true)}
                      sx={{ mr: 1 }}
                    >
                      Set Exempt ({selectedProducts.length})
                    </Button>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<CloseIcon />}
                      onClick={() => handleBulkVATToggle(false)}
                      sx={{ mr: 1 }}
                    >
                      Set Taxable
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setBulkEditMode(false);
                        setSelectedProducts([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setShowAddDialog(true)}
                      sx={{ mr: 1 }}
                    >
                      Add Product
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => setBulkEditMode(true)}
                      disabled={products.length === 0}
                    >
                      Bulk Edit
                    </Button>
                  </>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Products Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {bulkEditMode && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProducts.length === filteredProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(filteredProducts.map(p => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell>Product/Service</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Base Price</TableCell>
                  <TableCell align="center">VAT Status</TableCell>
                  <TableCell align="center">Countries</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((product) => (
                    <React.Fragment key={product.id}>
                      <TableRow hover>
                        {bulkEditMode && (
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
                        )}
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2">{product.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {product.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PRODUCT_CATEGORIES[product.category]?.name}
                            size="small"
                            icon={PRODUCT_CATEGORIES[product.category]?.icon}
                          />
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: product.currency
                            }).format(product.basePrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={!product.vatExempt}
                            onChange={() => handleToggleVATExempt(product.id)}
                            color="primary"
                          />
                          <Typography variant="caption" display="block">
                            {product.vatExempt ? 'Exempt' : 'Taxable'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <AvatarGroup max={3}>
                            {Object.entries(product.vatRules || {}).map(([country, rule]) => (
                              <Tooltip key={country} title={`${COUNTRIES[country]?.name}: ${rule.exempt ? 'Exempt' : `${(rule.rate * 100).toFixed(0)}%`}`}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: '1rem' }}>
                                  {COUNTRIES[country]?.flag}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </AvatarGroup>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => setExpandedRow(expandedRow === product.id ? null : product.id)}
                          >
                            <ExpandMoreIcon 
                              sx={{ 
                                transform: expandedRow === product.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s'
                              }}
                            />
                          </IconButton>
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
                      
                      {/* Expanded Row - Country-specific VAT settings */}
                      <TableRow>
                        <TableCell colSpan={bulkEditMode ? 8 : 7} sx={{ py: 0 }}>
                          <Collapse in={expandedRow === product.id} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="h6" gutterBottom component="div">
                                Country-Specific VAT Settings
                              </Typography>
                              <Grid container spacing={2}>
                                {Object.entries(COUNTRIES).map(([code, country]) => {
                                  const rule = product.vatRules?.[code] || { exempt: product.vatExempt, rate: country.defaultVatRate };
                                  return (
                                    <Grid item xs={12} sm={6} md={4} key={code}>
                                      <Paper elevation={1} sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                          <Typography sx={{ mr: 1 }}>{country.flag}</Typography>
                                          <Typography variant="subtitle2">{country.name}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <FormControlLabel
                                            control={
                                              <Switch
                                                size="small"
                                                checked={!rule.exempt}
                                                onChange={() => handleToggleVATExempt(product.id, code)}
                                              />
                                            }
                                            label={rule.exempt ? 'Exempt' : 'Taxable'}
                                          />
                                          {!rule.exempt && (
                                            <Select
                                              size="small"
                                              value={rule.rate}
                                              onChange={(e) => handleUpdateVATRate(product.id, code, e.target.value)}
                                              sx={{ minWidth: 80 }}
                                            >
                                              {country.vatRates.map(rate => (
                                                <MenuItem key={rate} value={rate}>
                                                  {(rate * 100).toFixed(0)}%
                                                </MenuItem>
                                              ))}
                                            </Select>
                                          )}
                                        </Box>
                                        <Typography variant="caption" color="textSecondary">
                                          {country.vatName} • {country.currency}
                                        </Typography>
                                      </Paper>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
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

      {/* VAT Rules Tab */}
      {activeTab === 1 && (
        <Box>
          <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">VAT Exemption Rules</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowRuleDialog(true)}
              >
                Add Rule
              </Button>
            </Box>
          </Paper>

          <Grid container spacing={2}>
            {vatRules.map((rule) => (
              <Grid item xs={12} md={6} key={rule.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">{rule.name}</Typography>
                        <Chip
                          label={rule.type}
                          size="small"
                          color="primary"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Box>
                        <Switch
                          checked={rule.active}
                          onChange={() => handleToggleRule(rule.id)}
                        />
                        <IconButton size="small" onClick={() => handleDeleteRule(rule.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">Priority</Typography>
                        <Typography variant="body2">{rule.priority}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">VAT Status</Typography>
                        <Typography variant="body2">
                          {rule.vatExempt ? 'Exempt' : rule.vatRate ? `${(rule.vatRate * 100).toFixed(0)}%` : 'Default'}
                        </Typography>
                      </Grid>
                      
                      {rule.type === VAT_RULE_TYPES.CUSTOMER && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="textSecondary">Customer Types</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {rule.customerTypes.map(type => (
                              <Chip key={type} label={CUSTOMER_TYPES[type]?.name || type} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </Box>
                        </Grid>
                      )}

                      {rule.type === VAT_RULE_TYPES.CATEGORY && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="textSecondary">Categories</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {rule.categories.map(cat => (
                              <Chip key={cat} label={PRODUCT_CATEGORIES[cat]?.name || cat} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </Box>
                        </Grid>
                      )}

                      {rule.type === VAT_RULE_TYPES.AMOUNT && (
                        <>
                          {rule.minAmount && (
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Min Amount</Typography>
                              <Typography variant="body2">${rule.minAmount}</Typography>
                            </Grid>
                          )}
                          {rule.maxAmount && (
                            <Grid item xs={6}>
                              <Typography variant="caption" color="textSecondary">Max Amount</Typography>
                              <Typography variant="body2">${rule.maxAmount}</Typography>
                            </Grid>
                          )}
                        </>
                      )}

                      <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary">Countries</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {rule.countries.includes('ALL') ? (
                            <Chip label="All Countries" size="small" color="success" />
                          ) : (
                            rule.countries.map(code => (
                              <Chip 
                                key={code} 
                                label={`${COUNTRIES[code]?.flag} ${COUNTRIES[code]?.name}`} 
                                size="small" 
                                sx={{ mr: 0.5 }} 
                              />
                            ))
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Country Settings Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {Object.entries(COUNTRIES).map(([code, country]) => (
            <Grid item xs={12} md={6} key={code}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ mr: 2 }}>{country.flag}</Typography>
                    <Box>
                      <Typography variant="h6">{country.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {country.code} • {country.currency}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">VAT Name</Typography>
                      <Typography variant="body1">{country.vatName}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Default Rate</Typography>
                      <Typography variant="body1">{(country.defaultVatRate * 100).toFixed(0)}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">VAT Optional</Typography>
                      <Typography variant="body1">{country.vatOptional ? 'Yes' : 'No'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Tax ID Required</Typography>
                      <Typography variant="body1">
                        {country.requiresTaxId ? `Yes (${country.taxIdName})` : 'No'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">Available Rates</Typography>
                      <Box sx={{ mt: 1 }}>
                        {country.vatRates.map(rate => (
                          <Chip 
                            key={rate} 
                            label={`${(rate * 100).toFixed(0)}%`} 
                            size="small" 
                            sx={{ mr: 0.5 }}
                            color={rate === country.defaultVatRate ? 'primary' : 'default'}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="textSecondary">
                      Products with special rates: {
                        products.filter(p => 
                          p.vatRules?.[code] && 
                          p.vatRules[code].rate !== country.defaultVatRate
                        ).length
                      }
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reports Tab */}
      {activeTab === 3 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>VAT Summary by Country</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Country</TableCell>
                          <TableCell align="center">Taxable</TableCell>
                          <TableCell align="center">Exempt</TableCell>
                          <TableCell align="right">Avg Rate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(COUNTRIES).map(([code, country]) => {
                          const countryProducts = products.filter(p => p.vatRules?.[code]);
                          const taxable = countryProducts.filter(p => !p.vatRules[code].exempt);
                          const exempt = countryProducts.filter(p => p.vatRules[code].exempt);
                          const avgRate = taxable.length > 0 
                            ? taxable.reduce((sum, p) => sum + p.vatRules[code].rate, 0) / taxable.length
                            : 0;

                          return (
                            <TableRow key={code}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography sx={{ mr: 1 }}>{country.flag}</Typography>
                                  <Typography>{country.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">{taxable.length}</TableCell>
                              <TableCell align="center">{exempt.length}</TableCell>
                              <TableCell align="right">{(avgRate * 100).toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>VAT Summary by Category</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="center">Products</TableCell>
                          <TableCell align="center">Exempt</TableCell>
                          <TableCell align="right">% Exempt</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.values(PRODUCT_CATEGORIES).map(category => {
                          const categoryProducts = products.filter(p => p.category === category.id);
                          const exemptProducts = categoryProducts.filter(p => p.vatExempt);
                          const percentExempt = categoryProducts.length > 0 
                            ? (exemptProducts.length / categoryProducts.length) * 100
                            : 0;

                          return (
                            <TableRow key={category.id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {category.icon}
                                  <Typography sx={{ ml: 1 }}>{category.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">{categoryProducts.length}</TableCell>
                              <TableCell align="center">{exemptProducts.length}</TableCell>
                              <TableCell align="right">{percentExempt.toFixed(0)}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Export/Import Configuration</Typography>
                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportConfiguration}
                        sx={{ mr: 1 }}
                      >
                        Export
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        component="label"
                      >
                        Import
                        <input
                          type="file"
                          hidden
                          accept="application/json"
                          onChange={handleImportConfiguration}
                        />
                      </Button>
                    </Box>
                  </Box>
                  <Alert severity="info">
                    Export your VAT configuration to backup or transfer settings to another system. 
                    Import previously exported configurations to restore settings.
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Product/Service</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Product Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
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
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  label="Category"
                >
                  {Object.values(PRODUCT_CATEGORIES).map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {cat.icon}
                        <Typography sx={{ ml: 1 }}>{cat.name}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Price"
                type="number"
                value={newProduct.basePrice}
                onChange={(e) => setNewProduct({ ...newProduct, basePrice: parseFloat(e.target.value) })}
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
                  <MenuItem value="ILS">ILS</MenuItem>
                  <MenuItem value="AED">AED</MenuItem>
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
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newProduct.vatExempt}
                    onChange={(e) => setNewProduct({ ...newProduct, vatExempt: e.target.checked })}
                  />
                }
                label="VAT/IVA Exempt (Global)"
              />
              <Typography variant="caption" color="textSecondary" display="block">
                Mark this product as VAT exempt across all countries by default
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.sku}>
            Add Product
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add VAT Rule Dialog */}
      <Dialog open={showRuleDialog} onClose={() => setShowRuleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add VAT Rule</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  value={newRule.type}
                  onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                  label="Rule Type"
                >
                  <MenuItem value={VAT_RULE_TYPES.CATEGORY}>Category-based</MenuItem>
                  <MenuItem value={VAT_RULE_TYPES.CUSTOMER}>Customer Type</MenuItem>
                  <MenuItem value={VAT_RULE_TYPES.AMOUNT}>Amount-based</MenuItem>
                  <MenuItem value={VAT_RULE_TYPES.COUNTRY}>Country-specific</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                helperText="Lower numbers have higher priority"
              />
            </Grid>

            {newRule.type === VAT_RULE_TYPES.CATEGORY && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={Object.values(PRODUCT_CATEGORIES)}
                  getOptionLabel={(option) => option.name}
                  value={newRule.categories.map(id => PRODUCT_CATEGORIES[id]).filter(Boolean)}
                  onChange={(e, value) => setNewRule({ ...newRule, categories: value.map(v => v.id) })}
                  renderInput={(params) => (
                    <TextField {...params} label="Categories" placeholder="Select categories" />
                  )}
                />
              </Grid>
            )}

            {newRule.type === VAT_RULE_TYPES.CUSTOMER && (
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={Object.values(CUSTOMER_TYPES)}
                  getOptionLabel={(option) => option.name}
                  value={newRule.customerTypes.map(id => CUSTOMER_TYPES[id]).filter(Boolean)}
                  onChange={(e, value) => setNewRule({ ...newRule, customerTypes: value.map(v => v.id) })}
                  renderInput={(params) => (
                    <TextField {...params} label="Customer Types" placeholder="Select customer types" />
                  )}
                />
              </Grid>
            )}

            {newRule.type === VAT_RULE_TYPES.AMOUNT && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Minimum Amount"
                    type="number"
                    value={newRule.minAmount || ''}
                    onChange={(e) => setNewRule({ ...newRule, minAmount: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Maximum Amount"
                    type="number"
                    value={newRule.maxAmount || ''}
                    onChange={(e) => setNewRule({ ...newRule, maxAmount: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={['ALL', ...Object.keys(COUNTRIES)]}
                getOptionLabel={(option) => option === 'ALL' ? 'All Countries' : `${COUNTRIES[option]?.flag} ${COUNTRIES[option]?.name}`}
                value={newRule.countries}
                onChange={(e, value) => setNewRule({ ...newRule, countries: value })}
                renderInput={(params) => (
                  <TextField {...params} label="Countries" placeholder="Select countries" />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newRule.vatExempt}
                    onChange={(e) => setNewRule({ ...newRule, vatExempt: e.target.checked })}
                  />
                }
                label="VAT Exempt"
              />
            </Grid>

            {!newRule.vatExempt && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Custom VAT Rate (%)"
                  type="number"
                  value={newRule.vatRate ? newRule.vatRate * 100 : ''}
                  onChange={(e) => setNewRule({ ...newRule, vatRate: e.target.value ? parseFloat(e.target.value) / 100 : null })}
                  helperText="Leave empty to use default country rates"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRuleDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddRule} disabled={!newRule.name}>
            Add Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductVATConfiguration;