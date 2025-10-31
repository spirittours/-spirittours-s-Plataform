#!/usr/bin/env python3
"""
Operations API for Reservation Control and Group Management
APIs para Control de Reservas y Gestión de Grupos
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import uuid
from decimal import Decimal

# Import models and schemas
from ..models.operations_models import (
    Provider, TourGroup, ProviderReservation, GroupClosureItem,
    ValidationLog, OperationalAlert, ReservationAttachment,
    GroupParticipant, ProviderContract,
    ServiceType, ReservationStatus, PaymentStatus, OperationalStatus,
    ClosureStatus, ValidationStatus, AlertType, AlertSeverity,
    ProviderCreate, ProviderResponse, ReservationCreate, ReservationResponse,
    GroupCreate, GroupResponse, ValidationRequest, ValidationResponse,
    AlertCreate, AlertResponse, ClosureChecklistResponse
)
from ..models.rbac_models import User, PermissionChecker
from ..database import get_db
from ..auth import get_current_user
from ..services.ai_validation_service import AIValidationService
from ..services.notification_service import NotificationService

router = APIRouter(prefix="/api/operations", tags=["Operations"])

# Initialize services
ai_validation = AIValidationService()
notification_service = NotificationService()

# ============================
# PROVIDER ENDPOINTS
# ============================

@router.post("/providers", response_model=ProviderResponse)
async def create_provider(
    provider: ProviderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new provider"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.manage_providers"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if provider exists
    existing = db.query(Provider).filter(
        Provider.tax_id == provider.tax_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Provider with this tax ID already exists")
    
    # Create provider
    new_provider = Provider(**provider.dict())
    db.add(new_provider)
    db.commit()
    db.refresh(new_provider)
    
    return new_provider

@router.get("/providers", response_model=List[ProviderResponse])
async def list_providers(
    provider_type: Optional[ServiceType] = None,
    active: Optional[bool] = True,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List providers with filters"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_providers"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = db.query(Provider)
    
    # Apply filters
    if provider_type:
        query = query.filter(Provider.provider_type == provider_type)
    
    if active is not None:
        query = query.filter(Provider.active == active)
    
    if search:
        query = query.filter(
            or_(
                Provider.name.ilike(f"%{search}%"),
                Provider.legal_name.ilike(f"%{search}%"),
                Provider.tax_id.ilike(f"%{search}%")
            )
        )
    
    # Execute query
    providers = query.offset(offset).limit(limit).all()
    return providers

# ============================
# GROUP ENDPOINTS
# ============================

@router.post("/groups", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new tour group"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.create_group"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if code exists
    existing = db.query(TourGroup).filter(
        TourGroup.code == group.code
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Group with this code already exists")
    
    # Create group
    new_group = TourGroup(
        **group.dict(),
        created_by=current_user.id,
        operational_status=OperationalStatus.PLANNING,
        closure_status=ClosureStatus.OPEN
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    return new_group

@router.get("/groups", response_model=List[GroupResponse])
async def list_groups(
    status: Optional[OperationalStatus] = None,
    closure_status: Optional[ClosureStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List groups with filters"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_groups"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = db.query(TourGroup)
    
    # Apply filters
    if status:
        query = query.filter(TourGroup.operational_status == status)
    
    if closure_status:
        query = query.filter(TourGroup.closure_status == closure_status)
    
    if start_date:
        query = query.filter(TourGroup.start_date >= start_date)
    
    if end_date:
        query = query.filter(TourGroup.end_date <= end_date)
    
    if search:
        query = query.filter(
            or_(
                TourGroup.code.ilike(f"%{search}%"),
                TourGroup.name.ilike(f"%{search}%"),
                TourGroup.client_name.ilike(f"%{search}%")
            )
        )
    
    # Execute query
    groups = query.offset(offset).limit(limit).all()
    return groups

@router.get("/groups/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get group details"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_groups"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    group = db.query(TourGroup).filter(TourGroup.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return group

# ============================
# RESERVATION ENDPOINTS
# ============================

@router.post("/reservations", response_model=ReservationResponse)
async def create_reservation(
    reservation: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new reservation"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.create_reservation"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Validate provider and group exist
    provider = db.query(Provider).filter(Provider.id == reservation.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    group = db.query(TourGroup).filter(TourGroup.id == reservation.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Create reservation
    new_reservation = ProviderReservation(
        **reservation.dict(),
        agent_id=current_user.id,
        agent_name=f"{current_user.first_name} {current_user.last_name}",
        status=ReservationStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
        validation_status=ValidationStatus.PENDING,
        created_by=current_user.id
    )
    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)
    
    # Create initial closure checklist item
    closure_item = GroupClosureItem(
        group_id=group.id,
        reservation_id=new_reservation.id,
        item_type="reservation",
        item_name=f"{provider.name} - {reservation.service_type.value}",
        service_type=reservation.service_type,
        required=True,
        completed=False
    )
    db.add(closure_item)
    db.commit()
    
    return new_reservation

@router.get("/reservations", response_model=List[ReservationResponse])
async def list_reservations(
    group_id: Optional[uuid.UUID] = None,
    provider_id: Optional[uuid.UUID] = None,
    service_type: Optional[ServiceType] = None,
    status: Optional[ReservationStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    pending_validation: Optional[bool] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List reservations with filters"""
    # Check permissions
    query = db.query(ProviderReservation)
    
    # Apply permission-based filters
    if not PermissionChecker.check_permission(current_user, "operations.view_all_reservations"):
        if PermissionChecker.check_permission(current_user, "operations.view_own_reservations"):
            query = query.filter(ProviderReservation.agent_id == current_user.id)
        else:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Apply filters
    if group_id:
        query = query.filter(ProviderReservation.group_id == group_id)
    
    if provider_id:
        query = query.filter(ProviderReservation.provider_id == provider_id)
    
    if service_type:
        query = query.filter(ProviderReservation.service_type == service_type)
    
    if status:
        query = query.filter(ProviderReservation.status == status)
    
    if payment_status:
        query = query.filter(ProviderReservation.payment_status == payment_status)
    
    if start_date:
        query = query.filter(ProviderReservation.service_date_start >= start_date)
    
    if end_date:
        query = query.filter(ProviderReservation.service_date_end <= end_date)
    
    if pending_validation:
        query = query.filter(
            ProviderReservation.validation_status == ValidationStatus.PENDING
        )
    
    if search:
        query = query.filter(
            or_(
                ProviderReservation.confirmation_number.ilike(f"%{search}%"),
                ProviderReservation.notes.ilike(f"%{search}%")
            )
        )
    
    # Execute query
    reservations = query.offset(offset).limit(limit).all()
    return reservations

