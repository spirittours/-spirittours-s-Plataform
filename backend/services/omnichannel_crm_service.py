"""
Omnichannel CRM Service
Complete integration with WhatsApp, Facebook, Instagram, TikTok, and other social platforms
Unified communication hub for Spirit Tours sales and support teams
"""

import asyncio
import logging
import json
import uuid
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Enum as SQLEnum, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, validator
import base64
from urllib.parse import urlencode, quote
import hashlib
import hmac

# Configure logging
logger = logging.getLogger(__name__)

Base = declarative_base()

class SocialPlatform(str, Enum):
    """Supported social platforms"""
    WHATSAPP = "whatsapp"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram" 
    TIKTOK = "tiktok"
    TELEGRAM = "telegram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    YOUTUBE = "youtube"

class MessageStatus(str, Enum):
    """Message delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    REJECTED = "rejected"

class ConversationStatus(str, Enum):
    """Conversation status for CRM"""
    OPEN = "open"
    ASSIGNED = "assigned"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"

class LeadQuality(str, Enum):
    """Lead quality scoring"""
    COLD = "cold"
    WARM = "warm"
    HOT = "hot"
    QUALIFIED = "qualified"
    CONVERTED = "converted"

# Database Models
class SocialPlatformConfig(Base):
    """Configuration for each social platform integration"""
    __tablename__ = "social_platform_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(SQLEnum(SocialPlatform), unique=True, nullable=False)
    
    # API Configuration
    app_id = Column(String, nullable=True)
    app_secret = Column(String, nullable=True)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    webhook_verify_token = Column(String, nullable=True)
    
    # Platform-specific settings
    phone_number_id = Column(String, nullable=True)  # WhatsApp
    page_id = Column(String, nullable=True)  # Facebook/Instagram
    business_account_id = Column(String, nullable=True)  # Instagram Business
    
    # Configuration
    is_active = Column(Boolean, default=True)
    auto_respond_enabled = Column(Boolean, default=True)
    ai_agent_enabled = Column(Boolean, default=True)
    working_hours_start = Column(String, default="09:00")
    working_hours_end = Column(String, default="18:00")
    timezone = Column(String, default="UTC")
    
    # API limits and settings
    rate_limit_per_minute = Column(Integer, default=100)
    message_template_namespace = Column(String, nullable=True)
    
    # Integration settings
    integration_config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class SocialConversation(Base):
    """Unified conversation management across platforms"""
    __tablename__ = "social_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String, unique=True, index=True)
    
    # Platform and contact info
    platform = Column(SQLEnum(SocialPlatform), nullable=False)
    platform_conversation_id = Column(String, nullable=False)  # External conversation ID
    contact_id = Column(String, index=True, nullable=False)  # Links to OmnichannelContact
    
    # Assignment and status
    assigned_agent_id = Column(String, index=True, nullable=True)
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.OPEN)
    priority = Column(Integer, default=1)  # 1=low, 2=medium, 3=high, 4=urgent
    
    # Conversation metadata
    subject = Column(String, nullable=True)
    last_message_at = Column(DateTime, nullable=False)
    first_response_time = Column(Integer, nullable=True)  # Seconds
    avg_response_time = Column(Integer, nullable=True)  # Seconds
    message_count = Column(Integer, default=0)
    
    # Lead scoring and sales
    lead_quality = Column(SQLEnum(LeadQuality), default=LeadQuality.COLD)
    lead_score = Column(Float, default=0.0)
    potential_value = Column(Float, nullable=True)
    conversion_probability = Column(Float, default=0.0)
    
    # AI Analysis
    sentiment_score = Column(Float, nullable=True)
    intent_analysis = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)
    ai_insights = Column(JSON, nullable=True)
    
    # CRM Integration
    booking_ids = Column(JSON, nullable=True)
    sale_amount = Column(Float, nullable=True)
    is_converted = Column(Boolean, default=False)
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class SocialMessage(Base):
    """Individual messages across all platforms"""
    __tablename__ = "social_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, unique=True, index=True)
    
    # Conversation and platform info
    conversation_id = Column(String, index=True, nullable=False)
    platform = Column(SQLEnum(SocialPlatform), nullable=False)
    platform_message_id = Column(String, nullable=False)
    
    # Message details
    sender_id = Column(String, nullable=False)  # Platform-specific sender ID
    recipient_id = Column(String, nullable=False)
    is_from_customer = Column(Boolean, nullable=False)
    
    # Content
    message_type = Column(String, nullable=False)  # text, image, video, audio, file, location, etc.
    content_text = Column(Text, nullable=True)
    media_urls = Column(JSON, nullable=True)
    attachments = Column(JSON, nullable=True)
    
    # Message metadata
    timestamp = Column(DateTime, nullable=False)
    status = Column(SQLEnum(MessageStatus), default=MessageStatus.PENDING)
    
    # Response tracking
    response_to_message_id = Column(String, nullable=True)
    is_template_message = Column(Boolean, default=False)
    template_name = Column(String, nullable=True)
    
    # AI Processing
    ai_processed = Column(Boolean, default=False)
    intent_detected = Column(String, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    language_detected = Column(String, nullable=True)
    ai_response_generated = Column(Text, nullable=True)
    
    # CRM Integration
    lead_scoring_impact = Column(Float, default=0.0)
    conversion_trigger = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.now)

class MessageTemplate(Base):
    """Message templates for different platforms"""
    __tablename__ = "message_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(String, unique=True, index=True)
    
    # Template info
    name = Column(String, nullable=False)
    platform = Column(SQLEnum(SocialPlatform), nullable=False)
    category = Column(String, nullable=False)  # greeting, promotional, transactional, etc.
    
    # Template content
    template_content = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True)  # Template variables
    media_type = Column(String, nullable=True)  # text, image, video, document
    media_url = Column(String, nullable=True)
    
    # Platform-specific data
    whatsapp_template_name = Column(String, nullable=True)
    facebook_template_id = Column(String, nullable=True)
    
    # Usage and approval
    is_approved = Column(Boolean, default=False)
    approval_status = Column(String, default="pending")  # pending, approved, rejected
    usage_count = Column(Integer, default=0)
    
    # Languages
    language = Column(String, default="en")
    translations = Column(JSON, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class AutoResponseRule(Base):
    """Automated response rules for different scenarios"""
    __tablename__ = "auto_response_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String, unique=True, index=True)
    
    # Rule configuration
    name = Column(String, nullable=False)
    platform = Column(SQLEnum(SocialPlatform), nullable=True)  # null = all platforms
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=1)
    
    # Trigger conditions
    trigger_keywords = Column(JSON, nullable=True)
    trigger_intent = Column(String, nullable=True)
    trigger_time_conditions = Column(JSON, nullable=True)  # working hours, etc.
    
    # Response configuration
    response_type = Column(String, nullable=False)  # template, ai_generated, transfer_to_agent
    template_id = Column(String, nullable=True)
    ai_prompt = Column(Text, nullable=True)
    transfer_to_department = Column(String, nullable=True)
    
    # Conditions
    max_responses_per_conversation = Column(Integer, default=3)
    response_delay_seconds = Column(Integer, default=2)
    
    # Analytics
    triggered_count = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# Pydantic Models
@dataclass
class WhatsAppConfig:
    """WhatsApp Business API Configuration"""
    phone_number_id: str
    access_token: str
    webhook_verify_token: str
    app_secret: str
    business_account_id: str = ""
    
    # API endpoints
    api_version: str = "v18.0"
    base_url: str = "https://graph.facebook.com"
    
    def get_api_url(self, endpoint: str) -> str:
        return f"{self.base_url}/{self.api_version}/{self.phone_number_id}/{endpoint}"

@dataclass
class FacebookConfig:
    """Facebook Messenger Configuration"""
    page_id: str
    page_access_token: str
    app_secret: str
    verify_token: str
    
    api_version: str = "v18.0"
    base_url: str = "https://graph.facebook.com"
    
    def get_api_url(self, endpoint: str) -> str:
        return f"{self.base_url}/{self.api_version}/{endpoint}"

@dataclass
class InstagramConfig:
    """Instagram Business Configuration"""
    instagram_account_id: str
    access_token: str
    app_secret: str
    page_id: str  # Connected Facebook page
    
    api_version: str = "v18.0"
    base_url: str = "https://graph.facebook.com"

class SendMessageRequest(BaseModel):
    """Universal message sending request"""
    platform: SocialPlatform
    recipient_id: str
    message_type: str = "text"
    content: str
    media_url: Optional[str] = None
    template_id: Optional[str] = None
    variables: Dict[str, str] = Field(default_factory=dict)

class ConversationSummary(BaseModel):
    """Conversation summary for CRM dashboard"""
    conversation_id: str
    platform: SocialPlatform
    contact_name: str
    contact_phone: Optional[str]
    status: ConversationStatus
    assigned_agent: Optional[str]
    last_message_at: datetime
    message_count: int
    lead_score: float
    conversion_probability: float
    unread_count: int

class OmnichannelCRMService:
    """Complete omnichannel CRM service integrating all social platforms"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.platform_configs = {}
        self.webhook_handlers = {}
        logger.info("Omnichannel CRM Service initialized")
    
    async def initialize_platforms(self) -> Dict[str, bool]:
        """Initialize all configured social platforms"""
        try:
            configs = self.db.query(SocialPlatformConfig).filter(
                SocialPlatformConfig.is_active == True
            ).all()
            
            initialization_results = {}
            
            for config in configs:
                try:
                    if config.platform == SocialPlatform.WHATSAPP:
                        result = await self._initialize_whatsapp(config)
                    elif config.platform == SocialPlatform.FACEBOOK:
                        result = await self._initialize_facebook(config)
                    elif config.platform == SocialPlatform.INSTAGRAM:
                        result = await self._initialize_instagram(config)
                    elif config.platform == SocialPlatform.TIKTOK:
                        result = await self._initialize_tiktok(config)
                    else:
                        result = False
                    
                    initialization_results[config.platform.value] = result
                    
                except Exception as e:
                    logger.error(f"Failed to initialize {config.platform.value}: {e}")
                    initialization_results[config.platform.value] = False
            
            logger.info(f"Platform initialization completed: {initialization_results}")
            return initialization_results
            
        except Exception as e:
            logger.error(f"Error initializing platforms: {e}")
            return {}
    
    async def send_message(self, request: SendMessageRequest) -> Dict[str, Any]:
        """Send message through specified platform"""
        try:
            message_id = f"MSG_{uuid.uuid4().hex[:12].upper()}"
            
            # Get platform configuration
            platform_config = self.db.query(SocialPlatformConfig).filter(
                SocialPlatformConfig.platform == request.platform,
                SocialPlatformConfig.is_active == True
            ).first()
            
            if not platform_config:
                raise ValueError(f"Platform {request.platform.value} not configured")
            
            # Send message based on platform
            if request.platform == SocialPlatform.WHATSAPP:
                result = await self._send_whatsapp_message(platform_config, request, message_id)
            elif request.platform == SocialPlatform.FACEBOOK:
                result = await self._send_facebook_message(platform_config, request, message_id)
            elif request.platform == SocialPlatform.INSTAGRAM:
                result = await self._send_instagram_message(platform_config, request, message_id)
            else:
                raise ValueError(f"Platform {request.platform.value} not implemented yet")
            
            # Record message in database
            if result.get("success"):
                await self._record_outbound_message(request, message_id, result)
            
            logger.info(f"Message sent via {request.platform.value}: {message_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise
    
    async def handle_incoming_message(self, platform: SocialPlatform, 
                                    webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming messages from any platform"""
        try:
            # Parse message based on platform
            if platform == SocialPlatform.WHATSAPP:
                parsed_message = await self._parse_whatsapp_webhook(webhook_data)
            elif platform == SocialPlatform.FACEBOOK:
                parsed_message = await self._parse_facebook_webhook(webhook_data)
            elif platform == SocialPlatform.INSTAGRAM:
                parsed_message = await self._parse_instagram_webhook(webhook_data)
            else:
                raise ValueError(f"Platform {platform.value} webhook not implemented")
            
            if not parsed_message:
                return {"success": True, "message": "No message to process"}
            
            # Create or update contact
            contact = await self._create_or_update_contact(parsed_message)
            
            # Create or update conversation
            conversation = await self._create_or_update_conversation(parsed_message, contact)
            
            # Record incoming message
            message_record = await self._record_incoming_message(parsed_message, conversation)
            
            # AI processing
            ai_analysis = await self._process_message_with_ai(message_record)
            
            # Auto-response handling
            auto_response = await self._handle_auto_response(conversation, message_record, ai_analysis)
            
            # Lead scoring update
            await self._update_lead_scoring(conversation, message_record, ai_analysis)
            
            # Notification to agents
            await self._notify_agents(conversation, message_record)
            
            return {
                "success": True,
                "message_id": message_record.message_id,
                "conversation_id": conversation.conversation_id,
                "auto_response_sent": auto_response.get("sent", False),
                "ai_analysis": ai_analysis
            }
            
        except Exception as e:
            logger.error(f"Error handling incoming message: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_conversations(self, platform: SocialPlatform = None, 
                              status: ConversationStatus = None,
                              assigned_agent: str = None,
                              page: int = 1, limit: int = 20) -> List[ConversationSummary]:
        """Get conversations with filtering"""
        try:
            query = self.db.query(SocialConversation)
            
            if platform:
                query = query.filter(SocialConversation.platform == platform)
            
            if status:
                query = query.filter(SocialConversation.status == status)
            
            if assigned_agent:
                query = query.filter(SocialConversation.assigned_agent_id == assigned_agent)
            
            query = query.filter(SocialConversation.is_active == True)
            query = query.order_by(SocialConversation.last_message_at.desc())
            
            # Apply pagination
            offset = (page - 1) * limit
            conversations = query.offset(offset).limit(limit).all()
            
            # Convert to summary format
            summaries = []
            for conv in conversations:
                # Get contact info
                from .pbx_3cx_integration_service import OmnichannelContact
                contact = self.db.query(OmnichannelContact).filter(
                    OmnichannelContact.contact_id == conv.contact_id
                ).first()
                
                # Count unread messages
                unread_count = self.db.query(SocialMessage).filter(
                    SocialMessage.conversation_id == conv.conversation_id,
                    SocialMessage.is_from_customer == True,
                    SocialMessage.status.notin_([MessageStatus.READ])
                ).count()
                
                summaries.append(ConversationSummary(
                    conversation_id=conv.conversation_id,
                    platform=conv.platform,
                    contact_name=contact.name if contact else "Unknown",
                    contact_phone=contact.phone_number if contact else None,
                    status=conv.status,
                    assigned_agent=conv.assigned_agent_id,
                    last_message_at=conv.last_message_at,
                    message_count=conv.message_count,
                    lead_score=conv.lead_score,
                    conversion_probability=conv.conversion_probability,
                    unread_count=unread_count
                ))
            
            return summaries
            
        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
            raise
    
    async def assign_conversation(self, conversation_id: str, agent_id: str) -> bool:
        """Assign conversation to an agent"""
        try:
            conversation = self.db.query(SocialConversation).filter(
                SocialConversation.conversation_id == conversation_id
            ).first()
            
            if not conversation:
                raise ValueError("Conversation not found")
            
            conversation.assigned_agent_id = agent_id
            conversation.status = ConversationStatus.ASSIGNED
            conversation.updated_at = datetime.now()
            
            self.db.commit()
            
            # Send notification to agent
            await self._notify_agent_assignment(conversation, agent_id)
            
            logger.info(f"Conversation {conversation_id} assigned to agent {agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error assigning conversation: {e}")
            return False
    
    async def create_message_template(self, platform: SocialPlatform, 
                                    name: str, content: str, category: str,
                                    variables: List[str] = None) -> str:
        """Create new message template"""
        try:
            template_id = f"TPL_{uuid.uuid4().hex[:12].upper()}"
            
            template = MessageTemplate(
                template_id=template_id,
                name=name,
                platform=platform,
                category=category,
                template_content=content,
                variables=variables or []
            )
            
            self.db.add(template)
            self.db.commit()
            
            # Submit for platform approval if required
            if platform == SocialPlatform.WHATSAPP:
                await self._submit_whatsapp_template_for_approval(template)
            
            logger.info(f"Message template created: {template_id}")
            return template_id
            
        except Exception as e:
            logger.error(f"Error creating message template: {e}")
            raise
    
    async def sync_contacts_from_social_platforms(self) -> Dict[str, int]:
        """Sync contacts from all connected social platforms"""
        try:
            sync_results = {}
            
            # Sync from each platform
            platforms = self.db.query(SocialPlatformConfig).filter(
                SocialPlatformConfig.is_active == True
            ).all()
            
            for platform_config in platforms:
                try:
                    if platform_config.platform == SocialPlatform.FACEBOOK:
                        count = await self._sync_facebook_contacts(platform_config)
                    elif platform_config.platform == SocialPlatform.INSTAGRAM:
                        count = await self._sync_instagram_contacts(platform_config)
                    else:
                        count = 0  # Platform not implemented yet
                    
                    sync_results[platform_config.platform.value] = count
                    
                except Exception as e:
                    logger.error(f"Error syncing {platform_config.platform.value} contacts: {e}")
                    sync_results[platform_config.platform.value] = 0
            
            total_synced = sum(sync_results.values())
            logger.info(f"Contact sync completed: {total_synced} total contacts synced")
            
            return sync_results
            
        except Exception as e:
            logger.error(f"Error syncing social platform contacts: {e}")
            return {}
    
    async def get_conversation_analytics(self, platform: SocialPlatform = None,
                                       date_from: datetime = None,
                                       date_to: datetime = None) -> Dict[str, Any]:
        """Get comprehensive analytics for conversations and sales"""
        try:
            if not date_from:
                date_from = datetime.now() - timedelta(days=30)
            if not date_to:
                date_to = datetime.now()
            
            query = self.db.query(SocialConversation).filter(
                SocialConversation.created_at >= date_from,
                SocialConversation.created_at <= date_to
            )
            
            if platform:
                query = query.filter(SocialConversation.platform == platform)
            
            conversations = query.all()
            
            # Calculate metrics
            total_conversations = len(conversations)
            converted_conversations = sum(1 for c in conversations if c.is_converted)
            conversion_rate = (converted_conversations / total_conversations * 100) if total_conversations > 0 else 0
            
            total_revenue = sum(c.sale_amount or 0 for c in conversations if c.sale_amount)
            avg_lead_score = sum(c.lead_score for c in conversations) / total_conversations if total_conversations > 0 else 0
            
            # Platform breakdown
            platform_stats = {}
            for conv in conversations:
                platform_name = conv.platform.value
                if platform_name not in platform_stats:
                    platform_stats[platform_name] = {
                        "conversations": 0,
                        "conversions": 0,
                        "revenue": 0.0,
                        "avg_response_time": 0
                    }
                
                platform_stats[platform_name]["conversations"] += 1
                if conv.is_converted:
                    platform_stats[platform_name]["conversions"] += 1
                if conv.sale_amount:
                    platform_stats[platform_name]["revenue"] += conv.sale_amount
                if conv.avg_response_time:
                    platform_stats[platform_name]["avg_response_time"] += conv.avg_response_time
            
            # Calculate averages
            for platform_name in platform_stats:
                stats = platform_stats[platform_name]
                if stats["conversations"] > 0:
                    stats["conversion_rate"] = (stats["conversions"] / stats["conversations"]) * 100
                    stats["avg_response_time"] = stats["avg_response_time"] / stats["conversations"]
                else:
                    stats["conversion_rate"] = 0
            
            return {
                "period": {
                    "start_date": date_from.isoformat(),
                    "end_date": date_to.isoformat()
                },
                "overview": {
                    "total_conversations": total_conversations,
                    "converted_conversations": converted_conversations,
                    "conversion_rate": round(conversion_rate, 2),
                    "total_revenue": round(total_revenue, 2),
                    "avg_lead_score": round(avg_lead_score, 2)
                },
                "by_platform": platform_stats,
                "top_performing_agents": await self._get_top_performing_agents(date_from, date_to)
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation analytics: {e}")
            raise
    
    # Private helper methods
    async def _initialize_whatsapp(self, config: SocialPlatformConfig) -> bool:
        """Initialize WhatsApp Business API"""
        try:
            whatsapp_config = WhatsAppConfig(
                phone_number_id=config.phone_number_id,
                access_token=config.access_token,
                webhook_verify_token=config.webhook_verify_token,
                app_secret=config.app_secret,
                business_account_id=config.business_account_id or ""
            )
            
            # Test API connection
            url = whatsapp_config.get_api_url("")
            headers = {"Authorization": f"Bearer {whatsapp_config.access_token}"}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        self.platform_configs[SocialPlatform.WHATSAPP] = whatsapp_config
                        logger.info("WhatsApp Business API initialized successfully")
                        return True
                    else:
                        logger.error(f"WhatsApp API test failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"WhatsApp initialization error: {e}")
            return False
    
    async def _send_whatsapp_message(self, config: SocialPlatformConfig, 
                                   request: SendMessageRequest, message_id: str) -> Dict[str, Any]:
        """Send WhatsApp message"""
        try:
            whatsapp_config = self.platform_configs[SocialPlatform.WHATSAPP]
            
            url = whatsapp_config.get_api_url("messages")
            headers = {
                "Authorization": f"Bearer {whatsapp_config.access_token}",
                "Content-Type": "application/json"
            }
            
            # Prepare message payload
            payload = {
                "messaging_product": "whatsapp",
                "to": request.recipient_id,
                "type": request.message_type
            }
            
            if request.template_id:
                # Template message
                template = self.db.query(MessageTemplate).filter(
                    MessageTemplate.template_id == request.template_id
                ).first()
                
                if template:
                    payload["type"] = "template"
                    payload["template"] = {
                        "name": template.whatsapp_template_name,
                        "language": {"code": "en"}
                    }
                    
                    if request.variables:
                        payload["template"]["components"] = [{
                            "type": "body",
                            "parameters": [{"type": "text", "text": v} for v in request.variables.values()]
                        }]
            else:
                # Regular text message
                if request.message_type == "text":
                    payload["text"] = {"body": request.content}
                elif request.message_type == "image":
                    payload["image"] = {"link": request.media_url, "caption": request.content}
            
            # Send message
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "platform_message_id": result.get("messages", [{}])[0].get("id"),
                            "message_id": message_id
                        }
                    else:
                        error_text = await response.text()
                        return {"success": False, "error": error_text}
                        
        except Exception as e:
            logger.error(f"WhatsApp message send error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _parse_whatsapp_webhook(self, webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse WhatsApp webhook data"""
        try:
            entry = webhook_data.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            
            messages = value.get("messages", [])
            if not messages:
                return None
            
            message = messages[0]
            
            return {
                "platform_message_id": message.get("id"),
                "sender_id": message.get("from"),
                "recipient_id": value.get("metadata", {}).get("phone_number_id"),
                "message_type": message.get("type", "text"),
                "content_text": message.get("text", {}).get("body", ""),
                "timestamp": datetime.fromtimestamp(int(message.get("timestamp", 0))),
                "platform_conversation_id": f"whatsapp_{message.get('from')}",
                "media_urls": self._extract_whatsapp_media_urls(message)
            }
            
        except Exception as e:
            logger.error(f"WhatsApp webhook parsing error: {e}")
            return None
    
    def _extract_whatsapp_media_urls(self, message: Dict[str, Any]) -> List[str]:
        """Extract media URLs from WhatsApp message"""
        media_urls = []
        
        for media_type in ["image", "video", "audio", "document"]:
            if media_type in message:
                media_id = message[media_type].get("id")
                if media_id:
                    # You would fetch the media URL using the media ID
                    # media_urls.append(f"https://graph.facebook.com/v18.0/{media_id}")
                    pass
        
        return media_urls
    
    async def _create_or_update_contact(self, parsed_message: Dict[str, Any]) -> Any:
        """Create or update contact from message"""
        try:
            from .pbx_3cx_integration_service import OmnichannelContact
            
            # Try to find existing contact
            contact = self.db.query(OmnichannelContact).filter(
                OmnichannelContact.phone_number == parsed_message["sender_id"]
            ).first()
            
            if not contact:
                contact_id = f"CONTACT_{uuid.uuid4().hex[:12].upper()}"
                contact = OmnichannelContact(
                    contact_id=contact_id,
                    phone_number=parsed_message["sender_id"],
                    name=parsed_message["sender_id"],  # Will be updated with actual name later
                    last_interaction=datetime.now(),
                    interaction_count=1
                )
                self.db.add(contact)
            else:
                contact.last_interaction = datetime.now()
                contact.interaction_count += 1
            
            self.db.commit()
            return contact
            
        except Exception as e:
            logger.error(f"Error creating/updating contact: {e}")
            raise
    
    async def _process_message_with_ai(self, message_record: SocialMessage) -> Dict[str, Any]:
        """Process message with AI for intent detection and analysis"""
        try:
            # This would integrate with your AI service
            # For now, returning mock analysis
            
            ai_analysis = {
                "intent": "booking_inquiry",
                "sentiment_score": 0.8,
                "language": "en",
                "confidence": 0.9,
                "keywords": ["vacation", "booking", "price"],
                "suggested_response": "Thank you for your interest! I'd be happy to help you with your vacation booking."
            }
            
            # Update message record
            message_record.ai_processed = True
            message_record.intent_detected = ai_analysis["intent"]
            message_record.sentiment_score = ai_analysis["sentiment_score"]
            message_record.language_detected = ai_analysis["language"]
            message_record.ai_response_generated = ai_analysis["suggested_response"]
            
            self.db.commit()
            
            return ai_analysis
            
        except Exception as e:
            logger.error(f"AI processing error: {e}")
            return {}
    
    # Additional helper methods would be implemented here...
    # Including Facebook, Instagram, TikTok integrations, auto-response handling, etc.

# Export main classes
__all__ = [
    "OmnichannelCRMService",
    "SocialPlatformConfig",
    "SocialConversation", 
    "SocialMessage",
    "MessageTemplate",
    "AutoResponseRule",
    "SendMessageRequest",
    "ConversationSummary",
    "SocialPlatform",
    "MessageStatus",
    "ConversationStatus",
    "LeadQuality"
]