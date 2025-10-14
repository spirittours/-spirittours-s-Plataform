import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Stepper, Step, StepLabel,
  Grid, Card, CardContent, CardActions, TextField, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControlLabel, Switch, Alert, Snackbar, LinearProgress,
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  Avatar, AvatarGroup, Tooltip, Badge, Tab, Tabs, 
  ToggleButton, ToggleButtonGroup, Slider, InputAdornment,
  Menu, MenuItem, Checkbox, Radio, RadioGroup, FormControl,
  FormLabel, Select, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';

import {
  Groups, Hotel, AttachMoney, Visibility, VisibilityOff,
  Timer, Edit, Save, Cancel, Send, CheckCircle, Error,
  Info, Warning, ExpandMore, MoreVert, Add, Remove,
  CalendarToday, LocationOn, Person, Email, Phone,
  Payment, Receipt, Notifications, Extension, Lock,
  LockOpen, TrendingUp, TrendingDown, CompareArrows,
  AdminPanelSettings, SupervisorAccount, ManageAccounts
} from '@mui/icons-material';

// Configuración de visibilidad de precios
const DEFAULT_VISIBILITY_SETTINGS = {
  globalTransparency: false, // Por defecto: hoteles NO ven precios de competidores
  hotelOverrides: {}, // Hoteles específicos que pueden ver precios
  adminControls: {
    canOverrideGlobal: true,
    canSetPerHotel: true,
    requiresApproval: false
  }
};

// Configuración de modificaciones de precio
const PRICE_MODIFICATION_RULES = {
  maxUpdates: 2, // Máximo 2 actualizaciones por hotel
  untilConfirmation: true, // No más cambios después de confirmación
};

// Sistema de depósitos
const DEPOSIT_CONFIG = {
  requiredPercentage: 0.30, // 30% del total
  paymentMethods: ['credit_card', 'bank_transfer', 'paypal'],
  gracePeriodDays: 3
};

// Validez de cotización
const QUOTATION_VALIDITY = {
  defaultDurationDays: 7,
  maxExtensions: 2,
  extensionDays: 3
};

