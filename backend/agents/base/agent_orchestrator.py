"""
Agent Orchestrator

Coordinates multiple agents for complex workflows and multi-step operations.
"""

from typing import Dict, List, Optional, Any
import asyncio
import logging
from datetime import datetime
from .agent_base import AgentBase, AgentRequest, AgentResponse, AgentStatus
from .agent_registry import AgentRegistry


logger = logging.getLogger(__name__)


class WorkflowStep:
    """Single step in an agent workflow"""
    
    def __init__(
        self,
        agent_name: str,
        intent: str,
        parameters: Optional[Dict[str, Any]] = None,
        depends_on: Optional[List[int]] = None,
        condition: Optional[callable] = None
    ):
        self.agent_name = agent_name
        self.intent = intent
        self.parameters = parameters or {}
        self.depends_on = depends_on or []  # Step indices this depends on
        self.condition = condition  # Optional condition function


class Workflow:
    """Multi-step agent workflow"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.steps: List[WorkflowStep] = []
        
    def add_step(
        self,
        agent_name: str,
        intent: str,
        parameters: Optional[Dict[str, Any]] = None,
        depends_on: Optional[List[int]] = None,
        condition: Optional[callable] = None
    ) -> int:
        """
        Add a step to the workflow.
        
        Args:
            agent_name: Name of agent to execute
            intent: Intent/action for the agent
            parameters: Step parameters
            depends_on: List of step indices this depends on
            condition: Optional condition function (receives previous results)
            
        Returns:
            Step index
        """
        step = WorkflowStep(agent_name, intent, parameters, depends_on, condition)
        self.steps.append(step)
        return len(self.steps) - 1


class AgentOrchestrator:
    """
    Orchestrates complex workflows involving multiple agents.
    
    Features:
    - Sequential and parallel execution
    - Dependency management
    - Conditional logic
    - Result aggregation
    - Error handling and recovery
    """
    
    def __init__(self, registry: Optional[AgentRegistry] = None):
        self.registry = registry or AgentRegistry()
        self.logger = logging.getLogger("agents.orchestrator")
        self._workflows: Dict[str, Workflow] = {}
        
    def register_workflow(self, workflow: Workflow):
        """
        Register a workflow for reuse.
        
        Args:
            workflow: Workflow to register
        """
        self._workflows[workflow.name] = workflow
        self.logger.info(f"Registered workflow: {workflow.name}")
        
    def get_workflow(self, name: str) -> Optional[Workflow]:
        """
        Get registered workflow by name.
        
        Args:
            name: Workflow name
            
        Returns:
            Workflow or None
        """
        return self._workflows.get(name)
    
    async def execute_workflow(
        self,
        workflow: Workflow,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a multi-step workflow.
        
        Args:
            workflow: Workflow to execute
            user_id: User ID for requests
            session_id: Session ID for requests
            context: Shared context for all steps
            
        Returns:
            Dictionary with workflow results
        """
        start_time = datetime.utcnow()
        context = context or {}
        step_results: List[Optional[AgentResponse]] = [None] * len(workflow.steps)
        
        self.logger.info(f"Starting workflow: {workflow.name} ({len(workflow.steps)} steps)")
        
        try:
            # Execute steps in order, respecting dependencies
            for idx, step in enumerate(workflow.steps):
                # Check if dependencies are satisfied
                if step.depends_on:
                    for dep_idx in step.depends_on:
                        if dep_idx >= idx:
                            raise ValueError(
                                f"Invalid dependency: Step {idx} depends on future step {dep_idx}"
                            )
                        if step_results[dep_idx] is None:
                            raise ValueError(
                                f"Dependency not satisfied: Step {idx} depends on step {dep_idx}"
                            )
                        if step_results[dep_idx].status == AgentStatus.ERROR:
                            raise ValueError(
                                f"Dependency failed: Step {dep_idx} returned error"
                            )
                
                # Check optional condition
                if step.condition:
                    should_execute = step.condition(step_results, context)
                    if not should_execute:
                        self.logger.info(f"Skipping step {idx} due to condition")
                        continue
                
                # Get agent
                agent = self.registry.get_agent(step.agent_name)
                if not agent:
                    raise ValueError(f"Agent not found: {step.agent_name}")
                
                # Prepare parameters with results from dependencies
                parameters = dict(step.parameters)
                for dep_idx in step.depends_on:
                    dep_result = step_results[dep_idx]
                    if dep_result and dep_result.result:
                        parameters[f'step_{dep_idx}_result'] = dep_result.result
                
                # Create request
                request = AgentRequest(
                    user_id=user_id,
                    session_id=session_id,
                    intent=step.intent,
                    parameters=parameters,
                    context=context
                )
                
                # Execute step
                self.logger.info(
                    f"Executing step {idx}: {step.agent_name}.{step.intent}"
                )
                response = await agent.execute(request)
                step_results[idx] = response
                
                if response.status == AgentStatus.ERROR:
                    self.logger.error(
                        f"Step {idx} failed: {response.error}"
                    )
                    # Could implement retry logic here
                    raise Exception(f"Step {idx} failed: {response.error}")
            
            # Calculate total time
            total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            # Compile results
            return {
                'workflow_name': workflow.name,
                'status': 'completed',
                'total_time_ms': total_time,
                'steps_executed': len([r for r in step_results if r is not None]),
                'steps_total': len(workflow.steps),
                'step_results': [
                    {
                        'agent': step.agent_name,
                        'intent': step.intent,
                        'status': result.status.value if result else 'skipped',
                        'result': result.result if result else None,
                        'error': result.error if result else None,
                        'execution_time_ms': result.execution_time_ms if result else None,
                    }
                    for step, result in zip(workflow.steps, step_results)
                ],
            }
            
        except Exception as e:
            total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            self.logger.error(f"Workflow failed: {str(e)}")
            
            return {
                'workflow_name': workflow.name,
                'status': 'error',
                'error': str(e),
                'total_time_ms': total_time,
                'steps_executed': len([r for r in step_results if r is not None]),
                'steps_total': len(workflow.steps),
                'step_results': [
                    {
                        'agent': step.agent_name,
                        'intent': step.intent,
                        'status': result.status.value if result else 'not_executed',
                        'result': result.result if result else None,
                        'error': result.error if result else None,
                    }
                    for step, result in zip(workflow.steps, step_results)
                ],
            }
    
    async def execute_parallel(
        self,
        requests: List[tuple[str, AgentRequest]]
    ) -> List[AgentResponse]:
        """
        Execute multiple agent requests in parallel.
        
        Args:
            requests: List of (agent_name, request) tuples
            
        Returns:
            List of responses in same order
        """
        tasks = []
        
        for agent_name, request in requests:
            agent = self.registry.get_agent(agent_name)
            if not agent:
                raise ValueError(f"Agent not found: {agent_name}")
            tasks.append(agent.execute(request))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error responses
        for idx, response in enumerate(responses):
            if isinstance(response, Exception):
                agent_name, request = requests[idx]
                responses[idx] = AgentResponse(
                    request_id=request.request_id,
                    agent_name=agent_name,
                    status=AgentStatus.ERROR,
                    error=str(response)
                )
        
        return responses
    
    def list_workflows(self) -> List[Dict[str, Any]]:
        """
        List all registered workflows.
        
        Returns:
            List of workflow info dictionaries
        """
        return [
            {
                'name': workflow.name,
                'description': workflow.description,
                'steps': len(workflow.steps),
            }
            for workflow in self._workflows.values()
        ]
