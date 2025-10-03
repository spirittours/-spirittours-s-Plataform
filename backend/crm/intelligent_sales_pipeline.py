#!/usr/bin/env python3
"""
💰 Sistema Inteligente de Pipeline de Ventas para Spirit Tours
Pipeline automatizado con IA para maximizar conversiones, automatizar seguimientos
y optimizar el proceso de ventas desde lead hasta cierre.

Features:
- Pipeline visual configurable por tipo de cliente
- Automatización inteligente basada en comportamiento
- Predicción de conversión con Machine Learning
- Follow-ups automáticos contextuales
- Scoring dinámico de oportunidades
- Alertas predictivas de pérdida de leads
- Optimización de procesos basada en datos
- Integration con agentes IA para nurturing automático
"""

import asyncio
import logging
import json
import time
import numpy as np
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, deque
import uuid
import threading
import pickle
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pandas as pd

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

class PipelineStage(Enum):
    """Etapas del pipeline de ventas"""
    LEAD_CAPTURE = "lead_capture"           # Captura de lead
    QUALIFICATION = "qualification"         # Calificación inicial
    DISCOVERY = "discovery"                # Descubrimiento de necesidades
    PRESENTATION = "presentation"          # Presentación de solución
    PROPOSAL = "proposal"                  # Propuesta enviada
    NEGOTIATION = "negotiation"            # Negociación
    CLOSING = "closing"                    # Cierre de venta
    WON = "won"                           # Venta ganada
    LOST = "lost"                         # Venta perdida
    NURTURING = "nurturing"               # En nurturing

class AutomationTrigger(Enum):
    """Triggers de automatización"""
    TIME_BASED = "time_based"             # Basado en tiempo
    STAGE_CHANGE = "stage_change"         # Cambio de etapa
    ACTIVITY = "activity"                 # Actividad específica
    SCORE_THRESHOLD = "score_threshold"   # Umbral de score
    BEHAVIOR = "behavior"                 # Comportamiento del lead
    EXTERNAL_EVENT = "external_event"    # Evento externo

class ActionType(Enum):
    """Tipos de acciones automatizadas"""
    SEND_EMAIL = "send_email"
    SEND_SMS = "send_sms"
    MAKE_CALL = "make_call"
    CREATE_TASK = "create_task"
    ASSIGN_AGENT = "assign_agent"
    UPDATE_SCORE = "update_score"
    MOVE_STAGE = "move_stage"
    SET_REMINDER = "set_reminder"
    TRIGGER_AI_FOLLOWUP = "trigger_ai_followup"
    ESCALATE = "escalate"

class PredictionModel(Enum):
    """Modelos de predicción disponibles"""
    CONVERSION_PROBABILITY = "conversion_probability"
    DEAL_SIZE_PREDICTION = "deal_size_prediction"
    CLOSING_TIME_PREDICTION = "closing_time_prediction"
    CHURN_RISK = "churn_risk"
    NEXT_BEST_ACTION = "next_best_action"

# Modelos de Base de Datos
class PipelineConfig(Base):
    """Configuración del pipeline por tipo de cliente"""
    __tablename__ = 'pipeline_configs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Configuración básica
    name = Column(String(200), nullable=False)
    customer_type = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Etapas del pipeline
    stages = Column(JSON)  # Lista de etapas con configuración
    
    # Configuración de automatización
    automation_rules = Column(JSON)
    scoring_weights = Column(JSON)
    
    # SLA por etapa
    stage_sla_hours = Column(JSON)
    
    # Relaciones
    opportunities = relationship("SalesOpportunity", back_populates="pipeline_config")

