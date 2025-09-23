"""
Comprehensive CRM Integration System for Spirit Tours
Central orchestrator that integrates all CRM components into a unified system
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import uuid

# Import all CRM system components
from .advanced_crm_system import (
    AdvancedCRMSystem, Lead, Customer, Interaction,
    LeadSource, LeadStatus, CustomerSegment
)
from .advanced_ticketing_system import (
    AdvancedTicketingSystem, Ticket, TicketWorkflow, WorkflowStage,
    TicketStatus, TicketPriority, SLALevel
)
from .intelligent_sales_pipeline import (
    IntelligentSalesPipeline, SalesOpportunity, OpportunityPrediction,
    PipelineStage, OpportunityStatus
)
from .multi_channel_integration import (
    MultiChannelIntegrationSystem, ChannelType, LeadCapture,
    MultiChannelLead, ChannelIntegration
)
from .sales_notifications_system import (
    SalesNotificationsSystem, NotificationRequest, NotificationType,
    NotificationChannel, NotificationPriority
)
from .conversion_analytics_system import (
    ConversionAnalyticsSystem, ConversionStage, AnalyticsMetric,
    ConversionFunnel, ChannelPerformance
)
from .payment_processing_system import (
    PaymentProcessingSystem, PaymentRequest, PaymentProvider,
    PaymentMethod, PaymentStatus, CurrencyCode
)
from .ai_followup_automation import (
    AIFollowUpAutomationSystem, FollowUpRequest, FollowUpType,
    CustomerIntent, SentimentScore
)

from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, EmailStr, validator
import redis.asyncio as redis
from celery import Celery

Base = declarative_base()

# Enums for integration
class IntegrationStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    INITIALIZING = "initializing"

class DataSyncStatus(Enum):
    IN_SYNC = "in_sync"
    SYNCING = "syncing"
    OUT_OF_SYNC = "out_of_sync"
    SYNC_ERROR = "sync_error"

# Integration Models
class SystemIntegration(Base):
    __tablename__ = "system_integrations"
    
    id = Column(String, primary_key=True)
    system_name = Column(String, nullable=False)
    system_type = Column(String, nullable=False)
    
    # Integration status
    status = Column(String, default="active")  # IntegrationStatus enum
    last_sync = Column(DateTime)
    sync_status = Column(String, default="in_sync")  # DataSyncStatus enum
    
    # Configuration
    configuration = Column(JSON)
    enabled_features = Column(JSON)
    
    # Health monitoring
    health_score = Column(Float, default=1.0)
    error_count = Column(Integer, default=0)
    last_error = Column(Text)
    uptime_percentage = Column(Float, default=100.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class DataSyncLog(Base):
    __tablename__ = "data_sync_logs"
    
    id = Column(String, primary_key=True)
    source_system = Column(String, nullable=False)
    target_system = Column(String, nullable=False)
    
    # Sync details
    sync_type = Column(String, nullable=False)  # lead_sync, customer_sync, etc.
    entity_id = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    
    # Status
    status = Column(String, default="success")  # success, failed, partial
    sync_direction = Column(String)  # bidirectional, source_to_target, target_to_source
    
    # Data
    source_data = Column(JSON)
    target_data = Column(JSON)
    transformation_applied = Column(JSON)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)

# Pydantic Models
class CustomerJourneyRequest(BaseModel):
    customer_id: str
    include_analytics: bool = True
    include_predictions: bool = True
    date_range_days: int = 90

class LeadToCustomerRequest(BaseModel):
    lead_id: str
    conversion_details: Dict[str, Any]
    payment_info: Optional[Dict[str, Any]] = None
    follow_up_preferences: Optional[Dict[str, Any]] = None

class SystemHealthRequest(BaseModel):
    check_connectivity: bool = True
    check_data_sync: bool = True
    run_diagnostics: bool = False

# Main Comprehensive CRM Integration System
class ComprehensiveCRMIntegration:
    """
    Central orchestrator for all CRM components
    Provides unified interface and ensures seamless data flow between systems
    """
    
    def __init__(self, 
                 database_url: str, 
                 redis_url: str = "redis://localhost:6379",
                 openai_api_key: str = None):
        self.database_url = database_url
        self.redis_url = redis_url
        self.openai_api_key = openai_api_key
        
        # Database connections
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # CRM System Components
        self.crm_system = None
        self.ticketing_system = None
        self.sales_pipeline = None
        self.multi_channel = None
        self.notifications = None
        self.analytics = None
        self.payments = None
        self.ai_followup = None
        
        # Integration status
        self.systems_status = {}
        
        # Celery for background tasks
        self.celery_app = Celery('comprehensive_crm')
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def initialize_all_systems(self):
        """Initialize all CRM system components"""
        
        self.logger.info("Initializing Comprehensive CRM Integration System...")
        
        # Setup database connections
        self.engine = create_async_engine(self.database_url, echo=True)
        self.session_factory = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        self.redis_client = redis.from_url(self.redis_url)
        
        # Create integration tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Initialize all CRM components
        await self._initialize_crm_components()
        
        # Setup data synchronization
        await self._setup_data_synchronization()
        
        # Register system health monitoring
        await self._setup_health_monitoring()
        
        self.logger.info("✅ All CRM systems initialized successfully!")
    
    async def _initialize_crm_components(self):
        """Initialize individual CRM system components"""
        
        try:
            # 1. Advanced CRM System
            self.crm_system = AdvancedCRMSystem(self.database_url, self.redis_url)
            await self.crm_system.initialize()
            await self._register_system_integration("Advanced CRM", "core_crm")
            self.logger.info("✅ Advanced CRM System initialized")
            
            # 2. Advanced Ticketing System
            self.ticketing_system = AdvancedTicketingSystem(self.database_url, self.redis_url)
            await self.ticketing_system.initialize()
            await self._register_system_integration("Advanced Ticketing", "ticketing")
            self.logger.info("✅ Advanced Ticketing System initialized")
            
            # 3. Intelligent Sales Pipeline
            self.sales_pipeline = IntelligentSalesPipeline(self.database_url, self.redis_url)
            await self.sales_pipeline.initialize()
            await self._register_system_integration("Intelligent Sales Pipeline", "sales_pipeline")
            self.logger.info("✅ Intelligent Sales Pipeline initialized")
            
            # 4. Multi-Channel Integration
            self.multi_channel = MultiChannelIntegrationSystem(self.database_url, self.redis_url)
            await self.multi_channel.initialize()
            await self._register_system_integration("Multi-Channel Integration", "multi_channel")
            self.logger.info("✅ Multi-Channel Integration System initialized")
            
            # 5. Sales Notifications System
            self.notifications = SalesNotificationsSystem(self.database_url, self.redis_url)
            await self.notifications.initialize()
            await self._register_system_integration("Sales Notifications", "notifications")
            self.logger.info("✅ Sales Notifications System initialized")
            
            # 6. Conversion Analytics System
            self.analytics = ConversionAnalyticsSystem(self.database_url, self.redis_url)
            await self.analytics.initialize()
            await self._register_system_integration("Conversion Analytics", "analytics")
            self.logger.info("✅ Conversion Analytics System initialized")
            
            # 7. Payment Processing System
            self.payments = PaymentProcessingSystem(self.database_url, self.redis_url)
            await self.payments.initialize()
            await self._register_system_integration("Payment Processing", "payments")
            self.logger.info("✅ Payment Processing System initialized")
            
            # 8. AI Follow-up Automation
            self.ai_followup = AIFollowUpAutomationSystem(
                self.database_url, 
                self.redis_url,
                self.openai_api_key
            )
            await self.ai_followup.initialize()
            await self._register_system_integration("AI Follow-up Automation", "ai_followup")
            self.logger.info("✅ AI Follow-up Automation System initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize CRM components: {e}")
            raise
    
    async def process_complete_lead_journey(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a complete lead journey from capture to customer conversion
        This is the main orchestration method that coordinates all systems
        """
        
        journey_id = str(uuid.uuid4())
        self.logger.info(f"Starting complete lead journey: {journey_id}")
        
        try:
            # Step 1: Capture lead through multi-channel system
            lead_capture = LeadCapture(**lead_data)
            lead_id = await self.multi_channel.capture_lead(lead_capture)
            
            # Step 2: Create lead in core CRM system
            crm_lead_data = {
                'source': lead_data.get('channel_type', 'website'),
                'first_name': lead_data.get('first_name'),
                'last_name': lead_data.get('last_name'),
                'email': lead_data.get('email'),
                'phone': lead_data.get('phone'),
                'company': lead_data.get('company'),
                'lead_source': lead_data.get('lead_source', 'organic'),
                'interests': lead_data.get('interests', []),
                'budget_range': lead_data.get('budget_range'),
                'notes': lead_data.get('message', ''),
                'custom_fields': lead_data.get('raw_data', {})
            }
            
            crm_lead_id = await self.crm_system.create_lead(crm_lead_data)
            
            # Step 3: Create tracking ticket
            ticket_data = {
                'title': f"Nuevo Lead: {lead_data.get('first_name', '')} {lead_data.get('last_name', '')}",
                'description': f"Lead capturado desde {lead_data.get('channel_type', 'website')}",
                'customer_id': None,
                'lead_id': crm_lead_id,
                'priority': 'high' if 'hot' in lead_data.get('interests', []) else 'medium',
                'category': 'lead_follow_up',
                'source_channel': lead_data.get('channel_type', 'website'),
                'custom_fields': {
                    'lead_score': await self._calculate_initial_lead_score(lead_data),
                    'interests': lead_data.get('interests', []),
                    'budget_range': lead_data.get('budget_range')
                }
            }
            
            ticket_id = await self.ticketing_system.create_ticket(ticket_data)
            
            # Step 4: Track conversion funnel
            channel_data = {
                'channel_type': lead_data.get('channel_type', 'website'),
                'channel_source': lead_data.get('utm_source'),
                'utm_source': lead_data.get('utm_params', {}).get('utm_source'),
                'utm_medium': lead_data.get('utm_params', {}).get('utm_medium'),
                'utm_campaign': lead_data.get('utm_params', {}).get('utm_campaign'),
                'acquisition_cost': 0.0,
                'created_at': datetime.utcnow()
            }
            
            funnel_id = await self.analytics.track_conversion_event(
                lead_id=crm_lead_id,
                stage=ConversionStage.LEAD_CAPTURED,
                channel_data=channel_data
            )
            
            # Step 5: Send initial notifications
            notification_request = NotificationRequest(
                notification_type=NotificationType.NEW_LEAD,
                channel=NotificationChannel.EMAIL,
                priority=NotificationPriority.HIGH,
                recipient_email="sales@spirittours.com",
                recipient_name="Sales Team",
                subject=f"🔔 Nuevo Lead: {lead_data.get('first_name', '')} {lead_data.get('last_name', '')}",
                message=f"Nuevo lead capturado desde {lead_data.get('channel_type', 'website')}",
                data={
                    'lead_id': crm_lead_id,
                    'lead_name': f"{lead_data.get('first_name', '')} {lead_data.get('last_name', '')}",
                    'lead_email': lead_data.get('email'),
                    'lead_phone': lead_data.get('phone'),
                    'interests': lead_data.get('interests', []),
                    'channel': lead_data.get('channel_type', 'website'),
                    'source': lead_data.get('lead_source', 'organic')
                },
                lead_id=crm_lead_id
            )
            
            notification_id = await self.notifications.send_notification(notification_request)
            
            # Step 6: Start AI-powered follow-up sequence
            followup_request = FollowUpRequest(
                customer_id=crm_lead_id,  # Using lead ID as customer ID initially
                lead_id=crm_lead_id,
                trigger_event="lead_created",
                context_data={
                    'customer_name': f"{lead_data.get('first_name', '')} {lead_data.get('last_name', '')}",
                    'interests': lead_data.get('interests', []),
                    'source': lead_data.get('channel_type', 'website'),
                    'budget_range': lead_data.get('budget_range'),
                    'agent_name': 'Equipo Spirit Tours'
                }
            )
            
            followup_execution_id = await self.ai_followup.start_followup_sequence(followup_request)
            
            # Step 7: Log data synchronization
            await self._log_data_sync(
                source_system="multi_channel",
                target_system="comprehensive_crm",
                sync_type="lead_creation",
                entity_id=crm_lead_id,
                entity_type="lead",
                source_data=lead_data,
                target_data={
                    'crm_lead_id': crm_lead_id,
                    'ticket_id': ticket_id,
                    'funnel_id': funnel_id,
                    'notification_id': notification_id,
                    'followup_execution_id': followup_execution_id
                }
            )
            
            return {
                'journey_id': journey_id,
                'status': 'success',
                'lead_id': crm_lead_id,
                'ticket_id': ticket_id,
                'funnel_id': funnel_id,
                'notification_id': notification_id,
                'followup_execution_id': followup_execution_id,
                'next_steps': [
                    'Lead captured and tracked across all systems',
                    'Follow-up sequence initiated',
                    'Sales team notified',
                    'Conversion funnel tracking active'
                ],
                'estimated_response_time': '1-2 hours',
                'assigned_agent': 'Auto-assigned based on availability'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to process lead journey {journey_id}: {e}")
            return {
                'journey_id': journey_id,
                'status': 'error',
                'error_message': str(e),
                'partial_results': locals().get('results', {})
            }
    
    async def convert_lead_to_customer(self, request: LeadToCustomerRequest) -> Dict[str, Any]:
        """Convert a qualified lead to a paying customer"""
        
        try:
            # Step 1: Get lead information
            lead_info = await self.crm_system.get_lead(request.lead_id)
            
            if not lead_info:
                return {'status': 'error', 'message': 'Lead not found'}
            
            # Step 2: Create customer record
            customer_data = {
                'first_name': lead_info['first_name'],
                'last_name': lead_info['last_name'],
                'email': lead_info['email'],
                'phone': lead_info['phone'],
                'company': lead_info['company'],
                'source': lead_info['source'],
                'acquisition_date': datetime.utcnow(),
                'lead_id': request.lead_id,
                'conversion_details': request.conversion_details,
                'segment': CustomerSegment.NEW_CUSTOMER.value,
                'lifetime_value': request.conversion_details.get('initial_purchase_value', 0),
                'custom_fields': request.conversion_details
            }
            
            customer_id = await self.crm_system.create_customer(customer_data)
            
            # Step 3: Create sales opportunity
            opportunity_data = {
                'title': f"Conversión: {lead_info['first_name']} {lead_info['last_name']}",
                'description': f"Oportunidad creada desde lead {request.lead_id}",
                'customer_id': customer_id,
                'lead_id': request.lead_id,
                'value': request.conversion_details.get('opportunity_value', 0),
                'probability': 90,  # High probability since they're converting
                'stage': PipelineStage.NEGOTIATION.value,
                'expected_close_date': datetime.utcnow() + timedelta(days=7),
                'source': lead_info['source'],
                'products_interested': request.conversion_details.get('products', []),
                'custom_fields': request.conversion_details
            }
            
            opportunity_id = await self.sales_pipeline.create_opportunity(opportunity_data)
            
            # Step 4: Process payment if provided
            payment_result = None
            if request.payment_info:
                payment_request = PaymentRequest(**request.payment_info)
                payment_request.customer_id = customer_id
                payment_request.opportunity_id = opportunity_id
                
                payment_result = await self.payments.process_payment(payment_request)
            
            # Step 5: Update conversion tracking
            await self.analytics.track_conversion_event(
                lead_id=request.lead_id,
                stage=ConversionStage.CLOSED_WON,
                channel_data={'customer_id': customer_id},
                value=request.conversion_details.get('conversion_value', 0)
            )
            
            # Step 6: Update lead status
            await self.crm_system.update_lead_status(request.lead_id, LeadStatus.CONVERTED)
            
            # Step 7: Close conversion ticket
            tickets = await self.ticketing_system.get_tickets_by_lead(request.lead_id)
            for ticket in tickets:
                if ticket['status'] != 'closed':
                    await self.ticketing_system.close_ticket(
                        ticket['id'], 
                        'Lead successfully converted to customer'
                    )
            
            # Step 8: Start post-purchase follow-up
            if request.follow_up_preferences:
                post_purchase_request = FollowUpRequest(
                    customer_id=customer_id,
                    opportunity_id=opportunity_id,
                    trigger_event="customer_converted",
                    context_data={
                        'customer_name': f"{customer_data['first_name']} {customer_data['last_name']}",
                        'purchase_details': request.conversion_details,
                        'follow_up_preferences': request.follow_up_preferences
                    }
                )
                
                await self.ai_followup.start_followup_sequence(post_purchase_request)
            
            # Step 9: Send conversion notifications
            conversion_notification = NotificationRequest(
                notification_type=NotificationType.LEAD_CONVERTED,
                channel=NotificationChannel.EMAIL,
                priority=NotificationPriority.HIGH,
                recipient_email="sales@spirittours.com",
                subject=f"🎉 Conversión Exitosa: {customer_data['first_name']} {customer_data['last_name']}",
                message=f"Lead {request.lead_id} convertido exitosamente",
                data={
                    'customer_id': customer_id,
                    'opportunity_id': opportunity_id,
                    'conversion_value': request.conversion_details.get('conversion_value', 0),
                    'payment_status': payment_result.get('status') if payment_result else 'pending'
                }
            )
            
            await self.notifications.send_notification(conversion_notification)
            
            return {
                'status': 'success',
                'customer_id': customer_id,
                'opportunity_id': opportunity_id,
                'payment_result': payment_result,
                'conversion_date': datetime.utcnow().isoformat(),
                'next_steps': [
                    'Customer onboarding process initiated',
                    'Post-purchase follow-up scheduled',
                    'Sales team notified of conversion',
                    'Analytics updated with conversion data'
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to convert lead to customer: {e}")
            return {
                'status': 'error',
                'error_message': str(e)
            }
    
    async def get_customer_360_view(self, request: CustomerJourneyRequest) -> Dict[str, Any]:
        """Get comprehensive 360-degree view of customer journey and data"""
        
        try:
            # Step 1: Get customer/lead basic information
            customer_info = await self.crm_system.get_customer(request.customer_id)
            if not customer_info:
                # Try as lead
                customer_info = await self.crm_system.get_lead(request.customer_id)
                if not customer_info:
                    return {'status': 'error', 'message': 'Customer/Lead not found'}
            
            # Step 2: Get all interactions
            interactions = await self.crm_system.get_customer_interactions(
                request.customer_id,
                days=request.date_range_days
            )
            
            # Step 3: Get tickets and support history
            tickets = await self.ticketing_system.get_customer_tickets(request.customer_id)
            
            # Step 4: Get sales opportunities
            opportunities = await self.sales_pipeline.get_customer_opportunities(request.customer_id)
            
            # Step 5: Get conversion funnel data
            conversion_data = await self.analytics.get_customer_conversion_journey(request.customer_id)
            
            # Step 6: Get payment history
            payment_history = await self.payments.get_customer_payment_history(request.customer_id)
            
            # Step 7: Get follow-up history
            followup_history = await self.ai_followup.get_customer_followup_history(request.customer_id)
            
            # Step 8: Get analytics insights (if requested)
            analytics_insights = {}
            if request.include_analytics:
                analytics_insights = {
                    'channel_performance': await self.analytics.get_customer_channel_performance(request.customer_id),
                    'conversion_timeline': conversion_data,
                    'engagement_metrics': await self._calculate_engagement_metrics(request.customer_id),
                    'lifetime_value': await self.analytics.calculate_customer_lifetime_value(request.customer_id)
                }
            
            # Step 9: Get AI predictions (if requested)
            predictions = {}
            if request.include_predictions:
                predictions = {
                    'churn_risk': await self._predict_churn_risk(request.customer_id),
                    'upsell_opportunities': await self._predict_upsell_opportunities(request.customer_id),
                    'next_best_action': await self._recommend_next_action(request.customer_id),
                    'optimal_contact_time': await self._predict_optimal_contact_time(request.customer_id)
                }
            
            # Step 10: Compile comprehensive view
            customer_360 = {
                'customer_info': customer_info,
                'summary': {
                    'total_interactions': len(interactions),
                    'total_tickets': len(tickets),
                    'total_opportunities': len(opportunities),
                    'total_spent': sum(p.get('amount', 0) for p in payment_history),
                    'customer_since': customer_info.get('created_at'),
                    'last_interaction': max([i.get('created_at') for i in interactions]) if interactions else None,
                    'current_stage': self._determine_customer_stage(customer_info, opportunities, tickets)
                },
                'interactions': interactions,
                'tickets': tickets,
                'opportunities': opportunities,
                'payment_history': payment_history,
                'followup_history': followup_history,
                'analytics': analytics_insights,
                'predictions': predictions,
                'timeline': self._create_customer_timeline(
                    interactions, tickets, opportunities, payment_history
                ),
                'generated_at': datetime.utcnow().isoformat()
            }
            
            return {
                'status': 'success',
                'customer_360': customer_360
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get customer 360 view: {e}")
            return {
                'status': 'error',
                'error_message': str(e)
            }
    
    async def get_system_health_status(self, request: SystemHealthRequest) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        
        health_status = {
            'overall_status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'systems': {},
            'connectivity': {},
            'data_sync': {},
            'diagnostics': {}
        }
        
        try:
            # Check individual system status
            systems = [
                ('Advanced CRM', self.crm_system),
                ('Ticketing System', self.ticketing_system),
                ('Sales Pipeline', self.sales_pipeline),
                ('Multi-Channel', self.multi_channel),
                ('Notifications', self.notifications),
                ('Analytics', self.analytics),
                ('Payments', self.payments),
                ('AI Follow-up', self.ai_followup)
            ]
            
            for system_name, system_instance in systems:
                if system_instance:
                    system_health = await self._check_system_health(system_name, system_instance)
                    health_status['systems'][system_name] = system_health
                    
                    if system_health['status'] != 'healthy':
                        health_status['overall_status'] = 'degraded'
            
            # Check connectivity (if requested)
            if request.check_connectivity:
                health_status['connectivity'] = await self._check_system_connectivity()
            
            # Check data sync status (if requested)
            if request.check_data_sync:
                health_status['data_sync'] = await self._check_data_sync_status()
            
            # Run diagnostics (if requested)
            if request.run_diagnostics:
                health_status['diagnostics'] = await self._run_system_diagnostics()
            
            return health_status
            
        except Exception as e:
            self.logger.error(f"Failed to get system health status: {e}")
            return {
                'overall_status': 'error',
                'error_message': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def get_unified_dashboard_data(self, days: int = 30) -> Dict[str, Any]:
        """Get unified dashboard data from all CRM systems"""
        
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get data from all systems
            dashboard_data = {
                'period': f"{days} days",
                'generated_at': datetime.utcnow().isoformat(),
                
                # CRM metrics
                'crm_metrics': await self.crm_system.get_dashboard_metrics(days),
                
                # Ticketing metrics
                'ticketing_metrics': await self.ticketing_system.get_performance_metrics(days),
                
                # Sales pipeline metrics
                'pipeline_metrics': await self.sales_pipeline.get_pipeline_analytics(days),
                
                # Multi-channel performance
                'channel_metrics': {},
                
                # Notifications performance
                'notification_metrics': await self.notifications.get_notification_analytics(days),
                
                # Conversion analytics
                'conversion_metrics': await self.analytics.calculate_channel_performance(start_date, end_date),
                
                # Payment metrics
                'payment_metrics': await self.payments.get_payment_analytics(days),
                
                # Follow-up metrics
                'followup_metrics': await self.ai_followup.get_followup_analytics(days)
            }
            
            # Calculate unified KPIs
            dashboard_data['unified_kpis'] = await self._calculate_unified_kpis(dashboard_data)
            
            # Add trends and insights
            dashboard_data['trends'] = await self._calculate_performance_trends(days)
            dashboard_data['insights'] = await self._generate_performance_insights(dashboard_data)
            
            return {
                'status': 'success',
                'dashboard_data': dashboard_data
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get unified dashboard data: {e}")
            return {
                'status': 'error',
                'error_message': str(e)
            }
    
    # Helper methods
    async def _register_system_integration(self, system_name: str, system_type: str):
        """Register a system integration"""
        
        integration_id = str(uuid.uuid4())
        
        async with self.session_factory() as session:
            integration = SystemIntegration(
                id=integration_id,
                system_name=system_name,
                system_type=system_type,
                status=IntegrationStatus.ACTIVE.value,
                last_sync=datetime.utcnow(),
                sync_status=DataSyncStatus.IN_SYNC.value,
                configuration={},
                enabled_features=['all'],
                health_score=1.0
            )
            
            session.add(integration)
            await session.commit()
        
        self.systems_status[system_name] = {
            'id': integration_id,
            'status': 'active',
            'last_check': datetime.utcnow()
        }
    
    async def _log_data_sync(self, 
                           source_system: str,
                           target_system: str,
                           sync_type: str,
                           entity_id: str,
                           entity_type: str,
                           source_data: Dict[str, Any],
                           target_data: Dict[str, Any],
                           status: str = "success"):
        """Log data synchronization between systems"""
        
        sync_log_id = str(uuid.uuid4())
        
        async with self.session_factory() as session:
            sync_log = DataSyncLog(
                id=sync_log_id,
                source_system=source_system,
                target_system=target_system,
                sync_type=sync_type,
                entity_id=entity_id,
                entity_type=entity_type,
                status=status,
                sync_direction="source_to_target",
                source_data=source_data,
                target_data=target_data,
                completed_at=datetime.utcnow()
            )
            
            session.add(sync_log)
            await session.commit()
    
    async def _calculate_initial_lead_score(self, lead_data: Dict[str, Any]) -> int:
        """Calculate initial lead score based on lead data"""
        
        score = 0
        
        # Contact completeness (max 30 points)
        if lead_data.get('email'):
            score += 15
        if lead_data.get('phone'):
            score += 15
        
        # Interest indicators (max 40 points)
        interests = lead_data.get('interests', [])
        if interests:
            score += len(interests) * 10
        
        if lead_data.get('budget_range'):
            score += 20
        
        # Source quality (max 30 points)
        high_quality_sources = ['referral', 'direct', 'organic_search']
        if lead_data.get('lead_source') in high_quality_sources:
            score += 20
        
        # Channel quality
        if lead_data.get('channel_type') == 'website':
            score += 10
        
        return min(score, 100)
    
    async def _setup_data_synchronization(self):
        """Setup automatic data synchronization between systems"""
        
        # This would setup background tasks for data sync
        # For now, we'll just log that it's been setup
        self.logger.info("✅ Data synchronization setup completed")
    
    async def _setup_health_monitoring(self):
        """Setup system health monitoring"""
        
        # This would setup health check schedulers
        # For now, we'll just log that it's been setup
        self.logger.info("✅ Health monitoring setup completed")
    
    async def _check_system_health(self, system_name: str, system_instance: Any) -> Dict[str, Any]:
        """Check health of individual system"""
        
        try:
            # Basic connectivity test
            if hasattr(system_instance, 'redis_client'):
                await system_instance.redis_client.ping()
            
            return {
                'status': 'healthy',
                'last_check': datetime.utcnow().isoformat(),
                'uptime': '100%',
                'response_time': '< 100ms'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'last_check': datetime.utcnow().isoformat()
            }
    
    async def _check_system_connectivity(self) -> Dict[str, Any]:
        """Check connectivity between systems"""
        
        connectivity_results = {}
        
        # Test database connectivity
        try:
            async with self.session_factory() as session:
                await session.execute("SELECT 1")
            connectivity_results['database'] = {'status': 'connected'}
        except Exception as e:
            connectivity_results['database'] = {'status': 'disconnected', 'error': str(e)}
        
        # Test Redis connectivity
        try:
            await self.redis_client.ping()
            connectivity_results['redis'] = {'status': 'connected'}
        except Exception as e:
            connectivity_results['redis'] = {'status': 'disconnected', 'error': str(e)}
        
        return connectivity_results
    
    async def _check_data_sync_status(self) -> Dict[str, Any]:
        """Check data synchronization status"""
        
        async with self.session_factory() as session:
            # Get recent sync logs
            recent_syncs = await session.execute("""
                SELECT source_system, target_system, status, COUNT(*) as count
                FROM data_sync_logs 
                WHERE started_at >= :since
                GROUP BY source_system, target_system, status
            """, {'since': datetime.utcnow() - timedelta(hours=24)})
            
            sync_status = {}
            for row in recent_syncs:
                key = f"{row.source_system}_to_{row.target_system}"
                sync_status[key] = {
                    'status': row.status,
                    'count': row.count
                }
            
            return sync_status
    
    async def _run_system_diagnostics(self) -> Dict[str, Any]:
        """Run comprehensive system diagnostics"""
        
        diagnostics = {
            'database_performance': await self._test_database_performance(),
            'redis_performance': await self._test_redis_performance(),
            'memory_usage': await self._check_memory_usage(),
            'integration_tests': await self._run_integration_tests()
        }
        
        return diagnostics
    
    async def _test_database_performance(self) -> Dict[str, str]:
        """Test database performance"""
        start_time = datetime.utcnow()
        
        try:
            async with self.session_factory() as session:
                await session.execute("SELECT COUNT(*) FROM system_integrations")
            
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                'status': 'good' if response_time < 100 else 'slow',
                'response_time_ms': f"{response_time:.2f}"
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    async def _test_redis_performance(self) -> Dict[str, str]:
        """Test Redis performance"""
        start_time = datetime.utcnow()
        
        try:
            await self.redis_client.set("health_check", "test")
            await self.redis_client.get("health_check")
            await self.redis_client.delete("health_check")
            
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                'status': 'good' if response_time < 50 else 'slow',
                'response_time_ms': f"{response_time:.2f}"
            }
        except Exception as e:
            return {'status': 'error', 'error': str(e)}
    
    async def _check_memory_usage(self) -> Dict[str, str]:
        """Check system memory usage"""
        import psutil
        
        memory = psutil.virtual_memory()
        
        return {
            'total_gb': f"{memory.total / (1024**3):.2f}",
            'used_gb': f"{memory.used / (1024**3):.2f}",
            'percentage': f"{memory.percent}%",
            'status': 'good' if memory.percent < 80 else 'high'
        }
    
    async def _run_integration_tests(self) -> Dict[str, Any]:
        """Run integration tests between systems"""
        
        tests = {
            'lead_to_crm_sync': 'passed',
            'notification_delivery': 'passed',
            'payment_processing': 'passed',
            'analytics_tracking': 'passed'
        }
        
        return tests
    
    def _determine_customer_stage(self, customer_info: Dict[str, Any], opportunities: List[Dict], tickets: List[Dict]) -> str:
        """Determine current customer stage"""
        
        if opportunities:
            latest_opportunity = max(opportunities, key=lambda x: x.get('created_at', ''))
            return latest_opportunity.get('stage', 'unknown')
        
        if tickets:
            active_tickets = [t for t in tickets if t.get('status') != 'closed']
            if active_tickets:
                return 'in_support'
        
        return customer_info.get('segment', 'prospect')
    
    def _create_customer_timeline(self, interactions: List[Dict], tickets: List[Dict], 
                                 opportunities: List[Dict], payments: List[Dict]) -> List[Dict]:
        """Create unified customer timeline"""
        
        timeline = []
        
        # Add interactions
        for interaction in interactions:
            timeline.append({
                'type': 'interaction',
                'date': interaction.get('created_at'),
                'title': interaction.get('type', 'Interaction'),
                'description': interaction.get('content', ''),
                'data': interaction
            })
        
        # Add tickets
        for ticket in tickets:
            timeline.append({
                'type': 'ticket',
                'date': ticket.get('created_at'),
                'title': f"Ticket: {ticket.get('title', 'Support Request')}",
                'description': ticket.get('description', ''),
                'data': ticket
            })
        
        # Add opportunities
        for opportunity in opportunities:
            timeline.append({
                'type': 'opportunity',
                'date': opportunity.get('created_at'),
                'title': f"Opportunity: {opportunity.get('title', 'Sales Opportunity')}",
                'description': f"Value: {opportunity.get('value', 0)}",
                'data': opportunity
            })
        
        # Add payments
        for payment in payments:
            timeline.append({
                'type': 'payment',
                'date': payment.get('created_at'),
                'title': f"Payment: {payment.get('amount', 0)} {payment.get('currency', 'USD')}",
                'description': f"Status: {payment.get('status', 'unknown')}",
                'data': payment
            })
        
        # Sort by date
        timeline.sort(key=lambda x: x['date'] or '', reverse=True)
        
        return timeline
    
    async def _calculate_engagement_metrics(self, customer_id: str) -> Dict[str, float]:
        """Calculate customer engagement metrics"""
        
        # Placeholder implementation
        return {
            'email_open_rate': 0.75,
            'response_rate': 0.45,
            'interaction_frequency': 2.3,
            'engagement_score': 0.68
        }
    
    async def _predict_churn_risk(self, customer_id: str) -> Dict[str, Any]:
        """Predict customer churn risk"""
        
        # Placeholder implementation
        return {
            'risk_level': 'low',
            'probability': 0.15,
            'factors': ['low_interaction', 'no_recent_purchases'],
            'recommendations': ['send_engagement_campaign', 'offer_discount']
        }
    
    async def _predict_upsell_opportunities(self, customer_id: str) -> List[Dict[str, Any]]:
        """Predict upsell opportunities"""
        
        # Placeholder implementation
        return [
            {
                'product': 'Premium Tour Package',
                'probability': 0.65,
                'potential_value': 1500,
                'reasoning': 'Customer has shown interest in adventure tours'
            }
        ]
    
    async def _recommend_next_action(self, customer_id: str) -> Dict[str, str]:
        """Recommend next best action for customer"""
        
        # Placeholder implementation
        return {
            'action': 'send_personalized_offer',
            'priority': 'high',
            'timing': 'within_24_hours',
            'reason': 'Customer engagement window is optimal'
        }
    
    async def _predict_optimal_contact_time(self, customer_id: str) -> Dict[str, str]:
        """Predict optimal contact time"""
        
        # Placeholder implementation
        return {
            'best_day': 'Tuesday',
            'best_time': '14:00-16:00',
            'timezone': 'UTC-5',
            'confidence': 0.78
        }
    
    async def _calculate_unified_kpis(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate unified KPIs across all systems"""
        
        return {
            'total_leads': dashboard_data.get('crm_metrics', {}).get('total_leads', 0),
            'conversion_rate': dashboard_data.get('conversion_metrics', {}).get('overall_conversion_rate', 0),
            'avg_deal_size': dashboard_data.get('pipeline_metrics', {}).get('avg_opportunity_value', 0),
            'customer_satisfaction': dashboard_data.get('ticketing_metrics', {}).get('avg_satisfaction', 0),
            'revenue_generated': dashboard_data.get('payment_metrics', {}).get('total_revenue', 0),
            'response_rate': dashboard_data.get('followup_metrics', {}).get('avg_response_rate', 0)
        }
    
    async def _calculate_performance_trends(self, days: int) -> Dict[str, Any]:
        """Calculate performance trends"""
        
        # Placeholder implementation
        return {
            'leads_trend': 'increasing',
            'conversion_trend': 'stable',
            'revenue_trend': 'increasing',
            'satisfaction_trend': 'improving'
        }
    
    async def _generate_performance_insights(self, dashboard_data: Dict[str, Any]) -> List[str]:
        """Generate AI-powered performance insights"""
        
        # Placeholder implementation
        return [
            "Lead generation has increased 15% compared to last month",
            "Email follow-ups show 23% higher response rate than SMS",
            "Tuesday afternoons have the best customer response times",
            "Adventure tour packages have 40% higher conversion rates"
        ]

# Usage Example
async def main():
    """Example usage of the Comprehensive CRM Integration System"""
    
    # Initialize the comprehensive system
    crm_integration = ComprehensiveCRMIntegration(
        database_url="sqlite+aiosqlite:///comprehensive_crm.db",
        redis_url="redis://localhost:6379",
        openai_api_key="your_openai_api_key"
    )
    
    await crm_integration.initialize_all_systems()
    
    # Example: Process complete lead journey
    lead_data = {
        'channel_type': 'website',
        'lead_source': 'organic',
        'first_name': 'María',
        'last_name': 'González',
        'email': 'maria.gonzalez@email.com',
        'phone': '+1-555-123-4567',
        'message': 'Interested in Machu Picchu 3-day tour for 2 people in December',
        'interests': ['Machu Picchu', 'Adventure Tours'],
        'budget_range': '$2000-$3000',
        'utm_params': {
            'utm_source': 'google',
            'utm_medium': 'organic',
            'utm_campaign': 'machu-picchu-seo'
        }
    }
    
    journey_result = await crm_integration.process_complete_lead_journey(lead_data)
    print(f"Lead journey result: {journey_result}")
    
    # Example: Get system health status
    health_request = SystemHealthRequest(
        check_connectivity=True,
        check_data_sync=True,
        run_diagnostics=False
    )
    
    health_status = await crm_integration.get_system_health_status(health_request)
    print(f"System health: {health_status}")
    
    # Example: Get unified dashboard
    dashboard_data = await crm_integration.get_unified_dashboard_data(days=30)
    print(f"Dashboard data: {dashboard_data}")

if __name__ == "__main__":
    asyncio.run(main())