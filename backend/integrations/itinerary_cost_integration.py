"""
Integración entre Sistema de Itinerarios y Cálculo de Costos
Calcula costos completos incluyendo todos los componentes y gastos operacionales
"""

import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal, ROUND_UP
from enum import Enum
import uuid
import json

from core.event_bus import EventBus, Event, EventType, EventMetadata, get_event_bus
from services.advanced_cost_calculation_service import AdvancedCostCalculationService
from core.cache import cache_manager

logger = logging.getLogger(__name__)


class CostComponent(Enum):
    """Componentes de costo"""
    ACCOMMODATION = "ACCOMMODATION"
    TRANSPORT = "TRANSPORT"
    GUIDE = "GUIDE"
    ENTRANCE_TICKETS = "ENTRANCE_TICKETS"
    MEALS = "MEALS"
    ACTIVITIES = "ACTIVITIES"
    OPERATIONAL = "OPERATIONAL"
    STAFF_ACCOMMODATION = "STAFF_ACCOMMODATION"
    STAFF_MEALS = "STAFF_MEALS"
    FUEL = "FUEL"
    TOLLS = "TOLLS"
    PARKING = "PARKING"
    INSURANCE = "INSURANCE"
    PERMITS = "PERMITS"
    EMERGENCY_FUND = "EMERGENCY_FUND"
    TIPS_GRATUITIES = "TIPS_GRATUITIES"


class PricingStrategy(Enum):
    """Estrategias de precio"""
    STANDARD = "STANDARD"          # Precio estándar con margen normal
    PREMIUM = "PREMIUM"            # Precio premium con mayor margen
    BUDGET = "BUDGET"              # Precio económico con margen reducido
    PROMOTIONAL = "PROMOTIONAL"    # Precio promocional
    GROUP = "GROUP"                # Precio especial para grupos
    SEASONAL = "SEASONAL"          # Precio de temporada
    DYNAMIC = "DYNAMIC"            # Precio dinámico basado en demanda


