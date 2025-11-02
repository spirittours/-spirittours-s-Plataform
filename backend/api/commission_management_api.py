"""
Commission Management API
Administrative endpoints for managing partner commissions, structures, and payments
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from services.commission_management_service import (
    CommissionManagementService,
    CommissionStructureRequest,
    CommissionCalculationRequest,
    CommissionCalculationResponse,
    CommissionStructure,
    CommissionCalculation,
    CommissionPayment,
    CommissionStatus,
    CommissionType,
    PaymentFrequency
)
from services.advanced_auth_service import AdvancedAuthService, User, UserType, AccountStatus
from config.database import get_db
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/commissions", tags=["Commission Management"])
security = HTTPBearer()

# Initialize services
auth_service = AdvancedAuthService()

# Pydantic Models for API
class CommissionDashboardStats(BaseModel):
    """Commission dashboard statistics model"""
    total_structures: int
    active_structures: int
    total_calculations: int
    pending_calculations: int
    approved_calculations: int
    total_unpaid_amount: Decimal
    total_paid_amount: Decimal
    partners_with_commissions: int
    average_commission_rate: Decimal
    monthly_commission_trend: List[Dict[str, Union[str, Decimal]]]

class BulkApprovalRequest(BaseModel):
    """Bulk approval request model"""
    calculation_ids: List[str]
    approved_by: str

class PaymentBatchRequest(BaseModel):
    """Payment batch processing request"""
    partner_ids: List[str]
    period_start: datetime
    period_end: datetime
    payment_method: str = Field(default="bank_transfer")
    notes: Optional[str] = None

# Authentication helper
async def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Verify admin authentication and authorization."""
    try:
        token = credentials.credentials
        payload = auth_service._decode_jwt_token(token)
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check admin privileges
        if user.user_type != UserType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        if user.status != AccountStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not active"
            )
        
        return user
        
    except Exception as e:
        logger.error(f"Admin authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

# Dashboard and Statistics
@router.get("/dashboard/stats", response_model=CommissionDashboardStats)
async def get_commission_dashboard_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    months: int = Query(12, ge=1, le=24, description="Number of months for trend analysis")
):
    """
    Get comprehensive commission management dashboard statistics.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        commission_service = CommissionManagementService(db)
        
        # Basic statistics
        total_structures = db.query(CommissionStructure).count()
        active_structures = db.query(CommissionStructure).filter(
            CommissionStructure.is_active == True
        ).count()
        
        total_calculations = db.query(CommissionCalculation).count()
        pending_calculations = db.query(CommissionCalculation).filter(
            CommissionCalculation.status == CommissionStatus.PENDING
        ).count()
        approved_calculations = db.query(CommissionCalculation).filter(
            CommissionCalculation.status == CommissionStatus.APPROVED
        ).count()
        
        # Financial statistics
        unpaid_calcs = db.query(CommissionCalculation).filter(
            CommissionCalculation.status.in_([CommissionStatus.CALCULATED, CommissionStatus.APPROVED])
        ).all()
        total_unpaid = sum(calc.commission_amount for calc in unpaid_calcs)
        
        paid_calcs = db.query(CommissionCalculation).filter(
            CommissionCalculation.status == CommissionStatus.PAID
        ).all()
        total_paid = sum(calc.commission_amount for calc in paid_calcs)
        
        # Partner statistics
        partners_with_commissions = db.query(CommissionCalculation.partner_id).distinct().count()
        
        # Average commission rate
        all_calcs = db.query(CommissionCalculation).all()
        if all_calcs:
            avg_rate = sum(calc.commission_rate_applied for calc in all_calcs) / len(all_calcs)
        else:
            avg_rate = Decimal('0.00')
        
        # Monthly trend (last N months)
        monthly_trend = []
        end_date = datetime.now()
        
        for i in range(months):
            month_end = end_date - timedelta(days=30 * i)
            month_start = month_end - timedelta(days=30)
            
            month_calcs = db.query(CommissionCalculation).filter(
                CommissionCalculation.calculated_at >= month_start,
                CommissionCalculation.calculated_at < month_end
            ).all()
            
            month_total = sum(calc.commission_amount for calc in month_calcs)
            
            monthly_trend.append({
                "month": month_end.strftime("%Y-%m"),
                "total_commission": month_total,
                "calculation_count": len(month_calcs)
            })
        
        stats = CommissionDashboardStats(
            total_structures=total_structures,
            active_structures=active_structures,
            total_calculations=total_calculations,
            pending_calculations=pending_calculations,
            approved_calculations=approved_calculations,
            total_unpaid_amount=total_unpaid,
            total_paid_amount=total_paid,
            partners_with_commissions=partners_with_commissions,
            average_commission_rate=avg_rate,
            monthly_commission_trend=monthly_trend[::-1]  # Reverse for chronological order
        )
        
        logger.info(f"Commission dashboard stats retrieved by admin: {admin_user.user_id}")
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving commission dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission statistics"
        )

# Commission Structure Management
@router.post("/structures/{partner_id}")
async def create_commission_structure(
    partner_id: str,
    structure_request: CommissionStructureRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new commission structure for a partner.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Multiple commission types (flat, tiered, performance-based)
    - Volume and performance bonuses
    - Product-specific rates
    - Automatic activation and deactivation of old structures
    """
    try:
        commission_service = CommissionManagementService(db)
        
        # Verify partner exists and is B2B
        partner = db.query(User).filter(User.user_id == partner_id).first()
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partner not found"
            )
        
        if partner.user_type not in [UserType.B2B_AGENT, UserType.B2B2C_RESELLER]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a B2B partner"
            )
        
        # Create structure
        structure = await commission_service.create_commission_structure(
            partner_id=partner_id,
            structure_request=structure_request,
            created_by=admin_user.user_id
        )
        
        logger.info(f"Commission structure created by admin {admin_user.user_id} for partner {partner_id}")
        
        return {
            "status": "success",
            "message": "Commission structure created successfully",
            "structure_id": structure.structure_id,
            "partner_id": partner_id,
            "commission_type": structure.commission_type.value,
            "base_rate": float(structure.base_rate),
            "effective_from": structure.effective_from.isoformat(),
            "created_by": admin_user.user_id,
            "created_at": structure.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating commission structure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create commission structure"
        )

