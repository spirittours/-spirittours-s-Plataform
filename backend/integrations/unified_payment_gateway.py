"""
Unified Payment Gateway Integration
Production-ready integration with Stripe, MercadoPago, PayU, and more
"""

import asyncio
import json
import logging
import hashlib
import hmac
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union
from enum import Enum
import uuid
import aiohttp
from dataclasses import dataclass, asdict
import stripe
import mercadopago
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field, validator
import paypalrestsdk
from square.client import Client as SquareClient

logger = logging.getLogger(__name__)


class PaymentProvider(Enum):
    """Supported payment providers"""
    STRIPE = "stripe"
    MERCADOPAGO = "mercadopago"
    PAYPAL = "paypal"
    PAYU = "payu"
    SQUARE = "square"
    RAZORPAY = "razorpay"
    FLUTTERWAVE = "flutterwave"
    PAYSTACK = "paystack"


class PaymentStatus(Enum):
    """Payment status"""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    REQUIRES_ACTION = "requires_action"
    DISPUTED = "disputed"


class PaymentMethod(Enum):
    """Payment methods"""
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    WALLET = "wallet"
    CASH = "cash"
    CRYPTO = "crypto"
    PIX = "pix"  # Brazil
    BOLETO = "boleto"  # Brazil
    OXXO = "oxxo"  # Mexico
    PSE = "pse"  # Colombia
    SPEI = "spei"  # Mexico


class Currency(Enum):
    """Supported currencies"""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    MXN = "MXN"
    BRL = "BRL"
    ARS = "ARS"
    COP = "COP"
    PEN = "PEN"
    CLP = "CLP"
    UYU = "UYU"
    
    
@dataclass
class PaymentRequest:
    """Payment request data"""
    amount: Decimal
    currency: Currency
    description: str
    customer_email: str
    customer_name: str
    customer_id: Optional[str] = None
    payment_method: PaymentMethod = PaymentMethod.CARD
    metadata: Optional[Dict[str, Any]] = None
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None
    webhook_url: Optional[str] = None
    reference_id: Optional[str] = None
    installments: Optional[int] = None
    save_payment_method: bool = False
    
    def __post_init__(self):
        if self.reference_id is None:
            self.reference_id = str(uuid.uuid4())
        if self.metadata is None:
            self.metadata = {}


