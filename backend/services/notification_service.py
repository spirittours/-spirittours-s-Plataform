"""
Advanced Notification Service for Enterprise Booking Platform
Supports Email, SMS, Push Notifications with templating and multi-provider support
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union, Any
from enum import Enum
from dataclasses import dataclass
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape
import aiohttp
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field, validator
import os
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Use the same Base as rbac_models
try:
    from models.rbac_models import Base
except ImportError:
    # Fallback for when rbac_models is not available
    from sqlalchemy.ext.declarative import declarative_base
    Base = declarative_base()

class NotificationType(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    WHATSAPP = "whatsapp"
    SLACK = "slack"
    WEBHOOK = "webhook"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"

class EmailProvider(str, Enum):
    SMTP = "smtp"
    SENDGRID = "sendgrid"
    MAILGUN = "mailgun"
    SES = "ses"
    RESEND = "resend"

class SMSProvider(str, Enum):
    TWILIO = "twilio"
    VONAGE = "vonage"
    AWS_SNS = "aws_sns"
    PLIVO = "plivo"

# Database Models
class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    type = Column(SQLEnum(NotificationType), nullable=False)
    subject_template = Column(String(200))  # For email
    body_template = Column(Text, nullable=False)
    variables = Column(JSON)  # Expected template variables
    language = Column(String(10), default="en")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String(255), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    template_name = Column(String(100))
    subject = Column(String(200))
    content = Column(Text)
    status = Column(SQLEnum(NotificationStatus), default=NotificationStatus.PENDING)
    priority = Column(SQLEnum(NotificationPriority), default=NotificationPriority.MEDIUM)
    provider = Column(String(50))
    provider_response = Column(JSON)
    error_message = Column(Text)
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    notification_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
@dataclass
class NotificationConfig:
    """Notification service configuration"""
    
    # Email Configuration
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    
    # SendGrid
    sendgrid_api_key: str = ""
    
    # Mailgun
    mailgun_api_key: str = ""
    mailgun_domain: str = ""
    
    # AWS SES
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    
    # SMS Configuration
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    
    # Vonage (Nexmo)
    vonage_api_key: str = ""
    vonage_api_secret: str = ""
    
    # WhatsApp Business API
    whatsapp_phone_number_id: str = ""
    whatsapp_access_token: str = ""
    
    # Push Notifications
    firebase_server_key: str = ""
    apns_certificate_path: str = ""
    
    # Default settings
    default_email_provider: EmailProvider = EmailProvider.SMTP
    default_sms_provider: SMSProvider = SMSProvider.TWILIO
    max_retry_attempts: int = 3
    retry_delay_seconds: int = 60

class NotificationRequest(BaseModel):
    recipient: str = Field(..., description="Email, phone number, or device token")
    type: NotificationType
    template_name: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    priority: NotificationPriority = NotificationPriority.MEDIUM
    scheduled_at: Optional[datetime] = None
    attachments: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('recipient')
    def validate_recipient(cls, v, values):
        if 'type' in values:
            if values['type'] == NotificationType.EMAIL and '@' not in v:
                raise ValueError('Invalid email address')
            elif values['type'] == NotificationType.SMS and not v.replace('+', '').replace('-', '').replace(' ', '').isdigit():
                raise ValueError('Invalid phone number')
        return v

class BulkNotificationRequest(BaseModel):
    recipients: List[str]
    type: NotificationType
    template_name: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    variables: Dict[str, Any] = Field(default_factory=dict)
    priority: NotificationPriority = NotificationPriority.MEDIUM
    batch_size: int = Field(default=100, le=1000)
    delay_between_batches: int = Field(default=1, description="Seconds between batches")

class NotificationResponse(BaseModel):
    success: bool
    message: str
    notification_id: Optional[int] = None
    provider_response: Optional[Dict] = None
    error: Optional[str] = None

class EmailProvider_Implementation:
    """Email provider implementations"""
    
    @staticmethod
    async def send_smtp(config: NotificationConfig, to_email: str, subject: str, 
                       html_body: str, text_body: str = None, attachments: List[str] = None) -> Dict:
        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = config.smtp_username
            message['To'] = to_email
            
            # Add text and HTML parts
            if text_body:
                message.attach(MIMEText(text_body, 'plain'))
            message.attach(MIMEText(html_body, 'html'))
            
            # Add attachments
            if attachments:
                for file_path in attachments:
                    if os.path.exists(file_path):
                        with open(file_path, "rb") as attachment:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(attachment.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {os.path.basename(file_path)}'
                            )
                            message.attach(part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=config.smtp_host,
                port=config.smtp_port,
                start_tls=config.smtp_use_tls,
                username=config.smtp_username,
                password=config.smtp_password
            )
            
            return {"success": True, "provider": "smtp"}
            
        except Exception as e:
            logger.error(f"SMTP send failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def send_sendgrid(config: NotificationConfig, to_email: str, subject: str,
                           html_body: str, text_body: str = None) -> Dict:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {config.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {"email": config.smtp_username},
                "content": [
                    {"type": "text/html", "value": html_body}
                ]
            }
            
            if text_body:
                data["content"].insert(0, {"type": "text/plain", "value": text_body})
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=data) as response:
                    if response.status == 202:
                        return {"success": True, "provider": "sendgrid"}
                    else:
                        error_text = await response.text()
                        return {"success": False, "error": f"SendGrid API error: {error_text}"}
                        
        except Exception as e:
            logger.error(f"SendGrid send failed: {str(e)}")
            return {"success": False, "error": str(e)}

class SMSProvider_Implementation:
    """SMS provider implementations"""
    
    @staticmethod
    async def send_twilio(config: NotificationConfig, to_phone: str, message: str) -> Dict:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{config.twilio_account_sid}/Messages.json"
            
            auth = aiohttp.BasicAuth(config.twilio_account_sid, config.twilio_auth_token)
            data = {
                'From': config.twilio_phone_number,
                'To': to_phone,
                'Body': message
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, auth=auth, data=data) as response:
                    result = await response.json()
                    
                    if response.status == 201:
                        return {
                            "success": True, 
                            "provider": "twilio",
                            "message_sid": result.get("sid")
                        }
                    else:
                        return {
                            "success": False, 
                            "error": f"Twilio API error: {result.get('message', 'Unknown error')}"
                        }
                        
        except Exception as e:
            logger.error(f"Twilio send failed: {str(e)}")
            return {"success": False, "error": str(e)}

class NotificationService:
    """Enterprise Notification Service with multi-provider support"""
    
    def __init__(self, config: NotificationConfig, db_session: Session):
        self.config = config
        self.db = db_session
        
        # Initialize Jinja2 template engine
        templates_path = Path(__file__).parent.parent / "templates" / "notifications"
        templates_path.mkdir(parents=True, exist_ok=True)
        
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(templates_path)),
            autoescape=select_autoescape(['html', 'xml'])
        )
        
        # Provider implementations
        self.email_providers = EmailProvider_Implementation()
        self.sms_providers = SMSProvider_Implementation()
        
        logger.info("NotificationService initialized")
    
    def _get_template(self, template_name: str, language: str = "en") -> Optional[NotificationTemplate]:
        """Get notification template from database"""
        return self.db.query(NotificationTemplate).filter(
            NotificationTemplate.name == template_name,
            NotificationTemplate.language == language,
            NotificationTemplate.is_active == True
        ).first()
    
    def _render_template(self, template_content: str, variables: Dict[str, Any]) -> str:
        """Render Jinja2 template with variables"""
        try:
            template = self.jinja_env.from_string(template_content)
            return template.render(**variables)
        except Exception as e:
            logger.error(f"Template rendering failed: {str(e)}")
            return template_content
    
    async def send_notification(self, request: NotificationRequest) -> NotificationResponse:
        """Send a single notification"""
        
        # Create notification log entry
        log_entry = NotificationLog(
            recipient=request.recipient,
            type=request.type,
            template_name=request.template_name,
            subject=request.subject,
            priority=request.priority,
            scheduled_at=request.scheduled_at,
            notification_metadata=request.metadata
        )
        
        try:
            # Get template if specified
            if request.template_name:
                template = self._get_template(request.template_name)
                if not template:
                    error_msg = f"Template '{request.template_name}' not found"
                    log_entry.status = NotificationStatus.FAILED
                    log_entry.error_message = error_msg
                    self.db.add(log_entry)
                    self.db.commit()
                    return NotificationResponse(success=False, error=error_msg)
                
                # Render template
                subject = self._render_template(template.subject_template or "", request.variables) if template.subject_template else request.subject
                content = self._render_template(template.body_template, request.variables)
            else:
                subject = request.subject
                content = request.content
            
            log_entry.subject = subject
            log_entry.content = content
            
            # Check if scheduled for later
            if request.scheduled_at and request.scheduled_at > datetime.utcnow():
                log_entry.status = NotificationStatus.PENDING
                self.db.add(log_entry)
                self.db.commit()
                return NotificationResponse(
                    success=True,
                    message=f"Notification scheduled for {request.scheduled_at}",
                    notification_id=log_entry.id
                )
            
            # Send notification based on type
            if request.type == NotificationType.EMAIL:
                result = await self._send_email(request.recipient, subject, content, request.attachments)
            elif request.type == NotificationType.SMS:
                result = await self._send_sms(request.recipient, content)
            elif request.type == NotificationType.WHATSAPP:
                result = await self._send_whatsapp(request.recipient, content)
            else:
                result = {"success": False, "error": f"Notification type {request.type} not implemented"}
            
            # Update log entry
            if result["success"]:
                log_entry.status = NotificationStatus.SENT
                log_entry.sent_at = datetime.utcnow()
                log_entry.provider = result.get("provider")
                log_entry.provider_response = result
            else:
                log_entry.status = NotificationStatus.FAILED
                log_entry.error_message = result.get("error")
            
            self.db.add(log_entry)
            self.db.commit()
            
            return NotificationResponse(
                success=result["success"],
                message="Notification sent successfully" if result["success"] else result.get("error"),
                notification_id=log_entry.id,
                provider_response=result,
                error=result.get("error") if not result["success"] else None
            )
            
        except Exception as e:
            logger.error(f"Notification send failed: {str(e)}")
            log_entry.status = NotificationStatus.FAILED
            log_entry.error_message = str(e)
            self.db.add(log_entry)
            self.db.commit()
            
            return NotificationResponse(
                success=False,
                error=str(e),
                notification_id=log_entry.id
            )
    
    async def send_bulk_notifications(self, request: BulkNotificationRequest) -> Dict[str, Any]:
        """Send notifications to multiple recipients in batches"""
        
        total_recipients = len(request.recipients)
        successful_sends = 0
        failed_sends = 0
        results = []
        
        # Process in batches
        for i in range(0, total_recipients, request.batch_size):
            batch = request.recipients[i:i + request.batch_size]
            batch_results = []
            
            # Send notifications concurrently within batch
            tasks = []
            for recipient in batch:
                notification_request = NotificationRequest(
                    recipient=recipient,
                    type=request.type,
                    template_name=request.template_name,
                    subject=request.subject,
                    content=request.content,
                    variables=request.variables,
                    priority=request.priority
                )
                tasks.append(self.send_notification(notification_request))
            
            batch_responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            for response in batch_responses:
                if isinstance(response, Exception):
                    failed_sends += 1
                    batch_results.append({"success": False, "error": str(response)})
                else:
                    if response.success:
                        successful_sends += 1
                    else:
                        failed_sends += 1
                    batch_results.append({
                        "success": response.success,
                        "notification_id": response.notification_id,
                        "error": response.error
                    })
            
            results.extend(batch_results)
            
            # Delay between batches (except for the last batch)
            if i + request.batch_size < total_recipients:
                await asyncio.sleep(request.delay_between_batches)
        
        return {
            "total_recipients": total_recipients,
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "success_rate": (successful_sends / total_recipients) * 100 if total_recipients > 0 else 0,
            "results": results
        }
    
    async def _send_email(self, to_email: str, subject: str, content: str, attachments: List[str] = None) -> Dict:
        """Send email using configured provider"""
        
        provider = self.config.default_email_provider
        
        if provider == EmailProvider.SMTP:
            return await self.email_providers.send_smtp(
                self.config, to_email, subject, content, None, attachments
            )
        elif provider == EmailProvider.SENDGRID:
            return await self.email_providers.send_sendgrid(
                self.config, to_email, subject, content
            )
        else:
            return {"success": False, "error": f"Email provider {provider} not implemented"}
    
    async def _send_sms(self, to_phone: str, message: str) -> Dict:
        """Send SMS using configured provider"""
        
        provider = self.config.default_sms_provider
        
        if provider == SMSProvider.TWILIO:
            return await self.sms_providers.send_twilio(self.config, to_phone, message)
        else:
            return {"success": False, "error": f"SMS provider {provider} not implemented"}
    
    async def _send_whatsapp(self, to_phone: str, message: str) -> Dict:
        """Send WhatsApp message using Business API"""
        try:
            url = f"https://graph.facebook.com/v17.0/{self.config.whatsapp_phone_number_id}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.config.whatsapp_access_token}",
                "Content-Type": "application/json"
            }
            
            data = {
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "text",
                "text": {"body": message}
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=data) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        return {
                            "success": True,
                            "provider": "whatsapp",
                            "message_id": result.get("messages", [{}])[0].get("id")
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"WhatsApp API error: {result.get('error', {}).get('message', 'Unknown error')}"
                        }
                        
        except Exception as e:
            logger.error(f"WhatsApp send failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def create_template(self, name: str, type: NotificationType, subject_template: str,
                       body_template: str, variables: List[str], language: str = "en") -> bool:
        """Create a new notification template"""
        try:
            template = NotificationTemplate(
                name=name,
                type=type,
                subject_template=subject_template,
                body_template=body_template,
                variables=variables,
                language=language
            )
            
            self.db.add(template)
            self.db.commit()
            
            logger.info(f"Template '{name}' created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Template creation failed: {str(e)}")
            self.db.rollback()
            return False
    
    def get_notification_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Get notification statistics for the specified period"""
        
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Query statistics
        logs = self.db.query(NotificationLog).filter(
            NotificationLog.created_at >= start_date
        ).all()
        
        total = len(logs)
        if total == 0:
            return {"total": 0, "success_rate": 0}
        
        by_status = {}
        by_type = {}
        by_provider = {}
        
        for log in logs:
            # By status
            by_status[log.status] = by_status.get(log.status, 0) + 1
            
            # By type
            by_type[log.type] = by_type.get(log.type, 0) + 1
            
            # By provider
            if log.provider:
                by_provider[log.provider] = by_provider.get(log.provider, 0) + 1
        
        successful = by_status.get(NotificationStatus.SENT, 0) + by_status.get(NotificationStatus.DELIVERED, 0)
        success_rate = (successful / total) * 100
        
        return {
            "total_notifications": total,
            "success_rate": round(success_rate, 2),
            "by_status": by_status,
            "by_type": by_type,
            "by_provider": by_provider,
            "period_days": days
        }

