"""
AI-Powered Follow-up Automation System for Spirit Tours CRM
Intelligent follow-up sequences with machine learning and natural language processing
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import openai
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import spacy
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, EmailStr, validator
import redis.asyncio as redis
from celery import Celery
import schedule
import threading
import time
from jinja2 import Environment, FileSystemLoader
import re
from collections import Counter
import warnings
warnings.filterwarnings('ignore')

# Download required NLTK data
try:
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass

Base = declarative_base()

# Enums
class FollowUpType(Enum):
    EMAIL = "email"
    SMS = "sms"
    PHONE_CALL = "phone_call"
    WHATSAPP = "whatsapp"
    SOCIAL_MEDIA = "social_media"
    PERSONALIZED_VIDEO = "personalized_video"
    DIRECT_MAIL = "direct_mail"

class FollowUpStage(Enum):
    INITIAL_CONTACT = "initial_contact"
    INTEREST_NURTURING = "interest_nurturing"
    OBJECTION_HANDLING = "objection_handling"
    PROPOSAL_FOLLOW = "proposal_follow"
    CLOSING = "closing"
    POST_PURCHASE = "post_purchase"
    WIN_BACK = "win_back"
    REFERRAL_REQUEST = "referral_request"

class CustomerIntent(Enum):
    HIGHLY_INTERESTED = "highly_interested"
    MODERATELY_INTERESTED = "moderately_interested"
    PRICE_SHOPPING = "price_shopping"
    INFORMATION_GATHERING = "information_gathering"
    NOT_READY = "not_ready"
    OBJECTION_RAISED = "objection_raised"
    READY_TO_BUY = "ready_to_buy"
    LOST_OPPORTUNITY = "lost_opportunity"

class SentimentScore(Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"

class PersonalityType(Enum):
    ANALYTICAL = "analytical"
    DRIVER = "driver"
    EXPRESSIVE = "expressive"
    AMIABLE = "amiable"

class CommunicationStyle(Enum):
    FORMAL = "formal"
    CASUAL = "casual"
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    ENTHUSIASTIC = "enthusiastic"

# Database Models
class FollowUpSequence(Base):
    __tablename__ = "followup_sequences"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    
    # Sequence configuration
    trigger_conditions = Column(JSON)  # Conditions that trigger this sequence
    target_segments = Column(JSON)  # Customer segments this applies to
    
    # AI configuration
    ai_personalization_enabled = Column(Boolean, default=True)
    sentiment_analysis_enabled = Column(Boolean, default=True)
    intent_prediction_enabled = Column(Boolean, default=True)
    dynamic_timing_enabled = Column(Boolean, default=True)
    
    # Sequence settings
    max_attempts = Column(Integer, default=5)
    min_interval_hours = Column(Integer, default=24)
    max_interval_hours = Column(Integer, default=168)  # 1 week
    
    # Performance tracking
    total_executions = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    steps = relationship("FollowUpStep", back_populates="sequence", cascade="all, delete-orphan")
    executions = relationship("FollowUpExecution", back_populates="sequence")

class FollowUpStep(Base):
    __tablename__ = "followup_steps"
    
    id = Column(String, primary_key=True)
    sequence_id = Column(String, ForeignKey("followup_sequences.id"))
    
    # Step configuration
    step_number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    followup_type = Column(String, nullable=False)  # FollowUpType enum
    
    # Timing
    delay_hours = Column(Integer, default=24)
    best_time_start = Column(String)  # e.g., "09:00"
    best_time_end = Column(String)    # e.g., "17:00"
    timezone = Column(String, default="UTC")
    
    # Content templates
    subject_template = Column(Text)
    content_template = Column(Text)
    variables = Column(JSON)  # Available template variables
    
    # AI personalization
    ai_content_generation = Column(Boolean, default=True)
    personality_adaptation = Column(Boolean, default=True)
    sentiment_adaptation = Column(Boolean, default=True)
    
    # Conditions
    execution_conditions = Column(JSON)  # Conditions to execute this step
    skip_conditions = Column(JSON)       # Conditions to skip this step
    
    # Success criteria
    success_metrics = Column(JSON)  # What defines success for this step
    
    # A/B testing
    variants = Column(JSON)  # Different versions for testing
    variant_weights = Column(JSON)  # Probability weights for variants
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sequence = relationship("FollowUpSequence", back_populates="steps")
    executions = relationship("FollowUpStepExecution", back_populates="step")

class FollowUpExecution(Base):
    __tablename__ = "followup_executions"
    
    id = Column(String, primary_key=True)
    sequence_id = Column(String, ForeignKey("followup_sequences.id"))
    
    # Target information
    customer_id = Column(String, nullable=False)
    lead_id = Column(String)
    opportunity_id = Column(String)
    
    # Execution status
    status = Column(String, default="active")  # active, completed, paused, cancelled
    current_step = Column(Integer, default=1)
    steps_completed = Column(Integer, default=0)
    
    # AI insights
    predicted_intent = Column(String)  # CustomerIntent enum
    sentiment_score = Column(String)   # SentimentScore enum
    personality_type = Column(String)  # PersonalityType enum
    communication_style = Column(String)  # CommunicationStyle enum
    
    # Performance tracking
    total_interactions = Column(Integer, default=0)
    positive_responses = Column(Integer, default=0)
    response_rate = Column(Float, default=0.0)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    last_interaction_at = Column(DateTime)
    next_step_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Results
    outcome = Column(String)  # conversion, no_response, objection, etc.
    final_sentiment = Column(String)
    conversion_value = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sequence = relationship("FollowUpSequence", back_populates="executions")
    step_executions = relationship("FollowUpStepExecution", back_populates="execution")

class FollowUpStepExecution(Base):
    __tablename__ = "followup_step_executions"
    
    id = Column(String, primary_key=True)
    execution_id = Column(String, ForeignKey("followup_executions.id"))
    step_id = Column(String, ForeignKey("followup_steps.id"))
    
    # Execution details
    step_number = Column(Integer, nullable=False)
    followup_type = Column(String, nullable=False)
    
    # Content used
    subject_used = Column(Text)
    content_used = Column(Text)
    personalization_data = Column(JSON)
    variant_used = Column(String)
    
    # AI analysis
    ai_generated_content = Column(Boolean, default=False)
    sentiment_before = Column(String)
    sentiment_after = Column(String)
    predicted_response_probability = Column(Float)
    
    # Results
    status = Column(String, default="pending")  # pending, sent, delivered, opened, responded, failed
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    responded_at = Column(DateTime)
    
    # Response analysis
    response_content = Column(Text)
    response_sentiment = Column(String)
    response_intent = Column(String)
    ai_response_analysis = Column(JSON)
    
    # Success metrics
    engagement_score = Column(Float)
    conversion_probability = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    execution = relationship("FollowUpExecution", back_populates="step_executions")
    step = relationship("FollowUpStep", back_populates="executions")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    
    id = Column(String, primary_key=True)
    customer_id = Column(String, nullable=False, unique=True)
    
    # AI-derived insights
    personality_type = Column(String)  # PersonalityType enum
    communication_style = Column(String)  # CommunicationStyle enum
    preferred_contact_method = Column(String)
    preferred_contact_time = Column(String)
    
    # Behavioral data
    avg_response_time_hours = Column(Float)
    response_rate = Column(Float)
    engagement_level = Column(String)  # high, medium, low
    
    # Preferences
    content_preferences = Column(JSON)  # What type of content they engage with
    channel_preferences = Column(JSON)  # Preferred communication channels
    timing_preferences = Column(JSON)   # When they're most responsive
    
    # Interests and segments
    interests = Column(JSON)
    tour_preferences = Column(JSON)
    budget_segment = Column(String)
    
    # Sentiment history
    avg_sentiment_score = Column(Float)
    sentiment_trend = Column(String)  # improving, stable, declining
    
    # Lifecycle data
    customer_stage = Column(String)
    lifetime_value = Column(Float)
    churn_risk = Column(Float)
    
    # AI model scores
    conversion_probability = Column(Float)
    upsell_probability = Column(Float)
    referral_likelihood = Column(Float)
    
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

# Pydantic Models
class FollowUpRequest(BaseModel):
    customer_id: str
    lead_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    sequence_name: Optional[str] = None
    trigger_event: str
    context_data: Optional[Dict[str, Any]] = {}

class ContentGenerationRequest(BaseModel):
    customer_id: str
    followup_type: FollowUpType
    stage: FollowUpStage
    context: Dict[str, Any]
    personality_type: Optional[PersonalityType] = None
    communication_style: Optional[CommunicationStyle] = None
    previous_interactions: Optional[List[Dict[str, Any]]] = []

# AI Models and Components
class AIContentGenerator:
    """AI-powered content generation for personalized follow-ups"""
    
    def __init__(self, openai_api_key: str):
        openai.api_key = openai_api_key
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        
        # Load pre-trained models
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            self.nlp = None
        
        # Personality and intent classifiers
        self.personality_classifier = None
        self.intent_classifier = None
        
        # Template engine
        self.template_env = Environment(loader=FileSystemLoader('templates'))
    
    async def generate_personalized_content(self, request: ContentGenerationRequest) -> Dict[str, Any]:
        """Generate personalized follow-up content using AI"""
        
        # Analyze customer context
        customer_analysis = await self._analyze_customer_context(request)
        
        # Generate content based on type
        if request.followup_type == FollowUpType.EMAIL:
            content = await self._generate_email_content(request, customer_analysis)
        elif request.followup_type == FollowUpType.SMS:
            content = await self._generate_sms_content(request, customer_analysis)
        elif request.followup_type == FollowUpType.PHONE_CALL:
            content = await self._generate_call_script(request, customer_analysis)
        elif request.followup_type == FollowUpType.WHATSAPP:
            content = await self._generate_whatsapp_content(request, customer_analysis)
        else:
            content = await self._generate_generic_content(request, customer_analysis)
        
        return {
            'content': content,
            'customer_analysis': customer_analysis,
            'personalization_score': self._calculate_personalization_score(content, customer_analysis),
            'predicted_engagement': self._predict_engagement(content, customer_analysis)
        }
    
    async def _analyze_customer_context(self, request: ContentGenerationRequest) -> Dict[str, Any]:
        """Analyze customer context for personalization"""
        
        analysis = {
            'personality_type': request.personality_type.value if request.personality_type else 'unknown',
            'communication_style': request.communication_style.value if request.communication_style else 'professional',
            'interests': request.context.get('interests', []),
            'previous_sentiment': 'neutral',
            'engagement_level': 'medium',
            'preferred_tone': 'friendly'
        }
        
        # Analyze previous interactions
        if request.previous_interactions:
            sentiments = []
            for interaction in request.previous_interactions[-5:]:  # Last 5 interactions
                if interaction.get('content'):
                    sentiment = self.sentiment_analyzer.polarity_scores(interaction['content'])
                    sentiments.append(sentiment['compound'])
            
            if sentiments:
                avg_sentiment = np.mean(sentiments)
                if avg_sentiment > 0.3:
                    analysis['previous_sentiment'] = 'positive'
                elif avg_sentiment < -0.3:
                    analysis['previous_sentiment'] = 'negative'
                else:
                    analysis['previous_sentiment'] = 'neutral'
        
        # Determine engagement level
        response_rate = request.context.get('response_rate', 0.5)
        if response_rate > 0.7:
            analysis['engagement_level'] = 'high'
        elif response_rate < 0.3:
            analysis['engagement_level'] = 'low'
        
        # Set tone based on personality and sentiment
        if analysis['personality_type'] == 'analytical':
            analysis['preferred_tone'] = 'professional'
        elif analysis['personality_type'] == 'expressive':
            analysis['preferred_tone'] = 'enthusiastic'
        elif analysis['personality_type'] == 'amiable':
            analysis['preferred_tone'] = 'friendly'
        elif analysis['personality_type'] == 'driver':
            analysis['preferred_tone'] = 'direct'
        
        return analysis
    
    async def _generate_email_content(self, request: ContentGenerationRequest, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate personalized email content"""
        
        # Create prompt for GPT
        prompt = f"""
        Generate a personalized follow-up email for a Spirit Tours customer with the following context:
        
        Customer Profile:
        - Personality Type: {analysis['personality_type']}
        - Communication Style: {analysis['communication_style']}
        - Previous Sentiment: {analysis['previous_sentiment']}
        - Engagement Level: {analysis['engagement_level']}
        - Preferred Tone: {analysis['preferred_tone']}
        
        Follow-up Context:
        - Stage: {request.stage.value}
        - Interests: {', '.join(analysis['interests']) if analysis['interests'] else 'General tours'}
        - Previous Interactions: {len(request.previous_interactions)} interactions
        
        Additional Context: {json.dumps(request.context)}
        
        Requirements:
        1. Write subject line and email body
        2. Match the customer's personality and communication style
        3. Address their interests and previous interactions
        4. Include a clear call-to-action
        5. Keep it concise and engaging
        6. Use Spanish if customer preference is Spanish, otherwise English
        
        Format as JSON with 'subject' and 'body' keys.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert copywriter for Spirit Tours, specializing in personalized travel sales communications."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            content_text = response.choices[0].message.content
            
            # Parse JSON response
            try:
                content = json.loads(content_text)
            except:
                # Fallback if JSON parsing fails
                content = {
                    'subject': 'Your Spirit Tours Adventure Awaits',
                    'body': content_text
                }
            
            return content
            
        except Exception as e:
            # Fallback to template-based generation
            return await self._generate_template_email(request, analysis)
    
    async def _generate_template_email(self, request: ContentGenerationRequest, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Fallback template-based email generation"""
        
        templates = {
            'initial_contact': {
                'subject': '¡Descubre la magia de Perú con Spirit Tours! 🏔️',
                'body': '''Hola {customer_name},

¡Gracias por tu interés en nuestros tours! Me emociona compartir contigo la increíble experiencia que te espera en Perú.

{personalized_recommendation}

¿Te gustaría que conversemos sobre las fechas que mejor te funcionen? Estoy aquí para ayudarte a planear el viaje de tus sueños.

¡Saludos aventureros!
{agent_name}
Spirit Tours
'''
            },
            'interest_nurturing': {
                'subject': 'Más detalles sobre tu aventura peruana 🇵🇪',
                'body': '''Hola {customer_name},

Siguiendo nuestra conversación anterior, quería compartirte algunos detalles adicionales sobre {tour_interest}.

{detailed_information}

¿Hay alguna pregunta específica que te gustaría que respondamos? Estoy aquí para asegurarme de que tengas toda la información que necesitas.

¡Esperamos verte pronto en esta increíble aventura!
{agent_name}
'''
            }
        }
        
        template_key = request.stage.value
        if template_key not in templates:
            template_key = 'initial_contact'
        
        template = templates[template_key]
        
        # Personalize template
        subject = template['subject']
        body = template['body'].format(
            customer_name=request.context.get('customer_name', 'Estimado viajero'),
            agent_name=request.context.get('agent_name', 'Equipo Spirit Tours'),
            tour_interest=', '.join(analysis['interests']) if analysis['interests'] else 'nuestros tours',
            personalized_recommendation=self._get_tour_recommendation(analysis['interests']),
            detailed_information=self._get_detailed_tour_info(analysis['interests'])
        )
        
        return {'subject': subject, 'body': body}
    
    async def _generate_sms_content(self, request: ContentGenerationRequest, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate personalized SMS content"""
        
        sms_templates = {
            'initial_contact': f"¡Hola! Soy {request.context.get('agent_name', 'Ana')} de Spirit Tours. Vi tu interés en {', '.join(analysis['interests']) if analysis['interests'] else 'nuestros tours'}. ¿Tienes unos minutos para conversar sobre fechas disponibles? 😊",
            'reminder': f"Hola! Te escribo para recordarte sobre {', '.join(analysis['interests']) if analysis['interests'] else 'tu consulta de tour'}. ¿Seguimos conversando? Tengo algunas fechas excelentes disponibles! 🏔️",
            'offer': f"¡Oferta especial! {request.context.get('offer_details', '15% descuento')} en {', '.join(analysis['interests']) if analysis['interests'] else 'tours seleccionados'}. Válido hasta {request.context.get('offer_expiry', 'este viernes')}. ¿Conversamos? 🎉"
        }
        
        stage_key = request.stage.value
        if stage_key not in sms_templates:
            stage_key = 'initial_contact'
        
        content = sms_templates[stage_key]
        
        return {'message': content}
    
    async def _generate_call_script(self, request: ContentGenerationRequest, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate personalized call script"""
        
        script_sections = {
            'opening': f"Hola, ¿hablo con {request.context.get('customer_name')}? Soy {request.context.get('agent_name', 'Ana')} de Spirit Tours. Te llamo porque vi tu interés en {', '.join(analysis['interests']) if analysis['interests'] else 'nuestros tours peruanos'}.",
            
            'value_proposition': self._get_value_proposition(analysis['personality_type'], analysis['interests']),
            
            'discovery_questions': [
                "¿Qué te motivó a considerar un tour por Perú?",
                "¿Has viajado antes a Sudamérica?",
                "¿Tienes fechas específicas en mente?",
                "¿Cuántas personas serían en el grupo?"
            ],
            
            'objection_handling': {
                'price': "Entiendo tu preocupación por el precio. Te aseguro que nuestros tours incluyen todo lo necesario para una experiencia completa y sin sorpresas.",
                'time': "Si el tiempo es una limitación, tenemos opciones desde 3 días hasta 2 semanas. Podemos adaptar la experiencia a tu agenda.",
                'safety': "La seguridad es nuestra prioridad número uno. Todos nuestros guías están certificados y seguimos protocolos estrictos."
            },
            
            'closing': "Basándome en lo que me comentas, creo que {recommended_tour} sería perfecto para ti. ¿Te gustaría que te envíe información detallada por email?"
        }
        
        return script_sections
    
    async def _generate_whatsapp_content(self, request: ContentGenerationRequest, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate personalized WhatsApp content"""
        
        # WhatsApp tends to be more casual and emoji-friendly
        whatsapp_templates = {
            'initial_contact': f"¡Hola! 👋 Soy {request.context.get('agent_name', 'Ana')} de Spirit Tours. Vi que estás interesado en {', '.join(analysis['interests']) if analysis['interests'] else 'conocer Perú'} 🏔️ ¿Tienes unos minutos para conversar?",
            
            'follow_up': f"¡Hola de nuevo! 😊 ¿Ya pensaste en las fechas para tu aventura en {', '.join(analysis['interests']) if analysis['interests'] else 'Perú'}? Tengo algunas opciones increíbles para mostrarte 📅",
            
            'urgency': f"🚨 ¡Últimas plazas disponibles! Para {', '.join(analysis['interests']) if analysis['interests'] else 'Machu Picchu')} en {request.context.get('dates', 'las próximas fechas')}. ¿Conversamos ahora? ⏰"
        }
        
        stage_key = request.stage.value if request.stage.value in whatsapp_templates else 'initial_contact'
        
        return {'message': whatsapp_templates[stage_key]}
    
    async def _generate_generic_content(self, request: ContentGenerationRequest, analysis: Dict[str, Any]) -> Dict[str, str]:
        """Generate generic content for other channels"""
        
        return {
            'content': f"Seguimiento personalizado sobre {', '.join(analysis['interests']) if analysis['interests'] else 'tu interés en Spirit Tours'}. Contacta con nosotros para más información."
        }
    
    def _get_tour_recommendation(self, interests: List[str]) -> str:
        """Get personalized tour recommendation based on interests"""
        
        recommendations = {
            'machu picchu': 'Te recomiendo especialmente nuestro tour de 4 días/3 noches a Machu Picchu, que incluye el Valle Sagrado y una experiencia única en tren panorámico.',
            'adventure': 'Para los aventureros como tú, el Camino Inca de 4 días es una experiencia transformadora que combina historia, naturaleza y desafío personal.',
            'culture': 'Nuestro tour cultural de Lima y Cusco te permitirá sumergirte en la rica historia peruana, desde épocas precolombinas hasta la colonial.',
            'nature': 'El tour de la Amazonía peruana es perfecto para conectar con la naturaleza más pura, con avistamiento de fauna única y experiencias auténticas.'
        }
        
        for interest in interests:
            for key, recommendation in recommendations.items():
                if key in interest.lower():
                    return recommendation
        
        return 'Tenemos varios tours que se adaptan perfectamente a tus intereses. Te ayudo a encontrar el ideal para ti.'
    
    def _get_detailed_tour_info(self, interests: List[str]) -> str:
        """Get detailed tour information based on interests"""
        
        if not interests:
            return 'Nuestros tours incluyen guías expertos, transporte cómodo, alojamiento seleccionado y todas las entradas necesarias.'
        
        info_map = {
            'machu picchu': '• Tren panorámico Vistadome\n• Guía experto en historia inca\n• Entrada sin filas a Machu Picchu\n• Alojamiento 4* en Aguas Calientes',
            'adventure': '• Equipo de campamento profesional\n• Guías especializados en montaña\n• Permisos limitados incluidos\n• Seguro de aventura completo',
            'culture': '• Acceso exclusivo a sitios arqueológicos\n• Experiencias gastronómicas auténticas\n• Talleres artesanales tradicionales\n• Guías historiadores locales'
        }
        
        for interest in interests:
            for key, info in info_map.items():
                if key in interest.lower():
                    return info
        
        return 'Incluye todo lo necesario para una experiencia completa y memorable, sin sorpresas ni costos adicionales.'
    
    def _get_value_proposition(self, personality_type: str, interests: List[str]) -> str:
        """Get value proposition based on personality type"""
        
        value_props = {
            'analytical': 'Spirit Tours se destaca por nuestra planificación meticulosa, guías certificados con amplio conocimiento histórico, y un record de seguridad del 99.8% en nuestros tours.',
            'driver': 'Con Spirit Tours obtienes resultados: experiencias auténticas, itinerarios optimizados y el mejor valor por tu inversión. Sin complicaciones, solo aventuras memorables.',
            'expressive': '¡Spirit Tours te conecta con la magia de Perú! Nuestros tours no solo visitan lugares, crean historias que contarás toda la vida. ¡Imagínate compartiendo tu aventura en Machu Picchu!',
            'amiable': 'En Spirit Tours nos importas tú. Nuestro equipo está contigo desde el primer contacto hasta tu regreso a casa. Somos más que una agencia, somos tus compañeros de aventura.'
        }
        
        return value_props.get(personality_type, value_props['amiable'])
    
    def _calculate_personalization_score(self, content: Dict[str, str], analysis: Dict[str, Any]) -> float:
        """Calculate how personalized the content is"""
        
        score = 0.5  # Base score
        
        # Check for personal elements
        content_text = json.dumps(content).lower()
        
        # Interest mentions
        for interest in analysis.get('interests', []):
            if interest.lower() in content_text:
                score += 0.1
        
        # Personality adaptation
        if analysis['personality_type'] != 'unknown':
            score += 0.1
        
        # Communication style adaptation
        if analysis['communication_style'] != 'professional':
            score += 0.1
        
        # Sentiment consideration
        if analysis['previous_sentiment'] != 'neutral':
            score += 0.1
        
        return min(score, 1.0)
    
    def _predict_engagement(self, content: Dict[str, str], analysis: Dict[str, Any]) -> float:
        """Predict engagement probability for the content"""
        
        # Simple heuristic-based prediction (in production, use trained ML model)
        base_probability = 0.3
        
        # Adjust based on engagement level
        engagement_multiplier = {
            'high': 1.5,
            'medium': 1.0,
            'low': 0.7
        }
        
        probability = base_probability * engagement_multiplier.get(analysis['engagement_level'], 1.0)
        
        # Adjust for sentiment
        if analysis['previous_sentiment'] == 'positive':
            probability *= 1.2
        elif analysis['previous_sentiment'] == 'negative':
            probability *= 0.8
        
        return min(probability, 0.95)

class CustomerIntentPredictor:
    """ML model to predict customer intent and behavior"""
    
    def __init__(self):
        self.intent_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.personality_model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        self.engagement_model = RandomForestClassifier(n_estimators=50, random_state=42)
        
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.scaler = StandardScaler()
        
        self.is_trained = False
    
    async def train_models(self, training_data: pd.DataFrame):
        """Train the ML models with historical data"""
        
        if training_data.empty:
            return
        
        # Prepare features
        features = self._extract_features(training_data)
        
        # Train intent prediction model
        if 'customer_intent' in training_data.columns:
            intent_labels = LabelEncoder().fit_transform(training_data['customer_intent'])
            self.intent_model.fit(features, intent_labels)
        
        # Train personality type model
        if 'personality_type' in training_data.columns:
            personality_labels = LabelEncoder().fit_transform(training_data['personality_type'])
            self.personality_model.fit(features, personality_labels)
        
        # Train engagement model
        if 'engagement_level' in training_data.columns:
            engagement_labels = LabelEncoder().fit_transform(training_data['engagement_level'])
            self.engagement_model.fit(features, engagement_labels)
        
        self.is_trained = True
    
    def _extract_features(self, data: pd.DataFrame) -> np.ndarray:
        """Extract features from customer data"""
        
        feature_columns = [
            'response_rate', 'avg_response_time', 'total_interactions',
            'positive_responses', 'sentiment_score', 'engagement_score'
        ]
        
        # Fill missing values
        features_df = data[feature_columns].fillna(0)
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features_df)
        
        return features_scaled
    
    async def predict_customer_intent(self, customer_data: Dict[str, Any]) -> str:
        """Predict customer intent based on behavior"""
        
        if not self.is_trained:
            return CustomerIntent.MODERATELY_INTERESTED.value
        
        # Extract features from customer data
        features = self._prepare_customer_features(customer_data)
        
        # Predict intent
        intent_prediction = self.intent_model.predict([features])[0]
        
        # Map back to enum (simplified)
        intent_mapping = {
            0: CustomerIntent.NOT_READY.value,
            1: CustomerIntent.INFORMATION_GATHERING.value,
            2: CustomerIntent.MODERATELY_INTERESTED.value,
            3: CustomerIntent.HIGHLY_INTERESTED.value,
            4: CustomerIntent.READY_TO_BUY.value
        }
        
        return intent_mapping.get(intent_prediction, CustomerIntent.MODERATELY_INTERESTED.value)
    
    async def predict_personality_type(self, customer_data: Dict[str, Any]) -> str:
        """Predict customer personality type"""
        
        if not self.is_trained:
            return PersonalityType.AMIABLE.value
        
        features = self._prepare_customer_features(customer_data)
        personality_prediction = self.personality_model.predict([features])[0]
        
        # Map back to enum (simplified)
        personality_mapping = {
            0: PersonalityType.ANALYTICAL.value,
            1: PersonalityType.DRIVER.value,
            2: PersonalityType.EXPRESSIVE.value,
            3: PersonalityType.AMIABLE.value
        }
        
        return personality_mapping.get(personality_prediction, PersonalityType.AMIABLE.value)
    
    def _prepare_customer_features(self, customer_data: Dict[str, Any]) -> np.ndarray:
        """Prepare features for a single customer"""
        
        features = [
            customer_data.get('response_rate', 0.5),
            customer_data.get('avg_response_time', 24),
            customer_data.get('total_interactions', 1),
            customer_data.get('positive_responses', 0),
            customer_data.get('sentiment_score', 0.0),
            customer_data.get('engagement_score', 0.5)
        ]
        
        return np.array(features)

# Main AI Follow-up Automation System
class AIFollowUpAutomationSystem:
    """
    Comprehensive AI-powered follow-up automation system
    Handles intelligent follow-up sequences with machine learning and NLP
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379", openai_api_key: str = None):
        self.database_url = database_url
        self.redis_url = redis_url
        self.openai_api_key = openai_api_key
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # AI components
        self.content_generator = AIContentGenerator(openai_api_key) if openai_api_key else None
        self.intent_predictor = CustomerIntentPredictor()
        
        # Celery for background processing
        self.celery_app = Celery('followup_automation')
        
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
        
        # Setup default sequences
        await self._setup_default_sequences()
        
        # Train ML models with existing data
        await self._initialize_ml_models()
    
    async def start_followup_sequence(self, request: FollowUpRequest) -> str:
        """Start an AI-powered follow-up sequence for a customer"""
        
        execution_id = self._generate_id()
        
        # Get customer profile or create one
        customer_profile = await self._get_or_create_customer_profile(request.customer_id)
        
        # Select appropriate sequence
        sequence = await self._select_optimal_sequence(request, customer_profile)
        
        if not sequence:
            self.logger.warning(f"No suitable sequence found for customer {request.customer_id}")
            return None
        
        # Create execution record
        async with self.session_factory() as session:
            execution = FollowUpExecution(
                id=execution_id,
                sequence_id=sequence['id'],
                customer_id=request.customer_id,
                lead_id=request.lead_id,
                opportunity_id=request.opportunity_id,
                predicted_intent=customer_profile['predicted_intent'],
                sentiment_score=customer_profile['sentiment_score'],
                personality_type=customer_profile['personality_type'],
                communication_style=customer_profile['communication_style'],
                next_step_at=datetime.utcnow() + timedelta(hours=1)  # First step in 1 hour
            )
            
            session.add(execution)
            await session.commit()
        
        # Schedule first step
        await self._schedule_next_step(execution_id)
        
        self.logger.info(f"Started follow-up sequence {sequence['name']} for customer {request.customer_id}")
        return execution_id
    
    async def process_customer_response(self, customer_id: str, response_content: str, interaction_type: str) -> Dict[str, Any]:
        """Process and analyze customer response to update follow-up strategy"""
        
        # Analyze response sentiment and intent
        sentiment_analysis = await self._analyze_response_sentiment(response_content)
        intent_analysis = await self._analyze_response_intent(response_content, customer_id)
        
        # Update customer profile
        await self._update_customer_profile_from_response(customer_id, sentiment_analysis, intent_analysis)
        
        # Get active follow-up executions
        active_executions = await self._get_active_executions(customer_id)
        
        # Adjust follow-up strategy based on response
        adjustments = []
        for execution in active_executions:
            adjustment = await self._adjust_followup_strategy(execution, sentiment_analysis, intent_analysis)
            if adjustment:
                adjustments.append(adjustment)
        
        return {
            'sentiment_analysis': sentiment_analysis,
            'intent_analysis': intent_analysis,
            'strategy_adjustments': adjustments,
            'next_recommended_action': await self._recommend_next_action(customer_id, sentiment_analysis, intent_analysis)
        }
    
    async def execute_followup_step(self, execution_id: str) -> Dict[str, Any]:
        """Execute a specific follow-up step"""
        
        async with self.session_factory() as session:
            # Get execution details
            execution_result = await session.execute(
                "SELECT * FROM followup_executions WHERE id = :id",
                {'id': execution_id}
            )
            execution = execution_result.first()
            
            if not execution or execution.status != 'active':
                return {'status': 'error', 'message': 'Execution not found or not active'}
            
            # Get current step
            step_result = await session.execute("""
                SELECT * FROM followup_steps 
                WHERE sequence_id = :sequence_id AND step_number = :step_number
            """, {
                'sequence_id': execution.sequence_id,
                'step_number': execution.current_step
            })
            step = step_result.first()
            
            if not step:
                # Sequence completed
                await self._complete_execution(execution_id, 'completed')
                return {'status': 'completed', 'message': 'Follow-up sequence completed'}
            
            # Get customer profile
            customer_profile = await self._get_customer_profile(execution.customer_id)
            
            # Generate personalized content
            if self.content_generator and step.ai_content_generation:
                content_request = ContentGenerationRequest(
                    customer_id=execution.customer_id,
                    followup_type=FollowUpType(step.followup_type),
                    stage=FollowUpStage.INTEREST_NURTURING,  # Default stage
                    context={
                        'customer_name': customer_profile.get('customer_name', ''),
                        'agent_name': 'Equipo Spirit Tours',
                        'interests': customer_profile.get('interests', []),
                        'lead_id': execution.lead_id,
                        'opportunity_id': execution.opportunity_id
                    },
                    personality_type=PersonalityType(customer_profile.get('personality_type', 'amiable')),
                    communication_style=CommunicationStyle(customer_profile.get('communication_style', 'friendly'))
                )
                
                content_result = await self.content_generator.generate_personalized_content(content_request)
                content = content_result['content']
                ai_generated = True
            else:
                # Use template content
                content = await self._generate_template_content(step, customer_profile)
                ai_generated = False
            
            # Create step execution record
            step_execution_id = self._generate_id()
            step_execution = FollowUpStepExecution(
                id=step_execution_id,
                execution_id=execution_id,
                step_id=step.id,
                step_number=step.step_number,
                followup_type=step.followup_type,
                subject_used=content.get('subject', ''),
                content_used=content.get('body', content.get('message', content.get('content', ''))),
                ai_generated_content=ai_generated,
                sentiment_before=execution.sentiment_score,
                predicted_response_probability=0.5,  # Default prediction
                status='pending'
            )
            
            session.add(step_execution)
            await session.commit()
            
            # Execute the step (send email, SMS, etc.)
            delivery_result = await self._deliver_followup(step, content, customer_profile)
            
            # Update step execution with delivery results
            await session.execute("""
                UPDATE followup_step_executions 
                SET status = :status, sent_at = :sent_at
                WHERE id = :id
            """, {
                'id': step_execution_id,
                'status': 'sent' if delivery_result['success'] else 'failed',
                'sent_at': datetime.utcnow() if delivery_result['success'] else None
            })
            
            # Update execution for next step
            next_step_delay = step.delay_hours or 24
            await session.execute("""
                UPDATE followup_executions 
                SET current_step = :next_step,
                    steps_completed = steps_completed + 1,
                    last_interaction_at = :now,
                    next_step_at = :next_step_at,
                    total_interactions = total_interactions + 1
                WHERE id = :id
            """, {
                'id': execution_id,
                'next_step': execution.current_step + 1,
                'now': datetime.utcnow(),
                'next_step_at': datetime.utcnow() + timedelta(hours=next_step_delay)
            })
            
            await session.commit()
            
            # Schedule next step
            await self._schedule_next_step(execution_id, delay_hours=next_step_delay)
            
            return {
                'status': 'success',
                'step_executed': step.step_number,
                'followup_type': step.followup_type,
                'content_generated': ai_generated,
                'delivery_result': delivery_result,
                'next_step_scheduled': datetime.utcnow() + timedelta(hours=next_step_delay)
            }
    
    async def get_followup_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get follow-up automation analytics"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Overall metrics
            total_executions = await session.execute("""
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                       COUNT(CASE WHEN outcome = 'conversion' THEN 1 END) as conversions,
                       AVG(response_rate) as avg_response_rate,
                       AVG(steps_completed) as avg_steps_completed
                FROM followup_executions
                WHERE created_at >= :start_date
            """, {'start_date': start_date})
            
            # By sequence performance
            sequence_performance = await session.execute("""
                SELECT fs.name as sequence_name,
                       COUNT(fe.id) as executions,
                       AVG(fe.response_rate) as avg_response_rate,
                       COUNT(CASE WHEN fe.outcome = 'conversion' THEN 1 END) as conversions,
                       AVG(fe.steps_completed) as avg_steps
                FROM followup_executions fe
                JOIN followup_sequences fs ON fe.sequence_id = fs.id
                WHERE fe.created_at >= :start_date
                GROUP BY fs.id, fs.name
            """, {'start_date': start_date})
            
            # By step performance
            step_performance = await session.execute("""
                SELECT fse.followup_type,
                       COUNT(*) as total_steps,
                       COUNT(CASE WHEN fse.status = 'sent' THEN 1 END) as sent,
                       COUNT(CASE WHEN fse.responded_at IS NOT NULL THEN 1 END) as responses,
                       AVG(fse.engagement_score) as avg_engagement
                FROM followup_step_executions fse
                WHERE fse.created_at >= :start_date
                GROUP BY fse.followup_type
            """, {'start_date': start_date})
            
            # AI performance
            ai_performance = await session.execute("""
                SELECT 
                    COUNT(CASE WHEN ai_generated_content = true THEN 1 END) as ai_generated,
                    COUNT(CASE WHEN ai_generated_content = false THEN 1 END) as template_based,
                    AVG(CASE WHEN ai_generated_content = true THEN engagement_score END) as ai_avg_engagement,
                    AVG(CASE WHEN ai_generated_content = false THEN engagement_score END) as template_avg_engagement
                FROM followup_step_executions
                WHERE created_at >= :start_date
            """, {'start_date': start_date})
            
            overall = total_executions.first()
            
            return {
                'period_days': days,
                'overall': {
                    'total_executions': overall.total if overall else 0,
                    'completed_executions': overall.completed if overall else 0,
                    'conversion_rate': (overall.conversions / overall.total * 100) if overall and overall.total > 0 else 0,
                    'avg_response_rate': float(overall.avg_response_rate) if overall and overall.avg_response_rate else 0,
                    'avg_steps_per_execution': float(overall.avg_steps_completed) if overall and overall.avg_steps_completed else 0
                },
                'sequence_performance': [dict(row) for row in sequence_performance],
                'step_performance': [dict(row) for row in step_performance],
                'ai_performance': dict(ai_performance.first()) if ai_performance.first() else {},
                'generated_at': datetime.utcnow().isoformat()
            }
    
    # Helper methods
    def _generate_id(self) -> str:
        """Generate unique ID"""
        import uuid
        return str(uuid.uuid4())
    
    async def _get_or_create_customer_profile(self, customer_id: str) -> Dict[str, Any]:
        """Get or create customer profile with AI insights"""
        
        async with self.session_factory() as session:
            result = await session.execute(
                "SELECT * FROM customer_profiles WHERE customer_id = :id",
                {'id': customer_id}
            )
            profile = result.first()
            
            if profile:
                return dict(profile)
            else:
                # Create new profile with AI predictions
                if self.intent_predictor.is_trained:
                    predicted_intent = await self.intent_predictor.predict_customer_intent({
                        'response_rate': 0.5,
                        'avg_response_time': 24,
                        'total_interactions': 1,
                        'positive_responses': 0,
                        'sentiment_score': 0.0,
                        'engagement_score': 0.5
                    })
                    
                    predicted_personality = await self.intent_predictor.predict_personality_type({
                        'response_rate': 0.5,
                        'avg_response_time': 24,
                        'total_interactions': 1,
                        'positive_responses': 0,
                        'sentiment_score': 0.0,
                        'engagement_score': 0.5
                    })
                else:
                    predicted_intent = CustomerIntent.MODERATELY_INTERESTED.value
                    predicted_personality = PersonalityType.AMIABLE.value
                
                new_profile = CustomerProfile(
                    id=self._generate_id(),
                    customer_id=customer_id,
                    personality_type=predicted_personality,
                    communication_style=CommunicationStyle.FRIENDLY.value,
                    preferred_contact_method=FollowUpType.EMAIL.value,
                    avg_response_time_hours=24.0,
                    response_rate=0.5,
                    engagement_level='medium',
                    avg_sentiment_score=0.0,
                    conversion_probability=0.3,
                    content_preferences=[],
                    channel_preferences=[],
                    timing_preferences={}
                )
                
                session.add(new_profile)
                await session.commit()
                
                return {
                    'customer_id': customer_id,
                    'personality_type': predicted_personality,
                    'communication_style': CommunicationStyle.FRIENDLY.value,
                    'predicted_intent': predicted_intent,
                    'sentiment_score': SentimentScore.NEUTRAL.value,
                    'engagement_level': 'medium',
                    'interests': [],
                    'customer_name': ''
                }
    
    async def _select_optimal_sequence(self, request: FollowUpRequest, customer_profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Select the most appropriate follow-up sequence"""
        
        async with self.session_factory() as session:
            # Get all active sequences
            result = await session.execute(
                "SELECT * FROM followup_sequences WHERE is_active = true"
            )
            sequences = [dict(row) for row in result]
            
            if not sequences:
                return None
            
            # Score sequences based on customer profile and request
            scored_sequences = []
            
            for sequence in sequences:
                score = 0.0
                
                # Check trigger conditions
                trigger_conditions = sequence.get('trigger_conditions', [])
                for condition in trigger_conditions:
                    if condition.get('event') == request.trigger_event:
                        score += 1.0
                
                # Check target segments
                target_segments = sequence.get('target_segments', [])
                customer_segment = customer_profile.get('engagement_level', 'medium')
                if customer_segment in target_segments:
                    score += 0.5
                
                # Consider success rate
                success_rate = sequence.get('success_rate', 0.0)
                score += success_rate * 0.3
                
                scored_sequences.append((sequence, score))
            
            # Select highest scoring sequence
            if scored_sequences:
                scored_sequences.sort(key=lambda x: x[1], reverse=True)
                return scored_sequences[0][0]
            
            return sequences[0] if sequences else None
    
    async def _schedule_next_step(self, execution_id: str, delay_hours: int = 1):
        """Schedule the next follow-up step"""
        
        # Add to Redis queue with delay
        execute_at = datetime.utcnow() + timedelta(hours=delay_hours)
        
        await self.redis_client.zadd(
            "scheduled_followups",
            {execution_id: execute_at.timestamp()}
        )
        
        self.logger.info(f"Scheduled next step for execution {execution_id} at {execute_at}")
    
    async def _analyze_response_sentiment(self, response_content: str) -> Dict[str, Any]:
        """Analyze sentiment of customer response"""
        
        if not self.content_generator:
            return {'sentiment': 'neutral', 'confidence': 0.5}
        
        # Use NLTK VADER sentiment analyzer
        sentiment_scores = self.content_generator.sentiment_analyzer.polarity_scores(response_content)
        
        # Determine sentiment category
        compound = sentiment_scores['compound']
        if compound >= 0.5:
            sentiment = SentimentScore.VERY_POSITIVE.value
        elif compound >= 0.1:
            sentiment = SentimentScore.POSITIVE.value
        elif compound <= -0.5:
            sentiment = SentimentScore.VERY_NEGATIVE.value
        elif compound <= -0.1:
            sentiment = SentimentScore.NEGATIVE.value
        else:
            sentiment = SentimentScore.NEUTRAL.value
        
        return {
            'sentiment': sentiment,
            'confidence': abs(compound),
            'scores': sentiment_scores,
            'keywords': self._extract_sentiment_keywords(response_content)
        }
    
    async def _analyze_response_intent(self, response_content: str, customer_id: str) -> Dict[str, Any]:
        """Analyze customer intent from response"""
        
        # Simple keyword-based intent analysis
        intent_keywords = {
            CustomerIntent.HIGHLY_INTERESTED: ['interested', 'excited', 'love', 'perfect', 'great', 'book', 'reserve'],
            CustomerIntent.READY_TO_BUY: ['buy', 'purchase', 'book now', 'reserve', 'payment', 'credit card'],
            CustomerIntent.PRICE_SHOPPING: ['price', 'cost', 'expensive', 'cheap', 'discount', 'comparison'],
            CustomerIntent.OBJECTION_RAISED: ['but', 'however', 'concern', 'worried', 'problem', 'issue'],
            CustomerIntent.NOT_READY: ['later', 'maybe', 'think about', 'not sure', 'not ready']
        }
        
        response_lower = response_content.lower()
        intent_scores = {}
        
        for intent, keywords in intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in response_lower)
            if score > 0:
                intent_scores[intent.value] = score
        
        # Determine primary intent
        if intent_scores:
            primary_intent = max(intent_scores.items(), key=lambda x: x[1])[0]
        else:
            primary_intent = CustomerIntent.INFORMATION_GATHERING.value
        
        return {
            'primary_intent': primary_intent,
            'intent_scores': intent_scores,
            'confidence': max(intent_scores.values()) / len(response_content.split()) if intent_scores else 0.1
        }
    
    def _extract_sentiment_keywords(self, text: str) -> List[str]:
        """Extract sentiment-bearing keywords from text"""
        
        positive_keywords = ['love', 'great', 'awesome', 'perfect', 'amazing', 'excited', 'interested']
        negative_keywords = ['hate', 'terrible', 'awful', 'bad', 'worried', 'concerned', 'expensive']
        
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in positive_keywords + negative_keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)
        
        return found_keywords
    
    async def _setup_default_sequences(self):
        """Setup default follow-up sequences"""
        
        default_sequences = [
            {
                'name': 'New Lead Nurturing',
                'description': 'Standard follow-up sequence for new leads',
                'trigger_conditions': [{'event': 'lead_created'}],
                'target_segments': ['cold', 'warm'],
                'max_attempts': 5,
                'steps': [
                    {
                        'step_number': 1,
                        'name': 'Welcome Email',
                        'followup_type': 'email',
                        'delay_hours': 1,
                        'ai_content_generation': True
                    },
                    {
                        'step_number': 2,
                        'name': 'Follow-up SMS',
                        'followup_type': 'sms',
                        'delay_hours': 48,
                        'ai_content_generation': True
                    },
                    {
                        'step_number': 3,
                        'name': 'Phone Call',
                        'followup_type': 'phone_call',
                        'delay_hours': 120,
                        'ai_content_generation': False
                    }
                ]
            }
        ]
        
        async with self.session_factory() as session:
            for seq_data in default_sequences:
                # Check if sequence already exists
                existing = await session.execute(
                    "SELECT id FROM followup_sequences WHERE name = :name",
                    {'name': seq_data['name']}
                )
                
                if not existing.first():
                    sequence_id = self._generate_id()
                    
                    sequence = FollowUpSequence(
                        id=sequence_id,
                        name=seq_data['name'],
                        description=seq_data['description'],
                        trigger_conditions=seq_data['trigger_conditions'],
                        target_segments=seq_data['target_segments'],
                        max_attempts=seq_data['max_attempts']
                    )
                    
                    session.add(sequence)
                    
                    # Add steps
                    for step_data in seq_data['steps']:
                        step = FollowUpStep(
                            id=self._generate_id(),
                            sequence_id=sequence_id,
                            step_number=step_data['step_number'],
                            name=step_data['name'],
                            followup_type=step_data['followup_type'],
                            delay_hours=step_data['delay_hours'],
                            ai_content_generation=step_data['ai_content_generation']
                        )
                        session.add(step)
                    
                    await session.commit()
    
    async def _initialize_ml_models(self):
        """Initialize ML models with existing data"""
        
        async with self.session_factory() as session:
            # Get historical data for training
            result = await session.execute("""
                SELECT fe.customer_id, fe.predicted_intent, fe.personality_type,
                       fe.response_rate, fe.total_interactions, fe.positive_responses,
                       cp.avg_sentiment_score, cp.engagement_level
                FROM followup_executions fe
                LEFT JOIN customer_profiles cp ON fe.customer_id = cp.customer_id
                WHERE fe.completed_at IS NOT NULL
                LIMIT 1000
            """)
            
            training_data = pd.DataFrame([dict(row) for row in result])
            
            if not training_data.empty:
                await self.intent_predictor.train_models(training_data)
                self.logger.info(f"Trained ML models with {len(training_data)} samples")
    
    async def _get_customer_profile(self, customer_id: str) -> Dict[str, Any]:
        """Get customer profile"""
        
        async with self.session_factory() as session:
            result = await session.execute(
                "SELECT * FROM customer_profiles WHERE customer_id = :id",
                {'id': customer_id}
            )
            profile = result.first()
            
            return dict(profile) if profile else {}
    
    async def _generate_template_content(self, step: Any, customer_profile: Dict[str, Any]) -> Dict[str, str]:
        """Generate content using templates"""
        
        template_content = {
            'subject': f"Seguimiento sobre tu interés en Spirit Tours - Paso {step.step_number}",
            'body': f"Hola! Te escribimos para hacer seguimiento sobre tu interés en nuestros tours. ¿Tienes alguna pregunta que podamos responder?",
            'message': f"Hola! ¿Seguimos conversando sobre tu viaje a Perú? Tenemos ofertas especiales disponibles."
        }
        
        return template_content
    
    async def _deliver_followup(self, step: Any, content: Dict[str, str], customer_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Deliver the follow-up through appropriate channel"""
        
        # This would integrate with your notification system
        # For now, return success simulation
        
        return {
            'success': True,
            'channel': step.followup_type,
            'delivery_time': datetime.utcnow(),
            'message': f"Follow-up delivered via {step.followup_type}"
        }
    
    async def _update_customer_profile_from_response(self, customer_id: str, sentiment_analysis: Dict[str, Any], intent_analysis: Dict[str, Any]):
        """Update customer profile based on response analysis"""
        
        async with self.session_factory() as session:
            await session.execute("""
                UPDATE customer_profiles 
                SET avg_sentiment_score = :sentiment_score,
                    last_updated = :now
                WHERE customer_id = :customer_id
            """, {
                'customer_id': customer_id,
                'sentiment_score': sentiment_analysis['confidence'],
                'now': datetime.utcnow()
            })
            await session.commit()
    
    async def _get_active_executions(self, customer_id: str) -> List[Dict[str, Any]]:
        """Get active follow-up executions for customer"""
        
        async with self.session_factory() as session:
            result = await session.execute(
                "SELECT * FROM followup_executions WHERE customer_id = :id AND status = 'active'",
                {'id': customer_id}
            )
            return [dict(row) for row in result]
    
    async def _adjust_followup_strategy(self, execution: Dict[str, Any], sentiment_analysis: Dict[str, Any], intent_analysis: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Adjust follow-up strategy based on customer response"""
        
        adjustment = None
        
        # If highly negative sentiment, pause sequence
        if sentiment_analysis['sentiment'] == SentimentScore.VERY_NEGATIVE.value:
            adjustment = {
                'action': 'pause_sequence',
                'reason': 'Negative customer sentiment detected',
                'recommended_delay': 72  # hours
            }
        
        # If ready to buy intent, accelerate sequence
        elif intent_analysis['primary_intent'] == CustomerIntent.READY_TO_BUY.value:
            adjustment = {
                'action': 'accelerate_sequence',
                'reason': 'Customer shows buying intent',
                'recommended_delay': 2  # hours
            }
        
        return adjustment
    
    async def _recommend_next_action(self, customer_id: str, sentiment_analysis: Dict[str, Any], intent_analysis: Dict[str, Any]) -> str:
        """Recommend next action based on analysis"""
        
        if intent_analysis['primary_intent'] == CustomerIntent.READY_TO_BUY.value:
            return "immediate_sales_call"
        elif intent_analysis['primary_intent'] == CustomerIntent.OBJECTION_RAISED.value:
            return "send_objection_handling_content"
        elif sentiment_analysis['sentiment'] == SentimentScore.VERY_NEGATIVE.value:
            return "pause_and_escalate_to_manager"
        else:
            return "continue_standard_sequence"
    
    async def _complete_execution(self, execution_id: str, outcome: str):
        """Complete a follow-up execution"""
        
        async with self.session_factory() as session:
            await session.execute("""
                UPDATE followup_executions 
                SET status = 'completed',
                    outcome = :outcome,
                    completed_at = :now
                WHERE id = :id
            """, {
                'id': execution_id,
                'outcome': outcome,
                'now': datetime.utcnow()
            })
            await session.commit()

# Usage Example
async def main():
    """Example usage of the AI Follow-up Automation System"""
    
    # Initialize the system
    system = AIFollowUpAutomationSystem(
        database_url="sqlite+aiosqlite:///ai_followup.db",
        redis_url="redis://localhost:6379",
        openai_api_key="your_openai_api_key"  # Replace with actual key
    )
    
    await system.initialize()
    
    # Start a follow-up sequence
    followup_request = FollowUpRequest(
        customer_id="customer_123",
        lead_id="lead_456",
        trigger_event="lead_created",
        context_data={
            'customer_name': 'María González',
            'interests': ['Machu Picchu', 'Adventure Tours'],
            'source': 'website'
        }
    )
    
    execution_id = await system.start_followup_sequence(followup_request)
    print(f"Started follow-up sequence: {execution_id}")
    
    # Simulate customer response
    response_analysis = await system.process_customer_response(
        customer_id="customer_123",
        response_content="Hi! I'm very interested in the Machu Picchu tour. Can you send me more details about dates and pricing?",
        interaction_type="email_reply"
    )
    print(f"Response analysis: {response_analysis}")
    
    # Execute a follow-up step
    if execution_id:
        step_result = await system.execute_followup_step(execution_id)
        print(f"Step execution result: {step_result}")
    
    # Get analytics
    analytics = await system.get_followup_analytics(days=30)
    print(f"Follow-up analytics: {analytics}")

if __name__ == "__main__":
    asyncio.run(main())