@dataclass
class PaymentResponse:
    """Payment response data"""
    id: str
    provider: PaymentProvider
    status: PaymentStatus
    amount: Decimal
    currency: Currency
    reference_id: str
    provider_reference: str
    payment_url: Optional[str] = None
    requires_action: bool = False
    action_url: Optional[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()


class StripeGateway:
    """Stripe payment gateway integration"""
    
    def __init__(self, secret_key: str, webhook_secret: str):
        self.secret_key = secret_key
        self.webhook_secret = webhook_secret
        stripe.api_key = secret_key
        
    async def create_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Create a Stripe payment intent"""
        try:
            # Create or retrieve customer
            customer = await self._get_or_create_customer(request)
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=int(request.amount * 100),  # Convert to cents
                currency=request.currency.value.lower(),
                customer=customer.id if customer else None,
                description=request.description,
                metadata={
                    **request.metadata,
                    'reference_id': request.reference_id,
                    'customer_email': request.customer_email
                },
                receipt_email=request.customer_email,
                setup_future_usage='on_session' if request.save_payment_method else None,
                automatic_payment_methods={'enabled': True}
            )
            
            # Create checkout session for payment
            session = stripe.checkout.Session.create(
                customer=customer.id if customer else None,
                customer_email=request.customer_email if not customer else None,
                payment_intent_data={
                    'metadata': request.metadata
                },
                line_items=[{
                    'price_data': {
                        'currency': request.currency.value.lower(),
                        'product_data': {
                            'name': request.description,
                        },
                        'unit_amount': int(request.amount * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=request.return_url or 'https://spirittours.com/payment/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=request.cancel_url or 'https://spirittours.com/payment/cancel',
            )
            
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.STRIPE,
                status=PaymentStatus.PENDING,
                amount=request.amount,
                currency=request.currency,
                reference_id=request.reference_id,
                provider_reference=intent.id,
                payment_url=session.url,
                requires_action=True,
                action_url=session.url,
                metadata={
                    'stripe_session_id': session.id,
                    'stripe_intent_id': intent.id
                }
            )
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {e}")
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.STRIPE,
                status=PaymentStatus.FAILED,
                amount=request.amount,
                currency=request.currency,
                reference_id=request.reference_id,
                provider_reference="",
                error_message=str(e)
            )
    
    async def _get_or_create_customer(self, request: PaymentRequest):
        """Get or create Stripe customer"""
        try:
            # Search for existing customer
            customers = stripe.Customer.list(email=request.customer_email, limit=1)
            if customers.data:
                return customers.data[0]
            
            # Create new customer
            return stripe.Customer.create(
                email=request.customer_email,
                name=request.customer_name,
                metadata={'customer_id': request.customer_id} if request.customer_id else {}
            )
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {e}")
            return None
    
    async def confirm_payment(self, payment_intent_id: str) -> PaymentResponse:
        """Confirm a Stripe payment"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            status_map = {
                'succeeded': PaymentStatus.SUCCEEDED,
                'processing': PaymentStatus.PROCESSING,
                'canceled': PaymentStatus.CANCELLED,
                'requires_action': PaymentStatus.REQUIRES_ACTION,
                'requires_payment_method': PaymentStatus.FAILED
            }
            
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.STRIPE,
                status=status_map.get(intent.status, PaymentStatus.PENDING),
                amount=Decimal(intent.amount / 100),
                currency=Currency(intent.currency.upper()),
                reference_id=intent.metadata.get('reference_id', ''),
                provider_reference=intent.id
            )
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe confirm error: {e}")
            raise
    
    async def create_refund(self, payment_intent_id: str, amount: Optional[Decimal] = None) -> PaymentResponse:
        """Create a refund for a Stripe payment"""
        try:
            refund_params = {'payment_intent': payment_intent_id}
            if amount:
                refund_params['amount'] = int(amount * 100)
            
            refund = stripe.Refund.create(**refund_params)
            
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.STRIPE,
                status=PaymentStatus.REFUNDED if not amount else PaymentStatus.PARTIALLY_REFUNDED,
                amount=Decimal(refund.amount / 100),
                currency=Currency(refund.currency.upper()),
                reference_id=refund.metadata.get('reference_id', ''),
                provider_reference=refund.id
            )
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund error: {e}")
            raise
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify Stripe webhook signature"""
        try:
            stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return True
        except ValueError:
            return False
        except stripe.error.SignatureVerificationError:
            return False


class MercadoPagoGateway:
    """MercadoPago payment gateway integration"""
    
    def __init__(self, access_token: str):
        self.sdk = mercadopago.SDK(access_token)
        
    async def create_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Create a MercadoPago payment"""
        try:
            # Create preference
            preference_data = {
                "items": [
                    {
                        "id": request.reference_id,
                        "title": request.description,
                        "currency_id": request.currency.value,
                        "quantity": 1,
                        "unit_price": float(request.amount)
                    }
                ],
                "payer": {
                    "email": request.customer_email,
                    "name": request.customer_name.split()[0] if request.customer_name else "",
                    "surname": request.customer_name.split()[1] if request.customer_name and len(request.customer_name.split()) > 1 else ""
                },
                "back_urls": {
                    "success": request.return_url or "https://spirittours.com/payment/success",
                    "failure": request.cancel_url or "https://spirittours.com/payment/cancel",
                    "pending": "https://spirittours.com/payment/pending"
                },
                "auto_return": "approved",
                "notification_url": request.webhook_url or "https://spirittours.com/webhooks/mercadopago",
                "external_reference": request.reference_id,
                "metadata": request.metadata
            }
            
            # Handle installments for credit cards
            if request.installments and request.installments > 1:
                preference_data["payment_methods"] = {
                    "installments": request.installments
                }
            
            # Add payment method restrictions
            if request.payment_method == PaymentMethod.PIX:
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [
                        {"id": "credit_card"},
                        {"id": "debit_card"}
                    ]
                }
            elif request.payment_method == PaymentMethod.BOLETO:
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [
                        {"id": "credit_card"},
                        {"id": "debit_card"},
                        {"id": "pix"}
                    ]
                }
            
            preference_response = self.sdk.preference().create(preference_data)
            preference = preference_response["response"]
            
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.MERCADOPAGO,
                status=PaymentStatus.PENDING,
                amount=request.amount,
                currency=request.currency,
                reference_id=request.reference_id,
                provider_reference=preference["id"],
                payment_url=preference["init_point"],
                requires_action=True,
                action_url=preference["init_point"],
                metadata={
                    'preference_id': preference["id"],
                    'sandbox_url': preference.get("sandbox_init_point")
                }
            )
            
        except Exception as e:
            logger.error(f"MercadoPago error: {e}")
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.MERCADOPAGO,
                status=PaymentStatus.FAILED,
                amount=request.amount,
                currency=request.currency,
                reference_id=request.reference_id,
                provider_reference="",
                error_message=str(e)
            )
    
    async def confirm_payment(self, payment_id: str) -> PaymentResponse:
        """Confirm a MercadoPago payment"""
        try:
            payment = self.sdk.payment().get(payment_id)
            
            status_map = {
                'approved': PaymentStatus.SUCCEEDED,
                'pending': PaymentStatus.PENDING,
                'in_process': PaymentStatus.PROCESSING,
                'rejected': PaymentStatus.FAILED,
                'cancelled': PaymentStatus.CANCELLED,
                'refunded': PaymentStatus.REFUNDED
            }
            
            payment_data = payment["response"]
            
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.MERCADOPAGO,
                status=status_map.get(payment_data["status"], PaymentStatus.PENDING),
                amount=Decimal(str(payment_data["transaction_amount"])),
                currency=Currency(payment_data["currency_id"]),
                reference_id=payment_data.get("external_reference", ""),
                provider_reference=str(payment_data["id"])
            )
            
        except Exception as e:
            logger.error(f"MercadoPago confirm error: {e}")
            raise
    
    async def create_refund(self, payment_id: str, amount: Optional[Decimal] = None) -> PaymentResponse:
        """Create a refund for a MercadoPago payment"""
        try:
            refund_data = {}
            if amount:
                refund_data["amount"] = float(amount)
            
            refund = self.sdk.refund().create(payment_id, refund_data)
            refund_response = refund["response"]
            
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.MERCADOPAGO,
                status=PaymentStatus.REFUNDED if not amount else PaymentStatus.PARTIALLY_REFUNDED,
                amount=Decimal(str(refund_response.get("amount", 0))),
                currency=Currency("BRL"),  # Default, should get from payment
                reference_id="",
                provider_reference=str(refund_response.get("id", ""))
            )
            
        except Exception as e:
            logger.error(f"MercadoPago refund error: {e}")
            raise


