import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Stack,
  Divider,
  Alert,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { bookingsService } from '../../services/bookingsService';
import { toursService } from '../../services/toursService';
import { BookingFormData, PaymentMethod, Participant } from '../../types/booking.types';
import { Tour } from '../../types/tour.types';

interface BookingFormProps {
  mode?: 'create' | 'edit';
  bookingId?: string;
}

const FORM_STEPS = ['Select Tour', 'Customer Info', 'Participants', 'Special Requests', 'Review & Confirm'];

const BookingForm: React.FC<BookingFormProps> = ({ mode = 'create', bookingId }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [availableTours, setAvailableTours] = useState<Tour[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availabilityCheck, setAvailabilityCheck] = useState<any>(null);
  const [pricingCalculation, setPricingCalculation] = useState<any>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [editingParticipantIndex, setEditingParticipantIndex] = useState<number | null>(null);

  // Form
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormData>({
    defaultValues: {
      tourId: '',
      customer: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        country: '',
      },
      participants: [],
      tourStartDate: '',
      specialRequests: '',
      internalNotes: '',
      tags: [],
    },
  });

  const watchTourId = watch('tourId');
  const watchTourStartDate = watch('tourStartDate');

  // Participant form state
  const [participantForm, setParticipantForm] = useState<Participant>({
    id: '',
    firstName: '',
    lastName: '',
    age: 0,
    dateOfBirth: '',
    passportNumber: '',
    dietaryRestrictions: [],
    specialNeeds: '',
  });

  // Load tours
  useEffect(() => {
    loadAvailableTours();
  }, []);

  // Load booking if editing
  useEffect(() => {
    if (mode === 'edit' && (bookingId || id)) {
      loadBooking(bookingId || id!);
    }
  }, [mode, bookingId, id]);

  // Check availability when tour and date change
  useEffect(() => {
    if (watchTourId && watchTourStartDate) {
      checkAvailability();
    }
  }, [watchTourId, watchTourStartDate]);

  // Calculate pricing when participants change
  useEffect(() => {
    if (watchTourId && watchTourStartDate && participants.length > 0) {
      calculatePricing();
    }
  }, [watchTourId, watchTourStartDate, participants]);

  const loadAvailableTours = async () => {
    try {
      const response = await toursService.getTours(1, 100, { status: ['active'] });
      setAvailableTours(response.tours);
    } catch (error) {
      console.error('Failed to load tours:', error);
      toast.error('Failed to load tours');
    }
  };

  const loadBooking = async (id: string) => {
    try {
      setLoading(true);
      const booking = await bookingsService.getBooking(id);
      
      // Populate form
      setValue('tourId', booking.tourId);
      setValue('customer', {
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        email: booking.customer.email,
        phone: booking.customer.phone,
        country: booking.customer.country,
      });
      setValue('tourStartDate', booking.tourStartDate);
      setValue('specialRequests', booking.specialRequests);
      setValue('internalNotes', booking.internalNotes);
      setParticipants(booking.participants);
      
      // Load tour details
      const tour = await toursService.getTour(booking.tourId);
      setSelectedTour(tour);
    } catch (error) {
      console.error('Failed to load booking:', error);
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const result = await bookingsService.checkAvailability(
        watchTourId,
        watchTourStartDate,
        participants.length || 1
      );
      setAvailabilityCheck(result);
      
      if (!result.available) {
        toast.warning('Selected date has limited availability');
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  const calculatePricing = async () => {
    try {
      const pricing = await bookingsService.calculatePrice({
        tourId: watchTourId,
        participants: participants.length,
        date: watchTourStartDate,
        discountCode: discountCode || undefined,
      });
      setPricingCalculation(pricing);
    } catch (error) {
      console.error('Failed to calculate pricing:', error);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    await calculatePricing();
  };

  // Participant management
  const handleAddParticipant = () => {
    setEditingParticipantIndex(null);
    setParticipantForm({
      id: `participant_${Date.now()}`,
      firstName: '',
      lastName: '',
      age: 0,
      dateOfBirth: '',
      passportNumber: '',
      dietaryRestrictions: [],
      specialNeeds: '',
    });
    setParticipantDialogOpen(true);
  };

  const handleEditParticipant = (index: number) => {
    setEditingParticipantIndex(index);
    setParticipantForm(participants[index]);
    setParticipantDialogOpen(true);
  };

  const handleSaveParticipant = () => {
    if (!participantForm.firstName || !participantForm.lastName || !participantForm.age) {
      toast.error('Please fill in all required participant fields');
      return;
    }

    if (editingParticipantIndex !== null) {
      const updated = [...participants];
      updated[editingParticipantIndex] = participantForm;
      setParticipants(updated);
    } else {
      setParticipants([...participants, participantForm]);
    }

    setParticipantDialogOpen(false);
  };

  const handleDeleteParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  // Stepper navigation
  const handleNext = () => {
    // Validation per step
    if (activeStep === 0 && !watchTourId) {
      toast.error('Please select a tour');
      return;
    }
    if (activeStep === 0 && !watchTourStartDate) {
      toast.error('Please select a tour start date');
      return;
    }
    if (activeStep === 2 && participants.length === 0) {
      toast.error('Please add at least one participant');
      return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Form submission
  const onSubmit = async (data: BookingFormData) => {
    try {
      setSubmitting(true);

      const bookingData: BookingFormData = {
        ...data,
        participants,
      };

      if (mode === 'create') {
        const newBooking = await bookingsService.createBooking(bookingData);
        toast.success('Booking created successfully');
        navigate(`/bookings/${newBooking.id}`);
      } else {
        const updatedBooking = await bookingsService.updateBooking(bookingId || id!, bookingData);
        toast.success('Booking updated successfully');
        navigate(`/bookings/${updatedBooking.id}`);
      }
    } catch (error) {
      console.error('Failed to save booking:', error);
      toast.error('Failed to save booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderTourSelection();
      case 1:
        return renderCustomerInfo();
      case 2:
        return renderParticipants();
      case 3:
        return renderSpecialRequests();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  // Step 1: Tour Selection
  const renderTourSelection = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Controller
          name="tourId"
          control={control}
          rules={{ required: 'Tour is required' }}
          render={({ field }) => (
            <Autocomplete
              {...field}
              options={availableTours}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.title)}
              value={availableTours.find(t => t.id === field.value) || null}
              onChange={(e, value) => {
                field.onChange(value?.id || '');
                setSelectedTour(value);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Tour"
                  error={!!errors.tourId}
                  helperText={errors.tourId?.message}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar src={option.images?.[0]?.url} sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="body2">{option.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.duration.days} days • {option.basePrice.currency} {option.basePrice.amount}
                    </Typography>
                  </Box>
                </Box>
              )}
            />
          )}
        />
      </Grid>

      {selectedTour && (
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box
                    component="img"
                    src={selectedTour.images?.[0]?.url || '/placeholder.jpg'}
                    alt={selectedTour.title}
                    sx={{ width: '100%', borderRadius: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    {selectedTour.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedTour.shortDescription}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={`${selectedTour.duration.days} days`} size="small" />
                    <Chip label={selectedTour.difficulty} size="small" />
                    <Chip label={selectedTour.category} size="small" color="primary" />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      <Grid item xs={12} md={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Controller
            name="tourStartDate"
            control={control}
            rules={{ required: 'Start date is required' }}
            render={({ field }) => (
              <DatePicker
                {...field}
                label="Tour Start Date"
                value={field.value ? new Date(field.value) : null}
                onChange={(date) => field.onChange(date?.toISOString())}
                minDate={new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.tourStartDate,
                    helperText: errors.tourStartDate?.message,
                  },
                }}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>

      {availabilityCheck && (
        <Grid item xs={12}>
          <Alert
            severity={availabilityCheck.available ? 'success' : 'warning'}
            icon={availabilityCheck.available ? <CheckCircleIcon /> : <InfoIcon />}
          >
            {availabilityCheck.available ? (
              <>
                <strong>Available!</strong> {availabilityCheck.spotsLeft} spots remaining for this date.
              </>
            ) : (
              <>
                <strong>Limited Availability</strong> - Only {availabilityCheck.spotsLeft} spots left. 
                Consider alternative dates: {availabilityCheck.alternativeDates?.join(', ')}
              </>
            )}
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  // Step 2: Customer Info
  const renderCustomerInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Controller
          name="customer.firstName"
          control={control}
          rules={{ required: 'First name is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="First Name"
              error={!!errors.customer?.firstName}
              helperText={errors.customer?.firstName?.message}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          name="customer.lastName"
          control={control}
          rules={{ required: 'Last name is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Last Name"
              error={!!errors.customer?.lastName}
              helperText={errors.customer?.lastName?.message}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          name="customer.email"
          control={control}
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Email"
              type="email"
              error={!!errors.customer?.email}
              helperText={errors.customer?.email?.message}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <Controller
          name="customer.phone"
          control={control}
          rules={{ required: 'Phone is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Phone"
              error={!!errors.customer?.phone}
              helperText={errors.customer?.phone?.message}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="customer.country"
          control={control}
          rules={{ required: 'Country is required' }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Country"
              error={!!errors.customer?.country}
              helperText={errors.customer?.country?.message}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  // Step 3: Participants
  const renderParticipants = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Participants ({participants.length})</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={handleAddParticipant}>
          Add Participant
        </Button>
      </Box>

      {participants.length === 0 ? (
        <Alert severity="info">
          No participants added yet. Click "Add Participant" to begin.
        </Alert>
      ) : (
        <List>
          {participants.map((participant, index) => (
            <Paper key={participant.id} sx={{ mb: 2 }}>
              <ListItem>
                <Avatar sx={{ mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <ListItemText
                  primary={`${participant.firstName} ${participant.lastName}`}
                  secondary={
                    <>
                      Age: {participant.age}
                      {participant.dietaryRestrictions && participant.dietaryRestrictions.length > 0 && (
                        <> • Dietary: {participant.dietaryRestrictions.join(', ')}</>
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleEditParticipant(index)} sx={{ mr: 1 }}>
                    <SearchIcon />
                  </IconButton>
                  <IconButton edge="end" color="error" onClick={() => handleDeleteParticipant(index)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  );

  // Step 4: Special Requests
  const renderSpecialRequests = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Controller
          name="specialRequests"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={4}
              label="Special Requests"
              placeholder="Any special requirements, dietary restrictions, accessibility needs, etc."
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="internalNotes"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              multiline
              rows={3}
              label="Internal Notes"
              placeholder="Notes for internal use only (not visible to customer)"
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          Tags (Optional)
        </Typography>
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <Autocomplete
              {...field}
              multiple
              freeSolo
              options={['VIP', 'Returning Customer', 'Group Booking', 'Corporate', 'Family']}
              value={field.value || []}
              onChange={(e, value) => field.onChange(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} placeholder="Add tags..." />
              )}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  // Step 5: Review
  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Booking Details
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Tour Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Tour
            </Typography>
            <Typography variant="body1">{selectedTour?.title}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Start Date
            </Typography>
            <Typography variant="body1">{watchTourStartDate}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Customer Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1">
              {watch('customer.firstName')} {watch('customer.lastName')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{watch('customer.email')}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body1">{watch('customer.phone')}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Country
            </Typography>
            <Typography variant="body1">{watch('customer.country')}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Participants ({participants.length})
        </Typography>
        {participants.map((p, index) => (
          <Typography key={index} variant="body2">
            {index + 1}. {p.firstName} {p.lastName} (Age: {p.age})
          </Typography>
        ))}
      </Paper>

      {pricingCalculation && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            Pricing Summary
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Subtotal:</Typography>
              <Typography>
                {pricingCalculation.currency} {pricingCalculation.subtotal.toFixed(2)}
              </Typography>
            </Box>
            {pricingCalculation.discount > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Discount:</Typography>
                <Typography>
                  -{pricingCalculation.currency} {pricingCalculation.discount.toFixed(2)}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Tax:</Typography>
              <Typography>
                {pricingCalculation.currency} {pricingCalculation.tax.toFixed(2)}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6">
                {pricingCalculation.currency} {pricingCalculation.total.toFixed(2)}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}
    </Box>
  );

  // Participant Dialog
  const renderParticipantDialog = () => (
    <Dialog open={participantDialogOpen} onClose={() => setParticipantDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingParticipantIndex !== null ? 'Edit Participant' : 'Add Participant'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Name"
              value={participantForm.firstName}
              onChange={(e) => setParticipantForm({ ...participantForm, firstName: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={participantForm.lastName}
              onChange={(e) => setParticipantForm({ ...participantForm, lastName: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="number"
              label="Age"
              value={participantForm.age || ''}
              onChange={(e) => setParticipantForm({ ...participantForm, age: parseInt(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              type="date"
              label="Date of Birth"
              value={participantForm.dateOfBirth || ''}
              onChange={(e) => setParticipantForm({ ...participantForm, dateOfBirth: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Passport Number"
              value={participantForm.passportNumber || ''}
              onChange={(e) => setParticipantForm({ ...participantForm, passportNumber: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              freeSolo
              options={['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Kosher']}
              value={participantForm.dietaryRestrictions || []}
              onChange={(e, value) => setParticipantForm({ ...participantForm, dietaryRestrictions: value })}
              renderInput={(params) => (
                <TextField {...params} label="Dietary Restrictions" placeholder="Add restrictions..." />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Special Needs"
              value={participantForm.specialNeeds || ''}
              onChange={(e) => setParticipantForm({ ...participantForm, specialNeeds: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setParticipantDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveParticipant} variant="contained">
          {editingParticipantIndex !== null ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {mode === 'create' ? 'New Booking' : 'Edit Booking'}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {FORM_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStepContent(activeStep)}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<NavigateBeforeIcon />}
              >
                Back
              </Button>

              {activeStep === FORM_STEPS.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                  endIcon={<CheckCircleIcon />}
                >
                  {mode === 'create' ? 'Create Booking' : 'Update Booking'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  endIcon={<NavigateNextIcon />}
                >
                  Next
                </Button>
              )}
            </Box>
          </form>
        </CardContent>
      </Card>

      {renderParticipantDialog()}
    </Box>
  );
};

export default BookingForm;
