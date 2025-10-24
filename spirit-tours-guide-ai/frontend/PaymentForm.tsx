import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, AlertCircle, CheckCircle, Loader, 
  DollarSign, Lock, ArrowRight, X
} from 'lucide-react';

// Types
interface PaymentFormProps {
  bookingId: string;
  amount: number;
  currency: string;
  onPaymentComplete?: (transactionId: string) => void;
  onPaymentFailed?: (error: string) => void;
  onCancel?: () => void;
}

interface StripeCardElement {
  card: any;
  error: string | null;
  complete: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingId,
  amount,
  currency,
  onPaymentComplete,
  onPaymentFailed,
  onCancel
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Stripe Elements
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripeElements, setStripeElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // PayPal
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const STRIPE_PUBLIC_KEY = process.env.REACT_APP_STRIPE_PUBLIC_KEY || '';

  // Load Stripe
  useEffect(() => {
    if (paymentMethod === 'stripe' && !stripeLoaded) {
      loadStripe();
    }
  }, [paymentMethod]);

  // Load PayPal
  useEffect(() => {
    if (paymentMethod === 'paypal' && !paypalLoaded) {
      loadPayPal();
    }
  }, [paymentMethod]);

  const loadStripe = async () => {
    try {
      // Load Stripe.js script
      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = initializeStripe;
        document.body.appendChild(script);
      } else {
        initializeStripe();
      }
    } catch (err) {
      console.error('Error loading Stripe:', err);
      setError('Failed to load payment processor');
    }
  };

  const initializeStripe = () => {
    try {
      const stripe = (window as any).Stripe(STRIPE_PUBLIC_KEY);
      const elements = stripe.elements();
      
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
              color: '#aab7c4',
            },
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          invalid: {
            color: '#9e2146',
          },
        },
      });

      card.mount('#card-element');

      card.on('change', (event: any) => {
        setCardComplete(event.complete);
        setCardError(event.error ? event.error.message : null);
      });

      setStripeElements(elements);
      setCardElement(card);
      setStripeLoaded(true);
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      setError('Failed to initialize payment form');
    }
  };

  const loadPayPal = async () => {
    try {
      // Create PayPal order first
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/bookings/${bookingId}/paypal/order`
      );

      setPaypalOrderId(response.data.orderId);

      // Load PayPal SDK
      if (!(window as any).paypal) {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&currency=${currency}`;
        script.async = true;
        script.onload = () => initializePayPal(response.data.orderId);
        document.body.appendChild(script);
      } else {
        initializePayPal(response.data.orderId);
      }
    } catch (err: any) {
      console.error('Error loading PayPal:', err);
      setError(err.response?.data?.error || 'Failed to initialize PayPal');
    } finally {
      setLoading(false);
    }
  };

  const initializePayPal = (orderId: string) => {
    try {
      (window as any).paypal.Buttons({
        createOrder: () => orderId,
        onApprove: async (data: any) => {
          await handlePayPalPayment(data.orderID);
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          setError('Payment failed. Please try again.');
          if (onPaymentFailed) {
            onPaymentFailed('PayPal payment failed');
          }
        },
      }).render('#paypal-button-container');

      setPaypalLoaded(true);
    } catch (err) {
      console.error('Error initializing PayPal buttons:', err);
      setError('Failed to load PayPal buttons');
    }
  };

  const handleStripePayment = async () => {
    if (!cardElement || !cardComplete) {
      setError('Please complete your card information');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Create payment method
      const stripe = (window as any).Stripe(STRIPE_PUBLIC_KEY);
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // Process payment
      const response = await axios.post(
        `${API_BASE}/bookings/${bookingId}/pay/stripe`,
        {
          paymentMethodId: paymentMethod.id,
        }
      );

      if (response.data.success) {
        setSuccess('Payment successful! Your booking is confirmed.');
        if (onPaymentComplete) {
          onPaymentComplete(response.data.transaction.transactionId);
        }
      } else if (response.data.requiresAction) {
        // Handle 3D Secure authentication
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          response.data.paymentIntent.client_secret
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (paymentIntent.status === 'succeeded') {
          setSuccess('Payment successful! Your booking is confirmed.');
          if (onPaymentComplete) {
            onPaymentComplete(response.data.transaction.transactionId);
          }
        }
      } else {
        throw new Error('Payment failed');
      }
    } catch (err: any) {
      console.error('Stripe payment error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Payment failed';
      setError(errorMessage);
      if (onPaymentFailed) {
        onPaymentFailed(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handlePayPalPayment = async (orderId: string) => {
    try {
      setProcessing(true);
      setError(null);

      const response = await axios.post(
        `${API_BASE}/bookings/${bookingId}/pay/paypal`,
        {
          paypalOrderId: orderId,
        }
      );

      if (response.data.success) {
        setSuccess('Payment successful! Your booking is confirmed.');
        if (onPaymentComplete) {
          onPaymentComplete(response.data.transaction.transactionId);
        }
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (err: any) {
      console.error('PayPal payment error:', err);
      const errorMessage = err.response?.data?.error || 'Payment failed';
      setError(errorMessage);
      if (onPaymentFailed) {
        onPaymentFailed(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amt: number, curr: string = currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amt);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <Lock className="mr-2 text-green-600" size={24} />
          Secure Payment
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded"
            disabled={processing}
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Payment Summary */}
      <div className="bg-blue-50 p-4 rounded mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Amount to Pay:</span>
          <span className="text-3xl font-bold text-blue-600">
            {formatCurrency(amount, currency)}
          </span>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Booking ID: {bookingId}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="mr-2" size={20} />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <CheckCircle className="mr-2" size={20} />
          {success}
        </div>
      )}

      {!success && (
        <>
          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Select Payment Method</h3>
            <div className="flex space-x-4">
              <button
                onClick={() => setPaymentMethod('stripe')}
                disabled={processing}
                className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center ${
                  paymentMethod === 'stripe'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CreditCard className="mr-2" size={24} />
                <span className="font-semibold">Credit/Debit Card</span>
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                disabled={processing}
                className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center ${
                  paymentMethod === 'paypal'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <DollarSign className="mr-2" size={24} />
                <span className="font-semibold">PayPal</span>
              </button>
            </div>
          </div>

          {/* Stripe Payment Form */}
          {paymentMethod === 'stripe' && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Card Information</h3>
              
              {!stripeLoaded ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin mr-2" size={24} />
                  <span>Loading payment form...</span>
                </div>
              ) : (
                <div>
                  <div
                    id="card-element"
                    className="p-4 border rounded focus-within:ring-2 focus-within:ring-blue-500"
                  />
                  {cardError && (
                    <div className="text-red-600 text-sm mt-2">{cardError}</div>
                  )}

                  <div className="mt-4 flex items-center text-sm text-gray-600">
                    <Lock size={16} className="mr-2" />
                    <span>Your payment is secure and encrypted</span>
                  </div>

                  <button
                    onClick={handleStripePayment}
                    disabled={!cardComplete || processing}
                    className="w-full mt-6 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-lg font-semibold"
                  >
                    {processing ? (
                      <>
                        <Loader className="animate-spin mr-2" size={24} />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        Pay {formatCurrency(amount, currency)}
                        <ArrowRight className="ml-2" size={24} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PayPal Payment */}
          {paymentMethod === 'paypal' && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">PayPal Checkout</h3>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin mr-2" size={24} />
                  <span>Loading PayPal...</span>
                </div>
              ) : paypalLoaded ? (
                <div>
                  <div id="paypal-button-container" className="mt-4" />
                  {processing && (
                    <div className="flex items-center justify-center mt-4">
                      <Loader className="animate-spin mr-2" size={24} />
                      <span>Processing payment...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader className="animate-spin mx-auto mb-2" size={32} />
                  <p>Initializing PayPal...</p>
                </div>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-gray-50 p-4 rounded text-sm text-gray-600">
            <div className="flex items-start mb-2">
              <Lock size={16} className="mr-2 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Secure Payment</p>
                <p>
                  Your payment information is encrypted and secure. We never store your
                  card details on our servers.
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs">
              <p>✓ PCI DSS Compliant</p>
              <p>✓ 256-bit SSL Encryption</p>
              <p>✓ Verified by Visa & Mastercard SecureCode</p>
            </div>
          </div>
        </>
      )}

      {/* Success Actions */}
      {success && onPaymentComplete && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">
            A confirmation email has been sent to your registered email address.
          </p>
          <button
            onClick={() => window.location.href = '/bookings'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View My Bookings
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentForm;
