"""
WebSocket Handler for Real-Time Features
Handles real-time notifications, chat, booking updates, and AI agent responses
"""

import json
import asyncio
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from collections import defaultdict
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"

class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        # Almacenar conexiones activas por usuario
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Almacenar usuarios por sala/canal
        self.rooms: Dict[str, Set[str]] = defaultdict(set)
        
        # Almacenar información de usuarios conectados
        self.user_info: Dict[str, Dict] = {}
        
        # Estados de escritura
        self.typing_states: Dict[str, Set[str]] = defaultdict(set)
        
    async def connect(self, websocket: WebSocket, user_id: str, user_data: Dict):
        """Conectar un nuevo cliente"""
        await websocket.accept()
        
        # Si el usuario ya estaba conectado, cerrar conexión anterior
        if user_id in self.active_connections:
            await self.disconnect(user_id)
        
        self.active_connections[user_id] = websocket
        self.user_info[user_id] = user_data
        
        # Agregar a sala general
        self.rooms["general"].add(user_id)
        
        # Notificar a otros usuarios
        await self.broadcast_user_status(user_id, "online")
        
        # Enviar lista de usuarios en línea al nuevo usuario
        await self.send_online_users(user_id)
        
        logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections)}")
    
    async def disconnect(self, user_id: str):
        """Desconectar un cliente"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            
            # Remover de todas las salas
            for room_users in self.rooms.values():
                room_users.discard(user_id)
            
            # Limpiar estados de escritura
            for typing_users in self.typing_states.values():
                typing_users.discard(user_id)
            
            # Remover información del usuario
            if user_id in self.user_info:
                del self.user_info[user_id]
            
            # Notificar a otros usuarios
            await self.broadcast_user_status(user_id, "offline")
            
            logger.info(f"User {user_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Enviar mensaje a un usuario específico"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}")
                await self.disconnect(user_id)
    
    async def send_to_room(self, message: dict, room_id: str, exclude_user: Optional[str] = None):
        """Enviar mensaje a todos los usuarios en una sala"""
        if room_id in self.rooms:
            for user_id in self.rooms[room_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    await self.send_personal_message(message, user_id)
    
    async def broadcast(self, message: dict, exclude_user: Optional[str] = None):
        """Broadcast mensaje a todos los usuarios conectados"""
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user:
                await self.send_personal_message(message, user_id)
    
    async def broadcast_user_status(self, user_id: str, status: str):
        """Notificar el estado de un usuario a todos los demás"""
        message = {
            "type": f"user_{status}",
            "data": {
                "userId": user_id,
                "userName": self.user_info.get(user_id, {}).get("userName", "Unknown"),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await self.broadcast(message, exclude_user=user_id)
    
    async def send_online_users(self, user_id: str):
        """Enviar lista de usuarios en línea a un usuario específico"""
        online_users = [
            {
                "userId": uid,
                "userName": self.user_info.get(uid, {}).get("userName", "Unknown"),
                "role": self.user_info.get(uid, {}).get("role", "customer")
            }
            for uid in self.active_connections.keys()
            if uid != user_id
        ]
        
        message = {
            "type": "users_online",
            "data": {
                "users": online_users,
                "count": len(online_users)
            }
        }
        await self.send_personal_message(message, user_id)
    
    async def join_room(self, user_id: str, room_id: str):
        """Agregar usuario a una sala"""
        self.rooms[room_id].add(user_id)
        
        # Notificar a otros en la sala
        message = {
            "type": "user_joined_room",
            "data": {
                "roomId": room_id,
                "userId": user_id,
                "userName": self.user_info.get(user_id, {}).get("userName", "Unknown")
            }
        }
        await self.send_to_room(message, room_id, exclude_user=user_id)
    
    async def leave_room(self, user_id: str, room_id: str):
        """Remover usuario de una sala"""
        if room_id in self.rooms:
            self.rooms[room_id].discard(user_id)
            
            # Notificar a otros en la sala
            message = {
                "type": "user_left_room",
                "data": {
                    "roomId": room_id,
                    "userId": user_id,
                    "userName": self.user_info.get(user_id, {}).get("userName", "Unknown")
                }
            }
            await self.send_to_room(message, room_id)
    
    async def handle_typing(self, user_id: str, channel_id: str, is_typing: bool):
        """Manejar estado de escritura"""
        if is_typing:
            self.typing_states[channel_id].add(user_id)
        else:
            self.typing_states[channel_id].discard(user_id)
        
        # Notificar a otros en el canal
        message = {
            "type": "typing_start" if is_typing else "typing_stop",
            "data": {
                "channelId": channel_id,
                "userId": user_id,
                "userName": self.user_info.get(user_id, {}).get("userName", "Unknown")
            }
        }
        await self.send_to_room(message, channel_id, exclude_user=user_id)

# Instancia global del manager
manager = ConnectionManager()

class WebSocketService:
    """Servicio para manejar lógica de negocio de WebSocket"""
    
    @staticmethod
    async def send_booking_notification(booking_data: Dict):
        """Enviar notificación de reserva"""
        notification = {
            "type": "notification",
            "data": {
                "id": str(uuid.uuid4()),
                "title": "Nueva Reserva",
                "message": f"Reserva confirmada para {booking_data.get('tourName')}",
                "type": "success",
                "action": f"/booking/{booking_data.get('bookingId')}",
                "extra": booking_data
            }
        }
        
        # Enviar al cliente
        if "userId" in booking_data:
            await manager.send_personal_message(notification, booking_data["userId"])
        
        # Notificar a operadores
        operator_notification = {
            **notification,
            "data": {
                **notification["data"],
                "title": "Nueva Reserva Recibida",
                "message": f"Cliente {booking_data.get('customerName')} ha reservado {booking_data.get('tourName')}"
            }
        }
        await manager.send_to_room(operator_notification, "operators")
    
    @staticmethod
    async def send_agent_response(user_id: str, agent_name: str, response: str, data: Optional[Dict] = None):
        """Enviar respuesta de agente IA"""
        message = {
            "type": "agent_response",
            "data": {
                "agentName": agent_name,
                "response": response,
                "timestamp": datetime.utcnow().isoformat(),
                **(data or {})
            }
        }
        await manager.send_personal_message(message, user_id)
    
    @staticmethod
    async def broadcast_promotion(promotion_data: Dict):
        """Broadcast promoción a todos los usuarios"""
        message = {
            "type": "notification",
            "data": {
                "id": str(uuid.uuid4()),
                "title": "🎉 Nueva Promoción",
                "message": promotion_data.get("message", "Descubre nuestras nuevas ofertas"),
                "type": "info",
                "action": "/promotions",
                "extra": promotion_data
            }
        }
        await manager.broadcast(message)
    
    @staticmethod
    async def send_chat_message(sender_id: str, channel_id: str, content: str):
        """Enviar mensaje de chat"""
        sender_info = manager.user_info.get(sender_id, {})
        
        message = {
            "type": "chat_message",
            "data": {
                "messageId": str(uuid.uuid4()),
                "channelId": channel_id,
                "senderId": sender_id,
                "senderName": sender_info.get("userName", "Unknown"),
                "senderRole": sender_info.get("role", "customer"),
                "message": content,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        # Enviar a todos en el canal
        await manager.send_to_room(message, channel_id)
    
    @staticmethod
    async def update_booking_status(booking_id: str, status: str, user_id: str):
        """Actualizar estado de reserva"""
        status_messages = {
            "confirmed": "Tu reserva ha sido confirmada",
            "cancelled": "Tu reserva ha sido cancelada",
            "modified": "Tu reserva ha sido modificada",
            "pending": "Tu reserva está pendiente de confirmación",
            "completed": "Tu experiencia ha finalizado. ¡Esperamos que la hayas disfrutado!"
        }
        
        message = {
            "type": "booking_update",
            "data": {
                "bookingId": booking_id,
                "status": status,
                "message": status_messages.get(status, "Tu reserva ha sido actualizada"),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        await manager.send_personal_message(message, user_id)

async def verify_token(token: str) -> Optional[Dict]:
    """Verificar token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    """Endpoint principal de WebSocket"""
    
    # Verificar autenticación si se proporciona token
    user_data = None
    if token:
        user_data = await verify_token(token)
        if not user_data:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    else:
        # Generar ID temporal para usuarios no autenticados
        user_data = {
            "userId": f"guest_{uuid.uuid4().hex[:8]}",
            "userName": "Guest",
            "role": "guest"
        }
    
    user_id = user_data.get("userId")
    
    try:
        # Conectar cliente
        await manager.connect(websocket, user_id, user_data)
        
        while True:
            # Recibir mensaje
            data = await websocket.receive_json()
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            # Manejar diferentes tipos de mensajes
            if message_type == "ping":
                # Responder con pong
                await websocket.send_json({"type": "pong"})
            
            elif message_type == "join_room":
                room_id = message_data.get("roomId")
                if room_id:
                    await manager.join_room(user_id, room_id)
            
            elif message_type == "leave_room":
                room_id = message_data.get("roomId")
                if room_id:
                    await manager.leave_room(user_id, room_id)
            
            elif message_type == "typing_start":
                channel_id = message_data.get("channelId")
                if channel_id:
                    await manager.handle_typing(user_id, channel_id, True)
            
            elif message_type == "typing_stop":
                channel_id = message_data.get("channelId")
                if channel_id:
                    await manager.handle_typing(user_id, channel_id, False)
            
            elif message_type == "chat_message":
                channel_id = message_data.get("channelId", "general")
                content = message_data.get("message")
                if content:
                    await WebSocketService.send_chat_message(user_id, channel_id, content)
            
            elif message_type == "request_booking_update":
                booking_id = message_data.get("bookingId")
                # Aquí consultarías la base de datos para obtener el estado actual
                # Por ahora simulamos una respuesta
                await WebSocketService.update_booking_status(
                    booking_id,
                    "confirmed",
                    user_id
                )
            
            elif message_type == "agent_query":
                # Procesar consulta a agente IA
                agent_name = message_data.get("agent", "Assistant")
                query = message_data.get("query")
                # Aquí integrarías con los agentes IA
                # Por ahora simulamos una respuesta
                await WebSocketService.send_agent_response(
                    user_id,
                    agent_name,
                    f"Procesando tu consulta: {query}",
                    {"queryId": str(uuid.uuid4())}
                )
            
            else:
                # Mensaje no reconocido, eco para debug
                logger.warning(f"Unknown message type: {message_type}")
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": f"Unknown message type: {message_type}"
                    }
                })
    
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(user_id)

# Funciones de utilidad para usar desde otros módulos
async def notify_booking_created(booking_data: Dict):
    """Notificar creación de nueva reserva"""
    await WebSocketService.send_booking_notification(booking_data)

async def notify_booking_status_change(booking_id: str, status: str, user_id: str):
    """Notificar cambio de estado de reserva"""
    await WebSocketService.update_booking_status(booking_id, status, user_id)

async def broadcast_system_message(message: str, type: str = "info"):
    """Broadcast mensaje del sistema"""
    notification = {
        "type": "notification",
        "data": {
            "id": str(uuid.uuid4()),
            "title": "Sistema",
            "message": message,
            "type": type,
            "timestamp": datetime.utcnow().isoformat()
        }
    }
    await manager.broadcast(notification)

async def send_agent_notification(user_id: str, agent_name: str, message: str):
    """Enviar notificación de agente IA"""
    await WebSocketService.send_agent_response(user_id, agent_name, message)