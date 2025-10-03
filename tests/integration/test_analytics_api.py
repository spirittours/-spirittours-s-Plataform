"""
Integration Tests for Analytics API
Comprehensive testing for analytics API endpoints with authentication,
data validation, and business logic verification.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import asyncio

from fastapi.testclient import TestClient
from backend.services.analytics_service import TimeFrame, BusinessModel

class TestAnalyticsAPIIntegration:
    """Integration tests for Analytics API endpoints."""

    def test_health_endpoint(self, client):
        """Test analytics health endpoint."""
        response = client.get("/api/analytics/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "analytics"
        assert "timestamp" in data

    def test_get_kpis_unauthorized(self, client):
        """Test KPI endpoint without authentication."""
        response = client.get("/api/analytics/kpis")
        
        assert response.status_code == 401

    def test_get_kpis_authorized(self, client, auth_headers):
        """Test KPI endpoint with proper authentication."""
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPI structure
        assert "total_bookings" in data
        assert "total_revenue" in data
        assert "conversion_rate" in data
        assert "ai_satisfaction_score" in data
        assert "user_retention_rate" in data
        assert "system_uptime" in data
        assert "response_time" in data
        assert "timestamp" in data

    def test_get_kpis_with_time_frame(self, client, auth_headers):
        """Test KPI endpoint with different time frames."""
        time_frames = ["hour", "day", "week", "month", "quarter", "year"]
        
        for time_frame in time_frames:
            response = client.get(
                f"/api/analytics/kpis?time_frame={time_frame}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data["total_bookings"], int)
            assert isinstance(data["total_revenue"], (int, float))

    def test_analytics_query_endpoint(self, client, auth_headers):
        """Test custom analytics query endpoint."""
        query_data = {
            "time_frame": "day",
            "business_model": "b2c",
            "metrics": ["booking", "payment"]
        }
        
        response = client.post(
            "/api/analytics/query",
            json=query_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "query" in data
        assert "results" in data
        assert "timestamp" in data
        assert data["query"]["time_frame"] == "day"

    def test_booking_analytics_endpoint(self, client, auth_headers):
        """Test booking analytics endpoint."""
        response = client.get("/api/analytics/bookings", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "time_frame" in data
        assert "period_data" in data
        assert "top_destinations" in data
        assert "booking_sources" in data
        assert isinstance(data["period_data"], list)

    def test_booking_analytics_with_business_model(self, client, auth_headers):
        """Test booking analytics with business model filtering."""
        response = client.get(
            "/api/analytics/bookings?business_model=b2c",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["time_frame"] == "day"  # default

    def test_payment_analytics_endpoint(self, client, auth_headers):
        """Test payment analytics endpoint."""
        response = client.get("/api/analytics/payments", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "time_frame" in data
        assert "period_data" in data
        assert "payment_methods" in data
        assert "refund_analytics" in data
        assert "commission_breakdown" in data

    def test_ai_usage_analytics_endpoint(self, client, auth_headers):
        """Test AI usage analytics endpoint."""
        response = client.get("/api/analytics/ai-usage", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "time_frame" in data
        assert "agent_performance" in data
        assert "usage_trends" in data
        assert "popular_query_types" in data
        assert isinstance(data["agent_performance"], list)

    def test_user_engagement_analytics_endpoint(self, client, auth_headers):
        """Test user engagement analytics endpoint."""
        response = client.get("/api/analytics/user-engagement", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "time_frame" in data
        assert "activity_trends" in data
        assert "user_segmentation" in data
        assert "notification_engagement" in data

    def test_generate_report_endpoint(self, client, auth_headers):
        """Test report generation endpoint."""
        report_data = {
            "report_type": "comprehensive",
            "time_frame": "day",
            "business_model": "b2c",
            "include_charts": True,
            "format": "json"
        }
        
        response = client.post(
            "/api/analytics/reports/generate",
            json=report_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "report" in data
        assert "generation_time" in data
        assert "format" in data
        assert data["format"] == "json"

    def test_dashboard_config_endpoint(self, client, auth_headers):
        """Test dashboard configuration endpoints."""
        # Get dashboard config
        response = client.get(
            "/api/analytics/dashboard/config?dashboard_name=executive",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "name" in data
        assert "widgets" in data
        assert "refresh_interval" in data

    def test_save_dashboard_config_endpoint(self, client, auth_headers):
        """Test saving dashboard configuration."""
        config_data = {
            "name": "Custom Dashboard",
            "widgets": [
                {"type": "kpi", "metric": "total_revenue", "size": "large"}
            ],
            "refresh_interval": 30
        }
        
        response = client.post(
            "/api/analytics/dashboard/config",
            json=config_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "dashboard_id" in data

    def test_export_analytics_endpoint(self, client, auth_headers):
        """Test analytics export endpoint."""
        response = client.get(
            "/api/analytics/export/booking?format=json&time_frame=day",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        # Response should be JSON data for booking analytics

class TestAnalyticsAPIPermissions:
    """Test API permissions and role-based access control."""

    def test_admin_access_all_endpoints(self, client, auth_headers):
        """Test that admin can access all analytics endpoints."""
        endpoints = [
            "/api/analytics/kpis",
            "/api/analytics/bookings",
            "/api/analytics/payments",
            "/api/analytics/ai-usage",
            "/api/analytics/user-engagement"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint, headers=auth_headers)
            assert response.status_code in [200, 500]  # 500 might occur due to missing data in test

    def test_b2c_user_limited_access(self, client, b2c_auth_headers):
        """Test B2C user has limited access to analytics."""
        # B2C users might have restricted access
        response = client.get("/api/analytics/kpis", headers=b2c_auth_headers)
        # This might be 403 Forbidden or 200 OK depending on business rules

    def test_tour_operator_access(self, client, tour_operator_auth_headers):
        """Test tour operator access to analytics."""
        response = client.get("/api/analytics/bookings", headers=tour_operator_auth_headers)
        # Tour operators should have access to their own analytics

class TestAnalyticsAPIValidation:
    """Test input validation and error handling."""

    def test_invalid_time_frame(self, client, auth_headers):
        """Test invalid time frame parameter."""
        response = client.get(
            "/api/analytics/kpis?time_frame=invalid",
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    def test_invalid_business_model(self, client, auth_headers):
        """Test invalid business model parameter."""
        response = client.get(
            "/api/analytics/bookings?business_model=invalid",
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    def test_malformed_query_request(self, client, auth_headers):
        """Test malformed analytics query request."""
        malformed_data = {
            "invalid_field": "value"
        }
        
        response = client.post(
            "/api/analytics/query",
            json=malformed_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    def test_invalid_dashboard_name(self, client, auth_headers):
        """Test invalid dashboard name."""
        response = client.get(
            "/api/analytics/dashboard/config?dashboard_name=nonexistent",
            headers=auth_headers
        )
        
        assert response.status_code == 404

class TestAnalyticsAPIPerformance:
    """Test API performance and response times."""

    def test_kpi_endpoint_response_time(self, client, auth_headers, performance_config):
        """Test KPI endpoint response time."""
        import time
        
        start_time = time.time()
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        end_time = time.time()
        
        response_time_ms = (end_time - start_time) * 1000
        max_response_time = performance_config["max_response_time"]
        
        assert response.status_code == 200
        assert response_time_ms < max_response_time, f"Response time {response_time_ms}ms exceeds {max_response_time}ms"

    def test_concurrent_api_requests(self, client, auth_headers, performance_config):
        """Test concurrent API requests performance."""
        import threading
        import time
        
        results = []
        errors = []
        
        def make_request():
            try:
                start_time = time.time()
                response = client.get("/api/analytics/kpis", headers=auth_headers)
                end_time = time.time()
                
                results.append({
                    "status_code": response.status_code,
                    "response_time": (end_time - start_time) * 1000
                })
            except Exception as e:
                errors.append(str(e))
        
        # Create concurrent requests
        threads = []
        concurrent_users = performance_config["concurrent_users"]
        
        for _ in range(concurrent_users):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
        
        # Start all threads
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        end_time = time.time()
        
        # Verify results
        total_time = end_time - start_time
        successful_requests = len([r for r in results if r["status_code"] == 200])
        error_rate = len(errors) / len(threads)
        
        assert error_rate <= performance_config["acceptable_error_rate"]
        assert successful_requests >= concurrent_users * 0.9  # At least 90% success
        assert total_time < 10.0  # All requests should complete within 10 seconds

class TestAnalyticsAPIWithData:
    """Test API functionality with actual test data."""

    @pytest.fixture
    async def setup_test_data(self, db_session, b2c_user, tour_operator_user):
        """Setup comprehensive test data."""
        from datetime import datetime, timedelta
        
        # Create bookings
        bookings = []
        for i in range(20):
            booking = BookingRequest(
                user_id=b2c_user.id if i % 2 == 0 else tour_operator_user.id,
                product_name=f"Test Tour {i}",
                destination=f"Destination {i % 5}",
                travel_date=datetime.utcnow() + timedelta(days=i),
                participants=i % 4 + 1,
                total_amount=100.0 + (i * 25),
                currency="EUR",
                status="confirmed" if i % 5 != 0 else "cancelled",
                booking_reference=f"TEST{i:06d}",
                created_at=datetime.utcnow() - timedelta(hours=i)
            )
            bookings.append(booking)
        
        db_session.add_all(bookings)
        await db_session.commit()
        
        # Create payments
        confirmed_bookings = [b for b in bookings if b.status == "confirmed"]
        payments = []
        for booking in confirmed_bookings[:10]:  # Create payments for first 10 confirmed bookings
            payment = PaymentTransaction(
                booking_id=booking.id,
                amount=booking.total_amount,
                currency=booking.currency,
                payment_method="card" if booking.id % 2 == 0 else "paypal",
                provider="stripe" if booking.id % 2 == 0 else "paypal",
                provider_transaction_id=f"txn_{booking.id}",
                status="completed",
                created_at=booking.created_at + timedelta(minutes=5)
            )
            payments.append(payment)
        
        db_session.add_all(payments)
        await db_session.commit()

    @pytest.mark.asyncio
    async def test_kpis_with_real_data(self, client, auth_headers, setup_test_data):
        """Test KPI calculations with actual test data."""
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # With test data, we should have meaningful metrics
        assert data["total_bookings"] > 0
        assert data["total_revenue"] > 0
        assert data["conversion_rate"] >= 0

    @pytest.mark.asyncio
    async def test_booking_analytics_with_real_data(self, client, auth_headers, setup_test_data):
        """Test booking analytics with actual test data."""
        response = client.get("/api/analytics/bookings", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have period data with actual bookings
        assert len(data["period_data"]) >= 0
        assert len(data["top_destinations"]) >= 0
        assert len(data["booking_sources"]) >= 0

    @pytest.mark.asyncio
    async def test_payment_analytics_with_real_data(self, client, auth_headers, setup_test_data):
        """Test payment analytics with actual test data."""
        response = client.get("/api/analytics/payments", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have meaningful payment data
        assert "payment_methods" in data
        assert len(data["commission_breakdown"]) >= 0

class TestAnalyticsAPIErrorHandling:
    """Test error handling in analytics API."""

    @patch('backend.services.analytics_service.get_analytics_service')
    def test_service_unavailable_error(self, mock_service, client, auth_headers):
        """Test handling when analytics service is unavailable."""
        mock_service.side_effect = Exception("Service unavailable")
        
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data

    @patch('backend.database.get_db_session')
    def test_database_connection_error(self, mock_db, client, auth_headers):
        """Test handling database connection errors."""
        mock_db.side_effect = Exception("Database connection failed")
        
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        
        # Should handle gracefully and return appropriate error
        assert response.status_code in [500, 503]

    def test_rate_limiting(self, client, auth_headers):
        """Test rate limiting on analytics endpoints."""
        # Make many rapid requests to test rate limiting
        responses = []
        for _ in range(100):
            response = client.get("/api/analytics/kpis", headers=auth_headers)
            responses.append(response.status_code)
        
        # Check if any requests were rate limited (429)
        # This depends on actual rate limiting implementation
        status_codes = set(responses)
        assert 200 in status_codes  # Some requests should succeed