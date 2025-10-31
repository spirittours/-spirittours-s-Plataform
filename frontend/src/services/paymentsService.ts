/**
 * Payments Service
 * Service layer for Stripe, PayPal, and payment management
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  payment_method: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  description: string;
  created_at: string;
  receipt_url?: string;
}

class PaymentsService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/v1/payments`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ============== STRIPE ==============

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(amount: number, currency: string = 'eur', metadata?: any) {
    try {
      const response = await this.api.post('/stripe/create-intent', {
        amount,
        currency,
        metadata,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm Stripe payment
   */
  async confirmStripePayment(paymentIntentId: string, paymentMethodId: string) {
    try {
      const response = await this.api.post('/stripe/confirm-payment', {
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error confirming Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Get Stripe publishable key
   */
  async getStripePublishableKey() {
    try {
      const response = await this.api.get('/stripe/public-key');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Stripe key:', error);
      throw error;
    }
  }

  /**
   * Create Stripe setup intent (for saving cards)
   */
  async createStripeSetupIntent() {
    try {
      const response = await this.api.post('/stripe/setup-intent');
      return response.data;
    } catch (error: any) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  // ============== PAYPAL ==============

  /**
   * Create PayPal order
   */
  async createPayPalOrder(amount: number, currency: string = 'EUR') {
    try {
      const response = await this.api.post('/paypal/create-order', {
        amount,
        currency,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating PayPal order:', error);
      throw error;
    }
  }

  /**
   * Capture PayPal order
   */
  async capturePayPalOrder(orderId: string) {
    try {
      const response = await this.api.post('/paypal/capture-order', {
        order_id: orderId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error capturing PayPal order:', error);
      throw error;
    }
  }

  /**
   * Get PayPal client ID
   */
  async getPayPalClientId() {
    try {
      const response = await this.api.get('/paypal/client-id');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching PayPal client ID:', error);
      throw error;
    }
  }

  // ============== PAYMENT METHODS ==============

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(customerId?: string) {
    try {
      const params = customerId ? { customer_id: customerId } : {};
      const response = await this.api.get('/methods', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Add new payment method
   */
  async addPaymentMethod(paymentMethodData: any) {
    try {
      const response = await this.api.post('/methods', paymentMethodData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string) {
    try {
      const response = await this.api.put(`/methods/${paymentMethodId}/set-default`);
      return response.data;
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string) {
    try {
      const response = await this.api.delete(`/methods/${paymentMethodId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  // ============== TRANSACTIONS ==============

  /**
   * Get transaction history
   */
  async getTransactions(filters?: any) {
    try {
      const response = await this.api.get('/transactions', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string) {
    try {
      const response = await this.api.get(`/transactions/${transactionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Download receipt
   */
  async downloadReceipt(transactionId: string) {
    try {
      const response = await this.api.get(`/transactions/${transactionId}/receipt`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  }

  // ============== REFUNDS ==============

  /**
   * Request refund
   */
  async requestRefund(transactionId: string, amount?: number, reason?: string) {
    try {
      const response = await this.api.post(`/transactions/${transactionId}/refund`, {
        amount,
        reason,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      throw error;
    }
  }

  /**
   * Get refund status
   */
  async getRefundStatus(refundId: string) {
    try {
      const response = await this.api.get(`/refunds/${refundId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching refund status:', error);
      throw error;
    }
  }

  // ============== PAYMENT PROCESSING ==============

  /**
   * Process payment with selected method
   */
  async processPayment(paymentData: {
    amount: number;
    currency: string;
    payment_method: 'stripe' | 'paypal';
    payment_method_id?: string;
    booking_id?: string;
    description?: string;
  }) {
    try {
      const response = await this.api.post('/process', paymentData);
      return response.data;
    } catch (error: any) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: string) {
    try {
      const response = await this.api.get(`/verify/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentsService = new PaymentsService();
export default paymentsService;
