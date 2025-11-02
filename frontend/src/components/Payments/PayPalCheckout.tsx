import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import paypalService from '../../services/paypalService';
import { Payment } from '../../types/payment.types';

// ============================================================================
// Props Interface
// ============================================================================

interface PayPalCheckoutProps {
  amount: number;
  currency: string;
  bookingId: string;
  customerId: string;
  description?: string;
  onSuccess?: (payment: Payment) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
  amount,
  currency,
  bookingId,
  customerId,
  description,
  onSuccess,
  onError,
  onCancel,
}) => {
  const navigate = useNavigate();
  const paypalRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [processing, setProcessing] = useState(false);

  // ==========================================================================
  // Initialize PayPal Buttons
  // ==========================================================================

  useEffect(() => {
    const initPayPal = async () => {
      try {
        setLoading(true);
        setError(null);

        // Render PayPal buttons
        await paypalService.renderPayPalButtons('paypal-button-container', {
          amount,
          currency,
          bookingId,
          customerId,
          description,

          onSuccess: (payment) => {
            setPayment(payment);
            setSuccess(true);
            toast.success('Payment successful!');

            if (onSuccess) {
              onSuccess(payment);
            }
          },

          onError: (error) => {
            console.error('PayPal error:', error);
            const errorMessage = error.message || 'Payment failed. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);

            if (onError) {
              onError(error);
            }
          },

          onCancel: () => {
            toast.info('Payment cancelled');
            if (onCancel) {
              onCancel();
            }
          },
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing PayPal:', err);
        setError(err.message || 'Failed to load PayPal');
        setLoading(false);
      }
    };

    initPayPal();
  }, [amount, currency, bookingId, customerId, description]);

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
          Your payment of {paypalService.formatPayment({ purchase_units: [{ amount: { value: amount.toString(), currency_code: currency } }] } as any)} has been processed.
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
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          PayPal Payment
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
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
              }).format(amount)}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {description}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* PayPal Buttons Container */}
        {!loading && (
          <>
            <Alert severity="info" icon={false} sx={{ mb: 2 }}>
              <Typography variant="caption">
                🔒 You will be redirected to PayPal to complete your payment securely.
              </Typography>
            </Alert>

            <Box
              id="paypal-button-container"
              ref={paypalRef}
              sx={{
                minHeight: 200,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            />
          </>
        )}

        {/* Processing State */}
        {processing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Processing payment...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PayPalCheckout;
