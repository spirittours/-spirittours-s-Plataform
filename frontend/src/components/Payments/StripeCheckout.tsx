import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import stripeService from '../../services/stripeService';
import { Payment } from '../../types/payment.types';

// ============================================================================
// Props Interface
// ============================================================================

interface StripeCheckoutProps {
  amount: number;
  currency: string;
  bookingId: string;
  customerId: string;
  description?: string;
  onSuccess?: (payment: Payment) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Component
// ============================================================================

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  amount,
  currency,
  bookingId,
  customerId,
  description,
  onSuccess,
  onError,
}) => {
  const navigate = useNavigate();

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);

  // Form state
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  // Billing address
  const [billingName, setBillingName] = useState('');
  const [billingLine1, setBillingLine1] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');

  // ==========================================================================
  // Validation
  // ==========================================================================

  const validateForm = (): boolean => {
    if (!cardholderName.trim()) {
      setError('Cardholder name is required');
      return false;
    }

    if (!stripeService.validateCardNumber(cardNumber)) {
      setError('Invalid card number');
      return false;
    }

    const month = parseInt(expiryMonth);
    const year = parseInt(expiryYear);

    if (!stripeService.validateExpiryDate(month, year)) {
      setError('Invalid or expired card');
      return false;
    }

    const cardBrand = stripeService.getCardBrand(cardNumber);
    if (!stripeService.validateCVV(cvv, cardBrand)) {
      setError('Invalid CVV');
      return false;
    }

    if (!billingName.trim() || !billingLine1.trim() || !billingCity.trim() || !billingPostalCode.trim()) {
      setError('Billing address is required');
      return false;
    }

    return true;
  };

  // ==========================================================================
  // Payment Processing
  // ==========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Note: In a real implementation, you would use Stripe Elements
      // which handles card input securely without exposing card details
      // This is a simplified version for demonstration

      // Create payment intent and process payment
      // Actual implementation would use Stripe.js and Elements
      toast.info('Processing payment with Stripe...');

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful payment
      const mockPayment: Payment = {
        id: 'pay_' + Date.now(),
        paymentNumber: 'PAY-2024-' + Date.now(),
        bookingId,
        customerId,
        amount,
        currency,
        status: 'completed' as any,
        method: 'credit_card' as any,
        provider: 'stripe' as any,
        description: description || 'Tour booking payment',
        refundable: true,
        refundedAmount: 0,
        refunds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        paymentMethodDetails: {
          type: 'credit_card' as any,
          card: {
            brand: stripeService.getCardBrand(cardNumber) as any,
            last4: cardNumber.slice(-4),
            expMonth: parseInt(expiryMonth),
            expYear: parseInt(expiryYear),
          },
        },
      };

      setPayment(mockPayment);
      setSuccess(true);
      toast.success('Payment successful!');

      if (onSuccess) {
        onSuccess(mockPayment);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // Format Card Number
  // ==========================================================================

  const handleCardNumberChange = (value: string) => {
    const formatted = stripeService.formatCardNumber(value.replace(/\s/g, ''));
    setCardNumber(formatted);
  };

  // ==========================================================================
  // Render Success State
  // ==========================================================================

  if (success && payment) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Payment Successful!
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Your payment of {stripeService.formatAmount(amount, currency)} has been processed.
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Payment ID: {payment.paymentNumber}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate(`/bookings/${bookingId}`)}
          sx={{ mt: 3 }}
        >
          View Booking
        </Button>
      </Paper>
    );
  }

  // ==========================================================================
  // Render Payment Form
  // ==========================================================================

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon /> Stripe Payment
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Payment Summary */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Amount to Pay
            </Typography>
            <Typography variant="h4" color="primary">
              {stripeService.formatAmount(amount, currency)}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {description}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Card Information */}
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Card Information
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField
              label="Cardholder Name"
              fullWidth
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Card Number"
              fullWidth
              required
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              disabled={loading}
              placeholder="1234 5678 9012 3456"
              inputProps={{ maxLength: 19 }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Expiry Month (MM)"
              fullWidth
              required
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              placeholder="12"
              inputProps={{ maxLength: 2 }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Expiry Year (YYYY)"
              fullWidth
              required
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              placeholder="2025"
              inputProps={{ maxLength: 4 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="CVV"
              fullWidth
              required
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              type="password"
              placeholder="123"
              inputProps={{ maxLength: 4 }}
            />
          </Grid>
        </Grid>

        {/* Billing Address */}
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Billing Address
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <TextField
              label="Full Name"
              fullWidth
              required
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Address Line 1"
              fullWidth
              required
              value={billingLine1}
              onChange={(e) => setBillingLine1(e.target.value)}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="City"
              fullWidth
              required
              value={billingCity}
              onChange={(e) => setBillingCity(e.target.value)}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="State"
              fullWidth
              required
              value={billingState}
              onChange={(e) => setBillingState(e.target.value)}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Postal Code"
              fullWidth
              required
              value={billingPostalCode}
              onChange={(e) => setBillingPostalCode(e.target.value)}
              disabled={loading}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Country"
              fullWidth
              required
              value={billingCountry}
              onChange={(e) => setBillingCountry(e.target.value)}
              disabled={loading}
            />
          </Grid>
        </Grid>

        {/* Save Payment Method */}
        <FormControlLabel
          control={
            <Checkbox
              checked={savePaymentMethod}
              onChange={(e) => setSavePaymentMethod(e.target.checked)}
              disabled={loading}
            />
          }
          label="Save this payment method for future use"
          sx={{ mb: 2 }}
        />

        <Alert severity="info" icon={false} sx={{ mb: 2 }}>
          <Typography variant="caption">
            🔒 Your payment information is encrypted and secure. We use Stripe for payment processing.
          </Typography>
        </Alert>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
        >
          {loading ? 'Processing...' : `Pay ${stripeService.formatAmount(amount, currency)}`}
        </Button>
      </Paper>
    </Box>
  );
};

export default StripeCheckout;
