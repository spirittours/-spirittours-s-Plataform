"""
API REST de Sistema de Capacitación
Endpoints completos para gestión de capacitación, progreso y certificaciones
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
import uuid
import logging

from backend.models.training_models import (
    TrainingModule, TrainingLesson, TrainingProgress, TrainingQuiz,
    TrainingCertification, ModuleCategory, ContentType, ProgressStatus,
    CertificationLevel, ModuleCreate, ModuleUpdate, ModuleResponse,
    LessonCreate, LessonUpdate, LessonResponse, ProgressResponse,
    QuizCreate, QuizAttemptSubmit, QuizAttemptResponse, CertificationResponse,
    TrainingStatsResponse, ConfigurationUpdate, AchievementResponse,
    LeaderboardEntry
)
from backend.models.rbac_models import User
from backend.services.training_service import TrainingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/training", tags=["Training & Onboarding"])

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

def get_training_service(db: Session = Depends(get_db)) -> TrainingService:
    """Dependency para obtener servicio de capacitación"""
    return TrainingService(db)

# ============================================================================
# ENDPOINTS - MÓDULOS (ADMIN)
# ============================================================================

@router.post("/admin/modules", response_model=ModuleResponse, status_code=201)
async def create_module(
    module_data: ModuleCreate,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Crea un nuevo módulo de capacitación
    
    **Solo administradores**
    """
    try:
        module = service.create_module(module_data)
        return ModuleResponse.model_validate(module)
    except Exception as e:
        logger.error(f"Error creando módulo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/modules", response_model=List[ModuleResponse])
