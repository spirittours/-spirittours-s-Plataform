"""
Enhanced Audit and Logging System
Sistema completo de auditoría y logs para Spirit Tours CRM
"""

from typing import List, Optional, Dict, Any, Union
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, JSON, Enum as SQLEnum, Float, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
import enum
from pydantic import BaseModel

# Use the same Base as rbac_models
try:
    from .rbac_models import Base
except ImportError:
    # Fallback for when rbac_models is not available
    Base = declarative_base()

class ActionType(enum.Enum):
    """Tipos de acciones para logging detallado"""
    # Booking/Reserva Actions
    BOOKING_CREATED = "booking_created"
    BOOKING_MODIFIED = "booking_modified"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_PAID = "booking_paid"
    BOOKING_REFUNDED = "booking_refunded"
    
    # Customer Actions
    CUSTOMER_CREATED = "customer_created"
    CUSTOMER_UPDATED = "customer_updated"
    CUSTOMER_DELETED = "customer_deleted"
    CUSTOMER_CONTACTED = "customer_contacted"
    
    # AI Agent Actions
    AI_AGENT_ACCESSED = "ai_agent_accessed"
    AI_AGENT_QUERY = "ai_agent_query"
    AI_AGENT_RECOMMENDATION = "ai_agent_recommendation"
    
    # System Access
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    
    # CRM Module Access
    CRM_MODULE_ACCESSED = "crm_module_accessed"
    DASHBOARD_VIEWED = "dashboard_viewed"
    REPORT_GENERATED = "report_generated"
    DATA_EXPORTED = "data_exported"
    
    # Communication Actions
    CALL_MADE = "call_made"
    CALL_RECEIVED = "call_received"
    EMAIL_SENT = "email_sent"
    SMS_SENT = "sms_sent"
    
    # Administrative Actions
    USER_CREATED = "user_created"
    USER_MODIFIED = "user_modified"
    USER_DEACTIVATED = "user_deactivated"
    ROLE_ASSIGNED = "role_assigned"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    
    # Financial Actions
    PAYMENT_PROCESSED = "payment_processed"
    REFUND_PROCESSED = "refund_processed"
    PRICE_MODIFIED = "price_modified"
    DISCOUNT_APPLIED = "discount_applied"
    
    # Security Actions
    SECURITY_VIOLATION = "security_violation"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    TWO_FA_ENABLED = "two_fa_enabled"
    TWO_FA_DISABLED = "two_fa_disabled"

