"""
Email API Endpoints for Spirit Tours Intelligent Email System

RESTful API for:
- Email account management
- Email fetching and listing
- Email classification
- Email response management
- Email analytics dashboard

Author: Spirit Tours Development Team
Created: 2025-10-04
Phase: 1 - Email Foundation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from backend.database import get_db
from backend.services.email_service import EmailService
from backend.services.email_classifier import EmailClassifier
from backend.auth.rbac_middleware import get_current_active_user
from backend.models.rbac_models import User
from backend.models.email_models import (
    EmailCategory, EmailIntent, EmailPriority, EmailStatus, ResponseType,
    EmailAccountResponse, EmailMessageResponse, EmailClassificationResponse,
    EmailAnalyticsResponse, EmailDashboardResponse, ClassifyEmailRequest,
    SendResponseRequest, CreateEmailTemplateRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/email", tags=["Email Management"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CreateEmailAccountRequest(BaseModel):
    """Request to create email account"""
    email_address: EmailStr
    display_name: str = Field(..., min_length=1, max_length=255)
    category: EmailCategory
    provider: str = Field(default="gmail", pattern="^(gmail|microsoft365)$")
    description: Optional[str] = None
    auto_response_enabled: bool = False
    ai_processing_enabled: bool = True
    sla_response_time_hours: int = Field(default=24, ge=1, le=168)
    
    class Config:
        json_schema_extra = {
            "example": {
                "email_address": "sales@spirittours.us",
                "display_name": "Spirit Tours Sales",
                "category": "sales",
                "provider": "gmail",
                "description": "General sales inquiries",
                "auto_response_enabled": True,
                "ai_processing_enabled": True,
                "sla_response_time_hours": 24
            }
        }


class EmailListRequest(BaseModel):
    """Request for email list with filters"""
    account_id: Optional[str] = None
    category: Optional[EmailCategory] = None
    status: Optional[EmailStatus] = None
    priority: Optional[EmailPriority] = None
    assigned_user_id: Optional[str] = None
    unread_only: bool = False
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class EmailListResponse(BaseModel):
    """Response with email list"""
    success: bool
    emails: List[Dict[str, Any]]
    total: int
    limit: int
    offset: int


class AssignEmailRequest(BaseModel):
    """Request to assign email to user"""
    email_id: str
    user_id: str


class UpdateEmailStatusRequest(BaseModel):
    """Request to update email status"""
    email_id: str
    status: EmailStatus


class AnalyticsTimeSeriesRequest(BaseModel):
    """Request for time series analytics"""
    start_date: datetime
    end_date: datetime
    account_id: Optional[str] = None
    category: Optional[EmailCategory] = None


# ============================================================================
# EMAIL ACCOUNT ENDPOINTS
# ============================================================================

@router.get("/accounts", response_model=Dict[str, Any])
async def get_email_accounts(
    active_only: bool = Query(True, description="Return only active accounts"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all email accounts
    
    Returns list of configured email accounts with statistics
    """
    try:
        service = EmailService(db)
        accounts = await service.get_email_accounts(active_only=active_only)
        
        return {
            "success": True,
            "accounts": [
                {
                    "id": str(account.id),
                    "email_address": account.email_address,
                    "display_name": account.display_name,
                    "category": account.category.value,
                    "description": account.description,
                    "is_active": account.is_active,
                    "auto_response_enabled": account.auto_response_enabled,
                    "ai_processing_enabled": account.ai_processing_enabled,
                    "total_received": account.total_received,
                    "total_sent": account.total_sent,
                    "avg_response_time_minutes": account.avg_response_time_minutes,
                    "created_at": account.created_at.isoformat(),
                    "last_sync_at": account.last_sync_at.isoformat() if account.last_sync_at else None
                }
                for account in accounts
            ],
            "total": len(accounts)
        }
        
    except Exception as e:
        logger.error(f"Failed to get email accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get email accounts: {str(e)}"
        )


