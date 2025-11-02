import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Stack,
  Divider,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { bookingsService } from '../../services/bookingsService';
import { Booking, PaymentMethod } from '../../types/booking.types';

const CANCELLATION_REASONS = [
  'Change of plans',
  'Medical emergency',
  'Weather concerns',
  'Found alternative tour',
  'Financial reasons',
  'Personal reasons',
  'Other',
];

const CANCELLATION_STEPS = ['Select Reason', 'Review Policy', 'Confirm Cancellation'];

const BookingCancellation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [cancellationReason, setCancellationReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(PaymentMethod.CREDIT_CARD);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancellationComplete, setCancellationComplete] = useState(false);

  // Load booking
  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

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

  const calculateRefundAmount = (): number => {
    if (!booking) return 0;

    const daysUntilTour = differenceInDays(new Date(booking.tourStartDate), new Date());
    const paidAmount = booking.payments.reduce((sum, p) => sum + p.amount, 0);

    // Cancellation policy calculation
    if (daysUntilTour >= 30) {
      return paidAmount; // Full refund
    } else if (daysUntilTour >= 14) {
      return paidAmount * 0.75; // 75% refund
    } else if (daysUntilTour >= 7) {
      return paidAmount * 0.50; // 50% refund
    } else {
      return 0; // No refund
    }
  };

  const getCancellationPolicy = (): string => {
    if (!booking) return '';

    const daysUntilTour = differenceInDays(new Date(booking.tourStartDate), new Date());

    if (daysUntilTour >= 30) {
      return '100% refund - More than 30 days before tour';
    } else if (daysUntilTour >= 14) {
      return '75% refund - 14-29 days before tour';
    } else if (daysUntilTour >= 7) {
      return '50% refund - 7-13 days before tour';
    } else {
      return 'No refund - Less than 7 days before tour';
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !cancellationReason) {
      toast.error('Please select a cancellation reason');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCancel = async () => {
    try {
      setProcessing(true);
      setConfirmDialogOpen(false);

      const reason = cancellationReason === 'Other' ? otherReason : cancellationReason;
      const refundAmount = calculateRefundAmount();

      await bookingsService.cancelBooking({
        bookingId: id!,
        reason,
        refundAmount,
        refundMethod,
        notes: additionalNotes,
      });

      setCancellationComplete(true);
      toast.success('Booking cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error('Failed to cancel booking');
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

  if (cancellationComplete) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Booking Cancelled
          </Typography>
          <Typography color="text.secondary" paragraph>
            Your booking #{booking.bookingNumber} has been cancelled.
          </Typography>
          {calculateRefundAmount() > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A refund of {booking.pricing.currency} {calculateRefundAmount().toFixed(2)} will be processed within 5-7 business days.
            </Alert>
          )}
          <Stack spacing={2}>
            <Button
              variant="contained"
              onClick={() => navigate('/bookings')}
            >
              View All Bookings
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/')}
            >
              Return to Home
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  const refundAmount = calculateRefundAmount();
  const paidAmount = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const daysUntilTour = differenceInDays(new Date(booking.tourStartDate), new Date());

  // Render reason selection
  const renderReasonSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Why are you cancelling?
      </Typography>

      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={cancellationReason}
          onChange={(e) => setCancellationReason(e.target.value)}
        >
          {CANCELLATION_REASONS.map((reason) => (
            <Paper key={reason} sx={{ p: 2, mb: 1 }}>
              <FormControlLabel
                value={reason}
                control={<Radio />}
                label={reason}
              />
            </Paper>
          ))}
        </RadioGroup>
      </FormControl>

      {cancellationReason === 'Other' && (
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Please specify"
          value={otherReason}
          onChange={(e) => setOtherReason(e.target.value)}
          sx={{ mt: 2 }}
        />
      )}
    </Box>
  );

  // Render policy review
  const renderPolicyReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Cancellation Policy
      </Typography>

      <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
        Please review our cancellation policy carefully before proceeding.
      </Alert>

      <Paper sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle2" gutterBottom>
          Your Cancellation Terms
        </Typography>
        <Typography variant="h6" color="primary" gutterBottom>
          {getCancellationPolicy()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {daysUntilTour} days until tour start date
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Amount Paid
            </Typography>
            <Typography variant="h5">
              {booking.pricing.currency} {paidAmount.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: refundAmount > 0 ? 'success.lighter' : 'error.lighter' }}>
            <Typography variant="subtitle2" gutterBottom>
              Refund Amount
            </Typography>
            <Typography variant="h5">
              {booking.pricing.currency} {refundAmount.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {refundAmount > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Select Refund Method
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
            >
              <FormControlLabel
                value={PaymentMethod.CREDIT_CARD}
                control={<Radio />}
                label="Refund to original payment method"
              />
              <FormControlLabel
                value={PaymentMethod.BANK_TRANSFER}
                control={<Radio />}
                label="Bank transfer"
              />
            </RadioGroup>
          </FormControl>
        </Box>
      )}

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Additional Notes (Optional)"
        value={additionalNotes}
        onChange={(e) => setAdditionalNotes(e.target.value)}
        sx={{ mt: 3 }}
      />
    </Box>
  );

  // Render confirmation
  const renderConfirmation = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Confirm Cancellation
      </Typography>

      <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="medium">
          This action cannot be undone. Please review the details below.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <List>
          <ListItem>
            <ListItemText
              primary="Booking Number"
              secondary={booking.bookingNumber}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Tour"
              secondary={booking.tourTitle}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Tour Date"
              secondary={format(new Date(booking.tourStartDate), 'MMMM dd, yyyy')}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Customer"
              secondary={`${booking.customer.firstName} ${booking.customer.lastName}`}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Cancellation Reason"
              secondary={cancellationReason === 'Other' ? otherReason : cancellationReason}
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3, bgcolor: 'warning.lighter' }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Original Amount:</Typography>
            <Typography fontWeight="medium">
              {booking.pricing.currency} {booking.pricing.total.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Amount Paid:</Typography>
            <Typography fontWeight="medium">
              {booking.pricing.currency} {paidAmount.toFixed(2)}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Refund Amount:</Typography>
            <Typography variant="h6" color={refundAmount > 0 ? 'success.main' : 'error.main'}>
              {booking.pricing.currency} {refundAmount.toFixed(2)}
            </Typography>
          </Box>
          {refundAmount > 0 && (
            <Alert severity="info" icon={<InfoIcon />}>
              Refund will be processed to your {refundMethod.replace(/_/g, ' ')} within 5-7 business days.
            </Alert>
          )}
        </Stack>
      </Paper>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Cancel Booking #{booking.bookingNumber}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/bookings/${id}`)}
        >
          Back to Booking
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {CANCELLATION_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && renderReasonSelection()}
          {activeStep === 1 && renderPolicyReview()}
          {activeStep === 2 && renderConfirmation()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0 || processing}
              onClick={handleBack}
            >
              Back
            </Button>

            {activeStep === CANCELLATION_STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="error"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={processing}
                startIcon={<CancelIcon />}
              >
                {processing ? <CircularProgress size={24} /> : 'Cancel Booking'}
              </Button>
            ) : (
              <Button onClick={handleNext} variant="contained">
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Final Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Final Confirmation</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Are you absolutely sure you want to cancel this booking? This action is permanent and cannot be undone.
            </Typography>
          </Alert>
          <Typography variant="body2">
            Refund amount: <strong>{booking.pricing.currency} {refundAmount.toFixed(2)}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            No, Keep Booking
          </Button>
          <Button onClick={handleCancel} variant="contained" color="error" disabled={processing}>
            {processing ? <CircularProgress size={24} /> : 'Yes, Cancel Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingCancellation;