@router.put("/reservations/{reservation_id}/confirm")
async def confirm_reservation(
    reservation_id: uuid.UUID,
    confirmation_number: str = Body(...),
    confirmed_by_name: Optional[str] = Body(None),
    confirmed_by_email: Optional[str] = Body(None),
    notes: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirm a reservation"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.edit_reservation"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    reservation = db.query(ProviderReservation).filter(
        ProviderReservation.id == reservation_id
    ).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Update reservation
    reservation.confirmation_number = confirmation_number
    reservation.confirmation_date = datetime.utcnow()
    reservation.confirmed_by_name = confirmed_by_name
    reservation.confirmed_by_email = confirmed_by_email
    reservation.status = ReservationStatus.CONFIRMED
    
    if notes:
        reservation.notes = (reservation.notes or "") + f"\n{notes}"
    
    reservation.updated_by = current_user.id
    db.commit()
    
    return {"message": "Reservation confirmed successfully"}

# ============================
# VALIDATION ENDPOINTS
# ============================

@router.post("/validations", response_model=ValidationResponse)
async def create_validation(
    validation: ValidationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a validation record"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.validate_reservation"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get reservation
    reservation = db.query(ProviderReservation).filter(
        ProviderReservation.id == validation.reservation_id
    ).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Perform validation using AI service
    ai_result = await ai_validation.validate_data(
        validation.validation_type,
        validation.expected_values,
        validation.actual_values
    )
    
    # Create validation log
    validation_log = ValidationLog(
        reservation_id=reservation.id,
        group_id=reservation.group_id,
        validation_type=validation.validation_type,
        validation_method="ai_assisted",
        status=ai_result["status"],
        confidence_score=ai_result.get("confidence", 0.0),
        expected_values=validation.expected_values,
        actual_values=validation.actual_values,
        discrepancies=ai_result.get("discrepancies"),
        anomalies=ai_result.get("anomalies"),
        ai_analysis=ai_result,
        ai_recommendations=ai_result.get("recommendations"),
        validated_by=current_user.id
    )
    
    db.add(validation_log)
    
    # Update reservation validation status
    if ai_result["status"] == ValidationStatus.PASSED:
        reservation.validation_status = ValidationStatus.PASSED
    elif ai_result["status"] == ValidationStatus.FAILED:
        reservation.validation_status = ValidationStatus.FAILED
        
        # Create alert for failed validation
        alert = OperationalAlert(
            reservation_id=reservation.id,
            group_id=reservation.group_id,
            alert_type=AlertType.VALIDATION_FAILED,
            severity=AlertSeverity.HIGH,
            title=f"Validation Failed: {validation.validation_type.value}",
            message=f"Validation failed for reservation {reservation.confirmation_number}",
            action_required="Review validation results and take corrective action",
            assigned_to=[current_user.id]
        )
        db.add(alert)
    
    db.commit()
    db.refresh(validation_log)
    
    return validation_log

@router.post("/validations/auto-validate/{reservation_id}")
async def auto_validate_reservation(
    reservation_id: uuid.UUID,
    rooming_file: Optional[UploadFile] = File(None),
    invoice_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Automatically validate a reservation using AI"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.validate_reservation"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    reservation = db.query(ProviderReservation).filter(
        ProviderReservation.id == reservation_id
    ).first()
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    results = []
    
    # Validate rooming list if provided
    if rooming_file:
        rooming_result = await ai_validation.validate_rooming_list(
            reservation,
            rooming_file
        )
        results.append({
            "type": "rooming_list",
            "result": rooming_result
        })
    
    # Validate invoice if provided
    if invoice_file:
        invoice_result = await ai_validation.validate_invoice(
            reservation,
            invoice_file
        )
        results.append({
            "type": "invoice",
            "result": invoice_result
        })
    
    # Update reservation status based on results
    all_passed = all(r["result"]["valid"] for r in results)
    
    if all_passed:
        reservation.validation_status = ValidationStatus.PASSED
    else:
        reservation.validation_status = ValidationStatus.WARNING
    
    db.commit()
    
    return {
        "reservation_id": reservation_id,
        "validations": results,
        "overall_status": "passed" if all_passed else "warning"
    }

# ============================
# CLOSURE ENDPOINTS
# ============================

@router.get("/groups/{group_id}/closure-checklist", response_model=ClosureChecklistResponse)
async def get_closure_checklist(
    group_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get closure checklist for a group"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_groups"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    group = db.query(TourGroup).filter(TourGroup.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get all closure items
    items = db.query(GroupClosureItem).filter(
        GroupClosureItem.group_id == group_id
    ).all()
    
    # Calculate statistics
    total_items = len(items)
    completed_items = len([i for i in items if i.completed])
    progress = int((completed_items / total_items * 100) if total_items > 0 else 0)
    
    # Get pending items
    pending = [
        {
            "id": str(i.id),
            "name": i.item_name,
            "type": i.item_type,
            "required": i.required
        }
        for i in items if not i.completed
    ]
    
    # Get issues
    issues = []
    for item in items:
        if item.validation_issues:
            issues.append({
                "item_id": str(item.id),
                "item_name": item.item_name,
                "issues": item.validation_issues
            })
    
    # Check if can close
    required_items = [i for i in items if i.required]
    required_completed = all(i.completed for i in required_items)
    
    return ClosureChecklistResponse(
        group_id=group_id,
        total_items=total_items,
        completed_items=completed_items,
        progress_percentage=progress,
        pending_items=pending,
        issues=issues,
        can_close=required_completed and len(issues) == 0
    )

@router.post("/groups/{group_id}/close")
async def close_group(
    group_id: uuid.UUID,
    force: bool = Query(False, description="Force close even with pending items"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Close a group"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.approve_closure"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    group = db.query(TourGroup).filter(TourGroup.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if can close
    if not force:
        checklist = await get_closure_checklist(group_id, current_user, db)
        if not checklist.can_close:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot close group. {len(checklist.pending_items)} pending items, {len(checklist.issues)} issues"
            )
    
    # Update group status
    group.closure_status = ClosureStatus.CLOSED
    group.closure_date = datetime.utcnow()
    group.closed_by = current_user.id
    group.operational_status = OperationalStatus.COMPLETED
    
    db.commit()
    
    # Send notifications
    await notification_service.send_notification(
        recipients=[current_user.email],
        subject=f"Group {group.code} Closed",
        message=f"Group {group.name} has been successfully closed.",
        notification_type="group_closure"
    )
    
    return {"message": f"Group {group.code} closed successfully"}

# ============================
# ALERT ENDPOINTS
# ============================

@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    severity: Optional[AlertSeverity] = None,
    alert_type: Optional[AlertType] = None,
    acknowledged: Optional[bool] = None,
    resolved: Optional[bool] = None,
    assigned_to_me: bool = False,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List operational alerts"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_alerts"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = db.query(OperationalAlert)
    
    # Apply filters
    if severity:
        query = query.filter(OperationalAlert.severity == severity)
    
    if alert_type:
        query = query.filter(OperationalAlert.alert_type == alert_type)
    
    if acknowledged is not None:
        query = query.filter(OperationalAlert.acknowledged == acknowledged)
    
    if resolved is not None:
        query = query.filter(OperationalAlert.resolved == resolved)
    
    if assigned_to_me:
        query = query.filter(
            OperationalAlert.assigned_to.contains([str(current_user.id)])
        )
    
    # Order by severity and creation date
    query = query.order_by(
        OperationalAlert.severity.desc(),
        OperationalAlert.created_at.desc()
    )
    
    # Execute query
    alerts = query.offset(offset).limit(limit).all()
    return alerts

@router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge an alert"""
    alert = db.query(OperationalAlert).filter(
        OperationalAlert.id == alert_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Alert acknowledged"}

@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: uuid.UUID,
    resolution_notes: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve an alert"""
    alert = db.query(OperationalAlert).filter(
        OperationalAlert.id == alert_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.resolved = True
    alert.resolved_by = current_user.id
    alert.resolved_at = datetime.utcnow()
    alert.resolution_notes = resolution_notes
    
    db.commit()
    
    return {"message": "Alert resolved"}

# ============================
# DASHBOARD ENDPOINTS
# ============================

@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics for operations"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_dashboard"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Calculate metrics
    active_groups = db.query(TourGroup).filter(
        TourGroup.operational_status == OperationalStatus.ACTIVE
    ).count()
    
    pending_reservations = db.query(ProviderReservation).filter(
        ProviderReservation.status == ReservationStatus.PENDING
    ).count()
    
    upcoming_services = db.query(ProviderReservation).filter(
        ProviderReservation.service_date_start >= datetime.utcnow(),
        ProviderReservation.service_date_start <= datetime.utcnow() + timedelta(days=7),
        ProviderReservation.status == ReservationStatus.CONFIRMED
    ).count()
    
    pending_payments = db.query(ProviderReservation).filter(
        ProviderReservation.payment_status.in_([
            PaymentStatus.PENDING,
            PaymentStatus.OVERDUE
        ])
    ).count()
    
    unresolved_alerts = db.query(OperationalAlert).filter(
        OperationalAlert.resolved == False
    ).count()
    
    critical_alerts = db.query(OperationalAlert).filter(
        OperationalAlert.resolved == False,
        OperationalAlert.severity == AlertSeverity.CRITICAL
    ).count()
    
    # Groups needing closure
    groups_to_close = db.query(TourGroup).filter(
        TourGroup.end_date < datetime.utcnow(),
        TourGroup.closure_status != ClosureStatus.CLOSED
    ).count()
    
    # Validation failures
    validation_failures = db.query(ValidationLog).filter(
        ValidationLog.status == ValidationStatus.FAILED,
        ValidationLog.resolved == False
    ).count()
    
    return {
        "active_groups": active_groups,
        "pending_reservations": pending_reservations,
        "upcoming_services": upcoming_services,
        "pending_payments": pending_payments,
        "alerts": {
            "total": unresolved_alerts,
            "critical": critical_alerts
        },
        "groups_to_close": groups_to_close,
        "validation_failures": validation_failures,
        "timestamp": datetime.utcnow()
    }

@router.get("/dashboard/calendar")
async def get_calendar_view(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get calendar view of operations"""
    # Check permissions
    if not PermissionChecker.check_permission(current_user, "operations.view_dashboard"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Get groups in date range
    groups = db.query(TourGroup).filter(
        or_(
            and_(
                TourGroup.start_date >= start_date,
                TourGroup.start_date <= end_date
            ),
            and_(
                TourGroup.end_date >= start_date,
                TourGroup.end_date <= end_date
            )
        )
    ).all()
    
    # Get reservations in date range
    reservations = db.query(ProviderReservation).filter(
        or_(
            and_(
                ProviderReservation.service_date_start >= start_date,
                ProviderReservation.service_date_start <= end_date
            ),
            and_(
                ProviderReservation.service_date_end >= start_date,
                ProviderReservation.service_date_end <= end_date
            )
        )
    ).all()
    
    # Format calendar data
    calendar_data = {
        "groups": [
            {
                "id": str(g.id),
                "code": g.code,
                "name": g.name,
                "start": g.start_date.isoformat(),
                "end": g.end_date.isoformat(),
                "participants": g.total_participants,
                "status": g.operational_status.value
            }
            for g in groups
        ],
        "services": [
            {
                "id": str(r.id),
                "group_id": str(r.group_id),
                "service_type": r.service_type.value,
                "start": r.service_date_start.isoformat(),
                "end": r.service_date_end.isoformat(),
                "status": r.status.value,
                "confirmation": r.confirmation_number
            }
            for r in reservations
        ]
    }
    
    return calendar_data

# Export router
__all__ = ['router']