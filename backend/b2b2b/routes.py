"""
FastAPI routes for B2B2B Multi-tier Agent Management.

Provides REST API endpoints for agent management, commissions, and white label.
"""
from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from typing import List, Optional
from datetime import date
import logging

from .models import (
    Agent,
    AgentTier,
    AgentStatus,
    AgentCreateRequest,
    AgentUpdateRequest,
    AgentHierarchyNode,
    AgentPerformanceMetrics,
    Commission,
    CommissionStatus,
    PaymentMethod,
    WhiteLabelConfig
)
from .agent_service import AgentService
from .commission_service import CommissionService
from .white_label_service import WhiteLabelService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/b2b2b", tags=["b2b2b"])

# Service instances (would be injected via dependency in production)
_agent_service: Optional[AgentService] = None
_commission_service: Optional[CommissionService] = None
_white_label_service: Optional[WhiteLabelService] = None


def get_agent_service() -> AgentService:
    """Dependency to get agent service."""
    if _agent_service is None:
        raise HTTPException(status_code=500, detail="Agent service not initialized")
    return _agent_service


def get_commission_service() -> CommissionService:
    """Dependency to get commission service."""
    if _commission_service is None:
        raise HTTPException(status_code=500, detail="Commission service not initialized")
    return _commission_service


def get_white_label_service() -> WhiteLabelService:
    """Dependency to get white label service."""
    if _white_label_service is None:
        raise HTTPException(status_code=500, detail="White label service not initialized")
    return _white_label_service


# ============================================================================
# AGENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/agents", response_model=Agent, status_code=201)
async def create_agent(
    request: AgentCreateRequest,
    service: AgentService = Depends(get_agent_service)
):
    """
    Create new agent in B2B2B hierarchy.
    
    **Authorization:** Requires admin or parent agent permissions
    """
    try:
        agent = await service.create_agent(request)
        return agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/agents/{agent_code}", response_model=Agent)
async def get_agent(
    agent_code: str,
    service: AgentService = Depends(get_agent_service)
):
    """Get agent by code."""
    agent = await service.get_agent_by_code(agent_code)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/agents/{agent_code}", response_model=Agent)
async def update_agent(
    agent_code: str,
    request: AgentUpdateRequest,
    service: AgentService = Depends(get_agent_service)
):
    """Update agent information."""
    try:
        agent = await service.update_agent(agent_code, request)
        return agent
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/agents", response_model=List[Agent])
async def list_agents(
    tier: Optional[AgentTier] = None,
    status: Optional[AgentStatus] = None,
    parent_agent_id: Optional[int] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    service: AgentService = Depends(get_agent_service)
):
    """List agents with filters."""
    agents = await service.list_agents(
        tier=tier,
        status=status,
        parent_agent_id=parent_agent_id,
        limit=limit,
        offset=offset
    )
    return agents


