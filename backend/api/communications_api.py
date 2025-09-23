"""
Communications API - PBX 3CX Integration
Complete telephony and communication management
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio

from backend.models.rbac_models import User
from backend.auth.rbac_middleware import get_current_active_user, PermissionRequiredDep
from backend.config.database import get_db
from backend.integrations.pbx_3cx import (
    PBX3CXManager, CommunicationManager, CallLog, CallCampaign, 
    create_pbx_manager
)

router = APIRouter(prefix="/communications", tags=["Communications & PBX"])

# Pydantic Models
class MakeCallRequest(BaseModel):
    phone_number: str
    customer_id: Optional[str] = None
    notes: Optional[str] = None

class CreateCampaignRequest(BaseModel):
    name: str
    description: str
    campaign_type: str  # marketing, sales, support
    target_audience: str  # customers, agencies, operators
    script_content: str
    phone_numbers: List[str]
    assigned_agents: List[str]
    schedule_start: Optional[datetime] = None

class PromotionalCallRequest(BaseModel):
    target_type: str  # agencies, tour_operators
    promotion_title: str
    promotion_script: str
    schedule_datetime: Optional[datetime] = None

class CallTransferRequest(BaseModel):
    call_id: str
    target_extension: str
    notes: Optional[str] = None

class CallNotesRequest(BaseModel):
    call_id: str
    notes: str

# Call Management Endpoints
@router.post("/call/make")
async def make_outbound_call(
    call_request: MakeCallRequest,
    current_user: User = Depends(PermissionRequiredDep("system_configuration", "execute", "phone_system")),
    db: Session = Depends(get_db)
):
    """Make outbound call through PBX"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        # Get user's extension (would be configured in user profile)
        user_extension = "101"  # Default - should be from user profile
        
        result = await pbx.make_outbound_call(
            extension=user_extension,
            phone_number=call_request.phone_number,
            user_id=str(current_user.id),
            customer_id=call_request.customer_id
        )
        
        return {
            "success": result["success"],
            "message": result["message"],
            "call_id": result.get("call_id"),
            "phone_number": call_request.phone_number
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making call: {str(e)}")

@router.get("/calls/active")
async def get_active_calls(
    current_user: User = Depends(PermissionRequiredDep("system_monitoring", "read", "call_queue")),
):
    """Get list of currently active calls"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        active_calls = await pbx.get_active_calls()
        
        return {
            "active_calls": active_calls,
            "total_active": len(active_calls),
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting active calls: {str(e)}")

@router.get("/calls/history")
async def get_call_history(
    days: int = 7,
    extension: Optional[str] = None,
    current_user: User = Depends(PermissionRequiredDep("audit_logs", "read", "call_recording")),
    db: Session = Depends(get_db)
):
    """Get call history from PBX and database"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        # Get PBX call history
        pbx_history = await pbx.get_call_history(extension=extension, days=days)
        
        # Get database call logs
        db_logs = db.query(CallLog).filter(
            CallLog.call_start >= datetime.utcnow() - timedelta(days=days)
        ).all()
        
        return {
            "pbx_history": pbx_history,
            "database_logs": [
                {
                    "id": log.id,
                    "call_type": log.call_type,
                    "phone_number": log.phone_number,
                    "call_start": log.call_start,
                    "call_duration": log.call_duration,
                    "call_status": log.call_status,
                    "notes": log.notes
                }
                for log in db_logs
            ],
            "total_calls": len(pbx_history) + len(db_logs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting call history: {str(e)}")

@router.post("/call/transfer")
async def transfer_call(
    transfer_request: CallTransferRequest,
    current_user: User = Depends(PermissionRequiredDep("customer_experience", "execute", "call_queue")),
):
    """Transfer active call to another extension"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        success = await pbx.transfer_call(
            call_id=transfer_request.call_id,
            target_extension=transfer_request.target_extension
        )
        
        if success:
            return {
                "success": True,
                "message": f"Call transferred to extension {transfer_request.target_extension}",
                "call_id": transfer_request.call_id
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to transfer call")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error transferring call: {str(e)}")

@router.post("/call/{call_id}/hangup")
async def hangup_call(
    call_id: str,
    current_user: User = Depends(PermissionRequiredDep("system_configuration", "execute", "phone_system")),
):
    """Hangup active call"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        success = await pbx.hangup_call(call_id)
        
        if success:
            return {
                "success": True,
                "message": "Call ended successfully",
                "call_id": call_id
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to hangup call")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error hanging up call: {str(e)}")

@router.post("/call/{call_id}/record")
async def start_call_recording(
    call_id: str,
    current_user: User = Depends(PermissionRequiredDep("audit_logs", "create", "call_recording")),
):
    """Start recording for active call"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        success = await pbx.start_call_recording(call_id)
        
        if success:
            return {
                "success": True,
                "message": "Call recording started",
                "call_id": call_id
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to start recording")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting recording: {str(e)}")

@router.post("/call/{call_id}/notes")
async def add_call_notes(
    call_id: str,
    notes_request: CallNotesRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add notes to call log"""
    try:
        # Find or create call log
        call_log = db.query(CallLog).filter_by(id=call_id).first()
        if call_log:
            call_log.notes = notes_request.notes
        else:
            # Create new call log entry
            call_log = CallLog(
                id=call_id,
                user_id=str(current_user.id),
                call_type="unknown",
                phone_number="",
                call_start=datetime.utcnow(),
                call_status="completed",
                notes=notes_request.notes
            )
            db.add(call_log)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Call notes added successfully",
            "call_id": call_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding call notes: {str(e)}")

# Campaign Management Endpoints
@router.post("/campaigns")
async def create_call_campaign(
    campaign_request: CreateCampaignRequest,
    current_user: User = Depends(PermissionRequiredDep("marketing_campaigns", "create", "campaign")),
    db: Session = Depends(get_db)
):
    """Create new call campaign"""
    try:
        pbx = create_pbx_manager()
        comm_manager = CommunicationManager(pbx, db)
        
        campaign_id = await comm_manager.create_call_campaign(
            name=campaign_request.name,
            description=campaign_request.description,
            campaign_type=campaign_request.campaign_type,
            target_audience=campaign_request.target_audience,
            script_content=campaign_request.script_content,
            created_by=str(current_user.id)
        )
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "message": "Campaign created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating campaign: {str(e)}")

@router.post("/campaigns/{campaign_id}/start")
async def start_call_campaign(
    campaign_id: str,
    phone_numbers: List[str],
    assigned_agents: List[str],
    background_tasks: BackgroundTasks,
    current_user: User = Depends(PermissionRequiredDep("marketing_campaigns", "execute", "campaign")),
    db: Session = Depends(get_db)
):
    """Start call campaign execution"""
    try:
        pbx = create_pbx_manager()
        comm_manager = CommunicationManager(pbx, db)
        
        # Add campaign execution to background tasks
        background_tasks.add_task(
            execute_campaign_background,
            comm_manager,
            campaign_id,
            phone_numbers,
            assigned_agents
        )
        
        return {
            "success": True,
            "message": "Campaign started successfully",
            "campaign_id": campaign_id,
            "total_numbers": len(phone_numbers),
            "assigned_agents": len(assigned_agents)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting campaign: {str(e)}")

async def execute_campaign_background(comm_manager, campaign_id, phone_numbers, assigned_agents):
    """Background task to execute campaign"""
    try:
        results = await comm_manager.start_campaign(
            campaign_id=campaign_id,
            phone_list=phone_numbers,
            assigned_agents=assigned_agents
        )
        print(f"Campaign {campaign_id} completed: {results}")
    except Exception as e:
        print(f"Campaign {campaign_id} failed: {e}")

@router.get("/campaigns")
async def get_call_campaigns(
    current_user: User = Depends(PermissionRequiredDep("marketing_campaigns", "read", "campaign")),
    db: Session = Depends(get_db)
):
    """Get all call campaigns"""
    try:
        campaigns = db.query(CallCampaign).all()
        
        return {
            "campaigns": [
                {
                    "id": camp.id,
                    "name": camp.name,
                    "description": camp.description,
                    "campaign_type": camp.campaign_type,
                    "target_audience": camp.target_audience,
                    "status": camp.status,
                    "created_at": camp.created_at,
                    "start_date": camp.start_date,
                    "end_date": camp.end_date
                }
                for camp in campaigns
            ],
            "total_campaigns": len(campaigns)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting campaigns: {str(e)}")

@router.get("/campaigns/{campaign_id}/statistics")
async def get_campaign_statistics(
    campaign_id: str,
    current_user: User = Depends(PermissionRequiredDep("analytics_dashboard", "read", "marketing_analytics")),
    db: Session = Depends(get_db)
):
    """Get comprehensive campaign statistics"""
    try:
        pbx = create_pbx_manager()
        comm_manager = CommunicationManager(pbx, db)
        
        stats = await comm_manager.get_campaign_statistics(campaign_id)
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting campaign statistics: {str(e)}")

# Promotional Communications
@router.post("/promotions/agencies")
async def send_promotional_calls_agencies(
    promo_request: PromotionalCallRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(PermissionRequiredDep("marketing_campaigns", "execute", "campaign")),
    db: Session = Depends(get_db)
):
    """Send promotional calls to travel agencies"""
    try:
        pbx = create_pbx_manager()
        comm_manager = CommunicationManager(pbx, db)
        
        # Add to background tasks for async execution
        background_tasks.add_task(
            execute_promotional_calls,
            comm_manager,
            "agencies",
            promo_request.promotion_script,
            str(current_user.id)
        )
        
        return {
            "success": True,
            "message": "Promotional campaign to agencies initiated",
            "target_type": "agencies",
            "promotion_title": promo_request.promotion_title
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending promotional calls: {str(e)}")

@router.post("/promotions/tour-operators")
async def send_promotional_calls_operators(
    promo_request: PromotionalCallRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(PermissionRequiredDep("marketing_campaigns", "execute", "campaign")),
    db: Session = Depends(get_db)
):
    """Send promotional calls to tour operators"""
    try:
        pbx = create_pbx_manager()
        comm_manager = CommunicationManager(pbx, db)
        
        # Add to background tasks for async execution
        background_tasks.add_task(
            execute_promotional_calls,
            comm_manager,
            "tour_operators",
            promo_request.promotion_script,
            str(current_user.id)
        )
        
        return {
            "success": True,
            "message": "Promotional campaign to tour operators initiated",
            "target_type": "tour_operators",
            "promotion_title": promo_request.promotion_title
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending promotional calls: {str(e)}")

async def execute_promotional_calls(comm_manager, target_type, promotion_script, user_id):
    """Background task for promotional calls"""
    try:
        results = await comm_manager.send_promotional_calls(
            target_type=target_type,
            promotion_script=promotion_script
        )
        print(f"Promotional campaign to {target_type} completed: {results}")
    except Exception as e:
        print(f"Promotional campaign to {target_type} failed: {e}")

# Extension Status and Management
@router.get("/extensions/status")
async def get_extensions_status(
    current_user: User = Depends(PermissionRequiredDep("system_monitoring", "read", "phone_system")),
):
    """Get status of all extensions"""
    try:
        pbx = create_pbx_manager()
        await pbx.authenticate()
        
        # Mock extension data - in production, get from 3CX
        extensions = {
            "100": {"status": "available", "user": "Sales Director"},
            "101": {"status": "busy", "user": "Sales Manager"},
            "102": {"status": "available", "user": "Senior Agent"},
            "200": {"status": "offline", "user": "Call Center Director"},
            "201": {"status": "available", "user": "Supervisor"},
            "202": {"status": "busy", "user": "Agent Senior"}
        }
        
        return {
            "extensions": extensions,
            "total_extensions": len(extensions),
            "available": len([e for e in extensions.values() if e["status"] == "available"]),
            "busy": len([e for e in extensions.values() if e["status"] == "busy"]),
            "offline": len([e for e in extensions.values() if e["status"] == "offline"])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting extensions status: {str(e)}")

@router.get("/dashboard/metrics")
async def get_communication_metrics(
    days: int = 7,
    current_user: User = Depends(PermissionRequiredDep("analytics_dashboard", "read", "call_metrics")),
    db: Session = Depends(get_db)
):
    """Get communication dashboard metrics"""
    try:
        # Get metrics from database
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        call_logs = db.query(CallLog).filter(
            CallLog.call_start >= start_date
        ).all()
        
        campaigns = db.query(CallCampaign).filter(
            CallCampaign.created_at >= start_date
        ).all()
        
        metrics = {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "calls": {
                "total_calls": len(call_logs),
                "inbound_calls": len([c for c in call_logs if c.call_type == "inbound"]),
                "outbound_calls": len([c for c in call_logs if c.call_type == "outbound"]),
                "answered_calls": len([c for c in call_logs if c.call_status == "answered"]),
                "missed_calls": len([c for c in call_logs if c.call_status == "missed"]),
                "average_duration": sum([c.call_duration or 0 for c in call_logs if c.call_status == "answered"]) / max(len([c for c in call_logs if c.call_status == "answered"]), 1)
            },
            "campaigns": {
                "total_campaigns": len(campaigns),
                "active_campaigns": len([c for c in campaigns if c.status == "active"]),
                "completed_campaigns": len([c for c in campaigns if c.status == "completed"]),
                "draft_campaigns": len([c for c in campaigns if c.status == "draft"])
            },
            "performance": {
                "answer_rate": round((len([c for c in call_logs if c.call_status == "answered"]) / max(len(call_logs), 1)) * 100, 2),
                "calls_per_day": round(len(call_logs) / max(days, 1), 2)
            }
        }
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting communication metrics: {str(e)}")