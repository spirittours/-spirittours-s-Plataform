"""
Unit Tests for Payment Service
Comprehensive testing for payment processing, refunds, and financial operations.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch

from backend.services.payment_service import (
    PaymentService, PaymentProvider, PaymentStatus,
    PaymentRequest, RefundRequest, PaymentResponse
)

class TestPaymentService:
    """Test suite for PaymentService."""

    @pytest.fixture
    def payment_service(self):
        """Create payment service instance."""
        return PaymentService()

    @pytest.fixture
    def sample_payment_request(self):
        """Create sample payment request."""
        return PaymentRequest(
            amount=Decimal('100.00'),
            currency='EUR',
            payment_method='card',
            provider='stripe',
            customer_email='test@example.com',
            description='Test payment',
            metadata={'booking_id': '123'}
        )

    @pytest.mark.asyncio
    async def test_process_payment_stripe_success(self, payment_service, sample_payment_request, mock_stripe):
        """Test successful Stripe payment processing."""
        with patch('stripe.PaymentIntent.create', return_value=mock_stripe.PaymentIntent.create.return_value):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is True
            assert result.transaction_id is not None
            assert result.amount == sample_payment_request.amount
            assert result.currency == sample_payment_request.currency

    @pytest.mark.asyncio
    async def test_process_payment_paypal_success(self, payment_service, sample_payment_request):
        """Test successful PayPal payment processing."""
        sample_payment_request.provider = 'paypal'
        
        with patch('paypalrestsdk.Payment.create', return_value=True) as mock_create:
            mock_payment = Mock()
            mock_payment.id = 'PAY-123456789'
            mock_payment.state = 'approved'
            mock_create.return_value = mock_payment
            
            result = await payment_service.process_payment(sample_payment_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is True
            assert result.transaction_id == 'PAY-123456789'
            assert result.provider == PaymentProvider.PAYPAL

    @pytest.mark.asyncio
    async def test_process_payment_stripe_failure(self, payment_service, sample_payment_request):
        """Test Stripe payment failure handling."""
        with patch('stripe.PaymentIntent.create', side_effect=Exception('Card declined')):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is False
            assert 'Card declined' in result.error_message
            assert result.status == PaymentStatus.FAILED

    @pytest.mark.asyncio
    async def test_process_payment_invalid_provider(self, payment_service, sample_payment_request):
        """Test payment with invalid provider."""
        sample_payment_request.provider = 'invalid_provider'
        
        with pytest.raises(ValueError, match="Unsupported payment provider"):
            await payment_service.process_payment(sample_payment_request)

    @pytest.mark.asyncio
    async def test_process_payment_invalid_amount(self, payment_service, sample_payment_request):
        """Test payment with invalid amount."""
        sample_payment_request.amount = Decimal('0.00')
        
        with pytest.raises(ValueError, match="Amount must be greater than zero"):
            await payment_service.process_payment(sample_payment_request)

    @pytest.mark.asyncio
    async def test_process_refund_stripe_success(self, payment_service):
        """Test successful Stripe refund processing."""
        refund_request = RefundRequest(
            transaction_id='pi_test_123',
            amount=Decimal('50.00'),
            currency='EUR',
            reason='customer_request',
            provider='stripe'
        )
        
        mock_refund = Mock()
        mock_refund.id = 're_test_123'
        mock_refund.status = 'succeeded'
        mock_refund.amount = 5000  # Stripe uses cents
        
        with patch('stripe.Refund.create', return_value=mock_refund):
            result = await payment_service.process_refund(refund_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is True
            assert result.transaction_id == 're_test_123'
            assert result.amount == Decimal('50.00')

    @pytest.mark.asyncio
    async def test_process_refund_paypal_success(self, payment_service):
        """Test successful PayPal refund processing."""
        refund_request = RefundRequest(
            transaction_id='PAY-123456789',
            amount=Decimal('25.00'),
            currency='USD',
            reason='duplicate_charge',
            provider='paypal'
        )
        
        mock_sale = Mock()
        mock_refund = Mock()
        mock_refund.id = 'RF-123456789'
        mock_refund.state = 'completed'
        mock_sale.refund.return_value = mock_refund
        
        with patch('paypalrestsdk.Sale.find', return_value=mock_sale):
            result = await payment_service.process_refund(refund_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is True
            assert result.transaction_id == 'RF-123456789'

    @pytest.mark.asyncio
    async def test_process_refund_failure(self, payment_service):
        """Test refund failure handling."""
        refund_request = RefundRequest(
            transaction_id='pi_invalid',
            amount=Decimal('100.00'),
            currency='EUR',
            reason='customer_request',
            provider='stripe'
        )
        
        with patch('stripe.Refund.create', side_effect=Exception('No such payment_intent')):
            result = await payment_service.process_refund(refund_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is False
            assert 'No such payment_intent' in result.error_message

    @pytest.mark.asyncio
    async def test_calculate_commission_b2c(self, payment_service):
        """Test commission calculation for B2C model."""
        commission = await payment_service.calculate_commission(
            amount=Decimal('1000.00'),
            business_model='B2C',
            partner_tier='standard'
        )
        
        # B2C standard commission is typically 5%
        assert commission == Decimal('50.00')

    @pytest.mark.asyncio
    async def test_calculate_commission_b2b_premium(self, payment_service):
        """Test commission calculation for B2B premium partner."""
        commission = await payment_service.calculate_commission(
            amount=Decimal('5000.00'),
            business_model='B2B',
            partner_tier='premium'
        )
        
        # B2B premium commission is typically 3%
        assert commission == Decimal('150.00')

    @pytest.mark.asyncio
    async def test_calculate_commission_b2b2c(self, payment_service):
        """Test commission calculation for B2B2C model."""
        commission = await payment_service.calculate_commission(
            amount=Decimal('2000.00'),
            business_model='B2B2C',
            partner_tier='enterprise'
        )
        
        # B2B2C enterprise commission is typically 2%
        assert commission == Decimal('40.00')

    @pytest.mark.asyncio
    async def test_get_payment_history(self, payment_service, db_session):
        """Test retrieving payment history."""
        customer_id = 'customer_123'
        
        # Mock database query results
        mock_payments = [
            {
                'id': 1,
                'transaction_id': 'pi_123',
                'amount': Decimal('100.00'),
                'currency': 'EUR',
                'status': 'succeeded',
                'created_at': datetime.now()
            },
            {
                'id': 2,
                'transaction_id': 'pi_456',
                'amount': Decimal('200.00'),
                'currency': 'EUR',
                'status': 'succeeded',
                'created_at': datetime.now() - timedelta(days=1)
            }
        ]
        
        with patch.object(payment_service, '_get_payments_from_db', return_value=mock_payments):
            history = await payment_service.get_payment_history(
                customer_id=customer_id,
                limit=10,
                offset=0
            )
            
            assert len(history) == 2
            assert history[0]['transaction_id'] == 'pi_123'
            assert history[1]['transaction_id'] == 'pi_456'

    @pytest.mark.asyncio
    async def test_validate_payment_webhook_stripe(self, payment_service):
        """Test Stripe webhook validation."""
        payload = '{"id": "evt_test_webhook", "object": "event"}'
        signature = 'test_signature'
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = {
                'id': 'evt_test_webhook',
                'type': 'payment_intent.succeeded',
                'data': {'object': {'id': 'pi_test_123'}}
            }
            
            result = await payment_service.validate_webhook(
                payload=payload,
                signature=signature,
                provider='stripe'
            )
            
            assert result is True
            mock_construct.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_payment_webhook_invalid_signature(self, payment_service):
        """Test webhook validation with invalid signature."""
        payload = '{"id": "evt_test_webhook"}'
        signature = 'invalid_signature'
        
        with patch('stripe.Webhook.construct_event', side_effect=Exception('Invalid signature')):
            result = await payment_service.validate_webhook(
                payload=payload,
                signature=signature,
                provider='stripe'
            )
            
            assert result is False

    @pytest.mark.asyncio
    async def test_payment_retry_logic(self, payment_service, sample_payment_request):
        """Test payment retry mechanism for temporary failures."""
        # Mock temporary failure followed by success
        call_count = 0
        
        def mock_create(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception('Temporary network error')
            else:
                mock_intent = Mock()
                mock_intent.id = 'pi_retry_success'
                mock_intent.status = 'succeeded'
                mock_intent.amount = 10000
                return mock_intent
        
        with patch('stripe.PaymentIntent.create', side_effect=mock_create):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert result.success is True
            assert result.transaction_id == 'pi_retry_success'
            assert call_count == 2  # Should retry once

    @pytest.mark.asyncio
    async def test_currency_conversion_support(self, payment_service):
        """Test multi-currency payment support."""
        currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD']
        
        for currency in currencies:
            payment_request = PaymentRequest(
                amount=Decimal('100.00'),
                currency=currency,
                payment_method='card',
                provider='stripe',
                customer_email='test@example.com',
                description=f'Test payment in {currency}'
            )
            
            with patch('stripe.PaymentIntent.create') as mock_create:
                mock_intent = Mock()
                mock_intent.id = f'pi_{currency.lower()}'
                mock_intent.status = 'succeeded'
                mock_intent.amount = 10000
                mock_intent.currency = currency.lower()
                mock_create.return_value = mock_intent
                
                result = await payment_service.process_payment(payment_request)
                
                assert result.success is True
                assert result.currency == currency

    @pytest.mark.asyncio
    async def test_payment_metadata_handling(self, payment_service, sample_payment_request):
        """Test payment metadata storage and retrieval."""
        metadata = {
            'booking_id': 'book_123',
            'customer_id': 'cust_456',
            'package_type': 'premium',
            'referral_code': 'REF2024'
        }
        sample_payment_request.metadata = metadata
        
        mock_intent = Mock()
        mock_intent.id = 'pi_metadata_test'
        mock_intent.status = 'succeeded'
        mock_intent.amount = 10000
        mock_intent.metadata = metadata
        
        with patch('stripe.PaymentIntent.create', return_value=mock_intent):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert result.success is True
            assert result.metadata == metadata

    @pytest.mark.asyncio
    async def test_payment_performance_benchmark(self, payment_service, sample_payment_request):
        """Test payment processing performance."""
        import time
        
        mock_intent = Mock()
        mock_intent.id = 'pi_perf_test'
        mock_intent.status = 'succeeded'
        mock_intent.amount = 10000
        
        with patch('stripe.PaymentIntent.create', return_value=mock_intent):
            start_time = time.time()
            result = await payment_service.process_payment(sample_payment_request)
            end_time = time.time()
            
            processing_time = end_time - start_time
            
            assert result.success is True
            assert processing_time < 2.0  # Should process within 2 seconds
            
    @pytest.mark.asyncio
    async def test_concurrent_payment_processing(self, payment_service):
        """Test concurrent payment processing capabilities."""
        payment_requests = []
        for i in range(5):
            request = PaymentRequest(
                amount=Decimal('50.00'),
                currency='EUR',
                payment_method='card',
                provider='stripe',
                customer_email=f'test{i}@example.com',
                description=f'Concurrent test {i}'
            )
            payment_requests.append(request)
        
        mock_intent = Mock()
        mock_intent.id = 'pi_concurrent'
        mock_intent.status = 'succeeded'
        mock_intent.amount = 5000
        
        with patch('stripe.PaymentIntent.create', return_value=mock_intent):
            # Process payments concurrently
            tasks = [payment_service.process_payment(req) for req in payment_requests]
            results = await asyncio.gather(*tasks)
            
            # All payments should succeed
            for result in results:
                assert result.success is True
                assert result.transaction_id == 'pi_concurrent'

    @pytest.mark.asyncio
    async def test_payment_fraud_detection(self, payment_service, sample_payment_request):
        """Test basic fraud detection mechanisms."""
        # Test suspicious amount patterns
        sample_payment_request.amount = Decimal('9999.99')  # Suspicious round number
        sample_payment_request.metadata = {'risk_score': 'high'}
        
        with patch.object(payment_service, '_check_fraud_rules') as mock_fraud_check:
            mock_fraud_check.return_value = True  # Flagged as fraudulent
            
            result = await payment_service.process_payment(sample_payment_request)
            
            assert result.success is False
            assert 'fraud' in result.error_message.lower()
            mock_fraud_check.assert_called_once()

    def test_payment_service_initialization(self):
        """Test proper PaymentService initialization."""
        service = PaymentService()
        
        assert service is not None
        assert hasattr(service, 'process_payment')
        assert hasattr(service, 'process_refund')
        assert hasattr(service, 'calculate_commission')
        
    def test_payment_request_validation(self):
        """Test PaymentRequest model validation."""
        # Valid request
        valid_request = PaymentRequest(
            amount=Decimal('100.00'),
            currency='EUR',
            payment_method='card',
            provider='stripe',
            customer_email='valid@example.com',
            description='Valid payment'
        )
        assert valid_request.amount == Decimal('100.00')
        assert valid_request.currency == 'EUR'
        
        # Invalid email format
        with pytest.raises(ValueError):
            PaymentRequest(
                amount=Decimal('100.00'),
                currency='EUR',
                payment_method='card',
                provider='stripe',
                customer_email='invalid-email',  # Invalid format
                description='Invalid payment'
            )

    def test_refund_request_validation(self):
        """Test RefundRequest model validation."""
        # Valid refund request
        valid_refund = RefundRequest(
            transaction_id='pi_valid_123',
            amount=Decimal('50.00'),
            currency='EUR',
            reason='customer_request',
            provider='stripe'
        )
        assert valid_refund.amount == Decimal('50.00')
        assert valid_refund.reason == 'customer_request'
        
        # Invalid reason
        with pytest.raises(ValueError):
            RefundRequest(
                transaction_id='pi_valid_123',
                amount=Decimal('50.00'),
                currency='EUR',
                reason='invalid_reason',  # Not in allowed reasons
                provider='stripe'
            )

    @pytest.mark.asyncio
    async def test_payment_status_tracking(self, payment_service):
        """Test payment status tracking and updates."""
        transaction_id = 'pi_status_test'
        
        with patch.object(payment_service, '_get_payment_status') as mock_status:
            mock_status.return_value = PaymentStatus.PROCESSING
            
            status = await payment_service.get_payment_status(transaction_id)
            assert status == PaymentStatus.PROCESSING
            mock_status.assert_called_once_with(transaction_id)

    @pytest.mark.asyncio
    async def test_payment_error_logging(self, payment_service, sample_payment_request):
        """Test proper error logging for failed payments."""
        with patch('stripe.PaymentIntent.create', side_effect=Exception('Network error')):
            with patch('backend.services.payment_service.logger') as mock_logger:
                result = await payment_service.process_payment(sample_payment_request)
                
                assert result.success is False
                mock_logger.error.assert_called()
                
    @pytest.mark.asyncio
    async def test_payment_analytics_integration(self, payment_service, sample_payment_request):
        """Test integration with analytics service for payment tracking."""
        mock_intent = Mock()
        mock_intent.id = 'pi_analytics_test'
        mock_intent.status = 'succeeded'
        mock_intent.amount = 10000
        
        with patch('stripe.PaymentIntent.create', return_value=mock_intent):
            with patch.object(payment_service, '_track_payment_analytics') as mock_analytics:
                result = await payment_service.process_payment(sample_payment_request)
                
                assert result.success is True
                mock_analytics.assert_called_once()
                
# Additional test fixtures and utilities
class TestPaymentProviders:
    """Test suite for payment provider integrations."""
    
    def test_stripe_provider_config(self):
        """Test Stripe provider configuration."""
        from backend.services.payment_service import StripeProvider
        
        provider = StripeProvider()
        assert provider.name == 'stripe'
        assert hasattr(provider, 'create_payment')
        assert hasattr(provider, 'create_refund')
        
    def test_paypal_provider_config(self):
        """Test PayPal provider configuration."""
        from backend.services.payment_service import PayPalProvider
        
        provider = PayPalProvider()
        assert provider.name == 'paypal'
        assert hasattr(provider, 'create_payment')
        assert hasattr(provider, 'create_refund')
        
class TestPaymentModels:
    """Test suite for payment data models."""
    
    def test_payment_response_model(self):
        """Test PaymentResponse data model."""
        response = PaymentResponse(
            success=True,
            transaction_id='pi_test_123',
            amount=Decimal('100.00'),
            currency='EUR',
            status=PaymentStatus.SUCCEEDED,
            provider=PaymentProvider.STRIPE,
            created_at=datetime.now(),
            metadata={'test': 'data'}
        )
        
        assert response.success is True
        assert response.transaction_id == 'pi_test_123'
        assert response.amount == Decimal('100.00')
        assert response.currency == 'EUR'
        assert response.status == PaymentStatus.SUCCEEDED
        assert response.provider == PaymentProvider.STRIPE
        assert response.metadata == {'test': 'data'}
        
    def test_payment_status_enum(self):
        """Test PaymentStatus enumeration."""
        assert PaymentStatus.PENDING.value == 'pending'
        assert PaymentStatus.PROCESSING.value == 'processing'
        assert PaymentStatus.SUCCEEDED.value == 'succeeded'
        assert PaymentStatus.FAILED.value == 'failed'
        assert PaymentStatus.CANCELLED.value == 'cancelled'
        assert PaymentStatus.REFUNDED.value == 'refunded'
        
    def test_payment_provider_enum(self):
        """Test PaymentProvider enumeration."""
        assert PaymentProvider.STRIPE.value == 'stripe'
        assert PaymentProvider.PAYPAL.value == 'paypal'

# Performance and load testing utilities
class TestPaymentPerformance:
    """Performance testing for payment operations."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_payment_throughput(self, payment_service):
        """Test payment processing throughput."""
        import time
        
        # Create multiple payment requests
        requests = []
        for i in range(100):
            request = PaymentRequest(
                amount=Decimal('10.00'),
                currency='EUR',
                payment_method='card',
                provider='stripe',
                customer_email=f'perf_test_{i}@example.com',
                description=f'Performance test {i}'
            )
            requests.append(request)
        
        mock_intent = Mock()
        mock_intent.id = 'pi_throughput_test'
        mock_intent.status = 'succeeded'
        mock_intent.amount = 1000
        
        with patch('stripe.PaymentIntent.create', return_value=mock_intent):
            start_time = time.time()
            
            # Process in batches of 10
            for i in range(0, len(requests), 10):
                batch = requests[i:i+10]
                tasks = [payment_service.process_payment(req) for req in batch]
                await asyncio.gather(*tasks)
            
            end_time = time.time()
            total_time = end_time - start_time
            throughput = len(requests) / total_time
            
            # Should process at least 20 payments per second
            assert throughput >= 20.0
            
    @pytest.mark.asyncio
    async def test_memory_usage_efficiency(self, payment_service):
        """Test memory efficiency during payment processing."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Process many payments
        mock_intent = Mock()
        mock_intent.id = 'pi_memory_test'
        mock_intent.status = 'succeeded'
        mock_intent.amount = 5000
        
        with patch('stripe.PaymentIntent.create', return_value=mock_intent):
            for i in range(50):
                request = PaymentRequest(
                    amount=Decimal('50.00'),
                    currency='EUR',
                    payment_method='card',
                    provider='stripe',
                    customer_email=f'memory_test_{i}@example.com',
                    description=f'Memory test {i}'
                )
                await payment_service.process_payment(request)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100 * 1024 * 1024  # 100MB in bytes
    async def test_process_payment_stripe_failure(self, payment_service, sample_payment_request):
        """Test failed Stripe payment processing."""
        with patch('stripe.PaymentIntent.create', side_effect=Exception("Card declined")):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert isinstance(result, PaymentResponse)
            assert result.success is False
            assert "Card declined" in result.error_message

    @pytest.mark.asyncio
    async def test_process_payment_paypal_success(self, payment_service, sample_payment_request):
        """Test successful PayPal payment processing."""
        sample_payment_request.provider = 'paypal'
        
        mock_paypal_response = Mock()
        mock_paypal_response.result.id = 'PAYPAL123'
        mock_paypal_response.result.status = 'COMPLETED'
        
        with patch('paypalcheckoutsdk.orders.OrdersCreateRequest') as mock_create, \
             patch('paypalcheckoutsdk.orders.OrdersCaptureRequest') as mock_capture:
            
            mock_client = Mock()
            mock_client.execute.return_value = mock_paypal_response
            
            with patch.object(payment_service, '_get_paypal_client', return_value=mock_client):
                result = await payment_service.process_payment(sample_payment_request)
                
                assert isinstance(result, PaymentResponse)
                assert result.success is True
                assert result.transaction_id == 'PAYPAL123'

    @pytest.mark.asyncio
    async def test_process_refund_success(self, payment_service):
        """Test successful refund processing."""
        refund_request = RefundRequest(
            transaction_id='pi_test_123',
            amount=Decimal('50.00'),
            currency='EUR',
            provider='stripe',
            reason='customer_request'
        )
        
        mock_refund = Mock()
        mock_refund.id = 're_test_123'
        mock_refund.status = 'succeeded'
        mock_refund.amount = 5000  # Stripe amounts in cents
        
        with patch('stripe.Refund.create', return_value=mock_refund):
            result = await payment_service.process_refund(refund_request)
            
            assert result.success is True
            assert result.refund_id == 're_test_123'
            assert result.amount == refund_request.amount

    @pytest.mark.asyncio
    async def test_process_refund_failure(self, payment_service):
        """Test failed refund processing."""
        refund_request = RefundRequest(
            transaction_id='invalid_id',
            amount=Decimal('50.00'),
            currency='EUR',
            provider='stripe',
            reason='customer_request'
        )
        
        with patch('stripe.Refund.create', side_effect=Exception("Invalid payment intent")):
            result = await payment_service.process_refund(refund_request)
            
            assert result.success is False
            assert "Invalid payment intent" in result.error_message

    def test_calculate_commission_b2c(self, payment_service):
        """Test commission calculation for B2C transactions."""
        amount = Decimal('100.00')
        business_model = 'b2c'
        
        commission = payment_service.calculate_commission(amount, business_model)
        
        assert commission == Decimal('0.00')  # No commission for B2C

    def test_calculate_commission_b2b_tour_operator(self, payment_service):
        """Test commission calculation for B2B tour operator."""
        amount = Decimal('100.00')
        business_model = 'tour_operator'
        
        commission = payment_service.calculate_commission(amount, business_model)
        
        assert commission == Decimal('10.00')  # 10% for tour operators

    def test_calculate_commission_b2b_travel_agency(self, payment_service):
        """Test commission calculation for B2B travel agency."""
        amount = Decimal('100.00')
        business_model = 'travel_agency'
        
        commission = payment_service.calculate_commission(amount, business_model)
        
        assert commission == Decimal('8.00')  # 8% for travel agencies

    @pytest.mark.asyncio
    async def test_validate_payment_request_valid(self, payment_service, sample_payment_request):
        """Test payment request validation with valid data."""
        is_valid, errors = await payment_service.validate_payment_request(sample_payment_request)
        
        assert is_valid is True
        assert len(errors) == 0

    @pytest.mark.asyncio
    async def test_validate_payment_request_invalid_amount(self, payment_service, sample_payment_request):
        """Test payment request validation with invalid amount."""
        sample_payment_request.amount = Decimal('0.00')
        
        is_valid, errors = await payment_service.validate_payment_request(sample_payment_request)
        
        assert is_valid is False
        assert any("amount" in error.lower() for error in errors)

    @pytest.mark.asyncio
    async def test_validate_payment_request_invalid_currency(self, payment_service, sample_payment_request):
        """Test payment request validation with invalid currency."""
        sample_payment_request.currency = 'INVALID'
        
        is_valid, errors = await payment_service.validate_payment_request(sample_payment_request)
        
        assert is_valid is False
        assert any("currency" in error.lower() for error in errors)

    @pytest.mark.asyncio
    async def test_get_payment_status(self, payment_service):
        """Test payment status retrieval."""
        transaction_id = 'pi_test_123'
        
        mock_payment = Mock()
        mock_payment.status = 'succeeded'
        mock_payment.amount = 10000
        mock_payment.currency = 'eur'
        
        with patch('stripe.PaymentIntent.retrieve', return_value=mock_payment):
            status = await payment_service.get_payment_status(transaction_id, 'stripe')
            
            assert status == PaymentStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_get_supported_currencies(self, payment_service):
        """Test supported currencies retrieval."""
        currencies = await payment_service.get_supported_currencies('stripe')
        
        assert isinstance(currencies, list)
        assert 'EUR' in currencies
        assert 'USD' in currencies

    @pytest.mark.asyncio
    async def test_get_payment_methods(self, payment_service):
        """Test payment methods retrieval."""
        methods = await payment_service.get_payment_methods('stripe')
        
        assert isinstance(methods, list)
        assert any(method['type'] == 'card' for method in methods)

class TestPaymentServiceErrorHandling:
    """Test error handling in payment service."""

    @pytest.fixture
    def payment_service(self):
        """Create payment service instance."""
        return PaymentService()

    @pytest.mark.asyncio
    async def test_network_error_handling(self, payment_service, sample_payment_request):
        """Test handling of network errors during payment processing."""
        with patch('stripe.PaymentIntent.create', side_effect=ConnectionError("Network error")):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert result.success is False
            assert "network" in result.error_message.lower()

    @pytest.mark.asyncio
    async def test_invalid_api_key_handling(self, payment_service, sample_payment_request):
        """Test handling of invalid API key errors."""
        import stripe
        
        with patch('stripe.PaymentIntent.create', side_effect=stripe.error.AuthenticationError("Invalid API key")):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert result.success is False
            assert "authentication" in result.error_message.lower()

    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, payment_service, sample_payment_request):
        """Test handling of rate limit errors."""
        import stripe
        
        with patch('stripe.PaymentIntent.create', side_effect=stripe.error.RateLimitError("Rate limit exceeded")):
            result = await payment_service.process_payment(sample_payment_request)
            
            assert result.success is False
            assert "rate limit" in result.error_message.lower()

class TestPaymentServicePerformance:
    """Test payment service performance."""

    @pytest.fixture
    def payment_service(self):
        """Create payment service instance."""
        return PaymentService()

    @pytest.mark.asyncio
    async def test_concurrent_payment_processing(self, payment_service):
        """Test concurrent payment processing performance."""
        payment_requests = []
        for i in range(10):
            request = PaymentRequest(
                amount=Decimal(f'{100 + i}.00'),
                currency='EUR',
                payment_method='card',
                provider='stripe',
                customer_email=f'test{i}@example.com',
                description=f'Concurrent test payment {i}',
                metadata={'test_id': str(i)}
            )
            payment_requests.append(request)
        
        # Mock successful responses
        mock_response = Mock()
        mock_response.id = 'pi_test_concurrent'
        mock_response.status = 'succeeded'
        
        with patch('stripe.PaymentIntent.create', return_value=mock_response):
            start_time = asyncio.get_event_loop().time()
            
            tasks = [payment_service.process_payment(req) for req in payment_requests]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            end_time = asyncio.get_event_loop().time()
            total_time = end_time - start_time
        
        # All payments should complete successfully
        successful_payments = [r for r in results if isinstance(r, PaymentResponse) and r.success]
        assert len(successful_payments) == len(payment_requests)
        
        # Should complete within reasonable time
        assert total_time < 5.0  # 5 seconds for 10 concurrent payments

    @pytest.mark.asyncio
    async def test_payment_validation_performance(self, payment_service):
        """Test payment validation performance."""
        requests = []
        for i in range(100):
            request = PaymentRequest(
                amount=Decimal('100.00'),
                currency='EUR',
                payment_method='card',
                provider='stripe',
                customer_email=f'perf{i}@example.com',
                description=f'Performance test {i}'
            )
            requests.append(request)
        
        start_time = asyncio.get_event_loop().time()
        
        validation_tasks = [payment_service.validate_payment_request(req) for req in requests]
        results = await asyncio.gather(*validation_tasks)
        
        end_time = asyncio.get_event_loop().time()
        total_time = end_time - start_time
        
        # All validations should pass
        assert all(result[0] for result in results)
        
        # Should complete quickly
        assert total_time < 1.0  # 1 second for 100 validations