@router.get("/structures")
async def get_commission_structures(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    partner_id: Optional[str] = Query(None),
    active_only: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get commission structures with filtering and pagination.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        query = db.query(CommissionStructure)
        
        if partner_id:
            query = query.filter(CommissionStructure.user_id == partner_id)
        
        if active_only:
            query = query.filter(CommissionStructure.is_active == True)
        
        query = query.order_by(CommissionStructure.created_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        structures = query.offset(offset).limit(limit).all()
        
        # Format response
        structure_data = []
        for structure in structures:
            # Get partner info
            partner = db.query(User).filter(User.user_id == structure.user_id).first()
            
            structure_data.append({
                "structure_id": structure.structure_id,
                "partner_id": structure.user_id,
                "partner_name": f"{partner.first_name} {partner.last_name}" if partner else "Unknown",
                "partner_email": partner.email if partner else "Unknown",
                "name": structure.name,
                "commission_type": structure.commission_type.value,
                "base_rate": float(structure.base_rate),
                "payment_frequency": structure.payment_frequency.value,
                "minimum_payout": float(structure.minimum_payout),
                "is_active": structure.is_active,
                "effective_from": structure.effective_from.isoformat(),
                "effective_until": structure.effective_until.isoformat() if structure.effective_until else None,
                "created_at": structure.created_at.isoformat(),
                "created_by": structure.created_by
            })
        
        return {
            "structures": structure_data,
            "page": page,
            "limit": limit,
            "total_count": query.count()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving commission structures: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission structures"
        )

@router.get("/structures/{structure_id}")
async def get_commission_structure_details(
    structure_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific commission structure.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        structure = db.query(CommissionStructure).filter(
            CommissionStructure.structure_id == structure_id
        ).first()
        
        if not structure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Commission structure not found"
            )
        
        # Get partner info
        partner = db.query(User).filter(User.user_id == structure.user_id).first()
        
        return {
            "structure_id": structure.structure_id,
            "partner_id": structure.user_id,
            "partner_info": {
                "name": f"{partner.first_name} {partner.last_name}" if partner else "Unknown",
                "email": partner.email if partner else "Unknown",
                "user_type": partner.user_type.value if partner else "Unknown"
            },
            "name": structure.name,
            "commission_type": structure.commission_type.value,
            "base_rate": float(structure.base_rate),
            "tier_structure": structure.tier_structure,
            "performance_bonuses": structure.performance_bonuses,
            "volume_bonuses": structure.volume_bonuses,
            "product_rates": structure.product_rates,
            "payment_frequency": structure.payment_frequency.value,
            "minimum_payout": float(structure.minimum_payout),
            "is_active": structure.is_active,
            "effective_from": structure.effective_from.isoformat(),
            "effective_until": structure.effective_until.isoformat() if structure.effective_until else None,
            "created_at": structure.created_at.isoformat(),
            "updated_at": structure.updated_at.isoformat(),
            "created_by": structure.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving commission structure details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission structure details"
        )

# Commission Calculations
@router.post("/calculate")
async def calculate_commission(
    calculation_request: CommissionCalculationRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Calculate commission for a specific booking.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Automatic tier and bonus calculation
    - Historical volume consideration
    - Performance metric evaluation
    - Detailed calculation breakdown
    """
    try:
        commission_service = CommissionManagementService(db)
        
        result = await commission_service.calculate_commission(calculation_request)
        
        logger.info(f"Commission calculated by admin {admin_user.user_id}: {result.calculation_id}")
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error calculating commission: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate commission"
        )

@router.get("/calculations")
async def get_commission_calculations(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    partner_id: Optional[str] = Query(None),
    status_filter: Optional[List[CommissionStatus]] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get commission calculations with filtering and pagination.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        query = db.query(CommissionCalculation)
        
        if partner_id:
            query = query.filter(CommissionCalculation.partner_id == partner_id)
        
        if status_filter:
            query = query.filter(CommissionCalculation.status.in_(status_filter))
        
        if date_from:
            query = query.filter(CommissionCalculation.booking_date >= date_from)
        
        if date_to:
            query = query.filter(CommissionCalculation.booking_date <= date_to)
        
        query = query.order_by(CommissionCalculation.calculated_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        calculations = query.offset(offset).limit(limit).all()
        
        # Format response
        calculation_data = []
        for calc in calculations:
            # Get partner info
            partner = db.query(User).filter(User.user_id == calc.partner_id).first()
            
            calculation_data.append({
                "calculation_id": calc.calculation_id,
                "booking_id": calc.booking_id,
                "partner_id": calc.partner_id,
                "partner_name": f"{partner.first_name} {partner.last_name}" if partner else "Unknown",
                "booking_amount": float(calc.booking_amount),
                "commission_rate_applied": float(calc.commission_rate_applied),
                "commission_amount": float(calc.commission_amount),
                "volume_bonus": float(calc.volume_bonus),
                "performance_bonus": float(calc.performance_bonus),
                "tier_applied": calc.tier_applied,
                "status": calc.status.value,
                "booking_date": calc.booking_date.isoformat(),
                "calculated_at": calc.calculated_at.isoformat(),
                "approved_at": calc.approved_at.isoformat() if calc.approved_at else None,
                "payment_batch_id": calc.payment_batch_id
            })
        
        return {
            "calculations": calculation_data,
            "page": page,
            "limit": limit,
            "total_count": query.count()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving commission calculations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission calculations"
        )

@router.post("/calculations/approve")
async def approve_commission_calculations(
    approval_request: BulkApprovalRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Approve multiple commission calculations for payment.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        commission_service = CommissionManagementService(db)
        
        result = await commission_service.approve_commission_calculations(
            calculation_ids=approval_request.calculation_ids,
            approved_by=admin_user.user_id
        )
        
        logger.info(f"Commission calculations approved by admin {admin_user.user_id}: {result['approved_count']} calculations")
        
        return {
            "status": "success",
            "message": f"Approved {result['approved_count']} commission calculations",
            **result
        }
        
    except Exception as e:
        logger.error(f"Error approving commission calculations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve commission calculations"
        )

# Partner Commission Summaries
@router.get("/partners/{partner_id}/summary")
async def get_partner_commission_summary(
    partner_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    period_start: datetime = Query(..., description="Start date for commission summary"),
    period_end: datetime = Query(..., description="End date for commission summary")
):
    """
    Get commission summary for a specific partner over a time period.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        commission_service = CommissionManagementService(db)
        
        summary = await commission_service.get_partner_commission_summary(
            partner_id=partner_id,
            period_start=period_start,
            period_end=period_end
        )
        
        logger.info(f"Partner commission summary retrieved by admin {admin_user.user_id} for partner {partner_id}")
        
        return summary
        
    except Exception as e:
        logger.error(f"Error retrieving partner commission summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve partner commission summary"
        )

# Payment Processing
@router.post("/payments/process-batch")
async def process_commission_payment_batch(
    payment_request: PaymentBatchRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Process commission payments for multiple partners in a batch.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Batch payment processing
    - Minimum payout validation
    - Automatic payment record creation
    - Status updates for calculations
    """
    try:
        commission_service = CommissionManagementService(db)
        
        result = await commission_service.process_commission_payment_batch(
            partner_ids=payment_request.partner_ids,
            period_start=payment_request.period_start,
            period_end=payment_request.period_end,
            processed_by=admin_user.user_id
        )
        
        logger.info(f"Commission payment batch processed by admin {admin_user.user_id}: {result['batch_id']}")
        
        return {
            "status": "success",
            "message": f"Processed {result['total_payments']} commission payments",
            **result
        }
        
    except Exception as e:
        logger.error(f"Error processing commission payment batch: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process commission payment batch"
        )

@router.get("/payments")
async def get_commission_payments(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    partner_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    status_filter: Optional[List[CommissionStatus]] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get commission payment records with filtering and pagination.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        query = db.query(CommissionPayment)
        
        if partner_id:
            query = query.filter(CommissionPayment.partner_id == partner_id)
        
        if batch_id:
            query = query.filter(CommissionPayment.batch_id == batch_id)
        
        if status_filter:
            query = query.filter(CommissionPayment.status.in_(status_filter))
        
        if date_from:
            query = query.filter(CommissionPayment.period_start >= date_from)
        
        if date_to:
            query = query.filter(CommissionPayment.period_end <= date_to)
        
        query = query.order_by(CommissionPayment.created_at.desc())
        
        # Apply pagination
        offset = (page - 1) * limit
        payments = query.offset(offset).limit(limit).all()
        
        # Format response
        payment_data = []
        for payment in payments:
            # Get partner info
            partner = db.query(User).filter(User.user_id == payment.partner_id).first()
            
            payment_data.append({
                "payment_id": payment.payment_id,
                "batch_id": payment.batch_id,
                "partner_id": payment.partner_id,
                "partner_name": f"{partner.first_name} {partner.last_name}" if partner else "Unknown",
                "total_amount": float(payment.total_amount),
                "currency": payment.currency,
                "payment_method": payment.payment_method,
                "period_start": payment.period_start.isoformat(),
                "period_end": payment.period_end.isoformat(),
                "total_bookings": payment.total_bookings,
                "base_commission": float(payment.base_commission),
                "volume_bonuses": float(payment.volume_bonuses),
                "performance_bonuses": float(payment.performance_bonuses),
                "status": payment.status.value,
                "processed_at": payment.processed_at.isoformat() if payment.processed_at else None,
                "processed_by": payment.processed_by,
                "payment_reference": payment.payment_reference,
                "created_at": payment.created_at.isoformat()
            })
        
        return {
            "payments": payment_data,
            "page": page,
            "limit": limit,
            "total_count": query.count()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving commission payments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission payments"
        )

# Reporting and Analytics
@router.get("/reports/partner-performance")
async def get_partner_performance_report(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    period_months: int = Query(3, ge=1, le=12),
    top_n: int = Query(10, ge=5, le=50)
):
    """
    Get partner performance report with commission analytics.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * period_months)
        
        # Get calculations for the period
        calculations = db.query(CommissionCalculation).filter(
            CommissionCalculation.booking_date >= start_date,
            CommissionCalculation.status != CommissionStatus.CANCELLED
        ).all()
        
        # Group by partner
        partner_stats = {}
        for calc in calculations:
            partner_id = calc.partner_id
            if partner_id not in partner_stats:
                partner_stats[partner_id] = {
                    "total_bookings": 0,
                    "total_booking_amount": Decimal('0.00'),
                    "total_commission": Decimal('0.00'),
                    "average_booking_amount": Decimal('0.00'),
                    "commission_rate": Decimal('0.00')
                }
            
            partner_stats[partner_id]["total_bookings"] += 1
            partner_stats[partner_id]["total_booking_amount"] += calc.booking_amount
            partner_stats[partner_id]["total_commission"] += calc.commission_amount
        
        # Calculate averages and get partner info
        performance_data = []
        for partner_id, stats in partner_stats.items():
            partner = db.query(User).filter(User.user_id == partner_id).first()
            
            if stats["total_bookings"] > 0:
                stats["average_booking_amount"] = stats["total_booking_amount"] / stats["total_bookings"]
                stats["commission_rate"] = stats["total_commission"] / stats["total_booking_amount"] if stats["total_booking_amount"] > 0 else Decimal('0.00')
            
            performance_data.append({
                "partner_id": partner_id,
                "partner_name": f"{partner.first_name} {partner.last_name}" if partner else "Unknown",
                "partner_email": partner.email if partner else "Unknown",
                "total_bookings": stats["total_bookings"],
                "total_booking_amount": float(stats["total_booking_amount"]),
                "total_commission": float(stats["total_commission"]),
                "average_booking_amount": float(stats["average_booking_amount"]),
                "effective_commission_rate": float(stats["commission_rate"])
            })
        
        # Sort by total commission and take top N
        performance_data.sort(key=lambda x: x["total_commission"], reverse=True)
        top_performers = performance_data[:top_n]
        
        return {
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "months": period_months
            },
            "summary": {
                "total_partners": len(performance_data),
                "total_bookings": sum(p["total_bookings"] for p in performance_data),
                "total_booking_amount": sum(p["total_booking_amount"] for p in performance_data),
                "total_commission_paid": sum(p["total_commission"] for p in performance_data)
            },
            "top_performers": top_performers,
            "all_partners": performance_data
        }
        
    except Exception as e:
        logger.error(f"Error generating partner performance report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate partner performance report"
        )