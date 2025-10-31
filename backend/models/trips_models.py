"""
Spirit Tours - Trips Management Models
Sistema completo de gestión de reservas/viajes

Características:
- 10 estados granulares de viaje
- Soporte multi-canal (B2C, B2B, B2B2C)
- Tracking en tiempo real
- Gestión de comisiones
- Auditoría completa
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from enum import Enum
from sqlalchemy import (
    Column, String, Integer, DateTime, Numeric, Text, 
    ForeignKey, Boolean, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
import uuid

from database import Base


class TripStatus(str, Enum):
    """Estados detallados de viaje - 10 estados vs 4 de Expedia"""
    PENDING = "pending"  # Pendiente pago/confirmación
    UPCOMING = "upcoming"  # Confirmado, esperando fecha
    IN_PROGRESS = "in_progress"  # Tour activo
    COMPLETED = "completed"  # Finalizado exitosamente
    CANCELLED = "cancelled"  # Cancelado
    REFUNDED = "refunded"  # Reembolsado
    NO_SHOW = "no_show"  # Cliente no se presentó
    MODIFIED = "modified"  # Modificado/reprogramado
    WAITING_LIST = "waiting_list"  # En lista de espera
    PRIORITY = "priority"  # VIP/Prioritario


class TripChannel(str, Enum):
    """Canal de origen de la reserva"""
    B2C = "b2c"  # Directo del cliente
    B2B = "b2b"  # A través de agencia
    B2B2C = "b2b2c"  # Operador a través de agencia


class PaymentStatus(str, Enum):
    """Estado del pago"""
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class Trip(Base):
    """
    Modelo principal de Trip/Reserva
    Sistema superior a Expedia TAAP
    """
    __tablename__ = "trips"

    # Identificación
    trip_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_reference = Column(String(20), unique=True, nullable=False)
    
    # Estado y canal
    status = Column(String(20), nullable=False, default=TripStatus.PENDING)
    channel = Column(String(10), nullable=False)
    
    # Relaciones
    customer_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    agency_id = Column(UUID(as_uuid=True), ForeignKey('agencies.id'), nullable=True)
    operator_id = Column(UUID(as_uuid=True), ForeignKey('operators.id'), nullable=True)
    tour_id = Column(UUID(as_uuid=True), ForeignKey('tours.id'), nullable=False)
    guide_id = Column(UUID(as_uuid=True), ForeignKey('guides.id'), nullable=True)
    
    # Fechas
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    departure_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Financiero
    total_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0)
    commission_amount = Column(Numeric(10, 2), default=0)
    refund_amount = Column(Numeric(10, 2), default=0)
    payment_status = Column(String(20), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)
    currency = Column(String(3), default="USD")
    
    # Participantes
    participants_count = Column(Integer, default=1)
    participants = Column(JSONB, nullable=False)  # Lista de participantes
    lead_traveler_name = Column(String(255), nullable=False)
    lead_traveler_email = Column(String(255), nullable=False)
    lead_traveler_phone = Column(String(50), nullable=True)
    
    # Operacional
    special_requirements = Column(Text, nullable=True)
    dietary_restrictions = Column(JSONB, nullable=True)
    accessibility_needs = Column(JSONB, nullable=True)
    pickup_location = Column(JSONB, nullable=True)
    dropoff_location = Column(JSONB, nullable=True)
    
    # Tracking en tiempo real
    current_location = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)
    last_location_update = Column(DateTime, nullable=True)
    tracking_enabled = Column(Boolean, default=False)
    
    # Comunicación
    notifications_sent = Column(JSONB, default=list)
    last_notification_sent = Column(DateTime, nullable=True)
    chat_thread_id = Column(String(50), nullable=True)
    
    # Calidad y feedback
    rating = Column(Integer, nullable=True)  # 1-5
    review = Column(Text, nullable=True)
    review_date = Column(DateTime, nullable=True)
    nps_score = Column(Integer, nullable=True)  # 0-10
    
    # Cancelación/Modificación
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by = Column(UUID(as_uuid=True), nullable=True)
    modification_history = Column(JSONB, default=list)
    
    # Metadata
    source = Column(String(50), nullable=True)  # web, mobile, api, agent
    device_type = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    utm_params = Column(JSONB, nullable=True)
    
    # Datos adicionales flexibles
    metadata = Column(JSONB, default=dict)
    
    # Relaciones ORM
    customer = relationship("User", foreign_keys=[customer_id])
    agency = relationship("Agency", foreign_keys=[agency_id])
    operator = relationship("Operator", foreign_keys=[operator_id])
    tour = relationship("Tour", foreign_keys=[tour_id])
    guide = relationship("Guide", foreign_keys=[guide_id])
    
    # Índices para performance
    __table_args__ = (
        Index('idx_trips_status', 'status'),
        Index('idx_trips_channel', 'channel'),
        Index('idx_trips_departure', 'departure_date'),
        Index('idx_trips_customer', 'customer_id'),
        Index('idx_trips_agency', 'agency_id'),
        Index('idx_trips_operator', 'operator_id'),
        Index('idx_trips_booking_ref', 'booking_reference'),
        Index('idx_trips_payment_status', 'payment_status'),
        Index('idx_trips_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Trip {self.booking_reference} - {self.status}>"
    
    @property
    def is_upcoming(self) -> bool:
        """Check si el viaje es próximo"""
        return self.status == TripStatus.UPCOMING and self.departure_date > datetime.utcnow()
    
    @property
    def is_active(self) -> bool:
        """Check si el viaje está activo"""
        return self.status == TripStatus.IN_PROGRESS
    
    @property
    def is_past(self) -> bool:
        """Check si el viaje es pasado"""
        return self.status == TripStatus.COMPLETED and self.completed_at is not None
    
    @property
    def days_until_departure(self) -> int:
        """Días hasta la salida"""
        if self.departure_date:
            delta = self.departure_date - datetime.utcnow()
            return max(0, delta.days)
        return 0
    
    @property
    def cancellation_deadline(self) -> Optional[datetime]:
        """Fecha límite para cancelación sin penalización"""
        if self.departure_date:
            # Política: 48 horas antes
            return self.departure_date - timedelta(hours=48)
        return None
    
    @property
    def can_be_modified(self) -> bool:
        """Check si puede ser modificado"""
        return self.status in [TripStatus.PENDING, TripStatus.UPCOMING] and \
               self.days_until_departure > 2
    
    @property
    def can_be_cancelled(self) -> bool:
        """Check si puede ser cancelado"""
        return self.status in [TripStatus.PENDING, TripStatus.UPCOMING]
    
    def calculate_refund_amount(self) -> Decimal:
        """Calcula monto de reembolso según política"""
        days_until = self.days_until_departure
        
        if days_until >= 14:
            # Reembolso completo
            return self.paid_amount
        elif days_until >= 7:
            # 75% de reembolso
            return self.paid_amount * Decimal('0.75')
        elif days_until >= 2:
            # 50% de reembolso
            return self.paid_amount * Decimal('0.50')
        else:
            # No reembolso
            return Decimal('0.00')


class TripStatusHistory(Base):
    """
    Historial de cambios de estado
    Auditoría completa
    """
    __tablename__ = "trip_status_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trip_id'), nullable=False)
    
    from_status = Column(String(20), nullable=False)
    to_status = Column(String(20), nullable=False)
    
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    reason = Column(Text, nullable=True)
    
    metadata = Column(JSONB, default=dict)
    
    trip = relationship("Trip", backref="status_history")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_trip_status_history_trip', 'trip_id'),
        Index('idx_trip_status_history_date', 'changed_at'),
    )


class TripNotification(Base):
    """
    Notificaciones enviadas para el trip
    """
    __tablename__ = "trip_notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trip_id'), nullable=False)
    
    notification_type = Column(String(50), nullable=False)  # confirmation, reminder, update
    channel = Column(String(20), nullable=False)  # email, sms, push, whatsapp
    
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    delivered = Column(Boolean, default=False)
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    
    subject = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    
    recipient_email = Column(String(255), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    
    metadata = Column(JSONB, default=dict)
    
    trip = relationship("Trip", backref="notifications")
    
    __table_args__ = (
        Index('idx_trip_notifications_trip', 'trip_id'),
        Index('idx_trip_notifications_type', 'notification_type'),
    )


class TripChat(Base):
    """
    Chat asociado al trip
    """
    __tablename__ = "trip_chats"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trip_id'), nullable=False)
    
    sender_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    sender_type = Column(String(20), nullable=False)  # customer, guide, agent, support
    
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)
    attachment_url = Column(String(500), nullable=True)
    
    metadata = Column(JSONB, default=dict)
    
    trip = relationship("Trip", backref="chats")
    sender = relationship("User")
    
    __table_args__ = (
        Index('idx_trip_chats_trip', 'trip_id'),
        Index('idx_trip_chats_sender', 'sender_id'),
        Index('idx_trip_chats_sent_at', 'sent_at'),
    )


class TripTracking(Base):
    """
    Tracking GPS del trip en tiempo real
    """
    __tablename__ = "trip_tracking"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trip_id'), nullable=False)
    
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    speed = Column(Numeric(5, 2), nullable=True)  # km/h
    altitude = Column(Numeric(7, 2), nullable=True)  # metros
    accuracy = Column(Numeric(6, 2), nullable=True)  # metros
    
    activity = Column(String(50), nullable=True)  # walking, driving, stopped
    
    metadata = Column(JSONB, default=dict)
    
    trip = relationship("Trip", backref="tracking_points")
    
    __table_args__ = (
        Index('idx_trip_tracking_trip', 'trip_id'),
        Index('idx_trip_tracking_timestamp', 'timestamp'),
    )


class TripDocument(Base):
    """
    Documentos asociados al trip
    """
    __tablename__ = "trip_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trip_id'), nullable=False)
    
    document_type = Column(String(50), nullable=False)  # voucher, invoice, ticket, insurance
    document_name = Column(String(255), nullable=False)
    document_url = Column(String(500), nullable=False)
    
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    
    downloaded = Column(Boolean, default=False)
    downloaded_at = Column(DateTime, nullable=True)
    
    metadata = Column(JSONB, default=dict)
    
    trip = relationship("Trip", backref="documents")
    
    __table_args__ = (
        Index('idx_trip_documents_trip', 'trip_id'),
        Index('idx_trip_documents_type', 'document_type'),
    )


class TripMetrics(Base):
    """
    Métricas y analytics del trip
    """
    __tablename__ = "trip_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey('trips.trip_id'), nullable=False, unique=True)
    
    # Tiempos
    booking_to_departure_days = Column(Integer, nullable=True)
    total_duration_minutes = Column(Integer, nullable=True)
    
    # Engagement
    page_views = Column(Integer, default=0)
    documents_downloaded = Column(Integer, default=0)
    chat_messages_sent = Column(Integer, default=0)
    
    # Quality
    on_time_departure = Column(Boolean, nullable=True)
    on_time_return = Column(Boolean, nullable=True)
    incidents_reported = Column(Integer, default=0)
    
    # Financial
    profit_margin = Column(Numeric(5, 2), nullable=True)
    commission_paid = Column(Numeric(10, 2), nullable=True)
    
    # Satisfaction
    nps_score = Column(Integer, nullable=True)
    rating = Column(Integer, nullable=True)
    review_sentiment = Column(String(20), nullable=True)  # positive, neutral, negative
    
    # Predictions (IA)
    cancellation_risk_score = Column(Numeric(3, 2), nullable=True)  # 0-1
    upsell_opportunity_score = Column(Numeric(3, 2), nullable=True)  # 0-1
    repeat_booking_probability = Column(Numeric(3, 2), nullable=True)  # 0-1
    
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    metadata = Column(JSONB, default=dict)
    
    trip = relationship("Trip", backref="metrics", uselist=False)
    
    __table_args__ = (
        Index('idx_trip_metrics_trip', 'trip_id'),
    )
