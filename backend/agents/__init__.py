"""
Spirit Tours AI Agents System

A comprehensive system of 25 specialized AI agents for tourism operations,
analytics, marketing, and customer support.

Agent Categories:
- Tourism & Sustainability (6 agents)
- Operations & Support (7 agents)
- Analytics & BI (7 agents)
- Content & Marketing (5 agents)
"""

from .base.agent_base import AgentBase, AgentCapability, AgentStatus
from .base.agent_registry import AgentRegistry
from .base.agent_orchestrator import AgentOrchestrator

__version__ = "1.0.0"

__all__ = [
    'AgentBase',
    'AgentCapability',
    'AgentStatus',
    'AgentRegistry',
    'AgentOrchestrator',
]
