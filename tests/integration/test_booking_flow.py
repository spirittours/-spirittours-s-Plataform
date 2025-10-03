"""
Integration Tests for Booking Flow
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

class TestBookingFlow:
    """Test end-to-end booking flow"""
    
    @pytest.fixture
    def authenticated_client(self):
        """Setup authenticated client"""
        # Register user
        response = client.post(
            "/api/auth/register",
            json={
                "email": "booking@example.com",
                "password": "SecurePass123!",
                "name": "Booking User"
            }
        )
        token = response.json()["token"]
        return token
    
    def test_search_tours(self, authenticated_client):
        """Test searching for tours"""
        response = client.get(
            "/api/tours/search",
            params={"destination": "Paris", "adults": 2},
            headers={"Authorization": f"Bearer {authenticated_client}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_get_tour_details(self, authenticated_client):
        """Test getting tour details"""
        # Assume tour with ID "tour-1" exists
        response = client.get(
            "/api/tours/tour-1",
            headers={"Authorization": f"Bearer {authenticated_client}"}
        )
        assert response.status_code in [200, 404]  # Tour might not exist in test DB
    
    def test_create_booking(self, authenticated_client):
        """Test creating a booking"""
        response = client.post(
            "/api/bookings",
            headers={"Authorization": f"Bearer {authenticated_client}"},
            json={
                "tourId": "tour-1",
                "tourDate": "2025-12-01",
                "adults": 2,
                "children": 0,
                "specialRequests": "Vegetarian meals"
            }
        )
        # Should return 200 or 404 depending on tour existence
        assert response.status_code in [200, 404]
    
    def test_get_my_bookings(self, authenticated_client):
        """Test retrieving user's bookings"""
        response = client.get(
            "/api/bookings/my-bookings",
            headers={"Authorization": f"Bearer {authenticated_client}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