class PayPalGateway:
    """PayPal payment gateway integration"""
    
    def __init__(self, client_id: str, client_secret: str, mode: str = "sandbox"):
        paypalrestsdk.configure({
            "mode": mode,  # "sandbox" or "live"
            "client_id": client_id,
            "client_secret": client_secret
        })
        
    async def create_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Create a PayPal payment"""
        try:
            payment = paypalrestsdk.Payment({
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": request.return_url or "https://spirittours.com/payment/success",
                    "cancel_url": request.cancel_url or "https://spirittours.com/payment/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": request.description,
                            "sku": request.reference_id,
                            "price": str(request.amount),
                            "currency": request.currency.value,
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "total": str(request.amount),
                        "currency": request.currency.value
                    },
                    "description": request.description
                }]
            })
            
            if payment.create():
                # Get approval URL
                approval_url = None
                for link in payment.links:
                    if link.rel == "approval_url":
                        approval_url = link.href
                        break
                
                return PaymentResponse(
                    id=str(uuid.uuid4()),
                    provider=PaymentProvider.PAYPAL,
                    status=PaymentStatus.PENDING,
                    amount=request.amount,
                    currency=request.currency,
                    reference_id=request.reference_id,
                    provider_reference=payment.id,
                    payment_url=approval_url,
                    requires_action=True,
                    action_url=approval_url
                )
            else:
                raise Exception(payment.error)
                
        except Exception as e:
            logger.error(f"PayPal error: {e}")
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.PAYPAL,
                status=PaymentStatus.FAILED,
                amount=request.amount,
                currency=request.currency,
                reference_id=request.reference_id,
                provider_reference="",
                error_message=str(e)
            )
    
    async def execute_payment(self, payment_id: str, payer_id: str) -> PaymentResponse:
        """Execute an approved PayPal payment"""
        try:
            payment = paypalrestsdk.Payment.find(payment_id)
            
            if payment.execute({"payer_id": payer_id}):
                return PaymentResponse(
                    id=str(uuid.uuid4()),
                    provider=PaymentProvider.PAYPAL,
                    status=PaymentStatus.SUCCEEDED,
                    amount=Decimal(payment.transactions[0].amount.total),
                    currency=Currency(payment.transactions[0].amount.currency),
                    reference_id=payment.transactions[0].item_list.items[0].sku,
                    provider_reference=payment.id
                )
            else:
                raise Exception(payment.error)
                
        except Exception as e:
            logger.error(f"PayPal execute error: {e}")
            raise


class PayUGateway:
    """PayU payment gateway integration (Latin America)"""
    
    def __init__(self, api_key: str, api_login: str, merchant_id: str, account_id: str, test_mode: bool = False):
        self.api_key = api_key
        self.api_login = api_login
        self.merchant_id = merchant_id
        self.account_id = account_id
        self.base_url = "https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi" if test_mode else "https://api.payulatam.com/payments-api/4.0/service.cgi"
        
    async def create_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Create a PayU payment"""
        try:
            # Generate signature
            signature = self._generate_signature(
                request.reference_id,
                str(request.amount),
                request.currency.value
            )
            
            # Prepare payment data
            payment_data = {
                "language": "es",
                "command": "SUBMIT_TRANSACTION",
                "merchant": {
                    "apiKey": self.api_key,
                    "apiLogin": self.api_login
                },
                "transaction": {
                    "order": {
                        "accountId": self.account_id,
                        "referenceCode": request.reference_id,
                        "description": request.description,
                        "language": "es",
                        "signature": signature,
                        "additionalValues": {
                            "TX_VALUE": {
                                "value": float(request.amount),
                                "currency": request.currency.value
                            }
                        },
                        "buyer": {
                            "emailAddress": request.customer_email,
                            "fullName": request.customer_name
                        }
                    },
                    "type": "AUTHORIZATION_AND_CAPTURE",
                    "paymentMethod": self._map_payment_method(request.payment_method)
                }
            }
            
            # Make API request
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.base_url,
                    json=payment_data,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    result = await response.json()
                    
                    if result.get("code") == "SUCCESS":
                        transaction = result.get("transactionResponse", {})
                        
                        return PaymentResponse(
                            id=str(uuid.uuid4()),
                            provider=PaymentProvider.PAYU,
                            status=self._map_payu_status(transaction.get("state")),
                            amount=request.amount,
                            currency=request.currency,
                            reference_id=request.reference_id,
                            provider_reference=transaction.get("transactionId", ""),
                            payment_url=transaction.get("extraParameters", {}).get("URL_PAYMENT_RECEIPT"),
                            metadata={
                                'order_id': transaction.get("orderId"),
                                'authorization_code': transaction.get("authorizationCode")
                            }
                        )
                    else:
                        raise Exception(result.get("error", "Payment failed"))
                        
        except Exception as e:
            logger.error(f"PayU error: {e}")
            return PaymentResponse(
                id=str(uuid.uuid4()),
                provider=PaymentProvider.PAYU,
                status=PaymentStatus.FAILED,
                amount=request.amount,
                currency=request.currency,
                reference_id=request.reference_id,
                provider_reference="",
                error_message=str(e)
            )
    
    def _generate_signature(self, reference_code: str, amount: str, currency: str) -> str:
        """Generate PayU signature"""
        signature_string = f"{self.api_key}~{self.merchant_id}~{reference_code}~{amount}~{currency}"
        return hashlib.md5(signature_string.encode()).hexdigest()
    
    def _map_payment_method(self, method: PaymentMethod) -> str:
        """Map payment method to PayU format"""
        mapping = {
            PaymentMethod.CARD: "VISA",  # Should be dynamic based on card
            PaymentMethod.BANK_TRANSFER: "PSE",
            PaymentMethod.CASH: "BALOTO",
            PaymentMethod.PSE: "PSE"
        }
        return mapping.get(method, "VISA")
    
    def _map_payu_status(self, state: str) -> PaymentStatus:
        """Map PayU transaction state to payment status"""
        mapping = {
            "APPROVED": PaymentStatus.SUCCEEDED,
            "PENDING": PaymentStatus.PENDING,
            "DECLINED": PaymentStatus.FAILED,
            "ERROR": PaymentStatus.FAILED,
            "EXPIRED": PaymentStatus.CANCELLED
        }
        return mapping.get(state, PaymentStatus.PENDING)


