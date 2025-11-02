"""
AI Agents API Endpoints

REST API for interacting with AI agents system.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging

from agents.base import AgentBase, AgentRequest, AgentRegistry, AgentOrchestrator, Workflow
from agents.tourism import (
    ItineraryPlannerAgent,
    WeatherAdvisorAgent,
    CulturalGuideAgent,
    AccessibilityAdvisorAgent,
    SustainabilityGuideAgent,
    EmergencyAssistantAgent,
)
from agents.operations import (
    ReservationManagerAgent,
    DriverCoordinatorAgent,
    GuideSchedulerAgent,
    InventoryManagerAgent,
    CustomerSupportAgent,
    FeedbackAnalyzerAgent,
    CrisisManagerAgent,
)
from agents.analytics import (
    RevenueAnalystAgent,
    DemandForecasterAgent,
    PricingOptimizerAgent,
    CustomerSegmentationAgent,
    CompetitiveAnalystAgent,
    PerformanceMonitorAgent,
    ChurnPredictorAgent,
)
from agents.marketing import (
    ContentGeneratorAgent,
    SocialMediaManagerAgent,
    EmailCampaignerAgent,
    SEOOptimizerAgent,
    ReviewResponderAgent,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agents", tags=["agents"])

# Initialize registry and orchestrator
registry = AgentRegistry()
orchestrator = AgentOrchestrator(registry)


# Pydantic models for API
class AgentRequestModel(BaseModel):
    """API model for agent requests"""
    agent_name: str
    intent: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    priority: int = Field(default=5, ge=1, le=10)


class WorkflowRequestModel(BaseModel):
    """API model for workflow execution requests"""
    workflow_name: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class AgentInfoModel(BaseModel):
    """API model for agent information"""
    name: str
    description: str
    version: str
    status: str
    capabilities: List[str]
    metrics: Dict[str, Any]


# Initialize all agents on startup
def initialize_agents():
    """Initialize and register all agents"""
    
    # Tourism & Sustainability agents
    registry.register(ItineraryPlannerAgent())
    registry.register(WeatherAdvisorAgent())
    registry.register(CulturalGuideAgent())
    registry.register(AccessibilityAdvisorAgent())
    registry.register(SustainabilityGuideAgent())
    registry.register(EmergencyAssistantAgent())
    
    # Operations & Support agents
    registry.register(ReservationManagerAgent())
    registry.register(DriverCoordinatorAgent())
    registry.register(GuideSchedulerAgent())
    registry.register(InventoryManagerAgent())
    registry.register(CustomerSupportAgent())
    registry.register(FeedbackAnalyzerAgent())
    registry.register(CrisisManagerAgent())
    
    # Analytics & BI agents
    registry.register(RevenueAnalystAgent())
    registry.register(DemandForecasterAgent())
    registry.register(PricingOptimizerAgent())
    registry.register(CustomerSegmentationAgent())
    registry.register(CompetitiveAnalystAgent())
    registry.register(PerformanceMonitorAgent())
    registry.register(ChurnPredictorAgent())
    
    # Content & Marketing agents
    registry.register(ContentGeneratorAgent())
    registry.register(SocialMediaManagerAgent())
    registry.register(EmailCampaignerAgent())
    registry.register(SEOOptimizerAgent())
    registry.register(ReviewResponderAgent())
    
    logger.info(f"Initialized {registry.get_agent_count()} agents")


# Initialize agents when module loads
initialize_agents()


# API Endpoints

@router.get("/")
async def list_agents() -> List[AgentInfoModel]:
    """
    List all registered agents.
    
    Returns:
        List of agent information
    """
    agents = registry.list_agents()
    return agents


@router.get("/{agent_name}")
async def get_agent_info(agent_name: str) -> AgentInfoModel:
    """
    Get information about a specific agent.
    
    Args:
        agent_name: Name of the agent
        
    Returns:
        Agent information
        
    Raises:
        HTTPException: If agent not found
    """
    agent = registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_name}")
    
    return {
        'name': agent.name,
        'description': agent.description,
        'version': agent.version,
        'status': agent.status.value,
        'capabilities': [cap.value for cap in agent.get_capabilities()],
        'metrics': agent.get_metrics(),
    }


@router.post("/{agent_name}/execute")
async def execute_agent(
    agent_name: str,
    request: AgentRequestModel,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Execute an agent with a request.
    
    Args:
        agent_name: Name of the agent to execute
        request: Agent request parameters
        background_tasks: FastAPI background tasks
        
    Returns:
        Agent response
        
    Raises:
        HTTPException: If agent not found or execution fails
    """
    agent = registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_name}")
    
    # Create agent request
    agent_request = AgentRequest(
        user_id=request.user_id,
        session_id=request.session_id,
        intent=request.intent,
        parameters=request.parameters,
        context=request.context,
        priority=request.priority
    )
    
    # Execute agent
    response = await agent.execute(agent_request)
    
    # Convert to dict for JSON response
    return {
        'request_id': response.request_id,
        'agent_name': response.agent_name,
        'status': response.status.value,
        'result': response.result,
        'error': response.error,
        'execution_time_ms': response.execution_time_ms,
        'timestamp': response.timestamp.isoformat(),
        'metadata': response.metadata,
        'suggestions': response.suggestions,
    }


