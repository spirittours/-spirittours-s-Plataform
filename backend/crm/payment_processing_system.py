"""
Payment Processing System for Spirit Tours CRM
Complete payment workflow integration with multiple providers and comprehensive tracking
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import hmac
import base64
from decimal import Decimal
import stripe
import paypal
import requests
import aiohttp
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, EmailStr, validator
import redis.asyncio as redis
from cryptography.fernet import Fernet
import uuid
from celery import Celery
import qrcode
from io import BytesIO
import base64 as b64

Base = declarative_base()

# Enums
class PaymentProvider(Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    SQUARE = "square"
    MERCADO_PAGO = "mercado_pago"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CRYPTO = "crypto"
    BUY_NOW_PAY_LATER = "bnpl"

class PaymentMethod(Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL_WALLET = "paypal_wallet"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    ACH = "ach"
    WIRE_TRANSFER = "wire_transfer"
    CASH = "cash"
    CHECK = "check"
    CRYPTO = "crypto"
    KLARNA = "klarna"
    AFTERPAY = "afterpay"

class PaymentStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    DISPUTED = "disputed"
    CHARGEBACK = "chargeback"

class CurrencyCode(Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"
    JPY = "JPY"
    PEN = "PEN"  # Peruvian Sol for Spirit Tours
    MXN = "MXN"
    BRL = "BRL"
    COP = "COP"

class PaymentPlan(Enum):
    FULL_PAYMENT = "full_payment"
    DEPOSIT_BALANCE = "deposit_balance"
    INSTALLMENTS_3 = "installments_3"
    INSTALLMENTS_6 = "installments_6"
    INSTALLMENTS_12 = "installments_12"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class FraudRiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

# Database Models
class PaymentAccount(Base):
    __tablename__ = "payment_accounts"
    
    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False)  # PaymentProvider enum
    account_name = Column(String, nullable=False)
    
    # Provider configuration
    api_key_encrypted = Column(Text)
    secret_key_encrypted = Column(Text)
    webhook_secret_encrypted = Column(Text)
    merchant_id = Column(String)
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_live_mode = Column(Boolean, default=False)  # Test vs Live
    supported_currencies = Column(JSON)  # List of currency codes
    supported_methods = Column(JSON)  # List of payment methods
    
    # Fee configuration
    processing_fee_percentage = Column(Float, default=2.9)
    processing_fee_fixed = Column(Float, default=0.30)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payments = relationship("PaymentTransaction", back_populates="account")

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    
    id = Column(String, primary_key=True)
    account_id = Column(String, ForeignKey("payment_accounts.id"))
    
    # Transaction details
    transaction_type = Column(String, default="payment")  # payment, refund, chargeback
    external_id = Column(String)  # ID from payment provider
    internal_reference = Column(String, unique=True)
    
    # Customer information
    customer_id = Column(String)
    customer_email = Column(String)
    customer_name = Column(String)
    customer_phone = Column(String)
    
    # Payment details
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String, default="USD")  # CurrencyCode enum
    payment_method = Column(String)  # PaymentMethod enum
    provider = Column(String, nullable=False)  # PaymentProvider enum
    
    # Status tracking
    status = Column(String, default="pending")  # PaymentStatus enum
    status_history = Column(JSON)  # List of status changes
    
    # Related entities
    reservation_id = Column(String)
    opportunity_id = Column(String)
    invoice_id = Column(String)
    
    # Payment plan
    payment_plan = Column(String, default="full_payment")  # PaymentPlan enum
    installment_number = Column(Integer)
    total_installments = Column(Integer)
    
    # Billing information
    billing_address = Column(JSON)
    billing_country = Column(String)
    billing_postal_code = Column(String)
    
    # Provider-specific data
    provider_data = Column(JSON)  # Raw data from provider
    payment_intent_id = Column(String)
    charge_id = Column(String)
    
    # Security and fraud
    fraud_risk_level = Column(String, default="low")  # FraudRiskLevel enum
    fraud_score = Column(Float)
    security_checks = Column(JSON)
    
    # Fees and processing
    processing_fee = Column(DECIMAL(10, 2), default=0)
    net_amount = Column(DECIMAL(10, 2))
    
    # Timing
    authorized_at = Column(DateTime)
    captured_at = Column(DateTime)
    completed_at = Column(DateTime)
    failed_at = Column(DateTime)
    
    # Failure information
    failure_code = Column(String)
    failure_message = Column(Text)
    
    # Webhook tracking
    webhook_received = Column(Boolean, default=False)
    webhook_data = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    account = relationship("PaymentAccount", back_populates="payments")
    refunds = relationship("PaymentRefund", back_populates="original_transaction")

class PaymentRefund(Base):
    __tablename__ = "payment_refunds"
    
    id = Column(String, primary_key=True)
    original_transaction_id = Column(String, ForeignKey("payment_transactions.id"))
    
    # Refund details
    external_refund_id = Column(String)
    refund_amount = Column(DECIMAL(10, 2), nullable=False)
    refund_reason = Column(String)
    refund_type = Column(String, default="customer_request")  # customer_request, fraud, error, etc.
    
    # Status
    status = Column(String, default="pending")
    processed_at = Column(DateTime)
    
    # Processing info
    processing_fee = Column(DECIMAL(10, 2), default=0)
    net_refund = Column(DECIMAL(10, 2))
    
    # Reason and notes
    internal_notes = Column(Text)
    customer_notification_sent = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    original_transaction = relationship("PaymentTransaction", back_populates="refunds")

class PaymentPlanSchedule(Base):
    __tablename__ = "payment_plan_schedules"
    
    id = Column(String, primary_key=True)
    reservation_id = Column(String, nullable=False)
    customer_id = Column(String, nullable=False)
    
    # Plan details
    plan_type = Column(String, nullable=False)  # PaymentPlan enum
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String, default="USD")
    
    # Schedule
    installment_count = Column(Integer, nullable=False)
    installment_amount = Column(DECIMAL(10, 2), nullable=False)
    first_payment_date = Column(DateTime, nullable=False)
    payment_frequency = Column(String, default="monthly")  # daily, weekly, monthly
    
    # Status
    is_active = Column(Boolean, default=True)
    payments_completed = Column(Integer, default=0)
    total_paid = Column(DECIMAL(10, 2), default=0)
    
    # Automation
    auto_charge_enabled = Column(Boolean, default=True)
    saved_payment_method = Column(JSON)  # Tokenized payment method
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    installments = relationship("PaymentInstallment", back_populates="schedule")

class PaymentInstallment(Base):
    __tablename__ = "payment_installments"
    
    id = Column(String, primary_key=True)
    schedule_id = Column(String, ForeignKey("payment_plan_schedules.id"))
    
    # Installment details
    installment_number = Column(Integer, nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    due_date = Column(DateTime, nullable=False)
    
    # Status
    status = Column(String, default="pending")  # pending, paid, failed, skipped
    payment_transaction_id = Column(String, ForeignKey("payment_transactions.id"))
    
    # Timing
    paid_at = Column(DateTime)
    failed_at = Column(DateTime)
    
    # Retry logic
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    schedule = relationship("PaymentPlanSchedule", back_populates="installments")

class PaymentLink(Base):
    __tablename__ = "payment_links"
    
    id = Column(String, primary_key=True)
    
    # Link details
    link_token = Column(String, unique=True, nullable=False)
    link_url = Column(String, nullable=False)
    qr_code_data = Column(Text)  # Base64 encoded QR code
    
    # Payment information
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String, default="USD")
    description = Column(Text)
    
    # Customer and booking
    customer_id = Column(String)
    customer_email = Column(String)
    reservation_id = Column(String)
    
    # Link settings
    is_single_use = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    max_uses = Column(Integer, default=1)
    uses_count = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    first_accessed_at = Column(DateTime)
    last_accessed_at = Column(DateTime)
    
    # Success/failure tracking
    successful_payments = Column(Integer, default=0)
    failed_attempts = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class PaymentWebhook(Base):
    __tablename__ = "payment_webhooks"
    
    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False)
    
    # Webhook data
    event_type = Column(String, nullable=False)
    event_id = Column(String)
    raw_payload = Column(JSON)
    
    # Processing
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime)
    processing_result = Column(String)  # success, failed, ignored
    processing_notes = Column(Text)
    
    # Related transaction
    transaction_id = Column(String, ForeignKey("payment_transactions.id"))
    
    # Security
    signature_verified = Column(Boolean, default=False)
    
    received_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
class PaymentRequest(BaseModel):
    amount: Decimal
    currency: CurrencyCode = CurrencyCode.USD
    payment_method: PaymentMethod
    provider: PaymentProvider
    
    customer_id: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    
    reservation_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    description: Optional[str] = None
    
    billing_address: Optional[Dict[str, str]] = None
    save_payment_method: bool = False
    
    # Payment plan
    payment_plan: PaymentPlan = PaymentPlan.FULL_PAYMENT
    installments: Optional[int] = None
    
    # Metadata
    metadata: Optional[Dict[str, str]] = {}
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than zero')
        return v

class PaymentLinkRequest(BaseModel):
    amount: Decimal
    currency: CurrencyCode = CurrencyCode.USD
    description: str
    
    customer_id: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    reservation_id: Optional[str] = None
    
    expires_in_hours: int = 24
    max_uses: int = 1
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class RefundRequest(BaseModel):
    transaction_id: str
    amount: Optional[Decimal] = None  # None for full refund
    reason: str
    internal_notes: Optional[str] = None

# Payment Providers
class StripePaymentProvider:
    """Stripe payment provider implementation"""
    
    def __init__(self, api_key: str, webhook_secret: str, is_live: bool = False):
        stripe.api_key = api_key
        self.webhook_secret = webhook_secret
        self.is_live = is_live
    
    async def create_payment_intent(self, payment_request: PaymentRequest) -> Dict[str, Any]:
        """Create a Stripe payment intent"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(payment_request.amount * 100),  # Stripe uses cents
                currency=payment_request.currency.value.lower(),
                payment_method_types=['card'],
                customer=payment_request.customer_id,
                description=payment_request.description,
                metadata=payment_request.metadata
            )
            
            return {
                'status': 'success',
                'payment_intent_id': intent.id,
                'client_secret': intent.client_secret,
                'amount': payment_request.amount,
                'currency': payment_request.currency.value,
                'status': intent.status
            }
            
        except stripe.error.StripeError as e:
            return {
                'status': 'error',
                'error_code': e.code,
                'error_message': str(e)
            }
    
    async def capture_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Capture a previously authorized payment"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            captured_intent = stripe.PaymentIntent.capture(payment_intent_id)
            
            return {
                'status': 'success',
                'payment_intent_id': captured_intent.id,
                'amount_captured': captured_intent.amount_received / 100,
                'currency': captured_intent.currency.upper()
            }
            
        except stripe.error.StripeError as e:
            return {
                'status': 'error',
                'error_code': e.code,
                'error_message': str(e)
            }
    
    async def create_refund(self, charge_id: str, amount: Optional[Decimal] = None, reason: str = None) -> Dict[str, Any]:
        """Create a refund"""
        try:
            refund_data = {'charge': charge_id}
            if amount:
                refund_data['amount'] = int(amount * 100)
            if reason:
                refund_data['reason'] = reason
            
            refund = stripe.Refund.create(**refund_data)
            
            return {
                'status': 'success',
                'refund_id': refund.id,
                'amount': refund.amount / 100,
                'currency': refund.currency.upper(),
                'status': refund.status
            }
            
        except stripe.error.StripeError as e:
            return {
                'status': 'error',
                'error_code': e.code,
                'error_message': str(e)
            }
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify Stripe webhook signature"""
        try:
            stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
            return True
        except (stripe.error.SignatureVerificationError, ValueError):
            return False

class PayPalPaymentProvider:
    """PayPal payment provider implementation"""
    
    def __init__(self, client_id: str, client_secret: str, is_live: bool = False):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = "https://api.paypal.com" if is_live else "https://api.sandbox.paypal.com"
        self.access_token = None
    
    async def get_access_token(self) -> str:
        """Get PayPal access token"""
        auth_url = f"{self.base_url}/v1/oauth2/token"
        
        auth_string = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        
        headers = {
            'Authorization': f'Basic {auth_string}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        data = {'grant_type': 'client_credentials'}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(auth_url, headers=headers, data=data) as response:
                result = await response.json()
                self.access_token = result['access_token']
                return self.access_token
    
    async def create_payment(self, payment_request: PaymentRequest) -> Dict[str, Any]:
        """Create PayPal payment"""
        if not self.access_token:
            await self.get_access_token()
        
        payment_url = f"{self.base_url}/v1/payments/payment"
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        payment_data = {
            'intent': 'sale',
            'payer': {'payment_method': 'paypal'},
            'transactions': [{
                'amount': {
                    'total': str(payment_request.amount),
                    'currency': payment_request.currency.value
                },
                'description': payment_request.description or 'Spirit Tours Payment'
            }],
            'redirect_urls': {
                'return_url': 'https://spirittours.com/payment/success',
                'cancel_url': 'https://spirittours.com/payment/cancel'
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(payment_url, headers=headers, json=payment_data) as response:
                result = await response.json()
                
                if response.status == 201:
                    return {
                        'status': 'success',
                        'payment_id': result['id'],
                        'approval_url': next(link['href'] for link in result['links'] if link['rel'] == 'approval_url'),
                        'amount': payment_request.amount,
                        'currency': payment_request.currency.value
                    }
                else:
                    return {
                        'status': 'error',
                        'error_message': result.get('message', 'Unknown error')
                    }

# Main Payment Processing System
class PaymentProcessingSystem:
    """
    Comprehensive payment processing system for Spirit Tours CRM
    Handles multiple payment providers and complex payment workflows
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379"):
        self.database_url = database_url
        self.redis_url = redis_url
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # Payment providers
        self.providers: Dict[PaymentProvider, Any] = {}
        
        # Encryption key for sensitive data
        self.encryption_key = Fernet.generate_key()
        self.fernet = Fernet(self.encryption_key)
        
        # Celery for background processing
        self.celery_app = Celery('payment_processing')
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize database and Redis connections"""
        self.engine = create_async_engine(self.database_url, echo=True)
        self.session_factory = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        self.redis_client = redis.from_url(self.redis_url)
        
        # Create database tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    def register_payment_provider(self, provider_type: PaymentProvider, provider_instance: Any):
        """Register a payment provider"""
        self.providers[provider_type] = provider_instance
        self.logger.info(f"Registered {provider_type.value} payment provider")
    
    async def create_payment_account(self, account_data: Dict[str, Any]) -> str:
        """Create a new payment account configuration"""
        account_id = self._generate_id()
        
        async with self.session_factory() as session:
            account = PaymentAccount(
                id=account_id,
                provider=account_data['provider'],
                account_name=account_data['account_name'],
                api_key_encrypted=self._encrypt_data(account_data['api_key']),
                secret_key_encrypted=self._encrypt_data(account_data['secret_key']),
                webhook_secret_encrypted=self._encrypt_data(account_data.get('webhook_secret', '')),
                merchant_id=account_data.get('merchant_id'),
                is_live_mode=account_data.get('is_live_mode', False),
                supported_currencies=account_data.get('supported_currencies', ['USD']),
                supported_methods=account_data.get('supported_methods', ['credit_card']),
                processing_fee_percentage=account_data.get('processing_fee_percentage', 2.9),
                processing_fee_fixed=account_data.get('processing_fee_fixed', 0.30)
            )
            
            session.add(account)
            await session.commit()
        
        self.logger.info(f"Created payment account: {account_id}")
        return account_id
    
    async def process_payment(self, payment_request: PaymentRequest) -> Dict[str, Any]:
        """Process a payment through the appropriate provider"""
        transaction_id = self._generate_id()
        
        # Get payment provider
        if payment_request.provider not in self.providers:
            return {
                'status': 'error',
                'error_message': f'Payment provider {payment_request.provider.value} not configured'
            }
        
        provider = self.providers[payment_request.provider]
        
        # Create transaction record
        async with self.session_factory() as session:
            transaction = PaymentTransaction(
                id=transaction_id,
                internal_reference=f"SPT-{datetime.utcnow().strftime('%Y%m%d')}-{transaction_id[:8].upper()}",
                customer_id=payment_request.customer_id,
                customer_email=payment_request.customer_email,
                customer_name=payment_request.customer_name,
                amount=payment_request.amount,
                currency=payment_request.currency.value,
                payment_method=payment_request.payment_method.value,
                provider=payment_request.provider.value,
                reservation_id=payment_request.reservation_id,
                opportunity_id=payment_request.opportunity_id,
                payment_plan=payment_request.payment_plan.value,
                billing_address=payment_request.billing_address,
                status_history=[{
                    'status': PaymentStatus.PENDING.value,
                    'timestamp': datetime.utcnow().isoformat(),
                    'notes': 'Payment initiated'
                }]
            )
            
            session.add(transaction)
            await session.commit()
        
        try:
            # Process payment through provider
            if payment_request.provider == PaymentProvider.STRIPE:
                result = await provider.create_payment_intent(payment_request)
            elif payment_request.provider == PaymentProvider.PAYPAL:
                result = await provider.create_payment(payment_request)
            else:
                result = {
                    'status': 'error',
                    'error_message': 'Provider not implemented'
                }
            
            # Update transaction with provider response
            await self._update_transaction_status(
                transaction_id,
                PaymentStatus.PROCESSING if result['status'] == 'success' else PaymentStatus.FAILED,
                provider_data=result
            )
            
            # Handle payment plans
            if (payment_request.payment_plan != PaymentPlan.FULL_PAYMENT and 
                result['status'] == 'success'):
                await self._create_payment_plan_schedule(transaction_id, payment_request)
            
            # Cache transaction for quick lookup
            await self.redis_client.setex(
                f"payment_transaction:{transaction_id}",
                3600,  # 1 hour
                json.dumps(result, default=str)
            )
            
            result['transaction_id'] = transaction_id
            result['internal_reference'] = transaction.internal_reference
            
            return result
            
        except Exception as e:
            self.logger.error(f"Payment processing error: {e}")
            await self._update_transaction_status(
                transaction_id,
                PaymentStatus.FAILED,
                failure_message=str(e)
            )
            
            return {
                'status': 'error',
                'transaction_id': transaction_id,
                'error_message': str(e)
            }
    
    async def create_payment_link(self, link_request: PaymentLinkRequest) -> Dict[str, Any]:
        """Create a secure payment link for customers"""
        link_id = self._generate_id()
        link_token = self._generate_secure_token()
        
        # Generate payment link URL
        base_url = "https://spirittours.com/pay"  # Configure your domain
        link_url = f"{base_url}/{link_token}"
        
        # Generate QR code
        qr_code_data = self._generate_qr_code(link_url)
        
        async with self.session_factory() as session:
            payment_link = PaymentLink(
                id=link_id,
                link_token=link_token,
                link_url=link_url,
                qr_code_data=qr_code_data,
                amount=link_request.amount,
                currency=link_request.currency.value,
                description=link_request.description,
                customer_id=link_request.customer_id,
                customer_email=link_request.customer_email,
                reservation_id=link_request.reservation_id,
                expires_at=datetime.utcnow() + timedelta(hours=link_request.expires_in_hours),
                max_uses=link_request.max_uses
            )
            
            session.add(payment_link)
            await session.commit()
        
        # Store link details in Redis for quick access
        await self.redis_client.setex(
            f"payment_link:{link_token}",
            link_request.expires_in_hours * 3600,
            json.dumps({
                'link_id': link_id,
                'amount': str(link_request.amount),
                'currency': link_request.currency.value,
                'description': link_request.description,
                'customer_id': link_request.customer_id
            })
        )
        
        return {
            'status': 'success',
            'link_id': link_id,
            'payment_url': link_url,
            'qr_code_data': qr_code_data,
            'expires_at': payment_link.expires_at.isoformat(),
            'token': link_token
        }
    
    async def process_refund(self, refund_request: RefundRequest) -> Dict[str, Any]:
        """Process a payment refund"""
        refund_id = self._generate_id()
        
        async with self.session_factory() as session:
            # Get original transaction
            result = await session.execute(
                "SELECT * FROM payment_transactions WHERE id = :id",
                {'id': refund_request.transaction_id}
            )
            transaction = result.first()
            
            if not transaction:
                return {
                    'status': 'error',
                    'error_message': 'Original transaction not found'
                }
            
            # Determine refund amount
            refund_amount = refund_request.amount or transaction.amount
            
            if refund_amount > transaction.amount:
                return {
                    'status': 'error',
                    'error_message': 'Refund amount cannot exceed original transaction amount'
                }
            
            # Get provider
            provider = self.providers.get(PaymentProvider(transaction.provider))
            if not provider:
                return {
                    'status': 'error',
                    'error_message': 'Payment provider not available for refund'
                }
            
            # Create refund record
            refund_record = PaymentRefund(
                id=refund_id,
                original_transaction_id=refund_request.transaction_id,
                refund_amount=refund_amount,
                refund_reason=refund_request.reason,
                internal_notes=refund_request.internal_notes,
                status=PaymentStatus.PROCESSING.value
            )
            
            session.add(refund_record)
            await session.commit()
        
        try:
            # Process refund through provider
            if hasattr(provider, 'create_refund'):
                provider_result = await provider.create_refund(
                    transaction.charge_id,
                    refund_amount,
                    refund_request.reason
                )
                
                if provider_result['status'] == 'success':
                    # Update refund status
                    async with self.session_factory() as session:
                        await session.execute("""
                            UPDATE payment_refunds 
                            SET status = :status, 
                                processed_at = :processed_at,
                                external_refund_id = :external_id
                            WHERE id = :id
                        """, {
                            'id': refund_id,
                            'status': PaymentStatus.COMPLETED.value,
                            'processed_at': datetime.utcnow(),
                            'external_id': provider_result.get('refund_id')
                        })
                        await session.commit()
                    
                    # Update original transaction status
                    new_status = (PaymentStatus.PARTIALLY_REFUNDED if refund_amount < transaction.amount 
                                 else PaymentStatus.REFUNDED)
                    
                    await self._update_transaction_status(
                        refund_request.transaction_id,
                        new_status,
                        notes=f"Refund processed: {refund_amount} {transaction.currency}"
                    )
                    
                    return {
                        'status': 'success',
                        'refund_id': refund_id,
                        'refund_amount': refund_amount,
                        'currency': transaction.currency,
                        'external_refund_id': provider_result.get('refund_id')
                    }
                else:
                    return provider_result
            else:
                return {
                    'status': 'error',
                    'error_message': 'Refund not supported by this provider'
                }
                
        except Exception as e:
            self.logger.error(f"Refund processing error: {e}")
            return {
                'status': 'error',
                'refund_id': refund_id,
                'error_message': str(e)
            }
    
    async def handle_webhook(self, provider: PaymentProvider, headers: Dict[str, str], payload: bytes) -> Dict[str, Any]:
        """Handle payment provider webhooks"""
        webhook_id = self._generate_id()
        
        try:
            # Parse payload
            payload_json = json.loads(payload.decode())
            
            # Verify webhook signature
            provider_instance = self.providers.get(provider)
            signature_verified = False
            
            if provider_instance and hasattr(provider_instance, 'verify_webhook'):
                signature = headers.get('stripe-signature') if provider == PaymentProvider.STRIPE else headers.get('paypal-signature')
                signature_verified = provider_instance.verify_webhook(payload, signature)
            
            # Store webhook
            async with self.session_factory() as session:
                webhook = PaymentWebhook(
                    id=webhook_id,
                    provider=provider.value,
                    event_type=payload_json.get('type') or payload_json.get('event_type'),
                    event_id=payload_json.get('id'),
                    raw_payload=payload_json,
                    signature_verified=signature_verified
                )
                
                session.add(webhook)
                await session.commit()
            
            # Process webhook event
            processing_result = await self._process_webhook_event(webhook_id, payload_json, provider)
            
            return {
                'status': 'success',
                'webhook_id': webhook_id,
                'processed': processing_result['processed'],
                'processing_result': processing_result.get('result', 'success')
            }
            
        except Exception as e:
            self.logger.error(f"Webhook processing error: {e}")
            return {
                'status': 'error',
                'webhook_id': webhook_id,
                'error_message': str(e)
            }
    
    async def get_payment_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get payment processing analytics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Overall metrics
            total_transactions = await session.execute("""
                SELECT COUNT(*) as count,
                       SUM(amount) as total_amount,
                       AVG(amount) as avg_amount,
                       SUM(processing_fee) as total_fees
                FROM payment_transactions 
                WHERE created_at >= :start_date
            """, {'start_date': start_date})
            
            # By status
            status_breakdown = await session.execute("""
                SELECT status, COUNT(*) as count, SUM(amount) as total_amount
                FROM payment_transactions 
                WHERE created_at >= :start_date
                GROUP BY status
            """, {'start_date': start_date})
            
            # By provider
            provider_breakdown = await session.execute("""
                SELECT provider, COUNT(*) as count, 
                       SUM(amount) as total_amount,
                       AVG(processing_fee) as avg_fee
                FROM payment_transactions 
                WHERE created_at >= :start_date AND status = 'completed'
                GROUP BY provider
            """, {'start_date': start_date})
            
            # By payment method
            method_breakdown = await session.execute("""
                SELECT payment_method, COUNT(*) as count, SUM(amount) as total_amount
                FROM payment_transactions 
                WHERE created_at >= :start_date AND status = 'completed'
                GROUP BY payment_method
            """, {'start_date': start_date})
            
            # Refund metrics
            refund_metrics = await session.execute("""
                SELECT COUNT(*) as refund_count,
                       SUM(refund_amount) as total_refunded
                FROM payment_refunds 
                WHERE created_at >= :start_date
            """, {'start_date': start_date})
            
            overall = total_transactions.first()
            
            return {
                'period_days': days,
                'overall': {
                    'total_transactions': overall.count if overall else 0,
                    'total_amount': float(overall.total_amount) if overall and overall.total_amount else 0,
                    'average_transaction': float(overall.avg_amount) if overall and overall.avg_amount else 0,
                    'total_fees': float(overall.total_fees) if overall and overall.total_fees else 0
                },
                'by_status': [dict(row) for row in status_breakdown],
                'by_provider': [dict(row) for row in provider_breakdown],
                'by_method': [dict(row) for row in method_breakdown],
                'refunds': dict(refund_metrics.first()) if refund_metrics.first() else {'refund_count': 0, 'total_refunded': 0},
                'generated_at': datetime.utcnow().isoformat()
            }
    
    # Helper methods
    def _generate_id(self) -> str:
        """Generate unique ID"""
        return str(uuid.uuid4())
    
    def _generate_secure_token(self) -> str:
        """Generate secure token for payment links"""
        return uuid.uuid4().hex
    
    def _encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def _decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def _generate_qr_code(self, url: str) -> str:
        """Generate QR code for payment link"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return b64.b64encode(buffer.getvalue()).decode()
    
    async def _update_transaction_status(self, 
                                       transaction_id: str, 
                                       status: PaymentStatus,
                                       provider_data: Optional[Dict[str, Any]] = None,
                                       failure_message: Optional[str] = None,
                                       notes: Optional[str] = None):
        """Update transaction status"""
        async with self.session_factory() as session:
            # Get current transaction
            result = await session.execute(
                "SELECT status_history FROM payment_transactions WHERE id = :id",
                {'id': transaction_id}
            )
            transaction = result.first()
            
            if transaction:
                status_history = transaction.status_history or []
                status_history.append({
                    'status': status.value,
                    'timestamp': datetime.utcnow().isoformat(),
                    'notes': notes or f'Status changed to {status.value}'
                })
                
                update_data = {
                    'status': status.value,
                    'status_history': status_history,
                    'updated_at': datetime.utcnow()
                }
                
                if provider_data:
                    update_data['provider_data'] = provider_data
                    update_data['external_id'] = provider_data.get('payment_intent_id') or provider_data.get('payment_id')
                
                if failure_message:
                    update_data['failure_message'] = failure_message
                    update_data['failed_at'] = datetime.utcnow()
                
                if status == PaymentStatus.COMPLETED:
                    update_data['completed_at'] = datetime.utcnow()
                elif status == PaymentStatus.AUTHORIZED:
                    update_data['authorized_at'] = datetime.utcnow()
                elif status == PaymentStatus.CAPTURED:
                    update_data['captured_at'] = datetime.utcnow()
                
                # Build update query dynamically
                set_clauses = []
                params = {'id': transaction_id}
                
                for key, value in update_data.items():
                    set_clauses.append(f"{key} = :{key}")
                    params[key] = value
                
                query = f"UPDATE payment_transactions SET {', '.join(set_clauses)} WHERE id = :id"
                
                await session.execute(query, params)
                await session.commit()
    
    async def _create_payment_plan_schedule(self, transaction_id: str, payment_request: PaymentRequest):
        """Create payment plan schedule for installment payments"""
        schedule_id = self._generate_id()
        
        # Calculate installment details
        installment_count = payment_request.installments or self._get_default_installments(payment_request.payment_plan)
        installment_amount = payment_request.amount / installment_count
        
        async with self.session_factory() as session:
            # Create schedule
            schedule = PaymentPlanSchedule(
                id=schedule_id,
                reservation_id=payment_request.reservation_id,
                customer_id=payment_request.customer_id,
                plan_type=payment_request.payment_plan.value,
                total_amount=payment_request.amount,
                currency=payment_request.currency.value,
                installment_count=installment_count,
                installment_amount=installment_amount,
                first_payment_date=datetime.utcnow()
            )
            
            session.add(schedule)
            
            # Create individual installments
            for i in range(installment_count):
                due_date = datetime.utcnow() + timedelta(days=30 * i)  # Monthly installments
                
                installment = PaymentInstallment(
                    id=self._generate_id(),
                    schedule_id=schedule_id,
                    installment_number=i + 1,
                    amount=installment_amount,
                    due_date=due_date,
                    status='paid' if i == 0 else 'pending'  # First installment is the current payment
                )
                
                session.add(installment)
            
            await session.commit()
    
    def _get_default_installments(self, payment_plan: PaymentPlan) -> int:
        """Get default number of installments for payment plan"""
        plan_installments = {
            PaymentPlan.INSTALLMENTS_3: 3,
            PaymentPlan.INSTALLMENTS_6: 6,
            PaymentPlan.INSTALLMENTS_12: 12,
            PaymentPlan.DEPOSIT_BALANCE: 2
        }
        return plan_installments.get(payment_plan, 1)
    
    async def _process_webhook_event(self, webhook_id: str, payload: Dict[str, Any], provider: PaymentProvider) -> Dict[str, Any]:
        """Process webhook event based on provider and event type"""
        event_type = payload.get('type') or payload.get('event_type')
        
        try:
            if provider == PaymentProvider.STRIPE:
                if event_type == 'payment_intent.succeeded':
                    # Handle successful payment
                    payment_intent = payload['data']['object']
                    external_id = payment_intent['id']
                    
                    # Find and update transaction
                    async with self.session_factory() as session:
                        result = await session.execute(
                            "SELECT id FROM payment_transactions WHERE external_id = :external_id",
                            {'external_id': external_id}
                        )
                        transaction = result.first()
                        
                        if transaction:
                            await self._update_transaction_status(
                                transaction.id,
                                PaymentStatus.COMPLETED,
                                provider_data=payment_intent
                            )
                
                elif event_type == 'payment_intent.payment_failed':
                    # Handle failed payment
                    payment_intent = payload['data']['object']
                    external_id = payment_intent['id']
                    
                    async with self.session_factory() as session:
                        result = await session.execute(
                            "SELECT id FROM payment_transactions WHERE external_id = :external_id",
                            {'external_id': external_id}
                        )
                        transaction = result.first()
                        
                        if transaction:
                            await self._update_transaction_status(
                                transaction.id,
                                PaymentStatus.FAILED,
                                failure_message=payment_intent.get('last_payment_error', {}).get('message')
                            )
            
            # Update webhook as processed
            async with self.session_factory() as session:
                await session.execute("""
                    UPDATE payment_webhooks 
                    SET processed = true, 
                        processed_at = :processed_at,
                        processing_result = 'success'
                    WHERE id = :id
                """, {
                    'id': webhook_id,
                    'processed_at': datetime.utcnow()
                })
                await session.commit()
            
            return {'processed': True, 'result': 'success'}
            
        except Exception as e:
            self.logger.error(f"Webhook event processing error: {e}")
            
            # Update webhook with error
            async with self.session_factory() as session:
                await session.execute("""
                    UPDATE payment_webhooks 
                    SET processed = true, 
                        processed_at = :processed_at,
                        processing_result = 'failed',
                        processing_notes = :notes
                    WHERE id = :id
                """, {
                    'id': webhook_id,
                    'processed_at': datetime.utcnow(),
                    'notes': str(e)
                })
                await session.commit()
            
            return {'processed': False, 'result': 'failed', 'error': str(e)}

