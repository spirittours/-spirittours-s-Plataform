"""
Administrative B2B Management API
Complete dashboard for B2B partner application management, approval workflows, and commission settings
"""

from fastapi import APIRouter, HTTPException, Depends, Request, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
import logging

from services.advanced_auth_service import (
    AdvancedAuthService,
    User,
    PartnerApplication,
    UserType,
    AccountStatus,
    OAuthProvider
)
from config.database import get_db
from services.notification_service import NotificationService
from pydantic import BaseModel, EmailStr, Field, validator

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/b2b", tags=["B2B Administrative Management"])
security = HTTPBearer()

# Initialize services
auth_service = AdvancedAuthService()
notification_service = NotificationService()

# Pydantic Models for Admin Operations
class CommissionRate(BaseModel):
    """Commission rate configuration model."""
    base_rate: Decimal = Field(..., ge=0, le=1, description="Base commission rate (0.0 to 1.0)")
    volume_tiers: Optional[Dict[str, Decimal]] = Field(default_factory=dict)
    special_rates: Optional[Dict[str, Decimal]] = Field(default_factory=dict)
    effective_date: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = Field(None, max_length=500)

class B2BApplicationReview(BaseModel):
    """B2B application review request model."""
    application_id: str
    decision: str = Field(..., pattern="^(approve|reject)$")
    commission_rate: Optional[Decimal] = Field(None, ge=0, le=1)
    admin_notes: Optional[str] = Field(None, max_length=1000)
    special_conditions: Optional[Dict[str, Union[str, bool, int]]] = Field(default_factory=dict)

class B2BAccountUpdate(BaseModel):
    """B2B account update request model."""
    user_id: str
    status: Optional[AccountStatus] = None
    commission_rate: Optional[Decimal] = Field(None, ge=0, le=1)
    account_notes: Optional[str] = Field(None, max_length=1000)
    suspension_reason: Optional[str] = Field(None, max_length=500)
    reactivation_date: Optional[datetime] = None

