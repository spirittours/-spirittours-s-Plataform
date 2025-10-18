"""
API REST para AI Chatbot de Capacitación
Endpoints para conversaciones de práctica con personajes AI
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from backend.models.rbac_models import User
from backend.services.training_chatbot_service import TrainingChatbotService

router = APIRouter(prefix="/api/training/chatbot", tags=["Training Chatbot"])

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

def get_chatbot_service(db: Session = Depends(get_db)) -> TrainingChatbotService:
    """Dependency para obtener servicio de chatbot"""
    # TODO: Get OpenAI API key from environment
    import os
    openai_key = os.getenv('OPENAI_API_KEY')
    return TrainingChatbotService(db, openai_key)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class PersonaInfo(BaseModel):
    """Información de personaje disponible"""
    key: str
    name: str
    role: str
    description: str
    personality: List[str]

class ScenarioInfo(BaseModel):
    """Información de escenario disponible"""
    key: str
    title: str
    description: str
    objectives: List[str]
    difficulty: str
    duration_minutes: int

class StartConversationRequest(BaseModel):
    """Request para iniciar conversación"""
    persona_key: str
    scenario_key: str
    language: str = 'es'

class StartConversationResponse(BaseModel):
    """Response al iniciar conversación"""
    conversation_id: str
    persona: Dict[str, Any]
    scenario: Dict[str, Any]
    initial_message: str

class SendMessageRequest(BaseModel):
    """Request para enviar mensaje"""
    message: str

class MessageAnalysis(BaseModel):
    """Análisis de calidad del mensaje"""
    score: int
    feedback: List[str]
    good_points: List[str]
    improvement_points: List[str]

class SendMessageResponse(BaseModel):
    """Response al enviar mensaje"""
    ai_message: str
    analysis: MessageAnalysis
    conversation_length: int
    can_continue: bool

class ConversationFeedback(BaseModel):
    """Feedback completo de conversación"""
    overall_score: int
    strengths: List[str]
    areas_for_improvement: List[str]
    next_steps: List[str]
    objectives_completed: int

class EndConversationResponse(BaseModel):
    """Response al finalizar conversación"""
    conversation_id: str
    duration_seconds: float
    total_messages: int
    feedback: ConversationFeedback
    score: int
    strengths: List[str]
    areas_for_improvement: List[str]
    next_steps: List[str]

class ConversationMessage(BaseModel):
    """Mensaje en conversación"""
    role: str
    content: str
    timestamp: str

class ConversationHistory(BaseModel):
    """Historial completo de conversación"""
    id: str
    user_id: str
    persona_key: str
    scenario_key: str
    persona_name: str
    scenario_title: str
    started_at: datetime
    ended_at: Optional[datetime]
    messages: List[ConversationMessage]
    status: str

# ============================================================================
# DISCOVERY ENDPOINTS
# ============================================================================

@router.get("/personas", response_model=List[PersonaInfo])
async def get_available_personas(
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene lista de personajes disponibles para práctica
    
    Returns:
        Lista de personajes con sus características
    """
    personas = service.get_available_personas()
    return personas