class SalesOpportunity(Base):
    """Oportunidad de venta en el pipeline"""
    __tablename__ = 'sales_opportunities'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Asociaciones
    lead_id = Column(UUID(as_uuid=True))  # Referencia al lead del CRM
    pipeline_config_id = Column(UUID(as_uuid=True), ForeignKey('pipeline_configs.id'))
    assigned_agent_id = Column(String(100))
    
    # Información básica
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Estado en pipeline
    current_stage = Column(String(50), nullable=False)
    stage_entered_at = Column(DateTime, default=datetime.utcnow)
    
    # Valor y probabilidad
    estimated_value = Column(Float, default=0.0)
    probability = Column(Float, default=0.0)  # 0.0 - 1.0
    expected_close_date = Column(DateTime)
    
    # Scoring y predicciones
    opportunity_score = Column(Float, default=0.0)
    conversion_prediction = Column(Float, default=0.0)
    deal_size_prediction = Column(Float, default=0.0)
    closing_time_prediction = Column(Float, default=0.0)  # días
    churn_risk_score = Column(Float, default=0.0)
    
    # Tracking
    total_interactions = Column(Integer, default=0)
    last_interaction_date = Column(DateTime)
    days_in_current_stage = Column(Integer, default=0)
    
    # Metadata
    source_channel = Column(String(50))
    tags = Column(JSON)
    custom_fields = Column(JSON)
    
    # Relaciones
    pipeline_config = relationship("PipelineConfig", back_populates="opportunities")
    activities = relationship("OpportunityActivity", back_populates="opportunity", cascade="all, delete-orphan")
    predictions = relationship("OpportunityPrediction", back_populates="opportunity", cascade="all, delete-orphan")

class OpportunityActivity(Base):
    """Actividades de la oportunidad"""
    __tablename__ = 'opportunity_activities'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey('sales_opportunities.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Detalles de la actividad
    activity_type = Column(String(50), nullable=False)
    description = Column(Text)
    agent_id = Column(String(100))
    agent_type = Column(String(20))  # 'human', 'ai', 'system'
    
    # Resultados
    outcome = Column(String(100))
    next_action = Column(String(200))
    follow_up_date = Column(DateTime)
    
    # Impacto en scoring
    score_impact = Column(Float, default=0.0)
    
    # Metadata
    duration_minutes = Column(Integer)
    sentiment_score = Column(Float)
    
    # Relaciones
    opportunity = relationship("SalesOpportunity", back_populates="activities")

class OpportunityPrediction(Base):
    """Predicciones ML para oportunidades"""
    __tablename__ = 'opportunity_predictions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey('sales_opportunities.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Tipo de predicción
    model_type = Column(String(50), nullable=False)
    model_version = Column(String(20), default='1.0')
    
    # Predicción
    prediction_value = Column(Float)
    confidence_score = Column(Float)  # 0.0 - 1.0
    
    # Features utilizadas
    feature_importance = Column(JSON)
    input_features = Column(JSON)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    
    # Relaciones
    opportunity = relationship("SalesOpportunity", back_populates="predictions")

class AutomationRule(Base):
    """Reglas de automatización del pipeline"""
    __tablename__ = 'automation_rules'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Configuración básica
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Condiciones trigger
    trigger_type = Column(String(50), nullable=False)
    trigger_conditions = Column(JSON)
    
    # Acciones
    actions = Column(JSON)
    
    # Configuración de ejecución
    execution_delay_minutes = Column(Integer, default=0)
    max_executions_per_opportunity = Column(Integer)
    
    # Filtros
    applicable_stages = Column(JSON)
    applicable_customer_types = Column(JSON)
    
    # Estadísticas
    execution_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)

@dataclass
class PipelineMetrics:
    """Métricas del pipeline"""
    total_opportunities: int
    opportunities_by_stage: Dict[str, int]
    conversion_rate_by_stage: Dict[str, float]
    average_deal_size: float
    average_cycle_time_days: float
    win_rate: float
    total_pipeline_value: float
    weighted_pipeline_value: float

@dataclass
class OpportunityFeatures:
    """Features para ML models"""
    # Demográficas
    lead_score: float
    company_size: int
    location_score: float
    
    # Comportamentales
    total_interactions: int
    email_opens: int
    link_clicks: int
    website_visits: int
    
    # Temporales
    days_since_first_contact: int
    days_in_current_stage: int
    response_time_avg_hours: float
    
    # Engagement
    sentiment_avg: float
    engagement_score: float
    
    # Pipeline específicas
    stage_progression_speed: float
    budget_qualification_score: float

