# Virtual Guide System Models
# Sistema completo de guía virtual con GPS y contenido inteligente

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Date, Time, Enum, Index, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import enum
import uuid

Base = declarative_base()

class ContentType(enum.Enum):
    """Tipos de contenido turístico"""
    HISTORICAL = "historical"
    RELIGIOUS = "religious"
    CULTURAL = "cultural"
    NATURAL = "natural"
    ARCHITECTURAL = "architectural"
    GASTRONOMIC = "gastronomic"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"

class ContentFormat(enum.Enum):
    """Formatos de contenido"""
    TEXT = "text"
    AUDIO = "audio"
    VIDEO = "video"
    IMAGE = "image"
    AR = "augmented_reality"
    VR = "virtual_reality"
    INTERACTIVE_MAP = "interactive_map"

class GuideMode(enum.Enum):
    """Modos de guía virtual"""
    GPS_LIVE = "gps_live"  # Guía en vivo basado en ubicación
    MANUAL = "manual"  # Selección manual del usuario
    ROUTE_BASED = "route_based"  # Siguiendo ruta predefinida
    OFFLINE = "offline"  # Modo sin conexión
    AR_ENHANCED = "ar_enhanced"  # Con realidad aumentada

class CommunicationStatus(enum.Enum):
    """Estados de comunicación"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    EMERGENCY = "emergency"
    DO_NOT_DISTURB = "dnd"

# ==================== MODELOS DE CONTENIDO ====================

class TouristDestination(Base):
    """Destinos turísticos principales"""
    __tablename__ = 'tourist_destinations'
    
    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    name = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100))
    region = Column(String(100))
    
    # Ubicación GPS
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    gps_radius_meters = Column(Integer, default=50)  # Radio de activación GPS
    
    # Clasificación
    content_types = Column(ARRAY(String))  # Múltiples tipos
    primary_type = Column(Enum(ContentType), nullable=False)
    importance_level = Column(Integer, default=3)  # 1-5 (5 más importante)
    unesco_site = Column(Boolean, default=False)
    
    # Información básica
    short_description = Column(Text)
    full_description = Column(JSON)  # Descripciones en múltiples idiomas
    historical_period = Column(String(100))
    establishment_date = Column(String(100))
    
    # Horarios y acceso
    opening_hours = Column(JSON)  # {"monday": {"open": "09:00", "close": "18:00"}}
    admission_fee = Column(JSON)  # {"adult": 20, "child": 10, "currency": "USD"}
    accessibility_info = Column(JSON)
    best_visit_time = Column(JSON)  # {"months": [3,4,5], "time_of_day": "morning"}
    average_visit_duration_minutes = Column(Integer, default=60)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relaciones
    contents = relationship("DestinationContent", back_populates="destination")
    audio_guides = relationship("AudioGuide", back_populates="destination")
    points_of_interest = relationship("PointOfInterest", back_populates="destination")
    visitor_reviews = relationship("VisitorReview", back_populates="destination")
    
    # Índices para búsqueda rápida por ubicación
    __table_args__ = (
        Index('idx_destination_location', 'latitude', 'longitude'),
        Index('idx_destination_country_city', 'country', 'city'),
    )

class DestinationContent(Base):
    """Contenido multimedia de cada destino"""
    __tablename__ = 'destination_contents'
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    
    # Tipo y formato
    content_format = Column(Enum(ContentFormat), nullable=False)
    content_type = Column(Enum(ContentType))
    language = Column(String(10), default='es')  # ISO 639-1
    
    # Contenido
    title = Column(String(255), nullable=False)
    content_text = Column(Text)  # Para texto
    media_url = Column(String(500))  # Para audio/video/imagen
    media_duration_seconds = Column(Integer)  # Para audio/video
    
    # Narración y voz
    narrator_voice = Column(String(50))  # ID de voz TTS o narrador
    narration_speed = Column(Float, default=1.0)
    background_music_url = Column(String(500))
    
    # Contenido específico religioso/histórico
    religious_context = Column(JSON)  # {"religion": "Christianity", "significance": "..."}
    historical_context = Column(JSON)  # {"period": "Roman", "events": [...]}
    biblical_references = Column(JSON)  # Para Tierra Santa
    
    # Orden y navegación
    sequence_order = Column(Integer, default=0)
    parent_content_id = Column(Integer, ForeignKey('destination_contents.id'))
    related_contents = Column(ARRAY(Integer))  # IDs de contenidos relacionados
    
    # Control de calidad
    is_approved = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey('users.id'))
    approved_at = Column(DateTime)
    ai_quality_score = Column(Float)  # 0-1 score de calidad por IA
    
    # Estadísticas de uso
    view_count = Column(Integer, default=0)
    avg_rating = Column(Float)
    completion_rate = Column(Float)  # % de usuarios que terminan el contenido
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    destination = relationship("TouristDestination", back_populates="contents")

class AudioGuide(Base):
    """Guías de audio narradas"""
    __tablename__ = 'audio_guides'
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    
    # Información básica
    title = Column(String(255), nullable=False)
    description = Column(Text)
    language = Column(String(10), default='es')
    duration_seconds = Column(Integer, nullable=False)
    
    # Archivos de audio
    audio_url = Column(String(500), nullable=False)
    transcript = Column(Text)  # Transcripción del audio
    subtitles_url = Column(String(500))  # Archivo SRT de subtítulos
    
    # Configuración de reproducción
    auto_play_on_arrival = Column(Boolean, default=True)
    gps_trigger_points = Column(JSON)  # [{"lat": 31.7, "lng": 35.2, "radius": 10}]
    chapters = Column(JSON)  # [{"time": 0, "title": "Introducción", "description": "..."}]
    
    # Personalización por tipo de visitante
    visitor_profiles = Column(JSON)  # {"religious": "emphasis_on_faith", "historical": "dates_and_facts"}
    age_appropriate = Column(JSON)  # {"min": 10, "max": 100}
    
    # Calidad y estadísticas
    professional_narrator = Column(Boolean, default=False)
    ai_generated = Column(Boolean, default=False)
    quality_rating = Column(Float)
    play_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    destination = relationship("TouristDestination", back_populates="audio_guides")

class PointOfInterest(Base):
    """Puntos de interés específicos dentro de un destino"""
    __tablename__ = 'points_of_interest'
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    
    # Información básica
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Ubicación precisa
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    floor_level = Column(Integer)  # Para edificios con múltiples pisos
    indoor_location = Column(String(255))  # "Nave principal", "Jardín norte", etc.
    
    # Activación por proximidad
    proximity_radius_meters = Column(Integer, default=10)
    min_dwell_time_seconds = Column(Integer, default=5)  # Tiempo mínimo para activar
    
    # Contenido específico
    quick_fact = Column(Text)  # Dato rápido para mostrar
    detailed_info = Column(JSON)  # Información detallada multiidioma
    ar_content_url = Column(String(500))  # Contenido de realidad aumentada
    
    # Orden en la ruta
    suggested_visit_order = Column(Integer)
    is_must_see = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    destination = relationship("TouristDestination", back_populates="points_of_interest")

# ==================== SISTEMA DE RUTAS Y NAVEGACIÓN ====================

class TourRoute(Base):
    """Rutas turísticas predefinidas"""
    __tablename__ = 'tour_routes'
    
    id = Column(Integer, primary_key=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    
    # Información básica
    name = Column(String(255), nullable=False)
    description = Column(Text)
    route_type = Column(String(50))  # "walking", "driving", "mixed"
    
    # Duración y distancia
    total_distance_km = Column(Float)
    estimated_duration_minutes = Column(Integer)
    walking_distance_km = Column(Float)
    
    # Destinos en la ruta
    destination_ids = Column(ARRAY(Integer))  # IDs en orden de visita
    waypoints = Column(JSON)  # Puntos GPS detallados de la ruta
    
    # Configuración de navegación
    navigation_mode = Column(String(50))  # "turn_by_turn", "overview"
    offline_map_url = Column(String(500))  # Mapa descargable
    
    # Recomendaciones
    best_start_time = Column(Time)
    difficulty_level = Column(Integer)  # 1-5
    accessibility_score = Column(Integer)  # 1-5
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    route_segments = relationship("RouteSegment", back_populates="tour_route")

class RouteSegment(Base):
    """Segmentos individuales de una ruta"""
    __tablename__ = 'route_segments'
    
    id = Column(Integer, primary_key=True)
    tour_route_id = Column(Integer, ForeignKey('tour_routes.id'))
    
    # Puntos de inicio y fin
    start_point_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    end_point_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    
    # Detalles del segmento
    segment_order = Column(Integer, nullable=False)
    distance_km = Column(Float)
    estimated_time_minutes = Column(Integer)
    transport_mode = Column(String(50))  # "walk", "bus", "taxi"
    
    # Instrucciones de navegación
    navigation_instructions = Column(JSON)  # Paso a paso
    polyline_points = Column(Text)  # Encoded polyline para el mapa
    
    # Alertas y notas
    alerts = Column(JSON)  # ["Cruzar calle con cuidado", "Zona concurrida"]
    rest_stops = Column(JSON)  # Puntos de descanso en el segmento
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    tour_route = relationship("TourRoute", back_populates="route_segments")

# ==================== SISTEMA DE COMUNICACIÓN ====================

class TourCommunicationChannel(Base):
    """Canales de comunicación para tours activos"""
    __tablename__ = 'tour_communication_channels'
    
    id = Column(Integer, primary_key=True)
    channel_code = Column(String(20), unique=True, nullable=False)  # Código único del tour
    booking_id = Column(Integer, ForeignKey('bookings.id'))
    
    # Participantes
    guide_id = Column(Integer, ForeignKey('users.id'))
    driver_id = Column(Integer, ForeignKey('users.id'))
    tour_date = Column(Date, nullable=False)
    
    # Estado del canal
    is_active = Column(Boolean, default=True)
    activated_at = Column(DateTime)
    expires_at = Column(DateTime)  # Auto-expiración después del tour
    
    # Configuración de privacidad
    location_sharing_enabled = Column(Boolean, default=True)
    photo_sharing_enabled = Column(Boolean, default=True)
    auto_delete_after_hours = Column(Integer, default=24)  # Borrar datos después del tour
    
    # Puntos de encuentro
    meeting_points = Column(JSON)  # [{"name": "Airport Gate 3", "lat": 31.7, "lng": 35.2, "time": "09:00"}]
    current_location = Column(JSON)  # {"lat": 31.7, "lng": 35.2, "updated_at": "2024-01-20T10:00:00"}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    messages = relationship("ChannelMessage", back_populates="channel")
    participants = relationship("ChannelParticipant", back_populates="channel")
    shared_locations = relationship("SharedLocation", back_populates="channel")

class ChannelParticipant(Base):
    """Participantes en un canal de comunicación"""
    __tablename__ = 'channel_participants'
    
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey('tour_communication_channels.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Rol en el canal
    role = Column(String(50))  # "tourist", "guide", "driver", "coordinator"
    display_name = Column(String(100))
    avatar_url = Column(String(500))
    
    # Estado y permisos
    status = Column(Enum(CommunicationStatus), default=CommunicationStatus.ACTIVE)
    can_share_location = Column(Boolean, default=True)
    can_send_messages = Column(Boolean, default=True)
    can_make_calls = Column(Boolean, default=False)
    
    # Información de conexión
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime)
    device_token = Column(String(255))  # Para notificaciones push
    
    # Ubicación actual (temporal)
    current_latitude = Column(Float)
    current_longitude = Column(Float)
    location_updated_at = Column(DateTime)
    location_accuracy_meters = Column(Float)
    
    # Relaciones
    channel = relationship("TourCommunicationChannel", back_populates="participants")

class ChannelMessage(Base):
    """Mensajes en el canal de comunicación"""
    __tablename__ = 'channel_messages'
    
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey('tour_communication_channels.id'))
    sender_id = Column(Integer, ForeignKey('users.id'))
    
    # Contenido del mensaje
    message_type = Column(String(50))  # "text", "image", "location", "audio", "emergency"
    text_content = Column(Text)
    media_url = Column(String(500))
    location_data = Column(JSON)  # {"lat": 31.7, "lng": 35.2, "address": "..."}
    
    # Metadata
    is_announcement = Column(Boolean, default=False)  # Mensaje del guía a todos
    is_emergency = Column(Boolean, default=False)
    read_by = Column(ARRAY(Integer))  # IDs de usuarios que leyeron
    
    # Auto-eliminación
    auto_delete_at = Column(DateTime)
    is_deleted = Column(Boolean, default=False)
    
    sent_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    channel = relationship("TourCommunicationChannel", back_populates="messages")

class SharedLocation(Base):
    """Ubicaciones compartidas temporalmente"""
    __tablename__ = 'shared_locations'
    
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey('tour_communication_channels.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Datos de ubicación
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    accuracy_meters = Column(Float)
    heading = Column(Float)  # Dirección de movimiento
    speed_kmh = Column(Float)
    
    # Contexto
    location_type = Column(String(50))  # "current", "meeting_point", "help_needed"
    description = Column(String(255))
    photo_url = Column(String(500))  # Foto del lugar para ayudar a ubicar
    
    # Privacidad
    shared_with = Column(ARRAY(Integer))  # IDs específicos o null para todos
    expires_at = Column(DateTime)  # Auto-expiración
    
    shared_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    channel = relationship("TourCommunicationChannel", back_populates="shared_locations")

# ==================== SISTEMA DE IA Y CONTENIDO ====================

class AIContentGeneration(Base):
    """Registro de contenido generado por IA"""
    __tablename__ = 'ai_content_generations'
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    
    # Solicitud de generación
    request_type = Column(String(50))  # "description", "audio_script", "tour_guide"
    prompt = Column(Text)
    language = Column(String(10))
    target_audience = Column(String(50))  # "general", "religious", "academic", "children"
    
    # Contenido generado
    generated_content = Column(Text)
    content_format = Column(String(50))
    word_count = Column(Integer)
    
    # Control de calidad
    ai_model = Column(String(50))  # "gpt-4", "claude", etc.
    quality_score = Column(Float)  # Score automático de calidad
    human_reviewed = Column(Boolean, default=False)
    approved = Column(Boolean, default=False)
    review_notes = Column(Text)
    
    # Metadata
    generation_time_ms = Column(Integer)
    tokens_used = Column(Integer)
    cost_usd = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime)
    reviewed_by = Column(Integer, ForeignKey('users.id'))

class ContentTemplate(Base):
    """Plantillas para generación de contenido"""
    __tablename__ = 'content_templates'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    template_type = Column(String(50))  # "destination", "religious_site", "historical"
    
    # Estructura del template
    structure = Column(JSON)  # Estructura JSON del contenido esperado
    required_fields = Column(ARRAY(String))
    optional_fields = Column(ARRAY(String))
    
    # Prompts para IA
    ai_prompts = Column(JSON)  # Prompts por sección
    tone_guidelines = Column(Text)
    word_limits = Column(JSON)  # {"introduction": 200, "history": 500}
    
    # Ejemplos
    example_content = Column(JSON)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==================== EXPERIENCIA OFFLINE ====================

class OfflinePackage(Base):
    """Paquetes descargables para uso offline"""
    __tablename__ = 'offline_packages'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Contenido del paquete
    destination_ids = Column(ARRAY(Integer))
    route_ids = Column(ARRAY(Integer))
    
    # Archivos
    package_size_mb = Column(Float)
    download_url = Column(String(500))
    map_tiles_url = Column(String(500))  # Mapas offline
    
    # Versión y actualizaciones
    version = Column(String(20))
    last_updated = Column(DateTime)
    expires_at = Column(DateTime)  # Forzar actualización después de esta fecha
    
    # Estadísticas
    download_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

# ==================== ANALYTICS Y FEEDBACK ====================

class VirtualGuideUsage(Base):
    """Registro de uso del guía virtual"""
    __tablename__ = 'virtual_guide_usage'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    session_id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    
    # Sesión
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # Modo de uso
    guide_mode = Column(Enum(GuideMode))
    destinations_visited = Column(ARRAY(Integer))
    contents_consumed = Column(ARRAY(Integer))
    
    # Interacciones
    total_interactions = Column(Integer, default=0)
    audio_plays = Column(Integer, default=0)
    map_views = Column(Integer, default=0)
    ar_sessions = Column(Integer, default=0)
    
    # Ubicación y movimiento
    distance_traveled_km = Column(Float)
    locations_tracked = Column(Integer)
    
    # Satisfacción
    user_rating = Column(Integer)  # 1-5
    feedback = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class VisitorReview(Base):
    """Reseñas y calificaciones de visitantes"""
    __tablename__ = 'visitor_reviews'
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey('tourist_destinations.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Calificación
    overall_rating = Column(Integer, nullable=False)  # 1-5
    content_quality_rating = Column(Integer)
    audio_guide_rating = Column(Integer)
    navigation_rating = Column(Integer)
    
    # Reseña
    review_title = Column(String(255))
    review_text = Column(Text)
    visit_date = Column(Date)
    
    # Metadata
    verified_visitor = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    destination = relationship("TouristDestination", back_populates="visitor_reviews")

# ==================== CONFIGURACIÓN Y PERSONALIZACIÓN ====================

class UserPreferences(Base):
    """Preferencias del usuario para el guía virtual"""
    __tablename__ = 'user_guide_preferences'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    
    # Preferencias de contenido
    preferred_language = Column(String(10), default='es')
    content_interests = Column(ARRAY(String))  # ["history", "religion", "architecture"]
    religious_affiliation = Column(String(50))  # Para personalizar contenido religioso
    
    # Preferencias de audio
    preferred_narrator_voice = Column(String(50))
    audio_speed = Column(Float, default=1.0)
    auto_play_enabled = Column(Boolean, default=True)
    background_music_enabled = Column(Boolean, default=False)
    
    # Preferencias de navegación
    preferred_map_style = Column(String(50))  # "satellite", "terrain", "standard"
    navigation_voice_enabled = Column(Boolean, default=True)
    metric_units = Column(Boolean, default=True)  # True=metric, False=imperial
    
    # Accesibilidad
    large_text = Column(Boolean, default=False)
    high_contrast = Column(Boolean, default=False)
    screen_reader_optimized = Column(Boolean, default=False)
    
    # Privacidad
    location_tracking_enabled = Column(Boolean, default=True)
    analytics_enabled = Column(Boolean, default=True)
    photo_backup_enabled = Column(Boolean, default=True)
    
    # Notificaciones
    nearby_attraction_alerts = Column(Boolean, default=True)
    tour_reminders = Column(Boolean, default=True)
    group_notifications = Column(Boolean, default=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Índices adicionales para búsquedas geoespaciales
Index('idx_poi_location', PointOfInterest.latitude, PointOfInterest.longitude)
Index('idx_shared_location', SharedLocation.latitude, SharedLocation.longitude)
Index('idx_participant_location', ChannelParticipant.current_latitude, ChannelParticipant.current_longitude)