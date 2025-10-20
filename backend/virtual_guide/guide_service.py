# Virtual Guide Service with GPS and AI Content
# Servicio completo de guía virtual con GPS y contenido generado por IA

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import asyncio
import json
import math
from enum import Enum
import logging
import hashlib

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import httpx
from geopy.distance import geodesic
import numpy as np

from .models import (
    TouristDestination, DestinationContent, AudioGuide,
    PointOfInterest, TourRoute, RouteSegment,
    TourCommunicationChannel, ChannelParticipant,
    ChannelMessage, SharedLocation, ContentType,
    GuideMode, CommunicationStatus
)

logger = logging.getLogger(__name__)

class VirtualGuideService:
    """
    Servicio principal de guía virtual con capacidades GPS y IA
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_service = AIContentGenerator()
        self.audio_service = AudioNarrationService()
        self.notification_service = NotificationService()
        
    # =============== FUNCIONES GPS Y NAVEGACIÓN ===============
    
    async def get_nearby_destinations(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 1.0,
        content_types: Optional[List[ContentType]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Obtiene destinos cercanos a la ubicación actual del usuario
        """
        user_location = (latitude, longitude)
        
        # Obtener destinos dentro del área aproximada
        lat_range = radius_km / 111  # ~111 km por grado de latitud
        lon_range = radius_km / (111 * math.cos(math.radians(latitude)))
        
        query = self.db.query(TouristDestination).filter(
            and_(
                TouristDestination.latitude.between(latitude - lat_range, latitude + lat_range),
                TouristDestination.longitude.between(longitude - lon_range, longitude + lon_range),
                TouristDestination.is_active == True
            )
        )
        
        if content_types:
            query = query.filter(TouristDestination.primary_type.in_(content_types))
        
        destinations = query.all()
        
        # Calcular distancias exactas y ordenar
        destinations_with_distance = []
        for dest in destinations:
            dest_location = (dest.latitude, dest.longitude)
            distance = geodesic(user_location, dest_location).kilometers
            
            if distance <= radius_km:
                destinations_with_distance.append({
                    'destination': dest,
                    'distance_km': distance,
                    'distance_m': distance * 1000,
                    'bearing': self._calculate_bearing(user_location, dest_location),
                    'walking_time_minutes': int(distance * 1000 / 80)  # ~80m/min velocidad caminando
                })
        
        # Ordenar por distancia
        destinations_with_distance.sort(key=lambda x: x['distance_km'])
        
        # Formatear respuesta
        result = []
        for item in destinations_with_distance[:limit]:
            dest = item['destination']
            result.append({
                'id': dest.id,
                'name': dest.name,
                'type': dest.primary_type.value,
                'distance': {
                    'meters': round(item['distance_m']),
                    'walking_minutes': item['walking_time_minutes'],
                    'display': self._format_distance(item['distance_m'])
                },
                'direction': {
                    'bearing': item['bearing'],
                    'compass': self._bearing_to_compass(item['bearing'])
                },
                'location': {
                    'lat': dest.latitude,
                    'lng': dest.longitude
                },
                'quick_info': dest.short_description,
                'is_open': self._check_if_open(dest.opening_hours),
                'audio_available': self._has_audio_guide(dest.id),
                'ar_enabled': self._has_ar_content(dest.id)
            })
        
        return result
    
    async def start_gps_guided_tour(
        self,
        user_id: int,
        route_id: Optional[int] = None,
        language: str = 'es'
    ) -> Dict[str, Any]:
        """
        Inicia un tour guiado por GPS
        """
        # Crear sesión de guía
        session_id = self._generate_session_id()
        
        # Si hay ruta predefinida, cargarla
        if route_id:
            route = self.db.query(TourRoute).filter_by(id=route_id).first()
            if not route:
                raise ValueError(f"Route {route_id} not found")
            
            destinations = self._load_route_destinations(route)
            waypoints = route.waypoints
        else:
            # Modo exploración libre
            destinations = []
            waypoints = []
        
        # Configurar sesión
        session = {
            'session_id': session_id,
            'user_id': user_id,
            'mode': GuideMode.GPS_LIVE.value,
            'language': language,
            'route_id': route_id,
            'destinations': destinations,
            'waypoints': waypoints,
            'current_destination_index': 0,
            'visited_destinations': [],
            'start_time': datetime.utcnow().isoformat(),
            'last_location': None,
            'auto_narration': True,
            'navigation_active': True
        }
        
        # Guardar en caché/sesión
        self._save_session(session_id, session)
        
        # Preparar contenido inicial
        initial_content = await self._prepare_initial_content(
            destinations[0] if destinations else None,
            language
        )
        
        return {
            'session_id': session_id,
            'status': 'active',
            'mode': 'gps_guided',
            'initial_content': initial_content,
            'route': {
                'total_destinations': len(destinations),
                'estimated_duration_minutes': route.estimated_duration_minutes if route else None,
                'total_distance_km': route.total_distance_km if route else None
            },
            'settings': {
                'auto_play': True,
                'navigation_voice': True,
                'proximity_alerts': True
            }
        }
    
    async def update_user_location(
        self,
        session_id: str,
        latitude: float,
        longitude: float,
        accuracy: float = 10.0,
        heading: Optional[float] = None,
        speed: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Actualiza la ubicación del usuario y activa contenido según proximidad
        """
        session = self._get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        current_location = (latitude, longitude)
        
        # Actualizar ubicación en sesión
        session['last_location'] = {
            'lat': latitude,
            'lng': longitude,
            'accuracy': accuracy,
            'heading': heading,
            'speed': speed,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        response = {
            'triggered_content': [],
            'nearby_points': [],
            'navigation_update': None,
            'alerts': []
        }
        
        # Verificar proximidad a destinos
        nearby_destinations = await self._check_proximity_triggers(
            current_location,
            session['destinations'],
            session['visited_destinations']
        )
        
        for dest_info in nearby_destinations:
            if dest_info['trigger_content']:
                # Activar contenido automático
                content = await self._get_triggered_content(
                    dest_info['destination_id'],
                    dest_info['distance_m'],
                    session['language']
                )
                
                response['triggered_content'].append(content)
                
                # Marcar como visitado si está muy cerca
                if dest_info['distance_m'] < 20:
                    session['visited_destinations'].append(dest_info['destination_id'])
        
        # Buscar puntos de interés cercanos
        pois = await self._get_nearby_pois(current_location, radius_m=50)
        response['nearby_points'] = pois
        
        # Actualizar navegación si está activa
        if session['navigation_active'] and session['waypoints']:
            nav_update = self._update_navigation(
                current_location,
                session['waypoints'],
                session['current_destination_index']
            )
            response['navigation_update'] = nav_update
            
            # Verificar si llegó al destino actual
            if nav_update['arrived_at_destination']:
                session['current_destination_index'] += 1
                response['alerts'].append({
                    'type': 'arrival',
                    'message': f"Has llegado a {nav_update['destination_name']}"
                })
        
        # Guardar sesión actualizada
        self._save_session(session_id, session)
        
        return response
    
    # =============== GENERACIÓN DE CONTENIDO CON IA ===============
    
    async def generate_destination_content(
        self,
        destination_id: int,
        content_type: str = 'general',
        language: str = 'es',
        target_audience: str = 'general',
        auto_approve: bool = False
    ) -> Dict[str, Any]:
        """
        Genera contenido turístico usando IA
        """
        destination = self.db.query(TouristDestination).filter_by(id=destination_id).first()
        if not destination:
            raise ValueError(f"Destination {destination_id} not found")
        
        # Preparar contexto para IA
        context = self._prepare_ai_context(destination, content_type, target_audience)
        
        # Generar contenido según tipo
        if content_type == 'historical':
            content = await self.ai_service.generate_historical_content(
                destination_name=destination.name,
                context=context,
                language=language
            )
        elif content_type == 'religious':
            content = await self.ai_service.generate_religious_content(
                destination_name=destination.name,
                context=context,
                language=language,
                include_biblical=destination.country in ['Israel', 'Palestine', 'Jordan']
            )
        elif content_type == 'cultural':
            content = await self.ai_service.generate_cultural_content(
                destination_name=destination.name,
                context=context,
                language=language
            )
        else:
            content = await self.ai_service.generate_general_content(
                destination_name=destination.name,
                context=context,
                language=language
            )
        
        # Validar calidad del contenido
        quality_score = await self._evaluate_content_quality(content)
        
        # Guardar en base de datos
        db_content = DestinationContent(
            destination_id=destination_id,
            content_format=ContentFormat.TEXT,
            content_type=ContentType[content_type.upper()] if content_type != 'general' else None,
            language=language,
            title=content['title'],
            content_text=content['content'],
            religious_context=content.get('religious_context'),
            historical_context=content.get('historical_context'),
            biblical_references=content.get('biblical_references'),
            ai_quality_score=quality_score,
            is_approved=auto_approve and quality_score > 0.8
        )
        
        self.db.add(db_content)
        self.db.commit()
        
        return {
            'content_id': db_content.id,
            'destination': destination.name,
            'content_type': content_type,
            'language': language,
            'quality_score': quality_score,
            'status': 'approved' if db_content.is_approved else 'pending_review',
            'preview': content['content'][:500] + '...' if len(content['content']) > 500 else content['content']
        }
    
    async def generate_audio_guide(
        self,
        destination_id: int,
        language: str = 'es',
        voice: str = 'default',
        include_music: bool = False
    ) -> Dict[str, Any]:
        """
        Genera una audioguía narrada para un destino
        """
        # Obtener o generar script
        script = await self._get_or_generate_audio_script(destination_id, language)
        
        # Generar audio con TTS
        audio_result = await self.audio_service.generate_narration(
            text=script['text'],
            voice=voice,
            language=language,
            speed=1.0,
            include_pauses=True
        )
        
        # Agregar música de fondo si se solicita
        if include_music:
            audio_result = await self.audio_service.add_background_music(
                audio_url=audio_result['audio_url'],
                music_style='ambient',
                volume=0.2
            )
        
        # Generar capítulos automáticamente
        chapters = self._generate_audio_chapters(script['text'], audio_result['duration'])
        
        # Guardar audioguía
        audio_guide = AudioGuide(
            destination_id=destination_id,
            title=f"Audioguía de {script['destination_name']}",
            description=script['description'],
            language=language,
            duration_seconds=audio_result['duration'],
            audio_url=audio_result['audio_url'],
            transcript=script['text'],
            chapters=chapters,
            ai_generated=True,
            quality_rating=audio_result['quality_score']
        )
        
        self.db.add(audio_guide)
        self.db.commit()
        
        return {
            'audio_guide_id': audio_guide.id,
            'destination': script['destination_name'],
            'duration': audio_result['duration'],
            'audio_url': audio_result['audio_url'],
            'chapters': chapters,
            'language': language,
            'voice': voice,
            'has_music': include_music
        }
    
    # =============== SISTEMA DE COMUNICACIÓN ===============
    
    async def create_tour_communication_channel(
        self,
        booking_id: int,
        guide_id: int,
        driver_id: Optional[int] = None,
        tour_date: datetime = None,
        auto_expire_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Crea un canal de comunicación para un tour
        """
        # Generar código único
        channel_code = self._generate_channel_code()
        
        # Crear canal
        channel = TourCommunicationChannel(
            channel_code=channel_code,
            booking_id=booking_id,
            guide_id=guide_id,
            driver_id=driver_id,
            tour_date=tour_date or datetime.now().date(),
            is_active=True,
            activated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=auto_expire_hours),
            location_sharing_enabled=True,
            photo_sharing_enabled=True,
            auto_delete_after_hours=auto_expire_hours
        )
        
        self.db.add(channel)
        self.db.commit()
        
        # Agregar participantes automáticamente
        participants = [
            {'user_id': guide_id, 'role': 'guide'},
        ]
        if driver_id:
            participants.append({'user_id': driver_id, 'role': 'driver'})
        
        for p in participants:
            participant = ChannelParticipant(
                channel_id=channel.id,
                user_id=p['user_id'],
                role=p['role'],
                status=CommunicationStatus.ACTIVE,
                can_share_location=True,
                can_send_messages=True
            )
            self.db.add(participant)
        
        self.db.commit()
        
        return {
            'channel_id': channel.id,
            'channel_code': channel_code,
            'status': 'active',
            'expires_at': channel.expires_at.isoformat(),
            'join_url': f"/app/tour/join/{channel_code}",
            'participants': len(participants)
        }
    
    async def join_communication_channel(
        self,
        channel_code: str,
        user_id: int,
        role: str = 'tourist'
    ) -> Dict[str, Any]:
        """
        Usuario se une a un canal de comunicación
        """
        channel = self.db.query(TourCommunicationChannel).filter_by(
            channel_code=channel_code,
            is_active=True
        ).first()
        
        if not channel:
            raise ValueError("Canal no encontrado o inactivo")
        
        if channel.expires_at < datetime.utcnow():
            raise ValueError("El canal ha expirado")
        
        # Verificar si ya está en el canal
        existing = self.db.query(ChannelParticipant).filter_by(
            channel_id=channel.id,
            user_id=user_id
        ).first()
        
        if existing:
            existing.status = CommunicationStatus.ACTIVE
            existing.joined_at = datetime.utcnow()
        else:
            # Agregar nuevo participante
            participant = ChannelParticipant(
                channel_id=channel.id,
                user_id=user_id,
                role=role,
                status=CommunicationStatus.ACTIVE,
                can_share_location=True,
                can_send_messages=True
            )
            self.db.add(participant)
        
        self.db.commit()
        
        # Obtener información del canal
        participants = self.db.query(ChannelParticipant).filter_by(
            channel_id=channel.id,
            status=CommunicationStatus.ACTIVE
        ).all()
        
        # Notificar a otros participantes
        await self._notify_channel_event(
            channel.id,
            event_type='user_joined',
            data={'user_id': user_id, 'role': role}
        )
        
        return {
            'channel_id': channel.id,
            'status': 'joined',
            'role': role,
            'participants': [
                {
                    'user_id': p.user_id,
                    'role': p.role,
                    'status': p.status.value,
                    'last_seen': p.last_seen.isoformat() if p.last_seen else None
                }
                for p in participants
            ],
            'features': {
                'location_sharing': channel.location_sharing_enabled,
                'photo_sharing': channel.photo_sharing_enabled,
                'messaging': True
            },
            'meeting_points': channel.meeting_points
        }
    
    async def share_location(
        self,
        channel_id: int,
        user_id: int,
        latitude: float,
        longitude: float,
        description: Optional[str] = None,
        photo_url: Optional[str] = None,
        expires_minutes: int = 30
    ) -> Dict[str, Any]:
        """
        Comparte ubicación temporal en el canal
        """
        # Verificar permisos
        participant = self.db.query(ChannelParticipant).filter_by(
            channel_id=channel_id,
            user_id=user_id
        ).first()
        
        if not participant or not participant.can_share_location:
            raise ValueError("No tiene permisos para compartir ubicación")
        
        # Actualizar ubicación del participante
        participant.current_latitude = latitude
        participant.current_longitude = longitude
        participant.location_updated_at = datetime.utcnow()
        
        # Crear registro de ubicación compartida
        shared_location = SharedLocation(
            channel_id=channel_id,
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            location_type='current',
            description=description,
            photo_url=photo_url,
            expires_at=datetime.utcnow() + timedelta(minutes=expires_minutes)
        )
        
        self.db.add(shared_location)
        self.db.commit()
        
        # Notificar a otros participantes
        await self._notify_channel_event(
            channel_id,
            event_type='location_shared',
            data={
                'user_id': user_id,
                'lat': latitude,
                'lng': longitude,
                'description': description
            }
        )
        
        # Calcular distancia a punto de encuentro si existe
        channel = self.db.query(TourCommunicationChannel).filter_by(id=channel_id).first()
        distance_to_meeting = None
        
        if channel.meeting_points and len(channel.meeting_points) > 0:
            next_meeting = channel.meeting_points[0]
            meeting_location = (next_meeting['lat'], next_meeting['lng'])
            user_location = (latitude, longitude)
            distance_to_meeting = geodesic(user_location, meeting_location).meters
        
        return {
            'status': 'shared',
            'location_id': shared_location.id,
            'expires_at': shared_location.expires_at.isoformat(),
            'distance_to_meeting_point': distance_to_meeting,
            'message': f"Ubicación compartida por {expires_minutes} minutos"
        }
    
    async def send_channel_message(
        self,
        channel_id: int,
        user_id: int,
        message_type: str = 'text',
        text: Optional[str] = None,
        media_url: Optional[str] = None,
        is_announcement: bool = False,
        is_emergency: bool = False
    ) -> Dict[str, Any]:
        """
        Envía un mensaje en el canal de comunicación
        """
        # Verificar permisos
        participant = self.db.query(ChannelParticipant).filter_by(
            channel_id=channel_id,
            user_id=user_id
        ).first()
        
        if not participant or not participant.can_send_messages:
            raise ValueError("No tiene permisos para enviar mensajes")
        
        # Crear mensaje
        message = ChannelMessage(
            channel_id=channel_id,
            sender_id=user_id,
            message_type=message_type,
            text_content=text,
            media_url=media_url,
            is_announcement=is_announcement,
            is_emergency=is_emergency,
            auto_delete_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        self.db.add(message)
        self.db.commit()
        
        # Si es emergencia, notificar a todos inmediatamente
        if is_emergency:
            await self._send_emergency_notification(channel_id, user_id, text)
        
        # Notificar a participantes
        await self._notify_channel_event(
            channel_id,
            event_type='new_message',
            data={
                'message_id': message.id,
                'sender_id': user_id,
                'type': message_type,
                'is_emergency': is_emergency
            }
        )
        
        return {
            'message_id': message.id,
            'status': 'sent',
            'timestamp': message.sent_at.isoformat()
        }
    
    # =============== FUNCIONES AUXILIARES ===============
    
    def _calculate_bearing(self, point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
        """Calcula el rumbo entre dos puntos"""
        lat1, lon1 = math.radians(point1[0]), math.radians(point1[1])
        lat2, lon2 = math.radians(point2[0]), math.radians(point2[1])
        
        dlon = lon2 - lon1
        
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        
        bearing = math.degrees(math.atan2(x, y))
        return (bearing + 360) % 360
    
    def _bearing_to_compass(self, bearing: float) -> str:
        """Convierte rumbo a dirección cardinal"""
        directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
        index = int((bearing + 22.5) / 45) % 8
        return directions[index]
    
    def _format_distance(self, meters: float) -> str:
        """Formatea distancia para mostrar"""
        if meters < 1000:
            return f"{int(meters)}m"
        else:
            return f"{meters/1000:.1f}km"
    
    def _check_if_open(self, opening_hours: Optional[Dict]) -> bool:
        """Verifica si un lugar está abierto ahora"""
        if not opening_hours:
            return True  # Asumir abierto si no hay horarios
        
        now = datetime.now()
        day_name = now.strftime('%A').lower()
        current_time = now.strftime('%H:%M')
        
        if day_name in opening_hours:
            hours = opening_hours[day_name]
            if hours.get('closed'):
                return False
            
            open_time = hours.get('open', '00:00')
            close_time = hours.get('close', '23:59')
            
            return open_time <= current_time <= close_time
        
        return True
    
    def _has_audio_guide(self, destination_id: int) -> bool:
        """Verifica si hay audioguía disponible"""
        return self.db.query(AudioGuide).filter_by(
            destination_id=destination_id
        ).count() > 0
    
    def _has_ar_content(self, destination_id: int) -> bool:
        """Verifica si hay contenido AR disponible"""
        poi = self.db.query(PointOfInterest).filter(
            and_(
                PointOfInterest.destination_id == destination_id,
                PointOfInterest.ar_content_url != None
            )
        ).first()
        return poi is not None
    
    def _generate_session_id(self) -> str:
        """Genera ID único de sesión"""
        import uuid
        return str(uuid.uuid4())
    
    def _generate_channel_code(self) -> str:
        """Genera código único para canal"""
        import random
        import string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    def _save_session(self, session_id: str, session_data: Dict):
        """Guarda sesión en caché"""
        # Implementar con Redis o similar
        pass
    
    def _get_session(self, session_id: str) -> Optional[Dict]:
        """Obtiene sesión del caché"""
        # Implementar con Redis o similar
        pass
    
    async def _prepare_initial_content(
        self,
        destination: Optional[TouristDestination],
        language: str
    ) -> Dict[str, Any]:
        """Prepara contenido inicial para el tour"""
        if not destination:
            return {
                'type': 'welcome',
                'title': 'Bienvenido al Tour Virtual',
                'content': 'Activa tu GPS para comenzar a explorar',
                'audio_url': None
            }
        
        # Buscar contenido en el idioma solicitado
        content = self.db.query(DestinationContent).filter(
            and_(
                DestinationContent.destination_id == destination.id,
                DestinationContent.language == language,
                DestinationContent.is_approved == True
            )
        ).first()
        
        if content:
            return {
                'type': 'destination',
                'title': destination.name,
                'content': content.content_text[:500],
                'audio_url': content.media_url,
                'full_content_id': content.id
            }
        
        return {
            'type': 'destination',
            'title': destination.name,
            'content': destination.short_description,
            'audio_url': None
        }
    
    async def _check_proximity_triggers(
        self,
        current_location: Tuple[float, float],
        destinations: List[int],
        visited: List[int]
    ) -> List[Dict[str, Any]]:
        """Verifica proximidad a destinos para activar contenido"""
        triggered = []
        
        for dest_id in destinations:
            if dest_id in visited:
                continue
            
            dest = self.db.query(TouristDestination).filter_by(id=dest_id).first()
            if not dest:
                continue
            
            dest_location = (dest.latitude, dest.longitude)
            distance = geodesic(current_location, dest_location).meters
            
            if distance <= dest.gps_radius_meters:
                triggered.append({
                    'destination_id': dest_id,
                    'distance_m': distance,
                    'trigger_content': distance <= dest.gps_radius_meters / 2
                })
        
        return triggered
    
    async def _get_triggered_content(
        self,
        destination_id: int,
        distance_m: float,
        language: str
    ) -> Dict[str, Any]:
        """Obtiene contenido activado por proximidad"""
        # Buscar contenido apropiado según distancia
        content_type = 'arrival' if distance_m < 20 else 'approaching'
        
        content = self.db.query(DestinationContent).filter(
            and_(
                DestinationContent.destination_id == destination_id,
                DestinationContent.language == language
            )
        ).first()
        
        if content:
            return {
                'type': content_type,
                'destination_id': destination_id,
                'title': content.title,
                'content': content.content_text[:300],
                'audio_url': content.media_url,
                'auto_play': True
            }
        
        return None
    
    async def _get_nearby_pois(
        self,
        location: Tuple[float, float],
        radius_m: float = 50
    ) -> List[Dict[str, Any]]:
        """Obtiene puntos de interés cercanos"""
        lat, lng = location
        
        # Convertir radio a grados aproximados
        lat_range = radius_m / 111000
        lng_range = radius_m / (111000 * math.cos(math.radians(lat)))
        
        pois = self.db.query(PointOfInterest).filter(
            and_(
                PointOfInterest.latitude.between(lat - lat_range, lat + lat_range),
                PointOfInterest.longitude.between(lng - lng_range, lng + lng_range)
            )
        ).all()
        
        result = []
        for poi in pois:
            poi_location = (poi.latitude, poi.longitude)
            distance = geodesic(location, poi_location).meters
            
            if distance <= radius_m:
                result.append({
                    'id': poi.id,
                    'name': poi.name,
                    'distance_m': round(distance),
                    'quick_fact': poi.quick_fact,
                    'has_ar': poi.ar_content_url is not None
                })
        
        return sorted(result, key=lambda x: x['distance_m'])
    
    def _update_navigation(
        self,
        current_location: Tuple[float, float],
        waypoints: List[Dict],
        current_index: int
    ) -> Dict[str, Any]:
        """Actualiza instrucciones de navegación"""
        if current_index >= len(waypoints):
            return {
                'status': 'completed',
                'message': 'Has completado la ruta'
            }
        
        current_waypoint = waypoints[current_index]
        waypoint_location = (current_waypoint['lat'], current_waypoint['lng'])
        
        distance = geodesic(current_location, waypoint_location).meters
        bearing = self._calculate_bearing(current_location, waypoint_location)
        
        # Determinar si llegó
        arrived = distance < 20
        
        # Generar instrucciones
        if distance < 50:
            instruction = f"Estás llegando a {current_waypoint.get('name', 'tu destino')}"
        elif distance < 200:
            instruction = f"Continúa {self._format_distance(distance)} hacia el {self._bearing_to_compass(bearing)}"
        else:
            instruction = f"Dirígete {self._format_distance(distance)} hacia el {self._bearing_to_compass(bearing)}"
        
        return {
            'status': 'navigating',
            'current_waypoint': current_index,
            'distance_to_next': distance,
            'bearing': bearing,
            'instruction': instruction,
            'arrived_at_destination': arrived,
            'destination_name': current_waypoint.get('name')
        }
    
    async def _notify_channel_event(
        self,
        channel_id: int,
        event_type: str,
        data: Dict[str, Any]
    ):
        """Notifica eventos a participantes del canal"""
        # Implementar con WebSockets o servicio de notificaciones push
        participants = self.db.query(ChannelParticipant).filter_by(
            channel_id=channel_id,
            status=CommunicationStatus.ACTIVE
        ).all()
        
        for participant in participants:
            if participant.device_token:
                await self.notification_service.send_push(
                    device_token=participant.device_token,
                    event_type=event_type,
                    data=data
                )
    
    async def _send_emergency_notification(
        self,
        channel_id: int,
        sender_id: int,
        message: str
    ):
        """Envía notificación de emergencia"""
        # Implementar notificación urgente
        pass

# =============== SERVICIOS AUXILIARES ===============

class AIContentGenerator:
    """Servicio de generación de contenido con IA"""
    
    async def generate_historical_content(
        self,
        destination_name: str,
        context: Dict,
        language: str
    ) -> Dict[str, Any]:
        """Genera contenido histórico"""
        prompt = f"""
        Genera una descripción histórica detallada de {destination_name}.
        Contexto: {json.dumps(context)}
        
        Incluye:
        1. Origen e historia antigua
        2. Eventos históricos importantes
        3. Figuras históricas relevantes
        4. Evolución a través del tiempo
        5. Importancia histórica actual
        
        Tono: Educativo pero accesible
        Idioma: {language}
        Longitud: 500-800 palabras
        """
        
        # Llamar a API de IA (OpenAI, Claude, etc.)
        # Por ahora retornamos ejemplo
        return {
            'title': f"Historia de {destination_name}",
            'content': "Contenido histórico generado...",
            'historical_context': {
                'periods': ['Antiguo', 'Medieval', 'Moderno'],
                'key_events': [],
                'important_figures': []
            }
        }
    
    async def generate_religious_content(
        self,
        destination_name: str,
        context: Dict,
        language: str,
        include_biblical: bool = False
    ) -> Dict[str, Any]:
        """Genera contenido religioso"""
        prompt = f"""
        Genera una descripción religiosa y espiritual de {destination_name}.
        
        Incluye:
        1. Significado religioso del lugar
        2. Eventos religiosos importantes
        3. Conexión con textos sagrados
        {'4. Referencias bíblicas específicas' if include_biblical else ''}
        5. Importancia para peregrinos
        
        Tono: Respetuoso, neutral entre religiones
        Idioma: {language}
        """
        
        return {
            'title': f"Significado Religioso de {destination_name}",
            'content': "Contenido religioso generado...",
            'religious_context': {
                'religions': ['Cristianismo', 'Judaísmo', 'Islam'],
                'significance': 'Alta'
            },
            'biblical_references': [] if include_biblical else None
        }

class AudioNarrationService:
    """Servicio de narración de audio"""
    
    async def generate_narration(
        self,
        text: str,
        voice: str,
        language: str,
        speed: float,
        include_pauses: bool
    ) -> Dict[str, Any]:
        """Genera narración de audio desde texto"""
        # Implementar con servicio TTS
        return {
            'audio_url': 'https://example.com/audio.mp3',
            'duration': 180,
            'quality_score': 0.95
        }
    
    async def add_background_music(
        self,
        audio_url: str,
        music_style: str,
        volume: float
    ) -> Dict[str, Any]:
        """Agrega música de fondo al audio"""
        return {
            'audio_url': audio_url,
            'has_music': True
        }

class NotificationService:
    """Servicio de notificaciones"""
    
    async def send_push(
        self,
        device_token: str,
        event_type: str,
        data: Dict[str, Any]
    ):
        """Envía notificación push"""
        # Implementar con servicio de push notifications
        pass