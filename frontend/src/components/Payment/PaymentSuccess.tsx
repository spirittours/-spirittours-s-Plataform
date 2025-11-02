/**
 * Payment Success Page
 * 
 * Displays success message after successful payment completion.
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Receipt as ReceiptIcon,
  Email as EmailIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const paymentId = searchParams.get('payment_id');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'USD';
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    // Track successful payment
    if (paymentId) {
      // Analytics tracking
      console.log('Payment successful:', paymentId);
      
      // TODO: Send confirmation email
      // TODO: Update booking status
    }
  }, [paymentId]);

  const formatAmount = (amount: string | null, currency: string): string => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  const handleViewBooking = () => {
    if (bookingId) {
      navigate(`/bookings/${bookingId}`);
    } else {
      navigate('/bookings');
    }
  };

  const handleDownloadReceipt = () => {
    // TODO: Generate and download PDF receipt
    console.log('Downloading receipt for payment:', paymentId);
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {/* Success Icon */}
        <Box sx={{ mb: 3 }}>
          <CheckIcon 
            sx={{ 
              fontSize: 80, 
              color: 'success.main',
              animation: 'scale-up 0.5s ease-in-out'
            }} 
          />
        </Box>

        {/* Success Message */}
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Payment Successful!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Thank you for your payment. Your transaction has been completed successfully.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Payment Details */}
        <Box sx={{ my: 4, p: 3, bgcolor: 'success.50', borderRadius: 2 }}>
          <Typography variant="h6" color="success.dark" gutterBottom>
            Payment Details
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Amount Paid:
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatAmount(amount, currency)}
              </Typography>
            </Stack>
            
            {paymentId && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Transaction ID:
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {paymentId}
                </Typography>
              </Stack>
            )}
            
            {bookingId && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Booking ID:
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  #{bookingId}
                </Typography>
              </Stack>
            )}
            
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Date:
              </Typography>
              <Typography variant="body2">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Confirmation Notice */}
        <Alert severity="info" icon={<EmailIcon />} sx={{ mb: 3 }}>
          A confirmation email has been sent to your registered email address.
        </Alert>

        {/* Action Buttons */}
        <Stack spacing={2} sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowIcon />}
            onClick={handleViewBooking}
          >
            View Booking Details
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<ReceiptIcon />}
            onClick={handleDownloadReceipt}
          >
            Download Receipt
          </Button>
          
          <Button
            variant="text"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </Stack>

        {/* Additional Information */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Need help? Contact us at support@spirit-tours.com or call +1 (800) 123-4567
          </Typography>
        </Box>
      </Paper>

      <style>
        {`
          @keyframes scale-up {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default PaymentSuccess;
