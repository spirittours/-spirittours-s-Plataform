/**
 * Stripe Payment Service
 * Integration with Stripe payment processing
 */

import apiClient from './apiClient';
import {
  Payment,
  PaymentIntent,
  SavedPaymentMethod,
  PaymentFormData,
  PaymentStatus,
  PaymentProvider,
  StripePaymentIntentResult,
} from '../types/payment.types';

// ============================================================================
// Service Configuration
// ============================================================================

const API_BASE = '/api/payments/stripe';

// Stripe publishable key (from environment)
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';

// ============================================================================
// Stripe Service Class
// ============================================================================

class StripeService {
  private stripeInstance: any = null;

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize Stripe.js
   */
  async initializeStripe(): Promise<any> {
    if (this.stripeInstance) {
      return this.stripeInstance;
    }

    // Check if Stripe is loaded
    if (typeof window === 'undefined' || !(window as any).Stripe) {
      throw new Error('Stripe.js not loaded. Please include the Stripe.js script.');
    }

    // Initialize Stripe
    this.stripeInstance = (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
    return this.stripeInstance;
  }

  /**
   * Get Stripe instance
   */
  getStripe(): any {
    if (!this.stripeInstance) {
      throw new Error('Stripe not initialized. Call initializeStripe() first.');
    }
    return this.stripeInstance;
  }

  // ==========================================================================
  // Payment Intent Operations
  // ==========================================================================

  /**
   * Create payment intent
   */
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentIntent> {
    const response = await apiClient.post<PaymentIntent>(`${API_BASE}/payment-intents`, data);
    return response.data;
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    const response = await apiClient.get<PaymentIntent>(
      `${API_BASE}/payment-intents/${paymentIntentId}`
    );
    return response.data;
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<StripePaymentIntentResult> {
    const response = await apiClient.post<StripePaymentIntentResult>(
      `${API_BASE}/payment-intents/${paymentIntentId}/confirm`,
      { paymentMethodId }
    );
    return response.data;
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    await apiClient.post(`${API_BASE}/payment-intents/${paymentIntentId}/cancel`);
  }

  // ==========================================================================
  // Payment Processing
  // ==========================================================================

  /**
   * Process card payment
   */
  async processCardPayment(data: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId: string;
    cardElement: any; // Stripe CardElement
    billingDetails: {
      name: string;
      email: string;
      address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
    };
    savePaymentMethod?: boolean;
  }): Promise<Payment> {
    // Create payment intent
    const paymentIntent = await this.createPaymentIntent({
      amount: data.amount,
      currency: data.currency,
      bookingId: data.bookingId,
      customerId: data.customerId,
      metadata: {
        savePaymentMethod: data.savePaymentMethod,
      },
    });

    // Confirm payment with Stripe
    const stripe = this.getStripe();
    const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
      paymentIntent.clientSecret,
      {
        payment_method: {
          card: data.cardElement,
          billing_details: data.billingDetails,
        },
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    // Get the completed payment from backend
    const response = await apiClient.get<Payment>(
      `${API_BASE}/payments/${confirmedIntent.id}`
    );
    return response.data;
  }

  /**
   * Process payment with saved payment method
   */
  async processPaymentWithSavedMethod(data: {
    amount: number;
    currency: string;
    bookingId: string;
    customerId: string;
    paymentMethodId: string;
  }): Promise<Payment> {
    const response = await apiClient.post<Payment>(`${API_BASE}/charge`, data);
    return response.data;
  }

  // ==========================================================================
  // Payment Methods Management
  // ==========================================================================

  /**
   * Create payment method
   */
  async createPaymentMethod(data: {
    cardElement: any; // Stripe CardElement
    billingDetails: {
      name: string;
      email: string;
      address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
    };
  }): Promise<any> {
    const stripe = this.getStripe();
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: data.cardElement,
      billing_details: data.billingDetails,
    });

    if (error) {
      throw new Error(error.message);
    }

    return paymentMethod;
  }

  /**
   * Save payment method for customer
   */
  async savePaymentMethod(
    customerId: string,
    paymentMethodId: string,
    isDefault: boolean = false
  ): Promise<SavedPaymentMethod> {
    const response = await apiClient.post<SavedPaymentMethod>(
      `${API_BASE}/customers/${customerId}/payment-methods`,
      {
        paymentMethodId,
        isDefault,
      }
    );
    return response.data;
  }

