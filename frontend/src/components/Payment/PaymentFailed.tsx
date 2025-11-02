/**
 * Payment Failed Page
 * 
 * Displays error message when payment fails or is cancelled.
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RetryIcon,
  Home as HomeIcon,
  Help as HelpIcon,
  ExpandMore as ExpandIcon
} from '@mui/icons-material';

const PaymentFailed: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const error = searchParams.get('error');
  const paymentId = searchParams.get('payment_id');
  const bookingId = searchParams.get('booking_id');
  const reason = searchParams.get('reason') || 'unknown';

  const getErrorMessage = (reason: string): string => {
    switch (reason) {
      case 'insufficient_funds':
        return 'Your payment was declined due to insufficient funds.';
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.';
      case 'expired_card':
        return 'Your card has expired. Please use a different card.';
      case 'incorrect_cvc':
        return 'The security code (CVC) is incorrect.';
      case 'processing_error':
        return 'There was an error processing your payment.';
      case 'cancelled':
        return 'Payment was cancelled.';
      default:
        return 'Your payment could not be processed. Please try again.';
    }
  };

  const handleRetry = () => {
    if (bookingId) {
      navigate(`/payment?booking_id=${bookingId}`);
    } else {
      navigate('/bookings');
    }
  };

  const handleContactSupport = () => {
    navigate('/support');
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        {/* Error Icon */}
        <Box sx={{ mb: 3 }}>
          <ErrorIcon 
            sx={{ 
              fontSize: 80, 
              color: 'error.main',
              animation: 'shake 0.5s ease-in-out'
            }} 
          />
        </Box>

        {/* Error Message */}
        <Typography variant="h4" gutterBottom fontWeight="bold" color="error.main">
          Payment Failed
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {getErrorMessage(reason)}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Error Details */}
        {(error || paymentId) && (
          <Box sx={{ my: 4, p: 3, bgcolor: 'error.50', borderRadius: 2 }}>
            <Typography variant="h6" color="error.dark" gutterBottom>
              Error Details
            </Typography>
            
            <Stack spacing={2} sx={{ mt: 2 }}>
              {error && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Error:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {error}
                  </Typography>
                </Stack>
              )}
              
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
            </Stack>
          </Box>
        )}

        {/* What to do next */}
        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="subtitle2" gutterBottom>
            What can you do?
          </Typography>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Check your payment details and try again</li>
            <li>Try a different payment method</li>
            <li>Contact your bank if the issue persists</li>
            <li>Reach out to our support team for assistance</li>
          </ul>
        </Alert>

        {/* Action Buttons */}
        <Stack spacing={2} sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<RetryIcon />}
            onClick={handleRetry}
          >
            Try Again
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<HelpIcon />}
            onClick={handleContactSupport}
          >
            Contact Support
          </Button>
          
          <Button
            variant="text"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </Stack>

        {/* Common Issues FAQ */}
        <Box sx={{ mt: 4 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="subtitle2">
                Common Payment Issues
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2} sx={{ textAlign: 'left' }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Card Declined
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contact your bank to ensure your card is authorized for online payments
                    and has sufficient funds.
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Expired Card
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please use a card with a valid expiry date.
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Incorrect Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Double-check your card number, expiry date, and security code (CVC).
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    3D Secure Verification
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Some cards require additional verification. Make sure you complete
                    the verification step if prompted.
                  </Typography>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Support Information */}
        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Need immediate help?</strong><br />
            Email: support@spirit-tours.com<br />
            Phone: +1 (800) 123-4567<br />
            Available 24/7
          </Typography>
        </Box>
      </Paper>

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
          }
        `}
      </style>
    </Container>
  );
};

export default PaymentFailed;
