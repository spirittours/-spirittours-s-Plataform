"""
Itinerary Management Service
Handles saved itineraries, custom creation, and client-provided itineraries
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import logging
from enum import Enum
import uuid
import json
from geopy.distance import geodesic
from geopy.geocoders import Nominatim

from backend.core.cache import cache_manager
from backend.core.exceptions import BusinessLogicError
from backend.services.ai_service import AIService
from backend.services.advanced_cost_calculation_service import AdvancedCostCalculationService

logger = logging.getLogger(__name__)


class ItinerarySource(Enum):
    """Fuente del itinerario"""
    SYSTEM_TEMPLATE = "SYSTEM_TEMPLATE"        # Plantilla guardada en el sistema
    CUSTOM_CREATED = "CUSTOM_CREATED"          # Creado personalizado
    CLIENT_PROVIDED = "CLIENT_PROVIDED"        # Proporcionado por el cliente
    POINTS_OF_INTEREST = "POINTS_OF_INTEREST"  # Basado en puntos de interés
    AI_GENERATED = "AI_GENERATED"              # Generado por IA
    HYBRID = "HYBRID"                          # Combinación de métodos


class ItineraryCategory(Enum):
    """Categorías de itinerarios"""
    CULTURAL = "CULTURAL"
    ADVENTURE = "ADVENTURE"
    NATURE = "NATURE"
    BEACH = "BEACH"
    CITY_TOUR = "CITY_TOUR"
    RELIGIOUS = "RELIGIOUS"
    GASTRONOMIC = "GASTRONOMIC"
    HISTORICAL = "HISTORICAL"
    WELLNESS = "WELLNESS"
    SHOPPING = "SHOPPING"
    EDUCATIONAL = "EDUCATIONAL"
    HONEYMOON = "HONEYMOON"
    FAMILY = "FAMILY"
    LUXURY = "LUXURY"
    BUDGET = "BUDGET"


class ItineraryStatus(Enum):
    """Estado del itinerario"""
    DRAFT = "DRAFT"                    # Borrador
    ACTIVE = "ACTIVE"                  # Activo y disponible
    ARCHIVED = "ARCHIVED"              # Archivado
    PENDING_REVIEW = "PENDING_REVIEW"  # Pendiente de revisión
    APPROVED = "APPROVED"              # Aprobado
    CLIENT_MODIFIED = "CLIENT_MODIFIED" # Modificado por el cliente


class ItineraryManagementService:
    """
    Servicio completo para gestión de itinerarios
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai_service = AIService()
        self.cost_service = AdvancedCostCalculationService(db)
        self.geolocator = Nominatim(user_agent="spirit_tours")
        
    # ==================== ITINERARIOS DEL SISTEMA ====================
    
    async def get_system_itineraries(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene itinerarios guardados en el sistema con filtros opcionales
        """
        try:
            # Query base
            query = """
                SELECT 
                    id,
                    name,
                    description,
                    category,
                    duration_days,
                    destination,
                    highlights,
                    difficulty_level,
                    best_season,
                    min_passengers,
                    max_passengers,
                    base_price_per_person,
                    popularity_score,
                    average_rating,
                    total_bookings,
                    tags,
                    images,
                    is_featured,
                    created_at,
                    updated_at
                FROM system_itineraries
                WHERE status = 'ACTIVE'
            """
            
            # Aplicar filtros
            conditions = []
            params = {}
            
            if filters:
                if 'category' in filters:
                    conditions.append("category = :category")
                    params['category'] = filters['category']
                
                if 'destination' in filters:
                    conditions.append("LOWER(destination) LIKE LOWER(:destination)")
                    params['destination'] = f"%{filters['destination']}%"
                
                if 'duration_min' in filters:
                    conditions.append("duration_days >= :duration_min")
                    params['duration_min'] = filters['duration_min']
                
                if 'duration_max' in filters:
                    conditions.append("duration_days <= :duration_max")
                    params['duration_max'] = filters['duration_max']
                
                if 'min_budget' in filters:
                    conditions.append("base_price_per_person >= :min_budget")
                    params['min_budget'] = filters['min_budget']
                
                if 'max_budget' in filters:
                    conditions.append("base_price_per_person <= :max_budget")
                    params['max_budget'] = filters['max_budget']
                
                if 'tags' in filters and filters['tags']:
                    # Buscar itinerarios que contengan cualquiera de los tags
                    tag_conditions = []
                    for i, tag in enumerate(filters['tags']):
                        tag_conditions.append(f":tag_{i} = ANY(tags)")
                        params[f'tag_{i}'] = tag
                    conditions.append(f"({' OR '.join(tag_conditions)})")
            
            if conditions:
                query += " AND " + " AND ".join(conditions)
            
            # Ordenamiento
            order_by = filters.get('order_by', 'popularity_score') if filters else 'popularity_score'
            order_dir = filters.get('order_dir', 'DESC') if filters else 'DESC'
            query += f" ORDER BY {order_by} {order_dir}"
            
            # Límite
            limit = filters.get('limit', 50) if filters else 50
            query += f" LIMIT {limit}"
            
            # Ejecutar query
            result = await self.db.execute(text(query), params)
            itineraries = result.fetchall()
            
            # Formatear respuesta
            formatted_itineraries = []
            for itin in itineraries:
                formatted = {
                    'id': itin.id,
                    'name': itin.name,
                    'description': itin.description,
                    'category': itin.category,
                    'duration_days': itin.duration_days,
                    'destination': itin.destination,
                    'highlights': json.loads(itin.highlights) if itin.highlights else [],
                    'difficulty_level': itin.difficulty_level,
                    'best_season': itin.best_season,
                    'passenger_range': {
                        'min': itin.min_passengers,
                        'max': itin.max_passengers
                    },
                    'base_price': float(itin.base_price_per_person),
                    'popularity_score': itin.popularity_score,
                    'rating': itin.average_rating,
                    'total_bookings': itin.total_bookings,
                    'tags': json.loads(itin.tags) if itin.tags else [],
                    'images': json.loads(itin.images) if itin.images else [],
                    'is_featured': itin.is_featured
                }
                
                # Obtener el detalle del itinerario si se solicita
                if filters and filters.get('include_details', False):
                    formatted['daily_plan'] = await self._get_itinerary_details(itin.id)
                
                formatted_itineraries.append(formatted)
            
            return formatted_itineraries
            
        except Exception as e:
            logger.error(f"Error getting system itineraries: {str(e)}")
            raise BusinessLogicError(f"Error obteniendo itinerarios: {str(e)}")
    
    async def _get_itinerary_details(self, itinerary_id: str) -> List[Dict[str, Any]]:
        """
        Obtiene el plan detallado día por día de un itinerario
        """
        try:
            query = """
                SELECT 
                    day_number,
                    title,
                    description,
                    activities,
                    locations,
                    meals_included,
                    accommodation_type,
                    transportation,
                    walking_distance,
                    driving_distance,
                    free_time_hours,
                    highlights,
                    optional_activities,
                    notes
                FROM itinerary_days
                WHERE itinerary_id = :itinerary_id
                ORDER BY day_number
            """
            
            result = await self.db.execute(
                text(query), 
                {'itinerary_id': itinerary_id}
            )
            days = result.fetchall()
            
            daily_plan = []
            for day in days:
                daily_plan.append({
                    'day': day.day_number,
                    'title': day.title,
                    'description': day.description,
                    'activities': json.loads(day.activities) if day.activities else [],
                    'locations': json.loads(day.locations) if day.locations else [],
                    'meals': json.loads(day.meals_included) if day.meals_included else {},
                    'accommodation': day.accommodation_type,
                    'transportation': day.transportation,
                    'distances': {
                        'walking': day.walking_distance,
                        'driving': day.driving_distance
                    },
                    'free_time': day.free_time_hours,
                    'highlights': json.loads(day.highlights) if day.highlights else [],
                    'optional': json.loads(day.optional_activities) if day.optional_activities else [],
                    'notes': day.notes
                })
            
            return daily_plan
            
        except Exception as e:
            logger.error(f"Error getting itinerary details: {str(e)}")
            return []
    
    # ==================== ITINERARIO PERSONALIZADO DEL CLIENTE ====================
    
    async def create_client_itinerary(
        self,
        client_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea un itinerario basado en la entrada del cliente
        """
        try:
            itinerary_id = f"ITIN-CLIENT-{uuid.uuid4().hex[:8].upper()}"
            
            # Determinar el tipo de creación
            creation_type = client_data.get('creation_type', 'CUSTOM')
            
            if creation_type == 'FROM_TEMPLATE':
                # Cliente selecciona de plantilla y modifica
                itinerary = await self._create_from_template(
                    client_data['template_id'],
                    client_data.get('modifications', {})
                )
                
            elif creation_type == 'CLIENT_PROVIDED':
                # Cliente proporciona su propio itinerario
                itinerary = await self._process_client_itinerary(
                    client_data['itinerary_text'],
                    client_data.get('duration_days'),
                    client_data.get('destination')
                )
                
            elif creation_type == 'POINTS_OF_INTEREST':
                # Cliente proporciona puntos de interés
                itinerary = await self._create_from_points(
                    client_data['points_of_interest'],
                    client_data['duration_days'],
                    client_data.get('preferences', {})
                )
                
            else:
                # Creación personalizada completa
                itinerary = await self._create_custom_itinerary(client_data)
            
            # Calcular costos estimados
            cost_estimate = await self._estimate_itinerary_cost(
                itinerary,
                client_data.get('group_size', 1),
                client_data.get('service_level', 'STANDARD')
            )
            
            # Optimizar rutas si es necesario
            if client_data.get('optimize_routes', True):
                itinerary = await self._optimize_itinerary_routes(itinerary)
            
            # Guardar itinerario
            saved_itinerary = await self._save_client_itinerary(
                itinerary_id,
                itinerary,
                client_data,
                cost_estimate
            )
            
            return {
                'success': True,
                'itinerary_id': itinerary_id,
                'creation_type': creation_type,
                'itinerary': itinerary,
                'cost_estimate': cost_estimate,
                'optimization_applied': client_data.get('optimize_routes', True),
                'saved': saved_itinerary,
                'message': 'Itinerario creado exitosamente'
            }
            
        except Exception as e:
            logger.error(f"Error creating client itinerary: {str(e)}")
            raise BusinessLogicError(f"Error creando itinerario: {str(e)}")
    
    async def _create_from_template(
        self,
        template_id: str,
        modifications: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea itinerario desde plantilla con modificaciones
        """
        try:
            # Obtener plantilla base
            template = await self._get_itinerary_details(template_id)
            
            if not template:
                raise BusinessLogicError("Plantilla no encontrada")
            
            # Aplicar modificaciones
            modified_itinerary = {
                'base_template_id': template_id,
                'days': template,
                'modifications_applied': []
            }
            
            # Modificar días específicos
            if 'day_modifications' in modifications:
                for day_mod in modifications['day_modifications']:
                    day_num = day_mod['day']
                    if day_num <= len(modified_itinerary['days']):
                        day_index = day_num - 1
                        
                        # Aplicar cambios
                        if 'add_activities' in day_mod:
                            modified_itinerary['days'][day_index]['activities'].extend(
                                day_mod['add_activities']
                            )
                            modified_itinerary['modifications_applied'].append(
                                f"Añadidas actividades al día {day_num}"
                            )
                        
                        if 'remove_activities' in day_mod:
                            for activity in day_mod['remove_activities']:
                                if activity in modified_itinerary['days'][day_index]['activities']:
                                    modified_itinerary['days'][day_index]['activities'].remove(activity)
                            modified_itinerary['modifications_applied'].append(
                                f"Eliminadas actividades del día {day_num}"
                            )
                        
                        if 'change_accommodation' in day_mod:
                            modified_itinerary['days'][day_index]['accommodation'] = day_mod['change_accommodation']
                            modified_itinerary['modifications_applied'].append(
                                f"Cambiado alojamiento del día {day_num}"
                            )
            
            # Añadir o eliminar días
            if 'add_days' in modifications:
                for new_day in modifications['add_days']:
                    modified_itinerary['days'].append(new_day)
                    modified_itinerary['modifications_applied'].append(
                        f"Añadido día {len(modified_itinerary['days'])}"
                    )
            
            if 'remove_days' in modifications:
                for day_num in sorted(modifications['remove_days'], reverse=True):
                    if day_num <= len(modified_itinerary['days']):
                        modified_itinerary['days'].pop(day_num - 1)
                        modified_itinerary['modifications_applied'].append(
                            f"Eliminado día {day_num}"
                        )
                
                # Renumerar días
                for i, day in enumerate(modified_itinerary['days']):
                    day['day'] = i + 1
            
            return modified_itinerary
            
        except Exception as e:
            logger.error(f"Error creating from template: {str(e)}")
            raise
    
    async def _process_client_itinerary(
        self,
        itinerary_text: str,
        duration_days: Optional[int],
        destination: Optional[str]
    ) -> Dict[str, Any]:
        """
        Procesa un itinerario proporcionado por el cliente en texto libre
        """
        try:
            # Usar IA para estructurar el itinerario del cliente
            ai_prompt = f"""
            Analiza y estructura el siguiente itinerario proporcionado por el cliente:
            
            {itinerary_text}
            
            Información adicional:
            - Duración: {duration_days} días
            - Destino: {destination}
            
            Extrae y estructura:
            1. Actividades por día
            2. Lugares a visitar
            3. Tipo de alojamiento mencionado
            4. Transporte requerido
            5. Comidas incluidas
            6. Requisitos especiales
            
            Devuelve la información estructurada en formato JSON.
            """
            
            # Procesar con IA
            ai_response = await self.ai_service.process_text(ai_prompt)
            
            # Estructurar el itinerario
            structured_itinerary = {
                'source': 'CLIENT_PROVIDED',
                'original_text': itinerary_text,
                'days': []
            }
            
            # Parsear respuesta de IA y crear estructura de días
            if ai_response and 'days' in ai_response:
                for day_data in ai_response['days']:
                    structured_day = {
                        'day': day_data.get('day_number', len(structured_itinerary['days']) + 1),
                        'title': day_data.get('title', f"Día {day_data.get('day_number', '')}"),
                        'description': day_data.get('description', ''),
                        'activities': day_data.get('activities', []),
                        'locations': day_data.get('locations', []),
                        'meals': day_data.get('meals', {}),
                        'accommodation': day_data.get('accommodation', 'Por definir'),
                        'transportation': day_data.get('transportation', 'Por definir'),
                        'special_requirements': day_data.get('requirements', []),
                        'client_notes': day_data.get('notes', '')
                    }
                    structured_itinerary['days'].append(structured_day)
            else:
                # Si la IA no puede procesar, crear estructura básica
                if duration_days:
                    for day_num in range(1, duration_days + 1):
                        structured_itinerary['days'].append({
                            'day': day_num,
                            'title': f"Día {day_num}",
                            'description': f"Actividades del día {day_num} según itinerario del cliente",
                            'activities': [],
                            'locations': [],
                            'client_notes': itinerary_text if day_num == 1 else ''
                        })
            
            # Añadir información adicional extraída
            structured_itinerary['extracted_info'] = {
                'main_attractions': ai_response.get('attractions', []),
                'accommodation_type': ai_response.get('accommodation_type', 'Standard'),
                'meal_plan': ai_response.get('meal_plan', 'Breakfast included'),
                'special_interests': ai_response.get('interests', []),
                'transportation_needs': ai_response.get('transportation', [])
            }
            
            return structured_itinerary
            
        except Exception as e:
            logger.error(f"Error processing client itinerary: {str(e)}")
            # Retornar estructura básica en caso de error
            return {
                'source': 'CLIENT_PROVIDED',
                'original_text': itinerary_text,
                'days': [
                    {
                        'day': i + 1,
                        'title': f"Día {i + 1}",
                        'description': 'Por definir según itinerario del cliente',
                        'client_notes': itinerary_text if i == 0 else ''
                    }
                    for i in range(duration_days or 1)
                ],
                'processing_error': str(e)
            }
    
    async def _create_from_points(
        self,
        points_of_interest: List[Dict[str, Any]],
        duration_days: int,
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea un itinerario optimizado basado en puntos de interés
        """
        try:
            # Validar y geocodificar puntos de interés
            validated_points = await self._validate_and_geocode_points(points_of_interest)
            
            # Calcular distancias entre puntos
            distance_matrix = self._calculate_distance_matrix(validated_points)
            
            # Optimizar ruta usando algoritmo TSP (Traveling Salesman Problem)
            optimized_route = self._optimize_route_tsp(distance_matrix, validated_points)
            
            # Distribuir puntos en días
            daily_distribution = self._distribute_points_by_day(
                optimized_route,
                duration_days,
                preferences
            )
            
            # Crear estructura de itinerario
            itinerary = {
                'source': 'POINTS_OF_INTEREST',
                'total_points': len(points_of_interest),
                'optimized': True,
                'days': []
            }
            
            for day_num, day_points in enumerate(daily_distribution, 1):
                day_plan = {
                    'day': day_num,
                    'title': f"Día {day_num} - {day_points[0]['name']} y más",
                    'description': f"Visitando {len(day_points)} lugares de interés",
                    'activities': [],
                    'locations': [],
                    'points_of_interest': day_points,
                    'total_distance': 0,
                    'estimated_time': 0
                }
                
                # Calcular distancias y tiempos del día
                for i, point in enumerate(day_points):
                    # Añadir actividad
                    activity = {
                        'time': self._estimate_visit_time(point, i),
                        'name': point['name'],
                        'type': point.get('type', 'visit'),
                        'duration': point.get('duration', 60),  # minutos
                        'description': point.get('description', ''),
                        'location': {
                            'address': point.get('address', ''),
                            'lat': point.get('lat'),
                            'lng': point.get('lng')
                        }
                    }
                    day_plan['activities'].append(activity)
                    day_plan['locations'].append(point['name'])
                    
                    # Calcular distancia al siguiente punto
                    if i < len(day_points) - 1:
                        distance = self._calculate_distance(
                            (point['lat'], point['lng']),
                            (day_points[i + 1]['lat'], day_points[i + 1]['lng'])
                        )
                        day_plan['total_distance'] += distance
                
                # Estimar tiempo total del día
                day_plan['estimated_time'] = sum(p.get('duration', 60) for p in day_points)
                day_plan['estimated_time'] += day_plan['total_distance'] * 2  # 2 min/km aprox
                
                # Añadir recomendaciones
                day_plan['recommendations'] = self._generate_day_recommendations(
                    day_points,
                    preferences
                )
                
                itinerary['days'].append(day_plan)
            
            # Añadir resumen
            itinerary['summary'] = {
                'total_distance': sum(d['total_distance'] for d in itinerary['days']),
                'points_visited': len(validated_points),
                'optimization_saved': self._calculate_optimization_savings(
                    points_of_interest,
                    optimized_route
                )
            }
            
            return itinerary
            
        except Exception as e:
            logger.error(f"Error creating from points: {str(e)}")
            raise
    
    async def _validate_and_geocode_points(
        self,
        points: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Valida y obtiene coordenadas de puntos de interés
        """
        validated = []
        
        for point in points:
            # Si ya tiene coordenadas, validar
            if 'lat' in point and 'lng' in point:
                validated.append(point)
            else:
                # Intentar geocodificar
                try:
                    location = self.geolocator.geocode(point.get('address') or point.get('name'))
                    if location:
                        point['lat'] = location.latitude
                        point['lng'] = location.longitude
                        point['address'] = location.address
                        validated.append(point)
                    else:
                        logger.warning(f"Could not geocode: {point.get('name')}")
                except Exception as e:
                    logger.error(f"Geocoding error for {point.get('name')}: {str(e)}")
        
        return validated
    
    def _calculate_distance_matrix(
        self,
        points: List[Dict[str, Any]]
    ) -> List[List[float]]:
        """
        Calcula matriz de distancias entre todos los puntos
        """
        n = len(points)
        matrix = [[0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(i + 1, n):
                distance = self._calculate_distance(
                    (points[i]['lat'], points[i]['lng']),
                    (points[j]['lat'], points[j]['lng'])
                )
                matrix[i][j] = distance
                matrix[j][i] = distance
        
        return matrix
    
    def _calculate_distance(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """
        Calcula distancia entre dos puntos en kilómetros
        """
        try:
            return geodesic(point1, point2).kilometers
        except:
            # Cálculo aproximado si geodesic falla
            import math
            lat1, lon1 = point1
            lat2, lon2 = point2
            R = 6371  # Radio de la Tierra en km
            
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
                math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            return R * c
    
    def _optimize_route_tsp(
        self,
        distance_matrix: List[List[float]],
        points: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Optimiza ruta usando algoritmo del vendedor viajero (simplificado)
        """
        n = len(points)
        if n <= 2:
            return points
        
        # Implementación simple: Nearest Neighbor
        unvisited = list(range(1, n))
        route = [0]  # Empezar desde el primer punto
        current = 0
        
        while unvisited:
            # Encontrar el punto no visitado más cercano
            nearest = min(unvisited, key=lambda x: distance_matrix[current][x])
            route.append(nearest)
            unvisited.remove(nearest)
            current = nearest
        
        # Reordenar puntos según ruta optimizada
        return [points[i] for i in route]
    
    def _distribute_points_by_day(
        self,
        points: List[Dict[str, Any]],
        days: int,
        preferences: Dict[str, Any]
    ) -> List[List[Dict[str, Any]]]:
        """
        Distribuye puntos de interés en días
        """
        if days <= 0:
            return [points]
        
        # Calcular puntos por día
        points_per_day = len(points) / days
        daily_distribution = []
        
        # Considerar preferencias de ritmo
        pace = preferences.get('pace', 'MODERATE')
        if pace == 'RELAXED':
            points_per_day *= 0.7  # Menos puntos por día
        elif pace == 'INTENSIVE':
            points_per_day *= 1.3  # Más puntos por día
        
        points_per_day = max(1, int(points_per_day))
        
        # Distribuir puntos
        for day in range(days):
            start_idx = day * points_per_day
            end_idx = min(start_idx + points_per_day, len(points))
            
            if day == days - 1:  # Último día, incluir todos los restantes
                end_idx = len(points)
            
            if start_idx < len(points):
                daily_distribution.append(points[start_idx:end_idx])
            else:
                daily_distribution.append([])
        
        return daily_distribution
    
    def _estimate_visit_time(self, point: Dict[str, Any], index: int) -> str:
        """
        Estima hora de visita para un punto
        """
        # Hora de inicio base
        base_hour = 8
        
        # Añadir tiempo acumulado (2 horas por punto anterior aprox)
        estimated_hour = base_hour + (index * 2)
        
        # Ajustar si es tarde
        if estimated_hour >= 13 and estimated_hour < 15:
            estimated_hour = 15  # Saltar hora de almuerzo
        
        hour = min(estimated_hour, 20)  # No más tarde de las 8 PM
        return f"{hour:02d}:00"
    
    def _generate_day_recommendations(
        self,
        points: List[Dict[str, Any]],
        preferences: Dict[str, Any]
    ) -> List[str]:
        """
        Genera recomendaciones para el día
        """
        recommendations = []
        
        # Recomendaciones basadas en tipos de puntos
        point_types = [p.get('type', '') for p in points]
        
        if 'museum' in point_types:
            recommendations.append("Verificar horarios de museos y comprar entradas con anticipación")
        
        if 'restaurant' in point_types or 'food' in point_types:
            recommendations.append("Hacer reservaciones en restaurantes")
        
        if len(points) > 4:
            recommendations.append("Considerar transporte privado para optimizar tiempo")
        
        # Recomendaciones basadas en preferencias
        if preferences.get('photography'):
            recommendations.append("Mejores horas para fotos: amanecer y atardecer")
        
        if preferences.get('with_children'):
            recommendations.append("Incluir pausas y snacks para niños")
        
        return recommendations
    
    def _calculate_optimization_savings(
        self,
        original: List[Dict[str, Any]],
        optimized: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calcula ahorros por optimización de ruta
        """
        # Calcular distancia total original (orden de entrada)
        original_distance = 0
        for i in range(len(original) - 1):
            if 'lat' in original[i] and 'lat' in original[i + 1]:
                original_distance += self._calculate_distance(
                    (original[i]['lat'], original[i]['lng']),
                    (original[i + 1]['lat'], original[i + 1]['lng'])
                )
        
        # Calcular distancia optimizada
        optimized_distance = 0
        for i in range(len(optimized) - 1):
            optimized_distance += self._calculate_distance(
                (optimized[i]['lat'], optimized[i]['lng']),
                (optimized[i + 1]['lat'], optimized[i + 1]['lng'])
            )
        
        savings = original_distance - optimized_distance
        savings_percent = (savings / original_distance * 100) if original_distance > 0 else 0
        
        return {
            'distance_saved_km': round(savings, 2),
            'percentage_saved': round(savings_percent, 1),
            'time_saved_minutes': round(savings * 2, 0),  # Aproximado 2 min/km
            'fuel_saved_liters': round(savings * 0.08, 2)  # Aproximado 8L/100km
        }
    
    async def _create_custom_itinerary(
        self,
        client_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea un itinerario personalizado desde cero
        """
        try:
            itinerary = {
                'source': 'CUSTOM_CREATED',
                'days': []
            }
            
            duration = client_data.get('duration_days', 1)
            
            for day_num in range(1, duration + 1):
                day_data = client_data.get(f'day_{day_num}', {})
                
                day_plan = {
                    'day': day_num,
                    'title': day_data.get('title', f"Día {day_num}"),
                    'description': day_data.get('description', ''),
                    'activities': day_data.get('activities', []),
                    'locations': day_data.get('locations', []),
                    'meals': day_data.get('meals', {
                        'breakfast': 'Incluido',
                        'lunch': 'Por cuenta propia',
                        'dinner': 'Por cuenta propia'
                    }),
                    'accommodation': day_data.get('accommodation', 'Hotel estándar'),
                    'transportation': day_data.get('transportation', 'Transporte privado'),
                    'special_requirements': day_data.get('requirements', []),
                    'notes': day_data.get('notes', '')
                }
                
                itinerary['days'].append(day_plan)
            
            # Añadir información general
            itinerary['general_info'] = {
                'destination': client_data.get('destination'),
                'group_size': client_data.get('group_size'),
                'interests': client_data.get('interests', []),
                'budget_level': client_data.get('budget_level', 'MODERATE'),
                'special_requirements': client_data.get('special_requirements', [])
            }
            
            return itinerary
            
        except Exception as e:
            logger.error(f"Error creating custom itinerary: {str(e)}")
            raise
    
    async def _optimize_itinerary_routes(
        self,
        itinerary: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Optimiza las rutas dentro del itinerario
        """
        try:
            optimized = itinerary.copy()
            
            for day in optimized.get('days', []):
                if 'locations' in day and len(day['locations']) > 2:
                    # Geocodificar ubicaciones si es necesario
                    locations_with_coords = []
                    for location in day['locations']:
                        if isinstance(location, dict) and 'lat' in location:
                            locations_with_coords.append(location)
                        else:
                            # Intentar geocodificar
                            try:
                                geo_result = self.geolocator.geocode(location)
                                if geo_result:
                                    locations_with_coords.append({
                                        'name': location,
                                        'lat': geo_result.latitude,
                                        'lng': geo_result.longitude
                                    })
                            except:
                                pass
                    
                    # Si tenemos coordenadas, optimizar ruta
                    if len(locations_with_coords) > 2:
                        distance_matrix = self._calculate_distance_matrix(locations_with_coords)
                        optimized_locations = self._optimize_route_tsp(distance_matrix, locations_with_coords)
                        day['locations'] = [loc.get('name', loc) for loc in optimized_locations]
                        day['route_optimized'] = True
            
            return optimized
            
        except Exception as e:
            logger.error(f"Error optimizing routes: {str(e)}")
            return itinerary  # Retornar original si falla optimización
    
    async def _estimate_itinerary_cost(
        self,
        itinerary: Dict[str, Any],
        group_size: int,
        service_level: str
    ) -> Dict[str, Any]:
        """
        Estima costos del itinerario
        """
        try:
            # Factores de costo base por nivel de servicio
            cost_factors = {
                'BUDGET': {'accommodation': 50, 'meals': 20, 'transport': 30, 'activities': 25},
                'STANDARD': {'accommodation': 100, 'meals': 35, 'transport': 50, 'activities': 40},
                'COMFORT': {'accommodation': 150, 'meals': 50, 'transport': 80, 'activities': 60},
                'LUXURY': {'accommodation': 300, 'meals': 100, 'transport': 150, 'activities': 100}
            }
            
            factors = cost_factors.get(service_level, cost_factors['STANDARD'])
            
            total_days = len(itinerary.get('days', []))
            
            # Calcular costos
            costs = {
                'accommodation': factors['accommodation'] * (total_days - 1),  # -1 porque última noche no siempre
                'meals': factors['meals'] * total_days,
                'transportation': factors['transport'] * total_days,
                'activities': 0,
                'guides': 80 * total_days,  # Costo estimado de guía
                'miscellaneous': 20 * total_days
            }
            
            # Calcular costo de actividades
            for day in itinerary.get('days', []):
                activities_count = len(day.get('activities', []))
                costs['activities'] += activities_count * factors['activities']
            
            # Costo total
            total_cost = sum(costs.values())
            
            # Aplicar descuento por grupo si aplica
            group_discount = 0
            if group_size >= 10:
                group_discount = 0.10
            elif group_size >= 20:
                group_discount = 0.15
            elif group_size >= 30:
                group_discount = 0.20
            
            discounted_total = total_cost * (1 - group_discount)
            cost_per_person = discounted_total / group_size if group_size > 0 else total_cost
            
            return {
                'service_level': service_level,
                'group_size': group_size,
                'duration_days': total_days,
                'costs_breakdown': costs,
                'subtotal': total_cost,
                'group_discount_percent': group_discount * 100,
                'group_discount_amount': total_cost * group_discount,
                'total_cost': discounted_total,
                'cost_per_person': cost_per_person,
                'currency': 'USD',
                'estimation_date': datetime.utcnow().isoformat(),
                'notes': 'Costos estimados sujetos a confirmación de proveedores'
            }
            
        except Exception as e:
            logger.error(f"Error estimating cost: {str(e)}")
            return {
                'error': 'No se pudo estimar el costo',
                'message': str(e)
            }
    
    async def _save_client_itinerary(
        self,
        itinerary_id: str,
        itinerary: Dict[str, Any],
        client_data: Dict[str, Any],
        cost_estimate: Dict[str, Any]
    ) -> bool:
        """
        Guarda el itinerario del cliente en la base de datos
        """
        try:
            # Guardar en caché temporalmente
            cache_key = f"client_itinerary:{itinerary_id}"
            cache_data = {
                'itinerary': itinerary,
                'client_data': client_data,
                'cost_estimate': cost_estimate,
                'created_at': datetime.utcnow().isoformat(),
                'status': 'DRAFT'
            }
            
            await cache_manager.set(cache_key, cache_data, ttl=86400)  # 24 horas
            
            # TODO: Implementar guardado en base de datos
            
            logger.info(f"Client itinerary saved: {itinerary_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving itinerary: {str(e)}")
            return False
    
    # ==================== BÚSQUEDA Y RECOMENDACIONES ====================
    
    async def search_itineraries(
        self,
        search_criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Busca itinerarios según criterios
        """
        try:
            # Buscar en itinerarios del sistema
            system_results = await self.get_system_itineraries(search_criteria)
            
            # TODO: Buscar en itinerarios personalizados guardados
            
            # Rankear resultados por relevancia
            ranked_results = self._rank_search_results(system_results, search_criteria)
            
            return ranked_results
            
        except Exception as e:
            logger.error(f"Error searching itineraries: {str(e)}")
            raise
    
    def _rank_search_results(
        self,
        results: List[Dict[str, Any]],
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Rankea resultados de búsqueda por relevancia
        """
        for result in results:
            score = 0
            
            # Puntuación por coincidencia de categoría
            if 'category' in criteria and result.get('category') == criteria['category']:
                score += 10
            
            # Puntuación por rango de presupuesto
            if 'budget' in criteria:
                budget = criteria['budget']
                price = result.get('base_price', 0)
                if price <= budget:
                    score += 5
                    if price >= budget * 0.7:  # Cerca del presupuesto
                        score += 3
            
            # Puntuación por popularidad
            score += result.get('popularity_score', 0) / 10
            
            # Puntuación por rating
            score += result.get('rating', 0) * 2
            
            result['relevance_score'] = score
        
        # Ordenar por puntuación de relevancia
        return sorted(results, key=lambda x: x.get('relevance_score', 0), reverse=True)
    
    async def get_recommendations(
        self,
        client_profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Obtiene recomendaciones de itinerarios basadas en el perfil del cliente
        """
        try:
            # Criterios basados en perfil
            search_criteria = {
                'limit': 10
            }
            
            # Mapear intereses a categorías
            interests = client_profile.get('interests', [])
            if 'CULTURE' in interests:
                search_criteria['category'] = 'CULTURAL'
            elif 'ADVENTURE' in interests:
                search_criteria['category'] = 'ADVENTURE'
            elif 'NATURE' in interests:
                search_criteria['category'] = 'NATURE'
            
            # Filtrar por presupuesto
            if 'budget_per_person' in client_profile:
                search_criteria['max_budget'] = client_profile['budget_per_person']
            
            # Buscar itinerarios
            recommendations = await self.search_itineraries(search_criteria)
            
            # Personalizar recomendaciones
            for rec in recommendations:
                rec['personalization_notes'] = []
                
                # Añadir notas de personalización
                if client_profile.get('group_type') == 'FAMILY':
                    rec['personalization_notes'].append('Adaptable para familias')
                
                if client_profile.get('accessibility_needs'):
                    rec['personalization_notes'].append('Verificar accesibilidad')
                
                if client_profile.get('dietary_requirements'):
                    rec['personalization_notes'].append('Opciones de comida especiales disponibles')
            
            return recommendations[:5]  # Top 5 recomendaciones
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            return []