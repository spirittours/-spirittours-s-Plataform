"""
Unit Tests for Trip State Machine
Tests the 10-state trip lifecycle and transitions
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal

# Mock Trip State Machine
class TripStatus:
    """10 granular trip states"""
    PENDING = "pending"
    UPCOMING = "upcoming"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    NO_SHOW = "no_show"
    MODIFIED = "modified"
    WAITING_LIST = "waiting_list"
    PRIORITY = "priority"


class MockTrip:
    """Mock Trip model for testing"""
    
    def __init__(
        self,
        booking_reference: str,
        status: str = TripStatus.PENDING,
        departure_date: datetime = None,
        paid_amount: Decimal = Decimal('0'),
        total_amount: Decimal = Decimal('1000')
    ):
        self.booking_reference = booking_reference
        self.status = status
        self.departure_date = departure_date or (datetime.now() + timedelta(days=7))
        self.paid_amount = paid_amount
        self.total_amount = total_amount
        self.refund_amount = Decimal('0')
        self.cancelled_at = None
        self.completed_at = None
        self.status_history = []
    
    @property
    def days_until_departure(self) -> int:
        """Calculate days until departure"""
        if self.departure_date:
            delta = self.departure_date - datetime.now()
            return max(0, delta.days)
        return 0
    
    @property
    def can_be_modified(self) -> bool:
        """Check if trip can be modified"""
        return (
            self.status in [TripStatus.PENDING, TripStatus.UPCOMING] and
            self.days_until_departure > 2
        )
    
    @property
    def can_be_cancelled(self) -> bool:
        """Check if trip can be cancelled"""
        return self.status in [TripStatus.PENDING, TripStatus.UPCOMING]
    
    def calculate_refund_amount(self) -> Decimal:
        """Calculate refund based on cancellation policy"""
        days_until = self.days_until_departure
        
        if days_until >= 14:
            return self.paid_amount  # 100% refund
        elif days_until >= 7:
            return self.paid_amount * Decimal('0.75')  # 75% refund
        elif days_until >= 2:
            return self.paid_amount * Decimal('0.50')  # 50% refund
        else:
            return Decimal('0.00')  # No refund
    
    def transition_to(self, new_status: str, reason: str = None) -> bool:
        """
        Transition to new status with validation
        Returns True if transition is valid
        """
        old_status = self.status
        
        # Validate transition
        valid_transitions = {
            TripStatus.PENDING: [
                TripStatus.UPCOMING,
                TripStatus.CANCELLED,
                TripStatus.WAITING_LIST
            ],
            TripStatus.WAITING_LIST: [
                TripStatus.UPCOMING,
                TripStatus.CANCELLED
            ],
            TripStatus.UPCOMING: [
                TripStatus.IN_PROGRESS,
                TripStatus.CANCELLED,
                TripStatus.MODIFIED,
                TripStatus.NO_SHOW,
                TripStatus.PRIORITY
            ],
            TripStatus.PRIORITY: [
                TripStatus.IN_PROGRESS,
                TripStatus.CANCELLED,
                TripStatus.NO_SHOW
            ],
            TripStatus.MODIFIED: [
                TripStatus.UPCOMING,
                TripStatus.CANCELLED
            ],
            TripStatus.IN_PROGRESS: [
                TripStatus.COMPLETED,
                TripStatus.CANCELLED
            ],
            TripStatus.COMPLETED: [
                TripStatus.REFUNDED  # Can refund after completion if needed
            ],
            TripStatus.CANCELLED: [
                TripStatus.REFUNDED
            ],
            TripStatus.NO_SHOW: [],  # Terminal state
            TripStatus.REFUNDED: []  # Terminal state
        }
        
        if new_status not in valid_transitions.get(old_status, []):
            return False
        
        # Perform transition
        self.status = new_status
        self.status_history.append({
            'from_status': old_status,
            'to_status': new_status,
            'timestamp': datetime.now(),
            'reason': reason
        })
        
        # Update timestamps
        if new_status == TripStatus.CANCELLED:
            self.cancelled_at = datetime.now()
            self.refund_amount = self.calculate_refund_amount()
        elif new_status == TripStatus.COMPLETED:
            self.completed_at = datetime.now()
        
        return True
    
    def confirm_payment(self) -> bool:
        """Confirm payment and move to upcoming"""
        if self.status != TripStatus.PENDING:
            return False
        
        if self.paid_amount >= self.total_amount:
            return self.transition_to(TripStatus.UPCOMING, 'Payment confirmed')
        
        return False
    
    def start_trip(self) -> bool:
        """Start the trip"""
        if self.status not in [TripStatus.UPCOMING, TripStatus.PRIORITY]:
            return False
        
        # Check if it's close to departure date
        if self.days_until_departure > 1:
            return False
        
        return self.transition_to(TripStatus.IN_PROGRESS, 'Trip started')
    
    def complete_trip(self) -> bool:
        """Complete the trip"""
        if self.status != TripStatus.IN_PROGRESS:
            return False
        
        return self.transition_to(TripStatus.COMPLETED, 'Trip completed')
    
    def cancel_trip(self, reason: str = None) -> bool:
        """Cancel the trip"""
        if not self.can_be_cancelled:
            return False
        
        return self.transition_to(TripStatus.CANCELLED, reason or 'Customer cancellation')
    
    def mark_no_show(self) -> bool:
        """Mark customer as no-show"""
        if self.status != TripStatus.UPCOMING:
            return False
        
        # Check if past departure date
        if datetime.now() < self.departure_date:
            return False
        
        return self.transition_to(TripStatus.NO_SHOW, 'Customer did not show up')


class TestTripStateMachine:
    """Test suite for Trip State Machine"""
    
    @pytest.fixture
    def pending_trip(self):
        """Create a pending trip"""
        return MockTrip(
            booking_reference='ST-2024-TEST-001',
            status=TripStatus.PENDING,
            departure_date=datetime.now() + timedelta(days=10),
            paid_amount=Decimal('0'),
            total_amount=Decimal('1000')
        )
    
    @pytest.fixture
    def upcoming_trip(self):
        """Create an upcoming trip"""
        return MockTrip(
            booking_reference='ST-2024-TEST-002',
            status=TripStatus.UPCOMING,
            departure_date=datetime.now() + timedelta(days=5),
            paid_amount=Decimal('1000'),
            total_amount=Decimal('1000')
        )
    
    @pytest.fixture
    def in_progress_trip(self):
        """Create an in-progress trip"""
        return MockTrip(
            booking_reference='ST-2024-TEST-003',
            status=TripStatus.IN_PROGRESS,
            departure_date=datetime.now() - timedelta(hours=2),
            paid_amount=Decimal('1000'),
            total_amount=Decimal('1000')
        )
    
    def test_initial_state_is_pending(self):
        """Test trip starts in pending state"""
        trip = MockTrip('ST-TEST-001')
        assert trip.status == TripStatus.PENDING
    
    def test_payment_confirmation_transitions_to_upcoming(self, pending_trip):
        """Test payment confirmation moves trip to upcoming"""
        pending_trip.paid_amount = Decimal('1000')
        success = pending_trip.confirm_payment()
        
        assert success is True
        assert pending_trip.status == TripStatus.UPCOMING
        assert len(pending_trip.status_history) == 1
    
    def test_payment_confirmation_fails_without_full_payment(self, pending_trip):
        """Test payment confirmation requires full payment"""
        pending_trip.paid_amount = Decimal('500')  # Only partial
        success = pending_trip.confirm_payment()
        
        assert success is False
        assert pending_trip.status == TripStatus.PENDING
    
    def test_start_trip_transitions_to_in_progress(self, upcoming_trip):
        """Test starting trip moves to in_progress"""
        # Set departure to today
        upcoming_trip.departure_date = datetime.now()
        success = upcoming_trip.start_trip()
        
        assert success is True
        assert upcoming_trip.status == TripStatus.IN_PROGRESS
    
    def test_start_trip_fails_if_too_early(self, upcoming_trip):
        """Test cannot start trip if too far from departure"""
        upcoming_trip.departure_date = datetime.now() + timedelta(days=5)
        success = upcoming_trip.start_trip()
        
        assert success is False
        assert upcoming_trip.status == TripStatus.UPCOMING
    
    def test_complete_trip_transitions_to_completed(self, in_progress_trip):
        """Test completing trip moves to completed"""
        success = in_progress_trip.complete_trip()
        
        assert success is True
        assert in_progress_trip.status == TripStatus.COMPLETED
        assert in_progress_trip.completed_at is not None
    
    def test_complete_trip_fails_if_not_in_progress(self, upcoming_trip):
        """Test cannot complete trip that hasn't started"""
        success = upcoming_trip.complete_trip()
        
        assert success is False
        assert upcoming_trip.status == TripStatus.UPCOMING
    
    def test_cancel_trip_from_pending(self, pending_trip):
        """Test cancelling trip from pending state"""
        success = pending_trip.cancel_trip('Customer request')
        
        assert success is True
        assert pending_trip.status == TripStatus.CANCELLED
        assert pending_trip.cancelled_at is not None
    
    def test_cancel_trip_from_upcoming(self, upcoming_trip):
        """Test cancelling trip from upcoming state"""
        success = upcoming_trip.cancel_trip('Weather conditions')
        
        assert success is True
        assert upcoming_trip.status == TripStatus.CANCELLED
    
    def test_cannot_cancel_completed_trip(self):
        """Test cannot cancel completed trip"""
        trip = MockTrip('ST-TEST', status=TripStatus.COMPLETED)
        success = trip.cancel_trip()
        
        assert success is False
        assert trip.status == TripStatus.COMPLETED
    
    def test_refund_calculation_14_days_advance(self):
        """Test 100% refund for 14+ days notice"""
        trip = MockTrip(
            'ST-TEST',
            departure_date=datetime.now() + timedelta(days=20),
            paid_amount=Decimal('1000')
        )
        
        refund = trip.calculate_refund_amount()
        assert refund == Decimal('1000')
    
    def test_refund_calculation_7_days_advance(self):
        """Test 75% refund for 7-13 days notice"""
        trip = MockTrip(
            'ST-TEST',
            departure_date=datetime.now() + timedelta(days=10),
            paid_amount=Decimal('1000')
        )
        
        refund = trip.calculate_refund_amount()
        assert refund == Decimal('750')
    
    def test_refund_calculation_2_days_advance(self):
        """Test 50% refund for 2-6 days notice"""
        trip = MockTrip(
            'ST-TEST',
            departure_date=datetime.now() + timedelta(days=5),
            paid_amount=Decimal('1000')
        )
        
        refund = trip.calculate_refund_amount()
        assert refund == Decimal('500')
    
    def test_refund_calculation_last_minute(self):
        """Test 0% refund for < 2 days notice"""
        trip = MockTrip(
            'ST-TEST',
            departure_date=datetime.now() + timedelta(days=1),
            paid_amount=Decimal('1000')
        )
        
        refund = trip.calculate_refund_amount()
        assert refund == Decimal('0')
    
    def test_no_show_transition(self, upcoming_trip):
        """Test marking customer as no-show"""
        # Set departure to past
        upcoming_trip.departure_date = datetime.now() - timedelta(hours=1)
        success = upcoming_trip.mark_no_show()
        
        assert success is True
        assert upcoming_trip.status == TripStatus.NO_SHOW
    
    def test_cannot_mark_no_show_before_departure(self, upcoming_trip):
        """Test cannot mark no-show before departure time"""
        success = upcoming_trip.mark_no_show()
        
        assert success is False
        assert upcoming_trip.status == TripStatus.UPCOMING
    
    def test_can_modify_within_time_limit(self, upcoming_trip):
        """Test trip can be modified if > 2 days until departure"""
        upcoming_trip.departure_date = datetime.now() + timedelta(days=5)
        assert upcoming_trip.can_be_modified is True
    
    def test_cannot_modify_too_close_to_departure(self, upcoming_trip):
        """Test trip cannot be modified if <= 2 days until departure"""
        upcoming_trip.departure_date = datetime.now() + timedelta(days=1)
        assert upcoming_trip.can_be_modified is False
    
    def test_invalid_transition_blocked(self, in_progress_trip):
        """Test invalid state transitions are blocked"""
        # Cannot go from in_progress to pending
        success = in_progress_trip.transition_to(TripStatus.PENDING)
        
        assert success is False
        assert in_progress_trip.status == TripStatus.IN_PROGRESS
    
    def test_status_history_tracking(self, pending_trip):
        """Test status changes are tracked in history"""
        pending_trip.paid_amount = Decimal('1000')
        pending_trip.confirm_payment()
        pending_trip.departure_date = datetime.now()
        pending_trip.start_trip()
        
        assert len(pending_trip.status_history) == 2
        assert pending_trip.status_history[0]['from_status'] == TripStatus.PENDING
        assert pending_trip.status_history[0]['to_status'] == TripStatus.UPCOMING
        assert pending_trip.status_history[1]['from_status'] == TripStatus.UPCOMING
        assert pending_trip.status_history[1]['to_status'] == TripStatus.IN_PROGRESS
    
    def test_waiting_list_to_upcoming_transition(self):
        """Test moving trip from waiting list to upcoming"""
        trip = MockTrip('ST-TEST', status=TripStatus.WAITING_LIST)
        success = trip.transition_to(TripStatus.UPCOMING, 'Spot available')
        
        assert success is True
        assert trip.status == TripStatus.UPCOMING
    
    def test_priority_trip_workflow(self):
        """Test VIP/priority trip workflow"""
        trip = MockTrip('ST-VIP', status=TripStatus.UPCOMING)
        
        # Upgrade to priority
        trip.transition_to(TripStatus.PRIORITY, 'VIP upgrade')
        assert trip.status == TripStatus.PRIORITY
        
        # Start priority trip
        trip.departure_date = datetime.now()
        trip.start_trip()
        assert trip.status == TripStatus.IN_PROGRESS
    
    def test_modified_trip_returns_to_upcoming(self):
        """Test modified trip returns to upcoming state"""
        trip = MockTrip('ST-TEST', status=TripStatus.UPCOMING)
        
        # Modify trip
        trip.transition_to(TripStatus.MODIFIED, 'Date changed')
        assert trip.status == TripStatus.MODIFIED
        
        # Return to upcoming
        trip.transition_to(TripStatus.UPCOMING, 'Modification confirmed')
        assert trip.status == TripStatus.UPCOMING


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
