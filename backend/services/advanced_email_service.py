"""
Advanced Email Service with Queue, Retry Logic and Templates
Production-ready email system with Redis queue and tracking
"""

import asyncio
import json
import logging
import smtplib
import uuid
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
from typing import Dict, List, Optional, Any
from enum import Enum
import aioredis
import jinja2
from dataclasses import dataclass, asdict
import hashlib
import base64
from pathlib import Path
import aiosmtplib
from bs4 import BeautifulSoup
import premailer

logger = logging.getLogger(__name__)


class EmailStatus(Enum):
    """Email delivery status"""
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    OPENED = "opened"
    CLICKED = "clicked"
    UNSUBSCRIBED = "unsubscribed"


class EmailPriority(Enum):
    """Email priority levels"""
    HIGH = 1
    NORMAL = 2
    LOW = 3
    BULK = 4


@dataclass
class EmailMessage:
    """Email message data structure"""
    id: str
    to: List[str]
    subject: str
    template: str
    context: Dict[str, Any]
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    priority: EmailPriority = EmailPriority.NORMAL
    retry_count: int = 0
    max_retries: int = 3
    status: EmailStatus = EmailStatus.QUEUED
    created_at: datetime = None
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    tracking_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.tracking_id is None:
            self.tracking_id = self._generate_tracking_id()

    def _generate_tracking_id(self):
        """Generate unique tracking ID for email"""
        data = f"{self.id}{self.to}{datetime.utcnow().isoformat()}"
        return hashlib.md5(data.encode()).hexdigest()


class EmailTemplateEngine:
    """Jinja2-based email template engine"""
    
    def __init__(self, template_dir: str = "backend/templates/emails"):
        self.template_dir = Path(template_dir)
        self.env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(self.template_dir)),
            autoescape=True,
            enable_async=True
        )
        self._register_filters()
        self._load_default_templates()
    
    def _register_filters(self):
        """Register custom Jinja2 filters"""
        self.env.filters['currency'] = lambda x: f"${x:,.2f}"
        self.env.filters['date'] = lambda x: x.strftime("%B %d, %Y")
        self.env.filters['datetime'] = lambda x: x.strftime("%B %d, %Y at %I:%M %p")
    
    def _load_default_templates(self):
        """Create default email templates if they don't exist"""
        templates = {
            'quotation_created': self._quotation_created_template(),
            'quotation_approved': self._quotation_approved_template(),
            'booking_confirmed': self._booking_confirmed_template(),
            'payment_received': self._payment_received_template(),
            'hotel_invitation': self._hotel_invitation_template(),
            'guide_assigned': self._guide_assigned_template(),
            'reminder_payment': self._reminder_payment_template(),
            'deadline_warning': self._deadline_warning_template(),
            'cancellation_notice': self._cancellation_notice_template(),
            'refund_processed': self._refund_processed_template(),
            'password_reset': self._password_reset_template(),
            'welcome': self._welcome_template(),
            'newsletter': self._newsletter_template(),
            'survey': self._survey_template(),
            'birthday': self._birthday_template()
        }
        
        # Create template files if they don't exist
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        for name, content in templates.items():
            template_path = self.template_dir / f"{name}.html"
            if not template_path.exists():
                template_path.write_text(content)
    
    def _base_template(self) -> str:
        """Base HTML template with responsive design"""
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ subject }}</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 10px !important; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .tracking-pixel { width: 1px; height: 1px; position: absolute; }
    </style>
</head>
<body>
    <div class="container">
        {% block header %}
        <div class="header">
            <h1>Spirit Tours</h1>
        </div>
        {% endblock %}
        
        <div class="content">
            {% block content %}{% endblock %}
        </div>
        
        <div class="footer">
            {% block footer %}
            <p>&copy; 2024 Spirit Tours. All rights reserved.</p>
            <p>
                <a href="{{ unsubscribe_url }}" style="color: #666;">Unsubscribe</a> |
                <a href="{{ preferences_url }}" style="color: #666;">Update Preferences</a>
            </p>
            {% endblock %}
        </div>
    </div>
    
    <!-- Tracking pixel -->
    <img src="{{ tracking_pixel_url }}" class="tracking-pixel" alt="">
