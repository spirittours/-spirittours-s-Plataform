import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stack,
  Divider,
  Alert,
  Paper,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { bookingsService } from '../../services/bookingsService';
import { Booking, PaymentMethod } from '../../types/booking.types';

interface PaymentFormData {
  paymentMethod: PaymentMethod;
  amount: number;
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  bankName?: string;
  accountNumber?: string;
  paypalEmail?: string;
  notes?: string;
}

const PAYMENT_STEPS = ['Select Method', 'Enter Details', 'Confirm Payment'];

const BookingPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Form
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PaymentFormData>({
    defaultValues: {
      paymentMethod: PaymentMethod.CREDIT_CARD,
      amount: 0,
      cardNumber: '',
      cardName: '',
      expiryDate: '',
      cvv: '',
      bankName: '',
      accountNumber: '',
      paypalEmail: '',
      notes: '',
    },
  });

  const watchPaymentMethod = watch('paymentMethod');
  const watchAmount = watch('amount');

  // Load booking
  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  // Set default amount to balance due
  useEffect(() => {
    if (booking) {
      const paidAmount = booking.payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = booking.pricing.total - paidAmount;
      setValue('amount', balanceDue);
    }
  }, [booking]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingsService.getBooking(id!);
      setBooking(data);
    } catch (error) {
      console.error('Failed to load booking:', error);
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const onSubmit = async (data: PaymentFormData) => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true);
      setConfirmDialogOpen(false);

      const paymentData = {
        amount: watchAmount,
        method: watchPaymentMethod,
        // In real implementation, this would be a tokenized payment
        token: 'test_token_' + Date.now(),
      };

      await bookingsService.processPayment(id!, paymentData);
      
      setPaymentSuccess(true);
      toast.success('Payment processed successfully');
      
      // Navigate to confirmation after delay
      setTimeout(() => {
        navigate(`/bookings/${id}/confirmation`);
      }, 2000);
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!booking) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Booking not found</Typography>
      </Box>
    );
  }

  const paidAmount = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = booking.pricing.total - paidAmount;

  if (paymentSuccess) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Payment Successful!
          </Typography>
          <Typography color="text.secondary" gutterBottom>
            Your payment of {booking.pricing.currency} {watchAmount.toFixed(2)} has been processed.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            onClick={() => navigate(`/bookings/${id}`)}
          >
            View Booking Details
          </Button>
        </Paper>
      </Box>
    );
  }

  // Render payment method selection
  const renderPaymentMethodSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Payment Method
      </Typography>

      <Controller
        name="paymentMethod"
        control={control}
        render={({ field }) => (
          <RadioGroup {...field}>
            <Paper sx={{ p: 2, mb: 2, cursor: 'pointer' }} onClick={() => field.onChange(PaymentMethod.CREDIT_CARD)}>
              <FormControlLabel
                value={PaymentMethod.CREDIT_CARD}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CreditCardIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1">Credit Card</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Visa, Mastercard, American Express
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Paper>

            <Paper sx={{ p: 2, mb: 2, cursor: 'pointer' }} onClick={() => field.onChange(PaymentMethod.DEBIT_CARD)}>
              <FormControlLabel
                value={PaymentMethod.DEBIT_CARD}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CreditCardIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1">Debit Card</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Direct bank debit
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Paper>

            <Paper sx={{ p: 2, mb: 2, cursor: 'pointer' }} onClick={() => field.onChange(PaymentMethod.PAYPAL)}>
              <FormControlLabel
                value={PaymentMethod.PAYPAL}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PaymentIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1">PayPal</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pay with your PayPal account
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Paper>

            <Paper sx={{ p: 2, cursor: 'pointer' }} onClick={() => field.onChange(PaymentMethod.BANK_TRANSFER)}>
              <FormControlLabel
                value={PaymentMethod.BANK_TRANSFER}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AccountBalanceIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle1">Bank Transfer</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Direct transfer to our bank account
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Paper>
          </RadioGroup>
        )}
      />
    </Box>
  );

  // Render payment details form
  const renderPaymentDetails = () => {
    switch (watchPaymentMethod) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Card Details
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="cardNumber"
                  control={control}
                  rules={{ 
                    required: 'Card number is required',
                    pattern: {
                      value: /^[0-9]{16}$/,
                      message: 'Invalid card number'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Card Number"
                      placeholder="1234 5678 9012 3456"
                      error={!!errors.cardNumber}
                      helperText={errors.cardNumber?.message}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CreditCardIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="cardName"
                  control={control}
                  rules={{ required: 'Cardholder name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Cardholder Name"
                      placeholder="John Doe"
                      error={!!errors.cardName}
                      helperText={errors.cardName?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="expiryDate"
                  control={control}
                  rules={{ 
                    required: 'Expiry date is required',
                    pattern: {
                      value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
                      message: 'Invalid format (MM/YY)'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Expiry Date"
                      placeholder="MM/YY"
                      error={!!errors.expiryDate}
                      helperText={errors.expiryDate?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <Controller
                  name="cvv"
                  control={control}
                  rules={{ 
                    required: 'CVV is required',
                    pattern: {
                      value: /^[0-9]{3,4}$/,
                      message: 'Invalid CVV'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="CVV"
                      type={showCvv ? 'text' : 'password'}
                      placeholder="123"
                      error={!!errors.cvv}
                      helperText={errors.cvv?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowCvv(!showCvv)}
                              edge="end"
                            >
                              {showCvv ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" icon={<LockIcon />}>
                  Your payment information is encrypted and secure
                </Alert>
              </Grid>
            </Grid>
          </Box>
        );

      case PaymentMethod.PAYPAL:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              PayPal Details
            </Typography>

            <Controller
              name="paypalEmail"
              control={control}
              rules={{ 
                required: 'PayPal email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="PayPal Email"
                  type="email"
                  placeholder="your@email.com"
                  error={!!errors.paypalEmail}
                  helperText={errors.paypalEmail?.message}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Alert severity="info">
              You will be redirected to PayPal to complete your payment
            </Alert>
          </Box>
        );

      case PaymentMethod.BANK_TRANSFER:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Bank Transfer Details
            </Typography>

            <Alert severity="warning" sx={{ mb: 3 }}>
              Please transfer the amount to the following account. Your booking will be confirmed once we receive the payment.
            </Alert>

            <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" gutterBottom>
                Bank Account Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Bank Name" secondary="Spirit Tours Bank" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Account Number" secondary="1234567890" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Routing Number" secondary="987654321" />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Reference" 
                    secondary={`Booking #${booking.bookingNumber}`} 
                  />
                </ListItem>
              </List>
            </Paper>

            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  rows={3}
                  label="Transfer Reference / Notes"
                  placeholder="Enter your bank transfer reference number..."
                />
              )}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  // Render payment confirmation
  const renderPaymentConfirmation = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Payment
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Payment Method
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {watchPaymentMethod.replace(/_/g, ' ')}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Amount
            </Typography>
            <Typography variant="h6" color="primary">
              {booking.pricing.currency} {watchAmount.toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="warning" icon={<InfoIcon />}>
        Please review the details carefully before confirming the payment. This action cannot be undone.
      </Alert>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Payment for Booking #{booking.bookingNumber}
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column - Payment Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {PAYMENT_STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              <form onSubmit={handleSubmit(onSubmit)}>
                {activeStep === 0 && renderPaymentMethodSelection()}
                {activeStep === 1 && renderPaymentDetails()}
                {activeStep === 2 && renderPaymentConfirmation()}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>

                  {activeStep === PAYMENT_STEPS.length - 1 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={processing}
                    >
                      {processing ? <CircularProgress size={24} /> : 'Confirm Payment'}
                    </Button>
                  ) : (
                    <Button onClick={handleNext} variant="contained">
                      Next
                    </Button>
                  )}
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Payment Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 16 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Summary
              </Typography>

              <List>
                <ListItem>
                  <ListItemText primary="Booking Total" />
                  <Typography>
                    {booking.pricing.currency} {booking.pricing.total.toFixed(2)}
                  </Typography>
                </ListItem>
                <ListItem>
                  <ListItemText primary="Already Paid" />
                  <Typography color="success.main">
                    {booking.pricing.currency} {paidAmount.toFixed(2)}
                  </Typography>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary={
                      <Typography variant="h6">
                        Balance Due
                      </Typography>
                    }
                  />
                  <Typography variant="h6" color="error">
                    {booking.pricing.currency} {balanceDue.toFixed(2)}
                  </Typography>
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Controller
                name="amount"
                control={control}
                rules={{ 
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' },
                  max: { value: balanceDue, message: 'Amount exceeds balance due' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Payment Amount"
                    type="number"
                    error={!!errors.amount}
                    helperText={errors.amount?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {booking.pricing.currency}
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                )}
              />

              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setValue('amount', balanceDue)}
                >
                  Pay Full Balance
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setValue('amount', balanceDue / 2)}
                >
                  Pay 50%
                </Button>
              </Stack>

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  All transactions are secure and encrypted
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirm Payment Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Payment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to process a payment of {booking.pricing.currency} {watchAmount.toFixed(2)}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmPayment} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingPayment;