@router.post("/accounts", response_model=Dict[str, Any])
async def create_email_account(
    request: CreateEmailAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create new email account
    
    Requires admin permissions
    """
    try:
        service = EmailService(db)
        account = await service.create_email_account(
            email_address=request.email_address,
            display_name=request.display_name,
            category=request.category,
            provider=request.provider,
            description=request.description,
            auto_response_enabled=request.auto_response_enabled,
            ai_processing_enabled=request.ai_processing_enabled,
            sla_response_time_hours=request.sla_response_time_hours
        )
        
        return {
            "success": True,
            "account": {
                "id": str(account.id),
                "email_address": account.email_address,
                "display_name": account.display_name,
                "category": account.category.value,
                "is_active": account.is_active
            },
            "message": "Email account created successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to create email account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create email account: {str(e)}"
        )


@router.get("/accounts/{account_id}", response_model=Dict[str, Any])
async def get_email_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific email account details"""
    try:
        service = EmailService(db)
        account = await service.get_email_account(account_id)
        
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email account not found"
            )
        
        return {
            "success": True,
            "account": {
                "id": str(account.id),
                "email_address": account.email_address,
                "display_name": account.display_name,
                "category": account.category.value,
                "description": account.description,
                "is_active": account.is_active,
                "auto_response_enabled": account.auto_response_enabled,
                "ai_processing_enabled": account.ai_processing_enabled,
                "provider": account.provider,
                "total_received": account.total_received,
                "total_sent": account.total_sent,
                "avg_response_time_minutes": account.avg_response_time_minutes,
                "sla_response_time_hours": account.sla_response_time_hours,
                "created_at": account.created_at.isoformat(),
                "last_sync_at": account.last_sync_at.isoformat() if account.last_sync_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get email account: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get email account: {str(e)}"
        )


# ============================================================================
# EMAIL MESSAGE ENDPOINTS
# ============================================================================

@router.post("/list", response_model=EmailListResponse)
async def list_emails(
    request: EmailListRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List emails with filters
    
    Supports filtering by account, category, status, priority, assigned user
    """
    try:
        service = EmailService(db)
        emails, total = await service.get_emails(
            account_id=request.account_id,
            category=request.category,
            status=request.status,
            priority=request.priority,
            assigned_user_id=request.assigned_user_id,
            unread_only=request.unread_only,
            limit=request.limit,
            offset=request.offset
        )
        
        return EmailListResponse(
            success=True,
            emails=[service._email_to_dict(email) for email in emails],
            total=total,
            limit=request.limit,
            offset=request.offset
        )
        
    except Exception as e:
        logger.error(f"Failed to list emails: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list emails: {str(e)}"
        )


@router.get("/messages/{email_id}", response_model=Dict[str, Any])
async def get_email(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific email with full details"""
    try:
        service = EmailService(db)
        email = await service.get_email(email_id)
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
        
        # Mark as read
        await service.mark_as_read(email_id)
        
        return {
            "success": True,
            "email": {
                **service._email_to_dict(email),
                "body_html": email.body_html,
                "body_text": email.body_text,
                "attachments": email.attachments,
                "cc_emails": email.cc_emails,
                "extracted_entities": email.extracted_entities,
                "keywords": email.keywords,
                "classification_confidence": email.classification_confidence,
                "classifications": [
                    {
                        "category": c.category.value,
                        "category_confidence": c.category_confidence,
                        "intent": c.intent.value,
                        "intent_confidence": c.intent_confidence,
                        "priority": c.priority.value,
                        "created_at": c.created_at.isoformat()
                    }
                    for c in email.classifications
                ],
                "responses": [
                    {
                        "id": str(r.id),
                        "response_type": r.response_type.value,
                        "is_sent": r.is_sent,
                        "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                        "created_at": r.created_at.isoformat()
                    }
                    for r in email.responses
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get email: {str(e)}"
        )


@router.post("/classify", response_model=Dict[str, Any])
async def classify_email(
    request: ClassifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Classify email using AI
    
    Analyzes email content to determine category, intent, priority, and sentiment
    """
    try:
        service = EmailService(db)
        result = await service.classify_email(request.email_id)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Classification failed')
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to classify email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to classify email: {str(e)}"
        )


@router.post("/assign", response_model=Dict[str, Any])
async def assign_email(
    request: AssignEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign email to user"""
    try:
        service = EmailService(db)
        success = await service.assign_email(request.email_id, request.user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
        
        return {
            "success": True,
            "message": "Email assigned successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to assign email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign email: {str(e)}"
        )


@router.post("/update-status", response_model=Dict[str, Any])
async def update_email_status(
    request: UpdateEmailStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update email status"""
    try:
        service = EmailService(db)
        success = await service.update_email_status(request.email_id, request.status)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found"
            )
        
        return {
            "success": True,
            "message": f"Email status updated to {request.status.value}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update email status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update email status: {str(e)}"
        )


# ============================================================================
# EMAIL ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_email_dashboard(
    account_id: Optional[str] = Query(None, description="Filter by account"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get email dashboard statistics
    
    Returns comprehensive dashboard data including:
    - Today's email volume
    - Pending responses
    - Urgent emails
    - Average response time
    - SLA compliance
    - Sentiment/category/intent distributions
    - Recent emails
    """
    try:
        service = EmailService(db)
        stats = await service.get_dashboard_stats(
            account_id=account_id,
            user_id=str(current_user.id)
        )
        
        if not stats['success']:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=stats.get('error', 'Failed to get dashboard stats')
            )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard: {str(e)}"
        )


@router.post("/analytics/time-series", response_model=Dict[str, Any])
async def get_analytics_time_series(
    request: AnalyticsTimeSeriesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get time series analytics data
    
    Returns daily analytics for the specified date range
    """
    try:
        service = EmailService(db)
        analytics = await service.get_analytics_time_series(
            start_date=request.start_date,
            end_date=request.end_date,
            account_id=request.account_id,
            category=request.category
        )
        
        return {
            "success": True,
            "analytics": analytics,
            "start_date": request.start_date.isoformat(),
            "end_date": request.end_date.isoformat(),
            "total_days": len(analytics)
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics time series: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics time series: {str(e)}"
        )


@router.get("/stats/summary", response_model=Dict[str, Any])
async def get_email_stats_summary(
    days: int = Query(7, ge=1, le=90, description="Number of days to include"),
    account_id: Optional[str] = Query(None, description="Filter by account"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get email statistics summary for last N days
    """
    try:
        service = EmailService(db)
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()
        
        analytics = await service.get_analytics_time_series(
            start_date=start_date,
            end_date=end_date,
            account_id=account_id
        )
        
        # Calculate summary
        total_received = sum(a.get('total_received', 0) for a in analytics)
        total_sent = sum(a.get('total_sent', 0) for a in analytics)
        avg_response_times = [a.get('avg_response_time') for a in analytics if a.get('avg_response_time')]
        avg_response_time = sum(avg_response_times) / len(avg_response_times) if avg_response_times else 0
        
        sla_rates = [a.get('sla_compliance_rate') for a in analytics if a.get('sla_compliance_rate')]
        avg_sla_compliance = sum(sla_rates) / len(sla_rates) if sla_rates else 100.0
        
        return {
            "success": True,
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "summary": {
                "total_received": total_received,
                "total_sent": total_sent,
                "avg_response_time_minutes": round(avg_response_time, 2),
                "avg_sla_compliance_rate": round(avg_sla_compliance, 2),
                "daily_avg_received": round(total_received / days, 2) if days > 0 else 0
            },
            "daily_analytics": analytics
        }
        
    except Exception as e:
        logger.error(f"Failed to get stats summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats summary: {str(e)}"
        )


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health", response_model=Dict[str, Any])
async def email_service_health(
    db: AsyncSession = Depends(get_db)
):
    """Health check for email service"""
    try:
        service = EmailService(db)
        accounts = await service.get_email_accounts(active_only=True)
        
        return {
            "success": True,
            "status": "healthy",
            "active_accounts": len(accounts),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Email service health check failed: {str(e)}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
