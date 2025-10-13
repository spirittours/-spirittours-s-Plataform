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
  Snackbar,
  Stack,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

import {
  Receipt as ReceiptIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  Payment as PaymentIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  LocalAtm as LocalAtmIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  Flag as FlagIcon,
  Language as LanguageIcon,
  MoneyOff as MoneyOffIcon,
  Calculate as CalculateIcon,
  Send as SendIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  PendingActions as PendingActionsIcon,
  Verified as VerifiedIcon,
  VerifiedUser as VerifiedUserIcon,
  Gavel as GavelIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  QrCode2 as QrCodeIcon,
  LocalShipping as LocalShippingIcon,
  FlightTakeoff as FlightTakeoffIcon,
  Hotel as HotelIcon,
  DirectionsCar as DirectionsCarIcon,
  Restaurant as RestaurantIcon,
  Tour as TourIcon,
  Spa as SpaIcon,
  School as SchoolIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  History as HistoryIcon
} from '@mui/icons-material';

// Import Product Service Tax Config data structures
import { COUNTRIES, PRODUCT_CATEGORIES, EXEMPTION_REASONS } from '../components/admin/ProductServiceTaxConfig';

// Payment Gateway to Country/Branch Mapping
const PAYMENT_GATEWAY_MAPPING = {
  // USA Gateways
  'stripe': {
    country: 'USA',
    branch: 'usa_branch',
    autoInvoice: true,
    name: 'Stripe',
    icon: <CreditCardIcon />
  },
  'paypal': {
    country: 'USA',
    branch: 'usa_branch',
    autoInvoice: true,
    name: 'PayPal',
    icon: <AccountBalanceWalletIcon />
  },
  'square': {
    country: 'USA',
    branch: 'usa_branch',
    autoInvoice: true,
    name: 'Square',
    icon: <CreditCardIcon />
  },
  'authorize_net': {
    country: 'USA',
    branch: 'usa_branch',
    autoInvoice: true,
    name: 'Authorize.Net',
    icon: <CreditCardIcon />
  },
  'zelle': {
    country: 'USA',
    branch: 'usa_branch',
    requiresConfirmation: true,
    name: 'Zelle',
    icon: <AccountBalanceIcon />
  },
  'ach_transfer': {
    country: 'USA',
    branch: 'usa_branch',
    requiresConfirmation: true,
    name: 'ACH Transfer',
    icon: <AccountBalanceIcon />
  },
  'wire_transfer_usa': {
    country: 'USA',
    branch: 'usa_branch',
    requiresConfirmation: true,
    name: 'Wire Transfer (USA)',
    icon: <AccountBalanceIcon />
  },
  
  // Mexico Gateways
  'mercadopago': {
    country: 'MEX',
    branch: 'mex_branch',
    autoInvoice: true,
    name: 'MercadoPago',
    icon: <CreditCardIcon />
  },
  'oxxo': {
    country: 'MEX',
    branch: 'mex_branch',
    requiresConfirmation: true,
    name: 'OXXO Pay',
    icon: <LocalAtmIcon />
  },
  'spei': {
    country: 'MEX',
    branch: 'mex_branch',
    requiresConfirmation: true,
    name: 'SPEI Transfer',
    icon: <AccountBalanceIcon />
  },
  'openpay': {
    country: 'MEX',
    branch: 'mex_branch',
    autoInvoice: true,
    name: 'OpenPay',
    icon: <CreditCardIcon />
  },
  'conekta': {
    country: 'MEX',
    branch: 'mex_branch',
    autoInvoice: true,
    name: 'Conekta',
    icon: <CreditCardIcon />
  },
  'clip': {
    country: 'MEX',
    branch: 'mex_branch',
    autoInvoice: true,
    name: 'Clip',
    icon: <CreditCardIcon />
  },
  'wire_transfer_mex': {
    country: 'MEX',
    branch: 'mex_branch',
    requiresConfirmation: true,
    name: 'Wire Transfer (Mexico)',
    icon: <AccountBalanceIcon />
  },
  
  // Dubai/UAE Gateways
  'network_international': {
    country: 'DUB',
    branch: 'dubai_branch',
    autoInvoice: true,
    name: 'Network International',
    icon: <CreditCardIcon />
  },
  'payfort': {
    country: 'DUB',
    branch: 'dubai_branch',
    autoInvoice: true,
    name: 'PayFort',
    icon: <CreditCardIcon />
  },
  'noon_payments': {
    country: 'DUB',
    branch: 'dubai_branch',
    autoInvoice: true,
    name: 'Noon Payments',
    icon: <CreditCardIcon />
  },
  'etisalat_wallet': {
    country: 'DUB',
    branch: 'dubai_branch',
    autoInvoice: true,
    name: 'Etisalat Wallet',
    icon: <AccountBalanceWalletIcon />
  },
  'dubai_pay': {
    country: 'DUB',
    branch: 'dubai_branch',
    autoInvoice: true,
    name: 'Dubai Pay',
    icon: <AccountBalanceWalletIcon />
  },
  'wire_transfer_uae': {
    country: 'DUB',
    branch: 'dubai_branch',
    requiresConfirmation: true,
    name: 'Wire Transfer (UAE)',
    icon: <AccountBalanceIcon />
  },
  
  // Spain Gateways
  'redsys': {
    country: 'ESP',
    branch: 'spain_branch',
    autoInvoice: true,
    name: 'Redsys',
    icon: <CreditCardIcon />
  },
  'bizum': {
    country: 'ESP',
    branch: 'spain_branch',
    autoInvoice: true,
    name: 'Bizum',
    icon: <AccountBalanceWalletIcon />
  },
  'servired': {
    country: 'ESP',
    branch: 'spain_branch',
    autoInvoice: true,
    name: 'Servired',
    icon: <CreditCardIcon />
  },
  'sepa_transfer': {
    country: 'ESP',
    branch: 'spain_branch',
    requiresConfirmation: true,
    name: 'SEPA Transfer',
    icon: <AccountBalanceIcon />
  },
  'wire_transfer_spain': {
    country: 'ESP',
    branch: 'spain_branch',
    requiresConfirmation: true,
    name: 'Wire Transfer (Spain)',
    icon: <AccountBalanceIcon />
  },
  
  // Israel Gateways
  'tranzila': {
    country: 'ISR',
    branch: 'israel_branch',
    autoInvoice: true,
    name: 'Tranzila',
    icon: <CreditCardIcon />
  },
  'cardcom': {
    country: 'ISR',
    branch: 'israel_branch',
    autoInvoice: true,
    name: 'Cardcom',
    icon: <CreditCardIcon />
  },
  'pelecard': {
    country: 'ISR',
    branch: 'israel_branch',
    autoInvoice: true,
    name: 'Pelecard',
    icon: <CreditCardIcon />
  },
  'bit': {
    country: 'ISR',
    branch: 'israel_branch',
    autoInvoice: true,
    name: 'Bit',
    icon: <AccountBalanceWalletIcon />
  },
  'paybox': {
    country: 'ISR',
    branch: 'israel_branch',
    autoInvoice: true,
    name: 'PayBox',
    icon: <AccountBalanceWalletIcon />
  },
  'wire_transfer_israel': {
    country: 'ISR',
    branch: 'israel_branch',
    requiresConfirmation: true,
    name: 'Wire Transfer (Israel)',
    icon: <AccountBalanceIcon />
  }
};

