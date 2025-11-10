import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Autocomplete,
  Rating,
  Skeleton
} from '@mui/material';
import {
  CalendarMonth,
  Person,
  Payment,
  CheckCircle,
  LocationOn,
  AccessTime,
  AttachMoney,
  Group,
  Info,
  Add,
  Remove,
  CreditCard,
  AccountBalance,
  LocalOffer,
  Flight,
  Hotel,
  Restaurant,
  DirectionsCar,
  Warning,
  Error as ErrorIcon,
  NavigateNext,
  NavigateBefore
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, addDays, isBefore, isAfter } from 'date-fns';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

const steps = ['Select Tour', 'Choose Date & Guests', 'Personal Details', 'Payment', 'Confirmation'];

interface Tour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  image: string;
  destination: string;
  category: string;
  rating: number;
  reviews: number;
  maxParticipants: number;
  includes: string[];
  highlights: string[];
  availability: Date[];
}

interface BookingData {
  tourId: string;
  tourName: string;
  bookingDate: Date | null;
  participants: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
  paymentMethod: 'stripe' | 'paypal';
  totalAmount: number;
  addOns: string[];
  promoCode: string;
  discount: number;
  finalAmount: number;
  agreeTerms: boolean;
  subscribeNewsletter: boolean;
}

const BookingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [bookingData, setBookingData] = useState<BookingData>({
    tourId: '',
    tourName: '',
    bookingDate: null,
    participants: 1,
    children: 0,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
    paymentMethod: 'stripe',
    totalAmount: 0,
    addOns: [],
    promoCode: '',
    discount: 0,
    finalAmount: 0,
    agreeTerms: false,
    subscribeNewsletter: false
  });
  const [errors, setErrors] = useState<any>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [promoValid, setPromoValid] = useState<boolean | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [bookingData.participants, bookingData.children, bookingData.addOns, bookingData.discount, selectedTour]);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tours');
      setTours(response.data.tours);
    } catch (error) {
      console.error('Error fetching tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedTour) return;
    
    const basePrice = selectedTour.price * bookingData.participants;
    const childPrice = (selectedTour.price * 0.5) * bookingData.children;
    const addOnsPrice = bookingData.addOns.length * 25; // Example add-on pricing
    const subtotal = basePrice + childPrice + addOnsPrice;
    const discountAmount = (subtotal * bookingData.discount) / 100;
    const finalAmount = subtotal - discountAmount;

    setBookingData(prev => ({
      ...prev,
      totalAmount: subtotal,
      finalAmount: finalAmount
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: any = {};

    switch (step) {
      case 0: // Tour selection
        if (!bookingData.tourId) {
          newErrors.tour = 'Please select a tour';
        }
        break;
      case 1: // Date & Guests
        if (!bookingData.bookingDate) {
          newErrors.date = 'Please select a date';
        }
        if (bookingData.participants < 1) {
          newErrors.participants = 'At least 1 participant required';
        }
        if (bookingData.participants + bookingData.children > (selectedTour?.maxParticipants || 20)) {
          newErrors.participants = 'Exceeds maximum participants';
        }
        break;
      case 2: // Personal details
        if (!bookingData.firstName) newErrors.firstName = 'First name is required';
        if (!bookingData.lastName) newErrors.lastName = 'Last name is required';
        if (!bookingData.email) newErrors.email = 'Email is required';
        if (!bookingData.phone) newErrors.phone = 'Phone is required';
        if (!bookingData.agreeTerms) newErrors.terms = 'You must agree to terms';
        break;
      case 3: // Payment
        // Payment validation handled by Stripe
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleTourSelect = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingData(prev => ({
      ...prev,
      tourId: tour.id,
      tourName: tour.name
    }));
    // Fetch available dates for the selected tour
    fetchAvailableDates(tour.id);
  };

  const fetchAvailableDates = async (tourId: string) => {
    try {
      const response = await axios.get(`/api/tours/${tourId}/availability`);
      setAvailableDates(response.data.dates.map((d: string) => new Date(d)));
    } catch (error) {
      console.error('Error fetching available dates:', error);
    }
  };

  const validatePromoCode = async () => {
    if (!bookingData.promoCode) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/booking/validate-promo', {
        code: bookingData.promoCode,
        tourId: bookingData.tourId
      });
      
      if (response.data.valid) {
        setPromoValid(true);
        setBookingData(prev => ({
          ...prev,
          discount: response.data.discount
        }));
      } else {
        setPromoValid(false);
      }
    } catch (error) {
      setPromoValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (paymentMethodId?: string) => {
    setLoading(true);
    try {
      const bookingPayload = {
        ...bookingData,
        paymentMethodId,
        bookingDate: bookingData.bookingDate?.toISOString()
      };

      const response = await axios.post('/api/booking/create', bookingPayload, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setBookingId(response.data.bookingId);
        setShowSuccess(true);
        setActiveStep(4);
      }
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.message || 'Booking failed' });
    } finally {
      setLoading(false);
    }
  };

  // Step Components
  const TourSelectionStep = () => (
    <Grid container spacing={3}>
      {loading ? (
        [...Array(6)].map((_, i) => (
          <Grid item xs={12} md={6} lg={4} key={i}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        ))
      ) : (
        tours.map((tour) => (
          <Grid item xs={12} md={6} lg={4} key={tour.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: selectedTour?.id === tour.id ? '2px solid #1976d2' : 'none',
                '&:hover': { boxShadow: 6 }
              }}
              onClick={() => handleTourSelect(tour)}
            >
              <CardMedia
                component="img"
                height="200"
                image={tour.image}
                alt={tour.name}
              />
              <CardContent>
                <Typography gutterBottom variant="h6" component="div">
                  {tour.name}
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2" color="text.secondary" ml={0.5}>
                    {tour.destination}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <AccessTime fontSize="small" />
                  <Typography variant="body2" color="text.secondary" ml={0.5}>
                    {tour.duration} days
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2}>
                  <Rating value={tour.rating} readOnly size="small" />
                  <Typography variant="body2" color="text.secondary" ml={1}>
                    ({tour.reviews} reviews)
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="primary">
                    ${tour.price}
                  </Typography>
                  <Chip label={tour.category} size="small" color="primary" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
      {errors.tour && (
        <Grid item xs={12}>
          <Alert severity="error">{errors.tour}</Alert>
        </Grid>
      )}
    </Grid>
  );

  const DateGuestStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <CalendarMonth sx={{ mr: 1, verticalAlign: 'middle' }} />
            Select Date
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Booking Date"
              value={bookingData.bookingDate}
              onChange={(newValue) => setBookingData(prev => ({ ...prev, bookingDate: newValue }))}
              shouldDisableDate={(date) => !availableDates.some(d => 
                d.toDateString() === date.toDateString()
              )}
              minDate={addDays(new Date(), 1)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.date,
                  helperText: errors.date
                }
              }}
            />
          </LocalizationProvider>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
            Number of Guests
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>Adults</Typography>
            <Box display="flex" alignItems="center" mb={2}>
              <IconButton 
                onClick={() => setBookingData(prev => ({ 
                  ...prev, 
                  participants: Math.max(1, prev.participants - 1) 
                }))}
                disabled={bookingData.participants <= 1}
              >
                <Remove />
              </IconButton>
              <TextField
                value={bookingData.participants}
                sx={{ mx: 2, width: 80 }}
                inputProps={{ style: { textAlign: 'center' } }}
                disabled
              />
              <IconButton 
                onClick={() => setBookingData(prev => ({ 
                  ...prev, 
                  participants: prev.participants + 1 
                }))}
                disabled={bookingData.participants + bookingData.children >= (selectedTour?.maxParticipants || 20)}
              >
                <Add />
              </IconButton>
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" gutterBottom>Children (50% off)</Typography>
            <Box display="flex" alignItems="center">
              <IconButton 
                onClick={() => setBookingData(prev => ({ 
                  ...prev, 
                  children: Math.max(0, prev.children - 1) 
                }))}
                disabled={bookingData.children <= 0}
              >
                <Remove />
              </IconButton>
              <TextField
                value={bookingData.children}
                sx={{ mx: 2, width: 80 }}
                inputProps={{ style: { textAlign: 'center' } }}
                disabled
              />
              <IconButton 
                onClick={() => setBookingData(prev => ({ 
                  ...prev, 
                  children: prev.children + 1 
                }))}
                disabled={bookingData.participants + bookingData.children >= (selectedTour?.maxParticipants || 20)}
              >
                <Add />
              </IconButton>
            </Box>
          </Box>
          
          {errors.participants && (
            <Alert severity="error" sx={{ mt: 2 }}>{errors.participants}</Alert>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add-On Services
          </Typography>
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Checkbox
                  checked={bookingData.addOns.includes('transport')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setBookingData(prev => ({
                        ...prev,
                        addOns: [...prev.addOns, 'transport']
                      }));
                    } else {
                      setBookingData(prev => ({
                        ...prev,
                        addOns: prev.addOns.filter(a => a !== 'transport')
                      }));
                    }
                  }}
                />
              }
              label="Airport Transfer (+$25)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bookingData.addOns.includes('meal')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setBookingData(prev => ({
                        ...prev,
                        addOns: [...prev.addOns, 'meal']
                      }));
                    } else {
                      setBookingData(prev => ({
                        ...prev,
                        addOns: prev.addOns.filter(a => a !== 'meal')
                      }));
                    }
                  }}
                />
              }
              label="Lunch Package (+$25)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bookingData.addOns.includes('insurance')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setBookingData(prev => ({
                        ...prev,
                        addOns: [...prev.addOns, 'insurance']
                      }));
                    } else {
                      setBookingData(prev => ({
                        ...prev,
                        addOns: prev.addOns.filter(a => a !== 'insurance')
                      }));
                    }
                  }}
                />
              }
              label="Travel Insurance (+$25)"
            />
          </FormControl>
        </Paper>
      </Grid>
    </Grid>
  );

  const PersonalDetailsStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={bookingData.firstName}
                onChange={(e) => setBookingData(prev => ({ ...prev, firstName: e.target.value }))}
                error={!!errors.firstName}
                helperText={errors.firstName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={bookingData.lastName}
                onChange={(e) => setBookingData(prev => ({ ...prev, lastName: e.target.value }))}
                error={!!errors.lastName}
                helperText={errors.lastName}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={bookingData.email}
                onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={bookingData.phone}
                onChange={(e) => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                error={!!errors.phone}
                helperText={errors.phone}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Special Requests (Optional)"
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="Any dietary restrictions, accessibility needs, or special requests?"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bookingData.agreeTerms}
                    onChange={(e) => setBookingData(prev => ({ ...prev, agreeTerms: e.target.checked }))}
                  />
                }
                label="I agree to the terms and conditions"
              />
              {errors.terms && (
                <Typography color="error" variant="caption" display="block">
                  {errors.terms}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bookingData.subscribeNewsletter}
                    onChange={(e) => setBookingData(prev => ({ ...prev, subscribeNewsletter: e.target.checked }))}
                  />
                }
                label="Subscribe to newsletter for exclusive deals"
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Booking Summary
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="Tour"
                secondary={selectedTour?.name}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Date"
                secondary={bookingData.bookingDate ? format(bookingData.bookingDate, 'PPP') : '-'}
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Guests"
                secondary={`${bookingData.participants} Adults, ${bookingData.children} Children`}
              />
            </ListItem>
            {bookingData.addOns.length > 0 && (
              <ListItem>
                <ListItemText 
                  primary="Add-ons"
                  secondary={bookingData.addOns.join(', ')}
                />
              </ListItem>
            )}
            <Divider sx={{ my: 1 }} />
            <ListItem>
              <ListItemText primary="Subtotal" />
              <Typography variant="body1">${bookingData.totalAmount.toFixed(2)}</Typography>
            </ListItem>
            {bookingData.discount > 0 && (
              <ListItem>
                <ListItemText primary={`Discount (${bookingData.discount}%)`} />
                <Typography variant="body1" color="error">
                  -${((bookingData.totalAmount * bookingData.discount) / 100).toFixed(2)}
                </Typography>
              </ListItem>
            )}
            <ListItem>
              <ListItemText primary={<Typography variant="h6">Total</Typography>} />
              <Typography variant="h6" color="primary">
                ${bookingData.finalAmount.toFixed(2)}
              </Typography>
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  const PaymentStep = () => (
    <Elements stripe={stripePromise}>
      <PaymentForm 
        bookingData={bookingData}
        onSubmit={handleBookingSubmit}
        loading={loading}
        error={errors.submit}
      />
    </Elements>
  );

  const ConfirmationStep = () => (
    <Box textAlign="center" py={4}>
      <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        Booking Confirmed!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Your booking has been successfully confirmed. A confirmation email has been sent to {bookingData.email}
      </Typography>
      <Paper elevation={2} sx={{ p: 3, mt: 3, maxWidth: 500, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Booking Details
        </Typography>
        <List>
          <ListItem>
            <ListItemText primary="Booking ID" secondary={bookingId} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Tour" secondary={bookingData.tourName} />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Date" 
              secondary={bookingData.bookingDate ? format(bookingData.bookingDate, 'PPP') : '-'}
            />
          </ListItem>
          <ListItem>
            <ListItemText primary="Total Paid" secondary={`$${bookingData.finalAmount.toFixed(2)}`} />
          </ListItem>
        </List>
      </Paper>
      <Box mt={4}>
        <Button
          variant="contained"
          onClick={() => navigate('/bookings')}
          sx={{ mr: 2 }}
        >
          View My Bookings
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </Box>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <TourSelectionStep />;
      case 1:
        return <DateGuestStep />;
      case 2:
        return <PersonalDetailsStep />;
      case 3:
        return <PaymentStep />;
      case 4:
        return <ConfirmationStep />;
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      <Box sx={{ mt: 3, mb: 2 }}>
        {getStepContent(activeStep)}
      </Box>

      {activeStep < 4 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<NavigateBefore />}
          >
            Back
          </Button>
          {activeStep < 3 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<NavigateNext />}
            >
              Next
            </Button>
          ) : null}
        </Box>
      )}

      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert severity="success">Booking confirmed successfully!</Alert>
      </Snackbar>
    </Box>
  );
};

