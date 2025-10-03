"""
Advanced Payment Service for Enterprise Booking Platform
Supports Stripe, PayPal, and other payment providers with multi-currency support
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any
from enum import Enum
from dataclasses import dataclass
import json
import uuid
from decimal import Decimal
import aiohttp
import stripe
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Numeric, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field, validator
import hashlib
import hmac
import os

# Configure logging
logger = logging.getLogger(__name__)

Base = declarative_base()

class PaymentProvider(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    SQUARE = "square"
    RAZORPAY = "razorpay"
    ADYEN = "adyen"
    BRAINTREE = "braintree"

class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    DIGITAL_WALLET = "digital_wallet"
    CRYPTO = "crypto"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    DISPUTED = "disputed"
    EXPIRED = "expired"

class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    AUD = "AUD"
    CAD = "CAD"
    CHF = "CHF"
    CNY = "CNY"
    INR = "INR"
    BRL = "BRL"
    MXN = "MXN"
    KRW = "KRW"

class RefundReason(str, Enum):
    DUPLICATE = "duplicate"
    FRAUDULENT = "fraudulent"
    REQUESTED_BY_CUSTOMER = "requested_by_customer"
    EXPIRED_UNCAPTURED_CHARGE = "expired_uncaptured_charge"
    PROCESSING_ERROR = "processing_error"

# Database Models
class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(100), unique=True, index=True)
    booking_id = Column(String(100), index=True)
    customer_id = Column(String(100), index=True)
    
    # Payment details
    provider = Column(SQLEnum(PaymentProvider), nullable=False)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Provider specific data
    provider_transaction_id = Column(String(200))
    provider_payment_intent_id = Column(String(200))
    provider_charge_id = Column(String(200))
    provider_response = Column(JSON)
    
    # Customer information
    customer_email = Column(String(255))
    customer_name = Column(String(255))
    billing_address = Column(JSON)
    
    # Card information (last 4 digits, brand)
    card_last4 = Column(String(4))
    card_brand = Column(String(20))
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)
    
    # Fee and commission
    processing_fee = Column(Numeric(10, 2))
    commission_amount = Column(Numeric(10, 2))
    net_amount = Column(Numeric(10, 2))
    
    # Timestamps
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    failed_at = Column(DateTime)
    
    # Metadata
    metadata = Column(JSON)
    notes = Column(Text)
    
    # Webhook verification
    webhook_verified = Column(Boolean, default=False)
    webhook_signature = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PaymentRefund(Base):
    __tablename__ = "payment_refunds"
    
    id = Column(Integer, primary_key=True, index=True)
    refund_id = Column(String(100), unique=True, index=True)
    transaction_id = Column(String(100), nullable=False)
    
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False)
    reason = Column(SQLEnum(RefundReason), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    provider_refund_id = Column(String(200))
    provider_response = Column(JSON)
    
    requested_by = Column(String(100))
    approved_by = Column(String(100))
    
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class PaymentMethod_DB(Base):
    __tablename__ = "payment_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    method_id = Column(String(100), unique=True, index=True)
    customer_id = Column(String(100), nullable=False, index=True)
    
    provider = Column(SQLEnum(PaymentProvider), nullable=False)
    type = Column(SQLEnum(PaymentMethod), nullable=False)
    
    # Provider method ID
    provider_method_id = Column(String(200))
    
    # Card details (tokenized)
    card_last4 = Column(String(4))
    card_brand = Column(String(20))
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)
    
    # Bank account details (tokenized)
    bank_name = Column(String(100))
    account_last4 = Column(String(4))
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Configuration
@dataclass
class PaymentConfig:
    """Payment service configuration"""
    
    # Stripe Configuration
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    
    # PayPal Configuration
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    paypal_environment: str = "sandbox"  # sandbox or live
    
    # Square Configuration
    square_access_token: str = ""
    square_application_id: str = ""
    square_webhook_signature_key: str = ""
    square_environment: str = "sandbox"  # sandbox or production
    
    # General settings
    default_currency: Currency = Currency.USD
    supported_currencies: List[Currency] = None
    enable_webhooks: bool = True
    webhook_tolerance_seconds: int = 300
    auto_capture: bool = True
    
    # Fee configuration
    processing_fee_percentage: Decimal = Decimal("2.9")
    processing_fee_fixed: Decimal = Decimal("0.30")
    commission_percentage: Decimal = Decimal("5.0")
    
    def __post_init__(self):
        if self.supported_currencies is None:
            self.supported_currencies = [
                Currency.USD, Currency.EUR, Currency.GBP, 
                Currency.CAD, Currency.AUD, Currency.JPY
            ]

# Pydantic Models
class PaymentRequest(BaseModel):
    booking_id: str
    customer_id: str
    customer_email: str
    customer_name: str
    
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: Currency = Currency.USD
    
    payment_method_id: Optional[str] = None
    save_payment_method: bool = False
    
    billing_address: Optional[Dict[str, str]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return round(v, 2)

class PaymentIntentRequest(BaseModel):
    booking_id: str
    customer_id: str
    amount: Decimal
    currency: Currency = Currency.USD
    payment_method_types: List[str] = Field(default=["card"])
    
    capture_method: str = "automatic"  # automatic or manual
    confirmation_method: str = "automatic"  # automatic or manual
    
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RefundRequest(BaseModel):
    transaction_id: str
    amount: Optional[Decimal] = None  # Full refund if not specified
    reason: RefundReason = RefundReason.REQUESTED_BY_CUSTOMER
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    success: bool
    transaction_id: Optional[str] = None
    status: PaymentStatus
    amount: Optional[Decimal] = None
    currency: Optional[Currency] = None
    
    # Provider specific data
    provider_transaction_id: Optional[str] = None
    client_secret: Optional[str] = None
    
    # Error information
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    # Additional data
    metadata: Dict[str, Any] = Field(default_factory=dict)

class StripeProvider:
    """Stripe payment provider implementation"""
    
    def __init__(self, config: PaymentConfig):
        self.config = config
        stripe.api_key = config.stripe_secret_key
    
    async def create_payment_intent(self, request: PaymentIntentRequest) -> Dict[str, Any]:
        """Create a Stripe PaymentIntent"""
        try:
            # Convert amount to cents
            amount_cents = int(request.amount * 100)
            
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=request.currency.lower(),
                payment_method_types=request.payment_method_types,
                capture_method=request.capture_method,
                confirmation_method=request.confirmation_method,
                metadata={
                    "booking_id": request.booking_id,
                    "customer_id": request.customer_id,
                    **request.metadata
                }
            )
            
            return {
                "success": True,
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe PaymentIntent creation failed: {str(e)}")
            return {
                "success": False,
                "error_code": e.code if hasattr(e, 'code') else "stripe_error",
                "error_message": str(e)
            }
    
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process payment through Stripe"""
        try:
            # Create PaymentIntent
            intent_request = PaymentIntentRequest(
                booking_id=request.booking_id,
                customer_id=request.customer_id,
                amount=request.amount,
                currency=request.currency,
                metadata=request.metadata
            )
            
            intent_result = await self.create_payment_intent(intent_request)
            
            if not intent_result["success"]:
                return PaymentResponse(
                    success=False,
                    status=PaymentStatus.FAILED,
                    error_code=intent_result.get("error_code"),
                    error_message=intent_result.get("error_message")
                )
            
            # If payment method ID is provided, confirm the payment
            if request.payment_method_id:
                try:
                    intent = stripe.PaymentIntent.confirm(
                        intent_result["payment_intent_id"],
                        payment_method=request.payment_method_id,
                        return_url=request.return_url
                    )
                    
                    return PaymentResponse(
                        success=True,
                        transaction_id=str(uuid.uuid4()),
                        provider_transaction_id=intent.id,
                        status=self._map_stripe_status(intent.status),
                        amount=request.amount,
                        currency=request.currency,
                        client_secret=intent.client_secret
                    )
                    
                except stripe.error.StripeError as e:
                    return PaymentResponse(
                        success=False,
                        status=PaymentStatus.FAILED,
                        error_code=e.code if hasattr(e, 'code') else "stripe_error",
                        error_message=str(e)
                    )
            
            # Return PaymentIntent for client-side confirmation
            return PaymentResponse(
                success=True,
                transaction_id=str(uuid.uuid4()),
                provider_transaction_id=intent_result["payment_intent_id"],
                status=PaymentStatus.PENDING,
                amount=request.amount,
                currency=request.currency,
                client_secret=intent_result["client_secret"]
            )
            
        except Exception as e:
            logger.error(f"Stripe payment processing failed: {str(e)}")
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )
    
    async def process_refund(self, transaction_id: str, amount: Optional[Decimal] = None) -> Dict[str, Any]:
        """Process refund through Stripe"""
        try:
            refund_data = {"charge": transaction_id}
            
            if amount:
                refund_data["amount"] = int(amount * 100)  # Convert to cents
            
            refund = stripe.Refund.create(**refund_data)
            
            return {
                "success": True,
                "refund_id": refund.id,
                "status": refund.status,
                "amount": Decimal(refund.amount) / 100
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund failed: {str(e)}")
            return {
                "success": False,
                "error_code": e.code if hasattr(e, 'code') else "stripe_error",
                "error_message": str(e)
            }
    
    def _map_stripe_status(self, stripe_status: str) -> PaymentStatus:
        """Map Stripe status to our PaymentStatus"""
        mapping = {
            "requires_payment_method": PaymentStatus.PENDING,
            "requires_confirmation": PaymentStatus.PENDING,
            "requires_action": PaymentStatus.PENDING,
            "processing": PaymentStatus.PROCESSING,
            "requires_capture": PaymentStatus.PROCESSING,
            "succeeded": PaymentStatus.SUCCEEDED,
            "canceled": PaymentStatus.CANCELLED
        }
        return mapping.get(stripe_status, PaymentStatus.FAILED)

class PayPalProvider:
    """PayPal payment provider implementation"""
    
    def __init__(self, config: PaymentConfig):
        self.config = config
        self.base_url = ("https://api.paypal.com" if config.paypal_environment == "live" 
                        else "https://api.sandbox.paypal.com")
    
    async def get_access_token(self) -> Optional[str]:
        """Get PayPal access token"""
        try:
            auth = aiohttp.BasicAuth(self.config.paypal_client_id, self.config.paypal_client_secret)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/v1/oauth2/token",
                    auth=auth,
                    data="grant_type=client_credentials",
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("access_token")
                    
        except Exception as e:
            logger.error(f"PayPal access token retrieval failed: {str(e)}")
        
        return None
    
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process payment through PayPal"""
        try:
            access_token = await self.get_access_token()
            if not access_token:
                return PaymentResponse(
                    success=False,
                    status=PaymentStatus.FAILED,
                    error_message="Failed to get PayPal access token"
                )
            
            # Create PayPal order
            order_data = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": request.currency.value,
                        "value": str(request.amount)
                    },
                    "reference_id": request.booking_id
                }],
                "payment_source": {
                    "paypal": {
                        "experience_context": {
                            "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
                            "brand_name": "Travel Booking Platform",
                            "locale": "en-US",
                            "landing_page": "LOGIN",
                            "user_action": "PAY_NOW"
                        }
                    }
                }
            }
            
            if request.return_url:
                order_data["payment_source"]["paypal"]["experience_context"]["return_url"] = request.return_url
            
            if request.cancel_url:
                order_data["payment_source"]["paypal"]["experience_context"]["cancel_url"] = request.cancel_url
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/v2/checkout/orders",
                    headers=headers,
                    json=order_data
                ) as response:
                    result = await response.json()
                    
                    if response.status == 201:
                        return PaymentResponse(
                            success=True,
                            transaction_id=str(uuid.uuid4()),
                            provider_transaction_id=result["id"],
                            status=PaymentStatus.PENDING,
                            amount=request.amount,
                            currency=request.currency,
                            metadata={"approval_url": next(
                                (link["href"] for link in result.get("links", []) 
                                 if link["rel"] == "approve"), None
                            )}
                        )
                    else:
                        return PaymentResponse(
                            success=False,
                            status=PaymentStatus.FAILED,
                            error_message=result.get("message", "PayPal order creation failed")
                        )
                        
        except Exception as e:
            logger.error(f"PayPal payment processing failed: {str(e)}")
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )

class PaymentService:
    """Enterprise Payment Service with multi-provider support"""
    
    def __init__(self, config: PaymentConfig, db_session: Session):
        self.config = config
        self.db = db_session
        
        # Initialize providers
        self.providers = {}
        
        if config.stripe_secret_key:
            self.providers[PaymentProvider.STRIPE] = StripeProvider(config)
        
        if config.paypal_client_id and config.paypal_client_secret:
            self.providers[PaymentProvider.PAYPAL] = PayPalProvider(config)
        
        logger.info(f"PaymentService initialized with providers: {list(self.providers.keys())}")
    
    def _calculate_fees(self, amount: Decimal) -> Dict[str, Decimal]:
        """Calculate processing fees and commission"""
        
        processing_fee = (amount * self.config.processing_fee_percentage / 100) + self.config.processing_fee_fixed
        commission = amount * self.config.commission_percentage / 100
        net_amount = amount - processing_fee - commission
        
        return {
            "processing_fee": round(processing_fee, 2),
            "commission_amount": round(commission, 2),
            "net_amount": round(net_amount, 2)
        }
    
    async def process_payment(self, request: PaymentRequest, 
                            provider: PaymentProvider = PaymentProvider.STRIPE) -> PaymentResponse:
        """Process payment through specified provider"""
        
        if provider not in self.providers:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=f"Provider {provider} not configured"
            )
        
        # Validate currency support
        if request.currency not in self.config.supported_currencies:
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=f"Currency {request.currency} not supported"
            )
        
        try:
            # Calculate fees
            fees = self._calculate_fees(request.amount)
            
            # Create transaction record
            transaction = PaymentTransaction(
                transaction_id=str(uuid.uuid4()),
                booking_id=request.booking_id,
                customer_id=request.customer_id,
                provider=provider,
                payment_method=PaymentMethod.CREDIT_CARD,  # Default, will be updated
                amount=request.amount,
                currency=request.currency,
                customer_email=request.customer_email,
                customer_name=request.customer_name,
                billing_address=request.billing_address,
                processing_fee=fees["processing_fee"],
                commission_amount=fees["commission_amount"],
                net_amount=fees["net_amount"],
                metadata=request.metadata
            )
            
            # Process payment with provider
            provider_instance = self.providers[provider]
            response = await provider_instance.process_payment(request)
            
            # Update transaction with provider response
            transaction.status = response.status
            transaction.provider_transaction_id = response.provider_transaction_id
            
            if response.success:
                if response.status == PaymentStatus.SUCCEEDED:
                    transaction.completed_at = datetime.utcnow()
            else:
                transaction.failed_at = datetime.utcnow()
            
            # Save transaction
            self.db.add(transaction)
            self.db.commit()
            
            # Update response with our transaction ID
            response.transaction_id = transaction.transaction_id
            
            logger.info(
                f"Payment processed: Transaction={transaction.transaction_id}, "
                f"Provider={provider}, Status={response.status}, Amount={request.amount}"
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Payment processing failed: {str(e)}")
            self.db.rollback()
            return PaymentResponse(
                success=False,
                status=PaymentStatus.FAILED,
                error_message=str(e)
            )
    
    async def process_refund(self, refund_request: RefundRequest) -> Dict[str, Any]:
        """Process refund for a transaction"""
        
        try:
            # Get original transaction
            transaction = self.db.query(PaymentTransaction).filter(
                PaymentTransaction.transaction_id == refund_request.transaction_id
            ).first()
            
            if not transaction:
                return {
                    "success": False,
                    "error": "Transaction not found"
                }
            
            if transaction.status != PaymentStatus.SUCCEEDED:
                return {
                    "success": False,
                    "error": "Cannot refund transaction that is not successful"
                }
            
            # Determine refund amount
            refund_amount = refund_request.amount or transaction.amount
            
            if refund_amount > transaction.amount:
                return {
                    "success": False,
                    "error": "Refund amount cannot exceed original transaction amount"
                }
            
            # Process refund with provider
            provider_instance = self.providers[transaction.provider]
            
            if hasattr(provider_instance, 'process_refund'):
                refund_result = await provider_instance.process_refund(
                    transaction.provider_transaction_id,
                    refund_amount
                )
            else:
                return {
                    "success": False,
                    "error": f"Refund not supported by provider {transaction.provider}"
                }
            
            if refund_result["success"]:
                # Create refund record
                refund = PaymentRefund(
                    refund_id=str(uuid.uuid4()),
                    transaction_id=refund_request.transaction_id,
                    amount=refund_amount,
                    currency=transaction.currency,
                    reason=refund_request.reason,
                    status=PaymentStatus.SUCCEEDED,
                    provider_refund_id=refund_result.get("refund_id"),
                    provider_response=refund_result,
                    processed_at=datetime.utcnow()
                )
                
                # Update transaction status
                if refund_amount == transaction.amount:
                    transaction.status = PaymentStatus.REFUNDED
                else:
                    transaction.status = PaymentStatus.PARTIALLY_REFUNDED
                
                self.db.add(refund)
                self.db.commit()
                
                logger.info(
                    f"Refund processed: Transaction={refund_request.transaction_id}, "
                    f"Amount={refund_amount}, RefundId={refund.refund_id}"
                )
                
                return {
                    "success": True,
                    "refund_id": refund.refund_id,
                    "amount": refund_amount,
                    "status": refund.status
                }
            else:
                return refund_result
                
        except Exception as e:
            logger.error(f"Refund processing failed: {str(e)}")
            self.db.rollback()
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_transaction(self, transaction_id: str) -> Optional[PaymentTransaction]:
        """Get transaction by ID"""
        return self.db.query(PaymentTransaction).filter(
            PaymentTransaction.transaction_id == transaction_id
        ).first()
    
    def get_transactions_by_booking(self, booking_id: str) -> List[PaymentTransaction]:
        """Get all transactions for a booking"""
        return self.db.query(PaymentTransaction).filter(
            PaymentTransaction.booking_id == booking_id
        ).all()
    
    def get_payment_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get payment statistics for the specified period"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        transactions = self.db.query(PaymentTransaction).filter(
            PaymentTransaction.created_at >= start_date
        ).all()
        
        if not transactions:
            return {"total_transactions": 0, "total_amount": 0}
        
        total_transactions = len(transactions)
        successful_transactions = sum(1 for t in transactions if t.status == PaymentStatus.SUCCEEDED)
        total_amount = sum(float(t.amount) for t in transactions if t.status == PaymentStatus.SUCCEEDED)
        
        by_provider = {}
        by_currency = {}
        by_status = {}
        
        for transaction in transactions:
            # By provider
            by_provider[transaction.provider] = by_provider.get(transaction.provider, 0) + 1
            
            # By currency
            by_currency[transaction.currency] = by_currency.get(transaction.currency, 0) + 1
            
            # By status
            by_status[transaction.status] = by_status.get(transaction.status, 0) + 1
        
        success_rate = (successful_transactions / total_transactions) * 100 if total_transactions > 0 else 0
        
        return {
            "total_transactions": total_transactions,
            "successful_transactions": successful_transactions,
            "success_rate": round(success_rate, 2),
            "total_amount": round(total_amount, 2),
            "by_provider": by_provider,
            "by_currency": by_currency,
            "by_status": by_status,
            "period_days": days
        }
    
    async def verify_webhook(self, provider: PaymentProvider, payload: str, 
                           signature: str, endpoint_secret: str) -> bool:
        """Verify webhook signature"""
        
        try:
            if provider == PaymentProvider.STRIPE:
                stripe.Webhook.construct_event(payload, signature, endpoint_secret)
                return True
            elif provider == PaymentProvider.PAYPAL:
                # PayPal webhook verification logic would go here
                return True
            else:
                logger.warning(f"Webhook verification not implemented for {provider}")
                return False
                
        except Exception as e:
            logger.error(f"Webhook verification failed: {str(e)}")
            return False

# Export main classes
__all__ = [
    "PaymentService",
    "PaymentConfig", 
    "PaymentRequest",
    "PaymentIntentRequest",
    "RefundRequest",
    "PaymentResponse",
    "PaymentProvider",
    "PaymentMethod", 
    "PaymentStatus",
    "Currency",
    "PaymentTransaction",
    "PaymentRefund",
    "PaymentMethod_DB"
]