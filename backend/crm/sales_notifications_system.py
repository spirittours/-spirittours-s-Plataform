"""
Sales Notifications and Alerts System for Spirit Tours CRM
Real-time notifications for sales opportunities, lead changes, and pipeline updates
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import aiohttp
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from email.mime.base import MimeBase
from email import encoders
import twilio
from twilio.rest import Client as TwilioClient
import asyncpg
import redis.asyncio as redis
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, EmailStr, validator
import websockets
from jinja2 import Environment, FileSystemLoader
import schedule
import threading
import time
from celery import Celery
import slack_sdk
from slack_sdk.errors import SlackApiError
import requests
import pywebpush
from cryptography.fernet import Fernet

Base = declarative_base()

# Enums
class NotificationType(Enum):
    NEW_LEAD = "new_lead"
    HOT_LEAD = "hot_lead"
    LEAD_CONVERTED = "lead_converted"
    OPPORTUNITY_CREATED = "opportunity_created"
    STAGE_ADVANCED = "stage_advanced"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"
    PAYMENT_RECEIVED = "payment_received"
    FOLLOW_UP_DUE = "follow_up_due"
    SLA_BREACH = "sla_breach"
    QUOTA_ALERT = "quota_alert"
    PERFORMANCE_MILESTONE = "performance_milestone"

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    SLACK = "slack"
    WEBHOOK = "webhook"
    IN_APP = "in_app"
    WHATSAPP = "whatsapp"
    TEAMS = "teams"

class NotificationPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"

class NotificationStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    EXPIRED = "expired"

class AlertCondition(Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    IN_LIST = "in_list"
    NOT_IN_LIST = "not_in_list"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"

# Database Models
class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)  # NotificationType enum
    channel = Column(String, nullable=False)  # NotificationChannel enum
    
    # Template content
    subject_template = Column(Text)
    body_template = Column(Text)
    html_template = Column(Text)
    
    # Template variables and placeholders
    variables = Column(JSON)  # List of available variables
    sample_data = Column(JSON)  # Sample data for testing
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(String, default="medium")  # NotificationPriority enum
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    notifications = relationship("SalesNotification", back_populates="template")

class NotificationRule(Base):
    __tablename__ = "notification_rules"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    
    # Trigger conditions
    event_type = Column(String, nullable=False)  # What triggers this rule
    conditions = Column(JSON)  # List of conditions to evaluate
    
    # Action settings
    template_id = Column(String, ForeignKey("notification_templates.id"))
    recipients = Column(JSON)  # List of recipient configurations
    channels = Column(JSON)  # List of notification channels
    
    # Timing and frequency
    delay_minutes = Column(Integer, default=0)
    frequency_limit = Column(String)  # daily, weekly, monthly limits
    quiet_hours_start = Column(String)  # e.g., "22:00"
    quiet_hours_end = Column(String)   # e.g., "08:00"
    timezone = Column(String, default="UTC")
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(String, default="medium")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    template = relationship("NotificationTemplate")
    executions = relationship("RuleExecution", back_populates="rule")

class SalesNotification(Base):
    __tablename__ = "sales_notifications"
    
    id = Column(String, primary_key=True)
    template_id = Column(String, ForeignKey("notification_templates.id"))
    rule_id = Column(String, ForeignKey("notification_rules.id"))
    
    # Notification details
    notification_type = Column(String, nullable=False)
    channel = Column(String, nullable=False)
    priority = Column(String, default="medium")
    
    # Recipients
    recipient_type = Column(String)  # user, team, role, custom
    recipient_id = Column(String)
    recipient_email = Column(String)
    recipient_phone = Column(String)
    recipient_name = Column(String)
    
    # Content
    subject = Column(Text)
    message = Column(Text)
    html_content = Column(Text)
    data = Column(JSON)  # Context data used in notification
    
    # Delivery tracking
    status = Column(String, default="pending")  # NotificationStatus enum
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    failed_at = Column(DateTime)
    failure_reason = Column(Text)
    
    # External references
    external_id = Column(String)  # ID from external service (email service, SMS, etc.)
    webhook_response = Column(JSON)
    
    # Related entities
    lead_id = Column(String)
    opportunity_id = Column(String)
    ticket_id = Column(String)
    user_id = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    template = relationship("NotificationTemplate", back_populates="notifications")

class RuleExecution(Base):
    __tablename__ = "rule_executions"
    
    id = Column(String, primary_key=True)
    rule_id = Column(String, ForeignKey("notification_rules.id"))
    
    # Execution details
    trigger_event = Column(String)
    trigger_data = Column(JSON)
    conditions_met = Column(Boolean)
    execution_result = Column(String)  # success, failed, skipped
    
    # Timing
    triggered_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime)
    
    # Results
    notifications_sent = Column(Integer, default=0)
    errors = Column(JSON)
    
    # Relationships
    rule = relationship("NotificationRule", back_populates="executions")

class UserNotificationPreferences(Base):
    __tablename__ = "user_notification_preferences"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    
    # Channel preferences
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=True)
    slack_enabled = Column(Boolean, default=False)
    in_app_enabled = Column(Boolean, default=True)
    
    # Notification type preferences
    new_leads = Column(Boolean, default=True)
    hot_leads = Column(Boolean, default=True)
    conversions = Column(Boolean, default=True)
    follow_ups = Column(Boolean, default=True)
    sla_alerts = Column(Boolean, default=True)
    performance_alerts = Column(Boolean, default=False)
    
    # Timing preferences
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String)
    quiet_hours_end = Column(String)
    timezone = Column(String, default="UTC")
    
    # Contact info
    email_address = Column(String)
    phone_number = Column(String)
    slack_user_id = Column(String)
    push_subscription = Column(JSON)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Models
class NotificationRequest(BaseModel):
    notification_type: NotificationType
    channel: NotificationChannel
    priority: NotificationPriority = NotificationPriority.MEDIUM
    
    recipient_id: Optional[str] = None
    recipient_email: Optional[EmailStr] = None
    recipient_phone: Optional[str] = None
    recipient_name: Optional[str] = None
    
    subject: Optional[str] = None
    message: str
    data: Optional[Dict[str, Any]] = {}
    
    # Related entities
    lead_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    ticket_id: Optional[str] = None
    
    # Scheduling
    send_at: Optional[datetime] = None
    delay_minutes: Optional[int] = 0

class NotificationRuleConfig(BaseModel):
    name: str
    description: Optional[str] = None
    event_type: str
    conditions: List[Dict[str, Any]]
    template_id: str
    recipients: List[Dict[str, Any]]
    channels: List[NotificationChannel]
    priority: NotificationPriority = NotificationPriority.MEDIUM
    delay_minutes: int = 0
    is_active: bool = True

class WebSocketConnection:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
    
    async def register(self, user_id: str, websocket: websockets.WebSocketServerProtocol):
        """Register a new WebSocket connection"""
        self.connections[user_id] = websocket
        await websocket.send(json.dumps({
            'type': 'connection_established',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        }))
    
    async def unregister(self, user_id: str):
        """Unregister a WebSocket connection"""
        if user_id in self.connections:
            del self.connections[user_id]
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user"""
        if user_id in self.connections:
            try:
                await self.connections[user_id].send(json.dumps(message))
            except Exception as e:
                logging.error(f"Failed to send WebSocket message to {user_id}: {e}")
                await self.unregister(user_id)
    
    async def broadcast(self, message: Dict[str, Any], user_ids: Optional[List[str]] = None):
        """Broadcast message to multiple users"""
        targets = user_ids if user_ids else list(self.connections.keys())
        
        for user_id in targets:
            await self.send_to_user(user_id, message)

