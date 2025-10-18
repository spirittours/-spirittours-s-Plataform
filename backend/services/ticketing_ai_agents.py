"""
Agentes de IA Especializados para Sistema de Ticketing
5 agentes inteligentes para optimización, predicción y automatización
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import logging
import math

from backend.models.ticketing_models import (
    Ticket, TicketAssignment, TicketPriority, TicketStatus, TicketType,
    EscalationReason, Department
)
from backend.models.rbac_models import User

logger = logging.getLogger(__name__)

# ============================================================================
# 1. AGENTE PRIORIZADOR DE TAREAS
# ============================================================================

class TaskPrioritizerAgent:
    """
    Agente de IA para calcular prioridad dinámica de tickets
    
    Factores de cálculo:
    - Proximidad al deadline (35%): Urgencia temporal
    - Impacto en negocio (25%): Valor del cliente, tipo de ticket
    - Estado del cliente VIP (20%): Clientes premium tienen más prioridad
    - Dependencias (15%): Tickets bloqueados o bloqueadores
    - Antigüedad del ticket (5%): Tickets muy antiguos suben prioridad
    
    Score: 0-100 (mayor = más prioritario)
    """
    
    WEIGHTS = {
        'deadline_proximity': 0.35,
        'business_impact': 0.25,
        'customer_vip': 0.20,
        'dependencies': 0.15,
        'age': 0.05
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_priority_score(self, ticket: Ticket) -> Decimal:
        """
        Calcula el score de prioridad para un ticket
        
        Returns:
            Score de 0 a 100
        """
        scores = {
            'deadline': self._score_deadline_proximity(ticket),
            'impact': self._score_business_impact(ticket),
            'vip': self._score_customer_vip(ticket),
            'deps': self._score_dependencies(ticket),
            'age': self._score_ticket_age(ticket)
        }
        
        # Calcular score total ponderado
        total_score = (
            scores['deadline'] * self.WEIGHTS['deadline_proximity'] +
            scores['impact'] * self.WEIGHTS['business_impact'] +
            scores['vip'] * self.WEIGHTS['customer_vip'] +
            scores['deps'] * self.WEIGHTS['dependencies'] +
            scores['age'] * self.WEIGHTS['age']
        )
        
        # Bonus por prioridad manual
        priority_bonus = {
            TicketPriority.CRITICAL: 20,
            TicketPriority.HIGH: 10,
            TicketPriority.MEDIUM: 0,
            TicketPriority.LOW: -10,
            TicketPriority.BACKLOG: -20
        }
        
        total_score += priority_bonus.get(ticket.priority, 0)
        
        # Limitar entre 0 y 100
        final_score = max(0, min(100, total_score))
        
        logger.info(f"Ticket {ticket.ticket_number} - Priority Score: {final_score:.2f} "
                   f"(deadline: {scores['deadline']:.1f}, impact: {scores['impact']:.1f}, "
                   f"vip: {scores['vip']:.1f}, deps: {scores['deps']:.1f}, age: {scores['age']:.1f})")
        
        return Decimal(str(round(final_score, 2)))
    
    def _score_deadline_proximity(self, ticket: Ticket) -> float:
        """Score basado en proximidad al deadline (0-100)"""
        if not ticket.due_date:
            return 30  # Score neutral si no hay deadline
        
        now = datetime.now(timezone.utc)
        time_until_due = (ticket.due_date - now).total_seconds()
        hours_until_due = time_until_due / 3600
        
        # Vencido = 100 puntos
        if hours_until_due <= 0:
            return 100
        
        # < 4 horas = 95 puntos
        if hours_until_due < 4:
            return 95
        
        # < 24 horas = 80 puntos
        if hours_until_due < 24:
            return 80
        
        # < 3 días = 60 puntos
        if hours_until_due < 72:
            return 60
        
        # < 7 días = 40 puntos
        if hours_until_due < 168:
            return 40
        
        # > 7 días = 20 puntos
        return 20
    
    def _score_business_impact(self, ticket: Ticket) -> float:
        """Score basado en impacto en negocio (0-100)"""
        # Factores de impacto por tipo de ticket
        type_impact = {
            TicketType.BUG: 70,           # Bugs son alta prioridad
            TicketType.SUPPORT: 60,       # Soporte a cliente importante
            TicketType.FEATURE: 40,       # Features pueden esperar
            TicketType.IMPROVEMENT: 35,
            TicketType.MAINTENANCE: 45,
            TicketType.TASK: 50,
            TicketType.DOCUMENTATION: 25,
            TicketType.RESEARCH: 30
        }
        
        base_score = type_impact.get(ticket.ticket_type, 50)
        
        # Bonus si está relacionado con booking o invoice (dinero involucrado)
        if ticket.booking_id or ticket.invoice_id:
            base_score += 20
        
        # Bonus si está relacionado con email de cliente
        if ticket.email_message_id:
            base_score += 10
        
        return min(100, base_score)
    
    def _score_customer_vip(self, ticket: Ticket) -> float:
        """Score basado en estado VIP del cliente (0-100)"""
        if not ticket.customer_id:
            return 30  # Score neutral
        
        # TODO: Integrar con CRM para verificar si es cliente VIP
        # Por ahora, usar tags como indicador
        vip_tags = ['vip', 'premium', 'priority', 'gold', 'platinum']
        is_vip = any(tag.lower() in vip_tags for tag in ticket.tags)
        
        if is_vip:
            return 90
        
        # Si tiene booking reciente = cliente activo
        if ticket.booking_id:
            return 60
        
        return 30
    
    def _score_dependencies(self, ticket: Ticket) -> float:
        """Score basado en dependencias (0-100)"""
        # Tickets que bloquean a otros = alta prioridad
        blocking_count = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.blocked_by_ticket_id == ticket.id)\
            .scalar()
        
        if blocking_count > 0:
            # Por cada ticket bloqueado, +15 puntos (max 90)
            return min(90, 30 + (blocking_count * 15))
        
        # Tickets bloqueados = baja prioridad hasta que se desbloqueen
        if ticket.blocked_by_ticket_id:
            return 10
        
        # Tickets con sub-tickets = prioridad media-alta
        sub_tickets_count = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.parent_ticket_id == ticket.id)\
            .scalar()
        
        if sub_tickets_count > 0:
            return min(70, 40 + (sub_tickets_count * 10))
        
        return 40  # Score neutral
    
    def _score_ticket_age(self, ticket: Ticket) -> float:
        """Score basado en antigüedad del ticket (0-100)"""
        now = datetime.now(timezone.utc)
        age_hours = (now - ticket.created_at).total_seconds() / 3600
        
        # > 30 días = 100 puntos (muy antiguo)
        if age_hours > 720:
            return 100
        
        # > 14 días = 80 puntos
        if age_hours > 336:
            return 80
        
        # > 7 días = 60 puntos
        if age_hours > 168:
            return 60
        
        # > 3 días = 40 puntos
        if age_hours > 72:
            return 40
        
        # < 3 días = 20 puntos
        return 20
    
    def recalculate_all_priorities(self) -> int:
        """
        Recalcula prioridades de todos los tickets abiertos
        
        Returns:
            Número de tickets actualizados
        """
        open_tickets = self.db.query(Ticket)\
            .filter(Ticket.status.notin_([
                TicketStatus.CLOSED,
                TicketStatus.CANCELLED,
                TicketStatus.RESOLVED
            ]))\
            .all()
        
        updated = 0
        for ticket in open_tickets:
            new_score = self.calculate_priority_score(ticket)
            if ticket.ai_priority_score != new_score:
                ticket.ai_priority_score = new_score
                updated += 1
        
        self.db.commit()
        logger.info(f"Recalculadas prioridades de {updated} tickets")
        return updated

# ============================================================================
# 2. AGENTE BALANCEADOR DE CARGA
# ============================================================================

class WorkloadBalancerAgent:
    """
    Agente de IA para balancear carga de trabajo entre empleados
    
    Factores de asignación:
    - Carga actual de trabajo
    - Expertise/especialización
    - Historial de performance
    - Disponibilidad
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def suggest_assignee(
        self,
        ticket: Ticket,
        department_id: Optional[uuid.UUID] = None,
        top_n: int = 3
    ) -> List[Tuple[User, float]]:
        """
        Sugiere los mejores candidatos para asignar un ticket
        
        Args:
            ticket: Ticket a asignar
            department_id: Filtrar por departamento (opcional)
            top_n: Número de sugerencias a retornar
        
        Returns:
            Lista de tuplas (User, confidence_score) ordenadas por score
        """
        # Obtener usuarios candidatos
        query = self.db.query(User).filter(User.is_active == True)
        
        if department_id:
            # TODO: Filtrar por departamento cuando tengamos relación User-Department
            pass
        
        candidates = query.all()
        
        # Calcular score para cada candidato
        scored_candidates = []
        for user in candidates:
            score = self._calculate_assignee_score(user, ticket)
            confidence = self._calculate_confidence(score, user, ticket)
            scored_candidates.append((user, score, confidence))
        
        # Ordenar por score descendente
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Retornar top N
        result = [(user, confidence) for user, score, confidence in scored_candidates[:top_n]]
        
        if result:
            logger.info(f"Ticket {ticket.ticket_number} - Top assignee: {result[0][0].email} "
                       f"(confidence: {result[0][1]:.1f}%)")
        
        return result
    
    def _calculate_assignee_score(self, user: User, ticket: Ticket) -> float:
        """Calcula score de idoneidad de un usuario para un ticket"""
        # Factor 1: Carga actual (40%)
        workload_score = self._score_workload(user)
        
        # Factor 2: Expertise (30%)
        expertise_score = self._score_expertise(user, ticket)
        
        # Factor 3: Performance histórico (20%)
        performance_score = self._score_performance(user)
        
        # Factor 4: Disponibilidad (10%)
        availability_score = self._score_availability(user)
        
        total_score = (
            workload_score * 0.40 +
            expertise_score * 0.30 +
            performance_score * 0.20 +
            availability_score * 0.10
        )
        
        return total_score
    
    def _score_workload(self, user: User) -> float:
        """Score basado en carga de trabajo actual (0-100, mayor = menos carga)"""
        # Contar tickets activos asignados
        active_tickets = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user.id,
                    Ticket.status.in_([
                        TicketStatus.ASSIGNED,
                        TicketStatus.IN_PROGRESS,
                        TicketStatus.PENDING_REVIEW
                    ])
                )
            ).scalar()
        
        # Score inverso: menos tickets = mayor score
        if active_tickets == 0:
            return 100
        elif active_tickets <= 3:
            return 80
        elif active_tickets <= 5:
            return 60
        elif active_tickets <= 8:
            return 40
        elif active_tickets <= 12:
            return 20
        else:
            return 10
    
    def _score_expertise(self, user: User, ticket: Ticket) -> float:
        """Score basado en expertise del usuario (0-100)"""
        # TODO: Implementar sistema de skills/expertise
        # Por ahora, usar historial de tickets similares completados
        
        completed_similar = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user.id,
                    Ticket.ticket_type == ticket.ticket_type,
                    Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
                )
            ).scalar()
        
        if completed_similar >= 20:
            return 95
        elif completed_similar >= 10:
            return 80
        elif completed_similar >= 5:
            return 65
        elif completed_similar >= 1:
            return 50
        else:
            return 30
    
    def _score_performance(self, user: User) -> float:
        """Score basado en performance histórico (0-100)"""
        # Calcular tasa de completitud y tiempo promedio
        total_assigned = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == user.id)\
            .scalar()
        
        if total_assigned == 0:
            return 50  # Neutral para nuevos usuarios
        
        completed = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user.id,
                    Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
                )
            ).scalar()
        
        completion_rate = (completed / total_assigned) * 100
        
        # Score basado en tasa de completitud
        if completion_rate >= 90:
            return 95
        elif completion_rate >= 75:
            return 80
        elif completion_rate >= 60:
            return 65
        elif completion_rate >= 40:
            return 45
        else:
            return 25
    
    def _score_availability(self, user: User) -> float:
        """Score basado en disponibilidad (0-100)"""
        # TODO: Integrar con calendario, vacaciones, horarios
        # Por ahora, verificar tickets vencidos (indicador de sobrecarga)
        
        now = datetime.now(timezone.utc)
        overdue_count = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user.id,
                    Ticket.due_date < now,
                    Ticket.status.notin_([
                        TicketStatus.RESOLVED,
                        TicketStatus.CLOSED,
                        TicketStatus.CANCELLED
                    ])
                )
            ).scalar()
        
        if overdue_count == 0:
            return 100
        elif overdue_count <= 2:
            return 70
        elif overdue_count <= 5:
            return 40
        else:
            return 20
    
    def _calculate_confidence(self, score: float, user: User, ticket: Ticket) -> float:
        """Calcula nivel de confianza en la sugerencia (0-100)"""
        # Confianza basada en:
        # 1. Score absoluto
        # 2. Experiencia del usuario
        # 3. Datos históricos disponibles
        
        total_tickets = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == user.id)\
            .scalar()
        
        # Base confidence = score
        confidence = score
        
        # Ajustar por experiencia
        if total_tickets >= 50:
            confidence += 10
        elif total_tickets >= 20:
            confidence += 5
        elif total_tickets < 5:
            confidence -= 15
        
        # Limitar entre 0 y 100
        return max(0, min(100, confidence))
    
    def auto_assign_ticket(self, ticket: Ticket) -> Optional[Tuple[User, float]]:
        """
        Asigna automáticamente un ticket al mejor candidato
        
        Returns:
            Tupla (User, confidence) si se asigna, None si no hay candidatos
        """
        suggestions = self.suggest_assignee(ticket, top_n=1)
        
        if not suggestions:
            logger.warning(f"No se encontraron candidatos para asignar ticket {ticket.ticket_number}")
            return None
        
        best_user, confidence = suggestions[0]
        
        # Solo auto-asignar si confidence >= 60%
        if confidence >= 60:
            ticket.ai_suggested_assignee_id = best_user.id
            logger.info(f"Ticket {ticket.ticket_number} auto-asignado a {best_user.email} "
                       f"(confidence: {confidence:.1f}%)")
            return (best_user, confidence)
        else:
            ticket.ai_suggested_assignee_id = best_user.id
            logger.info(f"Ticket {ticket.ticket_number} sugerido para {best_user.email} "
                       f"(confidence baja: {confidence:.1f}%)")
            return None

