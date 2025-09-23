"""
Comprehensive Integration Tests for Intelligent Scheduling Service
Tests timezone optimization, customer preference learning, and automated appointment booking
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import json
from zoneinfo import ZoneInfo

# Test imports
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.intelligent_scheduling_service import (
    IntelligentSchedulingService,
    AppointmentRequest,
    AppointmentSchedule,
    AppointmentType,
    AppointmentStatus,
    CustomerTimePreference,
    SchedulingResult,
    TimeSlot,
    BusinessHours
)

class TestIntelligentSchedulingService:
    """Comprehensive test suite for Intelligent Scheduling Service"""

    @pytest.fixture
    async def mock_db_session(self):
        """Create mock database session"""
        session = AsyncMock()
        session.execute = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.merge = AsyncMock()
        return session

    @pytest.fixture
    async def scheduling_service(self, mock_db_session):
        """Create Intelligent Scheduling Service instance with mocked dependencies"""
        service = IntelligentSchedulingService(mock_db_session)
        return service

    @pytest.fixture
    def sample_appointment_request(self) -> AppointmentRequest:
        """Sample appointment request for testing"""
        return AppointmentRequest(
            customer_phone="+34612345678",  # Spain
            appointment_type=AppointmentType.CONSULTATION,
            preferred_date=datetime.now(timezone.utc) + timedelta(days=3),
            customer_timezone="Europe/Madrid",
            customer_language="es",
            notes="Cliente interesado en paquete de luna de miel a México"
        )

    @pytest.fixture
    def business_hours_config(self) -> Dict[str, BusinessHours]:
        """Business hours configuration for different timezones"""
        return {
            "Europe/Madrid": BusinessHours(
                start_hour=9,
                end_hour=18,
                lunch_break_start=13,
                lunch_break_end=14,
                weekends_available=False
            ),
            "America/New_York": BusinessHours(
                start_hour=8,
                end_hour=17,
                lunch_break_start=12,
                lunch_break_end=13,
                weekends_available=False
            ),
            "Asia/Tokyo": BusinessHours(
                start_hour=9,
                end_hour=17,
                lunch_break_start=12,
                lunch_break_end=13,
                weekends_available=False
            )
        }

    @pytest.mark.asyncio
    async def test_basic_appointment_scheduling(self, scheduling_service, sample_appointment_request):
        """Test basic appointment scheduling functionality"""
        
        # Mock available slots
        scheduling_service._get_available_slots = AsyncMock(return_value=[
            TimeSlot(
                start_time=datetime(2024, 1, 15, 14, 0, tzinfo=ZoneInfo("Europe/Madrid")),
                end_time=datetime(2024, 1, 15, 15, 0, tzinfo=ZoneInfo("Europe/Madrid")),
                agent_id="agent_001"
            )
        ])
        
        # Schedule appointment
        result = await scheduling_service.schedule_appointment(sample_appointment_request)
        
        # Verify scheduling result
        assert isinstance(result, SchedulingResult)
        assert result.success == True
        assert result.appointment_schedule is not None
        assert result.appointment_schedule.customer_phone == "+34612345678"
        assert result.appointment_schedule.appointment_type == AppointmentType.CONSULTATION
        assert result.appointment_schedule.status == AppointmentStatus.CONFIRMED

    @pytest.mark.asyncio
    async def test_timezone_optimization(self, scheduling_service):
        """Test timezone optimization for international customers"""
        
        # Test cases for different timezones
        timezone_tests = [
            {
                "customer_phone": "+34612345678",  # Spain
                "expected_timezone": "Europe/Madrid",
                "optimal_hours": list(range(9, 18))  # 9 AM - 6 PM local
            },
            {
                "customer_phone": "+1234567890",  # US
                "expected_timezone": "America/New_York", 
                "optimal_hours": list(range(8, 17))  # 8 AM - 5 PM local
            },
            {
                "customer_phone": "+81312345678",  # Japan
                "expected_timezone": "Asia/Tokyo",
                "optimal_hours": list(range(9, 17))  # 9 AM - 5 PM local
            }
        ]
        
        for test_case in timezone_tests:
            request = AppointmentRequest(
                customer_phone=test_case["customer_phone"],
                appointment_type=AppointmentType.CONSULTATION,
                preferred_date=datetime.now(timezone.utc) + timedelta(days=2)
            )
            
            # Get optimal time slots
            optimal_slots = await scheduling_service._find_optimal_time_slots(
                request, test_case["expected_timezone"]
            )
            
            # Verify slots are within optimal hours for customer's timezone
            for slot in optimal_slots[:3]:  # Check first 3 slots
                local_time = slot.start_time.astimezone(ZoneInfo(test_case["expected_timezone"]))
                assert local_time.hour in test_case["optimal_hours"]

    @pytest.mark.asyncio
    async def test_customer_preference_learning(self, scheduling_service, mock_db_session):
        """Test customer preference learning and optimization"""
        
        # Mock historical appointment data
        mock_history = [
            {
                "scheduled_time": datetime(2024, 1, 10, 14, 0, tzinfo=ZoneInfo("Europe/Madrid")),
                "customer_satisfaction": 5,
                "showed_up": True
            },
            {
                "scheduled_time": datetime(2024, 1, 8, 10, 0, tzinfo=ZoneInfo("Europe/Madrid")),
                "customer_satisfaction": 3,
                "showed_up": True
            },
            {
                "scheduled_time": datetime(2024, 1, 5, 16, 0, tzinfo=ZoneInfo("Europe/Madrid")),
                "customer_satisfaction": 4,
                "showed_up": False
            }
        ]
        
        # Mock database query for customer history
        mock_result = Mock()
        mock_result.fetchall.return_value = [
            (datetime(2024, 1, 10, 14, 0), 5, True),
            (datetime(2024, 1, 8, 10, 0), 3, True),
            (datetime(2024, 1, 5, 16, 0), 4, False)
        ]
        mock_db_session.execute.return_value = mock_result
        
        # Analyze customer preferences
        preferences = await scheduling_service._analyze_customer_preferences("+34612345678")
        
        # Verify preference learning
        assert isinstance(preferences, CustomerTimePreference)
        assert preferences.preferred_time_of_day == "afternoon"  # 14:00 had highest satisfaction
        assert preferences.preferred_days_of_week is not None
        assert preferences.show_up_rate > 0

    @pytest.mark.asyncio
    async def test_conflict_detection_and_resolution(self, scheduling_service):
        """Test appointment conflict detection and automatic resolution"""
        
        # Create overlapping appointment requests
        request1 = AppointmentRequest(
            customer_phone="+34612345678",
            appointment_type=AppointmentType.CONSULTATION,
            preferred_date=datetime(2024, 1, 15, 14, 0, tzinfo=ZoneInfo("Europe/Madrid")),
            customer_timezone="Europe/Madrid"
        )
        
        request2 = AppointmentRequest(
            customer_phone="+34987654321",
            appointment_type=AppointmentType.CONSULTATION,
            preferred_date=datetime(2024, 1, 15, 14, 30, tzinfo=ZoneInfo("Europe/Madrid")),
            customer_timezone="Europe/Madrid"
        )
        
        # Mock existing appointments to create conflict
        existing_appointment = Mock()
        existing_appointment.scheduled_time = datetime(2024, 1, 15, 14, 0, tzinfo=ZoneInfo("Europe/Madrid"))
        existing_appointment.duration_minutes = 60
        existing_appointment.agent_id = "agent_001"
        
        scheduling_service._get_existing_appointments = AsyncMock(return_value=[existing_appointment])
        
        # Schedule first appointment
        result1 = await scheduling_service.schedule_appointment(request1)
        
        # Schedule second appointment (should detect conflict and find alternative)
        result2 = await scheduling_service.schedule_appointment(request2)
        
        # Verify conflict resolution
        if result2.success:
            # Should schedule at different time
            assert result2.appointment_schedule.scheduled_time != result1.appointment_schedule.scheduled_time
        else:
            # Should indicate conflict in result
            assert "conflict" in result2.error_message.lower()

    @pytest.mark.asyncio
    async def test_multi_timezone_coordination(self, scheduling_service):
        """Test coordination of appointments across multiple timezones"""
        
        # Appointments in different timezones but same UTC time
        utc_time = datetime(2024, 1, 15, 13, 0, tzinfo=timezone.utc)  # 13:00 UTC
        
        timezone_requests = [
            {
                "customer_phone": "+34612345678",  # Spain (UTC+1)
                "timezone": "Europe/Madrid",  # 14:00 local
                "expected_local_hour": 14
            },
            {
                "customer_phone": "+1234567890",  # US East Coast (UTC-5)
                "timezone": "America/New_York",  # 08:00 local
                "expected_local_hour": 8
            },
            {
                "customer_phone": "+44207123456",  # UK (UTC+0)
                "timezone": "Europe/London",  # 13:00 local
                "expected_local_hour": 13
            }
        ]
        
        results = []
        for tz_req in timezone_requests:
            request = AppointmentRequest(
                customer_phone=tz_req["customer_phone"],
                appointment_type=AppointmentType.CONSULTATION,
                preferred_date=utc_time,
                customer_timezone=tz_req["timezone"]
            )
            
            # Mock available slots for this timezone
            local_time = utc_time.astimezone(ZoneInfo(tz_req["timezone"]))
            scheduling_service._get_available_slots = AsyncMock(return_value=[
                TimeSlot(
                    start_time=local_time,
                    end_time=local_time + timedelta(hours=1),
                    agent_id="agent_001"
                )
            ])
            
            result = await scheduling_service.schedule_appointment(request)
            results.append(result)
            
            if result.success:
                # Verify local time is as expected
                local_scheduled = result.appointment_schedule.scheduled_time.astimezone(
                    ZoneInfo(tz_req["timezone"])
                )
                assert local_scheduled.hour == tz_req["expected_local_hour"]
        
        # Verify all appointments can coexist
        successful_results = [r for r in results if r.success]
        assert len(successful_results) > 0

    @pytest.mark.asyncio
    async def test_business_hours_compliance(self, scheduling_service, business_hours_config):
        """Test compliance with business hours across different timezones"""
        
        # Set business hours
        scheduling_service.business_hours = business_hours_config
        
        # Test scheduling outside business hours
        outside_hours_request = AppointmentRequest(
            customer_phone="+34612345678",
            appointment_type=AppointmentType.CONSULTATION,
            preferred_date=datetime(2024, 1, 15, 20, 0, tzinfo=ZoneInfo("Europe/Madrid")),  # 8 PM
            customer_timezone="Europe/Madrid"
        )
        
        # Should not find slots outside business hours
        available_slots = await scheduling_service._find_optimal_time_slots(
            outside_hours_request, "Europe/Madrid"
        )
        
        # All slots should be within business hours
        for slot in available_slots:
            local_time = slot.start_time.astimezone(ZoneInfo("Europe/Madrid"))
            business_hours = business_hours_config["Europe/Madrid"]
            
            # Should be within business hours
            assert business_hours.start_hour <= local_time.hour < business_hours.end_hour
            
            # Should not be during lunch break
            assert not (business_hours.lunch_break_start <= local_time.hour < business_hours.lunch_break_end)

    @pytest.mark.asyncio
    async def test_appointment_types_and_duration(self, scheduling_service):
        """Test different appointment types and their durations"""
        
        appointment_types = [
            (AppointmentType.CONSULTATION, 60),      # 1 hour
            (AppointmentType.BOOKING_REVIEW, 30),    # 30 minutes
            (AppointmentType.FOLLOW_UP, 15),         # 15 minutes
            (AppointmentType.PREMIUM_CONSULTATION, 90) # 1.5 hours
        ]
        
        for app_type, expected_duration in appointment_types:
            request = AppointmentRequest(
                customer_phone="+34612345678",
                appointment_type=app_type,
                preferred_date=datetime.now(timezone.utc) + timedelta(days=1),
                customer_timezone="Europe/Madrid"
            )
            
            # Mock available slots
            start_time = datetime(2024, 1, 15, 10, 0, tzinfo=ZoneInfo("Europe/Madrid"))
            scheduling_service._get_available_slots = AsyncMock(return_value=[
                TimeSlot(
                    start_time=start_time,
                    end_time=start_time + timedelta(minutes=expected_duration),
                    agent_id="agent_001"
                )
            ])
            
            result = await scheduling_service.schedule_appointment(request)
            
            if result.success:
                assert result.appointment_schedule.duration_minutes == expected_duration
                assert result.appointment_schedule.appointment_type == app_type

    @pytest.mark.asyncio
    async def test_agent_availability_optimization(self, scheduling_service):
        """Test optimization based on agent availability and expertise"""
        
        # Mock agent availability with different expertise levels
        mock_agents = [
            {"agent_id": "agent_001", "expertise": ["luxury_travel", "europe"], "availability_score": 0.9},
            {"agent_id": "agent_002", "expertise": ["budget_travel", "asia"], "availability_score": 0.7},
            {"agent_id": "agent_003", "expertise": ["luxury_travel", "honeymoon"], "availability_score": 0.8}
        ]
        
        scheduling_service._get_agent_availability = AsyncMock(return_value=mock_agents)
        
        # Request for luxury travel consultation
        luxury_request = AppointmentRequest(
            customer_phone="+34612345678",
            appointment_type=AppointmentType.PREMIUM_CONSULTATION,
            preferred_date=datetime.now(timezone.utc) + timedelta(days=2),
            customer_timezone="Europe/Madrid",
            notes="Interested in luxury European tour"
        )
        
        # Should match with agent who has luxury_travel expertise
        optimal_agent = await scheduling_service._find_optimal_agent(luxury_request)
        
        # Should prefer agent_001 (highest availability with luxury expertise)
        assert optimal_agent["agent_id"] in ["agent_001", "agent_003"]
        assert "luxury_travel" in optimal_agent["expertise"]

    @pytest.mark.asyncio
    async def test_rescheduling_functionality(self, scheduling_service):
        """Test appointment rescheduling with preference learning"""
        
        # Original appointment
        original_schedule = AppointmentSchedule(
            id=1,
            customer_phone="+34612345678",
            appointment_type=AppointmentType.CONSULTATION,
            scheduled_time=datetime(2024, 1, 15, 10, 0, tzinfo=ZoneInfo("Europe/Madrid")),
            duration_minutes=60,
            agent_id="agent_001",
            status=AppointmentStatus.CONFIRMED,
            customer_timezone="Europe/Madrid"
        )
        
        # Reschedule request
        reschedule_request = AppointmentRequest(
            customer_phone="+34612345678",
            appointment_type=AppointmentType.CONSULTATION,
            preferred_date=datetime(2024, 1, 16, 14, 0, tzinfo=ZoneInfo("Europe/Madrid")),
            customer_timezone="Europe/Madrid",
            reschedule_from_id=1
        )
        
        # Mock finding the original appointment
        scheduling_service._get_appointment_by_id = AsyncMock(return_value=original_schedule)
        
        # Mock available slots for rescheduling
        new_time = datetime(2024, 1, 16, 14, 0, tzinfo=ZoneInfo("Europe/Madrid"))
        scheduling_service._get_available_slots = AsyncMock(return_value=[
            TimeSlot(
                start_time=new_time,
                end_time=new_time + timedelta(hours=1),
                agent_id="agent_001"
            )
        ])
        
        result = await scheduling_service.reschedule_appointment(reschedule_request)
        
        # Verify rescheduling
        assert result.success == True
        assert result.appointment_schedule.scheduled_time == new_time
        assert result.appointment_schedule.status == AppointmentStatus.CONFIRMED

    @pytest.mark.asyncio
    async def test_bulk_scheduling_optimization(self, scheduling_service):
        """Test bulk scheduling with optimization for multiple customers"""
        
        # Multiple appointment requests
        bulk_requests = []
        for i in range(5):
            request = AppointmentRequest(
                customer_phone=f"+34612345{i:03d}",
                appointment_type=AppointmentType.CONSULTATION,
                preferred_date=datetime.now(timezone.utc) + timedelta(days=1),
                customer_timezone="Europe/Madrid"
            )
            bulk_requests.append(request)
        
        # Mock available slots
        base_time = datetime(2024, 1, 15, 9, 0, tzinfo=ZoneInfo("Europe/Madrid"))
        available_slots = []
        for i in range(8):  # 8 slots available
            slot_time = base_time + timedelta(hours=i)
            if 9 <= slot_time.hour <= 17:  # Business hours
                available_slots.append(TimeSlot(
                    start_time=slot_time,
                    end_time=slot_time + timedelta(hours=1),
                    agent_id=f"agent_{(i % 3) + 1:03d}"  # Distribute across 3 agents
                ))
        
        scheduling_service._get_available_slots = AsyncMock(return_value=available_slots)
        
        # Schedule all appointments
        results = []
        for request in bulk_requests:
            result = await scheduling_service.schedule_appointment(request)
            results.append(result)
        
        # Verify optimization
        successful_schedules = [r for r in results if r.success]
        assert len(successful_schedules) >= 3  # Should schedule at least 3 out of 5
        
        # Verify no double-booking (same agent, overlapping times)
        scheduled_times = {}
        for result in successful_schedules:
            agent_id = result.appointment_schedule.agent_id
            scheduled_time = result.appointment_schedule.scheduled_time
            
            if agent_id in scheduled_times:
                # Check for time conflicts
                for existing_time in scheduled_times[agent_id]:
                    time_diff = abs((scheduled_time - existing_time).total_seconds())
                    assert time_diff >= 3600  # At least 1 hour apart
            else:
                scheduled_times[agent_id] = []
            
            scheduled_times[agent_id].append(scheduled_time)

    @pytest.mark.asyncio
    async def test_weekend_and_holiday_handling(self, scheduling_service):
        """Test handling of weekends and holidays in scheduling"""
        
        # Request for a weekend (Saturday)
        weekend_request = AppointmentRequest(
            customer_phone="+34612345678",
            appointment_type=AppointmentType.CONSULTATION,
            preferred_date=datetime(2024, 1, 13, 10, 0, tzinfo=ZoneInfo("Europe/Madrid")),  # Saturday
            customer_timezone="Europe/Madrid"
        )
        
        # Configure no weekend availability
        scheduling_service.business_hours = {
            "Europe/Madrid": BusinessHours(
                start_hour=9,
                end_hour=18,
                weekends_available=False
            )
        }
        
        # Should not find weekend slots (or should suggest Monday)
        available_slots = await scheduling_service._find_optimal_time_slots(
            weekend_request, "Europe/Madrid"
        )
        
        # All returned slots should be on weekdays
        for slot in available_slots:
            assert slot.start_time.weekday() < 5  # Monday=0, Friday=4

    @pytest.mark.asyncio
    async def test_customer_language_preferences(self, scheduling_service):
        """Test scheduling optimization based on customer language preferences"""
        
        language_requests = [
            {
                "customer_phone": "+34612345678",
                "language": "es",
                "expected_agent_languages": ["es", "en"]
            },
            {
                "customer_phone": "+33123456789", 
                "language": "fr",
                "expected_agent_languages": ["fr", "en"]
            },
            {
                "customer_phone": "+49301234567",
                "language": "de", 
                "expected_agent_languages": ["de", "en"]
            }
        ]
        
        # Mock agents with language capabilities
        mock_multilingual_agents = [
            {"agent_id": "agent_es_001", "languages": ["es", "en"], "availability_score": 0.9},
            {"agent_id": "agent_fr_001", "languages": ["fr", "en"], "availability_score": 0.8},
            {"agent_id": "agent_de_001", "languages": ["de", "en"], "availability_score": 0.7},
            {"agent_id": "agent_en_001", "languages": ["en"], "availability_score": 0.95}
        ]
        
        scheduling_service._get_agent_availability = AsyncMock(return_value=mock_multilingual_agents)
        
        for lang_req in language_requests:
            request = AppointmentRequest(
                customer_phone=lang_req["customer_phone"],
                appointment_type=AppointmentType.CONSULTATION,
                preferred_date=datetime.now(timezone.utc) + timedelta(days=1),
                customer_language=lang_req["language"]
            )
            
            # Find optimal agent based on language
            optimal_agent = await scheduling_service._find_optimal_agent(request)
            
            # Should prefer agent who speaks customer's language
            agent_languages = optimal_agent["languages"]
            assert lang_req["language"] in agent_languages or "en" in agent_languages

# Integration Tests
class TestSchedulingIntegration:
    """Integration tests for the complete scheduling workflow"""

    @pytest.mark.asyncio
    async def test_call_report_to_scheduling_integration(self):
        """Test integration from call report to automatic scheduling"""
        
        # Mock call report that requests appointment
        from backend.services.call_reporting_service import CallReport, AppointmentType, Sentiment
        
        call_report = CallReport(
            call_id="integration_test_001",
            customer_phone="+34612345678",
            agent_id="agent_001", 
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(minutes=10),
            duration_minutes=10.0,
            sentiment=Sentiment.POSITIVE,
            customer_country="ES",
            customer_timezone="Europe/Madrid",
            appointment_requested=True,
            appointment_type=AppointmentType.CONSULTATION,
            preferred_appointment_time=datetime.now(timezone.utc) + timedelta(days=2),
            follow_up_required=True
        )
        
        # Create scheduling service
        from backend.services.intelligent_scheduling_service import IntelligentSchedulingService
        mock_db = AsyncMock()
        scheduling_service = IntelligentSchedulingService(mock_db)
        
        # Mock available slots
        base_time = datetime.now(timezone.utc) + timedelta(days=2)
        scheduling_service._get_available_slots = AsyncMock(return_value=[
            TimeSlot(
                start_time=base_time.replace(hour=14, minute=0),
                end_time=base_time.replace(hour=15, minute=0),
                agent_id="agent_001"
            )
        ])
        
        # Schedule appointment from call report
        result = await scheduling_service.schedule_appointment_from_call(call_report)
        
        # Verify integration
        assert result is not None
        assert result.customer_phone == "+34612345678"
        assert result.appointment_type == AppointmentType.CONSULTATION
        assert result.customer_timezone == "Europe/Madrid"

    @pytest.mark.asyncio
    async def test_monitoring_integration(self):
        """Test integration with monitoring service for scheduling metrics"""
        
        from backend.services.intelligent_scheduling_service import IntelligentSchedulingService
        
        # Should have monitoring integration
        service = IntelligentSchedulingService(Mock())
        
        # Should be able to record scheduling metrics
        assert hasattr(service, '_record_scheduling_metric') or hasattr(service, 'record_metric')

# Performance Tests
class TestSchedulingPerformance:
    """Performance tests for scheduling service"""

    @pytest.mark.asyncio
    async def test_high_volume_scheduling(self, scheduling_service):
        """Test scheduling service under high volume load"""
        
        async def schedule_single_appointment(customer_id: int):
            request = AppointmentRequest(
                customer_phone=f"+34612345{customer_id:03d}",
                appointment_type=AppointmentType.CONSULTATION,
                preferred_date=datetime.now(timezone.utc) + timedelta(days=1),
                customer_timezone="Europe/Madrid"
            )
            return await scheduling_service.schedule_appointment(request)
        
        # Generate 50 concurrent appointment requests
        start_time = datetime.now()
        tasks = [schedule_single_appointment(i) for i in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = datetime.now()
        
        # Analyze results
        successful_schedules = [r for r in results if isinstance(r, SchedulingResult) and r.success]
        processing_time = (end_time - start_time).total_seconds()
        
        # Performance assertions
        assert processing_time < 30.0  # Should complete in under 30 seconds
        assert len(successful_schedules) > 20  # Should successfully schedule >40% under load

    @pytest.mark.asyncio
    async def test_timezone_calculation_performance(self, scheduling_service):
        """Test performance of timezone calculations"""
        
        # Test timezone calculations for various international numbers
        test_phones = [
            "+34612345678",  # Spain
            "+33123456789",  # France
            "+49301234567",  # Germany
            "+44207123456",  # UK
            "+1234567890",   # US
            "+81312345678",  # Japan
            "+61234567890",  # Australia
            "+55123456789",  # Brazil
        ]
        
        start_time = datetime.now()
        
        for phone in test_phones * 10:  # 80 calculations
            await scheduling_service._detect_timezone_from_phone(phone)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Should process timezone calculations quickly
        assert processing_time < 5.0  # Under 5 seconds for 80 calculations
        avg_time_per_calc = processing_time / 80
        assert avg_time_per_calc < 0.1  # Under 100ms per calculation

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])