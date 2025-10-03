"""
WebRTC Signaling Service - Spirit Tours Omnichannel Platform
Maneja conexiones WebRTC para llamadas directas desde navegador a AI Voice Agents
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Set, Optional, Any, List
from dataclasses import dataclass, asdict
from enum import Enum

import websockets
from websockets.server import WebSocketServerProtocol
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger(__name__)

class CallStatus(str, Enum):
    """Estados de llamada WebRTC"""
    INITIALIZING = "initializing"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ON_HOLD = "on_hold"
    TRANSFERRING = "transferring"
    ENDED = "ended"
    FAILED = "failed"

class SignalingMessageType(str, Enum):
    """Tipos de mensajes de señalización WebRTC"""
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice_candidate"
    CALL_REQUEST = "call_request"
    CALL_ACCEPTED = "call_accepted"
    CALL_REJECTED = "call_rejected"
    CALL_ENDED = "call_ended"
    AGENT_ASSIGNED = "agent_assigned"
    AUDIO_DATA = "audio_data"
    STATUS_UPDATE = "status_update"
    ERROR = "error"

@dataclass
class WebRTCSession:
    """Sesión WebRTC activa"""
    session_id: str
    client_id: str
    websocket: WebSocketServerProtocol
    ai_agent_type: Optional[str] = None
    ai_agent_id: Optional[str] = None
    call_status: CallStatus = CallStatus.INITIALIZING
    created_at: datetime = None
    connected_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    client_metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.client_metadata is None:
            self.client_metadata = {}

class SignalingMessage(BaseModel):
    """Mensaje de señalización WebRTC"""
    type: SignalingMessageType
    session_id: Optional[str] = None
    client_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WebRTCSignalingService:
    """
    Servicio de señalización WebRTC para conexiones de voz directas
    Integra con AI Voice Agents y 3CX PBX
    """
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.server = None
        self.is_running = False
        
        # Gestión de sesiones activas
        self.active_sessions: Dict[str, WebRTCSession] = {}
        self.client_sessions: Dict[str, str] = {}  # client_id -> session_id
        self.websocket_sessions: Dict[WebSocketServerProtocol, str] = {}  # websocket -> session_id
        
        # Referencias a servicios
        self.ai_voice_agents_service = None
        self.pbx_service = None
        
        # Estadísticas
        self.stats = {
            "total_sessions": 0,
            "active_calls": 0,
            "successful_connections": 0,
            "failed_connections": 0,
            "total_call_duration": 0
        }
        
    async def initialize(self, ai_voice_service=None, pbx_service=None):
        """Inicializar el servicio de señalización WebRTC"""
        try:
            logger.info("🔌 Initializing WebRTC Signaling Service...")
            
            # Configurar referencias a servicios
            self.ai_voice_agents_service = ai_voice_service
            self.pbx_service = pbx_service
            
            # Iniciar servidor WebSocket
            await self.start_server()
            
            logger.info(f"✅ WebRTC Signaling Service initialized on ws://{self.host}:{self.port}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing WebRTC Signaling Service: {str(e)}")
            return False
    
    async def start_server(self):
        """Iniciar servidor WebSocket para señalización"""
        try:
            self.server = await websockets.serve(
                self.handle_client_connection,
                self.host,
                self.port,
                ping_interval=20,
                ping_timeout=10,
                max_size=1024*1024  # 1MB max message size
            )
            self.is_running = True
            logger.info(f"🌐 WebSocket server started on ws://{self.host}:{self.port}")
            
        except Exception as e:
            logger.error(f"❌ Error starting WebSocket server: {str(e)}")
            raise
    
    async def stop_server(self):
        """Detener servidor WebSocket"""
        try:
            if self.server:
                self.server.close()
                await self.server.wait_closed()
                self.is_running = False
                logger.info("🔌 WebSocket server stopped")
                
        except Exception as e:
            logger.error(f"❌ Error stopping WebSocket server: {str(e)}")
    
    async def handle_client_connection(self, websocket: WebSocketServerProtocol, path: str):
        """Manejar nueva conexión de cliente WebRTC"""
        client_id = str(uuid.uuid4())
        logger.info(f"🔗 New WebRTC client connected: {client_id}")
        
        try:
            # Registrar websocket
            await self.register_websocket(websocket, client_id)
            
            # Manejar mensajes del cliente
            async for message in websocket:
                try:
                    await self.handle_client_message(websocket, message, client_id)
                except json.JSONDecodeError:
                    await self.send_error(websocket, "Invalid JSON format")
                except Exception as e:
                    logger.error(f"❌ Error handling client message: {str(e)}")
                    await self.send_error(websocket, f"Message handling error: {str(e)}")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"🔌 WebRTC client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"❌ Error in client connection: {str(e)}")
        finally:
            await self.cleanup_client_connection(websocket, client_id)
    
    async def register_websocket(self, websocket: WebSocketServerProtocol, client_id: str):
        """Registrar nueva conexión WebSocket"""
        self.websocket_sessions[websocket] = client_id
        
        # Enviar confirmación de conexión
        welcome_message = SignalingMessage(
            type=SignalingMessageType.STATUS_UPDATE,
            client_id=client_id,
            payload={
                "status": "connected",
                "message": "WebRTC signaling connected",
                "server_time": datetime.now().isoformat(),
                "available_agents": ["sales", "support", "booking", "consultant"]
            }
        )
        
        await self.send_message(websocket, welcome_message)
    
    async def handle_client_message(self, websocket: WebSocketServerProtocol, message: str, client_id: str):
        """Procesar mensaje del cliente"""
        try:
            data = json.loads(message)
            msg = SignalingMessage(**data)
            msg.client_id = client_id
            msg.timestamp = datetime.now()
            
            logger.info(f"📨 Received message type: {msg.type} from client: {client_id}")
            
            # Procesar según tipo de mensaje
            if msg.type == SignalingMessageType.CALL_REQUEST:
                await self.handle_call_request(websocket, msg)
            elif msg.type == SignalingMessageType.OFFER:
                await self.handle_webrtc_offer(websocket, msg)
            elif msg.type == SignalingMessageType.ANSWER:
                await self.handle_webrtc_answer(websocket, msg)
            elif msg.type == SignalingMessageType.ICE_CANDIDATE:
                await self.handle_ice_candidate(websocket, msg)
            elif msg.type == SignalingMessageType.CALL_ENDED:
                await self.handle_call_ended(websocket, msg)
            elif msg.type == SignalingMessageType.AUDIO_DATA:
                await self.handle_audio_data(websocket, msg)
            else:
                logger.warning(f"⚠️ Unknown message type: {msg.type}")
                
        except Exception as e:
            logger.error(f"❌ Error handling client message: {str(e)}")
            await self.send_error(websocket, f"Message processing error: {str(e)}")
    
    async def handle_call_request(self, websocket: WebSocketServerProtocol, msg: SignalingMessage):
        """Manejar solicitud de llamada del cliente"""
        try:
            # Crear nueva sesión WebRTC
            session_id = str(uuid.uuid4())
            
            # Obtener preferencias del cliente
            preferences = msg.payload.get("preferences", {})
            requested_agent = preferences.get("agent_type", "sales")
            customer_data = preferences.get("customer_data", {})
            
            # Determinar mejor AI agent disponible
            ai_agent_type = await self.select_best_agent(requested_agent, customer_data)
            
            # Crear sesión
            session = WebRTCSession(
                session_id=session_id,
                client_id=msg.client_id,
                websocket=websocket,
                ai_agent_type=ai_agent_type,
                client_metadata=customer_data,
                call_status=CallStatus.CONNECTING
            )
            
            # Registrar sesión
            self.active_sessions[session_id] = session
            self.client_sessions[msg.client_id] = session_id
            
            # Actualizar estadísticas
            self.stats["total_sessions"] += 1
            self.stats["active_calls"] += 1
            
            # Inicializar AI agent si está disponible
            if self.ai_voice_agents_service:
                ai_agent_id = await self.ai_voice_agents_service.initialize_call_session(
                    call_id=session_id,
                    agent_type=ai_agent_type,
                    customer_data=customer_data
                )
                session.ai_agent_id = ai_agent_id
            
            # Responder al cliente con agente asignado
            response = SignalingMessage(
                type=SignalingMessageType.AGENT_ASSIGNED,
                session_id=session_id,
                client_id=msg.client_id,
                payload={
                    "agent_type": ai_agent_type,
                    "agent_id": session.ai_agent_id,
                    "session_id": session_id,
                    "message": f"AI {ai_agent_type.title()} Agent assigned and ready",
                    "agent_info": await self.get_agent_info(ai_agent_type)
                }
            )
            
            await self.send_message(websocket, response)
            
            logger.info(f"📞 Call request processed - Session: {session_id}, Agent: {ai_agent_type}")
            
        except Exception as e:
            logger.error(f"❌ Error handling call request: {str(e)}")
            await self.send_error(websocket, f"Call request failed: {str(e)}")
    
    async def handle_webrtc_offer(self, websocket: WebSocketServerProtocol, msg: SignalingMessage):
        """Manejar oferta WebRTC del cliente"""
        try:
            session_id = msg.session_id
            session = self.active_sessions.get(session_id)
            
            if not session:
                await self.send_error(websocket, "Session not found")
                return
            
            # Procesar oferta SDP
            offer_sdp = msg.payload.get("sdp")
            if not offer_sdp:
                await self.send_error(websocket, "SDP offer required")
                return
            
            # Generar respuesta SDP (simulada para desarrollo)
            answer_sdp = await self.generate_answer_sdp(offer_sdp, session)
            
            # Actualizar estado de sesión
            session.call_status = CallStatus.CONNECTED
            session.connected_at = datetime.now()
            
            # Enviar respuesta SDP
            response = SignalingMessage(
                type=SignalingMessageType.ANSWER,
                session_id=session_id,
                client_id=msg.client_id,
                payload={
                    "sdp": answer_sdp,
                    "session_id": session_id
                }
            )
            
            await self.send_message(websocket, response)
            
            # Actualizar estadísticas
            self.stats["successful_connections"] += 1
            
            logger.info(f"🔊 WebRTC connection established - Session: {session_id}")
            
        except Exception as e:
            logger.error(f"❌ Error handling WebRTC offer: {str(e)}")
            await self.send_error(websocket, f"WebRTC offer failed: {str(e)}")
    
    async def handle_webrtc_answer(self, websocket: WebSocketServerProtocol, msg: SignalingMessage):
        """Manejar respuesta WebRTC"""
        try:
            session_id = msg.session_id
            session = self.active_sessions.get(session_id)
            
            if not session:
                await self.send_error(websocket, "Session not found")
                return
            
            # Procesar respuesta SDP
            answer_sdp = msg.payload.get("sdp")
            logger.info(f"📡 Received WebRTC answer for session: {session_id}")
            
            # Aquí se procesaría la respuesta SDP con el PBX/Media Server
            # Por ahora, confirmamos la conexión
            session.call_status = CallStatus.CONNECTED
            
        except Exception as e:
            logger.error(f"❌ Error handling WebRTC answer: {str(e)}")
    
    async def handle_ice_candidate(self, websocket: WebSocketServerProtocol, msg: SignalingMessage):
        """Manejar candidatos ICE para establecer conexión"""
        try:
            session_id = msg.session_id
            candidate = msg.payload.get("candidate")
            
            logger.debug(f"🧊 ICE candidate received for session: {session_id}")
            
            # Aquí se procesarían los candidatos ICE
            # En una implementación real, se enviarían al media server
            
        except Exception as e:
            logger.error(f"❌ Error handling ICE candidate: {str(e)}")
    
    async def handle_audio_data(self, websocket: WebSocketServerProtocol, msg: SignalingMessage):
        """Procesar datos de audio recibidos del cliente"""
        try:
            session_id = msg.session_id
            session = self.active_sessions.get(session_id)
            
            if not session or session.call_status != CallStatus.CONNECTED:
                return
            
            # Obtener datos de audio
            audio_data = msg.payload.get("audio_data")
            if not audio_data or not self.ai_voice_agents_service:
                return
            
            # Procesar con AI Voice Agent
            ai_response = await self.ai_voice_agents_service.process_voice_input(
                call_id=session_id,
                audio_data=audio_data
            )
            
            # Enviar respuesta del AI agent
            if ai_response:
                response_msg = SignalingMessage(
                    type=SignalingMessageType.AUDIO_DATA,
                    session_id=session_id,
                    client_id=msg.client_id,
                    payload={
                        "audio_response": ai_response.audio_data if hasattr(ai_response, 'audio_data') else None,
                        "text_response": ai_response.text_response if hasattr(ai_response, 'text_response') else None,
                        "agent_type": session.ai_agent_type
                    }
                )
                
                await self.send_message(websocket, response_msg)
            
        except Exception as e:
            logger.error(f"❌ Error processing audio data: {str(e)}")
    
    async def handle_call_ended(self, websocket: WebSocketServerProtocol, msg: SignalingMessage):
        """Manejar finalización de llamada"""
        try:
            session_id = msg.session_id
            session = self.active_sessions.get(session_id)
            
            if session:
                # Actualizar estado
                session.call_status = CallStatus.ENDED
                session.ended_at = datetime.now()
                
                # Calcular duración
                if session.connected_at:
                    duration = (session.ended_at - session.connected_at).total_seconds()
                    self.stats["total_call_duration"] += duration
                
                # Limpiar sesión con AI agent
                if self.ai_voice_agents_service and session.ai_agent_id:
                    await self.ai_voice_agents_service.end_call_session(
                        call_id=session_id,
                        agent_id=session.ai_agent_id
                    )
                
                # Actualizar estadísticas
                self.stats["active_calls"] = max(0, self.stats["active_calls"] - 1)
                
                logger.info(f"📞 Call ended - Session: {session_id}, Duration: {duration if 'duration' in locals() else 0:.2f}s")
            
        except Exception as e:
            logger.error(f"❌ Error handling call end: {str(e)}")
    
    async def cleanup_client_connection(self, websocket: WebSocketServerProtocol, client_id: str):
        """Limpiar conexión del cliente"""
        try:
            # Obtener sesión activa
            session_id = self.client_sessions.get(client_id)
            if session_id:
                session = self.active_sessions.get(session_id)
                if session and session.call_status not in [CallStatus.ENDED, CallStatus.FAILED]:
                    # Finalizar sesión activa
                    await self.handle_call_ended(websocket, SignalingMessage(
                        type=SignalingMessageType.CALL_ENDED,
                        session_id=session_id,
                        client_id=client_id
                    ))
                
                # Limpiar referencias
                del self.active_sessions[session_id]
                del self.client_sessions[client_id]
            
            # Limpiar websocket
            if websocket in self.websocket_sessions:
                del self.websocket_sessions[websocket]
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up client connection: {str(e)}")
    
    async def select_best_agent(self, requested_agent: str, customer_data: Dict) -> str:
        """Seleccionar el mejor AI agent según la solicitud y datos del cliente"""
        try:
            # Mapeo de agentes disponibles
            available_agents = ["sales", "support", "booking", "consultant"]
            
            # Si se solicita un agente específico y está disponible
            if requested_agent in available_agents:
                return requested_agent
            
            # Lógica inteligente de selección basada en datos del cliente
            if customer_data.get("has_booking"):
                return "support"
            elif customer_data.get("looking_for_tours"):
                return "sales"
            elif customer_data.get("needs_consultation"):
                return "consultant"
            else:
                return "sales"  # Default
                
        except Exception as e:
            logger.error(f"❌ Error selecting agent: {str(e)}")
            return "sales"  # Fallback
    
    async def generate_answer_sdp(self, offer_sdp: str, session: WebRTCSession) -> str:
        """Generar respuesta SDP para la oferta WebRTC"""
        # En una implementación real, esto integraría con un media server
        # Por ahora, generamos una respuesta simulada
        answer_sdp = f"""v=0