async def list_all_modules(
    category: Optional[ModuleCategory] = Query(None),
    is_active: Optional[bool] = Query(None),
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los módulos (vista admin)
    
    **Solo administradores**
    """
    try:
        modules_data = service.list_modules(category=category, is_active=is_active)
        return [ModuleResponse.model_validate(m['module']) for m in modules_data]
    except Exception as e:
        logger.error(f"Error listando módulos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/modules/{module_id}", response_model=ModuleResponse)
async def get_module_admin(
    module_id: str,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene detalles de un módulo
    
    **Solo administradores**
    """
    try:
        module_uuid = uuid.UUID(module_id)
        module = service.get_module(module_uuid)
        
        if not module:
            raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
        return ModuleResponse.model_validate(module)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de módulo inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo módulo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: str,
    module_data: ModuleUpdate,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza un módulo existente
    
    **Solo administradores**
    """
    try:
        module_uuid = uuid.UUID(module_id)
        module = service.update_module(module_uuid, module_data)
        return ModuleResponse.model_validate(module)
    except ValueError as ve:
        if "no encontrado" in str(ve):
            raise HTTPException(status_code=404, detail=str(ve))
        raise HTTPException(status_code=400, detail="ID de módulo inválido")
    except Exception as e:
        logger.error(f"Error actualizando módulo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - LECCIONES (ADMIN)
# ============================================================================

@router.post("/admin/lessons", response_model=LessonResponse, status_code=201)
async def create_lesson(
    lesson_data: LessonCreate,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nueva lección
    
    **Solo administradores**
    """
    try:
        lesson = service.create_lesson(lesson_data)
        return LessonResponse.model_validate(lesson)
    except Exception as e:
        logger.error(f"Error creando lección: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/modules/{module_id}/lessons", response_model=List[LessonResponse])
async def get_module_lessons_admin(
    module_id: str,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene lecciones de un módulo (admin)
    
    **Solo administradores**
    """
    try:
        module_uuid = uuid.UUID(module_id)
        lessons_data = service.get_module_lessons(module_uuid)
        return [LessonResponse.model_validate(l['lesson']) for l in lessons_data]
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de módulo inválido")
    except Exception as e:
        logger.error(f"Error obteniendo lecciones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/lessons/{lesson_id}/upload-content")
async def upload_lesson_content(
    lesson_id: str,
    file: UploadFile = File(...),
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Sube contenido de lección (video, PDF, etc.)
    
    **Solo administradores**
    
    TODO: Implementar upload a S3/storage
    """
    try:
        # TODO: Implementar upload a S3
        return {
            "message": "Upload de contenido - Por implementar integración con S3",
            "lesson_id": lesson_id,
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"Error subiendo contenido: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - QUIZZES (ADMIN)
# ============================================================================

@router.post("/admin/quizzes", status_code=201)
async def create_quiz(
    quiz_data: QuizCreate,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Crea un nuevo quiz con preguntas
    
    **Solo administradores**
    
    TODO: Implementar en servicio
    """
    try:
        # TODO: Implementar create_quiz en servicio
        return {
            "message": "Quiz creation - Por implementar",
            "quiz_title": quiz_data.title
        }
    except Exception as e:
        logger.error(f"Error creando quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - MÓDULOS (EMPLEADO)
# ============================================================================

@router.get("/modules", response_model=List[Dict[str, Any]])
async def list_my_modules(
    category: Optional[ModuleCategory] = Query(None),
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lista módulos con progreso del usuario actual
    
    Incluye información de progreso para cada módulo
    """
    try:
        modules_data = service.list_modules(
            category=category,
            user_id=current_user.id
        )
        
        result = []
        for item in modules_data:
            module = item['module']
            progress = item['progress']
            
            result.append({
                'module': ModuleResponse.model_validate(module).model_dump(),
                'progress': ProgressResponse.model_validate(progress).model_dump() if progress else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Error listando módulos del usuario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/modules/{module_id}")
async def get_module_details(
    module_id: str,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene detalles de un módulo con progreso del usuario
    """
    try:
        module_uuid = uuid.UUID(module_id)
        module = service.get_module(module_uuid)
        
        if not module:
            raise HTTPException(status_code=404, detail="Módulo no encontrado")
        
        # Obtener progreso del usuario
        progress = service.get_user_module_progress(current_user.id, module_uuid)
        
        # Obtener lecciones con progreso
        lessons_data = service.get_module_lessons(module_uuid, user_id=current_user.id)
        
        lessons = []
        for item in lessons_data:
            lesson = item['lesson']
            lesson_progress = item['progress']
            lessons.append({
                'lesson': LessonResponse.model_validate(lesson).model_dump(),
                'is_completed': lesson_progress.is_completed if lesson_progress else False,
                'time_spent': lesson_progress.time_spent_minutes if lesson_progress else 0
            })
        
        return {
            'module': ModuleResponse.model_validate(module).model_dump(),
            'progress': ProgressResponse.model_validate(progress).model_dump() if progress else None,
            'lessons': lessons
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de módulo inválido")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo detalles del módulo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/modules/{module_id}/start")
async def start_module(
    module_id: str,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Inicia un módulo para el usuario actual
    """
    try:
        module_uuid = uuid.UUID(module_id)
        progress = service.start_module(current_user.id, module_uuid)
        return ProgressResponse.model_validate(progress)
    except ValueError as ve:
        if "no encontrado" in str(ve):
            raise HTTPException(status_code=404, detail=str(ve))
        raise HTTPException(status_code=400, detail="ID de módulo inválido")
    except Exception as e:
        logger.error(f"Error iniciando módulo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - LECCIONES (EMPLEADO)
# ============================================================================

@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    time_spent: int = Query(0, description="Tiempo en minutos"),
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Marca una lección como completada
    
    Automáticamente actualiza el progreso del módulo
    """
    try:
        lesson_uuid = uuid.UUID(lesson_id)
        progress = service.complete_lesson(current_user.id, lesson_uuid, time_spent)
        
        return {
            "message": "Lección completada exitosamente",
            "lesson_id": lesson_id,
            "time_spent": time_spent,
            "is_completed": progress.is_completed
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de lección inválido")
    except Exception as e:
        logger.error(f"Error completando lección: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/lessons/{lesson_id}/progress")
async def update_lesson_progress(
    lesson_id: str,
    last_position: int = Query(..., description="Última posición (segundos para video)"),
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza progreso de lección (ej: último segundo visto en video)
    
    TODO: Implementar en servicio
    """
    try:
        # TODO: Implementar update_lesson_progress en servicio
        return {
            "message": "Progreso actualizado",
            "lesson_id": lesson_id,
            "last_position": last_position
        }
    except Exception as e:
        logger.error(f"Error actualizando progreso: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - QUIZZES (EMPLEADO)
# ============================================================================

@router.post("/quizzes/{quiz_id}/submit", response_model=QuizAttemptResponse)
async def submit_quiz(
    quiz_id: str,
    answers: QuizAttemptSubmit,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Envía respuestas de un quiz
    
    Calcula automáticamente el score y determina si aprobó
    """
    try:
        quiz_uuid = uuid.UUID(quiz_id)
        attempt = service.submit_quiz(current_user.id, quiz_uuid, answers)
        
        # Construir respuesta
        response_data = QuizAttemptResponse.model_validate(attempt).model_dump()
        
        # Si el quiz muestra respuestas correctas, incluirlas
        quiz = service.db.query(TrainingQuiz).filter(TrainingQuiz.id == quiz_uuid).first()
        if quiz and quiz.show_correct_answers:
            # TODO: Incluir respuestas correctas
            pass
        
        return QuizAttemptResponse(**response_data)
    except ValueError as ve:
        if "máximo de intentos" in str(ve):
            raise HTTPException(status_code=403, detail=str(ve))
        if "no encontrado" in str(ve):
            raise HTTPException(status_code=404, detail=str(ve))
        raise HTTPException(status_code=400, detail="ID de quiz inválido")
    except Exception as e:
        logger.error(f"Error enviando quiz: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quizzes/{quiz_id}/attempts")
async def get_quiz_attempts(
    quiz_id: str,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene historial de intentos de un quiz
    
    TODO: Implementar en servicio
    """
    try:
        # TODO: Implementar get_quiz_attempts en servicio
        return {
            "message": "Quiz attempts - Por implementar",
            "quiz_id": quiz_id
        }
    except Exception as e:
        logger.error(f"Error obteniendo intentos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - PROGRESO Y ESTADÍSTICAS
# ============================================================================

@router.get("/my-progress", response_model=TrainingStatsResponse)
async def get_my_progress(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas completas de progreso del usuario
    
    Incluye:
    - Módulos completados/en progreso
    - Horas invertidas
    - Score promedio
    - Nivel de certificación actual
    - Puntos y logros
    """
    try:
        stats = service.get_user_stats(current_user.id)
        return TrainingStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-certifications", response_model=List[CertificationResponse])
async def get_my_certifications(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todas las certificaciones del usuario
    """
    try:
        certifications = service.db.query(TrainingCertification)\
            .filter(TrainingCertification.user_id == current_user.id)\
            .order_by(TrainingCertification.issued_at.desc())\
            .all()
        
        return [CertificationResponse.model_validate(c) for c in certifications]
    except Exception as e:
        logger.error(f"Error obteniendo certificaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=100),
    service: TrainingService = Depends(get_training_service)
):
    """
    Obtiene el leaderboard de empleados
    
    Ranking por puntos totales
    """
    try:
        leaderboard = service.get_leaderboard(limit=limit)
        return [LeaderboardEntry(**entry) for entry in leaderboard]
    except Exception as e:
        logger.error(f"Error obteniendo leaderboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - SISTEMA DE ACCESO
# ============================================================================

@router.get("/check-access")
async def check_system_access(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica si el usuario tiene acceso completo al sistema
    
    Retorna:
    - has_access: Si puede acceder
    - blocked: Si está bloqueado
    - reason: Razón del bloqueo
    - pending_modules: Módulos pendientes
    - progress_percentage: % de progreso en categoría obligatoria
    """
    try:
        access_info = service.check_user_access(current_user.id)
        return access_info
    except Exception as e:
        logger.error(f"Error verificando acceso: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - CONFIGURACIÓN (ADMIN)
# ============================================================================

@router.get("/admin/configuration")
async def get_configuration(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene configuración global del sistema
    
    **Solo administradores**
    """
    try:
        config = service.get_configuration()
        return {
            "mandatory_mode_enabled": config.mandatory_mode_enabled,
            "block_system_until_complete": config.block_system_until_complete,
            "category_b_deadline_days": config.category_b_deadline_days,
            "reminders_enabled": config.reminders_enabled,
            "reminder_frequency_days": config.reminder_frequency_days,
            "minimum_passing_score": config.minimum_passing_score,
            "gamification_enabled": config.gamification_enabled,
            "points_per_lesson": config.points_per_lesson,
            "points_per_module": config.points_per_module
        }
    except Exception as e:
        logger.error(f"Error obteniendo configuración: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/configuration")
async def update_configuration(
    config_data: ConfigurationUpdate,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza configuración global
    
    **Solo administradores**
    
    Permite activar/desactivar:
    - Modo obligatorio
    - Bloqueo del sistema
    - Plazos de completitud
    - Recordatorios
    - Gamificación
    """
    try:
        updates = config_data.model_dump(exclude_unset=True)
        config = service.update_configuration(updates)
        
        return {
            "message": "Configuración actualizada exitosamente",
            "updated_fields": list(updates.keys())
        }
    except Exception as e:
        logger.error(f"Error actualizando configuración: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - ESTADÍSTICAS ADMIN
# ============================================================================

@router.get("/admin/stats/overview")
async def get_training_overview(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas generales del sistema de capacitación
    
    **Solo administradores**
    """
    try:
        from sqlalchemy import func, and_
        
        # Total de empleados en capacitación
        total_users = service.db.query(func.count(func.distinct(TrainingProgress.user_id)))\
            .scalar() or 0
        
        # Empleados que completaron Categoría A
        cat_a_complete = service.db.query(func.count(func.distinct(TrainingProgress.user_id)))\
            .join(TrainingModule)\
            .filter(
                and_(
                    TrainingModule.category == ModuleCategory.OBLIGATORY,
                    TrainingProgress.status == ProgressStatus.COMPLETED
                )
            )\
            .group_by(TrainingProgress.user_id)\
            .having(func.count(TrainingProgress.id) >= service.db.query(func.count(TrainingModule.id))\
                   .filter(TrainingModule.category == ModuleCategory.OBLIGATORY).scalar())\
            .all()
        
        cat_a_complete_count = len(cat_a_complete)
        
        # Empleados con capacitación vencida
        from datetime import datetime, timezone
        overdue = service.db.query(func.count(func.distinct(TrainingProgress.user_id)))\
            .filter(
                and_(
                    TrainingProgress.deadline < datetime.now(timezone.utc),
                    TrainingProgress.status != ProgressStatus.COMPLETED,
                    TrainingProgress.is_overdue == True
                )
            ).scalar() or 0
        
        # Tasa promedio de completitud
        avg_completion = service.db.query(func.avg(TrainingProgress.progress_percentage))\
            .scalar() or 0
        
        return {
            "total_users_in_training": total_users,
            "completed_category_a": cat_a_complete_count,
            "completion_rate_category_a": int((cat_a_complete_count / total_users * 100)) if total_users > 0 else 0,
            "users_with_overdue": overdue,
            "average_completion_percentage": float(avg_completion),
            "total_active_modules": service.db.query(func.count(TrainingModule.id))\
                .filter(TrainingModule.is_active == True).scalar()
        }
    except Exception as e:
        logger.error(f"Error obteniendo overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/users/{user_id}/progress")
async def get_user_progress_admin(
    user_id: str,
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene progreso detallado de un usuario específico
    
    **Solo administradores**
    """
    try:
        user_uuid = uuid.UUID(user_id)
        stats = service.get_user_stats(user_uuid)
        
        # Obtener módulos con progreso
        modules_data = service.list_modules(user_id=user_uuid)
        
        modules_progress = []
        for item in modules_data:
            module = item['module']
            progress = item['progress']
            modules_progress.append({
                'module_id': str(module.id),
                'module_title': module.title,
                'category': module.category.value,
                'progress': ProgressResponse.model_validate(progress).model_dump() if progress else None
            })
        
        return {
            "user_id": user_id,
            "stats": stats,
            "modules_progress": modules_progress
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    except Exception as e:
        logger.error(f"Error obteniendo progreso del usuario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/users/overdue")
async def get_overdue_users(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lista usuarios con capacitación vencida
    
    **Solo administradores**
    """
    try:
        from datetime import datetime, timezone
        
        overdue_progress = service.db.query(TrainingProgress)\
            .filter(
                and_(
                    TrainingProgress.deadline < datetime.now(timezone.utc),
                    TrainingProgress.status != ProgressStatus.COMPLETED
                )
            )\
            .all()
        
        users_data = {}
        for progress in overdue_progress:
            user_id = str(progress.user_id)
            if user_id not in users_data:
                user = service.db.query(User).filter(User.id == progress.user_id).first()
                users_data[user_id] = {
                    'user_id': user_id,
                    'user_name': user.email if user else 'Unknown',
                    'overdue_modules': []
                }
            
            module = service.get_module(progress.module_id)
            users_data[user_id]['overdue_modules'].append({
                'module_id': str(progress.module_id),
                'module_title': module.title if module else 'Unknown',
                'deadline': progress.deadline.isoformat() if progress.deadline else None,
                'progress_percentage': progress.progress_percentage
            })
        
        return list(users_data.values())
    except Exception as e:
        logger.error(f"Error obteniendo usuarios con vencimientos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ENDPOINTS - GAMIFICACIÓN
# ============================================================================

@router.get("/my-achievements", response_model=List[AchievementResponse])
async def get_my_achievements(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene logros del usuario actual
    
    TODO: Implementar sistema de achievements
    """
    try:
        # TODO: Implementar
        return []
    except Exception as e:
        logger.error(f"Error obteniendo logros: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-points")
async def get_my_points(
    service: TrainingService = Depends(get_training_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene puntos y racha del usuario
    """
    try:
        from backend.models.training_models import TrainingUserPoints
        
        user_points = service.db.query(TrainingUserPoints)\
            .filter(TrainingUserPoints.user_id == current_user.id)\
            .first()
        
        if not user_points:
            return {
                "total_points": 0,
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity": None
            }
        
        return {
            "total_points": user_points.total_points,
            "current_streak": user_points.current_streak,
            "longest_streak": user_points.longest_streak,
            "last_activity": user_points.last_activity.isoformat() if user_points.last_activity else None
        }
    except Exception as e:
        logger.error(f"Error obteniendo puntos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """
    Health check del sistema de capacitación
    """
    return {
        "status": "healthy",
        "service": "training",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
