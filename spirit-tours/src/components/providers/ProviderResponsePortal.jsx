import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Card, CardContent,
  Alert, Snackbar, Grid, Chip, Divider, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  InputAdornment, IconButton, Tooltip, Badge, Avatar,
  List, ListItem, ListItemText, ListItemIcon, Stepper,
  Step, StepLabel, ToggleButton, ToggleButtonGroup,
  Accordion, AccordionSummary, AccordionDetails, Switch
} from '@mui/material';

import {
  Hotel, AttachMoney, Visibility, VisibilityOff, Lock, LockOpen,
  TrendingUp, TrendingDown, CompareArrows, Send, Edit, Save,
  Cancel, CheckCircle, Info, Warning, Timer, CalendarToday,
  LocationOn, Person, Groups, ExpandMore, AttachFile,
  LocalOffer, Star, Message, History, Dashboard,
  Assignment, MonetizationOn, Update, Block, Download
} from '@mui/icons-material';

// Estrategias de precio disponibles
const PRICING_STRATEGIES = {
  AGGRESSIVE: {
    name: 'Agresiva',
    description: 'Precio más bajo posible para ganar la cotización',
    icon: <TrendingDown color="error" />,
    color: 'error'
  },
  COMPETITIVE: {
    name: 'Competitiva',
    description: 'Precio de mercado ajustado a la competencia',
    icon: <CompareArrows color="primary" />,
    color: 'primary'
  },
  PREMIUM: {
    name: 'Premium',
    description: 'Precio alto con servicios de valor agregado',
    icon: <TrendingUp color="success" />,
    color: 'success'
  },
  DYNAMIC: {
    name: 'Dinámica',
    description: 'Precio basado en ocupación actual',
    icon: <Dashboard color="warning" />,
    color: 'warning'
  }
};

// Ofertas especiales disponibles
const SPECIAL_OFFERS = [
  { id: 'free_breakfast', label: 'Desayuno Gratis', value: 0 },
  { id: 'room_upgrade', label: 'Upgrade de Habitación', value: 50 },
  { id: 'spa_credit', label: 'Crédito de Spa', value: 100 },
  { id: 'late_checkout', label: 'Late Checkout', value: 0 },
  { id: 'early_checkin', label: 'Early Check-in', value: 0 },
  { id: 'welcome_drink', label: 'Bebida de Bienvenida', value: 20 },
  { id: 'free_parking', label: 'Estacionamiento Gratis', value: 0 },
  { id: 'wifi_premium', label: 'WiFi Premium', value: 0 }
];

