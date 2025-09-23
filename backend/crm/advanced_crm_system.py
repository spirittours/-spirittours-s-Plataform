#!/usr/bin/env python3
"""
🎯 Sistema CRM Avanzado para Spirit Tours
Sistema completo de gestión de clientes, leads y ventas con integración multi-canal,
automatización de procesos y analytics avanzados.

Features:
- Lead Management Multi-Canal (Web, Social Media, Database, PBX)
- Customer Journey Tracking completo
- Segmentación inteligente de clientes
- Scoring automático de leads
- Integración con agentes IA y humanos
- Analytics de conversión y ROI
- Automatización de follow-ups
- Gestión de pipeline de ventas
"""

import asyncio
import logging
import json
import time
from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, deque
import uuid
import hashlib
import threading
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
import pandas as pd
import numpy as np

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

class LeadSource(Enum):
    """Fuentes de leads"""
    WEBSITE_DIRECT = "website_direct"
    SOCIAL_MEDIA_FACEBOOK = "social_facebook"
    SOCIAL_MEDIA_INSTAGRAM = "social_instagram"
    SOCIAL_MEDIA_TWITTER = "social_twitter"
    SOCIAL_MEDIA_TIKTOK = "social_tiktok"
    GOOGLE_ADS = "google_ads"
    DATABASE_EXISTING = "database_existing"
    PHONE_INBOUND = "phone_inbound"
    PHONE_OUTBOUND = "phone_outbound"
    EMAIL_MARKETING = "email_marketing"
    REFERRAL = "referral"
    ORGANIC_SEARCH = "organic_search"
    OTHER = "other"

class LeadStatus(Enum):
    """Estados de leads"""
    NEW = "new"                    # Lead nuevo sin contactar
    CONTACTED = "contacted"        # Primer contacto realizado
    QUALIFIED = "qualified"        # Lead calificado con potencial
    PROPOSAL_SENT = "proposal_sent" # Propuesta enviada
    NEGOTIATING = "negotiating"    # En negociación
    CLOSED_WON = "closed_won"      # Venta cerrada exitosa
    CLOSED_LOST = "closed_lost"    # Venta perdida
    NURTURING = "nurturing"        # En proceso de nurturing
    UNQUALIFIED = "unqualified"    # No calificado

class CustomerType(Enum):
    """Tipos de clientes"""
    B2C_INDIVIDUAL = "b2c_individual"
    B2C_FAMILY = "b2c_family"
    B2C_GROUP = "b2c_group"
    B2B_CORPORATE = "b2b_corporate"
    B2B_TRAVEL_AGENCY = "b2b_travel_agency"
    B2B_HOTEL = "b2b_hotel"

class InteractionType(Enum):
    """Tipos de interacciones"""
    PHONE_CALL = "phone_call"
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    WEBSITE_CHAT = "website_chat"
    SOCIAL_MEDIA = "social_media"
    IN_PERSON = "in_person"
    VIDEO_CALL = "video_call"
    AI_CONVERSATION = "ai_conversation"

