"""
Unit Tests for Analytics Service
Comprehensive testing for the analytics service with all KPI calculations, 
data aggregation, and business intelligence functions.
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch

from backend.services.analytics_service import (
    AnalyticsService, TimeFrame, BusinessModel, MetricType,
    KPIMetrics, AnalyticsReport, MetricValue
)
from backend.models.database_models import *

class TestAnalyticsService:
    """Test suite for AnalyticsService."""

    @pytest.fixture
    def analytics_service(self, db_session):
        """Create analytics service instance."""
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_get_real_time_kpis_basic(self, analytics_service, sample_booking_request, 
                                          sample_payment_transaction, sample_ai_query_log):
        """Test basic KPI calculation."""
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
        
        assert isinstance(kpis, KPIMetrics)
        assert kpis.total_bookings >= 0
        assert isinstance(kpis.total_revenue, Decimal)
        assert kpis.conversion_rate >= 0
        assert kpis.ai_satisfaction_score >= 0
        assert kpis.system_uptime > 0

    @pytest.mark.asyncio
    async def test_get_real_time_kpis_with_data(self, analytics_service, db_session,
                                              b2c_user, sample_booking_request):
        """Test KPI calculation with actual data."""
        # Add more test data
        booking2 = BookingRequest(
            user_id=b2c_user.id,
            product_name="Barcelona Tour",
            destination="Barcelona, Spain",
            travel_date=datetime.utcnow() + timedelta(days=5),
            participants=3,
            total_amount=200.0,
            currency="EUR",
            status="confirmed",
            booking_reference="BK987654321",
            created_at=datetime.utcnow()
        )
        db_session.add(booking2)
        await db_session.commit()

        kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
        
        assert kpis.total_bookings >= 2  # At least the 2 we created
        assert float(kpis.total_revenue) >= 350.0  # 150 + 200
        assert float(kpis.average_booking_value) > 0

    @pytest.mark.asyncio
    async def test_get_booking_analytics_basic(self, analytics_service):
        """Test basic booking analytics retrieval."""
        analytics = await analytics_service.get_booking_analytics(TimeFrame.DAY)
        
        assert "time_frame" in analytics
        assert "period_data" in analytics
        assert "top_destinations" in analytics
        assert "booking_sources" in analytics
        assert analytics["time_frame"] == TimeFrame.DAY.value

    @pytest.mark.asyncio
    async def test_get_booking_analytics_with_business_model(self, analytics_service):
        """Test booking analytics with business model filtering."""
        analytics = await analytics_service.get_booking_analytics(
            TimeFrame.WEEK, BusinessModel.B2C
        )
        
        assert analytics is not None
        assert "period_data" in analytics

    @pytest.mark.asyncio
    async def test_get_payment_analytics(self, analytics_service, sample_payment_transaction):
        """Test payment analytics calculation."""
        analytics = await analytics_service.get_payment_analytics(TimeFrame.DAY)
        
        assert "time_frame" in analytics
        assert "period_data" in analytics
        assert "payment_methods" in analytics
        assert "refund_analytics" in analytics
        assert "commission_breakdown" in analytics

    @pytest.mark.asyncio
    async def test_get_ai_usage_analytics(self, analytics_service, sample_ai_query_log):
        """Test AI usage analytics calculation."""
        analytics = await analytics_service.get_ai_usage_analytics(TimeFrame.DAY)
        
        assert "time_frame" in analytics
        assert "agent_performance" in analytics
        assert "usage_trends" in analytics
        assert "popular_query_types" in analytics

    @pytest.mark.asyncio
    async def test_get_user_engagement_analytics(self, analytics_service, sample_notification_log):
        """Test user engagement analytics calculation."""
        analytics = await analytics_service.get_user_engagement_analytics(TimeFrame.DAY)
        
        assert "time_frame" in analytics
        assert "activity_trends" in analytics
        assert "user_segmentation" in analytics
        assert "notification_engagement" in analytics

    @pytest.mark.asyncio
    async def test_generate_comprehensive_report(self, analytics_service):
        """Test comprehensive report generation."""
        report = await analytics_service.generate_comprehensive_report(
            "test_report", TimeFrame.DAY
        )
        
        assert isinstance(report, AnalyticsReport)
        assert report.report_type == "test_report"
        assert report.time_frame == TimeFrame.DAY
        assert report.metrics is not None
        assert report.summary is not None
        assert isinstance(report.generated_at, datetime)

    @pytest.mark.asyncio
    async def test_generate_report_with_business_model(self, analytics_service):
        """Test report generation with business model filter."""
        report = await analytics_service.generate_comprehensive_report(
            "b2b_report", TimeFrame.WEEK, BusinessModel.B2B
        )
        
        assert report.summary["business_model"] == BusinessModel.B2B.value

    def test_get_start_date_calculations(self, analytics_service):
        """Test start date calculations for different time frames."""
        end_date = datetime(2024, 9, 22, 12, 0, 0, tzinfo=timezone.utc)
        
        # Test hour
        start_hour = analytics_service._get_start_date(end_date, TimeFrame.HOUR)
        expected_hour = end_date - timedelta(hours=1)
        assert start_hour == expected_hour
        
        # Test day
        start_day = analytics_service._get_start_date(end_date, TimeFrame.DAY)
        expected_day = end_date - timedelta(days=1)
        assert start_day == expected_day
        
        # Test week
        start_week = analytics_service._get_start_date(end_date, TimeFrame.WEEK)
        expected_week = end_date - timedelta(weeks=1)
        assert start_week == expected_week
        
        # Test month
        start_month = analytics_service._get_start_date(end_date, TimeFrame.MONTH)
        expected_month = end_date - timedelta(days=30)
        assert start_month == expected_month

    @pytest.mark.asyncio
    async def test_calculate_retention_rate_no_previous_data(self, analytics_service):
        """Test retention rate calculation with no previous data."""
        end_date = datetime.utcnow(timezone.utc)
        start_date = end_date - timedelta(days=7)
        
        retention_rate = await analytics_service._calculate_retention_rate(start_date, end_date)
        assert retention_rate >= 0.0
        assert retention_rate <= 100.0

    @pytest.mark.asyncio
    async def test_error_handling_database_error(self, analytics_service):
        """Test error handling when database operations fail."""
        with patch('backend.database.get_db_session') as mock_db:
            mock_db.side_effect = Exception("Database connection failed")
            
            # Should return default KPIs on error
            kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
            
            assert isinstance(kpis, KPIMetrics)
            assert kpis.total_bookings == 0
            assert kpis.total_revenue == Decimal('0')

    @pytest.mark.asyncio
    async def test_kpi_metrics_serialization(self, analytics_service):
        """Test KPIMetrics to_dict serialization."""
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
        kpi_dict = kpis.to_dict()
        
        assert isinstance(kpi_dict, dict)
        assert "total_bookings" in kpi_dict
        assert "total_revenue" in kpi_dict
        assert "conversion_rate" in kpi_dict
        
        # Check that Decimal values are converted to float
        assert isinstance(kpi_dict["total_revenue"], (int, float))

    @pytest.mark.asyncio
    async def test_metric_value_creation(self):
        """Test MetricValue creation and serialization."""
        timestamp = datetime.utcnow(timezone.utc)
        metric = MetricValue(
            value=100.50,
            timestamp=timestamp,
            metadata={"source": "test"}
        )
        
        metric_dict = metric.to_dict()
        
        assert metric_dict["value"] == 100.50
        assert metric_dict["timestamp"] == timestamp.isoformat()
        assert metric_dict["metadata"]["source"] == "test"

    @pytest.mark.asyncio
    async def test_metric_value_with_decimal(self):
        """Test MetricValue with Decimal values."""
        timestamp = datetime.utcnow(timezone.utc)
        metric = MetricValue(
            value=Decimal('150.75'),
            timestamp=timestamp
        )
        
        metric_dict = metric.to_dict()
        
        # Decimal should be converted to float
        assert isinstance(metric_dict["value"], float)
        assert metric_dict["value"] == 150.75

    @pytest.mark.asyncio
    async def test_analytics_report_serialization(self, analytics_service):
        """Test AnalyticsReport to_dict serialization."""
        report = await analytics_service.generate_comprehensive_report(
            "serialization_test", TimeFrame.DAY
        )
        
        report_dict = report.to_dict()
        
        assert isinstance(report_dict, dict)
        assert "report_id" in report_dict
        assert "report_type" in report_dict
        assert "start_date" in report_dict
        assert "end_date" in report_dict
        assert "generated_at" in report_dict
        assert "metrics" in report_dict
        assert "summary" in report_dict
        
        # Check date serialization
        assert isinstance(report_dict["start_date"], str)
        assert isinstance(report_dict["end_date"], str)
        assert isinstance(report_dict["generated_at"], str)

class TestAnalyticsServiceEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.fixture
    def analytics_service(self, db_session):
        """Create analytics service instance."""
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_kpis_with_empty_database(self, analytics_service):
        """Test KPI calculation with empty database."""
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
        
        # Should return default values, not fail
        assert kpis.total_bookings == 0
        assert kpis.total_revenue == Decimal('0')
        assert kpis.average_booking_value == Decimal('0')
        assert kpis.conversion_rate == 0.0

    @pytest.mark.asyncio
    async def test_different_time_frames(self, analytics_service):
        """Test analytics with all supported time frames."""
        time_frames = [
            TimeFrame.HOUR, TimeFrame.DAY, TimeFrame.WEEK,
            TimeFrame.MONTH, TimeFrame.QUARTER, TimeFrame.YEAR
        ]
        
        for time_frame in time_frames:
            kpis = await analytics_service.get_real_time_kpis(time_frame)
            assert isinstance(kpis, KPIMetrics)
            
            booking_analytics = await analytics_service.get_booking_analytics(time_frame)
            assert booking_analytics is not None

    @pytest.mark.asyncio
    async def test_business_model_filtering(self, analytics_service):
        """Test analytics with all business model filters."""
        business_models = [None, BusinessModel.B2C, BusinessModel.B2B, BusinessModel.B2B2C]
        
        for model in business_models:
            analytics = await analytics_service.get_booking_analytics(
                TimeFrame.DAY, model
            )
            assert analytics is not None

    @pytest.mark.asyncio
    async def test_concurrent_analytics_requests(self, analytics_service):
        """Test concurrent analytics requests."""
        # Create multiple concurrent requests
        tasks = [
            analytics_service.get_real_time_kpis(TimeFrame.DAY),
            analytics_service.get_booking_analytics(TimeFrame.DAY),
            analytics_service.get_payment_analytics(TimeFrame.DAY),
            analytics_service.get_ai_usage_analytics(TimeFrame.DAY),
            analytics_service.get_user_engagement_analytics(TimeFrame.DAY)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All requests should complete successfully
        for result in results:
            assert not isinstance(result, Exception)

    @pytest.mark.asyncio
    async def test_large_dataset_simulation(self, analytics_service, db_session, b2c_user):
        """Test analytics performance with larger dataset."""
        # Create multiple booking records
        bookings = []
        for i in range(50):
            booking = BookingRequest(
                user_id=b2c_user.id,
                product_name=f"Tour {i}",
                destination=f"City {i % 5}",  # 5 different cities
                travel_date=datetime.utcnow() + timedelta(days=i),
                participants=i % 5 + 1,  # 1-5 participants
                total_amount=50.0 + (i * 10),  # Varying amounts
                currency="EUR",
                status="confirmed" if i % 10 != 0 else "cancelled",  # 90% confirmed
                booking_reference=f"BK{i:06d}",
                created_at=datetime.utcnow() - timedelta(hours=i)
            )
            bookings.append(booking)
        
        db_session.add_all(bookings)
        await db_session.commit()
        
        # Test analytics with larger dataset
        start_time = datetime.now()
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
        end_time = datetime.now()
        
        # Should complete within reasonable time (< 1 second)
        execution_time = (end_time - start_time).total_seconds()
        assert execution_time < 1.0
        
        # Verify results make sense
        assert kpis.total_bookings >= 45  # Most should be confirmed
        assert float(kpis.total_revenue) > 1000  # Significant revenue

class TestAnalyticsServicePerformance:
    """Performance tests for analytics service."""

    @pytest.fixture
    def analytics_service(self, db_session):
        """Create analytics service instance."""
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_kpi_calculation_performance(self, analytics_service, performance_config):
        """Test KPI calculation performance."""
        max_time = performance_config["max_response_time"] / 1000  # Convert to seconds
        
        start_time = datetime.now()
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.DAY)
        end_time = datetime.now()
        
        execution_time = (end_time - start_time).total_seconds()
        assert execution_time < max_time, f"KPI calculation took {execution_time}s, max allowed: {max_time}s"

    @pytest.mark.asyncio
    async def test_analytics_memory_usage(self, analytics_service):
        """Test that analytics operations don't cause memory leaks."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Perform multiple analytics operations
        for _ in range(10):
            await analytics_service.get_real_time_kpis(TimeFrame.DAY)
            await analytics_service.get_booking_analytics(TimeFrame.DAY)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (< 50MB)
        assert memory_increase < 50 * 1024 * 1024, f"Memory increased by {memory_increase / 1024 / 1024}MB"