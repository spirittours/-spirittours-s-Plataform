"""
API de Sistema de Ticketing y Gestión de Tareas
Endpoints REST completos para gestión de tickets, asignaciones y seguimiento
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
import uuid
import logging

from backend.models.ticketing_models import (
    Ticket, TicketAssignment, TicketComment, TicketWatcher, TicketHistory,
    TicketChecklist, Department, TicketPriority, TicketStatus, TicketType,
    EscalationReason, CommentType, TicketCreate, TicketUpdate, TicketResponse,
    TicketAssignRequest, TicketEscalateRequest, TicketCommentCreate,
    TicketWatcherAdd, ChecklistItemCreate, TicketStatsResponse,
    TicketDetailedResponse, ChecklistItemResponse, TicketCommentResponse,
    DepartmentCreate, DepartmentResponse
)
from backend.models.rbac_models import User
from backend.services.ticketing_service import TicketingService
from backend.services.ticketing_ai_agents import TicketingAICoordinator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ticketing", tags=["Ticketing"])


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_db():
    """Dependency para obtener sesión de base de datos"""
    # TODO: Implementar con tu pool de conexiones
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user() -> User:
    """Dependency para obtener usuario actual"""
    # TODO: Implementar autenticación JWT
    # Por ahora retornar usuario mock
    pass


def get_ticketing_service(db: Session = Depends(get_db)) -> TicketingService:
    """Dependency para obtener servicio de ticketing"""
    return TicketingService(db)


def get_ai_coordinator(db: Session = Depends(get_db)) -> TicketingAICoordinator:
    """Dependency para obtener coordinador de IA"""
    return TicketingAICoordinator(db)


# ============================================================================
# PYDANTIC RESPONSE MODELS
# ============================================================================

class TicketListResponse(BaseModel):
    """Respuesta de lista de tickets con paginación"""
    tickets: List[TicketResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class AIProcessingResponse(BaseModel):
    """Respuesta del procesamiento de IA"""
    priority_score: float
    assignee_suggestions: List[Dict[str, Any]]
    auto_assigned: Optional[Dict[str, Any]] = None
    predicted_completion: Optional[str] = None


class QualityCheckResponse(BaseModel):
    """Respuesta de verificación de calidad"""
    quality_score: float
    can_close: bool
    checks: Dict[str, Any]
    recommendations: List[str]


class BulkOperationResponse(BaseModel):
    """Respuesta de operación masiva"""
    success_count: int
    failed_count: int
    errors: List[Dict[str, str]]


# ============================================================================
# ENDPOINTS - TICKETS CRUD
# ============================================================================

@router.post("/tickets", response_model=TicketResponse, status_code=201)
async def create_ticket(
    ticket_data: TicketCreate,
    background_tasks: BackgroundTasks,
    service: TicketingService = Depends(get_ticketing_service),
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator),
    current_user: User = Depends(get_current_user)
):
    """
    Crea un nuevo ticket
    
    El sistema automáticamente:
    - Genera número de ticket único
    - Calcula prioridad con IA
    - Sugiere asignación óptima
    - Predice tiempo de completitud
    """
    try:
        # Crear ticket
        ticket = service.create_ticket(
            ticket_data=ticket_data,
            created_by_id=current_user.id
        )
        
        # Procesar con IA en background
        background_tasks.add_task(
            ai_coordinator.process_new_ticket,
            ticket
        )
        
        logger.info(f"Ticket {ticket.ticket_number} creado por {current_user.email}")
        return TicketResponse.model_validate(ticket)
        
    except Exception as e:
        logger.error(f"Error creando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creando ticket: {str(e)}")


@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    assigned_to_me: bool = Query(False, description="Solo tickets asignados a mí"),
    created_by_me: bool = Query(False, description="Solo tickets creados por mí"),
    department_id: Optional[str] = Query(None, description="Filtrar por departamento"),
    status: Optional[TicketStatus] = Query(None, description="Filtrar por estado"),
    priority: Optional[TicketPriority] = Query(None, description="Filtrar por prioridad"),
    ticket_type: Optional[TicketType] = Query(None, description="Filtrar por tipo"),
    tags: Optional[List[str]] = Query(None, description="Filtrar por tags"),
    overdue_only: bool = Query(False, description="Solo vencidos"),
    include_completed: bool = Query(True, description="Incluir completados"),
    search: Optional[str] = Query(None, description="Búsqueda por título"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("created_at", regex="^(created_at|updated_at|due_date|priority|ai_priority_score)$"),
    sort_desc: bool = Query(True),
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lista tickets con filtros avanzados y paginación
    
    Filtros disponibles:
    - assigned_to_me: Mis tickets asignados
    - created_by_me: Tickets que creé
    - status, priority, type: Filtros básicos
    - overdue_only: Solo vencidos
    - tags: Filtrar por tags múltiples
    """
    try:
        # Preparar filtros
        filters = {
            "skip": skip,
            "limit": limit,
            "sort_by": sort_by,
            "sort_desc": sort_desc,
            "include_completed": include_completed,
            "overdue_only": overdue_only
        }
        
        if assigned_to_me:
            filters["assigned_to_id"] = current_user.id
        
        if created_by_me:
            filters["created_by_id"] = current_user.id
        
        if department_id:
            try:
                filters["department_id"] = uuid.UUID(department_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="department_id inválido")
        
        if status:
            filters["status"] = status
        
        if priority:
            filters["priority"] = priority
        
        if ticket_type:
            filters["ticket_type"] = ticket_type
        
        if tags:
            filters["tags"] = tags
        
        # Obtener tickets
        tickets, total = service.list_tickets(**filters)
        
        # TODO: Implementar búsqueda por texto en título/descripción si search está presente
        
        return TicketListResponse(
            tickets=[TicketResponse.model_validate(t) for t in tickets],
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + len(tickets)) < total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando tickets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listando tickets: {str(e)}")