# Notification Channels
class EmailNotificationChannel:
    """Email notification implementation"""
    
    def __init__(self, smtp_server: str, smtp_port: int, username: str, password: str):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
    
    async def send(self, notification: NotificationRequest) -> Dict[str, Any]:
        """Send email notification"""
        try:
            msg = MimeMultipart('alternative')
            msg['From'] = self.username
            msg['To'] = notification.recipient_email
            msg['Subject'] = notification.subject or f"Spirit Tours - {notification.notification_type.value}"
            
            # Plain text part
            text_part = MimeText(notification.message, 'plain')
            msg.attach(text_part)
            
            # HTML part if available
            if notification.data.get('html_content'):
                html_part = MimeText(notification.data['html_content'], 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            return {
                'status': 'sent',
                'external_id': f"email_{int(datetime.utcnow().timestamp())}",
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'failure_reason': str(e)
            }

class SMSNotificationChannel:
    """SMS notification implementation using Twilio"""
    
    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.client = TwilioClient(account_sid, auth_token)
        self.from_number = from_number
    
    async def send(self, notification: NotificationRequest) -> Dict[str, Any]:
        """Send SMS notification"""
        try:
            message = self.client.messages.create(
                body=notification.message,
                from_=self.from_number,
                to=notification.recipient_phone
            )
            
            return {
                'status': 'sent',
                'external_id': message.sid,
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'failure_reason': str(e)
            }

class SlackNotificationChannel:
    """Slack notification implementation"""
    
    def __init__(self, bot_token: str):
        self.client = slack_sdk.WebClient(token=bot_token)
    
    async def send(self, notification: NotificationRequest) -> Dict[str, Any]:
        """Send Slack notification"""
        try:
            response = self.client.chat_postMessage(
                channel=notification.recipient_id,  # Slack user ID or channel
                text=notification.message,
                attachments=notification.data.get('attachments', [])
            )
            
            return {
                'status': 'sent',
                'external_id': response['ts'],
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except SlackApiError as e:
            return {
                'status': 'failed',
                'failure_reason': str(e)
            }

class WhatsAppNotificationChannel:
    """WhatsApp notification implementation"""
    
    def __init__(self, api_key: str, phone_number_id: str):
        self.api_key = api_key
        self.phone_number_id = phone_number_id
        self.base_url = "https://graph.facebook.com/v18.0"
    
    async def send(self, notification: NotificationRequest) -> Dict[str, Any]:
        """Send WhatsApp notification"""
        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'messaging_product': 'whatsapp',
                'to': notification.recipient_phone,
                'type': 'text',
                'text': {'body': notification.message}
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        return {
                            'status': 'sent',
                            'external_id': result['messages'][0]['id'],
                            'sent_at': datetime.utcnow().isoformat()
                        }
                    else:
                        return {
                            'status': 'failed',
                            'failure_reason': result.get('error', {}).get('message', 'Unknown error')
                        }
            
        except Exception as e:
            return {
                'status': 'failed',
                'failure_reason': str(e)
            }

class PushNotificationChannel:
    """Web Push notification implementation"""
    
    def __init__(self, vapid_private_key: str, vapid_public_key: str, vapid_email: str):
        self.vapid_private_key = vapid_private_key
        self.vapid_public_key = vapid_public_key
        self.vapid_email = vapid_email
    
    async def send(self, notification: NotificationRequest) -> Dict[str, Any]:
        """Send push notification"""
        try:
            subscription_info = notification.data.get('push_subscription')
            if not subscription_info:
                return {
                    'status': 'failed',
                    'failure_reason': 'No push subscription found'
                }
            
            payload = json.dumps({
                'title': notification.subject or 'Spirit Tours',
                'body': notification.message,
                'data': notification.data
            })
            
            pywebpush.webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    'sub': self.vapid_email
                }
            )
            
            return {
                'status': 'sent',
                'external_id': f"push_{int(datetime.utcnow().timestamp())}",
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'failure_reason': str(e)
            }

