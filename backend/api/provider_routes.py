# Provider Management API Routes
# Endpoints para el sistema de gestión de proveedores

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Optional, Any
from datetime import date, datetime
from pydantic import BaseModel, Field

from database import get_db
from ..provider_management.services import ProviderManagementService
from ..provider_management.models import Provider, ProviderType, BookingStatus
from auth.middleware import get_current_user

router = APIRouter(prefix="/api/providers", tags=["Provider Management"])

# ============= MODELOS PYDANTIC =============

class ProviderCalendarRequest(BaseModel):
    provider_id: int
    start_date: date
    end_date: date
    include_details: bool = True

class GuideCalendarRequest(BaseModel):
    guide_id: int
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2024, le=2030)

class ProviderReportRequest(BaseModel):
    provider_id: int
    start_date: date
    end_date: date
    report_type: str = "custom"
    detailed_breakdown: bool = True

class BookingConfirmationRequest(BaseModel):
    booking_id: int
    auto_confirm: bool = False

class CancellationRequest(BaseModel):
    booking_id: int
    cancellation_reason: Optional[str] = None

class GuideAvailabilityCheck(BaseModel):
    guide_id: int
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None

# ============= ENDPOINTS DE CALENDARIO =============

@router.get("/calendar")
async def get_provider_calendar(
    provider_id: int = Query(..., description="ID del proveedor"),
    start_date: date = Query(..., description="Fecha de inicio"),
    end_date: date = Query(..., description="Fecha de fin"),
    include_details: bool = Query(True, description="Incluir detalles completos"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el calendario de un proveedor con todos los grupos confirmados
    y detalles de conductores/vehículos asignados
    """
    try:
        service = ProviderManagementService(db)
        calendar_data = service.get_provider_calendar(
            provider_id=provider_id,
            start_date=start_date,
            end_date=end_date,
            include_details=include_details
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": calendar_data,
                "message": "Calendar retrieved successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving calendar: {str(e)}")

@router.get("/guides/{guide_id}/calendar")
async def get_guide_calendar(
    guide_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2024, le=2030),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el calendario único de un guía turístico,
    previniendo duplicados y mostrando disponibilidad
    """
    try:
        service = ProviderManagementService(db)
        calendar_data = service.get_guide_calendar(
            guide_id=guide_id,
            month=month,
            year=year
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": calendar_data,
                "message": "Guide calendar retrieved successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving guide calendar: {str(e)}")

@router.post("/guides/check-availability")
async def check_guide_availability(
    request: GuideAvailabilityCheck,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Verifica la disponibilidad de un guía en una fecha específica
    """
    try:
        service = ProviderManagementService(db)
        
        start_time = datetime.strptime(request.start_time, "%H:%M") if request.start_time else None
        end_time = datetime.strptime(request.end_time, "%H:%M") if request.end_time else None
        
        is_available = service.check_guide_availability(
            guide_id=request.guide_id,
            date=request.date,
            start_time=start_time,
            end_time=end_time
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "guide_id": request.guide_id,
                    "date": request.date.isoformat(),
                    "is_available": is_available
                },
                "message": "Availability checked successfully"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking availability: {str(e)}")

# ============= ENDPOINTS DE REPORTES =============

@router.post("/reports/generate")
async def generate_provider_report(
    request: ProviderReportRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un reporte completo para un proveedor con métricas detalladas
    por vehículo, conductor, destinos, etc.
    """
    try:
        service = ProviderManagementService(db)
        report = service.generate_provider_report(
            provider_id=request.provider_id,
            start_date=request.start_date,
            end_date=request.end_date,
            report_type=request.report_type,
            detailed_breakdown=request.detailed_breakdown
        )
        
        # Formatear el reporte para la respuesta
        report_data = {
            "id": report.id,
            "provider_id": report.provider_id,
            "period": {
                "start": report.start_date.isoformat(),
                "end": report.end_date.isoformat(),
                "type": report.report_type
            },
            "metrics": {
                "total_bookings": report.total_bookings,
                "completed_bookings": report.completed_bookings,
                "cancelled_bookings": report.cancelled_bookings,
                "total_revenue": float(report.total_revenue) if report.total_revenue else 0,
                "total_commission": float(report.total_commission) if report.total_commission else 0,
                "average_group_size": report.average_group_size,
                "average_booking_value": float(report.average_booking_value) if report.average_booking_value else 0,
                "occupancy_rate": report.occupancy_rate,
                "confirmation_rate": report.confirmation_rate,
                "cancellation_rate": report.cancellation_rate
            },
            "detailed_breakdown": {
                "by_vehicle": report.metrics_by_vehicle,
                "by_driver": report.metrics_by_driver,
                "by_guide": report.metrics_by_guide,
                "by_destination": report.metrics_by_destination
            } if request.detailed_breakdown else None,
            "insights": {
                "peak_days": report.peak_days,
                "top_destinations": report.top_destinations
            },
            "generated_at": report.generated_at.isoformat()
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": report_data,
                "message": "Report generated successfully"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@router.get("/reports/{provider_id}/history")
async def get_provider_report_history(
    provider_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el historial de reportes generados para un proveedor
    """
    try:
        from ..provider_management.models import ProviderReport
        
        reports = db.query(ProviderReport).filter(
            ProviderReport.provider_id == provider_id
        ).order_by(ProviderReport.generated_at.desc()).limit(limit).all()
        
        report_list = []
        for report in reports:
            report_list.append({
                "id": report.id,
                "report_type": report.report_type,
                "period": {
                    "start": report.start_date.isoformat(),
                    "end": report.end_date.isoformat()
                },
                "total_bookings": report.total_bookings,
                "total_revenue": float(report.total_revenue) if report.total_revenue else 0,
                "generated_at": report.generated_at.isoformat()
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": report_list,
                "message": f"Found {len(report_list)} reports"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving report history: {str(e)}")

# ============= ENDPOINTS DE CONFIRMACIONES =============

@router.post("/bookings/confirm")
async def confirm_booking(
    request: BookingConfirmationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Procesa la confirmación de una reserva, con opción de confirmación automática
    """
    try:
        service = ProviderManagementService(db)
        
        # Proceso asíncrono de confirmación
        import asyncio
        confirmation_status = await service.process_booking_confirmation(
            booking_id=request.booking_id,
            auto_confirm=request.auto_confirm
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "booking_id": request.booking_id,
                    "confirmation_status": confirmation_status.value
                },
                "message": "Booking confirmation processed"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error confirming booking: {str(e)}")

@router.post("/bookings/cancel")
async def cancel_booking(
    request: CancellationRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela una reserva aplicando las políticas de cancelación del proveedor
    """
    try:
        service = ProviderManagementService(db)
        
        cancellation_result = service.apply_cancellation_policy(
            booking_id=request.booking_id,
            cancellation_date=datetime.utcnow()
        )
        
        # Si se permite la cancelación y hay razón, guardarla
        if cancellation_result['allowed'] and request.cancellation_reason:
            from ..provider_management.models import ProviderBooking
            booking = db.query(ProviderBooking).filter_by(id=request.booking_id).first()
            if booking:
                booking.cancellation_reason = request.cancellation_reason
                db.commit()
        
        return JSONResponse(
            status_code=200 if cancellation_result['allowed'] else 400,
            content={
                "status": "success" if cancellation_result['allowed'] else "error",
                "data": cancellation_result,
                "message": "Cancellation processed" if cancellation_result['allowed'] else cancellation_result.get('reason', 'Cancellation not allowed')
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelling booking: {str(e)}")

# ============= ENDPOINTS DE GESTIÓN DE PROVEEDORES =============

@router.get("/list")
async def list_providers(
    provider_type: Optional[str] = Query(None, description="Tipo de proveedor"),
    is_active: bool = Query(True, description="Solo proveedores activos"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Lista todos los proveedores con filtros opcionales
    """
    try:
        query = db.query(Provider)
        
        if provider_type:
            query = query.filter(Provider.provider_type == ProviderType[provider_type.upper()])
        
        query = query.filter(Provider.is_active == is_active)
        
        total = query.count()
        providers = query.offset(offset).limit(limit).all()
        
        provider_list = []
        for provider in providers:
            provider_list.append({
                "id": provider.id,
                "company_name": provider.company_name,
                "provider_type": provider.provider_type.value,
                "email": provider.email,
                "phone": provider.phone,
                "city": provider.city,
                "country": provider.country,
                "is_active": provider.is_active,
                "auto_confirm_enabled": provider.auto_confirm_enabled,
                "commission_percentage": provider.commission_percentage
            })
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "providers": provider_list,
                    "total": total,
                    "limit": limit,
                    "offset": offset
                },
                "message": f"Found {len(provider_list)} providers"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing providers: {str(e)}")

@router.get("/{provider_id}")
async def get_provider_details(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene los detalles completos de un proveedor
    """
    try:
        provider = db.query(Provider).filter_by(id=provider_id).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Obtener información adicional según el tipo de proveedor
        additional_info = {}
        
        if provider.provider_type == ProviderType.TRANSPORT:
            from ..provider_management.models import Vehicle, Driver
            vehicles = db.query(Vehicle).filter_by(provider_id=provider_id).all()
            drivers = db.query(Driver).filter_by(provider_id=provider_id).all()
            
            additional_info["vehicles"] = [
                {
                    "id": v.id,
                    "type": v.vehicle_type.value,
                    "brand": v.brand,
                    "model": v.model,
                    "license_plate": v.license_plate,
                    "capacity": v.capacity,
                    "is_available": v.is_available
                }
                for v in vehicles
            ]
            
            additional_info["drivers"] = [
                {
                    "id": d.id,
                    "name": f"{d.first_name} {d.last_name}",
                    "phone": d.phone,
                    "languages": d.languages,
                    "is_available": d.is_available
                }
                for d in drivers
            ]
        
        elif provider.provider_type in [ProviderType.TOUR_GUIDE, ProviderType.GUIDE_COMPANY]:
            from ..provider_management.models import TourGuide
            guides = db.query(TourGuide).filter_by(provider_id=provider_id).all()
            
            additional_info["guides"] = [
                {
                    "id": g.id,
                    "name": f"{g.first_name} {g.last_name}",
                    "languages": g.languages,
                    "specializations": g.specializations,
                    "destinations": g.destinations,
                    "rating": g.rating,
                    "is_available": g.is_available
                }
                for g in guides
            ]
        
        provider_data = {
            "id": provider.id,
            "company_name": provider.company_name,
            "provider_type": provider.provider_type.value,
            "contact": {
                "email": provider.email,
                "phone": provider.phone,
                "address": provider.address,
                "city": provider.city,
                "country": provider.country
            },
            "configuration": {
                "auto_confirm_enabled": provider.auto_confirm_enabled,
                "confirmation_timeout_hours": provider.confirmation_timeout_hours,
                "max_pending_bookings": provider.max_pending_bookings,
                "cancellation_enabled": provider.cancellation_enabled,
                "cancellation_policy": provider.cancellation_policy
            },
            "financial": {
                "tax_id": provider.tax_id,
                "commission_percentage": provider.commission_percentage,
                "payment_terms": provider.payment_terms
            },
            "status": {
                "is_active": provider.is_active,
                "created_at": provider.created_at.isoformat(),
                "updated_at": provider.updated_at.isoformat()
            },
            **additional_info
        }
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": provider_data,
                "message": "Provider details retrieved successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving provider details: {str(e)}")

@router.put("/{provider_id}/configuration")
async def update_provider_configuration(
    provider_id: int,
    config: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza la configuración de un proveedor (confirmaciones, cancelaciones, etc.)
    """
    try:
        provider = db.query(Provider).filter_by(id=provider_id).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        
        # Actualizar campos permitidos
        allowed_fields = [
            'auto_confirm_enabled', 'confirmation_timeout_hours',
            'max_pending_bookings', 'cancellation_enabled',
            'cancellation_policy', 'commission_percentage'
        ]
        
        for field in allowed_fields:
            if field in config:
                setattr(provider, field, config[field])
        
        provider.updated_at = datetime.utcnow()
        db.commit()
        
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "data": {
                    "provider_id": provider_id,
                    "updated_fields": list(config.keys())
                },
                "message": "Provider configuration updated successfully"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating configuration: {str(e)}")