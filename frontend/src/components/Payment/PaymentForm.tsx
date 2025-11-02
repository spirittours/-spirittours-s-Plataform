/**
 * Payment Form Component
 * 
 * Main payment form that allows users to select payment method
 * and process payments through different providers.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  AttachMoney as CashIcon
} from '@mui/icons-material';
import StripeCheckout from './StripeCheckout';
import PayPalCheckout from './PayPalCheckout';

export interface PaymentFormProps {
  amount: number;
  currency?: string;
  description: string;
  bookingId?: number;
  customerEmail: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export type PaymentProvider = 'stripe' | 'paypal' | 'cash' | 'bank_transfer';

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'USD',
  description,
  bookingId,
  customerEmail,
  onSuccess,
  onError,
  onCancel
}) => {
  const [provider, setProvider] = useState<PaymentProvider>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProvider(event.target.value as PaymentProvider);
    setError(null);
  };

  const handleSuccess = (paymentId: string) => {
    setLoading(false);
    onSuccess(paymentId);
  };

  const handleError = (errorMessage: string) => {
    setLoading(false);
    setError(errorMessage);
    onError(errorMessage);
  };

  const renderPaymentProvider = () => {
    switch (provider) {
      case 'stripe':
        return (
          <StripeCheckout
            amount={amount}
            currency={currency}
            description={description}
            bookingId={bookingId}
            customerEmail={customerEmail}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        );

      case 'paypal':
        return (
          <PayPalCheckout
            amount={amount}
            currency={currency}
            description={description}
            bookingId={bookingId}
            customerEmail={customerEmail}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        );

      case 'cash':
        return (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              You have selected cash payment. Please pay at the tour location.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Your booking will be confirmed, and payment will be collected on arrival.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                // Create cash payment record
                onSuccess('CASH_PAYMENT');
              }}
            >
              Confirm Cash Payment
            </Button>
          </Box>
        );

      case 'bank_transfer':
        return (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Bank Transfer Instructions
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Please transfer to:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Bank:</strong> Spirit Tours Bank
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Account Number:</strong> 123456789
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>SWIFT:</strong> SPTOBANK
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Amount:</strong> {formatAmount(amount, currency)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Reference:</strong> BOOKING-{bookingId || 'XXXX'}
              </Typography>
            </Paper>
            <TextField
              fullWidth
              label="Transfer Reference Number"
              placeholder="Enter your bank transfer reference"
              sx={{ mt: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                // Create bank transfer payment record
                onSuccess('BANK_TRANSFER_PENDING');
              }}
            >
              I Have Completed the Transfer
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, margin: '0 auto' }}>
      <Typography variant="h5" gutterBottom>
        Payment
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Payment Summary */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" color="text.secondary">
            Total Amount:
          </Typography>
          <Typography variant="h4" color="primary.main" fontWeight="bold">
            {formatAmount(amount, currency)}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Payment Method Selection */}
      <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
        <FormLabel component="legend">
          <Typography variant="subtitle1" fontWeight="medium">
            Select Payment Method
          </Typography>
        </FormLabel>
        <RadioGroup
          aria-label="payment-provider"
          name="payment-provider"
          value={provider}
          onChange={handleProviderChange}
        >
          <FormControlLabel
            value="stripe"
            control={<Radio />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <CreditCardIcon color="action" />
                <Box>
                  <Typography>Credit/Debit Card</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Powered by Stripe
                  </Typography>
                </Box>
              </Stack>
            }
          />
          <FormControlLabel
            value="paypal"
            control={<Radio />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  component="img"
                  src="/paypal-logo.svg"
                  alt="PayPal"
                  sx={{ width: 24, height: 24 }}
                />
                <Box>
                  <Typography>PayPal</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay with PayPal account
                  </Typography>
                </Box>
              </Stack>
            }
          />
          <FormControlLabel
            value="bank_transfer"
            control={<Radio />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <BankIcon color="action" />
                <Box>
                  <Typography>Bank Transfer</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Direct bank transfer
                  </Typography>
                </Box>
              </Stack>
            }
          />
          <FormControlLabel
            value="cash"
            control={<Radio />}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <CashIcon color="action" />
                <Box>
                  <Typography>Cash</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pay at tour location
                  </Typography>
                </Box>
              </Stack>
            }
          />
        </RadioGroup>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      {/* Payment Provider Component */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        renderPaymentProvider()
      )}

      {/* Cancel Button */}
      {onCancel && (
        <Button
          variant="text"
          fullWidth
          sx={{ mt: 2 }}
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </Paper>
  );
};

export default PaymentForm;