</body>
</html>'''
    
    def _quotation_created_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>New Quotation Created!</h2>
<p>Hello {{ name }},</p>
<p>Your quotation #{{ quotation_id }} has been successfully created.</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>Quotation Details:</h3>
    <p><strong>Destination:</strong> {{ destination }}</p>
    <p><strong>Travel Dates:</strong> {{ start_date|date }} - {{ end_date|date }}</p>
    <p><strong>Number of Travelers:</strong> {{ num_travelers }}</p>
    <p><strong>Total Amount:</strong> {{ total_amount|currency }}</p>
</div>

<p>We're now reaching out to our hotel partners to get you the best rates. You'll receive updates as responses come in.</p>

<center>
    <a href="{{ quotation_url }}" class="button">View Quotation</a>
</center>

<p><strong>Valid Until:</strong> {{ expiry_date|datetime }}</p>
<p><small>You can request up to 2 extensions if needed.</small></p>
{% endblock %}'''
    
    def _quotation_approved_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>🎉 Quotation Approved!</h2>
<p>Great news {{ name }}!</p>
<p>Your quotation #{{ quotation_id }} has been approved and is ready for booking.</p>

<div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
    <h3>Next Steps:</h3>
    <ol>
        <li>Review the final quotation details</li>
        <li>Make the deposit payment of {{ deposit_amount|currency }}</li>
        <li>Receive your booking confirmation</li>
    </ol>
</div>

<center>
    <a href="{{ payment_url }}" class="button" style="background: #28a745;">Proceed to Payment</a>
</center>

<p><strong>Deposit Required:</strong> {{ deposit_amount|currency }}</p>
<p><strong>Payment Deadline:</strong> {{ payment_deadline|datetime }}</p>
{% endblock %}'''
    
    def _booking_confirmed_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>✅ Booking Confirmed!</h2>
<p>Dear {{ name }},</p>
<p>Your booking is confirmed! Here are your details:</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>Booking Reference: {{ booking_ref }}</h3>
    <p><strong>Tour:</strong> {{ tour_name }}</p>
    <p><strong>Dates:</strong> {{ start_date|date }} - {{ end_date|date }}</p>
    <p><strong>Hotels:</strong></p>
    <ul>
    {% for hotel in hotels %}
        <li>{{ hotel.name }} - {{ hotel.nights }} nights</li>
    {% endfor %}
    </ul>
    <p><strong>Guide:</strong> {{ guide_name }} ({{ guide_phone }})</p>
</div>

<center>
    <a href="{{ voucher_url }}" class="button">Download Vouchers</a>
    <a href="{{ itinerary_url }}" class="button" style="background: #6c757d;">View Itinerary</a>
</center>

<p>We're excited to have you travel with us!</p>
{% endblock %}'''
    
    def _payment_received_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>💳 Payment Received</h2>
<p>Hi {{ name }},</p>
<p>We've successfully received your payment. Thank you!</p>

<div style="background: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
    <h3>Payment Details:</h3>
    <p><strong>Amount:</strong> {{ amount|currency }}</p>
    <p><strong>Transaction ID:</strong> {{ transaction_id }}</p>
    <p><strong>Payment Method:</strong> {{ payment_method }}</p>
    <p><strong>Date:</strong> {{ payment_date|datetime }}</p>
</div>

<center>
    <a href="{{ receipt_url }}" class="button">Download Receipt</a>
</center>

<p>A copy of this receipt has been sent to your email for your records.</p>
{% endblock %}'''
    
    def _hotel_invitation_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>Invitation to Quote - Group Tour</h2>
<p>Dear Hotel Partner,</p>
<p>We have a new group tour request and would like to invite you to provide a quotation.</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <h3>Group Details:</h3>
    <p><strong>Group Name:</strong> {{ group_name }}</p>
    <p><strong>Check-in:</strong> {{ checkin_date|date }}</p>
    <p><strong>Check-out:</strong> {{ checkout_date|date }}</p>
    <p><strong>Number of Rooms:</strong></p>
    <ul>
        <li>Single: {{ single_rooms }}</li>
        <li>Double: {{ double_rooms }}</li>
        <li>Triple: {{ triple_rooms }}</li>
    </ul>
    <p><strong>Total Guests:</strong> {{ total_guests }}</p>
</div>

<p><strong>Response Deadline:</strong> {{ deadline|datetime }}</p>

<center>
    <a href="{{ response_url }}" class="button" style="background: #ffc107; color: #333;">Submit Your Quote</a>
</center>

<p>Please note: Other hotels are also being invited to quote. Competitive pricing is appreciated.</p>
{% endblock %}'''
    
    def _guide_assigned_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>📋 New Tour Assignment</h2>
