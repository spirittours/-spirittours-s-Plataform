"""
WebSocket Manager for Real-time Quotation Updates
Implements privacy-aware broadcasting with selective visibility
"""

import asyncio
import json
import logging
from typing import Dict, Set, List, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from enum import Enum
import redis.asyncio as redis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ConnectionType(Enum):
    """Tipos de conexión WebSocket"""
    CLIENT = "CLIENT"  # Cliente B2B/B2B2C
    HOTEL = "HOTEL"    # Proveedor de hotel
    ADMIN = "ADMIN"    # Administrador del sistema
    AGENT = "AGENT"    # Agente de viajes


class EventType(Enum):
    """Tipos de eventos WebSocket"""
    # Eventos de cotización
    QUOTATION_CREATED = "quotation_created"
    QUOTATION_PUBLISHED = "quotation_published"
    QUOTATION_UPDATED = "quotation_updated"
    QUOTATION_CANCELLED = "quotation_cancelled"
    QUOTATION_EXPIRED = "quotation_expired"
    QUOTATION_AWARDED = "quotation_awarded"
    
    # Eventos de respuesta
    RESPONSE_RECEIVED = "response_received"
    RESPONSE_UPDATED = "response_updated"
    RESPONSE_WITHDRAWN = "response_withdrawn"
    
    # Eventos de precio
    PRICE_UPDATED = "price_updated"
    PRICE_VISIBILITY_CHANGED = "price_visibility_changed"
    
    # Eventos de pago
    DEPOSIT_RECEIVED = "deposit_received"
    PAYMENT_CONFIRMED = "payment_confirmed"
    
    # Eventos de deadline
    DEADLINE_APPROACHING = "deadline_approaching"
    DEADLINE_EXTENDED = "deadline_extended"
    
    # Eventos de sistema
    NOTIFICATION = "notification"
    SYSTEM_MESSAGE = "system_message"
    CONNECTION_STATUS = "connection_status"


