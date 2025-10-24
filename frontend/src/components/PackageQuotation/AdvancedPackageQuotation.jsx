import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Grid, Typography, Button, Stepper, Step, StepLabel,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Card, CardContent, CardActions, Chip, LinearProgress, Alert,
  Accordion, AccordionSummary, AccordionDetails, Divider,
  List, ListItem, ListItemText, ListItemSecondary, ListItemIcon,
  InputAdornment, Switch, FormControlLabel, Tooltip, Badge,
  SpeedDial, SpeedDialAction, SpeedDialIcon, Autocomplete,
  Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
  TimelineContent, TimelineDot, TimelineOppositeContent
} from '@mui/material';

// Icons
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Save as SaveIcon, Send as SendIcon, Email as EmailIcon,
  DirectionsBus as BusIcon, Person as PersonIcon,
  ConfirmationNumber as TicketIcon, Hotel as HotelIcon,
  Restaurant as RestaurantIcon, Landscape as LandscapeIcon,
  AttachMoney as MoneyIcon, Calculate as CalculateIcon,
  Schedule as ScheduleIcon, Map as MapIcon, Groups as GroupsIcon,
  LocalActivity as ActivityIcon, Flight as FlightIcon,
  Train as TrainIcon, DirectionsBoat as BoatIcon,
  DirectionsCar as CarIcon, Warning as WarningIcon,
  CheckCircle as CheckIcon, Error as ErrorIcon,
  Info as InfoIcon, ExpandMore as ExpandMoreIcon,
  LocationOn as LocationIcon, CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon, Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon, TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

// Date picker
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// Custom components
import TransportQuotationModule from './TransportQuotationModule';
import GuideManagementPanel from './GuideManagementPanel';
import ServicesCatalog from './ServicesCatalog';
import ItineraryBuilder from './ItineraryBuilder';
import CostCalculator from './CostCalculator';
import ProviderNotificationCenter from './ProviderNotificationCenter';

// ==================== MAIN COMPONENT ====================

