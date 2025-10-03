"""
Integration Tests for AI Orchestrator API
Testing AI agent management, query processing, and orchestration endpoints.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import patch, Mock, AsyncMock
import json
import uuid

from fastapi.testclient import TestClient
from backend.main import app

class TestAIOrchestatorAPIIntegration:
    """Integration test suite for AI Orchestrator API endpoints."""

    @pytest.fixture
    def client(self):
        """Create FastAPI test client."""
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self, client):
        """Get authentication headers."""
        return {
            'Authorization': 'Bearer test_ai_token',
            'Content-Type': 'application/json'
        }

    @pytest.fixture
    def sample_query_data(self):
        """Sample AI query request data."""
        return {
            'query_text': 'Find me the best vacation packages to Tokyo for 2 people in December',
            'query_type': 'booking_assistance',
            'user_id': 'user_123',
            'context': {
                'destination': 'Tokyo',
                'travelers': 2,
                'budget': 5000,
                'travel_dates': ['2024-12-15', '2024-12-25'],
                'preferences': ['cultural_experiences', 'luxury_hotels']
            },
            'priority': 'medium',
            'timeout': 30.0
        }

    @pytest.fixture
    def mock_agent_response(self):
        """Mock agent response data."""
        return {
            'agent_id': 'booking_optimizer_001',
            'agent_name': 'booking_optimizer',
            'response': {
                'recommendations': [
                    {
                        'package_id': 'tokyo_luxury_001',
                        'title': 'Tokyo Imperial Experience',
                        'price': 4750.00,
                        'confidence': 0.95,
                        'highlights': ['Imperial Palace', 'Michelin dining', 'Luxury ryokan'],
                        'savings': 250.00
                    }
                ],
                'optimization_applied': True,
                'processing_time': 0.15
            },
            'confidence': 0.95,
            'processing_time': 0.15
        }

    def test_ai_query_endpoint_unauthorized(self, client, sample_query_data):
        """Test AI query endpoint without authentication."""
        response = client.post('/api/ai/query', json=sample_query_data)
        assert response.status_code == 401

    def test_process_ai_query_success(self, client, auth_headers, sample_query_data, mock_agent_response):
        """Test successful AI query processing."""
        with patch('backend.ai_manager.AIOrchestrator.process_query') as mock_process:
            mock_process.return_value = {
                'query_id': str(uuid.uuid4()),
                'success': True,
                'response_text': 'Found 3 excellent Tokyo packages matching your criteria.',
                'confidence_score': 0.95,
                'processing_time': 0.25,
                'agent_responses': [mock_agent_response],
                'metadata': {
                    'agents_consulted': ['booking_optimizer', 'revenue_maximizer'],
                    'total_recommendations': 3
                }
            }
            
            response = client.post(
                '/api/ai/query',
                json=sample_query_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['query_id'] is not None
            assert data['confidence_score'] == 0.95
            assert len(data['agent_responses']) == 1

    def test_ai_query_validation_error(self, client, auth_headers):
        """Test AI query validation errors."""
        invalid_query = {
            'query_text': '',  # Empty query text
            'query_type': 'invalid_type',  # Invalid type
            'user_id': ''  # Empty user ID
        }
        
        response = client.post(
            '/api/ai/query',
            json=invalid_query,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error

    def test_ai_query_timeout_handling(self, client, auth_headers, sample_query_data):
        """Test AI query timeout handling."""
        sample_query_data['timeout'] = 1.0  # Very short timeout
        
        with patch('backend.ai_manager.AIOrchestrator.process_query') as mock_process:
            async def slow_process(*args, **kwargs):
                await asyncio.sleep(2.0)  # Simulate slow response
                return {'success': False, 'error': 'timeout'}
            
            mock_process.side_effect = slow_process
            
            response = client.post(
                '/api/ai/query',
                json=sample_query_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            # Should handle timeout gracefully
            assert data['success'] is False or 'timeout' in data.get('error_message', '').lower()

    def test_list_available_agents(self, client, auth_headers):
        """Test listing available AI agents."""
        mock_agents = [
            {
                'agent_id': 'booking_optimizer_001',
                'agent_name': 'booking_optimizer',
                'status': 'active',
                'track': 'track_1',
                'capabilities': ['booking_optimization', 'price_comparison'],
                'load': 15,
                'uptime': '99.8%'
            },
            {
                'agent_id': 'revenue_maximizer_001',
                'agent_name': 'revenue_maximizer',
                'status': 'active',
                'track': 'track_1',
                'capabilities': ['revenue_optimization', 'dynamic_pricing'],
                'load': 8,
                'uptime': '99.9%'
            },
            {
                'agent_id': 'security_guard_001',
                'agent_name': 'security_guard',
                'status': 'maintenance',
                'track': 'track_2',
                'capabilities': ['security_assessment', 'threat_detection'],
                'load': 0,
                'uptime': '98.5%'
            }
        ]
        
        with patch('backend.ai_manager.AIOrchestrator.get_agent_status') as mock_status:
            mock_status.return_value = mock_agents
            
            response = client.get(
                '/api/ai/agents',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['agents']) == 3
            assert data['total_agents'] == 3
            assert data['active_agents'] == 2

    def test_get_agent_details(self, client, auth_headers):
        """Test getting specific agent details."""
        agent_id = 'booking_optimizer_001'
        
        mock_agent_details = {
            'agent_id': agent_id,
            'agent_name': 'booking_optimizer',
            'status': 'active',
            'track': 'track_1',
            'capabilities': ['booking_optimization', 'price_comparison', 'inventory_management'],
            'performance_metrics': {
                'requests_processed': 1250,
                'avg_response_time': 0.18,
                'success_rate': 0.97,
                'uptime_percentage': 99.8
            },
            'current_load': 12,
            'last_active': datetime.now().isoformat(),
            'version': '2.1.0'
        }
        
        with patch('backend.ai_manager.AIOrchestrator.get_agent_details') as mock_details:
            mock_details.return_value = mock_agent_details
            
            response = client.get(
                f'/api/ai/agents/{agent_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['agent_id'] == agent_id
            assert data['agent_name'] == 'booking_optimizer'
            assert data['success_rate'] == 0.97

    def test_agent_health_check(self, client, auth_headers):
        """Test agent health check endpoint."""
        agent_id = 'content_master_001'
        
        mock_health_status = {
            'agent_id': agent_id,
            'status': 'healthy',
            'response_time': 0.05,
            'memory_usage': 45.2,
            'cpu_usage': 12.1,
            'last_query_processed': datetime.now().isoformat(),
            'error_count_24h': 2,
            'uptime': '72h 15m'
        }
        
        with patch('backend.ai_manager.AIOrchestrator.check_agent_health') as mock_health:
            mock_health.return_value = mock_health_status
            
            response = client.get(
                f'/api/ai/agents/{agent_id}/health',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['status'] == 'healthy'
            assert data['response_time'] == 0.05

    def test_system_analytics(self, client, auth_headers):
        """Test AI system analytics endpoint."""
        mock_analytics = {
            'total_queries_processed': 15750,
            'queries_last_24h': 1250,
            'avg_query_response_time': 0.22,
            'system_success_rate': 0.96,
            'active_agents_count': 23,
            'total_agents_registered': 25,
            'system_uptime': '15d 8h 42m',
            'peak_queries_per_hour': 180,
            'top_performing_agents': [
                {'name': 'booking_optimizer', 'success_rate': 0.98},
                {'name': 'revenue_maximizer', 'success_rate': 0.97},
                {'name': 'content_master', 'success_rate': 0.95}
            ],
            'query_types_distribution': {
                'booking_assistance': 45,
                'customer_service': 25,
                'content_generation': 15,
                'price_optimization': 10,
                'other': 5
            }
        }
        
        with patch('backend.ai_manager.AIOrchestrator.get_system_analytics') as mock_analytics_call:
            mock_analytics_call.return_value = mock_analytics
            
            response = client.get(
                '/api/ai/analytics',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_queries_processed'] == 15750
            assert data['system_success_rate'] == 0.96
            assert len(data['top_performing_agents']) == 3

    def test_query_history(self, client, auth_headers):
        """Test query history retrieval."""
        user_id = 'user_123'
        
        mock_query_history = [
            {
                'query_id': 'query_001',
                'query_text': 'Find Paris hotels',
                'query_type': 'booking_assistance',
                'timestamp': datetime.now().isoformat(),
                'success': True,
                'confidence_score': 0.92,
                'agents_used': ['booking_optimizer'],
                'processing_time': 0.18
            },
            {
                'query_id': 'query_002',
                'query_text': 'What is the weather in Rome?',
                'query_type': 'information_request',
                'timestamp': (datetime.now() - timedelta(hours=2)).isoformat(),
                'success': True,
                'confidence_score': 0.88,
                'agents_used': ['weather_agent'],
                'processing_time': 0.12
            }
        ]
        
        with patch('backend.ai_manager.AIOrchestrator.get_query_history') as mock_history:
            mock_history.return_value = mock_query_history
            
            response = client.get(
                f'/api/ai/queries/history/{user_id}',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['queries']) == 2
            assert data['queries'][0]['query_id'] == 'query_001'

    def test_agent_capability_matching(self, client, auth_headers):
        """Test agent capability matching for queries."""
        query_requirements = {
            'required_capabilities': ['booking_optimization', 'price_comparison'],
            'query_type': 'booking_assistance',
            'complexity_level': 'medium',
            'expected_response_time': 0.5
        }
        
        mock_matching_agents = [
            {
                'agent_id': 'booking_optimizer_001',
                'agent_name': 'booking_optimizer',
                'capability_match': 0.95,
                'current_load': 15,
                'estimated_response_time': 0.18
            },
            {
                'agent_id': 'revenue_maximizer_001',
                'agent_name': 'revenue_maximizer',
                'capability_match': 0.78,
                'current_load': 8,
                'estimated_response_time': 0.22
            }
        ]
        
        with patch('backend.ai_manager.AIOrchestrator.find_matching_agents') as mock_match:
            mock_match.return_value = mock_matching_agents
            
            response = client.post(
                '/api/ai/agents/match',
                json=query_requirements,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['matching_agents']) == 2
            assert data['matching_agents'][0]['capability_match'] == 0.95

    def test_agent_load_balancing_info(self, client, auth_headers):
        """Test agent load balancing information."""
        mock_load_info = {
            'total_system_load': 45.2,
            'load_distribution': [
                {'track': 'track_1', 'load_percentage': 62.5, 'agents_count': 10},
                {'track': 'track_2', 'load_percentage': 28.3, 'agents_count': 5},
                {'track': 'track_3', 'load_percentage': 35.8, 'agents_count': 10}
            ],
            'overloaded_agents': [
                {'agent_name': 'booking_optimizer', 'current_load': 89.2},
                {'agent_name': 'customer_prophet', 'current_load': 78.5}
            ],
            'recommended_actions': [
                'Scale up booking_optimizer instances',
                'Redistribute queries from track_1 to track_3'
            ]
        }
        
        with patch('backend.ai_manager.AIOrchestrator.get_load_balancing_info') as mock_load:
            mock_load.return_value = mock_load_info
            
            response = client.get(
                '/api/ai/system/load-balancing',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_system_load'] == 45.2
            assert len(data['overloaded_agents']) == 2

    def test_multi_agent_query_processing(self, client, auth_headers):
        """Test query processing involving multiple agents."""
        complex_query = {
            'query_text': 'Plan a sustainable luxury trip to Costa Rica with cultural immersion and adventure activities',
            'query_type': 'comprehensive_planning',
            'user_id': 'user_456',
            'context': {
                'budget': 8000,
                'duration': '14 days',
                'interests': ['sustainability', 'luxury', 'adventure', 'culture'],
                'group_size': 2
            },
            'require_multiple_agents': True
        }
        
        mock_multi_agent_response = {
            'query_id': str(uuid.uuid4()),
            'success': True,
            'response_text': 'Comprehensive sustainable luxury Costa Rica itinerary created',
            'confidence_score': 0.93,
            'processing_time': 1.2,
            'agent_responses': [
                {
                    'agent_name': 'sustainability_advisor',
                    'contribution': 'Eco-friendly accommodations and activities',
                    'confidence': 0.96
                },
                {
                    'agent_name': 'luxury_upsell',
                    'contribution': 'Premium eco-lodges and exclusive experiences',
                    'confidence': 0.92
                },
                {
                    'agent_name': 'cultural_adaptation',
                    'contribution': 'Local cultural experiences and community visits',
                    'confidence': 0.94
                }
            ],
            'coordination_summary': 'Successfully coordinated 3 specialized agents'
        }
        
        with patch('backend.ai_manager.AIOrchestrator.process_multi_agent_query') as mock_multi:
            mock_multi.return_value = mock_multi_agent_response
            
            response = client.post(
                '/api/ai/query/multi-agent',
                json=complex_query,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert len(data['agent_responses']) == 3
            assert data['confidence_score'] == 0.93

    def test_agent_performance_metrics(self, client, auth_headers):
        """Test agent performance metrics endpoint."""
        date_from = (datetime.now() - timedelta(days=7)).date().isoformat()
        date_to = datetime.now().date().isoformat()
        
        mock_performance_data = {
            'time_period': {'from': date_from, 'to': date_to},
            'agent_metrics': [
                {
                    'agent_name': 'booking_optimizer',
                    'queries_processed': 450,
                    'avg_response_time': 0.18,
                    'success_rate': 0.97,
                    'user_satisfaction': 4.6,
                    'errors_count': 12
                },
                {
                    'agent_name': 'content_master',
                    'queries_processed': 320,
                    'avg_response_time': 0.25,
                    'success_rate': 0.95,
                    'user_satisfaction': 4.4,
                    'errors_count': 8
                }
            ],
            'system_overview': {
                'total_queries': 2150,
                'system_avg_response_time': 0.21,
                'system_success_rate': 0.96,
                'peak_hour': '14:00-15:00'
            }
        }
        
        with patch('backend.ai_manager.AIOrchestrator.get_performance_metrics') as mock_metrics:
            mock_metrics.return_value = mock_performance_data
            
            response = client.get(
                '/api/ai/metrics/performance',
                params={'date_from': date_from, 'date_to': date_to},
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data['agent_metrics']) == 2
            assert data['system_overview']['total_queries'] == 2150

    def test_emergency_agent_management(self, client, auth_headers):
        """Test emergency agent management operations."""
        # Test agent emergency shutdown
        agent_id = 'malfunctioning_agent_001'
        
        with patch('backend.ai_manager.AIOrchestrator.emergency_shutdown_agent') as mock_shutdown:
            mock_shutdown.return_value = {'success': True, 'agent_id': agent_id, 'status': 'shutdown'}
            
            response = client.post(
                f'/api/ai/agents/{agent_id}/emergency-shutdown',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['status'] == 'shutdown'

        # Test system-wide emergency stop
        with patch('backend.ai_manager.AIOrchestrator.emergency_system_stop') as mock_system_stop:
            mock_system_stop.return_value = {
                'success': True,
                'stopped_agents': 25,
                'timestamp': datetime.now().isoformat()
            }
            
            response = client.post(
                '/api/ai/system/emergency-stop',
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['stopped_agents'] == 25

class TestAIOrchestatorAPIPerformance:
    """Performance tests for AI Orchestrator API."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_ai_queries_performance(self, client, auth_headers):
        """Test concurrent AI query processing performance."""
        import time
        import concurrent.futures
        
        def process_query(i):
            query_data = {
                'query_text': f'Find vacation packages for query {i}',
                'query_type': 'booking_assistance',
                'user_id': f'perf_user_{i}',
                'context': {'destination': f'destination_{i}'},
                'priority': 'medium'
            }
            
            mock_response = {
                'query_id': f'query_{i}',
                'success': True,
                'response_text': f'Response for query {i}',
                'confidence_score': 0.9,
                'processing_time': 0.2
            }
            
            with patch('backend.ai_manager.AIOrchestrator.process_query', return_value=mock_response):
                return client.post(
                    '/api/ai/query',
                    json=query_data,
                    headers=auth_headers
                )
        
        start_time = time.time()
        
        # Process 30 concurrent queries
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(process_query, i) for i in range(30)]
            responses = [future.result() for future in futures]
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should handle 30 queries within 15 seconds
        assert processing_time < 15.0
        
        # All queries should succeed
        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count == 30
        
        # Calculate throughput
        throughput = 30 / processing_time
        assert throughput >= 3.0  # At least 3 queries per second

    def test_agent_status_polling_performance(self, client, auth_headers):
        """Test performance of agent status polling."""
        import time
        
        mock_agents_status = [
            {
                'agent_id': f'agent_{i}',
                'agent_name': f'test_agent_{i}',
                'status': 'active',
                'load': i % 100
            }
            for i in range(25)  # All 25 agents
        ]
        
        with patch('backend.ai_manager.AIOrchestrator.get_agent_status', return_value=mock_agents_status):
            start_time = time.time()
            
            # Poll agent status 20 times rapidly
            for _ in range(20):
                response = client.get('/api/ai/agents', headers=auth_headers)
                assert response.status_code == 200
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Should complete 20 status checks within 5 seconds
            assert total_time < 5.0
            
            # Calculate rate
            rate = 20 / total_time
            assert rate >= 10.0  # At least 10 status checks per second