# ============================================================================
# 3. AGENTE PREDICTOR DE COMPLETITUD
# ============================================================================

class CompletionPredictorAgent:
    """
    Agente de IA para predecir tiempo de completitud de tickets
    
    Usa Machine Learning básico (regresión) basado en:
    - Historial de tickets similares
    - Complejidad estimada
    - Carga del asignado
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def predict_completion_time(self, ticket: Ticket) -> Optional[datetime]:
        """
        Predice fecha/hora de completitud del ticket
        
        Returns:
            Datetime predicho o None si no hay suficientes datos
        """
        if not ticket.assigned_to_id:
            return None
        
        # Obtener tickets similares completados del mismo usuario
        similar_tickets = self.db.query(Ticket)\
            .filter(
                and_(
                    Ticket.assigned_to_id == ticket.assigned_to_id,
                    Ticket.ticket_type == ticket.ticket_type,
                    Ticket.priority == ticket.priority,
                    Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
                    Ticket.started_at.isnot(None),
                    Ticket.completed_at.isnot(None)
                )
            )\
            .order_by(desc(Ticket.completed_at))\
            .limit(20)\
            .all()
        
        if len(similar_tickets) < 3:
            # No hay suficientes datos, usar estimación genérica
            return self._generic_estimation(ticket)
        
        # Calcular tiempo promedio de completitud
        completion_times = []
        for t in similar_tickets:
            if t.started_at and t.completed_at:
                duration = (t.completed_at - t.started_at).total_seconds() / 3600  # Horas
                completion_times.append(duration)
        
        if not completion_times:
            return self._generic_estimation(ticket)
        
        # Promedio ponderado (más recientes tienen más peso)
        weighted_avg = self._calculate_weighted_average(completion_times)
        
        # Ajustar por complejidad
        complexity_multiplier = self._get_complexity_multiplier(ticket)
        estimated_hours = weighted_avg * complexity_multiplier
        
        # Ajustar por carga actual del usuario
        workload_multiplier = self._get_workload_multiplier(ticket.assigned_to_id)
        estimated_hours *= workload_multiplier
        
        # Calcular fecha predicha
        start_time = ticket.started_at if ticket.started_at else datetime.now(timezone.utc)
        predicted_completion = start_time + timedelta(hours=estimated_hours)
        
        # Guardar en ticket
        ticket.ai_estimated_completion = predicted_completion
        ticket.ai_complexity_score = Decimal(str(round(complexity_multiplier * 50, 2)))
        
        logger.info(f"Ticket {ticket.ticket_number} - Tiempo estimado: {estimated_hours:.1f}h, "
                   f"Completitud predicha: {predicted_completion.strftime('%Y-%m-%d %H:%M')}")
        
        return predicted_completion
    
    def _generic_estimation(self, ticket: Ticket) -> datetime:
        """Estimación genérica cuando no hay datos históricos"""
        # Estimación base por tipo y prioridad
        base_hours = {
            (TicketType.BUG, TicketPriority.CRITICAL): 4,
            (TicketType.BUG, TicketPriority.HIGH): 8,
            (TicketType.BUG, TicketPriority.MEDIUM): 16,
            (TicketType.BUG, TicketPriority.LOW): 24,
            (TicketType.FEATURE, TicketPriority.HIGH): 40,
            (TicketType.FEATURE, TicketPriority.MEDIUM): 60,
            (TicketType.SUPPORT, TicketPriority.HIGH): 2,
            (TicketType.SUPPORT, TicketPriority.MEDIUM): 4,
            (TicketType.TASK, TicketPriority.MEDIUM): 8,
        }
        
        hours = base_hours.get((ticket.ticket_type, ticket.priority), 16)
        
        start_time = ticket.started_at if ticket.started_at else datetime.now(timezone.utc)
        return start_time + timedelta(hours=hours)
    
    def _calculate_weighted_average(self, values: List[float]) -> float:
        """Calcula promedio ponderado (más recientes tienen más peso)"""
        if not values:
            return 0
        
        weights = [math.exp(-i * 0.1) for i in range(len(values))]  # Decay exponencial
        weighted_sum = sum(v * w for v, w in zip(values, weights))
        total_weight = sum(weights)
        
        return weighted_sum / total_weight if total_weight > 0 else 0
    
    def _get_complexity_multiplier(self, ticket: Ticket) -> float:
        """Multiplica estimación basado en complejidad (0.5 - 2.0)"""
        multiplier = 1.0
        
        # Sub-tickets incrementan complejidad
        sub_tickets_count = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.parent_ticket_id == ticket.id)\
            .scalar()
        
        if sub_tickets_count > 0:
            multiplier += 0.2 * sub_tickets_count
        
        # Checklist items incrementan complejidad
        if hasattr(ticket, 'checklists') and ticket.checklists:
            multiplier += 0.1 * len(ticket.checklists)
        
        # Limitar entre 0.5 y 2.5
        return max(0.5, min(2.5, multiplier))
    
    def _get_workload_multiplier(self, user_id: uuid.UUID) -> float:
        """Multiplica estimación basado en carga actual (1.0 - 2.0)"""
        active_count = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user_id,
                    Ticket.status.in_([
                        TicketStatus.ASSIGNED,
                        TicketStatus.IN_PROGRESS
                    ])
                )
            ).scalar()
        
        if active_count <= 3:
            return 1.0
        elif active_count <= 5:
            return 1.2
        elif active_count <= 8:
            return 1.4
        else:
            return 1.8

# ============================================================================
# 4. AGENTE VERIFICADOR DE CALIDAD
# ============================================================================

class QualityCheckerAgent:
    """
    Agente de IA para verificar calidad antes de cerrar tickets
    
    Verifica:
    - Checklist completado
    - Comentarios de resolución
    - Tiempo en rango esperado
    - Información completa
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_ticket_quality(self, ticket: Ticket) -> Dict[str, Any]:
        """
        Verifica calidad del ticket antes de cerrarlo
        
        Returns:
            Dict con score de calidad y recomendaciones
        """
        checks = {
            'checklist_complete': self._check_checklist(ticket),
            'has_resolution_notes': self._check_resolution_notes(ticket),
            'time_in_range': self._check_time_range(ticket),
            'has_documentation': self._check_documentation(ticket),
            'customer_satisfaction': self._check_customer_satisfaction(ticket)
        }
        
        # Calcular score total (0-100)
        total_score = sum(check['score'] for check in checks.values()) / len(checks)
        
        # Determinar si puede cerrarse
        can_close = total_score >= 70 and all(
            check['score'] >= 50 for check in checks.values()
        )
        
        # Recomendaciones
        recommendations = []
        for check_name, check_result in checks.items():
            if check_result['score'] < 70:
                recommendations.append(check_result['message'])
        
        result = {
            'quality_score': round(total_score, 2),
            'can_close': can_close,
            'checks': checks,
            'recommendations': recommendations
        }
        
        # Guardar en ticket
        ticket.ai_risk_score = Decimal(str(round(100 - total_score, 2)))
        
        logger.info(f"Ticket {ticket.ticket_number} - Quality Score: {total_score:.1f}, "
                   f"Can Close: {can_close}")
        
        return result
    
    def _check_checklist(self, ticket: Ticket) -> Dict[str, Any]:
        """Verifica que el checklist esté completo"""
        total_items = self.db.query(func.count(TicketChecklist.id))\
            .filter(TicketChecklist.ticket_id == ticket.id)\
            .scalar()
        
        if total_items == 0:
            return {'score': 70, 'message': 'No hay checklist definido'}
        
        completed_items = self.db.query(func.count(TicketChecklist.id))\
            .filter(
                and_(
                    TicketChecklist.ticket_id == ticket.id,
                    TicketChecklist.is_completed == True
                )
            ).scalar()
        
        completion_rate = (completed_items / total_items) * 100
        
        if completion_rate == 100:
            return {'score': 100, 'message': 'Checklist completado al 100%'}
        elif completion_rate >= 80:
            return {'score': 80, 'message': f'Checklist completado al {completion_rate:.0f}%'}
        else:
            return {'score': completion_rate, 'message': f'Checklist solo completado al {completion_rate:.0f}%'}
    
    def _check_resolution_notes(self, ticket: Ticket) -> Dict[str, Any]:
        """Verifica que haya comentarios de resolución"""
        resolution_comments = self.db.query(TicketComment)\
            .filter(
                and_(
                    TicketComment.ticket_id == ticket.id,
                    TicketComment.comment_type == CommentType.RESOLUTION
                )
            ).count()
        
        if resolution_comments > 0:
            return {'score': 100, 'message': 'Tiene comentarios de resolución'}
        else:
            return {'score': 30, 'message': 'Falta agregar comentarios de resolución'}
    
    def _check_time_range(self, ticket: Ticket) -> Dict[str, Any]:
        """Verifica que el tiempo esté en rango esperado"""
        if not ticket.started_at or not ticket.completed_at:
            return {'score': 50, 'message': 'No hay registro de tiempos'}
        
        actual_hours = (ticket.completed_at - ticket.started_at).total_seconds() / 3600
        
        if ticket.estimated_hours:
            variance = abs(actual_hours - float(ticket.estimated_hours)) / float(ticket.estimated_hours)
            
            if variance <= 0.2:  # ±20%
                return {'score': 100, 'message': 'Tiempo dentro del estimado'}
            elif variance <= 0.5:  # ±50%
                return {'score': 70, 'message': 'Tiempo cerca del estimado'}
            else:
                return {'score': 40, 'message': f'Tiempo muy desviado del estimado ({variance*100:.0f}%)'}
        
        return {'score': 60, 'message': 'No hay estimación de tiempo para comparar'}
    
    def _check_documentation(self, ticket: Ticket) -> Dict[str, Any]:
        """Verifica que haya documentación adecuada"""
        # Contar comentarios no generados por IA
        comment_count = self.db.query(func.count(TicketComment.id))\
            .filter(
                and_(
                    TicketComment.ticket_id == ticket.id,
                    TicketComment.is_ai_generated == False
                )
            ).scalar()
        
        if comment_count >= 3:
            return {'score': 100, 'message': 'Buena documentación del proceso'}
        elif comment_count >= 1:
            return {'score': 70, 'message': 'Documentación mínima presente'}
        else:
            return {'score': 30, 'message': 'Falta documentación del proceso'}
    
    def _check_customer_satisfaction(self, ticket: Ticket) -> Dict[str, Any]:
        """Verifica satisfacción del cliente (si aplica)"""
        # TODO: Integrar con sistema de feedback de clientes
        # Por ahora, verificar si hay comentarios del cliente
        
        if not ticket.customer_id:
            return {'score': 80, 'message': 'No aplica - ticket interno'}
        
        # Placeholder para futuro sistema de feedback
        return {'score': 70, 'message': 'Pendiente verificación de satisfacción del cliente'}

