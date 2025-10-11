"""
Unit tests for Payment Service
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from decimal import Decimal

from backend.services.payment_service import PaymentService
from backend.models.payment import Payment, PaymentTransaction, PaymentRefund

class TestPaymentService:
    """Test suite for PaymentService"""
    
    @pytest.fixture
    def payment_service(self):
        """Create payment service instance for testing."""
        return PaymentService()
    
    @pytest.mark.asyncio
    async def test_process_stripe_payment_success(self, payment_service, mock_stripe_client):
        """Test successful Stripe payment processing."""
        # Mock Stripe response
        mock_stripe_client.payment_intents.create.return_value = Mock(
            id="pi_test123",
            status="succeeded",
            amount=10000,
            currency="usd",
            client_secret="secret_123"
        )
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.process_payment(
                amount=100.00,
                currency="USD",
                payment_method="stripe",
                payment_method_id="pm_test123",
                booking_id="booking-456",
                customer_email="test@example.com"
            )
        
        assert result["success"] is True
        assert result["transaction_id"] == "pi_test123"
        assert result["status"] == "succeeded"
        assert result["amount"] == 100.00
        mock_stripe_client.payment_intents.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_stripe_payment_failure(self, payment_service, mock_stripe_client):
        """Test failed Stripe payment processing."""
        # Mock Stripe error
        mock_stripe_client.payment_intents.create.side_effect = Exception("Card declined")
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.process_payment(
                amount=100.00,
                currency="USD",
                payment_method="stripe",
                payment_method_id="pm_test123",
                booking_id="booking-456",
                customer_email="test@example.com"
            )
        
        assert result["success"] is False
        assert "Card declined" in result["error"]
    
    @pytest.mark.asyncio
    async def test_process_paypal_payment_success(self, payment_service, mock_paypal_client):
        """Test successful PayPal payment processing."""
        # Mock PayPal response
        mock_order = Mock(
            id="ORDER123",
            status="COMPLETED",
            purchase_units=[{
                "amount": {"value": "100.00", "currency_code": "USD"}
            }]
        )
        mock_paypal_client.orders.create.return_value = mock_order
        mock_paypal_client.orders.capture.return_value = mock_order
        
        with patch.object(payment_service, 'paypal_client', mock_paypal_client):
            result = await payment_service.process_payment(
                amount=100.00,
                currency="USD",
                payment_method="paypal",
                order_id="ORDER123",
                booking_id="booking-456",
                customer_email="test@example.com"
            )
        
        assert result["success"] is True
        assert result["transaction_id"] == "ORDER123"
        assert result["status"] == "COMPLETED"
    
    @pytest.mark.asyncio
    async def test_calculate_fees(self, payment_service):
        """Test fee calculation for different payment methods."""
        # Test Stripe fees (2.9% + $0.30)
        stripe_fee = payment_service.calculate_fees(100.00, "stripe")
        assert stripe_fee == Decimal("3.20")
        
        # Test PayPal fees (2.99% + $0.49)
        paypal_fee = payment_service.calculate_fees(100.00, "paypal")
        assert paypal_fee == Decimal("3.48")
        
        # Test large amount
        large_fee = payment_service.calculate_fees(10000.00, "stripe")
        assert large_fee == Decimal("290.30")
    
    @pytest.mark.asyncio
    async def test_refund_payment_success(self, payment_service, mock_stripe_client):
        """Test successful payment refund."""
        # Mock Stripe refund
        mock_stripe_client.refunds.create.return_value = Mock(
            id="re_test123",
            status="succeeded",
            amount=5000,
            currency="usd"
        )
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.refund_payment(
                transaction_id="pi_test123",
                amount=50.00,
                reason="Customer request",
                payment_method="stripe"
            )
        
        assert result["success"] is True
        assert result["refund_id"] == "re_test123"
        assert result["status"] == "succeeded"
        assert result["amount"] == 50.00
    
    @pytest.mark.asyncio
    async def test_refund_payment_partial(self, payment_service, mock_stripe_client):
        """Test partial payment refund."""
        # Mock partial refund
        mock_stripe_client.refunds.create.return_value = Mock(
            id="re_partial123",
            status="succeeded",
            amount=2500,
            currency="usd"
        )
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.refund_payment(
                transaction_id="pi_test123",
                amount=25.00,
                reason="Partial refund",
                payment_method="stripe",
                original_amount=100.00
            )
        
        assert result["success"] is True
        assert result["refund_id"] == "re_partial123"
        assert result["amount"] == 25.00
    
    @pytest.mark.asyncio
    async def test_validate_payment_amount(self, payment_service):
        """Test payment amount validation."""
        # Valid amounts
        assert payment_service.validate_amount(100.00, "USD") is True
        assert payment_service.validate_amount(0.50, "USD") is True
        assert payment_service.validate_amount(999999.99, "USD") is True
        
        # Invalid amounts
        assert payment_service.validate_amount(0, "USD") is False
        assert payment_service.validate_amount(-10.00, "USD") is False
        assert payment_service.validate_amount(0.001, "USD") is False  # Below minimum
        assert payment_service.validate_amount(1000000.00, "USD") is False  # Above maximum
    
    @pytest.mark.asyncio
    async def test_currency_conversion(self, payment_service):
        """Test currency conversion functionality."""
        # Mock exchange rates
        payment_service.exchange_rates = {
            "USD": 1.0,
            "EUR": 0.85,
            "GBP": 0.73,
            "MXN": 18.50
        }
        
        # Test conversions
        eur_amount = payment_service.convert_currency(100.00, "USD", "EUR")
        assert eur_amount == Decimal("85.00")
        
        gbp_amount = payment_service.convert_currency(100.00, "USD", "GBP")
        assert gbp_amount == Decimal("73.00")
        
        mxn_amount = payment_service.convert_currency(100.00, "USD", "MXN")
        assert mxn_amount == Decimal("1850.00")
        
        # Test same currency
        usd_amount = payment_service.convert_currency(100.00, "USD", "USD")
        assert usd_amount == Decimal("100.00")
    
    @pytest.mark.asyncio
    async def test_payment_tokenization(self, payment_service, mock_stripe_client):
        """Test payment method tokenization."""
        # Mock tokenization
        mock_stripe_client.payment_methods.create.return_value = Mock(
            id="pm_test456",
            type="card",
            card=Mock(
                brand="visa",
                last4="4242",
                exp_month=12,
                exp_year=2025
            )
        )
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.tokenize_payment_method(
                card_number="4242424242424242",
                exp_month=12,
                exp_year=2025,
                cvc="123"
            )
        
        assert result["success"] is True
        assert result["payment_method_id"] == "pm_test456"
        assert result["card_brand"] == "visa"
        assert result["last4"] == "4242"
    
    @pytest.mark.asyncio
    async def test_payment_webhook_verification(self, payment_service):
        """Test webhook signature verification."""
        # Mock webhook data
        payload = '{"event": "payment.succeeded"}'
        signature = "test_signature_123"
        secret = "whsec_test123"
        
        # Test valid signature
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = {"type": "payment_intent.succeeded"}
            
            result = payment_service.verify_webhook(payload, signature, secret)
            assert result["valid"] is True
            assert result["event_type"] == "payment_intent.succeeded"
        
        # Test invalid signature
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.side_effect = Exception("Invalid signature")
            
            result = payment_service.verify_webhook(payload, "invalid_sig", secret)
            assert result["valid"] is False
    
    @pytest.mark.asyncio
    async def test_subscription_creation(self, payment_service, mock_stripe_client):
        """Test subscription creation for recurring payments."""
        # Mock subscription
        mock_stripe_client.subscriptions.create.return_value = Mock(
            id="sub_test123",
            status="active",
            current_period_start=1234567890,
            current_period_end=1234567890,
            items=Mock(data=[Mock(price=Mock(unit_amount=2999))])
        )
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.create_subscription(
                customer_id="cus_test123",
                price_id="price_test123",
                trial_days=14
            )
        
        assert result["success"] is True
        assert result["subscription_id"] == "sub_test123"
        assert result["status"] == "active"
    
    @pytest.mark.asyncio
    async def test_payment_retry_logic(self, payment_service, mock_stripe_client):
        """Test payment retry logic for failed transactions."""
        # Simulate failure then success
        mock_stripe_client.payment_intents.create.side_effect = [
            Exception("Network error"),
            Exception("Timeout"),
            Mock(
                id="pi_retry_success",
                status="succeeded",
                amount=10000
            )
        ]
        
        with patch.object(payment_service, 'stripe', mock_stripe_client):
            result = await payment_service.process_payment_with_retry(
                amount=100.00,
                currency="USD",
                payment_method="stripe",
                max_retries=3
            )
        
        assert result["success"] is True
        assert result["transaction_id"] == "pi_retry_success"
        assert result["retry_count"] == 2

@pytest.fixture
def mock_stripe_client():
    """Mock Stripe client for testing."""
    mock = Mock()
    mock.payment_intents = Mock()
    mock.refunds = Mock()
    mock.payment_methods = Mock()
    mock.subscriptions = Mock()
    return mock

@pytest.fixture
def mock_paypal_client():
    """Mock PayPal client for testing."""
    mock = Mock()
    mock.orders = Mock()
    return mock