@router.get("/scenarios", response_model=List[ScenarioInfo])
async def get_available_scenarios(
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene lista de escenarios de práctica disponibles
    
    Returns:
        Lista de escenarios con objetivos y dificultad
    """
    scenarios = service.get_available_scenarios()
    return scenarios

@router.get("/personas/{persona_key}")
async def get_persona_details(
    persona_key: str,
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene detalles completos de un personaje específico
    
    Args:
        persona_key: Clave del personaje (priest, pastor, etc.)
    
    Returns:
        Información detallada del personaje incluyendo preguntas comunes
    """
    from backend.services.training_chatbot_service import CHATBOT_PERSONAS
    
    if persona_key not in CHATBOT_PERSONAS:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    persona = CHATBOT_PERSONAS[persona_key]
    return {
        'key': persona_key,
        'name': persona['name'],
        'role': persona['role'],
        'description': persona['description'],
        'personality': persona['personality'],
        'common_questions': persona['common_questions']
    }

@router.get("/scenarios/{scenario_key}")
async def get_scenario_details(
    scenario_key: str,
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene detalles completos de un escenario específico
    
    Args:
        scenario_key: Clave del escenario
    
    Returns:
        Información detallada del escenario con objetivos de aprendizaje
    """
    from backend.services.training_chatbot_service import TRAINING_SCENARIOS
    
    if scenario_key not in TRAINING_SCENARIOS:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenario = TRAINING_SCENARIOS[scenario_key]
    return {
        'key': scenario_key,
        **scenario
    }

# ============================================================================
# CONVERSATION ENDPOINTS
# ============================================================================

@router.post("/conversations/start", response_model=StartConversationResponse)
async def start_conversation(
    request: StartConversationRequest,
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Inicia una nueva conversación de práctica
    
    Args:
        request: Configuración de la conversación (personaje y escenario)
    
    Returns:
        Información de la conversación iniciada con mensaje inicial del AI
    """
    try:
        result = service.start_conversation(
            user_id=current_user.id,
            persona_key=request.persona_key,
            scenario_key=request.scenario_key,
            language=request.language
        )
        return StartConversationResponse(**result)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting conversation: {str(e)}")

@router.post("/conversations/{conversation_id}/message", response_model=SendMessageResponse)
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Envía un mensaje en la conversación y recibe respuesta del AI
    
    Args:
        conversation_id: ID de la conversación activa
        request: Mensaje del usuario
    
    Returns:
        Respuesta del AI con análisis de calidad del mensaje
    """
    try:
        result = service.send_message(
            conversation_id=conversation_id,
            user_message=request.message
        )
        
        return SendMessageResponse(
            ai_message=result['ai_message'],
            analysis=MessageAnalysis(**result['analysis']),
            conversation_length=result['conversation_length'],
            can_continue=result['can_continue']
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@router.post("/conversations/{conversation_id}/end", response_model=EndConversationResponse)
async def end_conversation(
    conversation_id: str,
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Finaliza una conversación y obtiene feedback completo
    
    Args:
        conversation_id: ID de la conversación activa
    
    Returns:
        Resumen de la conversación con evaluación y recomendaciones
    """
    try:
        result = service.end_conversation(conversation_id=conversation_id)
        
        return EndConversationResponse(
            conversation_id=result['conversation_id'],
            duration_seconds=result['duration_seconds'],
            total_messages=result['total_messages'],
            feedback=ConversationFeedback(**result['feedback']),
            score=result['score'],
            strengths=result['strengths'],
            areas_for_improvement=result['areas_for_improvement'],
            next_steps=result['next_steps']
        )
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ending conversation: {str(e)}")

@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str,
    service: TrainingChatbotService = Depends(get_chatbot_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el historial completo de una conversación activa
    
    Args:
        conversation_id: ID de la conversación
    
    Returns:
        Historial completo de mensajes y metadata
    """
    try:
        history = service.get_conversation_history(conversation_id)
        return history
    
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving history: {str(e)}")

# ============================================================================
# STATISTICS ENDPOINTS
# ============================================================================

@router.get("/my-practice-stats")
async def get_my_practice_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de práctica del usuario actual
    
    Returns:
        Total de conversaciones, tiempo practicado, scores promedio, etc.
    """
    # TODO: Implement actual statistics from database
    # For now, return mock data
    
    return {
        'total_conversations': 15,
        'total_practice_hours': 3.5,
        'average_score': 78,
        'best_score': 92,
        'personas_practiced': {
            'priest': 5,
            'pastor': 4,
            'travel_leader': 3,
            'regular_client': 2,
            'difficult_client': 1
        },
        'scenarios_completed': {
            'first_contact': 5,
            'needs_assessment': 4,
            'package_presentation': 3,
            'objection_handling': 2,
            'closing_sale': 1
        },
        'recent_conversations': [
            {
                'date': '2024-10-15',
                'persona': 'Padre Miguel',
                'scenario': 'Primer Contacto',
                'score': 85,
                'duration_minutes': 12
            }
        ]
    }

@router.get("/admin/practice-stats")
async def get_all_users_practice_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de práctica de todos los usuarios
    
    Admin only: Ver estadísticas del sistema completo
    """
    # TODO: Check admin permission
    # TODO: Implement actual statistics from database
    
    return {
        'total_users_practicing': 45,
        'total_conversations': 678,
        'average_score_system': 72,
        'most_practiced_persona': 'priest',
        'most_practiced_scenario': 'first_contact',
        'top_performers': [
            {'user_name': 'Juan Pérez', 'average_score': 95, 'conversations': 25},
            {'user_name': 'María López', 'average_score': 89, 'conversations': 18}
        ]
    }

# ============================================================================
# TIPS AND GUIDANCE
# ============================================================================

@router.get("/tips/{scenario_key}")
async def get_scenario_tips(
    scenario_key: str,
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene tips y mejores prácticas para un escenario específico
    
    Args:
        scenario_key: Clave del escenario
    
    Returns:
        Tips, técnicas y mejores prácticas
    """
    tips_database = {
        'first_contact': {
            'tips': [
                'Saluda con entusiasmo y profesionalismo',
                'Presenta tu nombre y la empresa claramente',
                'Haz una pregunta abierta para conocer las necesidades',
                'Escucha más de lo que hablas en el primer contacto'
            ],
            'techniques': [
                'Técnica AIDA: Atención, Interés, Deseo, Acción',
                'Rapport: Crear conexión emocional rápidamente',
                'Preguntas abiertas: ¿Qué?, ¿Cómo?, ¿Por qué?'
            ],
            'examples': [
                '"¡Buen día! Soy [Nombre] de Spirit Tours. ¿En qué puedo ayudarle hoy?"',
                '"Entiendo que busca algo especial. Cuénteme más sobre sus planes..."'
            ]
        },
        'objection_handling': {
            'tips': [
                'No interrumpas la objeción, escucha completamente',
                'Valida la preocupación del cliente ("Entiendo su punto...")',
                'Proporciona evidencia o testimonios',
                'Ofrece alternativas cuando sea posible'
            ],
            'techniques': [
                'Método Feel-Felt-Found: "Entiendo cómo se siente, otros se sintieron igual, y encontraron que..."',
                'Reformular objeción en pregunta',
                'Proporcionar prueba social'
            ],
            'examples': [
                '"Entiendo su preocupación por el presupuesto. Muchos clientes inicialmente pensaron lo mismo, pero encontraron que el valor que ofrecemos..."'
            ]
        }
    }
    
    if scenario_key not in tips_database:
        return {
            'tips': ['Practica la escucha activa', 'Mantén profesionalismo', 'Sé honesto y transparente'],
            'techniques': [],
            'examples': []
        }
    
    return tips_database[scenario_key]

# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check para el servicio de chatbot"""
    return {
        "status": "healthy",
        "service": "Training Chatbot API",
        "version": "1.0.0"
    }