# ============================================================================
# 5. AGENTE DE ESCALACIÓN AUTOMÁTICA
# ============================================================================

class EscalationAgent:
    """
    Agente de IA para escalación automática de tickets
    
    Triggers de escalación:
    - Vencido > 24h sin progreso
    - Alto riesgo o complejidad
    - Múltiples reasignaciones
    - Bloqueado por mucho tiempo
    """
    
    ESCALATION_RULES = {
        'overdue_24h': {'hours': 24, 'severity': 'high'},
        'overdue_48h': {'hours': 48, 'severity': 'critical'},
        'high_complexity': {'complexity_threshold': 80, 'severity': 'medium'},
        'multiple_reassigns': {'count': 3, 'severity': 'medium'},
        'blocked_long': {'hours': 72, 'severity': 'medium'}
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_escalation_needed(self, ticket: Ticket) -> Optional[Dict[str, Any]]:
        """
        Verifica si un ticket necesita escalación automática
        
        Returns:
            Dict con razón y recomendación de escalación, o None
        """
        # Verificar cada regla
        for rule_name, rule_config in self.ESCALATION_RULES.items():
            if rule_name == 'overdue_24h' or rule_name == 'overdue_48h':
                result = self._check_overdue_rule(ticket, rule_config)
            elif rule_name == 'high_complexity':
                result = self._check_complexity_rule(ticket, rule_config)
            elif rule_name == 'multiple_reassigns':
                result = self._check_reassignment_rule(ticket, rule_config)
            elif rule_name == 'blocked_long':
                result = self._check_blocked_rule(ticket, rule_config)
            else:
                continue
            
            if result:
                logger.warning(f"Ticket {ticket.ticket_number} necesita escalación: {result['reason']}")
                return result
        
        return None
    
    def _check_overdue_rule(self, ticket: Ticket, rule: Dict) -> Optional[Dict[str, Any]]:
        """Verifica regla de vencimiento"""
        if not ticket.due_date or ticket.status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
            return None
        
        now = datetime.now(timezone.utc)
        hours_overdue = (now - ticket.due_date).total_seconds() / 3600
        
        if hours_overdue >= rule['hours']:
            return {
                'reason': EscalationReason.OVERDUE,
                'severity': rule['severity'],
                'description': f"Ticket vencido hace {hours_overdue:.1f} horas",
                'recommended_action': 'Escalar a supervisor inmediatamente'
            }
        
        return None
    
    def _check_complexity_rule(self, ticket: Ticket, rule: Dict) -> Optional[Dict[str, Any]]:
        """Verifica regla de complejidad"""
        if not ticket.ai_complexity_score:
            return None
        
        if float(ticket.ai_complexity_score) >= rule['complexity_threshold']:
            return {
                'reason': EscalationReason.COMPLEXITY,
                'severity': rule['severity'],
                'description': f"Complejidad muy alta ({ticket.ai_complexity_score})",
                'recommended_action': 'Escalar a experto o equipo especializado'
            }
        
        return None
    
    def _check_reassignment_rule(self, ticket: Ticket, rule: Dict) -> Optional[Dict[str, Any]]:
        """Verifica regla de múltiples reasignaciones"""
        reassignment_count = self.db.query(func.count(TicketAssignment.id))\
            .filter(TicketAssignment.ticket_id == ticket.id)\
            .scalar()
        
        if reassignment_count >= rule['count']:
            return {
                'reason': EscalationReason.EXPERTISE,
                'severity': rule['severity'],
                'description': f"Reasignado {reassignment_count} veces - posible falta de expertise",
                'recommended_action': 'Escalar a gerente de departamento'
            }
        
        return None
    
    def _check_blocked_rule(self, ticket: Ticket, rule: Dict) -> Optional[Dict[str, Any]]:
        """Verifica regla de ticket bloqueado"""
        if ticket.status != TicketStatus.BLOCKED:
            return None
        
        # Buscar cuando se bloqueó
        blocked_history = self.db.query(TicketHistory)\
            .filter(
                and_(
                    TicketHistory.ticket_id == ticket.id,
                    TicketHistory.new_value == TicketStatus.BLOCKED.value
                )
            )\
            .order_by(desc(TicketHistory.created_at))\
            .first()
        
        if blocked_history:
            hours_blocked = (datetime.now(timezone.utc) - blocked_history.created_at).total_seconds() / 3600
            
            if hours_blocked >= rule['hours']:
                return {
                    'reason': EscalationReason.BLOCKED,
                    'severity': rule['severity'],
                    'description': f"Bloqueado hace {hours_blocked:.1f} horas",
                    'recommended_action': 'Escalar para resolver bloqueo'
                }
        
        return None
    
    def auto_escalate_tickets(self) -> List[Ticket]:
        """
        Procesa escalación automática de tickets que lo necesitan
        
        Returns:
            Lista de tickets escalados
        """
        # Obtener tickets candidatos a escalación
        candidate_tickets = self.db.query(Ticket)\
            .filter(
                and_(
                    Ticket.status.notin_([
                        TicketStatus.RESOLVED,
                        TicketStatus.CLOSED,
                        TicketStatus.CANCELLED
                    ]),
                    Ticket.assigned_to_id.isnot(None)
                )
            )\
            .all()
        
        escalated_tickets = []
        
        for ticket in candidate_tickets:
            escalation_info = self.check_escalation_needed(ticket)
            
            if escalation_info:
                # Encontrar supervisor o gerente
                supervisor = self._find_supervisor(ticket)
                
                if supervisor:
                    # TODO: Crear escalación automática
                    # Por ahora solo marcamos el ticket
                    ticket.status = TicketStatus.ESCALATED
                    ticket.ai_risk_score = Decimal('80.00')
                    
                    escalated_tickets.append(ticket)
                    
                    logger.info(f"Ticket {ticket.ticket_number} auto-escalado a {supervisor.email}")
        
        self.db.commit()
        return escalated_tickets
    
    def _find_supervisor(self, ticket: Ticket) -> Optional[User]:
        """Encuentra supervisor apropiado para escalación"""
        # TODO: Implementar lógica de jerarquía organizacional
        # Por ahora, retornar manager del departamento si existe
        
        if ticket.department_id:
            department = self.db.query(Department)\
                .filter(Department.id == ticket.department_id)\
                .first()
            
            if department and department.manager_id:
                return self.db.query(User)\
                    .filter(User.id == department.manager_id)\
                    .first()
        
        return None

# ============================================================================
# COORDINADOR DE AGENTES
# ============================================================================

class TicketingAICoordinator:
    """
    Coordinador central para todos los agentes de IA de ticketing
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.prioritizer = TaskPrioritizerAgent(db)
        self.balancer = WorkloadBalancerAgent(db)
        self.predictor = CompletionPredictorAgent(db)
        self.quality_checker = QualityCheckerAgent(db)
        self.escalation_agent = EscalationAgent(db)
    
    def process_new_ticket(self, ticket: Ticket) -> Dict[str, Any]:
        """
        Procesa un ticket nuevo con todos los agentes
        
        Returns:
            Dict con resultados de todos los agentes
        """
        results = {}
        
        # 1. Calcular prioridad
        priority_score = self.prioritizer.calculate_priority_score(ticket)
        results['priority_score'] = float(priority_score)
        
        # 2. Sugerir asignación
        assignee_suggestions = self.balancer.suggest_assignee(ticket, top_n=3)
        results['assignee_suggestions'] = [
            {'user_id': str(user.id), 'email': user.email, 'confidence': conf}
            for user, conf in assignee_suggestions
        ]
        
        # 3. Auto-asignar si hay alta confianza
        auto_assigned = self.balancer.auto_assign_ticket(ticket)
        if auto_assigned:
            user, confidence = auto_assigned
            results['auto_assigned'] = {
                'user_id': str(user.id),
                'email': user.email,
                'confidence': confidence
            }
        
        # 4. Predecir completitud si está asignado
        if ticket.assigned_to_id:
            predicted_completion = self.predictor.predict_completion_time(ticket)
            if predicted_completion:
                results['predicted_completion'] = predicted_completion.isoformat()
        
        self.db.commit()
        
        logger.info(f"Ticket {ticket.ticket_number} procesado por todos los agentes de IA")
        return results
    
    def run_periodic_tasks(self) -> Dict[str, Any]:
        """
        Ejecuta tareas periódicas de todos los agentes
        Debe ejecutarse cada hora o mediante cronjob
        
        Returns:
            Dict con resultados de todas las tareas
        """
        results = {}
        
        # 1. Recalcular prioridades
        updated_priorities = self.prioritizer.recalculate_all_priorities()
        results['priorities_updated'] = updated_priorities
        
        # 2. Procesar escalaciones automáticas
        escalated = self.escalation_agent.auto_escalate_tickets()
        results['tickets_escalated'] = len(escalated)
        results['escalated_ticket_numbers'] = [t.ticket_number for t in escalated]
        
        logger.info(f"Tareas periódicas completadas: {updated_priorities} prioridades, "
                   f"{len(escalated)} escalaciones")
        
        return results