@router.get("/tickets/{ticket_id}", response_model=TicketDetailedResponse)
async def get_ticket(
    ticket_id: str,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene detalles completos de un ticket
    
    Incluye:
    - Información básica del ticket
    - Comentarios y actividad
    - Watchers (observadores)
    - Checklist de tareas
    - Sub-tickets
    - Historial completo
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.get_ticket(ticket_uuid, include_relations=True)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        # Construir respuesta detallada
        response_data = TicketResponse.model_validate(ticket).model_dump()
        
        # Agregar relaciones
        response_data["created_by"] = {
            "id": str(ticket.created_by.id),
            "email": ticket.created_by.email,
            "full_name": getattr(ticket.created_by, 'full_name', '')
        } if ticket.created_by else None
        
        response_data["assigned_to"] = {
            "id": str(ticket.assigned_to.id),
            "email": ticket.assigned_to.email,
            "full_name": getattr(ticket.assigned_to, 'full_name', '')
        } if ticket.assigned_to else None
        
        response_data["department"] = {
            "id": str(ticket.department.id),
            "name": ticket.department.name
        } if ticket.department else None
        
        response_data["comments"] = [
            TicketCommentResponse.model_validate(c) for c in ticket.comments
        ]
        
        response_data["watchers"] = [
            {
                "id": str(w.user_id),
                "watch_reason": w.watch_reason,
                "added_at": w.added_at.isoformat()
            }
            for w in ticket.watchers if w.is_active
        ]
        
        response_data["checklists"] = [
            ChecklistItemResponse.model_validate(c) for c in ticket.checklists
        ]
        
        response_data["sub_tickets"] = [
            TicketResponse.model_validate(st) for st in ticket.sub_tickets
        ]
        
        return TicketDetailedResponse(**response_data)
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo ticket: {str(e)}")


@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    ticket_data: TicketUpdate,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza un ticket existente
    
    Se registra automáticamente en el historial
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.update_ticket(
            ticket_id=ticket_uuid,
            ticket_data=ticket_data,
            updated_by_id=current_user.id
        )
        
        logger.info(f"Ticket {ticket.ticket_number} actualizado por {current_user.email}")
        return TicketResponse.model_validate(ticket)
        
    except ValueError as ve:
        if "no encontrado" in str(ve):
            raise HTTPException(status_code=404, detail=str(ve))
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error actualizando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error actualizando ticket: {str(e)}")


@router.delete("/tickets/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina (cancela) un ticket
    
    Nota: Es un soft delete, cambia el estado a CANCELLED
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        success = service.delete_ticket(ticket_uuid)
        
        if not success:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        logger.info(f"Ticket {ticket_id} cancelado por {current_user.email}")
        return None
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error eliminando ticket: {str(e)}")


# ============================================================================
# ENDPOINTS - WORKFLOW Y ESTADO
# ============================================================================

@router.post("/tickets/{ticket_id}/start", response_model=TicketResponse)
async def start_ticket(
    ticket_id: str,
    service: TicketingService = Depends(get_ticketing_service),
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator),
    current_user: User = Depends(get_current_user)
):
    """
    Inicia trabajo en un ticket (cambia a IN_PROGRESS)
    
    Automáticamente:
    - Registra hora de inicio
    - Predice tiempo de completitud con IA
    - Notifica a watchers
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.start_ticket(ticket_uuid, current_user.id)
        
        # Predecir completitud
        ai_coordinator.predictor.predict_completion_time(ticket)
        service.db.commit()
        
        logger.info(f"Ticket {ticket.ticket_number} iniciado por {current_user.email}")
        return TicketResponse.model_validate(ticket)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error iniciando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error iniciando ticket: {str(e)}")


@router.post("/tickets/{ticket_id}/complete", response_model=TicketResponse)
async def complete_ticket(
    ticket_id: str,
    resolution_notes: Optional[str] = None,
    service: TicketingService = Depends(get_ticketing_service),
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator),
    current_user: User = Depends(get_current_user)
):
    """
    Marca un ticket como completado
    
    Verifica automáticamente:
    - Checklist requerido completado
    - Calidad de resolución con IA
    - Tiempo dentro de lo estimado
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        
        # Verificar calidad antes de completar
        ticket = service.get_ticket(ticket_uuid)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        quality_check = ai_coordinator.quality_checker.check_ticket_quality(ticket)
        
        if not quality_check['can_close']:
            return JSONResponse(
                status_code=400,
                content={
                    "detail": "El ticket no cumple con los estándares de calidad",
                    "quality_check": quality_check
                }
            )
        
        # Completar ticket
        ticket = service.complete_ticket(
            ticket_id=ticket_uuid,
            user_id=current_user.id,
            resolution_notes=resolution_notes
        )
        
        logger.info(f"Ticket {ticket.ticket_number} completado por {current_user.email}")
        return TicketResponse.model_validate(ticket)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error completando ticket: {str(e)}")


@router.post("/tickets/{ticket_id}/close", response_model=TicketResponse)
async def close_ticket(
    ticket_id: str,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Cierra definitivamente un ticket (debe estar RESOLVED)
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.close_ticket(ticket_uuid, current_user.id)
        
        logger.info(f"Ticket {ticket.ticket_number} cerrado por {current_user.email}")
        return TicketResponse.model_validate(ticket)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error cerrando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cerrando ticket: {str(e)}")


# ============================================================================
# ENDPOINTS - ASIGNACIÓN Y REASIGNACIÓN
# ============================================================================

@router.post("/tickets/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: str,
    assign_data: TicketAssignRequest,
    service: TicketingService = Depends(get_ticketing_service),
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator),
    current_user: User = Depends(get_current_user)
):
    """
    Asigna o reasigna un ticket a un trabajador
    
    Automáticamente:
    - Registra en historial de asignaciones
    - Notifica al nuevo asignado
    - Predice tiempo de completitud
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.assign_ticket(
            ticket_id=ticket_uuid,
            assign_data=assign_data,
            assigned_by_id=current_user.id
        )
        
        # Predecir completitud
        ai_coordinator.predictor.predict_completion_time(ticket)
        service.db.commit()
        
        logger.info(f"Ticket {ticket.ticket_number} asignado a {assign_data.assigned_to_id}")
        return TicketResponse.model_validate(ticket)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error asignando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error asignando ticket: {str(e)}")


@router.get("/tickets/{ticket_id}/suggest-assignees")
async def suggest_assignees(
    ticket_id: str,
    top_n: int = Query(3, ge=1, le=10),
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator),
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Obtiene sugerencias de IA para asignar el ticket
    
    Retorna los mejores candidatos con score de confianza
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.get_ticket(ticket_uuid)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        suggestions = ai_coordinator.balancer.suggest_assignee(ticket, top_n=top_n)
        
        return {
            "ticket_id": ticket_id,
            "suggestions": [
                {
                    "user_id": str(user.id),
                    "email": user.email,
                    "full_name": getattr(user, 'full_name', ''),
                    "confidence": round(confidence, 2)
                }
                for user, confidence in suggestions
            ]
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except Exception as e:
        logger.error(f"Error sugiriendo asignados: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error sugiriendo asignados: {str(e)}")


# ============================================================================
# ENDPOINTS - ESCALACIÓN
# ============================================================================

@router.post("/tickets/{ticket_id}/escalate", response_model=TicketResponse)
async def escalate_ticket(
    ticket_id: str,
    escalate_data: TicketEscalateRequest,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Escala un ticket a supervisor/gerente/departamento
    
    Automáticamente:
    - Agrega al asignado anterior como watcher
    - Puede cambiar prioridad
    - Notifica a todos los involucrados
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.escalate_ticket(
            ticket_id=ticket_uuid,
            escalate_data=escalate_data,
            escalated_by_id=current_user.id
        )
        
        logger.info(f"Ticket {ticket.ticket_number} escalado a {escalate_data.escalated_to_id}")
        return TicketResponse.model_validate(ticket)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error escalando ticket: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error escalando ticket: {str(e)}")


@router.post("/tickets/auto-escalate", response_model=BulkOperationResponse)
async def auto_escalate_tickets(
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator),
    current_user: User = Depends(get_current_user)
):
    """
    Ejecuta escalación automática de tickets que lo necesitan
    
    Busca tickets:
    - Vencidos > 24h sin progreso
    - Alta complejidad
    - Bloqueados por mucho tiempo
    """
    try:
        escalated_tickets = ai_coordinator.escalation_agent.auto_escalate_tickets()
        
        return BulkOperationResponse(
            success_count=len(escalated_tickets),
            failed_count=0,
            errors=[]
        )
        
    except Exception as e:
        logger.error(f"Error en auto-escalación: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en auto-escalación: {str(e)}")


# ============================================================================
# ENDPOINTS - COMENTARIOS Y COLABORACIÓN
# ============================================================================

@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentResponse)
async def add_comment(
    ticket_id: str,
    comment_data: TicketCommentCreate,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Agrega un comentario al ticket
    
    Automáticamente notifica a watchers
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        comment = service.add_comment(
            ticket_id=ticket_uuid,
            comment_data=comment_data,
            user_id=current_user.id
        )
        
        return TicketCommentResponse.model_validate(comment)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error agregando comentario: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error agregando comentario: {str(e)}")


@router.get("/tickets/{ticket_id}/comments", response_model=List[TicketCommentResponse])
async def get_comments(
    ticket_id: str,
    include_internal: bool = Query(True, description="Incluir comentarios internos"),
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Obtiene todos los comentarios de un ticket
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        comments = service.get_comments(ticket_uuid, include_internal=include_internal)
        
        return [TicketCommentResponse.model_validate(c) for c in comments]
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except Exception as e:
        logger.error(f"Error obteniendo comentarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo comentarios: {str(e)}")


@router.post("/tickets/{ticket_id}/watchers", status_code=201)
async def add_watcher(
    ticket_id: str,
    watcher_data: TicketWatcherAdd,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Agrega un observador (jefe, colaborador) al ticket
    
    El observador recibirá notificaciones de actualizaciones
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        watcher = service.add_watcher(
            ticket_id=ticket_uuid,
            watcher_data=watcher_data,
            added_by_id=current_user.id
        )
        
        return {"message": "Watcher agregado exitosamente", "watcher_id": str(watcher.id)}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except Exception as e:
        logger.error(f"Error agregando watcher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error agregando watcher: {str(e)}")


@router.delete("/tickets/{ticket_id}/watchers/{user_id}", status_code=204)
async def remove_watcher(
    ticket_id: str,
    user_id: str,
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Remueve un observador del ticket
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        user_uuid = uuid.UUID(user_id)
        success = service.remove_watcher(ticket_uuid, user_uuid)
        
        if not success:
            raise HTTPException(status_code=404, detail="Watcher no encontrado")
        
        return None
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ID inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removiendo watcher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error removiendo watcher: {str(e)}")


# ============================================================================
# ENDPOINTS - CHECKLIST
# ============================================================================

@router.post("/tickets/{ticket_id}/checklist", response_model=ChecklistItemResponse, status_code=201)
async def add_checklist_item(
    ticket_id: str,
    item_data: ChecklistItemCreate,
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Agrega un item al checklist del ticket
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        item = service.add_checklist_item(ticket_uuid, item_data)
        
        return ChecklistItemResponse.model_validate(item)
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except Exception as e:
        logger.error(f"Error agregando item de checklist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error agregando item de checklist: {str(e)}")


@router.post("/checklist/{item_id}/complete", response_model=ChecklistItemResponse)
async def complete_checklist_item(
    item_id: str,
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Marca un item del checklist como completado
    
    Actualiza automáticamente el % de completitud del ticket
    """
    try:
        item_uuid = uuid.UUID(item_id)
        item = service.complete_checklist_item(item_uuid, current_user.id)
        
        return ChecklistItemResponse.model_validate(item)
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error completando item de checklist: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error completando item de checklist: {str(e)}")


# ============================================================================
# ENDPOINTS - HISTORIAL Y AUDITORÍA
# ============================================================================

@router.get("/tickets/{ticket_id}/history")
async def get_ticket_history(
    ticket_id: str,
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Obtiene historial completo de cambios del ticket
    
    Incluye todos los cambios realizados por usuarios e IA
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        history = service.get_ticket_history(ticket_uuid)
        
        return {
            "ticket_id": ticket_id,
            "history": [
                {
                    "id": str(h.id),
                    "action": h.action,
                    "field_name": h.field_name,
                    "old_value": h.old_value,
                    "new_value": h.new_value,
                    "description": h.description,
                    "is_ai_action": h.is_ai_action,
                    "user_id": str(h.user_id) if h.user_id else None,
                    "created_at": h.created_at.isoformat()
                }
                for h in history
            ]
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except Exception as e:
        logger.error(f"Error obteniendo historial: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo historial: {str(e)}")


# ============================================================================
# ENDPOINTS - ESTADÍSTICAS Y REPORTES
# ============================================================================

@router.get("/stats/me", response_model=TicketStatsResponse)
async def get_my_stats(
    service: TicketingService = Depends(get_ticketing_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas de tickets para el usuario actual
    
    Útil para dashboard personal
    """
    try:
        stats = service.get_user_ticket_stats(current_user.id)
        return TicketStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")


@router.get("/stats/department/{department_id}")
async def get_department_stats(
    department_id: str,
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Obtiene estadísticas de tickets para un departamento
    """
    try:
        dept_uuid = uuid.UUID(department_id)
        stats = service.get_department_stats(dept_uuid)
        
        return stats
        
    except ValueError:
        raise HTTPException(status_code=400, detail="department_id inválido")
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de departamento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo estadísticas: {str(e)}")


# ============================================================================
# ENDPOINTS - DEPARTAMENTOS
# ============================================================================

@router.post("/departments", response_model=DepartmentResponse, status_code=201)
async def create_department(
    dept_data: DepartmentCreate,
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Crea un nuevo departamento
    """
    try:
        department = service.create_department(
            name=dept_data.name,
            description=dept_data.description,
            manager_id=dept_data.manager_id,
            parent_department_id=dept_data.parent_department_id
        )
        
        return DepartmentResponse.model_validate(department)
        
    except Exception as e:
        logger.error(f"Error creando departamento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creando departamento: {str(e)}")


@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    include_inactive: bool = Query(False),
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Lista todos los departamentos
    """
    try:
        departments = service.list_departments(include_inactive=include_inactive)
        return [DepartmentResponse.model_validate(d) for d in departments]
        
    except Exception as e:
        logger.error(f"Error listando departamentos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listando departamentos: {str(e)}")


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: str,
    service: TicketingService = Depends(get_ticketing_service)
):
    """
    Obtiene un departamento por ID
    """
    try:
        dept_uuid = uuid.UUID(department_id)
        department = service.get_department(dept_uuid)
        
        if not department:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")
        
        return DepartmentResponse.model_validate(department)
        
    except ValueError:
        raise HTTPException(status_code=400, detail="department_id inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo departamento: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo departamento: {str(e)}")


# ============================================================================
# ENDPOINTS - PROCESAMIENTO MASIVO Y IA
# ============================================================================

@router.post("/ai/recalculate-priorities", response_model=BulkOperationResponse)
async def recalculate_priorities(
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator)
):
    """
    Recalcula prioridades de todos los tickets abiertos con IA
    
    Debe ejecutarse periódicamente (cronjob cada hora)
    """
    try:
        updated = ai_coordinator.prioritizer.recalculate_all_priorities()
        
        return BulkOperationResponse(
            success_count=updated,
            failed_count=0,
            errors=[]
        )
        
    except Exception as e:
        logger.error(f"Error recalculando prioridades: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error recalculando prioridades: {str(e)}")


@router.post("/ai/run-periodic-tasks")
async def run_periodic_tasks(
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator)
):
    """
    Ejecuta todas las tareas periódicas de IA
    
    Incluye:
    - Recálculo de prioridades
    - Auto-escalación de tickets
    - Predicción de completitud
    
    Ejecutar mediante cronjob cada hora
    """
    try:
        results = ai_coordinator.run_periodic_tasks()
        
        return {
            "status": "success",
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error ejecutando tareas periódicas: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error ejecutando tareas periódicas: {str(e)}")


@router.get("/tickets/{ticket_id}/quality-check", response_model=QualityCheckResponse)
async def check_ticket_quality(
    ticket_id: str,
    service: TicketingService = Depends(get_ticketing_service),
    ai_coordinator: TicketingAICoordinator = Depends(get_ai_coordinator)
):
    """
    Verifica calidad del ticket antes de cerrarlo
    
    Retorna score de calidad y recomendaciones
    """
    try:
        ticket_uuid = uuid.UUID(ticket_id)
        ticket = service.get_ticket(ticket_uuid)
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
        
        quality_result = ai_coordinator.quality_checker.check_ticket_quality(ticket)
        
        return QualityCheckResponse(**quality_result)
        
    except ValueError:
        raise HTTPException(status_code=400, detail="ticket_id inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando calidad: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error verificando calidad: {str(e)}")


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Health check del sistema de ticketing
    """
    return {
        "status": "healthy",
        "service": "ticketing",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
