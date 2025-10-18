import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
  Typography,
  Chip,
  Autocomplete,
  InputAdornment,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  LocationOn,
  Schedule,
  People,
  DirectionsBus,
  AttachMoney,
  Add,
  Remove,
  Delete,
  Info,
  Warning,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { es } from 'date-fns/locale';
import { addDays, format } from 'date-fns';

interface ServiceRequestFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Info
    service_type: 'transfer',
    tour_id: '',
    booking_reference: '',
    
    // Date & Time
    service_date: addDays(new Date(), 1),
    pickup_time: '09:00',
    estimated_duration_hours: 2,
    return_time: '',
    
    // Locations
    pickup_location: '',
    pickup_address: '',
    dropoff_location: '',
    dropoff_address: '',
    stops: [],
    
    // Passengers
    total_passengers: 1,
    adult_passengers: 1,
    child_passengers: 0,
    infant_passengers: 0,
    lead_passenger_name: '',
    lead_passenger_phone: '',
    passenger_names: '',
    
    // Vehicle Requirements
    vehicle_type_required: '',
    vehicle_types_acceptable: [],
    min_seats_required: null,
    luggage_pieces: 0,
    special_luggage: '',
    wheelchair_accessible_required: false,
    child_seats_required: 0,
    pet_friendly_required: false,
    guide_required: false,
    language_required: '',
    special_requirements: '',
    
    // Budget & Priority
    budget_max: '',
    currency: 'EUR',
    is_urgent: false,
    priority_level: 3,
    
    // Quote Configuration
    max_quotes_needed: 3,
    send_to_all_providers: false,
    selected_providers: [],
    excluded_providers: [],
    auto_select_best: false,
    selection_criteria: {},
    
    // Notes
    notes: '',
    internal_notes: '',
    
    // Send Options
    send_immediately: true,
  });

  const [errors, setErrors] = useState<any>({});
  const [providers, setProviders] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);

  useEffect(() => {
    // Load providers and tours
    loadProviders();
    loadTours();
  }, []);

  const loadProviders = async () => {
    // TODO: Load from API
    setProviders([
      { id: '1', name: 'TransEuropa', rating: 4.8 },
      { id: '2', name: 'AutoBus Madrid', rating: 4.5 },
      { id: '3', name: 'Costa Tours', rating: 4.7 },
    ]);
  };

  const loadTours = async () => {
    // TODO: Load from API
    setTours([
      { id: '1', name: 'City Tour Madrid', reference: 'CTM-001' },
      { id: '2', name: 'Toledo Day Trip', reference: 'TDT-002' },
    ]);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev: any) => ({
        ...prev,
        [field]: undefined,
      }));
    }
    
    // Auto-calculations
    if (field === 'adult_passengers' || field === 'child_passengers' || field === 'infant_passengers') {
      const total = 
        (field === 'adult_passengers' ? value : formData.adult_passengers) +
        (field === 'child_passengers' ? value : formData.child_passengers) +
        (field === 'infant_passengers' ? value : formData.infant_passengers);
      setFormData((prev) => ({
        ...prev,
        total_passengers: total,
      }));
    }
  };

  const addStop = () => {
    const newStop = {
      id: Date.now(),
      location: '',
      address: '',
      duration: 15,
    };
    setStops([...stops, newStop]);
  };

  const removeStop = (id: number) => {
    setStops(stops.filter((s) => s.id !== id));
  };

  const updateStop = (id: number, field: string, value: any) => {
    setStops(stops.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const validateStep = (step: number) => {
    const newErrors: any = {};
    
    switch (step) {
      case 0: // Basic Info
        if (!formData.service_type) newErrors.service_type = 'Requerido';
        if (!formData.service_date) newErrors.service_date = 'Requerido';
        if (!formData.pickup_time) newErrors.pickup_time = 'Requerido';
        break;
      case 1: // Locations
        if (!formData.pickup_location) newErrors.pickup_location = 'Requerido';
        break;
      case 2: // Passengers
        if (formData.total_passengers < 1) newErrors.total_passengers = 'Mínimo 1 pasajero';
        break;
      case 3: // Vehicle
        // Optional validations
        break;
      case 4: // Provider Selection
        if (!formData.send_to_all_providers && formData.selected_providers.length === 0) {
          newErrors.selected_providers = 'Selecciona al menos un proveedor';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    // Validate all steps
    let isValid = true;
    for (let i = 0; i <= 4; i++) {
      if (!validateStep(i)) {
        isValid = false;
        setActiveStep(i);
        break;
      }
    }
    
    if (isValid) {
      const submitData = {
        ...formData,
        stops: stops.length > 0 ? stops : undefined,
      };
      onSubmit(submitData);
    }
  };

  const steps = [
    'Información Básica',
    'Ubicaciones',
    'Pasajeros',
    'Vehículo',
    'Proveedores',
  ];

  const serviceTypes = [
    { value: 'transfer', label: 'Transfer' },
    { value: 'tour', label: 'Tour' },
    { value: 'excursion', label: 'Excursión' },
    { value: 'disposal', label: 'A Disposición' },
    { value: 'shuttle', label: 'Shuttle' },
    { value: 'charter', label: 'Charter' },
    { value: 'corporate', label: 'Corporativo' },
    { value: 'wedding', label: 'Boda' },
    { value: 'event', label: 'Evento' },
  ];

  const vehicleTypes = [
    { value: 'microbus', label: 'Microbus (8-15 asientos)' },
    { value: 'minibus', label: 'Minibus (16-25 asientos)' },
    { value: 'midibus', label: 'Midibus (26-35 asientos)' },
    { value: 'coach', label: 'Autocar (36-55 asientos)' },
    { value: 'luxury_coach', label: 'Autocar de Lujo' },
    { value: 'van', label: 'Van (6-8 asientos)' },
    { value: 'suv', label: 'SUV (4-6 asientos)' },
    { value: 'sedan', label: 'Sedán (4 asientos)' },
    { value: 'limousine', label: 'Limusina' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box>
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 0: Basic Info */}
          <Step>
            <StepLabel>Información Básica</StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.service_type}>
                    <InputLabel>Tipo de Servicio</InputLabel>
                    <Select
                      value={formData.service_type}
                      onChange={(e) => handleChange('service_type', e.target.value)}
                      label="Tipo de Servicio"
                    >
                      {serviceTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    options={tours}
                    getOptionLabel={(option) => `${option.name} (${option.reference})`}
                    value={tours.find((t) => t.id === formData.tour_id) || null}
                    onChange={(e, value) => handleChange('tour_id', value?.id || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Tour Relacionado (Opcional)" />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Fecha del Servicio"
                    value={formData.service_date}
                    onChange={(value) => handleChange('service_date', value)}
                    minDate={new Date()}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth error={!!errors.service_date} />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    label="Hora de Recogida"
                    type="time"
                    value={formData.pickup_time}
                    onChange={(e) => handleChange('pickup_time', e.target.value)}
                    fullWidth
                    error={!!errors.pickup_time}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <TextField
                    label="Duración (horas)"
                    type="number"
                    value={formData.estimated_duration_hours}
                    onChange={(e) => handleChange('estimated_duration_hours', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 1, max: 24, step: 0.5 },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_urgent}
                        onChange={(e) => handleChange('is_urgent', e.target.checked)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {formData.is_urgent && <Warning color="error" />}
                        <Typography variant="body2">Solicitud Urgente</Typography>
                      </Box>
                    }
                  />
                  {formData.is_urgent && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Las solicitudes urgentes tienen prioridad y requieren respuesta en 2 horas
                    </Alert>
                  )}
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleNext}>
                  Siguiente
                </Button>
                <Button onClick={onCancel} sx={{ ml: 1 }}>
                  Cancelar
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 1: Locations */}
          <Step>
            <StepLabel>Ubicaciones</StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Punto de Recogida
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Lugar de Recogida"
                    value={formData.pickup_location}
                    onChange={(e) => handleChange('pickup_location', e.target.value)}
                    fullWidth
                    error={!!errors.pickup_location}
                    helperText={errors.pickup_location}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Dirección Exacta"
                    value={formData.pickup_address}
                    onChange={(e) => handleChange('pickup_address', e.target.value)}
                    fullWidth
                  />
                </Grid>

                {formData.service_type !== 'disposal' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Punto de Destino
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Lugar de Destino"
                        value={formData.dropoff_location}
                        onChange={(e) => handleChange('dropoff_location', e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LocationOn />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Dirección de Destino"
                        value={formData.dropoff_address}
                        onChange={(e) => handleChange('dropoff_address', e.target.value)}
                        fullWidth
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                        <Typography variant="subtitle2">
                          Paradas Intermedias
                        </Typography>
                        <Button startIcon={<Add />} onClick={addStop} size="small">
                          Agregar Parada
                        </Button>
                      </Box>

                      {stops.length > 0 && (
                        <List>
                          {stops.map((stop, index) => (
                            <ListItem key={stop.id}>
                              <Grid container spacing={1} alignItems="center">
                                <Grid item xs={5}>
                                  <TextField
                                    label={`Parada ${index + 1}`}
                                    value={stop.location}
                                    onChange={(e) => updateStop(stop.id, 'location', e.target.value)}
                                    fullWidth
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={5}>
                                  <TextField
                                    label="Dirección"
                                    value={stop.address}
                                    onChange={(e) => updateStop(stop.id, 'address', e.target.value)}
                                    fullWidth
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={1}>
                                  <TextField
                                    label="Min"
                                    type="number"
                                    value={stop.duration}
                                    onChange={(e) => updateStop(stop.id, 'duration', Number(e.target.value))}
                                    size="small"
                                  />
                                </Grid>
                                <Grid item xs={1}>
                                  <IconButton onClick={() => removeStop(stop.id)} size="small">
                                    <Delete />
                                  </IconButton>
                                </Grid>
                              </Grid>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Grid>
                  </>
                )}
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Atrás
                </Button>
                <Button variant="contained" onClick={handleNext}>
                  Siguiente
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 2: Passengers */}
          <Step>
            <StepLabel>Pasajeros</StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Adultos"
                    type="number"
                    value={formData.adult_passengers}
                    onChange={(e) => handleChange('adult_passengers', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 0 },
                      startAdornment: (
                        <InputAdornment position="start">
                          <People />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Niños (2-12 años)"
                    type="number"
                    value={formData.child_passengers}
                    onChange={(e) => handleChange('child_passengers', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Bebés (0-2 años)"
                    type="number"
                    value={formData.infant_passengers}
                    onChange={(e) => handleChange('infant_passengers', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    Total de pasajeros: <strong>{formData.total_passengers}</strong>
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Nombre del Pasajero Principal"
                    value={formData.lead_passenger_name}
                    onChange={(e) => handleChange('lead_passenger_name', e.target.value)}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Teléfono del Pasajero Principal"
                    value={formData.lead_passenger_phone}
                    onChange={(e) => handleChange('lead_passenger_phone', e.target.value)}
                    fullWidth
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Lista de Pasajeros (Opcional)"
                    value={formData.passenger_names}
                    onChange={(e) => handleChange('passenger_names', e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                    helperText="Un nombre por línea"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Piezas de Equipaje"
                    type="number"
                    value={formData.luggage_pieces}
                    onChange={(e) => handleChange('luggage_pieces', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 0 },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Equipaje Especial"
                    value={formData.special_luggage}
                    onChange={(e) => handleChange('special_luggage', e.target.value)}
                    fullWidth
                    helperText="Ej: Bicicletas, equipos de golf, etc."
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Atrás
                </Button>
                <Button variant="contained" onClick={handleNext}>
                  Siguiente
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 3: Vehicle */}
          <Step>
            <StepLabel>Vehículo</StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Vehículo Requerido</InputLabel>
                    <Select
                      value={formData.vehicle_type_required}
                      onChange={(e) => handleChange('vehicle_type_required', e.target.value)}
                      label="Tipo de Vehículo Requerido"
                    >
                      <MenuItem value="">
                        <em>Cualquiera</em>
                      </MenuItem>
                      {vehicleTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={vehicleTypes}
                    getOptionLabel={(option) => option.label}
                    value={vehicleTypes.filter((t) => formData.vehicle_types_acceptable.includes(t.value))}
                    onChange={(e, value) => handleChange('vehicle_types_acceptable', value.map((v) => v.value))}
                    renderInput={(params) => (
                      <TextField {...params} label="Tipos Aceptables" placeholder="Selecciona..." />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Requerimientos Especiales
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.wheelchair_accessible_required}
                        onChange={(e) => handleChange('wheelchair_accessible_required', e.target.checked)}
                      />
                    }
                    label="Accesible para Silla de Ruedas"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.pet_friendly_required}
                        onChange={(e) => handleChange('pet_friendly_required', e.target.checked)}
                      />
                    }
                    label="Se Permiten Mascotas"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Sillas para Niños"
                    type="number"
                    value={formData.child_seats_required}
                    onChange={(e) => handleChange('child_seats_required', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 0, max: 10 },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.guide_required}
                        onChange={(e) => handleChange('guide_required', e.target.checked)}
                      />
                    }
                    label="Guía Turístico Requerido"
                  />
                </Grid>

                {formData.guide_required && (
                  <Grid item xs={12}>
                    <TextField
                      label="Idioma del Guía"
                      value={formData.language_required}
                      onChange={(e) => handleChange('language_required', e.target.value)}
                      fullWidth
                      helperText="Ej: Inglés, Francés, Alemán, etc."
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    label="Otros Requerimientos Especiales"
                    value={formData.special_requirements}
                    onChange={(e) => handleChange('special_requirements', e.target.value)}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Presupuesto Máximo"
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => handleChange('budget_max', e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AttachMoney />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">EUR</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Atrás
                </Button>
                <Button variant="contained" onClick={handleNext}>
                  Siguiente
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Step 4: Provider Selection */}
          <Step>
            <StepLabel>Proveedores</StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.send_to_all_providers}
                        onChange={(e) => handleChange('send_to_all_providers', e.target.checked)}
                      />
                    }
                    label="Enviar a todos los proveedores disponibles"
                  />
                </Grid>

                {!formData.send_to_all_providers && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>
                        Seleccionar Proveedores
                      </Typography>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Se enviará la solicitud solo a los proveedores seleccionados
                      </Alert>
                    </Grid>

                    <Grid item xs={12}>
                      {providers.map((provider) => (
                        <FormControlLabel
                          key={provider.id}
                          control={
                            <Checkbox
                              checked={formData.selected_providers.includes(provider.id)}
                              onChange={(e) => {
                                const selected = e.target.checked
                                  ? [...formData.selected_providers, provider.id]
                                  : formData.selected_providers.filter((p: string) => p !== provider.id);
                                handleChange('selected_providers', selected);
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>{provider.name}</Typography>
                              <Chip label={`⭐ ${provider.rating}`} size="small" />
                            </Box>
                          }
                        />
                      ))}
                      {errors.selected_providers && (
                        <Typography color="error" variant="caption">
                          {errors.selected_providers}
                        </Typography>
                      )}
                    </Grid>
                  </>
                )}

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Número de Cotizaciones Necesarias"
                    type="number"
                    value={formData.max_quotes_needed}
                    onChange={(e) => handleChange('max_quotes_needed', Number(e.target.value))}
                    fullWidth
                    InputProps={{
                      inputProps: { min: 1, max: 10 },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.auto_select_best}
                        onChange={(e) => handleChange('auto_select_best', e.target.checked)}
                      />
                    }
                    label="Auto-seleccionar mejor oferta"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Notas para Proveedores"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Esta información será visible para los proveedores"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Notas Internas"
                    value={formData.internal_notes}
                    onChange={(e) => handleChange('internal_notes', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    helperText="Solo para uso interno - no visible para proveedores"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.send_immediately}
                        onChange={(e) => handleChange('send_immediately', e.target.checked)}
                      />
                    }
                    label="Enviar solicitud a proveedores inmediatamente"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Atrás
                </Button>
                <Button variant="contained" color="primary" onClick={handleSubmit}>
                  Crear Solicitud
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </Box>
    </LocalizationProvider>
  );
};

export default ServiceRequestForm;