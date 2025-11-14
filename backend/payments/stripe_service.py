"""
Stripe Payment Service
Handles all Stripe payment operations including payment intents, webhooks, and refunds
"""

import stripe
import os
import logging
from typing import Dict, Optional, List
from datetime import datetime
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Stripe with API key from environment
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_stripe_secret_key_here")


class StripeService:
    """Service for handling Stripe payment operations"""
    
    @staticmethod
    async def create_payment_intent(
        amount: float,
        currency: str = "usd",
        booking_id: str = None,
        customer_email: str = None,
        metadata: Dict = None
    ) -> Dict:
        """
        Create a Stripe Payment Intent
        
        Args:
            amount: Amount in dollars (will be converted to cents)
            currency: Currency code (default: usd)
            booking_id: Associated booking ID for tracking
            customer_email: Customer email for receipt
            metadata: Additional metadata to attach to the payment
            
        Returns:
            Dictionary with client_secret and payment details
        """
        try:
            # Convert amount to cents (Stripe uses smallest currency unit)
            amount_cents = int(amount * 100)
            
            # Prepare metadata
            payment_metadata = {
                "booking_id": booking_id or "manual_payment",
                "created_at": datetime.now().isoformat(),
            }
            if metadata:
                payment_metadata.update(metadata)
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                metadata=payment_metadata,
                receipt_email=customer_email,
                automatic_payment_methods={
                    "enabled": True,
                },
            )
            
            logger.info(f"✅ Payment intent created: {intent.id} for ${amount} (booking: {booking_id})")
            
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": amount,
                "currency": currency,
                "status": intent.status,
            }
            
        except stripe.error.CardError as e:
            logger.error(f"❌ Card error: {e.user_message}")
            raise HTTPException(status_code=400, detail=f"Card error: {e.user_message}")
        
        except stripe.error.StripeError as e:
            logger.error(f"❌ Stripe error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Payment processing error: {str(e)}")
        
        except Exception as e:
            logger.error(f"❌ Unexpected error creating payment intent: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    
    @staticmethod
    async def confirm_payment(payment_intent_id: str) -> Dict:
        """
        Confirm a payment intent and retrieve its status
        
        Args:
            payment_intent_id: Stripe payment intent ID
            
        Returns:
            Dictionary with payment status and details
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                "payment_intent_id": intent.id,
                "status": intent.status,
                "amount": intent.amount / 100,  # Convert cents to dollars
                "currency": intent.currency,
                "payment_method": intent.payment_method,
                "created": datetime.fromtimestamp(intent.created).isoformat(),
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"❌ Error confirming payment: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    
    @staticmethod
    async def process_webhook_event(payload: bytes, sig_header: str) -> Dict:
        """
        Process Stripe webhook events
        
        Args:
            payload: Raw request body
            sig_header: Stripe-Signature header
            
        Returns:
            Dictionary with event details
        """
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            
            event_type = event['type']
            event_data = event['data']['object']
            
            logger.info(f"📥 Webhook received: {event_type}")
            
            # Handle different event types
            if event_type == 'payment_intent.succeeded':
                await StripeService._handle_payment_success(event_data)
            
            elif event_type == 'payment_intent.payment_failed':
                await StripeService._handle_payment_failure(event_data)
            
            elif event_type == 'charge.refunded':
                await StripeService._handle_refund(event_data)
            
            return {
                "event_type": event_type,
                "event_id": event['id'],
                "processed": True,
            }
            
        except ValueError as e:
            logger.error(f"❌ Invalid payload: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"❌ Invalid signature: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid signature")
    
    
    @staticmethod
    async def _handle_payment_success(payment_intent: Dict):
        """Handle successful payment event"""
        booking_id = payment_intent.get('metadata', {}).get('booking_id')
        amount = payment_intent['amount'] / 100
        
        logger.info(f"✅ Payment succeeded: ${amount} for booking {booking_id}")
        
        # TODO: Update booking status in database
        # TODO: Send confirmation email
        # TODO: Trigger any post-payment workflows
    
    
    @staticmethod
    async def _handle_payment_failure(payment_intent: Dict):
        """Handle failed payment event"""
        booking_id = payment_intent.get('metadata', {}).get('booking_id')
        error_message = payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')
        
        logger.warning(f"❌ Payment failed for booking {booking_id}: {error_message}")
        
        # TODO: Update booking status to payment_failed
        # TODO: Send payment failure notification email
    
    
    @staticmethod
    async def _handle_refund(charge: Dict):
        """Handle refund event"""
        amount = charge['amount_refunded'] / 100
        payment_intent_id = charge['payment_intent']
        
        logger.info(f"💰 Refund processed: ${amount} for payment {payment_intent_id}")
        
        # TODO: Update booking status to refunded
        # TODO: Send refund confirmation email
    
    
    @staticmethod
    async def create_refund(
        payment_intent_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer"
    ) -> Dict:
        """
        Create a refund for a payment
        
        Args:
            payment_intent_id: Stripe payment intent ID
            amount: Amount to refund in dollars (None = full refund)
            reason: Reason for refund
            
        Returns:
            Dictionary with refund details
        """
        try:
            refund_params = {
                "payment_intent": payment_intent_id,
                "reason": reason,
            }
            
            if amount is not None:
                refund_params["amount"] = int(amount * 100)  # Convert to cents
            
            refund = stripe.Refund.create(**refund_params)
            
            logger.info(f"💰 Refund created: {refund.id} for payment {payment_intent_id}")
            
            return {
                "refund_id": refund.id,
                "payment_intent_id": payment_intent_id,
                "amount": refund.amount / 100,
                "status": refund.status,
                "reason": refund.reason,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"❌ Error creating refund: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    
    @staticmethod
    async def get_payment_history(
        customer_email: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Retrieve payment history
        
        Args:
            customer_email: Filter by customer email
            limit: Maximum number of payments to return
            
        Returns:
            List of payment intent dictionaries
        """
        try:
            params = {"limit": limit}
            
            if customer_email:
                # First find customer by email
                customers = stripe.Customer.list(email=customer_email, limit=1)
                if customers.data:
                    params["customer"] = customers.data[0].id
            
            intents = stripe.PaymentIntent.list(**params)
            
            return [
                {
                    "payment_intent_id": intent.id,
                    "amount": intent.amount / 100,
                    "currency": intent.currency,
                    "status": intent.status,
                    "created": datetime.fromtimestamp(intent.created).isoformat(),
                    "metadata": intent.metadata,
                }
                for intent in intents.data
            ]
            
        except stripe.error.StripeError as e:
            logger.error(f"❌ Error retrieving payment history: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))


# Webhook signature verification helper
def verify_webhook_signature(payload: bytes, sig_header: str) -> bool:
    """
    Verify Stripe webhook signature
    
    Args:
        payload: Raw request body
        sig_header: Stripe-Signature header
        
    Returns:
        True if signature is valid
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    try:
        stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        return True
    except Exception:
        return False
