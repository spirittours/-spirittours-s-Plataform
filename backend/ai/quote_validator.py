# AI Quote Validator Service
# Servicio de validación inteligente de cotizaciones usando IA

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import json
import asyncio
import re
from enum import Enum

class ValidationSeverity(enum.Enum):
    """Niveles de severidad de validación"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AIQuoteValidator:
    """
    Validador inteligente de cotizaciones usando reglas de negocio y patrones ML
    """
    
    def __init__(self):
        self.validation_rules = self._load_validation_rules()
        self.error_patterns = self._load_error_patterns()
        self.price_benchmarks = self._load_price_benchmarks()
    
    async def validate_quote(self, quote: Any) -> Dict[str, Any]:
        """
        Valida completamente una cotización y devuelve resultados estructurados
        """
        validation_results = {
            'status': 'valid',
            'confidence_score': 1.0,
            'errors': {},
            'warnings': [],
            'suggestions': [],
            'auto_fixes': [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Ejecutar todas las validaciones en paralelo
        validation_tasks = [
            self._validate_pricing(quote),
            self._validate_dates(quote),
            self._validate_services(quote),
            self._validate_group_configuration(quote),
            self._validate_logistics(quote),
            self._validate_compliance(quote),
            self._detect_anomalies(quote),
            self._suggest_optimizations(quote)
        ]
        
        results = await asyncio.gather(*validation_tasks, return_exceptions=True)
        
        # Procesar resultados de cada validación
        for result in results:
            if isinstance(result, Exception):
                validation_results['errors']['system'] = str(result)
                validation_results['status'] = 'error'
            else:
                self._merge_validation_results(validation_results, result)
        
        # Calcular puntuación de confianza final
        validation_results['confidence_score'] = self._calculate_confidence_score(validation_results)
        
        # Determinar estado final
        if validation_results['errors'] and any(
            v.get('severity') == ValidationSeverity.CRITICAL.value 
            for v in validation_results['errors'].values()
        ):
            validation_results['status'] = 'invalid'
        elif validation_results['errors'] or validation_results['warnings']:
            validation_results['status'] = 'needs_review'
        
        return validation_results
    
    async def _validate_pricing(self, quote: Any) -> Dict[str, Any]:
        """
        Valida la estructura de precios y márgenes
        """
        errors = {}
        warnings = []
        suggestions = []
        
        # Validar que el precio total sea coherente
        calculated_total = (
            (quote.total_hotel_cost or 0) +
            (quote.total_transport_cost or 0) +
            (quote.total_guide_cost or 0) +
            (quote.total_entrance_fees or 0) +
            (quote.total_meals_cost or 0) +
            (quote.total_extras_cost or 0)
        )
        
        if quote.subtotal and abs(float(quote.subtotal) - float(calculated_total)) > 0.01:
            errors['price_mismatch'] = {
                'message': f"Subtotal mismatch: Expected {calculated_total}, got {quote.subtotal}",
                'severity': ValidationSeverity.ERROR.value,
                'calculated': float(calculated_total),
                'actual': float(quote.subtotal)
            }
        
        # Validar márgenes de ganancia
        if quote.subtotal and quote.total_price:
            margin = ((quote.total_price - quote.subtotal) / quote.subtotal) * 100
            
            if margin < 10:
                warnings.append({
                    'type': 'low_margin',
                    'message': f"Profit margin is very low: {margin:.2f}%",
                    'severity': ValidationSeverity.WARNING.value
                })
                suggestions.append({
                    'type': 'pricing',
                    'suggestion': f"Consider increasing markup to at least 15% for sustainability"
                })
            elif margin > 50:
                warnings.append({
                    'type': 'high_margin',
                    'message': f"Profit margin seems high: {margin:.2f}%",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        # Validar precios contra benchmarks
        if quote.price_per_person:
            benchmark_validation = self._validate_against_benchmarks(
                quote.price_per_person,
                quote.itinerary.duration_days if quote.itinerary else 1,
                quote.tour_type.value if quote.tour_type else 'standard'
            )
            
            if benchmark_validation['status'] == 'out_of_range':
                warnings.append({
                    'type': 'price_benchmark',
                    'message': benchmark_validation['message'],
                    'severity': ValidationSeverity.WARNING.value
                })
        
        # Validar coherencia de precios por componente
        if quote.group_size and quote.group_size > 0:
            # Validar costo de hotel por persona por noche
            if quote.total_hotel_cost and quote.itinerary:
                nights = quote.itinerary.duration_days - 1
                if nights > 0:
                    hotel_per_person_night = quote.total_hotel_cost / quote.group_size / nights
                    if hotel_per_person_night < 30:
                        warnings.append({
                            'type': 'hotel_price_low',
                            'message': f"Hotel cost per person per night seems low: ${hotel_per_person_night:.2f}",
                            'severity': ValidationSeverity.WARNING.value
                        })
                    elif hotel_per_person_night > 500:
                        warnings.append({
                            'type': 'hotel_price_high',
                            'message': f"Hotel cost per person per night seems high: ${hotel_per_person_night:.2f}",
                            'severity': ValidationSeverity.WARNING.value
                        })
        
        return {
            'errors': errors,
            'warnings': warnings,
            'suggestions': suggestions
        }
    
    async def _validate_dates(self, quote: Any) -> Dict[str, Any]:
        """
        Valida las fechas del tour y su coherencia
        """
        errors = {}
        warnings = []
        
        # Validar que la fecha de inicio sea futura
        if quote.travel_date:
            if quote.travel_date < datetime.now().date():
                errors['past_travel_date'] = {
                    'message': "Travel date is in the past",
                    'severity': ValidationSeverity.CRITICAL.value
                }
            elif (quote.travel_date - datetime.now().date()).days < 3:
                warnings.append({
                    'type': 'short_notice',
                    'message': "Very short notice booking - may affect availability",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        # Validar duración del tour
        if quote.travel_date and quote.end_date:
            calculated_duration = (quote.end_date - quote.travel_date).days + 1
            if quote.itinerary and quote.itinerary.duration_days:
                if calculated_duration != quote.itinerary.duration_days:
                    errors['duration_mismatch'] = {
                        'message': f"Duration mismatch: Itinerary is {quote.itinerary.duration_days} days but dates show {calculated_duration} days",
                        'severity': ValidationSeverity.ERROR.value
                    }
        
        # Validar fecha de validez
        if quote.valid_until:
            if quote.valid_until < datetime.now():
                warnings.append({
                    'type': 'expired_quote',
                    'message': "Quote validity has expired",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        # Validar días festivos y temporadas
        holiday_check = self._check_holiday_conflicts(quote.travel_date, quote.end_date)
        if holiday_check:
            warnings.append({
                'type': 'holiday_period',
                'message': holiday_check,
                'severity': ValidationSeverity.INFO.value
            })
        
        return {
            'errors': errors,
            'warnings': warnings
        }
    
    async def _validate_services(self, quote: Any) -> Dict[str, Any]:
        """
        Valida la disponibilidad y configuración de servicios
        """
        errors = {}
        warnings = []
        suggestions = []
        
        # Validar que todos los servicios críticos estén configurados
        if not quote.selected_hotels or len(quote.selected_hotels) == 0:
            if quote.itinerary and quote.itinerary.duration_days > 1:
                errors['missing_hotels'] = {
                    'message': "No hotels configured for multi-day tour",
                    'severity': ValidationSeverity.ERROR.value
                }
        
        if not quote.selected_transport or len(quote.selected_transport) == 0:
            warnings.append({
                'type': 'missing_transport',
                'message': "No transport specified - verify if intentional",
                'severity': ValidationSeverity.WARNING.value
            })
        
        # Validar confirmación de servicios
        if quote.services_availability:
            unconfirmed_critical = []
            for day, services in quote.services_availability.items():
                if isinstance(services, dict):
                    for service_type, status in services.items():
                        if status == 'upon_request' and service_type in ['hotel', 'transport']:
                            unconfirmed_critical.append(f"{service_type} on {day}")
            
            if unconfirmed_critical:
                warnings.append({
                    'type': 'unconfirmed_services',
                    'message': f"Critical services pending confirmation: {', '.join(unconfirmed_critical)}",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        # Validar coherencia de guías
        if quote.selected_guides:
            guide_languages = set()
            for guide in quote.selected_guides:
                if isinstance(guide, dict) and 'languages' in guide:
                    guide_languages.update(guide['languages'])
            
            # Sugerir idiomas adicionales si es necesario
            if guide_languages and 'en' not in guide_languages:
                suggestions.append({
                    'type': 'guide_language',
                    'suggestion': "Consider adding an English-speaking guide for international tourists"
                })
        
        return {
            'errors': errors,
            'warnings': warnings,
            'suggestions': suggestions
        }
    
    async def _validate_group_configuration(self, quote: Any) -> Dict[str, Any]:
        """
        Valida la configuración del grupo y capacidades
        """
        errors = {}
        warnings = []
        suggestions = []
        
        if quote.group_size:
            # Validar tamaño del grupo
            if quote.group_size < 1:
                errors['invalid_group_size'] = {
                    'message': "Invalid group size",
                    'severity': ValidationSeverity.CRITICAL.value
                }
            elif quote.group_size > 50:
                warnings.append({
                    'type': 'large_group',
                    'message': f"Very large group ({quote.group_size}) - ensure all services can accommodate",
                    'severity': ValidationSeverity.WARNING.value
                })
            
            # Validar capacidad de transporte
            if quote.selected_transport:
                for transport in quote.selected_transport:
                    if isinstance(transport, dict) and 'capacity' in transport:
                        if transport['capacity'] < quote.group_size:
                            errors['transport_capacity'] = {
                                'message': f"Transport capacity ({transport['capacity']}) insufficient for group size ({quote.group_size})",
                                'severity': ValidationSeverity.ERROR.value
                            }
            
            # Sugerir configuración óptima de habitaciones
            if quote.group_size > 1:
                rooms_needed = (quote.group_size + 1) // 2  # Asumiendo ocupación doble
                suggestions.append({
                    'type': 'room_configuration',
                    'suggestion': f"Recommended room configuration: {rooms_needed} double rooms for {quote.group_size} people"
                })
        
        # Validar requisitos especiales
        if quote.accessibility_requirements:
            if not self._check_accessibility_compliance(quote):
                warnings.append({
                    'type': 'accessibility',
                    'message': "Accessibility requirements specified - ensure all services are accessible",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        return {
            'errors': errors,
            'warnings': warnings,
            'suggestions': suggestions
        }
    
    async def _validate_logistics(self, quote: Any) -> Dict[str, Any]:
        """
        Valida la logística del itinerario
        """
        errors = {}
        warnings = []
        suggestions = []
        
        if quote.itinerary and hasattr(quote.itinerary, 'daily_programs'):
            previous_destination = None
            
            for day_program in quote.itinerary.daily_programs:
                # Validar distancias y tiempos de viaje
                if day_program.destinations:
                    if len(day_program.destinations) > 4:
                        warnings.append({
                            'type': 'busy_day',
                            'message': f"Day {day_program.day_number} has many stops ({len(day_program.destinations)}) - may be tiring",
                            'severity': ValidationSeverity.WARNING.value
                        })
                    
                    # Verificar conexión lógica entre días
                    if previous_destination:
                        distance = self._estimate_distance(
                            previous_destination, 
                            day_program.destinations[0] if day_program.destinations else None
                        )
                        if distance and distance > 300:
                            warnings.append({
                                'type': 'long_distance',
                                'message': f"Long distance between Day {day_program.day_number-1} and Day {day_program.day_number}",
                                'severity': ValidationSeverity.INFO.value
                            })
                    
                    if day_program.destinations:
                        previous_destination = day_program.destinations[-1]
                
                # Validar horarios
                if day_program.start_time and day_program.end_time:
                    duration = self._calculate_duration(day_program.start_time, day_program.end_time)
                    if duration > 12:
                        warnings.append({
                            'type': 'long_day',
                            'message': f"Day {day_program.day_number} is very long ({duration} hours)",
                            'severity': ValidationSeverity.WARNING.value
                        })
                        suggestions.append({
                            'type': 'itinerary',
                            'suggestion': f"Consider splitting Day {day_program.day_number} activities or adding rest time"
                        })
        
        # Validar rutas de aeropuerto
        if quote.itinerary and quote.itinerary.daily_programs:
            first_day = quote.itinerary.daily_programs[0] if quote.itinerary.daily_programs else None
            last_day = quote.itinerary.daily_programs[-1] if quote.itinerary.daily_programs else None
            
            if first_day and not self._has_airport_transfer(first_day, 'arrival'):
                suggestions.append({
                    'type': 'transfer',
                    'suggestion': "Consider adding airport arrival transfer on Day 1"
                })
            
            if last_day and not self._has_airport_transfer(last_day, 'departure'):
                suggestions.append({
                    'type': 'transfer',
                    'suggestion': f"Consider adding airport departure transfer on Day {last_day.day_number}"
                })
        
        return {
            'errors': errors,
            'warnings': warnings,
            'suggestions': suggestions
        }
    
    async def _validate_compliance(self, quote: Any) -> Dict[str, Any]:
        """
        Valida el cumplimiento de políticas y regulaciones
        """
        errors = {}
        warnings = []
        
        # Validar políticas de cancelación
        if not quote.itinerary:
            warnings.append({
                'type': 'missing_itinerary',
                'message': "No itinerary linked to quote",
                'severity': ValidationSeverity.WARNING.value
            })
        
        # Validar información del cliente
        if not quote.client_email and not quote.client_phone:
            errors['missing_contact'] = {
                'message': "No contact information for client",
                'severity': ValidationSeverity.ERROR.value
            }
        
        # Validar requisitos de visa/documentación (simplificado)
        if quote.itinerary and quote.itinerary.countries:
            visa_requirements = self._check_visa_requirements(quote.itinerary.countries)
            if visa_requirements:
                warnings.append({
                    'type': 'visa_requirements',
                    'message': visa_requirements,
                    'severity': ValidationSeverity.INFO.value
                })
        
        # Validar seguros y responsabilidades
        if quote.group_size and quote.group_size > 10:
            if not self._has_group_insurance(quote):
                warnings.append({
                    'type': 'insurance',
                    'message': "Large group - verify insurance coverage",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        return {
            'errors': errors,
            'warnings': warnings
        }
    
    async def _detect_anomalies(self, quote: Any) -> Dict[str, Any]:
        """
        Detecta anomalías usando patrones históricos
        """
        anomalies = []
        
        # Detectar precios anómalos
        if quote.price_per_person and quote.itinerary:
            expected_range = self._get_expected_price_range(
                quote.itinerary.duration_days,
                quote.tour_type.value if quote.tour_type else 'standard'
            )
            
            if quote.price_per_person < expected_range['min']:
                anomalies.append({
                    'type': 'price_anomaly',
                    'message': f"Price per person (${quote.price_per_person}) below expected minimum (${expected_range['min']})",
                    'severity': ValidationSeverity.WARNING.value
                })
            elif quote.price_per_person > expected_range['max']:
                anomalies.append({
                    'type': 'price_anomaly',
                    'message': f"Price per person (${quote.price_per_person}) above expected maximum (${expected_range['max']})",
                    'severity': ValidationSeverity.WARNING.value
                })
        
        # Detectar patrones inusuales en servicios
        if quote.selected_extras:
            unusual_combinations = self._detect_unusual_service_combinations(quote.selected_extras)
            for combination in unusual_combinations:
                anomalies.append({
                    'type': 'service_combination',
                    'message': combination,
                    'severity': ValidationSeverity.INFO.value
                })
        
        return {
            'anomalies': anomalies
        }
    
    async def _suggest_optimizations(self, quote: Any) -> Dict[str, Any]:
        """
        Sugiere optimizaciones para mejorar la cotización
        """
        optimizations = []
        
        # Sugerir agrupación de servicios
        if quote.itinerary and quote.itinerary.daily_programs:
            route_optimization = self._optimize_route(quote.itinerary.daily_programs)
            if route_optimization:
                optimizations.append({
                    'type': 'route_optimization',
                    'suggestion': route_optimization,
                    'potential_saving': 'Up to 15% on transport costs'
                })
        
        # Sugerir upgrades rentables
        if quote.total_price and quote.group_size:
            if quote.group_size >= 6:
                optimizations.append({
                    'type': 'group_discount',
                    'suggestion': "Consider offering group discount for 6+ people",
                    'potential_benefit': 'Increase booking probability by 25%'
                })
        
        # Sugerir servicios complementarios
        if not quote.selected_extras or len(quote.selected_extras) < 2:
            optimizations.append({
                'type': 'upsell',
                'suggestion': "Consider offering photography service or special dinner experience",
                'potential_revenue': 'Additional $50-100 per person'
            })
        
        # Sugerir ajustes estacionales
        if quote.travel_date:
            seasonal_suggestion = self._get_seasonal_optimization(quote.travel_date)
            if seasonal_suggestion:
                optimizations.append(seasonal_suggestion)
        
        return {
            'optimizations': optimizations
        }
    
    def _merge_validation_results(self, target: Dict, source: Dict):
        """
        Combina resultados de validación
        """
        if 'errors' in source and source['errors']:
            target['errors'].update(source['errors'])
        
        if 'warnings' in source:
            target['warnings'].extend(source['warnings'])
        
        if 'suggestions' in source:
            target['suggestions'].extend(source['suggestions'])
        
        if 'anomalies' in source:
            target['warnings'].extend(source['anomalies'])
        
        if 'optimizations' in source:
            target['suggestions'].extend(source['optimizations'])
    
    def _calculate_confidence_score(self, results: Dict) -> float:
        """
        Calcula la puntuación de confianza basada en los resultados
        """
        score = 1.0
        
        # Reducir por errores críticos
        critical_errors = sum(1 for e in results['errors'].values() 
                            if e.get('severity') == ValidationSeverity.CRITICAL.value)
        score -= critical_errors * 0.3
        
        # Reducir por errores normales
        normal_errors = sum(1 for e in results['errors'].values() 
                          if e.get('severity') == ValidationSeverity.ERROR.value)
        score -= normal_errors * 0.15
        
        # Reducir por warnings
        score -= len(results['warnings']) * 0.05
        
        # Asegurar que esté en rango válido
        return max(0.0, min(1.0, score))
    
    def _load_validation_rules(self) -> Dict:
        """
        Carga reglas de validación
        """
        return {
            'min_profit_margin': 10,
            'max_profit_margin': 50,
            'min_advance_days': 3,
            'max_group_size': 50,
            'max_daily_destinations': 4,
            'max_day_duration_hours': 12
        }
    
    def _load_error_patterns(self) -> List[Dict]:
        """
        Carga patrones de error comunes
        """
        return [
            {
                'pattern': 'missing_transfer',
                'description': 'Airport transfers not included',
                'severity': 'warning'
            },
            {
                'pattern': 'price_calculation_error',
                'description': 'Price components dont sum correctly',
                'severity': 'error'
            }
        ]
    
    def _load_price_benchmarks(self) -> Dict:
        """
        Carga benchmarks de precios
        """
        return {
            'vip_private': {
                'per_day_min': 200,
                'per_day_max': 800
            },
            'small_group': {
                'per_day_min': 100,
                'per_day_max': 400
            }
        }
    
    def _validate_against_benchmarks(
        self, 
        price_per_person: float, 
        duration_days: int,
        tour_type: str
    ) -> Dict:
        """
        Valida precios contra benchmarks del mercado
        """
        if duration_days <= 0:
            return {'status': 'error', 'message': 'Invalid duration'}
        
        price_per_day = price_per_person / duration_days
        benchmarks = self.price_benchmarks.get(tour_type, self.price_benchmarks.get('small_group'))
        
        if price_per_day < benchmarks['per_day_min']:
            return {
                'status': 'out_of_range',
                'message': f"Price per day (${price_per_day:.2f}) below market minimum (${benchmarks['per_day_min']})"
            }
        elif price_per_day > benchmarks['per_day_max']:
            return {
                'status': 'out_of_range',
                'message': f"Price per day (${price_per_day:.2f}) above market maximum (${benchmarks['per_day_max']})"
            }
        
        return {'status': 'ok'}
    
    def _check_holiday_conflicts(self, start_date: date, end_date: date) -> Optional[str]:
        """
        Verifica conflictos con días festivos
        """
        # Simplificado - en producción usaría una API de días festivos
        holidays = {
            (12, 24): "Christmas Eve",
            (12, 25): "Christmas",
            (1, 1): "New Year",
            (7, 4): "Independence Day"
        }
        
        if start_date and end_date:
            current = start_date
            while current <= end_date:
                if (current.month, current.day) in holidays:
                    return f"Tour includes holiday: {holidays[(current.month, current.day)]}"
                current += timedelta(days=1)
        
        return None
    
    def _check_accessibility_compliance(self, quote: Any) -> bool:
        """
        Verifica cumplimiento de requisitos de accesibilidad
        """
        # Verificar que los vehículos sean accesibles
        if quote.selected_transport:
            for transport in quote.selected_transport:
                if isinstance(transport, dict) and not transport.get('is_accessible'):
                    return False
        return True
    
    def _estimate_distance(self, origin: str, destination: str) -> Optional[float]:
        """
        Estima distancia entre dos puntos
        """
        # Simplificado - en producción usaría una API de geocoding
        distances = {
            ('Jerusalem', 'Tel Aviv'): 65,
            ('Tel Aviv', 'Jerusalem'): 65,
            ('Jerusalem', 'Bethlehem'): 10,
            ('Bethlehem', 'Jerusalem'): 10,
            ('Tel Aviv', 'Haifa'): 95,
            ('Jerusalem', 'Dead Sea'): 50
        }
        
        return distances.get((origin, destination))
    
    def _calculate_duration(self, start_time: str, end_time: str) -> float:
        """
        Calcula duración entre dos horas
        """
        try:
            start = datetime.strptime(start_time, "%H:%M")
            end = datetime.strptime(end_time, "%H:%M")
            duration = (end - start).total_seconds() / 3600
            return duration if duration > 0 else duration + 24
        except:
            return 8.0
    
    def _has_airport_transfer(self, day_program: Any, transfer_type: str) -> bool:
        """
        Verifica si un día incluye transfer de aeropuerto
        """
        if day_program.destinations:
            airport_keywords = ['airport', 'aeropuerto', 'TLV', 'Ben Gurion']
            for destination in day_program.destinations:
                if any(keyword.lower() in destination.lower() for keyword in airport_keywords):
                    return True
        return False
    
    def _has_group_insurance(self, quote: Any) -> bool:
        """
        Verifica si el grupo tiene seguro
        """
        # Simplificado - verificaría en base de datos real
        return quote.selected_extras and 'insurance' in str(quote.selected_extras).lower()
    
    def _check_visa_requirements(self, countries: List[str]) -> Optional[str]:
        """
        Verifica requisitos de visa para los países
        """
        visa_required = {
            'Jordan': 'Visa required for most nationalities - can be obtained on arrival',
            'Egypt': 'Visa required - recommend obtaining in advance'
        }
        
        requirements = []
        for country in countries:
            if country in visa_required:
                requirements.append(f"{country}: {visa_required[country]}")
        
        return '; '.join(requirements) if requirements else None
    
    def _get_expected_price_range(self, duration_days: int, tour_type: str) -> Dict[str, float]:
        """
        Obtiene rango de precios esperado
        """
        base_ranges = self.price_benchmarks.get(tour_type, self.price_benchmarks['small_group'])
        
        return {
            'min': base_ranges['per_day_min'] * duration_days,
            'max': base_ranges['per_day_max'] * duration_days
        }
    
    def _detect_unusual_service_combinations(self, extras: Any) -> List[str]:
        """
        Detecta combinaciones inusuales de servicios
        """
        unusual = []
        
        if extras and isinstance(extras, (list, dict)):
            extras_str = str(extras).lower()
            
            # Detectar combinaciones inusuales
            if 'luxury' in extras_str and 'budget' in extras_str:
                unusual.append("Mixed luxury and budget services - verify if intentional")
            
            if 'wine' in extras_str and 'halal' in extras_str:
                unusual.append("Wine service with halal requirements - verify compatibility")
        
        return unusual
    
    def _optimize_route(self, daily_programs: List[Any]) -> Optional[str]:
        """
        Sugiere optimización de ruta
        """
        # Análisis simplificado de optimización
        total_destinations = sum(
            len(day.destinations) if day.destinations else 0 
            for day in daily_programs
        )
        
        if total_destinations > len(daily_programs) * 3:
            return "Consider consolidating nearby destinations to reduce travel time and costs"
        
        return None
    
    def _get_seasonal_optimization(self, travel_date: date) -> Optional[Dict]:
        """
        Sugiere optimizaciones estacionales
        """
        if travel_date.month in [7, 8]:  # Verano
            return {
                'type': 'seasonal',
                'suggestion': "Summer season - consider adding early morning tours to avoid heat",
                'potential_benefit': 'Improved customer satisfaction'
            }
        elif travel_date.month in [12, 1]:  # Invierno
            return {
                'type': 'seasonal',
                'suggestion': "Winter season - verify weather-dependent activities have alternatives",
                'potential_benefit': 'Avoid cancellations due to weather'
            }
        
        return None