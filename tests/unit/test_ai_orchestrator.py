"""
Unit Tests for AI Orchestrator and Agent Management
Comprehensive testing for the AI agents system and orchestration.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import json
import uuid

from backend.ai_manager import (
    AIOrchestrator, AgentTrack, AgentStatus, QueryType, 
    AgentCapability, AgentMetrics, QueryRequest, QueryResponse
)
from ai_agents.core.base_agent import BaseAIAgent

# Mock AI Agent for testing
class MockAIAgent(BaseAIAgent):
    """Mock AI agent for testing purposes."""
    
    def __init__(self, agent_name: str, config: dict = None):
        super().__init__(agent_name, config)
        self.mock_responses = {}
        
    async def process_query(self, query: str, context: dict = None) -> dict:
        """Mock query processing."""
        return {
            'response': f'Mock response from {self.agent_name}',
            'confidence': 0.95,
            'processing_time': 0.1,
            'agent_id': self.agent_id
        }
    
    def set_mock_response(self, query_type: str, response: dict):
        """Set mock response for specific query type."""
        self.mock_responses[query_type] = response

class TestAIOrchestrator:
    """Test suite for AIOrchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create AI orchestrator instance."""
        return AIOrchestrator()

    @pytest.fixture
    def sample_query_request(self):
        """Create sample query request."""
        return QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Find me the best deals for Paris vacation packages",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="user_123",
            context={
                'destination': 'Paris',
                'budget': 2000,
                'travel_dates': ['2024-12-15', '2024-12-22'],
                'travelers': 2
            },
            priority='medium',
            timeout=30.0
        )

    @pytest.fixture
    def mock_booking_agent(self):
        """Create mock booking optimizer agent."""
        agent = MockAIAgent('booking_optimizer', {
            'capabilities': ['booking_optimization', 'price_comparison'],
            'track': 'track_1'
        })
        agent.set_mock_response('booking_assistance', {
            'recommendations': [
                {
                    'package_id': 'paris_deluxe_001',
                    'price': 1850,
                    'confidence': 0.92,
                    'savings': 150
                }
            ],
            'optimization_applied': True
        })
        return agent

    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self, orchestrator):
        """Test orchestrator initialization."""
        assert orchestrator is not None
        assert hasattr(orchestrator, 'agents')
        assert hasattr(orchestrator, 'agent_registry')
        assert orchestrator.status == 'initialized'

    @pytest.mark.asyncio
    async def test_register_agent_success(self, orchestrator, mock_booking_agent):
        """Test successful agent registration."""
        result = await orchestrator.register_agent(mock_booking_agent)
        
        assert result is True
        assert mock_booking_agent.agent_id in orchestrator.agents
        assert mock_booking_agent.agent_name in orchestrator.agent_registry
        assert orchestrator.agent_registry[mock_booking_agent.agent_name]['status'] == AgentStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_unregister_agent_success(self, orchestrator, mock_booking_agent):
        """Test successful agent unregistration."""
        # First register the agent
        await orchestrator.register_agent(mock_booking_agent)
        
        # Then unregister it
        result = await orchestrator.unregister_agent(mock_booking_agent.agent_id)
        
        assert result is True
        assert mock_booking_agent.agent_id not in orchestrator.agents
        assert orchestrator.agent_registry[mock_booking_agent.agent_name]['status'] == AgentStatus.INACTIVE

    @pytest.mark.asyncio
    async def test_process_query_single_agent(self, orchestrator, mock_booking_agent, sample_query_request):
        """Test processing query with single appropriate agent."""
        # Register the agent
        await orchestrator.register_agent(mock_booking_agent)
        
        # Process query
        response = await orchestrator.process_query(sample_query_request)
        
        assert isinstance(response, QueryResponse)
        assert response.success is True
        assert response.query_id == sample_query_request.query_id
        assert len(response.agent_responses) > 0
        assert response.confidence_score >= 0.0

    @pytest.mark.asyncio
    async def test_process_query_multiple_agents(self, orchestrator):
        """Test processing query with multiple relevant agents."""
        # Create multiple agents
        booking_agent = MockAIAgent('booking_optimizer')
        revenue_agent = MockAIAgent('revenue_maximizer')
        content_agent = MockAIAgent('content_master')
        
        # Register agents
        await orchestrator.register_agent(booking_agent)
        await orchestrator.register_agent(revenue_agent)
        await orchestrator.register_agent(content_agent)
        
        query_request = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Create marketing content for luxury Paris packages",
            query_type=QueryType.CONTENT_GENERATION,
            user_id="user_456"
        )
        
        response = await orchestrator.process_query(query_request)
        
        assert isinstance(response, QueryResponse)
        assert response.success is True
        assert len(response.agent_responses) >= 1

    @pytest.mark.asyncio
    async def test_query_routing_by_type(self, orchestrator):
        """Test query routing based on query type."""
        # Create specialized agents
        security_agent = MockAIAgent('security_guard', {'track': 'track_2'})
        booking_agent = MockAIAgent('booking_optimizer', {'track': 'track_1'})
        
        await orchestrator.register_agent(security_agent)
        await orchestrator.register_agent(booking_agent)
        
        # Security query should route to security agent
        security_query = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Assess security risks for travel to region X",
            query_type=QueryType.SECURITY_ASSESSMENT,
            user_id="admin_123"
        )
        
        with patch.object(orchestrator, '_select_agents_for_query') as mock_select:
            mock_select.return_value = [security_agent]
            
            response = await orchestrator.process_query(security_query)
            
            assert response.success is True
            mock_select.assert_called_once_with(security_query)

    @pytest.mark.asyncio
    async def test_agent_load_balancing(self, orchestrator):
        """Test load balancing across multiple agents."""
        # Create multiple agents of same type
        agents = []
        for i in range(3):
            agent = MockAIAgent(f'booking_optimizer_{i}')
            agent.performance_metrics['requests_processed'] = i * 10  # Different loads
            agents.append(agent)
            await orchestrator.register_agent(agent)
        
        query_request = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Find best booking deals",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="user_789"
        )
        
        with patch.object(orchestrator, '_select_least_loaded_agent') as mock_select:
            mock_select.return_value = agents[0]  # Least loaded agent
            
            response = await orchestrator.process_query(query_request)
            
            assert response.success is True
            mock_select.assert_called()

    @pytest.mark.asyncio
    async def test_agent_health_monitoring(self, orchestrator, mock_booking_agent):
        """Test agent health monitoring and status updates."""
        await orchestrator.register_agent(mock_booking_agent)
        
        # Simulate health check
        with patch.object(mock_booking_agent, 'health_check') as mock_health:
            mock_health.return_value = {
                'status': 'healthy',
                'response_time': 0.05,
                'memory_usage': 45.2,
                'cpu_usage': 12.1
            }
            
            health_status = await orchestrator.check_agent_health(mock_booking_agent.agent_id)
            
            assert health_status['status'] == 'healthy'
            assert health_status['response_time'] == 0.05
            mock_health.assert_called_once()

    @pytest.mark.asyncio
    async def test_agent_performance_metrics(self, orchestrator, mock_booking_agent):
        """Test agent performance metrics tracking."""
        await orchestrator.register_agent(mock_booking_agent)
        
        # Simulate processing multiple queries
        for i in range(5):
            query = QueryRequest(
                query_id=str(uuid.uuid4()),
                query_text=f"Test query {i}",
                query_type=QueryType.BOOKING_ASSISTANCE,
                user_id=f"user_{i}"
            )
            await orchestrator.process_query(query)
        
        metrics = await orchestrator.get_agent_metrics(mock_booking_agent.agent_id)
        
        assert isinstance(metrics, AgentMetrics)
        assert metrics.requests_processed >= 5
        assert metrics.avg_response_time >= 0.0
        assert 0.0 <= metrics.success_rate <= 1.0

    @pytest.mark.asyncio
    async def test_query_timeout_handling(self, orchestrator, mock_booking_agent):
        """Test query timeout handling."""
        await orchestrator.register_agent(mock_booking_agent)
        
        # Mock slow agent response
        async def slow_process(*args, **kwargs):
            await asyncio.sleep(2.0)  # Simulate slow response
            return {'response': 'slow response'}
        
        mock_booking_agent.process_query = slow_process
        
        query_request = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Test timeout query",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="user_timeout",
            timeout=1.0  # 1 second timeout
        )
        
        response = await orchestrator.process_query(query_request)
        
        # Should handle timeout gracefully
        assert isinstance(response, QueryResponse)
        assert response.success is False or 'timeout' in response.error_message.lower()

    @pytest.mark.asyncio
    async def test_agent_error_handling(self, orchestrator, mock_booking_agent):
        """Test agent error handling and recovery."""
        await orchestrator.register_agent(mock_booking_agent)
        
        # Mock agent error
        async def error_process(*args, **kwargs):
            raise Exception("Agent processing error")
        
        mock_booking_agent.process_query = error_process
        
        query_request = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Test error query",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="user_error"
        )
        
        response = await orchestrator.process_query(query_request)
        
        assert isinstance(response, QueryResponse)
        # Should handle error gracefully
        assert response.success is False or response.error_message is not None

    @pytest.mark.asyncio
    async def test_concurrent_query_processing(self, orchestrator):
        """Test concurrent query processing capabilities."""
        # Register multiple agents
        agents = []
        for i in range(3):
            agent = MockAIAgent(f'agent_{i}')
            agents.append(agent)
            await orchestrator.register_agent(agent)
        
        # Create multiple concurrent queries
        queries = []
        for i in range(10):
            query = QueryRequest(
                query_id=str(uuid.uuid4()),
                query_text=f"Concurrent test query {i}",
                query_type=QueryType.BOOKING_ASSISTANCE,
                user_id=f"user_{i}"
            )
            queries.append(query)
        
        # Process queries concurrently
        tasks = [orchestrator.process_query(query) for query in queries]
        responses = await asyncio.gather(*tasks)
        
        # All queries should be processed
        assert len(responses) == 10
        for response in responses:
            assert isinstance(response, QueryResponse)

    @pytest.mark.asyncio
    async def test_agent_capability_matching(self, orchestrator):
        """Test agent selection based on capabilities."""
        # Create agents with different capabilities
        booking_agent = MockAIAgent('booking_optimizer')
        booking_agent.capabilities = [
            AgentCapability('booking_optimization', 0.9),
            AgentCapability('price_comparison', 0.8)
        ]
        
        content_agent = MockAIAgent('content_master')
        content_agent.capabilities = [
            AgentCapability('content_generation', 0.95),
            AgentCapability('marketing_copy', 0.87)
        ]
        
        await orchestrator.register_agent(booking_agent)
        await orchestrator.register_agent(content_agent)
        
        # Test booking query routing
        booking_query = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Optimize my booking options",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="user_capability"
        )
        
        selected_agents = orchestrator._select_agents_for_query(booking_query)
        
        # Should select booking agent for booking queries
        assert any(agent.agent_name == 'booking_optimizer' for agent in selected_agents)

    @pytest.mark.asyncio
    async def test_orchestrator_analytics(self, orchestrator):
        """Test orchestrator analytics and reporting."""
        # Create and register agents
        for i in range(3):
            agent = MockAIAgent(f'test_agent_{i}')
            await orchestrator.register_agent(agent)
        
        # Process some queries
        for i in range(15):
            query = QueryRequest(
                query_id=str(uuid.uuid4()),
                query_text=f"Analytics test query {i}",
                query_type=QueryType.BOOKING_ASSISTANCE,
                user_id=f"user_{i}"
            )
            await orchestrator.process_query(query)
        
        analytics = await orchestrator.get_system_analytics()
        
        assert 'total_queries_processed' in analytics
        assert 'active_agents_count' in analytics
        assert 'avg_query_response_time' in analytics
        assert 'system_uptime' in analytics
        assert analytics['total_queries_processed'] >= 15
        assert analytics['active_agents_count'] >= 3

    def test_query_request_validation(self):
        """Test QueryRequest model validation."""
        # Valid query request
        valid_query = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Valid query text",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="user_123"
        )
        assert valid_query.query_text == "Valid query text"
        assert valid_query.query_type == QueryType.BOOKING_ASSISTANCE
        
        # Invalid empty query text
        with pytest.raises(ValueError):
            QueryRequest(
                query_id=str(uuid.uuid4()),
                query_text="",  # Empty text
                query_type=QueryType.BOOKING_ASSISTANCE,
                user_id="user_123"
            )

    def test_query_response_model(self):
        """Test QueryResponse data model."""
        response = QueryResponse(
            query_id=str(uuid.uuid4()),
            success=True,
            response_text="Test response",
            confidence_score=0.95,
            processing_time=0.15,
            agent_responses=[
                {
                    'agent_id': 'agent_123',
                    'agent_name': 'booking_optimizer',
                    'response': 'Agent specific response'
                }
            ],
            metadata={'query_type': 'booking_assistance'}
        )
        
        assert response.success is True
        assert response.confidence_score == 0.95
        assert len(response.agent_responses) == 1

    def test_agent_enums(self):
        """Test agent enumeration values."""
        # AgentTrack enum
        assert AgentTrack.TRACK_1.value == 'track_1_customer_revenue'
        assert AgentTrack.TRACK_2.value == 'track_2_security_market'
        assert AgentTrack.TRACK_3.value == 'track_3_ethics_sustainability'
        
        # AgentStatus enum
        assert AgentStatus.ACTIVE.value == 'active'
        assert AgentStatus.INACTIVE.value == 'inactive'
        assert AgentStatus.ERROR.value == 'error'
        assert AgentStatus.MAINTENANCE.value == 'maintenance'
        
        # QueryType enum
        assert QueryType.BOOKING_ASSISTANCE.value == 'booking_assistance'
        assert QueryType.CUSTOMER_SERVICE.value == 'customer_service'
        assert QueryType.PRICE_OPTIMIZATION.value == 'price_optimization'

# Individual Agent Tests
class TestBaseAIAgent:
    """Test suite for BaseAIAgent."""
    
    @pytest.fixture
    def base_agent(self):
        """Create base agent instance."""
        return MockAIAgent('test_agent', {'test_config': True})
    
    def test_agent_initialization(self, base_agent):
        """Test agent initialization."""
        assert base_agent.agent_name == 'test_agent'
        assert base_agent.config['test_config'] is True
        assert base_agent.status == 'initialized'
        assert base_agent.agent_id is not None
        assert isinstance(base_agent.performance_metrics, dict)
    
    def test_agent_logger_setup(self, base_agent):
        """Test agent logger setup."""
        assert base_agent.logger is not None
        assert base_agent.logger.name == f'spirit_tours.{base_agent.agent_name}'
    
    @pytest.mark.asyncio
    async def test_agent_process_query(self, base_agent):
        """Test agent query processing."""
        result = await base_agent.process_query(
            "Test query",
            context={'test': 'context'}
        )
        
        assert isinstance(result, dict)
        assert 'response' in result
        assert result['agent_id'] == base_agent.agent_id
    
    def test_agent_performance_tracking(self, base_agent):
        """Test agent performance metrics tracking."""
        initial_requests = base_agent.performance_metrics['requests_processed']
        
        # Simulate processing a request
        base_agent._update_performance_metrics(
            response_time=0.15,
            success=True
        )
        
        assert base_agent.performance_metrics['requests_processed'] == initial_requests + 1

# Agent Track Specific Tests
class TestAgentTracks:
    """Test suite for different agent tracks."""
    
    def test_track1_agents_customer_revenue(self):
        """Test Track 1 agents (Customer & Revenue)."""
        track1_agents = [
            'booking_optimizer',
            'revenue_maximizer',
            'customer_prophet',
            'demand_forecaster',
            'experience_curator',
            'feedback_analyzer',
            'content_master',
            'social_sentiment',
            'competitive_intel',
            'multi_channel'
        ]
        
        for agent_name in track1_agents:
            agent = MockAIAgent(agent_name, {'track': 'track_1'})
            assert agent.agent_name == agent_name
            assert agent.config['track'] == 'track_1'
    
    def test_track2_agents_security_market(self):
        """Test Track 2 agents (Security & Market)."""
        track2_agents = [
            'security_guard',
            'market_entry',
            'route_genius',
            'influencer_match',
            'luxury_upsell'
        ]
        
        for agent_name in track2_agents:
            agent = MockAIAgent(agent_name, {'track': 'track_2'})
            assert agent.agent_name == agent_name
            assert agent.config['track'] == 'track_2'
    
    def test_track3_agents_ethics_sustainability(self):
        """Test Track 3 agents (Ethics & Sustainability)."""
        track3_agents = [
            'crisis_management',
            'personalization_engine',
            'cultural_adaptation',
            'sustainability_advisor',
            'data_privacy_guardian',
            'accessibility_enhancer',
            'carbon_footprint_tracker',
            'local_community_connector',
            'transparency_reporter',
            'ethical_ai_monitor'
        ]
        
        for agent_name in track3_agents:
            agent = MockAIAgent(agent_name, {'track': 'track_3'})
            assert agent.agent_name == agent_name
            assert agent.config['track'] == 'track_3'

# Performance and Integration Tests
class TestAISystemPerformance:
    """Performance testing for AI system."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_high_load_query_processing(self, orchestrator):
        """Test high load query processing."""
        import time
        
        # Register multiple agents
        for i in range(5):
            agent = MockAIAgent(f'load_test_agent_{i}')
            await orchestrator.register_agent(agent)
        
        # Create many concurrent queries
        queries = []
        for i in range(100):
            query = QueryRequest(
                query_id=str(uuid.uuid4()),
                query_text=f"Load test query {i}",
                query_type=QueryType.BOOKING_ASSISTANCE,
                user_id=f"load_user_{i}"
            )
            queries.append(query)
        
        start_time = time.time()
        
        # Process in batches to avoid overwhelming
        batch_size = 20
        all_responses = []
        
        for i in range(0, len(queries), batch_size):
            batch = queries[i:i+batch_size]
            tasks = [orchestrator.process_query(query) for query in batch]
            batch_responses = await asyncio.gather(*tasks)
            all_responses.extend(batch_responses)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should handle 100 queries within reasonable time
        assert processing_time < 30.0  # 30 seconds max
        assert len(all_responses) == 100
        
        # Most queries should succeed
        success_count = sum(1 for r in all_responses if r.success)
        success_rate = success_count / len(all_responses)
        assert success_rate >= 0.95  # 95% success rate
    
    @pytest.mark.asyncio
    async def test_memory_efficiency_ai_system(self, orchestrator):
        """Test memory efficiency of AI system."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Create and register many agents
        agents = []
        for i in range(25):  # All 25 agents
            agent = MockAIAgent(f'efficiency_agent_{i}')
            agents.append(agent)
            await orchestrator.register_agent(agent)
        
        # Process many queries
        for i in range(50):
            query = QueryRequest(
                query_id=str(uuid.uuid4()),
                query_text=f"Memory efficiency test {i}",
                query_type=QueryType.BOOKING_ASSISTANCE,
                user_id=f"memory_user_{i}"
            )
            await orchestrator.process_query(query)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 200MB)
        assert memory_increase < 200 * 1024 * 1024  # 200MB in bytes
        
        # Cleanup
        for agent in agents:
            await orchestrator.unregister_agent(agent.agent_id)
    
    @pytest.mark.asyncio
    async def test_agent_failover_mechanism(self, orchestrator):
        """Test agent failover and redundancy."""
        # Create redundant agents
        primary_agent = MockAIAgent('primary_booking_agent')
        backup_agent = MockAIAgent('backup_booking_agent')
        
        await orchestrator.register_agent(primary_agent)
        await orchestrator.register_agent(backup_agent)
        
        # Simulate primary agent failure
        async def failing_process(*args, **kwargs):
            raise Exception("Primary agent failed")
        
        primary_agent.process_query = failing_process
        
        query = QueryRequest(
            query_id=str(uuid.uuid4()),
            query_text="Test failover query",
            query_type=QueryType.BOOKING_ASSISTANCE,
            user_id="failover_user"
        )
        
        # Should still get response from backup agent
        response = await orchestrator.process_query(query)
        
        # System should handle failover gracefully
        assert isinstance(response, QueryResponse)
        # Either succeeds with backup or handles failure gracefully
        assert response.success is True or response.error_message is not None