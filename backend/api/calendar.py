"""
Calendar and Booking Management API
REST endpoints for availability, bookings, and waitlist management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time, datetime
from pydantic import BaseModel, EmailStr, Field, validator
from decimal import Decimal

from backend.database import get_db
from backend.services.booking_service import (
    BookingService, BookingConflictError, BookingCapacityError
)
from backend.models.booking_models import (
    BookingStatus, WaitlistStatus, RecurrencePattern, BlackoutType
)
from backend.auth import get_current_user, require_admin
from backend.models.user import User

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# ==================== REQUEST/RESPONSE MODELS ====================

class AvailabilityRequest(BaseModel):
    """Request model for checking availability"""
    tour_id: int
    requested_date: date
    num_people: int = Field(ge=1, le=50)
    requested_time: Optional[time] = None


class AvailabilityResponse(BaseModel):
    """Response model for availability check"""
    available: bool
    reason: Optional[str] = None
    slots: List[dict] = []
    waitlist_available: bool = False
    tour: Optional[dict] = None


class CreateBookingRequest(BaseModel):
    """Request model for creating a booking"""
    tour_id: int
    booking_slot_id: int
    num_adults: int = Field(ge=0, le=50)
    num_children: int = Field(default=0, ge=0, le=50)
    num_infants: int = Field(default=0, ge=0, le=50)
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    special_requirements: Optional[str] = None
    dietary_restrictions: Optional[str] = None
    accessibility_needs: Optional[str] = None
    
    @validator('num_adults', 'num_children', 'num_infants')
    def validate_party_size(cls, v, values):
        """Ensure at least one person is in the party"""
        total = values.get('num_adults', 0) + values.get('num_children', 0) + values.get('num_infants', 0)
        if total <= 0:
            raise ValueError('Total party size must be greater than 0')
        return v


class ModifyBookingRequest(BaseModel):
    """Request model for modifying a booking"""
    new_slot_id: Optional[int] = None
    new_num_adults: Optional[int] = Field(None, ge=0, le=50)
    new_num_children: Optional[int] = Field(None, ge=0, le=50)
    new_num_infants: Optional[int] = Field(None, ge=0, le=50)
    modification_notes: Optional[str] = None


class CancelBookingRequest(BaseModel):
    """Request model for cancelling a booking"""
    cancellation_reason: Optional[str] = None


class AddToWaitlistRequest(BaseModel):
    """Request model for adding to waitlist"""
    tour_id: int
    requested_date: date
    num_people: int = Field(ge=1, le=50)
    booking_slot_id: Optional[int] = None
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    notes: Optional[str] = None


class CreateScheduleRequest(BaseModel):
    """Request model for creating tour schedule"""
    tour_id: int
    name: str = Field(max_length=200)
    description: Optional[str] = None
    start_time: time
    duration_minutes: int = Field(ge=30, le=1440)
    recurrence: RecurrencePattern
    monday: bool = False
    tuesday: bool = False
    wednesday: bool = False
    thursday: bool = False
    friday: bool = False
    saturday: bool = False
    sunday: bool = False
    max_capacity: int = Field(ge=1, le=100)
    min_capacity: int = Field(default=1, ge=1)
    valid_from: date
    valid_until: Optional[date] = None
    price_override: Optional[Decimal] = None


class CreateBlackoutRequest(BaseModel):
    """Request model for creating blackout date"""
    tour_id: Optional[int] = None  # None = global blackout
    start_date: date
    end_date: date
    blackout_type: BlackoutType
    name: str = Field(max_length=200)
    description: Optional[str] = None


class BookingResponse(BaseModel):
    """Response model for booking details"""
    id: int
    booking_reference: str
    tour_id: int
    tour_name: str
    status: BookingStatus
    tour_date: date
    tour_time: Optional[time]
    num_adults: int
    num_children: int
    num_infants: int
    total_people: int
    total_amount: Decimal
    customer_name: str
    customer_email: str
    created_at: datetime
    
    class Config:
        orm_mode = True


# ==================== AVAILABILITY ENDPOINTS ====================

@router.post("/availability", response_model=AvailabilityResponse)
async def check_availability(
    request: AvailabilityRequest,
    db: Session = Depends(get_db)
):
    """
    Check availability for a tour on a specific date
    
    Returns available time slots and capacity information
    """
    service = BookingService(db)
    
    try:
        result = await service.check_availability(
            tour_id=request.tour_id,
            requested_date=request.requested_date,
            num_people=request.num_people,
            requested_time=request.requested_time
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking availability: {str(e)}"
        )


@router.get("/tours/{tour_id}/slots")
async def get_tour_slots(
    tour_id: int,
    start_date: date = Query(..., description="Start date for slot range"),
    end_date: date = Query(..., description="End date for slot range"),
    db: Session = Depends(get_db)
):
    """
    Get all booking slots for a tour within a date range
    
    Useful for rendering calendar views
    """
    from backend.models.booking_models import BookingSlot
    
    slots = db.query(BookingSlot).filter(
        BookingSlot.tour_id == tour_id,
        BookingSlot.slot_date >= start_date,
        BookingSlot.slot_date <= end_date,
        BookingSlot.is_cancelled == False
    ).order_by(BookingSlot.slot_date, BookingSlot.start_time).all()
    
    return [
        {
            "id": slot.id,
            "date": slot.slot_date.isoformat(),
            "start_time": slot.start_time.isoformat(),
            "end_time": slot.end_time.isoformat(),
            "max_capacity": slot.max_capacity,
            "current_bookings": slot.current_bookings,
            "available_spots": slot.available_spots,
            "is_available": slot.is_available,
            "price_per_person": float(slot.price_per_person)
        }
        for slot in slots
    ]


@router.get("/tours/{tour_id}/monthly")
async def get_monthly_availability(
    tour_id: int,
    year: int = Query(..., ge=2020, le=2030),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db)
):
    """
    Get availability summary for a specific month
    
    Returns daily availability status for calendar rendering
    """
    from backend.models.booking_models import BookingSlot
    from sqlalchemy import func
    from calendar import monthrange
    
    # Get first and last day of month
    _, last_day = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    
    # Query slots grouped by date
    slots = db.query(
        BookingSlot.slot_date,
        func.sum(BookingSlot.available_spots).label('total_available'),
        func.count(BookingSlot.id).label('num_slots')
    ).filter(
        BookingSlot.tour_id == tour_id,
        BookingSlot.slot_date >= start_date,
        BookingSlot.slot_date <= end_date,
        BookingSlot.is_cancelled == False
    ).group_by(BookingSlot.slot_date).all()
    
    # Format response
    availability_map = {}
    for slot_date, total_available, num_slots in slots:
        availability_map[slot_date.isoformat()] = {
            "available_spots": int(total_available) if total_available else 0,
            "num_time_slots": num_slots,
            "has_availability": total_available > 0 if total_available else False
        }
    
    return {
        "tour_id": tour_id,
        "year": year,
        "month": month,
        "availability": availability_map
    }


# ==================== BOOKING ENDPOINTS ====================

@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: CreateBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new booking
    
    Requires authentication. Checks availability and capacity before creating.
    """
    service = BookingService(db)
    
    try:
        booking = await service.create_booking(
            user_id=current_user.id,
            tour_id=request.tour_id,
            booking_slot_id=request.booking_slot_id,
            num_adults=request.num_adults,
            num_children=request.num_children,
            num_infants=request.num_infants,
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            customer_phone=request.customer_phone,
            special_requirements=request.special_requirements,
            dietary_restrictions=request.dietary_restrictions,
            accessibility_needs=request.accessibility_needs
        )
        
        # Return formatted response
        return BookingResponse(
            id=booking.id,
            booking_reference=booking.booking_reference,
            tour_id=booking.tour_id,
            tour_name=booking.tour.name,
            status=booking.status,
            tour_date=booking.tour_date,
            tour_time=booking.tour_time,
            num_adults=booking.num_adults,
            num_children=booking.num_children,
            num_infants=booking.num_infants,
            total_people=booking.total_people,
            total_amount=booking.total_amount,
            customer_name=booking.customer_name,
            customer_email=booking.customer_email,
            created_at=booking.created_at
        )
        
    except BookingConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except BookingCapacityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get booking details by ID"""
    from backend.models.booking_models import Booking
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check authorization (user can only view their own bookings, admins can view all)
    if booking.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking"
        )
    
    return BookingResponse(
        id=booking.id,
        booking_reference=booking.booking_reference,
        tour_id=booking.tour_id,
        tour_name=booking.tour.name,
        status=booking.status,
        tour_date=booking.tour_date,
        tour_time=booking.tour_time,
        num_adults=booking.num_adults,
        num_children=booking.num_children,
        num_infants=booking.num_infants,
        total_people=booking.total_people,
        total_amount=booking.total_amount,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        created_at=booking.created_at
    )


@router.get("/bookings/reference/{reference}", response_model=BookingResponse)
async def get_booking_by_reference(
    reference: str,
    db: Session = Depends(get_db)
):
    """Get booking details by booking reference (public endpoint)"""
    from backend.models.booking_models import Booking
    
    booking = db.query(Booking).filter(
        Booking.booking_reference == reference
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    return BookingResponse(
        id=booking.id,
        booking_reference=booking.booking_reference,
        tour_id=booking.tour_id,
        tour_name=booking.tour.name,
        status=booking.status,
        tour_date=booking.tour_date,
        tour_time=booking.tour_time,
        num_adults=booking.num_adults,
        num_children=booking.num_children,
        num_infants=booking.num_infants,
        total_people=booking.total_people,
        total_amount=booking.total_amount,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        created_at=booking.created_at
    )


@router.put("/bookings/{booking_id}")
async def modify_booking(
    booking_id: int,
    request: ModifyBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Modify an existing booking"""
    service = BookingService(db)
    
    # Check authorization
    from backend.models.booking_models import Booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this booking"
        )
    
    try:
        modified_booking = await service.modify_booking(
            booking_id=booking_id,
            modified_by=current_user.id,
            new_slot_id=request.new_slot_id,
            new_num_adults=request.new_num_adults,
            new_num_children=request.new_num_children,
            new_num_infants=request.new_num_infants,
            modification_notes=request.modification_notes
        )
        
        return {
            "success": True,
            "message": "Booking modified successfully",
            "booking_reference": modified_booking.booking_reference
        }
        
    except BookingConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except BookingCapacityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/bookings/{booking_id}")