class UnifiedPaymentGateway:
    """Unified payment gateway that routes to appropriate provider"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration for all providers
        config = {
            'stripe': {'secret_key': '', 'webhook_secret': ''},
            'mercadopago': {'access_token': ''},
            'paypal': {'client_id': '', 'client_secret': '', 'mode': 'sandbox'},
            'payu': {'api_key': '', 'api_login': '', 'merchant_id': '', 'account_id': ''}
        }
        """
        self.providers = {}
        
        # Initialize providers based on config
        if 'stripe' in config:
            self.providers[PaymentProvider.STRIPE] = StripeGateway(**config['stripe'])
        
        if 'mercadopago' in config:
            self.providers[PaymentProvider.MERCADOPAGO] = MercadoPagoGateway(**config['mercadopago'])
        
        if 'paypal' in config:
            self.providers[PaymentProvider.PAYPAL] = PayPalGateway(**config['paypal'])
        
        if 'payu' in config:
            self.providers[PaymentProvider.PAYU] = PayUGateway(**config['payu'])
        
        # Payment storage (in production, use database)
        self.payments = {}
        
    def select_provider(self, country: str, currency: Currency, amount: Decimal) -> PaymentProvider:
        """Select best payment provider based on country, currency and amount"""
        # Provider selection logic
        provider_matrix = {
            # Latin America
            'BR': PaymentProvider.MERCADOPAGO,  # Brazil
            'AR': PaymentProvider.MERCADOPAGO,  # Argentina
            'MX': PaymentProvider.MERCADOPAGO,  # Mexico
            'CO': PaymentProvider.PAYU,  # Colombia
            'PE': PaymentProvider.PAYU,  # Peru
            'CL': PaymentProvider.MERCADOPAGO,  # Chile
            'UY': PaymentProvider.MERCADOPAGO,  # Uruguay
            
            # North America & Europe
            'US': PaymentProvider.STRIPE,
            'CA': PaymentProvider.STRIPE,
            'GB': PaymentProvider.STRIPE,
            'EU': PaymentProvider.STRIPE,
            
            # Default
            'DEFAULT': PaymentProvider.STRIPE
        }
        
        # Currency-specific overrides
        if currency == Currency.BRL:
            return PaymentProvider.MERCADOPAGO
        elif currency in [Currency.USD, Currency.EUR, Currency.GBP]:
            # For international currencies, prefer Stripe
            if PaymentProvider.STRIPE in self.providers:
                return PaymentProvider.STRIPE
        
        # Get provider by country
        provider = provider_matrix.get(country, provider_matrix['DEFAULT'])
        
        # Check if provider is available
        if provider not in self.providers:
            # Fallback to first available provider
            if self.providers:
                return list(self.providers.keys())[0]
            raise ValueError("No payment providers configured")
        
        return provider
    
    async def create_payment(
        self,
        request: PaymentRequest,
        country: str = "US",
        provider: Optional[PaymentProvider] = None
    ) -> PaymentResponse:
        """Create a payment with automatic or manual provider selection"""
        try:
            # Select provider if not specified
            if not provider:
                provider = self.select_provider(country, request.currency, request.amount)
            
            # Check if provider is available
            if provider not in self.providers:
                raise ValueError(f"Payment provider {provider.value} is not configured")
            
            # Route to appropriate provider
            gateway = self.providers[provider]
            
            # Create payment
            response = await gateway.create_payment(request)
            
            # Store payment information
            self.payments[response.id] = {
                'request': asdict(request),
                'response': asdict(response),
                'provider': provider,
                'created_at': datetime.utcnow()
            }
            
            # Log payment creation
            logger.info(f"Payment {response.id} created with {provider.value}")
            
            return response
            
        except Exception as e:
            logger.error(f"Payment creation failed: {e}")
            raise
    
    async def confirm_payment(self, payment_id: str, provider_data: Dict[str, Any]) -> PaymentResponse:
        """Confirm a payment from provider webhook"""
        try:
            # Get payment information
            payment_info = self.payments.get(payment_id)
            if not payment_info:
                raise ValueError(f"Payment {payment_id} not found")
            
            provider = payment_info['provider']
            gateway = self.providers[provider]
            
            # Confirm based on provider
            if provider == PaymentProvider.STRIPE:
                response = await gateway.confirm_payment(provider_data.get('payment_intent_id'))
            elif provider == PaymentProvider.MERCADOPAGO:
                response = await gateway.confirm_payment(provider_data.get('payment_id'))
            elif provider == PaymentProvider.PAYPAL:
                response = await gateway.execute_payment(
                    provider_data.get('payment_id'),
                    provider_data.get('payer_id')
                )
            else:
                raise ValueError(f"Confirmation not implemented for {provider.value}")
            
            # Update payment information
            self.payments[payment_id]['response'] = asdict(response)
            self.payments[payment_id]['confirmed_at'] = datetime.utcnow()
            
            return response
            
        except Exception as e:
            logger.error(f"Payment confirmation failed: {e}")
            raise
    
    async def create_refund(
        self,
        payment_id: str,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None
    ) -> PaymentResponse:
        """Create a refund for a payment"""
        try:
            # Get payment information
            payment_info = self.payments.get(payment_id)
            if not payment_info:
                raise ValueError(f"Payment {payment_id} not found")
            
            provider = payment_info['provider']
            gateway = self.providers[provider]
            provider_reference = payment_info['response']['provider_reference']
            
            # Create refund based on provider
            if provider == PaymentProvider.STRIPE:
                response = await gateway.create_refund(provider_reference, amount)
            elif provider == PaymentProvider.MERCADOPAGO:
                response = await gateway.create_refund(provider_reference, amount)
            else:
                raise ValueError(f"Refunds not implemented for {provider.value}")
            
            # Store refund information
            if 'refunds' not in self.payments[payment_id]:
                self.payments[payment_id]['refunds'] = []
            
            self.payments[payment_id]['refunds'].append({
                'amount': float(amount) if amount else float(payment_info['request']['amount']),
                'reason': reason,
                'created_at': datetime.utcnow().isoformat(),
                'response': asdict(response)
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Refund creation failed: {e}")
            raise
    
    async def handle_webhook(self, provider: PaymentProvider, headers: Dict, body: bytes) -> Dict[str, Any]:
        """Handle webhook from payment provider"""
        try:
            gateway = self.providers.get(provider)
            if not gateway:
                raise ValueError(f"Provider {provider.value} not configured")
            
            # Verify webhook signature
            if provider == PaymentProvider.STRIPE:
                signature = headers.get('stripe-signature', '')
                if not gateway.verify_webhook(body, signature):
                    raise ValueError("Invalid webhook signature")
                
                # Parse event
                event = stripe.Event.construct_from(
                    json.loads(body), stripe.api_key
                )
                
                # Handle different event types
                if event.type == 'payment_intent.succeeded':
                    payment_intent = event.data.object
                    # Update payment status
                    for payment_id, info in self.payments.items():
                        if info['response']['provider_reference'] == payment_intent.id:
                            info['response']['status'] = PaymentStatus.SUCCEEDED.value
                            info['webhook_received_at'] = datetime.utcnow().isoformat()
                            break
                
                return {'status': 'success', 'event': event.type}
            
            elif provider == PaymentProvider.MERCADOPAGO:
                # MercadoPago webhook handling
                data = json.loads(body)
                
                if data.get('type') == 'payment':
                    payment_id = data.get('data', {}).get('id')
                    if payment_id:
                        # Confirm payment
                        response = await gateway.confirm_payment(payment_id)
                        
                        # Update stored payment
                        for pid, info in self.payments.items():
                            if info['response']['provider_reference'] == payment_id:
                                info['response']['status'] = response.status.value
                                info['webhook_received_at'] = datetime.utcnow().isoformat()
                                break
                
                return {'status': 'success', 'type': data.get('type')}
            
            return {'status': 'success'}
            
        except Exception as e:
            logger.error(f"Webhook handling failed: {e}")
            raise


# FastAPI integration
app = FastAPI(title="Unified Payment Gateway API")

# Initialize payment gateway
payment_gateway = UnifiedPaymentGateway({
    'stripe': {
        'secret_key': 'sk_test_YOUR_STRIPE_SECRET_KEY',
        'webhook_secret': 'whsec_YOUR_WEBHOOK_SECRET'
    },
    'mercadopago': {
        'access_token': 'TEST-YOUR-MERCADOPAGO-ACCESS-TOKEN'
    },
    'paypal': {
        'client_id': 'YOUR_PAYPAL_CLIENT_ID',
        'client_secret': 'YOUR_PAYPAL_CLIENT_SECRET',
        'mode': 'sandbox'
    },
    'payu': {
        'api_key': 'YOUR_PAYU_API_KEY',
        'api_login': 'YOUR_PAYU_API_LOGIN',
        'merchant_id': 'YOUR_MERCHANT_ID',
        'account_id': 'YOUR_ACCOUNT_ID',
        'test_mode': True
    }
})


class CreatePaymentRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    currency: str = Field(..., description="Currency code (USD, EUR, BRL, etc)")
    description: str = Field(..., description="Payment description")
    customer_email: str = Field(..., description="Customer email")
    customer_name: str = Field(..., description="Customer name")
    country: str = Field(default="US", description="Country code for provider selection")
    payment_method: str = Field(default="card", description="Payment method")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    return_url: Optional[str] = Field(None, description="URL to redirect after successful payment")
    cancel_url: Optional[str] = Field(None, description="URL to redirect after cancelled payment")


@app.post("/api/payments/create")
async def create_payment(request: CreatePaymentRequest):
    """Create a new payment"""
    try:
        payment_request = PaymentRequest(
            amount=request.amount,
            currency=Currency(request.currency),
            description=request.description,
            customer_email=request.customer_email,
            customer_name=request.customer_name,
            payment_method=PaymentMethod(request.payment_method),
            metadata=request.metadata,
            return_url=request.return_url,
            cancel_url=request.cancel_url
        )
        
        response = await payment_gateway.create_payment(
            payment_request,
            country=request.country
        )
        
        return {
            'payment_id': response.id,
            'status': response.status.value,
            'payment_url': response.payment_url,
            'requires_action': response.requires_action,
            'provider': response.provider.value,
            'reference_id': response.reference_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/payments/{payment_id}/confirm")
async def confirm_payment(payment_id: str, provider_data: Dict[str, Any]):
    """Confirm a payment"""
    try:
        response = await payment_gateway.confirm_payment(payment_id, provider_data)
        return {
            'payment_id': response.id,
            'status': response.status.value,
            'provider': response.provider.value
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/payments/{payment_id}/refund")
async def create_refund(
    payment_id: str,
    amount: Optional[Decimal] = None,
    reason: Optional[str] = None
):
    """Create a refund for a payment"""
    try:
        response = await payment_gateway.create_refund(payment_id, amount, reason)
        return {
            'refund_id': response.id,
            'status': response.status.value,
            'amount': float(response.amount),
            'currency': response.currency.value
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        result = await payment_gateway.handle_webhook(
            PaymentProvider.STRIPE,
            headers,
            body
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/webhooks/mercadopago")
async def mercadopago_webhook(request: Request):
    """Handle MercadoPago webhooks"""
    try:
        body = await request.body()
        headers = dict(request.headers)
        
        result = await payment_gateway.handle_webhook(
            PaymentProvider.MERCADOPAGO,
            headers,
            body
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/payments/{payment_id}")
async def get_payment_details(payment_id: str):
    """Get payment details"""
    payment_info = payment_gateway.payments.get(payment_id)
    if not payment_info:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment_info


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'providers': [p.value for p in payment_gateway.providers.keys()],
        'timestamp': datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)