"""
Advanced Reports System Models
Sistema completo de modelos para reportes con ML y permisos jerárquicos
"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, JSON, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum
import uuid

Base = declarative_base()

class AccessLevel(enum.Enum):
    """Niveles de acceso jerárquicos para reportes"""
    ADMIN = 1  # Acceso completo a todos los reportes
    GENERAL_DIRECTOR = 2  # Acceso a nivel empresa
    BRANCH_DIRECTOR = 3  # Acceso a nivel sucursal
    REGIONAL_MANAGER = 4  # Acceso regional
    SUPERVISOR = 5  # Acceso a nivel equipo
    SALES_AGENT = 6  # Acceso solo a ventas propias
    ACCOUNTANT = 7  # Acceso a datos financieros
    AUDITOR = 8  # Acceso de solo lectura
    PARTNER = 9  # Acceso a datos específicos de partner
    VIP_CLIENT = 10  # Acceso a reportes personalizados

class ReportType(enum.Enum):
    """Tipos de reportes disponibles"""
    SALES_NET = "sales_net"  # Ventas netas sin comisiones
    SALES_GROSS = "sales_gross"  # Ventas brutas con comisiones
    COMMISSIONS = "commissions"  # Reporte de comisiones
    PASSENGERS = "passengers"  # Número de pasajeros
    PROFITABILITY = "profitability"  # Análisis de rentabilidad
    COMPARATIVE = "comparative"  # Comparativas históricas
    PREDICTIVE = "predictive"  # Análisis predictivo ML
    GEOGRAPHIC = "geographic"  # Análisis geográfico
    BENCHMARKING = "benchmarking"  # Comparación competitiva
    CUSTOM = "custom"  # Reporte personalizado

class AlertPriority(enum.Enum):
    """Prioridad de alertas"""
    CRITICAL = 1  # Requiere acción inmediata
    HIGH = 2  # Alta prioridad
    MEDIUM = 3  # Prioridad media
    LOW = 4  # Baja prioridad
    INFO = 5  # Informativo

class NotificationChannel(enum.Enum):
    """Canales de notificación"""
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    SLACK = "slack"
    PUSH = "push"
    WEBHOOK = "webhook"
    IN_APP = "in_app"

class ReportTemplate(Base):
    """Plantillas de reportes configurables"""
    __tablename__ = 'report_templates'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(Enum(ReportType), nullable=False)
    
    # Configuración del reporte
    config = Column(JSON, nullable=False, default={})
    filters = Column(JSON, default={})
    grouping = Column(JSON, default={})
    metrics = Column(JSON, default=[])
    
    # Permisos
    min_access_level = Column(Enum(AccessLevel), default=AccessLevel.SALES_AGENT)
    owner_id = Column(String(36), ForeignKey('users.id'))
    is_public = Column(Boolean, default=False)
    
    # Configuración de visualización
    chart_type = Column(String(50), default='line')
    chart_config = Column(JSON, default={})
    
    # Machine Learning
    enable_ml = Column(Boolean, default=True)
    ml_models = Column(JSON, default=['prophet', 'arima'])
    forecast_periods = Column(Integer, default=30)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    generated_reports = relationship("GeneratedReport", back_populates="template")
    scheduled_reports = relationship("ScheduledReport", back_populates="template")
    permissions = relationship("ReportPermission", back_populates="template")
    
    # Indices para optimización
    __table_args__ = (
        Index('idx_template_type', 'type'),
        Index('idx_template_owner', 'owner_id'),
        Index('idx_template_access', 'min_access_level'),
    )

class GeneratedReport(Base):
    """Reportes generados y almacenados"""
    __tablename__ = 'generated_reports'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_number = Column(String(50), unique=True, nullable=False)
    template_id = Column(String(36), ForeignKey('report_templates.id'))
    
    # Periodo del reporte
    date_from = Column(DateTime, nullable=False)
    date_to = Column(DateTime, nullable=False)
    
    # Datos del reporte
    data = Column(JSON, nullable=False)
    summary = Column(JSON, nullable=False)
    
    # Métricas calculadas
    total_sales_gross = Column(Float, default=0)
    total_sales_net = Column(Float, default=0)
    total_commissions = Column(Float, default=0)
    total_passengers = Column(Integer, default=0)
    average_ticket = Column(Float, default=0)
    
    # Datos por categoría
    by_employee = Column(JSON, default={})
    by_product = Column(JSON, default={})
    by_branch = Column(JSON, default={})
    by_region = Column(JSON, default={})
    
    # Predicciones ML
    predictions = Column(JSON, default={})
    ml_confidence = Column(Float, default=0)
    ml_models_used = Column(JSON, default=[])
    anomalies_detected = Column(JSON, default=[])
    
    # Metadata
    generated_by = Column(String(36), ForeignKey('users.id'))
    generation_time = Column(Float)  # Tiempo en segundos
    file_path = Column(String(500))  # Path del archivo exportado
    format = Column(String(10))  # pdf, excel, csv
    
    created_at = Column(DateTime, default=datetime.utcnow)
    accessed_at = Column(DateTime, default=datetime.utcnow)
    access_count = Column(Integer, default=0)
    
    # Cache
    cached_until = Column(DateTime)
    cache_key = Column(String(255))
    
    # Relationships
    template = relationship("ReportTemplate", back_populates="generated_reports")
    
    # Indices
    __table_args__ = (
        Index('idx_report_number', 'report_number'),
        Index('idx_report_dates', 'date_from', 'date_to'),
        Index('idx_report_generated_by', 'generated_by'),
        Index('idx_report_template', 'template_id'),
    )

class ScheduledReport(Base):
    """Reportes programados para generación automática"""
    __tablename__ = 'scheduled_reports'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    template_id = Column(String(36), ForeignKey('report_templates.id'))
    
    # Programación
    cron_expression = Column(String(100))  # Expresión cron para programación
    frequency = Column(String(20))  # daily, weekly, monthly, quarterly, yearly
    day_of_week = Column(Integer)  # 0-6 para weekly
    day_of_month = Column(Integer)  # 1-31 para monthly
    time_of_day = Column(String(5))  # HH:MM formato
    timezone = Column(String(50), default='UTC')
    
    # Configuración de envío
    recipients = Column(JSON, default=[])  # Lista de emails/usuarios
    notification_channels = Column(JSON, default=['email'])
    include_attachment = Column(Boolean, default=True)
    attachment_format = Column(String(10), default='pdf')
    
    # Filtros específicos
    custom_filters = Column(JSON, default={})
    period_type = Column(String(20))  # last_day, last_week, last_month, custom
    
    # Control
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime)
    next_run = Column(DateTime)
    run_count = Column(Integer, default=0)
    last_success = Column(DateTime)
    last_error = Column(Text)
    
    # Metadata
    created_by = Column(String(36), ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    template = relationship("ReportTemplate", back_populates="scheduled_reports")
    
    # Indices
    __table_args__ = (
        Index('idx_scheduled_active', 'is_active'),
        Index('idx_scheduled_next_run', 'next_run'),
        Index('idx_scheduled_template', 'template_id'),
    )

class ReportAlert(Base):
    """Sistema de alertas inteligentes"""
    __tablename__ = 'report_alerts'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Tipo y prioridad
    alert_type = Column(String(50), nullable=False)
    priority = Column(Enum(AlertPriority), default=AlertPriority.MEDIUM)
    
    # Condiciones de activación
    conditions = Column(JSON, nullable=False)
    threshold_value = Column(Float)
    comparison_operator = Column(String(10))  # >, <, >=, <=, ==, !=
    
    # Machine Learning
    use_ml_detection = Column(Boolean, default=True)
    ml_model = Column(String(50))  # isolation_forest, lstm, etc
    sensitivity = Column(Float, default=0.5)  # 0-1 sensibilidad
    
    # Canales de notificación
    channels = Column(JSON, default=['email', 'in_app'])
    recipients = Column(JSON, default=[])
    escalation_rules = Column(JSON, default={})
    
    # Control de frecuencia
    cooldown_minutes = Column(Integer, default=60)  # Tiempo entre alertas
    max_alerts_per_day = Column(Integer, default=10)
    
    # Estado
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime)
    trigger_count = Column(Integer, default=0)
    false_positive_count = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(String(36), ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indices
    __table_args__ = (
        Index('idx_alert_type', 'alert_type'),
        Index('idx_alert_priority', 'priority'),
        Index('idx_alert_active', 'is_active'),
    )

class AlertHistory(Base):
    """Histórico de alertas disparadas"""
    __tablename__ = 'alert_history'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String(36), ForeignKey('report_alerts.id'))
    
    # Detalles del trigger
    triggered_at = Column(DateTime, default=datetime.utcnow)
    triggered_value = Column(Float)
    threshold_value = Column(Float)
    
    # Datos de contexto
    context_data = Column(JSON)
    ml_confidence = Column(Float)
    anomaly_score = Column(Float)
    
    # Notificaciones enviadas
    notifications_sent = Column(JSON, default={})
    delivery_status = Column(JSON, default={})
    
    # Respuesta
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(36), ForeignKey('users.id'))
    acknowledged_at = Column(DateTime)
    action_taken = Column(Text)
    
    # Feedback
    was_false_positive = Column(Boolean)
    feedback_notes = Column(Text)
    
    # Indices
    __table_args__ = (
        Index('idx_history_alert', 'alert_id'),
        Index('idx_history_triggered', 'triggered_at'),
        Index('idx_history_acknowledged', 'acknowledged'),
    )

class EmployeeMetrics(Base):
    """Métricas detalladas por empleado"""
    __tablename__ = 'employee_metrics'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String(36), ForeignKey('users.id'))
    
    # Periodo
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_type = Column(String(20))  # daily, weekly, monthly, quarterly, yearly
    
    # Ventas
    sales_gross = Column(Float, default=0)
    sales_net = Column(Float, default=0)
    commission_earned = Column(Float, default=0)
    commission_rate = Column(Float)
    
    # Volumen
    transactions_count = Column(Integer, default=0)
    passengers_sold = Column(Integer, default=0)
    average_ticket_value = Column(Float, default=0)
    
    # Por producto
    flights_sold = Column(Float, default=0)
    hotels_sold = Column(Float, default=0)
    packages_sold = Column(Float, default=0)
    other_sold = Column(Float, default=0)
    
    # Rendimiento
    conversion_rate = Column(Float)
    customer_satisfaction = Column(Float)
    repeat_customer_rate = Column(Float)
    
    # Comparativas
    vs_previous_period = Column(Float)  # % cambio
    vs_team_average = Column(Float)  # % diferencia
    ranking_in_team = Column(Integer)
    ranking_in_branch = Column(Integer)
    
    # ML Predictions
    predicted_next_period = Column(Float)
    prediction_confidence = Column(Float)
    growth_trend = Column(String(20))  # increasing, stable, decreasing
    
    # Metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)
    
    # Indices
    __table_args__ = (
        Index('idx_metrics_employee', 'employee_id'),
        Index('idx_metrics_period', 'period_start', 'period_end'),
        Index('idx_metrics_type', 'period_type'),
    )

class ReportPermission(Base):
    """Permisos granulares para reportes"""
    __tablename__ = 'report_permissions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Sujeto del permiso
    user_id = Column(String(36), ForeignKey('users.id'), nullable=True)
    role_id = Column(String(36), ForeignKey('roles.id'), nullable=True)
    department_id = Column(String(36), ForeignKey('departments.id'), nullable=True)
    
    # Objeto del permiso
    template_id = Column(String(36), ForeignKey('report_templates.id'), nullable=True)
    report_type = Column(Enum(ReportType), nullable=True)
    
    # Permisos específicos
    can_view = Column(Boolean, default=True)
    can_generate = Column(Boolean, default=False)
    can_export = Column(Boolean, default=False)
    can_schedule = Column(Boolean, default=False)
    can_share = Column(Boolean, default=False)
    can_edit_template = Column(Boolean, default=False)
    
    # Filtros de datos
    data_filters = Column(JSON, default={})  # Filtros aplicados automáticamente
    branch_restriction = Column(JSON, default=[])  # Lista de sucursales permitidas
    date_restriction = Column(JSON, default={})  # Restricción de fechas
    
    # Vigencia
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    granted_by = Column(String(36), ForeignKey('users.id'))
    granted_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text)
    
    # Relationships
    template = relationship("ReportTemplate", back_populates="permissions")
    
    # Indices
    __table_args__ = (
        Index('idx_permission_user', 'user_id'),
        Index('idx_permission_role', 'role_id'),
        Index('idx_permission_template', 'template_id'),
        Index('idx_permission_active', 'is_active'),
    )

class ReportExport(Base):
    """Registro de exportaciones de reportes"""
    __tablename__ = 'report_exports'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(36), ForeignKey('generated_reports.id'))
    
    # Formato y archivo
    format = Column(String(10), nullable=False)  # pdf, excel, csv, json
    file_path = Column(String(500))
    file_size = Column(Integer)  # En bytes
    
    # Usuario y contexto
    exported_by = Column(String(36), ForeignKey('users.id'))
    exported_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    
    # Destino
    sent_to = Column(JSON, default=[])  # Lista de emails si fue enviado
    download_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    
    # Seguridad
    password_protected = Column(Boolean, default=False)
    watermarked = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    
    # Indices
    __table_args__ = (
        Index('idx_export_report', 'report_id'),
        Index('idx_export_user', 'exported_by'),
        Index('idx_export_date', 'exported_at'),
    )