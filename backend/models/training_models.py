"""
Sistema de Capacitación y Onboarding
Modelos completos para aprendizaje, certificación y seguimiento de empleados
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, Numeric, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid
import enum
from pydantic import BaseModel, Field
from .rbac_models import Base

# ============================================================================
# ENUMS
# ============================================================================

class ModuleCategory(enum.Enum):
    """Categorías de módulos de capacitación"""
    OBLIGATORY = "obligatory"    # Crítico - debe completar antes de trabajar
    IMPORTANT = "important"      # Alta prioridad - plazo 1-2 meses
    BASIC = "basic"             # Información de referencia - sin plazo

class ContentType(enum.Enum):
    """Tipos de contenido de lección"""
    VIDEO = "video"
    DOCUMENT = "document"        # PDF, Word, etc.
    ARTICLE = "article"          # Texto HTML
    QUIZ = "quiz"
    SIMULATION = "simulation"    # Role-play interactivo
    INTERACTIVE = "interactive"  # Contenido interactivo
    PRESENTATION = "presentation" # PPT, Slides
    EXTERNAL_LINK = "external_link"

class ProgressStatus(enum.Enum):
    """Estados de progreso"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class QuestionType(enum.Enum):
    """Tipos de preguntas de quiz"""
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    OPEN_ENDED = "open_ended"
    MATCHING = "matching"

class CertificationLevel(enum.Enum):
    """Niveles de certificación"""
    BRONZE = "bronze"      # Completó Categoría A
    SILVER = "silver"      # Completó Categoría B
    GOLD = "gold"          # Completó Categoría C (80%+)
    DIAMOND = "diamond"    # Experto - 6 meses + performance

class ReminderType(enum.Enum):
    """Tipos de recordatorios"""
    WELCOME = "welcome"
    PROGRESS_UPDATE = "progress_update"
    DEADLINE_WARNING = "deadline_warning"
    OVERDUE = "overdue"
    COMPLETION = "completion"
    CERTIFICATION = "certification"

# ============================================================================
# MODELOS PRINCIPALES
# ============================================================================

class TrainingModule(Base):
    """Módulo de capacitación"""
    __tablename__ = 'training_modules'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(SQLEnum(ModuleCategory), nullable=False, default=ModuleCategory.BASIC)
    estimated_hours = Column(Numeric(4, 2))  # Horas estimadas
    position = Column(Integer, default=0)     # Orden de módulos
    is_active = Column(Boolean, default=True)
    passing_score = Column(Integer, default=85)  # % mínimo para aprobar
    
    # Dependencias (pre-requisitos)
    prerequisites = Column(JSONB, default=[])  # Lista de IDs de módulos requeridos
    
    # Metadata
    icon = Column(String(50))  # Emoji o nombre de ícono
    color = Column(String(20))  # Color del módulo
    tags = Column(JSONB, default=[])
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    lessons = relationship("TrainingLesson", back_populates="module", cascade="all, delete-orphan")
    quizzes = relationship("TrainingQuiz", back_populates="module", cascade="all, delete-orphan")
    progress_records = relationship("TrainingProgress", back_populates="module", cascade="all, delete-orphan")

class TrainingLesson(Base):
    """Lección dentro de un módulo"""
    __tablename__ = 'training_lessons'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey('training_modules.id'), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Contenido
    content_type = Column(SQLEnum(ContentType), nullable=False)
    content_url = Column(Text)      # URL de video, PDF, etc.
    content_text = Column(Text)     # Contenido de texto/HTML
    content_metadata = Column(JSONB, default={})  # Metadata adicional
    
    estimated_minutes = Column(Integer)
    position = Column(Integer, default=0)
    is_required = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    module = relationship("TrainingModule", back_populates="lessons")
    progress_records = relationship("TrainingLessonProgress", back_populates="lesson", cascade="all, delete-orphan")

class TrainingProgress(Base):
    """Progreso de empleado por módulo"""
    __tablename__ = 'training_progress'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey('training_modules.id'), nullable=False)
    
    status = Column(SQLEnum(ProgressStatus), nullable=False, default=ProgressStatus.NOT_STARTED)
    progress_percentage = Column(Integer, default=0)
    __table_args__ = (
        CheckConstraint('progress_percentage >= 0 AND progress_percentage <= 100', name='check_progress_percentage'),
    )
    
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Score del examen final
    score = Column(Numeric(5, 2))
    attempts = Column(Integer, default=0)
    
    # Tiempo invertido
    time_spent_minutes = Column(Integer, default=0)
    
    # Deadlines
    deadline = Column(DateTime(timezone=True))  # Fecha límite para completar
    is_overdue = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    module = relationship("TrainingModule", back_populates="progress_records")

