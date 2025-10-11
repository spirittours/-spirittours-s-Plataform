"""
Unit tests for Notification Service
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
import json

from backend.services.notification_service import NotificationService

class TestNotificationService:
    """Test suite for NotificationService"""
    
    @pytest.fixture
    def notification_service(self):
        """Create notification service instance for testing."""
        return NotificationService()
    
    @pytest.mark.asyncio
    async def test_send_email_success(self, notification_service, mock_smtp_client):
        """Test successful email sending via SMTP."""
        with patch('smtplib.SMTP') as mock_smtp:
            mock_smtp.return_value.__enter__.return_value = mock_smtp_client
            
            result = await notification_service.send_email(
                to="test@example.com",
                subject="Test Email",
                body="This is a test email",
                template="default"
            )
        
        assert result["success"] is True
        assert result["provider"] == "smtp"
        assert "message_id" in result
        mock_smtp_client.send_message.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_email_with_template(self, notification_service):
        """Test email sending with template rendering."""
        template_data = {
            "customer_name": "John Doe",
            "booking_id": "BOOK123",
            "tour_name": "Amazing Tour",
            "booking_date": "2024-01-15"
        }
        
        with patch.object(notification_service, '_render_template') as mock_render:
            mock_render.return_value = "<html>Rendered template</html>"
            
            with patch.object(notification_service, '_send_smtp_email') as mock_send:
                mock_send.return_value = {"success": True, "message_id": "msg123"}
                
                result = await notification_service.send_email(
                    to="test@example.com",
                    subject="Booking Confirmation",
                    template="booking_confirmation",
                    template_data=template_data
                )
        
        assert result["success"] is True
        mock_render.assert_called_once_with("booking_confirmation", template_data)
    
    @pytest.mark.asyncio
    async def test_send_sms_twilio_success(self, notification_service, mock_twilio_client):
        """Test successful SMS sending via Twilio."""
        mock_message = Mock(sid="SM123456", status="sent")
        mock_twilio_client.messages.create.return_value = mock_message
        
        with patch.object(notification_service, 'twilio_client', mock_twilio_client):
            result = await notification_service.send_sms(
                to="+1234567890",
                message="Your booking is confirmed!",
                provider="twilio"
            )
        
        assert result["success"] is True
        assert result["message_id"] == "SM123456"
        assert result["provider"] == "twilio"
        mock_twilio_client.messages.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_whatsapp_success(self, notification_service, mock_twilio_client):
        """Test successful WhatsApp message sending."""
        mock_message = Mock(sid="WA123456", status="sent")
        mock_twilio_client.messages.create.return_value = mock_message
        
        with patch.object(notification_service, 'twilio_client', mock_twilio_client):
            result = await notification_service.send_whatsapp(
                to="+1234567890",
                message="Your tour starts tomorrow!",
                media_url="https://example.com/image.jpg"
            )
        
        assert result["success"] is True
        assert result["message_id"] == "WA123456"
        assert result["provider"] == "whatsapp"
    
    @pytest.mark.asyncio
    async def test_send_push_notification(self, notification_service, mock_fcm_client):
        """Test push notification sending via Firebase."""
        mock_response = Mock(success_count=1, failure_count=0)
        mock_fcm_client.send_multicast.return_value = mock_response
        
        with patch.object(notification_service, 'fcm_client', mock_fcm_client):
            result = await notification_service.send_push(
                tokens=["token123", "token456"],
                title="Tour Update",
                body="Your tour has been updated",
                data={"tour_id": "TOUR123"}
            )
        
        assert result["success"] is True
        assert result["success_count"] == 1
        assert result["failure_count"] == 0
    
    @pytest.mark.asyncio
    async def test_bulk_email_sending(self, notification_service):
        """Test bulk email sending functionality."""
        recipients = [
            "user1@example.com",
            "user2@example.com",
            "user3@example.com"
        ]
        
        with patch.object(notification_service, 'send_email') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "msg123"}
            
            results = await notification_service.send_bulk_email(
                recipients=recipients,
                subject="Newsletter",
                body="Monthly newsletter content",
                batch_size=2
            )
        
        assert len(results) == 3
        assert all(r["success"] for r in results)
        assert mock_send.call_count == 3
    
    @pytest.mark.asyncio
    async def test_notification_scheduling(self, notification_service):
        """Test notification scheduling functionality."""
        scheduled_time = datetime(2024, 12, 25, 10, 0, 0)
        
        result = await notification_service.schedule_notification(
            notification_type="email",
            recipient="test@example.com",
            subject="Holiday Greetings",
            body="Happy holidays!",
            scheduled_time=scheduled_time
        )
        
        assert result["success"] is True
        assert result["scheduled_time"] == scheduled_time
        assert "job_id" in result
    
    @pytest.mark.asyncio
    async def test_template_rendering(self, notification_service):
        """Test email template rendering with Jinja2."""
        template_content = """
        <html>
        <body>
            <h1>Hello {{ name }}!</h1>
            <p>Your booking #{{ booking_id }} is confirmed.</p>
        </body>
        </html>
        """
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = template_content
            
            rendered = notification_service._render_template(
                "test_template",
                {"name": "John", "booking_id": "BOOK123"}
            )
        
        assert "Hello John!" in rendered
        assert "Your booking #BOOK123 is confirmed" in rendered
    
    @pytest.mark.asyncio
    async def test_multi_language_support(self, notification_service):
        """Test multi-language notification support."""
        # Test English
        result_en = await notification_service.send_email(
            to="test@example.com",
            subject="Booking Confirmation",
            template="booking_confirmation",
            language="en"
        )
        assert result_en["language"] == "en"
        
        # Test Spanish
        result_es = await notification_service.send_email(
            to="test@example.com",
            subject="Confirmación de Reserva",
            template="booking_confirmation",
            language="es"
        )
        assert result_es["language"] == "es"
    
    @pytest.mark.asyncio
    async def test_notification_retry_logic(self, notification_service):
        """Test retry logic for failed notifications."""
        with patch.object(notification_service, '_send_smtp_email') as mock_send:
            # Simulate failure then success
            mock_send.side_effect = [
                {"success": False, "error": "Connection timeout"},
                {"success": False, "error": "Server error"},
                {"success": True, "message_id": "msg123"}
            ]
            
            result = await notification_service.send_email_with_retry(
                to="test@example.com",
                subject="Test",
                body="Test message",
                max_retries=3
            )
        
        assert result["success"] is True
        assert result["retry_count"] == 2
        assert mock_send.call_count == 3
    
    @pytest.mark.asyncio
    async def test_notification_tracking(self, notification_service, db_session):
        """Test notification tracking and logging."""
        result = await notification_service.send_and_track(
            notification_type="email",
            recipient="test@example.com",
            subject="Tracked Email",
            body="This email is being tracked",
            user_id="user123",
            booking_id="book456"
        )
        
        assert result["success"] is True
        assert result["tracked"] is True
        assert "tracking_id" in result
        
        # Verify log entry was created
        log_entry = db_session.query(NotificationLog).filter_by(
            tracking_id=result["tracking_id"]
        ).first()
        assert log_entry is not None
        assert log_entry.recipient == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_email_attachments(self, notification_service):
        """Test sending emails with attachments."""
        attachments = [
            {"filename": "invoice.pdf", "content": b"PDF content"},
            {"filename": "itinerary.doc", "content": b"DOC content"}
        ]
        
        with patch.object(notification_service, '_send_smtp_email') as mock_send:
            mock_send.return_value = {"success": True, "message_id": "msg123"}
            
            result = await notification_service.send_email(
                to="test@example.com",
                subject="Documents",
                body="Please find attached documents",
                attachments=attachments
            )
        
        assert result["success"] is True
        call_args = mock_send.call_args[1]
        assert "attachments" in call_args
        assert len(call_args["attachments"]) == 2
    
    @pytest.mark.asyncio
    async def test_webhook_notification(self, notification_service):
        """Test webhook-based notifications."""
        webhook_url = "https://example.com/webhook"
        payload = {
            "event": "booking_confirmed",
            "booking_id": "BOOK123",
            "customer": "test@example.com"
        }
        
        with patch('aiohttp.ClientSession.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json.return_value = {"received": True}
            mock_post.return_value.__aenter__.return_value = mock_response
            
            result = await notification_service.send_webhook(
                url=webhook_url,
                payload=payload,
                headers={"X-API-Key": "secret123"}
            )
        
        assert result["success"] is True
        assert result["status_code"] == 200
        assert result["response"]["received"] is True
    
    @pytest.mark.asyncio
    async def test_notification_preferences(self, notification_service, db_session):
        """Test user notification preferences handling."""
        user_preferences = {
            "email": True,
            "sms": False,
            "push": True,
            "whatsapp": True
        }
        
        # Test filtering based on preferences
        notifications_to_send = notification_service.filter_by_preferences(
            ["email", "sms", "push", "whatsapp"],
            user_preferences
        )
        
        assert "email" in notifications_to_send
        assert "sms" not in notifications_to_send
        assert "push" in notifications_to_send
        assert "whatsapp" in notifications_to_send

@pytest.fixture
def mock_smtp_client():
    """Mock SMTP client for testing."""
    mock = MagicMock()
    mock.send_message = MagicMock()
    return mock

@pytest.fixture
def mock_twilio_client():
    """Mock Twilio client for testing."""
    mock = Mock()
    mock.messages = Mock()
    return mock

@pytest.fixture
def mock_fcm_client():
    """Mock Firebase Cloud Messaging client for testing."""
    mock = Mock()
    return mock