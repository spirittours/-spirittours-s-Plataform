"""
Payment API Routes
Handles all payment-related endpoints including Stripe payment intents, webhooks, and refunds
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from .stripe_service import StripeService
from auth.jwt import get_current_user
from auth.models import User

# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/api/v1/payments",
    tags=["💳 Payments"]
)


# Pydantic models for request/response
class PaymentIntentCreate(BaseModel):
    """Request model for creating a payment intent"""
    amount: float = Field(..., gt=0, description="Amount in dollars")
    currency: str = Field(default="usd", description="Currency code (usd, eur, etc.)")
    booking_id: Optional[str] = Field(None, description="Associated booking ID")
    metadata: Optional[dict] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "amount": 299.99,
                "currency": "usd",
                "booking_id": "BK-2024-001",
                "metadata": {
                    "tour_name": "Machu Picchu Adventure",
                    "participants": 2
                }
            }
        }


class PaymentIntentResponse(BaseModel):
    """Response model for payment intent"""
    client_secret: str
    payment_intent_id: str
    amount: float
    currency: str
    status: str


class PaymentConfirmation(BaseModel):
    """Response model for payment confirmation"""
    payment_intent_id: str
    status: str
    amount: float
    currency: str
    payment_method: Optional[str]
    created: str


class RefundCreate(BaseModel):
    """Request model for creating a refund"""
    payment_intent_id: str = Field(..., description="Payment intent ID to refund")
    amount: Optional[float] = Field(None, gt=0, description="Amount to refund (None = full refund)")
    reason: str = Field(default="requested_by_customer", description="Reason for refund")
    
    class Config:
        json_schema_extra = {
            "example": {
                "payment_intent_id": "pi_1234567890abcdef",
                "amount": 150.00,
                "reason": "requested_by_customer"
            }
        }


class RefundResponse(BaseModel):
    """Response model for refund"""
    refund_id: str
    payment_intent_id: str
    amount: float
    status: str
    reason: str


class PaymentHistoryItem(BaseModel):
    """Model for payment history item"""
    payment_intent_id: str
    amount: float
    currency: str
    status: str
    created: str
    metadata: dict


# ==================== PAYMENT INTENT ENDPOINTS ====================

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payment_data: PaymentIntentCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a Stripe Payment Intent
    
    - **Protected endpoint** - Requires authentication
    - Returns client_secret for Stripe Elements on frontend
    - Amount is in dollars and will be converted to cents
    """
    try:
        result = await StripeService.create_payment_intent(
            amount=payment_data.amount,
            currency=payment_data.currency,
            booking_id=payment_data.booking_id,
            customer_email=current_user.email,
            metadata=payment_data.metadata
        )
        
        return PaymentIntentResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating payment intent: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment intent")


@router.get("/confirm-payment/{payment_intent_id}", response_model=PaymentConfirmation)
async def confirm_payment(
    payment_intent_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Confirm and retrieve payment status
    
    - **Protected endpoint** - Requires authentication
    - Use this to check payment status after client-side confirmation
    """
    try:
        result = await StripeService.confirm_payment(payment_intent_id)
        return PaymentConfirmation(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error confirming payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to confirm payment")


@router.get("/payment-history", response_model=List[PaymentHistoryItem])
async def get_payment_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    Get payment history for current user
    
    - **Protected endpoint** - Requires authentication
    - Returns list of payment intents for the user's email
    """
    try:
        payments = await StripeService.get_payment_history(
            customer_email=current_user.email,
            limit=limit
        )
        
        return [PaymentHistoryItem(**payment) for payment in payments]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error retrieving payment history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve payment history")


# ==================== REFUND ENDPOINTS ====================

@router.post("/refund", response_model=RefundResponse)
async def create_refund(
    refund_data: RefundCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Create a refund for a payment
    
    - **Protected endpoint** - Requires authentication
    - Can be partial or full refund (None amount = full refund)
    - Only administrators should typically have access to this in production
    """
    try:
        # TODO: Add admin role check in production
        # if current_user.role != "admin":
        #     raise HTTPException(status_code=403, detail="Admin access required")
        
        result = await StripeService.create_refund(
            payment_intent_id=refund_data.payment_intent_id,
            amount=refund_data.amount,
            reason=refund_data.reason
        )
        
        return RefundResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating refund: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create refund")


# ==================== WEBHOOK ENDPOINT ====================

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """
    Stripe webhook endpoint
    
    - **Public endpoint** - No authentication required
    - Handles Stripe events (payment success, failure, refunds)
    - Signature verification is handled in service layer
    
    ⚠️ IMPORTANT: Configure this endpoint in Stripe Dashboard:
       https://dashboard.stripe.com/webhooks
       
    Events handled:
    - payment_intent.succeeded
    - payment_intent.payment_failed
    - charge.refunded
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature header")
    
    try:
        # Get raw request body
        payload = await request.body()
        
        # Process webhook event
        result = await StripeService.process_webhook_event(payload, stripe_signature)
        
        logger.info(f"✅ Webhook processed: {result['event_type']}")
        
        return {"status": "success", "event": result}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Webhook processing error: {str(e)}")
        raise HTTPException(status_code=400, detail="Webhook processing failed")


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def payment_health_check():
    """
    Payment service health check
    
    - **Public endpoint** - No authentication required
    - Returns service status
    """
    return {
        "service": "payments",
        "status": "healthy",
        "provider": "Stripe",
        "version": "1.0.0"
    }