class RiskLevel(enum.Enum):
    """Niveles de riesgo para las acciones"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EnhancedAuditLog(Base):
    """Sistema de auditoría mejorado con información detallada"""
    __tablename__ = 'enhanced_audit_logs'
    
    # Primary Information
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    session_id = Column(String(255), nullable=True)  # Para rastrear sesiones
    
    # Action Details
    action_type = Column(SQLEnum(ActionType), nullable=False)
    resource_type = Column(String(100), nullable=False)  # booking, customer, user, etc.
    resource_id = Column(String(100), nullable=True)
    resource_name = Column(String(255), nullable=True)  # Nombre legible del recurso
    
    # Change Tracking
    old_values = Column(JSON, nullable=True)  # Valores anteriores
    new_values = Column(JSON, nullable=True)  # Valores nuevos
    changed_fields = Column(JSON, nullable=True)  # Campos que cambiaron
    
    # Context Information
    description = Column(Text, nullable=True)  # Descripción legible
    business_context = Column(JSON, nullable=True)  # Contexto de negocio adicional
    
    # Technical Information
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(1000), nullable=True)
    endpoint = Column(String(255), nullable=True)  # API endpoint usado
    method = Column(String(10), nullable=True)  # HTTP method
    
    # Risk and Security
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW)
    is_sensitive = Column(Boolean, default=False)  # Datos sensibles
    requires_review = Column(Boolean, default=False)  # Requiere revisión manual
    
    # Financial Information (for money-related actions)
    amount = Column(Float, nullable=True)
    currency = Column(String(3), nullable=True)  # ISO currency code
    
    # Timing
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    duration_ms = Column(Integer, nullable=True)  # Duración de la acción en ms
    
    # Additional Metadata
    tags = Column(JSON, nullable=True)  # Tags para categorización
    correlation_id = Column(String(255), nullable=True)  # Para correlacionar acciones relacionadas
    
    # Relationships
    user = relationship("User", back_populates="enhanced_audit_logs")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_enhanced_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_enhanced_audit_action_timestamp', 'action_type', 'timestamp'),
        Index('idx_enhanced_audit_resource', 'resource_type', 'resource_id'),
        Index('idx_enhanced_audit_risk_level', 'risk_level', 'timestamp'),
        Index('idx_enhanced_audit_correlation', 'correlation_id'),
    )

class BookingAuditLog(Base):
    """Log específico para todas las acciones de reservas"""
    __tablename__ = 'booking_audit_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(String(100), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    customer_id = Column(String(100), nullable=True)
    
    # Booking specific information
    action = Column(String(50), nullable=False)  # created, modified, cancelled, etc.
    booking_status_before = Column(String(50), nullable=True)
    booking_status_after = Column(String(50), nullable=True)
    
    # Financial tracking
    amount_before = Column(Float, nullable=True)
    amount_after = Column(Float, nullable=True)
    currency = Column(String(3), nullable=True)
    
    # Service details
    service_type = Column(String(100), nullable=True)  # tour, hotel, flight, etc.
    destination = Column(String(255), nullable=True)
    travel_dates = Column(JSON, nullable=True)
    
    # Change details
    changes_made = Column(JSON, nullable=True)  # Detailed changes
    reason = Column(Text, nullable=True)  # Reason for change/cancellation
    
    # Customer communication
    customer_notified = Column(Boolean, default=False)
    notification_method = Column(String(50), nullable=True)  # email, phone, sms
    
    # Approval workflow
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    approval_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Technical details
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])

class AIAgentUsageLog(Base):
    """Log específico para uso de agentes AI"""
    __tablename__ = 'ai_agent_usage_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    session_id = Column(String(255), nullable=True)
    
    # Agent Information
    agent_name = Column(String(100), nullable=False)  # ethical_tourism, booking_assistant, etc.
    agent_type = Column(String(50), nullable=False)
    
    # Usage Details
    query_text = Column(Text, nullable=True)  # User's query
    response_summary = Column(Text, nullable=True)  # AI response summary
    response_time_ms = Column(Integer, nullable=True)
    
    # Context
    customer_id = Column(String(100), nullable=True)  # If query was about a customer
    booking_id = Column(String(100), nullable=True)  # If query was about a booking
    context_data = Column(JSON, nullable=True)  # Additional context
    
    # Results
    action_taken = Column(String(255), nullable=True)  # What action resulted from AI advice
    recommendation_followed = Column(Boolean, nullable=True)
    user_satisfaction = Column(Integer, nullable=True)  # 1-5 rating if provided
    
    # Technical
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")

class LoginActivityLog(Base):
    """Log detallado de actividad de login"""
    __tablename__ = 'login_activity_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    username = Column(String(100), nullable=False)
    
    # Login attempt details
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(255), nullable=True)
    two_fa_used = Column(Boolean, default=False)
    
    # Session information
    session_id = Column(String(255), nullable=True)
    session_duration_minutes = Column(Integer, nullable=True)
    
    # Technical details
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(1000), nullable=True)
    location_country = Column(String(2), nullable=True)  # ISO country code
    location_city = Column(String(100), nullable=True)
    device_fingerprint = Column(String(255), nullable=True)
    
    # Risk assessment
    risk_score = Column(Float, nullable=True)  # 0-100 risk score
    is_suspicious = Column(Boolean, default=False)
    
    # Timing
    attempt_timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    logout_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User")

class DataAccessLog(Base):
    """Log para acceso a datos sensibles"""
    __tablename__ = 'data_access_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Data accessed
    data_type = Column(String(100), nullable=False)  # customer_pii, financial_data, etc.
    record_id = Column(String(100), nullable=True)
    records_count = Column(Integer, default=1)
    
    # Access details
    access_type = Column(String(50), nullable=False)  # view, export, print, etc.
    business_justification = Column(Text, nullable=True)
    
    # Technical details
    endpoint = Column(String(255), nullable=True)
    query_parameters = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    # Compliance
    gdpr_compliant = Column(Boolean, default=True)
    retention_period_days = Column(Integer, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")

# Pydantic models for API responses
class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    username: str
    action_type: str
    resource_type: str
    resource_id: Optional[str]
    resource_name: Optional[str]
    description: Optional[str]
    risk_level: str
    timestamp: datetime
    ip_address: Optional[str]
    
class BookingAuditResponse(BaseModel):
    id: str
    booking_id: str
    user_id: str
    username: str
    action: str
    booking_status_before: Optional[str]
    booking_status_after: Optional[str]
    amount_before: Optional[float]
    amount_after: Optional[float]
    changes_made: Optional[Dict[str, Any]]
    reason: Optional[str]
    timestamp: datetime

class AIAgentUsageResponse(BaseModel):
    id: str
    user_id: str
    username: str
    agent_name: str
    query_text: Optional[str]
    response_summary: Optional[str]
    customer_id: Optional[str]
    booking_id: Optional[str]
    action_taken: Optional[str]
    timestamp: datetime

class AuditSearchFilters(BaseModel):
    user_id: Optional[str] = None
    action_types: Optional[List[str]] = None
    resource_types: Optional[List[str]] = None
    risk_levels: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    ip_address: Optional[str] = None
    search_text: Optional[str] = None
    limit: Optional[int] = 100
    offset: Optional[int] = 0