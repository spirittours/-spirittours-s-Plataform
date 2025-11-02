"""
Tests for Agent Base Framework

Tests for AgentBase, AgentRegistry, and AgentOrchestrator.
"""

import pytest
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional

from ..base.agent_base import (
    AgentBase,
    AgentRequest,
    AgentResponse,
    AgentStatus,
    AgentCapability,
)
from ..base.agent_registry import AgentRegistry
from ..base.agent_orchestrator import AgentOrchestrator, Workflow


# Mock Agent for testing
class MockAgent(AgentBase):
    """Mock agent for testing"""
    
    def __init__(self, name: str = "mock_agent", should_fail: bool = False):
        super().__init__(
            name=name,
            description="Mock agent for testing",
            version="1.0.0"
        )
        self.should_fail = should_fail
        self.call_count = 0
    
    def get_capabilities(self) -> List[AgentCapability]:
        return [AgentCapability.DATA_ANALYSIS, AgentCapability.RECOMMENDATION]
    
    def validate_request(self, request: AgentRequest) -> tuple[bool, Optional[str]]:
        if not request.intent:
            return False, "Missing intent"
        return True, None
    
    async def process(self, request: AgentRequest) -> AgentResponse:
        self.call_count += 1
        
        if self.should_fail:
            raise Exception("Mock agent failure")
        
        return AgentResponse(
            request_id=request.request_id,
            agent_name=self.name,
            status=AgentStatus.COMPLETED,
            result={'success': True, 'data': 'mock_data'},
        )


class TestAgentBase:
    """Test AgentBase class"""
    
    @pytest.mark.asyncio
    async def test_agent_execute_success(self):
        """Test successful agent execution"""
        agent = MockAgent()
        request = AgentRequest(intent='test', parameters={})
        
        response = await agent.execute(request)
        
        assert response.status == AgentStatus.COMPLETED
        assert response.result is not None
        assert response.error is None
        assert agent.call_count == 1
    
    @pytest.mark.asyncio
    async def test_agent_execute_failure(self):
        """Test agent execution with error"""
        agent = MockAgent(should_fail=True)
        request = AgentRequest(intent='test', parameters={})
        
        response = await agent.execute(request)
        
        assert response.status == AgentStatus.ERROR
        assert response.error is not None
        assert 'Mock agent failure' in response.error
    
    @pytest.mark.asyncio
    async def test_agent_validation(self):
        """Test request validation"""
        agent = MockAgent()
        request = AgentRequest(intent='', parameters={})
        
        response = await agent.execute(request)
        
        assert response.status == AgentStatus.ERROR
        assert 'Invalid request' in response.error
    
    def test_agent_metrics(self):
        """Test agent metrics tracking"""
        agent = MockAgent()
        
        # Initial metrics
        metrics = agent.get_metrics()
        assert metrics['execution_count'] == 0
        assert metrics['error_count'] == 0
        assert metrics['success_rate'] == 0
        
        # After successful execution
        asyncio.run(agent.execute(AgentRequest(intent='test', parameters={})))
        
        metrics = agent.get_metrics()
        assert metrics['execution_count'] == 1
        assert metrics['error_count'] == 0
        assert metrics['success_rate'] == 1.0
    
    def test_agent_metrics_reset(self):
        """Test resetting agent metrics"""
        agent = MockAgent()
        
        # Execute some requests
        asyncio.run(agent.execute(AgentRequest(intent='test', parameters={})))
        asyncio.run(agent.execute(AgentRequest(intent='test', parameters={})))
        
        assert agent.get_metrics()['execution_count'] == 2
        
        # Reset metrics
        agent.reset_metrics()
        
        assert agent.get_metrics()['execution_count'] == 0


class TestAgentRegistry:
    """Test AgentRegistry class"""
    
    def setup_method(self):
        """Setup test registry"""
        self.registry = AgentRegistry()
        self.registry.clear()  # Clear any existing agents
    
    def test_register_agent(self):
        """Test agent registration"""
        agent = MockAgent(name='test_agent')
        
        success = self.registry.register(agent)
        
        assert success is True
        assert self.registry.get_agent_count() == 1
    
    def test_get_agent(self):
        """Test retrieving registered agent"""
        agent = MockAgent(name='test_agent')
        self.registry.register(agent)
        
        retrieved = self.registry.get_agent('test_agent')
        
        assert retrieved is not None
        assert retrieved.name == 'test_agent'
    
    def test_get_nonexistent_agent(self):
        """Test retrieving non-existent agent"""
        retrieved = self.registry.get_agent('nonexistent')
        
        assert retrieved is None
    
    def test_deregister_agent(self):
        """Test agent deregistration"""
        agent = MockAgent(name='test_agent')
        self.registry.register(agent)
        
        assert self.registry.get_agent_count() == 1
        
        success = self.registry.deregister('test_agent')
        
        assert success is True
        assert self.registry.get_agent_count() == 0
    
    def test_get_agents_by_capability(self):
        """Test finding agents by capability"""
        agent1 = MockAgent(name='agent1')
        agent2 = MockAgent(name='agent2')
        
        self.registry.register(agent1)
        self.registry.register(agent2)
        
        agents = self.registry.get_agents_by_capability(AgentCapability.DATA_ANALYSIS)
        
        assert len(agents) == 2
        assert all(AgentCapability.DATA_ANALYSIS in a.get_capabilities() for a in agents)
    
    def test_list_agents(self):
        """Test listing all agents"""
        agent1 = MockAgent(name='agent1')
        agent2 = MockAgent(name='agent2')
        
        self.registry.register(agent1)
        self.registry.register(agent2)
        
        agents = self.registry.list_agents()
        
        assert len(agents) == 2
        assert all('name' in a and 'capabilities' in a for a in agents)
    
    def test_get_capabilities(self):
        """Test getting all available capabilities"""
        agent = MockAgent(name='test_agent')
        self.registry.register(agent)
        
        capabilities = self.registry.get_capabilities()
        
        assert AgentCapability.DATA_ANALYSIS in capabilities
        assert AgentCapability.RECOMMENDATION in capabilities
    
    def test_agent_metrics(self):
        """Test aggregate agent metrics"""
        agent1 = MockAgent(name='agent1')
        agent2 = MockAgent(name='agent2')
        
        self.registry.register(agent1)
        self.registry.register(agent2)
        
        # Execute some requests
        asyncio.run(agent1.execute(AgentRequest(intent='test', parameters={})))
        asyncio.run(agent2.execute(AgentRequest(intent='test', parameters={})))
        
        metrics = self.registry.get_agent_metrics()
        
        assert metrics['total_agents'] == 2
        assert metrics['total_executions'] == 2
        assert metrics['total_errors'] == 0
        assert metrics['overall_success_rate'] == 1.0


