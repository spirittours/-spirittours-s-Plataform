"""
Smart Notification Service - Spirit Tours Platform
Sistema inteligente de notificaciones con priorización automática y control de costos

Características:
- Priorización automática: WhatsApp > Email > SMS
- Verificación de disponibilidad de WhatsApp antes de usar SMS
- Control de costos con activación/desactivación de SMS desde admin
- Fallback inteligente entre canales
- Registro completo de notificaciones enviadas
- Integración con sistema de trips/reservas

Author: Spirit Tours Dev Team
Date: 2024
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union, Any, Tuple
from enum import Enum
from dataclasses import dataclass
import json
import os
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Enum as SQLEnum, Float
from sqlalchemy.ext.declarative import declarative_base

# Import existing services
try:
    from services.notification_service import (
        NotificationService as BaseNotificationService,
        NotificationConfig,
        NotificationType,
        NotificationPriority,
        NotificationStatus
    )
    from integrations.whatsapp_business import WhatsAppBusinessAPI, MessageType
    from models.rbac_models import Base
except ImportError:
    from sqlalchemy.ext.declarative import declarative_base
    Base = declarative_base()

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    """Canales de notificación disponibles"""
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class CostTier(str, Enum):
    """Niveles de costo por canal"""
    FREE = "free"          # WhatsApp Business (solo costo de servidor), Email
    LOW = "low"            # WhatsApp Business con templates premium
    MEDIUM = "medium"      # SMS nacional
    HIGH = "high"          # SMS internacional
    PREMIUM = "premium"    # Llamadas telefónicas


class DeliveryStrategy(str, Enum):
    """Estrategias de entrega"""
    COST_OPTIMIZED = "cost_optimized"      # Prioriza el menor costo (WhatsApp > Email > SMS)
    RELIABILITY_FIRST = "reliability_first" # Prioriza confiabilidad (envía por todos los canales)
    CHANNEL_SPECIFIC = "channel_specific"   # Solo usa el canal especificado
    SMART_CASCADE = "smart_cascade"         # Cascada inteligente con fallback automático


@dataclass
class ChannelCostConfig:
    """Configuración de costos por canal"""
    whatsapp_cost_per_message: float = 0.0  # Gratis con WhatsApp Business API gratuita
    email_cost_per_message: float = 0.0     # Gratis con SMTP propio
    sms_national_cost: float = 0.05         # $0.05 por SMS nacional
    sms_international_cost: float = 0.15    # $0.15 por SMS internacional
    voice_call_cost_per_minute: float = 0.30 # $0.30 por minuto de llamada
    
    # Costos mensuales
    whatsapp_monthly_cost: float = 0.0      # API gratuita
    email_monthly_cost: float = 0.0         # SMTP propio
    sms_monthly_plan: float = 0.0           # Sin plan mensual obligatorio


class NotificationSettings(Base):
    """Configuración global de notificaciones (panel de admin)"""
    __tablename__ = "notification_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Control de canales
    whatsapp_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)  # Desactivado por defecto para ahorrar costos
    push_enabled = Column(Boolean, default=True)
    
    # Estrategia global
    default_strategy = Column(String(50), default=DeliveryStrategy.COST_OPTIMIZED.value)
    
    # Control de costos
    monthly_sms_budget = Column(Float, default=0.0)  # Presupuesto mensual para SMS
    sms_spent_current_month = Column(Float, default=0.0)
    sms_budget_alert_threshold = Column(Float, default=0.8)  # Alerta al 80% del presupuesto
    
    # WhatsApp fallback
    auto_fallback_to_sms = Column(Boolean, default=False)  # Solo si SMS está enabled y hay presupuesto
    check_whatsapp_availability = Column(Boolean, default=True)  # Verificar si usuario tiene WhatsApp
    
    # Rate limiting
    max_whatsapp_per_minute = Column(Integer, default=60)
    max_email_per_minute = Column(Integer, default=100)
    max_sms_per_minute = Column(Integer, default=30)
    
    # Horarios de envío
    quiet_hours_start = Column(Integer, default=22)  # 10 PM
    quiet_hours_end = Column(Integer, default=8)     # 8 AM
    respect_quiet_hours = Column(Boolean, default=True)
    
    # Metadata
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(100))


class UserNotificationPreferences(Base):
    """Preferencias de notificación por usuario"""
    __tablename__ = "user_notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    
    # Información de contacto
    phone_number = Column(String(20))
    email = Column(String(100))
    whatsapp_number = Column(String(20))  # Puede ser diferente al teléfono
    has_whatsapp = Column(Boolean, default=None)  # None = no verificado, True/False = verificado
    last_whatsapp_check = Column(DateTime)
    
    # Preferencias de canal
    preferred_channel = Column(String(20), default=NotificationChannel.WHATSAPP.value)
    allow_whatsapp = Column(Boolean, default=True)
    allow_email = Column(Boolean, default=True)
    allow_sms = Column(Boolean, default=True)
    allow_push = Column(Boolean, default=True)
    
    # Tipos de notificaciones permitidas
    allow_booking_notifications = Column(Boolean, default=True)
    allow_payment_notifications = Column(Boolean, default=True)
    allow_marketing_notifications = Column(Boolean, default=False)
    allow_support_notifications = Column(Boolean, default=True)
    
    # Metadata
    language = Column(String(10), default="es")
    timezone = Column(String(50), default="America/Mexico_City")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SmartNotificationLog(Base):
    """Log detallado de notificaciones enviadas"""
    __tablename__ = "smart_notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), index=True)
    
    # Intento de envío
    attempt_number = Column(Integer, default=1)
    strategy_used = Column(String(50))
    
    # Canal y resultado
    channel_used = Column(String(20))
    channel_attempted = Column(JSON)  # Lista de canales intentados
    status = Column(String(20))
    
    # Contenido
    notification_type = Column(String(50))
    subject = Column(String(200))
    content_preview = Column(String(500))
    
    # Costo
    cost_incurred = Column(Float, default=0.0)
    cost_saved = Column(Float, default=0.0)  # Cuánto se ahorró vs usar SMS directamente
    
    # Verificación de WhatsApp
    whatsapp_check_performed = Column(Boolean, default=False)
    whatsapp_available = Column(Boolean, default=None)
    
    # Timing
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    read_at = Column(DateTime)
    
    # Error handling
    error_message = Column(Text)
    fallback_used = Column(Boolean, default=False)
    
    # Metadata
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class SmartNotificationService:
    """
    Servicio inteligente de notificaciones con optimización de costos
    
    Prioridad automática: WhatsApp > Email > SMS
    
    Características:
    - Verifica si el usuario tiene WhatsApp antes de enviar
    - Si no tiene WhatsApp, intenta Email
    - SMS solo como último recurso (si está habilitado)
    - Control de presupuesto mensual para SMS
    - Configuración global desde panel de admin
    - Registro detallado de costos
    """
    
    def __init__(
        self,
        db: Session,
        notification_service: Optional[BaseNotificationService] = None,
        whatsapp_service: Optional[WhatsAppBusinessAPI] = None
    ):
        self.db = db
        self.notification_service = notification_service
        self.whatsapp_service = whatsapp_service
        
        # Cargar configuración global
        self.settings = self._load_settings()
        
        # Configuración de costos
        self.cost_config = ChannelCostConfig()
        
        logger.info("SmartNotificationService initialized")
    
    def _load_settings(self) -> NotificationSettings:
        """Carga configuración global desde base de datos"""
        settings = self.db.query(NotificationSettings).first()
        
        if not settings:
            # Crear configuración por defecto
            settings = NotificationSettings(
                whatsapp_enabled=True,
                email_enabled=True,
                sms_enabled=False,  # Desactivado por defecto
                default_strategy=DeliveryStrategy.COST_OPTIMIZED.value,
                monthly_sms_budget=0.0
            )
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        
        return settings
    
    async def send_smart_notification(
        self,
        user_id: str,
        notification_type: str,
        subject: str,
        content: str,
        variables: Optional[Dict] = None,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        strategy: Optional[DeliveryStrategy] = None,
        force_channel: Optional[NotificationChannel] = None
    ) -> Dict[str, Any]:
        """
        Envía notificación de forma inteligente
        
        Args:
            user_id: ID del usuario
            notification_type: Tipo de notificación (booking_confirmation, payment_reminder, etc)
            subject: Asunto de la notificación
            content: Contenido del mensaje
            variables: Variables para templates
            priority: Prioridad de la notificación
            strategy: Estrategia de envío (default: configuración global)
            force_channel: Forzar canal específico (ignora optimización)
        
        Returns:
            Dict con resultado del envío
        """
        
        # Obtener preferencias del usuario
        user_prefs = await self._get_user_preferences(user_id)
        
        if not user_prefs:
            logger.warning(f"No preferences found for user {user_id}")
            return {
                "success": False,
                "error": "User preferences not found",
                "channel_used": None
            }
        
        # Determinar estrategia
        strategy = strategy or DeliveryStrategy(self.settings.default_strategy)
        
        # Si hay un canal forzado
        if force_channel:
            return await self._send_via_specific_channel(
                force_channel, user_prefs, notification_type, subject, content, variables
            )
        
        # Ejecutar estrategia
        if strategy == DeliveryStrategy.COST_OPTIMIZED:
            return await self._send_cost_optimized(
                user_prefs, notification_type, subject, content, variables, priority
            )
        elif strategy == DeliveryStrategy.SMART_CASCADE:
            return await self._send_smart_cascade(
                user_prefs, notification_type, subject, content, variables, priority
            )
        elif strategy == DeliveryStrategy.RELIABILITY_FIRST:
            return await self._send_all_channels(
                user_prefs, notification_type, subject, content, variables, priority
            )
        else:
            return await self._send_cost_optimized(
                user_prefs, notification_type, subject, content, variables, priority
            )
    
    async def _send_cost_optimized(
        self,
        user_prefs: UserNotificationPreferences,
        notification_type: str,
        subject: str,
        content: str,
        variables: Optional[Dict],
        priority: NotificationPriority
    ) -> Dict[str, Any]:
        """
        Estrategia optimizada por costo: WhatsApp > Email > SMS
        """
        
        channels_attempted = []
        cost_incurred = 0.0
        potential_cost_saved = 0.0
        
        # 1. INTENTAR WHATSAPP PRIMERO (GRATIS)
        if self.settings.whatsapp_enabled and user_prefs.allow_whatsapp:
            # Verificar si el usuario tiene WhatsApp
            has_whatsapp = await self._check_whatsapp_availability(user_prefs)
            
            if has_whatsapp:
                channels_attempted.append("whatsapp")
                result = await self._send_via_whatsapp(
                    user_prefs.whatsapp_number or user_prefs.phone_number,
                    content,
                    variables
                )
                
                if result["success"]:
                    # SMS cost we saved
                    potential_cost_saved = self._calculate_sms_cost(user_prefs.phone_number)
                    
                    await self._log_notification(
                        user_prefs.user_id,
                        notification_type,
                        "whatsapp",
                        channels_attempted,
                        "sent",
                        subject,
                        content,
                        cost_incurred=0.0,
                        cost_saved=potential_cost_saved,
                        whatsapp_check_performed=True,
                        whatsapp_available=True
                    )
                    
                    return {
                        "success": True,
                        "channel_used": "whatsapp",
                        "cost_incurred": 0.0,
                        "cost_saved": potential_cost_saved,
                        "message": "Notification sent via WhatsApp (FREE)"
                    }
        
        # 2. INTENTAR EMAIL (GRATIS)
        if self.settings.email_enabled and user_prefs.allow_email and user_prefs.email:
            channels_attempted.append("email")
            result = await self._send_via_email(
                user_prefs.email,
                subject,
                content,
                variables
            )
            
            if result["success"]:
                potential_cost_saved = self._calculate_sms_cost(user_prefs.phone_number)
                
                await self._log_notification(
                    user_prefs.user_id,
                    notification_type,
                    "email",
                    channels_attempted,
                    "sent",
                    subject,
                    content,
                    cost_incurred=0.0,
                    cost_saved=potential_cost_saved
                )
                
                return {
                    "success": True,
                    "channel_used": "email",
                    "cost_incurred": 0.0,
                    "cost_saved": potential_cost_saved,
                    "message": "Notification sent via Email (FREE)"
                }
        
        # 3. ÚLTIMO RECURSO: SMS (COSTO)
        if (self.settings.sms_enabled and 
            user_prefs.allow_sms and 
            user_prefs.phone_number and
            self._check_sms_budget_available()):
            
            channels_attempted.append("sms")
            sms_cost = self._calculate_sms_cost(user_prefs.phone_number)
            
            result = await self._send_via_sms(
                user_prefs.phone_number,
                content
            )
            
            if result["success"]:
                cost_incurred = sms_cost
                self._update_sms_spending(sms_cost)
                
                await self._log_notification(
                    user_prefs.user_id,
                    notification_type,
                    "sms",
                    channels_attempted,
                    "sent",
                    subject,
                    content,
                    cost_incurred=cost_incurred,
                    cost_saved=0.0
                )
                
                return {
                    "success": True,
                    "channel_used": "sms",
                    "cost_incurred": cost_incurred,
                    "cost_saved": 0.0,
                    "message": f"Notification sent via SMS (Cost: ${cost_incurred:.3f})",
                    "warning": "SMS used - consider enabling WhatsApp for cost savings"
                }
        
        # FALLO TOTAL
        await self._log_notification(
            user_prefs.user_id,
            notification_type,
            None,
            channels_attempted,
            "failed",
            subject,
            content,
            error_message="All channels failed or disabled"
        )
        
        return {
            "success": False,
            "channel_used": None,
            "cost_incurred": 0.0,
            "channels_attempted": channels_attempted,
            "error": "All notification channels failed or disabled"
        }
    
    async def _send_smart_cascade(
        self,
        user_prefs: UserNotificationPreferences,
        notification_type: str,
        subject: str,
        content: str,
        variables: Optional[Dict],
        priority: NotificationPriority
    ) -> Dict[str, Any]:
        """
        Cascada inteligente con fallback automático
        Intenta todos los canales en orden hasta que uno funcione
        """
        
        channels_to_try = []
        
        # Orden de prioridad basado en costo
        if self.settings.whatsapp_enabled and user_prefs.allow_whatsapp:
            channels_to_try.append(("whatsapp", self._send_via_whatsapp))
        
        if self.settings.email_enabled and user_prefs.allow_email and user_prefs.email:
            channels_to_try.append(("email", self._send_via_email))
        
        if (self.settings.sms_enabled and user_prefs.allow_sms and 
            self._check_sms_budget_available()):
            channels_to_try.append(("sms", self._send_via_sms))
        
        # Intentar cada canal
        for channel_name, send_func in channels_to_try:
            try:
                if channel_name == "whatsapp":
                    result = await send_func(
                        user_prefs.whatsapp_number or user_prefs.phone_number,
                        content,
                        variables
                    )
                elif channel_name == "email":
                    result = await send_func(
                        user_prefs.email,
                        subject,
                        content,
                        variables
                    )
                elif channel_name == "sms":
                    result = await send_func(
                        user_prefs.phone_number,
                        content
                    )
                
                if result["success"]:
                    cost = 0.0 if channel_name != "sms" else self._calculate_sms_cost(user_prefs.phone_number)
                    
                    if channel_name == "sms":
                        self._update_sms_spending(cost)
                    
                    return {
                        "success": True,
                        "channel_used": channel_name,
                        "cost_incurred": cost,
                        "fallback_used": channels_to_try.index((channel_name, send_func)) > 0
                    }
            
            except Exception as e:
                logger.error(f"Failed to send via {channel_name}: {str(e)}")
                continue
        
        return {
            "success": False,
            "error": "All channels in cascade failed"
        }
    
    async def _check_whatsapp_availability(
        self,
        user_prefs: UserNotificationPreferences
    ) -> bool:
        """
        Verifica si el usuario tiene WhatsApp activo
        
        Estrategias:
        1. Usar caché de verificación anterior (24 horas)
        2. Verificar mediante WhatsApp Business API
        3. Asumir disponibilidad por defecto
        """
        
        if not self.settings.check_whatsapp_availability:
            # Si está desactivada la verificación, asumir que sí tiene
            return True
        
        # Verificar caché (24 horas)
        if user_prefs.has_whatsapp is not None and user_prefs.last_whatsapp_check:
            time_since_check = datetime.utcnow() - user_prefs.last_whatsapp_check
            if time_since_check.total_seconds() < 86400:  # 24 horas
                return user_prefs.has_whatsapp
        
        # Verificar disponibilidad real
        if self.whatsapp_service:
            try:
                # Intentar verificar número con WhatsApp Business API
                phone = user_prefs.whatsapp_number or user_prefs.phone_number
                
                # Método 1: Verificar con lookup API (si disponible)
                # Método 2: Enviar mensaje de prueba y ver si se entrega
                # Método 3: Usar servicio externo de verificación
                
                # Por ahora, asumimos que si el número está en formato válido, tiene WhatsApp
                has_whatsapp = bool(phone and len(phone) >= 10)
                
                # Actualizar caché
                user_prefs.has_whatsapp = has_whatsapp
                user_prefs.last_whatsapp_check = datetime.utcnow()
                self.db.commit()
                
                return has_whatsapp
                
            except Exception as e:
                logger.error(f"Error checking WhatsApp availability: {str(e)}")
                # En caso de error, asumir que sí tiene
                return True
        
        # Default: asumir que sí tiene WhatsApp
        return True
    
    async def _send_via_whatsapp(
        self,
        phone: str,
        content: str,
        variables: Optional[Dict]
    ) -> Dict[str, Any]:
        """Envía notificación por WhatsApp"""
        try:
            if not self.whatsapp_service:
                return {"success": False, "error": "WhatsApp service not configured"}
            
            # Enviar mensaje
            result = await self.whatsapp_service.send_message(
                phone,
                MessageType.TEXT,
                content
            )
            
            return {
                "success": True,
                "provider": "whatsapp",
                "message_id": result.id
            }
            
        except Exception as e:
            logger.error(f"WhatsApp send failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _send_via_email(
        self,
        email: str,
        subject: str,
        content: str,
        variables: Optional[Dict]
    ) -> Dict[str, Any]:
        """Envía notificación por Email"""
        try:
            if not self.notification_service:
                return {"success": False, "error": "Email service not configured"}
            
            from services.notification_service import NotificationRequest
            
            request = NotificationRequest(
                recipient=email,
                type=NotificationType.EMAIL,
                subject=subject,
                content=content,
                variables=variables or {}
            )
            
            result = await self.notification_service.send_notification(request)
            
            return {
                "success": result.success,
                "provider": "email",
                "notification_id": result.notification_id
            }
            
        except Exception as e:
            logger.error(f"Email send failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _send_via_sms(
        self,
        phone: str,
        content: str
    ) -> Dict[str, Any]:
        """Envía notificación por SMS (Twilio)"""
        try:
            if not self.notification_service:
                return {"success": False, "error": "SMS service not configured"}
            
            from services.notification_service import NotificationRequest
            
            # Limitar contenido a 160 caracteres para SMS
            sms_content = content[:160] if len(content) > 160 else content
            
            request = NotificationRequest(
                recipient=phone,
                type=NotificationType.SMS,
                content=sms_content
            )
            
            result = await self.notification_service.send_notification(request)
            
            return {
                "success": result.success,
                "provider": "sms",
                "notification_id": result.notification_id
            }
            
        except Exception as e:
            logger.error(f"SMS send failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _calculate_sms_cost(self, phone: str) -> float:
        """Calcula costo de SMS basado en destino"""
        # Simplificado: detectar si es internacional
        if phone.startswith("+1") or not phone.startswith("+"):
            # Nacional (USA/Mexico)
            return self.cost_config.sms_national_cost
        else:
            # Internacional
            return self.cost_config.sms_international_cost
    
    def _check_sms_budget_available(self) -> bool:
        """Verifica si hay presupuesto disponible para SMS"""
        if self.settings.monthly_sms_budget <= 0:
            # Sin presupuesto configurado = sin límite (pero SMS desactivado por defecto)
            return True
        
        return self.settings.sms_spent_current_month < self.settings.monthly_sms_budget
    
    def _update_sms_spending(self, amount: float):
        """Actualiza gasto mensual de SMS"""
        self.settings.sms_spent_current_month += amount
        self.db.commit()
        
        # Verificar si se alcanzó el threshold de alerta
        if (self.settings.sms_spent_current_month >= 
            self.settings.monthly_sms_budget * self.settings.sms_budget_alert_threshold):
            logger.warning(
                f"SMS budget alert: {self.settings.sms_spent_current_month:.2f} / "
                f"{self.settings.monthly_sms_budget:.2f} spent"
            )
    
    async def _get_user_preferences(self, user_id: str) -> Optional[UserNotificationPreferences]:
        """Obtiene preferencias de notificación del usuario"""
        return self.db.query(UserNotificationPreferences).filter(
            UserNotificationPreferences.user_id == user_id
        ).first()
    
    async def _log_notification(
        self,
        user_id: str,
        notification_type: str,
        channel_used: Optional[str],
        channels_attempted: List[str],
        status: str,
        subject: str,
        content: str,
        cost_incurred: float = 0.0,
        cost_saved: float = 0.0,
        error_message: Optional[str] = None,
        whatsapp_check_performed: bool = False,
        whatsapp_available: Optional[bool] = None
    ):
        """Registra notificación en log"""
        try:
            log_entry = SmartNotificationLog(
                user_id=user_id,
                notification_type=notification_type,
                channel_used=channel_used,
                channel_attempted=channels_attempted,
                status=status,
                subject=subject,
                content_preview=content[:500] if content else "",
                cost_incurred=cost_incurred,
                cost_saved=cost_saved,
                error_message=error_message,
                whatsapp_check_performed=whatsapp_check_performed,
                whatsapp_available=whatsapp_available,
                sent_at=datetime.utcnow() if status == "sent" else None,
                strategy_used=self.settings.default_strategy
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to log notification: {str(e)}")
    
    # MÉTODOS DE ADMINISTRACIÓN
    
    async def update_global_settings(
        self,
        admin_user_id: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Actualiza configuración global de notificaciones (solo admin)
        
        Parámetros configurables:
        - whatsapp_enabled: bool
        - email_enabled: bool
        - sms_enabled: bool (control de costo)
        - monthly_sms_budget: float
        - auto_fallback_to_sms: bool
        - check_whatsapp_availability: bool
        """
        
        for key, value in kwargs.items():
            if hasattr(self.settings, key):
                setattr(self.settings, key, value)
        
        self.settings.updated_by = admin_user_id
        self.settings.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(self.settings)
        
        logger.info(f"Global notification settings updated by {admin_user_id}")
        
        return {
            "success": True,
            "message": "Settings updated successfully",
            "current_settings": {
                "whatsapp_enabled": self.settings.whatsapp_enabled,
                "email_enabled": self.settings.email_enabled,
                "sms_enabled": self.settings.sms_enabled,
                "monthly_sms_budget": self.settings.monthly_sms_budget,
                "sms_spent_current_month": self.settings.sms_spent_current_month
            }
        }
    
    async def get_cost_analytics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Obtiene analytics de costos de notificaciones"""
        
        logs = self.db.query(SmartNotificationLog).filter(
            SmartNotificationLog.created_at >= start_date,
            SmartNotificationLog.created_at <= end_date
        ).all()
        
        total_notifications = len(logs)
        total_cost_incurred = sum(log.cost_incurred for log in logs)
        total_cost_saved = sum(log.cost_saved for log in logs)
        
        # Por canal
        by_channel = {}
        for log in logs:
            if log.channel_used:
                if log.channel_used not in by_channel:
                    by_channel[log.channel_used] = {
                        "count": 0,
                        "cost": 0.0,
                        "savings": 0.0
                    }
                by_channel[log.channel_used]["count"] += 1
                by_channel[log.channel_used]["cost"] += log.cost_incurred
                by_channel[log.channel_used]["savings"] += log.cost_saved
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_notifications": total_notifications,
                "total_cost_incurred": round(total_cost_incurred, 2),
                "total_cost_saved": round(total_cost_saved, 2),
                "roi": round(total_cost_saved / total_cost_incurred, 2) if total_cost_incurred > 0 else 0
            },
            "by_channel": by_channel,
            "recommendations": self._generate_cost_recommendations(by_channel, total_cost_incurred)
        }
    
    def _generate_cost_recommendations(
        self,
        by_channel: Dict,
        total_cost: float
    ) -> List[str]:
        """Genera recomendaciones para optimización de costos"""
        recommendations = []
        
        sms_count = by_channel.get("sms", {}).get("count", 0)
        sms_cost = by_channel.get("sms", {}).get("cost", 0.0)
        
        if sms_count > 0:
            recommendations.append(
                f"⚠️ Se enviaron {sms_count} SMS con costo de ${sms_cost:.2f}. "
                "Considera activar WhatsApp para reducir costos."
            )
        
        if total_cost > 100:
            recommendations.append(
                f"💡 Costo total de ${total_cost:.2f}. "
                "WhatsApp Business API puede reducir costos hasta 95%."
            )
        
        whatsapp_count = by_channel.get("whatsapp", {}).get("count", 0)
        whatsapp_savings = by_channel.get("whatsapp", {}).get("savings", 0.0)
        
        if whatsapp_count > 0:
            recommendations.append(
                f"✅ WhatsApp envió {whatsapp_count} mensajes GRATIS, "
                f"ahorrando ${whatsapp_savings:.2f} en SMS."
            )
        
        return recommendations


# Export classes
__all__ = [
    "SmartNotificationService",
    "NotificationSettings",
    "UserNotificationPreferences",
    "SmartNotificationLog",
    "NotificationChannel",
    "DeliveryStrategy",
    "ChannelCostConfig",
    "CostTier"
]
