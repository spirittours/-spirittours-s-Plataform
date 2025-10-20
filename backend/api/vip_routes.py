# VIP Tours API Routes
# Endpoints para el sistema de cotizaciones VIP automáticas

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Any
from datetime import date, datetime
from pydantic import BaseModel, Field
import asyncio

from ..database import get_db
from ..vip_tours.quotation_service import VIPQuotationService
from ..vip_tours.models import VIPItinerary, VIPQuote, QuoteStatus, ClientType
from ..auth.middleware import get_current_user

router = APIRouter(prefix="/api/vip", tags=["VIP Tours"])

# ============= MODELOS PYDANTIC =============

class ClientData(BaseModel):
    type: str = Field(..., description="Cliente type: B2C, B2B, B2B2C, INTERNAL")
    name: str = Field(..., min_length=2, max_length=255)
    email: Optional[str] = Field(None, regex="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
    phone: Optional[str] = None
    company: Optional[str] = None

class InstantQuoteRequest(BaseModel):
    itinerary_id: int
    client_data: ClientData
    travel_date: date
    group_size: int = Field(..., ge=1, le=50)
    hotel_category: str = Field("4star", description="Hotel category: 3star, 4star, 5star, boutique")
    special_requests: Optional[str] = None

class UponRequestQuoteRequest(BaseModel):
    itinerary_id: int
    client_data: ClientData
    travel_date: date
    group_size: int = Field(..., ge=1, le=50)
    requested_hotels: List[str]
    customizations: Optional[Dict[str, Any]] = None

class QuoteFilterParams(BaseModel):
    status: Optional[str] = None
    client_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

# ============= ENDPOINTS DE ITINERARIOS =============

@router.get("/itineraries")
async def list_vip_itineraries(
    countries: Optional[str] = Query(None, description="Países separados por comas"),
    min_days: Optional[int] = Query(None, ge=1),
    max_days: Optional[int] = Query(None, le=30),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todos los itinerarios VIP disponibles con filtros
    """
    try:
        query = db.query(VIPItinerary).filter(VIPItinerary.is_active == is_active)
        
        # Filtrar por países si se especifica
        if countries:
            country_list = [c.strip() for c in countries.split(',')]
            # Filtrar itinerarios que contengan al menos uno de los países
            filtered_itineraries = []
            all_itineraries = query.all()
            for itin in all_itineraries:
                if itin.countries and any(country in itin.countries for country in country_list):
                    filtered_itineraries.append(itin)
            itineraries = filtered_itineraries
        else:
            itineraries = query.all()
        
        # Filtrar por duración
        if min_days:
            itineraries = [i for i in itineraries if i.duration_days >= min_days]
        if max_days:
            itineraries = [i for i in itineraries if i.duration_days <= max_days]
        
        # Formatear respuesta
        itinerary_list = []
        for itin in itineraries:
            itinerary_list.append({
                "id": itin.id,
                "name": itin.name,
                "description": itin.description,
                "countries": itin.countries,
                "duration_days": itin.duration_days,
                "hotel_categories": itin.hotel_categories,
                "group_size": {
                    "min": itin.min_group_size,
                    "max": itin.max_group_size
                },
                "base_prices": {
                    "single": float(itin.base_price_single) if itin.base_price_single else None,
                    "double": float(itin.base_price_double) if itin.base_price_double else None,
                    "triple": float(itin.base_price_triple) if itin.base_price_triple else None
                },
                "popularity_score": itin.popularity_score
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "itineraries": itinerary_list,
                    "total": len(itinerary_list)
                },
                "message": f"Found {len(itinerary_list)} itineraries"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing itineraries: {str(e)}")

@router.get("/itineraries/{itinerary_id}")
async def get_itinerary_details(
    itinerary_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene los detalles completos de un itinerario VIP incluyendo programa diario
    """
    try:
        itinerary = db.query(VIPItinerary).filter_by(id=itinerary_id).first()
        
        if not itinerary:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        
        # Obtener programa diario
        daily_programs = []
        for program in itinerary.daily_programs:
            daily_programs.append({
                "day": program.day_number,
                "title": program.title,
                "description": program.description,
                "destinations": program.destinations,
                "meals": program.included_meals,
                "transportation": program.transportation_type,
                "guide_required": program.guide_required,
                "activities": program.activities,
                "schedule": {
                    "start": program.start_time,
                    "end": program.end_time
                },
                "distance_km": program.total_distance_km
            })
        
        itinerary_data = {
            "id": itinerary.id,
            "name": itinerary.name,
            "description": itinerary.description,
            "countries": itinerary.countries,
            "duration_days": itinerary.duration_days,
            "daily_programs": daily_programs,
            "included_services": itinerary.included_services,
            "optional_services": itinerary.optional_services,
            "hotel_categories": itinerary.hotel_categories,
            "group_size": {
                "min": itinerary.min_group_size,
                "max": itinerary.max_group_size
            },
            "base_prices": {
                "single": float(itinerary.base_price_single) if itinerary.base_price_single else None,
                "double": float(itinerary.base_price_double) if itinerary.base_price_double else None,
                "triple": float(itinerary.base_price_triple) if itinerary.base_price_triple else None
            }
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": itinerary_data,
                "message": "Itinerary details retrieved successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving itinerary: {str(e)}")

# ============= ENDPOINTS DE COTIZACIONES =============

@router.post("/quotes/instant")
async def create_instant_quote(
    request: InstantQuoteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una cotización instantánea con disponibilidad inmediata.
    Los precios se calculan automáticamente y se validan con IA.
    """
    try:
        service = VIPQuotationService(db)
        
        # Crear cotización instantánea
        quote_result = await service.create_instant_quote(
            itinerary_id=request.itinerary_id,
            client_data=request.client_data.dict(),
            travel_date=request.travel_date,
            group_size=request.group_size,
            hotel_category=request.hotel_category,
            special_requests=request.special_requests
        )
        
        return JSONResponse(
            status_code=201,
            content={
                "status": "success",
                "data": quote_result,
                "message": "Instant quote created successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating instant quote: {str(e)}")

@router.post("/quotes/upon-request")
async def create_upon_request_quote(
    request: UponRequestQuoteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una cotización que requiere confirmación de proveedores.
    El sistema enviará solicitudes automáticamente y monitoreará las respuestas.
    """
    try:
        service = VIPQuotationService(db)
        
        # Crear cotización con solicitud a proveedores
        quote_result = await service.create_upon_request_quote(
            itinerary_id=request.itinerary_id,
            client_data=request.client_data.dict(),
            travel_date=request.travel_date,
            group_size=request.group_size,
            requested_hotels=request.requested_hotels,
            customizations=request.customizations
        )
        
        return JSONResponse(
            status_code=202,
            content={
                "status": "success",
                "data": quote_result,
                "message": "Quote request submitted. You will be notified when ready."
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating quote request: {str(e)}")

@router.get("/quotes/{quote_id}")
async def get_quote_details(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene los detalles completos de una cotización incluyendo validación IA
    """
    try:
        quote = db.query(VIPQuote).filter_by(id=quote_id).first()
        
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Obtener desgloses de precio
        price_breakdown = []
        for calc in quote.price_calculations:
            price_breakdown.append({
                "component": calc.component_type,
                "description": calc.component_description,
                "quantity": calc.quantity,
                "unit_price": float(calc.unit_price) if calc.unit_price else 0,
                "subtotal": float(calc.subtotal) if calc.subtotal else 0,
                "final_price": float(calc.final_price) if calc.final_price else 0,
                "is_optional": calc.is_optional,
                "is_included": calc.is_included
            })
        
        # Obtener estado de servicios
        service_requests = []
        for req in quote.service_requests:
            service_requests.append({
                "id": req.id,
                "service_type": req.service_type,
                "service_date": req.service_date.isoformat(),
                "availability": req.availability.value,
                "is_confirmed": req.is_confirmed,
                "quoted_price": float(req.quoted_price) if req.quoted_price else None,
                "confirmed_price": float(req.confirmed_price) if req.confirmed_price else None
            })
        
        quote_data = {
            "id": quote.id,
            "quote_number": quote.quote_number,
            "status": quote.status.value,
            "client": {
                "type": quote.client_type.value,
                "name": quote.client_name,
                "email": quote.client_email,
                "phone": quote.client_phone,
                "company": quote.client_company
            },
            "tour": {
                "itinerary_id": quote.itinerary_id,
                "itinerary_name": quote.itinerary.name if quote.itinerary else None,
                "type": quote.tour_type.value if quote.tour_type else None,
                "travel_date": quote.travel_date.isoformat(),
                "end_date": quote.end_date.isoformat(),
                "group_size": quote.group_size
            },
            "pricing": {
                "hotel_cost": float(quote.total_hotel_cost) if quote.total_hotel_cost else 0,
                "transport_cost": float(quote.total_transport_cost) if quote.total_transport_cost else 0,
                "guide_cost": float(quote.total_guide_cost) if quote.total_guide_cost else 0,
                "entrance_fees": float(quote.total_entrance_fees) if quote.total_entrance_fees else 0,
                "meals_cost": float(quote.total_meals_cost) if quote.total_meals_cost else 0,
                "extras_cost": float(quote.total_extras_cost) if quote.total_extras_cost else 0,
                "subtotal": float(quote.subtotal) if quote.subtotal else 0,
                "markup_percentage": quote.markup_percentage,
                "discount_percentage": quote.discount_percentage,
                "total_price": float(quote.total_price) if quote.total_price else 0,
                "price_per_person": float(quote.price_per_person) if quote.price_per_person else 0,
                "commission": {
                    "percentage": quote.agent_commission_percentage,
                    "amount": float(quote.agent_commission_amount) if quote.agent_commission_amount else 0
                } if quote.agent_commission_percentage else None
            },
            "price_breakdown": price_breakdown,
            "services": {
                "all_confirmed": quote.all_services_confirmed,
                "availability": quote.services_availability,
                "requests": service_requests
            },
            "validation": {
                "ai_status": quote.ai_validation_status,
                "ai_suggestions": quote.ai_suggestions,
                "ai_errors": quote.ai_error_checks,
                "requires_manual_review": quote.requires_manual_review,
                "manual_notes": quote.manual_review_notes
            },
            "validity": {
                "valid_until": quote.valid_until.isoformat() if quote.valid_until else None,
                "confirmation_deadline": quote.confirmation_deadline.isoformat() if quote.confirmation_deadline else None
            },
            "timestamps": {
                "created_at": quote.created_at.isoformat(),
                "sent_at": quote.sent_at.isoformat() if quote.sent_at else None,
                "confirmed_at": quote.confirmed_at.isoformat() if quote.confirmed_at else None
            }
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": quote_data,
                "message": "Quote details retrieved successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving quote: {str(e)}")

@router.get("/quotes")
async def list_quotes(
    status: Optional[str] = Query(None),
    client_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista cotizaciones con filtros avanzados
    """
    try:
        query = db.query(VIPQuote)
        
        # Aplicar filtros
        if status:
            query = query.filter(VIPQuote.status == QuoteStatus[status.upper()])
        
        if client_type:
            query = query.filter(VIPQuote.client_type == ClientType[client_type.upper()])
        
        if start_date:
            query = query.filter(VIPQuote.travel_date >= start_date)
        
        if end_date:
            query = query.filter(VIPQuote.travel_date <= end_date)
        
        if min_price:
            query = query.filter(VIPQuote.total_price >= min_price)
        
        if max_price:
            query = query.filter(VIPQuote.total_price <= max_price)
        
        # Obtener total y aplicar paginación
        total = query.count()
        quotes = query.order_by(VIPQuote.created_at.desc()).offset(offset).limit(limit).all()
        
        # Formatear respuesta
        quote_list = []
        for quote in quotes:
            quote_list.append({
                "id": quote.id,
                "quote_number": quote.quote_number,
                "status": quote.status.value,
                "client_name": quote.client_name,
                "client_type": quote.client_type.value,
                "travel_date": quote.travel_date.isoformat(),
                "group_size": quote.group_size,
                "total_price": float(quote.total_price) if quote.total_price else 0,
                "all_services_confirmed": quote.all_services_confirmed,
                "created_at": quote.created_at.isoformat()
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "quotes": quote_list,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                },
                "message": f"Found {len(quote_list)} quotes"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing quotes: {str(e)}")

@router.post("/quotes/{quote_id}/confirm")
async def confirm_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Confirma una cotización y la convierte en reserva
    """
    try:
        quote = db.query(VIPQuote).filter_by(id=quote_id).first()
        
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        if quote.status == QuoteStatus.CONFIRMED:
            raise HTTPException(status_code=400, detail="Quote already confirmed")
        
        if quote.status == QuoteStatus.EXPIRED:
            raise HTTPException(status_code=400, detail="Quote has expired")
        
        # Verificar que todos los servicios estén confirmados
        if not quote.all_services_confirmed:
            raise HTTPException(
                status_code=400, 
                detail="Cannot confirm quote: not all services are confirmed"
            )
        
        # Actualizar estado
        quote.status = QuoteStatus.CONFIRMED
        quote.confirmed_at = datetime.utcnow()
        
        # TODO: Crear reserva en el sistema principal
        # booking = create_booking_from_quote(quote)
        
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "quote_id": quote_id,
                    "quote_number": quote.quote_number,
                    "status": quote.status.value,
                    "confirmed_at": quote.confirmed_at.isoformat()
                },
                "message": "Quote confirmed successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error confirming quote: {str(e)}")

@router.post("/quotes/{quote_id}/cancel")
async def cancel_quote(
    quote_id: int,
    reason: str = Body(..., min_length=5),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela una cotización
    """
    try:
        quote = db.query(VIPQuote).filter_by(id=quote_id).first()
        
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        if quote.status in [QuoteStatus.CONFIRMED, QuoteStatus.CANCELLED]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot cancel quote with status: {quote.status.value}"
            )
        
        # Actualizar estado
        quote.status = QuoteStatus.CANCELLED
        quote.manual_review_notes = f"Cancelled: {reason}"
        
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "quote_id": quote_id,
                    "quote_number": quote.quote_number,
                    "status": quote.status.value
                },
                "message": "Quote cancelled successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error cancelling quote: {str(e)}")

# ============= ENDPOINTS DE VALIDACIÓN IA =============

@router.post("/quotes/{quote_id}/validate")
async def validate_quote_with_ai(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Ejecuta validación con IA para detectar errores y sugerir mejoras
    """
    try:
        quote = db.query(VIPQuote).filter_by(id=quote_id).first()
        
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Ejecutar validación IA
        from ..ai.quote_validator import AIQuoteValidator
        validator = AIQuoteValidator()
        
        validation_results = await validator.validate_quote(quote)
        
        # Actualizar quote con resultados
        quote.ai_validation_status = validation_results['status']
        quote.ai_suggestions = validation_results.get('suggestions')
        quote.ai_error_checks = validation_results.get('errors')
        
        # Determinar si requiere revisión manual
        if validation_results['confidence_score'] < 0.7 or validation_results['status'] == 'invalid':
            quote.requires_manual_review = True
        
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": validation_results,
                "message": "AI validation completed"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating quote: {str(e)}")