@router.get("/metrics/summary")
async def get_metrics_summary() -> Dict[str, Any]:
    """
    Get aggregate metrics for all agents.
    
    Returns:
        Aggregate metrics
    """
    return registry.get_agent_metrics()


@router.get("/metrics/{agent_name}")
async def get_agent_metrics(agent_name: str) -> Dict[str, Any]:
    """
    Get metrics for a specific agent.
    
    Args:
        agent_name: Name of the agent
        
    Returns:
        Agent metrics
        
    Raises:
        HTTPException: If agent not found
    """
    agent = registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_name}")
    
    return agent.get_metrics()


@router.post("/metrics/{agent_name}/reset")
async def reset_agent_metrics(agent_name: str) -> Dict[str, str]:
    """
    Reset metrics for a specific agent.
    
    Args:
        agent_name: Name of the agent
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If agent not found
    """
    agent = registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_name}")
    
    agent.reset_metrics()
    return {'status': 'success', 'message': f'Metrics reset for {agent_name}'}


@router.get("/workflows")
async def list_workflows() -> List[Dict[str, Any]]:
    """
    List all registered workflows.
    
    Returns:
        List of workflows
    """
    return orchestrator.list_workflows()


@router.post("/workflows/{workflow_name}/execute")
async def execute_workflow(
    workflow_name: str,
    request: WorkflowRequestModel
) -> Dict[str, Any]:
    """
    Execute a registered workflow.
    
    Args:
        workflow_name: Name of the workflow
        request: Workflow execution parameters
        
    Returns:
        Workflow execution results
        
    Raises:
        HTTPException: If workflow not found
    """
    workflow = orchestrator.get_workflow(workflow_name)
    if not workflow:
        raise HTTPException(
            status_code=404,
            detail=f"Workflow not found: {workflow_name}"
        )
    
    result = await orchestrator.execute_workflow(
        workflow=workflow,
        user_id=request.user_id,
        session_id=request.session_id,
        context=request.context
    )
    
    return result


@router.get("/capabilities")
async def list_capabilities() -> List[str]:
    """
    List all available capabilities across all agents.
    
    Returns:
        List of capability names
    """
    capabilities = registry.get_capabilities()
    return [cap.value for cap in capabilities]


@router.get("/capabilities/{capability}/agents")
async def get_agents_by_capability(capability: str) -> List[str]:
    """
    Get all agents with a specific capability.
    
    Args:
        capability: Capability name
        
    Returns:
        List of agent names
        
    Raises:
        HTTPException: If capability not found
    """
    from agents.base.agent_base import AgentCapability
    
    try:
        cap = AgentCapability(capability)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid capability: {capability}"
        )
    
    agents = registry.get_agents_by_capability(cap)
    return [agent.name for agent in agents]


# Health check endpoint
@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check for agents system.
    
    Returns:
        Health status
    """
    return {
        'status': 'healthy',
        'agents_count': registry.get_agent_count(),
        'capabilities_count': len(registry.get_capabilities()),
    }
