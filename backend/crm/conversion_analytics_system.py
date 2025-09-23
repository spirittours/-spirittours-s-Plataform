"""
Conversion Analytics and ROI by Channel System for Spirit Tours CRM
Comprehensive analytics to track performance across all lead sources and channels
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float, func, and_, or_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, validator
import redis.asyncio as redis
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings
warnings.filterwarnings('ignore')

Base = declarative_base()

# Enums
class ConversionStage(Enum):
    LEAD_CAPTURED = "lead_captured"
    QUALIFIED = "qualified"
    CONTACTED = "contacted"
    PRESENTATION = "presentation"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class AnalyticsMetric(Enum):
    CONVERSION_RATE = "conversion_rate"
    COST_PER_LEAD = "cost_per_lead"
    COST_PER_ACQUISITION = "cost_per_acquisition"
    CUSTOMER_LIFETIME_VALUE = "customer_lifetime_value"
    ROI = "roi"
    ROAS = "roas"  # Return on Ad Spend
    REVENUE_PER_LEAD = "revenue_per_lead"
    TIME_TO_CONVERT = "time_to_convert"
    LEAD_VELOCITY = "lead_velocity"
    FUNNEL_DROP_OFF = "funnel_drop_off"

class ReportType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"

class ChannelCategory(Enum):
    ORGANIC = "organic"
    PAID = "paid"
    SOCIAL = "social"
    REFERRAL = "referral"
    DIRECT = "direct"
    EMAIL = "email"

# Database Models
class ConversionFunnel(Base):
    __tablename__ = "conversion_funnels"
    
    id = Column(String, primary_key=True)
    lead_id = Column(String, nullable=False)
    channel_type = Column(String, nullable=False)
    channel_source = Column(String)  # Specific source within channel
    
    # Stage tracking
    current_stage = Column(String, nullable=False)  # ConversionStage enum
    stage_history = Column(JSON)  # List of stage transitions
    
    # Conversion tracking
    is_converted = Column(Boolean, default=False)
    conversion_date = Column(DateTime)
    conversion_value = Column(Float, default=0.0)
    
    # Timing analytics
    lead_created_at = Column(DateTime, nullable=False)
    first_contact_at = Column(DateTime)
    qualified_at = Column(DateTime)
    proposal_sent_at = Column(DateTime)
    closed_at = Column(DateTime)
    
    # Attribution data
    utm_source = Column(String)
    utm_medium = Column(String)
    utm_campaign = Column(String)
    utm_content = Column(String)
    utm_term = Column(String)
    
    # Cost data
    acquisition_cost = Column(Float, default=0.0)
    channel_cost_share = Column(Float, default=0.0)
    
    # Customer data
    customer_id = Column(String)
    customer_segment = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChannelPerformance(Base):
    __tablename__ = "channel_performance"
    
    id = Column(String, primary_key=True)
    channel_type = Column(String, nullable=False)
    channel_source = Column(String)
    date = Column(DateTime, nullable=False)
    
    # Lead metrics
    leads_generated = Column(Integer, default=0)
    qualified_leads = Column(Integer, default=0)
    converted_leads = Column(Integer, default=0)
    
    # Conversion metrics
    lead_to_qualified_rate = Column(Float, default=0.0)
    qualified_to_customer_rate = Column(Float, default=0.0)
    overall_conversion_rate = Column(Float, default=0.0)
    
    # Financial metrics
    total_cost = Column(Float, default=0.0)
    total_revenue = Column(Float, default=0.0)
    cost_per_lead = Column(Float, default=0.0)
    cost_per_acquisition = Column(Float, default=0.0)
    revenue_per_lead = Column(Float, default=0.0)
    roi = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)
    
    # Timing metrics
    avg_time_to_contact = Column(Float, default=0.0)  # in hours
    avg_time_to_qualify = Column(Float, default=0.0)  # in hours
    avg_time_to_convert = Column(Float, default=0.0)  # in hours
    avg_sales_cycle_length = Column(Float, default=0.0)  # in days
    
    # Quality metrics
    lead_quality_score = Column(Float, default=0.0)
    customer_satisfaction = Column(Float, default=0.0)
    repeat_purchase_rate = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class CampaignAnalytics(Base):
    __tablename__ = "campaign_analytics"
    
    id = Column(String, primary_key=True)
    campaign_name = Column(String, nullable=False)
    utm_campaign = Column(String)
    channel_type = Column(String, nullable=False)
    
    # Campaign period
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Budget and costs
    total_budget = Column(Float, default=0.0)
    spent_budget = Column(Float, default=0.0)
    daily_budget = Column(Float, default=0.0)
    
    # Performance metrics
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    click_through_rate = Column(Float, default=0.0)
    
    # Lead metrics
    leads_generated = Column(Integer, default=0)
    qualified_leads = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    
    # Revenue metrics
    total_revenue = Column(Float, default=0.0)
    roi = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)
    
    # Target metrics
    target_leads = Column(Integer, default=0)
    target_conversions = Column(Integer, default=0)
    target_revenue = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CustomerLifetimeValue(Base):
    __tablename__ = "customer_lifetime_value"
    
    id = Column(String, primary_key=True)
    customer_id = Column(String, nullable=False, unique=True)
    
    # Acquisition data
    acquisition_channel = Column(String)
    acquisition_source = Column(String)
    acquisition_cost = Column(Float, default=0.0)
    acquisition_date = Column(DateTime)
    
    # Purchase data
    first_purchase_value = Column(Float, default=0.0)
    total_purchase_value = Column(Float, default=0.0)
    purchase_count = Column(Integer, default=0)
    avg_order_value = Column(Float, default=0.0)
    
    # Timing data
    days_since_acquisition = Column(Integer, default=0)
    last_purchase_date = Column(DateTime)
    purchase_frequency = Column(Float, default=0.0)  # purchases per month
    
    # CLV calculations
    predicted_clv_1year = Column(Float, default=0.0)
    predicted_clv_3year = Column(Float, default=0.0)
    predicted_clv_lifetime = Column(Float, default=0.0)
    
    # Engagement metrics
    email_engagement_score = Column(Float, default=0.0)
    support_ticket_count = Column(Integer, default=0)
    satisfaction_score = Column(Float, default=0.0)
    churn_probability = Column(Float, default=0.0)
    
    calculated_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AttributionModel(Base):
    __tablename__ = "attribution_models"
    
    id = Column(String, primary_key=True)
    customer_id = Column(String, nullable=False)
    conversion_id = Column(String)
    
    # Touchpoint data
    touchpoints = Column(JSON)  # List of all customer touchpoints
    touchpoint_count = Column(Integer, default=0)
    
    # Attribution models
    first_touch_channel = Column(String)
    last_touch_channel = Column(String)
    linear_attribution = Column(JSON)  # Equal weight to all touchpoints
    time_decay_attribution = Column(JSON)  # More weight to recent touchpoints
    position_based_attribution = Column(JSON)  # More weight to first and last
    
    # Model effectiveness
    model_confidence = Column(Float, default=0.0)
    attribution_value = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
class AnalyticsQuery(BaseModel):
    start_date: datetime
    end_date: datetime
    channels: Optional[List[str]] = None
    sources: Optional[List[str]] = None
    metrics: Optional[List[AnalyticsMetric]] = None
    group_by: Optional[str] = "channel"  # channel, source, campaign, date
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

class ConversionReport(BaseModel):
    period: str
    total_leads: int
    total_conversions: int
    overall_conversion_rate: float
    total_revenue: float
    total_cost: float
    roi: float
    
    channel_breakdown: List[Dict[str, Any]]
    funnel_analysis: Dict[str, Any]
    trends: Dict[str, List[Any]]

class CohortAnalysis(BaseModel):
    cohort_period: str  # monthly, quarterly
    cohorts: List[Dict[str, Any]]
    retention_rates: Dict[str, List[float]]
    revenue_cohorts: Dict[str, List[float]]

# Main Conversion Analytics System
class ConversionAnalyticsSystem:
    """
    Comprehensive conversion analytics and ROI tracking system
    Provides detailed insights into channel performance and customer journey
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379"):
        self.database_url = database_url
        self.redis_url = redis_url
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # ML models for predictions
        self.clv_model = None
        self.conversion_model = None
        
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
    
    async def track_conversion_event(self, 
                                   lead_id: str, 
                                   stage: ConversionStage, 
                                   channel_data: Dict[str, Any],
                                   value: float = 0.0) -> str:
        """Track a conversion event in the funnel"""
        funnel_id = self._generate_id()
        
        async with self.session_factory() as session:
            # Check if funnel exists for this lead
            existing_funnel = await session.execute(
                "SELECT * FROM conversion_funnels WHERE lead_id = :lead_id",
                {'lead_id': lead_id}
            )
            funnel = existing_funnel.first()
            
            if funnel:
                # Update existing funnel
                stage_history = funnel.stage_history or []
                stage_history.append({
                    'stage': stage.value,
                    'timestamp': datetime.utcnow().isoformat(),
                    'value': value
                })
                
                update_data = {
                    'current_stage': stage.value,
                    'stage_history': stage_history,
                    'updated_at': datetime.utcnow()
                }
                
                # Update stage-specific timestamps
                if stage == ConversionStage.CONTACTED:
                    update_data['first_contact_at'] = datetime.utcnow()
                elif stage == ConversionStage.QUALIFIED:
                    update_data['qualified_at'] = datetime.utcnow()
                elif stage == ConversionStage.PROPOSAL_SENT:
                    update_data['proposal_sent_at'] = datetime.utcnow()
                elif stage in [ConversionStage.CLOSED_WON, ConversionStage.CLOSED_LOST]:
                    update_data['closed_at'] = datetime.utcnow()
                    update_data['is_converted'] = (stage == ConversionStage.CLOSED_WON)
                    if stage == ConversionStage.CLOSED_WON:
                        update_data['conversion_date'] = datetime.utcnow()
                        update_data['conversion_value'] = value
                
                await session.execute(
                    """UPDATE conversion_funnels SET 
                       current_stage = :current_stage,
                       stage_history = :stage_history,
                       first_contact_at = COALESCE(:first_contact_at, first_contact_at),
                       qualified_at = COALESCE(:qualified_at, qualified_at),
                       proposal_sent_at = COALESCE(:proposal_sent_at, proposal_sent_at),
                       closed_at = COALESCE(:closed_at, closed_at),
                       is_converted = COALESCE(:is_converted, is_converted),
                       conversion_date = COALESCE(:conversion_date, conversion_date),
                       conversion_value = COALESCE(:conversion_value, conversion_value),
                       updated_at = :updated_at
                       WHERE lead_id = :lead_id""",
                    {**update_data, 'lead_id': lead_id}
                )
                
                funnel_id = funnel.id
                
            else:
                # Create new funnel
                new_funnel = ConversionFunnel(
                    id=funnel_id,
                    lead_id=lead_id,
                    channel_type=channel_data.get('channel_type'),
                    channel_source=channel_data.get('channel_source'),
                    current_stage=stage.value,
                    stage_history=[{
                        'stage': stage.value,
                        'timestamp': datetime.utcnow().isoformat(),
                        'value': value
                    }],
                    lead_created_at=channel_data.get('created_at', datetime.utcnow()),
                    utm_source=channel_data.get('utm_source'),
                    utm_medium=channel_data.get('utm_medium'),
                    utm_campaign=channel_data.get('utm_campaign'),
                    utm_content=channel_data.get('utm_content'),
                    utm_term=channel_data.get('utm_term'),
                    acquisition_cost=channel_data.get('acquisition_cost', 0.0)
                )
                
                session.add(new_funnel)
            
            await session.commit()
            
            # Update real-time analytics
            await self._update_realtime_metrics(channel_data.get('channel_type'), stage)
        
        self.logger.info(f"Tracked conversion event: {lead_id} -> {stage.value}")
        return funnel_id
    
    async def calculate_channel_performance(self, 
                                          start_date: datetime, 
                                          end_date: datetime,
                                          channel_type: Optional[str] = None) -> Dict[str, Any]:
        """Calculate comprehensive channel performance metrics"""
        
        async with self.session_factory() as session:
            # Base query filters
            filters = [
                func.date(ConversionFunnel.lead_created_at) >= start_date.date(),
                func.date(ConversionFunnel.lead_created_at) <= end_date.date()
            ]
            
            if channel_type:
                filters.append(ConversionFunnel.channel_type == channel_type)
            
            # Get conversion funnel data
            query = session.query(ConversionFunnel).filter(and_(*filters))
            funnels = await session.execute(query.statement)
            funnel_data = [dict(row) for row in funnels]
            
            if not funnel_data:
                return {'error': 'No data found for the specified period'}
            
            # Convert to DataFrame for analysis
            df = pd.DataFrame(funnel_data)
            
            # Calculate metrics by channel
            channel_metrics = {}
            
            for channel in df['channel_type'].unique():
                channel_df = df[df['channel_type'] == channel]
                
                # Basic counts
                total_leads = len(channel_df)
                qualified_leads = len(channel_df[channel_df['qualified_at'].notna()])
                converted_leads = len(channel_df[channel_df['is_converted'] == True])
                
                # Conversion rates
                lead_to_qualified_rate = qualified_leads / total_leads if total_leads > 0 else 0
                qualified_to_customer_rate = converted_leads / qualified_leads if qualified_leads > 0 else 0
                overall_conversion_rate = converted_leads / total_leads if total_leads > 0 else 0
                
                # Financial metrics
                total_cost = channel_df['acquisition_cost'].sum()
                total_revenue = channel_df['conversion_value'].sum()
                
                cost_per_lead = total_cost / total_leads if total_leads > 0 else 0
                cost_per_acquisition = total_cost / converted_leads if converted_leads > 0 else 0
                revenue_per_lead = total_revenue / total_leads if total_leads > 0 else 0
                
                roi = ((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0
                roas = (total_revenue / total_cost) if total_cost > 0 else 0
                
                # Timing metrics
                contacted_df = channel_df[channel_df['first_contact_at'].notna()]
                qualified_df = channel_df[channel_df['qualified_at'].notna()]
                converted_df = channel_df[channel_df['conversion_date'].notna()]
                
                avg_time_to_contact = 0
                avg_time_to_qualify = 0
                avg_time_to_convert = 0
                
                if len(contacted_df) > 0:
                    time_to_contact = (pd.to_datetime(contacted_df['first_contact_at']) - 
                                     pd.to_datetime(contacted_df['lead_created_at'])).dt.total_seconds() / 3600
                    avg_time_to_contact = time_to_contact.mean()
                
                if len(qualified_df) > 0:
                    time_to_qualify = (pd.to_datetime(qualified_df['qualified_at']) - 
                                     pd.to_datetime(qualified_df['lead_created_at'])).dt.total_seconds() / 3600
                    avg_time_to_qualify = time_to_qualify.mean()
                
                if len(converted_df) > 0:
                    time_to_convert = (pd.to_datetime(converted_df['conversion_date']) - 
                                     pd.to_datetime(converted_df['lead_created_at'])).dt.total_seconds() / 3600
                    avg_time_to_convert = time_to_convert.mean()
                
                channel_metrics[channel] = {
                    'total_leads': total_leads,
                    'qualified_leads': qualified_leads,
                    'converted_leads': converted_leads,
                    'lead_to_qualified_rate': round(lead_to_qualified_rate * 100, 2),
                    'qualified_to_customer_rate': round(qualified_to_customer_rate * 100, 2),
                    'overall_conversion_rate': round(overall_conversion_rate * 100, 2),
                    'total_cost': round(total_cost, 2),
                    'total_revenue': round(total_revenue, 2),
                    'cost_per_lead': round(cost_per_lead, 2),
                    'cost_per_acquisition': round(cost_per_acquisition, 2),
                    'revenue_per_lead': round(revenue_per_lead, 2),
                    'roi': round(roi, 2),
                    'roas': round(roas, 2),
                    'avg_time_to_contact_hours': round(avg_time_to_contact, 2),
                    'avg_time_to_qualify_hours': round(avg_time_to_qualify, 2),
                    'avg_time_to_convert_hours': round(avg_time_to_convert, 2)
                }
            
            # Overall metrics
            total_leads = len(df)
            total_qualified = len(df[df['qualified_at'].notna()])
            total_converted = len(df[df['is_converted'] == True])
            overall_cost = df['acquisition_cost'].sum()
            overall_revenue = df['conversion_value'].sum()
            
            overall_metrics = {
                'period': f"{start_date.date()} to {end_date.date()}",
                'total_leads': total_leads,
                'total_qualified': total_qualified,
                'total_converted': total_converted,
                'overall_conversion_rate': round(total_converted / total_leads * 100, 2) if total_leads > 0 else 0,
                'total_cost': round(overall_cost, 2),
                'total_revenue': round(overall_revenue, 2),
                'overall_roi': round(((overall_revenue - overall_cost) / overall_cost * 100), 2) if overall_cost > 0 else 0,
                'channel_breakdown': channel_metrics
            }
            
            return overall_metrics
    
    async def generate_funnel_analysis(self, 
                                     start_date: datetime, 
                                     end_date: datetime,
                                     channel_type: Optional[str] = None) -> Dict[str, Any]:
        """Generate detailed funnel analysis"""
        
        async with self.session_factory() as session:
            # Get all funnels in period
            filters = [
                func.date(ConversionFunnel.lead_created_at) >= start_date.date(),
                func.date(ConversionFunnel.lead_created_at) <= end_date.date()
            ]
            
            if channel_type:
                filters.append(ConversionFunnel.channel_type == channel_type)
            
            query = session.query(ConversionFunnel).filter(and_(*filters))
            funnels = await session.execute(query.statement)
            funnel_data = [dict(row) for row in funnels]
            
            df = pd.DataFrame(funnel_data)
            
            # Define funnel stages
            stages = [
                ('Lead Captured', lambda x: True),
                ('Contacted', lambda x: pd.notna(x['first_contact_at'])),
                ('Qualified', lambda x: pd.notna(x['qualified_at'])),
                ('Proposal Sent', lambda x: pd.notna(x['proposal_sent_at'])),
                ('Closed Won', lambda x: x['is_converted'] == True)
            ]
            
            funnel_stats = []
            previous_count = len(df)
            
            for stage_name, condition in stages:
                if stage_name == 'Lead Captured':
                    count = len(df)
                else:
                    count = len(df[df.apply(condition, axis=1)])
                
                conversion_rate = (count / previous_count * 100) if previous_count > 0 else 0
                drop_off_rate = ((previous_count - count) / previous_count * 100) if previous_count > 0 else 0
                
                funnel_stats.append({
                    'stage': stage_name,
                    'count': count,
                    'conversion_rate': round(conversion_rate, 2),
                    'drop_off_rate': round(drop_off_rate, 2),
                    'drop_off_count': previous_count - count
                })
                
                previous_count = count
            
            # Channel-specific funnel
            channel_funnels = {}
            if not channel_type:  # Only if not filtering by specific channel
                for channel in df['channel_type'].unique():
                    channel_df = df[df['channel_type'] == channel]
                    
                    channel_funnel = []
                    prev_count = len(channel_df)
                    
                    for stage_name, condition in stages:
                        if stage_name == 'Lead Captured':
                            count = len(channel_df)
                        else:
                            count = len(channel_df[channel_df.apply(condition, axis=1)])
                        
                        conversion_rate = (count / prev_count * 100) if prev_count > 0 else 0
                        
                        channel_funnel.append({
                            'stage': stage_name,
                            'count': count,
                            'conversion_rate': round(conversion_rate, 2)
                        })
                        
                        prev_count = count
                    
                    channel_funnels[channel] = channel_funnel
            
            return {
                'period': f"{start_date.date()} to {end_date.date()}",
                'overall_funnel': funnel_stats,
                'channel_funnels': channel_funnels,
                'total_leads': len(df),
                'funnel_efficiency': round(funnel_stats[-1]['count'] / funnel_stats[0]['count'] * 100, 2) if funnel_stats else 0
            }
    
    async def calculate_customer_lifetime_value(self, customer_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculate Customer Lifetime Value (CLV)"""
        
        async with self.session_factory() as session:
            if customer_id:
                # Calculate CLV for specific customer
                query = """
                SELECT 
                    cf.customer_id,
                    cf.acquisition_channel,
                    cf.acquisition_cost,
                    cf.conversion_date as acquisition_date,
                    cf.conversion_value as first_purchase_value,
                    COUNT(CASE WHEN cf.is_converted = true THEN 1 END) as purchase_count,
                    SUM(cf.conversion_value) as total_purchase_value,
                    AVG(cf.conversion_value) as avg_order_value,
                    MAX(cf.conversion_date) as last_purchase_date,
                    MIN(cf.conversion_date) as first_purchase_date
                FROM conversion_funnels cf
                WHERE cf.customer_id = :customer_id AND cf.is_converted = true
                GROUP BY cf.customer_id, cf.acquisition_channel, cf.acquisition_cost, cf.conversion_date
                """
                
                result = await session.execute(query, {'customer_id': customer_id})
                customer_data = result.first()
                
                if customer_data:
                    # Calculate CLV metrics
                    days_since_acquisition = (datetime.utcnow() - customer_data.first_purchase_date).days
                    purchase_frequency = customer_data.purchase_count / (days_since_acquisition / 30) if days_since_acquisition > 0 else 0
                    
                    # Predict CLV using simple model
                    predicted_clv_1year = customer_data.avg_order_value * purchase_frequency * 12
                    predicted_clv_3year = predicted_clv_1year * 2.5  # Assuming some growth
                    
                    clv_data = {
                        'customer_id': customer_id,
                        'acquisition_channel': customer_data.acquisition_channel,
                        'acquisition_cost': customer_data.acquisition_cost,
                        'first_purchase_value': customer_data.first_purchase_value,
                        'total_purchase_value': customer_data.total_purchase_value,
                        'purchase_count': customer_data.purchase_count,
                        'avg_order_value': customer_data.avg_order_value,
                        'days_since_acquisition': days_since_acquisition,
                        'purchase_frequency_monthly': round(purchase_frequency, 2),
                        'predicted_clv_1year': round(predicted_clv_1year, 2),
                        'predicted_clv_3year': round(predicted_clv_3year, 2),
                        'clv_to_cac_ratio': round(predicted_clv_1year / customer_data.acquisition_cost, 2) if customer_data.acquisition_cost > 0 else 0
                    }
                    
                    # Save to database
                    clv_record = CustomerLifetimeValue(
                        id=self._generate_id(),
                        customer_id=customer_id,
                        acquisition_channel=customer_data.acquisition_channel,
                        acquisition_cost=customer_data.acquisition_cost,
                        acquisition_date=customer_data.first_purchase_date,
                        first_purchase_value=customer_data.first_purchase_value,
                        total_purchase_value=customer_data.total_purchase_value,
                        purchase_count=customer_data.purchase_count,
                        avg_order_value=customer_data.avg_order_value,
                        days_since_acquisition=days_since_acquisition,
                        purchase_frequency=purchase_frequency,
                        predicted_clv_1year=predicted_clv_1year,
                        predicted_clv_3year=predicted_clv_3year
                    )
                    
                    await session.merge(clv_record)
                    await session.commit()
                    
                    return clv_data
                
                return {'error': f'No purchase data found for customer {customer_id}'}
            
            else:
                # Calculate CLV for all customers
                query = """
                SELECT 
                    acquisition_channel,
                    COUNT(DISTINCT customer_id) as customer_count,
                    AVG(predicted_clv_1year) as avg_clv_1year,
                    AVG(predicted_clv_3year) as avg_clv_3year,
                    AVG(acquisition_cost) as avg_acquisition_cost,
                    AVG(predicted_clv_1year / NULLIF(acquisition_cost, 0)) as avg_clv_cac_ratio
                FROM customer_lifetime_value
                GROUP BY acquisition_channel
                """
                
                result = await session.execute(query)
                channel_clv = [dict(row) for row in result]
                
                return {
                    'channel_clv_analysis': channel_clv,
                    'calculated_at': datetime.utcnow().isoformat()
                }
    
    async def generate_attribution_analysis(self, customer_id: str) -> Dict[str, Any]:
        """Generate multi-touch attribution analysis"""
        
        async with self.session_factory() as session:
            # Get all touchpoints for customer
            query = """
            SELECT 
                cf.channel_type,
                cf.channel_source,
                cf.utm_source,
                cf.utm_medium,
                cf.utm_campaign,
                cf.lead_created_at,
                cf.conversion_date,
                cf.conversion_value,
                cf.stage_history
            FROM conversion_funnels cf
            WHERE cf.customer_id = :customer_id
            ORDER BY cf.lead_created_at
            """
            
            result = await session.execute(query, {'customer_id': customer_id})
            touchpoints = [dict(row) for row in result]
            
            if not touchpoints:
                return {'error': f'No touchpoints found for customer {customer_id}'}
            
            # Calculate attribution models
            total_value = sum(tp['conversion_value'] for tp in touchpoints if tp['conversion_value'])
            touchpoint_count = len(touchpoints)
            
            attribution_models = {
                'first_touch': {
                    'channel': touchpoints[0]['channel_type'],
                    'source': touchpoints[0]['channel_source'],
                    'attribution_value': total_value,
                    'attribution_percentage': 100.0
                },
                'last_touch': {
                    'channel': touchpoints[-1]['channel_type'],
                    'source': touchpoints[-1]['channel_source'],
                    'attribution_value': total_value,
                    'attribution_percentage': 100.0
                },
                'linear': [],
                'time_decay': [],
                'position_based': []
            }
            
            # Linear attribution (equal weight)
            linear_value = total_value / touchpoint_count if touchpoint_count > 0 else 0
            for tp in touchpoints:
                attribution_models['linear'].append({
                    'channel': tp['channel_type'],
                    'source': tp['channel_source'],
                    'attribution_value': linear_value,
                    'attribution_percentage': 100.0 / touchpoint_count
                })
            
            # Time decay attribution (more recent touchpoints get more credit)
            if touchpoint_count > 1:
                decay_weights = np.array([0.5 ** (touchpoint_count - i - 1) for i in range(touchpoint_count)])
                decay_weights = decay_weights / decay_weights.sum()
                
                for i, tp in enumerate(touchpoints):
                    attribution_models['time_decay'].append({
                        'channel': tp['channel_type'],
                        'source': tp['channel_source'],
                        'attribution_value': total_value * decay_weights[i],
                        'attribution_percentage': decay_weights[i] * 100
                    })
            
            # Position-based attribution (40% first, 40% last, 20% middle)
            if touchpoint_count == 1:
                attribution_models['position_based'] = attribution_models['linear']
            elif touchpoint_count == 2:
                for i, tp in enumerate(touchpoints):
                    attribution_models['position_based'].append({
                        'channel': tp['channel_type'],
                        'source': tp['channel_source'],
                        'attribution_value': total_value * 0.5,
                        'attribution_percentage': 50.0
                    })
            else:
                middle_weight = 0.2 / (touchpoint_count - 2) if touchpoint_count > 2 else 0
                
                for i, tp in enumerate(touchpoints):
                    if i == 0:  # First touch
                        weight = 0.4
                    elif i == touchpoint_count - 1:  # Last touch
                        weight = 0.4
                    else:  # Middle touches
                        weight = middle_weight
                    
                    attribution_models['position_based'].append({
                        'channel': tp['channel_type'],
                        'source': tp['channel_source'],
                        'attribution_value': total_value * weight,
                        'attribution_percentage': weight * 100
                    })
            
            # Save attribution analysis
            attribution_record = AttributionModel(
                id=self._generate_id(),
                customer_id=customer_id,
                touchpoints=touchpoints,
                touchpoint_count=touchpoint_count,
                first_touch_channel=touchpoints[0]['channel_type'],
                last_touch_channel=touchpoints[-1]['channel_type'],
                linear_attribution=attribution_models['linear'],
                time_decay_attribution=attribution_models['time_decay'],
                position_based_attribution=attribution_models['position_based'],
                attribution_value=total_value
            )
            
            session.add(attribution_record)
            await session.commit()
            
            return {
                'customer_id': customer_id,
                'total_touchpoints': touchpoint_count,
                'total_conversion_value': total_value,
                'attribution_models': attribution_models,
                'touchpoint_journey': touchpoints
            }
    
    async def generate_cohort_analysis(self, 
                                     cohort_period: str = "monthly",
                                     start_date: Optional[datetime] = None,
                                     end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Generate cohort analysis for customer retention and revenue"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=365)
        if not end_date:
            end_date = datetime.utcnow()
        
        async with self.session_factory() as session:
            # Get customer acquisition and activity data
            query = """
            SELECT 
                cf.customer_id,
                cf.conversion_date as acquisition_date,
                cf.conversion_value,
                cf.acquisition_channel
            FROM conversion_funnels cf
            WHERE cf.is_converted = true
            AND cf.conversion_date BETWEEN :start_date AND :end_date
            ORDER BY cf.customer_id, cf.conversion_date
            """
            
            result = await session.execute(query, {
                'start_date': start_date,
                'end_date': end_date
            })
            
            data = [dict(row) for row in result]
            df = pd.DataFrame(data)
            
            if df.empty:
                return {'error': 'No cohort data available for the specified period'}
            
            df['acquisition_date'] = pd.to_datetime(df['acquisition_date'])
            
            # Create cohort periods
            if cohort_period == "monthly":
                df['cohort_period'] = df['acquisition_date'].dt.to_period('M')
                period_format = '%Y-%m'
            elif cohort_period == "quarterly":
                df['cohort_period'] = df['acquisition_date'].dt.to_period('Q')
                period_format = '%Y-Q%q'
            else:
                df['cohort_period'] = df['acquisition_date'].dt.to_period('M')
                period_format = '%Y-%m'
            
            # Group by cohort
            cohort_data = df.groupby('cohort_period').agg({
                'customer_id': 'nunique',
                'conversion_value': ['sum', 'mean'],
                'acquisition_channel': lambda x: x.mode().iloc[0] if not x.empty else 'Unknown'
            }).reset_index()
            
            # Flatten column names
            cohort_data.columns = ['cohort_period', 'customer_count', 'total_revenue', 'avg_revenue', 'top_channel']
            
            # Calculate cohort metrics
            cohorts = []
            for _, cohort in cohort_data.iterrows():
                cohort_customers = df[df['cohort_period'] == cohort['cohort_period']]['customer_id'].unique()
                
                # Calculate retention (placeholder - would need repeat purchase data)
                retention_periods = []
                for period_offset in range(1, 13):  # 12 periods ahead
                    # This is simplified - in practice, you'd check actual repeat purchases
                    retention_rate = max(0, (len(cohort_customers) * (0.8 ** period_offset)) / len(cohort_customers))
                    retention_periods.append(round(retention_rate * 100, 2))
                
                cohorts.append({
                    'cohort_period': str(cohort['cohort_period']),
                    'customer_count': int(cohort['customer_count']),
                    'total_revenue': round(cohort['total_revenue'], 2),
                    'avg_revenue_per_customer': round(cohort['avg_revenue'], 2),
                    'top_acquisition_channel': cohort['top_channel'],
                    'retention_rates': retention_periods[:6],  # First 6 periods
                    'revenue_per_period': [round(cohort['total_revenue'] * (r/100), 2) for r in retention_periods[:6]]
                })
            
            return {
                'cohort_period': cohort_period,
                'analysis_period': f"{start_date.date()} to {end_date.date()}",
                'total_cohorts': len(cohorts),
                'cohorts': cohorts,
                'insights': {
                    'best_performing_cohort': max(cohorts, key=lambda x: x['avg_revenue_per_customer'])['cohort_period'] if cohorts else None,
                    'largest_cohort': max(cohorts, key=lambda x: x['customer_count'])['cohort_period'] if cohorts else None,
                    'avg_cohort_size': round(sum(c['customer_count'] for c in cohorts) / len(cohorts), 2) if cohorts else 0
                }
            }
    
    async def create_performance_dashboard_data(self, days: int = 30) -> Dict[str, Any]:
        """Create comprehensive dashboard data for performance visualization"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get channel performance
        channel_performance = await self.calculate_channel_performance(start_date, end_date)
        
        # Get funnel analysis
        funnel_analysis = await self.generate_funnel_analysis(start_date, end_date)
        
        # Get CLV analysis
        clv_analysis = await self.calculate_customer_lifetime_value()
        
        # Daily trends
        daily_metrics = await self._get_daily_trends(start_date, end_date)
        
        # Top performing campaigns
        top_campaigns = await self._get_top_campaigns(start_date, end_date)
        
        return {
            'dashboard_period': f"{days} days",
            'generated_at': datetime.utcnow().isoformat(),
            'overview': {
                'total_leads': channel_performance.get('total_leads', 0),
                'total_conversions': channel_performance.get('total_converted', 0),
                'conversion_rate': channel_performance.get('overall_conversion_rate', 0),
                'total_revenue': channel_performance.get('total_revenue', 0),
                'total_cost': channel_performance.get('total_cost', 0),
                'roi': channel_performance.get('overall_roi', 0)
            },
            'channel_performance': channel_performance.get('channel_breakdown', {}),
            'funnel_analysis': funnel_analysis,
            'clv_analysis': clv_analysis,
            'daily_trends': daily_metrics,
            'top_campaigns': top_campaigns
        }
    
    # Helper methods
    def _generate_id(self) -> str:
        """Generate unique ID"""
        import uuid
        return str(uuid.uuid4())
    
    async def _update_realtime_metrics(self, channel_type: str, stage: ConversionStage):
        """Update real-time metrics in Redis"""
        today = datetime.utcnow().date()
        
        # Update daily counters
        await self.redis_client.hincrby(f"daily_metrics:{today}", f"{channel_type}_leads", 1)
        
        if stage == ConversionStage.QUALIFIED:
            await self.redis_client.hincrby(f"daily_metrics:{today}", f"{channel_type}_qualified", 1)
        elif stage == ConversionStage.CLOSED_WON:
            await self.redis_client.hincrby(f"daily_metrics:{today}", f"{channel_type}_conversions", 1)
        
        # Set expiration for 30 days
        await self.redis_client.expire(f"daily_metrics:{today}", 86400 * 30)
    
    async def _get_daily_trends(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Get daily performance trends"""
        async with self.session_factory() as session:
            query = """
            SELECT 
                DATE(lead_created_at) as date,
                channel_type,
                COUNT(*) as leads,
                SUM(CASE WHEN qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified,
                SUM(CASE WHEN is_converted = true THEN 1 ELSE 0 END) as conversions,
                SUM(conversion_value) as revenue,
                SUM(acquisition_cost) as cost
            FROM conversion_funnels
            WHERE DATE(lead_created_at) BETWEEN :start_date AND :end_date
            GROUP BY DATE(lead_created_at), channel_type
            ORDER BY date DESC
            """
            
            result = await session.execute(query, {
                'start_date': start_date.date(),
                'end_date': end_date.date()
            })
            
            return [dict(row) for row in result]
    
    async def _get_top_campaigns(self, start_date: datetime, end_date: datetime, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top performing campaigns"""
        async with self.session_factory() as session:
            query = """
            SELECT 
                utm_campaign,
                channel_type,
                COUNT(*) as leads,
                SUM(CASE WHEN is_converted = true THEN 1 ELSE 0 END) as conversions,
                SUM(conversion_value) as revenue,
                SUM(acquisition_cost) as cost,
                (SUM(conversion_value) - SUM(acquisition_cost)) / NULLIF(SUM(acquisition_cost), 0) * 100 as roi
            FROM conversion_funnels
            WHERE DATE(lead_created_at) BETWEEN :start_date AND :end_date
            AND utm_campaign IS NOT NULL
            GROUP BY utm_campaign, channel_type
            HAVING COUNT(*) >= 5  -- Minimum 5 leads for statistical significance
            ORDER BY roi DESC
            LIMIT :limit
            """
            
            result = await session.execute(query, {
                'start_date': start_date.date(),
                'end_date': end_date.date(),
                'limit': limit
            })
            
            return [dict(row) for row in result]

# Usage Example
async def main():
    """Example usage of the Conversion Analytics System"""
    
    # Initialize the system
    system = ConversionAnalyticsSystem(
        database_url="sqlite+aiosqlite:///conversion_analytics.db",
        redis_url="redis://localhost:6379"
    )
    
    await system.initialize()
    
    # Track a conversion event
    channel_data = {
        'channel_type': 'website',
        'channel_source': 'organic_search',
        'utm_source': 'google',
        'utm_medium': 'organic',
        'utm_campaign': 'machu-picchu-seo',
        'acquisition_cost': 15.50,
        'created_at': datetime.utcnow()
    }
    
    await system.track_conversion_event(
        lead_id="lead_123",
        stage=ConversionStage.LEAD_CAPTURED,
        channel_data=channel_data
    )
    
    # Simulate progression through funnel
    await system.track_conversion_event(
        lead_id="lead_123",
        stage=ConversionStage.CONTACTED,
        channel_data=channel_data
    )
    
    await system.track_conversion_event(
        lead_id="lead_123",
        stage=ConversionStage.CLOSED_WON,
        channel_data=channel_data,
        value=2500.00
    )
    
    # Get performance analytics
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    performance = await system.calculate_channel_performance(start_date, end_date)
    print("Channel Performance:")
    print(json.dumps(performance, indent=2, default=str))
    
    # Get funnel analysis
    funnel = await system.generate_funnel_analysis(start_date, end_date)
    print("\nFunnel Analysis:")
    print(json.dumps(funnel, indent=2, default=str))
    
    # Calculate CLV
    clv = await system.calculate_customer_lifetime_value("customer_123")
    print("\nCustomer Lifetime Value:")
    print(json.dumps(clv, indent=2, default=str))
    
    # Generate dashboard data
    dashboard = await system.create_performance_dashboard_data(days=30)
    print("\nDashboard Data:")
    print(json.dumps(dashboard, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())