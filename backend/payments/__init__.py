"""
Payment Gateway Integration System

Comprehensive payment processing with multiple providers:
- Stripe: Credit/debit cards, digital wallets
- PayPal: PayPal accounts, credit cards via PayPal
- Unified payment interface
- Webhook handling
- Refund management
- Payment tracking
"""

from .payment_service import PaymentService, PaymentProvider
from .stripe.stripe_service import StripeService
from .paypal.paypal_service import PayPalService

__all__ = [
    'PaymentService',
    'PaymentProvider',
    'StripeService',
    'PayPalService',
]