// Branch Configuration
const BRANCHES = {
  'usa_branch': {
    name: 'Spirit Tours USA Inc.',
    address: '123 Main Street, New York, NY 10001',
    taxId: 'EIN: 12-3456789',
    phone: '+1 212-555-0100',
    email: 'invoices.usa@spirittours.com',
    bankName: 'Chase Bank',
    bankAccount: 'XXXX-XXXX-1234',
    swiftCode: 'CHASUS33'
  },
  'mex_branch': {
    name: 'Spirit Tours México S.A. de C.V.',
    address: 'Av. Reforma 222, Ciudad de México, CDMX 06600',
    taxId: 'RFC: STM240101ABC',
    phone: '+52 55-1234-5678',
    email: 'facturas.mexico@spirittours.com',
    bankName: 'BBVA México',
    bankAccount: 'XXXX-XXXX-5678',
    clabe: '012180001234567890',
    requiresCFDI: true
  },
  'dubai_branch': {
    name: 'Spirit Tours Middle East FZE',
    address: 'Sheikh Zayed Road, Dubai, UAE',
    taxId: 'TRN: 100123456789000',
    phone: '+971 4-234-5678',
    email: 'invoices.dubai@spirittours.com',
    bankName: 'Emirates NBD',
    bankAccount: 'AE12-3456-7890-1234',
    swiftCode: 'EBILAEAD'
  },
  'spain_branch': {
    name: 'Spirit Tours España S.L.',
    address: 'Gran Vía 28, 28013 Madrid, España',
    taxId: 'CIF: B12345678',
    phone: '+34 91-123-4567',
    email: 'facturas.spain@spirittours.com',
    bankName: 'Banco Santander',
    bankAccount: 'ES12-3456-7890-1234-5678',
    swiftCode: 'BSCHESMMXXX'
  },
  'israel_branch': {
    name: 'Spirit Tours Israel Ltd.',
    address: 'Rothschild Blvd 1, Tel Aviv 6688101',
    taxId: 'Company Number: 51-234567-8',
    phone: '+972 3-123-4567',
    email: 'invoices.israel@spirittours.com',
    bankName: 'Bank Hapoalim',
    bankAccount: 'IL12-3456-7890-1234',
    swiftCode: 'POALILIT'
  }
};

