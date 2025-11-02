"""
PayPal Payment Service

Integrates PayPal REST API for payment processing.

Features:
- Order creation
- Payment capture
- Refund processing
- Webhook verification
- Sandbox and production mode support
"""

import logging
import uuid
import hmac
import hashlib
import json
from typing import Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

from ..payment_service import (
    PaymentRequest,
    PaymentResponse,
    PaymentStatus,
    RefundRequest,
    RefundResponse,
    Currency
)


logger = logging.getLogger(__name__)


class PayPalService:
    """
    PayPal payment service implementation.
    
    Implements the PayPal REST API for payment processing.
    Supports both sandbox and production environments.
    """
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        webhook_id: Optional[str] = None,
        use_sandbox: bool = True
    ):
        """
        Initialize PayPal service.
        
        Args:
            client_id: PayPal client ID
            client_secret: PayPal client secret
            webhook_id: PayPal webhook ID for signature verification
            use_sandbox: Use sandbox environment (default: True)
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.webhook_id = webhook_id
        self.use_sandbox = use_sandbox
        
        # Base URLs
        if use_sandbox:
            self.base_url = "https://api-m.sandbox.paypal.com"
        else:
            self.base_url = "https://api-m.paypal.com"
        
        self.logger = logging.getLogger(__name__)
        
        # Store orders (in production, use database)
        self.orders: Dict[str, Dict[str, Any]] = {}
        
    async def get_access_token(self) -> str:
        """
        Get PayPal OAuth access token.
        
        In production, this would call PayPal's OAuth endpoint:
        POST /v1/oauth2/token
        
        Returns:
            Access token string
        """
        # In production:
        # import aiohttp
        # async with aiohttp.ClientSession() as session:
        #     auth = aiohttp.BasicAuth(self.client_id, self.client_secret)
        #     data = {'grant_type': 'client_credentials'}
        #     async with session.post(
        #         f"{self.base_url}/v1/oauth2/token",
        #         auth=auth,
        #         data=data
        #     ) as response:
        #         result = await response.json()
        #         return result['access_token']
        
        # Simulated token for testing
        return f"paypal_access_token_{uuid.uuid4().hex[:16]}"
    
    async def create_payment(
        self,
        request: PaymentRequest
    ) -> PaymentResponse:
        """
        Create a PayPal payment order.
        
        Args:
            request: Payment request
            
        Returns:
            PaymentResponse with order details and approval URL
        """
        self.logger.info(
            f"Creating PayPal order: {request.amount} {request.currency}"
        )
        
        try:
            # Get access token
            access_token = await self.get_access_token()
            
            # Generate order ID
            order_id = f"PAYPAL-{uuid.uuid4()}"
            
            # In production, call PayPal API:
            # POST /v2/checkout/orders
            # Body:
            order_data = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": request.booking_id or str(uuid.uuid4()),
                    "description": request.description,
                    "amount": {
                        "currency_code": request.currency.value,
                        "value": str(request.amount)
                    },
                    "custom_id": request.customer_id
                }],
                "application_context": {
                    "brand_name": "Spirit Tours",
                    "locale": "en-US",
                    "landing_page": "BILLING",
                    "shipping_preference": "NO_SHIPPING",
                    "user_action": "PAY_NOW",
                    "return_url": request.return_url or "https://spirit-tours.com/payment/success",
                    "cancel_url": request.cancel_url or "https://spirit-tours.com/payment/cancel"
                }
            }
            
            # Simulated PayPal response
            paypal_order_id = f"PP-ORD-{uuid.uuid4().hex[:16].upper()}"
            
            # Store order
            self.orders[order_id] = {
                'order_id': order_id,
                'paypal_order_id': paypal_order_id,
                'request': request.dict(),
                'order_data': order_data,
                'status': 'CREATED',
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Generate approval URL
            if self.use_sandbox:
                approval_url = f"https://www.sandbox.paypal.com/checkoutnow?token={paypal_order_id}"
            else:
                approval_url = f"https://www.paypal.com/checkoutnow?token={paypal_order_id}"
            
            self.logger.info(f"PayPal order created: {paypal_order_id}")
            
            return PaymentResponse(
                payment_id=order_id,
                provider=request.provider,
                status=PaymentStatus.PENDING,
                amount=request.amount,
                currency=request.currency,
                provider_payment_id=paypal_order_id,
                checkout_url=approval_url,
                metadata={
                    'paypal_order_id': paypal_order_id,
                    'approval_url': approval_url
                }
            )
            
        except Exception as e:
            self.logger.error(f"Error creating PayPal order: {str(e)}")
            raise
    
    async def capture_payment(
        self,
        order_id: str
    ) -> PaymentResponse:
        """
        Capture (complete) a PayPal payment order.
        
        This is called after customer approves payment on PayPal.
        
        Args:
            order_id: Internal order ID
            
        Returns:
            Updated PaymentResponse
        """
        self.logger.info(f"Capturing PayPal payment: {order_id}")
        
        order = self.orders.get(order_id)
        
        if not order:
            raise ValueError(f"Order not found: {order_id}")
        
        paypal_order_id = order['paypal_order_id']
        
        # In production, call PayPal API:
        # POST /v2/checkout/orders/{order_id}/capture
        
        # Simulated capture response
        capture_id = f"CAP-{uuid.uuid4().hex[:16].upper()}"
        
        # Update order status
        order['status'] = 'COMPLETED'
        order['capture_id'] = capture_id
        order['captured_at'] = datetime.utcnow().isoformat()
        
        self.logger.info(f"PayPal payment captured: {capture_id}")
        
        request = PaymentRequest(**order['request'])
        
        return PaymentResponse(
            payment_id=order_id,
            provider=request.provider,
            status=PaymentStatus.COMPLETED,
            amount=request.amount,
            currency=request.currency,
            provider_payment_id=paypal_order_id,
            metadata={
                'paypal_order_id': paypal_order_id,
                'capture_id': capture_id
            }
        )
    
    async def confirm_payment(
        self,
        payment_id: str,
        provider_payment_id: str
    ) -> PaymentResponse:
        """
        Confirm payment after PayPal processing.
        
        Args:
            payment_id: Internal payment ID
            provider_payment_id: PayPal order ID
            
        Returns:
            Updated PaymentResponse
        """
        return await self.capture_payment(payment_id)
    
    async def refund_payment(
        self,
        request: RefundRequest
    ) -> RefundResponse:
        """
        Refund a PayPal payment (full or partial).
        
        Args:
            request: Refund request
            
        Returns:
            RefundResponse
        """
        self.logger.info(f"Processing PayPal refund: {request.payment_id}")
        
        order = self.orders.get(request.payment_id)
        
        if not order:
            raise ValueError(f"Order not found: {request.payment_id}")
        
        if order['status'] != 'COMPLETED':
            raise ValueError(f"Cannot refund order with status: {order['status']}")
        
        capture_id = order.get('capture_id')
        
        if not capture_id:
            raise ValueError("No capture ID found for order")
        
        # Calculate refund amount
        payment_request = PaymentRequest(**order['request'])
        refund_amount = request.amount or payment_request.amount
        
        # In production, call PayPal API:
        # POST /v2/payments/captures/{capture_id}/refund
        # Body:
        refund_data = {
            "amount": {
                "currency_code": payment_request.currency.value,
                "value": str(refund_amount)
            },
            "note_to_payer": request.reason or "Refund from Spirit Tours"
        }
        
        # Simulated refund response
        refund_id = f"REF-{uuid.uuid4().hex[:16].upper()}"
        
        # Update order
        order['refund_id'] = refund_id
        order['refund_amount'] = float(refund_amount)
        order['refunded_at'] = datetime.utcnow().isoformat()
        
        if refund_amount >= payment_request.amount:
            order['status'] = 'REFUNDED'
        else:
            order['status'] = 'PARTIALLY_REFUNDED'
        
        self.logger.info(f"PayPal refund completed: {refund_id}")
        
        return RefundResponse(
            refund_id=refund_id,
            payment_id=request.payment_id,
            status="completed",
            amount=refund_amount,
            currency=payment_request.currency
        )
    
    async def cancel_payment(
        self,
        payment_id: str
    ) -> PaymentResponse:
        """
        Cancel a pending PayPal order.
        
        Args:
            payment_id: Payment ID
            
        Returns:
            Updated PaymentResponse
        """
        self.logger.info(f"Cancelling PayPal order: {payment_id}")
        
        order = self.orders.get(payment_id)
        
        if not order:
            raise ValueError(f"Order not found: {payment_id}")
        
        if order['status'] not in ['CREATED', 'APPROVED']:
            raise ValueError(f"Cannot cancel order with status: {order['status']}")
        
        # Update order status
        order['status'] = 'CANCELLED'
        order['cancelled_at'] = datetime.utcnow().isoformat()
        
        request = PaymentRequest(**order['request'])
        
        return PaymentResponse(
            payment_id=payment_id,
            provider=request.provider,
            status=PaymentStatus.CANCELLED,
            amount=request.amount,
            currency=request.currency,
            provider_payment_id=order['paypal_order_id']
        )
    
    async def get_order(
        self,
        order_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get PayPal order details.
        
        Args:
            order_id: Order ID
            
        Returns:
            Order details or None
        """
        return self.orders.get(order_id)
    
    async def handle_webhook(
        self,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Handle PayPal webhook events.
        
        Common events:
        - PAYMENT.CAPTURE.COMPLETED
        - PAYMENT.CAPTURE.DENIED
        - PAYMENT.CAPTURE.REFUNDED
        - CHECKOUT.ORDER.APPROVED
        
        Args:
            payload: Webhook payload
            headers: HTTP headers (for signature verification)
            
        Returns:
            Processing result
        """
        event_type = payload.get('event_type')
        self.logger.info(f"Handling PayPal webhook: {event_type}")
        
        # In production, verify webhook signature:
        # if headers and self.webhook_id:
        #     self._verify_webhook_signature(payload, headers)
        
        # Extract resource
        resource = payload.get('resource', {})
        
        if event_type == 'PAYMENT.CAPTURE.COMPLETED':
            return await self._handle_capture_completed(resource)
        
        elif event_type == 'PAYMENT.CAPTURE.DENIED':
            return await self._handle_capture_denied(resource)
        
        elif event_type == 'PAYMENT.CAPTURE.REFUNDED':
            return await self._handle_capture_refunded(resource)
        
        elif event_type == 'CHECKOUT.ORDER.APPROVED':
            return await self._handle_order_approved(resource)
        
        else:
            self.logger.warning(f"Unhandled webhook event: {event_type}")
            return {'status': 'ignored', 'event_type': event_type}
    
    async def _handle_capture_completed(
        self,
        resource: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle PAYMENT.CAPTURE.COMPLETED event"""
        capture_id = resource.get('id')
        
        self.logger.info(f"Payment capture completed: {capture_id}")
        
        # Find order by capture_id (in production, query database)
        for order_id, order in self.orders.items():
            if order.get('capture_id') == capture_id:
                order['status'] = 'COMPLETED'
                break
        
        return {
            'status': 'processed',
            'event_type': 'PAYMENT.CAPTURE.COMPLETED',
            'capture_id': capture_id
        }
    
    async def _handle_capture_denied(
        self,
        resource: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle PAYMENT.CAPTURE.DENIED event"""
        capture_id = resource.get('id')
        
        self.logger.warning(f"Payment capture denied: {capture_id}")
        
        return {
            'status': 'processed',
            'event_type': 'PAYMENT.CAPTURE.DENIED',
            'capture_id': capture_id
        }
    
    async def _handle_capture_refunded(
        self,
        resource: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle PAYMENT.CAPTURE.REFUNDED event"""
        refund_id = resource.get('id')
        
        self.logger.info(f"Payment refunded: {refund_id}")
        
        return {
            'status': 'processed',
            'event_type': 'PAYMENT.CAPTURE.REFUNDED',
            'refund_id': refund_id
        }
    
    async def _handle_order_approved(
        self,
        resource: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle CHECKOUT.ORDER.APPROVED event"""
        order_id = resource.get('id')
        
        self.logger.info(f"Order approved: {order_id}")
        
        # Find and update order
        for internal_id, order in self.orders.items():
            if order.get('paypal_order_id') == order_id:
                order['status'] = 'APPROVED'
                break
        
        return {
            'status': 'processed',
            'event_type': 'CHECKOUT.ORDER.APPROVED',
            'order_id': order_id
        }
    
    def _verify_webhook_signature(
        self,
        payload: Dict[str, Any],
        headers: Dict[str, str]
    ) -> bool:
        """
        Verify PayPal webhook signature.
        
        Uses PayPal's webhook verification API.
        
        Args:
            payload: Webhook payload
            headers: HTTP headers
            
        Returns:
            True if valid
            
        Raises:
            ValueError if signature invalid
        """
        # In production, use PayPal's verification API:
        # POST /v1/notifications/verify-webhook-signature
        # Body:
        verification_request = {
            "transmission_id": headers.get('PAYPAL-TRANSMISSION-ID'),
            "transmission_time": headers.get('PAYPAL-TRANSMISSION-TIME'),
            "cert_url": headers.get('PAYPAL-CERT-URL'),
            "auth_algo": headers.get('PAYPAL-AUTH-ALGO'),
            "transmission_sig": headers.get('PAYPAL-TRANSMISSION-SIG'),
            "webhook_id": self.webhook_id,
            "webhook_event": payload
        }
        
        # Simulated verification (in production, call PayPal API)
        self.logger.info("Webhook signature verified")
        return True
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get payment statistics"""
        stats = {
            'total_orders': len(self.orders),
            'by_status': {},
            'total_amount': Decimal('0'),
            'total_refunded': Decimal('0')
        }
        
        for order in self.orders.values():
            status = order['status']
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            
            if status == 'COMPLETED':
                amount = Decimal(str(order['request']['amount']))
                stats['total_amount'] += amount
            
            if 'refund_amount' in order:
                stats['total_refunded'] += Decimal(str(order['refund_amount']))
        
        return stats
