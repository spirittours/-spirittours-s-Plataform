"""
Servicio de Ticketing y Gestión de Tareas
Lógica de negocio completa para asignación, seguimiento y escalación
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta, timezone
import uuid
import logging

from backend.models.ticketing_models import (
    Ticket, TicketAssignment, TicketComment, TicketWatcher, TicketHistory,
    TicketChecklist, TicketReminder, TicketAttachment, TicketEscalation,
    Department, TicketPriority, TicketStatus, TicketType, EscalationReason,
    CommentType, TicketCreate, TicketUpdate, TicketAssignRequest,
    TicketEscalateRequest, TicketCommentCreate, TicketWatcherAdd,
    ChecklistItemCreate
)
from backend.models.rbac_models import User

logger = logging.getLogger(__name__)

class TicketingService:
    """
    Servicio principal para gestión de tickets y tareas
    Incluye lógica de negocio, validaciones y seguimiento
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========================================================================
    # GENERACIÓN DE NÚMEROS DE TICKET
    # ========================================================================
    
    def _generate_ticket_number(self) -> str:
        """Genera número único de ticket: TKT-2024-00001"""
        current_year = datetime.now(timezone.utc).year
        prefix = f"TKT-{current_year}-"
        
        # Obtener el último ticket del año
        last_ticket = self.db.query(Ticket)\
            .filter(Ticket.ticket_number.like(f"{prefix}%"))\
            .order_by(desc(Ticket.ticket_number))\
            .first()
        
        if last_ticket:
            # Extraer el número y sumar 1
            last_num = int(last_ticket.ticket_number.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{str(new_num).zfill(5)}"
    
    # ========================================================================
    # CRUD BÁSICO DE TICKETS
    # ========================================================================
    
    def create_ticket(
        self,
        ticket_data: TicketCreate,
        created_by_id: uuid.UUID
    ) -> Ticket:
        """
        Crea un nuevo ticket
        
        Args:
            ticket_data: Datos del ticket
            created_by_id: ID del usuario que crea el ticket
        
        Returns:
            Ticket creado
        """
        try:
            # Generar número de ticket
            ticket_number = self._generate_ticket_number()
            
            # Crear ticket
            ticket = Ticket(
                ticket_number=ticket_number,
                title=ticket_data.title,
                description=ticket_data.description,
                ticket_type=ticket_data.ticket_type,
                priority=ticket_data.priority,
                status=TicketStatus.OPEN,
                created_by_id=created_by_id,
                assigned_to_id=ticket_data.assigned_to_id,
                department_id=ticket_data.department_id,
                due_date=ticket_data.due_date,
                estimated_hours=ticket_data.estimated_hours,
                tags=ticket_data.tags,
                custom_fields=ticket_data.custom_fields,
                customer_id=ticket_data.customer_id,
                booking_id=ticket_data.booking_id,
                invoice_id=ticket_data.invoice_id,
                email_message_id=ticket_data.email_message_id,
                parent_ticket_id=ticket_data.parent_ticket_id,
                completion_percentage=0
            )
            
            self.db.add(ticket)
            self.db.flush()
            
            # Registrar en historial
            self._add_history(
                ticket_id=ticket.id,
                user_id=created_by_id,
                action="created",
                description=f"Ticket creado: {ticket.title}"
            )
            
            # Si se asignó a alguien, crear asignación
            if ticket_data.assigned_to_id:
                self._assign_ticket_internal(
                    ticket=ticket,
                    assigned_to_id=ticket_data.assigned_to_id,
                    assigned_by_id=created_by_id,
                    assignment_reason="Asignación inicial"
                )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            logger.info(f"Ticket creado: {ticket.ticket_number} por usuario {created_by_id}")
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creando ticket: {str(e)}")
            raise
    
    def get_ticket(
        self,
        ticket_id: uuid.UUID,
        include_relations: bool = False
    ) -> Optional[Ticket]:
        """Obtiene un ticket por ID"""
        query = self.db.query(Ticket)
        
        if include_relations:
            query = query.options(
                joinedload(Ticket.created_by),
                joinedload(Ticket.assigned_to),
                joinedload(Ticket.department),
                joinedload(Ticket.comments),
                joinedload(Ticket.watchers),
                joinedload(Ticket.checklists),
                joinedload(Ticket.history)
            )
        
        return query.filter(Ticket.id == ticket_id).first()
    
    def get_ticket_by_number(self, ticket_number: str) -> Optional[Ticket]:
        """Obtiene un ticket por número"""
        return self.db.query(Ticket)\
            .filter(Ticket.ticket_number == ticket_number)\
            .first()
    
    def list_tickets(
        self,
        user_id: Optional[uuid.UUID] = None,
        assigned_to_id: Optional[uuid.UUID] = None,
        created_by_id: Optional[uuid.UUID] = None,
        department_id: Optional[uuid.UUID] = None,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        ticket_type: Optional[TicketType] = None,
        tags: Optional[List[str]] = None,
        overdue_only: bool = False,
        include_completed: bool = True,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        sort_desc: bool = True
    ) -> Tuple[List[Ticket], int]:
        """
        Lista tickets con filtros
        
        Returns:
            Tuple de (lista de tickets, total de registros)
        """
        query = self.db.query(Ticket)
        
        # Filtros
        if assigned_to_id:
            query = query.filter(Ticket.assigned_to_id == assigned_to_id)
        
        if created_by_id:
            query = query.filter(Ticket.created_by_id == created_by_id)
        
        if department_id:
            query = query.filter(Ticket.department_id == department_id)
        
        if status:
            query = query.filter(Ticket.status == status)
        
        if priority:
            query = query.filter(Ticket.priority == priority)
        
        if ticket_type:
            query = query.filter(Ticket.ticket_type == ticket_type)
        
        if tags:
            # Filtrar por tags (al menos uno debe coincidir)
            for tag in tags:
                query = query.filter(Ticket.tags.contains([tag]))
        
        if overdue_only:
            now = datetime.now(timezone.utc)
            query = query.filter(
                and_(
                    Ticket.due_date < now,
                    Ticket.status.notin_([TicketStatus.CLOSED, TicketStatus.CANCELLED])
                )
            )
        
        if not include_completed:
            query = query.filter(
                Ticket.status.notin_([TicketStatus.CLOSED, TicketStatus.CANCELLED])
            )
        
        # Contar total antes de paginación
        total = query.count()
        
        # Ordenar
        if sort_by == "priority":
            # Ordenar por prioridad numérica
            priority_order = {
                TicketPriority.CRITICAL: 1,
                TicketPriority.HIGH: 2,
                TicketPriority.MEDIUM: 3,
                TicketPriority.LOW: 4,
                TicketPriority.BACKLOG: 5
            }
            # No podemos ordenar directamente por enum, usar case
            query = query.order_by(
                desc(Ticket.priority) if sort_desc else Ticket.priority
            )
        elif sort_by == "due_date":
            query = query.order_by(
                desc(Ticket.due_date) if sort_desc else Ticket.due_date
            )
        elif sort_by == "ai_priority_score":
            query = query.order_by(
                desc(Ticket.ai_priority_score) if sort_desc else Ticket.ai_priority_score
            )
        else:  # created_at, updated_at
            order_field = getattr(Ticket, sort_by, Ticket.created_at)
            query = query.order_by(desc(order_field) if sort_desc else order_field)
        
        # Paginación
        tickets = query.offset(skip).limit(limit).all()
        
        return tickets, total
    
    def update_ticket(
        self,
        ticket_id: uuid.UUID,
        ticket_data: TicketUpdate,
        updated_by_id: uuid.UUID
    ) -> Ticket:
        """Actualiza un ticket existente"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        try:
            # Guardar valores anteriores para historial
            changes = []
            
            # Actualizar campos
            update_data = ticket_data.model_dump(exclude_unset=True)
            
            for field, new_value in update_data.items():
                if hasattr(ticket, field):
                    old_value = getattr(ticket, field)
                    if old_value != new_value:
                        setattr(ticket, field, new_value)
                        changes.append({
                            'field': field,
                            'old_value': str(old_value) if old_value else None,
                            'new_value': str(new_value) if new_value else None
                        })
            
            # Actualizar timestamp
            ticket.updated_at = datetime.now(timezone.utc)
            
            # Registrar cambios en historial
            for change in changes:
                self._add_history(
                    ticket_id=ticket.id,
                    user_id=updated_by_id,
                    action="updated",
                    field_name=change['field'],
                    old_value=change['old_value'],
                    new_value=change['new_value'],
                    description=f"Campo '{change['field']}' actualizado"
                )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            logger.info(f"Ticket {ticket.ticket_number} actualizado por usuario {updated_by_id}")
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error actualizando ticket: {str(e)}")
            raise
    
    def delete_ticket(self, ticket_id: uuid.UUID) -> bool:
        """Elimina un ticket (soft delete, cambiar a CANCELLED)"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return False
        
        try:
            ticket.status = TicketStatus.CANCELLED
            ticket.updated_at = datetime.now(timezone.utc)
            
            self._add_history(
                ticket_id=ticket.id,
                user_id=None,
                action="cancelled",
                description="Ticket cancelado"
            )
            
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error eliminando ticket: {str(e)}")
            raise
    
    # ========================================================================
    # ASIGNACIÓN DE TICKETS
    # ========================================================================
    
    def _assign_ticket_internal(
        self,
        ticket: Ticket,
        assigned_to_id: uuid.UUID,
        assigned_by_id: uuid.UUID,
        assignment_reason: Optional[str] = None,
        ai_assigned: bool = False,
        ai_assignment_reason: Optional[str] = None,
        ai_confidence_score: Optional[float] = None
    ):
        """Método interno para asignar ticket"""
        # Desactivar asignación anterior
        self.db.query(TicketAssignment)\
            .filter(
                and_(
                    TicketAssignment.ticket_id == ticket.id,
                    TicketAssignment.is_active == True
                )
            )\
            .update({"is_active": False, "completed_at": datetime.now(timezone.utc)})
        
        # Crear nueva asignación
        assignment = TicketAssignment(
            ticket_id=ticket.id,
            assigned_to_id=assigned_to_id,
            assigned_by_id=assigned_by_id,
            assignment_reason=assignment_reason,
            is_active=True,
            ai_assigned=ai_assigned,
            ai_assignment_reason=ai_assignment_reason,
            ai_confidence_score=ai_confidence_score
        )
        
        self.db.add(assignment)
        
        # Actualizar ticket
        ticket.assigned_to_id = assigned_to_id
        ticket.status = TicketStatus.ASSIGNED
        
        # Agregar comentario
        comment = TicketComment(
            ticket_id=ticket.id,
            user_id=assigned_by_id,
            comment_type=CommentType.ASSIGNMENT,
            content=f"Ticket asignado a {assigned_to_id}",
            old_value=str(ticket.assigned_to_id) if ticket.assigned_to_id else None,
            new_value=str(assigned_to_id),
            is_ai_generated=ai_assigned
        )
        self.db.add(comment)
    
    def assign_ticket(
        self,
        ticket_id: uuid.UUID,
        assign_data: TicketAssignRequest,
        assigned_by_id: uuid.UUID
    ) -> Ticket:
        """
        Asigna o reasigna un ticket a un trabajador
        
        Args:
            ticket_id: ID del ticket
            assign_data: Datos de asignación
            assigned_by_id: ID del usuario que realiza la asignación
        
        Returns:
            Ticket actualizado
        """
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        try:
            self._assign_ticket_internal(
                ticket=ticket,
                assigned_to_id=assign_data.assigned_to_id,
                assigned_by_id=assigned_by_id,
                assignment_reason=assign_data.assignment_reason
            )
            
            # Registrar en historial
            self._add_history(
                ticket_id=ticket.id,
                user_id=assigned_by_id,
                action="assigned",
                field_name="assigned_to_id",
                new_value=str(assign_data.assigned_to_id),
                description=f"Ticket asignado a {assign_data.assigned_to_id}"
            )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            logger.info(f"Ticket {ticket.ticket_number} asignado a {assign_data.assigned_to_id}")
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error asignando ticket: {str(e)}")
            raise
    
    # ========================================================================
    # CAMBIO DE ESTADO
    # ========================================================================
    
    def start_ticket(
        self,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Ticket:
        """Marca un ticket como 'en progreso'"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        # Validar que esté asignado al usuario
        if ticket.assigned_to_id != user_id:
            raise ValueError("Solo el usuario asignado puede iniciar el ticket")
        
        try:
            ticket.status = TicketStatus.IN_PROGRESS
            ticket.started_at = datetime.now(timezone.utc)
            
            self._add_history(
                ticket_id=ticket.id,
                user_id=user_id,
                action="started",
                field_name="status",
                old_value=str(ticket.status),
                new_value=str(TicketStatus.IN_PROGRESS),
                description="Ticket iniciado"
            )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error iniciando ticket: {str(e)}")
            raise
    
    def complete_ticket(
        self,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID,
        resolution_notes: Optional[str] = None
    ) -> Ticket:
        """
        Marca un ticket como completado
        
        Args:
            ticket_id: ID del ticket
            user_id: ID del usuario que completa
            resolution_notes: Notas de resolución
        
        Returns:
            Ticket completado
        """
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        # Validar que esté asignado al usuario
        if ticket.assigned_to_id != user_id:
            raise ValueError("Solo el usuario asignado puede completar el ticket")
        
        try:
            # Verificar checklist requerido
            required_incomplete = self.db.query(TicketChecklist)\
                .filter(
                    and_(
                        TicketChecklist.ticket_id == ticket_id,
                        TicketChecklist.is_required == True,
                        TicketChecklist.is_completed == False
                    )
                ).count()
            
            if required_incomplete > 0:
                raise ValueError(f"Hay {required_incomplete} items requeridos del checklist sin completar")
            
            ticket.status = TicketStatus.RESOLVED
            ticket.completion_percentage = 100
            ticket.completed_at = datetime.now(timezone.utc)
            
            # Agregar comentario de resolución
            if resolution_notes:
                comment = TicketComment(
                    ticket_id=ticket.id,
                    user_id=user_id,
                    comment_type=CommentType.RESOLUTION,
                    content=resolution_notes
                )
                self.db.add(comment)
            
            self._add_history(
                ticket_id=ticket.id,
                user_id=user_id,
                action="completed",
                field_name="status",
                old_value=str(ticket.status),
                new_value=str(TicketStatus.RESOLVED),
                description="Ticket completado"
            )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            logger.info(f"Ticket {ticket.ticket_number} completado por usuario {user_id}")
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error completando ticket: {str(e)}")
            raise
    
    def close_ticket(
        self,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Ticket:
        """Cierra un ticket definitivamente"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        if ticket.status != TicketStatus.RESOLVED:
            raise ValueError("Solo se pueden cerrar tickets resueltos")
        
        try:
            ticket.status = TicketStatus.CLOSED
            
            self._add_history(
                ticket_id=ticket.id,
                user_id=user_id,
                action="closed",
                description="Ticket cerrado"
            )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cerrando ticket: {str(e)}")
            raise
    
    # ========================================================================
    # ESCALACIÓN
    # ========================================================================
    
    def escalate_ticket(
        self,
        ticket_id: uuid.UUID,
        escalate_data: TicketEscalateRequest,
        escalated_by_id: uuid.UUID
    ) -> Ticket:
        """
        Escala un ticket a supervisor o departamento
        
        Args:
            ticket_id: ID del ticket
            escalate_data: Datos de escalación
            escalated_by_id: ID del usuario que escala
        
        Returns:
            Ticket escalado
        """
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        try:
            previous_priority = ticket.priority
            previous_assignee = ticket.assigned_to_id
            
            # Crear registro de escalación
            escalation = TicketEscalation(
                ticket_id=ticket.id,
                escalated_from_id=previous_assignee,
                escalated_to_id=escalate_data.escalated_to_id,
                escalated_by_id=escalated_by_id,
                reason=escalate_data.reason,
                description=escalate_data.description,
                previous_priority=previous_priority,
                new_priority=escalate_data.change_priority
            )
            self.db.add(escalation)
            
            # Actualizar ticket
            ticket.status = TicketStatus.ESCALATED
            if escalate_data.change_priority:
                ticket.priority = escalate_data.change_priority
            
            # Reasignar
            self._assign_ticket_internal(
                ticket=ticket,
                assigned_to_id=escalate_data.escalated_to_id,
                assigned_by_id=escalated_by_id,
                assignment_reason=f"Escalado: {escalate_data.reason.value}"
            )
            
            # Agregar como watcher al usuario anterior
            if previous_assignee:
                self.add_watcher(
                    ticket_id=ticket.id,
                    watcher_data=TicketWatcherAdd(
                        user_id=previous_assignee,
                        watch_reason="escalated"
                    ),
                    added_by_id=escalated_by_id
                )
            
            self._add_history(
                ticket_id=ticket.id,
                user_id=escalated_by_id,
                action="escalated",
                description=f"Ticket escalado a {escalate_data.escalated_to_id}: {escalate_data.description}"
            )
            
            self.db.commit()
            self.db.refresh(ticket)
            
            logger.info(f"Ticket {ticket.ticket_number} escalado a {escalate_data.escalated_to_id}")
            return ticket
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error escalando ticket: {str(e)}")
            raise
    
    # ========================================================================
    # COMENTARIOS
    # ========================================================================
    
    def add_comment(
        self,
        ticket_id: uuid.UUID,
        comment_data: TicketCommentCreate,
        user_id: uuid.UUID,
        comment_type: CommentType = CommentType.COMMENT,
        is_ai_generated: bool = False
    ) -> TicketComment:
        """Agrega un comentario a un ticket"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            raise ValueError(f"Ticket {ticket_id} no encontrado")
        
        try:
            comment = TicketComment(
                ticket_id=ticket_id,
                user_id=user_id,
                comment_type=comment_type,
                content=comment_data.content,
                is_internal=comment_data.is_internal,
                is_ai_generated=is_ai_generated
            )
            
            self.db.add(comment)
            self.db.commit()
            self.db.refresh(comment)
            
            return comment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error agregando comentario: {str(e)}")
            raise
    
    def get_comments(
        self,
        ticket_id: uuid.UUID,
        include_internal: bool = True
    ) -> List[TicketComment]:
        """Obtiene comentarios de un ticket"""
        query = self.db.query(TicketComment)\
            .filter(TicketComment.ticket_id == ticket_id)
        
        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)
        
        return query.order_by(TicketComment.created_at).all()
    
    # ========================================================================
    # WATCHERS (OBSERVADORES)
    # ========================================================================
    
    def add_watcher(
        self,
        ticket_id: uuid.UUID,
        watcher_data: TicketWatcherAdd,
        added_by_id: uuid.UUID
    ) -> TicketWatcher:
        """Agrega un observador al ticket (jefe, colaborador)"""
        # Verificar que no exista ya
        existing = self.db.query(TicketWatcher)\
            .filter(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == watcher_data.user_id,
                    TicketWatcher.is_active == True
                )
            ).first()
        
        if existing:
            return existing
        
        try:
            watcher = TicketWatcher(
                ticket_id=ticket_id,
                user_id=watcher_data.user_id,
                added_by_id=added_by_id,
                watch_reason=watcher_data.watch_reason,
                notify_on_update=watcher_data.notify_on_update,
                notify_on_comment=watcher_data.notify_on_comment,
                notify_on_status_change=watcher_data.notify_on_status_change
            )
            
            self.db.add(watcher)
            self.db.commit()
            self.db.refresh(watcher)
            
            return watcher
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error agregando watcher: {str(e)}")
            raise
    
    def remove_watcher(
        self,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        """Remueve un observador del ticket"""
        watcher = self.db.query(TicketWatcher)\
            .filter(
                and_(
                    TicketWatcher.ticket_id == ticket_id,
                    TicketWatcher.user_id == user_id,
                    TicketWatcher.is_active == True
                )
            ).first()
        
        if not watcher:
            return False
        
        watcher.is_active = False
        self.db.commit()
        return True
    
    # ========================================================================
    # CHECKLIST
    # ========================================================================
    
    def add_checklist_item(
        self,
        ticket_id: uuid.UUID,
        item_data: ChecklistItemCreate
    ) -> TicketChecklist:
        """Agrega un item al checklist del ticket"""
        try:
            item = TicketChecklist(
                ticket_id=ticket_id,
                title=item_data.title,
                description=item_data.description,
                is_required=item_data.is_required,
                position=item_data.position
            )
            
            self.db.add(item)
            self.db.commit()
            self.db.refresh(item)
            
            return item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error agregando item de checklist: {str(e)}")
            raise
    
    def complete_checklist_item(
        self,
        item_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> TicketChecklist:
        """Marca un item del checklist como completado"""
        item = self.db.query(TicketChecklist)\
            .filter(TicketChecklist.id == item_id)\
            .first()
        
        if not item:
            raise ValueError(f"Item de checklist {item_id} no encontrado")
        
        try:
            item.is_completed = True
            item.completed_by_id = user_id
            item.completed_at = datetime.now(timezone.utc)
            
            # Actualizar porcentaje de completitud del ticket
            ticket = self.get_ticket(item.ticket_id)
            if ticket:
                total_items = self.db.query(func.count(TicketChecklist.id))\
                    .filter(TicketChecklist.ticket_id == ticket.id)\
                    .scalar()
                completed_items = self.db.query(func.count(TicketChecklist.id))\
                    .filter(
                        and_(
                            TicketChecklist.ticket_id == ticket.id,
                            TicketChecklist.is_completed == True
                        )
                    ).scalar()
                
                if total_items > 0:
                    ticket.completion_percentage = int((completed_items / total_items) * 100)
            
            self.db.commit()
            self.db.refresh(item)
            
            return item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error completando item de checklist: {str(e)}")
            raise
    
    # ========================================================================
    # HISTORIAL
    # ========================================================================
    
    def _add_history(
        self,
        ticket_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        action: str,
        field_name: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        description: Optional[str] = None,
        is_ai_action: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Método interno para agregar entrada al historial"""
        history = TicketHistory(
            ticket_id=ticket_id,
            user_id=user_id,
            action=action,
            field_name=field_name,
            old_value=old_value,
            new_value=new_value,
            description=description,
            is_ai_action=is_ai_action,
            metadata_json=metadata or {}
        )
        self.db.add(history)
    
    def get_ticket_history(
        self,
        ticket_id: uuid.UUID
    ) -> List[TicketHistory]:
        """Obtiene el historial completo de un ticket"""
        return self.db.query(TicketHistory)\
            .filter(TicketHistory.ticket_id == ticket_id)\
            .order_by(TicketHistory.created_at)\
            .all()
    
    # ========================================================================
    # ESTADÍSTICAS Y REPORTES
    # ========================================================================
    
    def get_user_ticket_stats(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Obtiene estadísticas de tickets para un usuario"""
        # Total asignados
        total_assigned = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == user_id)\
            .scalar()
        
        # Abiertos
        open_tickets = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user_id,
                    Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED])
                )
            ).scalar()
        
        # En progreso
        in_progress = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user_id,
                    Ticket.status == TicketStatus.IN_PROGRESS
                )
            ).scalar()
        
        # Completados
        completed = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user_id,
                    Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
                )
            ).scalar()
        
        # Vencidos
        now = datetime.now(timezone.utc)
        overdue = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user_id,
                    Ticket.due_date < now,
                    Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
                )
            ).scalar()
        
        # Alta prioridad
        high_priority = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.assigned_to_id == user_id,
                    Ticket.priority.in_([TicketPriority.CRITICAL, TicketPriority.HIGH]),
                    Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED])
                )
            ).scalar()
        
        return {
            "total_assigned": total_assigned,
            "open_tickets": open_tickets,
            "in_progress_tickets": in_progress,
            "completed_tickets": completed,
            "overdue_tickets": overdue,
            "high_priority_tickets": high_priority,
            "completion_rate": (completed / total_assigned * 100) if total_assigned > 0 else 0
        }
    
    def get_department_stats(self, department_id: uuid.UUID) -> Dict[str, Any]:
        """Obtiene estadísticas de tickets para un departamento"""
        total = self.db.query(func.count(Ticket.id))\
            .filter(Ticket.department_id == department_id)\
            .scalar()
        
        open_tickets = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.department_id == department_id,
                    Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS])
                )
            ).scalar()
        
        completed = self.db.query(func.count(Ticket.id))\
            .filter(
                and_(
                    Ticket.department_id == department_id,
                    Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
                )
            ).scalar()
        
        return {
            "total_tickets": total,
            "open_tickets": open_tickets,
            "completed_tickets": completed,
            "completion_rate": (completed / total * 100) if total > 0 else 0
        }
    
    # ========================================================================
    # DEPARTAMENTOS
    # ========================================================================
    
    def create_department(
        self,
        name: str,
        description: Optional[str] = None,
        manager_id: Optional[uuid.UUID] = None,
        parent_department_id: Optional[uuid.UUID] = None
    ) -> Department:
        """Crea un nuevo departamento"""
        try:
            department = Department(
                name=name,
                description=description,
                manager_id=manager_id,
                parent_department_id=parent_department_id
            )
            
            self.db.add(department)
            self.db.commit()
            self.db.refresh(department)
            
            return department
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creando departamento: {str(e)}")
            raise
    
    def get_department(self, department_id: uuid.UUID) -> Optional[Department]:
        """Obtiene un departamento por ID"""
        return self.db.query(Department)\
            .filter(Department.id == department_id)\
            .first()
    
    def list_departments(self, include_inactive: bool = False) -> List[Department]:
        """Lista todos los departamentos"""
        query = self.db.query(Department)
        
        if not include_inactive:
            query = query.filter(Department.is_active == True)
        
        return query.all()
