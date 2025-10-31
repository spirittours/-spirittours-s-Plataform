"""
FastAPI Router for Group Quotation System
RESTful API endpoints with authentication and authorization
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from ..database.connection import get_db
from ..services.group_quotation_service import quotation_service
from ..models.quotation import (
    GroupQuotation, QuotationResponse, HotelProvider,
    QuotationStatus, ResponseStatus
)
from ..auth.dependencies import get_current_user, require_role
from ..schemas.quotation_schemas import (
    QuotationCreateRequest,
    QuotationUpdateRequest,
    QuotationResponseRequest,
    HotelResponseRequest,
    DepositPaymentRequest,
    DeadlineExtensionRequest,
    PriceVisibilityRequest,
    HotelCreateRequest,
    QuotationFilterParams
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/quotations", tags=["Group Quotations"])


# ==================== COTIZACIONES ====================

@router.post("/", response_model=Dict[str, Any])
async def create_quotation(
    request: QuotationCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Crear nueva cotización grupal
    
    Permisos: Cliente B2B/B2B2C, Agente, Admin
    """
    try:
        # Validar permisos
        if current_user.role not in ['client', 'agent', 'manager', 'admin']:
            raise HTTPException(status_code=403, detail="No autorizado para crear cotizaciones")
        
        # Crear cotización
        quotation = await quotation_service.create_group_quotation(
            db=db,
            quotation_data=request.dict(),
            user_id=current_user.id,
            company_id=current_user.company_id
        )
        
        return {
            "status": "success",
            "message": "Cotización creada exitosamente",
            "data": quotation.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando cotización: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=Dict[str, Any])
