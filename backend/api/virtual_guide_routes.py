# Virtual Guide API Routes
# Endpoints para la aplicación móvil de guía virtual

from fastapi import APIRouter, Depends, HTTPException, Query, Body, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Any
from datetime import datetime, date
from pydantic import BaseModel, Field
import asyncio
import json

from database import get_db
from ..virtual_guide.guide_service import VirtualGuideService
from ..virtual_guide.models import GuideMode, ContentType, ContentFormat
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/guide", tags=["Virtual Guide"])

# ============= MODELOS PYDANTIC =============

class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: float = Field(10.0, ge=0)
    heading: Optional[float] = Field(None, ge=0, le=360)
    speed: Optional[float] = Field(None, ge=0)
    altitude: Optional[float] = None

class NearbyRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(1.0, gt=0, le=10)
    content_types: Optional[List[str]] = None
    limit: int = Field(10, ge=1, le=50)

class StartTourRequest(BaseModel):
    route_id: Optional[int] = None
    language: str = Field("es", min_length=2, max_length=5)
    mode: str = Field("gps_live")
    auto_play: bool = True
    offline_mode: bool = False

class ContentGenerationRequest(BaseModel):
    destination_id: int
    content_type: str = Field("general")
    language: str = Field("es")
    target_audience: str = Field("general")
    auto_approve: bool = False
    include_audio: bool = False

class AudioGuideRequest(BaseModel):
    destination_id: int
    language: str = Field("es")
    voice: str = Field("default")
    include_music: bool = False
    speed: float = Field(1.0, ge=0.5, le=2.0)

class JoinChannelRequest(BaseModel):
    channel_code: str = Field(..., min_length=6, max_length=10)
    role: str = Field("tourist")

class ShareLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: Optional[str] = Field(None, max_length=200)
    photo_url: Optional[str] = None
    expires_minutes: int = Field(30, ge=5, le=120)

class SendMessageRequest(BaseModel):
    message_type: str = Field("text")
    text: Optional[str] = Field(None, max_length=1000)
    media_url: Optional[str] = None
    is_announcement: bool = False
    is_emergency: bool = False

# ============= ENDPOINTS DE NAVEGACIÓN GPS =============

