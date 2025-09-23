"""
Call Reporting and Analysis Service with AI
Sistema inteligente de reportes y análisis de llamadas con seguimientos automáticos
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from enum import Enum
import uuid
import re
import phonenumbers
from phonenumbers import geocoder, carrier, timezone as phone_timezone
import pytz
import openai
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field

# Import our services
from backend.models.rbac_models import Base
from backend.config.production_database import get_db_write, get_db_read

# Configure logging
logger = logging.getLogger(__name__)

class CallOutcome(str, Enum):
    """Resultado de la llamada"""
    SUCCESSFUL_SALE = "successful_sale"
    INFORMATION_PROVIDED = "information_provided" 
    FOLLOW_UP_NEEDED = "follow_up_needed"
    APPOINTMENT_SCHEDULED = "appointment_scheduled"
    CUSTOMER_NOT_INTERESTED = "customer_not_interested"
    TECHNICAL_ISSUE = "technical_issue"
    CALL_DROPPED = "call_dropped"
    TRANSFERRED_TO_HUMAN = "transferred_to_human"

class FollowUpType(str, Enum):
    """Tipos de seguimiento"""
    PHONE_CALL = "phone_call"
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    NO_FOLLOW_UP = "no_follow_up"

class CustomerSentiment(str, Enum):
    """Sentimientos del cliente detectados"""
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"

# Database Models
class CallReport(Base):
    """Reporte completo de llamada generado por IA"""
    __tablename__ = "call_reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String, unique=True, nullable=False, index=True)
    
    # Basic Call Information
    customer_phone = Column(String, nullable=False, index=True)
    customer_name = Column(String, nullable=True)
    agent_id = Column(String, nullable=True)  # AI agent or human agent ID
    
    # Timing Information  
    call_start_time = Column(DateTime(timezone=True), nullable=False)
    call_end_time = Column(DateTime(timezone=True), nullable=True)
    call_duration_seconds = Column(Integer, nullable=True)
    
    # Geographic Information
    customer_country = Column(String(2), nullable=True)  # ISO country code
    customer_timezone = Column(String, nullable=True)   # Timezone string
    local_call_time = Column(DateTime, nullable=True)   # Call time in customer's timezone
    
    # Call Content Analysis
    call_summary = Column(Text, nullable=True)           # AI-generated summary
    customer_intent = Column(String, nullable=True)     # What customer wanted
    topics_discussed = Column(JSON, nullable=True)      # List of topics
    key_phrases = Column(JSON, nullable=True)          # Important phrases extracted
    
    # Sentiment Analysis
    customer_sentiment = Column(String, nullable=True)  # Overall sentiment
    sentiment_score = Column(Float, nullable=True)      # -1 to 1 score
    satisfaction_level = Column(Integer, nullable=True) # 1-10 scale
    
    # Call Outcome
    call_outcome = Column(String, nullable=False)       # Primary outcome
    secondary_outcomes = Column(JSON, nullable=True)    # Additional outcomes
    goals_achieved = Column(JSON, nullable=True)        # Which goals were met
    
    # Products/Services Discussed
    products_mentioned = Column(JSON, nullable=True)    # Products discussed
    services_interested = Column(JSON, nullable=True)   # Services of interest
    price_range_discussed = Column(String, nullable=True)
    budget_mentioned = Column(Float, nullable=True)
    
    # Follow-up Requirements
    requires_follow_up = Column(Boolean, default=False)
    follow_up_type = Column(String, nullable=True)
    follow_up_priority = Column(Integer, default=3)     # 1=urgent, 5=low
    follow_up_reason = Column(Text, nullable=True)
    optimal_followup_time = Column(DateTime(timezone=True), nullable=True)
    
    # Appointment Scheduling
    appointment_requested = Column(Boolean, default=False)
    preferred_appointment_time = Column(DateTime(timezone=True), nullable=True)
    appointment_type = Column(String, nullable=True)    # consultation, presentation, etc.
    appointment_notes = Column(Text, nullable=True)
    
    # AI Analysis Metadata
    ai_confidence_score = Column(Float, nullable=True)  # How confident AI is in analysis
    processing_time_ms = Column(Integer, nullable=True)
    ai_model_version = Column(String, nullable=True)
    
    # CRM Integration
    crm_contact_id = Column(String, nullable=True, index=True)
    lead_score = Column(Integer, nullable=True)         # 1-100 lead quality
    customer_lifecycle_stage = Column(String, nullable=True)
    
    # Quality Metrics
    call_quality_score = Column(Float, nullable=True)   # Technical call quality
    transcript_accuracy = Column(Float, nullable=True)  # STT accuracy estimate
    
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

class FollowUpTask(Base):
    """Tareas de seguimiento programadas automáticamente"""
    __tablename__ = "follow_up_tasks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_report_id = Column(String, ForeignKey('call_reports.id'), nullable=False)
    
    # Task Details
    task_type = Column(String, nullable=False)          # phone_call, email, sms, etc.
    priority = Column(Integer, default=3)              # 1=urgent, 5=low  
    status = Column(String, default="pending")         # pending, completed, cancelled
    
    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Content
    task_description = Column(Text, nullable=False)
    suggested_script = Column(Text, nullable=True)     # AI-generated script
    context_notes = Column(JSON, nullable=True)        # Context for agent
    
    # Assignment
    assigned_to = Column(String, nullable=True)        # Agent ID
    auto_assignment_rules = Column(JSON, nullable=True)
    
    # Results
    completion_notes = Column(Text, nullable=True)
    outcome = Column(String, nullable=True)
    next_follow_up_needed = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    call_report = relationship("CallReport", back_populates="follow_up_tasks")

# Add relationship to CallReport
CallReport.follow_up_tasks = relationship("FollowUpTask", back_populates="call_report", cascade="all, delete-orphan")

class CallReportingService:
    """
    Servicio de reportes inteligentes de llamadas que:
    - Analiza transcripciones con IA
    - Detecta sentimientos y intenciones
    - Identifica seguimientos necesarios
    - Programa citas y llamadas automáticamente
    - Analiza timezones por país/teléfono
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_client = None
        if openai_api_key:
            self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        
        # Analysis prompts for different aspects
        self.analysis_prompts = {
            "summary": """
            Analiza esta transcripción de llamada y genera un resumen ejecutivo conciso.
            Incluye: propósito de la llamada, puntos clave discutidos, resultado principal.
            Máximo 200 palabras en español profesional.
            """,
            
            "sentiment": """
            Analiza el sentimiento del cliente en esta llamada.
            Considera: tono emocional, satisfacción, frustración, entusiasmo.
            Responde con: sentimiento (muy_positivo/positivo/neutral/negativo/muy_negativo) 
            y puntuación (-1 a 1) y nivel de satisfacción (1-10).
            """,
            
            "intent": """
            Identifica la intención principal del cliente en esta llamada.
            Ejemplos: información_general, cotización, reserva, queja, cancelación, etc.
            Incluye intenciones secundarias si las hay.
            """,
            
            "follow_up": """
            Determina si esta llamada requiere seguimiento y de qué tipo.
            Considera: promesas hechas, información pendiente, decisiones en proceso.
            Especifica: tipo de seguimiento, prioridad (1-5), timeframe óptimo, razón específica.
            """,
            
            "appointment": """
            Determina si el cliente solicitó o necesita una cita.
            Considera: consultas presenciales, presentaciones, reuniones mencionadas.
            Especifica: tipo de cita, urgencia, preferencias de horario mencionadas.
            """
        }
        
        logger.info("Call Reporting Service initialized")
    
    async def analyze_call_and_generate_report(self, call_data: Dict[str, Any]) -> CallReport:
        """
        Análisis completo de llamada con generación de reporte inteligente
        """
        try:
            logger.info(f"🔄 Analyzing call: {call_data.get('call_id')}")
            
            # 1. Extract basic call information
            call_info = await self._extract_call_information(call_data)
            
            # 2. Analyze customer location and timezone
            location_info = await self._analyze_customer_location(call_info["customer_phone"])
            
            # 3. AI Analysis of call content
            ai_analysis = await self._perform_ai_analysis(call_data.get("transcript", ""))
            
            # 4. Generate follow-up recommendations
            follow_up_analysis = await self._analyze_follow_up_needs(ai_analysis, call_info)
            
            # 5. Create call report
            call_report = CallReport(
                call_id=call_info["call_id"],
                customer_phone=call_info["customer_phone"],
                customer_name=call_info.get("customer_name"),
                agent_id=call_info.get("agent_id"),
                
                # Timing
                call_start_time=call_info["start_time"],
                call_end_time=call_info.get("end_time"),
                call_duration_seconds=call_info.get("duration_seconds"),
                
                # Location
                customer_country=location_info.get("country_code"),
                customer_timezone=location_info.get("timezone"),
                local_call_time=location_info.get("local_call_time"),
                
                # AI Analysis
                call_summary=ai_analysis.get("summary"),
                customer_intent=ai_analysis.get("primary_intent"),
                topics_discussed=ai_analysis.get("topics"),
                key_phrases=ai_analysis.get("key_phrases"),
                
                # Sentiment
                customer_sentiment=ai_analysis.get("sentiment"),
                sentiment_score=ai_analysis.get("sentiment_score"),
                satisfaction_level=ai_analysis.get("satisfaction_level"),
                
                # Outcome
                call_outcome=ai_analysis.get("primary_outcome", CallOutcome.INFORMATION_PROVIDED),
                secondary_outcomes=ai_analysis.get("secondary_outcomes", []),
                goals_achieved=ai_analysis.get("goals_achieved", []),
                
                # Business Information
                products_mentioned=ai_analysis.get("products_mentioned", []),
                services_interested=ai_analysis.get("services_interested", []),
                budget_mentioned=ai_analysis.get("budget_amount"),
                
                # Follow-up
                requires_follow_up=follow_up_analysis["requires_follow_up"],
                follow_up_type=follow_up_analysis.get("follow_up_type"),
                follow_up_priority=follow_up_analysis.get("priority", 3),
                follow_up_reason=follow_up_analysis.get("reason"),
                optimal_followup_time=follow_up_analysis.get("optimal_time"),
                
                # Appointments
                appointment_requested=ai_analysis.get("appointment_requested", False),
                preferred_appointment_time=ai_analysis.get("preferred_appointment_time"),
                appointment_type=ai_analysis.get("appointment_type"),
                
                # Metadata
                ai_confidence_score=ai_analysis.get("confidence_score", 0.8),
                ai_model_version="gpt-4",
                processing_time_ms=ai_analysis.get("processing_time_ms", 0)
            )
            
            # 6. Save to database
            with get_db_write() as db:
                db.add(call_report)
                db.commit()
                db.refresh(call_report)
            
            # 7. Create follow-up tasks if needed
            if follow_up_analysis["requires_follow_up"]:
                await self._create_follow_up_tasks(call_report, follow_up_analysis)
            
            logger.info(f"✅ Call report generated: {call_report.id}")
            return call_report
            
        except Exception as e:
            logger.error(f"❌ Call analysis failed: {e}")
            raise
    
    async def _extract_call_information(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and validate basic call information"""
        
        return {
            "call_id": call_data.get("call_id", str(uuid.uuid4())),
            "customer_phone": call_data.get("customer_phone", "").strip(),
            "customer_name": call_data.get("customer_name"),
            "agent_id": call_data.get("agent_id"),
            "start_time": call_data.get("start_time", datetime.now(timezone.utc)),
            "end_time": call_data.get("end_time"),
            "duration_seconds": call_data.get("duration_seconds", 0)
        }
    
    async def _analyze_customer_location(self, phone_number: str) -> Dict[str, Any]:
        """Analyze customer location and timezone from phone number"""
        location_info = {
            "country_code": None,
            "country_name": None,
            "timezone": None,
            "local_call_time": None,
            "carrier": None
        }
        
        try:
            if not phone_number:
                return location_info
            
            # Parse phone number
            parsed_number = phonenumbers.parse(phone_number, None)
            
            if phonenumbers.is_valid_number(parsed_number):
                # Get country information
                country_code = phonenumbers.region_code_for_number(parsed_number)
                country_name = geocoder.description_for_number(parsed_number, "es")
                
                location_info.update({
                    "country_code": country_code,
                    "country_name": country_name,
                    "carrier": carrier.name_for_number(parsed_number, "es")
                })
                
                # Get timezone information
                timezones = phone_timezone.time_zones_for_number(parsed_number)
                if timezones:
                    # Use first timezone if multiple
                    tz_name = timezones[0]
                    location_info["timezone"] = tz_name
                    
                    # Calculate local call time
                    if tz_name:
                        local_tz = pytz.timezone(tz_name)
                        utc_now = datetime.now(timezone.utc)
                        local_time = utc_now.astimezone(local_tz)
                        location_info["local_call_time"] = local_time
                
                logger.info(f"📍 Customer location: {country_name} ({country_code}), TZ: {location_info['timezone']}")
                
        except Exception as e:
            logger.warning(f"⚠️ Could not analyze phone number location: {e}")
        
        return location_info
    
    async def _perform_ai_analysis(self, transcript: str) -> Dict[str, Any]:
        """Perform comprehensive AI analysis of call transcript"""
        if not self.openai_client or not transcript:
            return self._generate_fallback_analysis(transcript)
        
        analysis_results = {}
        
        try:
            # Run multiple analysis tasks in parallel
            analysis_tasks = []
            
            for analysis_type, prompt in self.analysis_prompts.items():
                task = self._analyze_with_ai(transcript, prompt, analysis_type)
                analysis_tasks.append(task)
            
            # Execute all analyses
            results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
            # Process results
            for i, (analysis_type, _) in enumerate(self.analysis_prompts.items()):
                result = results[i]
                if isinstance(result, Exception):
                    logger.error(f"❌ AI analysis failed for {analysis_type}: {result}")
                    analysis_results[analysis_type] = None
                else:
                    analysis_results[analysis_type] = result
            
            # Combine and structure the results
            return self._structure_ai_results(analysis_results, transcript)
            
        except Exception as e:
            logger.error(f"❌ AI analysis failed: {e}")
            return self._generate_fallback_analysis(transcript)
    
    async def _analyze_with_ai(self, transcript: str, prompt: str, analysis_type: str) -> Dict[str, Any]:
        """Perform specific AI analysis"""
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": f"{prompt}\n\nTranscripción de la llamada:"},
                    {"role": "user", "content": transcript[:4000]}  # Limit token usage
                ],
                max_tokens=500,
                temperature=0.3  # Lower temperature for more consistent analysis
            )
            
            content = response.choices[0].message.content
            return {"type": analysis_type, "content": content, "raw_response": content}
            
        except Exception as e:
            logger.error(f"❌ AI analysis error for {analysis_type}: {e}")
            return {"type": analysis_type, "error": str(e)}
    
    def _structure_ai_results(self, raw_results: Dict[str, Any], transcript: str) -> Dict[str, Any]:
        """Structure AI analysis results into standardized format"""
        
        # Extract and parse AI responses
        summary_result = raw_results.get("summary", {})
        sentiment_result = raw_results.get("sentiment", {})
        intent_result = raw_results.get("intent", {})
        follow_up_result = raw_results.get("follow_up", {})
        appointment_result = raw_results.get("appointment", {})
        
        # Basic text analysis fallbacks
        transcript_lower = transcript.lower()
        
        return {
            # Summary
            "summary": self._extract_summary(summary_result),
            
            # Intent Analysis
            "primary_intent": self._extract_intent(intent_result, transcript_lower),
            "topics": self._extract_topics(transcript),
            "key_phrases": self._extract_key_phrases(transcript),
            
            # Sentiment Analysis
            "sentiment": self._extract_sentiment(sentiment_result, transcript_lower),
            "sentiment_score": self._extract_sentiment_score(sentiment_result),
            "satisfaction_level": self._extract_satisfaction_level(sentiment_result),
            
            # Outcomes
            "primary_outcome": self._determine_call_outcome(transcript_lower),
            "secondary_outcomes": [],
            "goals_achieved": self._extract_goals_achieved(transcript_lower),
            
            # Business Information
            "products_mentioned": self._extract_products_mentioned(transcript_lower),
            "services_interested": self._extract_services_interested(transcript_lower),
            "budget_amount": self._extract_budget_amount(transcript),
            
            # Appointments
            "appointment_requested": self._detect_appointment_request(appointment_result, transcript_lower),
            "appointment_type": self._extract_appointment_type(appointment_result),
            "preferred_appointment_time": None,  # Would need more sophisticated parsing
            
            # Metadata
            "confidence_score": 0.8,  # Would be calculated based on AI confidence
            "processing_time_ms": 1000  # Would be measured
        }
    
    def _extract_summary(self, summary_result: Dict[str, Any]) -> str:
        """Extract call summary from AI result"""
        if summary_result and "content" in summary_result:
            return summary_result["content"][:500]  # Limit summary length
        return "Resumen no disponible - análisis de IA falló"
    
    def _extract_intent(self, intent_result: Dict[str, Any], transcript_lower: str) -> str:
        """Extract customer intent from AI analysis or heuristics"""
        if intent_result and "content" in intent_result:
            content = intent_result["content"].lower()
            # Map AI response to standard intents
            intent_mappings = {
                "información": "información_general",
                "cotización": "solicitar_cotizacion",
                "reserva": "realizar_reserva",
                "queja": "presentar_queja",
                "cancelación": "cancelar_reserva"
            }
            
            for keyword, intent in intent_mappings.items():
                if keyword in content:
                    return intent
        
        # Fallback heuristics
        if any(word in transcript_lower for word in ["precio", "costo", "cotización"]):
            return "solicitar_cotizacion"
        elif any(word in transcript_lower for word in ["reservar", "booking", "reserva"]):
            return "realizar_reserva"
        elif any(word in transcript_lower for word in ["información", "info", "detalles"]):
            return "información_general"
        
        return "consulta_general"
    
    def _extract_topics(self, transcript: str) -> List[str]:
        """Extract topics discussed in the call"""
        topics = []
        transcript_lower = transcript.lower()
        
        # Common tourism topics
        topic_keywords = {
            "destinos": ["madrid", "barcelona", "paris", "londres", "roma"],
            "hoteles": ["hotel", "hospedaje", "alojamiento", "habitación"],
            "vuelos": ["vuelo", "aéreo", "avión", "aerolínea"],
            "tours": ["tour", "excursión", "visita", "recorrido"],
            "precios": ["precio", "costo", "tarifa", "descuento", "oferta"],
            "fechas": ["fecha", "cuando", "calendario", "disponibilidad"]
        }
        
        for topic, keywords in topic_keywords.items():
            if any(keyword in transcript_lower for keyword in keywords):
                topics.append(topic)
        
        return topics
    
    def _extract_key_phrases(self, transcript: str) -> List[str]:
        """Extract key phrases from transcript"""
        # Simple keyword extraction - in production would use NLP
        key_phrases = []
        
        # Look for quoted text or emphasized phrases
        quoted_phrases = re.findall(r'"([^"]*)"', transcript)
        key_phrases.extend(quoted_phrases)
        
        # Look for monetary amounts
        money_phrases = re.findall(r'\b\d+[.,]?\d*\s*(?:euros?|dollars?|€|\$)\b', transcript, re.IGNORECASE)
        key_phrases.extend(money_phrases)
        
        return key_phrases[:10]  # Limit to top 10
    
    def _extract_sentiment(self, sentiment_result: Dict[str, Any], transcript_lower: str) -> str:
        """Extract sentiment from AI analysis or heuristics"""
        if sentiment_result and "content" in sentiment_result:
            content = sentiment_result["content"].lower()
            
            if any(word in content for word in ["muy positivo", "excelente", "encantado"]):
                return CustomerSentiment.VERY_POSITIVE
            elif any(word in content for word in ["positivo", "satisfecho", "bien"]):
                return CustomerSentiment.POSITIVE
            elif any(word in content for word in ["muy negativo", "furioso", "terrible"]):
                return CustomerSentiment.VERY_NEGATIVE
            elif any(word in content for word in ["negativo", "molesto", "insatisfecho"]):
                return CustomerSentiment.NEGATIVE
        
        # Fallback sentiment analysis
        positive_words = ["excelente", "perfecto", "maravilloso", "genial", "fantástico"]
        negative_words = ["terrible", "horrible", "mal", "problema", "queja"]
        
        positive_count = sum(1 for word in positive_words if word in transcript_lower)
        negative_count = sum(1 for word in negative_words if word in transcript_lower)
        
        if positive_count > negative_count + 1:
            return CustomerSentiment.POSITIVE
        elif negative_count > positive_count + 1:
            return CustomerSentiment.NEGATIVE
        else:
            return CustomerSentiment.NEUTRAL
    
    def _extract_sentiment_score(self, sentiment_result: Dict[str, Any]) -> float:
        """Extract numerical sentiment score"""
        # Would parse from AI response, for now return default
        return 0.0
    
    def _extract_satisfaction_level(self, sentiment_result: Dict[str, Any]) -> int:
        """Extract satisfaction level 1-10"""
        # Would parse from AI response, for now return default
        return 5
    
    def _determine_call_outcome(self, transcript_lower: str) -> str:
        """Determine primary call outcome"""
        if any(word in transcript_lower for word in ["comprar", "reservar", "confirmar"]):
            return CallOutcome.SUCCESSFUL_SALE
        elif any(word in transcript_lower for word in ["cita", "reunión", "encuentro"]):
            return CallOutcome.APPOINTMENT_SCHEDULED
        elif any(word in transcript_lower for word in ["seguimiento", "llamar después", "contactar"]):
            return CallOutcome.FOLLOW_UP_NEEDED
        elif any(word in transcript_lower for word in ["no interesado", "no gracias", "no me interesa"]):
            return CallOutcome.CUSTOMER_NOT_INTERESTED
        else:
            return CallOutcome.INFORMATION_PROVIDED
    
    def _extract_goals_achieved(self, transcript_lower: str) -> List[str]:
        """Extract which goals were achieved in the call"""
        goals = []
        
        if any(word in transcript_lower for word in ["información proporcionada", "explicado", "detallado"]):
            goals.append("información_proporcionada")
        if any(word in transcript_lower for word in ["cotización enviada", "precio dado"]):
            goals.append("cotización_proporcionada")
        if any(word in transcript_lower for word in ["cita programada", "reunión agendada"]):
            goals.append("cita_agendada")
            
        return goals
    
    def _extract_products_mentioned(self, transcript_lower: str) -> List[str]:
        """Extract products/services mentioned"""
        products = []
        
        product_keywords = {
            "tour_madrid": ["tour madrid", "madrid tour", "visita madrid"],
            "hotel_booking": ["reserva hotel", "hotel booking", "alojamiento"],
            "flight_booking": ["vuelo", "billete aéreo", "reserva vuelo"],
            "package_vacation": ["paquete vacacional", "todo incluido", "package"]
        }
        
        for product, keywords in product_keywords.items():
            if any(keyword in transcript_lower for keyword in keywords):
                products.append(product)
        
        return products
    
    def _extract_services_interested(self, transcript_lower: str) -> List[str]:
        """Extract services customer showed interest in"""
        # Similar to products but focused on interest indicators
        return self._extract_products_mentioned(transcript_lower)
    
    def _extract_budget_amount(self, transcript: str) -> Optional[float]:
        """Extract budget amount mentioned"""
        # Look for monetary amounts
        amounts = re.findall(r'\b(\d+(?:[.,]\d+)?)\s*(?:euros?|€|dollars?|\$)', transcript, re.IGNORECASE)
        if amounts:
            try:
                # Return first amount found, cleaned
                amount_str = amounts[0].replace(',', '.')
                return float(amount_str)
            except ValueError:
                pass
        return None
    
    def _detect_appointment_request(self, appointment_result: Dict[str, Any], transcript_lower: str) -> bool:
        """Detect if customer requested an appointment"""
        if appointment_result and "content" in appointment_result:
            content = appointment_result["content"].lower()
            if any(word in content for word in ["cita", "reunión", "appointment"]):
                return True
        
        # Fallback detection
        return any(word in transcript_lower for word in [
            "cita", "reunión", "encuentro", "visita", "appointment", 
            "meeting", "cuando podemos", "disponibilidad"
        ])
    
    def _extract_appointment_type(self, appointment_result: Dict[str, Any]) -> Optional[str]:
        """Extract type of appointment requested"""
        if appointment_result and "content" in appointment_result:
            content = appointment_result["content"].lower()
            
            if "consulta" in content:
                return "consulta"
            elif "presentación" in content:
                return "presentación"
            elif "reunion" in content:
                return "reunión"
        
        return "consulta"  # Default
    
    def _generate_fallback_analysis(self, transcript: str) -> Dict[str, Any]:
        """Generate basic analysis when AI is not available"""
        transcript_lower = transcript.lower()
        
        return {
            "summary": f"Llamada analizada automáticamente. Duración aproximada: {len(transcript.split())} palabras.",
            "primary_intent": self._extract_intent({}, transcript_lower),
            "topics": self._extract_topics(transcript),
            "key_phrases": self._extract_key_phrases(transcript),
            "sentiment": self._extract_sentiment({}, transcript_lower),
            "sentiment_score": 0.0,
            "satisfaction_level": 5,
            "primary_outcome": self._determine_call_outcome(transcript_lower),
            "secondary_outcomes": [],
            "goals_achieved": self._extract_goals_achieved(transcript_lower),
            "products_mentioned": self._extract_products_mentioned(transcript_lower),
            "services_interested": self._extract_services_interested(transcript_lower),
            "budget_amount": self._extract_budget_amount(transcript),
            "appointment_requested": self._detect_appointment_request({}, transcript_lower),
            "appointment_type": "consulta",
            "preferred_appointment_time": None,
            "confidence_score": 0.6,  # Lower confidence for fallback
            "processing_time_ms": 100
        }
    
    async def _analyze_follow_up_needs(self, ai_analysis: Dict[str, Any], 
                                     call_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze if follow-up is needed and determine optimal timing"""
        
        follow_up_analysis = {
            "requires_follow_up": False,
            "follow_up_type": FollowUpType.NO_FOLLOW_UP,
            "priority": 3,
            "reason": None,
            "optimal_time": None
        }
        
        # Determine if follow-up is needed based on call outcome
        outcome = ai_analysis.get("primary_outcome")
        
        if outcome in [CallOutcome.FOLLOW_UP_NEEDED, CallOutcome.APPOINTMENT_SCHEDULED]:
            follow_up_analysis["requires_follow_up"] = True
            follow_up_analysis["priority"] = 2  # High priority
            
        elif outcome == CallOutcome.INFORMATION_PROVIDED:
            # Follow up to see if they need more info
            follow_up_analysis["requires_follow_up"] = True
            follow_up_analysis["priority"] = 3  # Medium priority
            follow_up_analysis["follow_up_type"] = FollowUpType.PHONE_CALL
            follow_up_analysis["reason"] = "Seguimiento para ver si necesita información adicional"
            
        elif ai_analysis.get("appointment_requested"):
            follow_up_analysis["requires_follow_up"] = True
            follow_up_analysis["priority"] = 1  # Urgent
            follow_up_analysis["follow_up_type"] = FollowUpType.PHONE_CALL
            follow_up_analysis["reason"] = "Confirmar detalles de cita solicitada"
        
        # Determine optimal follow-up time based on customer timezone
        if follow_up_analysis["requires_follow_up"]:
            follow_up_analysis["optimal_time"] = self._calculate_optimal_followup_time(
                call_info, ai_analysis
            )
        
        return follow_up_analysis
    
    def _calculate_optimal_followup_time(self, call_info: Dict[str, Any], 
                                       ai_analysis: Dict[str, Any]) -> datetime:
        """Calculate optimal time for follow-up based on customer timezone and preferences"""
        
        # Default: follow up in 24-48 hours
        base_followup_time = datetime.now(timezone.utc) + timedelta(days=1)
        
        # Adjust based on priority
        priority = ai_analysis.get("priority", 3)
        if priority == 1:  # Urgent
            base_followup_time = datetime.now(timezone.utc) + timedelta(hours=4)
        elif priority == 2:  # High
            base_followup_time = datetime.now(timezone.utc) + timedelta(hours=12)
        
        # TODO: Adjust for customer timezone and business hours
        # Would need customer location info for this
        
        return base_followup_time
    
    async def _create_follow_up_tasks(self, call_report: CallReport, 
                                    follow_up_analysis: Dict[str, Any]) -> List[FollowUpTask]:
        """Create automated follow-up tasks"""
        
        tasks = []
        
        if follow_up_analysis["requires_follow_up"]:
            # Create primary follow-up task
            task = FollowUpTask(
                call_report_id=call_report.id,
                task_type=follow_up_analysis.get("follow_up_type", FollowUpType.PHONE_CALL),
                priority=follow_up_analysis.get("priority", 3),
                scheduled_for=follow_up_analysis.get("optimal_time"),
                task_description=follow_up_analysis.get("reason", "Seguimiento de llamada"),
                suggested_script=await self._generate_follow_up_script(call_report, follow_up_analysis),
                context_notes={
                    "original_call_summary": call_report.call_summary,
                    "customer_sentiment": call_report.customer_sentiment,
                    "products_discussed": call_report.products_mentioned,
                    "budget_mentioned": call_report.budget_mentioned
                }
            )
            
            # Save task
            with get_db_write() as db:
                db.add(task)
                db.commit()
                db.refresh(task)
            
            tasks.append(task)
            logger.info(f"✅ Follow-up task created: {task.id}")
        
        return tasks
    
    async def _generate_follow_up_script(self, call_report: CallReport, 
                                       follow_up_analysis: Dict[str, Any]) -> str:
        """Generate suggested script for follow-up call"""
        
        # Basic template-based script generation
        customer_name = call_report.customer_name or "Cliente"
        
        if call_report.appointment_requested:
            script = f"""
            Hola {customer_name}, le habla [NOMBRE] de Spirit Tours.
            
            Le llamo para darle seguimiento a nuestra conversación anterior donde 
            expresó interés en programar una cita.
            
            ¿Cuándo sería conveniente para usted que nos reuniéramos para 
            conversar sobre {', '.join(call_report.products_mentioned or ['nuestros servicios'])}?
            
            Tengo disponibilidad [MENCIONAR HORARIOS DISPONIBLES].
            """
        else:
            script = f"""
            Hola {customer_name}, le habla [NOMBRE] de Spirit Tours.
            
            Le llamo para darle seguimiento a nuestra conversación donde 
            conversamos sobre {', '.join(call_report.topics_discussed or ['nuestros servicios'])}.
            
            Quería ver si tiene alguna pregunta adicional o si necesita 
            más información sobre alguno de los temas que tocamos.
            
            ¿Hay algo específico en lo que le pueda ayudar hoy?
            """
        
        return script.strip()
    
    async def get_call_reports(self, filters: Dict[str, Any] = None, 
                             limit: int = 100, offset: int = 0) -> List[CallReport]:
        """Get call reports with filtering"""
        
        with get_db_read() as db:
            query = db.query(CallReport)
            
            if filters:
                if "customer_phone" in filters:
                    query = query.filter(CallReport.customer_phone == filters["customer_phone"])
                
                if "date_from" in filters:
                    query = query.filter(CallReport.call_start_time >= filters["date_from"])
                
                if "date_to" in filters:
                    query = query.filter(CallReport.call_start_time <= filters["date_to"])
                
                if "call_outcome" in filters:
                    query = query.filter(CallReport.call_outcome == filters["call_outcome"])
                
                if "requires_follow_up" in filters:
                    query = query.filter(CallReport.requires_follow_up == filters["requires_follow_up"])
            
            return query.order_by(CallReport.call_start_time.desc()).offset(offset).limit(limit).all()
    
    async def get_follow_up_tasks(self, filters: Dict[str, Any] = None,
                                limit: int = 100, offset: int = 0) -> List[FollowUpTask]:
        """Get follow-up tasks with filtering"""
        
        with get_db_read() as db:
            query = db.query(FollowUpTask)
            
            if filters:
                if "status" in filters:
                    query = query.filter(FollowUpTask.status == filters["status"])
                
                if "priority" in filters:
                    query = query.filter(FollowUpTask.priority <= filters["priority"])
                
                if "due_date" in filters:
                    query = query.filter(FollowUpTask.scheduled_for <= filters["due_date"])
            
            return query.order_by(FollowUpTask.scheduled_for.asc()).offset(offset).limit(limit).all()

# Global service instance
call_reporting_service = CallReportingService()