class ApplicationFilter(BaseModel):
    """Filter criteria for B2B applications."""
    status: Optional[List[AccountStatus]] = None
    user_type: Optional[List[UserType]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    company_name: Optional[str] = None
    country: Optional[str] = None
    commission_rate_min: Optional[Decimal] = None
    commission_rate_max: Optional[Decimal] = None

class B2BApplicationResponse(BaseModel):
    """Complete B2B application response model."""
    application_id: str
    user_id: str
    email: str
    company_name: str
    contact_person: str
    phone_number: str
    business_license: Optional[str]
    tax_id: Optional[str]
    website: Optional[str]
    business_address: Dict[str, str]
    user_type: UserType
    status: AccountStatus
    commission_rate: Optional[Decimal]
    application_date: datetime
    review_date: Optional[datetime]
    admin_notes: Optional[str]
    documents: List[Dict[str, str]]
    verification_status: Dict[str, bool]

class B2BDashboardStats(BaseModel):
    """Dashboard statistics model."""
    total_applications: int
    pending_applications: int
    approved_applications: int
    rejected_applications: int
    active_partners: int
    suspended_partners: int
    total_commission_paid: Decimal
    avg_commission_rate: Decimal
    monthly_new_applications: List[Dict[str, int]]
    top_performing_partners: List[Dict[str, Union[str, Decimal, int]]]

# Authentication and Authorization
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

# Dashboard Statistics Endpoint
@router.get("/dashboard/stats", response_model=B2BDashboardStats)
async def get_dashboard_statistics(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    date_range: int = Query(30, description="Statistics date range in days")
):
    """
    Get comprehensive dashboard statistics for B2B management.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Total application counts by status
    - Active partner statistics
    - Commission analytics
    - Monthly trends
    - Top performing partners
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=date_range)
        
        # Basic application statistics
        total_apps = db.query(PartnerApplication).count()
        pending_apps = db.query(PartnerApplication).filter(
            PartnerApplication.status == AccountStatus.PENDING
        ).count()
        approved_apps = db.query(PartnerApplication).filter(
            PartnerApplication.status == AccountStatus.ACTIVE
        ).count()
        rejected_apps = db.query(PartnerApplication).filter(
            PartnerApplication.status == AccountStatus.REJECTED
        ).count()
        
        # Active and suspended partners
        active_partners = db.query(User).filter(
            and_(
                User.user_type.in_([UserType.B2B_AGENT, UserType.B2B2C_RESELLER]),
                User.status == AccountStatus.ACTIVE
            )
        ).count()
        
        suspended_partners = db.query(User).filter(
            and_(
                User.user_type.in_([UserType.B2B_AGENT, UserType.B2B2C_RESELLER]),
                User.status == AccountStatus.SUSPENDED
            )
        ).count()
        
        # Commission analytics
        commission_stats = db.query(
            func.sum(User.commission_rate).label("total_commission"),
            func.avg(User.commission_rate).label("avg_commission")
        ).filter(
            and_(
                User.user_type.in_([UserType.B2B_AGENT, UserType.B2B2C_RESELLER]),
                User.status == AccountStatus.ACTIVE,
                User.commission_rate.isnot(None)
            )
        ).first()
        
        total_commission_paid = commission_stats.total_commission or Decimal('0.00')
        avg_commission_rate = commission_stats.avg_commission or Decimal('0.00')
        
        # Monthly new applications trend
        monthly_apps = []
        for i in range(6):  # Last 6 months
            month_start = (end_date - timedelta(days=30 * (i + 1))).replace(day=1)
            month_end = (end_date - timedelta(days=30 * i)).replace(day=1)
            
            count = db.query(PartnerApplication).filter(
                and_(
                    PartnerApplication.created_at >= month_start,
                    PartnerApplication.created_at < month_end
                )
            ).count()
            
            monthly_apps.append({
                "month": month_start.strftime("%Y-%m"),
                "applications": count
            })
        
        # Top performing partners (mock data for now - would need booking/sales data)
        top_partners = db.query(User).filter(
            and_(
                User.user_type.in_([UserType.B2B_AGENT, UserType.B2B2C_RESELLER]),
                User.status == AccountStatus.ACTIVE
            )
        ).order_by(desc(User.commission_rate)).limit(5).all()
        
        top_performing = [
            {
                "partner_id": partner.user_id,
                "company_name": f"{partner.first_name} {partner.last_name}",
                "commission_rate": float(partner.commission_rate or 0),
                "total_bookings": 0,  # Would come from booking service
                "total_revenue": Decimal('0.00')  # Would come from payment service
            }
            for partner in top_partners
        ]
        
        stats = B2BDashboardStats(
            total_applications=total_apps,
            pending_applications=pending_apps,
            approved_applications=approved_apps,
            rejected_applications=rejected_apps,
            active_partners=active_partners,
            suspended_partners=suspended_partners,
            total_commission_paid=total_commission_paid,
            avg_commission_rate=avg_commission_rate,
            monthly_new_applications=monthly_apps[::-1],  # Reverse for chronological order
            top_performing_partners=top_performing
        )
        
        logger.info(f"Dashboard statistics retrieved by admin: {admin_user.user_id}")
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving dashboard statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )

# B2B Applications Management
@router.get("/applications", response_model=List[B2BApplicationResponse])
async def get_b2b_applications(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    status_filter: Optional[List[AccountStatus]] = Query(None),
    user_type_filter: Optional[List[UserType]] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(created_at|company_name|status|commission_rate)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$")
):
    """
    Get paginated list of B2B applications with filtering and sorting.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Pagination support
    - Status and user type filtering
    - Sorting by multiple fields
    - Complete application details
    """
    try:
        # Build query with filters
        query = db.query(PartnerApplication).join(User)
        
        if status_filter:
            query = query.filter(PartnerApplication.status.in_(status_filter))
        
        if user_type_filter:
            query = query.filter(User.user_type.in_(user_type_filter))
        
        # Apply sorting
        sort_column = getattr(PartnerApplication, sort_by, PartnerApplication.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * limit
        applications = query.offset(offset).limit(limit).all()
        
        # Format response
        response_data = []
        for app in applications:
            user = db.query(User).filter(User.user_id == app.user_id).first()
            
            response_data.append(B2BApplicationResponse(
                application_id=app.application_id,
                user_id=app.user_id,
                email=user.email,
                company_name=app.company_name,
                contact_person=f"{user.first_name} {user.last_name}",
                phone_number=user.phone_number or "",
                business_license=app.business_license,
                tax_id=app.tax_id,
                website=app.website,
                business_address=app.business_address or {},
                user_type=user.user_type,
                status=app.status,
                commission_rate=user.commission_rate,
                application_date=app.created_at,
                review_date=app.reviewed_at,
                admin_notes=app.admin_notes,
                documents=app.documents or [],
                verification_status=app.verification_status or {}
            ))
        
        logger.info(f"Retrieved {len(applications)} B2B applications for admin: {admin_user.user_id}")
        return response_data
        
    except Exception as e:
        logger.error(f"Error retrieving B2B applications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve B2B applications"
        )

@router.get("/applications/{application_id}", response_model=B2BApplicationResponse)
async def get_b2b_application_details(
    application_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific B2B application.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        application = db.query(PartnerApplication).filter(
            PartnerApplication.application_id == application_id
        ).first()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        user = db.query(User).filter(User.user_id == application.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated user not found"
            )
        
        response_data = B2BApplicationResponse(
            application_id=application.application_id,
            user_id=application.user_id,
            email=user.email,
            company_name=application.company_name,
            contact_person=f"{user.first_name} {user.last_name}",
            phone_number=user.phone_number or "",
            business_license=application.business_license,
            tax_id=application.tax_id,
            website=application.website,
            business_address=application.business_address or {},
            user_type=user.user_type,
            status=application.status,
            commission_rate=user.commission_rate,
            application_date=application.created_at,
            review_date=application.reviewed_at,
            admin_notes=application.admin_notes,
            documents=application.documents or [],
            verification_status=application.verification_status or {}
        )
        
        logger.info(f"Retrieved application details {application_id} for admin: {admin_user.user_id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving application details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve application details"
        )

# Application Review and Approval
@router.post("/applications/{application_id}/review")
async def review_b2b_application(
    application_id: str,
    review_request: B2BApplicationReview,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Review and approve/reject a B2B application.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Approve or reject applications
    - Set commission rates
    - Add administrative notes
    - Automatic user account activation
    - Email notifications to applicants
    """
    try:
        # Validate application exists
        application = db.query(PartnerApplication).filter(
            PartnerApplication.application_id == application_id
        ).first()
        
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found"
            )
        
        if application.status != AccountStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Application is not in pending status"
            )
        
        # Get associated user
        user = db.query(User).filter(User.user_id == application.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated user not found"
            )
        
        # Process review decision
        if review_request.decision == "approve":
            # Approve application
            application.status = AccountStatus.ACTIVE
            user.status = AccountStatus.ACTIVE
            
            # Set commission rate
            if review_request.commission_rate is not None:
                user.commission_rate = review_request.commission_rate
            
            # Update timestamps
            application.reviewed_at = datetime.now()
            application.approved_at = datetime.now()
            application.reviewed_by = admin_user.user_id
            
            # Send approval notification
            await notification_service.send_b2b_approval_notification(
                user_email=user.email,
                user_name=f"{user.first_name} {user.last_name}",
                company_name=application.company_name,
                commission_rate=float(user.commission_rate or 0),
                special_conditions=review_request.special_conditions
            )
            
            logger.info(f"B2B application {application_id} approved by admin {admin_user.user_id}")
            
        elif review_request.decision == "reject":
            # Reject application
            application.status = AccountStatus.REJECTED
            user.status = AccountStatus.REJECTED
            
            # Update timestamps
            application.reviewed_at = datetime.now()
            application.rejected_at = datetime.now()
            application.reviewed_by = admin_user.user_id
            
            # Send rejection notification
            await notification_service.send_b2b_rejection_notification(
                user_email=user.email,
                user_name=f"{user.first_name} {user.last_name}",
                company_name=application.company_name,
                rejection_reason=review_request.admin_notes or "Application did not meet requirements"
            )
            
            logger.info(f"B2B application {application_id} rejected by admin {admin_user.user_id}")
        
        # Add admin notes
        if review_request.admin_notes:
            application.admin_notes = review_request.admin_notes
        
        # Save changes
        db.commit()
        
        return {
            "status": "success",
            "message": f"Application {review_request.decision}d successfully",
            "application_id": application_id,
            "new_status": application.status.value,
            "commission_rate": float(user.commission_rate) if user.commission_rate else None,
            "reviewed_by": admin_user.user_id,
            "review_timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing application {application_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to review application"
        )