  /**
   * Get customer's saved payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<SavedPaymentMethod[]> {
    const response = await apiClient.get<SavedPaymentMethod[]>(
      `${API_BASE}/customers/${customerId}/payment-methods`
    );
    return response.data;
  }

  /**
   * Delete saved payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/payment-methods/${paymentMethodId}`);
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<SavedPaymentMethod> {
    const response = await apiClient.put<SavedPaymentMethod>(
      `${API_BASE}/customers/${customerId}/payment-methods/${paymentMethodId}/default`
    );
    return response.data;
  }

  // ==========================================================================
  // Customer Management
  // ==========================================================================

  /**
   * Create Stripe customer
   */
  async createCustomer(data: {
    email: string;
    name?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    metadata?: Record<string, any>;
  }): Promise<{ id: string }> {
    const response = await apiClient.post<{ id: string }>(`${API_BASE}/customers`, data);
    return response.data;
  }

  /**
   * Get Stripe customer
   */
  async getCustomer(stripeCustomerId: string): Promise<any> {
    const response = await apiClient.get(`${API_BASE}/customers/${stripeCustomerId}`);
    return response.data;
  }

  /**
   * Update Stripe customer
   */
  async updateCustomer(
    stripeCustomerId: string,
    data: {
      email?: string;
      name?: string;
      phone?: string;
      address?: any;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    const response = await apiClient.put(
      `${API_BASE}/customers/${stripeCustomerId}`,
      data
    );
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
    reason?: string;
    metadata?: Record<string, any>;
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
  // Webhooks
  // ==========================================================================

  /**
   * Verify webhook signature (backend only)
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>(
        `${API_BASE}/webhooks/verify`,
        { payload, signature }
      );
      return response.data.valid;
    } catch (err) {
      return false;
    }
  }

  // ==========================================================================
  // Payment Validation
  // ==========================================================================

  /**
   * Validate card number
   */
  validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Check if only digits
    if (!/^\d+$/.test(cleaned)) {
      return false;
    }

    // Check length (13-19 digits)
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate CVV
   */
  validateCVV(cvv: string, cardBrand?: string): boolean {
    // Remove non-digits
    const cleaned = cvv.replace(/\D/g, '');

    // AMEX requires 4 digits, others require 3
    if (cardBrand === 'amex') {
      return cleaned.length === 4;
    }

    return cleaned.length === 3;
  }

  /**
   * Validate expiry date
   */
  validateExpiryDate(month: number, year: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Check valid month
    if (month < 1 || month > 12) {
      return false;
    }

    // Check not expired
    if (year < currentYear) {
      return false;
    }

    if (year === currentYear && month < currentMonth) {
      return false;
    }

    return true;
  }

  /**
   * Get card brand from number
   */
  getCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/[\s-]/g, '');

    // Visa
    if (/^4/.test(cleaned)) {
      return 'visa';
    }

    // Mastercard
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(cleaned)) {
      return 'mastercard';
    }

    // American Express
    if (/^3[47]/.test(cleaned)) {
      return 'amex';
    }

    // Discover
    if (/^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5])|64[4-9]|65)/.test(cleaned)) {
      return 'discover';
    }

    // Diners Club
    if (/^3(?:0[0-5]|[68])/.test(cleaned)) {
      return 'diners';
    }

    // JCB
    if (/^35(2[89]|[3-8])/.test(cleaned)) {
      return 'jcb';
    }

    return 'unknown';
  }

  /**
   * Format card number for display
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    const brand = this.getCardBrand(cleaned);

    if (brand === 'amex') {
      // AMEX format: 1234 123456 12345
      return cleaned.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    }

    // Default format: 1234 1234 1234 1234
    return cleaned.replace(/(\d{4})/g, '$1 ').trim();
  }

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  /**
   * Convert amount to Stripe format (cents)
   */
  convertToStripeAmount(amount: number, currency: string): number {
    // Zero-decimal currencies (e.g., JPY, KRW)
    const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }

    // Most currencies use cents (2 decimal places)
    return Math.round(amount * 100);
  }

  /**
   * Convert from Stripe format (cents) to decimal
   */
  convertFromStripeAmount(amount: number, currency: string): number {
    const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return amount;
    }

    return amount / 100;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

const stripeService = new StripeService();
export default stripeService;
