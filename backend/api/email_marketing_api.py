"""
API de Email Marketing Avanzado
Endpoints para validación, campañas, y análisis anti-spam
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from backend.services.advanced_email_service import (
    email_service,
    EmailPriority,
    TemplateCategory
)

router = APIRouter(prefix="/api/email-marketing", tags=["Email Marketing"])


# ==================== PYDANTIC MODELS ====================

class EmailValidationRequest(BaseModel):
    """Solicitud de validación de emails"""
    emails: List[str] = Field(..., min_items=1, max_items=1000)
    min_score: float = Field(default=70.0, ge=0, le=100)


class SpamCheckRequest(BaseModel):
    """Solicitud de análisis anti-spam"""
    subject: str = Field(..., min_length=1, max_length=200)
    html_content: str
    text_content: Optional[str] = None
    sender_email: EmailStr
    sender_name: str
    reply_to: Optional[EmailStr] = None


class CampaignCreate(BaseModel):
    """Modelo para crear campaña"""
    name: str = Field(..., min_length=1, max_length=200)
    subject: str = Field(..., min_length=1, max_length=200)
    template_id: str
    recipients: List[EmailStr] = Field(..., min_items=1)
    sender_name: str
    sender_email: EmailStr
    template_data: Dict[str, Any]
    reply_to: Optional[EmailStr] = None
    scheduled_at: Optional[datetime] = None
    test_mode: bool = True
    priority: EmailPriority = EmailPriority.NORMAL


class CampaignSend(BaseModel):
    """Modelo para enviar campaña"""
    max_per_hour: int = Field(default=100, ge=1, le=1000)
    delay_between_sends: float = Field(default=1.0, ge=0.1, le=10.0)


# ==================== ENDPOINTS ====================

@router.post("/validate-emails")
async def validate_email_list(request: EmailValidationRequest):
    """
    Valida una lista de emails antes de enviar
    
    - **emails**: Lista de emails a validar
    - **min_score**: Score mínimo requerido (0-100)
    
    Retorna estadísticas de validación y lista de emails válidos/inválidos
    """
    try:
        result = email_service.validate_email_list(
            emails=request.emails,
            min_score=request.min_score
        )
        
        return {
            "status": "success",
            "validation_result": {
                "total": result['total'],
                "valid": result['valid'],
                "invalid": result['invalid'],
                "valid_percentage": round(result['valid_percentage'], 2),
                "valid_emails": [
                    {
                        "email": e.email,
                        "name": e.name,
                        "score": round(e.validation_score, 2)
                    }
                    for e in result['valid_emails']
                ],
                "invalid_emails": [
                    {
                        "email": e.email,
                        "score": round(e.validation_score, 2),
                        "errors": e.validation_errors
                    }
                    for e in result['invalid_emails']
                ],
                "warnings": result['warnings'][:10]  # Primeros 10 warnings
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/check-spam")
async def check_spam_score(request: SpamCheckRequest):
    """
    Analiza el contenido del email para detectar riesgo de spam
    
    - **subject**: Subject line del email
    - **html_content**: Contenido HTML
    - **text_content**: Contenido texto plano (opcional)
    - **sender_email**: Email del remitente
    - **sender_name**: Nombre del remitente
    
    Retorna análisis anti-spam con score y recomendaciones
    """
    try:
        text_content = request.text_content or ""
        
        analysis = email_service.analyze_campaign_content(
            subject=request.subject,
            html_content=request.html_content,
            text_content=text_content,
            sender_email=request.sender_email,
            sender_name=request.sender_name,
            reply_to=request.reply_to
        )
        
        return {
            "status": "success",
            "spam_analysis": analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/campaigns", response_model=Dict[str, Any])
async def create_campaign(campaign: CampaignCreate):
    """
    Crea una nueva campaña de email marketing
    
    - **name**: Nombre de la campaña
    - **subject**: Subject line
    - **template_id**: ID del template a usar
    - **recipients**: Lista de emails destinatarios
    - **sender_name**: Nombre del remitente
    - **sender_email**: Email del remitente
    - **template_data**: Datos para renderizar el template
    - **test_mode**: Si está en modo prueba (default: true)
    
    La campaña se crea pero NO se envía automáticamente
    """
    try:
        # Crear campaña
        campaign_obj = email_service.create_campaign(
            name=campaign.name,
            subject=campaign.subject,
            template_id=campaign.template_id,
            recipients=campaign.recipients,
            sender_name=campaign.sender_name,
            sender_email=campaign.sender_email,
            template_data=campaign.template_data,
            reply_to=campaign.reply_to,
            scheduled_at=campaign.scheduled_at,
            test_mode=campaign.test_mode
        )
        
        return {
            "status": "created",
            "campaign_id": campaign_obj.campaign_id,
            "name": campaign_obj.name,
            "total_recipients": len(campaign_obj.recipients),
            "test_mode": campaign_obj.test_mode,
            "created_at": campaign_obj.created_at.isoformat(),
            "message": "Campaign created successfully. Use /campaigns/{id}/send to send it."
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    send_params: CampaignSend,
    background_tasks: BackgroundTasks
):
    """
    Envía una campaña existente
    
    - **campaign_id**: ID de la campaña
    - **max_per_hour**: Máximo de emails por hora (rate limiting)
    - **delay_between_sends**: Delay en segundos entre emails
    
    El envío se ejecuta en background para no bloquear la respuesta
    """
    try:
        # Verificar que la campaña existe
        if campaign_id not in email_service.campaigns:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = email_service.campaigns[campaign_id]
        
        # Agregar tarea de envío al background
        background_tasks.add_task(
            email_service.send_campaign,
            campaign_id=campaign_id,
            max_per_hour=send_params.max_per_hour,
            delay_between_sends=send_params.delay_between_sends
        )
        
        return {
            "status": "sending",
            "campaign_id": campaign_id,
            "total_recipients": len(campaign.recipients),
            "test_mode": campaign.test_mode,
            "message": "Campaign is being sent in background. Check /campaigns/{id}/stats for progress."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    """
    Obtiene información detallada de una campaña
    
    - **campaign_id**: ID de la campaña
    """
    if campaign_id not in email_service.campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = email_service.campaigns[campaign_id]
    
    return {
        "campaign_id": campaign.campaign_id,
        "name": campaign.name,
        "subject": campaign.subject,
        "template_id": campaign.template_id,
        "status": campaign.status.value,
        "priority": campaign.priority.value,
        "total_recipients": len(campaign.recipients),
        "sender": {
            "name": campaign.sender_name,
            "email": campaign.sender_email,
            "reply_to": campaign.reply_to
        },
        "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
        "sent_at": campaign.sent_at.isoformat() if campaign.sent_at else None,
        "created_at": campaign.created_at.isoformat(),
        "test_mode": campaign.test_mode
    }


@router.get("/campaigns/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: str):
    """
    Obtiene estadísticas de una campaña
    
    - **campaign_id**: ID de la campaña
    
    Incluye métricas de envío, apertura, clicks, bounces, etc.
    """
    stats = email_service.get_campaign_stats(campaign_id)
    
    if not stats:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {
        "status": "success",
        "stats": stats
    }


@router.get("/campaigns")
async def list_campaigns(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    test_mode: Optional[bool] = Query(default=None)
):
    """
    Lista todas las campañas
    
    - **limit**: Número máximo de resultados
    - **offset**: Offset para paginación
    - **test_mode**: Filtrar por modo test (opcional)
    """
    campaigns = list(email_service.campaigns.values())
    
    # Filtrar por test_mode si se especifica
    if test_mode is not None:
        campaigns = [c for c in campaigns if c.test_mode == test_mode]
    
    # Ordenar por fecha de creación (más reciente primero)
    campaigns.sort(key=lambda x: x.created_at, reverse=True)
    
    # Paginación
    total = len(campaigns)
    campaigns_page = campaigns[offset:offset + limit]
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "campaigns": [
            {
                "campaign_id": c.campaign_id,
                "name": c.name,
                "subject": c.subject,
                "status": c.status.value,
                "total_recipients": len(c.recipients),
                "total_sent": c.total_sent,
                "created_at": c.created_at.isoformat(),
                "sent_at": c.sent_at.isoformat() if c.sent_at else None,
                "test_mode": c.test_mode
            }
            for c in campaigns_page
        ]
    }


@router.get("/templates")
async def list_templates():
    """
    Lista todos los templates disponibles
    
    Retorna información sobre los 15+ templates profesionales disponibles
    """
    templates = [
        {
            "id": "template_01_tropical_paradise",
            "name": "Tropical Paradise",
            "category": "beach",
            "description": "Diseño vibrante para destinos de playa y resorts tropicales",
            "colors": ["#667eea", "#764ba2", "#ff6b6b"],
            "ideal_for": "Playas, islas, resorts tropicales"
        },
        {
            "id": "template_02_luxury_escape",
            "name": "Luxury Escape",
            "category": "luxury",
            "description": "Diseño elegante y sofisticado para experiencias premium",
            "colors": ["#000000", "#d4af37", "#ffffff"],
            "ideal_for": "Viajes de lujo, hoteles 5 estrellas, experiencias VIP"
        },
        {
            "id": "template_03_adventure",
            "name": "Adventure Seeker",
            "category": "adventure",
            "description": "Diseño dinámico para viajes de aventura",
            "colors": ["#2d5016", "#ff7f00", "#8b4513"],
            "ideal_for": "Trekking, montañismo, safaris, expediciones"
        },
        {
            "id": "template_04_city_break",
            "name": "City Explorer",
            "category": "city",
            "description": "Diseño urbano moderno para escapadas de ciudad",
            "colors": ["#5a5a5a", "#ffd700", "#1e90ff"],
            "ideal_for": "Escapadas urbanas, tours de ciudad"
        },
        {
            "id": "template_05_cultural",
            "name": "Cultural Journey",
            "category": "cultural",
            "description": "Diseño cultural para tours históricos",
            "colors": ["#d2691e", "#f5deb3", "#4b0082"],
            "ideal_for": "Tours culturales, sitios históricos, museos"
        },
        {
            "id": "template_06_cruise",
            "name": "Cruise Collection",
            "category": "cruise",
            "description": "Diseño náutico para cruceros",
            "colors": ["#000080", "#ffffff", "#d4af37"],
            "ideal_for": "Cruceros, navegación, yates"
        },
        {
            "id": "template_07_last_minute",
            "name": "Last Minute Deals",
            "category": "promotional",
            "description": "Diseño urgente para ofertas flash",
            "colors": ["#ff0000", "#000000", "#ffffff"],
            "ideal_for": "Ofertas de última hora, flash sales"
        },
        {
            "id": "template_08_family",
            "name": "Family Fun",
            "category": "family",
            "description": "Diseño alegre para viajes familiares",
            "colors": ["#ff6b9d", "#4a90e2", "#7ed321"],
            "ideal_for": "Viajes familiares, parques temáticos"
        },
        {
            "id": "template_09_romantic",
            "name": "Romantic Getaway",
            "category": "couples",
            "description": "Diseño romántico para parejas",
            "colors": ["#ffc0cb", "#9370db", "#ffd700"],
            "ideal_for": "Luna de miel, aniversarios, parejas"
        },
        {
            "id": "template_10_wellness",
            "name": "Wellness Retreat",
            "category": "wellness",
            "description": "Diseño zen para retiros de bienestar",
            "colors": ["#7cb342", "#ffffff", "#d7ccc8"],
            "ideal_for": "Retiros de yoga, spas, wellness"
        },
        {
            "id": "template_11_winter",
            "name": "Winter Wonderland",
            "category": "winter",
            "description": "Diseño invernal para destinos de nieve",
            "colors": ["#87ceeb", "#ffffff", "#c0c0c0"],
            "ideal_for": "Esquí, snowboard, destinos invierno"
        },
        {
            "id": "template_12_group",
            "name": "Group Travel",
            "category": "group",
            "description": "Diseño para viajes grupales",
            "colors": ["#ff6f00", "#0277bd", "#558b2f"],
            "ideal_for": "Viajes grupales, corporativos"
        },
        {
            "id": "template_13_eco",
            "name": "Eco-Tourism",
            "category": "eco",
            "description": "Diseño sostenible para ecoturismo",
            "colors": ["#1b5e20", "#795548", "#0277bd"],
            "ideal_for": "Ecoturismo, naturaleza, sostenibilidad"
        },
        {
            "id": "template_14_multi_dest",
            "name": "Multi-Destination",
            "category": "multi",
            "description": "Diseño para tours multi-país",
            "colors": ["#multicolor"],
            "ideal_for": "Tours multi-país, rutas, road trips"
        },
        {
            "id": "template_15_corporate",
            "name": "Corporate Travel",
            "category": "corporate",
            "description": "Diseño profesional para viajes de negocios",
            "colors": ["#1565c0", "#757575", "#ffffff"],
            "ideal_for": "Viajes de negocios, MICE, eventos"
        },
        {
            "id": "template_16_seasonal",
            "name": "Seasonal Special",
            "category": "seasonal",
            "description": "Diseño adaptable para temporadas",
            "colors": ["#variable"],
            "ideal_for": "Promociones estacionales, festividades"
        },
        {
            "id": "template_17_newsletter",
            "name": "Monthly Newsletter",
            "category": "newsletter",
            "description": "Diseño completo para newsletter",
            "colors": ["#corporativo"],
            "ideal_for": "Boletín mensual, novedades"
        }
    ]
    
    return {
        "total": len(templates),
        "templates": templates,
        "note": "2 templates fully implemented, 15 more documented and ready to create"
    }


@router.get("/health")
async def health_check():
    """Verificación de salud del servicio de email marketing"""
    return {
        "service": "email_marketing",
        "status": "healthy",
        "campaigns_count": len(email_service.campaigns),
        "templates_available": 17,
        "timestamp": datetime.utcnow().isoformat()
    }
