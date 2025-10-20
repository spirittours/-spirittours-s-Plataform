# VIP Tours Quotation Service
# Servicio de cotización automática para tours VIP privados

from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import asyncio
import json
from enum import Enum

from .models import (
    VIPItinerary, VIPDailyProgram, VIPQuote, VIPServiceRequest,
    VIPPriceCalculation, DynamicPricingRules, TransportRoutePricing,
    QuoteStatus, ServiceAvailability, ClientType, TourType
)
from ..provider_management.models import Provider, Vehicle, TourGuide, ProviderBooking
from ..ai.quote_validator import AIQuoteValidator
from ..notifications.service import NotificationService

class VIPQuotationService:
    """Servicio principal para cotizaciones VIP automáticas"""
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_validator = AIQuoteValidator()
        self.notification_service = NotificationService(db)
        
    async def create_instant_quote(
        self,
        itinerary_id: int,
        client_data: Dict[str, Any],
        travel_date: date,
        group_size: int,
        hotel_category: str = "4star",
        special_requests: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Crea una cotización instantánea con disponibilidad inmediata
        """
        # Obtener el itinerario
        itinerary = self.db.query(VIPItinerary).filter_by(id=itinerary_id).first()
        if not itinerary:
            raise ValueError(f"Itinerary {itinerary_id} not found")
        
        # Calcular fecha de fin basada en la duración
        end_date = travel_date + timedelta(days=itinerary.duration_days - 1)
        
        # Crear la cotización base
        quote = VIPQuote(
            quote_number=self._generate_quote_number(),
            itinerary_id=itinerary_id,
            client_type=ClientType[client_data.get('type', 'B2C')],
            client_name=client_data['name'],
            client_email=client_data.get('email'),
            client_phone=client_data.get('phone'),
            client_company=client_data.get('company'),
            tour_type=TourType.VIP_PRIVATE,
            travel_date=travel_date,
            end_date=end_date,
            group_size=group_size,
            special_requests=special_requests,
            status=QuoteStatus.DRAFT,
            valid_until=datetime.utcnow() + timedelta(days=2),  # 48 horas de validez
            confirmation_deadline=datetime.utcnow() + timedelta(days=1)  # 24 horas para confirmar
        )
        
        # Verificar disponibilidad de servicios
        availability_results = await self._check_services_availability(
            itinerary, travel_date, group_size, hotel_category
        )
        
        quote.services_availability = availability_results['details']
        
        # Si todos los servicios están disponibles inmediatamente
        if availability_results['all_available']:
            # Calcular precios automáticamente
            pricing = await self._calculate_automatic_pricing(
                itinerary, travel_date, group_size, hotel_category, client_data['type']
            )
            
            # Asignar precios a la cotización
            quote.total_hotel_cost = pricing['hotel_cost']
            quote.total_transport_cost = pricing['transport_cost']
            quote.total_guide_cost = pricing['guide_cost']
            quote.total_entrance_fees = pricing['entrance_fees']
            quote.total_meals_cost = pricing['meals_cost']
            quote.total_extras_cost = pricing['extras_cost']
            
            quote.subtotal = pricing['subtotal']
            quote.markup_percentage = pricing['markup_percentage']
            quote.total_price = pricing['total_price']
            quote.price_per_person = pricing['total_price'] / group_size
            
            # Aplicar comisiones si es B2B
            if client_data.get('type') in ['B2B', 'B2B2C']:
                commission = self._calculate_commission(client_data['type'], pricing['total_price'])
                quote.agent_commission_percentage = commission['percentage']
                quote.agent_commission_amount = commission['amount']
            
            quote.all_services_confirmed = True
            quote.status = QuoteStatus.SENT
            
            # Validar con IA
            ai_validation = await self.ai_validator.validate_quote(quote)
            quote.ai_validation_status = ai_validation['status']
            quote.ai_suggestions = ai_validation.get('suggestions')
            quote.ai_error_checks = ai_validation.get('errors')
            
            # Si hay errores críticos, marcar para revisión manual
            if ai_validation.get('errors') and ai_validation['errors'].get('critical'):
                quote.requires_manual_review = True
                
        else:
            # Algunos servicios requieren solicitud
            quote.all_services_confirmed = False
            quote.requires_manual_review = True
            
            # Crear solicitudes para servicios "upon request"
            await self._create_service_requests(quote, availability_results['upon_request'])
        
        # Guardar la cotización
        self.db.add(quote)
        self.db.commit()
        
        # Crear desgloses de precio
        self._create_price_calculations(quote, pricing if availability_results['all_available'] else None)
        
        # Notificar según el resultado
        if quote.all_services_confirmed:
            await self.notification_service.send_instant_quote_ready(quote)
        else:
            await self.notification_service.send_quote_pending_confirmation(quote)
        
        return self._format_quote_response(quote)
    
    async def create_upon_request_quote(
        self,
        itinerary_id: int,
        client_data: Dict[str, Any],
        travel_date: date,
        group_size: int,
        requested_hotels: List[str],
        customizations: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Crea una cotización para servicios que requieren solicitud a proveedores
        """
        itinerary = self.db.query(VIPItinerary).filter_by(id=itinerary_id).first()
        if not itinerary:
            raise ValueError(f"Itinerary {itinerary_id} not found")
        
        end_date = travel_date + timedelta(days=itinerary.duration_days - 1)
        
        # Crear cotización en estado pendiente
        quote = VIPQuote(
            quote_number=self._generate_quote_number(),
            itinerary_id=itinerary_id,
            client_type=ClientType[client_data.get('type', 'B2C')],
            client_name=client_data['name'],
            client_email=client_data.get('email'),
            client_phone=client_data.get('phone'),
            tour_type=TourType.VIP_PRIVATE,
            travel_date=travel_date,
            end_date=end_date,
            group_size=group_size,
            selected_hotels=requested_hotels,
            customizations=customizations,
            status=QuoteStatus.PENDING,
            all_services_confirmed=False,
            requires_manual_review=True
        )
        
        self.db.add(quote)
        self.db.commit()
        
        # Enviar solicitudes a proveedores
        service_requests = await self._send_provider_requests(
            quote, itinerary, requested_hotels
        )
        
        # Programar seguimiento de respuestas
        asyncio.create_task(self._monitor_provider_responses(quote.id))
        
        # Notificar al cliente sobre el tiempo de espera
        await self.notification_service.send_quote_processing_notification(
            quote,
            estimated_time_hours=24
        )
        
        return {
            'quote_id': quote.id,
            'quote_number': quote.quote_number,
            'status': 'processing',
            'estimated_completion': '24-48 hours',
            'pending_confirmations': len(service_requests)
        }
    
    async def _check_services_availability(
        self,
        itinerary: VIPItinerary,
        travel_date: date,
        group_size: int,
        hotel_category: str
    ) -> Dict[str, Any]:
        """
        Verifica la disponibilidad de todos los servicios necesarios
        """
        availability = {
            'all_available': True,
            'details': {},
            'upon_request': []
        }
        
        current_date = travel_date
        
        # Verificar cada día del itinerario
        for day_program in itinerary.daily_programs:
            day_key = f"day_{day_program.day_number}"
            availability['details'][day_key] = {}
            
            # Verificar hoteles
            hotel_available = await self._check_hotel_availability(
                current_date, hotel_category, group_size
            )
            availability['details'][day_key]['hotel'] = hotel_available
            
            # Verificar transporte
            transport_available = await self._check_transport_availability(
                current_date, day_program.transportation_type, group_size
            )
            availability['details'][day_key]['transport'] = transport_available
            
            # Verificar guías
            if day_program.guide_required:
                guide_available = await self._check_guide_availability(
                    current_date, day_program.destinations
                )
                availability['details'][day_key]['guide'] = guide_available
            
            # Actualizar estado general
            if not all([hotel_available == 'immediate', 
                       transport_available == 'immediate',
                       (not day_program.guide_required or guide_available == 'immediate')]):
                availability['all_available'] = False
                
                if hotel_available == 'upon_request':
                    availability['upon_request'].append(('hotel', day_key, current_date))
                if transport_available == 'upon_request':
                    availability['upon_request'].append(('transport', day_key, current_date))
                if day_program.guide_required and guide_available == 'upon_request':
                    availability['upon_request'].append(('guide', day_key, current_date))
            
            current_date += timedelta(days=1)
        
        return availability
    
    async def _check_hotel_availability(
        self,
        date: date,
        category: str,
        rooms_needed: int
    ) -> str:
        """
        Verifica disponibilidad de hoteles
        """
        # Buscar hoteles en el sistema con disponibilidad
        # Por simplicidad, simulamos la lógica
        
        # Si es temporada alta o con poca anticipación, requiere solicitud
        days_advance = (date - datetime.now().date()).days
        if days_advance < 7:
            return 'upon_request'
        
        # Verificar si hay hoteles de la categoría con habitaciones disponibles
        # Aquí iría la lógica real de verificación
        return 'immediate' if days_advance > 14 else 'upon_request'
    
    async def _check_transport_availability(
        self,
        date: date,
        transport_type: str,
        group_size: int
    ) -> str:
        """
        Verifica disponibilidad de transporte
        """
        # Determinar tipo de vehículo necesario
        vehicle_type = self._get_vehicle_type_for_group(group_size)
        
        # Buscar vehículos disponibles
        available_vehicles = self.db.query(Vehicle).filter(
            and_(
                Vehicle.vehicle_type == vehicle_type,
                Vehicle.is_available == True,
                Vehicle.capacity >= group_size
            )
        ).count()
        
        # Verificar reservas existentes para esa fecha
        existing_bookings = self.db.query(ProviderBooking).filter(
            and_(
                ProviderBooking.service_date == date,
                ProviderBooking.service_type == 'transport'
            )
        ).count()
        
        # Si hay suficientes vehículos disponibles
        if available_vehicles > existing_bookings + 2:  # Margen de seguridad
            return 'immediate'
        else:
            return 'upon_request'
    
    async def _check_guide_availability(
        self,
        date: date,
        destinations: List[str]
    ) -> str:
        """
        Verifica disponibilidad de guías
        """
        # Buscar guías que cubran los destinos
        suitable_guides = self.db.query(TourGuide).filter(
            and_(
                TourGuide.is_available == True,
                TourGuide.destinations.contains(destinations)
            )
        ).all()
        
        # Verificar disponibilidad en la fecha
        for guide in suitable_guides:
            # Verificar calendario del guía
            from ..provider_management.services import ProviderManagementService
            provider_service = ProviderManagementService(self.db)
            
            if provider_service.check_guide_availability(guide.id, date):
                return 'immediate'
        
        return 'upon_request'
    
    async def _calculate_automatic_pricing(
        self,
        itinerary: VIPItinerary,
        travel_date: date,
        group_size: int,
        hotel_category: str,
        client_type: str
    ) -> Dict[str, Decimal]:
        """
        Calcula los precios automáticamente basado en tarifas del sistema
        """
        pricing = {
            'hotel_cost': Decimal('0'),
            'transport_cost': Decimal('0'),
            'guide_cost': Decimal('0'),
            'entrance_fees': Decimal('0'),
            'meals_cost': Decimal('0'),
            'extras_cost': Decimal('0'),
            'subtotal': Decimal('0'),
            'markup_percentage': 20.0,  # Markup por defecto
            'total_price': Decimal('0')
        }
        
        # Calcular costo de hoteles
        nights = itinerary.duration_days - 1
        hotel_rate = self._get_hotel_rate(hotel_category, group_size)
        pricing['hotel_cost'] = hotel_rate * nights * self._calculate_rooms_needed(group_size)
        
        # Calcular costo de transporte
        for day_program in itinerary.daily_programs:
            if day_program.transportation_type:
                transport_cost = await self._calculate_transport_cost(
                    day_program, group_size, travel_date
                )
                pricing['transport_cost'] += transport_cost
        
        # Calcular costo de guías
        guide_days = len([d for d in itinerary.daily_programs if d.guide_required])
        guide_rate = self._get_guide_rate(itinerary.countries[0] if itinerary.countries else 'Israel')
        pricing['guide_cost'] = guide_rate * guide_days
        
        # Calcular entradas
        for day_program in itinerary.daily_programs:
            if day_program.entrance_fees:
                for entrance in day_program.entrance_fees:
                    pricing['entrance_fees'] += self._get_entrance_fee(entrance) * group_size
        
        # Calcular comidas
        meal_cost_per_person = Decimal('50')  # Costo promedio por día
        pricing['meals_cost'] = meal_cost_per_person * group_size * itinerary.duration_days
        
        # Aplicar reglas de precios dinámicos
        dynamic_adjustment = await self._apply_dynamic_pricing_rules(
            client_type, group_size, travel_date
        )
        
        # Calcular subtotal
        pricing['subtotal'] = (
            pricing['hotel_cost'] + 
            pricing['transport_cost'] + 
            pricing['guide_cost'] + 
            pricing['entrance_fees'] + 
            pricing['meals_cost'] + 
            pricing['extras_cost']
        )
        
        # Aplicar markup y ajustes dinámicos
        markup_multiplier = 1 + (pricing['markup_percentage'] / 100)
        pricing['total_price'] = pricing['subtotal'] * markup_multiplier
        
        # Aplicar ajustes dinámicos
        if dynamic_adjustment:
            pricing['total_price'] *= (1 + dynamic_adjustment / 100)
        
        return pricing
    
    async def _calculate_transport_cost(
        self,
        day_program: VIPDailyProgram,
        group_size: int,
        travel_date: date
    ) -> Decimal:
        """
        Calcula el costo de transporte para un día específico
        """
        vehicle_type = self._get_vehicle_type_for_group(group_size)
        base_cost = Decimal('500')  # Costo base por día
        
        # Buscar tarifa específica de ruta si existe
        if day_program.destinations and len(day_program.destinations) > 1:
            route_pricing = self.db.query(TransportRoutePricing).filter(
                and_(
                    TransportRoutePricing.origin == day_program.destinations[0],
                    TransportRoutePricing.destination == day_program.destinations[-1],
                    TransportRoutePricing.is_active == True
                )
            ).first()
            
            if route_pricing:
                if vehicle_type == 'bus':
                    base_cost = route_pricing.price_bus or base_cost
                elif vehicle_type == 'minibus':
                    base_cost = route_pricing.price_minibus or base_cost
                elif vehicle_type == 'van':
                    base_cost = route_pricing.price_van or base_cost
                else:
                    base_cost = route_pricing.price_sedan or base_cost
                
                # Aplicar suplemento por día largo si aplica
                if day_program.end_time and day_program.start_time:
                    duration_hours = self._calculate_day_duration(
                        day_program.start_time, 
                        day_program.end_time
                    )
                    if duration_hours > 10:
                        base_cost += route_pricing.long_day_surcharge or Decimal('100')
        
        # Ajustar por distancia si está disponible
        if day_program.total_distance_km:
            if day_program.total_distance_km > 200:
                base_cost *= Decimal('1.2')  # 20% extra para días largos
        
        return base_cost
    
    async def _apply_dynamic_pricing_rules(
        self,
        client_type: str,
        group_size: int,
        travel_date: date
    ) -> float:
        """
        Aplica reglas de precios dinámicos
        """
        total_adjustment = 0.0
        
        # Obtener reglas activas
        rules = self.db.query(DynamicPricingRules).filter(
            and_(
                DynamicPricingRules.is_active == True,
                or_(
                    DynamicPricingRules.applies_to == 'all',
                    DynamicPricingRules.applies_to == 'vip'
                ),
                or_(
                    DynamicPricingRules.client_type == client_type.lower(),
                    DynamicPricingRules.client_type == None
                )
            )
        ).order_by(DynamicPricingRules.priority.desc()).all()
        
        for rule in rules:
            # Verificar si la regla aplica
            applies = True
            
            # Verificar tamaño de grupo
            if rule.min_group_size and group_size < rule.min_group_size:
                applies = False
            if rule.max_group_size and group_size > rule.max_group_size:
                applies = False
            
            # Verificar anticipación
            if rule.min_advance_days:
                days_advance = (travel_date - datetime.now().date()).days
                if days_advance < rule.min_advance_days:
                    applies = False
            
            # Verificar temporada
            if rule.season_dates and applies:
                travel_month = travel_date.month
                if travel_month not in rule.season_dates.get('peak_months', []):
                    applies = False
            
            # Aplicar ajuste si corresponde
            if applies:
                if rule.adjustment_type == 'percentage':
                    total_adjustment += rule.adjustment_value
                # Para ajustes fijos, convertir a porcentaje (simplificado)
                # En producción, esto sería más sofisticado
        
        return total_adjustment
    
    def _calculate_commission(
        self,
        client_type: str,
        total_price: Decimal
    ) -> Dict[str, Any]:
        """
        Calcula la comisión para agentes B2B/B2B2C
        """
        commission_rates = {
            'B2B': 15.0,  # 15% para tour operadores
            'B2B2C': 12.0,  # 12% para agencias vendiendo a cliente final
        }
        
        percentage = commission_rates.get(client_type, 0)
        amount = total_price * Decimal(percentage / 100)
        
        return {
            'percentage': percentage,
            'amount': amount
        }
    
    async def _create_service_requests(
        self,
        quote: VIPQuote,
        upon_request_services: List[Tuple]
    ):
        """
        Crea solicitudes de servicio para elementos que requieren confirmación
        """
        for service_type, day_key, service_date in upon_request_services:
            request = VIPServiceRequest(
                quote_id=quote.id,
                service_type=service_type,
                service_date=service_date,
                availability=ServiceAvailability.UPON_REQUEST,
                request_sent_at=datetime.utcnow(),
                response_deadline=datetime.utcnow() + timedelta(hours=24)
            )
            
            self.db.add(request)
        
        self.db.commit()
    
    async def _send_provider_requests(
        self,
        quote: VIPQuote,
        itinerary: VIPItinerary,
        requested_hotels: List[str]
    ) -> List[VIPServiceRequest]:
        """
        Envía solicitudes a proveedores externos
        """
        requests = []
        
        # Aquí iría la lógica para enviar emails/API calls a proveedores
        # Por ahora, creamos las solicitudes en la base de datos
        
        for idx, hotel_name in enumerate(requested_hotels):
            request = VIPServiceRequest(
                quote_id=quote.id,
                service_type='hotel',
                service_date=quote.travel_date + timedelta(days=idx),
                service_details={'hotel_name': hotel_name, 'rooms': self._calculate_rooms_needed(quote.group_size)},
                availability=ServiceAvailability.UPON_REQUEST,
                request_sent_at=datetime.utcnow()
            )
            self.db.add(request)
            requests.append(request)
        
        self.db.commit()
        
        # Enviar notificaciones a proveedores
        for request in requests:
            await self.notification_service.send_provider_quote_request(request)
        
        return requests
    
    async def _monitor_provider_responses(self, quote_id: int):
        """
        Monitorea las respuestas de proveedores y actualiza la cotización
        """
        max_wait_hours = 48
        check_interval_hours = 2
        
        for _ in range(int(max_wait_hours / check_interval_hours)):
            await asyncio.sleep(check_interval_hours * 3600)
            
            # Verificar respuestas
            pending_requests = self.db.query(VIPServiceRequest).filter(
                and_(
                    VIPServiceRequest.quote_id == quote_id,
                    VIPServiceRequest.is_confirmed == False
                )
            ).all()
            
            if not pending_requests:
                # Todas las solicitudes confirmadas
                await self._finalize_quote(quote_id)
                break
            
            # Verificar timeouts
            for request in pending_requests:
                if request.response_deadline and datetime.utcnow() > request.response_deadline:
                    # Buscar alternativa o escalar
                    await self._handle_request_timeout(request)
    
    async def _finalize_quote(self, quote_id: int):
        """
        Finaliza una cotización una vez que todos los servicios están confirmados
        """
        quote = self.db.query(VIPQuote).filter_by(id=quote_id).first()
        if not quote:
            return
        
        # Calcular precio final basado en respuestas de proveedores
        total_cost = Decimal('0')
        
        for request in quote.service_requests:
            if request.confirmed_price:
                total_cost += request.confirmed_price
        
        # Aplicar markup
        quote.subtotal = total_cost
        quote.total_price = total_cost * Decimal('1.2')  # 20% markup
        quote.price_per_person = quote.total_price / quote.group_size
        
        quote.all_services_confirmed = True
        quote.status = QuoteStatus.SENT
        
        # Validar con IA
        ai_validation = await self.ai_validator.validate_quote(quote)
        quote.ai_validation_status = ai_validation['status']
        
        self.db.commit()
        
        # Notificar al cliente
        await self.notification_service.send_quote_ready(quote)
    
    async def _handle_request_timeout(self, request: VIPServiceRequest):
        """
        Maneja el timeout de una solicitud de servicio
        """
        # Marcar como timeout
        request.availability = ServiceAvailability.NOT_AVAILABLE
        self.db.commit()
        
        # Buscar alternativas o escalar a operaciones manuales
        await self.notification_service.send_request_timeout_alert(request)
    
    def _create_price_calculations(self, quote: VIPQuote, pricing: Optional[Dict]):
        """
        Crea el desglose detallado de precios
        """
        if not pricing:
            return
        
        components = [
            ('hotel', 'Alojamiento', pricing['hotel_cost']),
            ('transport', 'Transporte', pricing['transport_cost']),
            ('guide', 'Guías turísticos', pricing['guide_cost']),
            ('entrance', 'Entradas', pricing['entrance_fees']),
            ('meals', 'Comidas', pricing['meals_cost']),
            ('extras', 'Extras', pricing['extras_cost'])
        ]
        
        for comp_type, description, amount in components:
            if amount > 0:
                calculation = VIPPriceCalculation(
                    quote_id=quote.id,
                    component_type=comp_type,
                    component_description=description,
                    subtotal=amount,
                    final_price=amount,
                    is_included=True
                )
                self.db.add(calculation)
        
        self.db.commit()
    
    def _format_quote_response(self, quote: VIPQuote) -> Dict[str, Any]:
        """
        Formatea la respuesta de la cotización para el cliente
        """
        return {
            'quote_id': quote.id,
            'quote_number': quote.quote_number,
            'status': quote.status.value,
            'itinerary': {
                'name': quote.itinerary.name if quote.itinerary else None,
                'duration': quote.itinerary.duration_days if quote.itinerary else None,
                'countries': quote.itinerary.countries if quote.itinerary else None
            },
            'travel_dates': {
                'start': quote.travel_date.isoformat(),
                'end': quote.end_date.isoformat()
            },
            'group_size': quote.group_size,
            'pricing': {
                'subtotal': float(quote.subtotal) if quote.subtotal else None,
                'total_price': float(quote.total_price) if quote.total_price else None,
                'price_per_person': float(quote.price_per_person) if quote.price_per_person else None,
                'currency': 'USD'
            },
            'services_confirmed': quote.all_services_confirmed,
            'valid_until': quote.valid_until.isoformat() if quote.valid_until else None,
            'confirmation_deadline': quote.confirmation_deadline.isoformat() if quote.confirmation_deadline else None,
            'ai_validation': {
                'status': quote.ai_validation_status,
                'suggestions': quote.ai_suggestions,
                'requires_review': quote.requires_manual_review
            }
        }
    
    def _generate_quote_number(self) -> str:
        """
        Genera un número único de cotización
        """
        import random
        import string
        
        prefix = "VIP"
        date_str = datetime.now().strftime("%Y%m%d")
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        
        return f"{prefix}-{date_str}-{random_suffix}"
    
    def _get_vehicle_type_for_group(self, group_size: int) -> str:
        """
        Determina el tipo de vehículo necesario según el tamaño del grupo
        """
        if group_size <= 3:
            return 'sedan'
        elif group_size <= 7:
            return 'van'
        elif group_size <= 15:
            return 'minibus'
        else:
            return 'bus'
    
    def _calculate_rooms_needed(self, group_size: int) -> int:
        """
        Calcula el número de habitaciones necesarias
        """
        # Asumiendo ocupación doble
        return (group_size + 1) // 2
    
    def _get_hotel_rate(self, category: str, group_size: int) -> Decimal:
        """
        Obtiene la tarifa de hotel según categoría
        """
        rates = {
            '3star': Decimal('80'),
            '4star': Decimal('120'),
            '5star': Decimal('200'),
            'boutique': Decimal('180')
        }
        
        base_rate = rates.get(category, Decimal('120'))
        
        # Aplicar descuento por volumen
        if group_size >= 10:
            base_rate *= Decimal('0.9')  # 10% descuento
        
        return base_rate
    
    def _get_guide_rate(self, country: str) -> Decimal:
        """
        Obtiene la tarifa de guía según el país
        """
        rates = {
            'Israel': Decimal('350'),
            'Jordan': Decimal('300'),
            'Egypt': Decimal('280')
        }
        
        return rates.get(country, Decimal('300'))
    
    def _get_entrance_fee(self, entrance: str) -> Decimal:
        """
        Obtiene el costo de entrada para una atracción
        """
        # En producción, esto vendría de una tabla de base de datos
        fees = {
            'Petra': Decimal('50'),
            'Pyramids': Decimal('30'),
            'Dead Sea': Decimal('25'),
            'Masada': Decimal('20')
        }
        
        return fees.get(entrance, Decimal('15'))
    
    def _calculate_day_duration(self, start_time: str, end_time: str) -> float:
        """
        Calcula la duración de un día en horas
        """
        try:
            start = datetime.strptime(start_time, "%H:%M")
            end = datetime.strptime(end_time, "%H:%M")
            duration = (end - start).total_seconds() / 3600
            return duration if duration > 0 else duration + 24  # Manejo de días que cruzan medianoche
        except:
            return 8.0  # Duración por defecto