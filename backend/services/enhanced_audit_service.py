"""
Enhanced Audit Service
Servicio completo de auditoría y logging para todas las acciones del sistema
"""

import json
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func, text
import asyncio
import time
from contextlib import asynccontextmanager

from backend.models.rbac_models import User
from backend.models.enhanced_audit_models import (
    EnhancedAuditLog, BookingAuditLog, AIAgentUsageLog, 
    LoginActivityLog, DataAccessLog, ActionType, RiskLevel
)

logger = logging.getLogger(__name__)

class EnhancedAuditService:
    """Servicio completo de auditoría y logging"""
    
    def __init__(self, db: Session):
        self.db = db
        self.correlation_id = None
        self.session_start_time = None
    
    def set_correlation_id(self, correlation_id: str):
        """Establecer ID de correlación para agrupar acciones relacionadas"""
        self.correlation_id = correlation_id
    
    def generate_correlation_id(self) -> str:
        """Generar nuevo ID de correlación"""
        import uuid
        correlation_id = str(uuid.uuid4())[:8]
        self.correlation_id = correlation_id
        return correlation_id
    
    @asynccontextmanager
    async def audit_context(self, user_id: str, action_description: str):
        """Context manager para auditoría automática con timing"""
        start_time = time.time()
        correlation_id = self.generate_correlation_id()
        
        try:
            yield correlation_id
        except Exception as e:
            # Log error in audit
            await self.log_error_action(
                user_id=user_id,
                error_description=f"Error in {action_description}: {str(e)}",
                correlation_id=correlation_id
            )
            raise
        finally:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Action completed: {action_description} in {duration_ms}ms")
    
    # === BOOKING AUDIT METHODS ===
    
    async def log_booking_created(self, user_id: str, booking_data: Dict[str, Any], 
                                 customer_id: str = None, ip_address: str = None):
        """Registrar creación de reserva"""
        try:
            # Enhanced audit log
            await self.create_enhanced_audit_log(
                user_id=user_id,
                action_type=ActionType.BOOKING_CREATED,
                resource_type="booking",
                resource_id=booking_data.get("id"),
                resource_name=f"Booking {booking_data.get('destination', 'Unknown')}",
                new_values=booking_data,
                description=f"Nueva reserva creada para {booking_data.get('destination')}",
                business_context={
                    "customer_id": customer_id,
                    "service_type": booking_data.get("service_type"),
                    "travel_dates": booking_data.get("travel_dates"),
                    "total_amount": booking_data.get("total_amount")
                },
                amount=booking_data.get("total_amount"),
                currency=booking_data.get("currency", "USD"),
                risk_level=RiskLevel.MEDIUM if booking_data.get("total_amount", 0) > 5000 else RiskLevel.LOW,
                ip_address=ip_address
            )
            
            # Specific booking audit log
            booking_audit = BookingAuditLog(
                booking_id=booking_data.get("id"),
                user_id=user_id,
                customer_id=customer_id,
                action="created",
                booking_status_after=booking_data.get("status", "pending"),
                amount_after=booking_data.get("total_amount"),
                currency=booking_data.get("currency", "USD"),
                service_type=booking_data.get("service_type"),
                destination=booking_data.get("destination"),
                travel_dates=booking_data.get("travel_dates"),
                changes_made={"action": "booking_created", "initial_data": booking_data},
                ip_address=ip_address
            )
            
            self.db.add(booking_audit)
            self.db.commit()
            
            logger.info(f"Booking creation logged for user {user_id}, booking {booking_data.get('id')}")
            
        except Exception as e:
            logger.error(f"Error logging booking creation: {e}")
    
    async def log_booking_modified(self, user_id: str, booking_id: str, 
                                  old_values: Dict[str, Any], new_values: Dict[str, Any],
                                  reason: str = None, ip_address: str = None):
        """Registrar modificación de reserva"""
        try:
            # Calculate changed fields
            changed_fields = []
            for key, new_value in new_values.items():
                old_value = old_values.get(key)
                if old_value != new_value:
                    changed_fields.append({
                        "field": key,
                        "old_value": old_value,
                        "new_value": new_value
                    })
            
            # Determine risk level
            risk_level = RiskLevel.LOW
            if any(field["field"] in ["total_amount", "status", "travel_dates"] for field in changed_fields):
                risk_level = RiskLevel.MEDIUM
            if old_values.get("status") == "confirmed" and new_values.get("status") == "cancelled":
                risk_level = RiskLevel.HIGH
            
            # Enhanced audit log
            await self.create_enhanced_audit_log(
                user_id=user_id,
                action_type=ActionType.BOOKING_MODIFIED,
                resource_type="booking",
                resource_id=booking_id,
                resource_name=f"Booking {old_values.get('destination', booking_id)}",
                old_values=old_values,
                new_values=new_values,
                changed_fields=changed_fields,
                description=f"Reserva modificada: {len(changed_fields)} campos cambiados",
                business_context={
                    "modification_reason": reason,
                    "changed_fields_count": len(changed_fields),
                    "status_change": old_values.get("status") != new_values.get("status")
                },
                risk_level=risk_level,
                ip_address=ip_address
            )
            
            # Specific booking audit log
            booking_audit = BookingAuditLog(
                booking_id=booking_id,
                user_id=user_id,
                customer_id=new_values.get("customer_id"),
                action="modified",
                booking_status_before=old_values.get("status"),
                booking_status_after=new_values.get("status"),
                amount_before=old_values.get("total_amount"),
                amount_after=new_values.get("total_amount"),
                currency=new_values.get("currency"),
                service_type=new_values.get("service_type"),
                destination=new_values.get("destination"),
                changes_made={"changed_fields": changed_fields, "reason": reason},
                reason=reason,
                ip_address=ip_address
            )
            
            self.db.add(booking_audit)
            self.db.commit()
            
            logger.info(f"Booking modification logged for user {user_id}, booking {booking_id}")
            
        except Exception as e:
            logger.error(f"Error logging booking modification: {e}")
    
    async def log_booking_cancelled(self, user_id: str, booking_id: str, 
                                   booking_data: Dict[str, Any], reason: str = None,
                                   refund_amount: float = None, ip_address: str = None):
        """Registrar cancelación de reserva"""
        try:
            # Enhanced audit log
            await self.create_enhanced_audit_log(
                user_id=user_id,
                action_type=ActionType.BOOKING_CANCELLED,
                resource_type="booking",
                resource_id=booking_id,
                resource_name=f"Booking {booking_data.get('destination', booking_id)}",
                old_values=booking_data,
                new_values={"status": "cancelled", "cancelled_at": datetime.utcnow().isoformat()},
                description=f"Reserva cancelada: {booking_data.get('destination')}",
                business_context={
                    "cancellation_reason": reason,
                    "original_amount": booking_data.get("total_amount"),
                    "refund_amount": refund_amount,
                    "customer_id": booking_data.get("customer_id")
                },
                amount=refund_amount,
                currency=booking_data.get("currency", "USD"),
                risk_level=RiskLevel.HIGH,  # Cancellations are always high risk
                requires_review=True,
                ip_address=ip_address
            )
            
            # Specific booking audit log
            booking_audit = BookingAuditLog(
                booking_id=booking_id,
                user_id=user_id,
                customer_id=booking_data.get("customer_id"),
                action="cancelled",
                booking_status_before=booking_data.get("status"),
                booking_status_after="cancelled",
                amount_before=booking_data.get("total_amount"),
                amount_after=refund_amount or 0,
                currency=booking_data.get("currency"),
                service_type=booking_data.get("service_type"),
                destination=booking_data.get("destination"),
                changes_made={"action": "cancelled", "refund_amount": refund_amount},
                reason=reason,
                requires_approval=refund_amount and refund_amount > 1000,  # Large refunds need approval
                ip_address=ip_address
            )
            
            self.db.add(booking_audit)
            self.db.commit()
            
            logger.warning(f"Booking cancellation logged for user {user_id}, booking {booking_id}")
            
        except Exception as e:
            logger.error(f"Error logging booking cancellation: {e}")
    
    # === AI AGENT USAGE LOGGING ===
    
    async def log_ai_agent_usage(self, user_id: str, agent_name: str, 
                                query_text: str, response_summary: str = None,
                                customer_id: str = None, booking_id: str = None,
                                action_taken: str = None, response_time_ms: int = None,
                                session_id: str = None, ip_address: str = None):
        """Registrar uso de agente AI"""
        try:
            # Enhanced audit log
            await self.create_enhanced_audit_log(
                user_id=user_id,
                action_type=ActionType.AI_AGENT_ACCESSED,
                resource_type="ai_agent",
                resource_id=agent_name,
                resource_name=f"AI Agent: {agent_name.replace('_', ' ').title()}",
                description=f"Usuario consultó agente AI {agent_name}",
                business_context={
                    "query_summary": query_text[:200] if query_text else None,
                    "response_time_ms": response_time_ms,
                    "customer_context": customer_id,
                    "booking_context": booking_id,
                    "action_taken": action_taken
                },
                risk_level=RiskLevel.LOW,
                ip_address=ip_address
            )
            
            # Specific AI usage log
            ai_usage = AIAgentUsageLog(
                user_id=user_id,
                session_id=session_id,
                agent_name=agent_name,
                agent_type="ai_assistant",
                query_text=query_text,
                response_summary=response_summary,
                response_time_ms=response_time_ms,
                customer_id=customer_id,
                booking_id=booking_id,
                action_taken=action_taken,
                ip_address=ip_address
            )
            
            self.db.add(ai_usage)
            self.db.commit()
            
            logger.info(f"AI agent usage logged: {user_id} used {agent_name}")
            
        except Exception as e:
            logger.error(f"Error logging AI agent usage: {e}")
    
    # === LOGIN ACTIVITY LOGGING ===
    
    async def log_login_attempt(self, username: str, success: bool, user_id: str = None,
                               failure_reason: str = None, two_fa_used: bool = False,
                               ip_address: str = None, user_agent: str = None,
                               session_id: str = None, risk_score: float = None):
        """Registrar intento de login"""
        try:
            # Enhanced audit log
            if user_id:
                action_type = ActionType.LOGIN_SUCCESS if success else ActionType.LOGIN_FAILED
                await self.create_enhanced_audit_log(
                    user_id=user_id,
                    action_type=action_type,
                    resource_type="authentication",
                    resource_id="login",
                    description=f"Login {'exitoso' if success else 'fallido'} para {username}",
                    business_context={
                        "two_fa_used": two_fa_used,
                        "failure_reason": failure_reason,
                        "risk_score": risk_score
                    },
                    risk_level=RiskLevel.HIGH if not success else (RiskLevel.MEDIUM if risk_score and risk_score > 50 else RiskLevel.LOW),
                    ip_address=ip_address
                )
            
            # Specific login log
            login_log = LoginActivityLog(
                user_id=user_id,
                username=username,
                success=success,
                failure_reason=failure_reason,
                two_fa_used=two_fa_used,
                session_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
                risk_score=risk_score,
                is_suspicious=risk_score and risk_score > 70
            )
            
            self.db.add(login_log)
            self.db.commit()
            
            logger.info(f"Login attempt logged: {username} - {'Success' if success else 'Failed'}")
            
        except Exception as e:
            logger.error(f"Error logging login attempt: {e}")
    
    # === DATA ACCESS LOGGING ===
    
    async def log_data_access(self, user_id: str, data_type: str, record_id: str = None,
                             records_count: int = 1, access_type: str = "view",
                             business_justification: str = None, endpoint: str = None,
                             query_parameters: Dict[str, Any] = None, ip_address: str = None):
        """Registrar acceso a datos sensibles"""
        try:
            # Determine if this is sensitive data
            sensitive_data_types = ["customer_pii", "financial_data", "payment_info", "personal_data"]
            is_sensitive = data_type.lower() in sensitive_data_types
            
            # Enhanced audit log
            await self.create_enhanced_audit_log(
                user_id=user_id,
                action_type=ActionType.DATA_EXPORTED if access_type == "export" else ActionType.DASHBOARD_VIEWED,
                resource_type=data_type,
                resource_id=record_id,
                description=f"Acceso a {data_type}: {access_type}",
                business_context={
                    "access_type": access_type,
                    "records_count": records_count,
                    "business_justification": business_justification,
                    "endpoint": endpoint
                },
                risk_level=RiskLevel.HIGH if is_sensitive and access_type == "export" else RiskLevel.MEDIUM,
                is_sensitive=is_sensitive,
                requires_review=is_sensitive and records_count > 100,
                ip_address=ip_address
            )
            
            # Specific data access log
            data_access = DataAccessLog(
                user_id=user_id,
                data_type=data_type,
                record_id=record_id,
                records_count=records_count,
                access_type=access_type,
                business_justification=business_justification,
                endpoint=endpoint,
                query_parameters=query_parameters,
                gdpr_compliant=True,  # Assume GDPR compliant unless specified
                ip_address=ip_address
            )
            
            self.db.add(data_access)
            self.db.commit()
            
            logger.info(f"Data access logged: {user_id} accessed {data_type} ({records_count} records)")
            
        except Exception as e:
            logger.error(f"Error logging data access: {e}")
    
    # === CORE AUDIT METHODS ===
    
    async def create_enhanced_audit_log(self, user_id: str, action_type: ActionType,
                                       resource_type: str, resource_id: str = None,
                                       resource_name: str = None, old_values: Dict = None,
                                       new_values: Dict = None, changed_fields: List = None,
                                       description: str = None, business_context: Dict = None,
                                       risk_level: RiskLevel = RiskLevel.LOW, is_sensitive: bool = False,
                                       requires_review: bool = False, amount: float = None,
                                       currency: str = None, tags: List[str] = None,
                                       ip_address: str = None, user_agent: str = None,
                                       endpoint: str = None, method: str = None,
                                       duration_ms: int = None, session_id: str = None):
        """Crear log de auditoría mejorado"""
        try:
            audit_log = EnhancedAuditLog(
                user_id=user_id,
                session_id=session_id or self.correlation_id,
                action_type=action_type,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                old_values=old_values,
                new_values=new_values,
                changed_fields=changed_fields,
                description=description,
                business_context=business_context,
                risk_level=risk_level,
                is_sensitive=is_sensitive,
                requires_review=requires_review,
                amount=amount,
                currency=currency,
                tags=tags,
                ip_address=ip_address,
                user_agent=user_agent,
                endpoint=endpoint,
                method=method,
                duration_ms=duration_ms,
                correlation_id=self.correlation_id
            )
            
            self.db.add(audit_log)
            self.db.commit()
            
            logger.debug(f"Enhanced audit log created: {action_type.value} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error creating enhanced audit log: {e}")
    
    async def log_error_action(self, user_id: str, error_description: str,
                              correlation_id: str = None, ip_address: str = None):
        """Registrar acción que resultó en error"""
        try:
            await self.create_enhanced_audit_log(
                user_id=user_id,
                action_type=ActionType.SECURITY_VIOLATION,
                resource_type="system_error",
                description=f"Error del sistema: {error_description}",
                business_context={"error_type": "system_error", "correlation_id": correlation_id},
                risk_level=RiskLevel.MEDIUM,
                requires_review=True,
                ip_address=ip_address
            )
        except Exception as e:
            logger.error(f"Error logging error action: {e}")
    
    # === QUERY METHODS ===
    
    async def get_user_activity_summary(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Obtener resumen de actividad del usuario"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get activity counts by action type
            activity_counts = self.db.query(
                EnhancedAuditLog.action_type, 
                func.count(EnhancedAuditLog.id).label('count')
            ).filter(
                EnhancedAuditLog.user_id == user_id,
                EnhancedAuditLog.timestamp >= start_date
            ).group_by(EnhancedAuditLog.action_type).all()
            
            # Get booking activity
            booking_activity = self.db.query(
                BookingAuditLog.action,
                func.count(BookingAuditLog.id).label('count')
            ).filter(
                BookingAuditLog.user_id == user_id,
                BookingAuditLog.timestamp >= start_date
            ).group_by(BookingAuditLog.action).all()
            
            # Get AI agent usage
            ai_usage = self.db.query(
                AIAgentUsageLog.agent_name,
                func.count(AIAgentUsageLog.id).label('count')
            ).filter(
                AIAgentUsageLog.user_id == user_id,
                AIAgentUsageLog.timestamp >= start_date
            ).group_by(AIAgentUsageLog.agent_name).all()
            
            return {
                "user_id": user_id,
                "period_days": days,
                "activity_summary": {
                    "total_actions": sum([count for _, count in activity_counts]),
                    "actions_by_type": {action_type.value: count for action_type, count in activity_counts},
                    "booking_actions": {action: count for action, count in booking_activity},
                    "ai_agents_used": {agent: count for agent, count in ai_usage}
                },
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting user activity summary: {e}")
            return {}
    
    async def get_system_audit_dashboard(self, days: int = 7) -> Dict[str, Any]:
        """Obtener dashboard de auditoría del sistema"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # High-risk activities
            high_risk_count = self.db.query(func.count(EnhancedAuditLog.id)).filter(
                EnhancedAuditLog.timestamp >= start_date,
                EnhancedAuditLog.risk_level == RiskLevel.HIGH
            ).scalar()
            
            # Actions requiring review
            review_count = self.db.query(func.count(EnhancedAuditLog.id)).filter(
                EnhancedAuditLog.timestamp >= start_date,
                EnhancedAuditLog.requires_review == True
            ).scalar()
            
            # Most active users
            active_users = self.db.query(
                User.username,
                func.count(EnhancedAuditLog.id).label('action_count')
            ).join(EnhancedAuditLog).filter(
                EnhancedAuditLog.timestamp >= start_date
            ).group_by(User.username).order_by(desc('action_count')).limit(10).all()
            
            return {
                "period_days": days,
                "high_risk_activities": high_risk_count,
                "activities_requiring_review": review_count,
                "most_active_users": [
                    {"username": username, "action_count": count}
                    for username, count in active_users
                ],
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting system audit dashboard: {e}")
            return {}

# Singleton instance
audit_service = None

def get_audit_service(db: Session) -> EnhancedAuditService:
    """Get audit service instance"""
    return EnhancedAuditService(db)