const AdvancedPackageQuotation = ({ quotationId, companyId, userId }) => {
  // ==================== STATE MANAGEMENT ====================
  
  const [activeStep, setActiveStep] = useState(0);
  const [packageData, setPackageData] = useState({
    packageName: '',
    packageType: 'CUSTOM',
    description: '',
    startDate: null,
    endDate: null,
    totalDays: 0,
    totalNights: 0,
    numPassengers: 0,
    numAdults: 0,
    numChildren: 0,
    numInfants: 0,
    departureCity: '',
    mainDestination: '',
    destinationsVisited: [],
    itinerary: [],
    transportQuotes: [],
    guideAssignments: [],
    services: [],
    costs: {
      baseCost: 0,
      transportCost: 0,
      accommodationCost: 0,
      guidesCost: 0,
      ticketsCost: 0,
      mealsCost: 0,
      otherServicesCost: 0,
      totalCost: 0,
      sellingPrice: 0,
      pricePerPerson: 0
    },
    margins: {
      operationalMargin: 0.15,
      agencyCommission: 0.10,
      taxesPercentage: 0.16
    }
  });

  const [itineraryDays, setItineraryDays] = useState([]);
  const [transportProviders, setTransportProviders] = useState([]);
  const [availableGuides, setAvailableGuides] = useState([]);
  const [tourismServices, setTourismServices] = useState([]);
  const [quotationStatus, setQuotationStatus] = useState('DRAFT');
  const [pendingQuotes, setPendingQuotes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [calculationMode, setCalculationMode] = useState('AUTOMATIC');
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const steps = [
    'Información General',
    'Itinerario Día por Día',
    'Transporte y Traslados',
    'Guías Turísticos',
    'Entradas y Servicios',
    'Cálculo de Costos',
    'Revisión y Envío'
  ];

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    loadInitialData();
  }, [quotationId]);

  useEffect(() => {
    if (packageData.startDate && packageData.endDate) {
      calculateDaysAndNights();
      generateItineraryTemplate();
    }
  }, [packageData.startDate, packageData.endDate]);

  useEffect(() => {
    if (calculationMode === 'AUTOMATIC') {
      calculateTotalCosts();
    }
  }, [itineraryDays, packageData.transportQuotes, packageData.guideAssignments]);

  // ==================== DATA LOADING ====================

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load transport providers
      const transportRes = await fetch('/api/v1/transport-providers');
      const transportData = await transportRes.json();
      setTransportProviders(transportData);

      // Load available guides
      const guidesRes = await fetch('/api/v1/tour-guides');
      const guidesData = await guidesRes.json();
      setAvailableGuides(guidesData);

      // Load tourism services catalog
      const servicesRes = await fetch('/api/v1/tourism-services');
      const servicesData = await servicesRes.json();
      setTourismServices(servicesData);

      // Load existing package if editing
      if (quotationId) {
        const packageRes = await fetch(`/api/v1/package-quotations/${quotationId}`);
        const packageData = await packageRes.json();
        setPackageData(packageData);
        setItineraryDays(packageData.itinerary || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ITINERARY MANAGEMENT ====================

  const generateItineraryTemplate = () => {
    if (!packageData.startDate || !packageData.endDate) return;

    const start = new Date(packageData.startDate);
    const end = new Date(packageData.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const template = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      
      template.push({
        dayNumber: i + 1,
        date: date.toISOString().split('T')[0],
        title: `Día ${i + 1}`,
        description: '',
        startingLocation: i === 0 ? packageData.departureCity : '',
        endingLocation: i === days - 1 ? packageData.departureCity : '',
        placesVisited: [],
        startTime: '08:00',
        endTime: '20:00',
        breakfastIncluded: true,
        lunchIncluded: true,
        dinnerIncluded: true,
        transportType: null,
        transportProvider: null,
        distanceKm: 0,
        drivingHours: 0,
        accommodation: null,
        activities: [],
        entranceTickets: [],
        assignedGuides: [],
        costs: {
          transport: 0,
          guides: 0,
          tickets: 0,
          meals: 0,
          accommodation: 0,
          total: 0
        },
        specialRequirements: [],
        warnings: ''
      });
    }
    
    setItineraryDays(template);
  };

  const updateItineraryDay = (dayIndex, field, value) => {
    const updated = [...itineraryDays];
    updated[dayIndex] = {
      ...updated[dayIndex],
      [field]: value
    };
    setItineraryDays(updated);
  };

  const addActivityToDay = (dayIndex, activity) => {
    const updated = [...itineraryDays];
    updated[dayIndex].activities.push(activity);
    setItineraryDays(updated);
  };

  // ==================== TRANSPORT QUOTATION ====================

  const requestTransportQuote = async (dayIndex, transportData) => {
    setLoading(true);
    try {
      const provider = transportProviders.find(p => p.id === transportData.providerId);
      
      if (provider.quotationMethod === 'AUTOMATIC') {
        // Calculate automatic quote
        const quote = calculateAutomaticTransportQuote(transportData, provider);
        addTransportQuote(dayIndex, quote);
      } else if (provider.quotationMethod === 'MANUAL_EMAIL') {
        // Send email request
        await sendTransportQuoteRequest(provider, transportData);
        showNotification(`Solicitud enviada a ${provider.companyName}`, 'info');
        setPendingQuotes([...pendingQuotes, { dayIndex, provider, status: 'PENDING' }]);
      } else if (provider.quotationMethod === 'MANUAL_FORM') {
        // Generate form link
        const formLink = await generateQuoteFormLink(provider, transportData);
        window.open(formLink, '_blank');
        showNotification('Formulario de cotización abierto', 'info');
      }
    } catch (error) {
      console.error('Error requesting transport quote:', error);
      showNotification('Error al solicitar cotización', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateAutomaticTransportQuote = (transportData, provider) => {
    const { distance, vehicleType, duration } = transportData;
    const rates = provider.vehicleRates[vehicleType] || {};
    
    let basePr = 0;
    if (rates.perKm && distance) {
      basePrice = rates.perKm * distance;
    } else if (rates.perHour && duration) {
      basePrice = rates.perHour * duration;
    } else if (rates.perDay) {
      basePrice = rates.perDay;
    }
    
    // Apply minimum charge
    basePrice = Math.max(basePrice, provider.minimumCharge || 0);
    
    // Add tolls and parking estimate
    const tollsParking = distance * 0.05; // Estimate 5% of distance cost
    
    return {
      providerId: provider.id,
      providerName: provider.companyName,
      vehicleType,
      distance,
      duration,
      basePrice,
      tollsParking,
      totalPrice: basePrice + tollsParking,
      status: 'QUOTED',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  };

  // ==================== GUIDE ASSIGNMENT ====================

  const assignGuide = (dayIndex, guide, hours = 8) => {
    const updated = [...itineraryDays];
    const assignment = {
      guideId: guide.id,
      guideName: `${guide.firstName} ${guide.lastName}`,
      guideType: guide.licenseType,
      hours,
      rate: guide.rateFullDay,
      totalCost: (hours / 8) * guide.rateFullDay
    };
    
    updated[dayIndex].assignedGuides.push(assignment);
    updated[dayIndex].costs.guides += assignment.totalCost;
    setItineraryDays(updated);
    
    // Update total guide cost
    calculateTotalCosts();
  };

  const removeGuide = (dayIndex, guideIndex) => {
    const updated = [...itineraryDays];
    const removed = updated[dayIndex].assignedGuides.splice(guideIndex, 1)[0];
    updated[dayIndex].costs.guides -= removed.totalCost;
    setItineraryDays(updated);
    calculateTotalCosts();
  };

  // ==================== SERVICES AND TICKETS ====================

  const addServiceToDay = (dayIndex, service, quantity = 1) => {
    const updated = [...itineraryDays];
    const serviceCost = calculateServiceCost(service, quantity);
    
    const serviceItem = {
      serviceId: service.id,
      serviceName: service.serviceName,
      category: service.category,
      quantity,
      pricePerUnit: service.priceAdult,
      totalPrice: serviceCost
    };
    
    if (service.category === 'ENTRANCE_TICKET') {
      updated[dayIndex].entranceTickets.push(serviceItem);
      updated[dayIndex].costs.tickets += serviceCost;
    } else {
      updated[dayIndex].activities.push(serviceItem);
      updated[dayIndex].costs.total += serviceCost;
    }
    
    setItineraryDays(updated);
    calculateTotalCosts();
  };

  const calculateServiceCost = (service, quantity) => {
    const adults = packageData.numAdults || 0;
    const children = packageData.numChildren || 0;
    
    let total = (service.priceAdult * adults) + (service.priceChild * children);
    
    // Apply group discount if applicable
    if ((adults + children) >= service.groupSizeMinimum && service.priceGroup) {
      total = service.priceGroup * quantity;
    }
    
    return total;
  };

  // ==================== COST CALCULATION ====================

  const calculateTotalCosts = () => {
    let costs = {
      baseCost: 0,
      transportCost: 0,
      accommodationCost: 0,
      guidesCost: 0,
      ticketsCost: 0,
      mealsCost: 0,
      otherServicesCost: 0
    };
    
    // Sum costs from each day
    itineraryDays.forEach(day => {
      costs.transportCost += day.costs.transport || 0;
      costs.guidesCost += day.costs.guides || 0;
      costs.ticketsCost += day.costs.tickets || 0;
      costs.mealsCost += day.costs.meals || 0;
      costs.accommodationCost += day.costs.accommodation || 0;
    });
    
    // Calculate total base cost
    costs.baseCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    
    // Apply margins
    const { operationalMargin, agencyCommission, taxesPercentage } = packageData.margins;
    let sellingPrice = costs.baseCost;
    sellingPrice *= (1 + operationalMargin); // Add operational margin
    sellingPrice *= (1 + agencyCommission);  // Add agency commission
    sellingPrice *= (1 + taxesPercentage);   // Add taxes
    
    costs.totalCost = costs.baseCost;
    costs.sellingPrice = Math.round(sellingPrice * 100) / 100;
    costs.pricePerPerson = packageData.numPassengers > 0 
      ? Math.round((costs.sellingPrice / packageData.numPassengers) * 100) / 100
      : 0;
    
    setPackageData(prev => ({
      ...prev,
      costs
    }));
  };

  // ==================== PROVIDER NOTIFICATIONS ====================

  const sendQuotationToProviders = async () => {
    setLoading(true);
    const notifications = [];
    
    try {
      // Notify transport providers
      for (const day of itineraryDays) {
        if (day.transportProvider && !day.transportConfirmed) {
          const result = await notifyTransportProvider(day);
          notifications.push(result);
        }
      }
      
      // Notify guides
      const uniqueGuides = getUniqueGuides();
      for (const guide of uniqueGuides) {
        const result = await notifyGuide(guide);
        notifications.push(result);
      }
      
      // Notify service providers if needed
      const servicesRequiringConfirmation = getServicesRequiringConfirmation();
      for (const service of servicesRequiringConfirmation) {
        const result = await notifyServiceProvider(service);
        notifications.push(result);
      }
      
      setNotifications(notifications);
      showNotification(`${notifications.length} notificaciones enviadas`, 'success');
      
    } catch (error) {
      console.error('Error sending notifications:', error);
      showNotification('Error al enviar notificaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== VALIDATION ====================

  const validatePackage = () => {
    const errors = [];
    
    // Basic info validation
    if (!packageData.packageName) errors.push('Nombre del paquete requerido');
    if (!packageData.startDate) errors.push('Fecha de inicio requerida');
    if (!packageData.endDate) errors.push('Fecha de fin requerida');
    if (!packageData.numPassengers) errors.push('Número de pasajeros requerido');
    
    // Itinerary validation
    itineraryDays.forEach((day, index) => {
      if (!day.title) errors.push(`Título requerido para día ${index + 1}`);
      if (!day.startingLocation) errors.push(`Ubicación inicial requerida para día ${index + 1}`);
      if (day.activities.length === 0) errors.push(`Sin actividades en día ${index + 1}`);
    });
    
    // Cost validation
    if (packageData.costs.totalCost === 0) {
      errors.push('El costo total no puede ser cero');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // ==================== SUBMISSION ====================

  const submitQuotation = async () => {
    if (!validatePackage()) {
      showNotification('Por favor corrija los errores antes de enviar', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/v1/package-quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...packageData,
          itinerary: itineraryDays,
          status: 'SUBMITTED',
          quotationId,
          companyId,
          userId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        showNotification('Cotización enviada exitosamente', 'success');
        await sendQuotationToProviders();
        // Redirect or update UI
      } else {
        throw new Error('Error al enviar cotización');
      }
    } catch (error) {
      console.error('Error submitting quotation:', error);
      showNotification('Error al enviar cotización', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==================== UI HELPERS ====================

  const showNotification = (message, severity = 'info') => {
    // Implement notification system
    console.log(`${severity}: ${message}`);
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const calculateDaysAndNights = () => {
    if (packageData.startDate && packageData.endDate) {
      const start = new Date(packageData.startDate);
      const end = new Date(packageData.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const nights = days - 1;
      
      setPackageData(prev => ({
        ...prev,
        totalDays: days,
        totalNights: nights
      }));
    }
  };

  // ==================== RENDER METHODS ====================

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return <GeneralInfoStep packageData={packageData} setPackageData={setPackageData} />;
      case 1:
        return <ItineraryStep itineraryDays={itineraryDays} updateItineraryDay={updateItineraryDay} />;
      case 2:
        return <TransportStep 
          itineraryDays={itineraryDays} 
          transportProviders={transportProviders}
          requestTransportQuote={requestTransportQuote}
        />;
      case 3:
        return <GuidesStep 
          itineraryDays={itineraryDays}
          availableGuides={availableGuides}
          assignGuide={assignGuide}
          removeGuide={removeGuide}
        />;
      case 4:
        return <ServicesStep
          itineraryDays={itineraryDays}
          tourismServices={tourismServices}
          addServiceToDay={addServiceToDay}
        />;
      case 5:
        return <CostCalculationStep 
          packageData={packageData}
          itineraryDays={itineraryDays}
          calculateTotalCosts={calculateTotalCosts}
        />;
      case 6:
        return <ReviewStep 
          packageData={packageData}
          itineraryDays={itineraryDays}
          validationErrors={validationErrors}
          submitQuotation={submitQuotation}
        />;
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={es}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            🎯 Sistema Avanzado de Cotización de Paquetes Turísticos
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Cotización completa con itinerario, transporte, guías y servicios
          </Typography>
        </Paper>

        {/* Progress Stepper */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Main Content */}
        <Paper sx={{ p: 3, minHeight: 500 }}>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Errores encontrados:</Typography>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Step Content */}
          {renderStepContent(activeStep)}

          {/* Navigation Buttons */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Anterior
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={submitQuotation}
                disabled={loading || validationErrors.length > 0}
                startIcon={<SendIcon />}
              >
                Enviar Cotización
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
              >
                Siguiente
              </Button>
            )}
          </Box>
        </Paper>

        {/* Cost Summary Sidebar */}
        <Paper sx={{ position: 'fixed', right: 20, top: 100, width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            💰 Resumen de Costos
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={1}>
            <Grid item xs={8}>
              <Typography variant="body2">Transporte:</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" align="right">
                ${packageData.costs.transportCost.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={8}>
              <Typography variant="body2">Guías:</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" align="right">
                ${packageData.costs.guidesCost.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={8}>
              <Typography variant="body2">Entradas:</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" align="right">
                ${packageData.costs.ticketsCost.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={8}>
              <Typography variant="body2">Alojamiento:</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" align="right">
                ${packageData.costs.accommodationCost.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={8}>
              <Typography variant="body2">Comidas:</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" align="right">
                ${packageData.costs.mealsCost.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            
            <Grid item xs={8}>
              <Typography variant="subtitle2">
                <strong>Costo Base:</strong>
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2" align="right">
                <strong>${packageData.costs.baseCost.toFixed(2)}</strong>
              </Typography>
            </Grid>
            
            <Grid item xs={8}>
              <Typography variant="h6" color="primary">
                <strong>Precio Venta:</strong>
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="h6" color="primary" align="right">
                <strong>${packageData.costs.sellingPrice.toFixed(2)}</strong>
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Por persona:</strong> ${packageData.costs.pricePerPerson.toFixed(2)}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>

        {/* Floating Action Button for Quick Actions */}
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<SaveIcon />}
            tooltipTitle="Guardar Borrador"
            onClick={() => console.log('Save draft')}
          />
          <SpeedDialAction
            icon={<CalculateIcon />}
            tooltipTitle="Recalcular Costos"
            onClick={calculateTotalCosts}
          />
          <SpeedDialAction
            icon={<EmailIcon />}
            tooltipTitle="Enviar a Proveedores"
            onClick={sendQuotationToProviders}
          />
        </SpeedDial>
      </Box>
    </LocalizationProvider>
  );
};

// ==================== STEP COMPONENTS ====================

const GeneralInfoStep = ({ packageData, setPackageData }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Información General del Paquete
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Nombre del Paquete"
          value={packageData.packageName}
          onChange={(e) => setPackageData({...packageData, packageName: e.target.value})}
          required
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Tipo de Paquete</InputLabel>
          <Select
            value={packageData.packageType}
            onChange={(e) => setPackageData({...packageData, packageType: e.target.value})}
          >
            <MenuItem value="CULTURAL">Cultural</MenuItem>
            <MenuItem value="ADVENTURE">Aventura</MenuItem>
            <MenuItem value="BEACH">Playa</MenuItem>
            <MenuItem value="BUSINESS">Negocios</MenuItem>
            <MenuItem value="RELIGIOUS">Religioso</MenuItem>
            <MenuItem value="EDUCATIONAL">Educativo</MenuItem>
            <MenuItem value="LUXURY">Lujo</MenuItem>
            <MenuItem value="BUDGET">Económico</MenuItem>
            <MenuItem value="CUSTOM">Personalizado</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      {/* Add more fields as needed */}
    </Grid>
  );
};

// Add more step components...

export default AdvancedPackageQuotation;