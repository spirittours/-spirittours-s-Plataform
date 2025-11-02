"""
Tests for AI Agents API

Tests for REST API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

# Import the router (assuming main app setup)
from ..api.agents import router, registry


# Create test app
app = FastAPI()
app.include_router(router)

client = TestClient(app)


class TestAgentsAPI:
    """Test Agents API endpoints"""
    
    def test_list_agents(self):
        """Test GET /api/agents"""
        response = client.get('/api/agents')
        
        assert response.status_code == 200
        agents = response.json()
        assert isinstance(agents, list)
        assert len(agents) > 0
        
        # Check agent structure
        first_agent = agents[0]
        assert 'name' in first_agent
        assert 'description' in first_agent
        assert 'version' in first_agent
        assert 'status' in first_agent
        assert 'capabilities' in first_agent
        assert 'metrics' in first_agent
    
    def test_get_agent_info(self):
        """Test GET /api/agents/{agent_name}"""
        response = client.get('/api/agents/itinerary_planner')
        
        assert response.status_code == 200
        agent = response.json()
        assert agent['name'] == 'itinerary_planner'
        assert 'capabilities' in agent
    
    def test_get_nonexistent_agent(self):
        """Test GET /api/agents/{agent_name} with invalid agent"""
        response = client.get('/api/agents/nonexistent_agent')
        
        assert response.status_code == 404
        assert 'not found' in response.json()['detail'].lower()
    
    def test_execute_agent(self):
        """Test POST /api/agents/{agent_name}/execute"""
        response = client.post(
            '/api/agents/itinerary_planner/execute',
            json={
                'intent': 'suggest_stops',
                'parameters': {
                    'current_location': [35.2137, 31.7683],
                    'interests': ['history'],
                    'max_results': 3,
                },
            }
        )
        
        assert response.status_code == 200
        result = response.json()
        assert 'request_id' in result
        assert 'agent_name' in result
        assert result['agent_name'] == 'itinerary_planner'
        assert 'status' in result
        assert 'result' in result
        assert 'execution_time_ms' in result
    
    def test_execute_agent_with_invalid_request(self):
        """Test agent execution with invalid request"""
        response = client.post(
            '/api/agents/itinerary_planner/execute',
            json={
                'intent': 'unknown_intent',
                'parameters': {},
            }
        )
        
        assert response.status_code == 200  # Request succeeds but agent returns error
        result = response.json()
        assert result['status'] == 'error'
        assert result['error'] is not None
    
    def test_get_metrics_summary(self):
        """Test GET /api/agents/metrics/summary"""
        response = client.get('/api/agents/metrics/summary')
        
        assert response.status_code == 200
        metrics = response.json()
        assert 'total_agents' in metrics
        assert 'total_executions' in metrics
        assert 'overall_success_rate' in metrics
        assert 'total_capabilities' in metrics
    
    def test_get_agent_metrics(self):
        """Test GET /api/agents/metrics/{agent_name}"""
        response = client.get('/api/agents/metrics/itinerary_planner')
        
        assert response.status_code == 200
        metrics = response.json()
        assert 'execution_count' in metrics
        assert 'success_rate' in metrics
        assert 'avg_execution_time_ms' in metrics
    
    def test_reset_agent_metrics(self):
        """Test POST /api/agents/metrics/{agent_name}/reset"""
        response = client.post('/api/agents/metrics/itinerary_planner/reset')
        
        assert response.status_code == 200
        result = response.json()
        assert result['status'] == 'success'
    
    def test_list_capabilities(self):
        """Test GET /api/agents/capabilities"""
        response = client.get('/api/agents/capabilities')
        
        assert response.status_code == 200
        capabilities = response.json()
        assert isinstance(capabilities, list)
        assert len(capabilities) > 0
    
    def test_get_agents_by_capability(self):
        """Test GET /api/agents/capabilities/{capability}/agents"""
        response = client.get('/api/agents/capabilities/optimization/agents')
        
        assert response.status_code == 200
        agents = response.json()
        assert isinstance(agents, list)
    
    def test_get_agents_by_invalid_capability(self):
        """Test capability endpoint with invalid capability"""
        response = client.get('/api/agents/capabilities/invalid_capability/agents')
        
        assert response.status_code == 400
    
    def test_health_check(self):
        """Test GET /api/agents/health"""
        response = client.get('/api/agents/health')
        
        assert response.status_code == 200
        health = response.json()
        assert health['status'] == 'healthy'
        assert 'agents_count' in health
        assert 'capabilities_count' in health


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
