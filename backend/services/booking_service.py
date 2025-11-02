"""
Booking Management Service
Comprehensive booking operations with conflict detection and capacity management
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional, Tuple
import logging
from decimal import Decimal
import uuid

from backend.models.booking_models import (
    Booking, BookingSlot, TourSchedule, BlackoutDate, WaitlistEntry,
    BookingModificationLog, BookingStatus, WaitlistStatus, RecurrencePattern
)
from backend.models.tour import Tour
from backend.models.user import User

logger = logging.getLogger(__name__)


class BookingConflictError(Exception):
    """Raised when a booking conflict is detected"""
    pass


class BookingCapacityError(Exception):
    """Raised when booking exceeds available capacity"""
    pass


class BookingService:
    """Service for managing tour bookings and availability"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== AVAILABILITY CHECKING ====================
    
    async def check_availability(
        self,
        tour_id: int,
        requested_date: date,
        num_people: int,
        requested_time: Optional[time] = None
    ) -> Dict[str, Any]:
        """
        Check availability for a tour on a specific date
        
        Returns:
            Dict with availability status, available slots, and reasons if unavailable
        """
        tour = self.db.query(Tour).filter(Tour.id == tour_id).first()
        if not tour:
            return {
                "available": False,
                "reason": "Tour not found",
                "slots": []
            }
        
        # Check if tour is active
        if not tour.is_active:
            return {
                "available": False,
                "reason": "Tour is not currently active",
                "slots": []
            }
        
        # Check blackout dates
        if await self._is_date_blocked(tour_id, requested_date):
            blackout = self.db.query(BlackoutDate).filter(
                or_(
                    BlackoutDate.tour_id == tour_id,
                    BlackoutDate.tour_id.is_(None)
                ),
                BlackoutDate.is_active == True,
                BlackoutDate.start_date <= requested_date,
                BlackoutDate.end_date >= requested_date
            ).first()
            
            return {
                "available": False,
                "reason": f"Tour not available: {blackout.name if blackout else 'Blackout date'}",
                "slots": []
            }
        
        # Get available slots for the date
        available_slots = await self._get_available_slots(
            tour_id, 
            requested_date, 
            num_people,
            requested_time
        )
        
        if not available_slots:
            # Check if we should suggest waitlist
            any_slots = self.db.query(BookingSlot).filter(
                BookingSlot.tour_id == tour_id,
                BookingSlot.slot_date == requested_date,
                BookingSlot.is_cancelled == False
            ).first()
            
            if any_slots:
                return {
                    "available": False,
                    "reason": "All time slots are fully booked",
                    "slots": [],
                    "waitlist_available": True
                }
            else:
                return {
                    "available": False,
                    "reason": "No scheduled tours for this date",
                    "slots": []
                }
        
        return {
            "available": True,
            "slots": available_slots,
            "tour": {
                "id": tour.id,
                "name": tour.name,
                "duration_hours": tour.duration_hours
            }
        }
    
    async def _get_available_slots(
        self,
        tour_id: int,
        requested_date: date,
        num_people: int,
        requested_time: Optional[time] = None
    ) -> List[Dict[str, Any]]:
        """Get all available booking slots for a tour on a specific date"""
        query = self.db.query(BookingSlot).filter(
            BookingSlot.tour_id == tour_id,
            BookingSlot.slot_date == requested_date,
            BookingSlot.is_available == True,
            BookingSlot.is_cancelled == False,
            BookingSlot.available_spots >= num_people
        )
        
        if requested_time:
            query = query.filter(BookingSlot.start_time == requested_time)
        
        slots = query.order_by(BookingSlot.start_time).all()
        
        return [
            {
                "slot_id": slot.id,
                "start_time": slot.start_time.isoformat(),
                "end_time": slot.end_time.isoformat(),
                "available_spots": slot.available_spots,
                "max_capacity": slot.max_capacity,
                "price_per_person": float(slot.price_per_person),
                "current_bookings": slot.current_bookings
            }
            for slot in slots
        ]
    
    async def _is_date_blocked(self, tour_id: int, check_date: date) -> bool:
        """Check if a date is blocked by blackout dates"""
        blackout = self.db.query(BlackoutDate).filter(
            or_(
                BlackoutDate.tour_id == tour_id,
                BlackoutDate.tour_id.is_(None)  # Global blackouts
            ),
            BlackoutDate.is_active == True,
            BlackoutDate.start_date <= check_date,
            BlackoutDate.end_date >= check_date
        ).first()
        
        return blackout is not None
    
    # ==================== BOOKING CREATION ====================
    
    async def create_booking(
        self,
        user_id: int,
        tour_id: int,
        booking_slot_id: int,
        num_adults: int,
        num_children: int = 0,
        num_infants: int = 0,
        customer_name: str = None,
        customer_email: str = None,
        customer_phone: str = None,
        special_requirements: str = None,
        dietary_restrictions: str = None,
        accessibility_needs: str = None,
        metadata: Dict[str, Any] = None
    ) -> Booking:
        """
        Create a new booking with conflict detection
        
        Raises:
            BookingConflictError: If slot is no longer available
            BookingCapacityError: If not enough capacity
        """
        # Validate inputs
        total_people = num_adults + num_children + num_infants
        if total_people <= 0:
            raise ValueError("Total number of people must be greater than 0")
        
        # Get booking slot with lock
        booking_slot = self.db.query(BookingSlot).filter(
            BookingSlot.id == booking_slot_id
        ).with_for_update().first()
        
        if not booking_slot:
            raise BookingConflictError("Booking slot not found")
        
        # Check slot availability
        if not booking_slot.is_available or booking_slot.is_cancelled:
            raise BookingConflictError("Booking slot is not available")
        
        if booking_slot.available_spots < total_people:
            raise BookingCapacityError(
                f"Not enough capacity. Only {booking_slot.available_spots} spots available, "
                f"but {total_people} people requested"
            )
        
        # Get tour information
        tour = self.db.query(Tour).filter(Tour.id == tour_id).first()
        if not tour:
            raise ValueError("Tour not found")
        
        # Get user information
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Use provided customer info or fall back to user info
        if not customer_name:
            customer_name = f"{user.first_name} {user.last_name}"
        if not customer_email:
            customer_email = user.email
        
        # Calculate pricing
        pricing = await self._calculate_booking_price(
            booking_slot=booking_slot,
            tour=tour,
            num_adults=num_adults,
            num_children=num_children,
            num_infants=num_infants
        )
        
        # Generate unique booking reference
        booking_reference = self._generate_booking_reference()
        
        # Create booking
        booking = Booking(
            user_id=user_id,
            tour_id=tour_id,
            booking_slot_id=booking_slot_id,
            booking_reference=booking_reference,
            tour_date=booking_slot.slot_date,
            tour_time=booking_slot.start_time,
            num_adults=num_adults,
            num_children=num_children,
            num_infants=num_infants,
            total_people=total_people,
            price_per_adult=pricing['price_per_adult'],
            price_per_child=pricing['price_per_child'],
            price_per_infant=pricing['price_per_infant'],
            subtotal=pricing['subtotal'],
            discount_amount=pricing['discount_amount'],
            tax_amount=pricing['tax_amount'],
            total_amount=pricing['total_amount'],
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            special_requirements=special_requirements,
            dietary_restrictions=dietary_restrictions,
            accessibility_needs=accessibility_needs,
            status=BookingStatus.PENDING,
            metadata=metadata
        )
        
        self.db.add(booking)
        
        # Update slot capacity
        booking_slot.current_bookings += total_people
        booking_slot.available_spots = booking_slot.max_capacity - booking_slot.current_bookings
        
        # Mark slot as unavailable if full
        if booking_slot.available_spots <= 0:
            booking_slot.is_available = False
        
        # Commit transaction
        self.db.commit()
        self.db.refresh(booking)
        
        logger.info(f"Created booking {booking_reference} for user {user_id}")
        
        return booking
    
    async def _calculate_booking_price(
        self,
        booking_slot: BookingSlot,
        tour: Tour,
        num_adults: int,
        num_children: int,
        num_infants: int
    ) -> Dict[str, Decimal]:
        """Calculate booking pricing with discounts and taxes"""
        # Base prices (use slot price or tour base price)
        base_price = booking_slot.price_per_person
        
        # Pricing tiers
        price_per_adult = base_price
        price_per_child = base_price * Decimal('0.7')  # 30% discount for children
        price_per_infant = Decimal('0')  # Infants typically free
        
        # Calculate subtotal
        subtotal = (
            (price_per_adult * num_adults) +
            (price_per_child * num_children) +
            (price_per_infant * num_infants)
        )
        
        # Apply discounts (placeholder for future discount logic)
        discount_amount = Decimal('0')
        
        # Calculate tax (example: 10% VAT)
        tax_rate = Decimal('0.10')
        tax_amount = (subtotal - discount_amount) * tax_rate
        
        # Calculate total
        total_amount = subtotal - discount_amount + tax_amount
        
        return {
            'price_per_adult': price_per_adult,
            'price_per_child': price_per_child,
            'price_per_infant': price_per_infant,
            'subtotal': subtotal,
            'discount_amount': discount_amount,
            'tax_amount': tax_amount,
            'total_amount': total_amount
        }
    
    def _generate_booking_reference(self) -> str:
        """Generate unique booking reference code"""
        # Format: ST-YYYYMMDD-XXXX (ST = Spirit Tours)
        date_part = datetime.utcnow().strftime('%Y%m%d')
        unique_part = str(uuid.uuid4())[:8].upper()
        return f"ST-{date_part}-{unique_part}"
    
    # ==================== BOOKING MODIFICATION ====================
    
    async def modify_booking(
        self,
        booking_id: int,
        modified_by: int,
        new_slot_id: Optional[int] = None,
        new_num_adults: Optional[int] = None,
        new_num_children: Optional[int] = None,
        new_num_infants: Optional[int] = None,
        modification_notes: str = None
    ) -> Booking:
        """
        Modify an existing booking
        
        Supports changing slot (date/time) and party size
        """
        # Get booking with lock
        booking = self.db.query(Booking).filter(
            Booking.id == booking_id
        ).with_for_update().first()
        
        if not booking:
            raise ValueError("Booking not found")
        
        if not booking.is_modifiable():
            raise BookingConflictError(f"Booking with status {booking.status} cannot be modified")
        
        old_values = {}
        new_values = {}
        
        # Modify booking slot (date/time change)
        if new_slot_id and new_slot_id != booking.booking_slot_id:
            old_slot = booking.booking_slot
            new_slot = self.db.query(BookingSlot).filter(
                BookingSlot.id == new_slot_id
            ).with_for_update().first()
            
            if not new_slot:
                raise ValueError("New booking slot not found")
            
            # Check new slot availability
            new_total_people = new_num_adults or booking.num_adults
            new_total_people += new_num_children or booking.num_children
            new_total_people += new_num_infants or booking.num_infants
            
            if new_slot.available_spots < new_total_people:
                raise BookingCapacityError("New slot does not have enough capacity")
            
            # Release capacity from old slot
            old_slot.current_bookings -= booking.total_people
            old_slot.available_spots = old_slot.max_capacity - old_slot.current_bookings
            old_slot.is_available = True
            
            # Reserve capacity in new slot
            new_slot.current_bookings += new_total_people
            new_slot.available_spots = new_slot.max_capacity - new_slot.current_bookings
            if new_slot.available_spots <= 0:
                new_slot.is_available = False
            
            old_values['booking_slot_id'] = booking.booking_slot_id
            new_values['booking_slot_id'] = new_slot_id
            
            booking.booking_slot_id = new_slot_id
            booking.tour_date = new_slot.slot_date
            booking.tour_time = new_slot.start_time
        
        # Modify party size
        if new_num_adults is not None or new_num_children is not None or new_num_infants is not None:
            old_num_adults = booking.num_adults
            old_num_children = booking.num_children
            old_num_infants = booking.num_infants
            old_total = booking.total_people
            
            booking.num_adults = new_num_adults if new_num_adults is not None else booking.num_adults
            booking.num_children = new_num_children if new_num_children is not None else booking.num_children
            booking.num_infants = new_num_infants if new_num_infants is not None else booking.num_infants
            booking.total_people = booking.num_adults + booking.num_children + booking.num_infants
            
            # Update slot capacity if party size changed
            if booking.total_people != old_total and booking.booking_slot:
                slot = booking.booking_slot
                slot.current_bookings = slot.current_bookings - old_total + booking.total_people
                slot.available_spots = slot.max_capacity - slot.current_bookings
                slot.is_available = slot.available_spots > 0
            
            old_values['party_size'] = {'adults': old_num_adults, 'children': old_num_children, 'infants': old_num_infants}
            new_values['party_size'] = {'adults': booking.num_adults, 'children': booking.num_children, 'infants': booking.num_infants}
            
            # Recalculate pricing
            tour = booking.tour
            slot = booking.booking_slot
            pricing = await self._calculate_booking_price(
                booking_slot=slot,
                tour=tour,
                num_adults=booking.num_adults,
                num_children=booking.num_children,
                num_infants=booking.num_infants
            )
            booking.price_per_adult = pricing['price_per_adult']
            booking.price_per_child = pricing['price_per_child']
            booking.price_per_infant = pricing['price_per_infant']
            booking.subtotal = pricing['subtotal']
            booking.tax_amount = pricing['tax_amount']
            booking.total_amount = pricing['total_amount']
        
        # Update modification metadata
        booking.modified_at = datetime.utcnow()
        booking.modification_notes = modification_notes
        
        # Log modification
        log_entry = BookingModificationLog(
            booking_id=booking_id,
            modified_by=modified_by,
            modification_type='booking_modification',
            old_value=old_values,
            new_value=new_values,
            reason=modification_notes
        )
        self.db.add(log_entry)
        
        self.db.commit()
        self.db.refresh(booking)
        
        logger.info(f"Modified booking {booking.booking_reference}")
        
        return booking
    
    # ==================== BOOKING CANCELLATION ====================
    
    async def cancel_booking(
        self,
        booking_id: int,
        cancelled_by: int,
        cancellation_reason: str = None,
        refund_amount: Optional[Decimal] = None
    ) -> Booking:
        """Cancel a booking and release capacity"""
        booking = self.db.query(Booking).filter(
            Booking.id == booking_id
        ).with_for_update().first()
        
        if not booking:
            raise ValueError("Booking not found")
        
        if not booking.is_cancellable():
            raise BookingConflictError(f"Booking with status {booking.status} cannot be cancelled")
        
        # Update booking status
        old_status = booking.status
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.utcnow()
        booking.cancelled_by = cancelled_by
        booking.cancellation_reason = cancellation_reason
        booking.refund_amount = refund_amount
        
        # Release slot capacity
        if booking.booking_slot:
            slot = booking.booking_slot
            slot.current_bookings -= booking.total_people
            slot.available_spots = slot.max_capacity - slot.current_bookings
            slot.is_available = True
            
            # Notify waitlist
            await self._process_waitlist_for_slot(slot.id)
        
        # Log cancellation
        log_entry = BookingModificationLog(
            booking_id=booking_id,
            modified_by=cancelled_by,
            modification_type='cancellation',
            old_value={'status': old_status.value},
            new_value={'status': BookingStatus.CANCELLED.value},
            reason=cancellation_reason
        )
        self.db.add(log_entry)
        
        self.db.commit()
        self.db.refresh(booking)
        
        logger.info(f"Cancelled booking {booking.booking_reference}")
        
        return booking
    
    # ==================== WAITLIST MANAGEMENT ====================
    
    async def add_to_waitlist(
        self,
        user_id: int,
        tour_id: int,
        requested_date: date,
        num_people: int,
        customer_name: str,
        customer_email: str,
        customer_phone: str = None,
        booking_slot_id: Optional[int] = None,
        notes: str = None
    ) -> WaitlistEntry:
        """Add customer to waitlist for a fully booked tour"""
        # Check if already on waitlist
        existing = self.db.query(WaitlistEntry).filter(
            WaitlistEntry.user_id == user_id,
            WaitlistEntry.tour_id == tour_id,
            WaitlistEntry.requested_date == requested_date,
            WaitlistEntry.status == WaitlistStatus.ACTIVE
        ).first()
        
        if existing:
            raise ValueError("Already on waitlist for this tour and date")
        
        entry = WaitlistEntry(
            user_id=user_id,
            tour_id=tour_id,
            booking_slot_id=booking_slot_id,
            requested_date=requested_date,
            num_people=num_people,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            status=WaitlistStatus.ACTIVE,
            notes=notes
        )
        
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        
        logger.info(f"Added user {user_id} to waitlist for tour {tour_id}")
        
        return entry
    
    async def _process_waitlist_for_slot(self, slot_id: int):
        """Process waitlist when slot becomes available"""
        slot = self.db.query(BookingSlot).filter(BookingSlot.id == slot_id).first()
        if not slot or slot.available_spots <= 0:
            return
        
        # Get active waitlist entries for this slot, ordered by priority and creation time
        waitlist_entries = self.db.query(WaitlistEntry).filter(
            WaitlistEntry.booking_slot_id == slot_id,
            WaitlistEntry.status == WaitlistStatus.ACTIVE,
            WaitlistEntry.num_people <= slot.available_spots
        ).order_by(
            WaitlistEntry.priority.desc(),
            WaitlistEntry.created_at.asc()
        ).all()
        
        for entry in waitlist_entries:
            if slot.available_spots >= entry.num_people:
                # Notify customer
                entry.status = WaitlistStatus.NOTIFIED
                entry.notified_at = datetime.utcnow()
                entry.notification_expires_at = datetime.utcnow() + timedelta(hours=24)
                
                # TODO: Send email notification
                logger.info(f"Notified waitlist entry {entry.id} of availability")
                
                break  # Only notify one customer at a time
        
        self.db.commit()
    
    # ==================== SLOT GENERATION ====================
    
    async def generate_slots_for_schedule(
        self,
        schedule_id: int,
        start_date: date,
        end_date: date
    ) -> List[BookingSlot]:
        """
        Generate booking slots based on tour schedule
        Creates individual slots for each occurrence within date range
        """
        schedule = self.db.query(TourSchedule).filter(
            TourSchedule.id == schedule_id
        ).first()
        
        if not schedule:
            raise ValueError("Schedule not found")
        
        if not schedule.is_active:
            raise ValueError("Schedule is not active")
        
        # Validate date range against schedule validity
        if start_date < schedule.valid_from:
            start_date = schedule.valid_from
        
        if schedule.valid_until and end_date > schedule.valid_until:
            end_date = schedule.valid_until
        
        generated_slots = []
        current_date = start_date
        
        while current_date <= end_date:
            # Check if this date matches the schedule pattern
            if await self._matches_schedule_pattern(schedule, current_date):
                # Check for blackout dates
                if not await self._is_date_blocked(schedule.tour_id, current_date):
                    # Check if slot already exists
                    existing = self.db.query(BookingSlot).filter(
                        BookingSlot.tour_id == schedule.tour_id,
                        BookingSlot.schedule_id == schedule_id,
                        BookingSlot.slot_date == current_date,
                        BookingSlot.start_time == schedule.start_time
                    ).first()
                    
                    if not existing:
                        # Calculate end time
                        start_datetime = datetime.combine(current_date, schedule.start_time)
                        end_datetime = start_datetime + timedelta(minutes=schedule.duration_minutes)
                        
                        # Determine price
                        price = schedule.price_override if schedule.price_override else schedule.tour.base_price
                        
                        # Create slot
                        slot = BookingSlot(
                            tour_id=schedule.tour_id,
                            schedule_id=schedule_id,
                            slot_date=current_date,
                            start_time=schedule.start_time,
                            end_time=end_datetime.time(),
                            max_capacity=schedule.max_capacity,
                            current_bookings=0,
                            available_spots=schedule.max_capacity,
                            price_per_person=price,
                            is_available=True
                        )
                        
                        self.db.add(slot)
                        generated_slots.append(slot)
            
            current_date += timedelta(days=1)
        
        self.db.commit()
        
        logger.info(f"Generated {len(generated_slots)} slots for schedule {schedule_id}")
        
        return generated_slots
    
    async def _matches_schedule_pattern(self, schedule: TourSchedule, check_date: date) -> bool:
        """Check if a date matches the schedule's recurrence pattern"""
        if schedule.recurrence == RecurrencePattern.NONE:
            return False
        
        if schedule.recurrence == RecurrencePattern.DAILY:
            return True
        
        if schedule.recurrence in [RecurrencePattern.WEEKLY, RecurrencePattern.BIWEEKLY]:
            # Check day of week
            day_of_week = check_date.weekday()  # 0 = Monday, 6 = Sunday
            day_matches = [
                schedule.monday, schedule.tuesday, schedule.wednesday,
                schedule.thursday, schedule.friday, schedule.saturday, schedule.sunday
            ]
            
            if not day_matches[day_of_week]:
                return False
            
            if schedule.recurrence == RecurrencePattern.BIWEEKLY:
                # Check if it's the right week (every 2 weeks from valid_from)
                days_diff = (check_date - schedule.valid_from).days
                return days_diff % 14 < 7
            
            return True
        
        if schedule.recurrence == RecurrencePattern.MONTHLY:
            # Same day of month as valid_from
            return check_date.day == schedule.valid_from.day
        
        return False
