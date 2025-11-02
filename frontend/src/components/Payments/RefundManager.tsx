import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Undo as RefundIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import stripeService from '../../services/stripeService';
import {
  Payment,
  Refund,
  RefundReason,
  RefundStatus,
} from '../../types/payment.types';

// ============================================================================
// Component
// ============================================================================

const RefundManager: React.FC = () => {
  const navigate = useNavigate();
  const { paymentId } = useParams<{ paymentId: string }>();

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Refund form
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<RefundReason>(RefundReason.CUSTOMER_REQUEST);
  const [reasonDetails, setReasonDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Stepper
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Select Amount', 'Reason & Details', 'Confirm Refund'];

  // Confirmation
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [createdRefund, setCreatedRefund] = useState<Refund | null>(null);

  // ==========================================================================
  // Fetch Payment
  // ==========================================================================

  useEffect(() => {
    const fetchPayment = async () => {
      if (!paymentId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<Payment>(`/api/payments/${paymentId}`);
        setPayment(response.data);

        // Set default refund amount to remaining refundable amount
        const refundableAmount = response.data.amount - response.data.refundedAmount;
        setRefundAmount(refundableAmount);
      } catch (err: any) {
        console.error('Error fetching payment:', err);
        setError(err.message || 'Failed to load payment');
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleNext = () => {
    // Validation for each step
    if (activeStep === 0) {
      if (refundAmount <= 0) {
        toast.error('Refund amount must be greater than 0');
        return;
      }

      const maxRefund = payment ? payment.amount - payment.refundedAmount : 0;
      if (refundAmount > maxRefund) {
        toast.error(`Refund amount cannot exceed ${stripeService.formatAmount(maxRefund, payment?.currency || 'USD')}`);
        return;
      }
    }

    if (activeStep === 1) {
      if (!refundReason) {
        toast.error('Please select a refund reason');
        return;
      }
    }

    if (activeStep === steps.length - 1) {
      setConfirmDialogOpen(true);
      return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleProcessRefund = async () => {
    if (!payment) return;

    try {
      setProcessing(true);
      setError(null);

      // Process refund through API
      const response = await apiClient.post<Refund>('/api/payments/refunds', {
        paymentId: payment.id,
        amount: refundAmount,
        reason: refundReason,
        reasonDetails,
        notes,
      });

      setCreatedRefund(response.data);
      setRefundSuccess(true);
      setConfirmDialogOpen(false);
      toast.success('Refund processed successfully');
    } catch (err: any) {
      console.error('Error processing refund:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to process refund';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  const getMaxRefundAmount = (): number => {
    if (!payment) return 0;
    return payment.amount - payment.refundedAmount;
  };

  const isFullRefund = (): boolean => {
    return refundAmount === getMaxRefundAmount();
  };

  // ==========================================================================
  // Render Loading State
  // ==========================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ==========================================================================
  // Render Error State
  // ==========================================================================

  if (error && !payment) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  // ==========================================================================
  // Render Success State
  // ==========================================================================

  if (refundSuccess && createdRefund) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Refund Processed Successfully
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Refund of {stripeService.formatAmount(refundAmount, payment?.currency || 'USD')} has been initiated.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Refund ID: {createdRefund.refundNumber}
          </Typography>
          <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
            The refund will be processed within 5-10 business days.
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(`/payments/${payment?.id}`)}
            >
              View Payment
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/payments')}
            >
              Back to Payments
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // ==========================================================================
  // Render Not Refundable State
  // ==========================================================================

  if (payment && !payment.refundable) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          This payment is not refundable.
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/payments/${payment.id}`)}>
          View Payment
        </Button>
      </Box>
    );
  }

  // ==========================================================================
  // Render Fully Refunded State
  // ==========================================================================

  if (payment && payment.amount === payment.refundedAmount) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          This payment has already been fully refunded.
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate(`/payments/${payment.id}`)}>
          View Payment
        </Button>
      </Box>
    );
  }

  // ==========================================================================
  // Render Refund Form
  // ==========================================================================

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Process Refund
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Issue a full or partial refund for payment {payment?.paymentNumber}
        </Typography>
      </Box>

      {/* Payment Summary */}
      <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Original Amount
              </Typography>
              <Typography variant="h6">
                {payment && stripeService.formatAmount(payment.amount, payment.currency)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Already Refunded
              </Typography>
              <Typography variant="h6">
                {payment && stripeService.formatAmount(payment.refundedAmount, payment.currency)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Refundable Amount
              </Typography>
              <Typography variant="h6" color="primary">
                {payment && stripeService.formatAmount(getMaxRefundAmount(), payment.currency)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Paper sx={{ p: 3 }}>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step 0: Select Amount */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Refund Amount
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Refund Amount"
                  type="number"
                  fullWidth
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                  inputProps={{
                    min: 0,
                    max: getMaxRefundAmount(),
                    step: 0.01,
                  }}
                  helperText={`Maximum refundable: ${payment && stripeService.formatAmount(getMaxRefundAmount(), payment.currency)}`}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setRefundAmount(getMaxRefundAmount())}
                  >
                    Full Refund
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setRefundAmount(getMaxRefundAmount() * 0.5)}
                  >
                    50% Refund
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 1: Reason & Details */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Refund Reason & Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Refund Reason</InputLabel>
                  <Select
                    value={refundReason}
                    label="Refund Reason"
                    onChange={(e) => setRefundReason(e.target.value as RefundReason)}
                  >
                    {Object.values(RefundReason).map((reason) => (
                      <MenuItem key={reason} value={reason}>
                        {reason.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Additional Details"
                  fullWidth
                  multiline
                  rows={3}
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  placeholder="Provide additional context for this refund..."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Internal Notes"
                  fullWidth
                  multiline
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes (not visible to customer)..."
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 2: Confirm */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirm Refund
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              Please review the refund details carefully before proceeding. This action cannot be undone.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Refund Type
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {isFullRefund() ? 'Full Refund' : 'Partial Refund'}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Refund Amount
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {payment && stripeService.formatAmount(refundAmount, payment.currency)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Reason
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {refundReason.replace('_', ' ').toUpperCase()}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  Processing Time
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  5-10 business days
                </Typography>
              </Grid>

              {reasonDetails && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Details
                  </Typography>
                  <Typography variant="body1">
                    {reasonDetails}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={processing}
          >
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={processing}
            >
              Back
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={processing}
          >
            {activeStep === steps.length - 1 ? 'Process Refund' : 'Next'}
          </Button>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => !processing && setConfirmDialogOpen(false)}>
        <DialogTitle>
          <WarningIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />
          Confirm Refund
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to process a refund of{' '}
            <strong>{payment && stripeService.formatAmount(refundAmount, payment.currency)}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The refund will be processed to the original payment method.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleProcessRefund}
            color="primary"
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <RefundIcon />}
          >
            {processing ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RefundManager;
