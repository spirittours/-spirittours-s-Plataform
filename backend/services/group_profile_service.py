"""
Group Profile and Itinerary Customization Service
Manages detailed group information for personalized quotations
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import logging
from enum import Enum
import uuid
import json

from backend.core.cache import cache_manager
from backend.core.exceptions import BusinessLogicError
from backend.services.ai_service import AIService

logger = logging.getLogger(__name__)


class GroupProfile(Enum):
    """Perfiles detallados de grupos"""
    STUDENTS_PRIMARY = "STUDENTS_PRIMARY"           # Estudiantes primaria
    STUDENTS_SECONDARY = "STUDENTS_SECONDARY"       # Estudiantes secundaria
    STUDENTS_UNIVERSITY = "STUDENTS_UNIVERSITY"     # Universitarios
    CORPORATE_TEAM = "CORPORATE_TEAM"               # Equipo corporativo
    CORPORATE_EXECUTIVES = "CORPORATE_EXECUTIVES"   # Ejecutivos
    RELIGIOUS_PILGRIMAGE = "RELIGIOUS_PILGRIMAGE"   # Peregrinación religiosa
    RELIGIOUS_YOUTH = "RELIGIOUS_YOUTH"             # Grupo juvenil religioso
    SENIOR_ACTIVE = "SENIOR_ACTIVE"                 # Tercera edad activa
    SENIOR_ASSISTED = "SENIOR_ASSISTED"             # Tercera edad con asistencia
    FAMILY_MULTI_GEN = "FAMILY_MULTI_GEN"          # Familia multigeneracional
    FAMILY_WITH_KIDS = "FAMILY_WITH_KIDS"          # Familia con niños
    ADVENTURE_EXTREME = "ADVENTURE_EXTREME"         # Aventura extrema
    ADVENTURE_SOFT = "ADVENTURE_SOFT"               # Aventura suave
    CULTURAL_INTENSIVE = "CULTURAL_INTENSIVE"       # Cultural intensivo
    HONEYMOON = "HONEYMOON"                        # Luna de miel
    SPECIAL_NEEDS = "SPECIAL_NEEDS"                # Necesidades especiales
    PHOTOGRAPHERS = "PHOTOGRAPHERS"                 # Fotógrafos
    RESEARCHERS = "RESEARCHERS"                     # Investigadores


class DietaryRequirement(Enum):
    """Requisitos dietéticos"""
    VEGETARIAN = "VEGETARIAN"
    VEGAN = "VEGAN"
    HALAL = "HALAL"
    KOSHER = "KOSHER"
    GLUTEN_FREE = "GLUTEN_FREE"
    DIABETIC = "DIABETIC"
    ALLERGIES = "ALLERGIES"
    NO_RESTRICTIONS = "NO_RESTRICTIONS"


class AccessibilityNeed(Enum):
    """Necesidades de accesibilidad"""
    WHEELCHAIR = "WHEELCHAIR"
    MOBILITY_AID = "MOBILITY_AID"
    VISUAL_IMPAIRED = "VISUAL_IMPAIRED"
    HEARING_IMPAIRED = "HEARING_IMPAIRED"
    COGNITIVE = "COGNITIVE"
    ELDERLY_ASSISTANCE = "ELDERLY_ASSISTANCE"
    NONE = "NONE"


class InterestCategory(Enum):
    """Categorías de interés"""
    HISTORY = "HISTORY"
    ARCHAEOLOGY = "ARCHAEOLOGY"
    NATURE = "NATURE"
    WILDLIFE = "WILDLIFE"
    ADVENTURE = "ADVENTURE"
    CULTURE = "CULTURE"
    GASTRONOMY = "GASTRONOMY"
    PHOTOGRAPHY = "PHOTOGRAPHY"
    RELAXATION = "RELAXATION"
    SHOPPING = "SHOPPING"
    NIGHTLIFE = "NIGHTLIFE"
    SPORTS = "SPORTS"
    WELLNESS = "WELLNESS"
    EDUCATION = "EDUCATION"
    RELIGIOUS = "RELIGIOUS"
    ARTS = "ARTS"
    TECHNOLOGY = "TECHNOLOGY"
    AGRICULTURE = "AGRICULTURE"


class ItineraryType(Enum):
    """Tipos de itinerarios"""
    PREDEFINED = "PREDEFINED"        # Predefinido
    CUSTOMIZED = "CUSTOMIZED"        # Personalizado
    HYBRID = "HYBRID"               # Híbrido (base predefinida con modificaciones)
    AI_GENERATED = "AI_GENERATED"   # Generado por IA
    FLEXIBLE = "FLEXIBLE"           # Flexible con opciones diarias


class GroupProfileService:
    """
    Servicio para gestión de perfiles de grupo e itinerarios personalizados
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_service = AIService()
    
    # ==================== PERFIL DE GRUPO ====================
    
    async def create_group_profile(
        self,
        profile_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea un perfil detallado del grupo para personalización máxima
        """
        try:
            group_profile = {
                'id': f"GROUP-{uuid.uuid4().hex[:8].upper()}",
                'created_at': datetime.utcnow().isoformat(),
                
                # Información básica
                'group_name': profile_data.get('group_name', 'Grupo sin nombre'),
                'organization': profile_data.get('organization'),
                'group_type': profile_data.get('group_type', 'MIXED'),
                'profile_type': profile_data.get('profile_type', 'GENERAL'),
                
                # Composición del grupo
                'composition': {
                    'total_passengers': profile_data.get('total_passengers', 0),
                    'adults': profile_data.get('adults', 0),
                    'children': profile_data.get('children', 0),
                    'seniors': profile_data.get('seniors', 0),
                    'infants': profile_data.get('infants', 0),
                    'age_range': profile_data.get('age_range', {'min': 18, 'max': 65}),
                    'gender_distribution': profile_data.get('gender_distribution', {'male': 50, 'female': 50})
                },
                
                # Necesidades especiales
                'special_needs': {
                    'dietary_requirements': profile_data.get('dietary_requirements', []),
                    'accessibility_needs': profile_data.get('accessibility_needs', []),
                    'medical_conditions': profile_data.get('medical_conditions', []),
                    'allergies': profile_data.get('allergies', []),
                    'medications_required': profile_data.get('medications_required', []),
                    'emergency_contacts': profile_data.get('emergency_contacts', [])
                },
                
                # Preferencias e intereses
                'preferences': {
                    'interests': profile_data.get('interests', []),
                    'activity_level': profile_data.get('activity_level', 'MODERATE'),  # LOW, MODERATE, HIGH
                    'pace_preference': profile_data.get('pace_preference', 'RELAXED'),  # RELAXED, MODERATE, INTENSIVE
                    'cultural_sensitivity': profile_data.get('cultural_sensitivity', []),
                    'language_preferences': profile_data.get('languages', ['Spanish']),
                    'accommodation_preference': profile_data.get('accommodation_preference', 'STANDARD'),
                    'meal_preferences': profile_data.get('meal_preferences', []),
                    'transportation_comfort': profile_data.get('transportation_comfort', 'STANDARD')
                },
                
                # Presupuesto y expectativas
                'budget': {
                    'total_budget': profile_data.get('total_budget'),
                    'per_person_budget': profile_data.get('per_person_budget'),
                    'budget_flexibility': profile_data.get('budget_flexibility', 'MODERATE'),
                    'payment_preferences': profile_data.get('payment_preferences', []),
                    'includes_tips': profile_data.get('includes_tips', False),
                    'includes_extras': profile_data.get('includes_extras', False)
                },
                
                # Historial y experiencia
                'experience': {
                    'travel_frequency': profile_data.get('travel_frequency', 'OCCASIONAL'),
                    'previous_destinations': profile_data.get('previous_destinations', []),
                    'preferred_tour_style': profile_data.get('tour_style', 'GUIDED'),
                    'repeat_customer': profile_data.get('repeat_customer', False),
                    'referral_source': profile_data.get('referral_source')
                },
                
                # Requisitos específicos
                'specific_requirements': {
                    'must_see_attractions': profile_data.get('must_see_attractions', []),
                    'avoid_attractions': profile_data.get('avoid_attractions', []),
                    'preferred_dates': profile_data.get('preferred_dates', []),
                    'blackout_dates': profile_data.get('blackout_dates', []),
                    'celebration_occasions': profile_data.get('celebrations', []),
                    'photography_needs': profile_data.get('photography_needs', False),
                    'wifi_required': profile_data.get('wifi_required', False),
                    'insurance_required': profile_data.get('insurance_required', True)
                },
                
                # Contacto principal
                'main_contact': {
                    'name': profile_data.get('contact_name'),
                    'phone': profile_data.get('contact_phone'),
                    'email': profile_data.get('contact_email'),
                    'preferred_communication': profile_data.get('preferred_communication', 'EMAIL'),
                    'best_time_to_contact': profile_data.get('best_contact_time'),
                    'language': profile_data.get('contact_language', 'Spanish')
                },
                
                # Notas adicionales
                'additional_notes': profile_data.get('notes', ''),
                'internal_notes': profile_data.get('internal_notes', ''),
                
                # Scoring y priorización
                'scoring': self._calculate_group_score(profile_data)
            }
            
            # Guardar en caché para acceso rápido
            await cache_manager.set(
                f"group_profile:{group_profile['id']}", 
                group_profile, 
                ttl=3600
            )
            
            logger.info(f"Group profile created: {group_profile['id']}")
            
            return {
                'success': True,
                'group_profile': group_profile,
                'recommendations': await self._generate_recommendations(group_profile)
            }
            
        except Exception as e:
            logger.error(f"Error creating group profile: {str(e)}")
            raise BusinessLogicError(f"Error creando perfil: {str(e)}")
    
    def _calculate_group_score(self, profile_data: Dict) -> Dict[str, Any]:
        """
        Calcula puntuación y prioridad del grupo
        """
        score = 0
        factors = []
        
        # Factor por tamaño del grupo
        passengers = profile_data.get('total_passengers', 0)
        if passengers >= 40:
            score += 30
            factors.append('Grupo grande (40+)')
        elif passengers >= 20:
            score += 20
            factors.append('Grupo mediano (20-39)')
        elif passengers >= 10:
            score += 10
            factors.append('Grupo pequeño (10-19)')
        
        # Factor por presupuesto
        budget = profile_data.get('per_person_budget', 0)
        if budget >= 5000:
            score += 25
            factors.append('Presupuesto alto')
        elif budget >= 2000:
            score += 15
            factors.append('Presupuesto medio')
        
        # Factor por cliente recurrente
        if profile_data.get('repeat_customer'):
            score += 20
            factors.append('Cliente recurrente')
        
        # Factor por necesidades especiales (requiere más atención)
        if profile_data.get('accessibility_needs'):
            score += 10
            factors.append('Necesidades especiales')
        
        # Determinar prioridad
        if score >= 60:
            priority = 'HIGH'
        elif score >= 30:
            priority = 'MEDIUM'
        else:
            priority = 'LOW'
        
        return {
            'total_score': score,
            'priority': priority,
            'factors': factors
        }
    
    async def _generate_recommendations(self, group_profile: Dict) -> List[Dict]:
        """
        Genera recomendaciones basadas en el perfil del grupo
        """
        recommendations = []
        
        # Recomendaciones por tipo de grupo
        profile_type = group_profile.get('profile_type')
        
        if 'STUDENTS' in profile_type:
            recommendations.append({
                'category': 'Educativo',
                'suggestion': 'Incluir componentes educativos y actividades interactivas',
                'priority': 'HIGH'
            })
            recommendations.append({
                'category': 'Seguridad',
                'suggestion': 'Asignar guías adicionales para supervisión',
                'priority': 'HIGH'
            })
        
        if 'SENIOR' in profile_type:
            recommendations.append({
                'category': 'Ritmo',
                'suggestion': 'Planificar itinerario con ritmo relajado y descansos frecuentes',
                'priority': 'HIGH'
            })
            recommendations.append({
                'category': 'Accesibilidad',
                'suggestion': 'Verificar accesibilidad en todos los sitios',
                'priority': 'HIGH'
            })
        
        # Recomendaciones por intereses
        interests = group_profile.get('preferences', {}).get('interests', [])
        
        if 'PHOTOGRAPHY' in interests:
            recommendations.append({
                'category': 'Horarios',
                'suggestion': 'Programar visitas en horas doradas para fotografía',
                'priority': 'MEDIUM'
            })
        
        if 'GASTRONOMY' in interests:
            recommendations.append({
                'category': 'Experiencias',
                'suggestion': 'Incluir experiencias gastronómicas y restaurantes locales',
                'priority': 'MEDIUM'
            })
        
        # Recomendaciones por necesidades especiales
        special_needs = group_profile.get('special_needs', {})
        
        if special_needs.get('dietary_requirements'):
            recommendations.append({
                'category': 'Alimentación',
                'suggestion': 'Coordinar menús especiales con anticipación',
                'priority': 'HIGH'
            })
        
        if special_needs.get('accessibility_needs'):
            recommendations.append({
                'category': 'Transporte',
                'suggestion': 'Asegurar vehículos con accesibilidad adecuada',
                'priority': 'HIGH'
            })
        
        return recommendations
    
    # ==================== ITINERARIOS PERSONALIZADOS ====================
    
    async def generate_personalized_itinerary(
        self,
        group_profile_id: str,
        trip_duration: int,
        destination: str,
        itinerary_type: str = 'HYBRID'
    ) -> Dict[str, Any]:
        """
        Genera un itinerario personalizado basado en el perfil del grupo
        """
        try:
            # Obtener perfil del grupo
            group_profile = await cache_manager.get(f"group_profile:{group_profile_id}")
            if not group_profile:
                raise BusinessLogicError("Perfil de grupo no encontrado")
            
            # Generar itinerario según tipo
            if itinerary_type == 'AI_GENERATED':
                itinerary = await self._generate_ai_itinerary(group_profile, trip_duration, destination)
            elif itinerary_type == 'PREDEFINED':
                itinerary = await self._get_predefined_itinerary(destination, trip_duration, group_profile)
            elif itinerary_type == 'HYBRID':
                itinerary = await self._generate_hybrid_itinerary(group_profile, trip_duration, destination)
            else:
                itinerary = await self._generate_custom_itinerary(group_profile, trip_duration, destination)
            
            # Optimizar itinerario
            optimized_itinerary = await self._optimize_itinerary(itinerary, group_profile)
            
            # Calcular costos estimados
            cost_estimate = await self._estimate_itinerary_cost(optimized_itinerary, group_profile)
            
            return {
                'success': True,
                'itinerary_id': f"ITIN-{uuid.uuid4().hex[:8].upper()}",
                'group_profile_id': group_profile_id,
                'type': itinerary_type,
                'duration_days': trip_duration,
                'destination': destination,
                'itinerary': optimized_itinerary,
                'cost_estimate': cost_estimate,
                'customization_level': self._calculate_customization_level(itinerary_type),
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating itinerary: {str(e)}")
            raise BusinessLogicError(f"Error generando itinerario: {str(e)}")
    
    async def _generate_ai_itinerary(
        self,
        group_profile: Dict,
        duration: int,
        destination: str
    ) -> Dict[str, Any]:
        """
        Genera itinerario usando IA basado en el perfil del grupo
        """
        # Preparar prompt para IA
        prompt = f"""
        Genera un itinerario de {duration} días para {destination} considerando:
        - Tipo de grupo: {group_profile.get('profile_type')}
        - Tamaño: {group_profile.get('composition', {}).get('total_passengers')} personas
        - Intereses: {', '.join(group_profile.get('preferences', {}).get('interests', []))}
        - Nivel de actividad: {group_profile.get('preferences', {}).get('activity_level')}
        - Necesidades especiales: {group_profile.get('special_needs', {})}
        
        Incluir:
        1. Actividades principales por día
        2. Tiempos de traslado
        3. Recomendaciones de restaurantes
        4. Alternativas en caso de mal clima
        """
        
        # Llamar servicio de IA
        ai_response = await self.ai_service.generate_itinerary(prompt)
        
        # Procesar y estructurar respuesta
        itinerary_days = []
        for day_num in range(1, duration + 1):
            day_plan = {
                'day': day_num,
                'title': f"Día {day_num} - {ai_response.get(f'day_{day_num}_title', '')}",
                'activities': ai_response.get(f'day_{day_num}_activities', []),
                'meals': ai_response.get(f'day_{day_num}_meals', {}),
                'accommodation': ai_response.get(f'day_{day_num}_accommodation', ''),
                'transportation': ai_response.get(f'day_{day_num}_transport', ''),
                'notes': ai_response.get(f'day_{day_num}_notes', ''),
                'alternatives': ai_response.get(f'day_{day_num}_alternatives', [])
            }
            itinerary_days.append(day_plan)
        
        return {
            'days': itinerary_days,
            'highlights': ai_response.get('highlights', []),
            'included_services': ai_response.get('included', []),
            'not_included': ai_response.get('not_included', []),
            'important_notes': ai_response.get('notes', [])
        }
    
    async def _get_predefined_itinerary(
        self,
        destination: str,
        duration: int,
        group_profile: Dict
    ) -> Dict[str, Any]:
        """
        Obtiene un itinerario predefinido y lo ajusta al grupo
        """
        # TODO: Implementar búsqueda en base de datos de itinerarios predefinidos
        
        # Por ahora, retornar estructura ejemplo
        return {
            'days': [
                {
                    'day': i,
                    'title': f"Día {i} - {destination}",
                    'activities': ['Actividad 1', 'Actividad 2', 'Actividad 3'],
                    'meals': {'breakfast': 'Hotel', 'lunch': 'Restaurant local', 'dinner': 'Hotel'},
                    'accommodation': 'Hotel estándar',
                    'transportation': 'Bus turístico',
                    'notes': 'Itinerario estándar'
                }
                for i in range(1, duration + 1)
            ],
            'highlights': ['Sitios principales', 'Experiencias culturales'],
            'included_services': ['Transporte', 'Guía', 'Entradas'],
            'not_included': ['Propinas', 'Gastos personales']
        }
    
    async def _generate_hybrid_itinerary(
        self,
        group_profile: Dict,
        duration: int,
        destination: str
    ) -> Dict[str, Any]:
        """
        Genera itinerario híbrido (base predefinida + personalización)
        """
        # Obtener base predefinida
        base_itinerary = await self._get_predefined_itinerary(destination, duration, group_profile)
        
        # Personalizar según perfil
        interests = group_profile.get('preferences', {}).get('interests', [])
        special_needs = group_profile.get('special_needs', {})
        
        # Ajustar actividades según intereses
        for day in base_itinerary['days']:
            # Añadir actividades según intereses
            if 'PHOTOGRAPHY' in interests:
                day['activities'].append('Sesión fotográfica en punto panorámico')
            if 'GASTRONOMY' in interests:
                day['activities'].append('Experiencia gastronómica local')
            
            # Ajustar según necesidades especiales
            if special_needs.get('accessibility_needs'):
                day['notes'] = day.get('notes', '') + ' - Rutas accesibles verificadas'
        
        return base_itinerary
    
    async def _generate_custom_itinerary(
        self,
        group_profile: Dict,
        duration: int,
        destination: str
    ) -> Dict[str, Any]:
        """
        Genera itinerario completamente personalizado
        """
        itinerary_days = []
        
        # Obtener lugares de interés según perfil
        interests = group_profile.get('preferences', {}).get('interests', [])
        must_see = group_profile.get('specific_requirements', {}).get('must_see_attractions', [])
        avoid = group_profile.get('specific_requirements', {}).get('avoid_attractions', [])
        
        for day_num in range(1, duration + 1):
            # Crear plan del día personalizado
            day_plan = {
                'day': day_num,
                'title': f"Día {day_num} - Experiencia personalizada",
                'activities': [],
                'meals': {},
                'accommodation': '',
                'transportation': '',
                'notes': '',
                'customized': True
            }
            
            # Añadir actividades según intereses y requisitos
            # TODO: Implementar lógica de selección de actividades
            
            itinerary_days.append(day_plan)
        
        return {
            'days': itinerary_days,
            'fully_customized': True,
            'customization_notes': 'Itinerario creado específicamente para el grupo'
        }
    
    async def _optimize_itinerary(
        self,
        itinerary: Dict,
        group_profile: Dict
    ) -> Dict[str, Any]:
        """
        Optimiza el itinerario para eficiencia y satisfacción
        """
        optimized = itinerary.copy()
        
        # Optimizar rutas para minimizar traslados
        # TODO: Implementar algoritmo de optimización de rutas
        
        # Ajustar tiempos según ritmo del grupo
        pace = group_profile.get('preferences', {}).get('pace_preference', 'MODERATE')
        if pace == 'RELAXED':
            # Añadir más tiempo entre actividades
            for day in optimized['days']:
                day['notes'] = day.get('notes', '') + ' - Ritmo relajado con pausas adicionales'
        elif pace == 'INTENSIVE':
            # Maximizar actividades
            for day in optimized['days']:
                day['notes'] = day.get('notes', '') + ' - Día completo de actividades'
        
        # Verificar conflictos y restricciones
        # TODO: Implementar validación de conflictos
        
        return optimized
    
    async def _estimate_itinerary_cost(
        self,
        itinerary: Dict,
        group_profile: Dict
    ) -> Dict[str, float]:
        """
        Estima costos del itinerario
        """
        passengers = group_profile.get('composition', {}).get('total_passengers', 1)
        
        # Estimaciones base (estos valores deberían venir de base de datos)
        cost_per_day = 150  # USD por persona por día
        
        # Ajustar según tipo de grupo y preferencias
        accommodation_level = group_profile.get('preferences', {}).get('accommodation_preference', 'STANDARD')
        if accommodation_level == 'LUXURY':
            cost_per_day *= 2
        elif accommodation_level == 'BUDGET':
            cost_per_day *= 0.7
        
        duration = len(itinerary.get('days', []))
        
        return {
            'estimated_per_person': cost_per_day * duration,
            'estimated_total': cost_per_day * duration * passengers,
            'breakdown': {
                'accommodation': cost_per_day * 0.4 * duration,
                'meals': cost_per_day * 0.2 * duration,
                'transportation': cost_per_day * 0.2 * duration,
                'activities': cost_per_day * 0.15 * duration,
                'guides': cost_per_day * 0.05 * duration
            }
        }
    
    def _calculate_customization_level(self, itinerary_type: str) -> str:
        """
        Calcula el nivel de personalización
        """
        levels = {
            'PREDEFINED': 'BASIC',
            'HYBRID': 'MEDIUM',
            'CUSTOMIZED': 'HIGH',
            'AI_GENERATED': 'ADVANCED',
            'FLEXIBLE': 'MODERATE'
        }
        return levels.get(itinerary_type, 'UNKNOWN')
    
    # ==================== ANÁLISIS Y REPORTES ====================
    
    async def analyze_group_trends(self) -> Dict[str, Any]:
        """
        Analiza tendencias en perfiles de grupos
        """
        try:
            # TODO: Implementar análisis de base de datos
            
            return {
                'success': True,
                'trends': {
                    'most_common_type': 'FAMILY_WITH_KIDS',
                    'average_group_size': 22,
                    'popular_interests': ['CULTURE', 'GASTRONOMY', 'NATURE'],
                    'common_special_needs': ['VEGETARIAN', 'WHEELCHAIR'],
                    'average_budget_per_person': 2500,
                    'peak_travel_months': ['March', 'July', 'December']
                },
                'recommendations': [
                    'Desarrollar más itinerarios familiares',
                    'Mejorar accesibilidad en tours',
                    'Crear paquetes gastronómicos especializados'
                ]
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trends: {str(e)}")
            raise