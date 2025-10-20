# Advanced Error Prevention and Validation System
# Sistema avanzado de prevención de errores y validación multi-nivel

from typing import Dict, List, Optional, Any, Tuple, Set
from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum
import re
import asyncio
import json
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    """Niveles de severidad de errores"""
    CRITICAL = "critical"  # Bloquea la cotización
    HIGH = "high"  # Requiere corrección inmediata
    MEDIUM = "medium"  # Debe corregirse antes de confirmar
    LOW = "low"  # Advertencia, no bloquea
    INFO = "info"  # Informativo

class ValidationType(Enum):
    """Tipos de validación"""
    SYNTAX = "syntax"  # Validación de formato
    BUSINESS = "business"  # Reglas de negocio
    LOGICAL = "logical"  # Coherencia lógica
    FINANCIAL = "financial"  # Validación financiera
    AVAILABILITY = "availability"  # Disponibilidad de recursos
    COMPLIANCE = "compliance"  # Cumplimiento regulatorio
    QUALITY = "quality"  # Calidad del servicio

@dataclass
class ValidationRule:
    """Regla de validación"""
    id: str
    name: str
    type: ValidationType
    severity: ErrorSeverity
    condition: str
    message: str
    auto_fix: bool = False
    fix_function: Optional[str] = None

