"""
Reviews System Tests
Tests for review creation, moderation, statistics, and permissions
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.reviews
class TestReviewCreation:
    """Test review creation functionality"""
    
    def test_create_review_success(self, client: TestClient, completed_booking: dict, 
                                   test_user: dict, test_tour: dict, auth_headers: dict):
        """Test successful review creation"""
        response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "booking_id": completed_booking["id"],
                "rating": 5,
                "title": "Amazing tour!",
                "comment": "This was an incredible experience"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["rating"] == 5
        assert data["title"] == "Amazing tour!"
        assert data["status"] == "pending"
        assert data["verified_purchase"] == True
    
    def test_create_review_without_booking(self, client: TestClient, test_tour: dict, 
                                          auth_headers: dict):
        """Test review creation fails without completed booking"""
        response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "rating": 5,
                "title": "Test Review",
                "comment": "Test comment"
            }
        )
        
        assert response.status_code == 400
        assert "complete a booking" in response.json()["detail"].lower()
    
    def test_create_duplicate_review(self, client: TestClient, completed_booking: dict,
                                     test_tour: dict, auth_headers: dict):
        """Test that user cannot create multiple reviews for same tour"""
        # Create first review
        client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "booking_id": completed_booking["id"],
                "rating": 5,
                "title": "First Review",
                "comment": "First comment"
            }
        )
        
        # Try to create second review
        response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "rating": 4,
                "title": "Second Review",
                "comment": "Second comment"
            }
        )
        
        assert response.status_code == 400
        assert "already reviewed" in response.json()["detail"].lower()
    
    def test_create_review_invalid_rating(self, client: TestClient, completed_booking: dict,
                                         test_tour: dict, auth_headers: dict):
        """Test review creation with invalid rating fails"""
        # Rating too low
        response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "rating": 0,
                "title": "Test",
                "comment": "Test"
            }
        )
        assert response.status_code == 422
        
        # Rating too high
        response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "rating": 6,
                "title": "Test",
                "comment": "Test"
            }
        )
        assert response.status_code == 422
    
    def test_create_review_no_auth(self, client: TestClient, test_tour: dict):
        """Test review creation fails without authentication"""
        response = client.post(
            "/api/v1/reviews",
            json={
                "tour_id": test_tour["id"],
                "rating": 5,
                "title": "Test",
                "comment": "Test"
            }
        )
        
        assert response.status_code == 403


@pytest.mark.reviews
class TestReviewRetrieval:
    """Test review retrieval functionality"""
    
    def test_get_tour_reviews(self, client: TestClient, test_tour: dict):
        """Test getting reviews for a tour"""
        response = client.get(f"/api/v1/reviews/tour/{test_tour['id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert "reviews" in data
        assert "pagination" in data
        assert isinstance(data["reviews"], list)
    
    def test_get_review_stats(self, client: TestClient, test_tour: dict):
        """Test getting review statistics for a tour"""
        response = client.get(f"/api/v1/reviews/stats/{test_tour['id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_reviews" in data
        assert "average_rating" in data
        assert "rating_distribution" in data


@pytest.mark.reviews
class TestReviewModeration:
    """Test review moderation functionality"""
    
    def test_approve_review_as_admin(self, client: TestClient, completed_booking: dict,
                                     test_tour: dict, test_user: dict, auth_headers: dict,
                                     admin_headers: dict):
        """Test admin can approve reviews"""
        # Create review
        create_response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "booking_id": completed_booking["id"],
                "rating": 5,
                "title": "Test Review",
                "comment": "Test comment"
            }
        )
        review_id = create_response.json()["id"]
        
        # Approve as admin
        response = client.post(
            f"/api/v1/reviews/{review_id}/moderate",
            headers=admin_headers,
            json={"action": "approve"}
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "approved"
    
    def test_moderate_review_as_non_admin(self, client: TestClient, completed_booking: dict,
                                         test_tour: dict, auth_headers: dict):
        """Test non-admin cannot moderate reviews"""
        # Create review
        create_response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "booking_id": completed_booking["id"],
                "rating": 5,
                "title": "Test Review",
                "comment": "Test comment"
            }
        )
        review_id = create_response.json()["id"]
        
        # Try to moderate as regular user
        response = client.post(
            f"/api/v1/reviews/{review_id}/moderate",
            headers=auth_headers,
            json={"action": "approve"}
        )
        
        assert response.status_code == 403


@pytest.mark.reviews
@pytest.mark.integration
class TestReviewWorkflow:
    """Test complete review workflow"""
    
    def test_complete_review_lifecycle(self, client: TestClient, completed_booking: dict,
                                      test_tour: dict, auth_headers: dict, admin_headers: dict):
        """Test full review lifecycle: create -> approve -> update -> helpful"""
        # Create review
        create_response = client.post(
            "/api/v1/reviews",
            headers=auth_headers,
            json={
                "tour_id": test_tour["id"],
                "booking_id": completed_booking["id"],
                "rating": 5,
                "title": "Great tour!",
                "comment": "Really enjoyed it"
            }
        )
        
        assert create_response.status_code == 201
        review_id = create_response.json()["id"]
        assert create_response.json()["status"] == "pending"
        
        # Approve as admin
        approve_response = client.post(
            f"/api/v1/reviews/{review_id}/moderate",
            headers=admin_headers,
            json={"action": "approve"}
        )
        
        assert approve_response.status_code == 200
        assert approve_response.json()["status"] == "approved"
        
        # Update review
        update_response = client.put(
            f"/api/v1/reviews/{review_id}",
            headers=auth_headers,
            json={
                "title": "Updated: Great tour!",
                "comment": "Really enjoyed it - updated"
            }
        )
        
        assert update_response.status_code == 200
        assert update_response.json()["title"] == "Updated: Great tour!"
        
        # Mark as helpful
        helpful_response = client.post(
            f"/api/v1/reviews/{review_id}/helpful",
            headers=auth_headers
        )
        
        assert helpful_response.status_code == 200
