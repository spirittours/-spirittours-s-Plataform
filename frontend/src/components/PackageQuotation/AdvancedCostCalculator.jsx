"""
Advanced Cost Calculator Component
Handles operational costs, staff accommodation, and group-based pricing
"""

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  FormGroup,
  Checkbox,
  InputAdornment,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tab,
  Tabs,
  Badge,
  Avatar,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';

import {
  Calculate,
  Hotel,
  DirectionsCar,
  Person,
  Restaurant,
  AttachMoney,
  Group,
  Settings,
  Info,
  Warning,
  CheckCircle,
  Error,
  ExpandMore,
  Add,
  Remove,
  Edit,
  Save,
  Cancel,
  TrendingUp,
  TrendingDown,
  Assessment,
  LocalGasStation,
  LocalParking,
  EmergencyShare,
  Receipt,
  AccountBalance,
  Groups,
  School,
  Business,
  Church,
  Elderly,
  FamilyRestroom,
  Hiking,
  Diamond,
  MoneyOff,
  Accessible,
  Language,
  RestaurantMenu,
  PhotoCamera,
  Nature,
  Castle,
  ShoppingBag,
  Nightlife,
  SportsBasketball,
  Spa,
  Palette,
  Agriculture,
  FlightTakeoff,
  Train,
  DirectionsBus,
  DirectionsBoat,
  DirectionsWalk,
  TwoWheeler,
  LocalTaxi
} from '@mui/icons-material';

import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { DataGrid } from '@mui/x-data-grid';

const GROUP_TYPES = {
  EDUCATIONAL: { label: 'Educativo', icon: School, color: '#4CAF50' },
  CORPORATE: { label: 'Corporativo', icon: Business, color: '#2196F3' },
  RELIGIOUS: { label: 'Religioso', icon: Church, color: '#9C27B0' },
  SENIOR: { label: 'Tercera Edad', icon: Elderly, color: '#FF9800' },
  FAMILY: { label: 'Familiar', icon: FamilyRestroom, color: '#00BCD4' },
  ADVENTURE: { label: 'Aventura', icon: Hiking, color: '#8BC34A' },
  LUXURY: { label: 'Lujo', icon: Diamond, color: '#FFC107' },
  BUDGET: { label: 'Económico', icon: MoneyOff, color: '#607D8B' },
  SPECIAL_NEEDS: { label: 'Necesidades Especiales', icon: Accessible, color: '#E91E63' }
};

const DIETARY_REQUIREMENTS = [
  'Vegetariano',
  'Vegano',
  'Halal',
  'Kosher',
  'Sin Gluten',
  'Diabético',
  'Alergias',
  'Sin Restricciones'
];

const INTERESTS = [
  { value: 'HISTORY', label: 'Historia', icon: Castle },
  { value: 'NATURE', label: 'Naturaleza', icon: Nature },
  { value: 'PHOTOGRAPHY', label: 'Fotografía', icon: PhotoCamera },
  { value: 'GASTRONOMY', label: 'Gastronomía', icon: RestaurantMenu },
  { value: 'SHOPPING', label: 'Compras', icon: ShoppingBag },
  { value: 'NIGHTLIFE', label: 'Vida Nocturna', icon: Nightlife },
  { value: 'SPORTS', label: 'Deportes', icon: SportsBasketball },
  { value: 'WELLNESS', label: 'Bienestar', icon: Spa },
  { value: 'ARTS', label: 'Arte', icon: Palette },
  { value: 'AGRICULTURE', label: 'Agricultura', icon: Agriculture }
];

