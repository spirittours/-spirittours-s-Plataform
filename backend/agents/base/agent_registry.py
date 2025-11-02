"""
Agent Registry

Central registry for agent registration, discovery, and management.
"""

from typing import Dict, List, Optional, Type
import logging
from .agent_base import AgentBase, AgentCapability


logger = logging.getLogger(__name__)


class AgentRegistry:
    """
    Singleton registry for managing all agents in the system.
    
    Provides:
    - Agent registration and deregistration
    - Agent discovery by name or capability
    - Agent lifecycle management
    """
    
    _instance = None
    _agents: Dict[str, AgentBase] = {}
    _capability_index: Dict[AgentCapability, List[str]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._agents = {}
            cls._instance._capability_index = {}
        return cls._instance
    
    def register(self, agent: AgentBase) -> bool:
        """
        Register an agent in the registry.
        
        Args:
            agent: Agent instance to register
            
        Returns:
            True if registered successfully
        """
        if agent.name in self._agents:
            logger.warning(f"Agent {agent.name} already registered, replacing...")
        
        self._agents[agent.name] = agent
        
        # Update capability index
        for capability in agent.get_capabilities():
            if capability not in self._capability_index:
                self._capability_index[capability] = []
            if agent.name not in self._capability_index[capability]:
                self._capability_index[capability].append(agent.name)
        
        logger.info(f"Registered agent: {agent.name} (v{agent.version})")
        return True
    
    def deregister(self, agent_name: str) -> bool:
        """
        Deregister an agent from the registry.
        
        Args:
            agent_name: Name of agent to deregister
            
        Returns:
            True if deregistered successfully
        """
        if agent_name not in self._agents:
            logger.warning(f"Agent {agent_name} not found in registry")
            return False
        
        agent = self._agents[agent_name]
        
        # Remove from capability index
        for capability in agent.get_capabilities():
            if capability in self._capability_index:
                self._capability_index[capability] = [
                    name for name in self._capability_index[capability]
                    if name != agent_name
                ]
        
        del self._agents[agent_name]
        logger.info(f"Deregistered agent: {agent_name}")
        return True
    
    def get_agent(self, agent_name: str) -> Optional[AgentBase]:
        """
        Get agent by name.
        
        Args:
            agent_name: Name of agent
            
        Returns:
            Agent instance or None
        """
        return self._agents.get(agent_name)
    
    def get_agents_by_capability(self, capability: AgentCapability) -> List[AgentBase]:
        """
        Get all agents with a specific capability.
        
        Args:
            capability: Agent capability
            
        Returns:
            List of agent instances
        """
        agent_names = self._capability_index.get(capability, [])
        return [self._agents[name] for name in agent_names if name in self._agents]
    
    def list_agents(self) -> List[Dict[str, any]]:
        """
        List all registered agents with their info.
        
        Returns:
            List of agent info dictionaries
        """
        return [
            {
                'name': agent.name,
                'description': agent.description,
                'version': agent.version,
                'status': agent.status.value,
                'capabilities': [cap.value for cap in agent.get_capabilities()],
                'metrics': agent.get_metrics(),
            }
            for agent in self._agents.values()
        ]
    
    def get_agent_count(self) -> int:
        """
        Get total number of registered agents.
        
        Returns:
            Number of agents
        """
        return len(self._agents)
    
    def get_capabilities(self) -> List[AgentCapability]:
        """
        Get all available capabilities across all agents.
        
        Returns:
            List of unique capabilities
        """
        return list(self._capability_index.keys())
    
    def clear(self):
        """Clear all registered agents (for testing)."""
        self._agents.clear()
        self._capability_index.clear()
        logger.info("Cleared agent registry")
    
    def get_agent_metrics(self) -> Dict[str, any]:
        """
        Get aggregate metrics for all agents.
        
        Returns:
            Dictionary with aggregate metrics
        """
        total_executions = sum(
            agent.get_metrics()['execution_count']
            for agent in self._agents.values()
        )
        total_errors = sum(
            agent.get_metrics()['error_count']
            for agent in self._agents.values()
        )
        
        return {
            'total_agents': len(self._agents),
            'total_executions': total_executions,
            'total_errors': total_errors,
            'overall_success_rate': (
                (total_executions - total_errors) / total_executions
                if total_executions > 0
                else 0
            ),
            'agents_by_status': {
                status: len([
                    a for a in self._agents.values()
                    if a.status.value == status
                ])
                for status in ['idle', 'processing', 'completed', 'error']
            },
            'total_capabilities': len(self._capability_index),
        }
    
    def __repr__(self) -> str:
        return f"<AgentRegistry(agents={len(self._agents)}, capabilities={len(self._capability_index)})>"


# Singleton instance
registry = AgentRegistry()
