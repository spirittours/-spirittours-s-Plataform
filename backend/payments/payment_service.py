"""
Unified Payment Service

Provides a unified interface for multiple payment providers.
"""

import logging
from enum import Enum
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class PaymentProvider(str, Enum):
    """Supported payment providers"""
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"


class PaymentStatus(str, Enum):
    """Payment status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentMethod(str, Enum):
    """Payment methods"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL_ACCOUNT = "paypal_account"
    BANK_ACCOUNT = "bank_account"
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"


class Currency(str, Enum):
    """Supported currencies"""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    ILS = "ILS"  # Israeli Shekel
    JPY = "JPY"


class PaymentRequest(BaseModel):
    """Payment request model"""
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: Currency = Currency.USD
    provider: PaymentProvider
    payment_method: PaymentMethod
    description: str = Field(..., min_length=1, max_length=500)
    booking_id: Optional[str] = None
    customer_id: str
    customer_email: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None


class PaymentResponse(BaseModel):
    """Payment response model"""
    payment_id: str
    provider: PaymentProvider
    status: PaymentStatus
    amount: Decimal
    currency: Currency
    provider_payment_id: Optional[str] = None
    checkout_url: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RefundRequest(BaseModel):
    """Refund request model"""
    payment_id: str
    amount: Optional[Decimal] = None  # None for full refund
    reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RefundResponse(BaseModel):
    """Refund response model"""
    refund_id: str
    payment_id: str
    status: str
    amount: Decimal
    currency: Currency
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentService:
    """
    Unified payment service handling multiple providers.
    
    Features:
    - Multi-provider support (Stripe, PayPal)
    - Unified payment interface
    - Automatic provider selection
    - Webhook handling
    - Refund management
    - Payment tracking
    """
    
    def __init__(
        self,
        stripe_service=None,
        paypal_service=None
    ):
        self.stripe_service = stripe_service
        self.paypal_service = paypal_service
        self.logger = logging.getLogger(__name__)
        
        # Payment history (in production, use database)
        self.payments: Dict[str, PaymentResponse] = {}
        
    def get_provider_service(self, provider: PaymentProvider):
        """Get service for specific provider"""
        if provider == PaymentProvider.STRIPE:
            return self.stripe_service
        elif provider == PaymentProvider.PAYPAL:
            return self.paypal_service
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    async def create_payment(
        self,
        request: PaymentRequest
    ) -> PaymentResponse:
        """
        Create a payment with the specified provider.
        
        Args:
            request: Payment request
            
        Returns:
            PaymentResponse with payment details
        """
        self.logger.info(
            f"Creating payment: {request.amount} {request.currency} via {request.provider}"
        )
        
        try:
            # Get provider service
            provider_service = self.get_provider_service(request.provider)
            
            if not provider_service:
                raise ValueError(f"Provider {request.provider} not configured")
            
            # Create payment with provider
            response = await provider_service.create_payment(request)
            
            # Store payment
            self.payments[response.payment_id] = response
            
            self.logger.info(
                f"Payment created: {response.payment_id} - Status: {response.status}"
            )
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error creating payment: {str(e)}")
            
            # Return error response
            import uuid
            return PaymentResponse(
                payment_id=str(uuid.uuid4()),
                provider=request.provider,
                status=PaymentStatus.FAILED,
                amount=request.amount,
                currency=request.currency,
                error=str(e)
            )
    
    async def get_payment(
        self,
        payment_id: str
    ) -> Optional[PaymentResponse]:
        """
        Get payment by ID.
        
        Args:
            payment_id: Payment ID
            
        Returns:
            PaymentResponse or None
        """
        return self.payments.get(payment_id)
    
    async def confirm_payment(
        self,
        payment_id: str,
        provider_payment_id: str
    ) -> PaymentResponse:
        """
        Confirm a payment after provider processing.
        
        Args:
            payment_id: Internal payment ID
            provider_payment_id: Provider's payment ID
            
        Returns:
            Updated PaymentResponse
        """
        payment = await self.get_payment(payment_id)
        
        if not payment:
            raise ValueError(f"Payment not found: {payment_id}")
        
        # Get provider service
        provider_service = self.get_provider_service(payment.provider)
        
        # Confirm with provider
        updated_payment = await provider_service.confirm_payment(
            payment_id,
            provider_payment_id
        )
        
        # Update stored payment
        self.payments[payment_id] = updated_payment
        
        self.logger.info(f"Payment confirmed: {payment_id}")
        
        return updated_payment
    
    async def refund_payment(
        self,
        request: RefundRequest
    ) -> RefundResponse:
        """
        Refund a payment (full or partial).
        
        Args:
            request: Refund request
            
        Returns:
            RefundResponse
        """
        payment = await self.get_payment(request.payment_id)
        
        if not payment:
            raise ValueError(f"Payment not found: {request.payment_id}")
        
        if payment.status != PaymentStatus.COMPLETED:
            raise ValueError(f"Cannot refund payment with status: {payment.status}")
        
        # Get provider service
        provider_service = self.get_provider_service(payment.provider)
        
        # Process refund
        refund = await provider_service.refund_payment(request)
        
        # Update payment status
        if request.amount is None or request.amount >= payment.amount:
            payment.status = PaymentStatus.REFUNDED
        else:
            payment.status = PaymentStatus.PARTIALLY_REFUNDED
        
        self.payments[request.payment_id] = payment
        
        self.logger.info(
            f"Refund processed: {refund.refund_id} for payment {request.payment_id}"
        )
        
        return refund
    
    async def cancel_payment(
        self,
        payment_id: str
    ) -> PaymentResponse:
        """
        Cancel a pending payment.
        
        Args:
            payment_id: Payment ID
            
        Returns:
            Updated PaymentResponse
        """
        payment = await self.get_payment(payment_id)
        
        if not payment:
            raise ValueError(f"Payment not found: {payment_id}")
        
        if payment.status not in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]:
            raise ValueError(f"Cannot cancel payment with status: {payment.status}")
        
        # Get provider service
        provider_service = self.get_provider_service(payment.provider)
        
        # Cancel with provider
        updated_payment = await provider_service.cancel_payment(payment_id)
        
        # Update stored payment
        self.payments[payment_id] = updated_payment
        
        self.logger.info(f"Payment cancelled: {payment_id}")
        
        return updated_payment
    
    async def handle_webhook(
        self,
        provider: PaymentProvider,
        payload: Dict[str, Any],
        signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle webhook from payment provider.
        
        Args:
            provider: Payment provider
            payload: Webhook payload
            signature: Webhook signature for verification
            
        Returns:
            Webhook processing result
        """
        self.logger.info(f"Handling webhook from {provider}")
        
        try:
            provider_service = self.get_provider_service(provider)
            
            # Verify and process webhook
            result = await provider_service.handle_webhook(payload, signature)
            
            self.logger.info(f"Webhook processed: {result.get('event_type')}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error handling webhook: {str(e)}")
            raise
    
    def get_supported_providers(self) -> List[PaymentProvider]:
        """Get list of configured providers"""
        providers = []
        
        if self.stripe_service:
            providers.append(PaymentProvider.STRIPE)
        if self.paypal_service:
            providers.append(PaymentProvider.PAYPAL)
        
        return providers
    
    def get_payment_statistics(self) -> Dict[str, Any]:
        """Get payment statistics"""
        stats = {
            'total_payments': len(self.payments),
            'by_status': {},
            'by_provider': {},
            'total_amount': Decimal('0'),
        }
        
        for payment in self.payments.values():
            # By status
            status = payment.status.value
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            
            # By provider
            provider = payment.provider.value
            stats['by_provider'][provider] = stats['by_provider'].get(provider, 0) + 1
            
            # Total amount (completed only)
            if payment.status == PaymentStatus.COMPLETED:
                stats['total_amount'] += payment.amount
        
        return stats
