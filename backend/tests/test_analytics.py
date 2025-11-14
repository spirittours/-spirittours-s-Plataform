"""
Analytics Dashboard Tests
Tests for analytics endpoints, data aggregation, and admin access
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta


@pytest.mark.analytics
class TestAnalyticsAccess:
    """Test analytics access control"""
    
    def test_analytics_requires_auth(self, client: TestClient):
        """Test analytics endpoints require authentication"""
        response = client.get("/api/v1/analytics/overview")
        assert response.status_code == 403
    
    def test_analytics_requires_admin(self, client: TestClient, auth_headers: dict):
        """Test analytics endpoints require admin role"""
        response = client.get("/api/v1/analytics/overview", headers=auth_headers)
        assert response.status_code == 403
    
    def test_analytics_works_for_admin(self, client: TestClient, admin_headers: dict):
        """Test analytics endpoints work for admin"""
        response = client.get("/api/v1/analytics/overview", headers=admin_headers)
        assert response.status_code == 200


@pytest.mark.analytics
class TestOverviewMetrics:
    """Test overview metrics endpoint"""
    
    def test_get_overview_metrics(self, client: TestClient, admin_headers: dict):
        """Test getting overview metrics"""
        response = client.get("/api/v1/analytics/overview", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "users" in data
        assert "bookings" in data
        assert "revenue" in data
        assert "reviews" in data
        assert "period" in data
        
        # Check user metrics
        assert "total" in data["users"]
        assert "new" in data["users"]
        
        # Check revenue metrics
        assert "total" in data["revenue"]
        assert "currency" in data["revenue"]
    
    def test_overview_metrics_with_date_range(self, client: TestClient, admin_headers: dict):
        """Test overview metrics with custom date range"""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = client.get(
            "/api/v1/analytics/overview",
            headers=admin_headers,
            params={
                "start_date": start_date,
                "end_date": end_date
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["period"]["start"] is not None
        assert data["period"]["end"] is not None


@pytest.mark.analytics
class TestSalesAnalytics:
    """Test sales analytics endpoint"""
    
    def test_get_sales_analytics(self, client: TestClient, admin_headers: dict):
        """Test getting sales analytics"""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = client.get(
            "/api/v1/analytics/sales",
            headers=admin_headers,
            params={
                "start_date": start_date,
                "end_date": end_date,
                "group_by": "day"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "summary" in data
        assert isinstance(data["data"], list)
    
    def test_sales_analytics_grouping(self, client: TestClient, admin_headers: dict):
        """Test sales analytics with different groupings"""
        start_date = (datetime.utcnow() - timedelta(days=90)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        for group_by in ["day", "week", "month"]:
            response = client.get(
                "/api/v1/analytics/sales",
                headers=admin_headers,
                params={
                    "start_date": start_date,
                    "end_date": end_date,
                    "group_by": group_by
                }
            )
            
            assert response.status_code == 200
            assert "data" in response.json()


@pytest.mark.analytics
class TestTopTours:
    """Test top tours analytics"""
    
    def test_get_top_tours(self, client: TestClient, admin_headers: dict):
        """Test getting top selling tours"""
        response = client.get(
            "/api/v1/analytics/tours/top",
            headers=admin_headers,
            params={"limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "tours" in data
        assert "total_revenue" in data
        assert isinstance(data["tours"], list)
        assert len(data["tours"]) <= 10


@pytest.mark.analytics
class TestUserAnalytics:
    """Test user analytics endpoints"""
    
    def test_get_user_growth(self, client: TestClient, admin_headers: dict):
        """Test getting user growth analytics"""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = client.get(
            "/api/v1/analytics/users/growth",
            headers=admin_headers,
            params={
                "start_date": start_date,
                "end_date": end_date
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "summary" in data
    
    def test_get_user_engagement(self, client: TestClient, admin_headers: dict):
        """Test getting user engagement metrics"""
        response = client.get(
            "/api/v1/analytics/users/engagement",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "users_with_bookings" in data
        assert "engagement_rate" in data


@pytest.mark.analytics
class TestTourPerformance:
    """Test tour performance analytics"""
    
    def test_get_tour_performance(self, client: TestClient, test_tour: dict, admin_headers: dict):
        """Test getting tour performance metrics"""
        response = client.get(
            f"/api/v1/analytics/tours/{test_tour['id']}/performance",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "tour_id" in data
        assert "bookings" in data
        assert "revenue" in data
        assert "reviews" in data


@pytest.mark.analytics
class TestDataExport:
    """Test analytics data export"""
    
    def test_export_csv(self, client: TestClient, admin_headers: dict):
        """Test exporting analytics data as CSV"""
        response = client.post(
            "/api/v1/analytics/export",
            headers=admin_headers,
            json={
                "report_type": "sales",
                "format": "csv",
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            }
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
    
    def test_export_json(self, client: TestClient, admin_headers: dict):
        """Test exporting analytics data as JSON"""
        response = client.post(
            "/api/v1/analytics/export",
            headers=admin_headers,
            json={
                "report_type": "overview",
                "format": "json",
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "end_date": datetime.utcnow().isoformat()
            }
        )
        
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]


@pytest.mark.analytics
class TestAnalyticsHealth:
    """Test analytics health check"""
    
    def test_analytics_health(self, client: TestClient):
        """Test analytics health check endpoint"""
        response = client.get("/api/v1/analytics/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["module"] == "analytics"
        assert "endpoints" in data
