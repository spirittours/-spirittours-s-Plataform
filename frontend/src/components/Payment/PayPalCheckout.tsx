/**
 * PayPal Checkout Component
 * 
 * Integrates PayPal Smart Payment Buttons for PayPal payments.
 * Uses PayPal JavaScript SDK for secure checkout.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Paper
} from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';

export interface PayPalCheckoutProps {
  amount: number;
  currency: string;
  description: string;
  bookingId?: number;
  customerEmail: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
}

const PayPalCheckout: React.FC<PayPalCheckoutProps> = ({
  amount,
  currency,
  description,
  bookingId,
  customerEmail,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load PayPal SDK
    loadPayPalSDK();
  }, []);

  useEffect(() => {
    // Render PayPal buttons when SDK is loaded
    if (sdkLoaded && paypalRef.current) {
      renderPayPalButtons();
    }
  }, [sdkLoaded]);

  const loadPayPalSDK = async () => {
    try {
      // Check if PayPal SDK is already loaded
      if ((window as any).paypal) {
        setSdkLoaded(true);
        setLoading(false);
        return;
      }

      // In production, load PayPal SDK:
      // const script = document.createElement('script');
      // script.src = `https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=${currency}`;
      // script.async = true;
      // script.onload = () => {
      //   setSdkLoaded(true);
      //   setLoading(false);
      // };
      // script.onerror = () => {
      //   setError('Failed to load PayPal SDK');
      //   setLoading(false);
      // };
      // document.body.appendChild(script);

      // Simulated loading for development
      setTimeout(() => {
        setSdkLoaded(true);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to load PayPal SDK. Please refresh the page.');
      setLoading(false);
      onError('Failed to load PayPal SDK');
    }
  };

  const renderPayPalButtons = () => {
    // In production, render PayPal buttons:
    // (window as any).paypal.Buttons({
    //   createOrder: (data: any, actions: any) => {
    //     return actions.order.create({
    //       purchase_units: [{
    //         amount: {
    //           value: amount.toFixed(2),
    //           currency_code: currency
    //         },
    //         description: description,
    //         custom_id: bookingId?.toString()
    //       }]
    //     });
    //   },
    //   onApprove: async (data: any, actions: any) => {
    //     const order = await actions.order.capture();
    //     handlePayPalSuccess(order.id);
    //   },
    //   onError: (err: any) => {
    //     handlePayPalError(err);
    //   }
    // }).render(paypalRef.current);

    // For development, show placeholder
    console.log('PayPal buttons would be rendered here');
  };

  const handlePayPalSuccess = async (orderId: string) => {
    try {
      // Call backend to create payment record
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount,
          currency,
          provider: 'paypal',
          payment_method: 'paypal_account',
          description,
          booking_id: bookingId,
          customer_email: customerEmail,
          metadata: {
            paypal_order_id: orderId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      const data = await response.json();

      // Call success callback
      onSuccess(data.payment_id);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process payment';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handlePayPalError = (err: any) => {
    const errorMessage = err.message || 'PayPal payment failed';
    setError(errorMessage);
    onError(errorMessage);
  };

  const handlePayPalClick = async () => {
    try {
      // Create order on backend
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount,
          currency,
          provider: 'paypal',
          payment_method: 'paypal_account',
          description,
          booking_id: bookingId,
          customer_email: customerEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const data = await response.json();

      // In development, simulate approval
      if (data.checkout_url) {
        // In production, redirect to PayPal:
        // window.location.href = data.checkout_url;
        
        // For development, simulate success after delay
        setTimeout(() => {
          onSuccess(data.payment_id);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create PayPal order');
      onError(err.message || 'Failed to create PayPal order');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        You will be redirected to PayPal to complete your payment securely.
      </Alert>

      {/* PayPal Buttons Container */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'grey.50',
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'grey.100'
          }
        }}
        onClick={handlePayPalClick}
      >
        <Box
          component="img"
          src="/paypal-logo.svg"
          alt="PayPal"
          sx={{ height: 40, mb: 2 }}
          onError={(e) => {
            // Fallback if logo not found
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <Typography variant="h6" color="primary" gutterBottom>
          Pay with PayPal
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click to continue to PayPal
        </Typography>
      </Paper>

      {/* PayPal SDK Buttons (production) */}
      <Box ref={paypalRef} sx={{ my: 2, display: 'none' }} />

      {/* Security Notice */}
      <Alert severity="info" icon={<CheckIcon />} sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Secure Payment:</strong> Your payment is processed securely through PayPal.
          You can pay with your PayPal account or credit/debit card.
        </Typography>
      </Alert>

      {/* Payment Amount */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Amount to Pay
        </Typography>
        <Typography variant="h5" color="primary.main">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
          }).format(amount)}
        </Typography>
      </Box>
    </Box>
  );
};

export default PayPalCheckout;