class ItineraryCostIntegration:
    """
    Servicio de integración para cálculo de costos de itinerarios
    Integra múltiples componentes para calcular el costo total
    """
    
    def __init__(self, db_session=None):
        self.db = db_session
        self.event_bus: Optional[EventBus] = None
        self.cost_service = AdvancedCostCalculationService(db_session) if db_session else None
        
        # Cache para costos calculados
        self.cost_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = timedelta(hours=1)
        
        # Configuración de márgenes por estrategia
        self.margin_config = {
            PricingStrategy.STANDARD: 0.25,      # 25% margen
            PricingStrategy.PREMIUM: 0.40,       # 40% margen
            PricingStrategy.BUDGET: 0.15,        # 15% margen
            PricingStrategy.PROMOTIONAL: 0.10,   # 10% margen
            PricingStrategy.GROUP: 0.20,         # 20% margen
            PricingStrategy.SEASONAL: 0.35,      # 35% margen
            PricingStrategy.DYNAMIC: 0.30        # 30% margen base
        }
        
        # Configuración de gastos operacionales por defecto
        self.operational_config = {
            'staff_accommodation_single_supplement': 0.50,  # 50% suplemento individual
            'staff_meal_allowance_per_day': 25.00,         # USD por día
            'staff_incidental_allowance_per_day': 10.00,   # USD por día
            'fuel_cost_per_km': 0.50,                      # USD por km
            'toll_average_per_100km': 15.00,               # USD por 100km
            'parking_average_per_day': 10.00,              # USD por día
            'emergency_fund_percent': 0.05,                # 5% del total
            'insurance_percent': 0.03,                     # 3% del total
            'tips_gratuities_percent': 0.10               # 10% del total
        }
    
    async def initialize(self):
        """
        Inicializar el servicio de integración
        """
        self.event_bus = await get_event_bus()
        
        # Suscribir a eventos relevantes
        self.event_bus.subscribe(
            [EventType.ITINERARY_CREATED, EventType.ITINERARY_UPDATED],
            self.handle_itinerary_change
        )
        
        self.event_bus.subscribe(
            [EventType.QUOTATION_CREATED],
            self.handle_quotation_created
        )
        
        logger.info("ItineraryCostIntegration initialized")
    
    async def handle_itinerary_change(self, event: Event):
        """
        Manejar cambios en itinerarios para recalcular costos
        """
        itinerary_id = event.payload.get('itinerary_id')
        
        logger.info(f"Handling itinerary change: {itinerary_id}")
        
        # Invalidar caché
        cache_keys = [k for k in self.cost_cache.keys() if itinerary_id in k]
        for key in cache_keys:
            del self.cost_cache[key]
        
        # Publicar evento de invalidación
        await self.event_bus.publish(
            EventType.CACHE_INVALIDATED,
            {
                'cache_type': 'itinerary_cost',
                'itinerary_id': itinerary_id,
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=event.metadata.correlation_id,
                causation_id=event.id,
                service_name='itinerary_cost_integration'
            )
        )
    
    async def handle_quotation_created(self, event: Event):
        """
        Calcular costos automáticamente cuando se crea una cotización
        """
        quotation_id = event.payload.get('quotation_id')
        itinerary_id = event.payload.get('itinerary_id')
        group_profile = event.payload.get('group_profile')
        
        if not itinerary_id or not group_profile:
            return
        
        logger.info(f"Auto-calculating costs for quotation {quotation_id}")
        
        # Calcular costos
        cost_breakdown = await self.calculate_complete_itinerary_cost(
            itinerary_id,
            group_profile
        )
        
        # Publicar resultado
        await self.event_bus.publish(
            EventType.INTEGRATION_RESPONSE,
            {
                'quotation_id': quotation_id,
                'cost_breakdown': cost_breakdown,
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=event.metadata.correlation_id,
                causation_id=event.id,
                service_name='itinerary_cost_integration'
            )
        )
    
    async def calculate_complete_itinerary_cost(
        self,
        itinerary_id: str,
        group_profile: Dict[str, Any],
        pricing_strategy: PricingStrategy = PricingStrategy.STANDARD
    ) -> Dict[str, Any]:
        """
        Calcular costo completo del itinerario con todos los componentes
        """
        # Verificar caché
        cache_key = f"itinerary_cost:{itinerary_id}:{group_profile.get('id', 'default')}:{pricing_strategy.value}"
        
        if cache_key in self.cost_cache:
            cached = self.cost_cache[cache_key]
            if cached['expires'] > datetime.utcnow():
                logger.info(f"Returning cached cost for {cache_key}")
                return cached['data']
        
        logger.info(f"Calculating complete cost for itinerary {itinerary_id}")
        
        # Obtener detalles del itinerario
        itinerary = await self._get_itinerary_details(itinerary_id)
        
        # Inicializar breakdown de costos
        cost_breakdown = {
            'components': {},
            'subtotals': {},
            'taxes': Decimal('0'),
            'margin': Decimal('0'),
            'total_cost': Decimal('0'),
            'total_price': Decimal('0'),
            'price_per_person': Decimal('0'),
            'currency': 'USD',
            'calculation_date': datetime.utcnow().isoformat(),
            'valid_until': (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        
        # Calcular cada componente
        passengers = group_profile.get('total_passengers', 1)
        
        # 1. Alojamiento
        accommodation_cost = await self._calculate_accommodation_cost(
            itinerary,
            passengers,
            group_profile
        )
        cost_breakdown['components'][CostComponent.ACCOMMODATION.value] = accommodation_cost
        
        # 2. Transporte
        transport_cost = await self._calculate_transport_cost(
            itinerary,
            passengers,
            group_profile
        )
        cost_breakdown['components'][CostComponent.TRANSPORT.value] = transport_cost
        
        # 3. Guías
        guide_cost = await self._calculate_guide_cost(
            itinerary,
            passengers,
            group_profile
        )
        cost_breakdown['components'][CostComponent.GUIDE.value] = guide_cost
        
        # 4. Entradas y tickets
        tickets_cost = await self._calculate_entrance_tickets_cost(
            itinerary,
            passengers
        )
        cost_breakdown['components'][CostComponent.ENTRANCE_TICKETS.value] = tickets_cost
        
        # 5. Comidas
        meals_cost = await self._calculate_meals_cost(
            itinerary,
            passengers,
            group_profile
        )
        cost_breakdown['components'][CostComponent.MEALS.value] = meals_cost
        
        # 6. Actividades
        activities_cost = await self._calculate_activities_cost(
            itinerary,
            passengers
        )
        cost_breakdown['components'][CostComponent.ACTIVITIES.value] = activities_cost
        
        # 7. Gastos operacionales
        operational_costs = await self._calculate_operational_expenses(
            itinerary,
            cost_breakdown['components'],
            group_profile
        )
        cost_breakdown['components'][CostComponent.OPERATIONAL.value] = operational_costs
        
        # Calcular subtotales
        total_base_cost = Decimal('0')
        for component, details in cost_breakdown['components'].items():
            component_total = Decimal(str(details.get('total', 0)))
            total_base_cost += component_total
            cost_breakdown['subtotals'][component] = component_total
        
        # Aplicar margen según estrategia
        margin_percent = self.margin_config[pricing_strategy]
        margin_amount = total_base_cost * Decimal(str(margin_percent))
        
        # Calcular impuestos
        tax_rate = Decimal(str(group_profile.get('tax_rate', 0.18)))  # 18% default
        taxes = total_base_cost * tax_rate
        
        # Calcular totales
        cost_breakdown['total_cost'] = total_base_cost
        cost_breakdown['margin'] = margin_amount
        cost_breakdown['taxes'] = taxes
        cost_breakdown['total_price'] = total_base_cost + margin_amount + taxes
        
        # Aplicar tabla de división por grupo
        price_per_person = await self._apply_group_pricing_table(
            cost_breakdown['total_price'],
            passengers,
            group_profile
        )
        cost_breakdown['price_per_person'] = price_per_person
        
        # Análisis de rentabilidad
        cost_breakdown['profitability'] = {
            'margin_percent': float(margin_percent * 100),
            'margin_amount': float(margin_amount),
            'break_even_passengers': self._calculate_break_even(
                total_base_cost,
                price_per_person
            ),
            'roi': float((margin_amount / total_base_cost) * 100)
        }
        
        # Guardar en caché
        self.cost_cache[cache_key] = {
            'data': cost_breakdown,
            'expires': datetime.utcnow() + self.cache_ttl
        }
        
        # Publicar evento de costo calculado
        await self.event_bus.publish(
            EventType.INTEGRATION_RESPONSE,
            {
                'type': 'cost_calculation',
                'itinerary_id': itinerary_id,
                'group_profile_id': group_profile.get('id'),
                'total_cost': float(cost_breakdown['total_cost']),
                'total_price': float(cost_breakdown['total_price']),
                'price_per_person': float(price_per_person),
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=itinerary_id,
                service_name='itinerary_cost_integration'
            )
        )
        
        return cost_breakdown
    
    async def _get_itinerary_details(self, itinerary_id: str) -> Dict[str, Any]:
        """
        Obtener detalles del itinerario
        """
        # En producción esto consultaría la base de datos o servicio de itinerarios
        # Por ahora retornamos un itinerario de ejemplo
        return {
            'id': itinerary_id,
            'name': 'Sample Itinerary',
            'duration_days': 7,
            'total_distance_km': 1200,
            'days': [
                {
                    'day_number': 1,
                    'date': '2024-03-01',
                    'accommodation': {
                        'type': 'hotel',
                        'category': '4_star',
                        'rooms_required': 10,
                        'price_per_room': 120.00
                    },
                    'transport': {
                        'type': 'bus',
                        'distance_km': 150,
                        'duration_hours': 3
                    },
                    'guide_required': True,
                    'guide_type': 'licensed',
                    'activities': [
                        {
                            'name': 'City Tour',
                            'entrance_fee': 15.00,
                            'duration_hours': 3
                        }
                    ],
                    'meals': {
                        'breakfast': True,
                        'lunch': True,
                        'dinner': True
                    }
                }
                # ... más días
            ]
        }
    
    async def _calculate_accommodation_cost(
        self,
        itinerary: Dict[str, Any],
        passengers: int,
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcular costos de alojamiento incluyendo alojamiento del staff
        """
        total_accommodation = Decimal('0')
        details = []
        
        for day in itinerary.get('days', []):
            if not day.get('accommodation'):
                continue
            
            accommodation = day['accommodation']
            
            # Calcular habitaciones necesarias para pasajeros
            rooms_needed = self._calculate_rooms_needed(
                passengers,
                group_profile.get('room_configuration', 'double')
            )
            
            # Costo de habitaciones para pasajeros
            room_price = Decimal(str(accommodation.get('price_per_room', 100)))
            day_cost = room_price * rooms_needed
            
            # Agregar alojamiento del staff
            staff_accommodation = await self._calculate_staff_accommodation(
                room_price,
                group_profile.get('staff_count', 2)
            )
            day_cost += staff_accommodation
            
            total_accommodation += day_cost
            
            details.append({
                'day': day['day_number'],
                'passenger_rooms': int(rooms_needed),
                'staff_rooms': group_profile.get('staff_count', 2),
                'room_rate': float(room_price),
                'passenger_cost': float(room_price * rooms_needed),
                'staff_cost': float(staff_accommodation),
                'total': float(day_cost)
            })
        
        return {
            'total': float(total_accommodation),
            'details': details,
            'includes_staff': True
        }
    
    async def _calculate_staff_accommodation(
        self,
        double_room_rate: Decimal,
        staff_count: int
    ) -> Decimal:
        """
        Calcular alojamiento del staff con suplemento individual
        Fórmula: Habitación individual = Precio doble/2 + 50% suplemento
        """
        if staff_count == 0:
            return Decimal('0')
        
        # Precio por persona en habitación doble
        price_per_person_double = double_room_rate / 2
        
        # Suplemento individual (50%)
        single_supplement = price_per_person_double * Decimal('0.5')
        
        # Precio habitación individual
        single_room_rate = price_per_person_double + single_supplement
        
        # Total para todo el staff (asumiendo habitaciones individuales)
        total_staff_accommodation = single_room_rate * staff_count
        
        return total_staff_accommodation
    
    async def _calculate_transport_cost(
        self,
        itinerary: Dict[str, Any],
        passengers: int,
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcular costos de transporte incluyendo combustible y peajes
        """
        total_transport = Decimal('0')
        total_distance = 0
        details = []
        
        for day in itinerary.get('days', []):
            if not day.get('transport'):
                continue
            
            transport = day['transport']
            distance = transport.get('distance_km', 0)
            total_distance += distance
            
            # Costo base del vehículo
            vehicle_cost = await self._get_vehicle_cost(
                transport.get('type', 'bus'),
                passengers,
                distance
            )
            
            # Combustible
            fuel_cost = Decimal(str(distance)) * Decimal(str(self.operational_config['fuel_cost_per_km']))
            
            # Peajes
            toll_cost = (Decimal(str(distance)) / 100) * Decimal(str(self.operational_config['toll_average_per_100km']))
            
            # Parking
            parking_cost = Decimal(str(self.operational_config['parking_average_per_day']))
            
            day_cost = vehicle_cost + fuel_cost + toll_cost + parking_cost
            total_transport += day_cost
            
            details.append({
                'day': day['day_number'],
                'distance_km': distance,
                'vehicle_type': transport.get('type'),
                'vehicle_cost': float(vehicle_cost),
                'fuel_cost': float(fuel_cost),
                'toll_cost': float(toll_cost),
                'parking_cost': float(parking_cost),
                'total': float(day_cost)
            })
        
        return {
            'total': float(total_transport),
            'total_distance_km': total_distance,
            'details': details,
            'includes_operational': True
        }
    
    async def _get_vehicle_cost(
        self,
        vehicle_type: str,
        passengers: int,
        distance: int
    ) -> Decimal:
        """
        Obtener costo del vehículo según tipo y capacidad
        """
        vehicle_rates = {
            'sedan': {'capacity': 4, 'daily_rate': 80, 'per_km': 1.5},
            'van': {'capacity': 12, 'daily_rate': 120, 'per_km': 2.0},
            'minibus': {'capacity': 20, 'daily_rate': 180, 'per_km': 2.5},
            'bus': {'capacity': 50, 'daily_rate': 300, 'per_km': 3.5}
        }
        
        # Seleccionar vehículo apropiado
        selected_vehicle = None
        for v_type, specs in vehicle_rates.items():
            if specs['capacity'] >= passengers:
                selected_vehicle = specs
                break
        
        if not selected_vehicle:
            selected_vehicle = vehicle_rates['bus']
        
        # Calcular costo
        if distance > 200:  # Viajes largos se cobran por km
            cost = Decimal(str(distance)) * Decimal(str(selected_vehicle['per_km']))
        else:  # Viajes cortos se cobran tarifa diaria
            cost = Decimal(str(selected_vehicle['daily_rate']))
        
        return cost
    
    async def _calculate_guide_cost(
        self,
        itinerary: Dict[str, Any],
        passengers: int,
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcular costos de guías incluyendo alimentación
        """
        total_guide = Decimal('0')
        details = []
        
        guide_rates = {
            'licensed': 150.00,
            'tour_leader': 100.00,
            'local': 50.00
        }
        
        for day in itinerary.get('days', []):
            if not day.get('guide_required'):
                continue
            
            guide_type = day.get('guide_type', 'tour_leader')
            daily_rate = Decimal(str(guide_rates.get(guide_type, 100)))
            
            # Ajuste por tamaño de grupo
            if passengers > 20:
                daily_rate *= Decimal('1.2')  # 20% adicional para grupos grandes
            
            # Agregar alimentación del guía
            guide_meals = Decimal(str(self.operational_config['staff_meal_allowance_per_day']))
            
            day_cost = daily_rate + guide_meals
            total_guide += day_cost
            
            details.append({
                'day': day['day_number'],
                'guide_type': guide_type,
                'base_rate': float(daily_rate),
                'meal_allowance': float(guide_meals),
                'total': float(day_cost)
            })
        
        return {
            'total': float(total_guide),
            'details': details,
            'includes_meals': True
        }
    
    async def _calculate_entrance_tickets_cost(
        self,
        itinerary: Dict[str, Any],
        passengers: int
    ) -> Dict[str, Any]:
        """
        Calcular costos de entradas y tickets
        """
        total_tickets = Decimal('0')
        details = []
        
        for day in itinerary.get('days', []):
            for activity in day.get('activities', []):
                if entrance_fee := activity.get('entrance_fee'):
                    fee = Decimal(str(entrance_fee))
                    total_fee = fee * passengers
                    total_tickets += total_fee
                    
                    details.append({
                        'day': day['day_number'],
                        'activity': activity.get('name'),
                        'price_per_person': float(fee),
                        'total': float(total_fee)
                    })
        
        return {
            'total': float(total_tickets),
            'details': details,
            'tickets_count': len(details)
        }
    
    async def _calculate_meals_cost(
        self,
        itinerary: Dict[str, Any],
        passengers: int,
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcular costos de comidas
        """
        total_meals = Decimal('0')
        details = []
        
        meal_prices = {
            'breakfast': Decimal('8.00'),
            'lunch': Decimal('15.00'),
            'dinner': Decimal('20.00')
        }
        
        # Ajuste por tipo de servicio
        service_level = group_profile.get('service_level', 'standard')
        if service_level == 'premium':
            multiplier = Decimal('1.5')
        elif service_level == 'luxury':
            multiplier = Decimal('2.0')
        else:
            multiplier = Decimal('1.0')
        
        for day in itinerary.get('days', []):
            meals = day.get('meals', {})
            day_cost = Decimal('0')
            
            for meal_type, included in meals.items():
                if included and meal_type in meal_prices:
                    meal_cost = meal_prices[meal_type] * multiplier * passengers
                    day_cost += meal_cost
            
            if day_cost > 0:
                total_meals += day_cost
                details.append({
                    'day': day['day_number'],
                    'meals_included': list(meals.keys()),
                    'cost_per_person': float(day_cost / passengers),
                    'total': float(day_cost)
                })
        
        return {
            'total': float(total_meals),
            'service_level': service_level,
            'details': details
        }
    
    async def _calculate_activities_cost(
        self,
        itinerary: Dict[str, Any],
        passengers: int
    ) -> Dict[str, Any]:
        """
        Calcular costos de actividades adicionales
        """
        total_activities = Decimal('0')
        details = []
        
        for day in itinerary.get('days', []):
            for activity in day.get('activities', []):
                if activity_cost := activity.get('cost_per_person'):
                    cost = Decimal(str(activity_cost)) * passengers
                    total_activities += cost
                    
                    details.append({
                        'day': day['day_number'],
                        'activity': activity.get('name'),
                        'duration_hours': activity.get('duration_hours'),
                        'cost_per_person': float(activity_cost),
                        'total': float(cost)
                    })
        
        return {
            'total': float(total_activities),
            'activities_count': len(details),
            'details': details
        }
    
    async def _calculate_operational_expenses(
        self,
        itinerary: Dict[str, Any],
        component_costs: Dict[str, Any],
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcular gastos operacionales adicionales
        """
        # Sumar todos los costos base
        total_base = Decimal('0')
        for component, details in component_costs.items():
            total_base += Decimal(str(details.get('total', 0)))
        
        # Calcular gastos operacionales
        operational_expenses = {
            'emergency_fund': float(total_base * Decimal(str(self.operational_config['emergency_fund_percent']))),
            'insurance': float(total_base * Decimal(str(self.operational_config['insurance_percent']))),
            'tips_gratuities': float(total_base * Decimal(str(self.operational_config['tips_gratuities_percent']))),
            'staff_incidentals': float(
                Decimal(str(self.operational_config['staff_incidental_allowance_per_day'])) * 
                len(itinerary.get('days', [])) * 
                group_profile.get('staff_count', 2)
            ),
            'communications': 50.00,  # Costo fijo de comunicaciones
            'first_aid_supplies': 30.00,  # Suministros médicos básicos
            'contingency': float(total_base * Decimal('0.03'))  # 3% contingencia
        }
        
        total_operational = sum(operational_expenses.values())
        
        return {
            'total': total_operational,
            'breakdown': operational_expenses,
            'percent_of_base': float((Decimal(str(total_operational)) / total_base) * 100)
        }
    
    async def _apply_group_pricing_table(
        self,
        total_price: Decimal,
        passengers: int,
        group_profile: Dict[str, Any]
    ) -> Decimal:
        """
        Aplicar tabla de precios por grupo con descuentos progresivos
        """
        # Tabla de descuentos por volumen
        volume_discounts = [
            (1, 4, 0.00),      # 1-4 personas: sin descuento
            (5, 9, 0.05),      # 5-9 personas: 5% descuento
            (10, 19, 0.10),    # 10-19 personas: 10% descuento
            (20, 29, 0.15),    # 20-29 personas: 15% descuento
            (30, 39, 0.18),    # 30-39 personas: 18% descuento
            (40, 49, 0.20),    # 40-49 personas: 20% descuento
            (50, float('inf'), 0.25)  # 50+ personas: 25% descuento
        ]
        
        # Buscar descuento aplicable
        discount = 0
        for min_pax, max_pax, disc in volume_discounts:
            if min_pax <= passengers <= max_pax:
                discount = disc
                break
        
        # Aplicar descuento
        discounted_price = total_price * (1 - Decimal(str(discount)))
        
        # Calcular precio por persona
        price_per_person = discounted_price / passengers
        
        # Redondear hacia arriba
        price_per_person = price_per_person.quantize(Decimal('0.01'), rounding=ROUND_UP)
        
        return price_per_person
    
    def _calculate_rooms_needed(self, passengers: int, room_config: str) -> int:
        """
        Calcular número de habitaciones necesarias
        """
        if room_config == 'single':
            return passengers
        elif room_config == 'double':
            return (passengers + 1) // 2  # Redondear hacia arriba
        elif room_config == 'triple':
            return (passengers + 2) // 3
        else:  # Quad
            return (passengers + 3) // 4
    
    def _calculate_break_even(self, total_cost: Decimal, price_per_person: Decimal) -> int:
        """
        Calcular punto de equilibrio (número mínimo de pasajeros)
        """
        if price_per_person == 0:
            return 0
        
        break_even = int(total_cost / price_per_person)
        if total_cost % price_per_person > 0:
            break_even += 1
        
        return break_even
    
    async def optimize_cost_structure(
        self,
        itinerary_id: str,
        target_price: Decimal,
        constraints: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Optimizar estructura de costos para alcanzar precio objetivo
        """
        logger.info(f"Optimizing cost structure for target price: {target_price}")
        
        optimization_suggestions = []
        
        # Analizar componentes de costo actuales
        current_costs = self.cost_cache.get(f"itinerary_cost:{itinerary_id}:default:STANDARD")
        
        if not current_costs:
            return {
                'status': 'error',
                'message': 'No cost data available for optimization'
            }
        
        current_data = current_costs['data']
        current_total = Decimal(str(current_data['total_price']))
        
        # Calcular diferencia con precio objetivo
        difference = current_total - target_price
        reduction_needed_percent = (difference / current_total) * 100
        
        # Sugerencias de optimización
        if difference > 0:  # Necesitamos reducir costos
            # Analizar cada componente
            for component, details in current_data['components'].items():
                component_total = Decimal(str(details['total']))
                component_percent = (component_total / current_total) * 100
                
                if component_percent > 20:  # Componentes que representan más del 20%
                    optimization_suggestions.append({
                        'component': component,
                        'current_cost': float(component_total),
                        'percent_of_total': float(component_percent),
                        'suggestion': f"Consider optimizing {component} - represents {component_percent:.1f}% of total",
                        'potential_savings': float(component_total * Decimal('0.15'))  # 15% potencial
                    })
        
        return {
            'status': 'success',
            'current_price': float(current_total),
            'target_price': float(target_price),
            'difference': float(difference),
            'reduction_needed_percent': float(reduction_needed_percent),
            'optimization_suggestions': optimization_suggestions,
            'feasibility': 'feasible' if abs(reduction_needed_percent) < 20 else 'challenging'
        }


# Singleton global
_cost_integration: Optional[ItineraryCostIntegration] = None


async def get_itinerary_cost_integration(db_session=None) -> ItineraryCostIntegration:
    """
    Obtener instancia singleton del servicio de integración
    """
    global _cost_integration
    
    if _cost_integration is None:
        _cost_integration = ItineraryCostIntegration(db_session)
        await _cost_integration.initialize()
    
    return _cost_integration