"""
Tests for Itinerary Planner Agent

Comprehensive tests for the most complex agent.
"""

import pytest
from datetime import datetime

from ..tourism.itinerary_planner_agent import ItineraryPlannerAgent
from ..base.agent_base import AgentRequest, AgentStatus, AgentCapability


class TestItineraryPlannerAgent:
    """Test Itinerary Planner Agent"""
    
    def setup_method(self):
        """Setup test agent"""
        self.agent = ItineraryPlannerAgent()
    
    def test_agent_initialization(self):
        """Test agent initialization"""
        assert self.agent.name == 'itinerary_planner'
        assert self.agent.version == '1.0.0'
        assert len(self.agent.get_capabilities()) > 0
    
    def test_has_required_capabilities(self):
        """Test agent has required capabilities"""
        capabilities = self.agent.get_capabilities()
        
        assert AgentCapability.OPTIMIZATION in capabilities
        assert AgentCapability.RECOMMENDATION in capabilities
        assert AgentCapability.GEOSPATIAL in capabilities
        assert AgentCapability.SCHEDULING in capabilities
    
    def test_validate_create_itinerary_request(self):
        """Test validation of create_itinerary request"""
        request = AgentRequest(
            intent='create_itinerary',
            parameters={
                'start_location': [35.2137, 31.7683],
                'duration_days': 3,
                'interests': ['history', 'culture'],
            }
        )
        
        is_valid, error = self.agent.validate_request(request)
        
        assert is_valid is True
        assert error is None
    
    def test_validate_missing_parameters(self):
        """Test validation fails with missing parameters"""
        request = AgentRequest(
            intent='create_itinerary',
            parameters={
                'duration_days': 3,
                # Missing start_location and interests
            }
        )
        
        is_valid, error = self.agent.validate_request(request)
        
        assert is_valid is False
        assert error is not None
    
    def test_validate_unknown_intent(self):
        """Test validation fails with unknown intent"""
        request = AgentRequest(
            intent='unknown_intent',
            parameters={}
        )
        
        is_valid, error = self.agent.validate_request(request)
        
        assert is_valid is False
        assert 'Unknown intent' in error
    
    @pytest.mark.asyncio
    async def test_create_itinerary(self):
        """Test creating a complete itinerary"""
        request = AgentRequest(
            intent='create_itinerary',
            parameters={
                'start_location': [35.2137, 31.7683],  # Jerusalem
                'duration_days': 3,
                'interests': ['history', 'culture', 'religion'],
                'pace': 'moderate',
                'budget': 'moderate',
            }
        )
        
        response = await self.agent.execute(request)
        
        assert response.status == AgentStatus.COMPLETED
        assert response.result is not None
        assert 'itinerary' in response.result
        assert 'summary' in response.result
        
        itinerary = response.result['itinerary']
        assert itinerary['duration_days'] == 3
        assert len(itinerary['days']) == 3
        
        summary = response.result['summary']
        assert 'total_cost_usd' in summary
        assert 'total_distance_km' in summary
        assert 'total_stops' in summary
    
    @pytest.mark.asyncio
    async def test_create_itinerary_with_accessibility(self):
        """Test creating itinerary with accessibility requirements"""
        request = AgentRequest(
            intent='create_itinerary',
            parameters={
                'start_location': [35.2137, 31.7683],
                'duration_days': 2,
                'interests': ['history'],
                'accessibility': {
                    'wheelchair_required': True,
                },
            }
        )
        
        response = await self.agent.execute(request)
        
        assert response.status == AgentStatus.COMPLETED
        # All stops should be wheelchair accessible
        # (Implementation would filter stops based on accessibility)
    
    @pytest.mark.asyncio
    async def test_suggest_stops(self):
        """Test suggesting nearby stops"""
        request = AgentRequest(
            intent='suggest_stops',
            parameters={
                'current_location': [35.2137, 31.7683],  # Jerusalem
                'interests': ['history', 'culture'],
                'max_results': 5,
            }
        )
        
        response = await self.agent.execute(request)
        
        assert response.status == AgentStatus.COMPLETED
        assert 'suggestions' in response.result
        assert 'count' in response.result
        
        suggestions = response.result['suggestions']
        assert len(suggestions) <= 5
        assert all('name' in s and 'distance_km' in s for s in suggestions)
    
    @pytest.mark.asyncio
    async def test_optimize_itinerary(self):
        """Test optimizing stop order"""
        # Mock stops data
        stops = [
            {
                'name': 'Stop 1',
                'coordinates': [35.2137, 31.7683],
            },
            {
                'name': 'Stop 2',
                'coordinates': [35.2345, 31.7767],
            },
            {
                'name': 'Stop 3',
                'coordinates': [35.1753, 31.7743],
            },
        ]
        
        request = AgentRequest(
            intent='optimize_itinerary',
            parameters={
                'stops': stops,
            }
        )
        
        response = await self.agent.execute(request)
        
        assert response.status == AgentStatus.COMPLETED
        assert 'optimized_stops' in response.result
        assert 'improvement_percent' in response.result
        
        optimized = response.result['optimized_stops']
        assert len(optimized) == len(stops)
    
    @pytest.mark.asyncio
    async def test_different_paces(self):
        """Test itinerary creation with different paces"""
        paces = ['relaxed', 'moderate', 'fast']
        
        for pace in paces:
            request = AgentRequest(
                intent='create_itinerary',
                parameters={
                    'start_location': [35.2137, 31.7683],
                    'duration_days': 2,
                    'interests': ['history'],
                    'pace': pace,
                }
            )
            
            response = await self.agent.execute(request)
            
            assert response.status == AgentStatus.COMPLETED
            assert response.result['itinerary']['pace'] == pace
    
    @pytest.mark.asyncio
    async def test_execution_metrics(self):
        """Test that execution metrics are tracked"""
        request = AgentRequest(
            intent='suggest_stops',
            parameters={
                'current_location': [35.2137, 31.7683],
                'interests': ['history'],
                'max_results': 3,
            }
        )
        
        initial_count = self.agent.get_metrics()['execution_count']
        
        response = await self.agent.execute(request)
        
        assert response.execution_time_ms is not None
        assert response.execution_time_ms > 0
        
        metrics = self.agent.get_metrics()
        assert metrics['execution_count'] == initial_count + 1
    
    def test_haversine_distance_calculation(self):
        """Test distance calculation between coordinates"""
        # Jerusalem to Tel Aviv (approximately 54km)
        jerusalem = [35.2137, 31.7683]
        tel_aviv = [34.7818, 32.0853]
        
        distance = self.agent._haversine_distance(jerusalem, tel_aviv)
        
        # Distance should be approximately 54km (allow 10% margin)
        assert 48 < distance < 60
    
    def test_format_time(self):
        """Test time formatting"""
        assert self.agent._format_time(0) == '00:00'
        assert self.agent._format_time(60) == '01:00'
        assert self.agent._format_time(90) == '01:30'
        assert self.agent._format_time(1440) == '24:00'


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
