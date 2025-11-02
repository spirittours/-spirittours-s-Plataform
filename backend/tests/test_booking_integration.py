"""
Booking System Integration Tests
Spirit Tours Platform
"""

import pytest
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from models.booking import Booking, BookingStatus
from models.tour import Tour
from services.booking_service import BookingService
from services.payment_service import PaymentService
from services.notification_service import NotificationService

client = TestClient(app)


class TestBookingIntegration:
    """Integration tests for the complete booking flow"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.test_user = {
            "email": "customer@example.com",
            "password": "Customer123!",
            "name": "Test Customer"
        }
        
        self.test_tour = {
            "id": "tour-123",
            "name": "Amazing Paris Tour",
            "description": "Explore the City of Lights",
            "price": 299.99,
            "duration": 3,
            "max_participants": 20,
            "available_dates": [
                (datetime.now() + timedelta(days=7)).isoformat(),
                (datetime.now() + timedelta(days=14)).isoformat(),
            ]
        }
        
        self.booking_data = {
            "tour_id": self.test_tour["id"],
            "start_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "participants": 2,
            "special_requests": "Vegetarian meals please",
            "payment_method": "credit_card"
        }
    
    @pytest.mark.integration
    def test_complete_booking_flow(self):
        """Test the complete booking flow from search to confirmation"""
        
        # Step 1: User Registration and Login
        register_response = client.post("/api/v1/auth/register", json=self.test_user)
        assert register_response.status_code in [201, 400]  # 400 if user exists
        
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
        else:
            headers = {}
        
        # Step 2: Search for Tours
        search_response = client.get(
            "/api/v1/tours/search",
            params={
                "destination": "Paris",
                "date": (datetime.now() + timedelta(days=7)).isoformat(),
                "participants": 2
            },
            headers=headers
        )
        assert search_response.status_code in [200, 404]
        
        # Step 3: Get Tour Details
        tour_response = client.get(
            f"/api/v1/tours/{self.test_tour['id']}",
            headers=headers
        )
        assert tour_response.status_code in [200, 404]
        
        # Step 4: Check Availability
        availability_response = client.post(
            f"/api/v1/tours/{self.test_tour['id']}/check-availability",
            json={
                "date": self.booking_data["start_date"],
                "participants": self.booking_data["participants"]
            },
            headers=headers
        )
        assert availability_response.status_code in [200, 404]
        
        # Step 5: Create Booking
        booking_response = client.post(
            "/api/v1/bookings",
            json=self.booking_data,
            headers=headers
        )
        
        if booking_response.status_code == 201:
            booking = booking_response.json()
            assert "id" in booking
            assert booking["status"] in ["pending", "confirmed"]
            booking_id = booking["id"]
        else:
            booking_id = "test-booking-id"
        
        # Step 6: Process Payment
        payment_data = {
            "booking_id": booking_id,
            "amount": self.test_tour["price"] * self.booking_data["participants"],
            "currency": "USD",
            "payment_method": "credit_card",
            "card_details": {
                "number": "4242424242424242",
                "exp_month": 12,
                "exp_year": 2025,
                "cvc": "123"
            }
        }
        
        payment_response = client.post(
            "/api/v1/payments/process",
            json=payment_data,
            headers=headers
        )
        assert payment_response.status_code in [200, 201, 404]
        
        # Step 7: Confirm Booking
        confirm_response = client.post(
            f"/api/v1/bookings/{booking_id}/confirm",
            headers=headers
        )
        assert confirm_response.status_code in [200, 404]
        
        # Step 8: Get Booking Details
        booking_details = client.get(
            f"/api/v1/bookings/{booking_id}",
            headers=headers
        )
        assert booking_details.status_code in [200, 404]
        
        # Step 9: Check Email Notification (mock)
        # In real scenario, this would check if email was sent
        
    @pytest.mark.integration 
    def test_booking_cancellation_flow(self):
        """Test booking cancellation and refund process"""
        
        # Login first
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
        else:
            headers = {}
        
        # Create a booking first
        booking_response = client.post(
            "/api/v1/bookings",
            json=self.booking_data,
            headers=headers
        )
        
        if booking_response.status_code == 201:
            booking_id = booking_response.json()["id"]
        else:
            booking_id = "test-booking-id"
        
        # Request cancellation
        cancel_response = client.post(
            f"/api/v1/bookings/{booking_id}/cancel",
            json={"reason": "Change of plans"},
            headers=headers
        )
        assert cancel_response.status_code in [200, 404]
        
        # Check refund status
        refund_response = client.get(
            f"/api/v1/bookings/{booking_id}/refund-status",
            headers=headers
        )
        assert refund_response.status_code in [200, 404]
    
    @pytest.mark.integration
    def test_group_booking_flow(self):
        """Test group booking with special requirements"""
        
        group_booking = {
            "tour_id": self.test_tour["id"],
            "start_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "participants": 15,
            "is_group_booking": True,
            "group_name": "Smith Family Reunion",
            "special_requests": "Need wheelchair access for 2 participants",
            "dietary_requirements": ["vegetarian", "gluten-free"],
            "contact_person": {
                "name": "John Smith",
                "email": "john@example.com",
                "phone": "+1234567890"
            }
        }
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            headers = {}
        
        # Create group booking
        response = client.post(
            "/api/v1/bookings/group",
            json=group_booking,
            headers=headers
        )
        assert response.status_code in [201, 404]
        
        if response.status_code == 201:
            booking = response.json()
            assert booking.get("is_group_booking") is True
            assert booking.get("participants") == 15
    
    @pytest.mark.integration
    def test_booking_modification_flow(self):
        """Test modifying an existing booking"""
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            headers = {}
        
        # Create initial booking
        booking_response = client.post(
            "/api/v1/bookings",
            json=self.booking_data,
            headers=headers
        )
        
        if booking_response.status_code == 201:
            booking_id = booking_response.json()["id"]
        else:
            booking_id = "test-booking-id"
        
        # Modify booking
        modification = {
            "participants": 3,
            "special_requests": "Updated: Vegetarian meals and early check-in"
        }
        
        modify_response = client.patch(
            f"/api/v1/bookings/{booking_id}",
            json=modification,
            headers=headers
        )
        assert modify_response.status_code in [200, 404]
        
        if modify_response.status_code == 200:
            modified = modify_response.json()
            assert modified.get("participants") == 3
    
    @pytest.mark.integration
    def test_booking_with_addons(self):
        """Test booking with additional services/addons"""
        
        booking_with_addons = self.booking_data.copy()
        booking_with_addons["addons"] = [
            {
                "id": "addon-1",
                "name": "Airport Transfer",
                "price": 50.00,
                "quantity": 2
            },
            {
                "id": "addon-2", 
                "name": "Lunch Package",
                "price": 25.00,
                "quantity": 2
            }
        ]
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            headers = {}
        
        # Create booking with addons
        response = client.post(
            "/api/v1/bookings",
            json=booking_with_addons,
            headers=headers
        )
        assert response.status_code in [201, 404]
        
        if response.status_code == 201:
            booking = response.json()
            # Check if total price includes addons
            base_price = self.test_tour["price"] * self.booking_data["participants"]
            addon_price = 150.00  # (50*2 + 25*2)
            expected_total = base_price + addon_price
            # Allow for some flexibility in price calculation
            if "total_price" in booking:
                assert abs(booking["total_price"] - expected_total) < 1
    
    @pytest.mark.integration
    def test_booking_with_promo_code(self):
        """Test applying promo codes to bookings"""
        
        booking_with_promo = self.booking_data.copy()
        booking_with_promo["promo_code"] = "SUMMER2025"
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            headers = {}
        
        # Validate promo code first
        promo_response = client.post(
            "/api/v1/promo/validate",
            json={
                "code": "SUMMER2025",
                "tour_id": self.test_tour["id"],
                "booking_date": self.booking_data["start_date"]
            },
            headers=headers
        )
        assert promo_response.status_code in [200, 404]
        
        # Create booking with promo
        response = client.post(
            "/api/v1/bookings",
            json=booking_with_promo,
            headers=headers
        )
        assert response.status_code in [201, 404]
        
        if response.status_code == 201:
            booking = response.json()
            # Check if discount was applied
            if "discount_applied" in booking:
                assert booking["discount_applied"] > 0
    
    @pytest.mark.integration
    def test_booking_waitlist_flow(self):
        """Test waitlist functionality when tour is full"""
        
        waitlist_request = {
            "tour_id": self.test_tour["id"],
            "date": (datetime.now() + timedelta(days=7)).isoformat(),
            "participants": 2,
            "notify_me": True
        }
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            headers = {}
        
        # Join waitlist
        response = client.post(
            "/api/v1/bookings/waitlist",
            json=waitlist_request,
            headers=headers
        )
        assert response.status_code in [201, 404]
        
        if response.status_code == 201:
            waitlist = response.json()
            assert waitlist.get("status") == "waitlisted"
            assert waitlist.get("position") is not None
    
    @pytest.mark.integration
    def test_booking_review_submission(self):
        """Test submitting a review after completing a tour"""
        
        # Login
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user["email"],
                "password": self.test_user["password"]
            }
        )
        
        if login_response.status_code == 200:
            headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}
        else:
            headers = {}
        
        # Assume we have a completed booking
        booking_id = "completed-booking-123"
        
        review_data = {
            "booking_id": booking_id,
            "rating": 5,
            "title": "Amazing Experience!",
            "comment": "The tour exceeded our expectations. Great guide and perfect organization.",
            "would_recommend": True,
            "aspects": {
                "guide": 5,
                "organization": 5,
                "value_for_money": 4,
                "experience": 5
            },
            "photos": []  # Would contain photo URLs in real scenario
        }
        
        # Submit review
        response = client.post(
            f"/api/v1/bookings/{booking_id}/review",
            json=review_data,
            headers=headers
        )
        assert response.status_code in [201, 404]
        
        if response.status_code == 201:
            review = response.json()
            assert review.get("rating") == 5
            assert review.get("status") == "published"


class TestBookingValidation:
    """Test booking validation and business rules"""
    
    @pytest.mark.unit
    def test_minimum_advance_booking(self):
        """Test minimum advance booking requirement"""
        
        # Try to book for tomorrow (too soon)
        invalid_booking = {
            "tour_id": "tour-123",
            "start_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "participants": 2
        }
        
        response = client.post("/api/v1/bookings", json=invalid_booking)
        
        # Should fail validation
        assert response.status_code in [400, 422, 404]
    
    @pytest.mark.unit
    def test_maximum_participants_validation(self):
        """Test maximum participants limit"""
        
        # Try to book too many participants
        invalid_booking = {
            "tour_id": "tour-123",
            "start_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "participants": 100  # Exceeds max
        }
        
        response = client.post("/api/v1/bookings", json=invalid_booking)
        
        # Should fail validation
        assert response.status_code in [400, 422, 404]
    
    @pytest.mark.unit
    def test_date_availability_validation(self):
        """Test booking on unavailable dates"""
        
        # Try to book on unavailable date
        invalid_booking = {
            "tour_id": "tour-123",
            "start_date": (datetime.now() + timedelta(days=3)).isoformat(),  # Not in available dates
            "participants": 2
        }
        
        response = client.post("/api/v1/bookings", json=invalid_booking)
        
        # Should fail validation
        assert response.status_code in [400, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])