# Utility functions for common notification templates
async def send_booking_confirmation_email(service: NotificationService, booking_data: Dict[str, Any]) -> NotificationResponse:
    """Send booking confirmation email"""
    
    request = NotificationRequest(
        recipient=booking_data["customer_email"],
        type=NotificationType.EMAIL,
        template_name="booking_confirmation",
        variables={
            "customer_name": booking_data.get("customer_name"),
            "booking_id": booking_data.get("booking_id"),
            "destination": booking_data.get("destination"),
            "check_in_date": booking_data.get("check_in_date"),
            "check_out_date": booking_data.get("check_out_date"),
            "total_amount": booking_data.get("total_amount"),
            "currency": booking_data.get("currency", "USD")
        },
        priority=NotificationPriority.HIGH
    )
    
    return await service.send_notification(request)

async def send_booking_reminder_sms(service: NotificationService, booking_data: Dict[str, Any]) -> NotificationResponse:
    """Send booking reminder SMS"""
    
    request = NotificationRequest(
        recipient=booking_data["customer_phone"],
        type=NotificationType.SMS,
        template_name="booking_reminder",
        variables={
            "customer_name": booking_data.get("customer_name"),
            "destination": booking_data.get("destination"),
            "check_in_date": booking_data.get("check_in_date")
        },
        priority=NotificationPriority.MEDIUM
    )
    
    return await service.send_notification(request)