class ErrorPreventionSystem:
    """
    Sistema principal de prevención de errores con validación multi-nivel
    """
    
    def __init__(self):
        self.rules = self._load_validation_rules()
        self.error_patterns = self._load_error_patterns()
        self.fix_strategies = self._load_fix_strategies()
        self.validation_cache = {}
        
    async def validate_complete(
        self,
        data: Dict[str, Any],
        context: str = "quote"
    ) -> Dict[str, Any]:
        """
        Validación completa multi-nivel con prevención de errores
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'info': [],
            'auto_fixed': [],
            'validation_score': 100,
            'timestamp': datetime.now().isoformat(),
            'context': context
        }
        
        # Nivel 1: Validación de sintaxis y formato
        syntax_result = await self._validate_syntax(data)
        validation_result = self._merge_results(validation_result, syntax_result)
        
        # Nivel 2: Validación de reglas de negocio
        business_result = await self._validate_business_rules(data)
        validation_result = self._merge_results(validation_result, business_result)
        
        # Nivel 3: Validación lógica y coherencia
        logic_result = await self._validate_logic(data)
        validation_result = self._merge_results(validation_result, logic_result)
        
        # Nivel 4: Validación financiera
        financial_result = await self._validate_financial(data)
        validation_result = self._merge_results(validation_result, financial_result)
        
        # Nivel 5: Validación de disponibilidad
        availability_result = await self._validate_availability(data)
        validation_result = self._merge_results(validation_result, availability_result)
        
        # Nivel 6: Validación de cumplimiento
        compliance_result = await self._validate_compliance(data)
        validation_result = self._merge_results(validation_result, compliance_result)
        
        # Nivel 7: Validación de calidad
        quality_result = await self._validate_quality(data)
        validation_result = self._merge_results(validation_result, quality_result)
        
        # Intentar auto-corrección de errores
        if validation_result['errors'] and self._can_auto_fix(validation_result['errors']):
            fixed_data, fixes = await self._auto_fix_errors(data, validation_result['errors'])
            
            # Re-validar después de correcciones
            if fixes:
                validation_result['auto_fixed'] = fixes
                re_validation = await self.validate_complete(fixed_data, context)
                
                # Si las correcciones funcionaron, usar el resultado corregido
                if re_validation['is_valid']:
                    validation_result = re_validation
                    validation_result['auto_fixed'] = fixes
        
        # Calcular score final
        validation_result['validation_score'] = self._calculate_validation_score(validation_result)
        
        # Determinar si es válido
        critical_errors = [e for e in validation_result['errors'] if e['severity'] == ErrorSeverity.CRITICAL.value]
        validation_result['is_valid'] = len(critical_errors) == 0
        
        return validation_result
    
    async def _validate_syntax(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación de sintaxis y formato de datos
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        # Validar campos requeridos
        required_fields = self._get_required_fields(data.get('type', 'quote'))
        for field in required_fields:
            if field not in data or data[field] is None:
                result['errors'].append({
                    'type': ValidationType.SYNTAX.value,
                    'severity': ErrorSeverity.CRITICAL.value,
                    'field': field,
                    'message': f"Campo requerido '{field}' falta o es nulo",
                    'auto_fixable': False
                })
        
        # Validar formatos de fecha
        date_fields = ['travel_date', 'end_date', 'booking_date', 'valid_until']
        for field in date_fields:
            if field in data and data[field]:
                if not self._validate_date_format(data[field]):
                    result['errors'].append({
                        'type': ValidationType.SYNTAX.value,
                        'severity': ErrorSeverity.HIGH.value,
                        'field': field,
                        'message': f"Formato de fecha inválido en '{field}'",
                        'auto_fixable': True,
                        'suggested_fix': self._suggest_date_fix(data[field])
                    })
        
        # Validar emails
        email_fields = ['client_email', 'contact_email', 'agent_email']
        for field in email_fields:
            if field in data and data[field]:
                if not self._validate_email(data[field]):
                    result['errors'].append({
                        'type': ValidationType.SYNTAX.value,
                        'severity': ErrorSeverity.MEDIUM.value,
                        'field': field,
                        'message': f"Email inválido: {data[field]}",
                        'auto_fixable': False
                    })
        
        # Validar números y rangos
        numeric_validations = [
            ('group_size', 1, 100),
            ('duration_days', 1, 30),
            ('total_price', 0, 1000000)
        ]
        
        for field, min_val, max_val in numeric_validations:
            if field in data and data[field] is not None:
                try:
                    value = float(data[field])
                    if value < min_val or value > max_val:
                        result['warnings'].append({
                            'type': ValidationType.SYNTAX.value,
                            'severity': ErrorSeverity.MEDIUM.value,
                            'field': field,
                            'message': f"{field} fuera de rango: {value} (esperado {min_val}-{max_val})",
                            'auto_fixable': True,
                            'suggested_fix': max(min_val, min(max_val, value))
                        })
                except (ValueError, TypeError):
                    result['errors'].append({
                        'type': ValidationType.SYNTAX.value,
                        'severity': ErrorSeverity.HIGH.value,
                        'field': field,
                        'message': f"Valor no numérico en campo numérico: {field}",
                        'auto_fixable': False
                    })
        
        return result
    
    async def _validate_business_rules(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación de reglas de negocio
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        # Regla: Anticipación mínima de reserva
        if 'travel_date' in data:
            travel_date = self._parse_date(data['travel_date'])
            if travel_date:
                days_advance = (travel_date - datetime.now().date()).days
                if days_advance < 2:
                    result['errors'].append({
                        'type': ValidationType.BUSINESS.value,
                        'severity': ErrorSeverity.HIGH.value,
                        'rule': 'min_advance_booking',
                        'message': f"Reserva con menos de 48 horas de anticipación ({days_advance} días)",
                        'auto_fixable': False
                    })
                elif days_advance < 7:
                    result['warnings'].append({
                        'type': ValidationType.BUSINESS.value,
                        'severity': ErrorSeverity.MEDIUM.value,
                        'rule': 'short_notice_booking',
                        'message': f"Reserva con poca anticipación ({days_advance} días)",
                        'impact': "Disponibilidad limitada y precios más altos"
                    })
        
        # Regla: Margen de ganancia mínimo
        if 'pricing' in data:
            margin = self._calculate_margin(data['pricing'])
            if margin < 10:
                result['errors'].append({
                    'type': ValidationType.BUSINESS.value,
                    'severity': ErrorSeverity.HIGH.value,
                    'rule': 'min_profit_margin',
                    'message': f"Margen de ganancia muy bajo: {margin:.1f}%",
                    'auto_fixable': True,
                    'suggested_fix': "Ajustar markup al 15% mínimo"
                })
        
        # Regla: Validación de temporada y precios
        if 'travel_date' in data and 'pricing' in data:
            season = self._get_season(data['travel_date'])
            if season == 'high' and not self._has_season_pricing(data['pricing']):
                result['warnings'].append({
                    'type': ValidationType.BUSINESS.value,
                    'severity': ErrorSeverity.MEDIUM.value,
                    'rule': 'seasonal_pricing',
                    'message': "Temporada alta sin ajuste de precios",
                    'auto_fixable': True,
                    'suggested_adjustment': 1.25  # 25% incremento
                })
        
        # Regla: Grupos grandes requieren confirmación especial
        if 'group_size' in data and data['group_size'] > 20:
            if not data.get('special_confirmation'):
                result['warnings'].append({
                    'type': ValidationType.BUSINESS.value,
                    'severity': ErrorSeverity.MEDIUM.value,
                    'rule': 'large_group',
                    'message': f"Grupo grande ({data['group_size']} pax) requiere confirmación especial",
                    'requirements': ['Verificar capacidad de transporte', 'Confirmar guías adicionales']
                })
        
        return result
    
    async def _validate_logic(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación de coherencia lógica
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        # Validar coherencia de fechas
        if 'travel_date' in data and 'end_date' in data:
            start = self._parse_date(data['travel_date'])
            end = self._parse_date(data['end_date'])
            
            if start and end:
                if end < start:
                    result['errors'].append({
                        'type': ValidationType.LOGICAL.value,
                        'severity': ErrorSeverity.CRITICAL.value,
                        'message': "Fecha de fin anterior a fecha de inicio",
                        'auto_fixable': True,
                        'fix': {'end_date': data['travel_date']}
                    })
                
                duration = (end - start).days + 1
                if 'duration_days' in data:
                    if data['duration_days'] != duration:
                        result['errors'].append({
                            'type': ValidationType.LOGICAL.value,
                            'severity': ErrorSeverity.HIGH.value,
                            'message': f"Duración inconsistente: calculada {duration}, especificada {data['duration_days']}",
                            'auto_fixable': True,
                            'fix': {'duration_days': duration}
                        })
        
        # Validar relación grupo-habitaciones
        if 'group_size' in data and 'rooms' in data:
            min_rooms_needed = (data['group_size'] + 1) // 2  # Asumiendo ocupación doble
            if data['rooms'] < min_rooms_needed:
                result['errors'].append({
                    'type': ValidationType.LOGICAL.value,
                    'severity': ErrorSeverity.HIGH.value,
                    'message': f"Habitaciones insuficientes: {data['rooms']} para {data['group_size']} personas",
                    'auto_fixable': True,
                    'fix': {'rooms': min_rooms_needed}
                })
        
        # Validar capacidad de transporte
        if 'transport' in data and 'group_size' in data:
            for transport in data.get('transport', []):
                if transport.get('capacity', 0) < data['group_size']:
                    result['errors'].append({
                        'type': ValidationType.LOGICAL.value,
                        'severity': ErrorSeverity.HIGH.value,
                        'message': f"Capacidad de transporte insuficiente: {transport.get('capacity', 0)} < {data['group_size']}",
                        'auto_fixable': True,
                        'suggested_fix': "Agregar vehículo adicional o cambiar tipo"
                    })
        
        # Validar itinerario lógico
        if 'itinerary' in data:
            route_issues = self._validate_route_logic(data['itinerary'])
            for issue in route_issues:
                result['warnings'].append({
                    'type': ValidationType.LOGICAL.value,
                    'severity': ErrorSeverity.MEDIUM.value,
                    'message': issue['message'],
                    'day': issue.get('day'),
                    'suggestion': issue.get('suggestion')
                })
        
        return result
    
    async def _validate_financial(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación financiera y de precios
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        if 'pricing' not in data:
            return result
        
        pricing = data['pricing']
        
        # Validar suma de componentes
        if 'breakdown' in pricing and 'total' in pricing:
            calculated_total = sum(
                Decimal(str(v)) for v in pricing['breakdown'].values()
            )
            stated_total = Decimal(str(pricing['total']))
            
            difference = abs(calculated_total - stated_total)
            if difference > Decimal('0.01'):
                result['errors'].append({
                    'type': ValidationType.FINANCIAL.value,
                    'severity': ErrorSeverity.CRITICAL.value,
                    'message': f"Error en suma de precios: calculado {calculated_total}, declarado {stated_total}",
                    'difference': float(difference),
                    'auto_fixable': True,
                    'fix': {'total': float(calculated_total)}
                })
        
        # Validar márgenes y markups
        if 'cost' in pricing and 'total' in pricing:
            cost = Decimal(str(pricing['cost']))
            total = Decimal(str(pricing['total']))
            
            if cost > 0:
                margin = ((total - cost) / cost) * 100
                
                if margin < 0:
                    result['errors'].append({
                        'type': ValidationType.FINANCIAL.value,
                        'severity': ErrorSeverity.CRITICAL.value,
                        'message': "Precio de venta menor que costo",
                        'margin': float(margin),
                        'auto_fixable': True,
                        'fix': {'total': float(cost * Decimal('1.15'))}  # 15% margen mínimo
                    })
                elif margin < 10:
                    result['warnings'].append({
                        'type': ValidationType.FINANCIAL.value,
                        'severity': ErrorSeverity.HIGH.value,
                        'message': f"Margen muy bajo: {margin:.1f}%",
                        'suggested_margin': 15
                    })
                elif margin > 100:
                    result['warnings'].append({
                        'type': ValidationType.FINANCIAL.value,
                        'severity': ErrorSeverity.MEDIUM.value,
                        'message': f"Margen muy alto: {margin:.1f}%",
                        'risk': "Puede no ser competitivo"
                    })
        
        # Validar precios contra mercado
        market_validation = await self._validate_against_market(pricing, data)
        if market_validation:
            result['warnings'].extend(market_validation)
        
        # Validar impuestos y fees
        if 'taxes' in pricing:
            tax_rate = Decimal(str(pricing.get('tax_rate', 0.19)))
            expected_tax = Decimal(str(pricing.get('total', 0))) * tax_rate
            stated_tax = Decimal(str(pricing['taxes']))
            
            if abs(expected_tax - stated_tax) > Decimal('0.01'):
                result['errors'].append({
                    'type': ValidationType.FINANCIAL.value,
                    'severity': ErrorSeverity.HIGH.value,
                    'message': f"Error en cálculo de impuestos",
                    'expected': float(expected_tax),
                    'stated': float(stated_tax),
                    'auto_fixable': True,
                    'fix': {'taxes': float(expected_tax)}
                })
        
        return result
    
    async def _validate_availability(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación de disponibilidad de recursos
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        # Validar disponibilidad de servicios
        if 'services' in data:
            for service in data['services']:
                if service.get('availability') == 'not_available':
                    result['errors'].append({
                        'type': ValidationType.AVAILABILITY.value,
                        'severity': ErrorSeverity.CRITICAL.value,
                        'service': service.get('type'),
                        'message': f"Servicio no disponible: {service.get('name', 'Unknown')}",
                        'date': service.get('date'),
                        'alternatives': service.get('alternatives', [])
                    })
                elif service.get('availability') == 'limited':
                    result['warnings'].append({
                        'type': ValidationType.AVAILABILITY.value,
                        'severity': ErrorSeverity.MEDIUM.value,
                        'service': service.get('type'),
                        'message': f"Disponibilidad limitada: {service.get('name')}",
                        'remaining': service.get('remaining_capacity')
                    })
        
        # Validar conflictos de recursos
        conflicts = await self._check_resource_conflicts(data)
        for conflict in conflicts:
            result['errors'].append({
                'type': ValidationType.AVAILABILITY.value,
                'severity': ErrorSeverity.HIGH.value,
                'message': conflict['message'],
                'resources': conflict['resources'],
                'conflict_type': conflict['type']
            })
        
        return result
    
    async def _validate_compliance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación de cumplimiento regulatorio
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        # Validar documentación requerida
        required_docs = self._get_required_documents(data)
        for doc in required_docs:
            if doc not in data.get('documents', {}):
                severity = ErrorSeverity.HIGH if doc in ['visa', 'passport'] else ErrorSeverity.MEDIUM
                result['warnings'].append({
                    'type': ValidationType.COMPLIANCE.value,
                    'severity': severity.value,
                    'document': doc,
                    'message': f"Documento requerido no verificado: {doc}",
                    'requirement': self._get_document_requirement(doc)
                })
        
        # Validar restricciones de edad
        if 'participants' in data:
            age_issues = self._validate_age_restrictions(data['participants'])
            for issue in age_issues:
                result['warnings'].append({
                    'type': ValidationType.COMPLIANCE.value,
                    'severity': ErrorSeverity.MEDIUM.value,
                    'message': issue['message'],
                    'participant': issue.get('participant'),
                    'requirement': issue.get('requirement')
                })
        
        # Validar seguros requeridos
        if 'insurance' not in data or not data.get('insurance'):
            result['warnings'].append({
                'type': ValidationType.COMPLIANCE.value,
                'severity': ErrorSeverity.MEDIUM.value,
                'message': "Seguro de viaje no especificado",
                'recommendation': "Seguro de viaje obligatorio para grupos"
            })
        
        return result
    
    async def _validate_quality(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación de calidad del servicio
        """
        result = {
            'errors': [],
            'warnings': [],
            'info': []
        }
        
        # Validar calidad de proveedores
        if 'providers' in data:
            for provider in data['providers']:
                rating = provider.get('rating', 0)
                if rating < 3.5:
                    result['warnings'].append({
                        'type': ValidationType.QUALITY.value,
                        'severity': ErrorSeverity.LOW.value,
                        'provider': provider.get('name'),
                        'message': f"Proveedor con calificación baja: {rating}/5",
                        'suggestion': "Considerar proveedor alternativo"
                    })
        
        # Validar balance del itinerario
        if 'itinerary' in data:
            balance_issues = self._check_itinerary_balance(data['itinerary'])
            for issue in balance_issues:
                result['info'].append({
                    'type': ValidationType.QUALITY.value,
                    'severity': ErrorSeverity.INFO.value,
                    'message': issue['message'],
                    'suggestion': issue.get('suggestion')
                })
        
        # Validar experiencia del cliente
        customer_experience = self._evaluate_customer_experience(data)
        if customer_experience['score'] < 70:
            result['warnings'].append({
                'type': ValidationType.QUALITY.value,
                'severity': ErrorSeverity.MEDIUM.value,
                'message': f"Score de experiencia del cliente bajo: {customer_experience['score']}/100",
                'improvements': customer_experience.get('improvements', [])
            })
        
        return result
    
    async def _auto_fix_errors(
        self,
        data: Dict[str, Any],
        errors: List[Dict[str, Any]]
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Intenta corregir automáticamente los errores detectados
        """
        fixed_data = json.loads(json.dumps(data))  # Deep copy
        fixes_applied = []
        
        for error in errors:
            if error.get('auto_fixable') and error.get('fix'):
                fix = error['fix']
                
                # Aplicar corrección
                for key, value in fix.items():
                    if '.' in key:  # Nested key
                        self._set_nested_value(fixed_data, key, value)
                    else:
                        fixed_data[key] = value
                
                fixes_applied.append({
                    'error_type': error['type'],
                    'field': error.get('field', 'unknown'),
                    'original_value': self._get_nested_value(data, error.get('field')),
                    'fixed_value': value,
                    'fix_description': error.get('message')
                })
        
        return fixed_data, fixes_applied
    
    def _can_auto_fix(self, errors: List[Dict[str, Any]]) -> bool:
        """Determina si los errores pueden ser auto-corregidos"""
        critical_errors = [e for e in errors if e.get('severity') == ErrorSeverity.CRITICAL.value]
        auto_fixable = [e for e in critical_errors if e.get('auto_fixable')]
        
        # Solo auto-corregir si todos los errores críticos son auto-corregibles
        return len(critical_errors) > 0 and len(auto_fixable) == len(critical_errors)
    
    def _merge_results(
        self,
        main_result: Dict[str, Any],
        new_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Combina resultados de validación"""
        for key in ['errors', 'warnings', 'info']:
            if key in new_result:
                main_result[key].extend(new_result[key])
        
        return main_result
    
    def _calculate_validation_score(self, result: Dict[str, Any]) -> int:
        """Calcula el score de validación"""
        score = 100
        
        # Penalizar por errores
        for error in result.get('errors', []):
            if error.get('severity') == ErrorSeverity.CRITICAL.value:
                score -= 20
            elif error.get('severity') == ErrorSeverity.HIGH.value:
                score -= 10
            elif error.get('severity') == ErrorSeverity.MEDIUM.value:
                score -= 5
        
        # Penalizar por warnings
        for warning in result.get('warnings', []):
            if warning.get('severity') == ErrorSeverity.HIGH.value:
                score -= 3
            elif warning.get('severity') == ErrorSeverity.MEDIUM.value:
                score -= 2
            else:
                score -= 1
        
        return max(0, score)
    
    # ========== MÉTODOS AUXILIARES ==========
    
    def _get_required_fields(self, context: str) -> List[str]:
        """Obtiene campos requeridos según contexto"""
        fields_map = {
            'quote': ['travel_date', 'group_size', 'client_name'],
            'booking': ['travel_date', 'group_size', 'client_name', 'payment_method'],
            'provider': ['provider_id', 'service_date', 'service_type']
        }
        return fields_map.get(context, [])
    
    def _validate_date_format(self, date_str: Any) -> bool:
        """Valida formato de fecha"""
        if isinstance(date_str, (date, datetime)):
            return True
        
        if isinstance(date_str, str):
            # Intentar parsear varios formatos
            formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d']
            for fmt in formats:
                try:
                    datetime.strptime(date_str, fmt)
                    return True
                except ValueError:
                    continue
        
        return False
    
    def _parse_date(self, date_str: Any) -> Optional[date]:
        """Parsea una fecha en varios formatos"""
        if isinstance(date_str, date):
            return date_str
        if isinstance(date_str, datetime):
            return date_str.date()
        
        if isinstance(date_str, str):
            formats = ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d']
            for fmt in formats:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
        
        return None
    
    def _validate_email(self, email: str) -> bool:
        """Valida formato de email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def _suggest_date_fix(self, date_str: str) -> str:
        """Sugiere corrección para formato de fecha"""
        # Intentar interpretar y reformatear
        try:
            # Remover caracteres no numéricos comunes
            clean = re.sub(r'[^\d/\-]', '', date_str)
            
            # Intentar diferentes interpretaciones
            parts = re.split(r'[/\-]', clean)
            if len(parts) == 3:
                # Asumir formato más probable
                if int(parts[0]) > 31:  # Probablemente año
                    return f"{parts[0]}-{parts[1]:0>2}-{parts[2]:0>2}"
                elif int(parts[2]) > 31:  # Año al final
                    return f"{parts[2]}-{parts[1]:0>2}-{parts[0]:0>2}"
        except:
            pass
        
        return datetime.now().date().isoformat()
    
    def _calculate_margin(self, pricing: Dict[str, Any]) -> float:
        """Calcula el margen de ganancia"""
        try:
            cost = float(pricing.get('cost', 0))
            price = float(pricing.get('total', 0))
            
            if cost > 0:
                return ((price - cost) / cost) * 100
        except:
            pass
        
        return 0
    
    def _get_season(self, date_str: Any) -> str:
        """Determina la temporada turística"""
        travel_date = self._parse_date(date_str)
        if not travel_date:
            return 'normal'
        
        month = travel_date.month
        
        # Definir temporadas (ajustar según destino)
        high_season_months = [3, 4, 7, 8, 12]  # Marzo, Abril, Julio, Agosto, Diciembre
        low_season_months = [1, 2, 5, 6]  # Enero, Febrero, Mayo, Junio
        
        if month in high_season_months:
            return 'high'
        elif month in low_season_months:
            return 'low'
        else:
            return 'normal'
    
    def _has_season_pricing(self, pricing: Dict[str, Any]) -> bool:
        """Verifica si tiene ajuste de temporada"""
        return pricing.get('seasonal_adjustment', 0) > 0
    
    def _validate_route_logic(self, itinerary: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Valida la lógica de rutas en el itinerario"""
        issues = []
        
        for i, day in enumerate(itinerary):
            destinations = day.get('destinations', [])
            
            # Verificar cantidad de destinos
            if len(destinations) > 4:
                issues.append({
                    'day': i + 1,
                    'message': f"Día {i+1} tiene demasiados destinos ({len(destinations)})",
                    'suggestion': "Considerar dividir en dos días"
                })
            
            # Verificar distancias (simplificado)
            if i > 0 and itinerary[i-1].get('destinations'):
                last_destination = itinerary[i-1]['destinations'][-1] if itinerary[i-1]['destinations'] else None
                first_destination = destinations[0] if destinations else None
                
                if last_destination and first_destination:
                    # Aquí iría lógica real de cálculo de distancia
                    if self._estimate_distance(last_destination, first_destination) > 300:
                        issues.append({
                            'day': i + 1,
                            'message': f"Distancia larga entre día {i} y {i+1}",
                            'suggestion': "Considerar alojamiento intermedio"
                        })
        
        return issues
    
    def _estimate_distance(self, origin: str, destination: str) -> float:
        """Estima distancia entre dos puntos (simplificado)"""
        # En producción, usar API de mapas real
        known_distances = {
            ('Jerusalem', 'Tel Aviv'): 65,
            ('Tel Aviv', 'Haifa'): 95,
            ('Jerusalem', 'Dead Sea'): 50
        }
        
        return known_distances.get((origin, destination), 100)
    
    async def _validate_against_market(
        self,
        pricing: Dict[str, Any],
        data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Valida precios contra el mercado"""
        warnings = []
        
        # Aquí iría lógica real de comparación con mercado
        # Por ahora, usar rangos estáticos
        
        if 'price_per_person' in pricing:
            ppp = float(pricing['price_per_person'])
            duration = data.get('duration_days', 1)
            daily_rate = ppp / duration
            
            if daily_rate < 100:
                warnings.append({
                    'type': ValidationType.FINANCIAL.value,
                    'severity': ErrorSeverity.MEDIUM.value,
                    'message': f"Precio por día muy bajo: ${daily_rate:.2f}",
                    'market_average': 200,
                    'percentile': 10
                })
            elif daily_rate > 1000:
                warnings.append({
                    'type': ValidationType.FINANCIAL.value,
                    'severity': ErrorSeverity.LOW.value,
                    'message': f"Precio por día muy alto: ${daily_rate:.2f}",
                    'market_average': 200,
                    'percentile': 95
                })
        
        return warnings
    
    async def _check_resource_conflicts(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica conflictos de recursos"""
        conflicts = []
        
        # Verificar conflictos de guías
        if 'guides' in data:
            guide_dates = {}
            for assignment in data.get('guide_assignments', []):
                guide_id = assignment.get('guide_id')
                date = assignment.get('date')
                
                key = f"{guide_id}_{date}"
                if key in guide_dates:
                    conflicts.append({
                        'type': 'guide_double_booking',
                        'message': f"Guía {guide_id} asignado dos veces en {date}",
                        'resources': [guide_id]
                    })
                guide_dates[key] = True
        
        return conflicts
    
    def _get_required_documents(self, data: Dict[str, Any]) -> List[str]:
        """Obtiene documentos requeridos según el viaje"""
        docs = ['passport']
        
        # Si es internacional, requiere más documentos
        if data.get('international', True):
            docs.extend(['visa', 'travel_insurance'])
        
        # Si incluye actividades especiales
        if 'activities' in data:
            for activity in data['activities']:
                if 'diving' in activity.get('type', '').lower():
                    docs.append('diving_certificate')
                if 'driving' in activity.get('type', '').lower():
                    docs.append('drivers_license')
        
        return docs
    
    def _get_document_requirement(self, doc: str) -> str:
        """Obtiene requisito específico de documento"""
        requirements = {
            'passport': 'Válido por al menos 6 meses desde la fecha de viaje',
            'visa': 'Verificar requisitos según nacionalidad',
            'travel_insurance': 'Cobertura mínima de $50,000 USD',
            'diving_certificate': 'PADI Open Water o equivalente',
            'drivers_license': 'Licencia internacional válida'
        }
        return requirements.get(doc, 'Verificar requisitos específicos')
    
    def _validate_age_restrictions(self, participants: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Valida restricciones de edad"""
        issues = []
        
        for participant in participants:
            age = participant.get('age')
            if age:
                if age < 18 and not participant.get('guardian'):
                    issues.append({
                        'message': f"Menor de edad sin guardián: {participant.get('name')}",
                        'participant': participant.get('name'),
                        'requirement': 'Requiere autorización de padres/tutores'
                    })
                elif age > 70:
                    issues.append({
                        'message': f"Participante mayor de 70 años",
                        'participant': participant.get('name'),
                        'requirement': 'Puede requerir certificado médico'
                    })
        
        return issues
    
    def _check_itinerary_balance(self, itinerary: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Verifica el balance del itinerario"""
        issues = []
        
        activity_count = sum(len(day.get('activities', [])) for day in itinerary)
        rest_time = sum(day.get('rest_hours', 0) for day in itinerary)
        
        if activity_count / len(itinerary) > 5:
            issues.append({
                'message': 'Itinerario muy intenso',
                'suggestion': 'Considerar agregar más tiempo de descanso'
            })
        
        if rest_time / len(itinerary) < 2:
            issues.append({
                'message': 'Poco tiempo de descanso programado',
                'suggestion': 'Agregar pausas entre actividades'
            })
        
        return issues
    
    def _evaluate_customer_experience(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Evalúa la experiencia del cliente"""
        score = 100
        improvements = []
        
        # Evaluar varios factores
        if not data.get('welcome_package'):
            score -= 10
            improvements.append('Agregar paquete de bienvenida')
        
        if not data.get('24_7_support'):
            score -= 15
            improvements.append('Incluir soporte 24/7')
        
        if not data.get('flexibility_options'):
            score -= 10
            improvements.append('Ofrecer opciones de cambio flexible')
        
        return {
            'score': score,
            'improvements': improvements
        }
    
    def _set_nested_value(self, data: Dict[str, Any], key: str, value: Any):
        """Establece un valor en una estructura anidada"""
        keys = key.split('.')
        current = data
        
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        current[keys[-1]] = value
    
    def _get_nested_value(self, data: Dict[str, Any], key: Optional[str]) -> Any:
        """Obtiene un valor de una estructura anidada"""
        if not key:
            return None
        
        keys = key.split('.')
        current = data
        
        for k in keys:
            if isinstance(current, dict) and k in current:
                current = current[k]
            else:
                return None
        
        return current
    
    def _load_validation_rules(self) -> List[ValidationRule]:
        """Carga las reglas de validación"""
        # En producción, cargar desde base de datos
        return [
            ValidationRule(
                id="R001",
                name="Anticipación mínima",
                type=ValidationType.BUSINESS,
                severity=ErrorSeverity.HIGH,
                condition="travel_date - today >= 2 days",
                message="Reserva requiere mínimo 48 horas de anticipación",
                auto_fix=False
            ),
            ValidationRule(
                id="R002",
                name="Margen mínimo",
                type=ValidationType.FINANCIAL,
                severity=ErrorSeverity.HIGH,
                condition="margin >= 10%",
                message="Margen de ganancia debe ser mínimo 10%",
                auto_fix=True,
                fix_function="adjust_markup"
            )
        ]
    
    def _load_error_patterns(self) -> Dict[str, Any]:
        """Carga patrones de error conocidos"""
        return {
            'date_errors': [
                {'pattern': r'\d{2}/\d{2}/\d{2}', 'fix': 'parse_short_year'},
                {'pattern': r'\d{1}/\d{1}/\d{4}', 'fix': 'pad_single_digits'}
            ],
            'price_errors': [
                {'pattern': 'negative_price', 'fix': 'abs_value'},
                {'pattern': 'missing_currency', 'fix': 'add_default_currency'}
            ]
        }
    
    def _load_fix_strategies(self) -> Dict[str, Any]:
        """Carga estrategias de corrección automática"""
        return {
            'date_fix': {
                'strategy': 'parse_multiple_formats',
                'fallback': 'use_current_date'
            },
            'price_fix': {
                'strategy': 'recalculate_from_components',
                'fallback': 'use_market_average'
            },
            'availability_fix': {
                'strategy': 'find_alternatives',
                'fallback': 'suggest_date_change'
            }
        }