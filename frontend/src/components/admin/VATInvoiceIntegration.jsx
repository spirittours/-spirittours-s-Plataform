import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  LinearProgress,
  Badge,
  Avatar,
  Collapse,
  InputAdornment
} from '@mui/material';

import {
  Calculate as CalculateIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Refresh as RefreshIcon,
  Public as PublicIcon,
  AccountBalance as AccountBalanceIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  LocalOffer as LocalOfferIcon,
  AttachMoney as AttachMoneyIcon,
  Percent as PercentIcon,
  Flag as FlagIcon,
  Language as LanguageIcon,
  Assignment as AssignmentIcon,
  CreditCard as CreditCardIcon,
  Store as StoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';

// Import country and product configurations
const COUNTRIES = {
  USA: {
    code: 'USA',
    name: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    vatName: 'Sales Tax',
    defaultVatRate: 0.08,
    vatOptional: true,
    requiresTaxId: false,
    invoicePrefix: 'USA',
    invoiceFormat: 'USA{YEAR}{NUMBER}',
    currencySymbol: '$'
  },
  MEX: {
    code: 'MEX',
    name: 'Mexico',
    flag: '🇲🇽',
    currency: 'MXN',
    vatName: 'IVA',
    defaultVatRate: 0.16,
    vatOptional: false,
    requiresTaxId: true,
    taxIdName: 'RFC',
    invoicePrefix: 'MEX',
    invoiceFormat: 'MEX{YEAR}{NUMBER}',
    currencySymbol: '$'
  },
  ESP: {
    code: 'ESP',
    name: 'Spain',
    flag: '🇪🇸',
    currency: 'EUR',
    vatName: 'IVA',
    defaultVatRate: 0.21,
    vatOptional: false,
    requiresTaxId: true,
    taxIdName: 'NIF/CIF',
    invoicePrefix: 'ESP',
    invoiceFormat: 'ESP{YEAR}{NUMBER}',
    currencySymbol: '€'
  },
  ISR: {
    code: 'ISR',
    name: 'Israel',
    flag: '🇮🇱',
    currency: 'ILS',
    vatName: 'VAT',
    defaultVatRate: 0.17,
    vatOptional: false,
    requiresTaxId: true,
    taxIdName: 'VAT ID',
    invoicePrefix: 'ISR',
    invoiceFormat: 'ISR{YEAR}{NUMBER}',
    currencySymbol: '₪'
  },
  ARE: {
    code: 'ARE',
    name: 'Dubai (UAE)',
    flag: '🇦🇪',
    currency: 'AED',
    vatName: 'VAT',
    defaultVatRate: 0.05,
    vatOptional: true,
    requiresTaxId: true,
    taxIdName: 'TRN',
    invoicePrefix: 'DXB',
    invoiceFormat: 'DXB{YEAR}{NUMBER}',
    currencySymbol: 'د.إ'
  }
};

const PAYMENT_GATEWAY_MAPPING = {
  'stripe_usa': { country: 'USA', branch: 'usa_branch', autoInvoice: true },
  'stripe_eur': { country: 'ESP', branch: 'esp_branch', autoInvoice: true },
  'mercadopago': { country: 'MEX', branch: 'mex_branch', autoInvoice: true },
  'paypal': { country: 'USA', branch: 'usa_branch', autoInvoice: false },
  'wise': { country: 'USA', branch: 'usa_branch', autoInvoice: false },
  'bank_transfer_usa': { country: 'USA', branch: 'usa_branch', autoInvoice: false },
  'bank_transfer_mex': { country: 'MEX', branch: 'mex_branch', autoInvoice: false },
  'bank_transfer_esp': { country: 'ESP', branch: 'esp_branch', autoInvoice: false },
  'bank_transfer_isr': { country: 'ISR', branch: 'isr_branch', autoInvoice: false },
  'bank_transfer_are': { country: 'ARE', branch: 'are_branch', autoInvoice: false }
};

const CUSTOMER_TYPES = {
  B2C: { id: 'B2C', name: 'Individual', vatApplies: true },
  B2B: { id: 'B2B', name: 'Business', vatApplies: false },
  B2B2C: { id: 'B2B2C', name: 'Reseller', vatApplies: false }
};

const VATInvoiceIntegration = () => {
  // State management
  const [testInvoice, setTestInvoice] = useState({
    customerName: '',
    customerType: 'B2C',
    customerTaxId: '',
    country: 'USA',
    paymentGateway: 'stripe_usa',
    items: [
      { 
        id: 1, 
        name: 'Sample Tour', 
        category: 'TOUR',
        quantity: 1, 
        unitPrice: 100, 
        vatExempt: false,
        vatRate: null 
      }
    ],
    currency: 'USD',
    exchangeRate: 1,
    invoiceType: 'final',
    notes: ''
  });

  const [calculationResult, setCalculationResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vatConfiguration, setVatConfiguration] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [expandedSection, setExpandedSection] = useState('customer');
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  // Load VAT configuration
  useEffect(() => {
    loadVATConfiguration();
    loadInvoiceHistory();
  }, []);

  // Auto-update country and currency based on payment gateway
  useEffect(() => {
    if (testInvoice.paymentGateway && PAYMENT_GATEWAY_MAPPING[testInvoice.paymentGateway]) {
      const gateway = PAYMENT_GATEWAY_MAPPING[testInvoice.paymentGateway];
      const country = COUNTRIES[gateway.country];
      
      setTestInvoice(prev => ({
        ...prev,
        country: gateway.country,
        currency: country.currency
      }));
    }
  }, [testInvoice.paymentGateway]);

  // Calculate totals when invoice changes
  useEffect(() => {
    calculateInvoice();
  }, [testInvoice, vatConfiguration]);

  const loadVATConfiguration = () => {
    try {
      const saved = localStorage.getItem('vatConfiguration');
      if (saved) {
        setVatConfiguration(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading VAT configuration:', error);
    }
  };

  const loadInvoiceHistory = () => {
    try {
      const saved = localStorage.getItem('invoiceHistory');
      if (saved) {
        setInvoiceHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading invoice history:', error);
    }
  };

  const calculateInvoice = () => {
    const country = COUNTRIES[testInvoice.country];
    let subtotal = 0;
    let totalVAT = 0;
    const itemsWithVAT = [];

    testInvoice.items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      // Determine VAT rate for this item
      let vatRate = 0;
      let vatAmount = 0;
      let vatExempt = item.vatExempt;

      if (!vatExempt) {
        // Check product-specific VAT configuration
        if (vatConfiguration?.products) {
          const product = vatConfiguration.products.find(p => 
            p.name === item.name || p.category === item.category
          );
          
          if (product?.vatRules?.[testInvoice.country]) {
            vatExempt = product.vatRules[testInvoice.country].exempt;
            vatRate = product.vatRules[testInvoice.country].rate;
          }
        }

        // Check global VAT rules
        if (!vatExempt && vatConfiguration?.rules) {
          const applicableRules = vatConfiguration.rules.filter(rule => {
            if (!rule.active) return false;
            
            // Check country
            if (!rule.countries.includes('ALL') && !rule.countries.includes(testInvoice.country)) {
              return false;
            }

            // Check customer type
            if (rule.customerTypes?.length > 0 && !rule.customerTypes.includes(testInvoice.customerType)) {
              return false;
            }

            // Check amount
            if (rule.minAmount && itemTotal < rule.minAmount) return false;
            if (rule.maxAmount && itemTotal > rule.maxAmount) return false;

            return true;
          }).sort((a, b) => (a.priority || 999) - (b.priority || 999));

          if (applicableRules.length > 0) {
            const rule = applicableRules[0];
            vatExempt = rule.vatExempt;
            if (rule.vatRate !== null && rule.vatRate !== undefined) {
              vatRate = rule.vatRate;
            }
          }
        }

        // Use country default if no specific rate found
        if (!vatExempt && vatRate === 0) {
          // Check customer type
          if (CUSTOMER_TYPES[testInvoice.customerType]?.vatApplies === false) {
            vatExempt = true;
          } else {
            vatRate = item.vatRate || country.defaultVatRate;
          }
        }

        if (!vatExempt) {
          vatAmount = itemTotal * vatRate;
          totalVAT += vatAmount;
        }
      }

      itemsWithVAT.push({
        ...item,
        total: itemTotal,
        vatExempt,
        vatRate,
        vatAmount
      });
    });

    const grandTotal = subtotal + totalVAT;

    setCalculationResult({
      subtotal,
      totalVAT,
      grandTotal,
      items: itemsWithVAT,
      currency: testInvoice.currency,
      exchangeRate: testInvoice.exchangeRate,
      vatName: country.vatName
    });
  };

  const handleAddItem = () => {
    setTestInvoice(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          name: '',
          category: 'TOUR',
          quantity: 1,
          unitPrice: 0,
          vatExempt: false,
          vatRate: null
        }
      ]
    }));
  };

  const handleRemoveItem = (itemId) => {
    setTestInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleUpdateItem = (itemId, field, value) => {
    setTestInvoice(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const validateInvoice = () => {
    const errors = {};
    
    if (!testInvoice.customerName) {
      errors.customerName = 'Customer name is required';
    }
    
    const country = COUNTRIES[testInvoice.country];
    if (country.requiresTaxId && testInvoice.customerType !== 'B2C' && !testInvoice.customerTaxId) {
      errors.customerTaxId = `${country.taxIdName} is required for business customers`;
    }
    
    if (testInvoice.items.length === 0) {
      errors.items = 'At least one item is required';
    }
    
    testInvoice.items.forEach((item, index) => {
      if (!item.name) {
        errors[`item_${index}_name`] = 'Item name is required';
      }
      if (item.unitPrice <= 0) {
        errors[`item_${index}_price`] = 'Price must be greater than 0';
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateInvoice = async () => {
    if (!validateInvoice()) {
      return;
    }

    setLoading(true);
    
    try {
      // Simulate invoice generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const country = COUNTRIES[testInvoice.country];
      const year = new Date().getFullYear();
      const invoiceNumber = `${country.invoicePrefix}${year}${String(invoiceHistory.length + 1).padStart(4, '0')}`;
      
      const invoice = {
        id: Date.now(),
        number: invoiceNumber,
        date: new Date().toISOString(),
        customer: {
          name: testInvoice.customerName,
          type: testInvoice.customerType,
          taxId: testInvoice.customerTaxId
        },
        country: testInvoice.country,
        paymentGateway: testInvoice.paymentGateway,
        ...calculationResult,
        status: 'generated',
        type: testInvoice.invoiceType
      };
      
      const newHistory = [invoice, ...invoiceHistory];
      setInvoiceHistory(newHistory);
      localStorage.setItem('invoiceHistory', JSON.stringify(newHistory));
      
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestScenario = (scenario) => {
    switch (scenario) {
      case 'b2c_usa':
        setTestInvoice({
          customerName: 'John Doe',
          customerType: 'B2C',
          customerTaxId: '',
          country: 'USA',
          paymentGateway: 'stripe_usa',
          items: [
            { id: 1, name: 'City Tour', category: 'TOUR', quantity: 2, unitPrice: 75, vatExempt: false, vatRate: null },
            { id: 2, name: 'Travel Insurance', category: 'INSURANCE', quantity: 1, unitPrice: 50, vatExempt: true, vatRate: null }
          ],
          currency: 'USD',
          exchangeRate: 1,
          invoiceType: 'final',
          notes: 'Test B2C USA scenario'
        });
        break;
        
      case 'b2b_mex':
        setTestInvoice({
          customerName: 'Empresa Turística SA de CV',
          customerType: 'B2B',
          customerTaxId: 'ETU850101ABC',
          country: 'MEX',
          paymentGateway: 'mercadopago',
          items: [
            { id: 1, name: 'Corporate Package', category: 'PACKAGE', quantity: 10, unitPrice: 1500, vatExempt: false, vatRate: null },
            { id: 2, name: 'Transport Service', category: 'TRANSPORT', quantity: 1, unitPrice: 5000, vatExempt: true, vatRate: null }
          ],
          currency: 'MXN',
          exchangeRate: 17.5,
          invoiceType: 'final',
          notes: 'Test B2B Mexico scenario with CFDI'
        });
        break;
        
      case 'mixed_esp':
        setTestInvoice({
          customerName: 'Tourism Agency SL',
          customerType: 'B2B2C',
          customerTaxId: 'B12345678',
          country: 'ESP',
          paymentGateway: 'stripe_eur',
          items: [
            { id: 1, name: 'Barcelona Tours Package', category: 'PACKAGE', quantity: 5, unitPrice: 200, vatExempt: false, vatRate: 0.21 },
            { id: 2, name: 'Hotel Accommodation', category: 'ACCOMMODATION', quantity: 5, unitPrice: 150, vatExempt: false, vatRate: 0.10 },
            { id: 3, name: 'International Flight', category: 'TRANSPORT', quantity: 5, unitPrice: 500, vatExempt: true, vatRate: null }
          ],
          currency: 'EUR',
          exchangeRate: 1.1,
          invoiceType: 'proforma',
          notes: 'Test B2B2C Spain scenario with mixed VAT rates'
        });
        break;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
              <CalculateIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
              VAT/Invoice Integration Testing
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              Test VAT calculations and invoice generation with real scenarios
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadVATConfiguration}
              sx={{ 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              Reload Configuration
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Quick Test Scenarios */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Test Scenarios
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PersonIcon />}
                onClick={() => handleTestScenario('b2c_usa')}
              >
                B2C USA (Sales Tax)
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<BusinessIcon />}
                onClick={() => handleTestScenario('b2b_mex')}
              >
                B2B Mexico (IVA/CFDI)
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<StoreIcon />}
                onClick={() => handleTestScenario('mixed_esp')}
              >
                B2B2C Spain (Mixed VAT)
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Invoice Builder */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Invoice Builder
              </Typography>

              {/* Customer Information */}
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: expandedSection === 'customer' ? 2 : 0,
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedSection(expandedSection === 'customer' ? '' : 'customer')}
                >
                  <Typography variant="subtitle1">
                    <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Customer Information
                  </Typography>
                  <IconButton size="small">
                    {expandedSection === 'customer' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={expandedSection === 'customer'}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Customer Name"
                        value={testInvoice.customerName}
                        onChange={(e) => setTestInvoice({ ...testInvoice, customerName: e.target.value })}
                        error={!!validationErrors.customerName}
                        helperText={validationErrors.customerName}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Customer Type</InputLabel>
                        <Select
                          value={testInvoice.customerType}
                          onChange={(e) => setTestInvoice({ ...testInvoice, customerType: e.target.value })}
                          label="Customer Type"
                        >
                          {Object.entries(CUSTOMER_TYPES).map(([key, type]) => (
                            <MenuItem key={key} value={key}>
                              {type.name} {!type.vatApplies && '(VAT Exempt)'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    {COUNTRIES[testInvoice.country]?.requiresTaxId && testInvoice.customerType !== 'B2C' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={COUNTRIES[testInvoice.country].taxIdName}
                          value={testInvoice.customerTaxId}
                          onChange={(e) => setTestInvoice({ ...testInvoice, customerTaxId: e.target.value })}
                          error={!!validationErrors.customerTaxId}
                          helperText={validationErrors.customerTaxId}
                        />
                      </Grid>
                    )}
                  </Grid>
                </Collapse>
              </Paper>

              {/* Payment & Country */}
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: expandedSection === 'payment' ? 2 : 0,
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedSection(expandedSection === 'payment' ? '' : 'payment')}
                >
                  <Typography variant="subtitle1">
                    <CreditCardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Payment & Location
                  </Typography>
                  <IconButton size="small">
                    {expandedSection === 'payment' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={expandedSection === 'payment'}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Payment Gateway</InputLabel>
                        <Select
                          value={testInvoice.paymentGateway}
                          onChange={(e) => setTestInvoice({ ...testInvoice, paymentGateway: e.target.value })}
                          label="Payment Gateway"
                        >
                          {Object.entries(PAYMENT_GATEWAY_MAPPING).map(([gateway, config]) => (
                            <MenuItem key={gateway} value={gateway}>
                              {gateway.replace(/_/g, ' ').toUpperCase()} ({COUNTRIES[config.country].flag})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth disabled>
                        <InputLabel>Country (Auto-detected)</InputLabel>
                        <Select
                          value={testInvoice.country}
                          label="Country (Auto-detected)"
                        >
                          {Object.entries(COUNTRIES).map(([code, country]) => (
                            <MenuItem key={code} value={code}>
                              {country.flag} {country.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Currency"
                        value={testInvoice.currency}
                        disabled
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {COUNTRIES[testInvoice.country]?.currencySymbol}
                            </InputAdornment>
                          )
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Invoice Type</InputLabel>
                        <Select
                          value={testInvoice.invoiceType}
                          onChange={(e) => setTestInvoice({ ...testInvoice, invoiceType: e.target.value })}
                          label="Invoice Type"
                        >
                          <MenuItem value="proforma">Proforma Invoice</MenuItem>
                          <MenuItem value="final">Final Invoice</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Collapse>
              </Paper>

              {/* Invoice Items */}
              <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">
                    <LocalOfferIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Items
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                  >
                    Add Item
                  </Button>
                </Box>
                
                {testInvoice.items.map((item, index) => (
                  <Paper key={item.id} elevation={0} sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Item Name"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          error={!!validationErrors[`item_${index}_name`]}
                        />
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Quantity"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Unit Price"
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          error={!!validationErrors[`item_${index}_price`]}
                        />
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={item.vatExempt}
                              onChange={(e) => handleUpdateItem(item.id, 'vatExempt', e.target.checked)}
                              size="small"
                            />
                          }
                          label="VAT Exempt"
                        />
                      </Grid>
                      {!item.vatExempt && (
                        <Grid item xs={6} md={2}>
                          <TextField
                            fullWidth
                            size="small"
                            label="VAT Rate %"
                            type="number"
                            value={item.vatRate ? item.vatRate * 100 : ''}
                            onChange={(e) => handleUpdateItem(item.id, 'vatRate', e.target.value ? parseFloat(e.target.value) / 100 : null)}
                            placeholder="Auto"
                          />
                        </Grid>
                      )}
                      <Grid item xs={12} md={1}>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={testInvoice.items.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Paper>

              {/* Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={() => setShowPreview(true)}
                  disabled={!calculationResult}
                >
                  Preview
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ReceiptIcon />}
                  onClick={handleGenerateInvoice}
                  disabled={loading || !calculationResult}
                >
                  {loading ? <CircularProgress size={24} /> : 'Generate Invoice'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Calculation Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Calculation Summary
              </Typography>
              
              {calculationResult ? (
                <>
                  {/* Country Info */}
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>
                      {COUNTRIES[testInvoice.country]?.flag} {COUNTRIES[testInvoice.country]?.name}
                    </AlertTitle>
                    <Typography variant="caption">
                      {COUNTRIES[testInvoice.country]?.vatName}: {
                        testInvoice.customerType === 'B2C' 
                          ? `${(COUNTRIES[testInvoice.country]?.defaultVatRate * 100).toFixed(0)}% (Standard)`
                          : 'Exempt (Business)'
                      }
                    </Typography>
                  </Alert>

                  {/* Item Breakdown */}
                  <Typography variant="subtitle2" gutterBottom>Item Breakdown</Typography>
                  <List dense>
                    {calculationResult.items.map((item, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={item.name || `Item ${index + 1}`}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {item.quantity} × {COUNTRIES[testInvoice.country]?.currencySymbol}{item.unitPrice} = {COUNTRIES[testInvoice.country]?.currencySymbol}{item.total.toFixed(2)}
                              </Typography>
                              {item.vatExempt ? (
                                <Chip label="VAT Exempt" size="small" color="success" />
                              ) : (
                                <Typography variant="caption" color="primary">
                                  {COUNTRIES[testInvoice.country]?.vatName}: {(item.vatRate * 100).toFixed(0)}% = {COUNTRIES[testInvoice.country]?.currencySymbol}{item.vatAmount.toFixed(2)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 2 }} />

                  {/* Totals */}
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">
                        {COUNTRIES[testInvoice.country]?.currencySymbol}{calculationResult.subtotal.toFixed(2)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        {COUNTRIES[testInvoice.country]?.vatName}:
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color={calculationResult.totalVAT > 0 ? 'error' : 'success'}>
                        {COUNTRIES[testInvoice.country]?.currencySymbol}{calculationResult.totalVAT.toFixed(2)}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="h6">Total:</Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        {COUNTRIES[testInvoice.country]?.currencySymbol}{calculationResult.grandTotal.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {testInvoice.currency}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* VAT Configuration Status */}
                  <Alert 
                    severity={vatConfiguration ? 'success' : 'warning'} 
                    sx={{ mt: 2 }}
                  >
                    {vatConfiguration ? (
                      <>
                        <Typography variant="caption" display="block">
                          VAT Configuration Loaded
                        </Typography>
                        <Typography variant="caption">
                          {vatConfiguration.products?.length || 0} products, {vatConfiguration.rules?.length || 0} rules
                        </Typography>
                      </>
                    ) : (
                      'No VAT configuration found. Using defaults.'
                    )}
                  </Alert>
                </>
              ) : (
                <Alert severity="info">
                  Enter invoice details to see calculation
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Invoices */}
      {invoiceHistory.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Test Invoices
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">VAT</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoiceHistory.slice(0, 5).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.number}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{invoice.customer.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {invoice.customer.type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {COUNTRIES[invoice.country]?.flag} {invoice.country}
                      </TableCell>
                      <TableCell align="right">
                        {COUNTRIES[invoice.country]?.currencySymbol}{invoice.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {COUNTRIES[invoice.country]?.currencySymbol}{invoice.totalVAT.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <strong>
                          {COUNTRIES[invoice.country]?.currencySymbol}{invoice.grandTotal.toFixed(2)}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          size="small"
                          color="success"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Invoice Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Invoice Preview
          <Typography variant="caption" display="block">
            {testInvoice.invoiceType === 'proforma' ? 'Proforma Invoice' : 'Final Invoice'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {calculationResult && (
            <Box sx={{ p: 2 }}>
              {/* Invoice Header */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="h6">From:</Typography>
                  <Typography>Spirit Tours Platform</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {COUNTRIES[testInvoice.country]?.name} Branch
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">Invoice Details:</Typography>
                  <Typography>Date: {new Date().toLocaleDateString()}</Typography>
                  <Typography>Country: {COUNTRIES[testInvoice.country]?.flag} {COUNTRIES[testInvoice.country]?.name}</Typography>
                </Grid>
              </Grid>

              {/* Customer Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h6">Bill To:</Typography>
                  <Typography>{testInvoice.customerName}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {CUSTOMER_TYPES[testInvoice.customerType]?.name}
                  </Typography>
                  {testInvoice.customerTaxId && (
                    <Typography variant="body2">
                      {COUNTRIES[testInvoice.country]?.taxIdName}: {testInvoice.customerTaxId}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              {/* Items Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">{COUNTRIES[testInvoice.country]?.vatName}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calculationResult.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name || `Item ${index + 1}`}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {COUNTRIES[testInvoice.country]?.currencySymbol}{item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {COUNTRIES[testInvoice.country]?.currencySymbol}{item.total.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {item.vatExempt ? (
                            <Chip label="Exempt" size="small" />
                          ) : (
                            `${COUNTRIES[testInvoice.country]?.currencySymbol}${item.vatAmount.toFixed(2)} (${(item.vatRate * 100).toFixed(0)}%)`
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals */}
              <Grid container sx={{ mt: 3 }}>
                <Grid item xs={6} />
                <Grid item xs={6}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography align="right">Subtotal:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">
                        {COUNTRIES[testInvoice.country]?.currencySymbol}{calculationResult.subtotal.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">{COUNTRIES[testInvoice.country]?.vatName}:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right">
                        {COUNTRIES[testInvoice.country]?.currencySymbol}{calculationResult.totalVAT.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right" variant="h6">Total:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography align="right" variant="h6" color="primary">
                        {COUNTRIES[testInvoice.country]?.currencySymbol}{calculationResult.grandTotal.toFixed(2)} {testInvoice.currency}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Simulate download
              console.log('Downloading invoice...');
              setShowPreview(false);
            }}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VATInvoiceIntegration;