# B2B Administrative Notification Methods Extension
class B2BNotificationMixin:
    """B2B specific notification methods for administrative workflows"""
    
    async def send_b2b_approval_notification(self, user_email: str, user_name: str, 
                                            company_name: str, commission_rate: float, 
                                            special_conditions: Dict = None) -> NotificationResponse:
        """Send B2B application approval notification"""
        
        try:
            special_conditions = special_conditions or {}
            
            variables = {
                "user_name": user_name,
                "company_name": company_name,
                "commission_rate": f"{commission_rate * 100:.2f}%",
                "approval_date": datetime.now().strftime("%B %d, %Y"),
                "login_url": "https://spirittours.com/partner/login",
                "support_email": "partners@spirittours.com",
                "special_conditions": special_conditions
            }
            
            request = NotificationRequest(
                recipient=user_email,
                type=NotificationType.EMAIL,
                subject=f"¡Congratulations! Your B2B Partnership with Spirit Tours has been Approved",
                content=self._get_b2b_approval_template(),
                variables=variables,
                priority=NotificationPriority.HIGH,
                metadata={
                    "notification_type": "b2b_approval",
                    "company_name": company_name,
                    "commission_rate": commission_rate
                }
            )
            
            return await self.send_notification(request)
            
        except Exception as e:
            logger.error(f"Failed to send B2B approval notification to {user_email}: {e}")
            return NotificationResponse(
                success=False,
                message="Failed to send approval notification",
                error=str(e)
            )
    
    async def send_b2b_rejection_notification(self, user_email: str, user_name: str,
                                             company_name: str, rejection_reason: str) -> NotificationResponse:
        """Send B2B application rejection notification"""
        
        try:
            variables = {
                "user_name": user_name,
                "company_name": company_name,
                "rejection_reason": rejection_reason,
                "rejection_date": datetime.now().strftime("%B %d, %Y"),
                "reapply_url": "https://spirittours.com/register/b2b",
                "support_email": "partners@spirittours.com"
            }
            
            request = NotificationRequest(
                recipient=user_email,
                type=NotificationType.EMAIL,
                subject=f"Update on Your B2B Partnership Application with Spirit Tours",
                content=self._get_b2b_rejection_template(),
                variables=variables,
                priority=NotificationPriority.HIGH,
                metadata={
                    "notification_type": "b2b_rejection",
                    "company_name": company_name,
                    "rejection_reason": rejection_reason
                }
            )
            
            return await self.send_notification(request)
            
        except Exception as e:
            logger.error(f"Failed to send B2B rejection notification to {user_email}: {e}")
            return NotificationResponse(
                success=False,
                message="Failed to send rejection notification",
                error=str(e)
            )
    
    async def send_account_suspension_notification(self, user_email: str, user_name: str,
                                                  suspension_reason: str, 
                                                  reactivation_date: Optional[datetime] = None) -> NotificationResponse:
        """Send account suspension notification"""
        
        try:
            variables = {
                "user_name": user_name,
                "suspension_reason": suspension_reason,
                "suspension_date": datetime.now().strftime("%B %d, %Y"),
                "reactivation_date": reactivation_date.strftime("%B %d, %Y") if reactivation_date else "To be determined",
                "appeal_email": "appeals@spirittours.com",
                "support_phone": "+1-800-SPIRIT-TOURS"
            }
            
            request = NotificationRequest(
                recipient=user_email,
                type=NotificationType.EMAIL,
                subject="Important: Spirit Tours Partner Account Status Update",
                content=self._get_account_suspension_template(),
                variables=variables,
                priority=NotificationPriority.URGENT,
                metadata={
                    "notification_type": "account_suspension",
                    "suspension_reason": suspension_reason
                }
            )
            
            return await self.send_notification(request)
            
        except Exception as e:
            logger.error(f"Failed to send suspension notification to {user_email}: {e}")
            return NotificationResponse(
                success=False,
                message="Failed to send suspension notification",
                error=str(e)
            )
    
    async def send_account_reactivation_notification(self, user_email: str, user_name: str) -> NotificationResponse:
        """Send account reactivation notification"""
        
        try:
            variables = {
                "user_name": user_name,
                "reactivation_date": datetime.now().strftime("%B %d, %Y"),
                "login_url": "https://spirittours.com/partner/login",
                "partner_dashboard_url": "https://spirittours.com/partner/dashboard",
                "support_email": "partners@spirittours.com"
            }
            
            request = NotificationRequest(
                recipient=user_email,
                type=NotificationType.EMAIL,
                subject="Welcome Back! Your Spirit Tours Partner Account is Reactivated",
                content=self._get_account_reactivation_template(),
                variables=variables,
                priority=NotificationPriority.HIGH,
                metadata={
                    "notification_type": "account_reactivation"
                }
            )
            
            return await self.send_notification(request)
            
        except Exception as e:
            logger.error(f"Failed to send reactivation notification to {user_email}: {e}")
            return NotificationResponse(
                success=False,
                message="Failed to send reactivation notification",
                error=str(e)
            )
    
    async def send_commission_update_notification(self, user_email: str, user_name: str,
                                                 old_rate: float, new_rate: float,
                                                 effective_date: datetime) -> NotificationResponse:
        """Send commission rate update notification"""
        
        try:
            variables = {
                "user_name": user_name,
                "old_rate": f"{old_rate * 100:.2f}%",
                "new_rate": f"{new_rate * 100:.2f}%",
                "effective_date": effective_date.strftime("%B %d, %Y"),
                "rate_change": "increase" if new_rate > old_rate else "decrease",
                "dashboard_url": "https://spirittours.com/partner/dashboard",
                "support_email": "partners@spirittours.com"
            }
            
            request = NotificationRequest(
                recipient=user_email,
                type=NotificationType.EMAIL,
                subject="Commission Rate Update - Spirit Tours Partnership",
                content=self._get_commission_update_template(),
                variables=variables,
                priority=NotificationPriority.HIGH,
                metadata={
                    "notification_type": "commission_update",
                    "old_rate": old_rate,
                    "new_rate": new_rate
                }
            )
            
            return await self.send_notification(request)
            
        except Exception as e:
            logger.error(f"Failed to send commission update notification to {user_email}: {e}")
            return NotificationResponse(
                success=False,
                message="Failed to send commission update notification",
                error=str(e)
            )
    
    def _get_b2b_approval_template(self) -> str:
        """B2B approval email template"""
        return """
        <html>
        <head><title>Spirit Tours - Partnership Approved!</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://spirittours.com/logo.png" alt="Spirit Tours" style="height: 60px;">
                <h1 style="color: #2c5aa0;">🎉 Partnership Approved!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h2 style="color: #28a745;">Dear {{ user_name }},</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    Congratulations! We're thrilled to inform you that <strong>{{ company_name }}</strong> has been 
                    approved as an official Spirit Tours partner.
                </p>
            </div>
            
            <div style="background: #e8f4f8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #2c5aa0;">Partnership Details:</h3>
                <ul style="font-size: 16px; line-height: 1.6;">
                    <li><strong>Commission Rate:</strong> {{ commission_rate }}</li>
                    <li><strong>Approval Date:</strong> {{ approval_date }}</li>
                    <li><strong>Status:</strong> Active</li>
                </ul>
            </div>
            
            {% if special_conditions %}
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h4 style="color: #856404;">Special Partnership Conditions:</h4>
                <ul>
                {% for condition, value in special_conditions.items() %}
                    <li><strong>{{ condition }}:</strong> {{ value }}</li>
                {% endfor %}
                </ul>
            </div>
            {% endif %}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ login_url }}" style="background: #2c5aa0; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Access Partner Dashboard
                </a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6c757d; font-size: 14px;">
                    Need help getting started? Contact our partner support team at 
                    <a href="mailto:{{ support_email }}">{{ support_email }}</a>
                </p>
                <p style="color: #6c757d; font-size: 12px; text-align: center;">
                    © 2024 Spirit Tours. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _get_b2b_rejection_template(self) -> str:
        """B2B rejection email template"""
        return """
        <html>
        <head><title>Spirit Tours - Partnership Application Update</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://spirittours.com/logo.png" alt="Spirit Tours" style="height: 60px;">
                <h1 style="color: #2c5aa0;">Partnership Application Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h2 style="color: #6c757d;">Dear {{ user_name }},</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    Thank you for your interest in becoming a Spirit Tours partner. After careful review of 
                    <strong>{{ company_name }}</strong>'s application, we regret to inform you that we cannot 
                    approve your partnership application at this time.
                </p>
            </div>
            
            <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #721c24;">Reason for Decision:</h3>
                <p style="font-size: 16px; line-height: 1.6;">{{ rejection_reason }}</p>
            </div>
            
            <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #0c5460;">Future Opportunities:</h3>
                <p style="font-size: 16px; line-height: 1.6;">
                    We encourage you to address the concerns mentioned above and reapply in the future. 
                    Our partnership requirements may also change, creating new opportunities.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ reapply_url }}" style="background: #17a2b8; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Reapply for Partnership
                </a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6c757d; font-size: 14px;">
                    Questions about this decision? Contact us at 
                    <a href="mailto:{{ support_email }}">{{ support_email }}</a>
                </p>
                <p style="color: #6c757d; font-size: 12px; text-align: center;">
                    © 2024 Spirit Tours. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _get_account_suspension_template(self) -> str:
        """Account suspension email template"""
        return """
        <html>
        <head><title>Spirit Tours - Account Status Update</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://spirittours.com/logo.png" alt="Spirit Tours" style="height: 60px;">
                <h1 style="color: #dc3545;">⚠️ Account Suspended</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h2 style="color: #721c24;">Dear {{ user_name }},</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    We are writing to inform you that your Spirit Tours partner account has been suspended 
                    effective {{ suspension_date }}.
                </p>
            </div>
            
            <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #dc3545;">
                <h3 style="color: #721c24;">Suspension Details:</h3>
                <ul style="font-size: 16px; line-height: 1.6;">
                    <li><strong>Reason:</strong> {{ suspension_reason }}</li>
                    <li><strong>Suspension Date:</strong> {{ suspension_date }}</li>
                    <li><strong>Expected Reactivation:</strong> {{ reactivation_date }}</li>
                </ul>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #856404;">What This Means:</h3>
                <ul style="font-size: 16px; line-height: 1.6;">
                    <li>Access to your partner dashboard is temporarily restricted</li>
                    <li>New bookings through your account are paused</li>
                    <li>Existing bookings will continue to be processed</li>
                    <li>Commission payments for completed bookings will proceed as normal</li>
                </ul>
            </div>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #155724;">Appeal Process:</h3>
                <p style="font-size: 16px; line-height: 1.6;">
                    If you believe this suspension was made in error or would like to appeal this decision, 
                    please contact our appeals team within 30 days.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:{{ appeal_email }}" style="background: #dc3545; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Submit Appeal
                </a>
                <div style="margin-top: 15px;">
                    <p style="color: #6c757d;">Or call us at: <strong>{{ support_phone }}</strong></p>
                </div>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6c757d; font-size: 12px; text-align: center;">
                    © 2024 Spirit Tours. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _get_account_reactivation_template(self) -> str:
        """Account reactivation email template"""
        return """
        <html>
        <head><title>Spirit Tours - Account Reactivated</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://spirittours.com/logo.png" alt="Spirit Tours" style="height: 60px;">
                <h1 style="color: #28a745;">🎉 Welcome Back!</h1>
            </div>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h2 style="color: #155724;">Dear {{ user_name }},</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    Great news! Your Spirit Tours partner account has been successfully reactivated as of 
                    {{ reactivation_date }}. We're excited to have you back as part of our partner network.
                </p>
            </div>
            
            <div style="background: #e8f4f8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #2c5aa0;">Account Status:</h3>
                <ul style="font-size: 16px; line-height: 1.6;">
                    <li>✅ Partner dashboard access restored</li>
                    <li>✅ Booking capabilities fully active</li>
                    <li>✅ Commission structure reactivated</li>
                    <li>✅ All partner benefits available</li>
                </ul>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #495057;">Next Steps:</h3>
                <ol style="font-size: 16px; line-height: 1.6;">
                    <li>Log in to your partner dashboard to review your account</li>
                    <li>Update any account information if needed</li>
                    <li>Review current promotions and offerings</li>
                    <li>Start creating new bookings for your clients</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ login_url }}" style="background: #28a745; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">
                    Login Now
                </a>
                <a href="{{ partner_dashboard_url }}" style="background: #2c5aa0; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; font-weight: bold;">
                    View Dashboard
                </a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6c757d; font-size: 14px;">
                    Questions or need assistance? Our partner support team is here to help at 
                    <a href="mailto:{{ support_email }}">{{ support_email }}</a>
                </p>
                <p style="color: #6c757d; font-size: 12px; text-align: center;">
                    © 2024 Spirit Tours. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
    
    def _get_commission_update_template(self) -> str:
        """Commission update email template"""
        return """
        <html>
        <head><title>Spirit Tours - Commission Rate Update</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://spirittours.com/logo.png" alt="Spirit Tours" style="height: 60px;">
                <h1 style="color: #2c5aa0;">Commission Rate Update</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h2 style="color: #495057;">Dear {{ user_name }},</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                    We're writing to notify you of an update to your commission rate structure, 
                    effective {{ effective_date }}.
                </p>
            </div>
            
            {% if rate_change == "increase" %}
            <div style="background: #d4edda; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #28a745;">
                <h3 style="color: #155724;">📈 Commission Increase!</h3>
            {% else %}
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #ffc107;">
                <h3 style="color: #856404;">📊 Commission Adjustment</h3>
            {% endif %}
                <ul style="font-size: 16px; line-height: 1.6;">
                    <li><strong>Previous Rate:</strong> {{ old_rate }}</li>
                    <li><strong>New Rate:</strong> {{ new_rate }}</li>
                    <li><strong>Effective Date:</strong> {{ effective_date }}</li>
                </ul>
            </div>
            
            <div style="background: #e8f4f8; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #2c5aa0;">What This Means:</h3>
                <ul style="font-size: 16px; line-height: 1.6;">
                    <li>All new bookings will use the updated commission rate</li>
                    <li>Existing bookings maintain their original commission structure</li>
                    <li>The change is reflected immediately in your partner dashboard</li>
                    <li>Updated commission structure applies to all booking channels</li>
                </ul>
            </div>
            
            {% if rate_change == "increase" %}
            <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: #0c5460;">Thank You!</h3>
                <p style="font-size: 16px; line-height: 1.6;">
                    This increase reflects your excellent performance and partnership with Spirit Tours. 
                    We appreciate your continued commitment to providing exceptional service to travelers.
                </p>
            </div>
            {% endif %}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ dashboard_url }}" style="background: #2c5aa0; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 5px; font-weight: bold;">
                    View Updated Dashboard
                </a>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6c757d; font-size: 14px;">
                    Questions about your commission structure? Contact us at 
                    <a href="mailto:{{ support_email }}">{{ support_email }}</a>
                </p>
                <p style="color: #6c757d; font-size: 12px; text-align: center;">
                    © 2024 Spirit Tours. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

# Extend NotificationService with B2B capabilities
class NotificationService(NotificationService, B2BNotificationMixin):
    """Enhanced NotificationService with B2B administrative capabilities"""
    pass

# Export main classes
__all__ = [
    "NotificationService",
    "NotificationConfig",
    "NotificationRequest",
    "BulkNotificationRequest", 
    "NotificationResponse",
    "NotificationType",
    "NotificationPriority",
    "NotificationStatus",
    "NotificationTemplate",
    "NotificationLog",
    "B2BNotificationMixin",
    "send_booking_confirmation_email",
    "send_booking_reminder_sms"
]