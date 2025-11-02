"""
Payment API Endpoints for Enterprise Booking Platform
Provides comprehensive payment processing capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import json

from config.database import get_db
from services.payment_service import (
    PaymentService, PaymentConfig, PaymentRequest, PaymentIntentRequest,
    RefundRequest, PaymentResponse, PaymentProvider, PaymentMethod,
    PaymentStatus, Currency, PaymentTransaction, PaymentRefund
)
from auth.dependencies import get_current_user
from pydantic import BaseModel, Field
from decimal import Decimal

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Pydantic response models
class TransactionResponse(BaseModel):
    transaction_id: str
    booking_id: str
    customer_id: str
    provider: PaymentProvider
    payment_method: PaymentMethod
    amount: Decimal
    currency: Currency
    status: PaymentStatus
    provider_transaction_id: Optional[str]
    processing_fee: Optional[Decimal]
    net_amount: Optional[Decimal]
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class PaymentIntentResponse(BaseModel):
    success: bool
    payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None
    status: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

class RefundResponse(BaseModel):
    success: bool
    refund_id: Optional[str] = None
    amount: Optional[Decimal] = None
    status: Optional[PaymentStatus] = None
    error: Optional[str] = None

class PaymentStatsResponse(BaseModel):
    total_transactions: int
    successful_transactions: int
    success_rate: float
    total_amount: float
    by_provider: Dict[str, int]
    by_currency: Dict[str, int]
    by_status: Dict[str, int]
    period_days: int

class WebhookRequest(BaseModel):
    provider: PaymentProvider
    event_type: str
    data: Dict[str, Any]

class PaymentMethodRequest(BaseModel):
    customer_id: str
    type: PaymentMethod
    provider: PaymentProvider = PaymentProvider.STRIPE
    
    # Card details (for tokenization)
    card_number: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    cvc: Optional[str] = None
    
    # Bank details (for ACH/bank transfers)
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    
    is_default: bool = False

class MultiPaymentRequest(BaseModel):
    """Request for processing multiple payments (split payments, partial payments)"""
    booking_id: str
    customer_id: str
    customer_email: str
    customer_name: str
    
    payments: List[Dict[str, Any]] = Field(..., description="List of payment configurations")
    total_amount: Decimal = Field(..., gt=0)
    currency: Currency = Currency.USD
    
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SubscriptionPaymentRequest(BaseModel):
    """Request for recurring/subscription payments"""
    customer_id: str
    plan_id: str
    amount: Decimal
    currency: Currency = Currency.USD
    interval: str = "month"  # month, year, week
    interval_count: int = 1
    
    trial_period_days: Optional[int] = None
    payment_method_id: Optional[str] = None

# Dependency to get payment service
def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    """Get payment service with configuration"""
    
    # Load configuration from environment variables
    config = PaymentConfig(
        # Stripe Configuration - Load from environment
        stripe_secret_key=os.environ.get("STRIPE_SECRET_KEY", ""),
        stripe_publishable_key=os.environ.get("STRIPE_PUBLISHABLE_KEY", ""),
        stripe_webhook_secret=os.environ.get("STRIPE_WEBHOOK_SECRET", ""),
        
        # PayPal Configuration - Load from environment
        paypal_client_id=os.environ.get("PAYPAL_CLIENT_ID", ""),
        paypal_client_secret=os.environ.get("PAYPAL_CLIENT_SECRET", ""),
        paypal_environment=os.environ.get("PAYPAL_ENVIRONMENT", "sandbox"),
        
        # Default settings
        default_currency=Currency.USD,
        supported_currencies=[
            Currency.USD, Currency.EUR, Currency.GBP, 
            Currency.CAD, Currency.AUD, Currency.JPY
        ]
    )
    
    return PaymentService(config, db)

# Payment Processing Endpoints
@router.post("/process", response_model=PaymentResponse)
async def process_payment(
    payment_request: PaymentRequest,
    provider: PaymentProvider = Query(PaymentProvider.STRIPE),
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Process a payment through specified provider"""
    
    try:
        # Add user context to metadata
        payment_request.metadata["processed_by_user_id"] = current_user.get("user_id")
        payment_request.metadata["user_role"] = current_user.get("role")
        
        # Process payment
        response = await service.process_payment(payment_request, provider)
        
        logger.info(
            f"Payment processed by user {current_user.get('user_id')}: "
            f"Booking={payment_request.booking_id}, Provider={provider}, "
            f"Amount={payment_request.amount}, Success={response.success}"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Payment processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    intent_request: PaymentIntentRequest,
    provider: PaymentProvider = Query(PaymentProvider.STRIPE),
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Create a payment intent for client-side processing"""
    
    try:
        if provider not in service.providers:
            raise HTTPException(
                status_code=400, 
                detail=f"Provider {provider} not configured"
            )
        
        # Add user context to metadata
        intent_request.metadata["created_by_user_id"] = current_user.get("user_id")
        
        # Create payment intent
        provider_instance = service.providers[provider]
        
        if hasattr(provider_instance, 'create_payment_intent'):
            result = await provider_instance.create_payment_intent(intent_request)
            
            logger.info(
                f"Payment intent created by user {current_user.get('user_id')}: "
                f"Booking={intent_request.booking_id}, Provider={provider}, "
                f"Amount={intent_request.amount}"
            )
            
            return PaymentIntentResponse(**result)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Payment intent creation not supported by {provider}"
            )
            
    except Exception as e:
        logger.error(f"Payment intent creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/multi-payment", response_model=List[PaymentResponse])
async def process_multi_payment(
    multi_request: MultiPaymentRequest,
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Process multiple payments (split payments, installments)"""
    
    try:
        responses = []
        total_processed = Decimal('0')
        
        for payment_config in multi_request.payments:
            # Create individual payment request
            payment_request = PaymentRequest(
                booking_id=multi_request.booking_id,
                customer_id=multi_request.customer_id,
                customer_email=multi_request.customer_email,
                customer_name=multi_request.customer_name,
                amount=Decimal(str(payment_config['amount'])),
                currency=multi_request.currency,
                payment_method_id=payment_config.get('payment_method_id'),
                metadata={
                    **multi_request.metadata,
                    "payment_type": "split",
                    "payment_index": len(responses),
                    "total_payments": len(multi_request.payments)
                }
            )
            
            # Process payment
            provider = PaymentProvider(payment_config.get('provider', PaymentProvider.STRIPE))
            response = await service.process_payment(payment_request, provider)
            
            responses.append(response)
            
            if response.success and response.amount:
                total_processed += response.amount
        
        logger.info(
            f"Multi-payment processed by user {current_user.get('user_id')}: "
            f"Booking={multi_request.booking_id}, Payments={len(responses)}, "
            f"TotalProcessed={total_processed}"
        )
        
        return responses
        
    except Exception as e:
        logger.error(f"Multi-payment processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Refund Endpoints
@router.post("/refund", response_model=RefundResponse)
async def process_refund(
    refund_request: RefundRequest,
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Process a refund for a transaction"""
    
    try:
        # Check user permissions for refunds
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager", "finance"]:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to process refunds"
            )
        
        # Process refund
        result = await service.process_refund(refund_request)
        
        logger.info(
            f"Refund processed by user {current_user.get('user_id')}: "
            f"Transaction={refund_request.transaction_id}, "
            f"Amount={refund_request.amount}, Success={result.get('success')}"
        )
        
        return RefundResponse(**result)
        
    except Exception as e:
        logger.error(f"Refund processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Transaction Management Endpoints
@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Get transaction details by ID"""
    
    try:
        transaction = service.get_transaction(transaction_id)
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return TransactionResponse.from_orm(transaction)
        
    except Exception as e:
        logger.error(f"Get transaction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    booking_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    status: Optional[PaymentStatus] = Query(None),
    provider: Optional[PaymentProvider] = Query(None),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transactions with filters"""
    
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(PaymentTransaction).filter(
            PaymentTransaction.created_at >= start_date
        )
        
        if booking_id:
            query = query.filter(PaymentTransaction.booking_id == booking_id)
        
        if customer_id:
            query = query.filter(PaymentTransaction.customer_id == customer_id)
        
        if status:
            query = query.filter(PaymentTransaction.status == status)
        
        if provider:
            query = query.filter(PaymentTransaction.provider == provider)
        
        query = query.order_by(PaymentTransaction.created_at.desc())
        query = query.offset(offset).limit(limit)
        
        transactions = query.all()
        
        return [TransactionResponse.from_orm(transaction) for transaction in transactions]
        
    except Exception as e:
        logger.error(f"Get transactions failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bookings/{booking_id}/transactions", response_model=List[TransactionResponse])
async def get_booking_transactions(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Get all transactions for a specific booking"""
    
    try:
        transactions = service.get_transactions_by_booking(booking_id)
        
        return [TransactionResponse.from_orm(transaction) for transaction in transactions]
        
    except Exception as e:
        logger.error(f"Get booking transactions failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Statistics and Analytics Endpoints
@router.get("/statistics", response_model=PaymentStatsResponse)
async def get_payment_statistics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service)
):
    """Get payment statistics"""
    
    try:
        # Check user permissions for statistics
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager", "finance", "analyst"]:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to view payment statistics"
            )
        
        stats = service.get_payment_statistics(days)
        
        return PaymentStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Get payment statistics failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Webhook Endpoints
@router.post("/webhooks/{provider}")
async def handle_payment_webhook(
    provider: PaymentProvider,
    request: Request,
    background_tasks: BackgroundTasks,
    service: PaymentService = Depends(get_payment_service)
):
    """Handle payment provider webhooks"""
    
    try:
        # Get raw payload and signature
        payload = await request.body()
        signature = request.headers.get("stripe-signature") if provider == PaymentProvider.STRIPE else None
        
        if not signature and provider == PaymentProvider.STRIPE:
            raise HTTPException(status_code=400, detail="Missing signature")
        
        # Verify webhook signature
        endpoint_secret = ""  # Load from configuration based on provider
        
        if provider == PaymentProvider.STRIPE:
            endpoint_secret = service.config.stripe_webhook_secret
        elif provider == PaymentProvider.PAYPAL:
            endpoint_secret = service.config.paypal_webhook_id
        
        is_verified = await service.verify_webhook(
            provider, payload.decode('utf-8'), signature or "", endpoint_secret
        )
        
        if not is_verified:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Process webhook in background
        background_tasks.add_task(
            _process_payment_webhook,
            service,
            provider,
            json.loads(payload.decode('utf-8'))
        )
        
        logger.info(f"Payment webhook received and queued for processing: Provider={provider}")
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Webhook handling failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health Check Endpoint
@router.get("/health")
async def payment_service_health(
    service: PaymentService = Depends(get_payment_service)
):
    """Check payment service health"""
    
    try:
        # Test database connection
        recent_transactions = service.db.query(PaymentTransaction).limit(1).all()
        
        # Check provider availability
        providers_status = {}
        for provider_name, provider_instance in service.providers.items():
            providers_status[provider_name] = True  # Basic availability check
        
        return {
            "status": "healthy",
            "database_connection": True,
            "providers_available": providers_status,
            "supported_currencies": [currency.value for currency in service.config.supported_currencies],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Utility Endpoints
@router.get("/providers")
async def get_available_providers(
    service: PaymentService = Depends(get_payment_service)
):
    """Get list of available payment providers"""
    
    return {
        "available_providers": list(service.providers.keys()),
        "supported_currencies": [currency.value for currency in service.config.supported_currencies],
        "supported_methods": [method.value for method in PaymentMethod]
    }

@router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported currencies"""
    
    return {
        "currencies": [
            {"code": currency.value, "name": currency.name}
            for currency in Currency
        ]
    }

@router.post("/validate-amount")
async def validate_payment_amount(
    amount: Decimal,
    currency: Currency,
    provider: PaymentProvider = PaymentProvider.STRIPE
):
    """Validate payment amount for specific provider and currency"""
    
    try:
        # Provider-specific validation rules
        min_amounts = {
            PaymentProvider.STRIPE: {
                Currency.USD: Decimal("0.50"),
                Currency.EUR: Decimal("0.50"),
                Currency.GBP: Decimal("0.30"),
                Currency.JPY: Decimal("50")
            },
            PaymentProvider.PAYPAL: {
                Currency.USD: Decimal("1.00"),
                Currency.EUR: Decimal("1.00"),
                Currency.GBP: Decimal("1.00")
            }
        }
        
        min_amount = min_amounts.get(provider, {}).get(currency, Decimal("0.01"))
        
        if amount < min_amount:
            return {
                "valid": False,
                "error": f"Amount must be at least {min_amount} {currency.value}"
            }
        
        # Maximum amount check (typically set by provider)
        max_amount = Decimal("999999.99")  # Default maximum
        
        if amount > max_amount:
            return {
                "valid": False,
                "error": f"Amount exceeds maximum of {max_amount} {currency.value}"
            }
        
        return {
            "valid": True,
            "formatted_amount": f"{amount} {currency.value}",
            "min_amount": f"{min_amount} {currency.value}",
            "max_amount": f"{max_amount} {currency.value}"
        }
        
    except Exception as e:
        logger.error(f"Amount validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Background task functions
async def _process_payment_webhook(
    service: PaymentService,
    provider: PaymentProvider,
    webhook_data: Dict[str, Any]
):
    """Process payment webhook in background"""
    
    try:
        # Provider-specific webhook processing
        if provider == PaymentProvider.STRIPE:
            await _process_stripe_webhook(service, webhook_data)
        elif provider == PaymentProvider.PAYPAL:
            await _process_paypal_webhook(service, webhook_data)
        
        logger.info(f"Payment webhook processed successfully: Provider={provider}")
        
    except Exception as e:
        logger.error(f"Payment webhook processing failed: {str(e)}")

async def _process_stripe_webhook(service: PaymentService, data: Dict[str, Any]):
    """Process Stripe webhook events"""
    
    event_type = data.get("type")
    event_data = data.get("data", {}).get("object", {})
    
    if event_type == "payment_intent.succeeded":
        # Update transaction status
        payment_intent_id = event_data.get("id")
        
        transaction = service.db.query(PaymentTransaction).filter(
            PaymentTransaction.provider_transaction_id == payment_intent_id
        ).first()
        
        if transaction:
            transaction.status = PaymentStatus.SUCCEEDED
            transaction.completed_at = datetime.utcnow()
            transaction.webhook_verified = True
            service.db.commit()
            
            logger.info(f"Payment confirmed via webhook: Transaction={transaction.transaction_id}")
    
    elif event_type == "payment_intent.payment_failed":
        # Update transaction as failed
        payment_intent_id = event_data.get("id")
        
        transaction = service.db.query(PaymentTransaction).filter(
            PaymentTransaction.provider_transaction_id == payment_intent_id
        ).first()
        
        if transaction:
            transaction.status = PaymentStatus.FAILED
            transaction.failed_at = datetime.utcnow()
            transaction.webhook_verified = True
            service.db.commit()
            
            logger.info(f"Payment failure confirmed via webhook: Transaction={transaction.transaction_id}")

async def _process_paypal_webhook(service: PaymentService, data: Dict[str, Any]):
    """Process PayPal webhook events"""
    
    event_type = data.get("event_type")
    resource = data.get("resource", {})
    
    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Update transaction status for completed payment
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
        
        if order_id:
            transaction = service.db.query(PaymentTransaction).filter(
                PaymentTransaction.provider_transaction_id == order_id
            ).first()
            
            if transaction:
                transaction.status = PaymentStatus.SUCCEEDED
                transaction.completed_at = datetime.utcnow()
                transaction.webhook_verified = True
                service.db.commit()
                
                logger.info(f"PayPal payment confirmed via webhook: Transaction={transaction.transaction_id}")

# Import necessary modules at the top
import os

# Export router
__all__ = ["router"]