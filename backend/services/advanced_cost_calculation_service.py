"""
Advanced Cost Calculation Service for Tour Packages
Includes operational costs, driver/guide accommodation, and group-based pricing
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal, ROUND_UP
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import logging
from enum import Enum
import uuid
import json
import math

from backend.models.package_quotation import (
    PackageQuotation, ItineraryDay, TourGuide,
    TransportProvider, GroupPricingTable
)
from backend.core.cache import cache_manager
from backend.core.exceptions import BusinessLogicError

logger = logging.getLogger(__name__)


class GroupType(Enum):
    """Tipos de grupos turísticos"""
    EDUCATIONAL = "EDUCATIONAL"          # Estudiantes
    CORPORATE = "CORPORATE"              # Empresarial
    RELIGIOUS = "RELIGIOUS"              # Religioso
    SENIOR = "SENIOR"                    # Tercera edad
    FAMILY = "FAMILY"                    # Familiar
    ADVENTURE = "ADVENTURE"              # Aventura
    LUXURY = "LUXURY"                    # Lujo
    BUDGET = "BUDGET"                    # Económico
    SPECIAL_NEEDS = "SPECIAL_NEEDS"      # Necesidades especiales
    VIP = "VIP"                          # VIP/Celebridades
    MIXED = "MIXED"                      # Mixto


class ServiceType(Enum):
    """Tipos de servicios adicionales"""
    DRIVER_ACCOMMODATION = "DRIVER_ACCOMMODATION"
    GUIDE_ACCOMMODATION = "GUIDE_ACCOMMODATION"
    DRIVER_MEALS = "DRIVER_MEALS"
    GUIDE_MEALS = "GUIDE_MEALS"
    ROAD_TOLLS = "ROAD_TOLLS"
    PARKING_FEES = "PARKING_FEES"
    FUEL_SURCHARGE = "FUEL_SURCHARGE"
    TIPS_GRATUITIES = "TIPS_GRATUITIES"
    EMERGENCY_FUND = "EMERGENCY_FUND"
    INSURANCE = "INSURANCE"
    PERMITS = "PERMITS"
    PORTER_SERVICE = "PORTER_SERVICE"
    WATER_SNACKS = "WATER_SNACKS"
    WIFI_SERVICE = "WIFI_SERVICE"
    AUDIO_GUIDES = "AUDIO_GUIDES"


class AdvancedCostCalculationService:
    """
    Servicio avanzado para cálculo de costos incluyendo gastos operacionales
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
        # Configuración por defecto para alojamiento de personal
        self.staff_accommodation_config = {
            'single_supplement_percent': 50,  # 50% adicional sobre precio por persona en doble
            'meal_allowance_per_day': 25,     # USD por día
            'incidental_allowance_per_day': 10  # USD por día para gastos varios
        }
        
        # Tabla de división de costos por número de pasajeros (configurable)
        self.default_group_division_table = self._generate_default_division_table()
    
    def _generate_default_division_table(self) -> Dict[int, float]:
        """
        Genera tabla por defecto para división de costos según número de pasajeros
        """
        table = {}
        
        # 1-10 pasajeros: división directa
        for i in range(1, 11):
            table[i] = 1.0 / i
        
        # 11-20 pasajeros: descuento progresivo del 5%
        for i in range(11, 21):
            base_division = 1.0 / i
            discount = 0.05
            table[i] = base_division * (1 - discount)
        
        # 21-30 pasajeros: descuento del 10%
        for i in range(21, 31):
            base_division = 1.0 / i
            discount = 0.10
            table[i] = base_division * (1 - discount)
        
        # 31-40 pasajeros: descuento del 15%
        for i in range(31, 41):
            base_division = 1.0 / i
            discount = 0.15
            table[i] = base_division * (1 - discount)
        
        # 41-50 pasajeros: descuento del 20%
        for i in range(41, 51):
            base_division = 1.0 / i
            discount = 0.20
            table[i] = base_division * (1 - discount)
        
        return table
    
    # ==================== CÁLCULO DE ALOJAMIENTO DE PERSONAL ====================
    
    async def calculate_staff_accommodation_cost(
        self,
        package_id: str,
        hotel_double_rate: Decimal,
        nights: int,
        include_driver: bool = True,
        include_guide: bool = True,
        additional_staff: int = 0
    ) -> Dict[str, Any]:
        """
        Calcula el costo de alojamiento para conductor y guía
        Habitación sencilla = Precio habitación doble por persona + suplemento individual
        """
        try:
            # Calcular precio por persona en habitación doble
            price_per_person_double = hotel_double_rate / 2
            
            # Calcular suplemento individual
            single_supplement = price_per_person_double * Decimal(
                self.staff_accommodation_config['single_supplement_percent'] / 100
            )
            
            # Precio total habitación sencilla
            single_room_rate = price_per_person_double + single_supplement
            
            # Calcular número de habitaciones necesarias
            rooms_needed = 0
            if include_driver:
                rooms_needed += 1
            if include_guide:
                rooms_needed += 1
            rooms_needed += additional_staff
            
            # Costo total de alojamiento
            total_accommodation = single_room_rate * rooms_needed * nights
            
            # Desglose detallado
            breakdown = {
                'hotel_double_rate': float(hotel_double_rate),
                'price_per_person_double': float(price_per_person_double),
                'single_supplement_percent': self.staff_accommodation_config['single_supplement_percent'],
                'single_supplement_amount': float(single_supplement),
                'single_room_rate': float(single_room_rate),
                'nights': nights,
                'rooms_breakdown': {
                    'driver': 1 if include_driver else 0,
                    'guide': 1 if include_guide else 0,
                    'additional_staff': additional_staff,
                    'total_rooms': rooms_needed
                },
                'total_accommodation_cost': float(total_accommodation)
            }
            
            logger.info(f"Calculated staff accommodation for package {package_id}: ${total_accommodation}")
            
            return {
                'success': True,
                'total_cost': float(total_accommodation),
                'cost_per_night': float(single_room_rate * rooms_needed),
                'breakdown': breakdown
            }
            
        except Exception as e:
            logger.error(f"Error calculating staff accommodation: {str(e)}")
            raise BusinessLogicError(f"Error en cálculo de alojamiento: {str(e)}")
    
    # ==================== CÁLCULO DE GASTOS EN RUTA ====================
    
    async def calculate_operational_expenses(
        self,
        package_id: str,
        trip_days: int,
        distance_km: float,
        staff_count: int = 2,  # conductor + guía
        expense_config: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Calcula gastos operacionales durante el viaje
        """
        try:
            # Usar configuración personalizada o por defecto
            config = expense_config or {
                'meal_allowance_per_day': 25,
                'incidental_allowance_per_day': 10,
                'toll_rate_per_100km': 15,
                'parking_per_day': 20,
                'fuel_surcharge_percent': 10,
                'emergency_fund_percent': 5,
                'tips_gratuities_per_day': 10,
                'water_snacks_per_person_day': 5
            }
            
            expenses = {}
            
            # Dietas/comidas para personal
            expenses['staff_meals'] = Decimal(
                config['meal_allowance_per_day'] * staff_count * trip_days
            )
            
            # Gastos incidentales
            expenses['incidentals'] = Decimal(
                config['incidental_allowance_per_day'] * staff_count * trip_days
            )
            
            # Peajes estimados
            expenses['tolls'] = Decimal(
                (distance_km / 100) * config['toll_rate_per_100km']
            )
            
            # Estacionamiento
            expenses['parking'] = Decimal(
                config['parking_per_day'] * trip_days
            )
            
            # Recargo de combustible
            base_transport_cost = Decimal('1000')  # Este vendría del cálculo de transporte
            expenses['fuel_surcharge'] = base_transport_cost * Decimal(
                config['fuel_surcharge_percent'] / 100
            )
            
            # Fondo de emergencia
            subtotal = sum(expenses.values())
            expenses['emergency_fund'] = subtotal * Decimal(
                config['emergency_fund_percent'] / 100
            )
            
            # Propinas y gratificaciones
            expenses['tips_gratuities'] = Decimal(
                config['tips_gratuities_per_day'] * trip_days
            )
            
            # Total de gastos operacionales
            total_expenses = sum(expenses.values())
            
            # Desglose detallado
            breakdown = {
                expense_type: {
                    'amount': float(amount),
                    'description': self._get_expense_description(expense_type)
                }
                for expense_type, amount in expenses.items()
            }
            
            return {
                'success': True,
                'total_operational_expenses': float(total_expenses),
                'breakdown': breakdown,
                'config_used': config,
                'calculation_basis': {
                    'trip_days': trip_days,
                    'distance_km': distance_km,
                    'staff_count': staff_count
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating operational expenses: {str(e)}")
            raise BusinessLogicError(f"Error en cálculo de gastos operacionales: {str(e)}")
    
    def _get_expense_description(self, expense_type: str) -> str:
        """
        Obtiene descripción del tipo de gasto
        """
        descriptions = {
            'staff_meals': 'Alimentación para conductor y guía',
            'incidentals': 'Gastos incidentales y varios',
            'tolls': 'Peajes estimados en ruta',
            'parking': 'Estacionamiento en destinos',
            'fuel_surcharge': 'Recargo por combustible',
            'emergency_fund': 'Fondo para emergencias',
            'tips_gratuities': 'Propinas y gratificaciones',
            'water_snacks': 'Agua y snacks para el viaje'
        }
        return descriptions.get(expense_type, expense_type)
    
    # ==================== DIVISIÓN DE COSTOS POR GRUPO ====================
    
    async def calculate_cost_per_passenger(
        self,
        total_costs: Dict[str, Decimal],
        passenger_count: int,
        use_custom_table: bool = False,
        custom_table: Optional[Dict[int, float]] = None
    ) -> Dict[str, Any]:
        """
        Calcula el costo por pasajero usando tabla de división configurable
        """
        try:
            # Validar número de pasajeros
            if passenger_count < 1:
                raise BusinessLogicError("El número de pasajeros debe ser mayor a 0")
            
            # Usar tabla personalizada o por defecto
            division_table = custom_table if use_custom_table and custom_table else self.default_group_division_table
            
            # Obtener factor de división
            if passenger_count in division_table:
                division_factor = division_table[passenger_count]
            elif passenger_count > 50:
                # Para grupos mayores a 50, usar el factor de 50 con descuento adicional
                base_factor = division_table.get(50, 1/50 * 0.8)
                additional_discount = 0.01 * ((passenger_count - 50) // 10)  # 1% adicional cada 10 personas
                division_factor = base_factor * (1 - min(additional_discount, 0.1))  # Máximo 10% adicional
            else:
                # División simple si no está en la tabla
                division_factor = 1.0 / passenger_count
            
            # Calcular costos por pasajero
            costs_per_passenger = {}
            for cost_type, amount in total_costs.items():
                # Algunos costos no se dividen (se cobran completos)
                if cost_type in ['insurance_per_person', 'entrance_tickets_per_person']:
                    costs_per_passenger[cost_type] = float(amount)
                else:
                    # Aplicar división según tabla
                    cost_per_pax = amount * Decimal(str(division_factor))
                    # Redondear hacia arriba para no perder dinero
                    costs_per_passenger[cost_type] = float(cost_per_pax.quantize(Decimal('0.01'), rounding=ROUND_UP))
            
            # Calcular total por pasajero
            total_per_passenger = sum(Decimal(str(cost)) for cost in costs_per_passenger.values())
            
            # Calcular total para el grupo
            total_group_cost = total_per_passenger * passenger_count
            
            # Análisis de economía de escala
            savings_analysis = self._calculate_savings_analysis(passenger_count, division_factor)
            
            return {
                'success': True,
                'passenger_count': passenger_count,
                'division_factor': division_factor,
                'costs_per_passenger': costs_per_passenger,
                'total_per_passenger': float(total_per_passenger),
                'total_group_cost': float(total_group_cost),
                'savings_analysis': savings_analysis,
                'table_used': 'custom' if use_custom_table else 'default'
            }
            
        except Exception as e:
            logger.error(f"Error calculating cost per passenger: {str(e)}")
            raise BusinessLogicError(f"Error en cálculo por pasajero: {str(e)}")
    
    def _calculate_savings_analysis(self, passenger_count: int, division_factor: float) -> Dict:
        """
        Analiza el ahorro por economía de escala
        """
        base_individual_cost = 1.0
        actual_cost = division_factor
        savings_percent = ((base_individual_cost - actual_cost) / base_individual_cost) * 100
        
        return {
            'individual_cost_factor': base_individual_cost / passenger_count,
            'group_cost_factor': division_factor,
            'savings_percent': round(savings_percent, 2),
            'message': f"Ahorro del {savings_percent:.1f}% por economía de escala"
        }
    
    # ==================== CÁLCULO COMPLETO DEL PAQUETE ====================
    
    async def calculate_complete_package_cost(
        self,
        package_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calcula el costo completo del paquete incluyendo todos los gastos operacionales
        """
        try:
            # Extraer datos básicos
            passenger_count = package_data['passenger_count']
            trip_days = package_data['trip_days']
            nights = package_data.get('nights', trip_days - 1)
            total_distance = package_data.get('total_distance_km', 0)
            group_type = package_data.get('group_type', 'MIXED')
            
            # Inicializar costos
            costs = {
                'base_services': Decimal('0'),
                'accommodation': Decimal('0'),
                'transport': Decimal('0'),
                'guides': Decimal('0'),
                'entrance_tickets': Decimal('0'),
                'meals': Decimal('0'),
                'staff_accommodation': Decimal('0'),
                'operational_expenses': Decimal('0'),
                'extras': Decimal('0')
            }
            
            # 1. Costos base del paquete (vienen del sistema existente)
            if 'base_costs' in package_data:
                for key, value in package_data['base_costs'].items():
                    if key in costs:
                        costs[key] = Decimal(str(value))
            
            # 2. Calcular alojamiento del personal
            if package_data.get('include_staff_accommodation', True):
                hotel_rate = Decimal(str(package_data.get('hotel_double_rate', 100)))
                staff_accommodation = await self.calculate_staff_accommodation_cost(
                    package_data.get('package_id', 'TEMP'),
                    hotel_rate,
                    nights,
                    include_driver=package_data.get('has_driver', True),
                    include_guide=package_data.get('has_guide', True),
                    additional_staff=package_data.get('additional_staff', 0)
                )
                costs['staff_accommodation'] = Decimal(str(staff_accommodation['total_cost']))
            
            # 3. Calcular gastos operacionales
            operational_expenses = await self.calculate_operational_expenses(
                package_data.get('package_id', 'TEMP'),
                trip_days,
                total_distance,
                staff_count=2 if package_data.get('has_driver', True) and package_data.get('has_guide', True) else 1
            )
            costs['operational_expenses'] = Decimal(str(operational_expenses['total_operational_expenses']))
            
            # 4. Aplicar ajustes por tipo de grupo
            group_adjustments = self._apply_group_type_adjustments(costs, group_type)
            
            # 5. Calcular costo total
            total_costs = sum(costs.values())
            
            # 6. Dividir entre pasajeros
            cost_per_passenger = await self.calculate_cost_per_passenger(
                costs,
                passenger_count,
                use_custom_table=package_data.get('use_custom_pricing_table', False),
                custom_table=package_data.get('custom_pricing_table')
            )
            
            # 7. Aplicar márgenes y comisiones
            margins = self._calculate_margins_and_commissions(
                total_costs,
                package_data.get('margin_percent', 20),
                package_data.get('commission_percent', 10)
            )
            
            # 8. Precio final
            final_price_per_passenger = cost_per_passenger['total_per_passenger'] + margins['margin_per_passenger']
            final_total_price = final_price_per_passenger * passenger_count
            
            # Preparar respuesta completa
            return {
                'success': True,
                'package_id': package_data.get('package_id'),
                'passenger_count': passenger_count,
                'trip_days': trip_days,
                'group_type': group_type,
                'costs_breakdown': {
                    cost_type: float(amount) 
                    for cost_type, amount in costs.items()
                },
                'total_costs': float(total_costs),
                'cost_per_passenger_breakdown': cost_per_passenger['costs_per_passenger'],
                'cost_per_passenger': cost_per_passenger['total_per_passenger'],
                'margins_and_commissions': margins,
                'final_price_per_passenger': float(final_price_per_passenger),
                'final_total_price': float(final_total_price),
                'staff_accommodation_details': staff_accommodation if package_data.get('include_staff_accommodation') else None,
                'operational_expenses_details': operational_expenses,
                'group_adjustments': group_adjustments,
                'savings_analysis': cost_per_passenger['savings_analysis']
            }
            
        except Exception as e:
            logger.error(f"Error calculating complete package cost: {str(e)}")
            raise BusinessLogicError(f"Error en cálculo completo: {str(e)}")
    
    def _apply_group_type_adjustments(self, costs: Dict[str, Decimal], group_type: str) -> Dict:
        """
        Aplica ajustes de costos según el tipo de grupo
        """
        adjustments = {
            'EDUCATIONAL': {'discount': 15, 'reason': 'Descuento educativo'},
            'CORPORATE': {'surcharge': 10, 'reason': 'Servicios premium corporativos'},
            'SENIOR': {'discount': 10, 'reason': 'Descuento tercera edad'},
            'LUXURY': {'surcharge': 25, 'reason': 'Servicios de lujo incluidos'},
            'BUDGET': {'discount': 5, 'reason': 'Paquete económico'},
            'VIP': {'surcharge': 50, 'reason': 'Servicios VIP exclusivos'},
            'SPECIAL_NEEDS': {'surcharge': 15, 'reason': 'Servicios especializados'}
        }
        
        if group_type in adjustments:
            adjustment = adjustments[group_type]
            if 'discount' in adjustment:
                factor = 1 - (adjustment['discount'] / 100)
                for key in costs:
                    if key not in ['entrance_tickets', 'operational_expenses']:
                        costs[key] *= Decimal(str(factor))
            elif 'surcharge' in adjustment:
                factor = 1 + (adjustment['surcharge'] / 100)
                for key in costs:
                    if key not in ['entrance_tickets']:
                        costs[key] *= Decimal(str(factor))
            
            return adjustment
        
        return {'message': 'Sin ajustes especiales para este tipo de grupo'}
    
    def _calculate_margins_and_commissions(
        self,
        total_cost: Decimal,
        margin_percent: float,
        commission_percent: float
    ) -> Dict[str, float]:
        """
        Calcula márgenes de ganancia y comisiones
        """
        margin = total_cost * Decimal(str(margin_percent / 100))
        commission = total_cost * Decimal(str(commission_percent / 100))
        
        return {
            'margin_percent': margin_percent,
            'margin_amount': float(margin),
            'commission_percent': commission_percent,
            'commission_amount': float(commission),
            'total_markup': float(margin + commission),
            'margin_per_passenger': float(margin),  # Se dividirá en el cálculo principal
        }
    
    # ==================== GESTIÓN DE TABLA DE PRECIOS ====================
    
    async def update_group_pricing_table(
        self,
        admin_id: str,
        new_table: Dict[int, float]
    ) -> Dict[str, Any]:
        """
        Permite al administrador actualizar la tabla de división de precios
        """
        try:
            # Validar que sea administrador
            # TODO: Implementar verificación de permisos
            
            # Validar la tabla
            for passenger_count, factor in new_table.items():
                if not isinstance(passenger_count, int) or passenger_count < 1:
                    raise BusinessLogicError(f"Número de pasajeros inválido: {passenger_count}")
                if not isinstance(factor, (int, float)) or factor <= 0 or factor > 1:
                    raise BusinessLogicError(f"Factor de división inválido para {passenger_count} pasajeros: {factor}")
            
            # Guardar en base de datos
            pricing_table = {
                'id': f"PRICE-TABLE-{uuid.uuid4().hex[:8].upper()}",
                'admin_id': admin_id,
                'table_data': json.dumps(new_table),
                'created_at': datetime.utcnow().isoformat(),
                'is_active': True
            }
            
            # TODO: Guardar en base de datos
            # await self.db.add(GroupPricingTable(**pricing_table))
            # await self.db.commit()
            
            # Actualizar tabla en memoria
            self.default_group_division_table = new_table
            
            # Limpiar caché
            await cache_manager.delete("pricing_table:*")
            
            logger.info(f"Pricing table updated by admin {admin_id}")
            
            return {
                'success': True,
                'message': 'Tabla de precios actualizada exitosamente',
                'table_id': pricing_table['id'],
                'entries_updated': len(new_table)
            }
            
        except Exception as e:
            logger.error(f"Error updating pricing table: {str(e)}")
            raise BusinessLogicError(f"Error actualizando tabla: {str(e)}")
    
    async def get_current_pricing_table(self) -> Dict[str, Any]:
        """
        Obtiene la tabla de precios actual
        """
        try:
            # Intentar obtener de caché
            cached = await cache_manager.get("pricing_table:current")
            if cached:
                return cached
            
            # Si no está en caché, usar la tabla en memoria
            table_data = {
                'table': self.default_group_division_table,
                'metadata': {
                    'last_updated': datetime.utcnow().isoformat(),
                    'total_entries': len(self.default_group_division_table),
                    'max_passengers': max(self.default_group_division_table.keys()),
                    'min_passengers': min(self.default_group_division_table.keys())
                }
            }
            
            # Guardar en caché
            await cache_manager.set("pricing_table:current", table_data, ttl=3600)
            
            return table_data
            
        except Exception as e:
            logger.error(f"Error getting pricing table: {str(e)}")
            raise
    
    # ==================== INFORMES Y ANÁLISIS ====================
    
    async def generate_cost_analysis_report(
        self,
        package_id: str
    ) -> Dict[str, Any]:
        """
        Genera un informe detallado de análisis de costos
        """
        try:
            # TODO: Obtener datos del paquete de la base de datos
            # package = await self.db.get(PackageQuotation, package_id)
            
            # Por ahora usar datos de ejemplo
            analysis = {
                'package_id': package_id,
                'generated_at': datetime.utcnow().isoformat(),
                'cost_distribution': {
                    'fixed_costs': {
                        'description': 'Costos fijos independientes del número de pasajeros',
                        'items': ['Transporte base', 'Guía principal', 'Permisos'],
                        'percentage': 40
                    },
                    'variable_costs': {
                        'description': 'Costos que varían con el número de pasajeros',
                        'items': ['Alojamiento', 'Comidas', 'Entradas'],
                        'percentage': 45
                    },
                    'operational_costs': {
                        'description': 'Costos operacionales y de personal',
                        'items': ['Alojamiento staff', 'Dietas', 'Combustible extra'],
                        'percentage': 15
                    }
                },
                'breakeven_analysis': {
                    'min_passengers_for_profit': 8,
                    'optimal_group_size': 20,
                    'max_profitable_size': 45
                },
                'recommendations': [
                    'Considerar descuento adicional para grupos mayores a 30 personas',
                    'Negociar tarifas preferenciales con hoteles para alojamiento de staff',
                    'Implementar política de combustible variable según precio actual',
                    'Revisar dietas de personal según temporada'
                ]
            }
            
            return {
                'success': True,
                'analysis': analysis
            }
            
        except Exception as e:
            logger.error(f"Error generating cost analysis: {str(e)}")
            raise