"""
Agent Service for B2B2B Multi-tier Management.

Handles agent CRUD operations, hierarchy management, and relationships.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
import secrets
import hashlib

from .models import (
    Agent,
    AgentTier,
    AgentStatus,
    AgentCreateRequest,
    AgentUpdateRequest,
    AgentHierarchyNode,
    AgentPerformanceMetrics
)

logger = logging.getLogger(__name__)


class AgentService:
    """
    Service for managing B2B2B agent operations.
    
    Handles agent hierarchy, validation, and relationships.
    """
    
    def __init__(self, db_connection):
        """
        Initialize agent service.
        
        Args:
            db_connection: Database connection/session
        """
        self.db = db_connection
    
    async def create_agent(
        self,
        request: AgentCreateRequest,
        created_by: Optional[int] = None
    ) -> Agent:
        """
        Create new agent.
        
        Args:
            request: Agent creation request
            created_by: User ID creating the agent
            
        Returns:
            Created agent
            
        Raises:
            ValueError: If validation fails
        """
        # Validate agent code uniqueness
        existing = await self.get_agent_by_code(request.agent_code)
        if existing:
            raise ValueError(f"Agent code {request.agent_code} already exists")
        
        # Validate parent agent if specified
        parent_agent = None
        depth_level = 0
        
        if request.parent_agent_code:
            parent_agent = await self.get_agent_by_code(request.parent_agent_code)
            if not parent_agent:
                raise ValueError(f"Parent agent {request.parent_agent_code} not found")
            
            # Validate parent can create sub-agents
            if not parent_agent.can_create_sub_agents:
                raise ValueError(f"Parent agent cannot create sub-agents")
            
            # Check sub-agent limit
            if parent_agent.max_sub_agents:
                sub_agent_count = await self.get_sub_agent_count(parent_agent.id)
                if sub_agent_count >= parent_agent.max_sub_agents:
                    raise ValueError(f"Parent agent has reached max sub-agents limit")
            
            depth_level = parent_agent.depth_level + 1
        
        # Validate tier hierarchy
        if parent_agent:
            if not self._validate_tier_hierarchy(parent_agent.tier, request.tier):
                raise ValueError(f"Invalid tier hierarchy: {parent_agent.tier} -> {request.tier}")
        
        # Generate API credentials if enabled
        api_key = None
        api_secret = None
        if request.api_enabled:
            api_key = self._generate_api_key()
            api_secret = self._generate_api_secret()
        
        # Create agent
        agent = Agent(
            agent_code=request.agent_code,
            company_name=request.company_name,
            trade_name=request.trade_name,
            legal_entity_type=request.legal_entity_type,
            tax_id=request.tax_id,
            email=request.email,
            phone=request.phone,
            address=request.address,
            city=request.city,
            country=request.country,
            postal_code=request.postal_code,
            contact_name=request.contact_name,
            contact_position=request.contact_position,
            tier=request.tier,
            parent_agent_id=parent_agent.id if parent_agent else None,
            parent_agent_code=request.parent_agent_code,
            depth_level=depth_level,
            status=AgentStatus.PENDING,
            credit_limit=request.credit_limit,
            commission_type=request.commission_type,
            commission_rate=request.commission_rate,
            white_label_enabled=request.white_label_enabled,
            api_enabled=request.api_enabled,
            api_key=api_key,
            api_secret=api_secret,
            created_by=created_by,
            can_create_sub_agents=self._can_tier_create_sub_agents(request.tier)
        )
        
        # Save to database
        # In production, this would use actual database operations
        logger.info(f"Agent created: {agent.agent_code}")
        
        return agent
    
    async def update_agent(
        self,
        agent_code: str,
        request: AgentUpdateRequest,
        updated_by: Optional[int] = None
    ) -> Agent:
        """
        Update agent information.
        
        Args:
            agent_code: Agent code
            request: Update request
            updated_by: User ID updating the agent
            
        Returns:
            Updated agent
        """
        agent = await self.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        # Update fields
        if request.company_name is not None:
            agent.company_name = request.company_name
        if request.trade_name is not None:
            agent.trade_name = request.trade_name
        if request.email is not None:
            agent.email = request.email
        if request.phone is not None:
            agent.phone = request.phone
        if request.address is not None:
            agent.address = request.address
        if request.city is not None:
            agent.city = request.city
        if request.country is not None:
            agent.country = request.country
        if request.postal_code is not None:
            agent.postal_code = request.postal_code
        if request.contact_name is not None:
            agent.contact_name = request.contact_name
        if request.status is not None:
            agent.status = request.status
        if request.credit_limit is not None:
            agent.credit_limit = request.credit_limit
        if request.commission_type is not None:
            agent.commission_type = request.commission_type
        if request.commission_rate is not None:
            agent.commission_rate = request.commission_rate
        if request.white_label_enabled is not None:
            agent.white_label_enabled = request.white_label_enabled
        
        agent.updated_at = datetime.utcnow()
        
        # Save to database
        logger.info(f"Agent updated: {agent_code}")
        
        return agent
    
    async def get_agent_by_code(self, agent_code: str) -> Optional[Agent]:
        """
        Get agent by code.
        
        Args:
            agent_code: Agent code
            
        Returns:
            Agent or None if not found
        """
        # In production, query database
        # For now, return None
        return None
    
    async def get_agent_by_id(self, agent_id: int) -> Optional[Agent]:
        """Get agent by ID."""
        # In production, query database
        return None
    
    async def list_agents(
        self,
        tier: Optional[AgentTier] = None,
        status: Optional[AgentStatus] = None,
        parent_agent_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Agent]:
        """
        List agents with filters.
        
        Args:
            tier: Filter by tier
            status: Filter by status
            parent_agent_id: Filter by parent
            limit: Maximum results
            offset: Offset for pagination
            
        Returns:
            List of agents
        """
        # In production, query database with filters
        return []
    
    async def get_agent_hierarchy(
        self,
        agent_code: str,
        max_depth: Optional[int] = None
    ) -> AgentHierarchyNode:
        """
        Get agent hierarchy tree.
        
        Args:
            agent_code: Root agent code
            max_depth: Maximum depth to traverse
            
        Returns:
            Hierarchy tree node
        """
        agent = await self.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        # Build hierarchy recursively
        node = await self._build_hierarchy_node(agent, max_depth, 0)
        return node
    
    async def _build_hierarchy_node(
        self,
        agent: Agent,
        max_depth: Optional[int],
        current_depth: int
    ) -> AgentHierarchyNode:
        """Build hierarchy node recursively."""
        node = AgentHierarchyNode(agent=agent, depth=current_depth)
        
        # Stop if max depth reached
        if max_depth is not None and current_depth >= max_depth:
            return node
        
        # Get sub-agents
        sub_agents = await self.list_agents(parent_agent_id=agent.id)
        
        # Build child nodes
        for sub_agent in sub_agents:
            child_node = await self._build_hierarchy_node(
                sub_agent,
                max_depth,
                current_depth + 1
            )
            node.children.append(child_node)
        
        return node
    
    async def get_sub_agent_count(self, agent_id: int) -> int:
        """Get count of direct sub-agents."""
        sub_agents = await self.list_agents(parent_agent_id=agent_id)
        return len(sub_agents)
    
    async def get_all_descendant_agents(self, agent_id: int) -> List[Agent]:
        """
        Get all descendant agents (recursive).
        
        Args:
            agent_id: Parent agent ID
            
        Returns:
            List of all descendant agents
        """
        descendants = []
        
        # Get direct children
        children = await self.list_agents(parent_agent_id=agent_id)
        descendants.extend(children)
        
        # Get children of children recursively
        for child in children:
            child_descendants = await self.get_all_descendant_agents(child.id)
            descendants.extend(child_descendants)
        
        return descendants
    
    async def get_agent_performance(
        self,
        agent_code: str,
        period_start: date,
        period_end: date
    ) -> AgentPerformanceMetrics:
        """
        Get agent performance metrics for period.
        
        Args:
            agent_code: Agent code
            period_start: Period start date
            period_end: Period end date
            
        Returns:
            Performance metrics
        """
        agent = await self.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        # In production, query database for metrics
        metrics = AgentPerformanceMetrics(
            agent_id=agent.id,
            agent_code=agent.agent_code,
            period_start=period_start,
            period_end=period_end,
            total_bookings=agent.total_bookings or 0,
            total_revenue=agent.total_revenue or Decimal("0"),
            total_commission=agent.total_commission or Decimal("0")
        )
        
        # Calculate sub-agent metrics if applicable
        if agent.can_create_sub_agents:
            sub_agents = await self.list_agents(parent_agent_id=agent.id)
            metrics.total_sub_agents = len(sub_agents)
            metrics.active_sub_agents = len([a for a in sub_agents if a.status == AgentStatus.ACTIVE])
            
            # Sum sub-agent revenue and commission
            for sub_agent in sub_agents:
                metrics.sub_agent_revenue += sub_agent.total_revenue or Decimal("0")
                metrics.sub_agent_commission += sub_agent.total_commission or Decimal("0")
        
        return metrics
    
    async def activate_agent(self, agent_code: str, activated_by: int) -> Agent:
        """Activate agent account."""
        agent = await self.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        agent.status = AgentStatus.ACTIVE
        agent.updated_at = datetime.utcnow()
        
        logger.info(f"Agent activated: {agent_code} by user {activated_by}")
        
        return agent
    
    async def suspend_agent(self, agent_code: str, suspended_by: int, reason: str) -> Agent:
        """Suspend agent account."""
        agent = await self.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        agent.status = AgentStatus.SUSPENDED
        agent.updated_at = datetime.utcnow()
        
        logger.warning(f"Agent suspended: {agent_code} by user {suspended_by}, reason: {reason}")
        
        return agent
    
    def _validate_tier_hierarchy(self, parent_tier: AgentTier, child_tier: AgentTier) -> bool:
        """
        Validate tier hierarchy rules.
        
        Rules:
        - MASTER can create SUPER, STANDARD, SUB
        - SUPER can create STANDARD, SUB
        - STANDARD can create SUB
        - SUB cannot create anything
        """
        valid_hierarchies = {
            AgentTier.MASTER: [AgentTier.SUPER, AgentTier.STANDARD, AgentTier.SUB],
            AgentTier.SUPER: [AgentTier.STANDARD, AgentTier.SUB],
            AgentTier.STANDARD: [AgentTier.SUB],
            AgentTier.SUB: []
        }
        
        return child_tier in valid_hierarchies.get(parent_tier, [])
    
    def _can_tier_create_sub_agents(self, tier: AgentTier) -> bool:
        """Check if tier can create sub-agents."""
        return tier in [AgentTier.MASTER, AgentTier.SUPER, AgentTier.STANDARD]
    
    def _generate_api_key(self) -> str:
        """Generate API key."""
        return f"sk_live_{secrets.token_urlsafe(32)}"
    
    def _generate_api_secret(self) -> str:
        """Generate API secret."""
        return secrets.token_urlsafe(48)