# Main Sales Notifications System
class SalesNotificationsSystem:
    """
    Comprehensive sales notifications and alerts system
    Handles real-time notifications for sales opportunities and pipeline events
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379"):
        self.database_url = database_url
        self.redis_url = redis_url
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # WebSocket manager
        self.websocket_manager = WebSocketConnection()
        
        # Notification channels
        self.channels: Dict[NotificationChannel, Any] = {}
        
        # Template engine
        self.template_env = Environment(loader=FileSystemLoader('templates'))
        
        # Celery for background processing
        self.celery_app = Celery('sales_notifications')
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize database and Redis connections"""
        self.engine = create_async_engine(self.database_url, echo=True)
        self.session_factory = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        self.redis_client = redis.from_url(self.redis_url)
        
        # Create database tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Initialize default templates and rules
        await self._setup_default_templates()
        await self._setup_default_rules()
    
    def register_notification_channel(self, channel_type: NotificationChannel, channel_instance: Any):
        """Register a notification channel"""
        self.channels[channel_type] = channel_instance
        self.logger.info(f"Registered {channel_type.value} notification channel")
    
    async def create_notification_template(self, template_data: Dict[str, Any]) -> str:
        """Create a new notification template"""
        template_id = self._generate_id()
        
        async with self.session_factory() as session:
            template = NotificationTemplate(
                id=template_id,
                name=template_data['name'],
                notification_type=template_data['notification_type'],
                channel=template_data['channel'],
                subject_template=template_data.get('subject_template'),
                body_template=template_data.get('body_template'),
                html_template=template_data.get('html_template'),
                variables=template_data.get('variables', []),
                sample_data=template_data.get('sample_data', {}),
                priority=template_data.get('priority', 'medium')
            )
            
            session.add(template)
            await session.commit()
        
        self.logger.info(f"Created notification template: {template_id}")
        return template_id
    
    async def create_notification_rule(self, rule_config: NotificationRuleConfig) -> str:
        """Create a new notification rule"""
        rule_id = self._generate_id()
        
        async with self.session_factory() as session:
            rule = NotificationRule(
                id=rule_id,
                name=rule_config.name,
                description=rule_config.description,
                event_type=rule_config.event_type,
                conditions=rule_config.conditions,
                template_id=rule_config.template_id,
                recipients=[recipient.dict() if hasattr(recipient, 'dict') else recipient for recipient in rule_config.recipients],
                channels=[channel.value for channel in rule_config.channels],
                delay_minutes=rule_config.delay_minutes,
                priority=rule_config.priority.value,
                is_active=rule_config.is_active
            )
            
            session.add(rule)
            await session.commit()
        
        self.logger.info(f"Created notification rule: {rule_id}")
        return rule_id
    
    async def send_notification(self, notification: NotificationRequest) -> str:
        """Send a notification through specified channel"""
        notification_id = self._generate_id()
        
        # Get or create notification template
        template_data = await self._get_template_for_notification(notification)
        
        # Render notification content
        rendered_content = await self._render_notification_content(notification, template_data)
        
        # Create notification record
        async with self.session_factory() as session:
            db_notification = SalesNotification(
                id=notification_id,
                notification_type=notification.notification_type.value,
                channel=notification.channel.value,
                priority=notification.priority.value,
                recipient_id=notification.recipient_id,
                recipient_email=notification.recipient_email,
                recipient_phone=notification.recipient_phone,
                recipient_name=notification.recipient_name,
                subject=rendered_content['subject'],
                message=rendered_content['message'],
                html_content=rendered_content.get('html_content'),
                data=notification.data,
                lead_id=notification.lead_id,
                opportunity_id=notification.opportunity_id,
                ticket_id=notification.ticket_id,
                status=NotificationStatus.PENDING.value
            )
            
            session.add(db_notification)
            await session.commit()
        
        # Send notification based on delay
        if notification.delay_minutes and notification.delay_minutes > 0:
            # Schedule for later
            await self._schedule_notification(notification_id, notification.delay_minutes)
        else:
            # Send immediately
            await self._deliver_notification(notification_id)
        
        return notification_id
    
    async def process_event(self, event_type: str, event_data: Dict[str, Any]):
        """Process an event and trigger matching notification rules"""
        # Find matching rules
        matching_rules = await self._find_matching_rules(event_type, event_data)
        
        for rule in matching_rules:
            try:
                # Execute rule
                execution_id = await self._execute_notification_rule(rule, event_data)
                self.logger.info(f"Executed rule {rule.id} with execution {execution_id}")
                
            except Exception as e:
                self.logger.error(f"Failed to execute rule {rule.id}: {e}")
    
    async def setup_realtime_notifications(self, port: int = 8765):
        """Setup WebSocket server for real-time notifications"""
        async def handle_websocket(websocket, path):
            try:
                # Authenticate user (implement your auth logic)
                user_id = await self._authenticate_websocket(websocket)
                
                if user_id:
                    await self.websocket_manager.register(user_id, websocket)
                    
                    # Send pending notifications
                    await self._send_pending_realtime_notifications(user_id)
                    
                    # Keep connection alive
                    async for message in websocket:
                        # Handle incoming messages if needed
                        pass
                        
                else:
                    await websocket.close(code=4001, reason="Authentication failed")
                    
            except Exception as e:
                self.logger.error(f"WebSocket error: {e}")
            finally:
                if 'user_id' in locals():
                    await self.websocket_manager.unregister(user_id)
        
        # Start WebSocket server
        return await websockets.serve(handle_websocket, "localhost", port)
    
    async def send_realtime_notification(self, user_id: str, notification_data: Dict[str, Any]):
        """Send real-time notification via WebSocket"""
        message = {
            'type': 'notification',
            'data': notification_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await self.websocket_manager.send_to_user(user_id, message)
        
        # Also store in Redis for offline users
        await self.redis_client.lpush(f"realtime_notifications:{user_id}", json.dumps(message))
        await self.redis_client.expire(f"realtime_notifications:{user_id}", 86400)  # 24 hours
    
    async def get_notification_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get notification analytics and performance metrics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Overall metrics
            total_notifications = await session.execute(
                "SELECT COUNT(*) FROM sales_notifications WHERE created_at >= :start_date",
                {'start_date': start_date}
            )
            
            # By channel
            channel_stats = await session.execute("""
                SELECT channel, COUNT(*) as count, 
                       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                       SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read,
                       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM sales_notifications 
                WHERE created_at >= :start_date
                GROUP BY channel
            """, {'start_date': start_date})
            
            # By type
            type_stats = await session.execute("""
                SELECT notification_type, COUNT(*) as count,
                       AVG(CASE WHEN read_at IS NOT NULL AND sent_at IS NOT NULL 
                               THEN EXTRACT(EPOCH FROM (read_at - sent_at))/60 
                               ELSE NULL END) as avg_read_time_minutes
                FROM sales_notifications 
                WHERE created_at >= :start_date
                GROUP BY notification_type
            """, {'start_date': start_date})
            
            return {
                'period_days': days,
                'total_notifications': total_notifications.scalar(),
                'channel_performance': [dict(row) for row in channel_stats],
                'type_performance': [dict(row) for row in type_stats],
                'generated_at': datetime.utcnow().isoformat()
            }
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]):
        """Update user notification preferences"""
        async with self.session_factory() as session:
            # Check if preferences exist
            existing = await session.execute(
                "SELECT * FROM user_notification_preferences WHERE user_id = :user_id",
                {'user_id': user_id}
            )
            
            if existing.first():
                # Update existing
                await session.execute("""
                    UPDATE user_notification_preferences 
                    SET email_enabled = :email_enabled,
                        sms_enabled = :sms_enabled,
                        push_enabled = :push_enabled,
                        slack_enabled = :slack_enabled,
                        in_app_enabled = :in_app_enabled,
                        email_address = :email_address,
                        phone_number = :phone_number,
                        updated_at = :updated_at
                    WHERE user_id = :user_id
                """, {
                    'user_id': user_id,
                    'email_enabled': preferences.get('email_enabled', True),
                    'sms_enabled': preferences.get('sms_enabled', False),
                    'push_enabled': preferences.get('push_enabled', True),
                    'slack_enabled': preferences.get('slack_enabled', False),
                    'in_app_enabled': preferences.get('in_app_enabled', True),
                    'email_address': preferences.get('email_address'),
                    'phone_number': preferences.get('phone_number'),
                    'updated_at': datetime.utcnow()
                })
            else:
                # Create new
                prefs = UserNotificationPreferences(
                    id=self._generate_id(),
                    user_id=user_id,
                    email_enabled=preferences.get('email_enabled', True),
                    sms_enabled=preferences.get('sms_enabled', False),
                    push_enabled=preferences.get('push_enabled', True),
                    slack_enabled=preferences.get('slack_enabled', False),
                    in_app_enabled=preferences.get('in_app_enabled', True),
                    email_address=preferences.get('email_address'),
                    phone_number=preferences.get('phone_number')
                )
                session.add(prefs)
            
            await session.commit()
    
    # Helper methods
    def _generate_id(self) -> str:
        """Generate unique ID"""
        import uuid
        return str(uuid.uuid4())
    
    async def _get_template_for_notification(self, notification: NotificationRequest) -> Optional[Dict[str, Any]]:
        """Get template for notification type and channel"""
        async with self.session_factory() as session:
            result = await session.execute("""
                SELECT * FROM notification_templates 
                WHERE notification_type = :type AND channel = :channel AND is_active = true
                ORDER BY created_at DESC LIMIT 1
            """, {
                'type': notification.notification_type.value,
                'channel': notification.channel.value
            })
            
            template = result.first()
            return dict(template) if template else None
    
    async def _render_notification_content(self, notification: NotificationRequest, template_data: Optional[Dict[str, Any]]) -> Dict[str, str]:
        """Render notification content using templates"""
        context = {
            'notification': notification,
            'data': notification.data,
            'recipient_name': notification.recipient_name,
            'timestamp': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if template_data:
            # Use template
            subject_template = self.template_env.from_string(template_data.get('subject_template', ''))
            body_template = self.template_env.from_string(template_data.get('body_template', ''))
            
            subject = subject_template.render(**context)
            message = body_template.render(**context)
            
            html_content = None
            if template_data.get('html_template'):
                html_template = self.template_env.from_string(template_data['html_template'])
                html_content = html_template.render(**context)
        else:
            # Use default content
            subject = notification.subject or f"Spirit Tours - {notification.notification_type.value.replace('_', ' ').title()}"
            message = notification.message
            html_content = None
        
        return {
            'subject': subject,
            'message': message,
            'html_content': html_content
        }
    
    async def _deliver_notification(self, notification_id: str):
        """Deliver a notification through its designated channel"""
        async with self.session_factory() as session:
            # Get notification details
            result = await session.execute(
                "SELECT * FROM sales_notifications WHERE id = :id",
                {'id': notification_id}
            )
            notification = result.first()
            
            if not notification:
                return
            
            channel = NotificationChannel(notification.channel)
            
            if channel in self.channels:
                # Convert to NotificationRequest
                request = NotificationRequest(
                    notification_type=NotificationType(notification.notification_type),
                    channel=channel,
                    priority=NotificationPriority(notification.priority),
                    recipient_id=notification.recipient_id,
                    recipient_email=notification.recipient_email,
                    recipient_phone=notification.recipient_phone,
                    recipient_name=notification.recipient_name,
                    subject=notification.subject,
                    message=notification.message,
                    data=notification.data
                )
                
                # Send through channel
                result = await self.channels[channel].send(request)
                
                # Update notification status
                await session.execute("""
                    UPDATE sales_notifications 
                    SET status = :status,
                        sent_at = :sent_at,
                        external_id = :external_id,
                        failure_reason = :failure_reason
                    WHERE id = :id
                """, {
                    'id': notification_id,
                    'status': result['status'],
                    'sent_at': datetime.utcnow() if result['status'] == 'sent' else None,
                    'external_id': result.get('external_id'),
                    'failure_reason': result.get('failure_reason')
                })
                
                await session.commit()
    
    async def _schedule_notification(self, notification_id: str, delay_minutes: int):
        """Schedule notification for later delivery"""
        # Add to Redis with delay
        send_at = datetime.utcnow() + timedelta(minutes=delay_minutes)
        await self.redis_client.zadd(
            "scheduled_notifications",
            {notification_id: send_at.timestamp()}
        )
    
    async def _find_matching_rules(self, event_type: str, event_data: Dict[str, Any]) -> List[Any]:
        """Find notification rules that match the event"""
        async with self.session_factory() as session:
            result = await session.execute("""
                SELECT * FROM notification_rules 
                WHERE event_type = :event_type AND is_active = true
            """, {'event_type': event_type})
            
            rules = result.fetchall()
            matching_rules = []
            
            for rule in rules:
                if await self._evaluate_rule_conditions(rule.conditions, event_data):
                    matching_rules.append(rule)
            
            return matching_rules
    
    async def _evaluate_rule_conditions(self, conditions: List[Dict[str, Any]], event_data: Dict[str, Any]) -> bool:
        """Evaluate if rule conditions are met"""
        if not conditions:
            return True
        
        for condition in conditions:
            field = condition['field']
            operator = AlertCondition(condition['operator'])
            expected_value = condition['value']
            
            actual_value = event_data.get(field)
            
            if not self._evaluate_condition(actual_value, operator, expected_value):
                return False
        
        return True
    
    def _evaluate_condition(self, actual: Any, operator: AlertCondition, expected: Any) -> bool:
        """Evaluate a single condition"""
        if operator == AlertCondition.EQUALS:
            return actual == expected
        elif operator == AlertCondition.NOT_EQUALS:
            return actual != expected
        elif operator == AlertCondition.GREATER_THAN:
            return actual > expected
        elif operator == AlertCondition.LESS_THAN:
            return actual < expected
        elif operator == AlertCondition.CONTAINS:
            return expected in str(actual)
        elif operator == AlertCondition.NOT_CONTAINS:
            return expected not in str(actual)
        elif operator == AlertCondition.IN_LIST:
            return actual in expected
        elif operator == AlertCondition.NOT_IN_LIST:
            return actual not in expected
        elif operator == AlertCondition.IS_NULL:
            return actual is None
        elif operator == AlertCondition.IS_NOT_NULL:
            return actual is not None
        
        return False
    
    async def _execute_notification_rule(self, rule: Any, event_data: Dict[str, Any]) -> str:
        """Execute a notification rule"""
        execution_id = self._generate_id()
        
        try:
            # Create rule execution record
            async with self.session_factory() as session:
                execution = RuleExecution(
                    id=execution_id,
                    rule_id=rule.id,
                    trigger_event=rule.event_type,
                    trigger_data=event_data,
                    conditions_met=True,
                    triggered_at=datetime.utcnow()
                )
                session.add(execution)
                await session.commit()
            
            # Send notifications to recipients
            notifications_sent = 0
            for recipient in rule.recipients:
                for channel in rule.channels:
                    notification = NotificationRequest(
                        notification_type=NotificationType(rule.event_type.replace('_', '_')),
                        channel=NotificationChannel(channel),
                        priority=NotificationPriority(rule.priority),
                        recipient_id=recipient.get('user_id'),
                        recipient_email=recipient.get('email'),
                        recipient_phone=recipient.get('phone'),
                        recipient_name=recipient.get('name'),
                        message=f"Rule '{rule.name}' triggered",
                        data=event_data,
                        delay_minutes=rule.delay_minutes
                    )
                    
                    await self.send_notification(notification)
                    notifications_sent += 1
            
            # Update execution record
            async with self.session_factory() as session:
                await session.execute("""
                    UPDATE rule_executions 
                    SET execution_result = 'success',
                        executed_at = :executed_at,
                        notifications_sent = :notifications_sent
                    WHERE id = :id
                """, {
                    'id': execution_id,
                    'executed_at': datetime.utcnow(),
                    'notifications_sent': notifications_sent
                })
                await session.commit()
            
            return execution_id
            
        except Exception as e:
            # Update execution record with error
            async with self.session_factory() as session:
                await session.execute("""
                    UPDATE rule_executions 
                    SET execution_result = 'failed',
                        executed_at = :executed_at,
                        errors = :errors
                    WHERE id = :id
                """, {
                    'id': execution_id,
                    'executed_at': datetime.utcnow(),
                    'errors': {'error': str(e)}
                })
                await session.commit()
            
            raise e
    
    async def _setup_default_templates(self):
        """Setup default notification templates"""
        default_templates = [
            {
                'name': 'New Lead Email',
                'notification_type': 'new_lead',
                'channel': 'email',
                'subject_template': '🔔 Nuevo Lead: {{ data.lead_name }} - Spirit Tours',
                'body_template': '''
Hola {{ recipient_name }},

¡Tienes un nuevo lead!

**Detalles del Lead:**
- Nombre: {{ data.lead_name }}
- Email: {{ data.lead_email }}
- Teléfono: {{ data.lead_phone }}
- Interés: {{ data.interests }}
- Mensaje: {{ data.message }}

**Canal:** {{ data.channel }}
**Fuente:** {{ data.source }}
**Fecha:** {{ timestamp }}

Accede al CRM para más detalles y hacer seguimiento.

Saludos,
Sistema CRM Spirit Tours
                ''',
                'variables': ['recipient_name', 'data.lead_name', 'data.lead_email', 'timestamp']
            },
            {
                'name': 'Hot Lead Alert SMS',
                'notification_type': 'hot_lead',
                'channel': 'sms',
                'body_template': '🔥 LEAD CALIENTE: {{ data.lead_name }} ({{ data.lead_phone }}) interesado en {{ data.interests }}. Contactar AHORA! - Spirit Tours'
            },
            {
                'name': 'Deal Won Slack',
                'notification_type': 'deal_won',
                'channel': 'slack',
                'body_template': '🎉 ¡VENTA CERRADA! {{ data.agent_name }} cerró una venta de ${{ data.amount }} con {{ data.customer_name }}. ¡Felicitaciones!'
            }
        ]
        
        for template_data in default_templates:
            # Check if template exists
            async with self.session_factory() as session:
                existing = await session.execute("""
                    SELECT id FROM notification_templates 
                    WHERE name = :name AND notification_type = :type AND channel = :channel
                """, {
                    'name': template_data['name'],
                    'type': template_data['notification_type'],
                    'channel': template_data['channel']
                })
                
                if not existing.first():
                    await self.create_notification_template(template_data)
    
    async def _setup_default_rules(self):
        """Setup default notification rules"""
        # This would setup default rules for common scenarios
        pass
    
    async def _authenticate_websocket(self, websocket) -> Optional[str]:
        """Authenticate WebSocket connection (implement your auth logic)"""
        # Placeholder - implement actual authentication
        return "user_123"
    
    async def _send_pending_realtime_notifications(self, user_id: str):
        """Send pending real-time notifications to user"""
        notifications = await self.redis_client.lrange(f"realtime_notifications:{user_id}", 0, -1)
        
        for notification_json in notifications:
            try:
                notification = json.loads(notification_json)
                await self.websocket_manager.send_to_user(user_id, notification)
            except Exception as e:
                self.logger.error(f"Failed to send pending notification: {e}")
        
        # Clear sent notifications
        await self.redis_client.delete(f"realtime_notifications:{user_id}")

# Usage Example
async def main():
    """Example usage of the Sales Notifications System"""
    
    # Initialize the system
    system = SalesNotificationsSystem(
        database_url="sqlite+aiosqlite:///sales_notifications.db",
        redis_url="redis://localhost:6379"
    )
    
    await system.initialize()
    
    # Register notification channels
    email_channel = EmailNotificationChannel(
        smtp_server="smtp.gmail.com",
        smtp_port=587,
        username="your-email@gmail.com",
        password="your-app-password"
    )
    system.register_notification_channel(NotificationChannel.EMAIL, email_channel)
    
    sms_channel = SMSNotificationChannel(
        account_sid="your_twilio_account_sid",
        auth_token="your_twilio_auth_token",
        from_number="+1234567890"
    )
    system.register_notification_channel(NotificationChannel.SMS, sms_channel)
    
    # Send a new lead notification
    new_lead_notification = NotificationRequest(
        notification_type=NotificationType.NEW_LEAD,
        channel=NotificationChannel.EMAIL,
        priority=NotificationPriority.HIGH,
        recipient_email="sales@spirittours.com",
        recipient_name="Sales Team",
        subject="🔔 Nuevo Lead - María González",
        message="Nuevo lead interesado en tour a Machu Picchu para 2 personas en diciembre.",
        data={
            'lead_name': 'María González',
            'lead_email': 'maria.gonzalez@email.com',
            'lead_phone': '+1-555-123-4567',
            'interests': ['Machu Picchu', 'Adventure Tours'],
            'channel': 'Website',
            'source': 'Organic Search'
        },
        lead_id="lead_123"
    )
    
    notification_id = await system.send_notification(new_lead_notification)
    print(f"Sent notification: {notification_id}")
    
    # Process an event (this would be called from your CRM when events occur)
    await system.process_event('new_lead_created', {
        'lead_id': 'lead_123',
        'lead_name': 'María González',
        'lead_email': 'maria.gonzalez@email.com',
        'lead_quality': 'hot',
        'channel': 'website',
        'interests': ['Machu Picchu']
    })
    
    # Get analytics
    analytics = await system.get_notification_analytics(days=7)
    print(f"Notification analytics: {analytics}")

if __name__ == "__main__":
    asyncio.run(main())