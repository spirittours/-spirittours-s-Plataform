"""
API REST para Sistema de Recordatorios de Capacitación
Endpoints para gestión y monitoreo de recordatorios automáticos
"""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from backend.models.training_models import TrainingReminderSent, ReminderType
from backend.models.rbac_models import User
from backend.services.training_reminder_service import TrainingReminderService

router = APIRouter(prefix="/api/training/reminders", tags=["Training Reminders"])

# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_db():
    """Dependency para obtener sesión de base de datos"""
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user() -> User:
    """Dependency para obtener usuario actual"""
    # TODO: Implementar autenticación JWT
    pass

def get_reminder_service(db: Session = Depends(get_db)) -> TrainingReminderService:
    """Dependency para obtener servicio de recordatorios"""
    # TODO: Get SMTP config from environment variables
    smtp_config = {
        'host': 'smtp.gmail.com',
        'port': 587,
        'username': 'noreply@spirittours.com',
        'password': 'your-app-password',
        'use_tls': True
    }
    return TrainingReminderService(db, smtp_config)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ReminderExecutionResponse(BaseModel):
    """Respuesta de ejecución de recordatorios"""
    success: bool
    reminders_sent: Dict[str, int]
    total_sent: int
    execution_time: float
    timestamp: datetime

class ReminderHistoryEntry(BaseModel):
    """Entrada del historial de recordatorios"""
    id: str
    user_id: str
    user_name: str
    user_email: str
    reminder_type: str
    module_title: Optional[str]
    sent_at: datetime

class ReminderStatsResponse(BaseModel):
    """Estadísticas de recordatorios"""
    total_reminders_sent: int
    reminders_by_type: Dict[str, int]
    last_7_days: Dict[str, int]
    last_30_days: Dict[str, int]
    most_reminded_users: List[Dict[str, Any]]

class SendCustomReminderRequest(BaseModel):
    """Request para enviar recordatorio personalizado"""
    user_ids: List[str]
    reminder_type: str
    custom_message: Optional[str] = None

# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@router.post("/execute", response_model=ReminderExecutionResponse)
async def execute_reminders(
    background_tasks: BackgroundTasks,
    service: TrainingReminderService = Depends(get_reminder_service),
    current_user: User = Depends(get_current_user)
):
    """
    Ejecuta el proceso de envío de recordatorios
    
    Admin only: Ejecuta manualmente el proceso que normalmente corre vía cron
    """
    # TODO: Check admin permission
    
    start_time = datetime.now()
    
    # Execute in background
    results = service.process_all_reminders()
    
    end_time = datetime.now()
    execution_time = (end_time - start_time).total_seconds()
    
    total_sent = sum(results.values())
    
    return ReminderExecutionResponse(
        success=True,
        reminders_sent=results,
        total_sent=total_sent,
        execution_time=execution_time,
        timestamp=end_time
    )

@router.post("/execute-async")
async def execute_reminders_async(
    background_tasks: BackgroundTasks,
    service: TrainingReminderService = Depends(get_reminder_service),
    current_user: User = Depends(get_current_user)
):
    """
    Ejecuta el proceso de recordatorios en background
    
    Admin only: Inicia el proceso y retorna inmediatamente
    """
    # TODO: Check admin permission
    
    background_tasks.add_task(service.process_all_reminders)
    
    return JSONResponse(
        status_code=202,
        content={
            "message": "Reminder processing started in background",
            "status": "processing"
        }
    )

@router.post("/send-custom")
async def send_custom_reminder(
    request: SendCustomReminderRequest,
    service: TrainingReminderService = Depends(get_reminder_service),
    current_user: User = Depends(get_current_user)
):
    """
    Envía recordatorio personalizado a usuarios específicos
    
    Admin only: Permite enviar recordatorios manuales
    """
    # TODO: Check admin permission
    
    try:
        sent_count = 0
        for user_id_str in request.user_ids:
            user_id = uuid.UUID(user_id_str)
            
            # Send appropriate reminder based on type
            if request.reminder_type == 'welcome':
                user = service.db.query(User).filter(User.id == user_id).first()
                if user:
                    service._send_welcome_email(user)
                    service._record_reminder_sent(user_id, ReminderType.WELCOME)
                    sent_count += 1
            
            elif request.reminder_type == 'progress':
                user = service.db.query(User).filter(User.id == user_id).first()
                if user:
                    service._send_progress_email(user)
                    service._record_reminder_sent(user_id, ReminderType.PROGRESS_UPDATE)
                    sent_count += 1
            
            # Add more types as needed
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"Successfully sent {sent_count} reminders",
                "sent_count": sent_count
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending reminders: {str(e)}")

# ============================================================================
# MONITORING ENDPOINTS
# ============================================================================

