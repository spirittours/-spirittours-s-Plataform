"""
Access Control API Router
Endpoints for managing Virtual Guide AI access control
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

from ..auth.auth_bearer import JWTBearer
from ..services.access_control_service import (
    AccessControlService,
    AccessLevel,
    AccessType,
    AccessStatus
)
from ..services.advanced_control_features import AdvancedControlSystem
from ..database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/access-control",
    tags=["Access Control"]
)

# Request/Response Models
class GrantAccessRequest(BaseModel):
    """Request model for granting access"""
    target_email: EmailStr
    access_level: AccessLevel
    access_type: AccessType = AccessType.TIME_LIMITED
    duration_days: Optional[int] = None
    trip_id: Optional[str] = None
    destinations: Optional[List[int]] = None
    features: Optional[List[str]] = None
    pre_trip_days: int = 14
    post_trip_days: int = 14
    notes: Optional[str] = None
    require_2fa: bool = False
    watermark_enabled: bool = True

class BulkAccessRequest(BaseModel):
    """Request for bulk access grants"""
    emails: List[EmailStr]
    access_level: AccessLevel
    duration_days: Optional[int] = 30
    features: Optional[List[str]] = None
    notes: Optional[str] = None

class AgencySetupRequest(BaseModel):
    """Request for agency setup"""
    agency_id: str
    access_level: AccessLevel = AccessLevel.AGENCY
    client_limit: Optional[int] = None
    valid_until: Optional[datetime] = None
    allowed_features: Optional[List[str]] = None
    delegation_enabled: bool = True

class AgencyDelegationRequest(BaseModel):
    """Agency delegation request"""
    client_email: EmailStr
    trip_id: Optional[str] = None
    duration_days: int = 30
    features: Optional[List[str]] = None

class RevokeAccessRequest(BaseModel):
    """Request to revoke access"""
    target_identifier: str  # email, user_id, or grant_id
    reason: str
    immediate: bool = True

class AccessPatternRequest(BaseModel):
    """Custom access pattern configuration"""
    name: str
    description: str
    allowed_days: List[str]
    allowed_hours: List[tuple]
    timezone: str = "UTC"
    max_devices: int = 3
    geofences: Optional[List[Dict]] = None
    require_location: bool = False
    watermark_config: Optional[Dict] = None

class KillswitchRequest(BaseModel):
    """Emergency killswitch request"""
    target: str  # 'user', 'agency', 'global'
    target_id: Optional[str] = None
    reason: str
    notify_affected: bool = True

# Admin Endpoints

@router.post("/grant", dependencies=[Depends(JWTBearer())])
async def grant_access(
    request: GrantAccessRequest,
    admin_id: str = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    """Grant access to a specific user"""
    try:
        service = AccessControlService(db)
        
        if request.trip_id:
            # Trip-based access
            grant = await service.create_trip_based_access(
                user_id=request.target_email,
                trip_id=request.trip_id,
                booking_id="temp_booking",  # Would get from trip
                pre_trip_days=request.pre_trip_days,
                post_trip_days=request.post_trip_days
            )
        else:
            # Time-based or unlimited access
            grant = await service.grant_admin_access(
                admin_id=admin_id,
                target_user_email=request.target_email,
                access_level=request.access_level,
                duration_days=request.duration_days,
                features=request.features,
                destinations=request.destinations,
                notes=request.notes
            )
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "grant_id": grant.grant_id,
                "message": f"Access granted to {request.target_email}",
                "expires": grant.expiration_date.isoformat() if grant.expiration_date else "Never"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/grant/bulk", dependencies=[Depends(JWTBearer())])
async def grant_bulk_access(
    request: BulkAccessRequest,
    admin_id: str = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    """Grant access to multiple users"""
    try:
        service = AccessControlService(db)
        grants = []
        
        for email in request.emails:
            grant = await service.grant_admin_access(
                admin_id=admin_id,
                target_user_email=email,
                access_level=request.access_level,
                duration_days=request.duration_days,
                features=request.features,
                notes=request.notes
            )
            grants.append(grant.grant_id)
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "grants_created": len(grants),
                "grant_ids": grants
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/revoke", dependencies=[Depends(JWTBearer())])
async def revoke_access(
    request: RevokeAccessRequest,
    admin_id: str = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    """Revoke access for a user"""
    try:
        service = AccessControlService(db)
        
        success = await service.revoke_access(
            admin_id=admin_id,
            target_identifier=request.target_identifier,
            reason=request.reason
        )
        
        if success:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "success": True,
                    "message": f"Access revoked for {request.target_identifier}"
                }
            )
        else:
            raise HTTPException(status_code=404, detail="No grants found to revoke")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/grants", dependencies=[Depends(JWTBearer())])
async def get_all_grants(
    status_filter: Optional[str] = Query(None),
    level_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all access grants with optional filters"""
    try:
        service = AccessControlService(db)
        
        # This would query the database with filters
        # For now, returning mock data
        grants = [
            {
                "grant_id": "grant_001",
                "user_email": "user@example.com",
                "access_level": "standard",
                "status": "active",
                "activation_date": datetime.utcnow().isoformat(),
                "expiration_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "usage_count": 45,
                "usage_limit": 1000
            }
        ]
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "total": len(grants),
                "grants": grants
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/grants/{grant_id}", dependencies=[Depends(JWTBearer())])
async def get_grant_details(
    grant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific grant"""
    try:
        # Would fetch from database
        grant = {
            "grant_id": grant_id,
            "user_email": "user@example.com",
            "access_level": "standard",
            "access_type": "trip_based",
            "status": "active",
            "activation_date": datetime.utcnow().isoformat(),
            "expiration_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "trip_id": "trip_123",
            "allowed_destinations": [1, 2, 3],
            "allowed_features": ["virtual_guide", "navigation", "offline_maps"],
            "usage_count": 45,
            "usage_limit": 1000,
            "daily_usage": 12,
            "last_access": datetime.utcnow().isoformat(),
            "granted_by": "admin_001",
            "notes": "VIP client - special access"
        }
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=grant
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Agency Endpoints

@router.post("/agency/setup", dependencies=[Depends(JWTBearer())])
async def setup_agency(
    request: AgencySetupRequest,
    admin_id: str = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    """Setup agency access"""
    try:
        service = AccessControlService(db)
        
        config = await service.grant_agency_access(
            agency_id=request.agency_id,
            access_level=request.access_level,
            client_limit=request.client_limit,
            valid_until=request.valid_until,
            allowed_features=request.allowed_features
        )
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "agency_id": request.agency_id,
                "config": config
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agency/{agency_id}/delegate", dependencies=[Depends(JWTBearer())])
async def agency_delegate_access(
    agency_id: str,
    request: AgencyDelegationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Agency delegates access to client"""
    try:
        service = AccessControlService(db)
        
        grant = await service.delegate_agency_access(
            agency_id=agency_id,
            client_email=request.client_email,
            trip_id=request.trip_id,
            duration_days=request.duration_days,
            features=request.features
        )
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "grant_id": grant.grant_id,
                "client": request.client_email,
                "expires": grant.expiration_date.isoformat()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agencies", dependencies=[Depends(JWTBearer())])
async def get_agencies(
    db: AsyncSession = Depends(get_db)
):
    """Get all agencies with access"""
    try:
        # Would fetch from database
        agencies = [
            {
                "id": "agency_001",
                "name": "Premium Travel Agency",
                "email": "contact@premiumtravel.com",
                "access_enabled": True,
                "client_limit": 100,
                "active_clients": 47,
                "valid_until": (datetime.utcnow() + timedelta(days=365)).isoformat()
            }
        ]
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "total": len(agencies),
                "agencies": agencies
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User Access Check Endpoints

@router.get("/check/{user_id}")
async def check_user_access(
    user_id: str,
    destination_id: Optional[int] = Query(None),
    feature: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Check if user has access"""
    try:
        service = AccessControlService(db)
        
        has_access, grant, reason = await service.check_access(
            user_id=user_id,
            destination_id=destination_id,
            feature=feature
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "has_access": has_access,
                "grant_id": grant.grant_id if grant else None,
                "access_level": grant.access_level.value if grant else None,
                "reason": reason,
                "watermark": grant.watermark_enabled if grant else True
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/info")
async def get_user_access_info(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed access information for a user"""
    try:
        service = AccessControlService(db)
        
        info = await service.get_user_access_info(user_id)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Advanced Control Features

@router.post("/advanced/pattern", dependencies=[Depends(JWTBearer())])
async def create_access_pattern(
    request: AccessPatternRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create custom access pattern"""
    try:
        advanced = AdvancedControlSystem(db)
        
        pattern = await advanced.create_custom_access_pattern(
            name=request.name,
            config=request.dict()
        )
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "pattern_id": pattern.pattern_id,
                "name": pattern.name
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/advanced/killswitch", dependencies=[Depends(JWTBearer())])
async def activate_killswitch(
    request: KillswitchRequest,
    admin_id: str = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    """Activate emergency killswitch"""
    try:
        advanced = AdvancedControlSystem(db)
        
        success = await advanced.implement_killswitch(
            target=request.target,
            target_id=request.target_id,
            reason=request.reason
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": success,
                "message": f"Killswitch activated for {request.target}",
                "affected": request.target_id or "All"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/advanced/honeypot/{user_id}", dependencies=[Depends(JWTBearer())])
async def setup_honeypot(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Setup honeypot for user"""
    try:
        advanced = AdvancedControlSystem(db)
        
        honeypots = await advanced.setup_honeypot_detection(user_id)
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "success": True,
                "user_id": user_id,
                "honeypots": honeypots
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/advanced/trust/{user_id}", dependencies=[Depends(JWTBearer())])
async def get_trust_score(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get user trust score and progressive disclosure"""
    try:
        advanced = AdvancedControlSystem(db)
        
        # Calculate trust score (would use real metrics)
        trust_score = 75.5
        
        disclosure = await advanced.implement_progressive_disclosure(
            user_id=user_id,
            trust_score=trust_score
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=disclosure
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics Endpoints

@router.get("/analytics/summary", dependencies=[Depends(JWTBearer())])
async def get_access_analytics(
    db: AsyncSession = Depends(get_db)
):
    """Get access control analytics"""
    try:
        # Would calculate from database
        analytics = {
            "total_grants": 342,
            "active_grants": 287,
            "expired_grants": 45,
            "revoked_grants": 10,
            "total_users": 256,
            "total_agencies": 12,
            "usage_today": 1456,
            "fraud_attempts": 3,
            "access_by_level": {
                "demo": 45,
                "basic": 120,
                "standard": 87,
                "premium": 25,
                "vip": 10
            },
            "access_by_type": {
                "trip_based": 180,
                "time_limited": 67,
                "subscription": 30,
                "agency_delegated": 10
            },
            "top_destinations": [
                {"id": 1, "name": "Paris", "accesses": 145},
                {"id": 2, "name": "Rome", "accesses": 98},
                {"id": 3, "name": "Barcelona", "accesses": 76}
            ]
        }
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=analytics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/usage/{period}", dependencies=[Depends(JWTBearer())])
async def get_usage_analytics(
    period: str,  # 'daily', 'weekly', 'monthly'
    db: AsyncSession = Depends(get_db)
):
    """Get usage analytics for period"""
    try:
        # Would calculate from database
        usage = {
            "period": period,
            "data": [
                {"date": "2025-10-20", "usage": 145, "unique_users": 89},
                {"date": "2025-10-19", "usage": 132, "unique_users": 76},
                {"date": "2025-10-18", "usage": 156, "unique_users": 92}
            ],
            "peak_hour": 14,
            "average_session_duration": 45,
            "most_used_features": ["virtual_guide", "navigation", "voice_interaction"]
        }
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=usage
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Fraud Detection Endpoints

@router.post("/fraud/report", dependencies=[Depends(JWTBearer())])
async def report_fraud(
    user_id: str = Body(...),
    fraud_type: str = Body(...),
    details: Dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Report fraud attempt"""
    try:
        service = AccessControlService(db)
        
        suspended = await service.detect_fraud_attempt(
            user_id=user_id,
            fraud_type=fraud_type,
            details=details
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "user_suspended": suspended,
                "action_taken": "suspended" if suspended else "warning_issued"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fraud/history/{user_id}", dependencies=[Depends(JWTBearer())])
async def get_fraud_history(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get fraud history for user"""
    try:
        # Would fetch from database
        history = [
            {
                "date": datetime.utcnow().isoformat(),
                "type": "location_spoofing",
                "severity": "medium",
                "action_taken": "warning"
            }
        ]
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "user_id": user_id,
                "fraud_score": 35,
                "incidents": history
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))