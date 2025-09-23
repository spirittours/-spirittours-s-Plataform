"""
Comprehensive Integration Tests for Call Reporting Service
Tests AI analysis functionality, sentiment detection, timezone handling, and follow-up automation
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import json

# Test imports
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.call_reporting_service import (
    CallReportingService,
    CallReport,
    CallStatus,
    Sentiment,
    AppointmentType,
    FollowUpType,
    CallAnalysisResult
)

class TestCallReportingService:
    """Comprehensive test suite for Call Reporting Service"""

    @pytest.fixture
    async def mock_db_session(self):
        """Create mock database session"""
        session = AsyncMock()
        session.execute = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        return session

    @pytest.fixture
    async def mock_openai_client(self):
        """Create mock OpenAI client"""
        client = AsyncMock()
        
        # Mock GPT-4 response for sentiment analysis
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = json.dumps({
            "sentiment": "positive",
            "confidence": 0.85,
            "key_topics": ["vacation planning", "booking inquiry"],
            "customer_intent": "book_consultation",
            "urgency_level": "medium",
            "language_detected": "en",
            "summary": "Customer interested in booking a vacation package to Spain",
            "action_recommendations": ["schedule_consultation", "send_brochure"]
        })
        
        client.chat.completions.create = AsyncMock(return_value=mock_response)
        return client

    @pytest.fixture
    async def call_reporting_service(self, mock_db_session, mock_openai_client):
        """Create Call Reporting Service instance with mocked dependencies"""
        service = CallReportingService(mock_db_session)
        service.openai_client = mock_openai_client
        return service

    @pytest.fixture
    def sample_call_data(self) -> Dict[str, Any]:
        """Sample call data for testing"""
        return {
            "call_id": "test_call_001",
            "customer_phone": "+34612345678",  # Spain phone number
            "agent_id": "agent_001",
            "start_time": datetime.now(timezone.utc),
            "end_time": datetime.now(timezone.utc) + timedelta(minutes=15),
            "transcript": """
            Agent: Hello, this is Maria from Spirit Tours. How can I help you today?
            Customer: Hi! I'm interested in planning a vacation to Spain. I've been thinking about it for months and finally ready to book something.
            Agent: That's wonderful! Spain is one of our most popular destinations. Are you looking for a specific region or city?
            Customer: I'd love to see Barcelona and maybe Madrid. I'm particularly interested in the cultural experiences and food tours.
            Agent: Excellent choice! We have amazing packages that include both cities with guided cultural tours and authentic culinary experiences. When are you thinking of traveling?
            Customer: I'm flexible with dates, but preferably in the spring, maybe April or May. I work from home so I have some flexibility.
            Agent: Perfect! Spring is an ideal time to visit Spain. The weather is beautiful and there are fewer crowds. Would you like me to send you some package options and we can schedule a detailed consultation to plan your perfect trip?
            Customer: Yes, that would be great! I'd love to see the options. When could we schedule the consultation?
            Agent: I can schedule you for this Thursday afternoon or Friday morning. What works better for you?
            Customer: Thursday afternoon works perfectly for me.
            Agent: Wonderful! I'll send you the package information today and we'll have your consultation scheduled for Thursday at 3 PM. Is this the best number to reach you?
            Customer: Yes, this number is perfect. Thank you so much!
            Agent: You're very welcome! I'm excited to help you plan your Spanish adventure. You'll receive an email confirmation shortly.
            """,
            "call_quality_score": 9.2,
            "recording_url": "https://recordings.spirittours.com/test_call_001.wav",
            "metadata": {
                "pbx_call_id": "pbx_12345",
                "recording_duration": 15.5,
                "call_direction": "inbound"
            }
        }

    @pytest.mark.asyncio
    async def test_analyze_call_basic_functionality(self, call_reporting_service, sample_call_data):
        """Test basic call analysis functionality"""
        
        # Execute call analysis
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        
        # Verify basic report structure
        assert isinstance(call_report, CallReport)
        assert call_report.call_id == "test_call_001"
        assert call_report.customer_phone == "+34612345678"
        assert call_report.agent_id == "agent_001"
        assert call_report.status == CallStatus.COMPLETED
        
        # Verify timing calculations
        assert call_report.duration_minutes == 15.0
        assert call_report.start_time is not None
        assert call_report.end_time is not None

    @pytest.mark.asyncio
    async def test_ai_sentiment_analysis(self, call_reporting_service, sample_call_data):
        """Test AI sentiment analysis functionality"""
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        
        # Verify AI analysis results
        assert call_report.sentiment == Sentiment.POSITIVE
        assert call_report.sentiment_confidence >= 0.8
        assert "vacation planning" in call_report.key_topics
        assert "booking inquiry" in call_report.key_topics
        assert call_report.customer_intent == "book_consultation"
        assert call_report.language_detected == "en"

    @pytest.mark.asyncio
    async def test_geographic_timezone_analysis(self, call_reporting_service, sample_call_data):
        """Test geographic and timezone analysis from phone number"""
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        
        # Verify geographic analysis for Spanish phone number
        assert call_report.customer_country == "ES"  # Spain
        assert call_report.customer_timezone == "Europe/Madrid"
        assert call_report.customer_region is not None

    @pytest.mark.asyncio
    async def test_appointment_detection_and_scheduling(self, call_reporting_service, sample_call_data):
        """Test appointment request detection and automated scheduling"""
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        
        # Verify appointment detection
        assert call_report.appointment_requested == True
        assert call_report.appointment_type == AppointmentType.CONSULTATION
        assert call_report.preferred_appointment_time is not None
        
        # Verify follow-up requirements
        assert call_report.follow_up_required == True
        assert call_report.follow_up_type == FollowUpType.SCHEDULED_APPOINTMENT

    @pytest.mark.asyncio
    async def test_multiple_languages_support(self, call_reporting_service, mock_openai_client):
        """Test multi-language support and detection"""
        
        # Spanish call transcript
        spanish_call_data = {
            "call_id": "test_call_es_001",
            "customer_phone": "+34612345678",
            "agent_id": "agent_002",
            "start_time": datetime.now(timezone.utc),
            "end_time": datetime.now(timezone.utc) + timedelta(minutes=10),
            "transcript": """
            Agente: Hola, soy Carlos de Spirit Tours. ¿En qué puedo ayudarle?
            Cliente: ¡Hola! Estoy interesado en un viaje a México. He escuchado que tienen muy buenas ofertas.
            Agente: ¡Excelente elección! México es un destino fantástico. ¿Qué región le interesa más?
            Cliente: Me gustaría conocer Cancún y quizás la Riviera Maya. Es para mi luna de miel.
            Agente: ¡Felicitaciones! Tenemos paquetes especiales para luna de miel que incluyen hoteles románticos y experiencias exclusivas.
            Cliente: Suena perfecto. ¿Cuándo podríamos hablar más detalladamente sobre las opciones?
            Agente: Podemos programar una cita para mañana por la tarde si le parece bien.
            Cliente: Perfecto, mañana a las 4 PM me viene muy bien.
            """
        }
        
        # Mock Spanish response
        mock_spanish_response = Mock()
        mock_spanish_response.choices = [Mock()]
        mock_spanish_response.choices[0].message = Mock()
        mock_spanish_response.choices[0].message.content = json.dumps({
            "sentiment": "positive",
            "confidence": 0.92,
            "key_topics": ["luna de miel", "México", "Cancún"],
            "customer_intent": "book_honeymoon_package",
            "urgency_level": "high",
            "language_detected": "es",
            "summary": "Cliente interesado en paquete de luna de miel a México",
            "action_recommendations": ["send_honeymoon_packages", "schedule_consultation"]
        })
        
        mock_openai_client.chat.completions.create.return_value = mock_spanish_response
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(spanish_call_data)
        
        # Verify Spanish language detection
        assert call_report.language_detected == "es"
        assert "luna de miel" in call_report.key_topics
        assert call_report.customer_intent == "book_honeymoon_package"

    @pytest.mark.asyncio
    async def test_negative_sentiment_handling(self, call_reporting_service, mock_openai_client):
        """Test handling of negative sentiment calls"""
        
        negative_call_data = {
            "call_id": "test_call_neg_001", 
            "customer_phone": "+1234567890",
            "agent_id": "agent_003",
            "start_time": datetime.now(timezone.utc),
            "end_time": datetime.now(timezone.utc) + timedelta(minutes=8),
            "transcript": """
            Agent: Hello, this is Spirit Tours customer service. How can I help you?
            Customer: I'm very disappointed with my recent trip booking. The hotel was not as advertised and the tour was cancelled last minute.
            Agent: I'm so sorry to hear about your experience. That's definitely not the level of service we strive for.
            Customer: I want a full refund and I'm considering never booking with you again.
            Agent: I completely understand your frustration. Let me see what I can do to make this right for you.
            Customer: I hope so because this has really ruined my vacation experience.
            """
        }
        
        # Mock negative response
        mock_negative_response = Mock()
        mock_negative_response.choices = [Mock()]
        mock_negative_response.choices[0].message = Mock()
        mock_negative_response.choices[0].message.content = json.dumps({
            "sentiment": "negative",
            "confidence": 0.95,
            "key_topics": ["complaint", "refund request", "poor service"],
            "customer_intent": "request_refund",
            "urgency_level": "high",
            "language_detected": "en",
            "summary": "Customer very dissatisfied with recent booking, requesting full refund",
            "action_recommendations": ["escalate_to_manager", "process_refund", "investigate_service_failure"]
        })
        
        mock_openai_client.chat.completions.create.return_value = mock_negative_response
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(negative_call_data)
        
        # Verify negative sentiment handling
        assert call_report.sentiment == Sentiment.NEGATIVE
        assert call_report.urgency_level == "high"
        assert call_report.follow_up_required == True
        assert call_report.follow_up_type == FollowUpType.MANAGER_ESCALATION
        assert "complaint" in call_report.key_topics

    @pytest.mark.asyncio
    async def test_international_phone_number_processing(self, call_reporting_service):
        """Test processing of various international phone number formats"""
        
        test_cases = [
            {
                "phone": "+44207123456",  # UK
                "expected_country": "GB",
                "expected_timezone": "Europe/London"
            },
            {
                "phone": "+33123456789",  # France
                "expected_country": "FR", 
                "expected_timezone": "Europe/Paris"
            },
            {
                "phone": "+49301234567",  # Germany
                "expected_country": "DE",
                "expected_timezone": "Europe/Berlin"
            },
            {
                "phone": "+81312345678",  # Japan
                "expected_country": "JP",
                "expected_timezone": "Asia/Tokyo"
            }
        ]
        
        for test_case in test_cases:
            call_data = {
                "call_id": f"test_call_{test_case['expected_country']}",
                "customer_phone": test_case["phone"],
                "agent_id": "agent_001",
                "start_time": datetime.now(timezone.utc),
                "end_time": datetime.now(timezone.utc) + timedelta(minutes=5),
                "transcript": "Short test call for geographic analysis."
            }
            
            call_report = await call_reporting_service.analyze_call_and_generate_report(call_data)
            
            assert call_report.customer_country == test_case["expected_country"]
            assert call_report.customer_timezone == test_case["expected_timezone"]

    @pytest.mark.asyncio
    async def test_call_quality_scoring(self, call_reporting_service, sample_call_data):
        """Test call quality scoring and analysis"""
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        
        # Verify quality scoring
        assert call_report.call_quality_score == 9.2
        assert call_report.call_quality_score >= 8.0  # High quality call
        
        # Quality should correlate with positive sentiment
        assert call_report.sentiment == Sentiment.POSITIVE

    @pytest.mark.asyncio
    async def test_error_handling_and_recovery(self, call_reporting_service, mock_openai_client):
        """Test error handling when AI analysis fails"""
        
        # Mock OpenAI failure
        mock_openai_client.chat.completions.create.side_effect = Exception("OpenAI API Error")
        
        call_data = {
            "call_id": "test_call_error",
            "customer_phone": "+1234567890",
            "agent_id": "agent_001",
            "start_time": datetime.now(timezone.utc),
            "end_time": datetime.now(timezone.utc) + timedelta(minutes=5),
            "transcript": "Test call for error handling"
        }
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(call_data)
        
        # Should still create report with basic info
        assert call_report.call_id == "test_call_error"
        assert call_report.status == CallStatus.COMPLETED
        
        # AI analysis should have fallback values
        assert call_report.sentiment == Sentiment.NEUTRAL  # Default fallback
        assert call_report.ai_analysis_failed == True

    @pytest.mark.asyncio
    async def test_performance_timing(self, call_reporting_service, sample_call_data):
        """Test performance and timing of call analysis"""
        
        start_time = datetime.now()
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        end_time = datetime.now()
        
        # Analysis should complete quickly (under 30 seconds)
        processing_time = (end_time - start_time).total_seconds()
        assert processing_time < 30.0
        
        # Verify report has performance metadata
        assert hasattr(call_report, 'processing_time_seconds')
        assert call_report.processing_time_seconds > 0

    @pytest.mark.asyncio
    async def test_bulk_call_analysis(self, call_reporting_service):
        """Test bulk processing of multiple calls"""
        
        # Generate multiple call records
        call_batch = []
        for i in range(5):
            call_data = {
                "call_id": f"bulk_test_call_{i:03d}",
                "customer_phone": f"+34612345{i:03d}",
                "agent_id": "agent_001",
                "start_time": datetime.now(timezone.utc) - timedelta(minutes=i*10),
                "end_time": datetime.now(timezone.utc) - timedelta(minutes=i*10-5),
                "transcript": f"Test call number {i} for bulk processing analysis."
            }
            call_batch.append(call_data)
        
        # Process all calls
        reports = []
        for call_data in call_batch:
            report = await call_reporting_service.analyze_call_and_generate_report(call_data)
            reports.append(report)
        
        # Verify all calls were processed
        assert len(reports) == 5
        
        # Verify each report is valid
        for i, report in enumerate(reports):
            assert report.call_id == f"bulk_test_call_{i:03d}"
            assert report.customer_country == "ES"  # All Spanish numbers
            assert report.status == CallStatus.COMPLETED

    @pytest.mark.asyncio
    async def test_follow_up_scheduling_logic(self, call_reporting_service, sample_call_data):
        """Test follow-up scheduling logic based on call analysis"""
        
        call_report = await call_reporting_service.analyze_call_and_generate_report(sample_call_data)
        
        # Verify follow-up scheduling
        assert call_report.follow_up_required == True
        assert call_report.follow_up_type == FollowUpType.SCHEDULED_APPOINTMENT
        
        # Calculate optimal follow-up time based on customer timezone
        if call_report.customer_timezone:
            # Should schedule during business hours in customer's timezone
            assert call_report.optimal_callback_time is not None
            
            # For European timezone, should be during 9-18 hours local time
            callback_hour = call_report.optimal_callback_time.hour
            assert 9 <= callback_hour <= 18

# Integration test for the complete call reporting workflow
class TestCallReportingIntegration:
    """Integration tests for the complete call reporting workflow"""

    @pytest.mark.asyncio
    async def test_end_to_end_call_processing(self):
        """Test complete end-to-end call processing workflow"""
        
        # This would be run in a staging environment with real database
        # For now, test the workflow structure
        
        workflow_steps = [
            "receive_call_data",
            "extract_basic_information", 
            "analyze_customer_location",
            "perform_ai_analysis",
            "generate_call_report",
            "schedule_follow_up",
            "store_in_database",
            "trigger_notifications"
        ]
        
        # Verify all workflow steps are implemented
        from backend.services.call_reporting_service import CallReportingService
        
        # Check that service has all required methods
        service_methods = dir(CallReportingService)
        
        for step in ["analyze_call_and_generate_report", "_extract_call_information", 
                    "_analyze_customer_location", "_perform_ai_analysis"]:
            assert step in service_methods or step.replace("_", "") in service_methods

    @pytest.mark.asyncio 
    async def test_monitoring_integration(self):
        """Test integration with monitoring service"""
        
        # Verify that call reporting service integrates with monitoring
        from backend.services.call_reporting_service import CallReportingService
        
        # Should have monitoring integration points
        service = CallReportingService(Mock())
        
        # Should be able to record metrics
        assert hasattr(service, '_record_processing_time') or hasattr(service, 'record_metric')

# Performance and Load Testing
class TestCallReportingPerformance:
    """Performance tests for call reporting service"""

    @pytest.mark.asyncio
    async def test_concurrent_call_processing(self, call_reporting_service):
        """Test concurrent processing of multiple calls"""
        
        async def process_single_call(call_id: int):
            call_data = {
                "call_id": f"concurrent_call_{call_id:03d}",
                "customer_phone": f"+34612345{call_id:03d}",
                "agent_id": "agent_001",
                "start_time": datetime.now(timezone.utc),
                "end_time": datetime.now(timezone.utc) + timedelta(minutes=5),
                "transcript": f"Concurrent test call {call_id}"
            }
            return await call_reporting_service.analyze_call_and_generate_report(call_data)
        
        # Process 10 calls concurrently
        start_time = datetime.now()
        tasks = [process_single_call(i) for i in range(10)]
        reports = await asyncio.gather(*tasks)
        end_time = datetime.now()
        
        # Verify all calls processed successfully
        assert len(reports) == 10
        
        # Concurrent processing should be faster than sequential
        processing_time = (end_time - start_time).total_seconds()
        assert processing_time < 60.0  # Should complete in under 1 minute

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])