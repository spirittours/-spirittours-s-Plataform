import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Autocomplete,
  Grid,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Badge,
  LinearProgress,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  ListItemIcon,
  Checkbox,
  FormGroup,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  LocalOffer as ProductIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Receipt as ReceiptIcon,
  TaxiAlert as TaxIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ContentCopy as CopyIcon,
  Public as GlobalIcon,
  AccountBalance as AccountIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

// Países y sus configuraciones de impuestos
const COUNTRIES_TAX_CONFIG = {
  USA: {
    name: 'United States',
    taxName: 'Sales Tax',
    defaultRate: 0.08,
    hasStates: true,
    requiresTaxId: false,
    exemptionTypes: ['Non-profit', 'Government', 'Educational', 'Reseller', 'Diplomatic']
  },
  MEX: {
    name: 'Mexico',
    taxName: 'IVA',
    defaultRate: 0.16,
    hasStates: true,
    requiresTaxId: true,
    requiresCFDI: true,
    exemptionTypes: ['Exportación', 'Gobierno', 'Educativo', 'ONG', 'Diplomático'],
    specialRates: {
      'frontera': 0.08,
      'alimentos': 0,
      'medicinas': 0
    }
  },
  CAN: {
    name: 'Canada',
    taxName: 'GST/HST',
    defaultRate: 0.05,
    hasProvinces: true,
    requiresTaxId: false,
    exemptionTypes: ['Non-profit', 'Government', 'First Nations', 'Diplomatic']
  },
  GBR: {
    name: 'United Kingdom',
    taxName: 'VAT',
    defaultRate: 0.20,
    hasStates: false,
    requiresTaxId: true,
    exemptionTypes: ['Charity', 'Government', 'Educational', 'Export', 'Diplomatic'],
    specialRates: {
      'reduced': 0.05,
      'zero': 0
    }
  },
  DEU: {
    name: 'Germany',
    taxName: 'MwSt',
    defaultRate: 0.19,
    hasStates: false,
    requiresTaxId: true,
    exemptionTypes: ['Export', 'EU Business', 'Government', 'Educational', 'Diplomatic'],
    specialRates: {
      'reduced': 0.07,
      'zero': 0
    }
  }
};

// Categorías de productos/servicios
const PRODUCT_CATEGORIES = [
  { id: 'tours', name: 'Tours & Activities', icon: '🎯' },
  { id: 'accommodation', name: 'Accommodation', icon: '🏨' },
  { id: 'transport', name: 'Transportation', icon: '🚗' },
  { id: 'packages', name: 'Travel Packages', icon: '📦' },
  { id: 'insurance', name: 'Travel Insurance', icon: '🛡️' },
  { id: 'guides', name: 'Tour Guides', icon: '👥' },
  { id: 'equipment', name: 'Equipment Rental', icon: '🎒' },
  { id: 'food', name: 'Food & Beverage', icon: '🍽️' },
  { id: 'tickets', name: 'Event Tickets', icon: '🎫' },
  { id: 'merchandise', name: 'Merchandise', icon: '🛍️' }
];

