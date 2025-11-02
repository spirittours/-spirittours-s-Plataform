/**
 * PayPal Payment Service
 * Integration with PayPal payment processing
 */

import apiClient from './apiClient';
import {
  Payment,
  PayPalOrder,
  PayPalCapture,
} from '../types/payment.types';

// ============================================================================
// Service Configuration
// ============================================================================

const API_BASE = '/api/payments/paypal';

// PayPal client ID (from environment)
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || '';
const PAYPAL_MODE = (process.env.REACT_APP_PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live';

// ============================================================================
// PayPal Service Class
// ============================================================================

class PayPalService {
  private paypalInstance: any = null;
  private isScriptLoaded: boolean = false;

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Load PayPal SDK script
   */
  async loadPayPalScript(): Promise<void> {
    if (this.isScriptLoaded) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if ((window as any).paypal) {
        this.isScriptLoaded = true;
        this.paypalInstance = (window as any).paypal;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
      script.async = true;

      script.onload = () => {
        this.isScriptLoaded = true;
        this.paypalInstance = (window as any).paypal;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load PayPal SDK'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Get PayPal instance
   */
  getPayPal(): any {
    if (!this.paypalInstance) {
      throw new Error('PayPal SDK not loaded. Call loadPayPalScript() first.');
    }
    return this.paypalInstance;
  }

  // ==========================================================================
  // Order Operations
  // ==========================================================================

  /**
   * Create PayPal order
   */
  async createOrder(data: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ orderId: string }> {
    const response = await apiClient.post<{ orderId: string }>(`${API_BASE}/orders`, data);
    return response.data;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<PayPalOrder> {
    const response = await apiClient.get<PayPalOrder>(`${API_BASE}/orders/${orderId}`);
    return response.data;
  }

  /**
   * Capture order payment
   */
  async captureOrder(orderId: string): Promise<PayPalCapture> {
    const response = await apiClient.post<PayPalCapture>(
      `${API_BASE}/orders/${orderId}/capture`
    );
    return response.data;
  }

  // ==========================================================================
  // Payment Processing
  // ==========================================================================

  /**
   * Process PayPal payment
   */
  async processPayment(data: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId: string;
    description?: string;
  }): Promise<Payment> {
    // Create order first
    const { orderId } = await this.createOrder(data);

    // Return order ID for client-side approval
    // The actual capture happens after user approves in PayPal popup
    return {
      id: orderId,
      status: 'pending_approval',
    } as any;
  }

  /**
   * Complete payment after approval
   */
  async completePayment(orderId: string): Promise<Payment> {
    // Capture the payment
    await this.captureOrder(orderId);

    // Get the completed payment from backend
    const response = await apiClient.get<Payment>(`${API_BASE}/payments/${orderId}`);
    return response.data;
  }

  // ==========================================================================
  // Refunds
  // ==========================================================================

  /**
   * Create refund
   */
  async createRefund(data: {
    paymentId: string;
    amount?: number; // If not provided, full refund
    note?: string;
  }): Promise<any> {
    const response = await apiClient.post(`${API_BASE}/refunds`, data);
    return response.data;
  }

  /**
   * Get refund details
   */
  async getRefund(refundId: string): Promise<any> {
    const response = await apiClient.get(`${API_BASE}/refunds/${refundId}`);
    return response.data;
  }

  // ==========================================================================
  // Payment Verification
  // ==========================================================================

  /**
   * Verify payment
   */
  async verifyPayment(orderId: string): Promise<{
    isValid: boolean;
    status: string;
    amount: number;
    currency: string;
  }> {
    const response = await apiClient.get<{
      isValid: boolean;
      status: string;
      amount: number;
      currency: string;
    }>(`${API_BASE}/verify/${orderId}`);
    return response.data;
  }

  // ==========================================================================
  // PayPal Buttons Integration
  // ==========================================================================

  /**
   * Render PayPal buttons
   */
  async renderPayPalButtons(
    containerId: string,
    options: {
      amount: number;
      currency: string;
      bookingId: string;
      customerId: string;
      description?: string;
      onSuccess?: (payment: Payment) => void;
      onError?: (error: Error) => void;
      onCancel?: () => void;
    }
  ): Promise<void> {
    await this.loadPayPalScript();
    const paypal = this.getPayPal();

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element #${containerId} not found`);
    }

    // Clear existing buttons
    container.innerHTML = '';

    // Render buttons
    paypal
      .Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
        },

        // Create order
        createOrder: async () => {
          try {
            const { orderId } = await this.createOrder({
              amount: options.amount,
              currency: options.currency,
              bookingId: options.bookingId,
              customerId: options.customerId,
              description: options.description,
            });
            return orderId;
          } catch (error: any) {
            console.error('Error creating PayPal order:', error);
            if (options.onError) {
              options.onError(error);
            }
            throw error;
          }
        },

        // On approval
        onApprove: async (data: any) => {
          try {
            const payment = await this.completePayment(data.orderID);
            if (options.onSuccess) {
              options.onSuccess(payment);
            }
          } catch (error: any) {
            console.error('Error completing payment:', error);
            if (options.onError) {
              options.onError(error);
            }
          }
        },

        // On cancel
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel();
          }
        },

        // On error
        onError: (error: Error) => {
          console.error('PayPal button error:', error);
          if (options.onError) {
            options.onError(error);
          }
        },
      })
      .render(`#${containerId}`);
  }

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  /**
   * Verify webhook signature (backend only)
   */
  async verifyWebhookSignature(
    webhookId: string,
    headers: Record<string, string>,
    body: any
  ): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>(
        `${API_BASE}/webhooks/verify`,
        {
          webhookId,
          headers,
          body,
        }
      );
      return response.data.valid;
    } catch (err) {
      return false;
    }
  }

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Format amount for PayPal
   */
  formatAmountForPayPal(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Parse PayPal amount to number
   */
  parsePayPalAmount(amount: string): number {
    return parseFloat(amount);
  }

  /**
   * Get PayPal environment URL
   */
  getEnvironmentUrl(): string {
    return PAYPAL_MODE === 'live'
      ? 'https://www.paypal.com'
      : 'https://www.sandbox.paypal.com';
  }

  /**
   * Get PayPal API URL
   */
  getApiUrl(): string {
    return PAYPAL_MODE === 'live'
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
  }

  /**
   * Validate PayPal email
   */
  validatePayPalEmail(email: string): boolean {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format payment for display
   */
  formatPayment(payment: any): string {
    const amount = payment.purchase_units?.[0]?.amount;
    if (!amount) return 'N/A';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: amount.currency_code || 'USD',
    }).format(parseFloat(amount.value));
  }

  /**
   * Get payment status display
   */
  getStatusDisplay(status: string): {
    label: string;
    color: 'success' | 'warning' | 'error' | 'info' | 'default';
  } {
    const statusMap: Record<string, { label: string; color: any }> = {
      CREATED: { label: 'Created', color: 'info' },
      SAVED: { label: 'Saved', color: 'info' },
      APPROVED: { label: 'Approved', color: 'success' },
      VOIDED: { label: 'Voided', color: 'default' },
      COMPLETED: { label: 'Completed', color: 'success' },
      PAYER_ACTION_REQUIRED: { label: 'Action Required', color: 'warning' },
    };

    return statusMap[status] || { label: status, color: 'default' };
  }

  /**
   * Check if payment is successful
   */
  isPaymentSuccessful(status: string): boolean {
    return status === 'COMPLETED' || status === 'APPROVED';
  }

  /**
   * Check if payment is pending
   */
  isPaymentPending(status: string): boolean {
    return status === 'CREATED' || status === 'SAVED' || status === 'PAYER_ACTION_REQUIRED';
  }

  /**
   * Check if payment is failed
   */
  isPaymentFailed(status: string): boolean {
    return status === 'VOIDED' || status === 'FAILED';
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

const paypalService = new PayPalService();
export default paypalService;