@router.get("/history", response_model=List[ReminderHistoryEntry])
async def get_reminder_history(
    limit: int = 100,
    offset: int = 0,
    reminder_type: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene historial de recordatorios enviados
    
    Admin only: Ver todos los recordatorios
    Employee: Ver solo sus propios recordatorios
    """
    query = db.query(TrainingReminderSent).join(
        User, TrainingReminderSent.user_id == User.id
    )
    
    # Filter by reminder type
    if reminder_type:
        try:
            reminder_enum = ReminderType(reminder_type)
            query = query.filter(TrainingReminderSent.reminder_type == reminder_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid reminder type")
    
    # Filter by user (admin can see all, employees see only theirs)
    if user_id:
        query = query.filter(TrainingReminderSent.user_id == uuid.UUID(user_id))
    # TODO: If not admin, filter by current_user.id
    
    # Order and paginate
    reminders = query.order_by(
        TrainingReminderSent.sent_at.desc()
    ).offset(offset).limit(limit).all()
    
    result = []
    for reminder in reminders:
        user = db.query(User).filter(User.id == reminder.user_id).first()
        module_title = None
        if reminder.module_id:
            from backend.models.training_models import TrainingModule
            module = db.query(TrainingModule).filter(
                TrainingModule.id == reminder.module_id
            ).first()
            if module:
                module_title = module.title
        
        result.append(ReminderHistoryEntry(
            id=str(reminder.id),
            user_id=str(reminder.user_id),
            user_name=user.full_name or user.username if user else "Unknown",
            user_email=user.email if user else "Unknown",
            reminder_type=reminder.reminder_type.value,
            module_title=module_title,
            sent_at=reminder.sent_at
        ))
    
    return result

@router.get("/stats", response_model=ReminderStatsResponse)
async def get_reminder_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas de recordatorios
    
    Admin only: Estadísticas completas del sistema
    """
    # TODO: Check admin permission
    
    from sqlalchemy import func
    from datetime import timedelta
    
    # Total reminders sent
    total_reminders = db.query(TrainingReminderSent).count()
    
    # Reminders by type
    reminders_by_type_query = db.query(
        TrainingReminderSent.reminder_type,
        func.count(TrainingReminderSent.id)
    ).group_by(TrainingReminderSent.reminder_type).all()
    
    reminders_by_type = {
        reminder_type.value: count 
        for reminder_type, count in reminders_by_type_query
    }
    
    # Last 7 days
    seven_days_ago = datetime.now() - timedelta(days=7)
    last_7_days_query = db.query(
        func.date(TrainingReminderSent.sent_at).label('date'),
        func.count(TrainingReminderSent.id)
    ).filter(
        TrainingReminderSent.sent_at >= seven_days_ago
    ).group_by(func.date(TrainingReminderSent.sent_at)).all()
    
    last_7_days = {
        str(date): count 
        for date, count in last_7_days_query
    }
    
    # Last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    last_30_days_query = db.query(
        func.date(TrainingReminderSent.sent_at).label('date'),
        func.count(TrainingReminderSent.id)
    ).filter(
        TrainingReminderSent.sent_at >= thirty_days_ago
    ).group_by(func.date(TrainingReminderSent.sent_at)).all()
    
    last_30_days = {
        str(date): count 
        for date, count in last_30_days_query
    }
    
    # Most reminded users
    most_reminded_query = db.query(
        User.id,
        User.full_name,
        User.email,
        func.count(TrainingReminderSent.id).label('reminder_count')
    ).join(
        TrainingReminderSent, User.id == TrainingReminderSent.user_id
    ).group_by(
        User.id, User.full_name, User.email
    ).order_by(
        func.count(TrainingReminderSent.id).desc()
    ).limit(10).all()
    
    most_reminded_users = [
        {
            'user_id': str(user_id),
            'user_name': full_name or 'Unknown',
            'user_email': email,
            'reminder_count': count
        }
        for user_id, full_name, email, count in most_reminded_query
    ]
    
    return ReminderStatsResponse(
        total_reminders_sent=total_reminders,
        reminders_by_type=reminders_by_type,
        last_7_days=last_7_days,
        last_30_days=last_30_days,
        most_reminded_users=most_reminded_users
    )

# ============================================================================
# TEST ENDPOINTS (Development only)
# ============================================================================

@router.post("/test/send-welcome/{user_id}")
async def test_send_welcome(
    user_id: str,
    service: TrainingReminderService = Depends(get_reminder_service),
    current_user: User = Depends(get_current_user)
):
    """
    TEST ONLY: Envía un email de bienvenida de prueba
    """
    # TODO: Only allow in development environment
    
    try:
        user_uuid = uuid.UUID(user_id)
        user = service.db.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        service._send_welcome_email(user)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"Welcome email sent to {user.email}",
                "user_id": user_id
            }
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/test/send-progress/{user_id}")
async def test_send_progress(
    user_id: str,
    service: TrainingReminderService = Depends(get_reminder_service),
    current_user: User = Depends(get_current_user)
):
    """
    TEST ONLY: Envía un email de progreso de prueba
    """
    # TODO: Only allow in development environment
    
    try:
        user_uuid = uuid.UUID(user_id)
        user = service.db.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        service._send_progress_email(user)
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"Progress email sent to {user.email}",
                "user_id": user_id
            }
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check para el servicio de recordatorios"""
    try:
        # Check database connectivity
        db.execute("SELECT 1")
        
        # Get last reminder sent
        from backend.models.training_models import TrainingReminderSent
        last_reminder = db.query(TrainingReminderSent).order_by(
            TrainingReminderSent.sent_at.desc()
        ).first()
        
        return {
            "status": "healthy",
            "database": "connected",
            "last_reminder_sent": last_reminder.sent_at if last_reminder else None
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )
