"""
Integration tests for Booking API
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, date, timedelta
import json

class TestBookingAPI:
    """Integration tests for booking endpoints"""
    
    @pytest.mark.integration
    def test_create_booking_success(self, client: TestClient, auth_headers, test_user):
        """Test successful booking creation."""
        booking_data = {
            "tour_id": "tour-123",
            "booking_date": "2024-12-25",
            "participants": 2,
            "special_requests": "Vegetarian meals",
            "total_amount": 1500.00
        }
        
        response = client.post(
            "/api/booking/create",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "booking_id" in data
        assert data["booking"]["tour_id"] == "tour-123"
        assert data["booking"]["status"] == "pending"
        assert data["booking"]["user_id"] == test_user.id
    
    @pytest.mark.integration
    def test_create_booking_invalid_date(self, client: TestClient, auth_headers):
        """Test booking creation with invalid date."""
        booking_data = {
            "tour_id": "tour-123",
            "booking_date": "2020-01-01",  # Past date
            "participants": 2,
            "total_amount": 1500.00
        }
        
        response = client.post(
            "/api/booking/create",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "past date" in data["error"].lower()
    
    @pytest.mark.integration
    def test_get_booking_details(self, client: TestClient, auth_headers, test_booking):
        """Test retrieving booking details."""
        response = client.get(
            f"/api/booking/{test_booking.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["booking"]["id"] == test_booking.id
        assert data["booking"]["tour_id"] == test_booking.tour_id
        assert data["booking"]["status"] == "confirmed"
    
    @pytest.mark.integration
    def test_get_booking_unauthorized(self, client: TestClient, test_booking):
        """Test accessing booking without authentication."""
        response = client.get(f"/api/booking/{test_booking.id}")
        
        assert response.status_code == 401
        assert "unauthorized" in response.json()["detail"].lower()
    
    @pytest.mark.integration
    def test_update_booking_status(self, client: TestClient, auth_headers, test_booking):
        """Test updating booking status."""
        update_data = {
            "status": "cancelled",
            "cancellation_reason": "Change of plans"
        }
        
        response = client.put(
            f"/api/booking/{test_booking.id}/status",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["booking"]["status"] == "cancelled"
        assert data["booking"]["cancellation_reason"] == "Change of plans"
    
    @pytest.mark.integration
    def test_list_user_bookings(self, client: TestClient, auth_headers, test_user, db_session):
        """Test listing user's bookings with pagination."""
        # Create multiple test bookings
        for i in range(5):
            booking = Booking(
                id=f"booking-{i}",
                user_id=test_user.id,
                tour_id=f"tour-{i}",
                booking_date=date.today() + timedelta(days=i+1),
                total_amount=1000.00 + (i * 100),
                status="confirmed"
            )
            db_session.add(booking)
        db_session.commit()
        
        # Test pagination
        response = client.get(
            "/api/booking/my-bookings?page=1&limit=3",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["bookings"]) == 3
        assert data["total"] >= 5
        assert data["page"] == 1
        assert data["pages"] >= 2
    
    @pytest.mark.integration
    def test_cancel_booking(self, client: TestClient, auth_headers, test_booking):
        """Test booking cancellation."""
        response = client.post(
            f"/api/booking/{test_booking.id}/cancel",
            json={"reason": "Emergency situation"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["booking"]["status"] == "cancelled"
        assert data["refund"]["initiated"] is True
    
    @pytest.mark.integration
    def test_booking_availability_check(self, client: TestClient, auth_headers):
        """Test checking tour availability."""
        response = client.get(
            "/api/booking/availability?tour_id=tour-123&date=2024-12-25&participants=2",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "remaining_spots" in data
        assert "price_per_person" in data
    
    @pytest.mark.integration
    def test_booking_with_payment(self, client: TestClient, auth_headers):
        """Test booking creation with immediate payment."""
        booking_data = {
            "tour_id": "tour-123",
            "booking_date": "2024-12-25",
            "participants": 2,
            "total_amount": 1500.00,
            "payment_method": "stripe",
            "payment_token": "tok_test_visa"
        }
        
        response = client.post(
            "/api/booking/create-and-pay",
            json=booking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["booking"]["status"] == "confirmed"
        assert data["payment"]["status"] == "completed"
        assert "transaction_id" in data["payment"]
    
    @pytest.mark.integration
    def test_booking_modification(self, client: TestClient, auth_headers, test_booking):
        """Test modifying an existing booking."""
        modification_data = {
            "new_date": "2024-12-26",
            "participants": 3,
            "special_requests": "Need wheelchair access"
        }
        
        response = client.put(
            f"/api/booking/{test_booking.id}/modify",
            json=modification_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["booking"]["participants"] == 3
        assert "wheelchair access" in data["booking"]["special_requests"]
        assert data["price_adjustment"] != 0  # Should have price change
    
    @pytest.mark.integration
    def test_group_booking(self, client: TestClient, auth_headers):
        """Test creating a group booking."""
        group_data = {
            "tour_id": "tour-123",
            "booking_date": "2024-12-25",
            "group_size": 15,
            "group_name": "Company Retreat",
            "contact_person": "John Doe",
            "contact_email": "john@company.com",
            "special_requirements": ["Vegetarian options", "Transportation needed"]
        }
        
        response = client.post(
            "/api/booking/group",
            json=group_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["booking"]["group_size"] == 15
        assert data["discount_applied"] > 0  # Group discount
        assert "group_booking_id" in data
    
    @pytest.mark.integration
    def test_booking_confirmation_email(self, client: TestClient, auth_headers, mock_notification_service):
        """Test that booking confirmation email is sent."""
        booking_data = {
            "tour_id": "tour-123",
            "booking_date": "2024-12-25",
            "participants": 2,
            "total_amount": 1500.00,
            "send_confirmation": True
        }
        
        with patch('backend.services.notification_service.NotificationService', return_value=mock_notification_service):
            response = client.post(
                "/api/booking/create",
                json=booking_data,
                headers=auth_headers
            )
        
        assert response.status_code == 201
        mock_notification_service.send_email.assert_called_once()
        call_args = mock_notification_service.send_email.call_args
        assert "booking_confirmation" in call_args[1]["template"]
    
    @pytest.mark.integration
    def test_booking_invoice_generation(self, client: TestClient, auth_headers, test_booking):
        """Test generating invoice for a booking."""
        response = client.get(
            f"/api/booking/{test_booking.id}/invoice",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert len(response.content) > 0  # PDF content
    
    @pytest.mark.integration
    def test_booking_review_submission(self, client: TestClient, auth_headers, test_booking):
        """Test submitting a review for completed booking."""
        review_data = {
            "rating": 5,
            "title": "Amazing Experience!",
            "comment": "Had a wonderful time on this tour. Highly recommended!",
            "would_recommend": True
        }
        
        response = client.post(
            f"/api/booking/{test_booking.id}/review",
            json=review_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["review"]["rating"] == 5
        assert data["review"]["verified_booking"] is True

from backend.models.booking import Booking
from unittest.mock import patch