o=- {session.session_id} 2 IN IP4 127.0.0.1
s=Spirit Tours AI Agent Call
c=IN IP4 127.0.0.1
t=0 0
m=audio 5004 RTP/AVP 0 8 96
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:96 opus/48000/2
a=sendrecv"""
        
        return answer_sdp
    
    async def get_agent_info(self, agent_type: str) -> Dict[str, Any]:
        """Obtener información del agente IA"""
        agent_info = {
            "sales": {
                "name": "Sales Specialist Agent",
                "description": "Expert in tour recommendations and booking assistance",
                "capabilities": ["Product knowledge", "Price quotes", "Booking assistance"],
                "languages": ["es", "en", "fr", "de", "it"]
            },
            "support": {
                "name": "Customer Support Agent", 
                "description": "Dedicated to resolving customer issues and questions",
                "capabilities": ["Issue resolution", "Booking modifications", "Refund processing"],
                "languages": ["es", "en", "fr", "de", "it"]
            },
            "booking": {
                "name": "Booking Assistant Agent",
                "description": "Specialized in reservation management and modifications",
                "capabilities": ["Reservation management", "Availability checks", "Payment processing"],
                "languages": ["es", "en", "fr", "de", "it"]
            },
            "consultant": {
                "name": "Tour Consultant Agent",
                "description": "Personal travel consultant for customized recommendations",
                "capabilities": ["Personalized itineraries", "Cultural guidance", "Local insights"],
                "languages": ["es", "en", "fr", "de", "it"]
            }
        }
        
        return agent_info.get(agent_type, agent_info["sales"])
    
    async def send_message(self, websocket: WebSocketServerProtocol, message: SignalingMessage):
        """Enviar mensaje al cliente"""
        try:
            message_json = message.json()
            await websocket.send(message_json)
            
        except Exception as e:
            logger.error(f"❌ Error sending message: {str(e)}")
    
    async def send_error(self, websocket: WebSocketServerProtocol, error_message: str):
        """Enviar mensaje de error al cliente"""
        error_msg = SignalingMessage(
            type=SignalingMessageType.ERROR,
            payload={"error": error_message, "timestamp": datetime.now().isoformat()}
        )
        
        await self.send_message(websocket, error_msg)
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas del servicio"""
        return {
            "service_name": "WebRTC Signaling Service",
            "is_running": self.is_running,
            "server_info": {
                "host": self.host,
                "port": self.port,
                "protocol": "WebSocket"
            },
            "session_stats": {
                "active_sessions": len(self.active_sessions),
                "total_sessions": self.stats["total_sessions"],
                "active_calls": self.stats["active_calls"]
            },
            "connection_stats": {
                "successful_connections": self.stats["successful_connections"],
                "failed_connections": self.stats["failed_connections"],
                "success_rate": (
                    self.stats["successful_connections"] / 
                    max(1, self.stats["successful_connections"] + self.stats["failed_connections"])
                ) * 100
            },
            "call_stats": {
                "total_call_duration": self.stats["total_call_duration"],
                "average_call_duration": (
                    self.stats["total_call_duration"] / 
                    max(1, self.stats["successful_connections"])
                ) if self.stats["successful_connections"] > 0 else 0
            }
        }

# Instancia global del servicio
webrtc_signaling_service = WebRTCSignalingService()