"""
Commission Service for B2B2B Multi-tier Management.

Handles automatic commission calculation, approval, and payment workflows.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid

from .models import (
    Agent,
    Commission,
    CommissionType,
    CommissionStatus,
    PaymentMethod,
    AgentBooking,
    AgentTier
)

logger = logging.getLogger(__name__)


class CommissionService:
    """
    Service for managing commission calculations and payments.
    
    Supports multiple commission types and hierarchical commission splits.
    """
    
    def __init__(self, db_connection, agent_service):
        """
        Initialize commission service.
        
        Args:
            db_connection: Database connection
            agent_service: Agent service instance
        """
        self.db = db_connection
        self.agent_service = agent_service
    
    async def calculate_commission(
        self,
        booking: AgentBooking,
        agent: Agent
    ) -> Commission:
        """
        Calculate commission for booking.
        
        Args:
            booking: Agent booking
            agent: Agent who made the booking
            
        Returns:
            Calculated commission
        """
        # Generate commission code
        commission_code = self._generate_commission_code()
        
        # Calculate commission amount based on type
        commission_amount = await self._calculate_commission_amount(
            booking.total_amount,
            agent.commission_type,
            agent.commission_rate
        )
        
        # Calculate parent commission if applicable
        parent_commission_amount = Decimal("0")
        if agent.parent_agent_id and not agent.override_parent_commission:
            parent_agent = await self.agent_service.get_agent_by_id(agent.parent_agent_id)
            if parent_agent:
                parent_commission_amount = await self._calculate_commission_amount(
                    booking.total_amount,
                    parent_agent.commission_type,
                    parent_agent.commission_rate
                )
        
        # Net commission is agent commission minus parent commission
        net_commission = commission_amount - parent_commission_amount
        
        # Create commission record
        commission = Commission(
            commission_code=commission_code,
            agent_id=agent.id,
            agent_code=agent.agent_code,
            agent_tier=agent.tier,
            booking_id=booking.id,
            booking_reference=booking.booking_reference,
            booking_type=booking.booking_type,
            booking_amount=booking.total_amount,
            commission_type=agent.commission_type,
            commission_rate=agent.commission_rate,
            commission_amount=commission_amount,
            parent_commission_amount=parent_commission_amount,
            net_commission=net_commission,
            currency=booking.currency,
            status=CommissionStatus.PENDING
        )
        
        # Save to database
        logger.info(f"Commission calculated: {commission_code} for booking {booking.booking_reference}")
        
        return commission
    
    async def _calculate_commission_amount(
        self,
        booking_amount: Decimal,
        commission_type: CommissionType,
        commission_rate: Decimal
    ) -> Decimal:
        """
        Calculate commission amount based on type.
        
        Args:
            booking_amount: Total booking amount
            commission_type: Commission type
            commission_rate: Commission rate/amount
            
        Returns:
            Calculated commission amount
        """
        if commission_type == CommissionType.PERCENTAGE:
            # Percentage of booking amount
            return (booking_amount * commission_rate / Decimal("100")).quantize(Decimal("0.01"))
        
        elif commission_type == CommissionType.FIXED:
            # Fixed amount per booking
            return commission_rate
        
        elif commission_type == CommissionType.TIERED:
            # Tiered commission based on volume
            # In production, would query tier thresholds from database
            # For now, simple example
            if booking_amount >= Decimal("10000"):
                return (booking_amount * Decimal("15") / Decimal("100")).quantize(Decimal("0.01"))
            elif booking_amount >= Decimal("5000"):
                return (booking_amount * Decimal("12") / Decimal("100")).quantize(Decimal("0.01"))
            else:
                return (booking_amount * Decimal("10") / Decimal("100")).quantize(Decimal("0.01"))
        
        elif commission_type == CommissionType.HYBRID:
            # Combination of fixed + percentage
            # In production, would have separate fixed and percentage fields
            fixed_part = Decimal("50")  # Example: 50 EUR fixed
            percentage_part = (booking_amount * commission_rate / Decimal("100")).quantize(Decimal("0.01"))
            return fixed_part + percentage_part
        
        return Decimal("0")
    
    async def approve_commission(
        self,
        commission_code: str,
        approved_by: int
    ) -> Commission:
        """
        Approve commission for payment.
        
        Args:
            commission_code: Commission code
            approved_by: User ID approving
            
        Returns:
            Approved commission
        """
        commission = await self.get_commission_by_code(commission_code)
        if not commission:
            raise ValueError(f"Commission {commission_code} not found")
        
        if commission.status != CommissionStatus.PENDING:
            raise ValueError(f"Commission {commission_code} is not pending")
        
        commission.status = CommissionStatus.APPROVED
        commission.approved_at = datetime.utcnow()
        commission.approved_by = approved_by
        commission.updated_at = datetime.utcnow()
        
        logger.info(f"Commission approved: {commission_code} by user {approved_by}")
        
        return commission
    
    async def pay_commission(
        self,
        commission_code: str,
        payment_method: PaymentMethod,
        payment_reference: str,
        paid_by: int,
        payment_notes: Optional[str] = None
    ) -> Commission:
        """
        Mark commission as paid.
        
        Args:
            commission_code: Commission code
            payment_method: Payment method used
            payment_reference: Payment reference/transaction ID
            paid_by: User ID marking as paid
            payment_notes: Optional payment notes
            
        Returns:
            Paid commission
        """
        commission = await self.get_commission_by_code(commission_code)
        if not commission:
            raise ValueError(f"Commission {commission_code} not found")
        
        if commission.status != CommissionStatus.APPROVED:
            raise ValueError(f"Commission {commission_code} must be approved before payment")
        
        commission.status = CommissionStatus.PAID
        commission.payment_method = payment_method
        commission.payment_reference = payment_reference
        commission.payment_notes = payment_notes
        commission.paid_at = datetime.utcnow()
        commission.paid_by = paid_by
        commission.updated_at = datetime.utcnow()
        
        logger.info(f"Commission paid: {commission_code} via {payment_method}")
        
        return commission
    
    async def get_commission_by_code(self, commission_code: str) -> Optional[Commission]:
        """Get commission by code."""
        # In production, query database
        return None
    
    async def list_commissions(
        self,
        agent_id: Optional[int] = None,
        status: Optional[CommissionStatus] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Commission]:
        """
        List commissions with filters.
        
        Args:
            agent_id: Filter by agent
            status: Filter by status
            date_from: Filter by date range start
            date_to: Filter by date range end
            limit: Maximum results
            offset: Pagination offset
            
        Returns:
            List of commissions
        """
        # In production, query database with filters
        return []
    
    async def get_agent_commission_summary(
        self,
        agent_id: int,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """
        Get commission summary for agent in period.
        
        Args:
            agent_id: Agent ID
            period_start: Period start
            period_end: Period end
            
        Returns:
            Commission summary dict
        """
        commissions = await self.list_commissions(
            agent_id=agent_id,
            date_from=period_start,
            date_to=period_end
        )
        
        summary = {
            "agent_id": agent_id,
            "period_start": period_start,
            "period_end": period_end,
            "total_commissions": len(commissions),
            "total_amount": Decimal("0"),
            "pending_amount": Decimal("0"),
            "approved_amount": Decimal("0"),
            "paid_amount": Decimal("0"),
            "by_status": {
                "pending": 0,
                "approved": 0,
                "paid": 0,
                "cancelled": 0
            },
            "by_booking_type": {}
        }
        
        for commission in commissions:
            summary["total_amount"] += commission.net_commission
            
            if commission.status == CommissionStatus.PENDING:
                summary["pending_amount"] += commission.net_commission
                summary["by_status"]["pending"] += 1
            elif commission.status == CommissionStatus.APPROVED:
                summary["approved_amount"] += commission.net_commission
                summary["by_status"]["approved"] += 1
            elif commission.status == CommissionStatus.PAID:
                summary["paid_amount"] += commission.net_commission
                summary["by_status"]["paid"] += 1
            elif commission.status == CommissionStatus.CANCELLED:
                summary["by_status"]["cancelled"] += 1
            
            # Count by booking type
            booking_type = commission.booking_type
            if booking_type not in summary["by_booking_type"]:
                summary["by_booking_type"][booking_type] = {
                    "count": 0,
                    "amount": Decimal("0")
                }
            summary["by_booking_type"][booking_type]["count"] += 1
            summary["by_booking_type"][booking_type]["amount"] += commission.net_commission
        
        return summary
    
    async def calculate_hierarchical_commission(
        self,
        booking: AgentBooking
    ) -> List[Commission]:
        """
        Calculate commissions for entire agent hierarchy.
        
        Creates commission records for the booking agent and all
        parent agents up the hierarchy chain.
        
        Args:
            booking: Agent booking
            
        Returns:
            List of commission records for all agents in hierarchy
        """
        commissions = []
        
        # Get booking agent
        agent = await self.agent_service.get_agent_by_id(booking.agent_id)
        if not agent:
            raise ValueError(f"Agent {booking.agent_id} not found")
        
        # Calculate commission for booking agent
        agent_commission = await self.calculate_commission(booking, agent)
        commissions.append(agent_commission)
        
        # Walk up the hierarchy
        current_agent = agent
        while current_agent.parent_agent_id:
            parent_agent = await self.agent_service.get_agent_by_id(current_agent.parent_agent_id)
            if not parent_agent:
                break
            
            # Calculate parent commission
            parent_commission = await self.calculate_commission(booking, parent_agent)
            commissions.append(parent_commission)
            
            current_agent = parent_agent
        
        logger.info(
            f"Hierarchical commission calculated: {len(commissions)} "
            f"levels for booking {booking.booking_reference}"
        )
        
        return commissions
    
    async def bulk_approve_commissions(
        self,
        commission_codes: List[str],
        approved_by: int
    ) -> Dict[str, Any]:
        """
        Bulk approve multiple commissions.
        
        Args:
            commission_codes: List of commission codes
            approved_by: User ID approving
            
        Returns:
            Summary of approval results
        """
        results = {
            "total": len(commission_codes),
            "approved": 0,
            "failed": 0,
            "errors": []
        }
        
        for code in commission_codes:
            try:
                await self.approve_commission(code, approved_by)
                results["approved"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "commission_code": code,
                    "error": str(e)
                })
        
        logger.info(
            f"Bulk approval completed: {results['approved']} approved, "
            f"{results['failed']} failed"
        )
        
        return results
    
    async def generate_commission_statement(
        self,
        agent_id: int,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """
        Generate commission statement for agent.
        
        Args:
            agent_id: Agent ID
            period_start: Statement period start
            period_end: Statement period end
            
        Returns:
            Commission statement with details
        """
        agent = await self.agent_service.get_agent_by_id(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        # Get commissions for period
        commissions = await self.list_commissions(
            agent_id=agent_id,
            date_from=period_start,
            date_to=period_end
        )
        
        # Get summary
        summary = await self.get_agent_commission_summary(
            agent_id,
            period_start,
            period_end
        )
        
        statement = {
            "statement_id": str(uuid.uuid4()),
            "agent": {
                "id": agent.id,
                "code": agent.agent_code,
                "name": agent.company_name
            },
            "period": {
                "start": period_start,
                "end": period_end
            },
            "summary": summary,
            "commissions": [
                {
                    "code": c.commission_code,
                    "booking_reference": c.booking_reference,
                    "booking_type": c.booking_type,
                    "booking_amount": float(c.booking_amount),
                    "commission_rate": float(c.commission_rate),
                    "commission_amount": float(c.commission_amount),
                    "net_commission": float(c.net_commission),
                    "status": c.status,
                    "created_at": c.created_at.isoformat()
                }
                for c in commissions
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return statement
    
    def _generate_commission_code(self) -> str:
        """Generate unique commission code."""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_part = uuid.uuid4().hex[:6].upper()
        return f"COM-{timestamp}-{random_part}"