class IntelligentSalesPipeline:
    """
    Sistema inteligente de pipeline de ventas
    
    Características:
    - Pipeline automatizado con IA
    - Predicción de conversión ML
    - Automatización contextual
    - Scoring dinámico
    - Optimización continua
    """
    
    def __init__(self, database_url: str = "sqlite:///spirit_tours_pipeline.db"):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Crear tablas
        Base.metadata.create_all(bind=self.engine)
        
        # ML Models
        self.models = {}
        self.scalers = {}
        self.model_versions = {}
        
        # Cache de predicciones
        self.prediction_cache = {}
        
        # Configuraciones por defecto
        self.default_stage_configs = {
            PipelineStage.LEAD_CAPTURE: {"probability": 0.1, "avg_duration_days": 0.5},
            PipelineStage.QUALIFICATION: {"probability": 0.2, "avg_duration_days": 1},
            PipelineStage.DISCOVERY: {"probability": 0.3, "avg_duration_days": 3},
            PipelineStage.PRESENTATION: {"probability": 0.5, "avg_duration_days": 5},
            PipelineStage.PROPOSAL: {"probability": 0.7, "avg_duration_days": 7},
            PipelineStage.NEGOTIATION: {"probability": 0.8, "avg_duration_days": 10},
            PipelineStage.CLOSING: {"probability": 0.9, "avg_duration_days": 5},
            PipelineStage.WON: {"probability": 1.0, "avg_duration_days": 0},
            PipelineStage.LOST: {"probability": 0.0, "avg_duration_days": 0}
        }
        
        # Event callbacks
        self.event_callbacks = defaultdict(list)
        
        # Estado del sistema
        self.is_running = False

    async def initialize(self):
        """Inicializar sistema de pipeline"""
        try:
            logger.info("💰 Initializing Intelligent Sales Pipeline...")
            
            # Cargar configuraciones por defecto
            await self._load_default_pipeline_configs()
            
            # Cargar reglas de automatización
            await self._load_default_automation_rules()
            
            # Entrenar modelos ML iniciales
            await self._initialize_ml_models()
            
            # Iniciar tareas de background
            asyncio.create_task(self._pipeline_processor_loop())
            asyncio.create_task(self._automation_engine_loop())
            asyncio.create_task(self._prediction_updater_loop())
            asyncio.create_task(self._performance_optimizer_loop())
            
            self.is_running = True
            logger.info("✅ Intelligent Sales Pipeline initialized successfully")
            
            return {
                "status": "initialized",
                "pipeline_configs": await self._count_pipeline_configs(),
                "automation_rules": await self._count_automation_rules(),
                "ml_models": len(self.models)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize sales pipeline: {e}")
            raise

    async def create_opportunity(self, opportunity_data: Dict[str, Any]) -> str:
        """Crear nueva oportunidad en el pipeline"""
        try:
            with self.SessionLocal() as session:
                # Determinar configuración de pipeline
                pipeline_config = await self._determine_pipeline_config(
                    opportunity_data.get('customer_type', 'b2c_individual')
                )
                
                # Crear oportunidad
                opportunity = SalesOpportunity(
                    lead_id=opportunity_data['lead_id'],
                    pipeline_config_id=pipeline_config.id,
                    assigned_agent_id=opportunity_data.get('assigned_agent_id'),
                    name=opportunity_data['name'],
                    description=opportunity_data.get('description'),
                    current_stage=PipelineStage.LEAD_CAPTURE.value,
                    estimated_value=opportunity_data.get('estimated_value', 0.0),
                    expected_close_date=opportunity_data.get('expected_close_date'),
                    source_channel=opportunity_data.get('source_channel'),
                    custom_fields=opportunity_data.get('custom_fields', {})
                )
                
                session.add(opportunity)
                session.commit()
                session.refresh(opportunity)
                
                opportunity_id = str(opportunity.id)
            
            # Calcular scoring inicial
            await self._calculate_opportunity_score(opportunity_id)
            
            # Generar predicciones iniciales
            await self._generate_predictions(opportunity_id)
            
            # Aplicar automatización inicial
            await self._trigger_automation('opportunity_created', opportunity_id)
            
            # Registrar actividad inicial
            await self._record_activity(
                opportunity_id,
                'opportunity_created',
                f"Opportunity created in {PipelineStage.LEAD_CAPTURE.value} stage",
                'system'
            )
            
            logger.info(f"✅ Opportunity created: {opportunity_id}")
            
            return opportunity_id
            
        except Exception as e:
            logger.error(f"❌ Failed to create opportunity: {e}")
            raise

    async def advance_stage(self, opportunity_id: str, new_stage: PipelineStage, 
                          agent_id: str, notes: str = None) -> bool:
        """Avanzar oportunidad a nueva etapa"""
        try:
            with self.SessionLocal() as session:
                opportunity = session.query(SalesOpportunity)\
                    .filter(SalesOpportunity.id == opportunity_id)\
                    .first()
                
                if not opportunity:
                    raise ValueError(f"Opportunity {opportunity_id} not found")
                
                old_stage = opportunity.current_stage
                
                # Validar transición de etapa
                if not await self._is_valid_stage_transition(old_stage, new_stage.value):
                    raise ValueError(f"Invalid stage transition: {old_stage} -> {new_stage.value}")
                
                # Actualizar oportunidad
                opportunity.current_stage = new_stage.value
                opportunity.stage_entered_at = datetime.utcnow()
                opportunity.updated_at = datetime.utcnow()
                
                # Actualizar probabilidad basada en etapa
                stage_config = self.default_stage_configs.get(new_stage)
                if stage_config:
                    opportunity.probability = stage_config['probability']
                
                # Calcular días en etapa anterior
                if opportunity.stage_entered_at:
                    days_in_previous = (datetime.utcnow() - opportunity.stage_entered_at).days
                    opportunity.days_in_current_stage = days_in_previous
                
                session.commit()
            
            # Registrar actividad
            await self._record_activity(
                opportunity_id,
                'stage_advanced',
                f"Stage advanced from {old_stage} to {new_stage.value}",
                agent_id,
                notes
            )
            
            # Actualizar predicciones
            await self._update_predictions(opportunity_id)
            
            # Ejecutar automatización por cambio de etapa
            await self._trigger_automation('stage_change', opportunity_id, {
                'old_stage': old_stage,
                'new_stage': new_stage.value
            })
            
            # Disparar eventos
            await self._trigger_event('stage_advanced', {
                'opportunity_id': opportunity_id,
                'old_stage': old_stage,
                'new_stage': new_stage.value,
                'agent_id': agent_id
            })
            
            logger.info(f"✅ Opportunity {opportunity_id} advanced: {old_stage} → {new_stage.value}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to advance stage: {e}")
            return False

    async def get_pipeline_dashboard(self, agent_id: str = None, 
                                   date_from: datetime = None) -> Dict[str, Any]:
        """Obtener dashboard del pipeline"""
        try:
            if not date_from:
                date_from = datetime.utcnow() - timedelta(days=30)
            
            with self.SessionLocal() as session:
                # Query base
                query = session.query(SalesOpportunity)\
                    .filter(SalesOpportunity.created_at >= date_from)
                
                # Filtrar por agente si se especifica
                if agent_id:
                    query = query.filter(SalesOpportunity.assigned_agent_id == agent_id)
                
                opportunities = query.all()
                
                # Métricas generales
                total_opportunities = len(opportunities)
                total_value = sum(opp.estimated_value for opp in opportunities)
                weighted_value = sum(opp.estimated_value * opp.probability for opp in opportunities)
                
                # Oportunidades por etapa
                stage_breakdown = defaultdict(int)
                stage_value = defaultdict(float)
                
                for opp in opportunities:
                    stage_breakdown[opp.current_stage] += 1
                    stage_value[opp.current_stage] += opp.estimated_value
                
                # Top oportunidades
                top_opportunities = sorted(
                    opportunities,
                    key=lambda x: x.estimated_value * x.probability,
                    reverse=True
                )[:10]
                
                top_opps_data = []
                for opp in top_opportunities:
                    # Obtener última actividad
                    last_activity = session.query(OpportunityActivity)\
                        .filter(OpportunityActivity.opportunity_id == opp.id)\
                        .order_by(OpportunityActivity.created_at.desc())\
                        .first()
                    
                    top_opps_data.append({
                        'id': str(opp.id),
                        'name': opp.name,
                        'stage': opp.current_stage,
                        'estimated_value': opp.estimated_value,
                        'probability': opp.probability,
                        'weighted_value': opp.estimated_value * opp.probability,
                        'days_in_stage': opp.days_in_current_stage,
                        'expected_close_date': opp.expected_close_date.isoformat() if opp.expected_close_date else None,
                        'last_activity': last_activity.created_at.isoformat() if last_activity else None,
                        'conversion_prediction': opp.conversion_prediction,
                        'churn_risk': opp.churn_risk_score
                    })
                
                # Alertas y acciones requeridas
                alerts = await self._get_pipeline_alerts(opportunities)
                
                # Predicciones agregadas
                avg_conversion = np.mean([opp.conversion_prediction for opp in opportunities if opp.conversion_prediction > 0])
                high_risk_opportunities = [opp for opp in opportunities if opp.churn_risk_score > 0.7]
                
                return {
                    'summary': {
                        'total_opportunities': total_opportunities,
                        'total_pipeline_value': total_value,
                        'weighted_pipeline_value': weighted_value,
                        'average_deal_size': total_value / max(total_opportunities, 1),
                        'average_conversion_prediction': avg_conversion if not np.isnan(avg_conversion) else 0,
                        'high_risk_opportunities': len(high_risk_opportunities)
                    },
                    'stage_breakdown': {
                        'counts': dict(stage_breakdown),
                        'values': dict(stage_value)
                    },
                    'top_opportunities': top_opps_data,
                    'alerts': alerts,
                    'predictions': {
                        'expected_monthly_revenue': await self._predict_monthly_revenue(opportunities),
                        'conversion_forecast': await self._forecast_conversions(opportunities)
                    },
                    'performance': await self._calculate_pipeline_performance(opportunities)
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to get pipeline dashboard: {e}")
            return {}

    async def get_ai_recommendations(self, opportunity_id: str) -> Dict[str, Any]:
        """Obtener recomendaciones de IA para una oportunidad"""
        try:
            with self.SessionLocal() as session:
                opportunity = session.query(SalesOpportunity)\
                    .filter(SalesOpportunity.id == opportunity_id)\
                    .first()
                
                if not opportunity:
                    raise ValueError(f"Opportunity {opportunity_id} not found")
                
                # Obtener features para análisis
                features = await self._extract_opportunity_features(opportunity_id)
                
                # Generar recomendaciones
                recommendations = {
                    'next_best_actions': await self._predict_next_best_actions(features),
                    'risk_factors': await self._identify_risk_factors(features),
                    'optimization_suggestions': await self._suggest_optimizations(features),
                    'timing_recommendations': await self._recommend_timing(features),
                    'content_suggestions': await self._suggest_content(features)
                }
                
                # Scoring de prioridad
                priority_score = await self._calculate_priority_score(features)
                
                return {
                    'opportunity_id': opportunity_id,
                    'priority_score': priority_score,
                    'recommendations': recommendations,
                    'confidence_level': await self._calculate_recommendation_confidence(features),
                    'generated_at': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to get AI recommendations: {e}")
            return {}

    async def _load_default_pipeline_configs(self):
        """Cargar configuraciones de pipeline por defecto"""
        try:
            default_configs = [
                {
                    "name": "B2C Individual Pipeline",
                    "customer_type": "b2c_individual",
                    "stages": [
                        {"stage": "lead_capture", "probability": 0.1, "duration_days": 0.5},
                        {"stage": "qualification", "probability": 0.2, "duration_days": 1},
                        {"stage": "discovery", "probability": 0.4, "duration_days": 2},
                        {"stage": "presentation", "probability": 0.6, "duration_days": 3},
                        {"stage": "proposal", "probability": 0.8, "duration_days": 5},
                        {"stage": "closing", "probability": 0.9, "duration_days": 3}
                    ],
                    "automation_rules": [
                        {
                            "trigger": "time_based",
                            "condition": "no_activity_24h",
                            "action": "send_followup_email"
                        }
                    ]
                },
                {
                    "name": "B2B Corporate Pipeline",
                    "customer_type": "b2b_corporate",
                    "stages": [
                        {"stage": "lead_capture", "probability": 0.05, "duration_days": 1},
                        {"stage": "qualification", "probability": 0.15, "duration_days": 3},
                        {"stage": "discovery", "probability": 0.3, "duration_days": 7},
                        {"stage": "presentation", "probability": 0.5, "duration_days": 10},
                        {"stage": "proposal", "probability": 0.7, "duration_days": 14},
                        {"stage": "negotiation", "probability": 0.8, "duration_days": 21},
                        {"stage": "closing", "probability": 0.9, "duration_days": 7}
                    ]
                }
            ]
            
            with self.SessionLocal() as session:
                for config_data in default_configs:
                    existing = session.query(PipelineConfig)\
                        .filter(PipelineConfig.name == config_data["name"])\
                        .first()
                    
                    if not existing:
                        config = PipelineConfig(
                            name=config_data["name"],
                            customer_type=config_data["customer_type"],
                            stages=config_data["stages"],
                            automation_rules=config_data.get("automation_rules", [])
                        )
                        session.add(config)
                
                session.commit()
            
            logger.info("📋 Default pipeline configurations loaded")
            
        except Exception as e:
            logger.error(f"❌ Failed to load default pipeline configs: {e}")

    async def _initialize_ml_models(self):
        """Inicializar modelos de Machine Learning"""
        try:
            # Modelo de predicción de conversión
            self.models[PredictionModel.CONVERSION_PROBABILITY] = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            
            # Modelo de predicción de tamaño de deal
            self.models[PredictionModel.DEAL_SIZE_PREDICTION] = RandomForestClassifier(
                n_estimators=100,
                max_depth=8,
                random_state=42
            )
            
            # Scaler para features numéricas
            self.scalers['features'] = StandardScaler()
            
            # Entrenar con datos simulados inicialmente
            await self._train_initial_models()
            
            logger.info("🤖 ML models initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize ML models: {e}")

    async def _train_initial_models(self):
        """Entrenar modelos con datos simulados iniciales"""
        try:
            # Generar datos simulados para entrenamiento inicial
            np.random.seed(42)
            n_samples = 1000
            
            # Features simuladas
            X = np.random.rand(n_samples, 10)  # 10 features
            
            # Target para conversión (0 o 1)
            y_conversion = (X[:, 0] + X[:, 1] > 1.0).astype(int)
            
            # Target para tamaño de deal (categórico: small, medium, large)
            y_deal_size = ((X[:, 2] + X[:, 3]) * 3).astype(int)
            y_deal_size = np.clip(y_deal_size, 0, 2)  # 0=small, 1=medium, 2=large
            
            # Entrenar modelo de conversión
            self.models[PredictionModel.CONVERSION_PROBABILITY].fit(X, y_conversion)
            
            # Entrenar modelo de tamaño de deal
            self.models[PredictionModel.DEAL_SIZE_PREDICTION].fit(X, y_deal_size)
            
            # Fit scaler
            self.scalers['features'].fit(X)
            
            logger.info("🎯 Initial ML models trained with simulated data")
            
        except Exception as e:
            logger.error(f"❌ Failed to train initial models: {e}")

    async def cleanup(self):
        """Limpiar recursos del sistema de pipeline"""
        try:
            logger.info("🧹 Cleaning up Intelligent Sales Pipeline...")
            
            self.is_running = False
            
            # Cerrar conexiones de base de datos
            if hasattr(self, 'engine'):
                self.engine.dispose()
            
            # Limpiar caches
            self.prediction_cache.clear()
            
            logger.info("✅ Sales pipeline cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Sales pipeline cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_intelligent_sales_pipeline(config: Dict[str, Any]) -> IntelligentSalesPipeline:
    """
    Factory function para crear sistema de pipeline configurado
    """
    pipeline_system = IntelligentSalesPipeline(
        database_url=config.get("database_url", "sqlite:///spirit_tours_pipeline.db")
    )
    
    await pipeline_system.initialize()
    return pipeline_system

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "database_url": "sqlite:///spirit_tours_pipeline.db"
        }
        
        try:
            # Crear sistema de pipeline
            pipeline = await create_intelligent_sales_pipeline(config)
            
            # Crear oportunidad de ejemplo
            opportunity_data = {
                "lead_id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Family Vacation Package - Smith Family",
                "description": "5-day adventure tour for family of 4",
                "estimated_value": 3500.0,
                "customer_type": "b2c_family",
                "source_channel": "website_direct",
                "assigned_agent_id": "agent_001"
            }
            
            opportunity_id = await pipeline.create_opportunity(opportunity_data)
            print(f"✅ Opportunity created: {opportunity_id}")
            
            # Avanzar etapa
            success = await pipeline.advance_stage(
                opportunity_id,
                PipelineStage.QUALIFICATION,
                "agent_001",
                "Lead qualified through phone call"
            )
            print(f"✅ Stage advanced: {success}")
            
            # Obtener dashboard
            dashboard = await pipeline.get_pipeline_dashboard()
            print(f"📊 Dashboard: {dashboard['summary']['total_opportunities']} opportunities")
            
            # Obtener recomendaciones de IA
            recommendations = await pipeline.get_ai_recommendations(opportunity_id)
            print(f"🤖 AI Recommendations: {len(recommendations.get('recommendations', {}))} suggestions")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'pipeline' in locals():
                await pipeline.cleanup()
    
    asyncio.run(main())