class TestAgentOrchestrator:
    """Test AgentOrchestrator class"""
    
    def setup_method(self):
        """Setup test orchestrator"""
        self.registry = AgentRegistry()
        self.registry.clear()
        self.orchestrator = AgentOrchestrator(self.registry)
    
    @pytest.mark.asyncio
    async def test_simple_workflow(self):
        """Test simple sequential workflow"""
        # Register agents
        agent1 = MockAgent(name='agent1')
        agent2 = MockAgent(name='agent2')
        
        self.registry.register(agent1)
        self.registry.register(agent2)
        
        # Create workflow
        workflow = Workflow(
            name='test_workflow',
            description='Test workflow'
        )
        workflow.add_step('agent1', 'test', {})
        workflow.add_step('agent2', 'test', {})
        
        # Execute workflow
        result = await self.orchestrator.execute_workflow(workflow)
        
        assert result['status'] == 'completed'
        assert result['steps_executed'] == 2
        assert agent1.call_count == 1
        assert agent2.call_count == 1
    
    @pytest.mark.asyncio
    async def test_workflow_with_dependencies(self):
        """Test workflow with step dependencies"""
        # Register agents
        agent1 = MockAgent(name='agent1')
        agent2 = MockAgent(name='agent2')
        
        self.registry.register(agent1)
        self.registry.register(agent2)
        
        # Create workflow with dependencies
        workflow = Workflow(
            name='dependency_workflow',
            description='Workflow with dependencies'
        )
        workflow.add_step('agent1', 'test', {})
        workflow.add_step('agent2', 'test', {}, depends_on=[0])  # Depends on step 0
        
        # Execute workflow
        result = await self.orchestrator.execute_workflow(workflow)
        
        assert result['status'] == 'completed'
        assert result['steps_executed'] == 2
    
    @pytest.mark.asyncio
    async def test_workflow_failure(self):
        """Test workflow handling of agent failure"""
        # Register agents
        agent1 = MockAgent(name='agent1', should_fail=True)
        
        self.registry.register(agent1)
        
        # Create workflow
        workflow = Workflow(
            name='failing_workflow',
            description='Workflow that fails'
        )
        workflow.add_step('agent1', 'test', {})
        
        # Execute workflow
        result = await self.orchestrator.execute_workflow(workflow)
        
        assert result['status'] == 'error'
        assert 'error' in result
    
    @pytest.mark.asyncio
    async def test_parallel_execution(self):
        """Test parallel agent execution"""
        # Register agents
        agent1 = MockAgent(name='agent1')
        agent2 = MockAgent(name='agent2')
        
        self.registry.register(agent1)
        self.registry.register(agent2)
        
        # Create parallel requests
        requests = [
            ('agent1', AgentRequest(intent='test', parameters={})),
            ('agent2', AgentRequest(intent='test', parameters={})),
        ]
        
        # Execute in parallel
        responses = await self.orchestrator.execute_parallel(requests)
        
        assert len(responses) == 2
        assert all(r.status == AgentStatus.COMPLETED for r in responses)
        assert agent1.call_count == 1
        assert agent2.call_count == 1
    
    def test_register_workflow(self):
        """Test workflow registration"""
        workflow = Workflow(
            name='test_workflow',
            description='Test workflow'
        )
        
        self.orchestrator.register_workflow(workflow)
        
        retrieved = self.orchestrator.get_workflow('test_workflow')
        
        assert retrieved is not None
        assert retrieved.name == 'test_workflow'
    
    def test_list_workflows(self):
        """Test listing workflows"""
        workflow1 = Workflow(name='workflow1', description='First workflow')
        workflow2 = Workflow(name='workflow2', description='Second workflow')
        
        self.orchestrator.register_workflow(workflow1)
        self.orchestrator.register_workflow(workflow2)
        
        workflows = self.orchestrator.list_workflows()
        
        assert len(workflows) == 2
        assert all('name' in w and 'steps' in w for w in workflows)


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