@router.post("/nearby")
async def get_nearby_destinations(
    request: NearbyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene destinos turísticos cercanos a la ubicación actual
    """
    try:
        service = VirtualGuideService(db)
        
        # Convertir tipos de contenido si se proporcionan
        content_types = None
        if request.content_types:
            content_types = [ContentType[ct.upper()] for ct in request.content_types]
        
        destinations = await service.get_nearby_destinations(
            latitude=request.latitude,
            longitude=request.longitude,
            radius_km=request.radius_km,
            content_types=content_types,
            limit=request.limit
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "destinations": destinations,
                    "total": len(destinations),
                    "center": {
                        "lat": request.latitude,
                        "lng": request.longitude
                    },
                    "radius_km": request.radius_km
                },
                "message": f"Found {len(destinations)} nearby destinations"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching nearby destinations: {str(e)}")

@router.post("/tour/start")
async def start_guided_tour(
    request: StartTourRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Inicia un tour guiado por GPS
    """
    try:
        service = VirtualGuideService(db)
        
        tour_session = await service.start_gps_guided_tour(
            user_id=current_user['id'],
            route_id=request.route_id,
            language=request.language
        )
        
        return JSONResponse(
            status_code=201,
            content={
                "status": "success",
                "data": tour_session,
                "message": "Tour started successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting tour: {str(e)}")

@router.put("/tour/{session_id}/location")
async def update_tour_location(
    session_id: str,
    location: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza la ubicación del usuario durante el tour y recibe contenido activado por proximidad
    """
    try:
        service = VirtualGuideService(db)
        
        update_result = await service.update_user_location(
            session_id=session_id,
            latitude=location.latitude,
            longitude=location.longitude,
            accuracy=location.accuracy,
            heading=location.heading,
            speed=location.speed
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": update_result,
                "message": "Location updated"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating location: {str(e)}")

@router.get("/tour/{session_id}/status")
async def get_tour_status(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el estado actual del tour
    """
    try:
        service = VirtualGuideService(db)
        
        # Obtener sesión del caché
        session = service._get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Tour session not found")
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "session_id": session_id,
                    "mode": session.get('mode'),
                    "current_destination_index": session.get('current_destination_index'),
                    "visited_destinations": session.get('visited_destinations', []),
                    "start_time": session.get('start_time'),
                    "last_location": session.get('last_location')
                },
                "message": "Tour status retrieved"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting tour status: {str(e)}")

# ============= ENDPOINTS DE CONTENIDO =============

@router.post("/content/generate")
async def generate_content(
    request: ContentGenerationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera contenido turístico usando IA
    """
    try:
        service = VirtualGuideService(db)
        
        result = await service.generate_destination_content(
            destination_id=request.destination_id,
            content_type=request.content_type,
            language=request.language,
            target_audience=request.target_audience,
            auto_approve=request.auto_approve
        )
        
        # Si se solicita audio, generarlo también
        if request.include_audio and result['status'] == 'approved':
            audio_result = await service.generate_audio_guide(
                destination_id=request.destination_id,
                language=request.language
            )
            result['audio_guide'] = audio_result
        
        return JSONResponse(
            status_code=201,
            content={
                "status": "success",
                "data": result,
                "message": "Content generated successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating content: {str(e)}")

@router.post("/audio/generate")
async def generate_audio_guide(
    request: AudioGuideRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera una audioguía narrada para un destino
    """
    try:
        service = VirtualGuideService(db)
        
        audio_guide = await service.generate_audio_guide(
            destination_id=request.destination_id,
            language=request.language,
            voice=request.voice,
            include_music=request.include_music
        )
        
        return JSONResponse(
            status_code=201,
            content={
                "status": "success",
                "data": audio_guide,
                "message": "Audio guide generated successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating audio guide: {str(e)}")

@router.get("/destination/{destination_id}/content")
async def get_destination_content(
    destination_id: int,
    language: str = Query("es"),
    content_format: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el contenido disponible para un destino
    """
    try:
        from ..virtual_guide.models import DestinationContent, AudioGuide
        
        # Obtener contenidos
        query = db.query(DestinationContent).filter(
            DestinationContent.destination_id == destination_id,
            DestinationContent.language == language,
            DestinationContent.is_approved == True
        )
        
        if content_format:
            query = query.filter(DestinationContent.content_format == ContentFormat[content_format.upper()])
        
        contents = query.all()
        
        # Obtener audioguías
        audio_guides = db.query(AudioGuide).filter(
            AudioGuide.destination_id == destination_id,
            AudioGuide.language == language
        ).all()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "destination_id": destination_id,
                    "contents": [
                        {
                            "id": c.id,
                            "title": c.title,
                            "format": c.content_format.value,
                            "type": c.content_type.value if c.content_type else None,
                            "preview": c.content_text[:200] if c.content_text else None,
                            "media_url": c.media_url
                        }
                        for c in contents
                    ],
                    "audio_guides": [
                        {
                            "id": a.id,
                            "title": a.title,
                            "duration_seconds": a.duration_seconds,
                            "audio_url": a.audio_url,
                            "has_chapters": bool(a.chapters)
                        }
                        for a in audio_guides
                    ]
                },
                "message": "Content retrieved successfully"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving content: {str(e)}")

# ============= ENDPOINTS DE COMUNICACIÓN =============

@router.post("/communication/channel/create")
async def create_communication_channel(
    booking_id: int = Body(...),
    guide_id: int = Body(...),
    driver_id: Optional[int] = Body(None),
    tour_date: Optional[date] = Body(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un canal de comunicación para un tour
    """
    try:
        service = VirtualGuideService(db)
        
        channel = await service.create_tour_communication_channel(
            booking_id=booking_id,
            guide_id=guide_id,
            driver_id=driver_id,
            tour_date=tour_date
        )
        
        return JSONResponse(
            status_code=201,
            content={
                "status": "success",
                "data": channel,
                "message": "Communication channel created"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating channel: {str(e)}")

@router.post("/communication/channel/join")
async def join_communication_channel(
    request: JoinChannelRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Usuario se une a un canal de comunicación usando el código
    """
    try:
        service = VirtualGuideService(db)
        
        result = await service.join_communication_channel(
            channel_code=request.channel_code,
            user_id=current_user['id'],
            role=request.role
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": result,
                "message": "Joined channel successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error joining channel: {str(e)}")

@router.post("/communication/channel/{channel_id}/location")
async def share_location_in_channel(
    channel_id: int,
    request: ShareLocationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Comparte ubicación temporal en el canal
    """
    try:
        service = VirtualGuideService(db)
        
        result = await service.share_location(
            channel_id=channel_id,
            user_id=current_user['id'],
            latitude=request.latitude,
            longitude=request.longitude,
            description=request.description,
            photo_url=request.photo_url,
            expires_minutes=request.expires_minutes
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": result,
                "message": "Location shared successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sharing location: {str(e)}")

@router.post("/communication/channel/{channel_id}/message")
async def send_message_in_channel(
    channel_id: int,
    request: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Envía un mensaje en el canal de comunicación
    """
    try:
        service = VirtualGuideService(db)
        
        result = await service.send_channel_message(
            channel_id=channel_id,
            user_id=current_user['id'],
            message_type=request.message_type,
            text=request.text,
            media_url=request.media_url,
            is_announcement=request.is_announcement,
            is_emergency=request.is_emergency
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": result,
                "message": "Message sent successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@router.get("/communication/channel/{channel_id}/participants")
async def get_channel_participants(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene la lista de participantes y sus ubicaciones
    """
    try:
        from ..virtual_guide.models import ChannelParticipant, CommunicationStatus
        
        participants = db.query(ChannelParticipant).filter(
            ChannelParticipant.channel_id == channel_id,
            ChannelParticipant.status == CommunicationStatus.ACTIVE
        ).all()
        
        participant_list = []
        for p in participants:
            participant_data = {
                "user_id": p.user_id,
                "role": p.role,
                "display_name": p.display_name,
                "status": p.status.value,
                "last_seen": p.last_seen.isoformat() if p.last_seen else None
            }
            
            # Incluir ubicación si está compartida y es reciente
            if p.current_latitude and p.current_longitude and p.location_updated_at:
                time_diff = (datetime.utcnow() - p.location_updated_at).seconds
                if time_diff < 300:  # Menos de 5 minutos
                    participant_data["location"] = {
                        "lat": p.current_latitude,
                        "lng": p.current_longitude,
                        "updated_seconds_ago": time_diff
                    }
            
            participant_list.append(participant_data)
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "channel_id": channel_id,
                    "participants": participant_list,
                    "total": len(participant_list)
                },
                "message": "Participants retrieved successfully"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting participants: {str(e)}")

# ============= ENDPOINTS DE RUTAS Y MAPAS =============

@router.get("/routes")
async def get_available_routes(
    country: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    max_duration_hours: Optional[int] = Query(None),
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene rutas turísticas disponibles
    """
    try:
        from ..virtual_guide.models import TourRoute
        
        query = db.query(TourRoute)
        
        # Aplicar filtros
        # (Simplificado - en producción habría joins con destinos)
        
        if max_duration_hours:
            max_minutes = max_duration_hours * 60
            query = query.filter(TourRoute.estimated_duration_minutes <= max_minutes)
        
        if difficulty:
            query = query.filter(TourRoute.difficulty_level == difficulty)
        
        routes = query.all()
        
        route_list = []
        for route in routes:
            route_list.append({
                "id": route.id,
                "name": route.name,
                "description": route.description,
                "type": route.route_type,
                "distance_km": route.total_distance_km,
                "duration_hours": route.estimated_duration_minutes / 60 if route.estimated_duration_minutes else None,
                "difficulty": route.difficulty_level,
                "accessibility": route.accessibility_score,
                "destination_count": len(route.destination_ids) if route.destination_ids else 0
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "routes": route_list,
                    "total": len(route_list)
                },
                "message": "Routes retrieved successfully"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting routes: {str(e)}")

@router.get("/routes/{route_id}")
async def get_route_details(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene los detalles completos de una ruta incluyendo waypoints
    """
    try:
        from ..virtual_guide.models import TourRoute, RouteSegment, TouristDestination
        
        route = db.query(TourRoute).filter_by(id=route_id).first()
        
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")
        
        # Obtener segmentos
        segments = db.query(RouteSegment).filter_by(
            tour_route_id=route_id
        ).order_by(RouteSegment.segment_order).all()
        
        # Obtener destinos
        destinations = []
        if route.destination_ids:
            for dest_id in route.destination_ids:
                dest = db.query(TouristDestination).filter_by(id=dest_id).first()
                if dest:
                    destinations.append({
                        "id": dest.id,
                        "name": dest.name,
                        "lat": dest.latitude,
                        "lng": dest.longitude,
                        "visit_duration_minutes": dest.average_visit_duration_minutes
                    })
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "route": {
                        "id": route.id,
                        "name": route.name,
                        "description": route.description,
                        "type": route.route_type,
                        "total_distance_km": route.total_distance_km,
                        "estimated_duration_minutes": route.estimated_duration_minutes,
                        "waypoints": route.waypoints,
                        "destinations": destinations,
                        "segments": [
                            {
                                "order": s.segment_order,
                                "distance_km": s.distance_km,
                                "time_minutes": s.estimated_time_minutes,
                                "transport": s.transport_mode,
                                "instructions": s.navigation_instructions
                            }
                            for s in segments
                        ],
                        "offline_map_url": route.offline_map_url
                    }
                },
                "message": "Route details retrieved successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting route details: {str(e)}")

# ============= WEBSOCKET PARA ACTUALIZACIONES EN TIEMPO REAL =============

@router.websocket("/ws/tour/{session_id}")
async def websocket_tour_updates(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket para actualizaciones en tiempo real durante el tour
    """
    await websocket.accept()
    
    try:
        service = VirtualGuideService(db)
        
        while True:
            # Recibir actualización de ubicación
            data = await websocket.receive_text()
            location_data = json.loads(data)
            
            # Procesar actualización
            if location_data.get('type') == 'location_update':
                result = await service.update_user_location(
                    session_id=session_id,
                    latitude=location_data['latitude'],
                    longitude=location_data['longitude'],
                    accuracy=location_data.get('accuracy', 10),
                    heading=location_data.get('heading'),
                    speed=location_data.get('speed')
                )
                
                # Enviar respuesta
                await websocket.send_json({
                    'type': 'tour_update',
                    'data': result
                })
                
                # Si hay contenido activado, enviarlo
                if result.get('triggered_content'):
                    for content in result['triggered_content']:
                        await websocket.send_json({
                            'type': 'content_triggered',
                            'data': content
                        })
            
            elif location_data.get('type') == 'ping':
                # Mantener conexión viva
                await websocket.send_json({'type': 'pong'})
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            'type': 'error',
            'message': str(e)
        })
        await websocket.close()

@router.websocket("/ws/channel/{channel_id}")
async def websocket_channel_communication(
    websocket: WebSocket,
    channel_id: int,
    db: Session = Depends(get_db)
):
    """
    WebSocket para comunicación en tiempo real del canal del tour
    """
    await websocket.accept()
    
    try:
        from ..virtual_guide.models import ChannelParticipant
        
        # Verificar que el usuario pertenece al canal
        # (Simplificado - en producción verificaríamos autenticación)
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get('type') == 'location_update':
                # Actualizar ubicación del participante
                participant = db.query(ChannelParticipant).filter_by(
                    channel_id=channel_id,
                    user_id=message_data.get('user_id')
                ).first()
                
                if participant:
                    participant.current_latitude = message_data['latitude']
                    participant.current_longitude = message_data['longitude']
                    participant.location_updated_at = datetime.utcnow()
                    db.commit()
                    
                    # Broadcast a otros participantes
                    await websocket.send_json({
                        'type': 'participant_location',
                        'data': {
                            'user_id': message_data['user_id'],
                            'lat': message_data['latitude'],
                            'lng': message_data['longitude']
                        }
                    })
            
            elif message_data.get('type') == 'message':
                # Reenviar mensaje a todos los participantes
                await websocket.send_json({
                    'type': 'new_message',
                    'data': message_data.get('content')
                })
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close()

# ============= ENDPOINTS DE PREFERENCIAS =============

@router.get("/preferences")
async def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene las preferencias del usuario para el guía virtual
    """
    try:
        from ..virtual_guide.models import UserPreferences
        
        preferences = db.query(UserPreferences).filter_by(
            user_id=current_user['id']
        ).first()
        
        if not preferences:
            # Crear preferencias por defecto
            preferences = UserPreferences(
                user_id=current_user['id'],
                preferred_language='es',
                audio_speed=1.0,
                auto_play_enabled=True
            )
            db.add(preferences)
            db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "language": preferences.preferred_language,
                    "interests": preferences.content_interests,
                    "religious_affiliation": preferences.religious_affiliation,
                    "audio": {
                        "voice": preferences.preferred_narrator_voice,
                        "speed": preferences.audio_speed,
                        "auto_play": preferences.auto_play_enabled,
                        "background_music": preferences.background_music_enabled
                    },
                    "navigation": {
                        "map_style": preferences.preferred_map_style,
                        "voice_enabled": preferences.navigation_voice_enabled,
                        "metric_units": preferences.metric_units
                    },
                    "accessibility": {
                        "large_text": preferences.large_text,
                        "high_contrast": preferences.high_contrast,
                        "screen_reader": preferences.screen_reader_optimized
                    },
                    "privacy": {
                        "location_tracking": preferences.location_tracking_enabled,
                        "analytics": preferences.analytics_enabled
                    },
                    "notifications": {
                        "nearby_alerts": preferences.nearby_attraction_alerts,
                        "tour_reminders": preferences.tour_reminders,
                        "group_notifications": preferences.group_notifications
                    }
                },
                "message": "Preferences retrieved successfully"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting preferences: {str(e)}")

@router.put("/preferences")
async def update_user_preferences(
    preferences: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza las preferencias del usuario
    """
    try:
        from ..virtual_guide.models import UserPreferences
        
        user_prefs = db.query(UserPreferences).filter_by(
            user_id=current_user['id']
        ).first()
        
        if not user_prefs:
            user_prefs = UserPreferences(user_id=current_user['id'])
            db.add(user_prefs)
        
        # Actualizar campos permitidos
        allowed_fields = [
            'preferred_language', 'content_interests', 'religious_affiliation',
            'preferred_narrator_voice', 'audio_speed', 'auto_play_enabled',
            'background_music_enabled', 'preferred_map_style', 'navigation_voice_enabled',
            'metric_units', 'large_text', 'high_contrast', 'screen_reader_optimized',
            'location_tracking_enabled', 'analytics_enabled', 'nearby_attraction_alerts',
            'tour_reminders', 'group_notifications'
        ]
        
        for field in allowed_fields:
            if field in preferences:
                setattr(user_prefs, field, preferences[field])
        
        user_prefs.updated_at = datetime.utcnow()
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {"updated_fields": list(preferences.keys())},
                "message": "Preferences updated successfully"
            }
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating preferences: {str(e)}")