// Payment Form Component
const PaymentForm: React.FC<{
  bookingData: BookingData;
  onSubmit: (paymentMethodId?: string) => void;
  loading: boolean;
  error?: string;
}> = ({ bookingData, onSubmit, loading, error }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      console.error(error);
      setProcessing(false);
    } else {
      onSubmit(paymentMethod.id);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Information
            </Typography>
            
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <RadioGroup
                value={bookingData.paymentMethod}
                onChange={(e) => {}}
              >
                <FormControlLabel 
                  value="stripe" 
                  control={<Radio />} 
                  label={
                    <Box display="flex" alignItems="center">
                      <CreditCard sx={{ mr: 1 }} />
                      Credit/Debit Card
                    </Box>
                  }
                />
                <FormControlLabel 
                  value="paypal" 
                  control={<Radio />} 
                  label={
                    <Box display="flex" alignItems="center">
                      <AccountBalance sx={{ mr: 1 }} />
                      PayPal
                    </Box>
                  }
                  disabled
                />
              </RadioGroup>
            </FormControl>

            {bookingData.paymentMethod === 'stripe' && (
              <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                    },
                  }}
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" color="primary">
                ${bookingData.finalAmount.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Amount
              </Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="medium"
              disabled={!stripe || processing || loading}
            >
              {processing || loading ? (
                <CircularProgress size={24} />
              ) : (
                `Pay $${bookingData.finalAmount.toFixed(2)}`
              )}
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 2 }} align="center">
              <Info fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              Your payment information is secure and encrypted
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </form>
  );
};

export default BookingWizard;