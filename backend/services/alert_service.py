"""
Alert Service - Sistema de Alertas Automáticas
Detecta actividades sospechosas y envía alertas en tiempo real
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import json
from enum import Enum

from models.enhanced_audit_models import (
    EnhancedAuditLog, LoginActivityLog, BookingAuditLog, 
    AIAgentUsageLog, ActionType, RiskLevel
)
from models.rbac_models import User

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertType(Enum):
    MULTIPLE_FAILED_LOGINS = "multiple_failed_logins"
    SUSPICIOUS_LOGIN_LOCATION = "suspicious_login_location"
    HIGH_VALUE_CANCELLATION = "high_value_cancellation"
    UNUSUAL_AI_USAGE_PATTERN = "unusual_ai_usage_pattern"
    BULK_DATA_ACCESS = "bulk_data_access"
    RAPID_BOOKING_MODIFICATIONS = "rapid_booking_modifications"
    OFF_HOURS_ACCESS = "off_hours_access"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_EXPORT_ANOMALY = "data_export_anomaly"
    FAILED_2FA_ATTEMPTS = "failed_2fa_attempts"

class SecurityAlert:
    """Clase para representar una alerta de seguridad"""
    
    def __init__(self, alert_type: AlertType, severity: AlertSeverity, 
                 user_id: str, username: str, description: str,
                 details: Dict[str, Any] = None, affected_resources: List[str] = None):
        self.alert_type = alert_type
        self.severity = severity
        self.user_id = user_id
        self.username = username
        self.description = description
        self.details = details or {}
        self.affected_resources = affected_resources or []
        self.timestamp = datetime.utcnow()
        self.alert_id = f"ALERT_{int(self.timestamp.timestamp())}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_id": self.alert_id,
            "alert_type": self.alert_type.value,
            "severity": self.severity.value,
            "user_id": self.user_id,
            "username": self.username,
            "description": self.description,
            "details": self.details,
            "affected_resources": self.affected_resources,
            "timestamp": self.timestamp.isoformat()
        }

class AlertService:
    """Servicio para detectar y gestionar alertas de seguridad"""
    
    def __init__(self, db: Session):
        self.db = db
        self.alert_handlers = []
        self.active_alerts = []
    
    def add_alert_handler(self, handler):
        """Agregar handler para alertas (email, SMS, webhook, etc.)"""
        self.alert_handlers.append(handler)
    
    async def check_all_security_rules(self):
        """Ejecutar todos los checks de seguridad"""
        try:
            checks = [
                self._check_multiple_failed_logins(),
                self._check_high_value_cancellations(),
                self._check_unusual_ai_usage(),
                self._check_bulk_data_access(),
                self._check_rapid_booking_modifications(),
                self._check_off_hours_access(),
                self._check_data_export_anomalies()
            ]
            
            # Execute all checks concurrently
            results = await asyncio.gather(*checks, return_exceptions=True)
            
            alerts = []
            for result in results:
                if isinstance(result, list):
                    alerts.extend(result)
                elif isinstance(result, Exception):
                    logger.error(f"Security check failed: {result}")
            
            # Process alerts
            for alert in alerts:
                await self._process_alert(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error in security checks: {e}")
            return []
    
    async def _check_multiple_failed_logins(self) -> List[SecurityAlert]:
        """Detectar múltiples intentos de login fallidos"""
        try:
            # Check last 30 minutes
            time_threshold = datetime.utcnow() - timedelta(minutes=30)
            
            failed_attempts = self.db.query(
                LoginActivityLog.username,
                LoginActivityLog.ip_address,
                func.count(LoginActivityLog.id).label('failed_count')
            ).filter(
                LoginActivityLog.attempt_timestamp >= time_threshold,
                LoginActivityLog.success == False
            ).group_by(
                LoginActivityLog.username, 
                LoginActivityLog.ip_address
            ).having(
                func.count(LoginActivityLog.id) >= 5
            ).all()
            
            alerts = []
            for username, ip_address, count in failed_attempts:
                user = self.db.query(User).filter_by(username=username).first()
                user_id = str(user.id) if user else "unknown"
                
                severity = AlertSeverity.HIGH if count >= 10 else AlertSeverity.MEDIUM
                
                alert = SecurityAlert(
                    alert_type=AlertType.MULTIPLE_FAILED_LOGINS,
                    severity=severity,
                    user_id=user_id,
                    username=username,
                    description=f"Usuario {username} tiene {count} intentos de login fallidos desde IP {ip_address}",
                    details={
                        "failed_attempts": count,
                        "ip_address": ip_address,
                        "time_window": "30 minutes"
                    }
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking failed logins: {e}")
            return []
    
    async def _check_high_value_cancellations(self) -> List[SecurityAlert]:
        """Detectar cancelaciones de alto valor"""
        try:
            # Check last 24 hours
            time_threshold = datetime.utcnow() - timedelta(hours=24)
            
            high_value_cancellations = self.db.query(BookingAuditLog).filter(
                BookingAuditLog.timestamp >= time_threshold,
                BookingAuditLog.action == "cancelled",
                BookingAuditLog.amount_before >= 5000  # High value threshold
            ).all()
            
            alerts = []
            for cancellation in high_value_cancellations:
                user = self.db.query(User).filter_by(id=cancellation.user_id).first()
                username = user.username if user else "Unknown"
                
                alert = SecurityAlert(
                    alert_type=AlertType.HIGH_VALUE_CANCELLATION,
                    severity=AlertSeverity.HIGH,
                    user_id=str(cancellation.user_id),
                    username=username,
                    description=f"Cancelación de reserva de alto valor: ${cancellation.amount_before}",
                    details={
                        "booking_id": cancellation.booking_id,
                        "cancelled_amount": cancellation.amount_before,
                        "currency": cancellation.currency,
                        "destination": cancellation.destination,
                        "reason": cancellation.reason
                    },
                    affected_resources=[cancellation.booking_id]
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking high value cancellations: {e}")
            return []
    
    async def _check_unusual_ai_usage(self) -> List[SecurityAlert]:
        """Detectar patrones inusuales de uso de agentes AI"""
        try:
            # Check last 1 hour
            time_threshold = datetime.utcnow() - timedelta(hours=1)
            
            # Users with excessive AI queries
            heavy_usage = self.db.query(
                AIAgentUsageLog.user_id,
                func.count(AIAgentUsageLog.id).label('query_count'),
                func.count(func.distinct(AIAgentUsageLog.agent_name)).label('agents_used')
            ).filter(
                AIAgentUsageLog.timestamp >= time_threshold
            ).group_by(AIAgentUsageLog.user_id).having(
                func.count(AIAgentUsageLog.id) >= 50  # Threshold for excessive usage
            ).all()
            
            alerts = []
            for user_id, query_count, agents_used in heavy_usage:
                user = self.db.query(User).filter_by(id=user_id).first()
                username = user.username if user else "Unknown"
                
                severity = AlertSeverity.CRITICAL if query_count >= 100 else AlertSeverity.HIGH
                
                alert = SecurityAlert(
                    alert_type=AlertType.UNUSUAL_AI_USAGE_PATTERN,
                    severity=severity,
                    user_id=str(user_id),
                    username=username,
                    description=f"Uso inusual de agentes AI: {query_count} consultas en 1 hora",
                    details={
                        "query_count": query_count,
                        "agents_used": agents_used,
                        "time_window": "1 hour"
                    }
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking AI usage patterns: {e}")
            return []
    
    async def _check_bulk_data_access(self) -> List[SecurityAlert]:
        """Detectar acceso masivo a datos"""
        try:
            # Check last 2 hours
            time_threshold = datetime.utcnow() - timedelta(hours=2)
            
            bulk_access = self.db.query(EnhancedAuditLog).filter(
                EnhancedAuditLog.timestamp >= time_threshold,
                EnhancedAuditLog.action_type == ActionType.DATA_EXPORTED,
                EnhancedAuditLog.business_context.contains('"records_count"')
            ).all()
            
            alerts = []
            for access in bulk_access:
                # Extract records count from business context
                records_count = 0
                if access.business_context and 'records_count' in access.business_context:
                    records_count = access.business_context.get('records_count', 0)
                
                if records_count >= 1000:  # Threshold for bulk access
                    user = self.db.query(User).filter_by(id=access.user_id).first()
                    username = user.username if user else "Unknown"
                    
                    severity = AlertSeverity.CRITICAL if records_count >= 10000 else AlertSeverity.HIGH
                    
                    alert = SecurityAlert(
                        alert_type=AlertType.BULK_DATA_ACCESS,
                        severity=severity,
                        user_id=str(access.user_id),
                        username=username,
                        description=f"Acceso masivo a datos: {records_count} registros",
                        details={
                            "records_count": records_count,
                            "data_type": access.resource_type,
                            "access_type": access.business_context.get('access_type', 'unknown')
                        }
                    )
                    alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking bulk data access: {e}")
            return []
    
    async def _check_rapid_booking_modifications(self) -> List[SecurityAlert]:
        """Detectar modificaciones rápidas de reservas"""
        try:
            # Check last 1 hour
            time_threshold = datetime.utcnow() - timedelta(hours=1)
            
            rapid_modifications = self.db.query(
                BookingAuditLog.user_id,
                BookingAuditLog.booking_id,
                func.count(BookingAuditLog.id).label('modification_count')
            ).filter(
                BookingAuditLog.timestamp >= time_threshold,
                BookingAuditLog.action.in_(["modified", "cancelled", "confirmed"])
            ).group_by(
                BookingAuditLog.user_id, 
                BookingAuditLog.booking_id
            ).having(
                func.count(BookingAuditLog.id) >= 5  # 5+ modifications in 1 hour
            ).all()
            
            alerts = []
            for user_id, booking_id, count in rapid_modifications:
                user = self.db.query(User).filter_by(id=user_id).first()
                username = user.username if user else "Unknown"
                
                alert = SecurityAlert(
                    alert_type=AlertType.RAPID_BOOKING_MODIFICATIONS,
                    severity=AlertSeverity.MEDIUM,
                    user_id=str(user_id),
                    username=username,
                    description=f"Modificaciones rápidas en reserva: {count} cambios en 1 hora",
                    details={
                        "booking_id": booking_id,
                        "modification_count": count,
                        "time_window": "1 hour"
                    },
                    affected_resources=[booking_id]
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking rapid booking modifications: {e}")
            return []
    
    async def _check_off_hours_access(self) -> List[SecurityAlert]:
        """Detectar acceso fuera de horas laborales"""
        try:
            # Check last 24 hours
            time_threshold = datetime.utcnow() - timedelta(hours=24)
            
            # Define business hours (9 AM to 6 PM)
            current_hour = datetime.utcnow().hour
            
            if current_hour < 9 or current_hour >= 18:  # Outside business hours
                off_hours_access = self.db.query(EnhancedAuditLog).filter(
                    EnhancedAuditLog.timestamp >= time_threshold,
                    EnhancedAuditLog.action_type.in_([
                        ActionType.LOGIN_SUCCESS,
                        ActionType.BOOKING_CREATED,
                        ActionType.BOOKING_MODIFIED,
                        ActionType.DATA_EXPORTED
                    ])
                ).all()
                
                # Group by user
                user_activities = {}
                for activity in off_hours_access:
                    if activity.user_id not in user_activities:
                        user_activities[activity.user_id] = []
                    user_activities[activity.user_id].append(activity)
                
                alerts = []
                for user_id, activities in user_activities.items():
                    if len(activities) >= 5:  # Significant off-hours activity
                        user = self.db.query(User).filter_by(id=user_id).first()
                        username = user.username if user else "Unknown"
                        
                        alert = SecurityAlert(
                            alert_type=AlertType.OFF_HOURS_ACCESS,
                            severity=AlertSeverity.MEDIUM,
                            user_id=str(user_id),
                            username=username,
                            description=f"Actividad fuera de horas laborales: {len(activities)} acciones",
                            details={
                                "activity_count": len(activities),
                                "current_hour": current_hour,
                                "activities": [a.action_type.value for a in activities[:5]]
                            }
                        )
                        alerts.append(alert)
                
                return alerts
            
            return []
            
        except Exception as e:
            logger.error(f"Error checking off-hours access: {e}")
            return []
    
    async def _check_data_export_anomalies(self) -> List[SecurityAlert]:
        """Detectar anomalías en exportación de datos"""
        try:
            # Check last 6 hours
            time_threshold = datetime.utcnow() - timedelta(hours=6)
            
            data_exports = self.db.query(EnhancedAuditLog).filter(
                EnhancedAuditLog.timestamp >= time_threshold,
                EnhancedAuditLog.action_type == ActionType.DATA_EXPORTED,
                EnhancedAuditLog.is_sensitive == True
            ).all()
            
            alerts = []
            for export in data_exports:
                user = self.db.query(User).filter_by(id=export.user_id).first()
                username = user.username if user else "Unknown"
                
                # Check if this is unusual for this user
                historical_exports = self.db.query(func.count(EnhancedAuditLog.id)).filter(
                    EnhancedAuditLog.user_id == export.user_id,
                    EnhancedAuditLog.action_type == ActionType.DATA_EXPORTED,
                    EnhancedAuditLog.timestamp >= datetime.utcnow() - timedelta(days=30)
                ).scalar()
                
                if historical_exports <= 2:  # Unusual for this user
                    alert = SecurityAlert(
                        alert_type=AlertType.DATA_EXPORT_ANOMALY,
                        severity=AlertSeverity.HIGH,
                        user_id=str(export.user_id),
                        username=username,
                        description=f"Exportación inusual de datos sensibles por usuario que raramente exporta",
                        details={
                            "data_type": export.resource_type,
                            "historical_exports": historical_exports,
                            "is_sensitive": export.is_sensitive
                        }
                    )
                    alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking data export anomalies: {e}")
            return []
    
    async def _process_alert(self, alert: SecurityAlert):
        """Procesar una alerta detectada"""
        try:
            # Add to active alerts
            self.active_alerts.append(alert)
            
            # Log the alert
            logger.warning(f"SECURITY ALERT: {alert.alert_type.value} - {alert.description}")
            
            # Send to handlers
            for handler in self.alert_handlers:
                try:
                    await handler(alert)
                except Exception as e:
                    logger.error(f"Alert handler failed: {e}")
            
            # Store in database (if you have an alerts table)
            # This would require an AlertLog model
            
        except Exception as e:
            logger.error(f"Error processing alert: {e}")
    
    def get_active_alerts(self, severity_filter: AlertSeverity = None) -> List[Dict[str, Any]]:
        """Obtener alertas activas"""
        alerts = self.active_alerts
        
        if severity_filter:
            alerts = [a for a in alerts if a.severity == severity_filter]
        
        return [alert.to_dict() for alert in alerts]
    
    def clear_old_alerts(self, hours: int = 24):
        """Limpiar alertas antiguas"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        self.active_alerts = [
            alert for alert in self.active_alerts 
            if alert.timestamp > cutoff_time
        ]

# Alert handlers
async def email_alert_handler(alert: SecurityAlert):
    """Handler para enviar alertas por email"""
    # TODO: Implement email sending
    logger.info(f"EMAIL ALERT: {alert.description}")

async def webhook_alert_handler(alert: SecurityAlert):
    """Handler para enviar alertas via webhook"""
    # TODO: Implement webhook
    logger.info(f"WEBHOOK ALERT: {alert.description}")

async def sms_alert_handler(alert: SecurityAlert):
    """Handler para enviar alertas por SMS"""
    # TODO: Implement SMS sending
    logger.info(f"SMS ALERT: {alert.description}")

# Singleton instance
def get_alert_service(db: Session) -> AlertService:
    """Get alert service instance"""
    service = AlertService(db)
    # Add default handlers
    service.add_alert_handler(email_alert_handler)
    service.add_alert_handler(webhook_alert_handler)
    return service