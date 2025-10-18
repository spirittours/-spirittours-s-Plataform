"""
B2B2B Multi-tier Agent Management System.

This module provides complete sub-agent hierarchy, commission management,
white label platform, and redistribution API capabilities.

Key Features:
- Multi-level agent hierarchy (unlimited depth)
- Automated commission calculation and distribution
- White label branding and customization
- REST and XML redistribution APIs
- Agent performance analytics
- Credit limit management
- Commission reconciliation
"""

from .models import Agent, AgentTier, Commission, AgentBooking
from .routes import router as b2b2b_router
from .agent_service import AgentService
from .commission_service import CommissionService
from .white_label_service import WhiteLabelService

__all__ = [
    "Agent",
    "AgentTier",
    "Commission",
    "AgentBooking",
    "b2b2b_router",
    "AgentService",
    "CommissionService",
    "WhiteLabelService"
]
