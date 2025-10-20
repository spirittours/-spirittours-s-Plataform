# Advanced Instant Quote Engine
# Motor avanzado de cotizaciones instantáneas con múltiples modos

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum
import asyncio
import json
import hashlib
import redis
from concurrent.futures import ThreadPoolExecutor
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

logger = logging.getLogger(__name__)

class QuotationMode(Enum):
    """Modos de cotización disponibles"""
    INSTANT = "instant"  # Respuesta inmediata con inventario confirmado
    QUICK = "quick"  # Respuesta rápida con disponibilidad probable
    SMART = "smart"  # Cotización inteligente con alternativas
    PACKAGE = "package"  # Paquetes predefinidos
    DYNAMIC = "dynamic"  # Precios dinámicos en tiempo real
    GUARANTEED = "guaranteed"  # Precio garantizado con bloqueo

class QuotationSpeed(Enum):
    """Velocidades de respuesta objetivo"""
    ULTRA_FAST = 0.5  # 500ms
    FAST = 2.0  # 2 segundos
    NORMAL = 5.0  # 5 segundos
    DETAILED = 10.0  # 10 segundos

class InstantQuoteEngine:
    """
    Motor principal de cotizaciones instantáneas con capacidades avanzadas
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.cache = redis.Redis(host='localhost', port=6379, decode_responses=True)
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.validation_rules = self._load_validation_rules()
        self.price_matrix = self._load_price_matrix()
        
    async def generate_instant_quote(
        self,
        request: Dict[str, Any],
        mode: QuotationMode = QuotationMode.INSTANT,
        target_speed: QuotationSpeed = QuotationSpeed.FAST
    ) -> Dict[str, Any]:
        """
        Genera una cotización instantánea según el modo seleccionado
        """
        start_time = datetime.now()
        
        # Verificar cache primero
        cache_key = self._generate_cache_key(request)
        cached_quote = self._get_cached_quote(cache_key)
        
        if cached_quote and mode != QuotationMode.GUARANTEED:
            logger.info(f"Cache hit for quote: {cache_key}")
            return self._update_cached_quote(cached_quote, request)
        
        # Seleccionar estrategia según modo
        if mode == QuotationMode.INSTANT:
            quote = await self._instant_quote_strategy(request, target_speed)
        elif mode == QuotationMode.QUICK:
            quote = await self._quick_quote_strategy(request)
        elif mode == QuotationMode.SMART:
            quote = await self._smart_quote_strategy(request)
        elif mode == QuotationMode.PACKAGE:
            quote = await self._package_quote_strategy(request)
        elif mode == QuotationMode.DYNAMIC:
            quote = await self._dynamic_quote_strategy(request)
        elif mode == QuotationMode.GUARANTEED:
            quote = await self._guaranteed_quote_strategy(request)
        else:
            quote = await self._instant_quote_strategy(request, target_speed)
        
        # Validación final
        validation_result = await self._validate_quote(quote)
        if not validation_result['is_valid']:
            quote = await self._fix_quote_errors(quote, validation_result['errors'])
        
        # Calcular tiempo de respuesta
        response_time = (datetime.now() - start_time).total_seconds()
        quote['metadata']['response_time'] = response_time
        quote['metadata']['mode'] = mode.value
        
        # Guardar en cache si es válido
        if validation_result['is_valid']:
            self._cache_quote(cache_key, quote)
        
        return quote
    
    async def _instant_quote_strategy(
        self,
        request: Dict[str, Any],
        target_speed: QuotationSpeed
    ) -> Dict[str, Any]:
        """
        Estrategia para cotización instantánea con inventario confirmado
        """
        # Ejecutar verificaciones en paralelo
        tasks = []
        
        # Verificación de disponibilidad
        tasks.append(self._check_availability_instant(request))
        
        # Cálculo de precios
        tasks.append(self._calculate_prices_instant(request))
        
        # Verificación de reglas de negocio
        tasks.append(self._check_business_rules(request))
        
        # Esperar resultados con timeout según velocidad objetivo
        try:
            results = await asyncio.wait_for(
                asyncio.gather(*tasks),
                timeout=target_speed.value
            )
        except asyncio.TimeoutError:
            # Si excede el tiempo, usar valores predeterminados
            results = await self._get_fallback_results(request)
        
        availability, pricing, rules_check = results
        
        # Construir cotización
        quote = {
            'quote_id': self._generate_quote_id(),
            'status': 'instant',
            'created_at': datetime.now().isoformat(),
            'valid_for_seconds': 300,  # 5 minutos de validez
            'request': request,
            'availability': availability,
            'pricing': pricing,
            'services': await self._build_services_list(request, availability, pricing),
            'validations': rules_check,
            'alternatives': [],
            'metadata': {
                'confidence_score': self._calculate_confidence(availability, rules_check),
                'instant_booking': availability['all_available'],
                'requires_confirmation': False
            }
        }
        
        return quote
    
    async def _quick_quote_strategy(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estrategia rápida con disponibilidad probable
        """
        # Usar datos estadísticos y patrones históricos
        historical_availability = await self._get_historical_availability(request)
        estimated_prices = await self._estimate_prices_from_patterns(request)
        
        quote = {
            'quote_id': self._generate_quote_id(),
            'status': 'quick_estimate',
            'created_at': datetime.now().isoformat(),
            'valid_for_seconds': 600,  # 10 minutos
            'request': request,
            'availability': {
                'probability': historical_availability['success_rate'],
                'confidence': historical_availability['confidence'],
                'estimated': True
            },
            'pricing': {
                'estimated_total': estimated_prices['total'],
                'price_range': {
                    'min': estimated_prices['min'],
                    'max': estimated_prices['max']
                },
                'breakdown': estimated_prices['breakdown']
            },
            'services': await self._build_estimated_services(request, estimated_prices),
            'metadata': {
                'based_on_patterns': True,
                'sample_size': historical_availability['sample_size'],
                'accuracy_rate': historical_availability['accuracy']
            }
        }
        
        return quote
    
    async def _smart_quote_strategy(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estrategia inteligente con alternativas y optimizaciones
        """
        # Generar múltiples opciones
        options = await self._generate_smart_options(request)
        
        # Optimizar cada opción
        optimized_options = []
        for option in options:
            optimized = await self._optimize_option(option, request)
            optimized_options.append(optimized)
        
        # Seleccionar mejor opción
        best_option = self._select_best_option(optimized_options, request)
        
        # Agregar alternativas
        alternatives = [
            opt for opt in optimized_options 
            if opt['id'] != best_option['id']
        ][:3]  # Máximo 3 alternativas
        
        quote = {
            'quote_id': self._generate_quote_id(),
            'status': 'smart',
            'created_at': datetime.now().isoformat(),
            'valid_for_seconds': 900,  # 15 minutos
            'request': request,
            'recommended': best_option,
            'alternatives': alternatives,
            'optimizations': {
                'route_optimized': True,
                'price_optimized': True,
                'availability_maximized': True
            },
            'insights': await self._generate_insights(best_option, alternatives),
            'metadata': {
                'options_analyzed': len(options),
                'optimization_score': best_option.get('score', 0),
                'ai_recommended': True
            }
        }
        
        return quote
    
    async def _package_quote_strategy(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estrategia basada en paquetes predefinidos
        """
        # Buscar paquetes que coincidan
        matching_packages = await self._find_matching_packages(request)
        
        if not matching_packages:
            # Si no hay paquetes, usar estrategia instant
            return await self._instant_quote_strategy(request, QuotationSpeed.FAST)
        
        # Adaptar paquetes a la solicitud
        adapted_packages = []
        for package in matching_packages:
            adapted = await self._adapt_package(package, request)
            adapted_packages.append(adapted)
        
        # Seleccionar mejor paquete
        best_package = adapted_packages[0]
        
        quote = {
            'quote_id': self._generate_quote_id(),
            'status': 'package',
            'created_at': datetime.now().isoformat(),
            'valid_for_seconds': 1800,  # 30 minutos
            'request': request,
            'package': best_package,
            'package_benefits': {
                'instant_confirmation': True,
                'guaranteed_availability': True,
                'special_price': True,
                'includes_extras': best_package.get('extras', [])
            },
            'customizations_available': await self._get_package_customizations(best_package),
            'metadata': {
                'package_id': best_package['id'],
                'package_type': best_package['type'],
                'popularity_rank': best_package.get('popularity', 0)
            }
        }
        
        return quote
    
    async def _dynamic_quote_strategy(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estrategia con precios dinámicos en tiempo real
        """
        # Factores de precio dinámico
        demand_factor = await self._calculate_demand_factor(request)
        seasonality_factor = await self._calculate_seasonality_factor(request)
        availability_factor = await self._calculate_availability_factor(request)
        competition_factor = await self._calculate_competition_factor(request)
        
        # Calcular precio base
        base_pricing = await self._calculate_base_pricing(request)
        
        # Aplicar factores dinámicos
        dynamic_multiplier = (
            1.0 * 
            demand_factor * 
            seasonality_factor * 
            availability_factor * 
            competition_factor
        )
        
        dynamic_pricing = {
            'base': base_pricing['total'],
            'dynamic_total': base_pricing['total'] * Decimal(str(dynamic_multiplier)),
            'factors': {
                'demand': demand_factor,
                'seasonality': seasonality_factor,
                'availability': availability_factor,
                'competition': competition_factor
            },
            'savings': max(0, base_pricing['total'] - (base_pricing['total'] * Decimal(str(dynamic_multiplier))))
        }
        
        quote = {
            'quote_id': self._generate_quote_id(),
            'status': 'dynamic',
            'created_at': datetime.now().isoformat(),
            'valid_for_seconds': 180,  # 3 minutos (precio dinámico caduca rápido)
            'request': request,
            'pricing': dynamic_pricing,
            'price_lock_available': True,
            'price_lock_fee': dynamic_pricing['dynamic_total'] * Decimal('0.02'),  # 2% para bloquear precio
            'market_conditions': {
                'demand_level': self._get_demand_level(demand_factor),
                'season_type': self._get_season_type(seasonality_factor),
                'availability_status': self._get_availability_status(availability_factor)
            },
            'metadata': {
                'algorithm_version': '2.0',
                'factors_calculated': True,
                'real_time': True
            }
        }
        
        return quote
    
    async def _guaranteed_quote_strategy(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Estrategia con precio garantizado y bloqueo temporal
        """
        # Verificar disponibilidad y bloquear temporalmente
        availability_lock = await self._lock_availability(request, duration_minutes=15)
        
        if not availability_lock['success']:
            # Si no se puede bloquear, usar estrategia smart
            fallback = await self._smart_quote_strategy(request)
            fallback['status'] = 'guaranteed_unavailable'
            return fallback
        
        # Calcular precio garantizado
        guaranteed_pricing = await self._calculate_guaranteed_pricing(request)
        
        # Crear token de garantía
        guarantee_token = self._generate_guarantee_token(request, guaranteed_pricing)
        
        quote = {
            'quote_id': self._generate_quote_id(),
            'status': 'guaranteed',
            'created_at': datetime.now().isoformat(),
            'valid_for_seconds': 900,  # 15 minutos garantizados
            'guarantee': {
                'token': guarantee_token,
                'locked_until': availability_lock['locked_until'],
                'price_guaranteed': True,
                'availability_guaranteed': True,
                'terms': 'Price and availability guaranteed for 15 minutes'
            },
            'request': request,
            'pricing': guaranteed_pricing,
            'locked_services': availability_lock['locked_services'],
            'booking_link': f"/api/booking/confirm/{guarantee_token}",
            'metadata': {
                'lock_id': availability_lock['lock_id'],
                'guaranteed': True,
                'auto_release_at': availability_lock['locked_until']
            }
        }
        
        return quote
    
    async def _check_availability_instant(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verificación ultra-rápida de disponibilidad usando cache y patrones
        """
        availability = {
            'all_available': True,
            'details': {},
            'alternatives': []
        }
        
        # Verificar cada servicio en paralelo
        service_checks = []
        
        if 'hotels' in request:
            service_checks.append(('hotels', self._check_hotels_availability(request)))
        if 'transport' in request:
            service_checks.append(('transport', self._check_transport_availability(request)))
        if 'guides' in request:
            service_checks.append(('guides', self._check_guides_availability(request)))
        if 'activities' in request:
            service_checks.append(('activities', self._check_activities_availability(request)))
        
        # Ejecutar todas las verificaciones en paralelo
        results = await asyncio.gather(*[check for _, check in service_checks])
        
        # Procesar resultados
        for (service_type, _), result in zip(service_checks, results):
            availability['details'][service_type] = result
            if not result['available']:
                availability['all_available'] = False
                # Buscar alternativas
                alternatives = await self._find_alternatives(service_type, request)
                if alternatives:
                    availability['alternatives'].extend(alternatives)
        
        return availability
    
    async def _calculate_prices_instant(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Cálculo instantáneo de precios usando matriz pre-calculada
        """
        pricing = {
            'currency': 'USD',
            'breakdown': {},
            'total': Decimal('0'),
            'taxes': Decimal('0'),
            'fees': Decimal('0')
        }
        
        # Calcular cada componente
        components = []
        
        if 'hotels' in request:
            components.append(self._calculate_hotel_prices(request))
        if 'transport' in request:
            components.append(self._calculate_transport_prices(request))
        if 'guides' in request:
            components.append(self._calculate_guide_prices(request))
        if 'activities' in request:
            components.append(self._calculate_activity_prices(request))
        if 'meals' in request:
            components.append(self._calculate_meal_prices(request))
        
        # Ejecutar cálculos en paralelo
        price_components = await asyncio.gather(*components)
        
        # Sumar componentes
        for component in price_components:
            pricing['breakdown'][component['type']] = component['amount']
            pricing['total'] += component['amount']
        
        # Calcular impuestos y fees
        pricing['taxes'] = pricing['total'] * Decimal('0.19')  # 19% IVA
        pricing['fees'] = pricing['total'] * Decimal('0.03')  # 3% fees
        
        pricing['grand_total'] = pricing['total'] + pricing['taxes'] + pricing['fees']
        
        # Aplicar descuentos si aplica
        discounts = await self._calculate_discounts(request, pricing)
        if discounts:
            pricing['discounts'] = discounts
            pricing['final_total'] = pricing['grand_total'] - discounts['total_discount']
        else:
            pricing['final_total'] = pricing['grand_total']
        
        return pricing
    
    async def _check_business_rules(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verificación de reglas de negocio
        """
        rules_result = {
            'passed': True,
            'violations': [],
            'warnings': [],
            'suggestions': []
        }
        
        # Cargar reglas aplicables
        applicable_rules = self._get_applicable_rules(request)
        
        # Verificar cada regla
        for rule in applicable_rules:
            result = await self._evaluate_rule(rule, request)
            
            if result['status'] == 'violation':
                rules_result['passed'] = False
                rules_result['violations'].append(result)
            elif result['status'] == 'warning':
                rules_result['warnings'].append(result)
            elif result['status'] == 'suggestion':
                rules_result['suggestions'].append(result)
        
        return rules_result
    
    async def _validate_quote(self, quote: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación completa de la cotización
        """
        validation = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'score': 100
        }
        
        # Validaciones críticas
        critical_checks = [
            self._validate_pricing_consistency,
            self._validate_availability_logic,
            self._validate_date_logic,
            self._validate_capacity_requirements,
            self._validate_legal_requirements
        ]
        
        for check in critical_checks:
            result = await check(quote)
            if not result['passed']:
                validation['is_valid'] = False
                validation['errors'].extend(result['errors'])
                validation['score'] -= result.get('penalty', 10)
            if result.get('warnings'):
                validation['warnings'].extend(result['warnings'])
        
        # Validaciones de calidad
        quality_checks = [
            self._validate_price_competitiveness,
            self._validate_service_quality,
            self._validate_customer_experience
        ]
        
        for check in quality_checks:
            result = await check(quote)
            if result.get('warnings'):
                validation['warnings'].extend(result['warnings'])
                validation['score'] -= result.get('penalty', 5)
        
        return validation
    
    async def _fix_quote_errors(
        self,
        quote: Dict[str, Any],
        errors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Intenta corregir automáticamente los errores en la cotización
        """
        fixed_quote = quote.copy()
        fixes_applied = []
        
        for error in errors:
            if error['type'] == 'pricing_inconsistency':
                fixed_quote = await self._fix_pricing_error(fixed_quote, error)
                fixes_applied.append('pricing_recalculated')
            
            elif error['type'] == 'availability_conflict':
                fixed_quote = await self._fix_availability_error(fixed_quote, error)
                fixes_applied.append('availability_updated')
            
            elif error['type'] == 'capacity_exceeded':
                fixed_quote = await self._fix_capacity_error(fixed_quote, error)
                fixes_applied.append('capacity_adjusted')
            
            elif error['type'] == 'date_invalid':
                fixed_quote = await self._fix_date_error(fixed_quote, error)
                fixes_applied.append('dates_corrected')
        
        # Agregar metadata sobre correcciones
        if 'metadata' not in fixed_quote:
            fixed_quote['metadata'] = {}
        
        fixed_quote['metadata']['auto_corrections'] = fixes_applied
        fixed_quote['metadata']['original_had_errors'] = True
        
        # Re-validar después de correcciones
        revalidation = await self._validate_quote(fixed_quote)
        if not revalidation['is_valid']:
            # Si aún hay errores, marcar para revisión manual
            fixed_quote['metadata']['requires_manual_review'] = True
            fixed_quote['metadata']['remaining_errors'] = revalidation['errors']
        
        return fixed_quote
    
    # ============= MÉTODOS DE SOPORTE =============
    
    def _generate_cache_key(self, request: Dict[str, Any]) -> str:
        """Genera una clave única para el cache"""
        request_str = json.dumps(request, sort_keys=True)
        return f"quote:{hashlib.md5(request_str.encode()).hexdigest()}"
    
    def _get_cached_quote(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Obtiene una cotización del cache"""
        try:
            cached = self.cache.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache error: {e}")
        return None
    
    def _cache_quote(self, cache_key: str, quote: Dict[str, Any], ttl: int = 300):
        """Guarda una cotización en cache"""
        try:
            self.cache.setex(
                cache_key,
                ttl,
                json.dumps(quote, default=str)
            )
        except Exception as e:
            logger.error(f"Cache save error: {e}")
    
    def _update_cached_quote(
        self,
        cached_quote: Dict[str, Any],
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Actualiza una cotización cacheada con nueva información"""
        updated = cached_quote.copy()
        updated['retrieved_from_cache'] = True
        updated['cache_timestamp'] = cached_quote.get('created_at')
        updated['updated_at'] = datetime.now().isoformat()
        
        # Actualizar validez
        created = datetime.fromisoformat(cached_quote['created_at'])
        age_seconds = (datetime.now() - created).total_seconds()
        updated['valid_for_seconds'] = max(0, cached_quote.get('valid_for_seconds', 300) - age_seconds)
        
        return updated
    
    def _generate_quote_id(self) -> str:
        """Genera un ID único para la cotización"""
        import uuid
        return f"QT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    async def _get_fallback_results(self, request: Dict[str, Any]) -> Tuple:
        """Obtiene resultados de respaldo cuando hay timeout"""
        # Usar valores predeterminados conservadores
        availability = {
            'all_available': False,
            'details': {'status': 'timeout', 'message': 'Using estimated availability'},
            'alternatives': []
        }
        
        pricing = {
            'total': Decimal('0'),
            'breakdown': {},
            'estimated': True,
            'message': 'Pricing being calculated, will update shortly'
        }
        
        rules_check = {
            'passed': True,
            'violations': [],
            'warnings': [{'type': 'timeout', 'message': 'Business rules check incomplete'}]
        }
        
        return availability, pricing, rules_check
    
    def _calculate_confidence(
        self,
        availability: Dict[str, Any],
        rules_check: Dict[str, Any]
    ) -> float:
        """Calcula el score de confianza de la cotización"""
        confidence = 1.0
        
        # Reducir por disponibilidad no confirmada
        if not availability.get('all_available'):
            confidence -= 0.2
        
        # Reducir por violaciones de reglas
        if rules_check.get('violations'):
            confidence -= 0.1 * len(rules_check['violations'])
        
        # Reducir por warnings
        if rules_check.get('warnings'):
            confidence -= 0.05 * len(rules_check['warnings'])
        
        return max(0.1, min(1.0, confidence))
    
    async def _build_services_list(
        self,
        request: Dict[str, Any],
        availability: Dict[str, Any],
        pricing: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Construye la lista detallada de servicios"""
        services = []
        
        # Agregar cada tipo de servicio
        service_builders = {
            'hotels': self._build_hotel_services,
            'transport': self._build_transport_services,
            'guides': self._build_guide_services,
            'activities': self._build_activity_services,
            'meals': self._build_meal_services
        }
        
        for service_type, builder in service_builders.items():
            if service_type in request:
                service_details = await builder(
                    request[service_type],
                    availability.get('details', {}).get(service_type, {}),
                    pricing.get('breakdown', {}).get(service_type, 0)
                )
                services.extend(service_details)
        
        return services
    
    def _load_validation_rules(self) -> Dict[str, Any]:
        """Carga las reglas de validación del sistema"""
        return {
            'min_advance_booking': 24,  # horas
            'max_group_size': 50,
            'min_group_size': 1,
            'max_booking_days': 365,
            'price_variance_threshold': 0.2,  # 20%
            'availability_confirmation_timeout': 300,  # segundos
            'required_fields': ['travel_date', 'group_size', 'destination']
        }
    
    def _load_price_matrix(self) -> Dict[str, Any]:
        """Carga la matriz de precios pre-calculada"""
        # Esta matriz se actualizaría periódicamente
        return {
            'hotels': {
                '3star': {'single': 80, 'double': 120, 'suite': 200},
                '4star': {'single': 120, 'double': 180, 'suite': 300},
                '5star': {'single': 200, 'double': 300, 'suite': 500}
            },
            'transport': {
                'sedan': {'per_day': 150, 'per_km': 2},
                'van': {'per_day': 250, 'per_km': 3},
                'minibus': {'per_day': 400, 'per_km': 4},
                'bus': {'per_day': 600, 'per_km': 5}
            },
            'guides': {
                'standard': {'per_day': 200, 'per_half_day': 120},
                'premium': {'per_day': 350, 'per_half_day': 200},
                'specialist': {'per_day': 500, 'per_half_day': 300}
            }
        }