async def cancel_booking(
    booking_id: int,
    request: CancelBookingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a booking"""
    service = BookingService(db)
    
    # Check authorization
    from backend.models.booking_models import Booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking"
        )
    
    try:
        cancelled_booking = await service.cancel_booking(
            booking_id=booking_id,
            cancelled_by=current_user.id,
            cancellation_reason=request.cancellation_reason
        )
        
        return {
            "success": True,
            "message": "Booking cancelled successfully",
            "booking_reference": cancelled_booking.booking_reference
        }
        
    except BookingConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.get("/bookings/user/me")
async def get_my_bookings(
    status_filter: Optional[BookingStatus] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bookings for the current user"""
    from backend.models.booking_models import Booking
    
    query = db.query(Booking).filter(Booking.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    
    bookings = query.order_by(Booking.tour_date.desc()).all()
    
    return [
        {
            "id": booking.id,
            "booking_reference": booking.booking_reference,
            "tour_name": booking.tour.name,
            "status": booking.status,
            "tour_date": booking.tour_date.isoformat(),
            "tour_time": booking.tour_time.isoformat() if booking.tour_time else None,
            "total_people": booking.total_people,
            "total_amount": float(booking.total_amount),
            "created_at": booking.created_at.isoformat()
        }
        for booking in bookings
    ]


# ==================== WAITLIST ENDPOINTS ====================

@router.post("/waitlist")
async def add_to_waitlist(
    request: AddToWaitlistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add to waitlist for a fully booked tour"""
    service = BookingService(db)
    
    try:
        entry = await service.add_to_waitlist(
            user_id=current_user.id,
            tour_id=request.tour_id,
            requested_date=request.requested_date,
            num_people=request.num_people,
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            customer_phone=request.customer_phone,
            booking_slot_id=request.booking_slot_id,
            notes=request.notes
        )
        
        return {
            "success": True,
            "message": "Added to waitlist successfully",
            "waitlist_entry_id": entry.id
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/waitlist/me")
async def get_my_waitlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all waitlist entries for the current user"""
    from backend.models.booking_models import WaitlistEntry
    
    entries = db.query(WaitlistEntry).filter(
        WaitlistEntry.user_id == current_user.id,
        WaitlistEntry.status.in_([WaitlistStatus.ACTIVE, WaitlistStatus.NOTIFIED])
    ).order_by(WaitlistEntry.created_at.desc()).all()
    
    return [
        {
            "id": entry.id,
            "tour_name": entry.tour.name,
            "requested_date": entry.requested_date.isoformat(),
            "num_people": entry.num_people,
            "status": entry.status,
            "notified_at": entry.notified_at.isoformat() if entry.notified_at else None,
            "created_at": entry.created_at.isoformat()
        }
        for entry in entries
    ]


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/schedules", dependencies=[Depends(require_admin)])
async def create_schedule(
    request: CreateScheduleRequest,
    db: Session = Depends(get_db)
):
    """Create a new tour schedule (admin only)"""
    from backend.models.booking_models import TourSchedule
    
    schedule = TourSchedule(
        tour_id=request.tour_id,
        name=request.name,
        description=request.description,
        start_time=request.start_time,
        duration_minutes=request.duration_minutes,
        recurrence=request.recurrence,
        monday=request.monday,
        tuesday=request.tuesday,
        wednesday=request.wednesday,
        thursday=request.thursday,
        friday=request.friday,
        saturday=request.saturday,
        sunday=request.sunday,
        max_capacity=request.max_capacity,
        min_capacity=request.min_capacity,
        valid_from=request.valid_from,
        valid_until=request.valid_until,
        price_override=request.price_override
    )
    
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    
    return {
        "success": True,
        "message": "Schedule created successfully",
        "schedule_id": schedule.id
    }


@router.post("/admin/schedules/{schedule_id}/generate-slots", dependencies=[Depends(require_admin)])
async def generate_slots(
    schedule_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Generate booking slots from schedule (admin only)"""
    service = BookingService(db)
    
    try:
        slots = await service.generate_slots_for_schedule(
            schedule_id=schedule_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            "success": True,
            "message": f"Generated {len(slots)} booking slots",
            "num_slots": len(slots)
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/admin/blackouts", dependencies=[Depends(require_admin)])
async def create_blackout(
    request: CreateBlackoutRequest,
    db: Session = Depends(get_db)
):
    """Create a blackout date (admin only)"""
    from backend.models.booking_models import BlackoutDate
    
    if request.start_date > request.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before or equal to end date"
        )
    
    blackout = BlackoutDate(
        tour_id=request.tour_id,
        start_date=request.start_date,
        end_date=request.end_date,
        blackout_type=request.blackout_type,
        name=request.name,
        description=request.description
    )
    
    db.add(blackout)
    db.commit()
    db.refresh(blackout)
    
    return {
        "success": True,
        "message": "Blackout date created successfully",
        "blackout_id": blackout.id
    }


@router.get("/admin/bookings", dependencies=[Depends(require_admin)])
async def get_all_bookings(
    tour_id: Optional[int] = None,
    status_filter: Optional[BookingStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get all bookings with filters (admin only)"""
    from backend.models.booking_models import Booking
    
    query = db.query(Booking)
    
    if tour_id:
        query = query.filter(Booking.tour_id == tour_id)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    if start_date:
        query = query.filter(Booking.tour_date >= start_date)
    if end_date:
        query = query.filter(Booking.tour_date <= end_date)
    
    bookings = query.order_by(Booking.tour_date.desc()).all()
    
    return [
        {
            "id": booking.id,
            "booking_reference": booking.booking_reference,
            "tour_name": booking.tour.name,
            "customer_name": booking.customer_name,
            "customer_email": booking.customer_email,
            "status": booking.status,
            "tour_date": booking.tour_date.isoformat(),
            "total_people": booking.total_people,
            "total_amount": float(booking.total_amount),
            "created_at": booking.created_at.isoformat()
        }
        for booking in bookings
    ]
