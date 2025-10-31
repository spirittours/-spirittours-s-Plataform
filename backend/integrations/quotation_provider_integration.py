"""
Integración entre Sistema de Cotizaciones y Proveedores
Maneja la comunicación bidireccional para solicitar y recibir cotizaciones
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
from enum import Enum
import uuid

from backend.core.event_bus import EventBus, Event, EventType, EventMetadata, get_event_bus
from backend.core.workflow_engine import WorkflowEngine, Workflow, WorkflowStep, get_workflow_engine
from backend.services.advanced_cost_calculation_service import AdvancedCostCalculationService

logger = logging.getLogger(__name__)


class ProviderType(Enum):
    """Tipos de proveedores"""
    HOTEL = "HOTEL"
    TRANSPORT = "TRANSPORT"
    GUIDE = "GUIDE"
    ACTIVITY = "ACTIVITY"
    RESTAURANT = "RESTAURANT"
    ENTRANCE = "ENTRANCE"
    OTHER = "OTHER"


class QuotationMethod(Enum):
    """Métodos de cotización"""
    AUTOMATIC = "AUTOMATIC"  # API instantánea
    MANUAL = "MANUAL"        # Requiere intervención humana
    HYBRID = "HYBRID"        # Automático con confirmación manual


class QuotationStatus(Enum):
    """Estados de cotización con proveedor"""
    PENDING = "PENDING"
    REQUESTED = "REQUESTED"
    RECEIVED = "RECEIVED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class ProviderAPIAdapter:
    """
    Adaptador base para APIs de proveedores
    """
    
    def __init__(self, provider_type: ProviderType):
        self.provider_type = provider_type
        self.timeout = 30  # segundos
        self.max_retries = 3
    
    async def search_availability(
        self,
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Buscar disponibilidad según criterios
        """
        raise NotImplementedError
    
    async def get_instant_quote(
        self,
        provider_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Obtener cotización instantánea
        """
        raise NotImplementedError
    
    async def request_manual_quote(
        self,
        provider_id: str,
        requirements: Dict[str, Any]
    ) -> str:
        """
        Solicitar cotización manual
        """
        raise NotImplementedError
    
    async def check_quote_status(
        self,
        quote_id: str
    ) -> Dict[str, Any]:
        """
        Verificar estado de cotización
        """
        raise NotImplementedError
    
    async def confirm_booking(
        self,
        quote_id: str
    ) -> Dict[str, Any]:
        """
        Confirmar reserva con proveedor
        """
        raise NotImplementedError
    
    async def cancel_booking(
        self,
        booking_id: str,
        reason: str
    ) -> bool:
        """
        Cancelar reserva
        """
        raise NotImplementedError


class HotelAPIAdapter(ProviderAPIAdapter):
    """
    Adaptador para APIs de hoteles
    """
    
    def __init__(self):
        super().__init__(ProviderType.HOTEL)
        self.api_endpoints = {
            'search': '/api/hotels/search',
            'quote': '/api/hotels/quote',
            'book': '/api/hotels/book'
        }
    
    async def search_availability(
        self,
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Buscar hoteles disponibles
        """
        # Simulación de búsqueda en API
        await asyncio.sleep(0.5)  # Simular latencia
        
        return [
            {
                'hotel_id': f'HTL-{uuid.uuid4().hex[:8]}',
                'name': 'Grand Hotel Example',
                'location': criteria.get('destination'),
                'rating': 4.5,
                'room_types': [
                    {
                        'type': 'Standard',
                        'available': 10,
                        'price_per_night': 120.00,
                        'max_occupancy': 2
                    },
                    {
                        'type': 'Suite',
                        'available': 3,
                        'price_per_night': 250.00,
                        'max_occupancy': 4
                    }
                ],
                'amenities': ['wifi', 'pool', 'gym', 'restaurant'],
                'quotation_method': QuotationMethod.AUTOMATIC.value
            }
        ]
    
    async def get_instant_quote(
        self,
        provider_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Obtener cotización instantánea de hotel
        """
        await asyncio.sleep(0.3)
        
        nights = requirements.get('nights', 1)
        rooms = requirements.get('rooms', 1)
        base_price = 120.00 * nights * rooms
        
        # Calcular descuentos por volumen
        discount = 0
        if rooms >= 10:
            discount = 0.15
        elif rooms >= 5:
            discount = 0.10
        
        total = base_price * (1 - discount)
        
        return {
            'quote_id': f'QHT-{uuid.uuid4().hex[:8]}',
            'hotel_id': provider_id,
            'check_in': requirements.get('check_in'),
            'check_out': requirements.get('check_out'),
            'rooms': rooms,
            'nights': nights,
            'base_price': base_price,
            'discount_percent': discount * 100,
            'total_price': total,
            'includes': ['breakfast', 'wifi', 'parking'],
            'cancellation_policy': 'Free cancellation up to 48h',
            'valid_until': (datetime.utcnow() + timedelta(days=7)).isoformat(),
            'status': QuotationStatus.RECEIVED.value
        }


class TransportAPIAdapter(ProviderAPIAdapter):
    """
    Adaptador para APIs de transporte
    """
    
    def __init__(self):
        super().__init__(ProviderType.TRANSPORT)
        self.vehicle_types = {
            'sedan': {'capacity': 4, 'price_per_km': 1.5},
            'van': {'capacity': 12, 'price_per_km': 2.5},
            'minibus': {'capacity': 20, 'price_per_km': 3.5},
            'bus': {'capacity': 50, 'price_per_km': 5.0}
        }
    
    async def search_availability(
        self,
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Buscar vehículos disponibles
        """
        await asyncio.sleep(0.4)
        
        passengers = criteria.get('passengers', 1)
        
        # Determinar tipo de vehículo necesario
        suitable_vehicles = []
        for vehicle_type, specs in self.vehicle_types.items():
            if specs['capacity'] >= passengers:
                suitable_vehicles.append({
                    'vehicle_id': f'VHC-{uuid.uuid4().hex[:8]}',
                    'type': vehicle_type,
                    'capacity': specs['capacity'],
                    'price_per_km': specs['price_per_km'],
                    'available': True,
                    'features': self._get_vehicle_features(vehicle_type),
                    'quotation_method': QuotationMethod.AUTOMATIC.value
                })
        
        return suitable_vehicles
    
    def _get_vehicle_features(self, vehicle_type: str) -> List[str]:
        """
        Obtener características del vehículo
        """
        features = {
            'sedan': ['a/c', 'gps', 'premium'],
            'van': ['a/c', 'gps', 'luggage_space'],
            'minibus': ['a/c', 'gps', 'microphone', 'luggage_compartment'],
            'bus': ['a/c', 'gps', 'microphone', 'bathroom', 'luggage_compartment']
        }
        return features.get(vehicle_type, [])
    
    async def get_instant_quote(
        self,
        provider_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Obtener cotización instantánea de transporte
        """
        await asyncio.sleep(0.3)
        
        distance_km = requirements.get('distance_km', 100)
        days = requirements.get('days', 1)
        vehicle_type = requirements.get('vehicle_type', 'van')
        
        # Calcular precio base
        price_per_km = self.vehicle_types[vehicle_type]['price_per_km']
        base_price = distance_km * price_per_km
        
        # Agregar cargo por día adicional
        if days > 1:
            base_price += (days - 1) * 100  # Cargo diario adicional
        
        # Agregar extras
        extras = 0
        if requirements.get('include_driver', True):
            extras += days * 50  # Costo del conductor por día
        if requirements.get('include_fuel', True):
            extras += distance_km * 0.5  # Costo de combustible
        
        total = base_price + extras
        
        return {
            'quote_id': f'QTR-{uuid.uuid4().hex[:8]}',
            'vehicle_id': provider_id,
            'vehicle_type': vehicle_type,
            'distance_km': distance_km,
            'days': days,
            'base_price': base_price,
            'extras': extras,
            'total_price': total,
            'includes': ['driver', 'fuel', 'insurance', 'tolls'],
            'valid_until': (datetime.utcnow() + timedelta(days=3)).isoformat(),
            'status': QuotationStatus.RECEIVED.value
        }


class GuideAPIAdapter(ProviderAPIAdapter):
    """
    Adaptador para APIs de guías turísticos
    """
    
    def __init__(self):
        super().__init__(ProviderType.GUIDE)
        self.guide_categories = {
            'licensed': {'base_rate': 150, 'languages': ['es', 'en', 'pt', 'fr']},
            'tour_leader': {'base_rate': 100, 'languages': ['es', 'en']},
            'local': {'base_rate': 50, 'languages': ['es']}
        }
    
    async def search_availability(
        self,
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Buscar guías disponibles
        """
        await asyncio.sleep(0.3)
        
        date = criteria.get('date')
        languages = criteria.get('languages', ['es'])
        specializations = criteria.get('specializations', [])
        
        # Simular búsqueda de guías
        available_guides = []
        for category, specs in self.guide_categories.items():
            # Verificar si el guía tiene los idiomas requeridos
            if any(lang in specs['languages'] for lang in languages):
                available_guides.append({
                    'guide_id': f'GID-{uuid.uuid4().hex[:8]}',
                    'name': f'Guide {category.title()}',
                    'category': category,
                    'languages': specs['languages'],
                    'specializations': ['history', 'culture', 'gastronomy'],
                    'daily_rate': specs['base_rate'],
                    'rating': 4.7,
                    'availability': True,
                    'quotation_method': QuotationMethod.AUTOMATIC.value
                })
        
        return available_guides
    
    async def get_instant_quote(
        self,
        provider_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Obtener cotización instantánea de guía
        """
        await asyncio.sleep(0.2)
        
        days = requirements.get('days', 1)
        category = requirements.get('category', 'tour_leader')
        group_size = requirements.get('group_size', 1)
        
        # Precio base
        base_rate = self.guide_categories[category]['base_rate']
        base_price = base_rate * days
        
        # Ajuste por tamaño de grupo
        if group_size > 20:
            base_price *= 1.2  # 20% adicional para grupos grandes
        
        # Extras
        extras = 0
        if requirements.get('include_meals', False):
            extras += days * 25  # Alimentación del guía
        if requirements.get('include_accommodation', False):
            extras += (days - 1) * 50  # Alojamiento del guía
        
        total = base_price + extras
        
        return {
            'quote_id': f'QGD-{uuid.uuid4().hex[:8]}',
            'guide_id': provider_id,
            'category': category,
            'days': days,
            'daily_rate': base_rate,
            'base_price': base_price,
            'extras': extras,
            'total_price': total,
            'includes': ['guiding_service', 'local_knowledge', 'translations'],
            'valid_until': (datetime.utcnow() + timedelta(days=5)).isoformat(),
            'status': QuotationStatus.RECEIVED.value
        }


class QuotationProviderIntegration:
    """
    Servicio de integración principal entre Cotizaciones y Proveedores
    Orquesta la comunicación y manejo de cotizaciones múltiples
    """
    
    def __init__(self):
        self.event_bus: Optional[EventBus] = None
        self.workflow_engine: Optional[WorkflowEngine] = None
        
        # Adaptadores de API por tipo
        self.provider_apis = {
            ProviderType.HOTEL: HotelAPIAdapter(),
            ProviderType.TRANSPORT: TransportAPIAdapter(),
            ProviderType.GUIDE: GuideAPIAdapter()
        }
        
        # Cache de cotizaciones
        self.quotation_cache: Dict[str, Dict[str, Any]] = {}
        
        # Configuración
        self.parallel_requests_limit = 10
        self.quote_validity_days = 7
    
    async def initialize(self):
        """
        Inicializar el servicio de integración
        """
        self.event_bus = await get_event_bus()
        self.workflow_engine = await get_workflow_engine()
        
        # Suscribir a eventos relevantes
        self.event_bus.subscribe(
            [EventType.QUOTATION_CREATED],
            self.handle_quotation_created
        )
        
        self.event_bus.subscribe(
            [EventType.QUOTATION_APPROVED],
            self.handle_quotation_approved
        )
        
        logger.info("QuotationProviderIntegration initialized")
    
    async def handle_quotation_created(self, event: Event):
        """
        Manejar evento de cotización creada
        """
        quotation_id = event.payload.get('quotation_id')
        requirements = event.payload.get('requirements')
        
        logger.info(f"Handling quotation created: {quotation_id}")
        
        # Solicitar cotizaciones a proveedores
        all_quotes = await self.request_quotes_from_all_providers(
            quotation_id,
            requirements
        )
        
        # Publicar evento con resultados
        await self.event_bus.publish(
            EventType.INTEGRATION_RESPONSE,
            {
                'quotation_id': quotation_id,
                'provider_quotes': all_quotes,
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=event.metadata.correlation_id,
                causation_id=event.id,
                service_name='quotation_provider_integration'
            )
        )
    
    async def handle_quotation_approved(self, event: Event):
        """
        Manejar evento de cotización aprobada - confirmar con proveedores
        """
        quotation_id = event.payload.get('quotation_id')
        selected_providers = event.payload.get('selected_providers', {})
        
        logger.info(f"Handling quotation approved: {quotation_id}")
        
        # Confirmar reservas con proveedores seleccionados
        confirmations = await self.confirm_provider_bookings(
            quotation_id,
            selected_providers
        )
        
        # Publicar evento de confirmación
        await self.event_bus.publish(
            EventType.BOOKING_CREATED,
            {
                'quotation_id': quotation_id,
                'confirmations': confirmations,
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=event.metadata.correlation_id,
                causation_id=event.id,
                service_name='quotation_provider_integration'
            )
        )
    
    async def request_quotes_from_all_providers(
        self,
        quotation_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, List[Any]]:
        """
        Solicitar cotizaciones a todos los proveedores relevantes en paralelo
        """
        logger.info(f"Requesting quotes for quotation {quotation_id}")
        
        tasks = []
        task_info = []
        
        # Preparar tareas para cada tipo de proveedor
        if requirements.get('accommodation'):
            task = self._request_hotel_quotes(
                quotation_id,
                requirements['accommodation']
            )
            tasks.append(task)
            task_info.append(('hotels', task))
        
        if requirements.get('transportation'):
            task = self._request_transport_quotes(
                quotation_id,
                requirements['transportation']
            )
            tasks.append(task)
            task_info.append(('transport', task))
        
        if requirements.get('guides'):
            task = self._request_guide_quotes(
                quotation_id,
                requirements['guides']
            )
            tasks.append(task)
            task_info.append(('guides', task))
        
        # Ejecutar todas las solicitudes en paralelo
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Procesar resultados
        all_quotes = {
            'hotels': [],
            'transport': [],
            'guides': [],
            'activities': [],
            'errors': [],
            'summary': {
                'total_providers_contacted': 0,
                'automatic_quotes': 0,
                'manual_quotes': 0,
                'failed_requests': 0
            }
        }
        
        for i, (category, task) in enumerate(task_info):
            result = results[i]
            if isinstance(result, Exception):
                all_quotes['errors'].append({
                    'category': category,
                    'error': str(result)
                })
                all_quotes['summary']['failed_requests'] += 1
            else:
                all_quotes[category] = result.get('quotes', [])
                all_quotes['summary']['total_providers_contacted'] += len(result.get('quotes', []))
                
                # Contar tipos de cotización
                for quote in result.get('quotes', []):
                    if quote.get('quotation_method') == QuotationMethod.AUTOMATIC.value:
                        all_quotes['summary']['automatic_quotes'] += 1
                    else:
                        all_quotes['summary']['manual_quotes'] += 1
        
        # Guardar en caché
        self.quotation_cache[quotation_id] = all_quotes
        
        # Publicar evento con todos los quotes recibidos
        await self.event_bus.publish(
            EventType.INTEGRATION_RESPONSE,
            {
                'quotation_id': quotation_id,
                'quotes': all_quotes,
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=quotation_id,
                service_name='quotation_provider_integration'
            )
        )
        
        return all_quotes
    
    async def _request_hotel_quotes(
        self,
        quotation_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, List[Any]]:
        """
        Solicitar cotizaciones de hoteles
        """
        hotel_quotes = []
        adapter = self.provider_apis[ProviderType.HOTEL]
        
        try:
            # Buscar hoteles disponibles
            available_hotels = await adapter.search_availability(requirements)
            
            # Limitar solicitudes paralelas
            semaphore = asyncio.Semaphore(self.parallel_requests_limit)
            
            async def get_quote_with_semaphore(hotel):
                async with semaphore:
                    if hotel['quotation_method'] == QuotationMethod.AUTOMATIC.value:
                        # Cotización automática
                        quote = await adapter.get_instant_quote(
                            hotel['hotel_id'],
                            requirements
                        )
                        quote['provider_details'] = hotel
                        return quote
                    else:
                        # Cotización manual - enviar solicitud
                        request_id = await adapter.request_manual_quote(
                            hotel['hotel_id'],
                            requirements
                        )
                        return {
                            'hotel_id': hotel['hotel_id'],
                            'status': QuotationStatus.REQUESTED.value,
                            'request_id': request_id,
                            'provider_details': hotel
                        }
            
            # Obtener cotizaciones en paralelo
            quote_tasks = [get_quote_with_semaphore(hotel) for hotel in available_hotels]
            quotes = await asyncio.gather(*quote_tasks, return_exceptions=True)
            
            # Filtrar errores
            for quote in quotes:
                if not isinstance(quote, Exception):
                    hotel_quotes.append(quote)
            
        except Exception as e:
            logger.error(f"Error requesting hotel quotes: {str(e)}")
            raise
        
        return {'quotes': hotel_quotes}
    
    async def _request_transport_quotes(
        self,
        quotation_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, List[Any]]:
        """
        Solicitar cotizaciones de transporte
        """
        transport_quotes = []
        adapter = self.provider_apis[ProviderType.TRANSPORT]
        
        try:
            # Buscar vehículos disponibles
            available_vehicles = await adapter.search_availability(requirements)
            
            # Obtener cotizaciones
            for vehicle in available_vehicles:
                if vehicle['quotation_method'] == QuotationMethod.AUTOMATIC.value:
                    quote = await adapter.get_instant_quote(
                        vehicle['vehicle_id'],
                        requirements
                    )
                    quote['provider_details'] = vehicle
                    transport_quotes.append(quote)
            
        except Exception as e:
            logger.error(f"Error requesting transport quotes: {str(e)}")
            raise
        
        return {'quotes': transport_quotes}
    
    async def _request_guide_quotes(
        self,
        quotation_id: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, List[Any]]:
        """
        Solicitar cotizaciones de guías
        """
        guide_quotes = []
        adapter = self.provider_apis[ProviderType.GUIDE]
        
        try:
            # Buscar guías disponibles
            available_guides = await adapter.search_availability(requirements)
            
            # Obtener cotizaciones
            for guide in available_guides:
                if guide['quotation_method'] == QuotationMethod.AUTOMATIC.value:
                    quote = await adapter.get_instant_quote(
                        guide['guide_id'],
                        requirements
                    )
                    quote['provider_details'] = guide
                    guide_quotes.append(quote)
            
        except Exception as e:
            logger.error(f"Error requesting guide quotes: {str(e)}")
            raise
        
        return {'quotes': guide_quotes}
    
    async def confirm_provider_bookings(
        self,
        quotation_id: str,
        selected_providers: Dict[str, List[str]]
    ) -> Dict[str, List[Any]]:
        """
        Confirmar reservas con proveedores seleccionados
        """
        confirmations = {
            'confirmed': [],
            'failed': [],
            'pending': []
        }
        
        # Obtener cotizaciones del caché
        cached_quotes = self.quotation_cache.get(quotation_id, {})
        
        # Confirmar cada tipo de proveedor
        for provider_type, quote_ids in selected_providers.items():
            for quote_id in quote_ids:
                try:
                    # Buscar adaptador correspondiente
                    if provider_type == 'hotels':
                        adapter = self.provider_apis[ProviderType.HOTEL]
                    elif provider_type == 'transport':
                        adapter = self.provider_apis[ProviderType.TRANSPORT]
                    elif provider_type == 'guides':
                        adapter = self.provider_apis[ProviderType.GUIDE]
                    else:
                        continue
                    
                    # Confirmar reserva
                    confirmation = await adapter.confirm_booking(quote_id)
                    confirmations['confirmed'].append({
                        'provider_type': provider_type,
                        'quote_id': quote_id,
                        'booking_id': confirmation.get('booking_id'),
                        'confirmation': confirmation
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to confirm booking for {quote_id}: {str(e)}")
                    confirmations['failed'].append({
                        'provider_type': provider_type,
                        'quote_id': quote_id,
                        'error': str(e)
                    })
        
        return confirmations
    
    async def get_quotation_status(
        self,
        quotation_id: str
    ) -> Dict[str, Any]:
        """
        Obtener estado actual de todas las cotizaciones de proveedores
        """
        if quotation_id not in self.quotation_cache:
            return {'status': 'not_found'}
        
        cached = self.quotation_cache[quotation_id]
        
        # Actualizar estados de cotizaciones manuales pendientes
        for category in ['hotels', 'transport', 'guides']:
            for quote in cached.get(category, []):
                if quote.get('status') == QuotationStatus.REQUESTED.value:
                    # Verificar estado actualizado
                    # (En producción esto consultaría la API real)
                    pass
        
        return cached
    
    async def cancel_quotation(
        self,
        quotation_id: str,
        reason: str = "Customer request"
    ) -> bool:
        """
        Cancelar todas las cotizaciones/reservas asociadas
        """
        if quotation_id not in self.quotation_cache:
            return False
        
        cached = self.quotation_cache[quotation_id]
        cancellation_results = []
        
        # Cancelar cada cotización confirmada
        # (Implementación completa requeriría tracking de confirmaciones)
        
        # Publicar evento de cancelación
        await self.event_bus.publish(
            EventType.QUOTATION_REJECTED,
            {
                'quotation_id': quotation_id,
                'reason': reason,
                'cancellation_results': cancellation_results
            },
            EventMetadata(
                correlation_id=quotation_id,
                service_name='quotation_provider_integration'
            )
        )
        
        # Limpiar caché
        del self.quotation_cache[quotation_id]
        
        return True


# Singleton global
_integration_service: Optional[QuotationProviderIntegration] = None


async def get_quotation_provider_integration() -> QuotationProviderIntegration:
    """
    Obtener instancia singleton del servicio de integración
    """
    global _integration_service
    
    if _integration_service is None:
        _integration_service = QuotationProviderIntegration()
        await _integration_service.initialize()
    
    return _integration_service