@router.get("/agents/{agent_code}/hierarchy", response_model=AgentHierarchyNode)
async def get_agent_hierarchy(
    agent_code: str,
    max_depth: Optional[int] = Query(None, ge=1, le=10),
    service: AgentService = Depends(get_agent_service)
):
    """
    Get agent hierarchy tree.
    
    Returns tree structure of agent and all sub-agents.
    """
    try:
        hierarchy = await service.get_agent_hierarchy(agent_code, max_depth)
        return hierarchy
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/agents/{agent_code}/performance", response_model=AgentPerformanceMetrics)
async def get_agent_performance(
    agent_code: str,
    period_start: date = Query(...),
    period_end: date = Query(...),
    service: AgentService = Depends(get_agent_service)
):
    """Get agent performance metrics for period."""
    try:
        metrics = await service.get_agent_performance(
            agent_code,
            period_start,
            period_end
        )
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/agents/{agent_code}/activate")
async def activate_agent(
    agent_code: str,
    service: AgentService = Depends(get_agent_service)
):
    """Activate agent account."""
    try:
        agent = await service.activate_agent(agent_code, activated_by=1)  # TODO: Get user from auth
        return {"success": True, "agent_code": agent.agent_code, "status": agent.status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/agents/{agent_code}/suspend")
async def suspend_agent(
    agent_code: str,
    reason: str = Query(..., min_length=10),
    service: AgentService = Depends(get_agent_service)
):
    """Suspend agent account."""
    try:
        agent = await service.suspend_agent(agent_code, suspended_by=1, reason=reason)
        return {"success": True, "agent_code": agent.agent_code, "status": agent.status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# COMMISSION MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/commissions", response_model=List[Commission])
async def list_commissions(
    agent_id: Optional[int] = None,
    status: Optional[CommissionStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    service: CommissionService = Depends(get_commission_service)
):
    """List commissions with filters."""
    commissions = await service.list_commissions(
        agent_id=agent_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset
    )
    return commissions


@router.get("/commissions/{commission_code}", response_model=Commission)
async def get_commission(
    commission_code: str,
    service: CommissionService = Depends(get_commission_service)
):
    """Get commission by code."""
    commission = await service.get_commission_by_code(commission_code)
    if not commission:
        raise HTTPException(status_code=404, detail="Commission not found")
    return commission


@router.post("/commissions/{commission_code}/approve")
async def approve_commission(
    commission_code: str,
    service: CommissionService = Depends(get_commission_service)
):
    """Approve commission for payment."""
    try:
        commission = await service.approve_commission(commission_code, approved_by=1)
        return {"success": True, "commission_code": commission.commission_code}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/commissions/{commission_code}/pay")
async def pay_commission(
    commission_code: str,
    payment_method: PaymentMethod,
    payment_reference: str,
    payment_notes: Optional[str] = None,
    service: CommissionService = Depends(get_commission_service)
):
    """Mark commission as paid."""
    try:
        commission = await service.pay_commission(
            commission_code,
            payment_method,
            payment_reference,
            paid_by=1,
            payment_notes=payment_notes
        )
        return {"success": True, "commission_code": commission.commission_code}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/agents/{agent_id}/commissions/summary")
async def get_agent_commission_summary(
    agent_id: int,
    period_start: date = Query(...),
    period_end: date = Query(...),
    service: CommissionService = Depends(get_commission_service)
):
    """Get commission summary for agent."""
    summary = await service.get_agent_commission_summary(
        agent_id,
        period_start,
        period_end
    )
    return summary


@router.post("/commissions/bulk-approve")
async def bulk_approve_commissions(
    commission_codes: List[str],
    service: CommissionService = Depends(get_commission_service)
):
    """Bulk approve multiple commissions."""
    results = await service.bulk_approve_commissions(commission_codes, approved_by=1)
    return results


@router.get("/agents/{agent_id}/commissions/statement")
async def generate_commission_statement(
    agent_id: int,
    period_start: date = Query(...),
    period_end: date = Query(...),
    service: CommissionService = Depends(get_commission_service)
):
    """Generate commission statement for agent."""
    try:
        statement = await service.generate_commission_statement(
            agent_id,
            period_start,
            period_end
        )
        return statement
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================================
# WHITE LABEL MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/agents/{agent_code}/white-label", response_model=WhiteLabelConfig)
async def create_white_label_config(
    agent_code: str,
    config: WhiteLabelConfig,
    service: WhiteLabelService = Depends(get_white_label_service)
):
    """Create white label configuration for agent."""
    try:
        config = await service.create_white_label_config(agent_code, config)
        return config
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/agents/{agent_code}/white-label", response_model=WhiteLabelConfig)
async def get_white_label_config(
    agent_code: str,
    service: WhiteLabelService = Depends(get_white_label_service)
):
    """Get white label configuration for agent."""
    config = await service.get_config_by_agent(agent_code)
    if not config:
        raise HTTPException(status_code=404, detail="White label config not found")
    return config


@router.put("/agents/{agent_code}/white-label")
async def update_white_label_config(
    agent_code: str,
    config_updates: dict,
    service: WhiteLabelService = Depends(get_white_label_service)
):
    """Update white label configuration."""
    try:
        config = await service.update_white_label_config(agent_code, config_updates)
        return config
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents/{agent_code}/white-label/enable")
async def enable_white_label(
    agent_code: str,
    service: WhiteLabelService = Depends(get_white_label_service)
):
    """Enable white label for agent."""
    try:
        agent = await service.enable_white_label(agent_code, enabled_by=1)
        return {"success": True, "agent_code": agent.agent_code}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/white-label/validate-domain")
async def validate_domain(
    domain: str = Query(..., min_length=3),
    service: WhiteLabelService = Depends(get_white_label_service)
):
    """Validate custom domain configuration."""
    result = await service.validate_domain(domain)
    return result


# ============================================================================
# ADVANCED COMMISSIONS (PHASE 4)
# ============================================================================

@router.post("/commissions/tiered")
async def calculate_tiered_commission(
    agent_code: str = Query(..., description="Agent code"),
    booking_amount: Decimal = Query(..., description="Booking amount in EUR"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date")
):
    """
    Calculate tiered commission based on agent's total period volume.
    
    Tiers:
    - Bronze (0-10k): 3%
    - Silver (10k-25k): 4% + 0.5% bonus
    - Gold (25k-50k): 5% + 1% bonus
    - Platinum (50k+): 6% + 2% bonus
    """
    from .advanced_commission_service import get_advanced_commission_service
    from .agent_service import get_agent_service
    
    agent_service = get_agent_service()
    commission_service = get_advanced_commission_service()
    
    agent = await agent_service.get_agent(agent_code)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_code} not found")
    
    result = await commission_service.calculate_tiered_commission(
        agent, booking_amount, period_start, period_end
    )
    return result


@router.post("/commissions/product")
async def calculate_product_commission(
    booking_amount: Decimal = Query(..., description="Booking amount in EUR"),
    product_category: str = Query(
        ..., 
        description="Product category: flights, hotels, tours, packages, insurance, transport, activities"
    ),
    season_type: str = Query(
        "shoulder",
        description="Season type: high_season, shoulder, low_season"
    )
):
    """
    Calculate commission by product category with seasonal multiplier.
    
    Product Commission Rates:
    - Flights: 2%
    - Hotels: 5%
    - Tours: 8%
    - Packages: 10%
    - Insurance: 15%
    - Transport: 4%
    - Activities: 7%
    
    Seasonal Multipliers:
    - High season: 1.2x
    - Shoulder: 1.0x
    - Low season: 1.3x (incentive)
    """
    from .advanced_commission_service import get_advanced_commission_service, ProductCategory
    
    service = get_advanced_commission_service()
    
    try:
        result = await service.calculate_product_commission(
            booking_amount,
            ProductCategory(product_category),
            season_type
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/commissions/bonus")
async def calculate_commission_bonus(
    agent_code: str = Query(..., description="Agent code"),
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date")
):
    """
    Calculate bonus for agent based on performance.
    
    Bonus Types:
    - Volume Milestone: 500 EUR every 10k volume
    - Booking Count: 200 EUR every 20 bookings
    - Referral: 300 EUR per agent referral
    """
    from .advanced_commission_service import get_advanced_commission_service
    from .agent_service import get_agent_service
    
    agent_service = get_agent_service()
    commission_service = get_advanced_commission_service()
    
    agent = await agent_service.get_agent(agent_code)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_code} not found")
    
    bonus = await commission_service.calculate_bonus(
        agent, period_start, period_end
    )
    return bonus


@router.get("/leaderboard")
async def get_agent_leaderboard(
    period_start: date = Query(..., description="Period start date"),
    period_end: date = Query(..., description="Period end date"),
    metric: str = Query(
        "volume",
        description="Ranking metric: volume, count, commission"
    ),
    limit: int = Query(10, ge=1, le=50, description="Top N agents")
):
    """
    Get agent leaderboard for gamification.
    
    Badges:
    - 🥇 Champion (Rank 1)
    - 🥈 Excellence (Rank 2)
    - 🥉 Outstanding (Rank 3)
    - ⭐ Top Performer (Rank 4-5)
    - ✨ Rising Star (Rank 6+)
    """
    from .advanced_commission_service import get_advanced_commission_service
    
    service = get_advanced_commission_service()
    leaderboard = await service.get_leaderboard(
        period_start, period_end, metric, limit
    )
    return {
        "period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat()
        },
        "metric": metric,
        "leaderboard": leaderboard
    }


@router.get("/forecast/{agent_code}")
async def get_commission_forecast(
    agent_code: str,
    months_ahead: int = Query(3, ge=1, le=12, description="Months to forecast")
):
    """
    Get commission forecast for agent.
    
    Uses historical data to predict future commissions with confidence scoring.
    """
    from .advanced_commission_service import get_advanced_commission_service
    from .agent_service import get_agent_service
    
    agent_service = get_agent_service()
    commission_service = get_advanced_commission_service()
    
    agent = await agent_service.get_agent(agent_code)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_code} not found")
    
    forecast = await commission_service.get_commission_forecast(
        agent, months_ahead
    )
    return forecast


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "b2b2b-management",
        "agent_service": _agent_service is not None,
        "commission_service": _commission_service is not None,
        "white_label_service": _white_label_service is not None
    }


def initialize_services(db_connection):
    """Initialize B2B2B services."""
    global _agent_service, _commission_service, _white_label_service
    
    _agent_service = AgentService(db_connection)
    _commission_service = CommissionService(db_connection, _agent_service)
    _white_label_service = WhiteLabelService(db_connection, _agent_service)
    
    logger.info("B2B2B services initialized")
