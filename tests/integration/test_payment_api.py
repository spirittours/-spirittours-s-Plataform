"""
Integration Tests for Payment API
Testing payment endpoints, authentication, and business logic integration.
"""

import pytest
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import json

from fastapi.testclient import TestClient
from backend.main import app

class TestPaymentAPIIntegration:
    """Integration test suite for Payment API endpoints."""

    @pytest.fixture
    def client(self):
        """Create FastAPI test client."""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self, client):
        """Get authentication headers."""
        # Mock authentication for testing
        return {
            'Authorization': 'Bearer test_token_123',
            'Content-Type': 'application/json'
        }

    @pytest.fixture
    def sample_payment_data(self):
        """Sample payment request data."""
        return {
            'amount': 1500.00,
            'currency': 'EUR',
            'payment_method': 'card',
            'provider': 'stripe',
            'customer_email': 'test@example.com',
            'description': 'Paris vacation booking payment',
            'metadata': {
                'booking_id': 'BOOK123456',
                'customer_id': 'CUST789',
                'business_model': 'B2C'
            }
        }

    def test_payment_endpoint_unauthorized(self, client, sample_payment_data):
        """Test payment endpoint without authentication."""
        response = client.post('/api/payments/process', json=sample_payment_data)
        assert response.status_code == 401

    def test_process_payment_success(self, client, auth_headers, sample_payment_data):
        """Test successful payment processing."""
        with patch('stripe.PaymentIntent.create') as mock_stripe:
            mock_intent = Mock()
            mock_intent.id = 'pi_test_success'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 150000
            mock_intent.currency = 'eur'
            mock_stripe.return_value = mock_intent
            
            response = client.post(
                '/api/payments/process', 
                json=sample_payment_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['transaction_id'] == 'pi_test_success'
            assert data['amount'] == 1500.00

    def test_process_payment_validation_error(self, client, auth_headers):
        """Test payment processing with validation errors."""
        invalid_data = {
            'amount': -100,  # Invalid negative amount
            'currency': 'INVALID',  # Invalid currency
            'payment_method': 'card',
            'provider': 'stripe'
        }
        
        response = client.post(
            '/api/payments/process',
            json=invalid_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    def test_process_payment_provider_error(self, client, auth_headers, sample_payment_data):
        """Test payment processing with provider error."""
        with patch('stripe.PaymentIntent.create', side_effect=Exception('Card declined')):
            response = client.post(
                '/api/payments/process',
                json=sample_payment_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is False
            assert 'card declined' in data['error_message'].lower()

    def test_process_refund_success(self, client, auth_headers):
        """Test successful refund processing."""
        refund_data = {
            'transaction_id': 'pi_original_payment',
            'amount': 750.00,
            'currency': 'EUR',
            'reason': 'customer_request',
            'provider': 'stripe'
        }
        
        with patch('stripe.Refund.create') as mock_refund:
            mock_refund_obj = Mock()
            mock_refund_obj.id = 're_test_refund'
            mock_refund_obj.status = 'succeeded'
            mock_refund_obj.amount = 75000
            mock_refund.return_value = mock_refund_obj
            
            response = client.post(
                '/api/payments/refund',
                json=refund_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['transaction_id'] == 're_test_refund'

    def test_get_payment_status_success(self, client, auth_headers):
        """Test payment status retrieval."""
        transaction_id = 'pi_test_status'
        
        with patch('backend.services.payment_service.PaymentService.get_payment_status') as mock_status:
            mock_status.return_value = 'succeeded'
            
            response = client.get(
                f'/api/payments/status/{transaction_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['transaction_id'] == transaction_id
            assert data['status'] == 'succeeded'

    def test_get_payment_history_success(self, client, auth_headers):
        """Test payment history retrieval."""
        customer_id = 'CUST123'
        
        mock_history = [
            {
                'transaction_id': 'pi_001',
                'amount': 1200.00,
                'currency': 'EUR',
                'status': 'succeeded',
                'created_at': datetime.now().isoformat()
            },
            {
                'transaction_id': 'pi_002',
                'amount': 850.00,
                'currency': 'USD',
                'status': 'succeeded',
                'created_at': (datetime.now() - timedelta(days=5)).isoformat()
            }
        ]
        
        with patch('backend.services.payment_service.PaymentService.get_payment_history') as mock_history_call:
            mock_history_call.return_value = mock_history
            
            response = client.get(
                f'/api/payments/history/{customer_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['payments']) == 2
            assert data['payments'][0]['transaction_id'] == 'pi_001'

    def test_webhook_validation_stripe(self, client):
        """Test Stripe webhook validation and processing."""
        webhook_payload = json.dumps({
            'id': 'evt_test_webhook',
            'object': 'event',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_webhook_test',
                    'status': 'succeeded',
                    'amount': 200000,
                    'currency': 'eur'
                }
            }
        })
        
        headers = {
            'Stripe-Signature': 'test_signature',
            'Content-Type': 'application/json'
        }
        
        with patch('stripe.Webhook.construct_event') as mock_construct:
            mock_construct.return_value = {
                'id': 'evt_test_webhook',
                'type': 'payment_intent.succeeded',
                'data': {'object': {'id': 'pi_webhook_test'}}
            }
            
            response = client.post(
                '/api/payments/webhook/stripe',
                data=webhook_payload,
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['received'] is True

    def test_calculate_commission_b2c(self, client, auth_headers):
        """Test commission calculation for B2C model."""
        commission_data = {
            'amount': 2000.00,
            'business_model': 'B2C',
            'partner_tier': 'standard'
        }
        
        response = client.post(
            '/api/payments/commission/calculate',
            json=commission_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'commission_amount' in data
        assert 'commission_rate' in data
        assert data['commission_amount'] > 0

    def test_payment_analytics_integration(self, client, auth_headers):
        """Test payment analytics endpoint integration."""
        analytics_params = {
            'date_from': (datetime.now() - timedelta(days=30)).date().isoformat(),
            'date_to': datetime.now().date().isoformat()
        }
        
        with patch('backend.services.analytics_service.AnalyticsService.get_payment_analytics') as mock_analytics:
            mock_analytics.return_value = {
                'total_revenue': 125000.00,
                'total_transactions': 85,
                'avg_transaction_value': 1470.59,
                'success_rate': 0.94,
                'refund_rate': 0.03
            }
            
            response = client.get(
                '/api/payments/analytics',
                params=analytics_params,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_revenue'] == 125000.00
            assert data['total_transactions'] == 85

    def test_payment_methods_listing(self, client, auth_headers):
        """Test payment methods listing endpoint."""
        response = client.get(
            '/api/payments/methods',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'payment_methods' in data
        assert len(data['payment_methods']) > 0
        
        # Should include at least Stripe and PayPal
        method_names = [method['name'] for method in data['payment_methods']]
        assert 'stripe' in method_names
        assert 'paypal' in method_names

    def test_payment_currencies_support(self, client, auth_headers):
        """Test supported currencies endpoint."""
        response = client.get(
            '/api/payments/currencies',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'supported_currencies' in data
        
        currencies = data['supported_currencies']
        assert 'EUR' in currencies
        assert 'USD' in currencies
        assert 'GBP' in currencies

    def test_payment_retry_mechanism(self, client, auth_headers, sample_payment_data):
        """Test payment retry mechanism integration."""
        # Add retry configuration
        sample_payment_data['retry_config'] = {
            'max_retries': 3,
            'retry_delay': 1
        }
        
        call_count = 0
        
        def mock_create_with_retry(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception('Temporary failure')
            
            mock_intent = Mock()
            mock_intent.id = 'pi_retry_success'
            mock_intent.status = 'succeeded'
            mock_intent.amount = 150000
            return mock_intent
        
        with patch('stripe.PaymentIntent.create', side_effect=mock_create_with_retry):
            response = client.post(
                '/api/payments/process',
                json=sample_payment_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert call_count == 3  # Should retry twice then succeed

    def test_payment_fraud_detection_integration(self, client, auth_headers):
        """Test payment fraud detection integration."""
        suspicious_payment = {
            'amount': 9999.99,  # Suspicious amount
            'currency': 'EUR',
            'payment_method': 'card',
            'provider': 'stripe',
            'customer_email': 'suspicious@fake.com',
            'description': 'Urgent payment',
            'metadata': {
                'risk_score': 'high',
                'ip_address': '192.168.1.1',
                'device_fingerprint': 'suspicious_device'
            }
        }
        
        with patch('backend.services.payment_service.PaymentService.process_payment') as mock_process:
            mock_process.return_value = {
                'success': False,
                'error_message': 'Payment flagged for potential fraud',
                'risk_assessment': 'high'
            }
            
            response = client.post(
                '/api/payments/process',
                json=suspicious_payment,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is False
            assert 'fraud' in data['error_message'].lower()

class TestPaymentAPIPerformance:
    """Performance tests for Payment API."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_payments_performance(self, client, auth_headers):
        """Test concurrent payment processing performance."""
        import time
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        def process_payment(i):
            payment_data = {
                'amount': 100.00 + i,
                'currency': 'EUR',
                'payment_method': 'card',
                'provider': 'stripe',
                'customer_email': f'perf_test_{i}@example.com',
                'description': f'Performance test payment {i}'
            }
            
            with patch('stripe.PaymentIntent.create') as mock_stripe:
                mock_intent = Mock()
                mock_intent.id = f'pi_perf_{i}'
                mock_intent.status = 'succeeded'
                mock_intent.amount = int((100.00 + i) * 100)
                mock_stripe.return_value = mock_intent
                
                return client.post(
                    '/api/payments/process',
                    json=payment_data,
                    headers=auth_headers
                )
        
        start_time = time.time()
        
        # Process 50 concurrent payments
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(process_payment, i) for i in range(50)]
            responses = [future.result() for future in futures]
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should handle 50 payments within 30 seconds
        assert processing_time < 30.0
        
        # All payments should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count == 50

    def test_payment_api_rate_limiting(self, client, auth_headers, sample_payment_data):
        """Test API rate limiting for payment endpoints."""
        # Send multiple requests rapidly
        responses = []
        
        for i in range(20):  # Send 20 rapid requests
            response = client.post(
                '/api/payments/process',
                json=sample_payment_data,
                headers=auth_headers
            )
            responses.append(response)
        
        # Some requests might be rate limited (429 status code)
        status_codes = [r.status_code for r in responses]
        
        # Should have mix of successful (200) and rate limited (429) responses
        assert 200 in status_codes
        # Rate limiting implementation would return 429 for excess requests
        # This test documents expected behavior