<p>Hello {{ guide_name }},</p>
<p>You've been assigned to a new tour!</p>

<div style="background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>Tour Details:</h3>
    <p><strong>Tour Name:</strong> {{ tour_name }}</p>
    <p><strong>Start Date:</strong> {{ start_date|date }}</p>
    <p><strong>Duration:</strong> {{ duration }} days</p>
    <p><strong>Group Size:</strong> {{ group_size }} travelers</p>
    <p><strong>Language:</strong> {{ language }}</p>
    <p><strong>Meeting Point:</strong> {{ meeting_point }}</p>
</div>

<center>
    <a href="{{ accept_url }}" class="button" style="background: #28a745;">Accept Assignment</a>
    <a href="{{ decline_url }}" class="button" style="background: #dc3545;">Decline</a>
</center>

<p>Please respond within 24 hours.</p>
{% endblock %}'''
    
    def _reminder_payment_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>⏰ Payment Reminder</h2>
<p>Hi {{ name }},</p>
<p>This is a friendly reminder that your payment for quotation #{{ quotation_id }} is pending.</p>

<div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
    <p><strong>Amount Due:</strong> {{ amount_due|currency }}</p>
    <p><strong>Due Date:</strong> {{ due_date|date }}</p>
    <p><strong>Days Remaining:</strong> {{ days_remaining }}</p>
</div>

<center>
    <a href="{{ payment_url }}" class="button" style="background: #ffc107; color: #333;">Pay Now</a>
</center>

<p>To secure your booking, please complete the payment before the deadline.</p>
{% endblock %}'''
    
    def _deadline_warning_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>⚠️ Quotation Expiring Soon!</h2>
<p>Hi {{ name }},</p>
<p>Your quotation #{{ quotation_id }} will expire in {{ hours_remaining }} hours.</p>

<div style="background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
    <p><strong>Expiry Time:</strong> {{ expiry_time|datetime }}</p>
    <p>After this time, the quoted prices and availability cannot be guaranteed.</p>
</div>

<center>
    <a href="{{ quotation_url }}" class="button" style="background: #dc3545;">Review Quotation</a>
    <a href="{{ extend_url }}" class="button" style="background: #6c757d;">Request Extension</a>
</center>

<p>You can request up to 2 extensions if you need more time.</p>
{% endblock %}'''
    
    def _cancellation_notice_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>Booking Cancellation Confirmation</h2>
<p>Dear {{ name }},</p>
<p>Your booking #{{ booking_id }} has been cancelled as requested.</p>

<div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>Cancellation Details:</h3>
    <p><strong>Cancellation Date:</strong> {{ cancellation_date|datetime }}</p>
    <p><strong>Reason:</strong> {{ cancellation_reason }}</p>
    <p><strong>Refund Amount:</strong> {{ refund_amount|currency }}</p>
    <p><strong>Refund Status:</strong> {{ refund_status }}</p>
</div>

<p>If you have any questions about your refund, please contact us.</p>
{% endblock %}'''
    
    def _refund_processed_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>💰 Refund Processed</h2>
<p>Hi {{ name }},</p>
<p>Your refund has been successfully processed.</p>

<div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
    <h3>Refund Details:</h3>
    <p><strong>Refund Amount:</strong> {{ refund_amount|currency }}</p>
    <p><strong>Transaction ID:</strong> {{ transaction_id }}</p>
    <p><strong>Processing Date:</strong> {{ process_date|datetime }}</p>
    <p><strong>Expected Arrival:</strong> 3-5 business days</p>
</div>

<p>The refund will appear on your original payment method.</p>
{% endblock %}'''
    
    def _password_reset_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>🔐 Password Reset Request</h2>
<p>Hi {{ name }},</p>
<p>We received a request to reset your password.</p>

<center>
    <a href="{{ reset_url }}" class="button">Reset Password</a>
</center>

<p>This link will expire in 1 hour for security reasons.</p>
<p><small>If you didn't request this, please ignore this email.</small></p>
{% endblock %}'''
    
    def _welcome_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>Welcome to Spirit Tours!</h2>