class TrainingLessonProgress(Base):
    """Progreso de empleado por lección"""
    __tablename__ = 'training_lesson_progress'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey('training_lessons.id'), nullable=False)
    
    is_completed = Column(Boolean, default=False)
    score = Column(Numeric(5, 2))  # Para quizzes dentro de lecciones
    time_spent_minutes = Column(Integer, default=0)
    
    # Tracking detallado
    last_position = Column(Integer, default=0)  # Para videos: último segundo visto
    metadata = Column(JSONB, default={})        # Metadata adicional
    
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    lesson = relationship("TrainingLesson", back_populates="progress_records")

class TrainingQuiz(Base):
    """Quiz o examen"""
    __tablename__ = 'training_quizzes'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey('training_lessons.id'))
    module_id = Column(UUID(as_uuid=True), ForeignKey('training_modules.id'))  # Para exámenes finales
    
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    passing_score = Column(Integer, default=80)  # % mínimo para aprobar
    max_attempts = Column(Integer, default=3)
    time_limit_minutes = Column(Integer)  # Tiempo límite (opcional)
    
    # Configuración
    shuffle_questions = Column(Boolean, default=True)
    show_correct_answers = Column(Boolean, default=True)  # Mostrar respuestas correctas al finalizar
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    lesson = relationship("TrainingLesson", foreign_keys=[lesson_id])
    module = relationship("TrainingModule", back_populates="quizzes")
    questions = relationship("TrainingQuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("TrainingQuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

class TrainingQuizQuestion(Base):
    """Pregunta de quiz"""
    __tablename__ = 'training_quiz_questions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey('training_quizzes.id'), nullable=False)
    
    question_text = Column(Text, nullable=False)
    question_type = Column(SQLEnum(QuestionType), nullable=False, default=QuestionType.MULTIPLE_CHOICE)
    
    # Opciones y respuesta correcta
    options = Column(JSONB, default=[])  # Lista de opciones para multiple choice
    correct_answer = Column(Text, nullable=False)  # Respuesta correcta
    explanation = Column(Text)  # Explicación de la respuesta
    
    points = Column(Integer, default=1)  # Puntos que vale la pregunta
    position = Column(Integer, default=0)
    
    # Metadata
    difficulty = Column(String(20))  # 'easy', 'medium', 'hard'
    tags = Column(JSONB, default=[])
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    quiz = relationship("TrainingQuiz", back_populates="questions")

class TrainingQuizAttempt(Base):
    """Intento de quiz por usuario"""
    __tablename__ = 'training_quiz_attempts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey('training_quizzes.id'), nullable=False)
    
    score = Column(Numeric(5, 2), nullable=False)
    answers = Column(JSONB, default={})  # Respuestas del usuario {question_id: answer}
    passed = Column(Boolean, nullable=False)
    
    time_taken_minutes = Column(Integer)
    
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    quiz = relationship("TrainingQuiz", back_populates="attempts")

class TrainingCertification(Base):
    """Certificaciones obtenidas"""
    __tablename__ = 'training_certifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    level = Column(SQLEnum(CertificationLevel), nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True))  # Para recertificación anual
    
    # URL del certificado PDF generado
    certificate_url = Column(Text)
    certificate_number = Column(String(50), unique=True)  # Número único de certificado
    
    # Metadata
    modules_completed = Column(JSONB, default=[])  # IDs de módulos completados
    total_hours = Column(Numeric(6, 2))
    average_score = Column(Numeric(5, 2))
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

class TrainingConfiguration(Base):
    """Configuración global del sistema de capacitación"""
    __tablename__ = 'training_configuration'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Configuración de modo obligatorio
    mandatory_mode_enabled = Column(Boolean, default=True)
    block_system_until_complete = Column(Boolean, default=True)
    
    # Plazos
    category_b_deadline_days = Column(Integer, default=30)  # Días para completar Categoría B
    
    # Recordatorios
    reminders_enabled = Column(Boolean, default=True)
    reminder_frequency_days = Column(Integer, default=3)
    
    # Scores mínimos
    minimum_passing_score = Column(Integer, default=85)
    
    # Gamificación
    gamification_enabled = Column(Boolean, default=True)
    points_per_lesson = Column(Integer, default=10)
    points_per_module = Column(Integer, default=100)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class TrainingReminderSent(Base):
    """Tracking de recordatorios enviados"""
    __tablename__ = 'training_reminders_sent'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    reminder_type = Column(SQLEnum(ReminderType), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey('training_modules.id'))
    
    subject = Column(String(200))
    message = Column(Text)
    
    sent_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

class TrainingAchievement(Base):
    """Logros y insignias (gamificación)"""
    __tablename__ = 'training_achievements'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    name = Column(String(100), nullable=False)
    description = Column(Text)
    icon = Column(String(50))  # Emoji o URL de imagen
    
    # Criterios
    criteria_type = Column(String(50))  # 'modules_completed', 'score_average', 'speed', etc.
    criteria_value = Column(Integer)
    
    points_reward = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user_achievements = relationship("TrainingUserAchievement", back_populates="achievement", cascade="all, delete-orphan")

class TrainingUserAchievement(Base):
    """Logros obtenidos por usuarios"""
    __tablename__ = 'training_user_achievements'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    achievement_id = Column(UUID(as_uuid=True), ForeignKey('training_achievements.id'), nullable=False)
    
    earned_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    achievement = relationship("TrainingAchievement", back_populates="user_achievements")

class TrainingUserPoints(Base):
    """Puntos acumulados por usuario (gamificación)"""
    __tablename__ = 'training_user_points'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, unique=True)
    
    total_points = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)  # Días consecutivos de actividad
    longest_streak = Column(Integer, default=0)
    
    last_activity = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