// Invoice Status
const INVOICE_STATUS = {
  DRAFT: { label: 'Draft', color: 'default', icon: <EditIcon /> },
  PROFORMA: { label: 'Proforma', color: 'info', icon: <PendingActionsIcon /> },
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'warning', icon: <AccessTimeIcon /> },
  PAID: { label: 'Paid', color: 'success', icon: <CheckCircleIcon /> },
  PARTIALLY_PAID: { label: 'Partially Paid', color: 'warning', icon: <WarningIcon /> },
  OVERDUE: { label: 'Overdue', color: 'error', icon: <ErrorIcon /> },
  CANCELLED: { label: 'Cancelled', color: 'error', icon: <CancelIcon /> },
  REFUNDED: { label: 'Refunded', color: 'secondary', icon: <AttachMoneyIcon /> }
};

const InvoicePage = () => {
  // State management
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  // New invoice form state
  const [newInvoice, setNewInvoice] = useState({
    customer: null,
    items: [],
    paymentMethod: '',
    country: '',
    branch: '',
    currency: 'USD',
    notes: '',
    dueDate: null,
    taxExempt: false,
    exemptionCertificate: ''
  });
  
  // Tax configuration state (loaded from ProductServiceTaxConfig)
  const [taxConfig, setTaxConfig] = useState({
    products: [],
    taxRules: [],
    exemptions: []
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Load data on mount
  useEffect(() => {
    loadInvoices();
    loadTaxConfiguration();
  }, []);
  
  // Auto-detect country based on payment method
  useEffect(() => {
    if (newInvoice.paymentMethod && PAYMENT_GATEWAY_MAPPING[newInvoice.paymentMethod]) {
      const gateway = PAYMENT_GATEWAY_MAPPING[newInvoice.paymentMethod];
      setNewInvoice(prev => ({
        ...prev,
        country: gateway.country,
        branch: gateway.branch,
        currency: COUNTRIES[gateway.country].currency
      }));
    }
  }, [newInvoice.paymentMethod]);
  
  // Load functions
  const loadInvoices = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual API
      const mockInvoices = [
        {
          id: 1,
          invoiceNumber: 'USA2024001',
          customer: {
            id: 'CUST001',
            name: 'John Smith',
            email: 'john@example.com',
            type: 'B2C',
            country: 'USA'
          },
          items: [
            {
              id: 1,
              productId: 1,
              name: 'Jerusalem Holy Sites Tour',
              category: 'SPIRITUAL_TOUR',
              quantity: 2,
              unitPrice: 150,
              taxExempt: false,
              taxRate: 0.08,
              taxAmount: 24,
              total: 324
            }
          ],
          subtotal: 300,
          taxAmount: 24,
          total: 324,
          currency: 'USD',
          status: 'PAID',
          paymentMethod: 'stripe',
          country: 'USA',
          branch: 'usa_branch',
          createdAt: '2024-10-01T10:00:00Z',
          paidAt: '2024-10-01T10:05:00Z',
          dueDate: '2024-10-15T23:59:59Z'
        },
        {
          id: 2,
          invoiceNumber: 'MEX2024001',
          customer: {
            id: 'CUST002',
            name: 'María González',
            email: 'maria@example.com',
            type: 'B2C',
            country: 'MEX'
          },
          items: [
            {
              id: 1,
              productId: 3,
              name: 'Desert Safari Adventure',
              category: 'ADVENTURE_TOUR',
              quantity: 1,
              unitPrice: 200,
              taxExempt: false,
              taxRate: 0.16,
              taxAmount: 32,
              total: 232
            }
          ],
          subtotal: 200,
          taxAmount: 32,
          total: 232,
          currency: 'MXN',
          status: 'PENDING_PAYMENT',
          paymentMethod: 'oxxo',
          country: 'MEX',
          branch: 'mex_branch',
          createdAt: '2024-10-10T14:00:00Z',
          dueDate: '2024-10-25T23:59:59Z',
          cfdiRequired: true
        },
        {
          id: 3,
          invoiceNumber: 'ISR2024001',
          customer: {
            id: 'CUST003',
            name: 'Harvard University',
            email: 'procurement@harvard.edu',
            type: 'EDUCATIONAL',
            country: 'USA'
          },
          items: [
            {
              id: 1,
              productId: 1,
              name: 'Educational Tour Package',
              category: 'EDUCATIONAL_TOUR',
              quantity: 20,
              unitPrice: 100,
              taxExempt: true,
              taxRate: 0,
              taxAmount: 0,
              total: 2000,
              exemptionReason: 'Educational Institution'
            }
          ],
          subtotal: 2000,
          taxAmount: 0,
          total: 2000,
          currency: 'USD',
          status: 'PAID',
          paymentMethod: 'wire_transfer_usa',
          country: 'USA',
          branch: 'usa_branch',
          createdAt: '2024-09-15T09:00:00Z',
          paidAt: '2024-09-20T15:30:00Z',
          exemptionCertificate: 'EDU-2024-001'
        }
      ];
      
      setInvoices(mockInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      showSnackbar('Error loading invoices', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadTaxConfiguration = async () => {
    try {
      // Load tax configuration from ProductServiceTaxConfig
      // This would be an API call in production
      const mockConfig = {
        products: [], // Load from API
        taxRules: [], // Load from API
        exemptions: [] // Load from API
      };
      
      setTaxConfig(mockConfig);
    } catch (error) {
      console.error('Error loading tax configuration:', error);
    }
  };
  
  // Helper functions
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const generateInvoiceNumber = (country) => {
    const year = new Date().getFullYear();
    const existingInvoices = invoices.filter(inv => inv.country === country);
    const nextNumber = (existingInvoices.length + 1).toString().padStart(4, '0');
    return `${country}${year}${nextNumber}`;
  };
  
  const calculateInvoiceTotals = (items, customer, country) => {
    let subtotal = 0;
    let totalTax = 0;
    
    const processedItems = items.map(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      let taxAmount = 0;
      let taxRate = 0;
      let isExempt = false;
      let exemptionReason = '';
      
      // Check for tax exemption
      if (customer.type === 'EDUCATIONAL' || customer.type === 'NONPROFIT' || customer.type === 'GOVERNMENT') {
        isExempt = true;
        exemptionReason = `${customer.type} Exemption`;
      } else if (item.taxExempt) {
        isExempt = true;
        exemptionReason = item.exemptionReason || 'Product Exempt';
      } else {
        // Apply standard tax rate for the country
        const countryConfig = COUNTRIES[country];
        taxRate = countryConfig.defaultTaxRate;
        
        // Check for reduced rates based on category
        if (item.category === 'CULTURAL_TOUR' && country === 'ESP' && countryConfig.reducedRate) {
          taxRate = countryConfig.reducedRate;
        }
        
        taxAmount = itemSubtotal * taxRate;
      }
      
      subtotal += itemSubtotal;
      totalTax += taxAmount;
      
      return {
        ...item,
        taxExempt: isExempt,
        taxRate,
        taxAmount,
        total: itemSubtotal + taxAmount,
        exemptionReason
      };
    });
    
    return {
      items: processedItems,
      subtotal,
      taxAmount: totalTax,
      total: subtotal + totalTax
    };
  };
  
  const handleCreateInvoice = async () => {
    try {
      const { items, subtotal, taxAmount, total } = calculateInvoiceTotals(
        newInvoice.items,
        newInvoice.customer,
        newInvoice.country
      );
      
      const gateway = PAYMENT_GATEWAY_MAPPING[newInvoice.paymentMethod];
      const invoiceNumber = generateInvoiceNumber(newInvoice.country);
      
      const invoice = {
        id: Date.now(),
        invoiceNumber,
        customer: newInvoice.customer,
        items,
        subtotal,
        taxAmount,
        total,
        currency: newInvoice.currency,
        status: gateway.autoInvoice ? 'PENDING_PAYMENT' : 'PROFORMA',
        paymentMethod: newInvoice.paymentMethod,
        country: newInvoice.country,
        branch: newInvoice.branch,
        createdAt: new Date().toISOString(),
        dueDate: newInvoice.dueDate,
        notes: newInvoice.notes,
        exemptionCertificate: newInvoice.exemptionCertificate,
        cfdiRequired: newInvoice.country === 'MEX'
      };
      
      setInvoices([invoice, ...invoices]);
      setShowCreateDialog(false);
      resetInvoiceForm();
      
      // If payment method requires confirmation, show proforma message
      if (gateway.requiresConfirmation) {
        showSnackbar(`Proforma invoice ${invoiceNumber} created. Awaiting payment confirmation.`, 'info');
      } else {
        showSnackbar(`Invoice ${invoiceNumber} created successfully`, 'success');
      }
      
      // Auto-send invoice if configured
      if (gateway.autoInvoice) {
        // Send invoice via email
        handleSendInvoice(invoice);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      showSnackbar('Error creating invoice', 'error');
    }
  };
  
  const handleSendInvoice = async (invoice) => {
    try {
      // Simulate sending invoice
      console.log('Sending invoice:', invoice);
      showSnackbar(`Invoice sent to ${invoice.customer.email}`, 'success');
    } catch (error) {
      console.error('Error sending invoice:', error);
      showSnackbar('Error sending invoice', 'error');
    }
  };
  
  const handlePaymentConfirmation = async (invoiceId) => {
    try {
      setInvoices(invoices.map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            status: 'PAID',
            paidAt: new Date().toISOString()
          };
        }
        return inv;
      }));
      
      showSnackbar('Payment confirmed successfully', 'success');
      setShowPaymentDialog(false);
    } catch (error) {
      console.error('Error confirming payment:', error);
      showSnackbar('Error confirming payment', 'error');
    }
  };
  
  const handleCancelInvoice = (invoiceId) => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      setInvoices(invoices.map(inv => {
        if (inv.id === invoiceId) {
          return { ...inv, status: 'CANCELLED' };
        }
        return inv;
      }));
      showSnackbar('Invoice cancelled', 'info');
    }
  };
  
  const handleDownloadInvoice = (invoice) => {
    // Generate PDF or download invoice
    console.log('Downloading invoice:', invoice);
    showSnackbar('Invoice downloaded', 'success');
  };
  
  const resetInvoiceForm = () => {
    setNewInvoice({
      customer: null,
      items: [],
      paymentMethod: '',
      country: '',
      branch: '',
      currency: 'USD',
      notes: '',
      dueDate: null,
      taxExempt: false,
      exemptionCertificate: ''
    });
  };
  
  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Search filter
      if (searchTerm && !invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filterStatus !== 'ALL' && invoice.status !== filterStatus) {
        return false;
      }
      
      // Country filter
      if (filterCountry !== 'ALL' && invoice.country !== filterCountry) {
        return false;
      }
      
      // Date range filter
      if (dateRange.start && new Date(invoice.createdAt) < new Date(dateRange.start)) {
        return false;
      }
      if (dateRange.end && new Date(invoice.createdAt) > new Date(dateRange.end)) {
        return false;
      }
      
      return true;
    });
  }, [invoices, searchTerm, filterStatus, filterCountry, dateRange]);
  
  // Calculate statistics
  const statistics = useMemo(() => {
    const stats = {
      total: filteredInvoices.length,
      paid: filteredInvoices.filter(inv => inv.status === 'PAID').length,
      pending: filteredInvoices.filter(inv => inv.status === 'PENDING_PAYMENT').length,
      overdue: filteredInvoices.filter(inv => inv.status === 'OVERDUE').length,
      totalRevenue: {},
      totalTax: {}
    };
    
    // Calculate revenue and tax by currency
    filteredInvoices.forEach(invoice => {
      if (invoice.status === 'PAID') {
        if (!stats.totalRevenue[invoice.currency]) {
          stats.totalRevenue[invoice.currency] = 0;
          stats.totalTax[invoice.currency] = 0;
        }
        stats.totalRevenue[invoice.currency] += invoice.total;
        stats.totalTax[invoice.currency] += invoice.taxAmount;
      }
    });
    
    return stats;
  }, [filteredInvoices]);
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>
              <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Invoice Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Multi-country invoice system with automatic branch detection and tax configuration
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadInvoices}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
              >
                Create Invoice
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Invoices
              </Typography>
              <Typography variant="h4">
                {statistics.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Paid
              </Typography>
              <Typography variant="h4" color="success.main">
                {statistics.paid}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">
                {statistics.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Overdue
              </Typography>
              <Typography variant="h4" color="error.main">
                {statistics.overdue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Revenue Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Revenue Summary</Typography>
        <Grid container spacing={2}>
          {Object.entries(statistics.totalRevenue).map(([currency, amount]) => (
            <Grid item xs={12} md={4} key={currency}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Revenue ({currency})
                </Typography>
                <Typography variant="h6">
                  {currency} {amount.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tax: {currency} {statistics.totalTax[currency].toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">🔍</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="ALL">All Status</MenuItem>
                {Object.entries(INVOICE_STATUS).map(([key, status]) => (
                  <MenuItem key={key} value={key}>
                    {status.icon} {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Country</InputLabel>
              <Select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                label="Country"
              >
                <MenuItem value="ALL">All Countries</MenuItem>
                {Object.entries(COUNTRIES).map(([code, country]) => (
                  <MenuItem key={code} value={code}>
                    <FlagIcon sx={{ mr: 1 }} /> {country.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Invoices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Tax</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Country/Branch</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const status = INVOICE_STATUS[invoice.status];
                const gateway = PAYMENT_GATEWAY_MAPPING[invoice.paymentMethod];
                const branch = BRANCHES[invoice.branch];
                
                return (
                  <TableRow key={invoice.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {invoice.invoiceNumber}
                      </Typography>
                      {invoice.cfdiRequired && (
                        <Chip label="CFDI" size="small" color="info" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{invoice.customer.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.customer.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        icon={status.icon}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {invoice.currency} {invoice.total.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Subtotal: {invoice.subtotal.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {invoice.taxAmount > 0 ? (
                        <Box>
                          <Typography variant="body2">
                            {invoice.currency} {invoice.taxAmount.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {((invoice.taxAmount / invoice.subtotal) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      ) : (
                        <Chip label="Tax Exempt" size="small" color="success" icon={<MoneyOffIcon />} />
                      )}
                      {invoice.exemptionCertificate && (
                        <Typography variant="caption" display="block">
                          Cert: {invoice.exemptionCertificate}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {gateway?.icon}
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="caption">
                            {gateway?.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {COUNTRIES[invoice.country]?.name}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {branch?.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton 
                            size="small"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Send Email">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowEmailDialog(true);
                            }}
                          >
                            <EmailIcon />
                          </IconButton>
                        </Tooltip>
                        {invoice.status === 'PROFORMA' && (
                          <Tooltip title="Confirm Payment">
                            <IconButton 
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(invoice.status === 'DRAFT' || invoice.status === 'PENDING_PAYMENT') && (
                          <Tooltip title="Cancel Invoice">
                            <IconButton 
                              size="small"
                              color="error"
                              onClick={() => handleCancelInvoice(invoice.id)}
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Create Invoice Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create New Invoice
          {newInvoice.country && (
            <Chip 
              label={`${COUNTRIES[newInvoice.country].name} - ${newInvoice.country}`}
              color="primary"
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stepper activeStep={0} orientation="vertical">
              <Step>
                <StepLabel>Customer Information</StepLabel>
                <StepContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Customer Name"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Customer Email"
                        type="email"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Customer Type</InputLabel>
                        <Select label="Customer Type">
                          <MenuItem value="B2C">Individual</MenuItem>
                          <MenuItem value="B2B">Business</MenuItem>
                          <MenuItem value="EDUCATIONAL">Educational</MenuItem>
                          <MenuItem value="NONPROFIT">Non-Profit</MenuItem>
                          <MenuItem value="GOVERNMENT">Government</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Tax ID (Optional)"
                      />
                    </Grid>
                  </Grid>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Payment Method</StepLabel>
                <StepContent>
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={newInvoice.paymentMethod}
                      onChange={(e) => setNewInvoice({ ...newInvoice, paymentMethod: e.target.value })}
                      label="Payment Method"
                    >
                      {Object.entries(PAYMENT_GATEWAY_MAPPING).map(([key, gateway]) => (
                        <MenuItem key={key} value={key}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {gateway.icon}
                            <Box sx={{ ml: 2 }}>
                              <Typography variant="body2">{gateway.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {COUNTRIES[gateway.country]?.name} • {gateway.autoInvoice ? 'Auto' : 'Manual'}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {newInvoice.paymentMethod && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <AlertTitle>Auto-detected Settings</AlertTitle>
                      <Typography variant="body2">
                        Country: {COUNTRIES[newInvoice.country]?.name}<br />
                        Branch: {BRANCHES[newInvoice.branch]?.name}<br />
                        Currency: {newInvoice.currency}<br />
                        {PAYMENT_GATEWAY_MAPPING[newInvoice.paymentMethod]?.requiresConfirmation && 
                          'Note: This payment method requires manual confirmation'}
                      </Typography>
                    </Alert>
                  )}
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Products & Services</StepLabel>
                <StepContent>
                  {/* Add products/services selection */}
                  <Button 
                    variant="outlined" 
                    startIcon={<AddIcon />}
                    fullWidth
                  >
                    Add Product/Service
                  </Button>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Tax Configuration</StepLabel>
                <StepContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newInvoice.taxExempt}
                        onChange={(e) => setNewInvoice({ ...newInvoice, taxExempt: e.target.checked })}
                      />
                    }
                    label="Tax Exempt"
                  />
                  {newInvoice.taxExempt && (
                    <TextField
                      fullWidth
                      label="Exemption Certificate Number"
                      value={newInvoice.exemptionCertificate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, exemptionCertificate: e.target.value })}
                      sx={{ mt: 2 }}
                    />
                  )}
                </StepContent>
              </Step>
            </Stepper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateInvoice}>
            Create Invoice
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
    </Box>
  );
};

export default InvoicePage;