<p>Hi {{ name }},</p>
<p>Thank you for joining Spirit Tours! We're excited to help you plan your next adventure.</p>

<div style="background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>Get Started:</h3>
    <ul>
        <li>Complete your profile</li>
        <li>Browse our destinations</li>
        <li>Request your first quotation</li>
        <li>Join our rewards program</li>
    </ul>
</div>

<center>
    <a href="{{ dashboard_url }}" class="button">Go to Dashboard</a>
</center>
{% endblock %}'''
    
    def _newsletter_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>{{ newsletter_title }}</h2>
{{ newsletter_content|safe }}

<center>
    <a href="{{ read_more_url }}" class="button">Read More</a>
</center>
{% endblock %}'''
    
    def _survey_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>We'd Love Your Feedback!</h2>
<p>Hi {{ name }},</p>
<p>How was your recent experience with {{ tour_name }}?</p>

<center>
    <a href="{{ survey_url }}" class="button">Take Survey</a>
</center>

<p>The survey takes only 2 minutes and helps us improve our services.</p>
{% endblock %}'''
    
    def _birthday_template(self) -> str:
        return '''{% extends "base.html" %}
{% block content %}
<h2>🎂 Happy Birthday!</h2>
<p>Dear {{ name }},</p>
<p>Wishing you a wonderful birthday!</p>

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <h3>Special Birthday Offer:</h3>
    <p>Enjoy {{ discount }}% off your next booking!</p>
    <p><strong>Promo Code:</strong> BDAY{{ promo_code }}</p>
</div>

<center>
    <a href="{{ browse_tours_url }}" class="button">Browse Tours</a>
</center>

