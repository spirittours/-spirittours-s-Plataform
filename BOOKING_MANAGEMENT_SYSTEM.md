# Booking Management System with Calendar

Complete booking and calendar management system for Spirit Tours with availability tracking, conflict detection, capacity management, and waitlist functionality.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Models](#database-models)
4. [Backend Services](#backend-services)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Features](#features)
8. [Usage Examples](#usage-examples)
9. [Configuration](#configuration)
10. [Best Practices](#best-practices)

## Overview

The Booking Management System provides comprehensive functionality for managing tour bookings including:

- **Interactive Calendar**: Visual availability calendar with color-coded availability levels
- **Smart Scheduling**: Recurring tour schedules with flexible patterns
- **Conflict Detection**: Automatic overbooking prevention with database locks
- **Capacity Management**: Real-time slot capacity tracking
- **Waitlist System**: Automatic customer notification when spots become available
- **Blackout Dates**: Holiday and maintenance date management
- **Booking Modifications**: Customer-initiated booking changes
- **Multi-step Booking Flow**: Guided booking process with validation

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ BookingCalendar  │  │  BookingFlow     │                 │
│  │   Component      │  │   Component      │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Calendar API (/api/calendar)                        │   │
│  │  - Availability checking                             │   │
│  │  - Booking creation/modification/cancellation        │   │
│  │  - Waitlist management                               │   │
│  │  - Admin schedule management                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BookingService                                      │   │
│  │  - Availability logic                                │   │
│  │  - Conflict detection                                │   │
│  │  - Capacity management                               │   │
│  │  - Slot generation                                   │   │
│  │  - Waitlist processing                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │tour_schedules│  │booking_slots│  │   bookings   │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │blackout_dates│  │waitlist_    │  │booking_      │        │
│  │              │  │entries      │  │modification_ │        │
│  │              │  │             │  │logs          │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns

1. **Repository Pattern**: Service layer abstracts database operations
2. **Optimistic Locking**: Database row locking prevents race conditions
3. **Event-Driven**: Waitlist notifications triggered by booking cancellations
4. **State Machine**: Booking status transitions with validation
5. **Strategy Pattern**: Recurrence pattern matching

## Database Models

### TourSchedule

Defines recurring schedule patterns for tours.

```python
class TourSchedule:
    id: int
    tour_id: int
    name: str  # "Summer Morning Tours"
    start_time: time
    duration_minutes: int
    recurrence: RecurrencePattern  # daily, weekly, biweekly, monthly, custom
    monday, tuesday, ..., sunday: bool  # Days of week
    max_capacity: int
    min_capacity: int
    valid_from: date
    valid_until: date | None
    price_override: Decimal | None
    is_active: bool
```

**Recurrence Patterns:**
- `NONE`: One-time schedule
- `DAILY`: Every day
- `WEEKLY`: Same day each week
- `BIWEEKLY`: Every 2 weeks
- `MONTHLY`: Same date each month
- `CUSTOM`: Custom JSON rule

### BookingSlot

Individual time slots generated from schedules.

```python
class BookingSlot:
    id: int
    tour_id: int
    schedule_id: int | None
    slot_date: date
    start_time: time
    end_time: time
    max_capacity: int
    current_bookings: int
    available_spots: int  # Denormalized for performance
    price_per_person: Decimal
    is_available: bool
    is_cancelled: bool
    cancellation_reason: str | None
```

**Key Methods:**
- `is_full()`: Check if fully booked
- `has_availability(num_people)`: Check capacity for party size

### Booking

Complete booking lifecycle management.

```python
class Booking:
    id: int
    booking_reference: str  # "ST-20251102-ABC123"
    user_id: int
    tour_id: int
    booking_slot_id: int
    
    # Party details
    num_adults, num_children, num_infants: int
    total_people: int
    
    # Pricing
    price_per_adult, price_per_child, price_per_infant: Decimal
    subtotal, discount_amount, tax_amount, total_amount: Decimal
    
    # Customer info
    customer_name, customer_email, customer_phone: str
    special_requirements, dietary_restrictions, accessibility_needs: str
    
    # Status
    status: BookingStatus  # pending, confirmed, cancelled, completed, no_show, refunded
    
    # Modification tracking
    modified_at: datetime
    original_booking_id: int | None
    
    # Payment
    payment_id: int | None
```

**Status Transitions:**
```
PENDING → CONFIRMED → COMPLETED
   ↓          ↓
CANCELLED  NO_SHOW
   ↓
REFUNDED
```

### BlackoutDate

Dates when tours are unavailable.

```python
class BlackoutDate:
    id: int
    tour_id: int | None  # None = global blackout
    start_date: date
    end_date: date
    blackout_type: BlackoutType  # holiday, maintenance, weather, custom
    name: str  # "Christmas Holiday"
    description: str
    is_active: bool
```

### WaitlistEntry

Customer queue for fully booked tours.

```python
class WaitlistEntry:
    id: int
    user_id: int
    tour_id: int
    booking_slot_id: int | None
    requested_date: date
    num_people: int
    status: WaitlistStatus  # active, notified, converted, expired, cancelled
    priority: int  # Higher = higher priority
    notified_at: datetime | None
    notification_expires_at: datetime | None
    converted_at: datetime | None
    booking_id: int | None  # Resulting booking
```

### BookingModificationLog

Audit trail for all booking changes.

```python
class BookingModificationLog:
    id: int
    booking_id: int
    modified_by: int
    modification_type: str  # "status_change", "date_change", "cancellation"
    old_value: dict
    new_value: dict
    reason: str
    ip_address: str
    user_agent: str
    created_at: datetime
```

## Backend Services

### BookingService

Core service for booking operations.

#### Availability Checking

```python
async def check_availability(
    tour_id: int,
    requested_date: date,
    num_people: int,
    requested_time: Optional[time] = None
) -> Dict[str, Any]:
    """
    Check if tour is available for booking.
    
    Returns:
        {
            "available": bool,
            "slots": List[TimeSlot],
            "reason": str | None,
            "waitlist_available": bool
        }
    """
```

**Checks Performed:**
1. Tour exists and is active
2. Date is not blocked (blackout dates)
3. Slots exist for the date
4. Capacity available for party size

#### Booking Creation

```python
async def create_booking(
    user_id: int,
    tour_id: int,
    booking_slot_id: int,
    num_adults: int,
    num_children: int = 0,
    num_infants: int = 0,
    # ... customer details
) -> Booking:
    """
    Create new booking with conflict detection.
    
    Process:
    1. Lock booking slot (SELECT FOR UPDATE)
    2. Validate availability
    3. Calculate pricing
    4. Create booking record
    5. Update slot capacity
    6. Commit transaction
    
    Raises:
        BookingConflictError: Slot no longer available
        BookingCapacityError: Insufficient capacity
    """
```

**Pricing Calculation:**
- Adults: Full price
- Children (3-12): 70% of full price
- Infants (0-2): Free
- Tax: 10% of subtotal

#### Booking Modification

```python
async def modify_booking(
    booking_id: int,
    modified_by: int,
    new_slot_id: Optional[int] = None,
    new_num_adults: Optional[int] = None,
    # ... other changes
) -> Booking:
    """
    Modify existing booking.
    
    Supports:
    - Date/time change (slot change)
    - Party size change
    - Both changes simultaneously
    
    Automatically:
    - Releases old slot capacity
    - Reserves new slot capacity
    - Recalculates pricing
    - Logs modification
    """
```

#### Cancellation

```python
async def cancel_booking(
    booking_id: int,
    cancelled_by: int,
    cancellation_reason: str = None,
    refund_amount: Optional[Decimal] = None
) -> Booking:
    """
    Cancel booking and release capacity.
    
    Actions:
    - Update booking status
    - Release slot capacity
    - Process waitlist for released spots
    - Log cancellation
    """
```

#### Waitlist Management

```python
async def add_to_waitlist(
    user_id: int,
    tour_id: int,
    requested_date: date,
    num_people: int,
    # ... customer details
) -> WaitlistEntry:
    """Add customer to waitlist"""

async def _process_waitlist_for_slot(slot_id: int):
    """
    Notify waitlist customers when capacity becomes available.
    
    Process:
    1. Find active waitlist entries that fit
    2. Order by priority, then creation time
    3. Notify first customer
    4. Set 24-hour expiration
    """
```

#### Slot Generation

```python
async def generate_slots_for_schedule(
    schedule_id: int,
    start_date: date,
    end_date: date
) -> List[BookingSlot]:
    """
    Generate booking slots from tour schedule.
    
    Process:
    1. Iterate through date range
    2. Check recurrence pattern match
    3. Check blackout dates
    4. Create slot if not exists
    """
```

**Recurrence Pattern Matching:**
- **Daily**: Every day
- **Weekly**: Matches selected weekdays
- **Biweekly**: Every 2 weeks on selected days
- **Monthly**: Same day of month

## API Endpoints

### Availability Endpoints

#### POST /api/calendar/availability

Check availability for a specific date.

**Request:**
```json
{
  "tour_id": 1,
  "requested_date": "2025-12-25",
  "num_people": 4,
  "requested_time": "09:00:00"
}
```

**Response:**
```json
{
  "available": true,
  "slots": [
    {
      "slot_id": 123,
      "start_time": "09:00:00",
      "end_time": "12:00:00",
      "available_spots": 8,
      "max_capacity": 15,
      "price_per_person": 75.00,
      "current_bookings": 7
    }
  ],
  "tour": {
    "id": 1,
    "name": "Jerusalem Old City Tour",
    "duration_hours": 3
  }
}
```

#### GET /api/calendar/tours/{tour_id}/monthly

Get monthly availability summary.

**Query Parameters:**
- `year`: Year (2020-2030)
- `month`: Month (1-12)

**Response:**
```json
{
  "tour_id": 1,
  "year": 2025,
  "month": 12,
  "availability": {
    "2025-12-01": {
      "available_spots": 45,
      "num_time_slots": 3,
      "has_availability": true
    },
    "2025-12-02": {
      "available_spots": 0,
      "num_time_slots": 3,
      "has_availability": false
    }
  }
}
```

#### GET /api/calendar/tours/{tour_id}/slots

Get all slots within date range.

**Query Parameters:**
- `start_date`: Start date (required)
- `end_date`: End date (required)

### Booking Endpoints

#### POST /api/calendar/bookings

Create new booking.

**Request:**
```json
{
  "tour_id": 1,
  "booking_slot_id": 123,
  "num_adults": 2,
  "num_children": 1,
  "num_infants": 0,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "special_requirements": "Vegetarian meals",
  "dietary_restrictions": "Gluten-free",
  "accessibility_needs": "Wheelchair accessible"
}
```

**Response:**
```json
{
  "id": 456,
  "booking_reference": "ST-20251102-ABC123",
  "tour_id": 1,
  "tour_name": "Jerusalem Old City Tour",
  "status": "pending",
  "tour_date": "2025-12-25",
  "tour_time": "09:00:00",
  "num_adults": 2,
  "num_children": 1,
  "num_infants": 0,
  "total_people": 3,
  "total_amount": 192.50,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "created_at": "2025-11-02T10:30:00Z"
}
```

#### GET /api/calendar/bookings/{booking_id}

Get booking details (requires authentication, own bookings only).

#### GET /api/calendar/bookings/reference/{reference}

Get booking by reference (public endpoint for lookup).

#### PUT /api/calendar/bookings/{booking_id}

Modify existing booking.

**Request:**
```json
{
  "new_slot_id": 124,
  "new_num_adults": 3,
  "modification_notes": "Changed party size"
}
```

#### DELETE /api/calendar/bookings/{booking_id}

Cancel booking.

**Request:**
```json
{
  "cancellation_reason": "Plans changed"
}
```

#### GET /api/calendar/bookings/user/me

Get all bookings for current user.

**Query Parameters:**
- `status_filter`: Filter by status (optional)

### Waitlist Endpoints

#### POST /api/calendar/waitlist

Add to waitlist.

**Request:**
```json
{
  "tour_id": 1,
  "requested_date": "2025-12-25",
  "num_people": 4,
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "customer_phone": "+1234567890",
  "notes": "Flexible on time"
}
```

#### GET /api/calendar/waitlist/me

Get current user's waitlist entries.

### Admin Endpoints

All admin endpoints require authentication and admin role.

#### POST /api/calendar/admin/schedules

Create tour schedule.

**Request:**
```json
{
  "tour_id": 1,
  "name": "Summer Morning Tours",
  "start_time": "09:00:00",
  "duration_minutes": 180,
  "recurrence": "weekly",
  "monday": false,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": false,
  "saturday": true,
  "sunday": true,
  "max_capacity": 15,
  "min_capacity": 4,
  "valid_from": "2025-06-01",
  "valid_until": "2025-09-30",
  "price_override": 85.00
}
```

#### POST /api/calendar/admin/schedules/{schedule_id}/generate-slots

Generate slots from schedule.

**Query Parameters:**
- `start_date`: Start date
- `end_date`: End date

#### POST /api/calendar/admin/blackouts

Create blackout date.

**Request:**
```json
{
  "tour_id": 1,
  "start_date": "2025-12-24",
  "end_date": "2025-12-26",
  "blackout_type": "holiday",
  "name": "Christmas Holiday",
  "description": "Closed for Christmas"
}
```

#### GET /api/calendar/admin/bookings

Get all bookings with filters.

**Query Parameters:**
- `tour_id`: Filter by tour
- `status_filter`: Filter by status
- `start_date`: Date range start
- `end_date`: Date range end

## Frontend Components

### BookingCalendar Component

Interactive calendar for date/time selection.

**Props:**
```typescript
interface BookingCalendarProps {
  tourId: number;
  onDateSelect?: (date: Date, slots: TimeSlot[]) => void;
  minDate?: Date;
  maxDate?: Date;
  initialDate?: Date;
}
```

**Features:**
- Monthly calendar view
- Color-coded availability (high/medium/low/none)
- Time slot selection panel
- Responsive design
- Accessibility support

**Usage:**
```tsx
import BookingCalendar from '@/components/BookingCalendar/BookingCalendar';

<BookingCalendar
  tourId={1}
  onDateSelect={(date, slots) => {
    console.log('Selected:', date, slots);
  }}
  minDate={new Date()}
/>
```

### BookingFlow Component

Multi-step booking process.

**Props:**
```typescript
interface BookingFlowProps {
  tour: Tour;
  onBookingComplete?: (bookingReference: string) => void;
  onCancel?: () => void;
}
```

**Steps:**
1. **Date & Time Selection**: Calendar and time slot picker
2. **Party Size**: Adults, children, infants with pricing
3. **Customer Information**: Contact and requirements
4. **Review**: Booking summary and confirmation
5. **Confirmation**: Success message with reference

**Usage:**
```tsx
import BookingFlow from '@/components/BookingFlow/BookingFlow';

<BookingFlow
  tour={tourData}
  onBookingComplete={(ref) => {
    console.log('Booking confirmed:', ref);
    navigate(`/bookings/${ref}`);
  }}
  onCancel={() => navigate('/tours')}
/>
```

## Features

### 1. Intelligent Availability Detection

- Real-time capacity tracking
- Blackout date checking
- Recurrence pattern evaluation
- Performance-optimized queries

### 2. Conflict Prevention

- Database row locking during booking
- Atomic capacity updates
- Transaction rollback on failure
- Race condition prevention

### 3. Flexible Scheduling

- Multiple recurrence patterns
- Day-of-week selection
- Seasonal schedules
- Price overrides

### 4. Waitlist Automation

- Priority-based queuing
- Automatic notifications
- 24-hour conversion window
- FIFO processing

### 5. Comprehensive Audit Trail

- All modifications logged
- IP address tracking
- User agent capture
- Change history

### 6. Customer Experience

- Visual calendar interface
- Progressive disclosure (multi-step)
- Real-time validation
- Clear error messages

## Usage Examples

### Creating a Tour Schedule (Admin)

```python
# Create weekly schedule
schedule = TourSchedule(
    tour_id=1,
    name="Summer Weekend Tours",
    start_time=time(9, 0),
    duration_minutes=180,
    recurrence=RecurrencePattern.WEEKLY,
    saturday=True,
    sunday=True,
    max_capacity=20,
    min_capacity=5,
    valid_from=date(2025, 6, 1),
    valid_until=date(2025, 9, 30),
    price_override=Decimal('95.00')
)

# Generate slots for June 2025
service = BookingService(db)
slots = await service.generate_slots_for_schedule(
    schedule_id=schedule.id,
    start_date=date(2025, 6, 1),
    end_date=date(2025, 6, 30)
)
```

### Checking Availability

```python
result = await service.check_availability(
    tour_id=1,
    requested_date=date(2025, 12, 25),
    num_people=4
)

if result['available']:
    print(f"Found {len(result['slots'])} available time slots")
else:
    print(f"Not available: {result['reason']}")
    if result.get('waitlist_available'):
        print("Waitlist is available")
```

### Creating a Booking

```python
try:
    booking = await service.create_booking(
        user_id=current_user.id,
        tour_id=1,
        booking_slot_id=123,
        num_adults=2,
        num_children=1,
        customer_name="John Doe",
        customer_email="john@example.com",
        customer_phone="+1234567890"
    )
    print(f"Booking created: {booking.booking_reference}")
except BookingCapacityError as e:
    print(f"Insufficient capacity: {e}")
except BookingConflictError as e:
    print(f"Booking conflict: {e}")
```

### Adding to Waitlist

```python
entry = await service.add_to_waitlist(
    user_id=current_user.id,
    tour_id=1,
    requested_date=date(2025, 12, 25),
    num_people=4,
    customer_name="Jane Smith",
    customer_email="jane@example.com"
)
print(f"Added to waitlist: Entry #{entry.id}")
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/spirittours

# Booking Settings
BOOKING_ADVANCE_DAYS=90  # How far in advance bookings allowed
BOOKING_CUTOFF_HOURS=24  # Minimum hours before tour start
MIN_BOOKING_SIZE=1
MAX_BOOKING_SIZE=50

# Waitlist
WAITLIST_NOTIFICATION_EXPIRY_HOURS=24
WAITLIST_AUTO_PROCESS=true

# Pricing
DEFAULT_CHILD_DISCOUNT=0.30  # 30% off
TAX_RATE=0.10  # 10% tax
INFANT_MAX_AGE=2
CHILD_MAX_AGE=12
```

### Schedule Configuration

```python
# config/booking_config.py

RECURRENCE_PATTERNS = {
    'DAILY': {'description': 'Every day'},
    'WEEKLY': {'description': 'Same day each week'},
    'BIWEEKLY': {'description': 'Every 2 weeks'},
    'MONTHLY': {'description': 'Same date each month'}
}

BOOKING_STATUS_TRANSITIONS = {
    'PENDING': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
    'CANCELLED': ['REFUNDED'],
    'COMPLETED': [],
    'NO_SHOW': [],
    'REFUNDED': []
}
```

## Best Practices

### 1. Capacity Management

```python
# Always use database locks when modifying capacity
slot = db.query(BookingSlot).filter(
    BookingSlot.id == slot_id
).with_for_update().first()

# Update capacity atomically
slot.current_bookings += num_people
slot.available_spots = slot.max_capacity - slot.current_bookings
```

### 2. Error Handling

```python
try:
    booking = await service.create_booking(...)
except BookingConflictError as e:
    # Slot no longer available - suggest alternatives
    alternatives = await service.check_availability(...)
    return {"error": str(e), "alternatives": alternatives}
except BookingCapacityError as e:
    # Not enough capacity - offer waitlist
    return {"error": str(e), "waitlist_available": True}
except ValueError as e:
    # Validation error
    return {"error": str(e)}, 400
```

### 3. Performance Optimization

```python
# Use date range indexes
CREATE INDEX idx_slot_tour_date ON booking_slots (tour_id, slot_date);

# Denormalize frequently accessed data
# e.g., available_spots instead of calculating

# Cache monthly availability
@lru_cache(maxsize=100)
def get_monthly_availability(tour_id, year, month):
    ...
```

### 4. Testing

```python
# Test concurrency scenarios
async def test_concurrent_bookings():
    """Test that only one booking succeeds when capacity is 1"""
    slot = create_slot(max_capacity=1)
    
    # Simulate two simultaneous bookings
    results = await asyncio.gather(
        service.create_booking(...),
        service.create_booking(...),
        return_exceptions=True
    )
    
    # One should succeed, one should raise BookingCapacityError
    assert sum(1 for r in results if isinstance(r, Booking)) == 1
    assert sum(1 for r in results if isinstance(r, BookingCapacityError)) == 1
```

### 5. Monitoring

```python
# Key metrics to track
METRICS = [
    'bookings_created_total',
    'bookings_cancelled_total',
    'booking_conflicts_total',
    'capacity_errors_total',
    'waitlist_conversions_total',
    'average_booking_time_seconds',
    'slot_utilization_percentage'
]

# Alert conditions
ALERTS = {
    'high_conflict_rate': 'booking_conflicts_total > 10/hour',
    'low_conversion': 'waitlist_conversions_total < 0.5',
    'high_cancellation': 'bookings_cancelled_total > 20% of created'
}
```

## Migration

Run the booking system migration:

```bash
cd backend
alembic upgrade head
```

This creates:
- `tour_schedules` table
- `booking_slots` table
- `blackout_dates` table
- `bookings` table (enhanced)
- `waitlist_entries` table
- `booking_modification_logs` table
- All necessary indexes and constraints

## Summary

The Booking Management System provides a complete, production-ready solution for managing tour bookings with:

✅ Real-time availability tracking  
✅ Intelligent conflict detection  
✅ Flexible scheduling patterns  
✅ Automated waitlist processing  
✅ Comprehensive audit trails  
✅ User-friendly frontend components  
✅ Admin management tools  
✅ Performance optimizations  
✅ Extensive error handling  

The system is designed to handle high concurrency, prevent overbooking, and provide excellent customer experience from booking through completion.
