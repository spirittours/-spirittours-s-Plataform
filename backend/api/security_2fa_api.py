"""
Two-Factor Authentication API Endpoints
Complete 2FA management and security endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from backend.models.rbac_models import User
from backend.auth.rbac_middleware import get_current_active_user, AdminRequiredDep
from backend.auth.security_2fa import SecurityManager, TwoFactorAuth
from backend.database import get_db_session

router = APIRouter(prefix="/security/2fa", tags=["Two-Factor Authentication"])

# Pydantic Models
class Setup2FARequest(BaseModel):
    phone_number: str = None

class Verify2FARequest(BaseModel):
    token: str

class Enable2FARequest(BaseModel):
    verification_token: str

class SecurityEventResponse(BaseModel):
    id: str
    event_type: str
    event_details: str
    success: bool
    risk_level: str
    timestamp: datetime

# 2FA Setup and Management
@router.post("/setup")
async def setup_2fa(
    setup_request: Setup2FARequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Set up 2FA for current user"""
    try:
        security_manager = SecurityManager(db)
        
        result = security_manager.setup_2fa(
            user_id=str(current_user.id),
            phone_number=setup_request.phone_number
        )
        
        return {
            "success": True,
            "message": "2FA setup initiated successfully",
            "qr_code": result["qr_code"],
            "backup_codes": result["backup_codes"],
            "secret_key": result["secret_key"]  # Only return during setup
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting up 2FA: {str(e)}")

@router.post("/verify")
async def verify_2fa(
    verify_request: Verify2FARequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Verify 2FA token"""
    try:
        security_manager = SecurityManager(db)
        
        is_valid = security_manager.verify_2fa_token(
            user_id=str(current_user.id),
            token=verify_request.token
        )
        
        if is_valid:
            return {
                "success": True,
                "message": "2FA token verified successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid 2FA token")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying 2FA: {str(e)}")

@router.post("/enable")
async def enable_2fa(
    enable_request: Enable2FARequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Enable 2FA after successful verification"""
    try:
        security_manager = SecurityManager(db)
        
        success = security_manager.enable_2fa(
            user_id=str(current_user.id),
            verification_token=enable_request.verification_token
        )
        
        if success:
            return {
                "success": True,
                "message": "2FA enabled successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to enable 2FA")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enabling 2FA: {str(e)}")

@router.post("/disable")
async def disable_2fa(
    verify_request: Verify2FARequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Disable 2FA for current user"""
    try:
        security_manager = SecurityManager(db)
        
        # Verify token before disabling
        is_valid = security_manager.verify_2fa_token(
            user_id=str(current_user.id),
            token=verify_request.token
        )
        
        if is_valid:
            success = security_manager.disable_2fa(str(current_user.id))
            if success:
                return {
                    "success": True,
                    "message": "2FA disabled successfully"
                }
            else:
                raise HTTPException(status_code=400, detail="Failed to disable 2FA")
        else:
            raise HTTPException(status_code=400, detail="Invalid 2FA token")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error disabling 2FA: {str(e)}")

@router.get("/status")
async def get_2fa_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get 2FA status for current user"""
    try:
        security_manager = SecurityManager(db)
        
        twofa = db.query(TwoFactorAuth).filter_by(user_id=str(current_user.id)).first()
        
        # Check if 2FA is required for user's role
        is_required = security_manager.is_2fa_required(current_user)
        
        return {
            "is_enabled": twofa.is_enabled if twofa else False,
            "is_required": is_required,
            "has_backup_codes": bool(twofa and twofa.backup_codes) if twofa else False,
            "phone_verified": twofa.phone_verified if twofa else False,
            "email_verified": twofa.email_verified if twofa else False,
            "last_used": twofa.last_used_at.isoformat() if twofa and twofa.last_used_at else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting 2FA status: {str(e)}")

@router.post("/regenerate-backup-codes")
async def regenerate_backup_codes(
    verify_request: Verify2FARequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Regenerate backup codes"""
    try:
        security_manager = SecurityManager(db)
        
        # Verify token before regenerating
        is_valid = security_manager.verify_2fa_token(
            user_id=str(current_user.id),
            token=verify_request.token
        )
        
        if is_valid:
            backup_codes = security_manager.regenerate_backup_codes(str(current_user.id))
            return {
                "success": True,
                "backup_codes": backup_codes,
                "message": "Backup codes regenerated successfully"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid 2FA token")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error regenerating backup codes: {str(e)}")

# Security Monitoring and Logs
@router.get("/security-events")
async def get_security_events(
    days: int = 30,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get security events for current user"""
    try:
        security_manager = SecurityManager(db)
        
        events = security_manager.get_user_security_events(
            user_id=str(current_user.id),
            days=days
        )
        
        return {
            "events": [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "event_details": event.event_details,
                    "success": event.success,
                    "risk_level": event.risk_level,
                    "timestamp": event.timestamp.isoformat()
                }
                for event in events
            ],
            "total_events": len(events)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting security events: {str(e)}")

@router.get("/login-attempts")
async def get_login_attempts(
    days: int = 30,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get login attempts for current user"""
    try:
        security_manager = SecurityManager(db)
        
        attempts = security_manager.get_user_login_attempts(
            username=current_user.username,
            days=days
        )
        
        return {
            "login_attempts": [
                {
                    "id": attempt.id,
                    "ip_address": attempt.ip_address,
                    "success": attempt.success,
                    "failure_reason": attempt.failure_reason,
                    "attempt_time": attempt.attempt_time.isoformat()
                }
                for attempt in attempts
            ],
            "total_attempts": len(attempts),
            "successful_attempts": len([a for a in attempts if a.success]),
            "failed_attempts": len([a for a in attempts if not a.success])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting login attempts: {str(e)}")

# Admin Security Management
@router.get("/admin/security-overview")
async def get_security_overview(
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get system-wide security overview (Admin only)"""
    try:
        security_manager = SecurityManager(db)
        
        overview = security_manager.get_security_overview()
        
        return overview
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting security overview: {str(e)}")

@router.get("/admin/users-2fa-status")
async def get_users_2fa_status(
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get 2FA status for all users (Admin only)"""
    try:
        security_manager = SecurityManager(db)
        
        users_status = security_manager.get_all_users_2fa_status()
        
        return {
            "users_2fa_status": users_status,
            "total_users": len(users_status),
            "users_with_2fa": len([u for u in users_status if u["is_enabled"]]),
            "users_requiring_2fa": len([u for u in users_status if u["is_required"]])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting users 2FA status: {str(e)}")

@router.post("/admin/force-2fa-setup/{user_id}")
async def force_2fa_setup(
    user_id: str,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Force 2FA setup for specific user (Admin only)"""
    try:
        security_manager = SecurityManager(db)
        
        success = security_manager.force_2fa_setup(user_id)
        
        if success:
            return {
                "success": True,
                "message": f"2FA setup forced for user {user_id}"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to force 2FA setup")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error forcing 2FA setup: {str(e)}")

@router.get("/admin/high-risk-events")
async def get_high_risk_events(
    days: int = 7,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get high-risk security events (Admin only)"""
    try:
        security_manager = SecurityManager(db)
        
        events = security_manager.get_high_risk_events(days=days)
        
        return {
            "high_risk_events": [
                {
                    "id": event.id,
                    "user_id": event.user_id,
                    "event_type": event.event_type,
                    "event_details": event.event_details,
                    "risk_level": event.risk_level,
                    "ip_address": event.ip_address,
                    "timestamp": event.timestamp.isoformat()
                }
                for event in events
            ],
            "total_events": len(events)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting high-risk events: {str(e)}")