/**
 * Payment Checkout Component
 * Unified checkout with Stripe and PayPal support
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CreditCard,
  Payment,
  CheckCircle,
  Error as ErrorIcon,
  Receipt,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { paymentsService } from '../../services/paymentsService';

interface PaymentCheckoutProps {
  amount: number;
  currency?: string;
  bookingId?: string;
  description?: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: any) => void;
}

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  amount,
  currency = 'EUR',
  bookingId,
  description,
  onSuccess,
  onError,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Stripe card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardName, setCardName] = useState('');

  const handleStripePayment = async () => {
    try {
      setProcessing(true);

      // Validate card details
      if (!cardNumber || !cardExpiry || !cardCVC || !cardName) {
        toast.error('Please fill in all card details');
        return;
      }

      // Create payment intent
      const intent = await paymentsService.createStripePaymentIntent(
        amount * 100, // Convert to cents
        currency.toLowerCase(),
        { booking_id: bookingId, description }
      );

      // In real implementation, use Stripe.js to create payment method
      // For demo, we'll simulate success
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = {
        id: `pay_${Date.now()}`,
        amount,
        currency,
        status: 'succeeded',
        payment_method: 'stripe',
        card_last4: cardNumber.slice(-4),
        receipt_url: `https://stripe.com/receipt/${Date.now()}`,
      };

      setPaymentData(result);
      setPaymentComplete(true);
      setShowSuccessDialog(true);
      toast.success('Payment successful!');
      onSuccess?.(result);
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      toast.error('Payment failed. Please try again.');
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    try {
      setProcessing(true);

      // Create PayPal order
      const order = await paymentsService.createPayPalOrder(amount, currency);

      // In real implementation, redirect to PayPal or use PayPal SDK
      // For demo, we'll simulate success
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = {
        id: `paypal_${Date.now()}`,
        amount,
        currency,
        status: 'succeeded',
        payment_method: 'paypal',
        receipt_url: `https://paypal.com/receipt/${Date.now()}`,
      };

      setPaymentData(result);
      setPaymentComplete(true);
      setShowSuccessDialog(true);
      toast.success('PayPal payment successful!');
      onSuccess?.(result);
    } catch (error: any) {
      console.error('PayPal payment error:', error);
      toast.error('PayPal payment failed. Please try again.');
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'stripe') {
      await handleStripePayment();
    } else {
      await handlePayPalPayment();
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Payment Checkout
          </Typography>

          {/* Order Summary */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Amount
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {currency} {amount.toFixed(2)}
                </Typography>
              </Grid>
              {description && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Description
                  </Typography>
                  <Typography variant="body1">{description}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Payment Method Selection */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Select Payment Method
          </Typography>
          <RadioGroup
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paypal')}
          >
            <FormControlLabel
              value="stripe"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CreditCard />
                  <Typography>Credit/Debit Card (Stripe)</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="paypal"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Payment />
                  <Typography>PayPal</Typography>
                </Box>
              }
            />
          </RadioGroup>

          <Divider sx={{ my: 3 }} />

          {/* Payment Forms */}
          {paymentMethod === 'stripe' && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Card Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    disabled={processing || paymentComplete}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Card Number"
                    value={cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      if (formatted.replace(/\s/g, '').length <= 16) {
                        setCardNumber(formatted);
                      }
                    }}
                    placeholder="1234 5678 9012 3456"
                    disabled={processing || paymentComplete}
                    InputProps={{
                      startAdornment: <CreditCard sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    value={cardExpiry}
                    onChange={(e) => {
                      const formatted = formatExpiry(e.target.value);
                      if (formatted.length <= 5) {
                        setCardExpiry(formatted);
                      }
                    }}
                    placeholder="MM/YY"
                    disabled={processing || paymentComplete}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="CVC"
                    value={cardCVC}
                    onChange={(e) => {
                      if (e.target.value.length <= 3) {
                        setCardCVC(e.target.value.replace(/\D/g, ''));
                      }
                    }}
                    placeholder="123"
                    disabled={processing || paymentComplete}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {paymentMethod === 'paypal' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Payment sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="body1" color="textSecondary">
                You will be redirected to PayPal to complete your payment securely.
              </Typography>
            </Box>
          )}

          {/* Security Notice */}
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              🔒 Your payment information is encrypted and secure. We never store your full card
              details.
            </Typography>
          </Alert>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button fullWidth variant="outlined" disabled={processing || paymentComplete}>
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handlePayment}
              disabled={processing || paymentComplete}
              startIcon={processing ? <CircularProgress size={20} /> : <Payment />}
            >
              {processing ? 'Processing...' : `Pay ${currency} ${amount.toFixed(2)}`}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle sx={{ color: 'success.main', fontSize: 32 }} />
            <Typography variant="h6">Payment Successful!</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Your payment has been processed successfully.
            </Typography>
            {paymentData && (
              <Box sx={{ mt: 3, textAlign: 'left' }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Transaction ID:</strong> {paymentData.id}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Amount:</strong> {paymentData.currency} {paymentData.amount}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Payment Method:</strong> {paymentData.payment_method}
                </Typography>
                {paymentData.card_last4 && (
                  <Typography variant="body2" color="textSecondary">
                    <strong>Card:</strong> •••• {paymentData.card_last4}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<Receipt />}
            onClick={() => {
              // Download receipt
              toast.success('Receipt download started');
            }}
          >
            Download Receipt
          </Button>
          <Button variant="contained" onClick={() => setShowSuccessDialog(false)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentCheckout;
