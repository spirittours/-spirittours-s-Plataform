"""
Servicio de Capacitación y Onboarding
Lógica de negocio completa para gestión de módulos, progreso y certificaciones
"""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta, timezone
import uuid
import logging
from decimal import Decimal

from backend.models.training_models import (
    TrainingModule, TrainingLesson, TrainingProgress, TrainingLessonProgress,
    TrainingQuiz, TrainingQuizQuestion, TrainingQuizAttempt, TrainingCertification,
    TrainingConfiguration, TrainingReminderSent, TrainingAchievement,
    TrainingUserAchievement, TrainingUserPoints, ModuleCategory, ContentType,
    ProgressStatus, QuestionType, CertificationLevel, ReminderType,
    ModuleCreate, ModuleUpdate, LessonCreate, QuizCreate, QuizAttemptSubmit
)
from backend.models.rbac_models import User

logger = logging.getLogger(__name__)

class TrainingService:
    """Servicio principal de capacitación"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========================================================================
    # MÓDULOS - CRUD
    # ========================================================================
    
    def create_module(self, module_data: ModuleCreate) -> TrainingModule:
        """Crea un nuevo módulo de capacitación"""
        try:
            module = TrainingModule(
                title=module_data.title,
                description=module_data.description,
                category=module_data.category,
                estimated_hours=module_data.estimated_hours,
                position=module_data.position,
                passing_score=module_data.passing_score,
                prerequisites=module_data.prerequisites,
                icon=module_data.icon,
                color=module_data.color,
                tags=module_data.tags
            )
            
            self.db.add(module)
            self.db.commit()
            self.db.refresh(module)
            
            logger.info(f"Módulo creado: {module.title}")
            return module
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creando módulo: {str(e)}")
            raise
    
    def get_module(self, module_id: uuid.UUID) -> Optional[TrainingModule]:
        """Obtiene un módulo por ID"""
        return self.db.query(TrainingModule)\
            .options(joinedload(TrainingModule.lessons))\
            .filter(TrainingModule.id == module_id)\
            .first()
    
    def list_modules(
        self,
        category: Optional[ModuleCategory] = None,
        is_active: bool = True,
        user_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """Lista módulos con progreso del usuario si se proporciona"""
        query = self.db.query(TrainingModule)
        
        if category:
            query = query.filter(TrainingModule.category == category)
        
        if is_active is not None:
            query = query.filter(TrainingModule.is_active == is_active)
        
        query = query.order_by(TrainingModule.position)
        modules = query.all()
        
        # Si hay user_id, incluir progreso
        if user_id:
            result = []
            for module in modules:
                progress = self.get_user_module_progress(user_id, module.id)
                result.append({
                    'module': module,
                    'progress': progress
                })
            return result
        
        return [{'module': m, 'progress': None} for m in modules]
    
    def update_module(
        self,
        module_id: uuid.UUID,
        module_data: ModuleUpdate
    ) -> TrainingModule:
        """Actualiza un módulo"""
        module = self.get_module(module_id)
        if not module:
            raise ValueError(f"Módulo {module_id} no encontrado")
        
        try:
            update_data = module_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(module, field, value)
            
            module.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(module)
            
            return module
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error actualizando módulo: {str(e)}")
            raise
    
    # ========================================================================
    # LECCIONES - CRUD
    # ========================================================================
    
    def create_lesson(self, lesson_data: LessonCreate) -> TrainingLesson:
        """Crea una nueva lección"""
        try:
            lesson = TrainingLesson(
                module_id=lesson_data.module_id,
                title=lesson_data.title,
                description=lesson_data.description,
                content_type=lesson_data.content_type,
                content_url=lesson_data.content_url,
                content_text=lesson_data.content_text,
                content_metadata=lesson_data.content_metadata,
                estimated_minutes=lesson_data.estimated_minutes,
                position=lesson_data.position,
                is_required=lesson_data.is_required
            )
            
            self.db.add(lesson)
            self.db.commit()
            self.db.refresh(lesson)
            
            logger.info(f"Lección creada: {lesson.title}")
            return lesson
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creando lección: {str(e)}")
            raise
    
    def get_module_lessons(
        self,
        module_id: uuid.UUID,
        user_id: Optional[uuid.UUID] = None
    ) -> List[Dict[str, Any]]:
        """Obtiene lecciones de un módulo con progreso opcional"""
        lessons = self.db.query(TrainingLesson)\
            .filter(TrainingLesson.module_id == module_id)\
            .order_by(TrainingLesson.position)\
            .all()
        
        if user_id:
            result = []
            for lesson in lessons:
                progress = self.db.query(TrainingLessonProgress)\
                    .filter(
                        and_(
                            TrainingLessonProgress.user_id == user_id,
                            TrainingLessonProgress.lesson_id == lesson.id
                        )
                    ).first()
                result.append({
                    'lesson': lesson,
                    'progress': progress
                })
            return result
        
        return [{'lesson': l, 'progress': None} for l in lessons]
    
    # ========================================================================
    # PROGRESO DEL USUARIO
    # ========================================================================
    
    def get_user_module_progress(
        self,
        user_id: uuid.UUID,
        module_id: uuid.UUID
    ) -> Optional[TrainingProgress]:
        """Obtiene progreso del usuario en un módulo"""
        return self.db.query(TrainingProgress)\
            .filter(
                and_(
                    TrainingProgress.user_id == user_id,
                    TrainingProgress.module_id == module_id
                )
            ).first()
    
    def start_module(
        self,
        user_id: uuid.UUID,
        module_id: uuid.UUID
    ) -> TrainingProgress:
        """Inicia un módulo para un usuario"""
        # Verificar si ya existe progreso
        progress = self.get_user_module_progress(user_id, module_id)
        
        if progress:
            if progress.status == ProgressStatus.NOT_STARTED:
                progress.status = ProgressStatus.IN_PROGRESS
                progress.started_at = datetime.now(timezone.utc)
                self.db.commit()
            return progress
        
        # Crear nuevo progreso
        module = self.get_module(module_id)
        if not module:
            raise ValueError(f"Módulo {module_id} no encontrado")
        
        # Calcular deadline según categoría
        deadline = None
        config = self.get_configuration()
        
        if module.category == ModuleCategory.IMPORTANT:
            deadline = datetime.now(timezone.utc) + timedelta(days=config.category_b_deadline_days)
        
        try:
            progress = TrainingProgress(
                user_id=user_id,
                module_id=module_id,
                status=ProgressStatus.IN_PROGRESS,
                started_at=datetime.now(timezone.utc),
                deadline=deadline
            )
            
            self.db.add(progress)
            self.db.commit()
            self.db.refresh(progress)
            
            logger.info(f"Usuario {user_id} inició módulo {module_id}")
            return progress
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error iniciando módulo: {str(e)}")
            raise
    
    def complete_lesson(
        self,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
        time_spent: int = 0
    ) -> TrainingLessonProgress:
        """Marca una lección como completada"""
        # Buscar progreso existente
        progress = self.db.query(TrainingLessonProgress)\
            .filter(
                and_(
                    TrainingLessonProgress.user_id == user_id,
                    TrainingLessonProgress.lesson_id == lesson_id
                )
            ).first()
        
        if progress:
            if not progress.is_completed:
                progress.is_completed = True
                progress.completed_at = datetime.now(timezone.utc)
                progress.time_spent_minutes += time_spent
                self.db.commit()
        else:
            progress = TrainingLessonProgress(
                user_id=user_id,
                lesson_id=lesson_id,
                is_completed=True,
                completed_at=datetime.now(timezone.utc),
                time_spent_minutes=time_spent
            )
            self.db.add(progress)
            self.db.commit()
        
        # Actualizar progreso del módulo
        lesson = self.db.query(TrainingLesson).filter(TrainingLesson.id == lesson_id).first()
        if lesson:
            self._update_module_progress(user_id, lesson.module_id)
        
        # Otorgar puntos si gamificación está habilitada
        config = self.get_configuration()
        if config.gamification_enabled:
            self._add_points(user_id, config.points_per_lesson)
        
        return progress
    
    def _update_module_progress(self, user_id: uuid.UUID, module_id: uuid.UUID):
        """Actualiza el progreso general del módulo"""
        # Obtener todas las lecciones del módulo
        lessons = self.db.query(TrainingLesson)\
            .filter(TrainingLesson.module_id == module_id)\
            .all()
        
        if not lessons:
            return
        
        # Contar lecciones completadas
        completed = self.db.query(func.count(TrainingLessonProgress.id))\
            .join(TrainingLesson)\
            .filter(
                and_(
                    TrainingLessonProgress.user_id == user_id,
                    TrainingLesson.module_id == module_id,
                    TrainingLessonProgress.is_completed == True
                )
            ).scalar()
        
        # Calcular porcentaje
        percentage = int((completed / len(lessons)) * 100)
        
        # Actualizar progreso del módulo
        progress = self.get_user_module_progress(user_id, module_id)
        if progress:
            progress.progress_percentage = percentage
            progress.updated_at = datetime.now(timezone.utc)
            
            # Si llegó al 100%, marcar como completado
            if percentage == 100 and progress.status != ProgressStatus.COMPLETED:
                progress.status = ProgressStatus.COMPLETED
                progress.completed_at = datetime.now(timezone.utc)
                
                # Otorgar puntos por completar módulo
                config = self.get_configuration()
                if config.gamification_enabled:
                    self._add_points(user_id, config.points_per_module)
                
                # Verificar certificaciones
                self._check_certifications(user_id)
            
            self.db.commit()
    
    # ========================================================================
    # QUIZZES Y EVALUACIONES
    # ========================================================================
    
    def submit_quiz(
        self,
        user_id: uuid.UUID,
        quiz_id: uuid.UUID,
        answers: QuizAttemptSubmit
    ) -> TrainingQuizAttempt:
        """Envía respuestas de un quiz"""
        quiz = self.db.query(TrainingQuiz)\
            .options(joinedload(TrainingQuiz.questions))\
            .filter(TrainingQuiz.id == quiz_id)\
            .first()
        
        if not quiz:
            raise ValueError(f"Quiz {quiz_id} no encontrado")
        
        # Verificar intentos máximos
        attempts_count = self.db.query(func.count(TrainingQuizAttempt.id))\
            .filter(
                and_(
                    TrainingQuizAttempt.user_id == user_id,
                    TrainingQuizAttempt.quiz_id == quiz_id
                )
            ).scalar()
        
        if attempts_count >= quiz.max_attempts:
            raise ValueError(f"Has alcanzado el máximo de intentos ({quiz.max_attempts})")
        
        # Calcular score
        total_points = sum(q.points for q in quiz.questions)
        earned_points = 0
        answers_dict = {str(a.question_id): a.answer for a in answers.answers}
        
        for question in quiz.questions:
            user_answer = answers_dict.get(str(question.id), "")
            if user_answer.strip().lower() == question.correct_answer.strip().lower():
                earned_points += question.points
        
        score = Decimal((earned_points / total_points) * 100) if total_points > 0 else Decimal(0)
        passed = score >= quiz.passing_score
        
        # Crear intento
        try:
            attempt = TrainingQuizAttempt(
                user_id=user_id,
                quiz_id=quiz_id,
                score=score,
                answers=answers_dict,
                passed=passed,
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
            
            self.db.add(attempt)
            
            # Si aprobó y es quiz de lección, marcar lección completada
            if passed and quiz.lesson_id:
                self.complete_lesson(user_id, quiz.lesson_id)
            
            # Si aprobó y es examen final de módulo, actualizar progreso
            if passed and quiz.module_id:
                progress = self.get_user_module_progress(user_id, quiz.module_id)
                if progress:
                    progress.score = score
                    progress.attempts += 1
            
            self.db.commit()
            self.db.refresh(attempt)
            
            return attempt
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error enviando quiz: {str(e)}")
            raise
    
    # ========================================================================
    # CERTIFICACIONES
    # ========================================================================
    
    def _check_certifications(self, user_id: uuid.UUID):
        """Verifica y otorga certificaciones automáticamente"""
        # Verificar Nivel Bronce (Categoría A completa)
        cat_a_modules = self.db.query(TrainingModule)\
            .filter(TrainingModule.category == ModuleCategory.OBLIGATORY)\
            .all()
        
        if cat_a_modules:
            cat_a_completed = self.db.query(func.count(TrainingProgress.id))\
                .join(TrainingModule)\
                .filter(
                    and_(
                        TrainingProgress.user_id == user_id,
                        TrainingModule.category == ModuleCategory.OBLIGATORY,
                        TrainingProgress.status == ProgressStatus.COMPLETED
                    )
                ).scalar()
            
            if cat_a_completed == len(cat_a_modules):
                self._grant_certification(user_id, CertificationLevel.BRONZE)
        
        # Verificar Nivel Plata (Categoría B completa)
        cat_b_modules = self.db.query(TrainingModule)\
            .filter(TrainingModule.category == ModuleCategory.IMPORTANT)\
            .all()
        
        if cat_b_modules:
            cat_b_completed = self.db.query(func.count(TrainingProgress.id))\
                .join(TrainingModule)\
                .filter(
                    and_(
                        TrainingProgress.user_id == user_id,
                        TrainingModule.category == ModuleCategory.IMPORTANT,
                        TrainingProgress.status == ProgressStatus.COMPLETED
                    )
                ).scalar()
            
            if cat_b_completed == len(cat_b_modules):
                self._grant_certification(user_id, CertificationLevel.SILVER)
    
    def _grant_certification(
        self,
        user_id: uuid.UUID,
        level: CertificationLevel
    ) -> TrainingCertification:
        """Otorga una certificación al usuario"""
        # Verificar si ya tiene esta certificación
        existing = self.db.query(TrainingCertification)\
            .filter(
                and_(
                    TrainingCertification.user_id == user_id,
                    TrainingCertification.level == level
                )
            ).first()
        
        if existing:
            return existing
        
        # Generar número de certificado
        cert_number = f"{level.value.upper()}-{str(user_id)[:8]}-{datetime.now().year}"
        
        certification = TrainingCertification(
            user_id=user_id,
            level=level,
            certificate_number=cert_number,
            issued_at=datetime.now(timezone.utc)
        )
        
        self.db.add(certification)
        self.db.commit()
        
        logger.info(f"Certificación {level.value} otorgada a usuario {user_id}")
        return certification
    
    # ========================================================================
    # GAMIFICACIÓN
    # ========================================================================
    
    def _add_points(self, user_id: uuid.UUID, points: int):
        """Agrega puntos al usuario"""
        user_points = self.db.query(TrainingUserPoints)\
            .filter(TrainingUserPoints.user_id == user_id)\
            .first()
        
        if not user_points:
            user_points = TrainingUserPoints(
                user_id=user_id,
                total_points=points
            )
            self.db.add(user_points)
        else:
            user_points.total_points += points
        
        user_points.last_activity = datetime.now(timezone.utc)
        self.db.commit()
    
    def get_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Obtiene el leaderboard de usuarios"""
        results = self.db.query(
            TrainingUserPoints.user_id,
            TrainingUserPoints.total_points,
            func.count(TrainingProgress.id).label('modules_completed'),
            func.avg(TrainingProgress.score).label('avg_score')
        )\
        .outerjoin(TrainingProgress, TrainingUserPoints.user_id == TrainingProgress.user_id)\
        .group_by(TrainingUserPoints.user_id, TrainingUserPoints.total_points)\
        .order_by(desc(TrainingUserPoints.total_points))\
        .limit(limit)\
        .all()
        
        leaderboard = []
        for rank, result in enumerate(results, 1):
            user = self.db.query(User).filter(User.id == result.user_id).first()
            leaderboard.append({
                'rank': rank,
                'user_id': str(result.user_id),
                'user_name': user.email if user else 'Unknown',
                'total_points': result.total_points,
                'modules_completed': result.modules_completed,
                'average_score': float(result.avg_score) if result.avg_score else 0.0
            })
        
        return leaderboard
    
    # ========================================================================
    # ESTADÍSTICAS
    # ========================================================================
    
    def get_user_stats(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Obtiene estadísticas completas del usuario"""
        # Módulos totales
        total_modules = self.db.query(func.count(TrainingModule.id))\
            .filter(TrainingModule.is_active == True)\
            .scalar()
        
        # Módulos completados
        completed_modules = self.db.query(func.count(TrainingProgress.id))\
            .filter(
                and_(
                    TrainingProgress.user_id == user_id,
                    TrainingProgress.status == ProgressStatus.COMPLETED
                )
            ).scalar()
        
        # Módulos en progreso
        in_progress_modules = self.db.query(func.count(TrainingProgress.id))\
            .filter(
                and_(
                    TrainingProgress.user_id == user_id,
                    TrainingProgress.status == ProgressStatus.IN_PROGRESS
                )
            ).scalar()
        
        # Horas invertidas
        total_hours = self.db.query(func.sum(TrainingProgress.time_spent_minutes))\
            .filter(TrainingProgress.user_id == user_id)\
            .scalar() or 0
        total_hours = float(total_hours) / 60
        
        # Score promedio
        avg_score = self.db.query(func.avg(TrainingProgress.score))\
            .filter(
                and_(
                    TrainingProgress.user_id == user_id,
                    TrainingProgress.score.isnot(None)
                )
            ).scalar() or 0
        
        # Certificación actual
        latest_cert = self.db.query(TrainingCertification)\
            .filter(TrainingCertification.user_id == user_id)\
            .order_by(desc(TrainingCertification.issued_at))\
            .first()
        
        # Puntos y logros
        user_points = self.db.query(TrainingUserPoints)\
            .filter(TrainingUserPoints.user_id == user_id)\
            .first()
        
        achievements_count = self.db.query(func.count(TrainingUserAchievement.id))\
            .filter(TrainingUserAchievement.user_id == user_id)\
            .scalar()
        
        return {
            'total_modules': total_modules or 0,
            'completed_modules': completed_modules or 0,
            'in_progress_modules': in_progress_modules or 0,
            'total_hours_invested': round(total_hours, 2),
            'average_score': float(avg_score) if avg_score else 0.0,
            'completion_percentage': int((completed_modules / total_modules * 100)) if total_modules > 0 else 0,
            'current_level': latest_cert.level if latest_cert else None,
            'total_points': user_points.total_points if user_points else 0,
            'current_streak': user_points.current_streak if user_points else 0,
            'achievements_earned': achievements_count or 0
        }
    
    # ========================================================================
    # CONFIGURACIÓN
    # ========================================================================
    
    def get_configuration(self) -> TrainingConfiguration:
        """Obtiene configuración global"""
        config = self.db.query(TrainingConfiguration).first()
        
        if not config:
            # Crear configuración por defecto
            config = TrainingConfiguration()
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        
        return config
    
    def update_configuration(self, updates: Dict[str, Any]) -> TrainingConfiguration:
        """Actualiza configuración global"""
        config = self.get_configuration()
        
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        config.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(config)
        
        return config
    
    # ========================================================================
    # SISTEMA DE BLOQUEO
    # ========================================================================
    
    def check_user_access(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """Verifica si el usuario tiene acceso completo al sistema"""
        config = self.get_configuration()
        
        if not config.mandatory_mode_enabled:
            return {
                'has_access': True,
                'blocked': False,
                'reason': None,
                'pending_modules': []
            }
        
        # Verificar si completó Categoría A (obligatoria)
        cat_a_modules = self.db.query(TrainingModule)\
            .filter(
                and_(
                    TrainingModule.category == ModuleCategory.OBLIGATORY,
                    TrainingModule.is_active == True
                )
            ).all()
        
        if not cat_a_modules:
            return {'has_access': True, 'blocked': False, 'reason': None, 'pending_modules': []}
        
        completed_cat_a = self.db.query(func.count(TrainingProgress.id))\
            .join(TrainingModule)\
            .filter(
                and_(
                    TrainingProgress.user_id == user_id,
                    TrainingModule.category == ModuleCategory.OBLIGATORY,
                    TrainingProgress.status == ProgressStatus.COMPLETED
                )
            ).scalar()
        
        if completed_cat_a < len(cat_a_modules):
            pending = [m.id for m in cat_a_modules]
            # Remover los ya completados
            completed_ids = self.db.query(TrainingProgress.module_id)\
                .filter(
                    and_(
                        TrainingProgress.user_id == user_id,
                        TrainingProgress.status == ProgressStatus.COMPLETED
                    )
                ).all()
            completed_ids = [str(c[0]) for c in completed_ids]
            pending = [str(p) for p in pending if str(p) not in completed_ids]
            
            return {
                'has_access': False,
                'blocked': config.block_system_until_complete,
                'reason': 'Debe completar la capacitación obligatoria (Categoría A)',
                'pending_modules': pending,
                'progress_percentage': int((completed_cat_a / len(cat_a_modules)) * 100)
            }
        
        return {'has_access': True, 'blocked': False, 'reason': None, 'pending_modules': []}
