"""
Event Bus Central para arquitectura Event-Driven
Maneja la comunicación asíncrona entre todos los servicios del sistema
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Callable, Optional, Set
from enum import Enum
from dataclasses import dataclass, asdict
import aioredis
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class EventType(Enum):
    """Tipos de eventos del sistema"""
    
    # Eventos de Cotización
    QUOTATION_CREATED = "quotation.created"
    QUOTATION_UPDATED = "quotation.updated"
    QUOTATION_APPROVED = "quotation.approved"
    QUOTATION_REJECTED = "quotation.rejected"
    QUOTATION_EXPIRED = "quotation.expired"
    QUOTATION_CONVERTED = "quotation.converted"
    
    # Eventos de Reserva
    BOOKING_CREATED = "booking.created"
    BOOKING_CONFIRMED = "booking.confirmed"
    BOOKING_CANCELLED = "booking.cancelled"
    BOOKING_MODIFIED = "booking.modified"
    BOOKING_COMPLETED = "booking.completed"
    
    # Eventos de Pago
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_PENDING = "payment.pending"
    REFUND_PROCESSED = "refund.processed"
    REFUND_FAILED = "refund.failed"
    
    # Eventos de Guías
    GUIDE_ASSIGNED = "guide.assigned"
    GUIDE_CONFIRMED = "guide.confirmed"
    GUIDE_DECLINED = "guide.declined"
    GUIDE_CHECKIN = "guide.checkin"
    GUIDE_CHECKOUT = "guide.checkout"
    GUIDE_UNAVAILABLE = "guide.unavailable"
    
    # Eventos de Hotel
    HOTEL_RESERVED = "hotel.reserved"
    HOTEL_CONFIRMED = "hotel.confirmed"
    HOTEL_CANCELLED = "hotel.cancelled"
    HOTEL_WAITLISTED = "hotel.waitlisted"
    HOTEL_PRICE_UPDATED = "hotel.price_updated"
    
    # Eventos de Transporte
    TRANSPORT_BOOKED = "transport.booked"
    TRANSPORT_CONFIRMED = "transport.confirmed"
    TRANSPORT_CANCELLED = "transport.cancelled"
    ROUTE_OPTIMIZED = "route.optimized"
    VEHICLE_ASSIGNED = "vehicle.assigned"
    
    # Eventos de Itinerario
    ITINERARY_CREATED = "itinerary.created"
    ITINERARY_UPDATED = "itinerary.updated"
    ITINERARY_OPTIMIZED = "itinerary.optimized"
    ITINERARY_APPROVED = "itinerary.approved"
    
    # Eventos de Workflow
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_STEP_COMPLETED = "workflow.step_completed"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    WORKFLOW_CANCELLED = "workflow.cancelled"
    
    # Eventos de Sistema
    SYSTEM_ERROR = "system.error"
    SYSTEM_WARNING = "system.warning"
    SYSTEM_INFO = "system.info"
    CACHE_INVALIDATED = "cache.invalidated"
    
    # Eventos de Integración
    INTEGRATION_REQUEST = "integration.request"
    INTEGRATION_RESPONSE = "integration.response"
    INTEGRATION_ERROR = "integration.error"
    
    # Eventos de Analytics
    ANALYTICS_EVENT = "analytics.event"
    METRIC_RECORDED = "metric.recorded"
    REPORT_GENERATED = "report.generated"


@dataclass
class EventMetadata:
    """Metadata para eventos"""
    correlation_id: str
    causation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    service_name: Optional[str] = None
    api_version: str = "1.0"
    environment: str = "production"


@dataclass
class Event:
    """Estructura de un evento"""
    id: str
    type: EventType
    payload: Dict[str, Any]
    metadata: EventMetadata
    timestamp: datetime
    version: str = "1.0"
    
    def __post_init__(self):
        if isinstance(self.type, str):
            self.type = EventType(self.type)
        if isinstance(self.timestamp, str):
            self.timestamp = datetime.fromisoformat(self.timestamp)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir evento a diccionario"""
        return {
            'id': self.id,
            'type': self.type.value,
            'payload': self.payload,
            'metadata': asdict(self.metadata),
            'timestamp': self.timestamp.isoformat(),
            'version': self.version
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Crear evento desde diccionario"""
        metadata = EventMetadata(**data['metadata'])
        return cls(
            id=data['id'],
            type=EventType(data['type']),
            payload=data['payload'],
            metadata=metadata,
            timestamp=datetime.fromisoformat(data['timestamp']),
            version=data.get('version', '1.0')
        )


class EventHandler:
    """Manejador de eventos con reintentos y error handling"""
    
    def __init__(
        self,
        handler: Callable,
        event_types: List[EventType],
        filter_func: Optional[Callable] = None,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        self.handler = handler
        self.event_types = set(event_types)
        self.filter_func = filter_func
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.error_count = 0
        self.last_error = None
    
    async def handle(self, event: Event) -> Any:
        """Manejar evento con reintentos"""
        if event.type not in self.event_types:
            return
        
        if self.filter_func and not self.filter_func(event):
            return
        
        for attempt in range(self.max_retries):
            try:
                result = await self.handler(event)
                self.error_count = 0
                return result
            except Exception as e:
                self.error_count += 1
                self.last_error = e
                logger.error(
                    f"Error handling event {event.id} (attempt {attempt + 1}/{self.max_retries}): {str(e)}"
                )
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
                else:
                    raise


class EventBus:
    """
    Event Bus Central para comunicación entre servicios
    Implementa pub/sub pattern con persistencia y reintentos
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None
        self.subscribers: Dict[EventType, List[EventHandler]] = {}
        self.event_store: List[Event] = []
        self.dead_letter_queue: List[Event] = []
        self.running = False
        self.tasks: Set[asyncio.Task] = set()
        
        # Configuración
        self.max_event_store_size = 10000
        self.enable_persistence = True
        self.enable_dead_letter_queue = True
        
    async def connect(self):
        """Conectar a Redis para persistencia y pub/sub distribuido"""
        try:
            self.redis = await aioredis.create_redis_pool(
                self.redis_url,
                encoding='utf-8'
            )
            self.running = True
            logger.info("Event Bus connected to Redis")
            
            # Iniciar listener para eventos distribuidos
            asyncio.create_task(self._listen_redis_events())
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            # Funcionar sin Redis en modo local
            self.running = True
    
    async def disconnect(self):
        """Desconectar de Redis"""
        self.running = False
        
        # Cancelar todas las tareas
        for task in self.tasks:
            task.cancel()
        
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()
    
    async def publish(
        self,
        event_type: EventType,
        payload: Dict[str, Any],
        metadata: Optional[EventMetadata] = None
    ) -> Event:
        """
        Publicar un evento al bus
        """
        # Crear evento
        event = Event(
            id=str(uuid.uuid4()),
            type=event_type,
            payload=payload,
            metadata=metadata or EventMetadata(
                correlation_id=str(uuid.uuid4())
            ),
            timestamp=datetime.utcnow(),
            version="1.0"
        )
        
        # Guardar en event store
        if self.enable_persistence:
            await self._persist_event(event)
        
        # Agregar a store local
        self.event_store.append(event)
        if len(self.event_store) > self.max_event_store_size:
            self.event_store = self.event_store[-self.max_event_store_size:]
        
        # Publicar a Redis para distribución
        if self.redis:
            await self.redis.publish(
                f"events:{event.type.value}",
                json.dumps(event.to_dict())
            )
        
        # Notificar a suscriptores locales
        await self._notify_subscribers(event)
        
        logger.info(f"Event published: {event.type.value} - {event.id}")
        return event
    
    def subscribe(
        self,
        event_types: List[EventType],
        handler: Callable,
        filter_func: Optional[Callable] = None,
        max_retries: int = 3
    ):
        """
        Suscribir handler a tipos de eventos
        """
        event_handler = EventHandler(
            handler=handler,
            event_types=event_types,
            filter_func=filter_func,
            max_retries=max_retries
        )
        
        for event_type in event_types:
            if event_type not in self.subscribers:
                self.subscribers[event_type] = []
            self.subscribers[event_type].append(event_handler)
        
        logger.info(f"Handler subscribed to: {[et.value for et in event_types]}")
    
    def unsubscribe(self, handler: Callable, event_types: Optional[List[EventType]] = None):
        """
        Desuscribir handler de eventos
        """
        types_to_check = event_types or list(self.subscribers.keys())
        
        for event_type in types_to_check:
            if event_type in self.subscribers:
                self.subscribers[event_type] = [
                    eh for eh in self.subscribers[event_type]
                    if eh.handler != handler
                ]
    
    async def _notify_subscribers(self, event: Event):
        """
        Notificar a todos los suscriptores de un evento
        """
        if event.type not in self.subscribers:
            return
        
        tasks = []
        for handler in self.subscribers[event.type]:
            task = asyncio.create_task(self._handle_event_safe(handler, event))
            tasks.append(task)
            self.tasks.add(task)
            task.add_done_callback(self.tasks.discard)
        
        # No esperar a que terminen todos los handlers
        # para no bloquear la publicación
        if tasks:
            asyncio.gather(*tasks, return_exceptions=True)
    
    async def _handle_event_safe(self, handler: EventHandler, event: Event):
        """
        Manejar evento de forma segura con error handling
        """
        try:
            await handler.handle(event)
        except Exception as e:
            logger.error(f"Handler failed for event {event.id}: {str(e)}")
            
            if self.enable_dead_letter_queue:
                self.dead_letter_queue.append(event)
                await self._persist_dead_letter(event, str(e))
    
    async def _persist_event(self, event: Event):
        """
        Persistir evento en Redis
        """
        if not self.redis:
            return
        
        try:
            # Guardar en stream de Redis
            await self.redis.xadd(
                f"event_stream:{event.type.value}",
                {
                    'event': json.dumps(event.to_dict())
                },
                max_len=10000  # Limitar tamaño del stream
            )
            
            # También guardar en sorted set por timestamp
            await self.redis.zadd(
                "events:timeline",
                event.timestamp.timestamp(),
                event.id
            )
            
            # Guardar evento completo con TTL
            await self.redis.setex(
                f"event:{event.id}",
                86400 * 7,  # 7 días TTL
                json.dumps(event.to_dict())
            )
            
        except Exception as e:
            logger.error(f"Failed to persist event {event.id}: {str(e)}")
    
    async def _persist_dead_letter(self, event: Event, error: str):
        """
        Persistir evento en dead letter queue
        """
        if not self.redis:
            return
        
        try:
            dead_letter_data = {
                'event': json.dumps(event.to_dict()),
                'error': error,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.redis.lpush(
                "dead_letter_queue",
                json.dumps(dead_letter_data)
            )
            
        except Exception as e:
            logger.error(f"Failed to persist to DLQ: {str(e)}")
    
    async def _listen_redis_events(self):
        """
        Escuchar eventos de Redis para distribución
        """
        if not self.redis:
            return
        
        try:
            # Suscribirse a todos los canales de eventos
            channels = [f"events:*"]
            channel_list = await self.redis.subscribe(*channels)
            
            while self.running:
                try:
                    message = await channel_list[0].get(encoding='utf-8')
                    if message:
                        event_data = json.loads(message)
                        event = Event.from_dict(event_data)
                        
                        # Solo procesar si no es un evento propio
                        if event.id not in [e.id for e in self.event_store[-100:]]:
                            await self._notify_subscribers(event)
                            
                except Exception as e:
                    logger.error(f"Error processing Redis event: {str(e)}")
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"Redis listener error: {str(e)}")
    
    async def replay_events(
        self,
        from_timestamp: Optional[datetime] = None,
        to_timestamp: Optional[datetime] = None,
        event_types: Optional[List[EventType]] = None
    ) -> List[Event]:
        """
        Reproducir eventos históricos desde el event store
        """
        events_to_replay = []
        
        # Filtrar eventos del store local
        for event in self.event_store:
            if from_timestamp and event.timestamp < from_timestamp:
                continue
            if to_timestamp and event.timestamp > to_timestamp:
                continue
            if event_types and event.type not in event_types:
                continue
            events_to_replay.append(event)
        
        # Si hay Redis, buscar eventos persistidos
        if self.redis and self.enable_persistence:
            stored_events = await self._load_events_from_redis(
                from_timestamp,
                to_timestamp,
                event_types
            )
            events_to_replay.extend(stored_events)
        
        # Eliminar duplicados
        seen = set()
        unique_events = []
        for event in events_to_replay:
            if event.id not in seen:
                seen.add(event.id)
                unique_events.append(event)
        
        # Ordenar por timestamp
        unique_events.sort(key=lambda e: e.timestamp)
        
        # Republicar eventos
        for event in unique_events:
            await self._notify_subscribers(event)
        
        return unique_events
    
    async def _load_events_from_redis(
        self,
        from_timestamp: Optional[datetime],
        to_timestamp: Optional[datetime],
        event_types: Optional[List[EventType]]
    ) -> List[Event]:
        """
        Cargar eventos desde Redis
        """
        if not self.redis:
            return []
        
        events = []
        
        try:
            # Obtener IDs de eventos en el rango de tiempo
            min_score = from_timestamp.timestamp() if from_timestamp else '-inf'
            max_score = to_timestamp.timestamp() if to_timestamp else '+inf'
            
            event_ids = await self.redis.zrangebyscore(
                "events:timeline",
                min_score,
                max_score
            )
            
            # Cargar eventos completos
            for event_id in event_ids:
                event_data = await self.redis.get(f"event:{event_id}")
                if event_data:
                    event = Event.from_dict(json.loads(event_data))
                    if not event_types or event.type in event_types:
                        events.append(event)
                        
        except Exception as e:
            logger.error(f"Failed to load events from Redis: {str(e)}")
        
        return events
    
    async def get_event_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas del event bus
        """
        stats = {
            'total_events': len(self.event_store),
            'dead_letter_queue_size': len(self.dead_letter_queue),
            'subscribers': {},
            'event_types': {}
        }
        
        # Estadísticas de suscriptores
        for event_type, handlers in self.subscribers.items():
            stats['subscribers'][event_type.value] = len(handlers)
        
        # Estadísticas por tipo de evento
        for event in self.event_store:
            event_type = event.type.value
            if event_type not in stats['event_types']:
                stats['event_types'][event_type] = 0
            stats['event_types'][event_type] += 1
        
        return stats
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Verificar salud del event bus
        """
        health = {
            'status': 'healthy' if self.running else 'unhealthy',
            'redis_connected': self.redis is not None,
            'active_tasks': len(self.tasks),
            'event_store_size': len(self.event_store),
            'dead_letter_queue_size': len(self.dead_letter_queue)
        }
        
        # Verificar conexión a Redis
        if self.redis:
            try:
                await self.redis.ping()
                health['redis_status'] = 'connected'
            except:
                health['redis_status'] = 'disconnected'
                health['status'] = 'degraded'
        
        return health


# Singleton global del Event Bus
_event_bus: Optional[EventBus] = None


async def get_event_bus() -> EventBus:
    """
    Obtener instancia singleton del Event Bus
    """
    global _event_bus
    
    if _event_bus is None:
        _event_bus = EventBus()
        await _event_bus.connect()
    
    return _event_bus


@asynccontextmanager
async def event_bus_context():
    """
    Context manager para Event Bus
    """
    bus = await get_event_bus()
    try:
        yield bus
    finally:
        # No desconectar aquí porque es singleton
        pass