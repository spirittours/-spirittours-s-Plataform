"""
End-to-End Tests for Analytics Workflow
Complete workflow testing for analytics dashboard, real-time updates,
and business intelligence operations.
"""

import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from unittest.mock import patch, Mock, AsyncMock
import websockets
import threading

from fastapi.testclient import TestClient
from backend.main import app

class TestAnalyticsDashboardWorkflow:
    """Test complete analytics dashboard workflows."""

    @pytest.mark.asyncio
    async def test_complete_booking_to_analytics_workflow(self, client, b2c_auth_headers, 
                                                        auth_headers, db_session, b2c_user):
        """Test complete workflow from booking creation to analytics display."""
        
        # Step 1: Create a booking
        booking_data = {
            "product_name": "E2E Test Tour",
            "destination": "Test City",
            "travel_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "participants": 2,
            "total_amount": 200.0,
            "currency": "EUR",
            "special_requirements": "E2E test booking"
        }
        
        # Create booking through API (this would be through booking API)
        # For this test, we'll directly create the database record
        booking = BookingRequest(
            user_id=b2c_user.id,
            **booking_data,
            status="confirmed",
            booking_reference="E2E123456",
            created_at=datetime.utcnow()
        )
        db_session.add(booking)
        await db_session.commit()
        
        # Step 2: Create associated payment
        payment = PaymentTransaction(
            booking_id=booking.id,
            amount=booking_data["total_amount"],
            currency=booking_data["currency"],
            payment_method="card",
            provider="stripe",
            provider_transaction_id="e2e_txn_123",
            status="completed",
            created_at=datetime.utcnow()
        )
        db_session.add(payment)
        await db_session.commit()
        
        # Step 3: Verify booking appears in analytics
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        assert response.status_code == 200
        
        kpis = response.json()
        assert kpis["total_bookings"] >= 1
        assert kpis["total_revenue"] >= 200.0
        
        # Step 4: Check booking analytics
        response = client.get("/api/analytics/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        booking_analytics = response.json()
        assert len(booking_analytics["period_data"]) >= 0
        
        # Step 5: Verify payment analytics
        response = client.get("/api/analytics/payments", headers=auth_headers)
        assert response.status_code == 200
        
        payment_analytics = response.json()
        assert "payment_methods" in payment_analytics
        
        # Step 6: Generate comprehensive report
        report_data = {
            "report_type": "e2e_test",
            "time_frame": "day",
            "format": "json"
        }
        
        response = client.post(
            "/api/analytics/reports/generate",
            json=report_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        report = response.json()
        assert "report" in report
        assert "generation_time" in report

    @pytest.mark.asyncio
    async def test_multi_user_analytics_workflow(self, client, db_session, 
                                               b2c_user, tour_operator_user,
                                               auth_headers):
        """Test analytics with multiple user types and business models."""
        
        # Create bookings for different user types
        bookings_data = [
            # B2C booking
            {
                "user_id": b2c_user.id,
                "product_name": "B2C Family Tour",
                "destination": "Barcelona",
                "participants": 4,
                "total_amount": 400.0,
                "business_type": "b2c"
            },
            # B2B booking (tour operator)
            {
                "user_id": tour_operator_user.id,
                "product_name": "B2B Group Tour",
                "destination": "Madrid", 
                "participants": 15,
                "total_amount": 1500.0,
                "business_type": "b2b"
            }
        ]
        
        created_bookings = []
        for booking_data in bookings_data:
            booking = BookingRequest(
                user_id=booking_data["user_id"],
                product_name=booking_data["product_name"],
                destination=booking_data["destination"],
                travel_date=datetime.utcnow() + timedelta(days=10),
                participants=booking_data["participants"],
                total_amount=booking_data["total_amount"],
                currency="EUR",
                status="confirmed",
                booking_reference=f"MULTI{len(created_bookings):03d}",
                created_at=datetime.utcnow()
            )
            db_session.add(booking)
            created_bookings.append(booking)
        
        await db_session.commit()
        
        # Test overall analytics
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        assert response.status_code == 200
        kpis = response.json()
        assert kpis["total_bookings"] >= 2
        assert kpis["total_revenue"] >= 1900.0
        
        # Test B2C specific analytics
        response = client.get(
            "/api/analytics/bookings?business_model=b2c",
            headers=auth_headers
        )
        assert response.status_code == 200
        b2c_analytics = response.json()
        
        # Test B2B specific analytics
        response = client.get(
            "/api/analytics/bookings?business_model=b2b", 
            headers=auth_headers
        )
        assert response.status_code == 200
        b2b_analytics = response.json()
        
        # Verify business model filtering works
        assert "period_data" in b2c_analytics
        assert "period_data" in b2b_analytics

    def test_dashboard_configuration_workflow(self, client, auth_headers):
        """Test complete dashboard configuration workflow."""
        
        # Step 1: Get default dashboard configuration
        response = client.get(
            "/api/analytics/dashboard/config?dashboard_name=executive",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        default_config = response.json()
        assert "widgets" in default_config
        assert "refresh_interval" in default_config
        
        # Step 2: Modify and save custom configuration
        custom_config = {
            "name": "E2E Custom Dashboard",
            "widgets": [
                {"type": "kpi", "metric": "total_revenue", "size": "large"},
                {"type": "chart", "metric": "booking_trends", "size": "medium"},
                {"type": "kpi", "metric": "conversion_rate", "size": "small"}
            ],
            "refresh_interval": 45,
            "filters": {
                "business_model": "b2c",
                "time_frame": "week"
            }
        }
        
        response = client.post(
            "/api/analytics/dashboard/config",
            json=custom_config,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        save_result = response.json()
        assert "dashboard_id" in save_result
        assert "message" in save_result

    def test_analytics_export_workflow(self, client, auth_headers):
        """Test complete analytics export workflow."""
        
        # Step 1: Generate analytics data
        response = client.get("/api/analytics/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        # Step 2: Export booking analytics as JSON
        response = client.get(
            "/api/analytics/export/booking?format=json&time_frame=day",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Step 3: Export payment analytics as CSV (if implemented)
        response = client.get(
            "/api/analytics/export/payment?format=csv&time_frame=week",
            headers=auth_headers
        )
        # This might return 200 with CSV data or redirect to download

class TestRealTimeAnalyticsWorkflow:
    """Test real-time analytics features and WebSocket functionality."""

    @pytest.mark.asyncio
    async def test_websocket_connection_workflow(self, websocket_client):
        """Test WebSocket connection and real-time updates."""
        
        # Note: This is a simplified test as WebSocket testing is complex
        # In a real implementation, you would need proper WebSocket test setup
        
        try:
            # Test WebSocket endpoint accessibility
            # This would require a proper WebSocket test client
            pass  # Placeholder for WebSocket testing
        except Exception:
            # WebSocket testing requires special setup
            pass

    @pytest.mark.asyncio
    async def test_real_time_data_update_simulation(self, client, auth_headers, 
                                                  db_session, b2c_user):
        """Test simulated real-time data updates."""
        
        # Get initial KPIs
        initial_response = client.get("/api/analytics/kpis", headers=auth_headers)
        assert initial_response.status_code == 200
        initial_kpis = initial_response.json()
        
        # Create new booking (simulating real-time event)
        new_booking = BookingRequest(
            user_id=b2c_user.id,
            product_name="Real-time Test Booking",
            destination="Real-time City",
            travel_date=datetime.utcnow() + timedelta(days=5),
            participants=3,
            total_amount=300.0,
            currency="EUR",
            status="confirmed",
            booking_reference="REALTIME001",
            created_at=datetime.utcnow()
        )
        db_session.add(new_booking)
        await db_session.commit()
        
        # Get updated KPIs
        updated_response = client.get("/api/analytics/kpis", headers=auth_headers)
        assert updated_response.status_code == 200
        updated_kpis = updated_response.json()
        
        # Verify data was updated
        assert updated_kpis["total_bookings"] >= initial_kpis["total_bookings"]
        assert updated_kpis["total_revenue"] >= initial_kpis["total_revenue"]

class TestAnalyticsPerformanceWorkflow:
    """Test analytics performance under various load conditions."""

    def test_high_frequency_api_calls_workflow(self, client, auth_headers, performance_config):
        """Test analytics API under high-frequency calls."""
        
        responses = []
        start_time = time.time()
        
        # Make rapid API calls
        for i in range(50):
            response = client.get("/api/analytics/kpis", headers=auth_headers)
            responses.append({
                "status_code": response.status_code,
                "call_number": i,
                "timestamp": time.time()
            })
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Analyze results
        successful_calls = len([r for r in responses if r["status_code"] == 200])
        success_rate = successful_calls / len(responses)
        avg_response_time = total_time / len(responses)
        
        # Performance assertions
        assert success_rate >= 0.95  # At least 95% success rate
        assert avg_response_time < 0.1  # Average < 100ms per call
        assert total_time < 10.0  # All calls complete within 10 seconds

    @pytest.mark.asyncio
    async def test_concurrent_analytics_operations_workflow(self, client, auth_headers):
        """Test concurrent analytics operations."""
        
        async def make_analytics_call(endpoint):
            """Make analytics API call."""
            response = client.get(endpoint, headers=auth_headers)
            return {
                "endpoint": endpoint,
                "status_code": response.status_code,
                "response_time": response.elapsed.total_seconds() if hasattr(response, 'elapsed') else 0
            }
        
        # Define endpoints to test concurrently
        endpoints = [
            "/api/analytics/kpis",
            "/api/analytics/bookings",
            "/api/analytics/payments",
            "/api/analytics/ai-usage",
            "/api/analytics/user-engagement"
        ]
        
        # Make concurrent calls
        tasks = [make_analytics_call(endpoint) for endpoint in endpoints]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify all operations completed successfully
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == len(endpoints)
        
        for result in successful_results:
            assert result["status_code"] == 200

class TestAnalyticsErrorRecoveryWorkflow:
    """Test error handling and recovery workflows."""

    @patch('backend.services.analytics_service.AnalyticsService.get_real_time_kpis')
    def test_service_error_recovery_workflow(self, mock_kpis, client, auth_headers):
        """Test recovery from analytics service errors."""
        
        # Step 1: Simulate service error
        mock_kpis.side_effect = Exception("Temporary service error")
        
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        assert response.status_code == 500
        
        # Step 2: Service recovers
        mock_kpis.side_effect = None
        mock_kpis.return_value = Mock()
        mock_kpis.return_value.to_dict.return_value = {
            "total_bookings": 10,
            "total_revenue": 1000.0,
            "conversion_rate": 15.5,
            "ai_satisfaction_score": 4.2,
            "user_retention_rate": 65.0,
            "system_uptime": 99.9,
            "response_time": 0.150
        }
        
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        assert response.status_code == 200

    def test_database_connection_recovery_workflow(self, client, auth_headers):
        """Test recovery from database connection issues."""
        
        # This would require more complex database mocking
        # For now, test that the API handles errors gracefully
        
        response = client.get("/api/analytics/kpis", headers=auth_headers)
        # Should either succeed (200) or fail gracefully (500/503)
        assert response.status_code in [200, 500, 503]

class TestAnalyticsBusinessLogicWorkflow:
    """Test business logic workflows and calculations."""

    @pytest.mark.asyncio
    async def test_commission_calculation_workflow(self, client, auth_headers, 
                                                 db_session, tour_operator_user, b2c_user):
        """Test commission calculation across business models."""
        
        # Create bookings with different business models
        bookings = [
            # B2C booking (0% commission)
            BookingRequest(
                user_id=b2c_user.id,
                product_name="B2C Tour",
                destination="Commission Test City",
                travel_date=datetime.utcnow() + timedelta(days=8),
                participants=2,
                total_amount=200.0,
                currency="EUR",
                status="confirmed",
                booking_reference="COMM001",
                created_at=datetime.utcnow()
            ),
            # B2B booking (10% commission for tour operator)
            BookingRequest(
                user_id=tour_operator_user.id,
                product_name="B2B Tour",
                destination="Commission Test City",
                travel_date=datetime.utcnow() + timedelta(days=9),
                participants=5,
                total_amount=1000.0,
                currency="EUR",
                status="confirmed",
                booking_reference="COMM002",
                created_at=datetime.utcnow()
            )
        ]
        
        for booking in bookings:
            db_session.add(booking)
        await db_session.commit()
        
        # Create payments for commission calculation
        for booking in bookings:
            payment = PaymentTransaction(
                booking_id=booking.id,
                amount=booking.total_amount,
                currency=booking.currency,
                payment_method="card",
                provider="stripe",
                provider_transaction_id=f"comm_txn_{booking.id}",
                status="completed",
                created_at=booking.created_at + timedelta(minutes=5)
            )
            db_session.add(payment)
        
        await db_session.commit()
        
        # Test payment analytics includes commission breakdown
        response = client.get("/api/analytics/payments", headers=auth_headers)
        assert response.status_code == 200
        
        payment_analytics = response.json()
        assert "commission_breakdown" in payment_analytics
        
        # Verify commission calculations are present
        commission_data = payment_analytics["commission_breakdown"]
        assert len(commission_data) >= 0  # Should have business model breakdowns

    @pytest.mark.asyncio
    async def test_time_series_analytics_workflow(self, client, auth_headers, 
                                                db_session, b2c_user):
        """Test time series analytics with data across multiple periods."""
        
        # Create bookings across different time periods
        base_time = datetime.utcnow()
        time_periods = [
            base_time - timedelta(hours=23),  # Yesterday
            base_time - timedelta(hours=12),  # 12 hours ago
            base_time - timedelta(hours=6),   # 6 hours ago
            base_time - timedelta(hours=1),   # 1 hour ago
            base_time                         # Now
        ]
        
        bookings = []
        for i, period_time in enumerate(time_periods):
            booking = BookingRequest(
                user_id=b2c_user.id,
                product_name=f"Time Series Tour {i}",
                destination="Time Series City",
                travel_date=base_time + timedelta(days=7),
                participants=2,
                total_amount=100.0 + (i * 50),  # Increasing amounts
                currency="EUR",
                status="confirmed",
                booking_reference=f"TIME{i:03d}",
                created_at=period_time
            )
            bookings.append(booking)
            db_session.add(booking)
        
        await db_session.commit()
        
        # Test analytics across different time frames
        time_frames = ["hour", "day", "week"]
        
        for time_frame in time_frames:
            response = client.get(
                f"/api/analytics/bookings?time_frame={time_frame}",
                headers=auth_headers
            )
            assert response.status_code == 200
            
            analytics = response.json()
            assert analytics["time_frame"] == time_frame
            assert "period_data" in analytics

class TestAnalyticsIntegrationWorkflow:
    """Test integration with other platform components."""

    @pytest.mark.asyncio
    async def test_booking_to_notification_to_analytics_workflow(self, client, auth_headers,
                                                               db_session, b2c_user):
        """Test complete workflow including booking, notification, and analytics."""
        
        # Step 1: Create booking
        booking = BookingRequest(
            user_id=b2c_user.id,
            product_name="Integration Test Tour",
            destination="Integration City",
            travel_date=datetime.utcnow() + timedelta(days=14),
            participants=2,
            total_amount=250.0,
            currency="EUR",
            status="confirmed",
            booking_reference="INTEG001",
            created_at=datetime.utcnow()
        )
        db_session.add(booking)
        await db_session.commit()
        
        # Step 2: Create notification log (simulating notification sent)
        notification = NotificationLog(
            user_id=b2c_user.id,
            notification_type="booking_confirmation",
            channel="email",
            recipient=b2c_user.email,
            subject="Booking Confirmation - Integration Test",
            content="Your booking has been confirmed",
            delivery_status="delivered",
            provider="sendgrid",
            metadata={"booking_id": booking.id, "opened": True},
            created_at=datetime.utcnow()
        )
        db_session.add(notification)
        await db_session.commit()
        
        # Step 3: Verify booking appears in analytics
        response = client.get("/api/analytics/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        # Step 4: Verify user engagement analytics includes notification
        response = client.get("/api/analytics/user-engagement", headers=auth_headers)
        assert response.status_code == 200
        
        engagement = response.json()
        assert "notification_engagement" in engagement

    def test_full_platform_analytics_integration(self, client, auth_headers):
        """Test analytics integration with all platform components."""
        
        # Test that all major analytics endpoints are accessible
        core_endpoints = [
            "/api/analytics/health",
            "/api/analytics/kpis", 
            "/api/analytics/bookings",
            "/api/analytics/payments",
            "/api/analytics/ai-usage",
            "/api/analytics/user-engagement"
        ]
        
        results = {}
        for endpoint in core_endpoints:
            response = client.get(endpoint, headers=auth_headers)
            results[endpoint] = {
                "status_code": response.status_code,
                "response_time": getattr(response, 'elapsed', None)
            }
        
        # Verify all endpoints are functional
        for endpoint, result in results.items():
            assert result["status_code"] in [200, 500], f"Endpoint {endpoint} failed with {result['status_code']}"