const ProviderResponsePortal = ({ token }) => {
  // Estado principal
  const [quotation, setQuotation] = useState(null);
  const [hotelInfo, setHotelInfo] = useState(null);
  const [response, setResponse] = useState({
    price: 0,
    strategy: 'COMPETITIVE',
    specialOffers: [],
    notes: '',
    attachments: [],
    updateCount: 0,
    canSeeCompetitorPrices: false,
    status: 'draft'
  });

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [openStrategyInfo, setOpenStrategyInfo] = useState(false);
  const [competitorPrices, setCompetitorPrices] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Cargar información de la cotización
  useEffect(() => {
    loadQuotationData();
    const timer = setInterval(updateTimeRemaining, 60000); // Actualizar cada minuto
    return () => clearInterval(timer);
  }, [token]);

  const loadQuotationData = async () => {
    setLoading(true);
    try {
      // Simulación de carga de datos
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Datos mock de la cotización
      setQuotation({
        id: 'QG-2025-001',
        destination: 'Cancún, México',
        checkIn: '2025-11-15',
        checkOut: '2025-11-20',
        nights: 5,
        totalPassengers: 45,
        roomsRequired: 20,
        clientType: 'B2B',
        requirements: 'Grupo corporativo, requiere sala de conferencias',
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas desde ahora
        status: 'active'
      });

      setHotelInfo({
        id: 'hotel_123',
        name: 'Hotel Paradise Resort',
        category: '5 estrellas',
        location: 'Cancún Centro',
        capacity: 500,
        basePrice: 150,
        currentOccupancy: 0.65 // 65% ocupación
      });

      // Cargar respuesta existente si existe
      const existingResponse = await loadExistingResponse();
      if (existingResponse) {
        setResponse(existingResponse);
        setPriceHistory(existingResponse.history || []);
      }

      // Verificar si puede ver precios de competidores
      const canSeeCompetitors = await checkCompetitorVisibility();
      setResponse(prev => ({ ...prev, canSeeCompetitorPrices: canSeeCompetitors }));

      if (canSeeCompetitors) {
        loadCompetitorPrices();
      }

    } catch (error) {
      showNotification('Error al cargar la información', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingResponse = async () => {
    // Simulación de carga de respuesta existente
    return {
      price: 145,
      strategy: 'COMPETITIVE',
      specialOffers: ['free_breakfast'],
      notes: 'Precio especial para grupo corporativo',
      updateCount: 1,
      history: [
        {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          price: 150,
          action: 'initial'
        }
      ]
    };
  };

  const checkCompetitorVisibility = async () => {
    // Simulación - El admin ha permitido que este hotel vea precios de competidores
    return Math.random() > 0.5;
  };

  const loadCompetitorPrices = async () => {
    // Simulación de precios de competidores
    setCompetitorPrices([
      { hotelName: 'Hotel Competidor A', price: 142, status: 'active' },
      { hotelName: 'Hotel Competidor B', price: 138, status: 'active' },
      { hotelName: 'Hotel Competidor C', price: 155, status: 'locked' }
    ]);
  };

  const updateTimeRemaining = () => {
    if (quotation?.deadline) {
      const now = new Date();
      const diff = quotation.deadline - now;
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining('Expirado');
      }
    }
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const canUpdatePrice = () => {
    return response.updateCount < 2 && quotation?.status === 'active';
  };

  const handlePriceCalculation = (strategy) => {
    let calculatedPrice = hotelInfo.basePrice;
    
    switch (strategy) {
      case 'AGGRESSIVE':
        // Precio 10-15% menor al base
        calculatedPrice = hotelInfo.basePrice * 0.87;
        break;
      case 'COMPETITIVE':
        // Precio ligeramente por debajo del promedio
        if (competitorPrices.length > 0) {
          const avgCompetitorPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
          calculatedPrice = avgCompetitorPrice * 0.98;
        } else {
          calculatedPrice = hotelInfo.basePrice * 0.95;
        }
        break;
      case 'PREMIUM':
        // Precio 5-10% mayor con servicios adicionales
        calculatedPrice = hotelInfo.basePrice * 1.08;
        break;
      case 'DYNAMIC':
        // Basado en ocupación actual
        if (hotelInfo.currentOccupancy > 0.8) {
          calculatedPrice = hotelInfo.basePrice * 1.15;
        } else if (hotelInfo.currentOccupancy > 0.6) {
          calculatedPrice = hotelInfo.basePrice;
        } else {
          calculatedPrice = hotelInfo.basePrice * 0.90;
        }
        break;
      default:
        calculatedPrice = hotelInfo.basePrice;
    }
    
    setResponse(prev => ({
      ...prev,
      price: Math.round(calculatedPrice),
      strategy
    }));
  };

  const handleSubmitResponse = async () => {
    if (response.price <= 0) {
      showNotification('Por favor ingrese un precio válido', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Simulación de envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Actualizar contador y historial
      const newHistory = [...priceHistory, {
        date: new Date(),
        price: response.price,
        action: response.updateCount === 0 ? 'initial' : 'update'
      }];
      
      setPriceHistory(newHistory);
      setResponse(prev => ({
        ...prev,
        updateCount: prev.updateCount + 1,
        status: 'submitted'
      }));
      
      showNotification('Respuesta enviada exitosamente', 'success');
      
    } catch (error) {
      showNotification('Error al enviar la respuesta', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalOfferValue = () => {
    const offerValue = response.specialOffers.reduce((sum, offerId) => {
      const offer = SPECIAL_OFFERS.find(o => o.id === offerId);
      return sum + (offer?.value || 0);
    }, 0);
    
    return offerValue;
  };

  // Componente de información de la cotización
  const QuotationInfo = () => (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
            Solicitud de Cotización
          </Typography>
          
          {timeRemaining && (
            <Chip
              label={`Tiempo restante: ${timeRemaining}`}
              color={timeRemaining === 'Expirado' ? 'error' : 'primary'}
              icon={<Timer />}
            />
          )}
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">ID de Cotización</Typography>
              <Typography variant="body1" fontWeight="bold">{quotation?.id}</Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Destino</Typography>
              <Typography variant="body1">
                <LocationOn fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {quotation?.destination}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Fechas</Typography>
              <Typography variant="body1">
                <CalendarToday fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {quotation?.checkIn} al {quotation?.checkOut} ({quotation?.nights} noches)
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Grupo</Typography>
              <Typography variant="body1">
                <Groups fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {quotation?.totalPassengers} pasajeros / {quotation?.roomsRequired} habitaciones
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Tipo de Cliente</Typography>
              <Chip label={quotation?.clientType} size="small" color="primary" />
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">Requisitos Especiales</Typography>
              <Typography variant="body1">{quotation?.requirements}</Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Componente de estrategia de precios
  const PricingStrategy = () => (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
            Estrategia de Precios
          </Typography>
          
          <Button
            size="small"
            startIcon={<Info />}
            onClick={() => setOpenStrategyInfo(true)}
          >
            Información
          </Button>
        </Box>
        
        <ToggleButtonGroup
          value={response.strategy}
          exclusive
          onChange={(e, value) => value && handlePriceCalculation(value)}
          fullWidth
          sx={{ mb: 3 }}
        >
          {Object.entries(PRICING_STRATEGIES).map(([key, strategy]) => (
            <ToggleButton key={key} value={key}>
              <Box sx={{ textAlign: 'center' }}>
                {strategy.icon}
                <Typography variant="caption" display="block">
                  {strategy.name}
                </Typography>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Precio por Habitación/Noche
          </Typography>
          
          <TextField
            fullWidth
            type="number"
            value={response.price}
            onChange={(e) => setResponse(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            disabled={!canUpdatePrice()}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            sx={{ mb: 1 }}
          />
          
          {!canUpdatePrice() && (
            <Alert severity="warning" icon={<Lock />}>
              Has alcanzado el límite de actualizaciones (2) o la cotización ya fue confirmada
            </Alert>
          )}
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Precio Total del Grupo
          </Typography>
          <Typography variant="h4" color="primary">
            ${(response.price * quotation?.roomsRequired * quotation?.nights).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {quotation?.roomsRequired} habitaciones × {quotation?.nights} noches × ${response.price}
          </Typography>
        </Box>
        
        {/* Información de ocupación para estrategia dinámica */}
        {response.strategy === 'DYNAMIC' && (
          <Alert severity="info" icon={<Dashboard />}>
            Ocupación actual: {(hotelInfo?.currentOccupancy * 100).toFixed(0)}%
            {hotelInfo?.currentOccupancy > 0.8 && ' (Alta demanda - precio aumentado)'}
            {hotelInfo?.currentOccupancy < 0.4 && ' (Baja demanda - precio reducido)'}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Componente de precios de competidores
  const CompetitorPrices = () => {
    if (!response.canSeeCompetitorPrices) {
      return (
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <VisibilityOff sx={{ mr: 1 }} />
              <Typography variant="h6">
                Precios de Competidores
              </Typography>
            </Box>
            
            <Alert severity="info">
              No tiene permiso para ver los precios de otros hoteles en esta cotización.
              Esta configuración es controlada por el cliente.
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Visibility sx={{ mr: 1 }} />
            <Typography variant="h6">
              Precios de Competidores
            </Typography>
            <Chip
              label="Visible"
              color="success"
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Hotel</TableCell>
                  <TableCell align="right">Precio/Noche</TableCell>
                  <TableCell align="right">Total Grupo</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {competitorPrices.map((competitor, index) => (
                  <TableRow key={index}>
                    <TableCell>{competitor.hotelName}</TableCell>
                    <TableCell align="right">${competitor.price}</TableCell>
                    <TableCell align="right">
                      ${(competitor.price * quotation?.roomsRequired * quotation?.nights).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {competitor.status === 'locked' ? (
                        <Chip label="Bloqueado" size="small" color="error" icon={<Lock />} />
                      ) : (
                        <Chip label="Activo" size="small" color="success" icon={<LockOpen />} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                
                <TableRow>
                  <TableCell colSpan={4}>
                    <Divider />
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell>
                    <strong>Tu Precio</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>${response.price}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      ${(response.price * quotation?.roomsRequired * quotation?.nights).toLocaleString()}
                    </strong>
                  </TableCell>
                  <TableCell>
                    {response.price < Math.min(...competitorPrices.map(c => c.price)) && (
                      <Chip label="Mejor Precio" size="small" color="success" />
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              El cliente le ha permitido ver los precios de otros hoteles para esta cotización.
              Use esta información estratégicamente para hacer su mejor oferta.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  };

  // Componente de ofertas especiales
  const SpecialOffers = () => (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <LocalOffer sx={{ mr: 1, verticalAlign: 'middle' }} />
          Ofertas Especiales
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Agregue valor a su propuesta con ofertas especiales
        </Typography>
        
        <Grid container spacing={1}>
          {SPECIAL_OFFERS.map(offer => (
            <Grid item xs={6} md={3} key={offer.id}>
              <FormControlLabel
                control={
                  <Switch
                    checked={response.specialOffers.includes(offer.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setResponse(prev => ({
                          ...prev,
                          specialOffers: [...prev.specialOffers, offer.id]
                        }));
                      } else {
                        setResponse(prev => ({
                          ...prev,
                          specialOffers: prev.specialOffers.filter(id => id !== offer.id)
                        }));
                      }
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">{offer.label}</Typography>
                    {offer.value > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Valor: ${offer.value}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Grid>
          ))}
        </Grid>
        
        {response.specialOffers.length > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Valor total de ofertas especiales: ${calculateTotalOfferValue()}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Componente de historial de precios
  const PriceHistory = () => (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <History sx={{ mr: 1, verticalAlign: 'middle' }} />
          Historial de Actualizaciones
        </Typography>
        
        <List>
          {priceHistory.map((entry, index) => (
            <ListItem key={index} divider>
              <ListItemIcon>
                {entry.action === 'initial' ? <Send /> : <Update />}
              </ListItemIcon>
              <ListItemText
                primary={`$${entry.price} por habitación/noche`}
                secondary={entry.date.toLocaleString()}
              />
              {entry.action === 'update' && (
                <Chip label={`Actualización ${index}`} size="small" />
              )}
            </ListItem>
          ))}
        </List>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          Actualizaciones realizadas: {response.updateCount}/2
        </Alert>
      </CardContent>
    </Card>
  );

  // Diálogo de información de estrategias
  const StrategyInfoDialog = () => (
    <Dialog
      open={openStrategyInfo}
      onClose={() => setOpenStrategyInfo(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Información de Estrategias de Precio</DialogTitle>
      <DialogContent>
        <List>
          {Object.entries(PRICING_STRATEGIES).map(([key, strategy]) => (
            <ListItem key={key}>
              <ListItemIcon>{strategy.icon}</ListItemIcon>
              <ListItemText
                primary={strategy.name}
                secondary={strategy.description}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenStrategyInfo(false)}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Cargando información de la cotización...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <Hotel />
            </Avatar>
            <Box>
              <Typography variant="h5">{hotelInfo?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {hotelInfo?.category} • {hotelInfo?.location}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            {response.status === 'submitted' && (
              <Chip
                label="Respuesta Enviada"
                color="success"
                icon={<CheckCircle />}
                sx={{ mr: 1 }}
              />
            )}
            
            {canUpdatePrice() ? (
              <Chip
                label="Puede Actualizar"
                color="primary"
                icon={<LockOpen />}
              />
            ) : (
              <Chip
                label="No Puede Actualizar"
                color="error"
                icon={<Lock />}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Contenido principal */}
      <Grid container spacing={3}>
        {/* Columna izquierda */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <QuotationInfo />
            <PricingStrategy />
            <SpecialOffers />
            
            {/* Notas adicionales */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Message sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Notas Adicionales
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={response.notes}
                  onChange={(e) => setResponse(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Agregue cualquier información adicional sobre su oferta..."
                />
              </CardContent>
            </Card>
            
            {/* Botones de acción */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={() => showNotification('Borrador guardado', 'info')}
              >
                Guardar Borrador
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSubmitResponse}
                disabled={!canUpdatePrice() || submitting}
              >
                {response.updateCount === 0 ? 'Enviar Respuesta' : 'Actualizar Respuesta'}
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Columna derecha */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CompetitorPrices />
            <PriceHistory />
            
            {/* Resumen */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Dashboard sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Resumen de tu Oferta
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Precio por habitación"
                      secondary={`$${response.price} /noche`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Total para el grupo"
                      secondary={`$${(response.price * quotation?.roomsRequired * quotation?.nights).toLocaleString()}`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Estrategia"
                      secondary={PRICING_STRATEGIES[response.strategy]?.name}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Ofertas especiales"
                      secondary={response.specialOffers.length || 'Ninguna'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Valor agregado"
                      secondary={`$${calculateTotalOfferValue()}`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Diálogos */}
      <StrategyInfoDialog />

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

export default ProviderResponsePortal;