"""
Multi-Channel Integration System for Spirit Tours CRM
Comprehensive lead capture from web, social media, and database sources
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import aiohttp
import hashlib
from urllib.parse import urlparse, parse_qs
import re
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
import redis.asyncio as redis
from pydantic import BaseModel, EmailStr, HttpUrl, validator
import tweepy
import facebook
from instagram_basic_display import InstagramBasicDisplay
import requests
from celery import Celery

Base = declarative_base()

# Enums for channel types and lead status
class ChannelType(Enum):
    WEBSITE = "website"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    PHONE = "phone"
    DATABASE_IMPORT = "database_import"
    REFERRAL = "referral"
    API = "api"
    CHATBOT = "chatbot"

class LeadSource(Enum):
    ORGANIC = "organic"
    PAID_AD = "paid_ad"
    SOCIAL_MEDIA = "social_media"
    EMAIL_CAMPAIGN = "email_campaign"
    REFERRAL = "referral"
    DIRECT = "direct"
    SEO = "seo"
    CONTENT_MARKETING = "content_marketing"

class LeadQuality(Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"

class IntegrationStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"

# Database Models
class ChannelIntegration(Base):
    __tablename__ = "channel_integrations"
    
    id = Column(String, primary_key=True)
    channel_type = Column(String, nullable=False)  # ChannelType enum
    name = Column(String, nullable=False)
    status = Column(String, default="active")  # IntegrationStatus enum
    configuration = Column(JSON)
    credentials = Column(JSON)  # Encrypted
    webhook_url = Column(String)
    api_endpoint = Column(String)
    last_sync = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    leads = relationship("MultiChannelLead", back_populates="channel_integration")
    metrics = relationship("ChannelMetrics", back_populates="integration")

class MultiChannelLead(Base):
    __tablename__ = "multi_channel_leads"
    
    id = Column(String, primary_key=True)
    channel_integration_id = Column(String, ForeignKey("channel_integrations.id"))
    channel_type = Column(String, nullable=False)
    source_id = Column(String)  # Original ID from source platform
    lead_source = Column(String)  # LeadSource enum
    lead_quality = Column(String)  # LeadQuality enum
    
    # Contact Information
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String)
    phone = Column(String)
    company = Column(String)
    
    # Lead Data
    message = Column(Text)
    interests = Column(JSON)  # List of interests/tours
    budget_range = Column(String)
    travel_dates = Column(JSON)  # Preferred dates
    group_size = Column(Integer)
    
    # Tracking Data
    utm_source = Column(String)
    utm_medium = Column(String)
    utm_campaign = Column(String)
    utm_content = Column(String)
    utm_term = Column(String)
    referrer_url = Column(String)
    landing_page = Column(String)
    user_agent = Column(String)
    ip_address = Column(String)
    
    # Social Media Specific
    social_profile_url = Column(String)
    social_follower_count = Column(Integer)
    social_engagement_score = Column(Float)
    
    # Metadata
    raw_data = Column(JSON)  # Original data from source
    processing_status = Column(String, default="pending")
    duplicate_check_hash = Column(String)
    
    # Timestamps
    source_created_at = Column(DateTime)
    captured_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    # Relationships
    channel_integration = relationship("ChannelIntegration", back_populates="leads")
    interactions = relationship("LeadInteraction", back_populates="lead")
    duplicate_leads = relationship("DuplicateLead", back_populates="lead")

class LeadInteraction(Base):
    __tablename__ = "lead_interactions"
    
    id = Column(String, primary_key=True)
    lead_id = Column(String, ForeignKey("multi_channel_leads.id"))
    interaction_type = Column(String)  # message, comment, like, share, click, etc.
    content = Column(Text)
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lead = relationship("MultiChannelLead", back_populates="interactions")

class DuplicateLead(Base):
    __tablename__ = "duplicate_leads"
    
    id = Column(String, primary_key=True)
    lead_id = Column(String, ForeignKey("multi_channel_leads.id"))
    duplicate_lead_id = Column(String, ForeignKey("multi_channel_leads.id"))
    similarity_score = Column(Float)
    merge_status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lead = relationship("MultiChannelLead", foreign_keys=[lead_id], back_populates="duplicate_leads")

class ChannelMetrics(Base):
    __tablename__ = "channel_metrics"
    
    id = Column(String, primary_key=True)
    integration_id = Column(String, ForeignKey("channel_integrations.id"))
    date = Column(DateTime)
    
    # Metrics
    leads_captured = Column(Integer, default=0)
    qualified_leads = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    cost_per_lead = Column(Float, default=0.0)
    revenue_generated = Column(Float, default=0.0)
    roi = Column(Float, default=0.0)
    
    # Engagement Metrics
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    click_through_rate = Column(Float, default=0.0)
    bounce_rate = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    integration = relationship("ChannelIntegration", back_populates="metrics")

# Pydantic Models for API
class LeadCapture(BaseModel):
    channel_type: ChannelType
    source_id: Optional[str] = None
    lead_source: LeadSource
    
    # Contact Info
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    
    # Lead Data
    message: Optional[str] = None
    interests: Optional[List[str]] = []
    budget_range: Optional[str] = None
    travel_dates: Optional[Dict[str, Any]] = {}
    group_size: Optional[int] = 1
    
    # Tracking
    utm_params: Optional[Dict[str, str]] = {}
    referrer_url: Optional[HttpUrl] = None
    landing_page: Optional[HttpUrl] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    # Social Media
    social_profile_url: Optional[HttpUrl] = None
    social_follower_count: Optional[int] = None
    
    # Metadata
    raw_data: Optional[Dict[str, Any]] = {}
    
    @validator('phone')
    def validate_phone(cls, v):
        if v:
            # Remove all non-digit characters
            phone_digits = re.sub(r'[^\d+]', '', v)
            if len(phone_digits) < 10:
                raise ValueError('Phone number must have at least 10 digits')
        return v

class ChannelConfiguration(BaseModel):
    channel_type: ChannelType
    name: str
    webhook_url: Optional[HttpUrl] = None
    api_endpoint: Optional[HttpUrl] = None
    credentials: Dict[str, Any] = {}
    settings: Dict[str, Any] = {}

# Channel-specific integrations
@dataclass
class FacebookIntegration:
    app_id: str
    app_secret: str
    access_token: str
    page_id: str
    webhook_verify_token: str
    
    def __post_init__(self):
        self.graph = facebook.GraphAPI(access_token=self.access_token, version="18.0")
    
    async def setup_webhook(self):
        """Setup Facebook webhook for lead capture"""
        webhook_url = f"{self.webhook_verify_token}"
        # Setup webhook configuration
        pass
    
    async def capture_lead_ads(self):
        """Capture leads from Facebook Lead Ads"""
        try:
            # Get lead ads data
            leadgen_forms = self.graph.get_connections(
                self.page_id, 
                "leadgen_forms",
                fields=['id', 'name', 'status', 'leads']
            )
            
            leads = []
            for form in leadgen_forms['data']:
                form_leads = self.graph.get_connections(
                    form['id'],
                    "leads",
                    fields=['id', 'created_time', 'field_data']
                )
                leads.extend(form_leads['data'])
            
            return leads
        except Exception as e:
            logging.error(f"Facebook lead capture error: {e}")
            return []

@dataclass
class InstagramIntegration:
    client_id: str
    client_secret: str
    access_token: str
    
    def __post_init__(self):
        self.instagram = InstagramBasicDisplay(
            app_id=self.client_id,
            app_secret=self.client_secret,
            redirect_url="https://your-domain.com/callback"
        )
    
    async def capture_comments_mentions(self):
        """Capture leads from Instagram comments and mentions"""
        try:
            # Get media posts
            media_url = f"https://graph.instagram.com/me/media?fields=id,caption,comments_count,like_count&access_token={self.access_token}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(media_url) as response:
                    data = await response.json()
                    
            leads = []
            for media in data.get('data', []):
                # Get comments for each media
                comments_url = f"https://graph.instagram.com/{media['id']}/comments?fields=id,text,username,timestamp&access_token={self.access_token}"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(comments_url) as response:
                        comments_data = await response.json()
                
                # Process comments for potential leads
                for comment in comments_data.get('data', []):
                    if self._is_potential_lead(comment['text']):
                        leads.append({
                            'source_id': comment['id'],
                            'username': comment['username'],
                            'message': comment['text'],
                            'timestamp': comment['timestamp'],
                            'media_id': media['id']
                        })
            
            return leads
        except Exception as e:
            logging.error(f"Instagram lead capture error: {e}")
            return []
    
    def _is_potential_lead(self, text: str) -> bool:
        """Check if comment indicates potential lead"""
        lead_keywords = [
            'interested', 'price', 'cost', 'book', 'reserve',
            'available', 'dates', 'info', 'information',
            'contact', 'phone', 'email', 'tour', 'trip'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in lead_keywords)

@dataclass
class TwitterIntegration:
    consumer_key: str
    consumer_secret: str
    access_token: str
    access_token_secret: str
    
    def __post_init__(self):
        auth = tweepy.OAuthHandler(self.consumer_key, self.consumer_secret)
        auth.set_access_token(self.access_token, self.access_token_secret)
        self.api = tweepy.API(auth)
    
    async def capture_mentions_dms(self):
        """Capture leads from Twitter mentions and DMs"""
        try:
            leads = []
            
            # Get mentions
            mentions = self.api.mentions_timeline(count=50)
            for mention in mentions:
                if self._is_potential_lead(mention.text):
                    leads.append({
                        'source_id': str(mention.id),
                        'username': mention.user.screen_name,
                        'name': mention.user.name,
                        'message': mention.text,
                        'follower_count': mention.user.followers_count,
                        'timestamp': mention.created_at.isoformat(),
                        'profile_url': f"https://twitter.com/{mention.user.screen_name}"
                    })
            
            return leads
        except Exception as e:
            logging.error(f"Twitter lead capture error: {e}")
            return []
    
    def _is_potential_lead(self, text: str) -> bool:
        """Check if tweet indicates potential lead"""
        lead_keywords = [
            'interested', 'price', 'cost', 'book', 'reserve',
            'available', 'dates', 'info', 'information',
            'contact', 'phone', 'email', 'tour', 'trip'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in lead_keywords)

@dataclass
class WebsiteIntegration:
    """Website lead capture integration"""
    
    async def capture_form_submissions(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process website form submissions"""
        return {
            'channel_type': ChannelType.WEBSITE,
            'source_id': form_data.get('form_id'),
            'lead_source': LeadSource.ORGANIC,
            'first_name': form_data.get('first_name'),
            'last_name': form_data.get('last_name'),
            'email': form_data.get('email'),
            'phone': form_data.get('phone'),
            'message': form_data.get('message'),
            'interests': form_data.get('interests', []),
            'budget_range': form_data.get('budget_range'),
            'travel_dates': form_data.get('travel_dates', {}),
            'group_size': form_data.get('group_size', 1),
            'utm_params': {
                'utm_source': form_data.get('utm_source'),
                'utm_medium': form_data.get('utm_medium'),
                'utm_campaign': form_data.get('utm_campaign'),
                'utm_content': form_data.get('utm_content'),
                'utm_term': form_data.get('utm_term')
            },
            'referrer_url': form_data.get('referrer'),
            'landing_page': form_data.get('page_url'),
            'user_agent': form_data.get('user_agent'),
            'ip_address': form_data.get('ip_address'),
            'raw_data': form_data
        }
    
    async def capture_chatbot_conversations(self, conversation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process chatbot conversations as leads"""
        return {
            'channel_type': ChannelType.CHATBOT,
            'source_id': conversation_data.get('session_id'),
            'lead_source': LeadSource.DIRECT,
            'message': conversation_data.get('conversation_summary'),
            'interests': conversation_data.get('detected_interests', []),
            'raw_data': conversation_data
        }

# Main Multi-Channel Integration System
class MultiChannelIntegrationSystem:
    """
    Comprehensive multi-channel lead capture and integration system
    Handles leads from website, social media, and database sources
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379"):
        self.database_url = database_url
        self.redis_url = redis_url
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # Channel integrations
        self.integrations: Dict[str, Any] = {}
        
        # Celery for background processing
        self.celery_app = Celery('multi_channel_crm')
        
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
    
    async def register_channel_integration(self, config: ChannelConfiguration) -> str:
        """Register a new channel integration"""
        integration_id = self._generate_id()
        
        async with self.session_factory() as session:
            integration = ChannelIntegration(
                id=integration_id,
                channel_type=config.channel_type.value,
                name=config.name,
                configuration=config.settings,
                credentials=self._encrypt_credentials(config.credentials),
                webhook_url=str(config.webhook_url) if config.webhook_url else None,
                api_endpoint=str(config.api_endpoint) if config.api_endpoint else None,
                status=IntegrationStatus.ACTIVE.value
            )
            
            session.add(integration)
            await session.commit()
            
            # Initialize channel-specific integration
            if config.channel_type == ChannelType.FACEBOOK:
                self.integrations[integration_id] = FacebookIntegration(
                    app_id=config.credentials['app_id'],
                    app_secret=config.credentials['app_secret'],
                    access_token=config.credentials['access_token'],
                    page_id=config.credentials['page_id'],
                    webhook_verify_token=config.credentials['webhook_verify_token']
                )
            elif config.channel_type == ChannelType.INSTAGRAM:
                self.integrations[integration_id] = InstagramIntegration(
                    client_id=config.credentials['client_id'],
                    client_secret=config.credentials['client_secret'],
                    access_token=config.credentials['access_token']
                )
            elif config.channel_type == ChannelType.TWITTER:
                self.integrations[integration_id] = TwitterIntegration(
                    consumer_key=config.credentials['consumer_key'],
                    consumer_secret=config.credentials['consumer_secret'],
                    access_token=config.credentials['access_token'],
                    access_token_secret=config.credentials['access_token_secret']
                )
            elif config.channel_type == ChannelType.WEBSITE:
                self.integrations[integration_id] = WebsiteIntegration()
        
        self.logger.info(f"Registered {config.channel_type.value} integration: {integration_id}")
        return integration_id
    
    async def capture_lead(self, lead_data: LeadCapture) -> str:
        """Capture and process a new lead"""
        lead_id = self._generate_id()
        
        # Check for duplicates
        duplicate_hash = self._generate_duplicate_hash(lead_data)
        
        async with self.session_factory() as session:
            # Check if duplicate exists
            existing_lead = await self._find_duplicate_lead(session, duplicate_hash)
            
            if existing_lead:
                # Handle duplicate
                await self._handle_duplicate_lead(session, existing_lead, lead_data)
                return existing_lead.id
            
            # Create new lead
            lead = MultiChannelLead(
                id=lead_id,
                channel_type=lead_data.channel_type.value,
                source_id=lead_data.source_id,
                lead_source=lead_data.lead_source.value,
                lead_quality=await self._assess_lead_quality(lead_data),
                
                # Contact info
                first_name=lead_data.first_name,
                last_name=lead_data.last_name,
                email=lead_data.email,
                phone=lead_data.phone,
                company=lead_data.company,
                
                # Lead data
                message=lead_data.message,
                interests=lead_data.interests,
                budget_range=lead_data.budget_range,
                travel_dates=lead_data.travel_dates,
                group_size=lead_data.group_size,
                
                # Tracking
                utm_source=lead_data.utm_params.get('utm_source'),
                utm_medium=lead_data.utm_params.get('utm_medium'),
                utm_campaign=lead_data.utm_params.get('utm_campaign'),
                utm_content=lead_data.utm_params.get('utm_content'),
                utm_term=lead_data.utm_params.get('utm_term'),
                referrer_url=str(lead_data.referrer_url) if lead_data.referrer_url else None,
                landing_page=str(lead_data.landing_page) if lead_data.landing_page else None,
                user_agent=lead_data.user_agent,
                ip_address=lead_data.ip_address,
                
                # Social media
                social_profile_url=str(lead_data.social_profile_url) if lead_data.social_profile_url else None,
                social_follower_count=lead_data.social_follower_count,
                
                # Metadata
                raw_data=lead_data.raw_data,
                duplicate_check_hash=duplicate_hash,
                processing_status="captured"
            )
            
            session.add(lead)
            await session.commit()
            
            # Queue for background processing
            await self._queue_lead_processing(lead_id)
            
            # Update metrics
            await self._update_channel_metrics(lead_data.channel_type)
            
        self.logger.info(f"Captured lead: {lead_id} from {lead_data.channel_type.value}")
        return lead_id
    
    async def process_social_media_leads(self, integration_id: str) -> List[str]:
        """Process leads from social media channels"""
        if integration_id not in self.integrations:
            raise ValueError(f"Integration {integration_id} not found")
        
        integration = self.integrations[integration_id]
        leads = []
        
        try:
            if isinstance(integration, FacebookIntegration):
                raw_leads = await integration.capture_lead_ads()
                for raw_lead in raw_leads:
                    lead_data = await self._process_facebook_lead(raw_lead)
                    lead_id = await self.capture_lead(lead_data)
                    leads.append(lead_id)
            
            elif isinstance(integration, InstagramIntegration):
                raw_leads = await integration.capture_comments_mentions()
                for raw_lead in raw_leads:
                    lead_data = await self._process_instagram_lead(raw_lead)
                    lead_id = await self.capture_lead(lead_data)
                    leads.append(lead_id)
            
            elif isinstance(integration, TwitterIntegration):
                raw_leads = await integration.capture_mentions_dms()
                for raw_lead in raw_leads:
                    lead_data = await self._process_twitter_lead(raw_lead)
                    lead_id = await self.capture_lead(lead_data)
                    leads.append(lead_id)
            
        except Exception as e:
            self.logger.error(f"Social media lead processing error: {e}")
        
        return leads
    
    async def import_database_leads(self, csv_file_path: str, mapping_config: Dict[str, str]) -> List[str]:
        """Import leads from CSV database file"""
        import pandas as pd
        
        try:
            df = pd.read_csv(csv_file_path)
            leads = []
            
            for _, row in df.iterrows():
                # Map CSV columns to lead data
                lead_data = LeadCapture(
                    channel_type=ChannelType.DATABASE_IMPORT,
                    lead_source=LeadSource.DATABASE_IMPORT,
                    first_name=row.get(mapping_config.get('first_name')),
                    last_name=row.get(mapping_config.get('last_name')),
                    email=row.get(mapping_config.get('email')),
                    phone=row.get(mapping_config.get('phone')),
                    company=row.get(mapping_config.get('company')),
                    message=row.get(mapping_config.get('message')),
                    raw_data=row.to_dict()
                )
                
                lead_id = await self.capture_lead(lead_data)
                leads.append(lead_id)
            
            self.logger.info(f"Imported {len(leads)} leads from database")
            return leads
            
        except Exception as e:
            self.logger.error(f"Database import error: {e}")
            return []
    
    async def setup_webhook_endpoints(self, base_url: str) -> Dict[str, str]:
        """Setup webhook endpoints for various channels"""
        webhooks = {
            'facebook': f"{base_url}/webhook/facebook",
            'instagram': f"{base_url}/webhook/instagram",
            'twitter': f"{base_url}/webhook/twitter",
            'website': f"{base_url}/webhook/website"
        }
        
        # Store webhook URLs in Redis for verification
        for channel, url in webhooks.items():
            await self.redis_client.set(f"webhook:{channel}", url)
        
        return webhooks
    
    async def get_channel_performance(self, channel_type: ChannelType, days: int = 30) -> Dict[str, Any]:
        """Get performance metrics for a specific channel"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Get channel metrics
            metrics_query = """
            SELECT 
                COUNT(*) as total_leads,
                COUNT(CASE WHEN lead_quality IN ('hot', 'qualified') THEN 1 END) as qualified_leads,
                AVG(CASE WHEN lead_quality = 'hot' THEN 3 
                         WHEN lead_quality = 'warm' THEN 2 
                         WHEN lead_quality = 'cold' THEN 1 
                         ELSE 0 END) as avg_quality_score,
                COUNT(DISTINCT DATE(captured_at)) as active_days
            FROM multi_channel_leads 
            WHERE channel_type = :channel_type 
            AND captured_at >= :start_date
            """
            
            result = await session.execute(
                metrics_query, 
                {'channel_type': channel_type.value, 'start_date': start_date}
            )
            metrics = result.fetchone()
            
            return {
                'channel_type': channel_type.value,
                'period_days': days,
                'total_leads': metrics.total_leads if metrics else 0,
                'qualified_leads': metrics.qualified_leads if metrics else 0,
                'conversion_rate': (metrics.qualified_leads / metrics.total_leads * 100) if metrics and metrics.total_leads > 0 else 0,
                'avg_quality_score': float(metrics.avg_quality_score) if metrics and metrics.avg_quality_score else 0,
                'active_days': metrics.active_days if metrics else 0
            }
    
    # Helper methods
    def _generate_id(self) -> str:
        """Generate unique ID"""
        import uuid
        return str(uuid.uuid4())
    
    def _encrypt_credentials(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive credentials (placeholder - implement actual encryption)"""
        # In production, use proper encryption like Fernet
        return credentials
    
    def _generate_duplicate_hash(self, lead_data: LeadCapture) -> str:
        """Generate hash for duplicate detection"""
        key_fields = f"{lead_data.email or ''}{lead_data.phone or ''}{lead_data.first_name or ''}{lead_data.last_name or ''}"
        return hashlib.md5(key_fields.lower().encode()).hexdigest()
    
    async def _find_duplicate_lead(self, session: AsyncSession, duplicate_hash: str) -> Optional[MultiChannelLead]:
        """Find existing duplicate lead"""
        result = await session.execute(
            "SELECT * FROM multi_channel_leads WHERE duplicate_check_hash = :hash",
            {'hash': duplicate_hash}
        )
        return result.first()
    
    async def _handle_duplicate_lead(self, session: AsyncSession, existing_lead: MultiChannelLead, new_lead_data: LeadCapture):
        """Handle duplicate lead found"""
        # Create duplicate record
        duplicate_record = DuplicateLead(
            id=self._generate_id(),
            lead_id=existing_lead.id,
            duplicate_lead_id=self._generate_id(),  # Would be new lead ID if created
            similarity_score=1.0,
            merge_status="auto_merged"
        )
        session.add(duplicate_record)
        
        # Update existing lead with any new information
        if new_lead_data.message and not existing_lead.message:
            existing_lead.message = new_lead_data.message
        
        await session.commit()
    
    async def _assess_lead_quality(self, lead_data: LeadCapture) -> str:
        """Assess lead quality based on available information"""
        score = 0
        
        # Contact completeness
        if lead_data.email:
            score += 2
        if lead_data.phone:
            score += 2
        if lead_data.first_name and lead_data.last_name:
            score += 1
        
        # Interest indicators
        if lead_data.interests:
            score += 2
        if lead_data.budget_range:
            score += 3
        if lead_data.travel_dates:
            score += 2
        if lead_data.message and len(lead_data.message) > 50:
            score += 1
        
        # Social indicators
        if lead_data.social_follower_count and lead_data.social_follower_count > 1000:
            score += 1
        
        # Determine quality
        if score >= 8:
            return LeadQuality.HOT.value
        elif score >= 5:
            return LeadQuality.WARM.value
        else:
            return LeadQuality.COLD.value
    
    async def _queue_lead_processing(self, lead_id: str):
        """Queue lead for background processing"""
        await self.redis_client.lpush("lead_processing_queue", lead_id)
    
    async def _update_channel_metrics(self, channel_type: ChannelType):
        """Update channel performance metrics"""
        today = datetime.utcnow().date()
        
        # Increment daily lead count in Redis
        key = f"metrics:daily_leads:{channel_type.value}:{today}"
        await self.redis_client.incr(key)
        await self.redis_client.expire(key, 86400 * 7)  # Keep for 7 days
    
    async def _process_facebook_lead(self, raw_lead: Dict[str, Any]) -> LeadCapture:
        """Process Facebook lead data"""
        field_data = {field['name']: field['values'][0] for field in raw_lead['field_data']}
        
        return LeadCapture(
            channel_type=ChannelType.FACEBOOK,
            source_id=raw_lead['id'],
            lead_source=LeadSource.SOCIAL_MEDIA,
            first_name=field_data.get('first_name'),
            last_name=field_data.get('last_name'),
            email=field_data.get('email'),
            phone=field_data.get('phone_number'),
            message=field_data.get('message'),
            raw_data=raw_lead
        )
    
    async def _process_instagram_lead(self, raw_lead: Dict[str, Any]) -> LeadCapture:
        """Process Instagram lead data"""
        return LeadCapture(
            channel_type=ChannelType.INSTAGRAM,
            source_id=raw_lead['source_id'],
            lead_source=LeadSource.SOCIAL_MEDIA,
            message=raw_lead['message'],
            social_profile_url=f"https://instagram.com/{raw_lead['username']}",
            raw_data=raw_lead
        )
    
    async def _process_twitter_lead(self, raw_lead: Dict[str, Any]) -> LeadCapture:
        """Process Twitter lead data"""
        return LeadCapture(
            channel_type=ChannelType.TWITTER,
            source_id=raw_lead['source_id'],
            lead_source=LeadSource.SOCIAL_MEDIA,
            first_name=raw_lead.get('name', '').split()[0] if raw_lead.get('name') else None,
            message=raw_lead['message'],
            social_profile_url=raw_lead['profile_url'],
            social_follower_count=raw_lead.get('follower_count'),
            raw_data=raw_lead
        )

# Usage Example and Testing
async def main():
    """Example usage of the Multi-Channel Integration System"""
    
    # Initialize the system
    system = MultiChannelIntegrationSystem(
        database_url="sqlite+aiosqlite:///multi_channel_crm.db",
        redis_url="redis://localhost:6379"
    )
    
    await system.initialize()
    
    # Register Facebook integration
    facebook_config = ChannelConfiguration(
        channel_type=ChannelType.FACEBOOK,
        name="Spirit Tours Facebook",
        credentials={
            'app_id': 'your_app_id',
            'app_secret': 'your_app_secret',
            'access_token': 'your_access_token',
            'page_id': 'your_page_id',
            'webhook_verify_token': 'your_verify_token'
        }
    )
    
    facebook_integration_id = await system.register_channel_integration(facebook_config)
    
    # Register website integration
    website_config = ChannelConfiguration(
        channel_type=ChannelType.WEBSITE,
        name="Spirit Tours Website",
        webhook_url="https://spirittours.com/webhook/leads"
    )
    
    website_integration_id = await system.register_channel_integration(website_config)
    
    # Simulate capturing a website lead
    website_lead = LeadCapture(
        channel_type=ChannelType.WEBSITE,
        lead_source=LeadSource.ORGANIC,
        first_name="María",
        last_name="González",
        email="maria.gonzalez@email.com",
        phone="+1-555-123-4567",
        message="Interested in your 3-day Machu Picchu tour for 2 people in December",
        interests=["Machu Picchu", "Adventure Tours"],
        budget_range="$2000-$3000",
        travel_dates={"preferred_start": "2024-12-15", "preferred_end": "2024-12-18"},
        group_size=2,
        utm_params={
            "utm_source": "google",
            "utm_medium": "organic",
            "utm_campaign": "machu-picchu-seo"
        },
        landing_page="https://spirittours.com/tours/machu-picchu"
    )
    
    lead_id = await system.capture_lead(website_lead)
    print(f"Captured website lead: {lead_id}")
    
    # Get channel performance
    performance = await system.get_channel_performance(ChannelType.WEBSITE)
    print(f"Website channel performance: {performance}")
    
    # Process social media leads (would run in background)
    # social_leads = await system.process_social_media_leads(facebook_integration_id)
    # print(f"Processed {len(social_leads)} Facebook leads")

if __name__ == "__main__":
    asyncio.run(main())