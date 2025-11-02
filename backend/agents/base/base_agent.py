"""
BaseAgent - Abstract Base Class for All AI Agents
=================================================

This module defines the base class that all AI agents must inherit from.
It provides common functionality for agent lifecycle, task execution,
error handling, and inter-agent communication.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from uuid import uuid4
import logging
import asyncio

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Agent lifecycle status"""
    INITIALIZING = "initializing"
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    STOPPED = "stopped"


class AgentCapability(str, Enum):
    """Standard agent capabilities"""
    # Data Processing
    DATA_ANALYSIS = "data_analysis"
    DATA_TRANSFORMATION = "data_transformation"
    
    # Communication
    NATURAL_LANGUAGE = "natural_language"
    API_INTEGRATION = "api_integration"
    NOTIFICATION = "notification"
    
    # Business Logic
    RECOMMENDATION = "recommendation"
    OPTIMIZATION = "optimization"
    PREDICTION = "prediction"
    
    # Content
    CONTENT_GENERATION = "content_generation"
    CONTENT_MODERATION = "content_moderation"
    
    # Operations
    SCHEDULING = "scheduling"
    MONITORING = "monitoring"
    AUTOMATION = "automation"


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents in the Spirit Tours system.
    
    All agents must:
    1. Implement the process_task() method
    2. Define their capabilities
    3. Handle errors gracefully
    4. Support async operations
    
    Attributes:
        agent_id (str): Unique identifier for this agent instance
        agent_name (str): Human-readable name
        agent_type (str): Type/category of agent
        capabilities (Set[AgentCapability]): Set of agent capabilities
        status (AgentStatus): Current agent status
        config (Dict): Agent-specific configuration
        metrics (Dict): Performance metrics
    """
    
    def __init__(
        self,
        agent_name: str,
        agent_type: str,
        capabilities: Set[AgentCapability],
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize base agent.
        
        Args:
            agent_name: Human-readable agent name
            agent_type: Agent type/category
            capabilities: Set of agent capabilities
            config: Optional configuration dictionary
        """
        self.agent_id = str(uuid4())
        self.agent_name = agent_name
        self.agent_type = agent_type
        self.capabilities = capabilities
        self.config = config or {}
        self.status = AgentStatus.INITIALIZING
        
        # Metrics tracking
        self.metrics = {
            'tasks_processed': 0,
            'tasks_succeeded': 0,
            'tasks_failed': 0,
            'total_execution_time': 0.0,
            'average_execution_time': 0.0,
            'created_at': datetime.utcnow().isoformat(),
            'last_activity': None,
        }
        
        # Task history
        self._task_history: List[Dict] = []
        
        # Dependencies (other agents this agent depends on)
        self._dependencies: Set[str] = set()
        
        logger.info(f"Agent initialized: {self.agent_name} (ID: {self.agent_id})")
    
    async def initialize(self) -> bool:
        """
        Initialize agent resources and dependencies.
        
        Override this method to perform custom initialization logic.
        
        Returns:
            bool: True if initialization succeeded
        """
        try:
            self.status = AgentStatus.READY
            logger.info(f"Agent {self.agent_name} ready")
            return True
        except Exception as e:
            logger.error(f"Agent {self.agent_name} initialization failed: {e}")
            self.status = AgentStatus.ERROR
            return False
    
    @abstractmethod
    async def process_task(self, task: 'AgentTask') -> Dict[str, Any]:
        """
        Process an assigned task.
        
        This is the main method that must be implemented by all agents.
        
        Args:
            task: AgentTask object containing task details
            
        Returns:
            Dict containing task results
            
        Raises:
            NotImplementedError: If not implemented by subclass
        """
        raise NotImplementedError("Agents must implement process_task()")
    
    async def execute_task(self, task: 'AgentTask') -> Dict[str, Any]:
        """
        Execute a task with error handling and metrics tracking.
        
        This method wraps process_task() with common functionality.
        
        Args:
            task: AgentTask to execute
            
        Returns:
            Dict containing task results and metadata
        """
        if self.status != AgentStatus.READY:
            raise RuntimeError(f"Agent {self.agent_name} is not ready (status: {self.status})")
        
        self.status = AgentStatus.BUSY
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Agent {self.agent_name} executing task {task.task_id}")
            
            # Process the task
            result = await self.process_task(task)
            
            # Update metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics['tasks_processed'] += 1
            self.metrics['tasks_succeeded'] += 1
            self.metrics['total_execution_time'] += execution_time
            self.metrics['average_execution_time'] = (
                self.metrics['total_execution_time'] / self.metrics['tasks_processed']
            )
            self.metrics['last_activity'] = datetime.utcnow().isoformat()
            
            # Add to history
            self._task_history.append({
                'task_id': task.task_id,
                'task_type': task.task_type,
                'status': 'success',
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat(),
            })
            
            logger.info(f"Agent {self.agent_name} completed task {task.task_id} in {execution_time:.2f}s")
            
            return {
                'success': True,
                'agent_id': self.agent_id,
                'agent_name': self.agent_name,
                'task_id': task.task_id,
                'result': result,
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
        except Exception as e:
            # Update error metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics['tasks_processed'] += 1
            self.metrics['tasks_failed'] += 1
            self.metrics['last_activity'] = datetime.utcnow().isoformat()
            
            # Add to history
            self._task_history.append({
                'task_id': task.task_id,
                'task_type': task.task_type,
                'status': 'failed',
                'error': str(e),
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat(),
            })
            
            logger.error(f"Agent {self.agent_name} task {task.task_id} failed: {e}")
            
            return {
                'success': False,
                'agent_id': self.agent_id,
                'agent_name': self.agent_name,
                'task_id': task.task_id,
                'error': str(e),
                'execution_time': execution_time,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
        finally:
            self.status = AgentStatus.READY
    
    async def validate_task(self, task: 'AgentTask') -> bool:
        """
        Validate if this agent can handle the given task.
        
        Override this method to implement custom validation logic.
        
        Args:
            task: Task to validate
            
        Returns:
            bool: True if agent can handle the task
        """
        # Default validation: check if agent type matches
        return task.agent_type == self.agent_type
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get agent information and status.
        
        Returns:
            Dict containing agent details
        """
        return {
            'agent_id': self.agent_id,
            'agent_name': self.agent_name,
            'agent_type': self.agent_type,
            'capabilities': [cap.value for cap in self.capabilities],
            'status': self.status.value,
            'metrics': self.metrics,
            'dependencies': list(self._dependencies),
            'config': {k: v for k, v in self.config.items() if not k.startswith('_')},
        }
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get agent performance metrics.
        
        Returns:
            Dict containing performance metrics
        """
        return {
            **self.metrics,
            'success_rate': (
                self.metrics['tasks_succeeded'] / self.metrics['tasks_processed']
                if self.metrics['tasks_processed'] > 0 else 0.0
            ),
            'failure_rate': (
                self.metrics['tasks_failed'] / self.metrics['tasks_processed']
                if self.metrics['tasks_processed'] > 0 else 0.0
            ),
        }
    
    def get_task_history(self, limit: int = 10) -> List[Dict]:
        """
        Get recent task execution history.
        
        Args:
            limit: Maximum number of history entries to return
            
        Returns:
            List of task history entries
        """
        return self._task_history[-limit:]
    
    def add_dependency(self, agent_id: str) -> None:
        """
        Add a dependency on another agent.
        
        Args:
            agent_id: ID of the agent this agent depends on
        """
        self._dependencies.add(agent_id)
        logger.debug(f"Agent {self.agent_name} added dependency: {agent_id}")
    
    def remove_dependency(self, agent_id: str) -> None:
        """
        Remove a dependency on another agent.
        
        Args:
            agent_id: ID of the agent to remove from dependencies
        """
        self._dependencies.discard(agent_id)
        logger.debug(f"Agent {self.agent_name} removed dependency: {agent_id}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on the agent.
        
        Override this method to implement custom health checks.
        
        Returns:
            Dict containing health status
        """
        return {
            'agent_id': self.agent_id,
            'agent_name': self.agent_name,
            'status': self.status.value,
            'healthy': self.status in [AgentStatus.READY, AgentStatus.BUSY],
            'last_activity': self.metrics.get('last_activity'),
            'tasks_processed': self.metrics['tasks_processed'],
        }
    
    async def stop(self) -> None:
        """
        Stop the agent and cleanup resources.
        
        Override this method to implement custom cleanup logic.
        """
        logger.info(f"Stopping agent {self.agent_name}")
        self.status = AgentStatus.STOPPED
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.agent_name} status={self.status.value}>"
