"""
AI Voice Agents Service
Advanced AI-powered voice agents for 3CX PBX integration
Handles intelligent voice conversations, sales automation, and customer support
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
from pydantic import BaseModel, Field, validator
import openai
from openai import AsyncOpenAI
import speech_recognition as sr
import pyttsx3
from gtts import gTTS
import io
import base64
import uuid
import aiohttp
import websockets

from config.settings import settings
from services.pbx_3cx_integration_service import PBX3CXIntegrationService
from services.omnichannel_crm_service import OmnichannelCRMService

# Configure logging
logger = logging.getLogger(__name__)

class VoiceAgentType(str, Enum):
    """Types of AI voice agents"""
    SALES_SPECIALIST = "sales_specialist"
    CUSTOMER_SUPPORT = "customer_support" 
    BOOKING_ASSISTANT = "booking_assistant"
    TOUR_CONSULTANT = "tour_consultant"
    EMERGENCY_HANDLER = "emergency_handler"

class ConversationState(str, Enum):
    """States of voice conversation"""
    INITIATED = "initiated"
    LISTENING = "listening"
    PROCESSING = "processing"
    RESPONDING = "responding"
    WAITING_USER = "waiting_user"
    COMPLETED = "completed"
    TRANSFERRED = "transferred"
    ERROR = "error"

class VoiceQuality(str, Enum):
    """Voice synthesis quality levels"""
    STANDARD = "standard"
    PREMIUM = "premium"
    NEURAL = "neural"

@dataclass
class VoiceAgentConfig:
    """Configuration for AI voice agents"""
    agent_type: VoiceAgentType
    name: str
    voice_id: str
    language: str = "es-ES"
    voice_quality: VoiceQuality = VoiceQuality.NEURAL
    response_timeout: int = 30
    max_conversation_duration: int = 1800  # 30 minutes
    ai_model: str = "gpt-4"
    temperature: float = 0.7
    personality_prompt: str = ""
    expertise_areas: List[str] = None
    escalation_triggers: List[str] = None

class VoiceMessage(BaseModel):
    """Voice message structure"""
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    speaker: str  # "agent" or "customer"
    content: str
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    confidence_score: Optional[float] = None
    sentiment: Optional[str] = None
    intent: Optional[str] = None

class ConversationSession(BaseModel):
    """Voice conversation session"""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    call_id: str
    agent_type: VoiceAgentType
    customer_id: Optional[str] = None
    customer_phone: str
    state: ConversationState = ConversationState.INITIATED
    started_at: datetime = Field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None
    messages: List[VoiceMessage] = []
    context: Dict[str, Any] = {}
    outcomes: Dict[str, Any] = {}
    agent_notes: str = ""
    transferred_to_human: bool = False
    satisfaction_rating: Optional[int] = None

class VoiceAgentResponse(BaseModel):
    """AI agent response structure"""
    response_text: str
    audio_data: Optional[bytes] = None
    audio_url: Optional[str] = None
    suggested_actions: List[str] = []
    intent_detected: Optional[str] = None
    confidence_score: float
    requires_human_escalation: bool = False
    next_state: ConversationState
    context_updates: Dict[str, Any] = {}

class AIVoiceAgentsService:
    """Advanced AI Voice Agents Service for 3CX PBX Integration"""
    
    def __init__(self):
        self.pbx_service: Optional[PBX3CXIntegrationService] = None
        self.crm_service: Optional[OmnichannelCRMService] = None
        self.active_sessions: Dict[str, ConversationSession] = {}
        self.agent_configs: Dict[VoiceAgentType, VoiceAgentConfig] = {}
        self.openai_client: Optional[AsyncOpenAI] = None
        self.speech_recognizer = sr.Recognizer()
        self.tts_engine = None
        self.websocket_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        
    async def initialize(self, pbx_service: PBX3CXIntegrationService, crm_service: OmnichannelCRMService):
        """Initialize the AI voice agents service"""
        try:
            logger.info("Initializing AI Voice Agents Service...")
            
            self.pbx_service = pbx_service
            self.crm_service = crm_service
            
            # Initialize OpenAI client
            if settings.openai_api_key:
                self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
                logger.info("✅ OpenAI client initialized")
            else:
                logger.warning("⚠️ OpenAI API key not found - AI features limited")
            
            # Initialize TTS engine
            self.tts_engine = pyttsx3.init()
            self._configure_tts_engine()
            
            # Setup agent configurations
            await self._setup_agent_configurations()
            
            # Register with PBX for call events
            if self.pbx_service:
                await self._register_pbx_callbacks()
            
            logger.info("✅ AI Voice Agents Service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize AI Voice Agents Service: {str(e)}")
            return False
    
    def _configure_tts_engine(self):
        """Configure text-to-speech engine"""
        try:
            voices = self.tts_engine.getProperty('voices')
            
            # Find Spanish voice if available
            spanish_voice = None
            for voice in voices:
                if 'spanish' in voice.name.lower() or 'es' in voice.id.lower():
                    spanish_voice = voice.id
                    break
            
            if spanish_voice:
                self.tts_engine.setProperty('voice', spanish_voice)
            
            # Set speech rate and volume
            self.tts_engine.setProperty('rate', 180)  # Words per minute
            self.tts_engine.setProperty('volume', 0.9)
            
            logger.info("✅ TTS engine configured")
            
        except Exception as e:
            logger.error(f"❌ TTS engine configuration failed: {str(e)}")
    
    async def _setup_agent_configurations(self):
        """Setup configurations for different AI voice agent types"""
        
        # Sales Specialist Agent
        self.agent_configs[VoiceAgentType.SALES_SPECIALIST] = VoiceAgentConfig(
            agent_type=VoiceAgentType.SALES_SPECIALIST,
            name="María - Especialista en Ventas",
            voice_id="maria_sales",
            personality_prompt="""Eres María, una especialista en ventas de Spirit Tours con 10 años de experiencia. 
            Eres entusiasta, profesional y experta en turismo español. Tu objetivo es:
            1. Identificar las necesidades del cliente
            2. Recomendar experiencias perfectas
            3. Cerrar ventas de manera natural
            4. Crear confianza y rapport
            Hablas de manera cálida, usa ejemplos específicos y siempre busca la mejor experiencia para el cliente.""",
            expertise_areas=["tours_madrid", "experiencias_culturales", "reservas_grupales", "promociones_especiales"],
            escalation_triggers=["precio_muy_alto", "quejas_graves", "solicitudes_técnicas_complejas"]
        )
        
        # Customer Support Agent
        self.agent_configs[VoiceAgentType.CUSTOMER_SUPPORT] = VoiceAgentConfig(
            agent_type=VoiceAgentType.CUSTOMER_SUPPORT,
            name="Carlos - Atención al Cliente",
            voice_id="carlos_support",
            personality_prompt="""Eres Carlos, especialista en atención al cliente de Spirit Tours. 
            Eres paciente, empático y resolutivo. Tu objetivo es:
            1. Resolver problemas de manera eficiente
            2. Proporcionar información precisa
            3. Asegurar la satisfacción del cliente
            4. Escalate cuando sea necesario
            Hablas de manera tranquilizadora, escuchas activamente y siempre buscas soluciones.""",
            expertise_areas=["cancelaciones", "cambios_reserva", "problemas_técnicos", "políticas_empresa"],
            escalation_triggers=["reembolsos_grandes", "problemas_legales", "quejas_formales"]
        )
        
        # Booking Assistant Agent
        self.agent_configs[VoiceAgentType.BOOKING_ASSISTANT] = VoiceAgentConfig(
            agent_type=VoiceAgentType.BOOKING_ASSISTANT,
            name="Ana - Asistente de Reservas",
            voice_id="ana_booking",
            personality_prompt="""Eres Ana, asistente especializada en reservas de Spirit Tours. 
            Eres organizada, detallista y eficiente. Tu objetivo es:
            1. Facilitar el proceso de reserva
            2. Verificar todos los detalles
            3. Confirmar fechas y disponibilidad
            4. Procesar pagos de manera segura
            Hablas de manera clara, verificas información dos veces y guías paso a paso.""",
            expertise_areas=["disponibilidad", "precios", "procesos_pago", "confirmaciones"],
            escalation_triggers=["problemas_pago", "fechas_no_disponibles", "grupos_grandes"]
        )
        
        # Tour Consultant Agent
        self.agent_configs[VoiceAgentType.TOUR_CONSULTANT] = VoiceAgentConfig(
            agent_type=VoiceAgentType.TOUR_CONSULTANT,
            name="Diego - Consultor de Tours",
            voice_id="diego_consultant",
            personality_prompt="""Eres Diego, consultor especializado en experiencias turísticas de Spirit Tours. 
            Eres conocedor, apasionado y personalizado. Tu objetivo es:
            1. Entender las preferencias del cliente
            2. Crear itinerarios personalizados
            3. Compartir conocimiento local
            4. Maximizar la experiencia del cliente
            Hablas con pasión sobre España, das consejos específicos y creas experiencias únicas.""",
            expertise_areas=["cultura_española", "gastronomía", "historia", "itinerarios_personalizados"],
            escalation_triggers=["necesidades_muy_específicas", "grupos_corporativos", "eventos_especiales"]
        )
        
        logger.info(f"✅ Configured {len(self.agent_configs)} AI voice agent types")
    
    async def _register_pbx_callbacks(self):
        """Register callbacks with PBX service for call events"""
        try:
            # Register for incoming call events
            await self.pbx_service.register_callback("incoming_call", self._handle_incoming_call)
            await self.pbx_service.register_callback("call_answered", self._handle_call_answered) 
            await self.pbx_service.register_callback("call_ended", self._handle_call_ended)
            
            logger.info("✅ PBX callbacks registered for AI voice agents")
            
        except Exception as e:
            logger.error(f"❌ Failed to register PBX callbacks: {str(e)}")
    
    async def _handle_incoming_call(self, call_data: Dict[str, Any]):
        """Handle incoming call event from PBX"""
        try:
            call_id = call_data.get("call_id")
            customer_phone = call_data.get("caller_number")
            
            logger.info(f"🔥 Incoming call detected: {call_id} from {customer_phone}")
            
            # Determine appropriate agent type based on call routing
            agent_type = await self._determine_agent_type(call_data)
            
            # Create conversation session
            session = ConversationSession(
                call_id=call_id,
                agent_type=agent_type,
                customer_phone=customer_phone,
                context={"call_data": call_data}
            )
            
            self.active_sessions[call_id] = session
            
            logger.info(f"✅ Created voice conversation session: {session.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Error handling incoming call: {str(e)}")
    
    async def _handle_call_answered(self, call_data: Dict[str, Any]):
        """Handle call answered event"""
        try:
            call_id = call_data.get("call_id")
            session = self.active_sessions.get(call_id)
            
            if not session:
                logger.warning(f"⚠️ No session found for answered call: {call_id}")
                return
            
            # Update session state
            session.state = ConversationState.LISTENING
            
            # Start AI conversation
            await self._start_ai_conversation(session)
            
            logger.info(f"✅ AI conversation started for call: {call_id}")
            
        except Exception as e:
            logger.error(f"❌ Error handling call answered: {str(e)}")
    
    async def _handle_call_ended(self, call_data: Dict[str, Any]):
        """Handle call ended event"""
        try:
            call_id = call_data.get("call_id")
            session = self.active_sessions.get(call_id)
            
            if session:
                session.state = ConversationState.COMPLETED
                session.ended_at = datetime.now()
                
                # Save conversation to CRM
                await self._save_conversation_to_crm(session)
                
                # Clean up
                del self.active_sessions[call_id]
                
                logger.info(f"✅ Call ended and conversation saved: {call_id}")
            
        except Exception as e:
            logger.error(f"❌ Error handling call ended: {str(e)}")
    
    async def _determine_agent_type(self, call_data: Dict[str, Any]) -> VoiceAgentType:
        """Determine appropriate AI agent type based on call context"""
        
        # Check call routing/extension
        extension = call_data.get("called_number", "")
        
        if "sales" in extension.lower() or "ventas" in extension.lower():
            return VoiceAgentType.SALES_SPECIALIST
        elif "support" in extension.lower() or "soporte" in extension.lower():
            return VoiceAgentType.CUSTOMER_SUPPORT
        elif "booking" in extension.lower() or "reservas" in extension.lower():
            return VoiceAgentType.BOOKING_ASSISTANT
        elif "tours" in extension.lower() or "consulta" in extension.lower():
            return VoiceAgentType.TOUR_CONSULTANT
        else:
            # Default to sales specialist for general calls
            return VoiceAgentType.SALES_SPECIALIST
    
    async def _start_ai_conversation(self, session: ConversationSession):
        """Start AI-powered conversation"""
        try:
            agent_config = self.agent_configs[session.agent_type]
            
            # Generate welcome message
            welcome_message = await self._generate_welcome_message(session, agent_config)
            
            # Convert to speech and play
            audio_data = await self._text_to_speech(welcome_message, agent_config)
            
            # Send audio to PBX
            await self._send_audio_to_call(session.call_id, audio_data)
            
            # Add message to session
            message = VoiceMessage(
                speaker="agent",
                content=welcome_message,
                audio_url=None  # Could store URL if needed
            )
            session.messages.append(message)
            
            # Wait for customer response
            session.state = ConversationState.WAITING_USER
            
        except Exception as e:
            logger.error(f"❌ Error starting AI conversation: {str(e)}")
    
    async def _generate_welcome_message(self, session: ConversationSession, agent_config: VoiceAgentConfig) -> str:
        """Generate personalized welcome message"""
        
        try:
            if not self.openai_client:
                # Fallback message if OpenAI not available
                return f"Hola, soy {agent_config.name} de Spirit Tours. ¿En qué puedo ayudarte hoy?"
            
            # Get customer context if available
            customer_context = ""
            if session.customer_id:
                customer_info = await self._get_customer_info(session.customer_id)
                customer_context = f"Cliente: {customer_info.get('name', 'Cliente')}. Historial: {customer_info.get('booking_history', 'Nuevo cliente')}"
            
            prompt = f"""
            {agent_config.personality_prompt}
            
            Contexto de la llamada:
            - Tipo de agente: {agent_config.agent_type}
            - Hora: {datetime.now().strftime('%H:%M')}
            - {customer_context}
            
            Genera un mensaje de bienvenida natural, cálido y profesional de máximo 50 palabras.
            Identifícate como {agent_config.name} y pregunta cómo puedes ayudar.
            """
            
            response = await self.openai_client.chat.completions.create(
                model=agent_config.ai_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=agent_config.temperature,
                max_tokens=100
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"❌ Error generating welcome message: {str(e)}")
            return f"Hola, soy {agent_config.name} de Spirit Tours. ¿En qué puedo ayudarte hoy?"
    
    async def _text_to_speech(self, text: str, agent_config: VoiceAgentConfig) -> bytes:
        """Convert text to speech audio"""
        try:
            # Use Google TTS for better quality
            tts = gTTS(text=text, lang='es', slow=False)
            
            # Save to bytes buffer
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            return audio_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"❌ Error in text-to-speech: {str(e)}")
            # Fallback to basic TTS
            return b""  # Empty audio data
    
    async def _send_audio_to_call(self, call_id: str, audio_data: bytes):
        """Send audio data to active call via PBX"""
        try:
            if self.pbx_service:
                await self.pbx_service.play_audio_to_call(call_id, audio_data)
                logger.info(f"✅ Audio sent to call: {call_id}")
            
        except Exception as e:
            logger.error(f"❌ Error sending audio to call: {str(e)}")
    
    async def process_voice_input(self, call_id: str, audio_data: bytes) -> VoiceAgentResponse:
        """Process incoming voice input from customer"""
        try:
            session = self.active_sessions.get(call_id)
            if not session:
                raise Exception(f"No active session found for call: {call_id}")
            
            session.state = ConversationState.PROCESSING
            
            # Speech to text
            customer_text = await self._speech_to_text(audio_data)
            
            if not customer_text:
                return VoiceAgentResponse(
                    response_text="Disculpa, no pude entender. ¿Podrías repetir?",
                    confidence_score=0.0,
                    next_state=ConversationState.WAITING_USER
                )
            
            # Add customer message to session
            customer_message = VoiceMessage(
                speaker="customer",
                content=customer_text,
                confidence_score=0.8  # Would come from speech recognition
            )
            session.messages.append(customer_message)
            
            # Generate AI response
            agent_response = await self._generate_ai_response(session, customer_text)
            
            # Convert response to audio
            response_audio = await self._text_to_speech(
                agent_response.response_text, 
                self.agent_configs[session.agent_type]
            )
            agent_response.audio_data = response_audio
            
            # Add agent response to session
            agent_message = VoiceMessage(
                speaker="agent",
                content=agent_response.response_text,
                intent=agent_response.intent_detected
            )
            session.messages.append(agent_message)
            
            # Update session state
            session.state = agent_response.next_state
            
            # Update context
            session.context.update(agent_response.context_updates)
            
            return agent_response
            
        except Exception as e:
            logger.error(f"❌ Error processing voice input: {str(e)}")
            return VoiceAgentResponse(
                response_text="Disculpa, tengo un problema técnico. Te transfiero con un agente humano.",
                confidence_score=0.0,
                requires_human_escalation=True,
                next_state=ConversationState.TRANSFERRED
            )
    
    async def _speech_to_text(self, audio_data: bytes) -> str:
        """Convert speech audio to text"""
        try:
            # Save audio data to temporary file for processing
            audio_file = io.BytesIO(audio_data)
            
            # Use speech recognition
            with sr.AudioFile(audio_file) as source:
                audio = self.speech_recognizer.record(source)
            
            # Recognize speech using Google's service
            text = self.speech_recognizer.recognize_google(audio, language='es-ES')
            
            logger.info(f"🎤 Speech recognized: {text}")
            return text
            
        except sr.UnknownValueError:
            logger.warning("⚠️ Could not understand audio")
            return ""
        except Exception as e:
            logger.error(f"❌ Error in speech recognition: {str(e)}")
            return ""
    
    async def _generate_ai_response(self, session: ConversationSession, customer_text: str) -> VoiceAgentResponse:
        """Generate intelligent AI response based on conversation context"""
        try:
            if not self.openai_client:
                return VoiceAgentResponse(
                    response_text="Gracias por tu consulta. Te ayudo en un momento.",
                    confidence_score=0.5,
                    next_state=ConversationState.WAITING_USER
                )
            
            agent_config = self.agent_configs[session.agent_type]
            
            # Build conversation history
            conversation_history = ""
            for msg in session.messages[-5:]:  # Last 5 messages for context
                speaker = "Cliente" if msg.speaker == "customer" else agent_config.name
                conversation_history += f"{speaker}: {msg.content}\n"
            
            # Get customer context
            customer_context = await self._get_conversation_context(session)
            
            prompt = f"""
            {agent_config.personality_prompt}
            
            Contexto del cliente:
            {customer_context}
            
            Conversación reciente:
            {conversation_history}
            
            Último mensaje del cliente: "{customer_text}"
            
            Responde como {agent_config.name} de manera natural, profesional y útil.
            Máximo 100 palabras. Si detectas intención de compra, guía hacia la reserva.
            Si hay problemas complejos, sugiere transferencia a humano.
            
            Formato de respuesta:
            RESPUESTA: [tu respuesta]
            INTENCIÓN: [intención detectada: consulta/interés/compra/problema/otro]
            ESCALACIÓN: [sí/no - si requiere agente humano]
            ACCIONES: [acciones sugeridas separadas por comas]
            """
            
            response = await self.openai_client.chat.completions.create(
                model=agent_config.ai_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=agent_config.temperature,
                max_tokens=200
            )
            
            ai_text = response.choices[0].message.content.strip()
            
            # Parse AI response
            return self._parse_ai_response(ai_text)
            
        except Exception as e:
            logger.error(f"❌ Error generating AI response: {str(e)}")
            return VoiceAgentResponse(
                response_text="Entiendo tu consulta. Déjame revisar la información.",
                confidence_score=0.3,
                next_state=ConversationState.WAITING_USER
            )
    
    def _parse_ai_response(self, ai_text: str) -> VoiceAgentResponse:
        """Parse structured AI response"""
        try:
            lines = ai_text.split('\n')
            
            response_text = ""
            intent = None
            escalation = False
            actions = []
            
            for line in lines:
                if line.startswith("RESPUESTA:"):
                    response_text = line.replace("RESPUESTA:", "").strip()
                elif line.startswith("INTENCIÓN:"):
                    intent = line.replace("INTENCIÓN:", "").strip()
                elif line.startswith("ESCALACIÓN:"):
                    escalation = "sí" in line.lower()
                elif line.startswith("ACCIONES:"):
                    actions_text = line.replace("ACCIONES:", "").strip()
                    actions = [a.strip() for a in actions_text.split(',') if a.strip()]
            
            # Default response if parsing fails
            if not response_text:
                response_text = ai_text[:200]  # First 200 chars
            
            next_state = ConversationState.TRANSFERRED if escalation else ConversationState.WAITING_USER
            
            return VoiceAgentResponse(
                response_text=response_text,
                suggested_actions=actions,
                intent_detected=intent,
                confidence_score=0.8,
                requires_human_escalation=escalation,
                next_state=next_state
            )
            
        except Exception as e:
            logger.error(f"❌ Error parsing AI response: {str(e)}")
            return VoiceAgentResponse(
                response_text=ai_text[:100],  # Fallback
                confidence_score=0.5,
                next_state=ConversationState.WAITING_USER
            )
    
    async def _get_conversation_context(self, session: ConversationSession) -> str:
        """Get relevant context for the conversation"""
        context_parts = []
        
        # Customer information
        if session.customer_id and self.crm_service:
            customer_info = await self.crm_service.get_customer_profile(session.customer_id)
            if customer_info:
                context_parts.append(f"Cliente: {customer_info.get('name', 'N/A')}")
                context_parts.append(f"Historial: {len(customer_info.get('bookings', []))} reservas")
        
        # Previous interactions
        if session.context.get("previous_calls"):
            context_parts.append("Ha llamado antes sobre consultas similares")
        
        # Current promotions or offers
        context_parts.append("Promociones actuales: Tour Madrid 15% descuento")
        
        return ". ".join(context_parts) if context_parts else "Cliente nuevo"
    
    async def _get_customer_info(self, customer_id: str) -> Dict[str, Any]:
        """Get customer information from CRM"""
        try:
            if self.crm_service:
                return await self.crm_service.get_customer_profile(customer_id)
            return {}
        except Exception as e:
            logger.error(f"❌ Error getting customer info: {str(e)}")
            return {}
    
    async def _save_conversation_to_crm(self, session: ConversationSession):
        """Save completed conversation to CRM system"""
        try:
            if not self.crm_service:
                return
            
            conversation_summary = {
                "session_id": session.session_id,
                "call_id": session.call_id,
                "agent_type": session.agent_type,
                "duration": (session.ended_at - session.started_at).total_seconds() if session.ended_at else 0,
                "message_count": len(session.messages),
                "outcome": session.outcomes,
                "transferred_to_human": session.transferred_to_human,
                "satisfaction_rating": session.satisfaction_rating,
                "agent_notes": session.agent_notes
            }
            
            await self.crm_service.save_voice_conversation(conversation_summary)
            logger.info(f"✅ Conversation saved to CRM: {session.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Error saving conversation to CRM: {str(e)}")
    
    async def transfer_to_human(self, call_id: str, reason: str = "Customer request") -> bool:
        """Transfer call to human agent"""
        try:
            session = self.active_sessions.get(call_id)
            if not session:
                return False
            
            session.state = ConversationState.TRANSFERRED
            session.transferred_to_human = True
            session.agent_notes += f" Transferred: {reason}"
            
            # Use PBX service to transfer call
            if self.pbx_service:
                transfer_success = await self.pbx_service.transfer_call(call_id, "human_agents")
                if transfer_success:
                    logger.info(f"✅ Call transferred to human agent: {call_id}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error transferring call: {str(e)}")
            return False
    
    async def get_conversation_analytics(self) -> Dict[str, Any]:
        """Get analytics about voice conversations"""
        try:
            total_sessions = len(self.active_sessions)
            completed_sessions = sum(1 for s in self.active_sessions.values() if s.state == ConversationState.COMPLETED)
            
            analytics = {
                "active_conversations": total_sessions,
                "completed_today": completed_sessions,
                "agent_utilization": {
                    agent_type: len([s for s in self.active_sessions.values() if s.agent_type == agent_type])
                    for agent_type in VoiceAgentType
                },
                "average_duration": 0,  # Calculate from completed sessions
                "transfer_rate": 0,     # Percentage transferred to humans
                "satisfaction_score": 0  # Average satisfaction
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"❌ Error getting conversation analytics: {str(e)}")
            return {}
    
    def get_available_agents(self) -> List[Dict[str, Any]]:
        """Get list of available AI voice agents"""
        return [
            {
                "agent_type": agent_type.value,
                "name": config.name,
                "description": config.description,
                "supported_languages": config.supported_languages,
                "voice_settings": config.voice_settings,
                "is_active": True
            }
            for agent_type, config in self.agent_configs.items()
        ]
    
    def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Get list of active conversation sessions"""
        return [
            {
                "session_id": session.session_id,
                "call_id": session.call_id,
                "agent_type": session.agent_type,
                "state": session.state,
                "duration": (datetime.now() - session.started_at).total_seconds(),
                "message_count": len(session.messages)
            }
            for session in self.active_sessions.values()
        ]

# Create singleton instance
ai_voice_agents_service = AIVoiceAgentsService()

__all__ = [
    'AIVoiceAgentsService',
    'VoiceAgentType',
    'ConversationState', 
    'VoiceAgentConfig',
    'VoiceMessage',
    'ConversationSession',
    'VoiceAgentResponse',
    'ai_voice_agents_service'
]