# ============================================================================
# PYDANTIC SCHEMAS - REQUEST/RESPONSE
# ============================================================================

class ModuleBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: ModuleCategory = ModuleCategory.BASIC
    estimated_hours: Optional[float] = None
    position: int = 0
    passing_score: int = 85
    prerequisites: List[str] = []
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: List[str] = []

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ModuleCategory] = None
    estimated_hours: Optional[float] = None
    position: Optional[int] = None
    passing_score: Optional[int] = None
    is_active: Optional[bool] = None
    prerequisites: Optional[List[str]] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None

class ModuleResponse(ModuleBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LessonBase(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType
    content_url: Optional[str] = None
    content_text: Optional[str] = None
    content_metadata: Dict[str, Any] = {}
    estimated_minutes: Optional[int] = None
    position: int = 0
    is_required: bool = True

class LessonCreate(LessonBase):
    module_id: uuid.UUID

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[ContentType] = None
    content_url: Optional[str] = None
    content_text: Optional[str] = None
    content_metadata: Optional[Dict[str, Any]] = None
    estimated_minutes: Optional[int] = None
    position: Optional[int] = None
    is_required: Optional[bool] = None

class LessonResponse(LessonBase):
    id: uuid.UUID
    module_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProgressResponse(BaseModel):
    module_id: uuid.UUID
    status: ProgressStatus
    progress_percentage: int
    score: Optional[float] = None
    attempts: int
    time_spent_minutes: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    is_overdue: bool
    
    class Config:
        from_attributes = True

class QuizQuestionCreate(BaseModel):
    question_text: str
    question_type: QuestionType
    options: List[str] = []
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 1
    position: int = 0
    difficulty: Optional[str] = None
    tags: List[str] = []

class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    lesson_id: Optional[uuid.UUID] = None
    module_id: Optional[uuid.UUID] = None
    passing_score: int = 80
    max_attempts: int = 3
    time_limit_minutes: Optional[int] = None
    shuffle_questions: bool = True
    show_correct_answers: bool = True
    questions: List[QuizQuestionCreate] = []

class QuizAnswerSubmit(BaseModel):
    question_id: uuid.UUID
    answer: str

class QuizAttemptSubmit(BaseModel):
    answers: List[QuizAnswerSubmit]

class QuizAttemptResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    score: float
    passed: bool
    time_taken_minutes: Optional[int] = None
    correct_answers: Optional[Dict[str, str]] = None  # Si show_correct_answers=True
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CertificationResponse(BaseModel):
    id: uuid.UUID
    level: CertificationLevel
    issued_at: datetime
    expires_at: Optional[datetime] = None
    certificate_url: Optional[str] = None
    certificate_number: str
    total_hours: Optional[float] = None
    average_score: Optional[float] = None
    
    class Config:
        from_attributes = True

class TrainingStatsResponse(BaseModel):
    total_modules: int
    completed_modules: int
    in_progress_modules: int
    total_hours_invested: float
    average_score: float
    completion_percentage: int
    current_level: Optional[CertificationLevel] = None
    total_points: int
    current_streak: int
    achievements_earned: int

class ConfigurationUpdate(BaseModel):
    mandatory_mode_enabled: Optional[bool] = None
    block_system_until_complete: Optional[bool] = None
    category_b_deadline_days: Optional[int] = None
    reminders_enabled: Optional[bool] = None
    reminder_frequency_days: Optional[int] = None
    minimum_passing_score: Optional[int] = None
    gamification_enabled: Optional[bool] = None
    points_per_lesson: Optional[int] = None
    points_per_module: Optional[int] = None

class AchievementResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    points_reward: int
    earned_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LeaderboardEntry(BaseModel):
    user_id: uuid.UUID
    user_name: str
    total_points: int
    modules_completed: int
    average_score: float
    rank: int
