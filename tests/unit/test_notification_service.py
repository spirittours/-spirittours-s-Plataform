"""
Unit Tests for Notification Service
Comprehensive testing for email, SMS, WhatsApp, push notifications and templating.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import json
from pathlib import Path

from backend.services.notification_service import (
    NotificationService, NotificationType, NotificationPriority,
    NotificationStatus, NotificationRequest, NotificationResponse,
    EmailProvider, SMSProvider, PushProvider, WhatsAppProvider
)

class TestNotificationService:
    """Test suite for NotificationService."""

    @pytest.fixture
    def notification_service(self):
        """Create notification service instance."""
        return NotificationService()

    @pytest.fixture
    def sample_email_request(self):
        """Create sample email notification request."""
        return NotificationRequest(
            type=NotificationType.EMAIL,
            recipient='test@example.com',
            subject='Test Notification',
            content='This is a test email notification.',
            template='booking_confirmation',
            template_data={
                'customer_name': 'John Doe',
                'booking_id': 'BOOK123',
                'destination': 'Paris',
                'amount': '€1,500'
            },
            priority=NotificationPriority.MEDIUM
        )

    @pytest.fixture
    def sample_sms_request(self):
        """Create sample SMS notification request."""
        return NotificationRequest(
            type=NotificationType.SMS,
            recipient='+1234567890',
            content='Your booking BOOK123 has been confirmed. Thank you!',
            priority=NotificationPriority.HIGH
        )

    @pytest.fixture
    def sample_push_request(self):
        """Create sample push notification request."""
        return NotificationRequest(
            type=NotificationType.PUSH,
            recipient='device_token_123',
            title='Booking Confirmed',
            content='Your trip to Paris has been confirmed!',
            metadata={
                'booking_id': 'BOOK123',
                'click_action': 'BOOKING_DETAILS'
            },
            priority=NotificationPriority.MEDIUM
        )

    @pytest.mark.asyncio
    async def test_send_email_success(self, notification_service, sample_email_request):
        """Test successful email sending."""
        with patch('aiosmtplib.send') as mock_send:
            mock_send.return_value = {'status': 'sent'}
            
            result = await notification_service.send_notification(sample_email_request)
            
            assert isinstance(result, NotificationResponse)
            assert result.success is True
            assert result.status == NotificationStatus.SENT
            assert result.provider == 'smtp'
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_email_with_template(self, notification_service, sample_email_request):
        """Test email sending with template rendering."""
        # Mock template rendering
        with patch.object(notification_service, '_render_template') as mock_render:
            mock_render.return_value = '<html><body>Hello John Doe, your booking BOOK123 is confirmed!</body></html>'
            
            with patch('aiosmtplib.send') as mock_send:
                mock_send.return_value = {'status': 'sent'}
                
                result = await notification_service.send_notification(sample_email_request)
                
                assert result.success is True
                mock_render.assert_called_once_with(
                    'booking_confirmation', 
                    sample_email_request.template_data
                )

    @pytest.mark.asyncio
    async def test_send_email_failure(self, notification_service, sample_email_request):
        """Test email sending failure handling."""
        with patch('aiosmtplib.send', side_effect=Exception('SMTP connection failed')):
            result = await notification_service.send_notification(sample_email_request)
            
            assert isinstance(result, NotificationResponse)
            assert result.success is False
            assert result.status == NotificationStatus.FAILED
            assert 'SMTP connection failed' in result.error_message

    @pytest.mark.asyncio
    async def test_send_sms_success(self, notification_service, sample_sms_request):
        """Test successful SMS sending via Twilio."""
        mock_message = Mock()
        mock_message.sid = 'SM123456789'
        mock_message.status = 'sent'
        
        with patch('twilio.rest.Client') as mock_twilio:
            mock_client = Mock()
            mock_client.messages.create.return_value = mock_message
            mock_twilio.return_value = mock_client
            
            result = await notification_service.send_notification(sample_sms_request)
            
            assert isinstance(result, NotificationResponse)
            assert result.success is True
            assert result.status == NotificationStatus.SENT
            assert result.external_id == 'SM123456789'
            assert result.provider == 'twilio'

    @pytest.mark.asyncio
    async def test_send_sms_failure(self, notification_service, sample_sms_request):
        """Test SMS sending failure handling."""
        with patch('twilio.rest.Client', side_effect=Exception('Invalid phone number')):
            result = await notification_service.send_notification(sample_sms_request)
            
            assert result.success is False
            assert result.status == NotificationStatus.FAILED
            assert 'Invalid phone number' in result.error_message

    @pytest.mark.asyncio
    async def test_send_push_notification_success(self, notification_service, sample_push_request):
        """Test successful push notification via Firebase."""
        mock_response = Mock()
        mock_response.success_count = 1
        mock_response.failure_count = 0
        
        with patch('firebase_admin.messaging.send') as mock_send:
            mock_send.return_value = 'projects/test/messages/msg123'
            
            result = await notification_service.send_notification(sample_push_request)
            
            assert isinstance(result, NotificationResponse)
            assert result.success is True
            assert result.status == NotificationStatus.SENT
            assert result.provider == 'firebase'
            mock_send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_push_notification_failure(self, notification_service, sample_push_request):
        """Test push notification failure handling."""
        with patch('firebase_admin.messaging.send', side_effect=Exception('Invalid registration token')):
            result = await notification_service.send_notification(sample_push_request)
            
            assert result.success is False
            assert result.status == NotificationStatus.FAILED
            assert 'Invalid registration token' in result.error_message

    @pytest.mark.asyncio
    async def test_send_whatsapp_message_success(self, notification_service):
        """Test successful WhatsApp message sending."""
        whatsapp_request = NotificationRequest(
            type=NotificationType.WHATSAPP,
            recipient='+1234567890',
            content='Your booking has been confirmed!',
            priority=NotificationPriority.HIGH
        )
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'messages': [{'id': 'whatsapp_msg_123'}]}
        
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_post.return_value.__aenter__.return_value = mock_response
            
            result = await notification_service.send_notification(whatsapp_request)
            
            assert result.success is True
            assert result.provider == 'whatsapp_business'
            assert result.external_id == 'whatsapp_msg_123'

    @pytest.mark.asyncio
    async def test_send_bulk_notifications(self, notification_service):
        """Test bulk notification sending."""
        notifications = []
        
        # Create multiple notification requests
        for i in range(5):
            notification = NotificationRequest(
                type=NotificationType.EMAIL,
                recipient=f'test{i}@example.com',
                subject=f'Test Email {i}',
                content=f'This is test email number {i}',
                priority=NotificationPriority.LOW
            )
            notifications.append(notification)
        
        with patch('aiosmtplib.send') as mock_send:
            mock_send.return_value = {'status': 'sent'}
            
            results = await notification_service.send_bulk_notifications(notifications)
            
            assert len(results) == 5
            for result in results:
                assert result.success is True
                assert result.status == NotificationStatus.SENT
            
            assert mock_send.call_count == 5

    @pytest.mark.asyncio
    async def test_schedule_notification(self, notification_service, sample_email_request):
        """Test notification scheduling."""
        scheduled_time = datetime.now() + timedelta(hours=1)
        
        with patch.object(notification_service, '_store_scheduled_notification') as mock_store:
            result = await notification_service.schedule_notification(
                sample_email_request, 
                scheduled_time
            )
            
            assert result.success is True
            assert result.status == NotificationStatus.SCHEDULED
            mock_store.assert_called_once()

    @pytest.mark.asyncio
    async def test_cancel_scheduled_notification(self, notification_service):
        """Test canceling scheduled notification."""
        notification_id = 'notification_123'
        
        with patch.object(notification_service, '_cancel_stored_notification') as mock_cancel:
            mock_cancel.return_value = True
            
            result = await notification_service.cancel_notification(notification_id)
            
            assert result is True
            mock_cancel.assert_called_once_with(notification_id)

    @pytest.mark.asyncio
    async def test_notification_status_tracking(self, notification_service):
        """Test notification delivery status tracking."""
        notification_id = 'notification_123'
        
        with patch.object(notification_service, '_get_notification_status') as mock_status:
            mock_status.return_value = NotificationStatus.DELIVERED
            
            status = await notification_service.get_notification_status(notification_id)
            
            assert status == NotificationStatus.DELIVERED
            mock_status.assert_called_once_with(notification_id)

    @pytest.mark.asyncio
    async def test_notification_retry_logic(self, notification_service, sample_email_request):
        """Test automatic retry for failed notifications."""
        call_count = 0
        
        def mock_send(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception('Temporary failure')
            return {'status': 'sent'}
        
        with patch('aiosmtplib.send', side_effect=mock_send):
            result = await notification_service.send_notification(sample_email_request)
            
            assert result.success is True
            assert call_count == 3  # Initial attempt + 2 retries

    @pytest.mark.asyncio
    async def test_template_rendering(self, notification_service):
        """Test notification template rendering."""
        template_name = 'booking_confirmation'
        template_data = {
            'customer_name': 'Jane Smith',
            'booking_id': 'BOOK456',
            'destination': 'Tokyo',
            'checkin_date': '2024-10-15',
            'checkout_date': '2024-10-22'
        }
        
        # Mock template file content
        mock_template_content = """
        Dear {{ customer_name }},
        Your booking {{ booking_id }} for {{ destination }} is confirmed.
        Check-in: {{ checkin_date }}
        Check-out: {{ checkout_date }}
        """
        
        with patch('pathlib.Path.read_text', return_value=mock_template_content):
            with patch('jinja2.Environment.from_string') as mock_env:
                mock_template = Mock()
                mock_template.render.return_value = "Dear Jane Smith, Your booking BOOK456 for Tokyo is confirmed..."
                mock_env.return_value = mock_template
                
                rendered = await notification_service._render_template(template_name, template_data)
                
                assert 'Jane Smith' in rendered
                assert 'BOOK456' in rendered
                assert 'Tokyo' in rendered

    @pytest.mark.asyncio
    async def test_notification_preferences(self, notification_service):
        """Test user notification preferences handling."""
        user_id = 'user_123'
        preferences = {
            'email': True,
            'sms': False,
            'push': True,
            'whatsapp': False
        }
        
        with patch.object(notification_service, '_get_user_preferences') as mock_prefs:
            mock_prefs.return_value = preferences
            
            filtered_types = await notification_service.get_allowed_notification_types(user_id)
            
            assert NotificationType.EMAIL in filtered_types
            assert NotificationType.PUSH in filtered_types
            assert NotificationType.SMS not in filtered_types
            assert NotificationType.WHATSAPP not in filtered_types

    @pytest.mark.asyncio
    async def test_notification_analytics(self, notification_service):
        """Test notification analytics and metrics."""
        date_from = datetime.now() - timedelta(days=7)
        date_to = datetime.now()
        
        mock_metrics = {
            'total_sent': 1250,
            'email_sent': 800,
            'sms_sent': 200,
            'push_sent': 200,
            'whatsapp_sent': 50,
            'delivery_rate': 0.95,
            'open_rate': 0.42,
            'click_rate': 0.08
        }
        
        with patch.object(notification_service, '_calculate_analytics') as mock_analytics:
            mock_analytics.return_value = mock_metrics
            
            metrics = await notification_service.get_analytics(date_from, date_to)
            
            assert metrics['total_sent'] == 1250
            assert metrics['delivery_rate'] == 0.95
            mock_analytics.assert_called_once_with(date_from, date_to)

    def test_notification_request_validation(self):
        """Test NotificationRequest model validation."""
        # Valid email request
        valid_email = NotificationRequest(
            type=NotificationType.EMAIL,
            recipient='test@example.com',
            subject='Test Subject',
            content='Test content',
            priority=NotificationPriority.MEDIUM
        )
        assert valid_email.type == NotificationType.EMAIL
        assert valid_email.recipient == 'test@example.com'
        
        # Invalid email format
        with pytest.raises(ValueError):
            NotificationRequest(
                type=NotificationType.EMAIL,
                recipient='invalid-email',  # Invalid format
                subject='Test',
                content='Test content'
            )
        
        # Invalid phone number for SMS
        with pytest.raises(ValueError):
            NotificationRequest(
                type=NotificationType.SMS,
                recipient='invalid-phone',  # Invalid format
                content='Test SMS'
            )

    def test_notification_response_model(self):
        """Test NotificationResponse data model."""
        response = NotificationResponse(
            success=True,
            notification_id='notif_123',
            status=NotificationStatus.SENT,
            provider='smtp',
            external_id='external_123',
            sent_at=datetime.now(),
            metadata={'attempt': 1}
        )
        
        assert response.success is True
        assert response.notification_id == 'notif_123'
        assert response.status == NotificationStatus.SENT
        assert response.provider == 'smtp'
        assert response.external_id == 'external_123'

    def test_notification_enums(self):
        """Test notification enumeration values."""
        # NotificationType enum
        assert NotificationType.EMAIL.value == 'email'
        assert NotificationType.SMS.value == 'sms'
        assert NotificationType.PUSH.value == 'push'
        assert NotificationType.WHATSAPP.value == 'whatsapp'
        
        # NotificationPriority enum
        assert NotificationPriority.LOW.value == 'low'
        assert NotificationPriority.MEDIUM.value == 'medium'
        assert NotificationPriority.HIGH.value == 'high'
        assert NotificationPriority.URGENT.value == 'urgent'
        
        # NotificationStatus enum
        assert NotificationStatus.PENDING.value == 'pending'
        assert NotificationStatus.SENT.value == 'sent'
        assert NotificationStatus.DELIVERED.value == 'delivered'

    @pytest.mark.asyncio
    async def test_concurrent_notification_sending(self, notification_service):
        """Test concurrent notification processing."""
        notifications = []
        
        # Create notifications for different channels
        for i in range(10):
            notification_type = [
                NotificationType.EMAIL, 
                NotificationType.SMS, 
                NotificationType.PUSH
            ][i % 3]
            
            notification = NotificationRequest(
                type=notification_type,
                recipient=f'test{i}@example.com' if notification_type == NotificationType.EMAIL else f'+123456789{i}',
                subject='Concurrent Test' if notification_type == NotificationType.EMAIL else None,
                content=f'Concurrent notification test {i}',
                priority=NotificationPriority.MEDIUM
            )
            notifications.append(notification)
        
        # Mock all providers
        with patch('aiosmtplib.send', return_value={'status': 'sent'}):
            with patch('twilio.rest.Client') as mock_twilio:
                mock_client = Mock()
                mock_message = Mock()
                mock_message.sid = 'SM123'
                mock_message.status = 'sent'
                mock_client.messages.create.return_value = mock_message
                mock_twilio.return_value = mock_client
                
                with patch('firebase_admin.messaging.send', return_value='msg_123'):
                    # Process notifications concurrently
                    tasks = [notification_service.send_notification(notif) for notif in notifications]
                    results = await asyncio.gather(*tasks)
                    
                    # All should succeed
                    for result in results:
                        assert result.success is True

    @pytest.mark.asyncio
    async def test_notification_rate_limiting(self, notification_service):
        """Test notification rate limiting to prevent spam."""
        recipient = 'test@example.com'
        
        # Mock rate limiter
        with patch.object(notification_service, '_check_rate_limit') as mock_rate_limit:
            mock_rate_limit.return_value = False  # Rate limit exceeded
            
            notification = NotificationRequest(
                type=NotificationType.EMAIL,
                recipient=recipient,
                subject='Rate Limited Test',
                content='This should be rate limited'
            )
            
            result = await notification_service.send_notification(notification)
            
            assert result.success is False
            assert 'rate limit' in result.error_message.lower()

# Provider-specific test classes
class TestEmailProviders:
    """Test suite for email provider integrations."""
    
    def test_smtp_provider_config(self):
        """Test SMTP provider configuration."""
        provider = EmailProvider(
            name='smtp',
            host='smtp.gmail.com',
            port=587,
            username='test@gmail.com',
            password='app_password',
            use_tls=True
        )
        
        assert provider.name == 'smtp'
        assert provider.host == 'smtp.gmail.com'
        assert provider.port == 587
        assert provider.use_tls is True

    def test_sendgrid_provider_config(self):
        """Test SendGrid provider configuration."""
        provider = EmailProvider(
            name='sendgrid',
            api_key='SG.test_key',
            from_email='noreply@spirittours.com'
        )
        
        assert provider.name == 'sendgrid'
        assert provider.api_key == 'SG.test_key'

class TestSMSProviders:
    """Test suite for SMS provider integrations."""
    
    def test_twilio_provider_config(self):
        """Test Twilio SMS provider configuration."""
        provider = SMSProvider(
            name='twilio',
            account_sid='AC123456789',
            auth_token='auth_token_123',
            from_number='+15551234567'
        )
        
        assert provider.name == 'twilio'
        assert provider.account_sid == 'AC123456789'
        assert provider.from_number == '+15551234567'

    def test_aws_sns_provider_config(self):
        """Test AWS SNS SMS provider configuration."""
        provider = SMSProvider(
            name='aws_sns',
            access_key_id='AKIAIOSFODNN7EXAMPLE',
            secret_access_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            region='us-east-1'
        )
        
        assert provider.name == 'aws_sns'
        assert provider.region == 'us-east-1'

class TestPushProviders:
    """Test suite for push notification provider integrations."""
    
    def test_firebase_provider_config(self):
        """Test Firebase push notification provider."""
        provider = PushProvider(
            name='firebase',
            project_id='spirittours-app',
            credentials_path='/path/to/firebase-credentials.json'
        )
        
        assert provider.name == 'firebase'
        assert provider.project_id == 'spirittours-app'

    def test_apns_provider_config(self):
        """Test Apple Push Notification Service provider."""
        provider = PushProvider(
            name='apns',
            team_id='TEAMID123',
            key_id='KEYID123',
            bundle_id='com.spirittours.app',
            key_path='/path/to/AuthKey.p8'
        )
        
        assert provider.name == 'apns'
        assert provider.bundle_id == 'com.spirittours.app'

# Performance testing
class TestNotificationPerformance:
    """Performance testing for notification operations."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_bulk_email_performance(self, notification_service):
        """Test bulk email sending performance."""
        import time
        
        # Create 100 email notifications
        notifications = []
        for i in range(100):
            notification = NotificationRequest(
                type=NotificationType.EMAIL,
                recipient=f'perf_test_{i}@example.com',
                subject=f'Performance Test Email {i}',
                content=f'This is performance test email number {i}',
                priority=NotificationPriority.LOW
            )
            notifications.append(notification)
        
        with patch('aiosmtplib.send', return_value={'status': 'sent'}):
            start_time = time.time()
            results = await notification_service.send_bulk_notifications(notifications)
            end_time = time.time()
            
            processing_time = end_time - start_time
            throughput = len(notifications) / processing_time
            
            # Should process at least 50 emails per second
            assert throughput >= 50.0
            
            # All should succeed
            for result in results:
                assert result.success is True

    @pytest.mark.asyncio
    async def test_memory_efficiency(self, notification_service):
        """Test memory efficiency during notification processing."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Process many notifications
        with patch('aiosmtplib.send', return_value={'status': 'sent'}):
            for i in range(200):
                notification = NotificationRequest(
                    type=NotificationType.EMAIL,
                    recipient=f'memory_test_{i}@example.com',
                    subject=f'Memory Test {i}',
                    content=f'Memory efficiency test notification {i}'
                )
                await notification_service.send_notification(notification)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 50MB)
        assert memory_increase < 50 * 1024 * 1024  # 50MB in bytes