"""
Payment API Routes

FastAPI endpoints for payment gateway system.
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request, Header, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from ..payments.payment_service import (
    PaymentService,
    PaymentRequest,
    PaymentResponse,
    RefundRequest,
    RefundResponse,
    PaymentProvider,
    PaymentStatus,
    Currency
)
from ..payments.stripe.stripe_service import StripeService
from ..payments.paypal.paypal_service import PayPalService
from ..database import get_db
from ..auth import get_current_user


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])


# Initialize payment services (in production, use environment variables)
stripe_service = StripeService(
    api_key="sk_test_...",  # Replace with actual key
    webhook_secret="whsec_...",  # Replace with actual secret
    use_test_mode=True
)

paypal_service = PayPalService(
    client_id="your_paypal_client_id",  # Replace with actual ID
    client_secret="your_paypal_client_secret",  # Replace with actual secret
    webhook_id="your_webhook_id",  # Replace with actual ID
    use_sandbox=True
)

# Create unified payment service
payment_service = PaymentService(
    stripe_service=stripe_service,
    paypal_service=paypal_service
)


# Request/Response Models

class CreatePaymentRequest(BaseModel):
    """Request to create a payment"""
    amount: float = Field(..., gt=0, description="Payment amount")
    currency: Currency = Currency.USD
    provider: PaymentProvider
    payment_method: str
    description: str = Field(..., min_length=1)
    booking_id: Optional[int] = None
    customer_email: str
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class PaymentResponseModel(BaseModel):
    """Payment response"""
    payment_id: str
    provider: str
    status: str
    amount: float
    currency: str
    checkout_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str


class RefundRequestModel(BaseModel):
    """Request to refund a payment"""
    payment_id: str
    amount: Optional[float] = None  # None for full refund
    reason: Optional[str] = None


class PaymentStatistics(BaseModel):
    """Payment statistics"""
    total_payments: int
    by_status: dict
    by_provider: dict
    total_amount: float


# API Endpoints

@router.post("/create", response_model=PaymentResponseModel)
async def create_payment(
    request: CreatePaymentRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new payment.
    
    This initiates a payment with the specified provider and returns
    a checkout URL for the customer to complete the payment.
    
    **Supported Providers:**
    - stripe: Credit/debit card payments
    - paypal: PayPal payments
    - cash: Cash payment (no online processing)
    - bank_transfer: Bank transfer (manual verification)
    
    **Returns:**
    - payment_id: Internal payment ID
    - checkout_url: URL to redirect customer for payment completion
    - status: Current payment status
    """
    try:
        logger.info(
            f"Creating payment: {request.amount} {request.currency} via {request.provider} "
            f"for user {current_user.id}"
        )
        
        # Create payment request
        payment_req = PaymentRequest(
            amount=request.amount,
            currency=request.currency,
            provider=request.provider,
            payment_method=request.payment_method,
            description=request.description,
            booking_id=request.booking_id,
            customer_id=str(current_user.id),
            customer_email=request.customer_email or current_user.email,
            metadata=request.metadata,
            return_url=request.return_url,
            cancel_url=request.cancel_url
        )
        
        # Process payment
        response = await payment_service.create_payment(payment_req)
        
        # TODO: Save to database
        # payment_db = Payment(
        #     payment_id=response.payment_id,
        #     provider=response.provider,
        #     status=response.status,
        #     ...
        # )
        # db.add(payment_db)
        # db.commit()
        
        return PaymentResponseModel(
            payment_id=response.payment_id,
            provider=response.provider.value,
            status=response.status.value,
            amount=float(response.amount),
            currency=response.currency.value,
            checkout_url=response.checkout_url,
            error=response.error,
            created_at=response.created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error creating payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{payment_id}", response_model=PaymentResponseModel)
async def get_payment(
    payment_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment details by ID.
    
    Returns the current status and details of a payment.
    """
    try:
        payment = await payment_service.get_payment(payment_id)
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # TODO: Verify user has access to this payment
        
        return PaymentResponseModel(
            payment_id=payment.payment_id,
            provider=payment.provider.value,
            status=payment.status.value,
            amount=float(payment.amount),
            currency=payment.currency.value,
            checkout_url=payment.checkout_url,
            error=payment.error,
            created_at=payment.created_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    provider_payment_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm a payment after provider processing.
    
    This endpoint is called after the customer completes payment
    on the provider's platform.
    """
    try:
        logger.info(f"Confirming payment: {payment_id}")
        
        response = await payment_service.confirm_payment(
            payment_id,
            provider_payment_id
        )
        
        # TODO: Update database
        # TODO: Send notification
        # TODO: Update booking status if applicable
        
        return PaymentResponseModel(
            payment_id=response.payment_id,
            provider=response.provider.value,
            status=response.status.value,
            amount=float(response.amount),
            currency=response.currency.value,
            created_at=response.created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    request: RefundRequestModel,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refund a payment (full or partial).
    
    Only completed payments can be refunded.
    Partial refunds are supported by specifying an amount less than the original payment.
    
    **Permissions:**
    - Requires admin or authorized user role
    """
    try:
        # TODO: Check user permissions
        # if not current_user.is_admin:
        #     raise HTTPException(status_code=403, detail="Not authorized")
        
        logger.info(f"Processing refund for payment: {payment_id}")
        
        refund_req = RefundRequest(
            payment_id=payment_id,
            amount=request.amount,
            reason=request.reason,
            metadata={'initiated_by': current_user.id}
        )
        
        response = await payment_service.refund_payment(refund_req)
        
        # TODO: Update database
        # TODO: Send notification
        
        return {
            'refund_id': response.refund_id,
            'payment_id': response.payment_id,
            'status': response.status,
            'amount': float(response.amount),
            'currency': response.currency.value,
            'created_at': response.created_at.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing refund: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{payment_id}/cancel")
async def cancel_payment(
    payment_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending payment.
    
    Only pending or processing payments can be cancelled.
    """
    try:
        logger.info(f"Cancelling payment: {payment_id}")
        
        response = await payment_service.cancel_payment(payment_id)
        
        # TODO: Update database
        
        return PaymentResponseModel(
            payment_id=response.payment_id,
            provider=response.provider.value,
            status=response.status.value,
            amount=float(response.amount),
            currency=response.currency.value,
            created_at=response.created_at.isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[PaymentResponseModel])
async def list_payments(
    status: Optional[PaymentStatus] = None,
    provider: Optional[PaymentProvider] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List payments with optional filters.
    
    **Query Parameters:**
    - status: Filter by payment status
    - provider: Filter by payment provider
    - limit: Maximum number of results (default: 50)
    - offset: Number of results to skip (default: 0)
    """
    try:
        # TODO: Query database
        # payments = db.query(Payment).filter(
        #     Payment.customer_id == current_user.id
        # )
        # if status:
        #     payments = payments.filter(Payment.status == status)
        # if provider:
        #     payments = payments.filter(Payment.provider == provider)
        # payments = payments.limit(limit).offset(offset).all()
        
        # Placeholder
        return []
        
    except Exception as e:
        logger.error(f"Error listing payments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/summary", response_model=PaymentStatistics)
async def get_payment_statistics(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get payment statistics.
    
    **Permissions:**
    - Requires admin role
    """
    try:
        # TODO: Check admin permissions
        # if not current_user.is_admin:
        #     raise HTTPException(status_code=403, detail="Not authorized")
        
        stats = payment_service.get_payment_statistics()
        
        return PaymentStatistics(
            total_payments=stats['total_payments'],
            by_status=stats['by_status'],
            by_provider=stats['by_provider'],
            total_amount=float(stats['total_amount'])
        )
        
    except Exception as e:
        logger.error(f"Error retrieving statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Webhook Endpoints

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    background_tasks: BackgroundTasks = None
):
    """
    Handle Stripe webhook events.
    
    This endpoint receives real-time notifications from Stripe
    about payment events (successful payments, failed payments, refunds, etc.)
    """
    try:
        payload = await request.json()
        
        logger.info(f"Received Stripe webhook: {payload.get('type')}")
        
        # Process webhook
        result = await payment_service.handle_webhook(
            PaymentProvider.STRIPE,
            payload,
            stripe_signature
        )
        
        # TODO: Update database based on event
        # TODO: Send notifications to users
        
        return JSONResponse(content={'status': 'success', 'result': result})
        
    except Exception as e:
        logger.error(f"Error handling Stripe webhook: {str(e)}")
        # Return 200 to prevent Stripe from retrying
        return JSONResponse(
            content={'status': 'error', 'message': str(e)},
            status_code=200
        )


@router.post("/webhooks/paypal")
async def paypal_webhook(
    request: Request,
    background_tasks: BackgroundTasks = None
):
    """
    Handle PayPal webhook events.
    
    This endpoint receives real-time notifications from PayPal
    about payment events (order approved, payment captured, refunded, etc.)
    """
    try:
        payload = await request.json()
        headers = dict(request.headers)
        
        logger.info(f"Received PayPal webhook: {payload.get('event_type')}")
        
        # Process webhook
        result = await payment_service.handle_webhook(
            PaymentProvider.PAYPAL,
            payload
        )
        
        # TODO: Update database based on event
        # TODO: Send notifications to users
        
        return JSONResponse(content={'status': 'success', 'result': result})
        
    except Exception as e:
        logger.error(f"Error handling PayPal webhook: {str(e)}")
        # Return 200 to prevent PayPal from retrying
        return JSONResponse(
            content={'status': 'error', 'message': str(e)},
            status_code=200
        )


# Health Check

@router.get("/health")
async def health_check():
    """
    Check payment service health.
    
    Returns the status of configured payment providers.
    """
    return {
        'status': 'healthy',
        'providers': [p.value for p in payment_service.get_supported_providers()],
        'timestamp': datetime.utcnow().isoformat()
    }