class WebSocketManager:
    """
    Gestor de conexiones WebSocket con control de privacidad
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        # Diccionario de conexiones activas
        self.connections: Dict[str, Dict[str, WebSocket]] = {
            "quotations": {},  # Conexiones por cotización
            "companies": {},   # Conexiones por empresa
            "hotels": {},      # Conexiones por hotel
            "admins": {}       # Conexiones de administradores
        }
        
        # Mapeo de WebSocket a información de usuario
        self.socket_info: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Redis para pub/sub entre múltiples servidores
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        
        # Control de privacidad
        self.privacy_filters: Dict[str, Dict[str, bool]] = {}
        
        # Heartbeat para mantener conexiones vivas
        self.heartbeat_interval = 30  # segundos
        self.heartbeat_tasks: Dict[WebSocket, asyncio.Task] = {}
        
    async def initialize(self):
        """Inicializar conexión Redis y pub/sub"""
        try:
            self.redis_client = await redis.from_url(self.redis_url)
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe("quotation_events")
            logger.info("WebSocket Manager inicializado con Redis")
        except Exception as e:
            logger.error(f"Error inicializando Redis: {e}")
            # Funcionar sin Redis en modo single-server
            self.redis_client = None
            
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_type: ConnectionType,
        entity_id: str,  # quotation_id, company_id, o hotel_id
        user_role: str = "guest",
        metadata: Dict[str, Any] = None
    ) -> bool:
        """
        Conectar un WebSocket y registrar en los grupos apropiados
        
        Args:
            websocket: Conexión WebSocket
            user_id: ID del usuario
            user_type: Tipo de conexión
            entity_id: ID de la entidad (cotización, empresa, hotel)
            user_role: Rol del usuario (admin, manager, agent, client, hotel)
            metadata: Metadatos adicionales
            
        Returns:
            bool: True si la conexión fue exitosa
        """
        try:
            await websocket.accept()
            
            # Crear ID único para la conexión
            connection_id = f"{user_type.value}_{user_id}_{entity_id}_{datetime.now().timestamp()}"
            
            # Almacenar información del socket
            self.socket_info[websocket] = {
                "connection_id": connection_id,
                "user_id": user_id,
                "user_type": user_type,
                "entity_id": entity_id,
                "user_role": user_role,
                "metadata": metadata or {},
                "connected_at": datetime.now(),
                "last_activity": datetime.now()
            }
            
            # Registrar en grupos apropiados
            if user_type == ConnectionType.CLIENT:
                # Cliente se conecta a su empresa y cotizaciones
                self.connections["companies"][f"{entity_id}_{user_id}"] = websocket
                
            elif user_type == ConnectionType.HOTEL:
                # Hotel se conecta a sus cotizaciones
                self.connections["hotels"][f"{entity_id}_{user_id}"] = websocket
                
            elif user_type == ConnectionType.ADMIN:
                # Admin se conecta globalmente
                self.connections["admins"][user_id] = websocket
                
            # Registrar en cotización específica si aplica
            if metadata and "quotation_id" in metadata:
                quotation_id = metadata["quotation_id"]
                self.connections["quotations"][f"{quotation_id}_{user_id}"] = websocket
            
            # Iniciar heartbeat
            self.heartbeat_tasks[websocket] = asyncio.create_task(
                self._heartbeat_loop(websocket)
            )
            
            # Enviar confirmación de conexión
            await self._send_to_socket(websocket, {
                "type": EventType.CONNECTION_STATUS.value,
                "status": "connected",
                "connection_id": connection_id,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"WebSocket conectado: {connection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error conectando WebSocket: {e}")
            return False
            
    async def disconnect(self, websocket: WebSocket):
        """
        Desconectar un WebSocket y limpiar registros
        """
        try:
            # Obtener información del socket
            if websocket not in self.socket_info:
                return
                
            info = self.socket_info[websocket]
            connection_id = info["connection_id"]
            
            # Cancelar heartbeat
            if websocket in self.heartbeat_tasks:
                self.heartbeat_tasks[websocket].cancel()
                del self.heartbeat_tasks[websocket]
            
            # Remover de todos los grupos
            for group in self.connections.values():
                keys_to_remove = [k for k, v in group.items() if v == websocket]
                for key in keys_to_remove:
                    del group[key]
            
            # Remover información del socket
            del self.socket_info[websocket]
            
            logger.info(f"WebSocket desconectado: {connection_id}")
            
        except Exception as e:
            logger.error(f"Error desconectando WebSocket: {e}")
            
    async def broadcast_to_quotation(
        self,
        quotation_id: str,
        event_type: EventType,
        data: Dict[str, Any],
        exclude_sender: Optional[str] = None,
        privacy_settings: Optional[Dict[str, Any]] = None
    ):
        """
        Enviar mensaje a todos los participantes de una cotización
        con filtros de privacidad aplicados
        
        Args:
            quotation_id: ID de la cotización
            event_type: Tipo de evento
            data: Datos a enviar
            exclude_sender: ID del usuario que no debe recibir el mensaje
            privacy_settings: Configuración de privacidad de la cotización
        """
        message = {
            "type": event_type.value,
            "quotation_id": quotation_id,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        # Obtener todas las conexiones de esta cotización
        quotation_connections = {
            k: v for k, v in self.connections["quotations"].items() 
            if k.startswith(f"{quotation_id}_")
        }
        
        for connection_key, websocket in quotation_connections.items():
            try:
                user_id = connection_key.split("_")[1]
                
                # Excluir al sender si se especifica
                if exclude_sender and user_id == exclude_sender:
                    continue
                
                # Obtener información del socket
                socket_info = self.socket_info.get(websocket, {})
                user_type = socket_info.get("user_type")
                user_role = socket_info.get("user_role")
                
                # Aplicar filtros de privacidad
                filtered_message = self._apply_privacy_filters(
                    message=message.copy(),
                    user_type=user_type,
                    user_role=user_role,
                    user_id=user_id,
                    privacy_settings=privacy_settings
                )
                
                # Enviar mensaje filtrado
                await self._send_to_socket(websocket, filtered_message)
                
            except Exception as e:
                logger.error(f"Error enviando a {connection_key}: {e}")
                
    async def broadcast_to_hotels(
        self,
        quotation_id: str,
        hotel_ids: List[str],
        event_type: EventType,
        data: Dict[str, Any],
        privacy_settings: Optional[Dict[str, Any]] = None
    ):
        """
        Enviar mensaje a hoteles específicos con control de privacidad
        
        CRÍTICO: Por defecto, los hoteles NO pueden ver precios de competidores
        """
        for hotel_id in hotel_ids:
            # Buscar conexiones del hotel
            hotel_connections = {
                k: v for k, v in self.connections["hotels"].items()
                if k.startswith(f"{hotel_id}_")
            }
            
            for connection_key, websocket in hotel_connections.items():
                try:
                    socket_info = self.socket_info.get(websocket, {})
                    
                    # Preparar mensaje para el hotel
                    message = {
                        "type": event_type.value,
                        "quotation_id": quotation_id,
                        "data": self._filter_hotel_data(
                            data=data.copy(),
                            hotel_id=hotel_id,
                            privacy_settings=privacy_settings
                        ),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    await self._send_to_socket(websocket, message)
                    
                except Exception as e:
                    logger.error(f"Error enviando a hotel {hotel_id}: {e}")
                    
    async def send_to_company(
        self,
        company_id: str,
        event_type: EventType,
        data: Dict[str, Any]
    ):
        """
        Enviar mensaje a todos los usuarios de una empresa
        """
        company_connections = {
            k: v for k, v in self.connections["companies"].items()
            if k.startswith(f"{company_id}_")
        }
        
        message = {
            "type": event_type.value,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        for connection_key, websocket in company_connections.items():
            try:
                await self._send_to_socket(websocket, message)
            except Exception as e:
                logger.error(f"Error enviando a empresa {company_id}: {e}")
                
    async def broadcast_to_admins(
        self,
        event_type: EventType,
        data: Dict[str, Any]
    ):
        """
        Enviar mensaje a todos los administradores
        """
        message = {
            "type": event_type.value,
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "admin_broadcast": True
        }
        
        for admin_id, websocket in self.connections["admins"].items():
            try:
                await self._send_to_socket(websocket, message)
            except Exception as e:
                logger.error(f"Error enviando a admin {admin_id}: {e}")
                
    def _apply_privacy_filters(
        self,
        message: Dict[str, Any],
        user_type: ConnectionType,
        user_role: str,
        user_id: str,
        privacy_settings: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Aplicar filtros de privacidad al mensaje según el tipo de usuario
        
        REGLAS DE PRIVACIDAD:
        1. Hoteles NO ven precios de competidores por defecto
        2. Admins ven todo siempre
        3. Clientes ven todo de su cotización
        4. Agentes ven según permisos
        """
        # Admins ven todo
        if user_role == "admin":
            return message
            
        # Clientes ven todo de su cotización
        if user_type == ConnectionType.CLIENT:
            return message
            
        # Hoteles: aplicar filtros de privacidad
        if user_type == ConnectionType.HOTEL:
            privacy_settings = privacy_settings or {}
            hide_competitor_prices = privacy_settings.get("hide_competitor_prices", True)
            
            if hide_competitor_prices and "data" in message:
                # Filtrar información de competidores
                if "responses" in message["data"]:
                    # Ocultar precios de otros hoteles
                    filtered_responses = []
                    for response in message["data"]["responses"]:
                        if response.get("hotel_id") == user_id:
                            # Hotel puede ver su propia información completa
                            filtered_responses.append(response)
                        else:
                            # Ocultar información sensible de competidores
                            filtered_response = {
                                "hotel_id": response["hotel_id"],
                                "status": response.get("status"),
                                "submitted": response.get("submitted", False),
                                # NO incluir precios
                                "prices_hidden": True
                            }
                            filtered_responses.append(filtered_response)
                    
                    message["data"]["responses"] = filtered_responses
                    
                # Ocultar estadísticas de precios
                if "price_stats" in message["data"]:
                    message["data"]["price_stats"] = {"hidden": True}
                    
        return message
        
    def _filter_hotel_data(
        self,
        data: Dict[str, Any],
        hotel_id: str,
        privacy_settings: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Filtrar datos específicamente para un hotel
        
        CRÍTICO: Implementa la regla de que hoteles no ven precios de competidores
        """
        privacy_settings = privacy_settings or {}
        
        # Verificar si este hotel tiene permiso especial para ver precios
        special_permissions = privacy_settings.get("hotel_permissions", {})
        can_see_prices = special_permissions.get(hotel_id, {}).get("can_see_competitor_prices", False)
        
        if not can_see_prices:
            # Aplicar filtrado estricto
            if "competitor_prices" in data:
                del data["competitor_prices"]
                
            if "price_comparison" in data:
                del data["price_comparison"]
                
            if "average_price" in data:
                data["average_price"] = "hidden"
                
            if "lowest_price" in data:
                data["lowest_price"] = "hidden"
                
            if "highest_price" in data:
                data["highest_price"] = "hidden"
                
            # Marcar que los precios están ocultos
            data["competitor_prices_hidden"] = True
            
        return data
        
    async def _send_to_socket(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        Enviar mensaje a un WebSocket específico
        """
        try:
            await websocket.send_json(message)
            
            # Actualizar última actividad
            if websocket in self.socket_info:
                self.socket_info[websocket]["last_activity"] = datetime.now()
                
        except WebSocketDisconnect:
            await self.disconnect(websocket)
        except Exception as e:
            logger.error(f"Error enviando mensaje: {e}")
            await self.disconnect(websocket)
            
    async def _heartbeat_loop(self, websocket: WebSocket):
        """
        Mantener la conexión viva con heartbeat
        """
        try:
            while True:
                await asyncio.sleep(self.heartbeat_interval)
                
                # Enviar ping
                await self._send_to_socket(websocket, {
                    "type": "ping",
                    "timestamp": datetime.now().isoformat()
                })
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error en heartbeat: {e}")
            await self.disconnect(websocket)
            
    async def handle_message(
        self,
        websocket: WebSocket,
        message: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Procesar mensaje recibido de un cliente WebSocket
        """
        try:
            message_type = message.get("type")
            
            # Responder a ping con pong
            if message_type == "ping":
                return {"type": "pong", "timestamp": datetime.now().isoformat()}
                
            # Actualizar última actividad
            if websocket in self.socket_info:
                self.socket_info[websocket]["last_activity"] = datetime.now()
                
            # Procesar otros tipos de mensajes según necesidad
            # ...
            
            return None
            
        except Exception as e:
            logger.error(f"Error procesando mensaje: {e}")
            return {
                "type": "error",
                "message": "Error procesando mensaje",
                "timestamp": datetime.now().isoformat()
            }
            
    async def publish_event(
        self,
        event_type: EventType,
        data: Dict[str, Any],
        target: str = "all"
    ):
        """
        Publicar evento a través de Redis para sincronización multi-servidor
        """
        if self.redis_client:
            try:
                message = {
                    "type": event_type.value,
                    "data": data,
                    "target": target,
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.redis_client.publish(
                    "quotation_events",
                    json.dumps(message)
                )
                
            except Exception as e:
                logger.error(f"Error publicando evento a Redis: {e}")
                
    async def get_connection_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de conexiones activas
        """
        return {
            "total_connections": len(self.socket_info),
            "by_type": {
                "clients": sum(1 for s in self.socket_info.values() 
                             if s["user_type"] == ConnectionType.CLIENT),
                "hotels": sum(1 for s in self.socket_info.values() 
                            if s["user_type"] == ConnectionType.HOTEL),
                "admins": sum(1 for s in self.socket_info.values() 
                            if s["user_type"] == ConnectionType.ADMIN),
                "agents": sum(1 for s in self.socket_info.values() 
                            if s["user_type"] == ConnectionType.AGENT)
            },
            "by_quotation": len(self.connections["quotations"]),
            "by_company": len(self.connections["companies"]),
            "by_hotel": len(self.connections["hotels"]),
            "timestamp": datetime.now().isoformat()
        }
        
    async def close(self):
        """
        Cerrar todas las conexiones y limpiar recursos
        """
        # Cancelar todos los heartbeats
        for task in self.heartbeat_tasks.values():
            task.cancel()
            
        # Cerrar todas las conexiones WebSocket
        for socket in list(self.socket_info.keys()):
            await self.disconnect(socket)
            
        # Cerrar conexión Redis
        if self.redis_client:
            await self.redis_client.close()
            
        logger.info("WebSocket Manager cerrado")


# Instancia global del manager
ws_manager = WebSocketManager()