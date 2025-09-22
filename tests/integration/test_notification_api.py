"""
Integration Tests for Notification API
Testing notification endpoints, multi-channel integration, and templating.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, Mock, AsyncMock
import json

from fastapi.testclient import TestClient
from backend.main import app

class TestNotificationAPIIntegration:
    """Integration test suite for Notification API endpoints."""

    @pytest.fixture
    def client(self):
        """Create FastAPI test client."""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self, client):
        """Get authentication headers."""
        return {
            'Authorization': 'Bearer test_notification_token',
            'Content-Type': 'application/json'
        }

    @pytest.fixture
    def sample_email_notification(self):
        """Sample email notification data."""
        return {
            'type': 'email',
            'recipient': 'customer@example.com',
            'subject': 'Booking Confirmation - Your Trip to Paris',
            'content': 'Your booking has been confirmed! Trip details attached.',
            'template': 'booking_confirmation',
            'template_data': {
                'customer_name': 'John Doe',
                'booking_id': 'BOOK123456',
                'destination': 'Paris, France',
                'checkin_date': '2024-12-15',
                'checkout_date': '2024-12-22',
                'total_amount': '€2,500'
            },
            'priority': 'medium',
            'metadata': {
                'booking_id': 'BOOK123456',
                'business_model': 'B2C'
            }
        }

    @pytest.fixture
    def sample_sms_notification(self):
        """Sample SMS notification data."""
        return {
            'type': 'sms',
            'recipient': '+34612345678',
            'content': 'Your booking BOOK123456 for Paris is confirmed! Check-in: Dec 15. Have a great trip!',
            'priority': 'high',
            'metadata': {
                'booking_id': 'BOOK123456',
                'notification_category': 'booking_confirmation'
            }
        }

    def test_notification_endpoint_unauthorized(self, client, sample_email_notification):
        """Test notification endpoint without authentication."""
        response = client.post('/api/notifications/send', json=sample_email_notification)
        assert response.status_code == 401

    def test_send_email_notification_success(self, client, auth_headers, sample_email_notification):
        """Test successful email notification sending."""
        with patch('aiosmtplib.send') as mock_send:
            mock_send.return_value = {'status': 'sent', 'message_id': 'email_123'}
            
            response = client.post(
                '/api/notifications/send',
                json=sample_email_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['notification_id'] is not None
            assert data['status'] == 'sent'
            assert data['provider'] == 'smtp'

    def test_send_sms_notification_success(self, client, auth_headers, sample_sms_notification):
        """Test successful SMS notification sending."""
        mock_message = Mock()
        mock_message.sid = 'SM123456789abcdef'
        mock_message.status = 'sent'
        
        with patch('twilio.rest.Client') as mock_twilio:
            mock_client = Mock()
            mock_client.messages.create.return_value = mock_message
            mock_twilio.return_value = mock_client
            
            response = client.post(
                '/api/notifications/send',
                json=sample_sms_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['external_id'] == 'SM123456789abcdef'
            assert data['provider'] == 'twilio'

    def test_send_push_notification_success(self, client, auth_headers):
        """Test successful push notification sending."""
        push_notification = {
            'type': 'push',
            'recipient': 'device_token_firebase_123',
            'title': 'Booking Confirmed!',
            'content': 'Your Paris trip is confirmed. Tap for details.',
            'metadata': {
                'booking_id': 'BOOK123456',
                'click_action': 'OPEN_BOOKING_DETAILS',
                'icon': 'booking_confirmed'
            },
            'priority': 'high'
        }
        
        with patch('firebase_admin.messaging.send') as mock_send:
            mock_send.return_value = 'projects/spirittours/messages/msg123'
            
            response = client.post(
                '/api/notifications/send',
                json=push_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['provider'] == 'firebase'

    def test_send_whatsapp_notification_success(self, client, auth_headers):
        """Test successful WhatsApp notification sending."""
        whatsapp_notification = {
            'type': 'whatsapp',
            'recipient': '+34612345678',
            'content': '¡Hola! Tu reserva BOOK123456 para París está confirmada. ¡Buen viaje!',
            'priority': 'medium',
            'metadata': {
                'language': 'es',
                'booking_id': 'BOOK123456'
            }
        }
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'messages': [{'id': 'whatsapp_msg_789'}]
        }
        
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.return_value.__aenter__.return_value = mock_response
            
            response = client.post(
                '/api/notifications/send',
                json=whatsapp_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['external_id'] == 'whatsapp_msg_789'

    def test_notification_validation_error(self, client, auth_headers):
        """Test notification validation errors."""
        invalid_notification = {
            'type': 'email',
            'recipient': 'invalid-email-format',  # Invalid email
            'subject': '',  # Empty subject
            'content': 'Test content'
        }
        
        response = client.post(
            '/api/notifications/send',
            json=invalid_notification,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    def test_notification_template_rendering(self, client, auth_headers):
        """Test notification template rendering integration."""
        template_notification = {
            'type': 'email',
            'recipient': 'customer@example.com',
            'template': 'booking_confirmation',
            'template_data': {
                'customer_name': 'Maria Garcia',
                'booking_id': 'BOOK789012',
                'destination': 'Barcelona',
                'checkin_date': '2024-11-20',
                'total_amount': '€1,800'
            },
            'priority': 'medium'
        }
        
        mock_rendered_content = """
        <html>
        <body>
            <h1>Booking Confirmation</h1>
            <p>Dear Maria Garcia,</p>
            <p>Your booking BOOK789012 for Barcelona is confirmed!</p>
            <p>Check-in: 2024-11-20</p>
            <p>Total: €1,800</p>
        </body>
        </html>
        """
        
        with patch('backend.services.notification_service.NotificationService._render_template') as mock_render:
            mock_render.return_value = mock_rendered_content
            
            with patch('aiosmtplib.send') as mock_send:
                mock_send.return_value = {'status': 'sent'}
                
                response = client.post(
                    '/api/notifications/send',
                    json=template_notification,
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data['success'] is True
                mock_render.assert_called_once()

    def test_bulk_notifications_sending(self, client, auth_headers):
        """Test bulk notification sending."""
        bulk_notifications = {
            'notifications': [
                {
                    'type': 'email',
                    'recipient': f'customer{i}@example.com',
                    'subject': f'Newsletter #{i}',
                    'content': f'Newsletter content for customer {i}',
                    'priority': 'low'
                }
                for i in range(5)
            ]
        }
        
        with patch('aiosmtplib.send') as mock_send:
            mock_send.return_value = {'status': 'sent'}
            
            response = client.post(
                '/api/notifications/send-bulk',
                json=bulk_notifications,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_sent'] == 5
            assert len(data['results']) == 5
            
            # All should succeed
            for result in data['results']:
                assert result['success'] is True

    def test_schedule_notification(self, client, auth_headers, sample_email_notification):
        """Test notification scheduling."""
        scheduled_time = (datetime.now() + timedelta(hours=2)).isoformat()
        sample_email_notification['scheduled_time'] = scheduled_time
        
        with patch('backend.services.notification_service.NotificationService.schedule_notification') as mock_schedule:
            mock_schedule.return_value = {
                'success': True,
                'notification_id': 'scheduled_123',
                'status': 'scheduled',
                'scheduled_time': scheduled_time
            }
            
            response = client.post(
                '/api/notifications/schedule',
                json=sample_email_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['status'] == 'scheduled'
            assert data['notification_id'] == 'scheduled_123'

    def test_cancel_scheduled_notification(self, client, auth_headers):
        """Test canceling scheduled notification."""
        notification_id = 'scheduled_notification_456'
        
        with patch('backend.services.notification_service.NotificationService.cancel_notification') as mock_cancel:
            mock_cancel.return_value = True
            
            response = client.delete(
                f'/api/notifications/scheduled/{notification_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['cancelled'] is True
            assert data['notification_id'] == notification_id

    def test_notification_status_tracking(self, client, auth_headers):
        """Test notification status tracking."""
        notification_id = 'notification_tracking_789'
        
        with patch('backend.services.notification_service.NotificationService.get_notification_status') as mock_status:
            mock_status.return_value = 'delivered'
            
            response = client.get(
                f'/api/notifications/status/{notification_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['notification_id'] == notification_id
            assert data['status'] == 'delivered'

    def test_notification_history(self, client, auth_headers):
        """Test notification history retrieval."""
        user_id = 'user_123'
        
        mock_history = [
            {
                'notification_id': 'notif_001',
                'type': 'email',
                'recipient': 'user@example.com',
                'subject': 'Booking Confirmed',
                'status': 'delivered',
                'sent_at': datetime.now().isoformat()
            },
            {
                'notification_id': 'notif_002',
                'type': 'sms',
                'recipient': '+34612345678',
                'content': 'Your trip reminder',
                'status': 'sent',
                'sent_at': (datetime.now() - timedelta(hours=2)).isoformat()
            }
        ]
        
        with patch('backend.services.notification_service.NotificationService.get_notification_history') as mock_history_call:
            mock_history_call.return_value = mock_history
            
            response = client.get(
                f'/api/notifications/history/{user_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['notifications']) == 2
            assert data['notifications'][0]['notification_id'] == 'notif_001'

    def test_notification_preferences(self, client, auth_headers):
        """Test user notification preferences management."""
        user_id = 'user_preferences_test'
        preferences = {
            'email': True,
            'sms': False,
            'push': True,
            'whatsapp': True,
            'email_frequency': 'daily',
            'sms_emergency_only': True
        }
        
        # Test updating preferences
        response = client.put(
            f'/api/notifications/preferences/{user_id}',
            json=preferences,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['updated'] is True
        
        # Test retrieving preferences
        with patch('backend.services.notification_service.NotificationService.get_user_preferences') as mock_get_prefs:
            mock_get_prefs.return_value = preferences
            
            response = client.get(
                f'/api/notifications/preferences/{user_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['email'] is True
            assert data['sms'] is False

    def test_notification_analytics(self, client, auth_headers):
        """Test notification analytics endpoint."""
        date_from = (datetime.now() - timedelta(days=7)).date().isoformat()
        date_to = datetime.now().date().isoformat()
        
        mock_analytics = {
            'total_sent': 1250,
            'email_sent': 800,
            'sms_sent': 200,
            'push_sent': 200,
            'whatsapp_sent': 50,
            'delivery_rate': 0.95,
            'open_rate': 0.42,
            'click_rate': 0.08,
            'unsubscribe_rate': 0.02
        }
        
        with patch('backend.services.notification_service.NotificationService.get_analytics') as mock_analytics_call:
            mock_analytics_call.return_value = mock_analytics
            
            response = client.get(
                '/api/notifications/analytics',
                params={'date_from': date_from, 'date_to': date_to},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_sent'] == 1250
            assert data['delivery_rate'] == 0.95

    def test_notification_templates_management(self, client, auth_headers):
        """Test notification templates management."""
        # Test listing templates
        mock_templates = [
            {
                'template_id': 'booking_confirmation',
                'name': 'Booking Confirmation',
                'type': 'email',
                'language': 'en',
                'subject': 'Booking Confirmed - {{destination}}',
                'content': 'Dear {{customer_name}}, your booking is confirmed!'
            },
            {
                'template_id': 'payment_receipt',
                'name': 'Payment Receipt',
                'type': 'email',
                'language': 'en',
                'subject': 'Payment Receipt - {{amount}}',
                'content': 'Thank you for your payment of {{amount}}'
            }
        ]
        
        with patch('backend.services.notification_service.NotificationService.get_templates') as mock_get_templates:
            mock_get_templates.return_value = mock_templates
            
            response = client.get(
                '/api/notifications/templates',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['templates']) == 2
            assert data['templates'][0]['template_id'] == 'booking_confirmation'

    def test_notification_failure_handling(self, client, auth_headers, sample_email_notification):
        """Test notification failure handling."""
        with patch('aiosmtplib.send', side_effect=Exception('SMTP server unavailable')):
            response = client.post(
                '/api/notifications/send',
                json=sample_email_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is False
            assert 'smtp server unavailable' in data['error_message'].lower()
            assert data['status'] == 'failed'

    def test_notification_retry_mechanism(self, client, auth_headers, sample_sms_notification):
        """Test notification retry mechanism."""
        call_count = 0
        
        def mock_create_with_retry(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception('Temporary SMS gateway error')
            
            mock_message = Mock()
            mock_message.sid = 'SM_retry_success'
            mock_message.status = 'sent'
            return mock_message
        
        sample_sms_notification['retry_config'] = {
            'max_retries': 3,
            'retry_delay': 0.1  # Fast retry for testing
        }
        
        with patch('twilio.rest.Client') as mock_twilio:
            mock_client = Mock()
            mock_client.messages.create.side_effect = mock_create_with_retry
            mock_twilio.return_value = mock_client
            
            response = client.post(
                '/api/notifications/send',
                json=sample_sms_notification,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert call_count == 3  # Should retry twice then succeed

class TestNotificationAPIPerformance:
    """Performance tests for Notification API."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_bulk_notification_performance(self, client, auth_headers):
        """Test bulk notification performance."""
        import time
        
        # Create 100 notifications
        bulk_notifications = {
            'notifications': [
                {
                    'type': 'email',
                    'recipient': f'perf_test_{i}@example.com',
                    'subject': f'Performance Test {i}',
                    'content': f'Performance test notification number {i}',
                    'priority': 'low'
                }
                for i in range(100)
            ]
        }
        
        with patch('aiosmtplib.send') as mock_send:
            mock_send.return_value = {'status': 'sent'}
            
            start_time = time.time()
            
            response = client.post(
                '/api/notifications/send-bulk',
                json=bulk_notifications,
                headers=auth_headers
            )
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_sent'] == 100
            
            # Should process 100 notifications within 10 seconds
            assert processing_time < 10.0
            
            # Calculate throughput
            throughput = 100 / processing_time
            assert throughput >= 20.0  # At least 20 notifications per second

    def test_notification_api_concurrent_requests(self, client, auth_headers):
        """Test concurrent notification requests."""
        import concurrent.futures
        import time
        
        def send_notification(i):
            notification_data = {
                'type': 'email',
                'recipient': f'concurrent_test_{i}@example.com',
                'subject': f'Concurrent Test {i}',
                'content': f'Concurrent notification test {i}',
                'priority': 'medium'
            }
            
            with patch('aiosmtplib.send') as mock_send:
                mock_send.return_value = {'status': 'sent'}
                
                return client.post(
                    '/api/notifications/send',
                    json=notification_data,
                    headers=auth_headers
                )
        
        start_time = time.time()
        
        # Send 20 concurrent notifications
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(send_notification, i) for i in range(20)]
            responses = [future.result() for future in futures]
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should handle 20 concurrent requests within 5 seconds
        assert processing_time < 5.0
        
        # All requests should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count == 20