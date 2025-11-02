"""
Integración entre Sistema de Guías y Reservas
Gestiona la asignación automática de guías basada en disponibilidad y matching
"""

import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
from enum import Enum
import uuid
import json

from core.event_bus import EventBus, Event, EventType, EventMetadata, get_event_bus
from services.guide_management_service import GuideManagementService

logger = logging.getLogger(__name__)


class GuideCategory(Enum):
    """Categorías de guías"""
    LICENSED = "LICENSED"              # Guía licenciado oficial
    TOUR_LEADER = "TOUR_LEADER"        # Tour leader/acompañante
    LOCAL = "LOCAL"                    # Guía local
    SPECIALIZED = "SPECIALIZED"        # Guía especializado (ej: arqueología)
    TRANSLATOR = "TRANSLATOR"          # Traductor/intérprete


class AssignmentStatus(Enum):
    """Estados de asignación"""
    PENDING = "PENDING"
    SEARCHING = "SEARCHING"
    PROPOSED = "PROPOSED"
    CONFIRMED = "CONFIRMED"
    DECLINED = "DECLINED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class AssignmentPriority(Enum):
    """Prioridad de asignación"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"


class GuideBookingIntegration:
    """
    Servicio de integración para asignación automática de guías a reservas
    Implementa algoritmo de matching inteligente
    """
    
    def __init__(self, db_session=None):
        self.db = db_session
        self.event_bus: Optional[EventBus] = None
        self.guide_service = GuideManagementService(db_session) if db_session else None
        
        # Cache de asignaciones
        self.assignment_cache: Dict[str, Dict[str, Any]] = {}
        
        # Configuración de scoring
        self.scoring_config = {
            'rating_weight': 0.25,           # 25% peso para rating
            'experience_weight': 0.20,        # 20% peso para experiencia
            'language_weight': 0.20,          # 20% peso para idiomas
            'specialization_weight': 0.15,    # 15% peso para especialización
            'availability_weight': 0.10,      # 10% peso para disponibilidad
            'price_weight': 0.10             # 10% peso para precio
        }
        
        # Configuración de umbrales
        self.thresholds = {
            'min_rating': 3.5,               # Rating mínimo aceptable
            'min_language_match': 0.8,        # 80% match de idiomas mínimo
            'max_price_deviation': 0.3,       # 30% máximo sobre presupuesto
            'min_total_score': 60             # Score mínimo para asignación
        }
    
    async def initialize(self):
        """
        Inicializar el servicio de integración
        """
        self.event_bus = await get_event_bus()
        
        # Suscribir a eventos relevantes
        self.event_bus.subscribe(
            [EventType.BOOKING_CREATED, EventType.BOOKING_CONFIRMED],
            self.handle_booking_event
        )
        
        self.event_bus.subscribe(
            [EventType.GUIDE_UNAVAILABLE],
            self.handle_guide_unavailable
        )
        
        self.event_bus.subscribe(
            [EventType.BOOKING_CANCELLED],
            self.handle_booking_cancelled
        )
        
        logger.info("GuideBookingIntegration initialized")
    
    async def handle_booking_event(self, event: Event):
        """
        Manejar eventos de reserva para asignar guías automáticamente
        """
        booking_id = event.payload.get('booking_id')
        booking_details = event.payload.get('booking_details', {})
        
        logger.info(f"Handling booking event for {booking_id}")
        
        # Verificar si necesita guías
        if not booking_details.get('requires_guide', False):
            logger.info(f"Booking {booking_id} doesn't require guides")
            return
        
        # Asignar guías automáticamente
        assignments = await self.auto_assign_guides_to_booking(
            booking_id,
            booking_details
        )
        
        # Publicar resultado
        if assignments:
            await self.event_bus.publish(
                EventType.GUIDE_ASSIGNED,
                {
                    'booking_id': booking_id,
                    'assignments': assignments,
                    'timestamp': datetime.utcnow().isoformat()
                },
                EventMetadata(
                    correlation_id=event.metadata.correlation_id,
                    causation_id=event.id,
                    service_name='guide_booking_integration'
                )
            )
    
    async def handle_guide_unavailable(self, event: Event):
        """
        Manejar cuando un guía no está disponible - buscar reemplazo
        """
        guide_id = event.payload.get('guide_id')
        assignment_id = event.payload.get('assignment_id')
        booking_id = event.payload.get('booking_id')
        
        logger.warning(f"Guide {guide_id} unavailable for assignment {assignment_id}")
        
        # Buscar guía de reemplazo
        replacement = await self.find_replacement_guide(
            assignment_id,
            booking_id,
            excluded_guides=[guide_id]
        )
        
        if replacement:
            # Publicar evento de reasignación
            await self.event_bus.publish(
                EventType.GUIDE_ASSIGNED,
                {
                    'booking_id': booking_id,
                    'assignment_id': assignment_id,
                    'replacement_guide': replacement,
                    'original_guide': guide_id,
                    'timestamp': datetime.utcnow().isoformat()
                },
                EventMetadata(
                    correlation_id=booking_id,
                    service_name='guide_booking_integration'
                )
            )
        else:
            # Notificar que no hay reemplazo disponible
            logger.error(f"No replacement found for guide {guide_id}")
    
    async def handle_booking_cancelled(self, event: Event):
        """
        Liberar guías cuando se cancela una reserva
        """
        booking_id = event.payload.get('booking_id')
        
        logger.info(f"Releasing guides for cancelled booking {booking_id}")
        
        # Obtener asignaciones del caché
        if booking_id in self.assignment_cache:
            assignments = self.assignment_cache[booking_id]
            
            # Liberar cada guía
            for assignment in assignments.get('assignments', []):
                await self.release_guide_assignment(assignment['assignment_id'])
            
            # Limpiar caché
            del self.assignment_cache[booking_id]
    
    async def auto_assign_guides_to_booking(
        self,
        booking_id: str,
        booking_details: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Asignación automática de guías basada en disponibilidad y matching
        """
        logger.info(f"Starting auto-assignment for booking {booking_id}")
        
        assignments = []
        itinerary_days = booking_details.get('itinerary_days', [])
        group_profile = booking_details.get('group_profile', {})
        
        for day in itinerary_days:
            if not day.get('guide_required', False):
                continue
            
            # Preparar criterios de búsqueda
            search_criteria = {
                'date': day.get('date'),
                'languages': group_profile.get('languages', ['es']),
                'specializations': day.get('specializations', []),
                'location': day.get('location'),
                'group_size': booking_details.get('passenger_count', 1),
                'guide_category': day.get('guide_type', GuideCategory.TOUR_LEADER.value),
                'budget_per_day': group_profile.get('budget_per_guide', 150)
            }
            
            # Buscar guías disponibles
            available_guides = await self._search_available_guides(search_criteria)
            
            if not available_guides:
                # Notificar falta de disponibilidad
                await self._notify_no_guide_available(
                    booking_id,
                    day,
                    search_criteria
                )
                continue
            
            # Seleccionar mejor guía usando scoring
            best_guide = await self._select_best_guide(
                available_guides,
                search_criteria,
                group_profile
            )
            
            if best_guide['total_score'] < self.thresholds['min_total_score']:
                logger.warning(
                    f"Best guide score {best_guide['total_score']} below threshold "
                    f"for day {day['day_number']}"
                )
                continue
            
            # Crear asignación
            assignment = await self._create_guide_assignment(
                booking_id,
                best_guide,
                day,
                group_profile
            )
            
            assignments.append(assignment)
            
            # Publicar evento de asignación individual
            await self.event_bus.publish(
                EventType.GUIDE_ASSIGNED,
                {
                    'booking_id': booking_id,
                    'guide_id': best_guide['guide_id'],
                    'assignment_id': assignment['assignment_id'],
                    'day': day['day_number'],
                    'date': day.get('date'),
                    'score': best_guide['total_score']
                },
                EventMetadata(
                    correlation_id=booking_id,
                    service_name='guide_booking_integration'
                )
            )
        
        # Guardar en caché
        self.assignment_cache[booking_id] = {
            'booking_id': booking_id,
            'assignments': assignments,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return assignments
    
    async def _search_available_guides(
        self,
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Buscar guías disponibles según criterios
        """
        # Simulación de búsqueda
        # En producción esto consultaría la base de datos real
        
        available_guides = []
        
        # Datos de ejemplo
        sample_guides = [
            {
                'guide_id': f'GID-{uuid.uuid4().hex[:8]}',
                'name': 'Carlos Mendoza',
                'category': GuideCategory.LICENSED.value,
                'languages': ['es', 'en', 'pt'],
                'specializations': ['history', 'archaeology', 'culture'],
                'years_experience': 8,
                'rating': 4.8,
                'reviews_count': 245,
                'daily_rate': 150.00,
                'availability': True,
                'location': criteria.get('location', 'Lima'),
                'certifications': ['Official Tourism Guide', 'First Aid'],
                'has_vehicle': False,
                'max_group_size': 30
            },
            {
                'guide_id': f'GID-{uuid.uuid4().hex[:8]}',
                'name': 'Ana Rodriguez',
                'category': GuideCategory.TOUR_LEADER.value,
                'languages': ['es', 'en'],
                'specializations': ['adventure', 'nature', 'trekking'],
                'years_experience': 5,
                'rating': 4.6,
                'reviews_count': 156,
                'daily_rate': 120.00,
                'availability': True,
                'location': criteria.get('location', 'Lima'),
                'certifications': ['Tour Leader Certificate'],
                'has_vehicle': True,
                'max_group_size': 20
            },
            {
                'guide_id': f'GID-{uuid.uuid4().hex[:8]}',
                'name': 'Miguel Torres',
                'category': GuideCategory.LOCAL.value,
                'languages': ['es'],
                'specializations': ['gastronomy', 'local_culture'],
                'years_experience': 3,
                'rating': 4.4,
                'reviews_count': 89,
                'daily_rate': 80.00,
                'availability': True,
                'location': criteria.get('location', 'Lima'),
                'certifications': [],
                'has_vehicle': False,
                'max_group_size': 15
            }
        ]
        
        # Filtrar por disponibilidad y requisitos básicos
        for guide in sample_guides:
            # Verificar categoría
            if criteria.get('guide_category') and guide['category'] != criteria.get('guide_category'):
                continue
            
            # Verificar idiomas (al menos uno debe coincidir)
            required_langs = set(criteria.get('languages', ['es']))
            guide_langs = set(guide['languages'])
            if not required_langs.intersection(guide_langs):
                continue
            
            # Verificar capacidad de grupo
            if guide['max_group_size'] < criteria.get('group_size', 1):
                continue
            
            # Verificar presupuesto
            if guide['daily_rate'] > criteria.get('budget_per_day', float('inf')) * 1.3:
                continue
            
            available_guides.append(guide)
        
        return available_guides
    
    async def _select_best_guide(
        self,
        guides: List[Dict[str, Any]],
        criteria: Dict[str, Any],
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Seleccionar el mejor guía basado en scoring multifactorial
        """
        scored_guides = []
        
        for guide in guides:
            # Calcular score para cada factor
            scores = {}
            
            # 1. Score por rating (0-100)
            scores['rating'] = (guide['rating'] / 5.0) * 100
            
            # 2. Score por experiencia (0-100)
            max_experience = 15  # Consideramos 15 años como máximo
            scores['experience'] = min(guide['years_experience'] / max_experience, 1.0) * 100
            
            # 3. Score por match de idiomas (0-100)
            required_langs = set(criteria.get('languages', ['es']))
            guide_langs = set(guide['languages'])
            common_langs = required_langs.intersection(guide_langs)
            scores['language'] = (len(common_langs) / len(required_langs)) * 100
            
            # 4. Score por especialización (0-100)
            required_specs = set(criteria.get('specializations', []))
            guide_specs = set(guide.get('specializations', []))
            if required_specs:
                common_specs = required_specs.intersection(guide_specs)
                scores['specialization'] = (len(common_specs) / len(required_specs)) * 100
            else:
                scores['specialization'] = 50  # Neutral si no hay requerimientos
            
            # 5. Score por disponibilidad (0-100)
            # Consideramos factores como ubicación, vehículo propio, etc.
            availability_score = 70  # Base
            if guide.get('location') == criteria.get('location'):
                availability_score += 20
            if guide.get('has_vehicle') and criteria.get('group_size', 0) <= 4:
                availability_score += 10
            scores['availability'] = min(availability_score, 100)
            
            # 6. Score por precio (0-100)
            # Invertido: menor precio = mayor score
            budget = criteria.get('budget_per_day', 150)
            if guide['daily_rate'] <= budget:
                price_ratio = guide['daily_rate'] / budget
                scores['price'] = (1 - price_ratio) * 100
            else:
                # Penalización por estar sobre presupuesto
                overage = (guide['daily_rate'] - budget) / budget
                scores['price'] = max(0, 100 - (overage * 200))
            
            # Calcular score total ponderado
            total_score = 0
            for factor, weight_key in [
                ('rating', 'rating_weight'),
                ('experience', 'experience_weight'),
                ('language', 'language_weight'),
                ('specialization', 'specialization_weight'),
                ('availability', 'availability_weight'),
                ('price', 'price_weight')
            ]:
                weight = self.scoring_config[weight_key]
                total_score += scores[factor] * weight
            
            # Agregar información de scoring al guía
            guide_with_score = {
                **guide,
                'scores': scores,
                'total_score': total_score
            }
            
            scored_guides.append(guide_with_score)
        
        # Ordenar por score total
        scored_guides.sort(key=lambda x: x['total_score'], reverse=True)
        
        # Retornar el mejor
        best_guide = scored_guides[0] if scored_guides else None
        
        if best_guide:
            logger.info(
                f"Selected guide {best_guide['name']} with score {best_guide['total_score']:.2f}"
            )
            logger.debug(f"Score breakdown: {best_guide['scores']}")
        
        return best_guide
    
    async def _create_guide_assignment(
        self,
        booking_id: str,
        guide: Dict[str, Any],
        day: Dict[str, Any],
        group_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crear asignación de guía
        """
        assignment_id = f'ASSIGN-{uuid.uuid4().hex[:8]}'
        
        assignment = {
            'assignment_id': assignment_id,
            'booking_id': booking_id,
            'guide_id': guide['guide_id'],
            'guide_name': guide['name'],
            'guide_category': guide['category'],
            'day_number': day.get('day_number'),
            'assignment_date': day.get('date'),
            'start_time': day.get('start_time', '08:00'),
            'end_time': day.get('end_time', '18:00'),
            'location': day.get('location'),
            'languages_required': group_profile.get('languages', ['es']),
            'group_size': group_profile.get('total_passengers', 1),
            'daily_rate': guide['daily_rate'],
            'special_requirements': day.get('special_requirements', []),
            'status': AssignmentStatus.PROPOSED.value,
            'created_at': datetime.utcnow().isoformat(),
            'score': guide['total_score'],
            'score_breakdown': guide['scores']
        }
        
        # Si el servicio de guías está disponible, crear asignación real
        if self.guide_service:
            try:
                db_assignment = await self.guide_service.assign_guide_to_itinerary({
                    'guide_id': guide['guide_id'],
                    'itinerary_id': booking_id,
                    'assignment_date': day.get('date'),
                    'daily_rate': guide['daily_rate'],
                    'notes': f"Auto-assigned with score {guide['total_score']:.2f}"
                })
                assignment['db_id'] = db_assignment.get('id')
            except Exception as e:
                logger.error(f"Failed to create DB assignment: {str(e)}")
        
        return assignment
    
    async def _notify_no_guide_available(
        self,
        booking_id: str,
        day: Dict[str, Any],
        criteria: Dict[str, Any]
    ):
        """
        Notificar cuando no hay guías disponibles
        """
        await self.event_bus.publish(
            EventType.GUIDE_UNAVAILABLE,
            {
                'booking_id': booking_id,
                'day': day.get('day_number'),
                'date': day.get('date'),
                'criteria': criteria,
                'message': 'No guides available matching criteria',
                'timestamp': datetime.utcnow().isoformat()
            },
            EventMetadata(
                correlation_id=booking_id,
                service_name='guide_booking_integration'
            )
        )
    
    async def find_replacement_guide(
        self,
        assignment_id: str,
        booking_id: str,
        excluded_guides: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Buscar guía de reemplazo excluyendo ciertos guías
        """
        # Obtener detalles de la asignación original
        if booking_id not in self.assignment_cache:
            return None
        
        cache_data = self.assignment_cache[booking_id]
        original_assignment = None
        
        for assignment in cache_data.get('assignments', []):
            if assignment['assignment_id'] == assignment_id:
                original_assignment = assignment
                break
        
        if not original_assignment:
            return None
        
        # Buscar guías disponibles excluyendo los que ya fallaron
        criteria = {
            'date': original_assignment['assignment_date'],
            'languages': original_assignment['languages_required'],
            'location': original_assignment.get('location'),
            'group_size': original_assignment['group_size'],
            'guide_category': original_assignment['guide_category']
        }
        
        available_guides = await self._search_available_guides(criteria)
        
        # Filtrar guías excluidos
        available_guides = [
            g for g in available_guides 
            if g['guide_id'] not in excluded_guides
        ]
        
        if not available_guides:
            return None
        
        # Seleccionar el mejor reemplazo
        replacement = await self._select_best_guide(
            available_guides,
            criteria,
            {'languages': original_assignment['languages_required']}
        )
        
        return replacement
    
    async def release_guide_assignment(
        self,
        assignment_id: str
    ) -> bool:
        """
        Liberar una asignación de guía
        """
        logger.info(f"Releasing guide assignment {assignment_id}")
        
        # Buscar asignación en caché
        for booking_id, cache_data in self.assignment_cache.items():
            for assignment in cache_data.get('assignments', []):
                if assignment['assignment_id'] == assignment_id:
                    assignment['status'] = AssignmentStatus.CANCELLED.value
                    
                    # Publicar evento de liberación
                    await self.event_bus.publish(
                        EventType.GUIDE_DECLINED,
                        {
                            'assignment_id': assignment_id,
                            'guide_id': assignment['guide_id'],
                            'booking_id': booking_id,
                            'reason': 'Booking cancelled',
                            'timestamp': datetime.utcnow().isoformat()
                        },
                        EventMetadata(
                            correlation_id=booking_id,
                            service_name='guide_booking_integration'
                        )
                    )
                    
                    return True
        
        return False
    
    async def confirm_guide_assignment(
        self,
        assignment_id: str,
        guide_response: Dict[str, Any]
    ) -> bool:
        """
        Confirmar asignación cuando el guía acepta
        """
        # Buscar asignación
        for booking_id, cache_data in self.assignment_cache.items():
            for assignment in cache_data.get('assignments', []):
                if assignment['assignment_id'] == assignment_id:
                    
                    if guide_response.get('accepted'):
                        assignment['status'] = AssignmentStatus.CONFIRMED.value
                        assignment['confirmed_at'] = datetime.utcnow().isoformat()
                        
                        # Publicar evento de confirmación
                        await self.event_bus.publish(
                            EventType.GUIDE_CONFIRMED,
                            {
                                'assignment_id': assignment_id,
                                'guide_id': assignment['guide_id'],
                                'booking_id': booking_id,
                                'timestamp': datetime.utcnow().isoformat()
                            },
                            EventMetadata(
                                correlation_id=booking_id,
                                service_name='guide_booking_integration'
                            )
                        )
                        
                        return True
                    else:
                        # Guía rechazó, buscar reemplazo
                        assignment['status'] = AssignmentStatus.DECLINED.value
                        
                        replacement = await self.find_replacement_guide(
                            assignment_id,
                            booking_id,
                            [assignment['guide_id']]
                        )
                        
                        if replacement:
                            # Actualizar asignación con nuevo guía
                            assignment['guide_id'] = replacement['guide_id']
                            assignment['guide_name'] = replacement['name']
                            assignment['status'] = AssignmentStatus.PROPOSED.value
                            assignment['replacement'] = True
                        
                        return False
        
        return False
    
    async def get_assignment_status(
        self,
        booking_id: str
    ) -> Dict[str, Any]:
        """
        Obtener estado de asignaciones para una reserva
        """
        if booking_id not in self.assignment_cache:
            return {
                'status': 'not_found',
                'booking_id': booking_id
            }
        
        cache_data = self.assignment_cache[booking_id]
        assignments = cache_data.get('assignments', [])
        
        # Calcular estadísticas
        total = len(assignments)
        confirmed = sum(1 for a in assignments if a['status'] == AssignmentStatus.CONFIRMED.value)
        pending = sum(1 for a in assignments if a['status'] == AssignmentStatus.PROPOSED.value)
        declined = sum(1 for a in assignments if a['status'] == AssignmentStatus.DECLINED.value)
        
        return {
            'status': 'success',
            'booking_id': booking_id,
            'total_assignments': total,
            'confirmed': confirmed,
            'pending': pending,
            'declined': declined,
            'completion_rate': (confirmed / total * 100) if total > 0 else 0,
            'assignments': assignments
        }
    
    async def optimize_guide_assignments(
        self,
        booking_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Optimizar asignaciones de guías para múltiples reservas
        Minimiza costos y maximiza eficiencia
        """
        logger.info(f"Optimizing guide assignments for {len(booking_ids)} bookings")
        
        # Recopilar todas las necesidades
        all_requirements = []
        for booking_id in booking_ids:
            if booking_id in self.assignment_cache:
                requirements = self.assignment_cache[booking_id]
                all_requirements.extend(requirements.get('assignments', []))
        
        # Agrupar por fecha y ubicación
        grouped = {}
        for req in all_requirements:
            key = f"{req['assignment_date']}_{req.get('location', 'default')}"
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(req)
        
        # Optimización: asignar el mismo guía a múltiples grupos si es posible
        optimizations = []
        for key, requirements in grouped.items():
            if len(requirements) > 1:
                # Ver si podemos consolidar
                total_passengers = sum(r['group_size'] for r in requirements)
                common_languages = set(requirements[0]['languages_required'])
                
                for req in requirements[1:]:
                    common_languages = common_languages.intersection(set(req['languages_required']))
                
                if common_languages and total_passengers <= 50:  # Límite máximo de grupo
                    optimizations.append({
                        'type': 'consolidation',
                        'date_location': key,
                        'bookings_affected': [r['booking_id'] for r in requirements],
                        'potential_savings': sum(r['daily_rate'] for r in requirements[1:])
                    })
        
        return {
            'total_assignments': len(all_requirements),
            'optimization_opportunities': len(optimizations),
            'optimizations': optimizations,
            'potential_total_savings': sum(o['potential_savings'] for o in optimizations)
        }


# Singleton global
_guide_integration: Optional[GuideBookingIntegration] = None


async def get_guide_booking_integration(db_session=None) -> GuideBookingIntegration:
    """
    Obtener instancia singleton del servicio de integración
    """
    global _guide_integration
    
    if _guide_integration is None:
        _guide_integration = GuideBookingIntegration(db_session)
        await _guide_integration.initialize()
    
    return _guide_integration