export default function AdvancedCostCalculator({ packageData, onCostCalculated }) {
  // State Management
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Group Profile State
  const [groupProfile, setGroupProfile] = useState({
    groupName: '',
    organization: '',
    groupType: 'MIXED',
    profileType: 'GENERAL',
    totalPassengers: 20,
    adults: 18,
    children: 2,
    seniors: 0,
    dietaryRequirements: [],
    accessibilityNeeds: [],
    interests: [],
    activityLevel: 'MODERATE',
    pacePreference: 'RELAXED',
    languages: ['Español'],
    accommodationPreference: 'STANDARD',
    totalBudget: 0,
    perPersonBudget: 0,
    budgetFlexibility: 'MODERATE'
  });
  
  // Cost Calculation State
  const [costCalculation, setCostCalculation] = useState({
    hotelDoubleRate: 100,
    nights: 0,
    includeDriver: true,
    includeGuide: true,
    additionalStaff: 0,
    tripDays: 0,
    totalDistance: 0,
    mealAllowancePerDay: 25,
    incidentalAllowancePerDay: 10,
    tollRatePer100km: 15,
    parkingPerDay: 20,
    fuelSurchargePercent: 10,
    emergencyFundPercent: 5
  });
  
  // Pricing Table State
  const [pricingTable, setPricingTable] = useState({});
  const [customPricingTable, setCustomPricingTable] = useState(false);
  const [editingPricingTable, setEditingPricingTable] = useState(false);
  
  // Results State
  const [calculationResults, setCalculationResults] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // ==================== CALCULATIONS ====================
  
  const calculateStaffAccommodation = () => {
    const { hotelDoubleRate, nights, includeDriver, includeGuide, additionalStaff } = costCalculation;
    
    // Price per person in double room
    const pricePerPersonDouble = hotelDoubleRate / 2;
    
    // Single supplement (50% additional)
    const singleSupplement = pricePerPersonDouble * 0.5;
    
    // Single room rate
    const singleRoomRate = pricePerPersonDouble + singleSupplement;
    
    // Number of rooms needed
    let roomsNeeded = 0;
    if (includeDriver) roomsNeeded++;
    if (includeGuide) roomsNeeded++;
    roomsNeeded += additionalStaff;
    
    // Total accommodation cost
    const totalAccommodation = singleRoomRate * roomsNeeded * nights;
    
    return {
      pricePerPersonDouble,
      singleSupplement,
      singleRoomRate,
      roomsNeeded,
      totalAccommodation,
      costPerNight: singleRoomRate * roomsNeeded
    };
  };
  
  const calculateOperationalExpenses = () => {
    const {
      tripDays,
      totalDistance,
      includeDriver,
      includeGuide,
      mealAllowancePerDay,
      incidentalAllowancePerDay,
      tollRatePer100km,
      parkingPerDay,
      fuelSurchargePercent,
      emergencyFundPercent
    } = costCalculation;
    
    const staffCount = (includeDriver ? 1 : 0) + (includeGuide ? 1 : 0);
    
    const expenses = {
      staffMeals: mealAllowancePerDay * staffCount * tripDays,
      incidentals: incidentalAllowancePerDay * staffCount * tripDays,
      tolls: (totalDistance / 100) * tollRatePer100km,
      parking: parkingPerDay * tripDays,
      fuelSurcharge: 0, // Will be calculated based on transport cost
      emergencyFund: 0 // Will be calculated as percentage of subtotal
    };
    
    // Calculate subtotal
    const subtotal = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    
    // Add emergency fund
    expenses.emergencyFund = subtotal * (emergencyFundPercent / 100);
    
    const totalExpenses = subtotal + expenses.emergencyFund;
    
    return {
      expenses,
      totalExpenses,
      perDayExpenses: totalExpenses / tripDays
    };
  };
  
  const calculateCostPerPassenger = () => {
    const { totalPassengers } = groupProfile;
    
    if (!calculationResults) return null;
    
    // Get division factor from pricing table
    const divisionFactor = getDivisionFactor(totalPassengers);
    
    // Calculate per passenger costs
    const totalGroupCost = calculationResults.totalCost;
    const costPerPassenger = totalGroupCost * divisionFactor;
    
    // Calculate savings
    const standardDivision = 1 / totalPassengers;
    const savingsPercent = ((standardDivision - divisionFactor) / standardDivision) * 100;
    
    return {
      costPerPassenger,
      totalGroupCost,
      divisionFactor,
      savingsPercent,
      savingsAmount: totalGroupCost * (standardDivision - divisionFactor)
    };
  };
  
  const getDivisionFactor = (passengers) => {
    // Default pricing table
    if (!customPricingTable) {
      if (passengers <= 10) return 1 / passengers;
      if (passengers <= 20) return (1 / passengers) * 0.95; // 5% discount
      if (passengers <= 30) return (1 / passengers) * 0.90; // 10% discount
      if (passengers <= 40) return (1 / passengers) * 0.85; // 15% discount
      if (passengers <= 50) return (1 / passengers) * 0.80; // 20% discount
      return (1 / passengers) * 0.75; // 25% discount for 50+
    }
    
    // Custom pricing table
    return pricingTable[passengers] || (1 / passengers);
  };
  
  const performFullCalculation = () => {
    setLoading(true);
    
    try {
      // Calculate staff accommodation
      const accommodation = calculateStaffAccommodation();
      
      // Calculate operational expenses
      const operational = calculateOperationalExpenses();
      
      // Base costs (from package data)
      const baseCosts = packageData?.baseCosts || {
        accommodation: 0,
        transport: 0,
        guides: 0,
        entranceTickets: 0,
        meals: 0
      };
      
      // Total costs
      const totalCost = 
        Object.values(baseCosts).reduce((sum, val) => sum + val, 0) +
        accommodation.totalAccommodation +
        operational.totalExpenses;
      
      // Cost per passenger
      const perPassenger = totalCost / groupProfile.totalPassengers;
      
      // Set results
      setCalculationResults({
        staffAccommodation: accommodation,
        operationalExpenses: operational,
        baseCosts,
        totalCost,
        perPassenger,
        breakdown: {
          baseCostsTotal: Object.values(baseCosts).reduce((sum, val) => sum + val, 0),
          staffAccommodationTotal: accommodation.totalAccommodation,
          operationalExpensesTotal: operational.totalExpenses
        }
      });
      
      // Notify parent component
      if (onCostCalculated) {
        onCostCalculated({
          totalCost,
          perPassenger,
          groupProfile,
          breakdown: {
            ...baseCosts,
            staffAccommodation: accommodation.totalAccommodation,
            operationalExpenses: operational.totalExpenses
          }
        });
      }
    } catch (error) {
      console.error('Error calculating costs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== RENDER COMPONENTS ====================
  
  const renderGroupProfileForm = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Perfil del Grupo
      </Typography>
      
      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nombre del Grupo"
            value={groupProfile.groupName}
            onChange={(e) => setGroupProfile({ ...groupProfile, groupName: e.target.value })}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Organización"
            value={groupProfile.organization}
            onChange={(e) => setGroupProfile({ ...groupProfile, organization: e.target.value })}
          />
        </Grid>
        
        {/* Group Type */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Tipo de Grupo</InputLabel>
            <Select
              value={groupProfile.groupType}
              onChange={(e) => setGroupProfile({ ...groupProfile, groupType: e.target.value })}
              label="Tipo de Grupo"
            >
              {Object.entries(GROUP_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <value.icon sx={{ color: value.color }} />
                    {value.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Passenger Composition */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Composición del Grupo
          </Typography>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <TextField
            fullWidth
            type="number"
            label="Total Pasajeros"
            value={groupProfile.totalPassengers}
            onChange={(e) => setGroupProfile({ 
              ...groupProfile, 
              totalPassengers: parseInt(e.target.value) || 0
            })}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Groups /></InputAdornment>
            }}
          />
        </Grid>
        
        <Grid item xs={6} md={3}>
          <TextField
            fullWidth
            type="number"
            label="Adultos"
            value={groupProfile.adults}
            onChange={(e) => setGroupProfile({ 
              ...groupProfile, 
              adults: parseInt(e.target.value) || 0
            })}
          />
        </Grid>
        
        <Grid item xs={6} md={3}>
          <TextField
            fullWidth
            type="number"
            label="Niños"
            value={groupProfile.children}
            onChange={(e) => setGroupProfile({ 
              ...groupProfile, 
              children: parseInt(e.target.value) || 0
            })}
          />
        </Grid>
        
        <Grid item xs={6} md={3}>
          <TextField
            fullWidth
            type="number"
            label="Tercera Edad"
            value={groupProfile.seniors}
            onChange={(e) => setGroupProfile({ 
              ...groupProfile, 
              seniors: parseInt(e.target.value) || 0
            })}
          />
        </Grid>
        
        {/* Special Needs */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Necesidades Especiales
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Requisitos Dietéticos</InputLabel>
            <Select
              multiple
              value={groupProfile.dietaryRequirements}
              onChange={(e) => setGroupProfile({ 
                ...groupProfile, 
                dietaryRequirements: e.target.value 
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {DIETARY_REQUIREMENTS.map((diet) => (
                <MenuItem key={diet} value={diet}>
                  <Checkbox checked={groupProfile.dietaryRequirements.indexOf(diet) > -1} />
                  <ListItemText primary={diet} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={groupProfile.accessibilityNeeds.length > 0}
                onChange={(e) => setGroupProfile({
                  ...groupProfile,
                  accessibilityNeeds: e.target.checked ? ['WHEELCHAIR'] : []
                })}
              />
            }
            label="Necesidades de Accesibilidad"
          />
        </Grid>
        
        {/* Interests */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Intereses del Grupo
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {INTERESTS.map((interest) => (
              <Chip
                key={interest.value}
                label={interest.label}
                icon={<interest.icon />}
                onClick={() => {
                  const newInterests = groupProfile.interests.includes(interest.value)
                    ? groupProfile.interests.filter(i => i !== interest.value)
                    : [...groupProfile.interests, interest.value];
                  setGroupProfile({ ...groupProfile, interests: newInterests });
                }}
                color={groupProfile.interests.includes(interest.value) ? 'primary' : 'default'}
                variant={groupProfile.interests.includes(interest.value) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Grid>
        
        {/* Preferences */}
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Nivel de Actividad</InputLabel>
            <Select
              value={groupProfile.activityLevel}
              onChange={(e) => setGroupProfile({ ...groupProfile, activityLevel: e.target.value })}
              label="Nivel de Actividad"
            >
              <MenuItem value="LOW">Bajo</MenuItem>
              <MenuItem value="MODERATE">Moderado</MenuItem>
              <MenuItem value="HIGH">Alto</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Ritmo Preferido</InputLabel>
            <Select
              value={groupProfile.pacePreference}
              onChange={(e) => setGroupProfile({ ...groupProfile, pacePreference: e.target.value })}
              label="Ritmo Preferido"
            >
              <MenuItem value="RELAXED">Relajado</MenuItem>
              <MenuItem value="MODERATE">Moderado</MenuItem>
              <MenuItem value="INTENSIVE">Intensivo</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Preferencia de Alojamiento</InputLabel>
            <Select
              value={groupProfile.accommodationPreference}
              onChange={(e) => setGroupProfile({ ...groupProfile, accommodationPreference: e.target.value })}
              label="Preferencia de Alojamiento"
            >
              <MenuItem value="BUDGET">Económico</MenuItem>
              <MenuItem value="STANDARD">Estándar</MenuItem>
              <MenuItem value="COMFORT">Comfort</MenuItem>
              <MenuItem value="LUXURY">Lujo</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
  
  const renderCostCalculation = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Cálculo de Costos Operacionales
      </Typography>
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Alojamiento del Personal</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Tarifa Habitación Doble (USD)"
                value={costCalculation.hotelDoubleRate}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  hotelDoubleRate: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Noches"
                value={costCalculation.nights}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  nights: parseInt(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Hotel /></InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Personal Adicional"
                value={costCalculation.additionalStaff}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  additionalStaff: parseInt(e.target.value) || 0
                })}
                helperText="Además de conductor y guía"
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={costCalculation.includeDriver}
                    onChange={(e) => setCostCalculation({
                      ...costCalculation,
                      includeDriver: e.target.checked
                    })}
                  />
                }
                label="Incluir Conductor"
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={costCalculation.includeGuide}
                    onChange={(e) => setCostCalculation({
                      ...costCalculation,
                      includeGuide: e.target.checked
                    })}
                  />
                }
                label="Incluir Guía"
              />
            </Grid>
            
            {/* Show calculation */}
            {calculationResults?.staffAccommodation && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="subtitle2">Cálculo de Alojamiento:</Typography>
                  <Typography variant="body2">
                    • Precio por persona en doble: ${calculationResults.staffAccommodation.pricePerPersonDouble.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    • Suplemento individual (50%): ${calculationResults.staffAccommodation.singleSupplement.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    • Tarifa habitación sencilla: ${calculationResults.staffAccommodation.singleRoomRate.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    • Habitaciones necesarias: {calculationResults.staffAccommodation.roomsNeeded}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Total Alojamiento Personal: ${calculationResults.staffAccommodation.totalAccommodation.toFixed(2)}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Gastos en Ruta</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Días de Viaje"
                value={costCalculation.tripDays}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  tripDays: parseInt(e.target.value) || 0
                })}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Distancia Total (km)"
                value={costCalculation.totalDistance}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  totalDistance: parseFloat(e.target.value) || 0
                })}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Dieta Diaria por Persona"
                value={costCalculation.mealAllowancePerDay}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  mealAllowancePerDay: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Gastos Varios por Día"
                value={costCalculation.incidentalAllowancePerDay}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  incidentalAllowancePerDay: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Peajes por 100km"
                value={costCalculation.tollRatePer100km}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  tollRatePer100km: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Estacionamiento por Día"
                value={costCalculation.parkingPerDay}
                onChange={(e) => setCostCalculation({
                  ...costCalculation,
                  parkingPerDay: parseFloat(e.target.value) || 0
                })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Recargo Combustible: {costCalculation.fuelSurchargePercent}%
              </Typography>
              <Slider
                value={costCalculation.fuelSurchargePercent}
                onChange={(e, value) => setCostCalculation({
                  ...costCalculation,
                  fuelSurchargePercent: value
                })}
                min={0}
                max={30}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Fondo de Emergencia: {costCalculation.emergencyFundPercent}%
              </Typography>
              <Slider
                value={costCalculation.emergencyFundPercent}
                onChange={(e, value) => setCostCalculation({
                  ...costCalculation,
                  emergencyFundPercent: value
                })}
                min={0}
                max={20}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>
            
            {/* Show calculation */}
            {calculationResults?.operationalExpenses && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="subtitle2">Gastos Operacionales:</Typography>
                  {Object.entries(calculationResults.operationalExpenses.expenses).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      • {key.replace(/([A-Z])/g, ' $1').trim()}: ${value.toFixed(2)}
                    </Typography>
                  ))}
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Total Gastos Operacionales: ${calculationResults.operationalExpenses.totalExpenses.toFixed(2)}
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
  
  const renderPricingTable = () => (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Tabla de División de Costos por Pasajeros
        </Typography>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={customPricingTable}
                onChange={(e) => setCustomPricingTable(e.target.checked)}
              />
            }
            label="Tabla Personalizada"
          />
          {customPricingTable && (
            <Button
              startIcon={editingPricingTable ? <Save /> : <Edit />}
              onClick={() => setEditingPricingTable(!editingPricingTable)}
              variant="outlined"
              size="small"
              sx={{ ml: 2 }}
            >
              {editingPricingTable ? 'Guardar' : 'Editar'}
            </Button>
          )}
        </Box>
      </Box>
      
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Pasajeros</TableCell>
              <TableCell align="right">Factor División</TableCell>
              <TableCell align="right">Descuento %</TableCell>
              <TableCell align="right">Costo por Pasajero</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((passengers) => {
              const factor = getDivisionFactor(passengers);
              const discount = ((1 - (factor * passengers)) * 100);
              const costPerPax = calculationResults 
                ? (calculationResults.totalCost * factor).toFixed(2)
                : '-';
              
              return (
                <TableRow key={passengers}>
                  <TableCell>{passengers}</TableCell>
                  <TableCell align="right">
                    {editingPricingTable ? (
                      <TextField
                        size="small"
                        type="number"
                        value={pricingTable[passengers] || factor}
                        onChange={(e) => setPricingTable({
                          ...pricingTable,
                          [passengers]: parseFloat(e.target.value)
                        })}
                        inputProps={{ step: 0.001, min: 0, max: 1 }}
                      />
                    ) : (
                      factor.toFixed(4)
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={`${discount.toFixed(1)}%`}
                      size="small"
                      color={discount > 0 ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {costPerPax !== '-' && '$'}{costPerPax}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
  
  const renderResults = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Resumen de Costos
      </Typography>
      
      {calculationResults ? (
        <Grid container spacing={3}>
          {/* Total Summary */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Costo Total del Paquete
                </Typography>
                <Typography variant="h4">
                  ${calculationResults.totalCost.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Para {groupProfile.totalPassengers} pasajeros
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Costo por Pasajero
                </Typography>
                <Typography variant="h4">
                  ${calculationResults.perPassenger.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="success.main">
                  {calculateCostPerPassenger()?.savingsPercent.toFixed(1)}% ahorro por grupo
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Costos Operacionales
                </Typography>
                <Typography variant="h4">
                  ${(calculationResults.staffAccommodation.totalAccommodation + 
                     calculationResults.operationalExpenses.totalExpenses).toFixed(2)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Alojamiento + Gastos en ruta
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Breakdown Chart */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Distribución de Costos
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Doughnut
                    data={{
                      labels: [
                        'Servicios Base',
                        'Alojamiento Personal',
                        'Gastos Operacionales'
                      ],
                      datasets: [{
                        data: [
                          calculationResults.breakdown.baseCostsTotal,
                          calculationResults.breakdown.staffAccommodationTotal,
                          calculationResults.breakdown.operationalExpensesTotal
                        ],
                        backgroundColor: [
                          '#2196F3',
                          '#4CAF50',
                          '#FF9800'
                        ]
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Detailed Breakdown */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              onClick={() => setShowBreakdown(!showBreakdown)}
              startIcon={showBreakdown ? <Remove /> : <Add />}
            >
              {showBreakdown ? 'Ocultar' : 'Mostrar'} Desglose Detallado
            </Button>
            
            {showBreakdown && (
              <Box sx={{ mt: 2 }}>
                <List>
                  <ListItem>
                    <ListItemIcon><Hotel /></ListItemIcon>
                    <ListItemText 
                      primary="Alojamiento Personal"
                      secondary={`${costCalculation.nights} noches × ${calculationResults.staffAccommodation.roomsNeeded} habitaciones`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6">
                        ${calculationResults.staffAccommodation.totalAccommodation.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon><Restaurant /></ListItemIcon>
                    <ListItemText 
                      primary="Alimentación Personal"
                      secondary={`$${costCalculation.mealAllowancePerDay}/día × ${costCalculation.tripDays} días`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6">
                        ${calculationResults.operationalExpenses.expenses.staffMeals.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon><LocalGasStation /></ListItemIcon>
                    <ListItemText 
                      primary="Peajes y Combustible"
                      secondary={`${costCalculation.totalDistance}km de recorrido`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6">
                        ${calculationResults.operationalExpenses.expenses.tolls.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon><EmergencyShare /></ListItemIcon>
                    <ListItemText 
                      primary="Fondo de Emergencia"
                      secondary={`${costCalculation.emergencyFundPercent}% del subtotal`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="h6">
                        ${calculationResults.operationalExpenses.expenses.emergencyFund.toFixed(2)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
                  <Typography variant="h6">
                    Total General
                  </Typography>
                  <Typography variant="h5" color="primary">
                    ${calculationResults.totalCost.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">
          Complete los datos y presione "Calcular Costos" para ver los resultados
        </Alert>
      )}
    </Paper>
  );
  
  // ==================== MAIN RENDER ====================
  
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Calculadora Avanzada de Costos
        </Typography>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Calculate />}
          onClick={performFullCalculation}
          disabled={loading}
        >
          Calcular Costos
        </Button>
      </Box>
      
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Perfil del Grupo" icon={<Group />} />
          <Tab label="Costos Operacionales" icon={<AttachMoney />} />
          <Tab label="Tabla de Precios" icon={<Assessment />} />
          <Tab label="Resultados" icon={<TrendingUp />} />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        {currentTab === 0 && renderGroupProfileForm()}
        {currentTab === 1 && renderCostCalculation()}
        {currentTab === 2 && renderPricingTable()}
        {currentTab === 3 && renderResults()}
      </Box>
    </Box>
  );
}