# Usage Example
async def main():
    """Example usage of the Payment Processing System"""
    
    # Initialize the system
    system = PaymentProcessingSystem(
        database_url="sqlite+aiosqlite:///payment_processing.db",
        redis_url="redis://localhost:6379"
    )
    
    await system.initialize()
    
    # Register Stripe provider
    stripe_provider = StripePaymentProvider(
        api_key="sk_test_your_stripe_key",
        webhook_secret="whsec_your_webhook_secret",
        is_live=False
    )
    system.register_payment_provider(PaymentProvider.STRIPE, stripe_provider)
    
    # Create payment account
    account_id = await system.create_payment_account({
        'provider': 'stripe',
        'account_name': 'Spirit Tours Stripe Account',
        'api_key': 'sk_test_your_key',
        'secret_key': 'your_secret',
        'webhook_secret': 'whsec_your_webhook_secret',
        'is_live_mode': False,
        'supported_currencies': ['USD', 'PEN', 'EUR'],
        'supported_methods': ['credit_card', 'debit_card']
    })
    
    # Process a payment
    payment_request = PaymentRequest(
        amount=Decimal('2500.00'),
        currency=CurrencyCode.USD,
        payment_method=PaymentMethod.CREDIT_CARD,
        provider=PaymentProvider.STRIPE,
        customer_email="maria.gonzalez@email.com",
        customer_name="María González",
        reservation_id="reservation_123",
        description="Machu Picchu 3-day adventure tour for 2 people",
        payment_plan=PaymentPlan.DEPOSIT_BALANCE
    )
    
    payment_result = await system.process_payment(payment_request)
    print(f"Payment result: {payment_result}")
    
    # Create payment link
    link_request = PaymentLinkRequest(
        amount=Decimal('500.00'),
        currency=CurrencyCode.USD,
        description="Deposit for Machu Picchu Tour",
        customer_email="maria.gonzalez@email.com",
        reservation_id="reservation_123",
        expires_in_hours=48
    )
    
    link_result = await system.create_payment_link(link_request)
    print(f"Payment link: {link_result}")
    
    # Get analytics
    analytics = await system.get_payment_analytics(days=30)
    print(f"Payment analytics: {analytics}")

if __name__ == "__main__":
    asyncio.run(main())