class Priority(Enum):
    """Niveles de prioridad"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    HOT = "hot"

# Modelos de Base de Datos
class Lead(Base):
    """Modelo de Lead"""
    __tablename__ = 'leads'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Información básica
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    company = Column(String(200))
    
    # Clasificación
    source = Column(String(50), nullable=False)  # LeadSource
    status = Column(String(50), default=LeadStatus.NEW.value)
    customer_type = Column(String(50), default=CustomerType.B2C_INDIVIDUAL.value)
    priority = Column(String(20), default=Priority.MEDIUM.value)
    
    # Scoring y analytics
    lead_score = Column(Float, default=0.0)
    conversion_probability = Column(Float, default=0.0)
    estimated_value = Column(Float, default=0.0)
    
    # Información adicional
    location_country = Column(String(100))
    location_city = Column(String(100))
    preferred_language = Column(String(10), default='es')
    time_zone = Column(String(50))
    
    # Intereses y preferencias
    interests = Column(JSON)  # Lista de intereses
    tour_preferences = Column(JSON)  # Preferencias de tours
    budget_range = Column(String(50))
    travel_dates_flexible = Column(Boolean, default=True)
    
    # Tracking
    utm_source = Column(String(100))
    utm_medium = Column(String(100))
    utm_campaign = Column(String(100))
    referrer_url = Column(Text)
    landing_page = Column(Text)
    
    # Asignación
    assigned_agent_id = Column(String(100))  # ID del agente asignado
    assigned_agent_type = Column(String(20))  # 'human' o 'ai'
    
    # Relaciones
    interactions = relationship("Interaction", back_populates="lead", cascade="all, delete-orphan")
    tickets = relationship("Ticket", back_populates="lead", cascade="all, delete-orphan")

class Customer(Base):
    """Modelo de Cliente (Lead convertido)"""
    __tablename__ = 'customers'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey('leads.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Información extendida del cliente
    date_of_birth = Column(DateTime)
    passport_number = Column(String(50))
    emergency_contact = Column(JSON)
    dietary_restrictions = Column(JSON)
    medical_conditions = Column(JSON)
    
    # Historial de compras
    total_purchases = Column(Float, default=0.0)
    total_bookings = Column(Integer, default=0)
    average_booking_value = Column(Float, default=0.0)
    last_purchase_date = Column(DateTime)
    
    # Loyalty y segmentación
    loyalty_level = Column(String(20), default='bronze')  # bronze, silver, gold, platinum
    customer_lifetime_value = Column(Float, default=0.0)
    churn_risk_score = Column(Float, default=0.0)
    
    # Preferencias
    communication_preferences = Column(JSON)
    marketing_consent = Column(Boolean, default=True)
    
    # Relaciones
    bookings = relationship("Booking", back_populates="customer")
    reviews = relationship("Review", back_populates="customer")

class Interaction(Base):
    """Modelo de Interacciones con Leads/Clientes"""
    __tablename__ = 'interactions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Asociaciones
    lead_id = Column(UUID(as_uuid=True), ForeignKey('leads.id'))
    agent_id = Column(String(100))  # ID del agente (humano o IA)
    agent_type = Column(String(20))  # 'human' o 'ai'
    
    # Detalles de la interacción
    interaction_type = Column(String(50), nullable=False)
    subject = Column(String(200))
    content = Column(Text)
    direction = Column(String(20))  # 'inbound' o 'outbound'
    
    # Metadata
    duration_seconds = Column(Integer)
    sentiment_score = Column(Float)  # -1.0 a 1.0
    satisfaction_rating = Column(Integer)  # 1-10
    
    # Seguimiento
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(DateTime)
    follow_up_completed = Column(Boolean, default=False)
    
    # Resultados
    outcome = Column(String(100))
    next_steps = Column(Text)
    tags = Column(JSON)
    
    # Relaciones
    lead = relationship("Lead", back_populates="interactions")

class Ticket(Base):
    """Sistema de Ticketing para Seguimiento de Ventas"""
    __tablename__ = 'tickets'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String(20), unique=True, nullable=False)  # Ej: ST-2025-001234
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Asociaciones
    lead_id = Column(UUID(as_uuid=True), ForeignKey('leads.id'))
    assigned_agent_id = Column(String(100))
    assigned_team = Column(String(100))
    
    # Clasificación del ticket
    ticket_type = Column(String(50))  # 'sales', 'support', 'billing', etc.
    category = Column(String(100))
    subcategory = Column(String(100))
    priority = Column(String(20), default=Priority.MEDIUM.value)
    
    # Estado y progreso
    status = Column(String(50), default='open')
    stage = Column(String(50))  # Etapa específica del proceso de venta
    progress_percentage = Column(Float, default=0.0)
    
    # Contenido
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # SLA y tiempos
    sla_deadline = Column(DateTime)
    first_response_time = Column(Integer)  # Minutos
    resolution_time = Column(Integer)  # Minutos
    
    # Valor y potencial
    estimated_deal_value = Column(Float, default=0.0)
    probability = Column(Float, default=0.5)  # 0.0 - 1.0
    
    # Tracking de actividad
    last_activity = Column(DateTime, default=datetime.utcnow)
    activity_count = Column(Integer, default=0)
    
    # Metadata
    source_channel = Column(String(50))
    tags = Column(JSON)
    custom_fields = Column(JSON)
    
    # Relaciones
    lead = relationship("Lead", back_populates="tickets")
    activities = relationship("TicketActivity", back_populates="ticket", cascade="all, delete-orphan")

class TicketActivity(Base):
    """Actividades del Ticket"""
    __tablename__ = 'ticket_activities'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Detalles de la actividad
    activity_type = Column(String(50))  # 'comment', 'status_change', 'assignment', etc.
    description = Column(Text)
    agent_id = Column(String(100))
    agent_type = Column(String(20))
    
    # Cambios
    field_changed = Column(String(100))
    old_value = Column(String(500))
    new_value = Column(String(500))
    
    # Metadata
    is_public = Column(Boolean, default=True)
    time_spent_minutes = Column(Integer, default=0)
    
    # Relaciones
    ticket = relationship("Ticket", back_populates="activities")

@dataclass
class LeadScoringCriteria:
    """Criterios para scoring de leads"""
    demographic_score: float = 0.0
    behavioral_score: float = 0.0
    engagement_score: float = 0.0
    fit_score: float = 0.0
    urgency_score: float = 0.0
    total_score: float = 0.0

@dataclass
class ConversionAnalytics:
    """Analytics de conversión"""
    lead_source: str
    total_leads: int
    qualified_leads: int
    converted_leads: int
    conversion_rate: float
    average_deal_value: float
    total_revenue: float
    cost_per_lead: float
    roi: float

class AdvancedCRMSystem:
    """
    Sistema CRM Avanzado para Spirit Tours
    
    Características:
    - Lead management multi-canal
    - Scoring automático de leads
    - Pipeline de ventas automatizado
    - Sistema de ticketing integrado
    - Analytics de conversión
    - Automatización de procesos
    """
    
    def __init__(self, database_url: str = "sqlite:///spirit_tours_crm.db"):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Crear tablas
        Base.metadata.create_all(bind=self.engine)
        
        # Cache de datos
        self.lead_cache = {}
        self.analytics_cache = {}
        
        # Configuración de scoring
        self.scoring_weights = {
            'demographic': 0.2,
            'behavioral': 0.3,
            'engagement': 0.25,
            'fit': 0.15,
            'urgency': 0.1
        }
        
        # Callbacks para eventos
        self.event_callbacks = defaultdict(list)
        
        # Configuración de automatización
        self.automation_rules = []
        
        # Estado del sistema
        self.is_running = False

    async def initialize(self):
        """Inicializar sistema CRM"""
        try:
            logger.info("🎯 Initializing Advanced CRM System...")
            
            # Verificar conexión a base de datos
            with self.SessionLocal() as session:
                # Test query
                session.execute("SELECT 1")
            
            # Cargar configuraciones
            await self._load_scoring_configuration()
            await self._load_automation_rules()
            
            # Iniciar tareas de background
            asyncio.create_task(self._lead_scoring_processor())
            asyncio.create_task(self._automation_engine())
            asyncio.create_task(self._analytics_updater())
            
            self.is_running = True
            logger.info("✅ Advanced CRM System initialized successfully")
            
            return {
                "status": "initialized",
                "database_url": self.database_url.replace("://", "://***@") if "@" in self.database_url else self.database_url,
                "tables_created": len(Base.metadata.tables),
                "automation_rules": len(self.automation_rules)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize CRM system: {e}")
            raise

    async def create_lead(self, lead_data: Dict[str, Any]) -> str:
        """Crear nuevo lead"""
        try:
            with self.SessionLocal() as session:
                # Crear lead
                lead = Lead(
                    first_name=lead_data['first_name'],
                    last_name=lead_data.get('last_name', ''),
                    email=lead_data['email'],
                    phone=lead_data.get('phone'),
                    company=lead_data.get('company'),
                    source=lead_data['source'],
                    customer_type=lead_data.get('customer_type', CustomerType.B2C_INDIVIDUAL.value),
                    priority=lead_data.get('priority', Priority.MEDIUM.value),
                    location_country=lead_data.get('location_country'),
                    location_city=lead_data.get('location_city'),
                    preferred_language=lead_data.get('preferred_language', 'es'),
                    interests=lead_data.get('interests', []),
                    tour_preferences=lead_data.get('tour_preferences', {}),
                    budget_range=lead_data.get('budget_range'),
                    utm_source=lead_data.get('utm_source'),
                    utm_medium=lead_data.get('utm_medium'),
                    utm_campaign=lead_data.get('utm_campaign'),
                    referrer_url=lead_data.get('referrer_url'),
                    landing_page=lead_data.get('landing_page')
                )
                
                session.add(lead)
                session.commit()
                session.refresh(lead)
                
                lead_id = str(lead.id)
            
            # Calcular lead score inicial
            await self._calculate_lead_score(lead_id)
            
            # Asignar agente automáticamente
            await self._auto_assign_agent(lead_id)
            
            # Crear ticket inicial
            ticket_id = await self._create_initial_ticket(lead_id)
            
            # Disparar eventos
            await self._trigger_event('lead_created', {
                'lead_id': lead_id,
                'ticket_id': ticket_id,
                'source': lead_data['source'],
                'priority': lead_data.get('priority', Priority.MEDIUM.value)
            })
            
            logger.info(f"✅ Lead created: {lead_id} from {lead_data['source']}")
            
            return lead_id
            
        except Exception as e:
            logger.error(f"❌ Failed to create lead: {e}")
            raise

    async def update_lead_status(self, lead_id: str, new_status: LeadStatus, 
                               agent_id: str = None, notes: str = None) -> bool:
        """Actualizar estado del lead"""
        try:
            with self.SessionLocal() as session:
                lead = session.query(Lead).filter(Lead.id == lead_id).first()
                
                if not lead:
                    raise ValueError(f"Lead {lead_id} not found")
                
                old_status = lead.status
                lead.status = new_status.value
                lead.updated_at = datetime.utcnow()
                
                session.commit()
            
            # Registrar interacción del cambio de estado
            await self._record_interaction(
                lead_id=lead_id,
                agent_id=agent_id or "system",
                agent_type="system",
                interaction_type=InteractionType.AI_CONVERSATION.value,
                subject=f"Status changed: {old_status} → {new_status.value}",
                content=notes or f"Lead status automatically updated to {new_status.value}",
                direction="outbound"
            )
            
            # Actualizar ticket asociado
            await self._update_ticket_stage(lead_id, new_status.value)
            
            # Disparar eventos de automatización
            await self._trigger_event('lead_status_changed', {
                'lead_id': lead_id,
                'old_status': old_status,
                'new_status': new_status.value,
                'agent_id': agent_id
            })
            
            logger.info(f"✅ Lead {lead_id} status updated: {old_status} → {new_status.value}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update lead status: {e}")
            return False

    async def record_interaction(self, interaction_data: Dict[str, Any]) -> str:
        """Registrar interacción con lead"""
        try:
            interaction_id = await self._record_interaction(
                lead_id=interaction_data['lead_id'],
                agent_id=interaction_data['agent_id'],
                agent_type=interaction_data.get('agent_type', 'human'),
                interaction_type=interaction_data['interaction_type'],
                subject=interaction_data.get('subject', ''),
                content=interaction_data.get('content', ''),
                direction=interaction_data.get('direction', 'outbound'),
                duration_seconds=interaction_data.get('duration_seconds'),
                sentiment_score=interaction_data.get('sentiment_score'),
                satisfaction_rating=interaction_data.get('satisfaction_rating'),
                follow_up_required=interaction_data.get('follow_up_required', False),
                follow_up_date=interaction_data.get('follow_up_date'),
                outcome=interaction_data.get('outcome'),
                next_steps=interaction_data.get('next_steps'),
                tags=interaction_data.get('tags', [])
            )
            
            # Actualizar score del lead basado en la interacción
            await self._update_lead_score_from_interaction(
                interaction_data['lead_id'], 
                interaction_data['interaction_type'],
                interaction_data.get('sentiment_score', 0)
            )
            
            # Actualizar actividad del ticket
            await self._add_ticket_activity(
                interaction_data['lead_id'],
                'interaction_recorded',
                f"New {interaction_data['interaction_type']} interaction recorded",
                interaction_data['agent_id']
            )
            
            return interaction_id
            
        except Exception as e:
            logger.error(f"❌ Failed to record interaction: {e}")
            raise

    async def get_lead_pipeline(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Obtener pipeline de leads"""
        try:
            with self.SessionLocal() as session:
                query = session.query(Lead)
                
                # Aplicar filtros
                if filters:
                    if 'source' in filters:
                        query = query.filter(Lead.source == filters['source'])
                    if 'status' in filters:
                        query = query.filter(Lead.status == filters['status'])
                    if 'assigned_agent_id' in filters:
                        query = query.filter(Lead.assigned_agent_id == filters['assigned_agent_id'])
                    if 'priority' in filters:
                        query = query.filter(Lead.priority == filters['priority'])
                    if 'date_from' in filters:
                        query = query.filter(Lead.created_at >= filters['date_from'])
                    if 'date_to' in filters:
                        query = query.filter(Lead.created_at <= filters['date_to'])
                
                leads = query.order_by(Lead.created_at.desc()).all()
                
                # Convertir a diccionarios con información adicional
                pipeline = []
                for lead in leads:
                    # Obtener último ticket
                    latest_ticket = session.query(Ticket)\
                        .filter(Ticket.lead_id == lead.id)\
                        .order_by(Ticket.updated_at.desc())\
                        .first()
                    
                    # Obtener última interacción
                    latest_interaction = session.query(Interaction)\
                        .filter(Interaction.lead_id == lead.id)\
                        .order_by(Interaction.created_at.desc())\
                        .first()
                    
                    lead_dict = {
                        'id': str(lead.id),
                        'name': f"{lead.first_name} {lead.last_name or ''}".strip(),
                        'email': lead.email,
                        'phone': lead.phone,
                        'company': lead.company,
                        'source': lead.source,
                        'status': lead.status,
                        'priority': lead.priority,
                        'lead_score': lead.lead_score,
                        'conversion_probability': lead.conversion_probability,
                        'estimated_value': lead.estimated_value,
                        'assigned_agent_id': lead.assigned_agent_id,
                        'created_at': lead.created_at.isoformat(),
                        'updated_at': lead.updated_at.isoformat(),
                        'ticket': {
                            'id': str(latest_ticket.id) if latest_ticket else None,
                            'number': latest_ticket.ticket_number if latest_ticket else None,
                            'stage': latest_ticket.stage if latest_ticket else None,
                            'progress': latest_ticket.progress_percentage if latest_ticket else 0
                        } if latest_ticket else None,
                        'last_interaction': {
                            'type': latest_interaction.interaction_type if latest_interaction else None,
                            'date': latest_interaction.created_at.isoformat() if latest_interaction else None,
                            'agent': latest_interaction.agent_id if latest_interaction else None
                        } if latest_interaction else None
                    }
                    
                    pipeline.append(lead_dict)
                
                return pipeline
                
        except Exception as e:
            logger.error(f"❌ Failed to get lead pipeline: {e}")
            return []

    async def get_conversion_analytics(self, date_from: datetime = None, 
                                     date_to: datetime = None) -> Dict[str, Any]:
        """Obtener analytics de conversión"""
        try:
            if not date_from:
                date_from = datetime.utcnow() - timedelta(days=30)
            if not date_to:
                date_to = datetime.utcnow()
            
            with self.SessionLocal() as session:
                # Analytics por fuente
                source_analytics = {}
                
                for source in LeadSource:
                    source_leads = session.query(Lead)\
                        .filter(Lead.source == source.value)\
                        .filter(Lead.created_at >= date_from)\
                        .filter(Lead.created_at <= date_to)\
                        .all()
                    
                    total_leads = len(source_leads)
                    if total_leads == 0:
                        continue
                    
                    qualified_leads = len([l for l in source_leads if l.status not in [LeadStatus.NEW.value, LeadStatus.UNQUALIFIED.value]])
                    converted_leads = len([l for l in source_leads if l.status == LeadStatus.CLOSED_WON.value])
                    
                    total_value = sum([l.estimated_value or 0 for l in source_leads if l.status == LeadStatus.CLOSED_WON.value])
                    avg_deal_value = total_value / max(converted_leads, 1)
                    conversion_rate = (converted_leads / total_leads) * 100
                    
                    source_analytics[source.value] = ConversionAnalytics(
                        lead_source=source.value,
                        total_leads=total_leads,
                        qualified_leads=qualified_leads,
                        converted_leads=converted_leads,
                        conversion_rate=conversion_rate,
                        average_deal_value=avg_deal_value,
                        total_revenue=total_value,
                        cost_per_lead=0.0,  # Sería calculado con datos de marketing
                        roi=0.0  # Sería calculado con costos
                    )
                
                # Métricas globales
                all_leads = session.query(Lead)\
                    .filter(Lead.created_at >= date_from)\
                    .filter(Lead.created_at <= date_to)\
                    .all()
                
                total_leads_count = len(all_leads)
                total_converted = len([l for l in all_leads if l.status == LeadStatus.CLOSED_WON.value])
                total_revenue = sum([l.estimated_value or 0 for l in all_leads if l.status == LeadStatus.CLOSED_WON.value])
                
                # Top performers
                top_agents = self._calculate_top_agents(all_leads)
                
                return {
                    'period': {
                        'from': date_from.isoformat(),
                        'to': date_to.isoformat()
                    },
                    'summary': {
                        'total_leads': total_leads_count,
                        'total_converted': total_converted,
                        'overall_conversion_rate': (total_converted / max(total_leads_count, 1)) * 100,
                        'total_revenue': total_revenue,
                        'average_deal_size': total_revenue / max(total_converted, 1)
                    },
                    'by_source': {source: asdict(analytics) for source, analytics in source_analytics.items()},
                    'top_performing_agents': top_agents,
                    'conversion_funnel': await self._calculate_conversion_funnel(date_from, date_to)
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to get conversion analytics: {e}")
            return {}

    async def _calculate_lead_score(self, lead_id: str) -> float:
        """Calcular score del lead"""
        try:
            with self.SessionLocal() as session:
                lead = session.query(Lead).filter(Lead.id == lead_id).first()
                
                if not lead:
                    return 0.0
                
                # Calcular diferentes componentes del score
                demographic_score = self._calculate_demographic_score(lead)
                behavioral_score = self._calculate_behavioral_score(lead)
                engagement_score = await self._calculate_engagement_score(lead_id)
                fit_score = self._calculate_fit_score(lead)
                urgency_score = self._calculate_urgency_score(lead)
                
                # Score total ponderado
                total_score = (
                    demographic_score * self.scoring_weights['demographic'] +
                    behavioral_score * self.scoring_weights['behavioral'] +
                    engagement_score * self.scoring_weights['engagement'] +
                    fit_score * self.scoring_weights['fit'] +
                    urgency_score * self.scoring_weights['urgency']
                ) * 100  # Convertir a escala 0-100
                
                # Actualizar en base de datos
                lead.lead_score = round(total_score, 2)
                lead.conversion_probability = min(total_score / 100, 1.0)
                
                session.commit()
                
                logger.debug(f"Lead {lead_id} score calculated: {total_score:.2f}")
                
                return total_score
                
        except Exception as e:
            logger.error(f"❌ Failed to calculate lead score: {e}")
            return 0.0

    def _calculate_demographic_score(self, lead: Lead) -> float:
        """Calcular score demográfico"""
        score = 0.0
        
        # Información completa
        if lead.first_name and lead.last_name:
            score += 0.2
        if lead.phone:
            score += 0.2
        if lead.location_country:
            score += 0.1
        if lead.company and lead.customer_type.startswith('b2b'):
            score += 0.3
            
        # Calidad de información
        if lead.email and '@' in lead.email and '.' in lead.email:
            score += 0.2
            
        return min(score, 1.0)

    def _calculate_behavioral_score(self, lead: Lead) -> float:
        """Calcular score comportamental"""
        score = 0.0
        
        # Fuente del lead (calidad)
        high_quality_sources = [
            LeadSource.WEBSITE_DIRECT.value,
            LeadSource.REFERRAL.value,
            LeadSource.PHONE_INBOUND.value
        ]
        
        if lead.source in high_quality_sources:
            score += 0.4
        elif lead.source.startswith('social_'):
            score += 0.2
        else:
            score += 0.1
            
        # UTM tracking (indica intención)
        if lead.utm_campaign:
            score += 0.2
            
        # Preferencias definidas
        if lead.tour_preferences:
            score += 0.2
            
        # Budget range definido
        if lead.budget_range:
            score += 0.2
            
        return min(score, 1.0)

    async def _calculate_engagement_score(self, lead_id: str) -> float:
        """Calcular score de engagement"""
        try:
            with self.SessionLocal() as session:
                interactions = session.query(Interaction)\
                    .filter(Interaction.lead_id == lead_id)\
                    .all()
                
                if not interactions:
                    return 0.0
                
                score = 0.0
                
                # Número de interacciones
                interaction_count = len(interactions)
                score += min(interaction_count * 0.1, 0.4)
                
                # Sentimiento promedio
                sentiments = [i.sentiment_score for i in interactions if i.sentiment_score is not None]
                if sentiments:
                    avg_sentiment = sum(sentiments) / len(sentiments)
                    score += max(0, avg_sentiment) * 0.3
                
                # Interacciones recientes
                recent_interactions = [i for i in interactions 
                                     if (datetime.utcnow() - i.created_at).days <= 7]
                if recent_interactions:
                    score += 0.3
                
                return min(score, 1.0)
                
        except Exception as e:
            logger.error(f"❌ Failed to calculate engagement score: {e}")
            return 0.0

    def _calculate_fit_score(self, lead: Lead) -> float:
        """Calcular score de fit con ideal customer profile"""
        score = 0.0
        
        # Tipo de cliente objetivo
        high_value_types = [
            CustomerType.B2B_CORPORATE.value,
            CustomerType.B2B_TRAVEL_AGENCY.value,
            CustomerType.B2C_GROUP.value
        ]
        
        if lead.customer_type in high_value_types:
            score += 0.5
        else:
            score += 0.2
            
        # Ubicación (mercados objetivo)
        target_countries = ['US', 'CA', 'UK', 'DE', 'FR', 'AU', 'BR', 'MX']
        if lead.location_country in target_countries:
            score += 0.3
            
        # Intereses relevantes
        if lead.interests:
            tourism_interests = ['travel', 'adventure', 'culture', 'nature', 'history']
            matching_interests = [i for i in lead.interests if i.lower() in tourism_interests]
            score += min(len(matching_interests) * 0.05, 0.2)
            
        return min(score, 1.0)

    def _calculate_urgency_score(self, lead: Lead) -> float:
        """Calcular score de urgencia"""
        score = 0.0
        
        # Tiempo desde creación (más reciente = más urgente)
        days_since_creation = (datetime.utcnow() - lead.created_at).days
        if days_since_creation <= 1:
            score += 0.5
        elif days_since_creation <= 3:
            score += 0.3
        elif days_since_creation <= 7:
            score += 0.1
            
        # Prioridad asignada
        priority_scores = {
            Priority.HOT.value: 0.5,
            Priority.URGENT.value: 0.4,
            Priority.HIGH.value: 0.3,
            Priority.MEDIUM.value: 0.2,
            Priority.LOW.value: 0.1
        }
        score += priority_scores.get(lead.priority, 0.2)
        
        return min(score, 1.0)

    async def _record_interaction(self, **kwargs) -> str:
        """Registrar interacción interna"""
        try:
            with self.SessionLocal() as session:
                interaction = Interaction(
                    lead_id=kwargs['lead_id'],
                    agent_id=kwargs['agent_id'],
                    agent_type=kwargs['agent_type'],
                    interaction_type=kwargs['interaction_type'],
                    subject=kwargs.get('subject'),
                    content=kwargs.get('content'),
                    direction=kwargs['direction'],
                    duration_seconds=kwargs.get('duration_seconds'),
                    sentiment_score=kwargs.get('sentiment_score'),
                    satisfaction_rating=kwargs.get('satisfaction_rating'),
                    follow_up_required=kwargs.get('follow_up_required', False),
                    follow_up_date=kwargs.get('follow_up_date'),
                    outcome=kwargs.get('outcome'),
                    next_steps=kwargs.get('next_steps'),
                    tags=kwargs.get('tags', [])
                )
                
                session.add(interaction)
                session.commit()
                session.refresh(interaction)
                
                return str(interaction.id)
                
        except Exception as e:
            logger.error(f"❌ Failed to record interaction: {e}")
            raise

    async def cleanup(self):
        """Limpiar recursos del sistema CRM"""
        try:
            logger.info("🧹 Cleaning up Advanced CRM System...")
            
            self.is_running = False
            
            # Cerrar conexiones de base de datos
            if hasattr(self, 'engine'):
                self.engine.dispose()
            
            # Limpiar caches
            self.lead_cache.clear()
            self.analytics_cache.clear()
            
            logger.info("✅ CRM system cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ CRM system cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_advanced_crm_system(config: Dict[str, Any]) -> AdvancedCRMSystem:
    """
    Factory function para crear sistema CRM configurado
    """
    crm_system = AdvancedCRMSystem(
        database_url=config.get("database_url", "sqlite:///spirit_tours_crm.db")
    )
    
    await crm_system.initialize()
    return crm_system

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "database_url": "sqlite:///spirit_tours_crm.db"
        }
        
        try:
            # Crear sistema CRM
            crm = await create_advanced_crm_system(config)
            
            # Crear lead de ejemplo
            lead_data = {
                "first_name": "Juan",
                "last_name": "Pérez",
                "email": "juan.perez@example.com",
                "phone": "+1234567890",
                "source": LeadSource.WEBSITE_DIRECT.value,
                "customer_type": CustomerType.B2C_FAMILY.value,
                "location_country": "MX",
                "interests": ["adventure", "culture"],
                "budget_range": "1000-2000"
            }
            
            lead_id = await crm.create_lead(lead_data)
            print(f"✅ Lead created: {lead_id}")
            
            # Registrar interacción
            interaction_data = {
                "lead_id": lead_id,
                "agent_id": "agent_001",
                "agent_type": "human",
                "interaction_type": InteractionType.PHONE_CALL.value,
                "subject": "Initial contact call",
                "content": "Discussed available tour packages",
                "direction": "outbound",
                "duration_seconds": 600,
                "sentiment_score": 0.7,
                "follow_up_required": True
            }
            
            interaction_id = await crm.record_interaction(interaction_data)
            print(f"✅ Interaction recorded: {interaction_id}")
            
            # Obtener pipeline
            pipeline = await crm.get_lead_pipeline()
            print(f"📊 Pipeline: {len(pipeline)} leads")
            
            # Obtener analytics
            analytics = await crm.get_conversion_analytics()
            print(f"📈 Analytics: {analytics['summary']['total_leads']} total leads")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'crm' in locals():
                await crm.cleanup()
    
    asyncio.run(main())