async def list_quotations(
    status: Optional[QuotationStatus] = Query(None),
    destination: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Listar cotizaciones con filtros
    
    Permisos: Todos los usuarios autenticados (filtrado por empresa)
    """
    try:
        query = db.query(GroupQuotation)
        
        # Filtrar por empresa (excepto admin)
        if current_user.role != 'admin':
            query = query.filter(GroupQuotation.company_id == current_user.company_id)
        
        # Aplicar filtros
        if status:
            query = query.filter(GroupQuotation.status == status)
        if destination:
            query = query.filter(GroupQuotation.destination.ilike(f"%{destination}%"))
        if date_from:
            query = query.filter(GroupQuotation.check_in_date >= date_from)
        if date_to:
            query = query.filter(GroupQuotation.check_out_date <= date_to)
        
        # Paginación
        total = query.count()
        quotations = query.offset(skip).limit(limit).all()
        
        return {
            "status": "success",
            "data": {
                "quotations": [q.to_dict() for q in quotations],
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error listando cotizaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{quotation_id}", response_model=Dict[str, Any])
async def get_quotation(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener detalle de una cotización específica
    
    Permisos: Propietario de la cotización o Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if current_user.role != 'admin' and quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado para ver esta cotización")
        
        # Incluir respuestas si existen
        responses = []
        for response in quotation.responses:
            # Aplicar privacidad según configuración
            hide_prices = False
            if quotation.privacy_settings.get('hide_competitor_prices', True):
                # Solo mostrar precios propios o si es admin
                if current_user.role != 'admin' and response.hotel_id != current_user.hotel_id:
                    hide_prices = True
            
            responses.append(response.to_dict(hide_prices=hide_prices))
        
        result = quotation.to_dict()
        result['responses'] = responses
        
        return {
            "status": "success",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo cotización: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{quotation_id}", response_model=Dict[str, Any])
async def update_quotation(
    quotation_id: str,
    request: QuotationUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Actualizar cotización existente
    
    Permisos: Propietario o Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if current_user.role != 'admin' and quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado para modificar esta cotización")
        
        # Actualizar campos permitidos
        update_data = request.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(quotation, field):
                setattr(quotation, field, value)
        
        quotation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(quotation)
        
        return {
            "status": "success",
            "message": "Cotización actualizada exitosamente",
            "data": quotation.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando cotización: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{quotation_id}/publish", response_model=Dict[str, Any])
async def publish_quotation(
    quotation_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Publicar cotización y enviar a hoteles
    
    Permisos: Propietario o Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if current_user.role != 'admin' and quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Verificar estado
        if quotation.status != QuotationStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Solo se pueden publicar cotizaciones en borrador")
        
        # Publicar
        quotation.status = QuotationStatus.PUBLISHED
        quotation.published_at = datetime.utcnow()
        db.commit()
        
        # Enviar invitaciones en background
        background_tasks.add_task(
            quotation_service._send_invitations_to_hotels,
            quotation
        )
        
        return {
            "status": "success",
            "message": "Cotización publicada y enviada a hoteles",
            "data": quotation.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publicando cotización: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== RESPUESTAS DE HOTELES ====================

@router.post("/{quotation_id}/responses", response_model=Dict[str, Any])
async def submit_hotel_response(
    quotation_id: str,
    request: HotelResponseRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Enviar o actualizar respuesta de hotel
    
    Permisos: Hotel invitado
    """
    try:
        # Verificar que el usuario representa a un hotel
        if not current_user.hotel_id:
            raise HTTPException(status_code=403, detail="Solo hoteles pueden enviar respuestas")
        
        # Procesar respuesta
        response = await quotation_service.submit_hotel_response(
            db=db,
            quotation_id=quotation_id,
            hotel_id=current_user.hotel_id,
            response_data=request.dict()
        )
        
        return {
            "status": "success",
            "message": "Respuesta enviada exitosamente",
            "data": response.to_dict(),
            "updates_remaining": response.max_price_updates - response.price_update_attempts
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando respuesta: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{quotation_id}/responses", response_model=Dict[str, Any])
async def get_quotation_responses(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener respuestas de una cotización
    
    Permisos: Propietario de cotización, Hotel participante (con restricciones), Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos básicos
        is_owner = quotation.company_id == current_user.company_id
        is_admin = current_user.role == 'admin'
        is_participant = current_user.hotel_id in quotation.invited_hotels if current_user.hotel_id else False
        
        if not (is_owner or is_admin or is_participant):
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Obtener respuestas
        responses = db.query(QuotationResponse).filter_by(quotation_id=quotation_id).all()
        
        # Aplicar privacidad
        result = []
        for response in responses:
            # Determinar si debe ocultar precios
            hide_prices = False
            
            if is_participant and not is_admin:
                # Si es hotel participante, aplicar reglas de privacidad
                if response.hotel_id != current_user.hotel_id:
                    # Es un competidor
                    if not response.can_see_competitor_prices:
                        hide_prices = True
            
            result.append(response.to_dict(hide_prices=hide_prices))
        
        return {
            "status": "success",
            "data": {
                "quotation_id": quotation_id,
                "responses": result,
                "total": len(result)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo respuestas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GESTIÓN DE DEPÓSITOS ====================

@router.post("/{quotation_id}/deposit", response_model=Dict[str, Any])
async def process_deposit(
    quotation_id: str,
    request: DepositPaymentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Procesar pago de depósito
    
    Permisos: Propietario de la cotización
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Procesar depósito
        result = await quotation_service.process_deposit_payment(
            db=db,
            quotation_id=quotation_id,
            payment_data=request.dict()
        )
        
        return {
            "status": "success",
            "message": result.get('message'),
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error procesando depósito: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EXTENSIONES DE DEADLINE ====================

@router.post("/{quotation_id}/extend-deadline", response_model=Dict[str, Any])
async def extend_deadline(
    quotation_id: str,
    request: DeadlineExtensionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Solicitar extensión de deadline
    
    Permisos: Propietario de la cotización o Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if current_user.role != 'admin' and quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Extender deadline
        updated_quotation = await quotation_service.extend_deadline(
            db=db,
            quotation_id=quotation_id,
            extension_days=request.extension_days,
            reason=request.reason
        )
        
        return {
            "status": "success",
            "message": f"Deadline extendido por {request.extension_days} días",
            "data": {
                "new_deadline": updated_quotation.deadline.isoformat(),
                "extensions_used": updated_quotation.deadline_extensions_used,
                "extensions_remaining": updated_quotation.max_extensions_allowed - updated_quotation.deadline_extensions_used
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extendiendo deadline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== VISIBILIDAD DE PRECIOS (ADMIN) ====================

@router.put("/{quotation_id}/responses/{hotel_id}/visibility", response_model=Dict[str, Any])
async def toggle_price_visibility(
    quotation_id: str,
    hotel_id: str,
    request: PriceVisibilityRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(['admin']))
):
    """
    Cambiar visibilidad de precios para un hotel (SOLO ADMIN)
    
    Permisos: Solo Admin
    """
    try:
        response = await quotation_service.toggle_price_visibility(
            db=db,
            quotation_id=quotation_id,
            hotel_id=hotel_id,
            allow_visibility=request.allow_visibility,
            admin_override=True
        )
        
        return {
            "status": "success",
            "message": f"Visibilidad de precios {'activada' if request.allow_visibility else 'desactivada'} para hotel {hotel_id}",
            "data": {
                "hotel_id": hotel_id,
                "can_see_competitor_prices": response.can_see_competitor_prices
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cambiando visibilidad: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SELECCIÓN DE GANADOR ====================

@router.post("/{quotation_id}/select-winner", response_model=Dict[str, Any])
async def select_winner(
    quotation_id: str,
    response_id: str,
    selection_mode: str = Query('manual', regex='^(manual|automatic)$'),
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Seleccionar respuesta ganadora
    
    Permisos: Propietario de la cotización o Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if current_user.role != 'admin' and quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Seleccionar ganador
        updated_quotation = await quotation_service.select_winning_response(
            db=db,
            quotation_id=quotation_id,
            response_id=response_id,
            selection_mode=selection_mode
        )
        
        return {
            "status": "success",
            "message": "Respuesta ganadora seleccionada",
            "data": {
                "quotation_id": quotation_id,
                "winning_response_id": response_id,
                "selection_mode": selection_mode,
                "status": updated_quotation.status.value
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error seleccionando ganador: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== HOTELES PERSONALIZADOS ====================

@router.post("/hotels/custom", response_model=Dict[str, Any])
async def add_custom_hotel(
    request: HotelCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(['admin', 'manager']))
):
    """
    Agregar hotel personalizado no existente en DB
    
    Permisos: Admin, Manager
    """
    try:
        hotel = await quotation_service.add_custom_hotel(
            db=db,
            hotel_data=request.dict()
        )
        
        return {
            "status": "success",
            "message": "Hotel personalizado agregado exitosamente",
            "data": hotel.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error agregando hotel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BÚSQUEDA DE HOTELES ====================

@router.get("/hotels/search", response_model=Dict[str, Any])
async def search_hotels(
    query: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Buscar hoteles disponibles para invitar
    
    Permisos: Usuarios autenticados
    """
    try:
        query_builder = db.query(HotelProvider).filter(HotelProvider.is_active == True)
        
        # Aplicar filtros
        if query:
            query_builder = query_builder.filter(
                HotelProvider.name.ilike(f"%{query}%")
            )
        if city:
            query_builder = query_builder.filter(HotelProvider.city.ilike(f"%{city}%"))
        if country:
            query_builder = query_builder.filter(HotelProvider.country.ilike(f"%{country}%"))
        if category:
            query_builder = query_builder.filter(HotelProvider.category == category)
        if min_rating:
            query_builder = query_builder.filter(HotelProvider.rating >= min_rating)
        
        # Paginación
        total = query_builder.count()
        hotels = query_builder.offset(skip).limit(limit).all()
        
        return {
            "status": "success",
            "data": {
                "hotels": [h.to_dict() for h in hotels],
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error buscando hoteles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ESTADÍSTICAS ====================

@router.get("/{quotation_id}/stats", response_model=Dict[str, Any])
async def get_quotation_stats(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtener estadísticas de una cotización
    
    Permisos: Propietario o Admin
    """
    try:
        quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
        
        if not quotation:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        
        # Verificar permisos
        if current_user.role != 'admin' and quotation.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="No autorizado")
        
        # Calcular estadísticas
        responses = db.query(QuotationResponse).filter_by(quotation_id=quotation_id).all()
        
        stats = {
            "total_invited": len(quotation.invited_hotels) if quotation.invited_hotels else 0,
            "total_responses": len(responses),
            "response_rate": (len(responses) / len(quotation.invited_hotels) * 100) if quotation.invited_hotels else 0,
            "average_price": sum([float(r.final_price) for r in responses]) / len(responses) if responses else 0,
            "min_price": min([float(r.final_price) for r in responses]) if responses else 0,
            "max_price": max([float(r.final_price) for r in responses]) if responses else 0,
            "deadline": quotation.deadline.isoformat() if quotation.deadline else None,
            "time_remaining": (quotation.deadline - datetime.utcnow()).days if quotation.deadline else None,
            "status": quotation.status.value if quotation.status else None
        }
        
        return {
            "status": "success",
            "data": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))