const EnhancedGroupQuotationSystem = () => {
  // Estados principales
  const [activeStep, setActiveStep] = useState(0);
  const [quotation, setQuotation] = useState({
    id: null,
    clientType: 'B2B', // B2B, B2B2C, B2C
    clientInfo: {},
    destination: '',
    checkIn: '',
    checkOut: '',
    totalPassengers: 0,
    roomsRequired: 0,
    selectedHotels: [],
    hotelResponses: [],
    visibilitySettings: { ...DEFAULT_VISIBILITY_SETTINGS },
    depositPaid: false,
    status: 'draft',
    createdAt: new Date(),
    expiresAt: null,
    extensions: 0
  });

  // Estados de UI
  const [openHotelSelection, setOpenHotelSelection] = useState(false);
  const [openPriceComparison, setOpenPriceComparison] = useState(false);
  const [openDepositDialog, setOpenDepositDialog] = useState(false);
  const [openExtensionDialog, setOpenExtensionDialog] = useState(false);
  const [openVisibilitySettings, setOpenVisibilitySettings] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [userRole, setUserRole] = useState('admin'); // admin, manager, agent, client

  // Mock data de hoteles
  const [availableHotels] = useState([
    { 
      id: 1, 
      name: 'Hotel Paradise Resort', 
      category: '5 estrellas', 
      location: 'Cancún Centro',
      basePrice: 150,
      capacity: 500,
      responseStatus: null,
      updateCount: 0,
      lastPrice: null
    },
    { 
      id: 2, 
      name: 'Beach Club Inn', 
      category: '4 estrellas', 
      location: 'Zona Hotelera',
      basePrice: 120,
      capacity: 300,
      responseStatus: null,
      updateCount: 0,
      lastPrice: null
    },
    { 
      id: 3, 
      name: 'Marina Suites', 
      category: '4 estrellas plus', 
      location: 'Puerto Cancún',
      basePrice: 135,
      capacity: 250,
      responseStatus: null,
      updateCount: 0,
      lastPrice: null
    }
  ]);

  // Pasos del proceso
  const steps = [
    'Información del Grupo',
    'Selección de Hoteles',
    'Envío de RFQ',
    'Comparación de Ofertas',
    'Selección y Depósito',
    'Confirmación'
  ];

  // Efecto para calcular fecha de expiración
  useEffect(() => {
    if (quotation.createdAt && !quotation.expiresAt) {
      const expirationDate = new Date(quotation.createdAt);
      expirationDate.setDate(expirationDate.getDate() + QUOTATION_VALIDITY.defaultDurationDays);
      setQuotation(prev => ({ ...prev, expiresAt: expirationDate }));
    }
  }, [quotation.createdAt]);

  // Funciones de manejo
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateStep = (step) => {
    switch (step) {
      case 0: // Información del grupo
        if (!quotation.destination || !quotation.checkIn || !quotation.checkOut || 
            quotation.totalPassengers === 0) {
          showNotification('Por favor complete toda la información del grupo', 'warning');
          return false;
        }
        return true;
      case 1: // Selección de hoteles
        if (quotation.selectedHotels.length === 0) {
          showNotification('Por favor seleccione al menos un hotel', 'warning');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  // Función para verificar si un hotel puede ver precios de competidores
  const canHotelSeeCompetitorPrices = (hotelId) => {
    if (quotation.visibilitySettings.globalTransparency) {
      return true;
    }
    return quotation.visibilitySettings.hotelOverrides[hotelId] === true;
  };

  // Función para verificar si un hotel puede actualizar su precio
  const canHotelUpdatePrice = (hotel) => {
    const response = quotation.hotelResponses.find(r => r.hotelId === hotel.id);
    if (!response) return true;
    return response.updateCount < PRICE_MODIFICATION_RULES.maxUpdates && 
           quotation.status !== 'confirmed';
  };

  // Función para extender cotización
  const handleExtendQuotation = () => {
    if (quotation.extensions < QUOTATION_VALIDITY.maxExtensions) {
      const newExpiration = new Date(quotation.expiresAt);
      newExpiration.setDate(newExpiration.getDate() + QUOTATION_VALIDITY.extensionDays);
      
      setQuotation(prev => ({
        ...prev,
        expiresAt: newExpiration,
        extensions: prev.extensions + 1
      }));
      
      showNotification(`Cotización extendida por ${QUOTATION_VALIDITY.extensionDays} días`, 'success');
      setOpenExtensionDialog(false);
    }
  };

  // Calcular el depósito requerido
  const calculateDeposit = () => {
    const totalPrice = quotation.hotelResponses.reduce((sum, response) => 
      sum + (response.price * quotation.roomsRequired), 0
    );
    return totalPrice * DEPOSIT_CONFIG.requiredPercentage;
  };

  // Componente de Información del Grupo (Paso 1)
  const GroupInformation = () => (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        <Groups sx={{ mr: 1, verticalAlign: 'middle' }} />
        Información del Grupo
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Destino"
            value={quotation.destination}
            onChange={(e) => setQuotation(prev => ({ ...prev, destination: e.target.value }))}
            InputProps={{
              startAdornment: <LocationOn color="action" sx={{ mr: 1 }} />
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Check-in"
            value={quotation.checkIn}
            onChange={(e) => setQuotation(prev => ({ ...prev, checkIn: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Check-out"
            value={quotation.checkOut}
            onChange={(e) => setQuotation(prev => ({ ...prev, checkOut: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="number"
            label="Total de Pasajeros"
            value={quotation.totalPassengers}
            onChange={(e) => setQuotation(prev => ({ 
              ...prev, 
              totalPassengers: parseInt(e.target.value) || 0 
            }))}
            InputProps={{
              startAdornment: <Person color="action" sx={{ mr: 1 }} />
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="number"
            label="Habitaciones Requeridas"
            value={quotation.roomsRequired}
            onChange={(e) => setQuotation(prev => ({ 
              ...prev, 
              roomsRequired: parseInt(e.target.value) || 0 
            }))}
            InputProps={{
              startAdornment: <Hotel color="action" sx={{ mr: 1 }} />
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <FormLabel>Tipo de Cliente</FormLabel>
            <RadioGroup
              row
              value={quotation.clientType}
              onChange={(e) => setQuotation(prev => ({ ...prev, clientType: e.target.value }))}
            >
              <FormControlLabel value="B2B" control={<Radio />} label="B2B" />
              <FormControlLabel value="B2B2C" control={<Radio />} label="B2B2C" />
              <FormControlLabel value="B2C" control={<Radio />} label="B2C" />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>

      {/* Información de validez */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          Esta cotización será válida por {QUOTATION_VALIDITY.defaultDurationDays} días desde su creación.
          Podrá extenderla hasta {QUOTATION_VALIDITY.maxExtensions} veces por {QUOTATION_VALIDITY.extensionDays} días cada una.
        </Typography>
      </Alert>
    </Paper>
  );

  // Componente de Selección de Hoteles (Paso 2)
  const HotelSelection = () => (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          <Hotel sx={{ mr: 1, verticalAlign: 'middle' }} />
          Selección Manual de Hoteles
        </Typography>
        
        {userRole === 'admin' && (
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            onClick={() => setOpenVisibilitySettings(true)}
          >
            Configurar Visibilidad
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Seleccione manualmente los hoteles a los que desea enviar la solicitud de cotización.
        {quotation.clientType === 'B2B' && ' Como cliente B2B, tiene control total sobre la selección.'}
      </Typography>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        {availableHotels.map((hotel) => (
          <Grid item xs={12} md={6} key={hotel.id}>
            <Card 
              sx={{ 
                border: quotation.selectedHotels.includes(hotel.id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                transition: 'all 0.3s'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box>
                    <Typography variant="h6">{hotel.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {hotel.category} • {hotel.location}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Capacidad: {hotel.capacity} personas
                    </Typography>
                    <Typography variant="body2">
                      Precio base: ${hotel.basePrice}/noche
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Checkbox
                      checked={quotation.selectedHotels.includes(hotel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setQuotation(prev => ({
                            ...prev,
                            selectedHotels: [...prev.selectedHotels, hotel.id]
                          }));
                        } else {
                          setQuotation(prev => ({
                            ...prev,
                            selectedHotels: prev.selectedHotels.filter(id => id !== hotel.id)
                          }));
                        }
                      }}
                    />
                    
                    {canHotelSeeCompetitorPrices(hotel.id) && (
                      <Tooltip title="Este hotel puede ver precios de competidores">
                        <Visibility color="primary" sx={{ fontSize: 20 }} />
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Control de Transparencia:</strong> Por defecto, los hoteles NO pueden ver los precios de sus competidores.
          {userRole === 'admin' && ' Como administrador, puede cambiar esta configuración individualmente.'}
        </Typography>
      </Alert>
    </Paper>
  );

  // Componente de Envío de RFQ (Paso 3)
  const SendRFQ = () => {
    const [sending, setSending] = useState(false);
    const [sentHotels, setSentHotels] = useState([]);

    const handleSendRFQ = async () => {
      setSending(true);
      
      // Simulación de envío
      for (const hotelId of quotation.selectedHotels) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSentHotels(prev => [...prev, hotelId]);
      }
      
      setSending(false);
      showNotification('RFQ enviado exitosamente a todos los hoteles', 'success');
    };

    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          <Send sx={{ mr: 1, verticalAlign: 'middle' }} />
          Envío de Solicitud de Cotización (RFQ)
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Se enviará la solicitud a {quotation.selectedHotels.length} hotel(es) seleccionado(s).
          Los hoteles tendrán 48 horas para responder con su mejor oferta.
        </Alert>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Hotel</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Ve Precios Competidores</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotation.selectedHotels.map(hotelId => {
                const hotel = availableHotels.find(h => h.id === hotelId);
                const sent = sentHotels.includes(hotelId);
                
                return (
                  <TableRow key={hotelId}>
                    <TableCell>{hotel.name}</TableCell>
                    <TableCell>{hotel.category}</TableCell>
                    <TableCell>
                      {canHotelSeeCompetitorPrices(hotelId) ? (
                        <Chip label="SÍ" color="primary" size="small" icon={<Visibility />} />
                      ) : (
                        <Chip label="NO" color="default" size="small" icon={<VisibilityOff />} />
                      )}
                    </TableCell>
                    <TableCell>
                      {sent ? (
                        <Chip label="Enviado" color="success" size="small" icon={<CheckCircle />} />
                      ) : (
                        <Chip label="Pendiente" color="default" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {sending && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress />
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              Enviando solicitudes...
            </Typography>
          </Box>
        )}

        {!sending && sentHotels.length === 0 && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Send />}
              onClick={handleSendRFQ}
            >
              Enviar RFQ a Todos los Hoteles
            </Button>
          </Box>
        )}
      </Paper>
    );
  };

  // Componente de Comparación de Ofertas (Paso 4)
  const PriceComparison = () => {
    // Simulación de respuestas de hoteles
    const [responses] = useState([
      { 
        hotelId: 1, 
        price: 145, 
        updateCount: 1, 
        lastUpdate: new Date(),
        specialOffers: ['Desayuno gratis', 'WiFi premium'],
        status: 'active'
      },
      { 
        hotelId: 2, 
        price: 118, 
        updateCount: 0, 
        lastUpdate: new Date(),
        specialOffers: ['Late checkout'],
        status: 'active'
      },
      { 
        hotelId: 3, 
        price: 130, 
        updateCount: 2, 
        lastUpdate: new Date(),
        specialOffers: ['Upgrade de habitación', 'Spa credit $50'],
        status: 'locked' // No más actualizaciones
      }
    ]);

    const getHotelById = (hotelId) => availableHotels.find(h => h.id === hotelId);

    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          <CompareArrows sx={{ mr: 1, verticalAlign: 'middle' }} />
          Comparación de Ofertas
        </Typography>

        <Alert severity="success" sx={{ mb: 3 }}>
          Se han recibido {responses.length} respuestas de {quotation.selectedHotels.length} hoteles.
        </Alert>

        <Grid container spacing={3}>
          {responses.map(response => {
            const hotel = getHotelById(response.hotelId);
            const canUpdate = response.updateCount < PRICE_MODIFICATION_RULES.maxUpdates;
            
            return (
              <Grid item xs={12} md={4} key={response.hotelId}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  {response.status === 'locked' && (
                    <Chip
                      label="Bloqueado"
                      color="error"
                      size="small"
                      icon={<Lock />}
                      sx={{ position: 'absolute', top: 10, right: 10 }}
                    />
                  )}
                  
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {hotel.name}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" color="primary">
                        ${response.price}
                        <Typography component="span" variant="body2" color="text.secondary">
                          /noche
                        </Typography>
                      </Typography>
                      
                      {hotel.basePrice > response.price && (
                        <Chip 
                          label={`-${Math.round((1 - response.price/hotel.basePrice) * 100)}%`}
                          color="success"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Actualizaciones: {response.updateCount}/{PRICE_MODIFICATION_RULES.maxUpdates}
                    </Typography>
                    
                    {canUpdate ? (
                      <Chip label="Puede actualizar" color="success" size="small" icon={<LockOpen />} />
                    ) : (
                      <Chip label="No puede actualizar" color="error" size="small" icon={<Lock />} />
                    )}

                    {response.specialOffers.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold">
                          Ofertas Especiales:
                        </Typography>
                        {response.specialOffers.map((offer, idx) => (
                          <Chip 
                            key={idx}
                            label={offer}
                            size="small"
                            sx={{ mr: 0.5, mt: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}

                    <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                      Última actualización: {response.lastUpdate.toLocaleString()}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button size="small" fullWidth variant="contained">
                      Seleccionar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          Resumen de Costos
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Mejor Precio</TableCell>
                <TableCell align="right">
                  ${Math.min(...responses.map(r => r.price))} /noche
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total por {quotation.roomsRequired} habitaciones</TableCell>
                <TableCell align="right">
                  ${Math.min(...responses.map(r => r.price)) * quotation.roomsRequired} /noche
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <strong>Total Estadía ({quotation.checkIn} - {quotation.checkOut})</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>
                    ${Math.min(...responses.map(r => r.price)) * quotation.roomsRequired * 5} 
                  </strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  // Componente de Depósito y Confirmación (Paso 5)
  const DepositPayment = () => {
    const depositAmount = calculateDeposit();
    
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
          Depósito Requerido
        </Typography>

        <Alert severity="warning" sx={{ mb: 3 }}>
          Para confirmar esta cotización grupal, se requiere un depósito del {DEPOSIT_CONFIG.requiredPercentage * 100}% del total.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detalles del Depósito
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Precio Total del Grupo
                  </Typography>
                  <Typography variant="h5">
                    ${(depositAmount / DEPOSIT_CONFIG.requiredPercentage).toFixed(2)}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Depósito Requerido (30%)
                  </Typography>
                  <Typography variant="h4" color="primary">
                    ${depositAmount.toFixed(2)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Saldo Restante
                  </Typography>
                  <Typography variant="h6">
                    ${((depositAmount / DEPOSIT_CONFIG.requiredPercentage) - depositAmount).toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Métodos de Pago
                </Typography>
                
                <RadioGroup value="credit_card">
                  <FormControlLabel 
                    value="credit_card" 
                    control={<Radio />} 
                    label="Tarjeta de Crédito/Débito" 
                  />
                  <FormControlLabel 
                    value="bank_transfer" 
                    control={<Radio />} 
                    label="Transferencia Bancaria" 
                  />
                  <FormControlLabel 
                    value="paypal" 
                    control={<Radio />} 
                    label="PayPal" 
                  />
                </RadioGroup>
                
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Payment />}
                  sx={{ mt: 3 }}
                  onClick={() => {
                    setQuotation(prev => ({ ...prev, depositPaid: true }));
                    showNotification('Depósito procesado exitosamente', 'success');
                  }}
                >
                  Pagar Depósito ${depositAmount.toFixed(2)}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Términos del Depósito:</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>El depósito es no reembolsable después de 48 horas</li>
              <li>El saldo restante debe pagarse 15 días antes del check-in</li>
              <li>La cotización se confirmará inmediatamente después del pago del depósito</li>
            </ul>
          </Typography>
        </Alert>
      </Paper>
    );
  };

  // Diálogo de Configuración de Visibilidad
  const VisibilitySettingsDialog = () => (
    <Dialog 
      open={openVisibilitySettings} 
      onClose={() => setOpenVisibilitySettings(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AdminPanelSettings sx={{ mr: 1 }} />
          Configuración de Transparencia de Precios
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Configure qué hoteles pueden ver los precios de sus competidores
        </Alert>
        
        <FormControlLabel
          control={
            <Switch
              checked={quotation.visibilitySettings.globalTransparency}
              onChange={(e) => setQuotation(prev => ({
                ...prev,
                visibilitySettings: {
                  ...prev.visibilitySettings,
                  globalTransparency: e.target.checked
                }
              }))}
            />
          }
          label="Transparencia Global (Todos los hoteles ven todos los precios)"
        />
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" gutterBottom>
          Configuración Individual por Hotel
        </Typography>
        
        <List>
          {availableHotels.map(hotel => (
            <ListItem key={hotel.id} divider>
              <ListItemText 
                primary={hotel.name}
                secondary={hotel.category}
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={canHotelSeeCompetitorPrices(hotel.id)}
                  onChange={(e) => setQuotation(prev => ({
                    ...prev,
                    visibilitySettings: {
                      ...prev.visibilitySettings,
                      hotelOverrides: {
                        ...prev.visibilitySettings.hotelOverrides,
                        [hotel.id]: e.target.checked
                      }
                    }
                  }))}
                  disabled={quotation.visibilitySettings.globalTransparency}
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setOpenVisibilitySettings(false)}>Cancelar</Button>
        <Button 
          onClick={() => {
            showNotification('Configuración de visibilidad actualizada', 'success');
            setOpenVisibilitySettings(false);
          }}
          variant="contained"
        >
          Guardar Configuración
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Diálogo de Extensión de Cotización
  const ExtensionDialog = () => (
    <Dialog
      open={openExtensionDialog}
      onClose={() => setOpenExtensionDialog(false)}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Extension sx={{ mr: 1 }} />
          Extender Validez de Cotización
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          La cotización expirará el {quotation.expiresAt?.toLocaleDateString()}
        </Alert>
        
        <Typography variant="body1" paragraph>
          Puede extender la validez por {QUOTATION_VALIDITY.extensionDays} días adicionales.
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Extensiones utilizadas: {quotation.extensions}/{QUOTATION_VALIDITY.maxExtensions}
        </Typography>
        
        {quotation.extensions >= QUOTATION_VALIDITY.maxExtensions && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Ha alcanzado el límite máximo de extensiones
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setOpenExtensionDialog(false)}>Cancelar</Button>
        <Button
          onClick={handleExtendQuotation}
          variant="contained"
          disabled={quotation.extensions >= QUOTATION_VALIDITY.maxExtensions}
        >
          Extender por {QUOTATION_VALIDITY.extensionDays} días
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Renderizado principal
  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Sistema de Cotización Grupal Mejorado
          </Typography>
          
          <Box>
            {quotation.expiresAt && (
              <Chip
                label={`Expira: ${quotation.expiresAt.toLocaleDateString()}`}
                color={new Date() > quotation.expiresAt ? 'error' : 'primary'}
                icon={<Timer />}
                sx={{ mr: 1 }}
              />
            )}
            
            <Button
              variant="outlined"
              startIcon={<Extension />}
              onClick={() => setOpenExtensionDialog(true)}
              disabled={quotation.extensions >= QUOTATION_VALIDITY.maxExtensions}
            >
              Extender
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stepper */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Contenido del paso actual */}
      <Box sx={{ mb: 3 }}>
        {activeStep === 0 && <GroupInformation />}
        {activeStep === 1 && <HotelSelection />}
        {activeStep === 2 && <SendRFQ />}
        {activeStep === 3 && <PriceComparison />}
        {activeStep === 4 && <DepositPayment />}
        {activeStep === 5 && (
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              ¡Cotización Confirmada!
            </Typography>
            <Typography variant="body1" paragraph>
              Su cotización grupal ha sido confirmada exitosamente.
              {quotation.depositPaid && ' El depósito ha sido procesado.'}
            </Typography>
            <Button variant="contained" startIcon={<Receipt />}>
              Ver Detalles de la Reserva
            </Button>
          </Paper>
        )}
      </Box>

      {/* Botones de navegación */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Atrás
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {activeStep < steps.length - 1 && (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Siguiente
          </Button>
        )}
      </Box>

      {/* Diálogos */}
      <VisibilitySettingsDialog />
      <ExtensionDialog />

      {/* Notificaciones */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EnhancedGroupQuotationSystem;