// Tipos de clientes
const CUSTOMER_TYPES = [
  { id: 'individual', name: 'Individual', icon: '👤' },
  { id: 'business', name: 'Business', icon: '🏢' },
  { id: 'nonprofit', name: 'Non-Profit', icon: '🏛️' },
  { id: 'government', name: 'Government', icon: '🏛️' },
  { id: 'educational', name: 'Educational', icon: '🎓' },
  { id: 'reseller', name: 'Reseller', icon: '🔄' },
  { id: 'diplomatic', name: 'Diplomatic', icon: '🌐' }
];

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TaxExemptionConfig() {
  const [activeTab, setActiveTab] = useState(0);
  const [exemptionRules, setExemptionRules] = useState([]);
  const [productExemptions, setProductExemptions] = useState({});
  const [customerExemptions, setCustomerExemptions] = useState({});
  const [countryOverrides, setCountryOverrides] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  // Estado para nueva regla
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    country: '',
    active: true,
    priority: 1,
    conditions: [],
    exemptionType: 'full', // full, partial, zero-rated
    exemptionValue: 0,
    applicableProducts: [],
    applicableCategories: [],
    customerTypes: [],
    validFrom: '',
    validTo: '',
    requiresDocumentation: false,
    documentTypes: [],
    autoApply: false,
    requiresApproval: false
  });

  useEffect(() => {
    loadExemptionRules();
    loadProductExemptions();
    loadCustomerExemptions();
    loadCountryOverrides();
  }, []);

  const loadExemptionRules = async () => {
    setLoading(true);
    try {
      // Simulación de carga desde API
      const mockRules = [
        {
          id: 1,
          name: 'Non-Profit Organizations',
          description: 'Tax exemption for registered non-profit organizations',
          country: 'USA',
          active: true,
          priority: 1,
          exemptionType: 'full',
          customerTypes: ['nonprofit'],
          requiresDocumentation: true,
          documentTypes: ['501c3'],
          autoApply: false,
          requiresApproval: true,
          createdAt: '2024-01-15',
          usageCount: 45
        },
        {
          id: 2,
          name: 'Export Services',
          description: 'Zero-rated VAT for export services',
          country: 'GBR',
          active: true,
          priority: 2,
          exemptionType: 'zero-rated',
          applicableCategories: ['tours', 'packages'],
          requiresDocumentation: true,
          documentTypes: ['export_declaration'],
          autoApply: true,
          requiresApproval: false,
          createdAt: '2024-01-20',
          usageCount: 123
        },
        {
          id: 3,
          name: 'Educational Institutions',
          description: 'Reduced tax rate for educational institutions',
          country: 'DEU',
          active: true,
          priority: 3,
          exemptionType: 'partial',
          exemptionValue: 0.07,
          customerTypes: ['educational'],
          requiresDocumentation: true,
          documentTypes: ['education_certificate'],
          autoApply: false,
          requiresApproval: true,
          createdAt: '2024-02-01',
          usageCount: 67
        }
      ];
      setExemptionRules(mockRules);
    } catch (error) {
      toast.error('Error loading exemption rules');
    } finally {
      setLoading(false);
    }
  };

  const loadProductExemptions = async () => {
    // Simulación de exenciones por producto
    const mockProductExemptions = {
      'tours': {
        'cultural_tours': { exempt: true, reason: 'Cultural preservation' },
        'educational_tours': { exempt: true, reason: 'Educational purposes' }
      },
      'food': {
        'basic_meals': { exempt: false, rate: 0, reason: 'Zero-rated essential food' }
      }
    };
    setProductExemptions(mockProductExemptions);
  };

  const loadCustomerExemptions = async () => {
    // Simulación de exenciones por cliente
    const mockCustomerExemptions = {
      'CUST001': {
        customerId: 'CUST001',
        customerName: 'ABC Non-Profit',
        type: 'nonprofit',
        exemptionCertificate: '501C3-12345',
        validUntil: '2025-12-31',
        countries: ['USA'],
        approved: true
      },
      'CUST002': {
        customerId: 'CUST002',
        customerName: 'XYZ University',
        type: 'educational',
        exemptionCertificate: 'EDU-67890',
        validUntil: '2024-12-31',
        countries: ['USA', 'CAN'],
        approved: true
      }
    };
    setCustomerExemptions(mockCustomerExemptions);
  };

  const loadCountryOverrides = async () => {
    // Configuraciones específicas por país
    const mockOverrides = {
      'USA': {
        states: {
          'CA': { rate: 0.0725, name: 'California' },
          'TX': { rate: 0.0625, name: 'Texas' },
          'FL': { rate: 0.06, name: 'Florida' },
          'NY': { rate: 0.08, name: 'New York' }
        }
      },
      'MEX': {
        states: {
          'CDMX': { rate: 0.16, name: 'Ciudad de México' },
          'BC': { rate: 0.08, name: 'Baja California', isFrontera: true }
        }
      }
    };
    setCountryOverrides(mockOverrides);
  };

  const handleSaveRule = async () => {
    setLoading(true);
    try {
      if (editingRule) {
        // Actualizar regla existente
        setExemptionRules(prev => prev.map(rule => 
          rule.id === editingRule.id ? { ...newRule, id: editingRule.id } : rule
        ));
        toast.success('Tax exemption rule updated successfully');
      } else {
        // Crear nueva regla
        const newId = Math.max(...exemptionRules.map(r => r.id || 0), 0) + 1;
        setExemptionRules(prev => [...prev, { 
          ...newRule, 
          id: newId,
          createdAt: new Date().toISOString().split('T')[0],
          usageCount: 0
        }]);
        toast.success('Tax exemption rule created successfully');
      }
      handleCloseDialog();
    } catch (error) {
      toast.error('Error saving exemption rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this exemption rule?')) {
      setExemptionRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Exemption rule deleted successfully');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRule(null);
    setNewRule({
      name: '',
      description: '',
      country: '',
      active: true,
      priority: 1,
      conditions: [],
      exemptionType: 'full',
      exemptionValue: 0,
      applicableProducts: [],
      applicableCategories: [],
      customerTypes: [],
      validFrom: '',
      validTo: '',
      requiresDocumentation: false,
      documentTypes: [],
      autoApply: false,
      requiresApproval: false
    });
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setOpenDialog(true);
  };

  const handleDuplicateRule = (rule) => {
    const duplicatedRule = { 
      ...rule, 
      name: `${rule.name} (Copy)`,
      id: null
    };
    setNewRule(duplicatedRule);
    setOpenDialog(true);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const filteredRules = exemptionRules.filter(rule => {
    const matchesSearch = !searchTerm || 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = filterCountry === 'ALL' || rule.country === filterCountry;
    return matchesSearch && matchesCountry;
  });

  const renderGlobalSettings = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Configuración Global */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <GlobalIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Global Tax Settings</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Enable automatic tax calculation"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Show prices with tax included"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch />}
                    label="Require tax ID for business customers"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Validate tax certificates automatically"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch />}
                    label="Apply exemptions automatically when eligible"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Send exemption expiry notifications"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Países y sus tasas */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <LocationIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Country Tax Rates</Typography>
                </Box>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="small"
                >
                  Add Country
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Country</TableCell>
                      <TableCell>Tax Name</TableCell>
                      <TableCell>Default Rate</TableCell>
                      <TableCell>Special Rates</TableCell>
                      <TableCell>Exemption Types</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(COUNTRIES_TAX_CONFIG).map(([code, config]) => (
                      <TableRow key={code}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" fontWeight="bold">
                              {code}
                            </Typography>
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {config.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{config.taxName}</TableCell>
                        <TableCell>{(config.defaultRate * 100).toFixed(1)}%</TableCell>
                        <TableCell>
                          {config.specialRates && (
                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                              {Object.entries(config.specialRates).map(([key, rate]) => (
                                <Chip 
                                  key={key} 
                                  label={`${key}: ${(rate * 100).toFixed(0)}%`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {config.exemptionTypes.slice(0, 2).map(type => (
                              <Chip key={type} label={type} size="small" />
                            ))}
                            {config.exemptionTypes.length > 2 && (
                              <Chip 
                                label={`+${config.exemptionTypes.length - 2} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderExemptionRules = () => (
    <Box>
      {/* Barra de herramientas */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search rules..."
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Country</InputLabel>
            <Select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              label="Country"
            >
              <MenuItem value="ALL">All Countries</MenuItem>
              {Object.entries(COUNTRIES_TAX_CONFIG).map(([code, config]) => (
                <MenuItem key={code} value={code}>{config.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<ImportIcon />}
            variant="outlined"
          >
            Import
          </Button>
          <Button
            startIcon={<ExportIcon />}
            variant="outlined"
          >
            Export
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setOpenDialog(true)}
          >
            Add Rule
          </Button>
        </Box>
      </Box>

      {/* Lista de reglas */}
      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {filteredRules.map((rule) => (
            <Grid item xs={12} key={rule.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">{rule.name}</Typography>
                        <Chip 
                          label={rule.active ? 'Active' : 'Inactive'}
                          color={rule.active ? 'success' : 'default'}
                          size="small"
                        />
                        <Chip 
                          label={rule.exemptionType}
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                        <Chip 
                          label={`Priority: ${rule.priority}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {rule.description}
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                        <Chip 
                          icon={<LocationIcon />}
                          label={COUNTRIES_TAX_CONFIG[rule.country]?.name || rule.country}
                          size="small"
                        />
                        {rule.requiresDocumentation && (
                          <Chip 
                            icon={<ReceiptIcon />}
                            label="Requires Documentation"
                            size="small"
                            color="warning"
                          />
                        )}
                        {rule.requiresApproval && (
                          <Chip 
                            icon={<CheckCircleIcon />}
                            label="Requires Approval"
                            size="small"
                            color="info"
                          />
                        )}
                        {rule.autoApply && (
                          <Chip 
                            label="Auto Apply"
                            size="small"
                            color="success"
                          />
                        )}
                        <Chip 
                          label={`Used ${rule.usageCount} times`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => handleDuplicateRule(rule)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditRule(rule)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteRule(rule.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderProductExemptions = () => (
    <Box>
      <Grid container spacing={3}>
        {PRODUCT_CATEGORIES.map((category) => (
          <Grid item xs={12} md={6} key={category.id}>
            <Card>
              <CardContent>
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="space-between"
                  mb={2}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => toggleSection(category.id)}
                >
                  <Box display="flex" alignItems="center">
                    <Typography variant="h4" sx={{ mr: 1 }}>{category.icon}</Typography>
                    <Typography variant="h6">{category.name}</Typography>
                  </Box>
                  <IconButton size="small">
                    {expandedSections[category.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={expandedSections[category.id]}>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup>
                    <FormControlLabel
                      control={<Switch defaultChecked={category.id === 'tours'} />}
                      label="Apply default country tax"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Exempt from all taxes"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked={category.id === 'insurance'} />}
                      label="Zero-rated (0% tax)"
                    />
                  </FormGroup>
                  
                  <Box mt={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Custom tax rate (%)"
                      type="number"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>
                      }}
                    />
                  </Box>
                  
                  <Box mt={2}>
                    <Autocomplete
                      multiple
                      size="small"
                      options={Object.keys(COUNTRIES_TAX_CONFIG)}
                      getOptionLabel={(option) => COUNTRIES_TAX_CONFIG[option].name}
                      renderInput={(params) => (
                        <TextField {...params} label="Country-specific exemptions" />
                      )}
                    />
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderCustomerExemptions = () => (
    <Box>
      {/* Estadísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {Object.keys(customerExemptions).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Exempt Customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {Object.values(customerExemptions).filter(c => c.approved).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Approved Exemptions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                2
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expiring Soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main">
                1
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expired
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de clientes exentos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Certificate</TableCell>
              <TableCell>Countries</TableCell>
              <TableCell>Valid Until</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(customerExemptions).map((exemption) => {
              const isExpiring = new Date(exemption.validUntil) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              const isExpired = new Date(exemption.validUntil) < new Date();
              
              return (
                <TableRow key={exemption.customerId}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {exemption.customerName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {exemption.customerId}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={exemption.type}
                      size="small"
                      icon={<BusinessIcon />}
                    />
                  </TableCell>
                  <TableCell>{exemption.exemptionCertificate}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {exemption.countries.map(country => (
                        <Chip key={country} label={country} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">
                        {exemption.validUntil}
                      </Typography>
                      {isExpired && <Chip label="Expired" size="small" color="error" />}
                      {!isExpired && isExpiring && <Chip label="Expiring" size="small" color="warning" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={exemption.approved ? 'Approved' : 'Pending'}
                      color={exemption.approved ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <TaxIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                VAT & Tax Exemption Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage tax exemptions by product, service, customer type, and country
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button startIcon={<HistoryIcon />} variant="outlined">
              Audit Log
            </Button>
            <Button startIcon={<SaveIcon />} variant="contained">
              Save Changes
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Configure tax exemptions and special rates for different products, services, and customer types. 
            Rules are applied automatically during checkout based on customer profile and selected products.
          </Typography>
        </Alert>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Global Settings" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Exemption Rules" icon={<TaxIcon />} iconPosition="start" />
            <Tab label="Products & Services" icon={<ProductIcon />} iconPosition="start" />
            <Tab label="Customer Exemptions" icon={<PersonIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderGlobalSettings()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderExemptionRules()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderProductExemptions()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderCustomerExemptions()}
        </TabPanel>
      </Paper>

      {/* Dialog para crear/editar reglas */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? 'Edit Exemption Rule' : 'Create New Exemption Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={newRule.country}
                  onChange={(e) => setNewRule({ ...newRule, country: e.target.value })}
                  label="Country"
                  required
                >
                  {Object.entries(COUNTRIES_TAX_CONFIG).map(([code, config]) => (
                    <MenuItem key={code} value={code}>{config.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Exemption Type</InputLabel>
                <Select
                  value={newRule.exemptionType}
                  onChange={(e) => setNewRule({ ...newRule, exemptionType: e.target.value })}
                  label="Exemption Type"
                >
                  <MenuItem value="full">Full Exemption (100%)</MenuItem>
                  <MenuItem value="partial">Partial Exemption</MenuItem>
                  <MenuItem value="zero-rated">Zero-Rated (0%)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {newRule.exemptionType === 'partial' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Exemption Rate (%)"
                  type="number"
                  value={newRule.exemptionValue * 100}
                  onChange={(e) => setNewRule({ ...newRule, exemptionValue: e.target.value / 100 })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={PRODUCT_CATEGORIES}
                getOptionLabel={(option) => option.name}
                value={PRODUCT_CATEGORIES.filter(c => newRule.applicableCategories?.includes(c.id))}
                onChange={(e, value) => setNewRule({ ...newRule, applicableCategories: value.map(v => v.id) })}
                renderInput={(params) => (
                  <TextField {...params} label="Applicable Categories" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                multiple
                options={CUSTOMER_TYPES}
                getOptionLabel={(option) => option.name}
                value={CUSTOMER_TYPES.filter(t => newRule.customerTypes?.includes(t.id))}
                onChange={(e, value) => setNewRule({ ...newRule, customerTypes: value.map(v => v.id) })}
                renderInput={(params) => (
                  <TextField {...params} label="Customer Types" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valid From"
                type="date"
                value={newRule.validFrom}
                onChange={(e) => setNewRule({ ...newRule, validFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Valid To"
                type="date"
                value={newRule.validTo}
                onChange={(e) => setNewRule({ ...newRule, validTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={newRule.requiresDocumentation}
                    onChange={(e) => setNewRule({ ...newRule, requiresDocumentation: e.target.checked })}
                  />
                }
                label="Requires Documentation"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={newRule.autoApply}
                    onChange={(e) => setNewRule({ ...newRule, autoApply: e.target.checked })}
                  />
                }
                label="Auto Apply When Eligible"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={newRule.requiresApproval}
                    onChange={(e) => setNewRule({ ...newRule, requiresApproval: e.target.checked })}
                  />
                }
                label="Requires Manual Approval"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Priority (1 = highest)"
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                InputProps={{
                  inputProps: { min: 1, max: 100 }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRule} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!newRule.name || !newRule.country}
          >
            {editingRule ? 'Update' : 'Create'} Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}