# B2B Account Management
@router.put("/accounts/{user_id}")
async def update_b2b_account(
    user_id: str,
    update_request: B2BAccountUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update B2B account status, commission rate, and other settings.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Update account status (active, suspended, etc.)
    - Modify commission rates
    - Add administrative notes
    - Set suspension/reactivation dates
    """
    try:
        # Get user account
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify it's a B2B account
        if user.user_type not in [UserType.B2B_AGENT, UserType.B2B2C_RESELLER]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is not a B2B account"
            )
        
        # Update status if provided
        old_status = user.status
        if update_request.status and update_request.status != user.status:
            user.status = update_request.status
            
            # Handle suspension
            if update_request.status == AccountStatus.SUSPENDED:
                user.suspended_at = datetime.now()
                user.suspended_by = admin_user.user_id
                if update_request.suspension_reason:
                    user.suspension_reason = update_request.suspension_reason
                
                # Send suspension notification
                await notification_service.send_account_suspension_notification(
                    user_email=user.email,
                    user_name=f"{user.first_name} {user.last_name}",
                    suspension_reason=update_request.suspension_reason or "Administrative decision",
                    reactivation_date=update_request.reactivation_date
                )
            
            # Handle reactivation
            elif update_request.status == AccountStatus.ACTIVE and old_status == AccountStatus.SUSPENDED:
                user.suspended_at = None
                user.suspended_by = None
                user.suspension_reason = None
                user.reactivated_at = datetime.now()
                user.reactivated_by = admin_user.user_id
                
                # Send reactivation notification
                await notification_service.send_account_reactivation_notification(
                    user_email=user.email,
                    user_name=f"{user.first_name} {user.last_name}"
                )
        
        # Update commission rate
        if update_request.commission_rate is not None:
            old_rate = user.commission_rate
            user.commission_rate = update_request.commission_rate
            
            # Log commission rate change
            if old_rate != update_request.commission_rate:
                logger.info(
                    f"Commission rate updated for user {user_id}: "
                    f"{old_rate} -> {update_request.commission_rate} by admin {admin_user.user_id}"
                )
                
                # Send commission update notification
                await notification_service.send_commission_update_notification(
                    user_email=user.email,
                    user_name=f"{user.first_name} {user.last_name}",
                    old_rate=float(old_rate or 0),
                    new_rate=float(update_request.commission_rate),
                    effective_date=datetime.now()
                )
        
        # Update administrative notes
        if update_request.account_notes:
            user.admin_notes = update_request.account_notes
        
        # Update modification tracking
        user.modified_at = datetime.now()
        user.modified_by = admin_user.user_id
        
        # Save changes
        db.commit()
        
        logger.info(f"B2B account {user_id} updated by admin {admin_user.user_id}")
        
        return {
            "status": "success",
            "message": "Account updated successfully",
            "user_id": user_id,
            "updated_fields": {
                "status": update_request.status.value if update_request.status else None,
                "commission_rate": float(update_request.commission_rate) if update_request.commission_rate else None,
                "notes_updated": bool(update_request.account_notes)
            },
            "updated_by": admin_user.user_id,
            "update_timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating B2B account {user_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update account"
        )

# Commission Management
@router.get("/commissions/rates")
async def get_commission_rates(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    user_type_filter: Optional[List[UserType]] = Query(None),
    active_only: bool = Query(True)
):
    """
    Get commission rates for all B2B partners.
    
    **Admin Required**: This endpoint requires administrative privileges.
    """
    try:
        query = db.query(User).filter(
            User.user_type.in_([UserType.B2B_AGENT, UserType.B2B2C_RESELLER])
        )
        
        if user_type_filter:
            query = query.filter(User.user_type.in_(user_type_filter))
        
        if active_only:
            query = query.filter(User.status == AccountStatus.ACTIVE)
        
        users = query.all()
        
        commission_data = [
            {
                "user_id": user.user_id,
                "email": user.email,
                "company_name": f"{user.first_name} {user.last_name}",
                "user_type": user.user_type.value,
                "commission_rate": float(user.commission_rate or 0),
                "status": user.status.value,
                "last_updated": user.modified_at.isoformat() if user.modified_at else None
            }
            for user in users
        ]
        
        return {
            "commission_rates": commission_data,
            "total_partners": len(commission_data),
            "average_rate": sum(d["commission_rate"] for d in commission_data) / len(commission_data) if commission_data else 0
        }
        
    except Exception as e:
        logger.error(f"Error retrieving commission rates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve commission rates"
        )

@router.post("/commissions/bulk-update")
async def bulk_update_commission_rates(
    updates: Dict[str, Decimal],
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Bulk update commission rates for multiple partners.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Request Format**: {"user_id_1": 0.15, "user_id_2": 0.12, ...}
    """
    try:
        updated_users = []
        errors = []
        
        for user_id, new_rate in updates.items():
            try:
                user = db.query(User).filter(User.user_id == user_id).first()
                if not user:
                    errors.append(f"User {user_id} not found")
                    continue
                
                if user.user_type not in [UserType.B2B_AGENT, UserType.B2B2C_RESELLER]:
                    errors.append(f"User {user_id} is not a B2B partner")
                    continue
                
                old_rate = user.commission_rate
                user.commission_rate = new_rate
                user.modified_at = datetime.now()
                user.modified_by = admin_user.user_id
                
                updated_users.append({
                    "user_id": user_id,
                    "old_rate": float(old_rate or 0),
                    "new_rate": float(new_rate)
                })
                
            except Exception as e:
                errors.append(f"Error updating {user_id}: {str(e)}")
        
        db.commit()
        
        logger.info(f"Bulk commission update completed by admin {admin_user.user_id}: {len(updated_users)} updated")
        
        return {
            "status": "completed",
            "updated_count": len(updated_users),
            "updated_users": updated_users,
            "errors": errors,
            "updated_by": admin_user.user_id,
            "update_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in bulk commission update: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk update commission rates"
        )

# Export and Reporting
@router.get("/reports/applications/export")
async def export_applications_report(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    format: str = Query("csv", pattern="^(csv|json|excel)$"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
):
    """
    Export B2B applications report in various formats.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Supported Formats**: csv, json, excel
    """
    try:
        # Build query with date filters
        query = db.query(PartnerApplication).join(User)
        
        if date_from:
            query = query.filter(PartnerApplication.created_at >= date_from)
        
        if date_to:
            query = query.filter(PartnerApplication.created_at <= date_to)
        
        applications = query.all()
        
        # Prepare export data
        export_data = []
        for app in applications:
            user = db.query(User).filter(User.user_id == app.user_id).first()
            
            export_data.append({
                "Application ID": app.application_id,
                "Email": user.email,
                "Company Name": app.company_name,
                "Contact Person": f"{user.first_name} {user.last_name}",
                "User Type": user.user_type.value,
                "Status": app.status.value,
                "Commission Rate": float(user.commission_rate or 0),
                "Application Date": app.created_at.isoformat(),
                "Review Date": app.reviewed_at.isoformat() if app.reviewed_at else "",
                "Business License": app.business_license or "",
                "Tax ID": app.tax_id or "",
                "Website": app.website or "",
                "Phone": user.phone_number or ""
            })
        
        if format == "json":
            return {
                "export_format": "json",
                "export_date": datetime.now().isoformat(),
                "total_records": len(export_data),
                "data": export_data
            }
        
        # For CSV and Excel, you would implement actual file generation
        # For now, returning structured data that can be converted
        return {
            "export_format": format,
            "export_date": datetime.now().isoformat(),
            "total_records": len(export_data),
            "download_url": f"/api/admin/b2b/downloads/applications_{datetime.now().strftime('%Y%m%d')}.{format}",
            "data_preview": export_data[:5]  # First 5 records as preview
        }
        
    except Exception as e:
        logger.error(f"Error exporting applications report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export applications report"
        )

# Application Search
@router.get("/applications/search")
async def search_b2b_applications(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
    query: str = Query(..., min_length=2),
    search_fields: List[str] = Query(["company_name", "email"], description="Fields to search in")
):
    """
    Search B2B applications by various criteria.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Searchable Fields**: company_name, email, business_license, tax_id, website
    """
    try:
        search_query = db.query(PartnerApplication).join(User)
        
        # Build search conditions
        search_conditions = []
        
        if "company_name" in search_fields:
            search_conditions.append(PartnerApplication.company_name.ilike(f"%{query}%"))
        
        if "email" in search_fields:
            search_conditions.append(User.email.ilike(f"%{query}%"))
        
        if "business_license" in search_fields:
            search_conditions.append(PartnerApplication.business_license.ilike(f"%{query}%"))
        
        if "tax_id" in search_fields:
            search_conditions.append(PartnerApplication.tax_id.ilike(f"%{query}%"))
        
        if "website" in search_fields:
            search_conditions.append(PartnerApplication.website.ilike(f"%{query}%"))
        
        if search_conditions:
            search_query = search_query.filter(or_(*search_conditions))
        
        applications = search_query.limit(50).all()  # Limit results
        
        # Format results
        results = []
        for app in applications:
            user = db.query(User).filter(User.user_id == app.user_id).first()
            
            results.append({
                "application_id": app.application_id,
                "company_name": app.company_name,
                "email": user.email,
                "status": app.status.value,
                "user_type": user.user_type.value,
                "application_date": app.created_at.isoformat(),
                "match_score": 1.0  # Could implement more sophisticated scoring
            })
        
        logger.info(f"Application search performed by admin {admin_user.user_id}: '{query}' -> {len(results)} results")
        
        return {
            "search_query": query,
            "search_fields": search_fields,
            "total_results": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error searching applications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search applications"
        )