<p>Valid for 30 days from your birthday.</p>
{% endblock %}'''
    
    async def render_template(self, template_name: str, context: Dict[str, Any]) -> tuple[str, str]:
        """Render email template to HTML and text"""
        # Add default context
        default_context = {
            'current_year': datetime.utcnow().year,
            'company_name': 'Spirit Tours',
            'support_email': 'support@spirittours.com',
            'unsubscribe_url': f"https://spirittours.com/unsubscribe/{context.get('tracking_id', '')}",
            'preferences_url': "https://spirittours.com/preferences",
            'tracking_pixel_url': f"https://spirittours.com/track/{context.get('tracking_id', '')}"
        }
        context = {**default_context, **context}
        
        # Check if template exists, otherwise use a default
        template_path = self.template_dir / f"{template_name}.html"
        if not template_path.exists():
            # Use newsletter template as fallback
            template_name = 'newsletter'
        
        # Render HTML version
        template = self.env.get_template(f"{template_name}.html")
        html_content = await template.render_async(**context)
        
        # Apply CSS inlining for better email client compatibility
        html_content = premailer.transform(html_content)
        
        # Generate text version from HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        text_content = soup.get_text(separator='\n', strip=True)
        
        return html_content, text_content


class AdvancedEmailService:
    """Advanced email service with queue, retry logic, and tracking"""
    
    def __init__(
        self,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 587,
        smtp_user: str = None,
        smtp_password: str = None,
        redis_url: str = "redis://localhost:6379",
        from_email: str = "noreply@spirittours.com",
        from_name: str = "Spirit Tours"
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.redis_url = redis_url
        self.from_email = from_email
        self.from_name = from_name
        self.redis = None
        self.template_engine = EmailTemplateEngine()
        self.workers = []
        self.running = False
        
    async def initialize(self):
        """Initialize email service"""
        # Connect to Redis
        self.redis = await aioredis.create_redis_pool(self.redis_url)
        
        # Start queue workers
        self.running = True
        for i in range(3):  # Start 3 workers
            worker = asyncio.create_task(self._queue_worker(f"worker_{i}"))
            self.workers.append(worker)
        
        # Start retry worker
        retry_worker = asyncio.create_task(self._retry_worker())
        self.workers.append(retry_worker)
        
        logger.info("Email service initialized with queue workers")
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        template: str,
        context: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        priority: EmailPriority = EmailPriority.NORMAL,
        scheduled_at: Optional[datetime] = None
    ) -> str:
        """Queue email for sending"""
        # Create email message
        email_message = EmailMessage(
            id=str(uuid.uuid4()),
            to=to,
            subject=subject,
            template=template,
            context=context,
            cc=cc,
            bcc=bcc,
            attachments=attachments,
            priority=priority,
            scheduled_at=scheduled_at
        )
        
        # Add to queue based on priority
        queue_name = f"email:queue:{priority.value}"
        
        # If scheduled, add to scheduled queue instead
        if scheduled_at:
            queue_name = "email:scheduled"
        
        # Serialize and add to queue
        await self.redis.lpush(queue_name, json.dumps(asdict(email_message), default=str))
        
        # Store email details for tracking
        await self.redis.hset(
            f"email:{email_message.id}",
            "data",
            json.dumps(asdict(email_message), default=str)
        )
        await self.redis.expire(f"email:{email_message.id}", 86400 * 7)  # 7 days TTL
        
        logger.info(f"Email {email_message.id} queued for sending")
        return email_message.id
    
    async def _queue_worker(self, worker_id: str):
        """Worker to process email queue"""
        logger.info(f"Email queue worker {worker_id} started")
        
        while self.running:
            try:
                # Check queues in priority order
                for priority in EmailPriority:
                    queue_name = f"email:queue:{priority.value}"
                    
                    # Get email from queue (blocking pop with timeout)
                    result = await self.redis.brpop(queue_name, timeout=1)
                    
                    if result:
                        _, email_data = result
                        email_dict = json.loads(email_data)
                        
                        # Recreate EmailMessage object
                        email_message = EmailMessage(**email_dict)
                        
                        # Process email
                        await self._send_email_internal(email_message)
                        break
                
                # Check scheduled emails
                await self._process_scheduled_emails()
                
            except Exception as e:
                logger.error(f"Error in queue worker {worker_id}: {e}")
                await asyncio.sleep(1)
    
    async def _retry_worker(self):
        """Worker to retry failed emails"""
        logger.info("Email retry worker started")
        
        while self.running:
            try:
                # Check retry queue every minute
                await asyncio.sleep(60)
                
                # Get failed emails that are ready for retry
                retry_emails = await self.redis.smembers("email:retry")
                
                for email_id in retry_emails:
                    email_data = await self.redis.hget(f"email:{email_id.decode()}", "data")
                    if email_data:
                        email_dict = json.loads(email_data)
                        email_message = EmailMessage(**email_dict)
                        
                        # Check if ready for retry (exponential backoff)
                        retry_delay = 60 * (2 ** email_message.retry_count)  # 1min, 2min, 4min
                        time_since_last_attempt = (datetime.utcnow() - email_message.created_at).total_seconds()
                        
                        if time_since_last_attempt >= retry_delay:
                            # Remove from retry set
                            await self.redis.srem("email:retry", email_id)
                            
                            # Increment retry count
                            email_message.retry_count += 1
                            
                            # Re-queue or mark as failed
                            if email_message.retry_count < email_message.max_retries:
                                await self._send_email_internal(email_message)
                            else:
                                email_message.status = EmailStatus.FAILED
                                await self._update_email_status(email_message)
                                logger.error(f"Email {email_message.id} failed after {email_message.max_retries} retries")
                
            except Exception as e:
                logger.error(f"Error in retry worker: {e}")
    
    async def _process_scheduled_emails(self):
        """Process scheduled emails that are ready to send"""
        try:
            # Get all scheduled emails
            scheduled = await self.redis.lrange("email:scheduled", 0, -1)
            
            for email_data in scheduled:
                email_dict = json.loads(email_data)
                
                # Check if it's time to send
                scheduled_at = datetime.fromisoformat(email_dict.get('scheduled_at', ''))
                if datetime.utcnow() >= scheduled_at:
                    # Remove from scheduled queue
                    await self.redis.lrem("email:scheduled", 1, email_data)
                    
                    # Add to priority queue
                    priority = email_dict.get('priority', EmailPriority.NORMAL.value)
                    await self.redis.lpush(f"email:queue:{priority}", email_data)
        
        except Exception as e:
            logger.error(f"Error processing scheduled emails: {e}")
    
    async def _send_email_internal(self, email_message: EmailMessage):
        """Actually send the email via SMTP"""
        try:
            # Update status
            email_message.status = EmailStatus.SENDING
            await self._update_email_status(email_message)
            
            # Render template
            html_content, text_content = await self.template_engine.render_template(
                email_message.template,
                {**email_message.context, 'tracking_id': email_message.tracking_id}
            )
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = ', '.join(email_message.to)
            msg['Subject'] = email_message.subject
            msg['Message-ID'] = f"<{email_message.id}@spirittours.com>"
            msg['X-Tracking-ID'] = email_message.tracking_id
            
            if email_message.cc:
                msg['Cc'] = ', '.join(email_message.cc)
            if email_message.bcc:
                msg['Bcc'] = ', '.join(email_message.bcc)
            
            # Add text and HTML parts
            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))
            
            # Add attachments
            if email_message.attachments:
                for attachment in email_message.attachments:
                    await self._add_attachment(msg, attachment)
            
            # Send email
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port,
                use_tls=True
            ) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(msg)
            
            # Update status
            email_message.status = EmailStatus.SENT
            email_message.sent_at = datetime.utcnow()
            await self._update_email_status(email_message)
            
            logger.info(f"Email {email_message.id} sent successfully")
            
        except Exception as e:
            logger.error(f"Error sending email {email_message.id}: {e}")
            
            # Add to retry queue
            await self.redis.sadd("email:retry", email_message.id)
            
            # Update status
            email_message.status = EmailStatus.FAILED
            await self._update_email_status(email_message)
    
    async def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """Add attachment to email"""
        try:
            # attachment = {'filename': 'file.pdf', 'content': bytes, 'content_type': 'application/pdf'}
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment['content'])
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f"attachment; filename= {attachment['filename']}"
            )
            msg.attach(part)
        except Exception as e:
            logger.error(f"Error adding attachment: {e}")
    
    async def _update_email_status(self, email_message: EmailMessage):
        """Update email status in Redis"""
        try:
            await self.redis.hset(
                f"email:{email_message.id}",
                "data",
                json.dumps(asdict(email_message), default=str)
            )
            
            # Publish status update event
            await self.redis.publish(
                "email:status",
                json.dumps({
                    'id': email_message.id,
                    'status': email_message.status.value,
                    'timestamp': datetime.utcnow().isoformat()
                })
            )
        except Exception as e:
            logger.error(f"Error updating email status: {e}")
    
    async def track_open(self, tracking_id: str):
        """Track email open"""
        try:
            # Find email by tracking ID
            email_id = await self._find_email_by_tracking_id(tracking_id)
            if email_id:
                email_data = await self.redis.hget(f"email:{email_id}", "data")
                if email_data:
                    email_dict = json.loads(email_data)
                    email_message = EmailMessage(**email_dict)
                    
                    # Update status
                    if email_message.status != EmailStatus.OPENED:
                        email_message.status = EmailStatus.OPENED
                        email_message.opened_at = datetime.utcnow()
                        await self._update_email_status(email_message)
                        
                        logger.info(f"Email {email_id} opened")
        except Exception as e:
            logger.error(f"Error tracking email open: {e}")
    
    async def track_click(self, tracking_id: str, link: str):
        """Track email link click"""
        try:
            email_id = await self._find_email_by_tracking_id(tracking_id)
            if email_id:
                email_data = await self.redis.hget(f"email:{email_id}", "data")
                if email_data:
                    email_dict = json.loads(email_data)
                    email_message = EmailMessage(**email_dict)
                    
                    # Update status
                    email_message.status = EmailStatus.CLICKED
                    email_message.clicked_at = datetime.utcnow()
                    
                    # Track which link was clicked
                    if not email_message.metadata:
                        email_message.metadata = {}
                    if 'clicked_links' not in email_message.metadata:
                        email_message.metadata['clicked_links'] = []
                    email_message.metadata['clicked_links'].append({
                        'link': link,
                        'clicked_at': datetime.utcnow().isoformat()
                    })
                    
                    await self._update_email_status(email_message)
                    
                    logger.info(f"Email {email_id} link clicked: {link}")
        except Exception as e:
            logger.error(f"Error tracking email click: {e}")
    
    async def unsubscribe(self, tracking_id: str):
        """Handle unsubscribe request"""
        try:
            email_id = await self._find_email_by_tracking_id(tracking_id)
            if email_id:
                email_data = await self.redis.hget(f"email:{email_id}", "data")
                if email_data:
                    email_dict = json.loads(email_data)
                    email_message = EmailMessage(**email_dict)
                    
                    # Add to unsubscribe list
                    for email in email_message.to:
                        await self.redis.sadd("email:unsubscribed", email)
                    
                    # Update status
                    email_message.status = EmailStatus.UNSUBSCRIBED
                    await self._update_email_status(email_message)
                    
                    logger.info(f"Unsubscribe request for {email_message.to}")
        except Exception as e:
            logger.error(f"Error processing unsubscribe: {e}")
    
    async def _find_email_by_tracking_id(self, tracking_id: str) -> Optional[str]:
        """Find email ID by tracking ID"""
        # This would typically query a database
        # For now, scan Redis keys (not efficient for production)
        cursor = b'0'
        while cursor:
            cursor, keys = await self.redis.scan(cursor, match=b'email:*')
            for key in keys:
                if key.startswith(b'email:') and not key.startswith(b'email:queue'):
                    email_data = await self.redis.hget(key, "data")
                    if email_data:
                        email_dict = json.loads(email_data)
                        if email_dict.get('tracking_id') == tracking_id:
                            return key.decode().replace('email:', '')
        return None
    
    async def get_email_status(self, email_id: str) -> Optional[Dict[str, Any]]:
        """Get email status"""
        try:
            email_data = await self.redis.hget(f"email:{email_id}", "data")
            if email_data:
                return json.loads(email_data)
        except Exception as e:
            logger.error(f"Error getting email status: {e}")
        return None
    
    async def get_email_stats(self) -> Dict[str, Any]:
        """Get email statistics"""
        try:
            stats = {
                'queued': 0,
                'sent': 0,
                'failed': 0,
                'opened': 0,
                'clicked': 0,
                'unsubscribed': await self.redis.scard("email:unsubscribed")
            }
            
            # Count emails by priority queue
            for priority in EmailPriority:
                queue_name = f"email:queue:{priority.value}"
                stats['queued'] += await self.redis.llen(queue_name)
            
            # Count scheduled emails
            stats['scheduled'] = await self.redis.llen("email:scheduled")
            
            # Count retry queue
            stats['retry_queue'] = await self.redis.scard("email:retry")
            
            return stats
        except Exception as e:
            logger.error(f"Error getting email stats: {e}")
            return {}
    
    async def cleanup(self):
        """Cleanup resources"""
        self.running = False
        
        # Wait for workers to finish
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)
        
        # Close Redis connection
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()


# FastAPI integration example
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List

app = FastAPI()
email_service = None

class EmailRequest(BaseModel):
    to: List[EmailStr]
    subject: str
    template: str
    context: Dict[str, Any]
    priority: Optional[str] = "normal"
    scheduled_at: Optional[datetime] = None

@app.on_event("startup")
async def startup():
    global email_service
    email_service = AdvancedEmailService(
        smtp_host="smtp.gmail.com",
        smtp_port=587,
        smtp_user="your-email@gmail.com",
        smtp_password="your-app-password"
    )
    await email_service.initialize()

@app.on_event("shutdown")
async def shutdown():
    if email_service:
        await email_service.cleanup()

@app.post("/api/email/send")
async def send_email(request: EmailRequest):
    """Send email endpoint"""
    try:
        priority_map = {
            'high': EmailPriority.HIGH,
            'normal': EmailPriority.NORMAL,
            'low': EmailPriority.LOW,
            'bulk': EmailPriority.BULK
        }
        
        email_id = await email_service.send_email(
            to=request.to,
            subject=request.subject,
            template=request.template,
            context=request.context,
            priority=priority_map.get(request.priority, EmailPriority.NORMAL),
            scheduled_at=request.scheduled_at
        )
        
        return {"email_id": email_id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/email/track/open/{tracking_id}")
async def track_open(tracking_id: str):
    """Track email open"""
    await email_service.track_open(tracking_id)
    # Return 1x1 transparent pixel
    return Response(
        content=base64.b64decode(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        ),
        media_type="image/gif"
    )

@app.get("/api/email/track/click/{tracking_id}")
async def track_click(tracking_id: str, url: str):
    """Track email click and redirect"""
    await email_service.track_click(tracking_id, url)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)

@app.get("/api/email/status/{email_id}")
async def get_email_status(email_id: str):
    """Get email status"""
    status = await email_service.get_email_status(email_id)
    if not status:
        raise HTTPException(status_code=404, detail="Email not found")
    return status

@app.get("/api/email/stats")
async def get_email_stats():
    """Get email statistics"""
    return await email_service.get_email_stats()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)