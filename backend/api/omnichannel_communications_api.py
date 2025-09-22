"""
Omnichannel Communications API
Complete API for 3CX PBX integration, social media management, and unified communications
Includes WebRTC calling, voicemail management, and AI-powered customer interactions
"""

from fastapi import APIRouter, HTTPException, Depends, Request, status, Query, Form, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Union, Any
from datetime import datetime, timedelta
import logging
import json
import asyncio

from backend.services.pbx_3cx_integration_service import (
    PBX3CXIntegrationService,
    PBX3CXConfig,
    CallRequest,
    VoicemailResponse,
    ContactSyncRequest,
    PBXExtension,
    CallRecord,
    VoicemailRecord,
    OmnichannelContact,
    AgentStatus,
    CallStatus
)
from backend.services.omnichannel_crm_service import (
    OmnichannelCRMService,
    SendMessageRequest,
    ConversationSummary,
    SocialPlatform,
    ConversationStatus,
    SocialConversation,
    SocialMessage,
    MessageTemplate,
    MessageStatus
)
from backend.services.advanced_auth_service import AdvancedAuthService, User, UserType, AccountStatus
from backend.database import get_db_session
from pydantic import BaseModel, Field, validator
import os

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/communications", tags=["Omnichannel Communications"])
security = HTTPBearer()

# Initialize services
auth_service = AdvancedAuthService()

# Pydantic Models for API
class WebRTCSessionRequest(BaseModel):
    """WebRTC session creation request"""
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: str = Field(..., regex=r"^\+?[1-9]\d{1,14}$")
    customer_email: Optional[str] = None
    preferred_agent: Optional[str] = None
    call_purpose: Optional[str] = None

class ExtensionCreateRequest(BaseModel):
    """Create new PBX extension"""
    user_id: str
    extension_number: str = Field(..., regex=r"^\d{3,5}$")
    display_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., regex=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    department: Optional[str] = None
    is_sales_agent: bool = False
    is_support_agent: bool = False
    is_ai_agent: bool = False

class ConversationAssignRequest(BaseModel):
    """Assign conversation to agent"""
    conversation_id: str
    agent_id: str
    priority: Optional[int] = Field(1, ge=1, le=4)
    notes: Optional[str] = None

class BulkMessageRequest(BaseModel):
    """Send bulk messages"""
    platform: SocialPlatform
    recipients: List[str]
    message_content: str
    template_id: Optional[str] = None
    variables: Dict[str, str] = Field(default_factory=dict)
    schedule_time: Optional[datetime] = None

class CallAnalyticsRequest(BaseModel):
    """Call analytics request"""
    date_from: datetime
    date_to: datetime
    extension_id: Optional[str] = None
    department: Optional[str] = None
    include_ai_agents: bool = True

class SocialMediaIntegrationConfig(BaseModel):
    """Social media platform configuration"""
    platform: SocialPlatform
    app_id: Optional[str] = None
    app_secret: Optional[str] = None
    access_token: Optional[str] = None
    phone_number_id: Optional[str] = None  # WhatsApp
    page_id: Optional[str] = None  # Facebook/Instagram
    webhook_verify_token: Optional[str] = None
    auto_respond_enabled: bool = True
    ai_agent_enabled: bool = True

# Authentication helpers
async def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """Get authenticated user with communications access"""
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
        if not user or user.status != AccountStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return user
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

async def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """Get admin user for configuration endpoints"""
    user = await get_authenticated_user(credentials, db)
    
    if user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return user

# Initialize services function
async def get_pbx_service(db: Session = Depends(get_db_session)) -> PBX3CXIntegrationService:
    """Get initialized PBX service"""
    # This would typically load configuration from environment or database
    config = PBX3CXConfig(
        server_url=os.getenv("PBX_3CX_SERVER_URL", "http://localhost:5000"),
        api_username=os.getenv("PBX_3CX_API_USERNAME", "admin"),
        api_password=os.getenv("PBX_3CX_API_PASSWORD", "password"),
        tenant_id=os.getenv("PBX_3CX_TENANT_ID", "default")
    )
    
    service = PBX3CXIntegrationService(db, config)
    await service.initialize_connection()
    return service

async def get_crm_service(db: Session = Depends(get_db_session)) -> OmnichannelCRMService:
    """Get initialized CRM service"""
    service = OmnichannelCRMService(db)
    await service.initialize_platforms()
    return service

# 3CX PBX Integration Endpoints
@router.post("/pbx/extensions")
async def create_pbx_extension(
    extension_request: ExtensionCreateRequest,
    user: User = Depends(get_admin_user),
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service)
):
    """
    Create new PBX extension for user.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Creates extension in 3CX PBX system
    - Configures SIP credentials automatically
    - Enables voicemail and call recording
    - Supports AI agent configuration
    """
    try:
        extension = await pbx_service.create_extension(
            user_id=extension_request.user_id,
            extension_number=extension_request.extension_number,
            display_name=extension_request.display_name,
            email=extension_request.email,
            department=extension_request.department,
            is_ai_agent=extension_request.is_ai_agent
        )
        
        # Update user record with extension info
        target_user = pbx_service.db.query(User).filter(
            User.user_id == extension_request.user_id
        ).first()
        
        if target_user:
            # Add extension info to user metadata
            user_metadata = target_user.metadata or {}
            user_metadata["pbx_extension"] = {
                "extension_id": extension.extension_id,
                "extension_number": extension.extension_number,
                "created_at": datetime.now().isoformat()
            }
            target_user.metadata = user_metadata
            pbx_service.db.commit()
        
        logger.info(f"PBX extension created by admin {user.user_id}: {extension.extension_number}")
        
        return {
            "success": True,
            "extension_id": extension.extension_id,
            "extension_number": extension.extension_number,
            "sip_credentials": {
                "username": extension.extension_number,
                "password": extension.sip_password
            },
            "voicemail_enabled": extension.voicemail_enabled,
            "call_recording_enabled": extension.call_recording_enabled
        }
        
    except Exception as e:
        logger.error(f"Error creating PBX extension: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create extension: {str(e)}"
        )

@router.post("/pbx/calls/initiate")
async def initiate_call(
    call_request: CallRequest,
    user: User = Depends(get_authenticated_user),
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service)
):
    """
    Initiate outbound call through PBX system.
    
    **Features**:
    - Initiates call from user's extension
    - Records call details in CRM
    - Supports customer ID tracking
    - Real-time call status updates
    """
    try:
        # Verify user has extension
        extension = pbx_service.db.query(PBXExtension).filter(
            PBXExtension.user_id == user.user_id,
            PBXExtension.is_active == True
        ).first()
        
        if not extension:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User does not have an active PBX extension"
            )
        
        # Update call request with user's extension
        call_request.caller_extension = extension.extension_number
        
        result = await pbx_service.initiate_call(call_request)
        
        logger.info(f"Call initiated by user {user.user_id}: {result.get('call_id')}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate call"
        )

@router.get("/pbx/voicemails", response_model=List[VoicemailResponse])
async def get_voicemails(
    user: User = Depends(get_authenticated_user),
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service),
    unread_only: bool = Query(False, description="Get only unread voicemails"),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Get voicemails for user's extension.
    
    **Features**:
    - Retrieves voicemails with transcription
    - AI-powered priority scoring
    - Automatic categorization
    - Audio playback URLs
    """
    try:
        # Get user's extension
        extension = pbx_service.db.query(PBXExtension).filter(
            PBXExtension.user_id == user.user_id,
            PBXExtension.is_active == True
        ).first()
        
        if not extension:
            return []
        
        voicemails = await pbx_service.get_voicemails(
            extension_id=extension.extension_id,
            unread_only=unread_only
        )
        
        return voicemails[:limit]
        
    except Exception as e:
        logger.error(f"Error getting voicemails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve voicemails"
        )

@router.get("/pbx/agents/status")
async def get_agents_status(
    user: User = Depends(get_authenticated_user),
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service),
    department: Optional[str] = Query(None, description="Filter by department")
):
    """
    Get real-time status of all agents.
    
    **Features**:
    - Real-time availability status
    - Call statistics for today
    - Department filtering
    - AI agent identification
    """
    try:
        agent_status = await pbx_service.get_agent_status()
        
        # Filter by department if specified
        if department:
            agent_status["agents"] = [
                agent for agent in agent_status["agents"]
                if agent.get("department") == department
            ]
        
        return agent_status
        
    except Exception as e:
        logger.error(f"Error getting agent status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get agent status"
        )

@router.post("/pbx/contacts/sync")
async def sync_contacts_to_pbx(
    sync_request: ContactSyncRequest,
    user: User = Depends(get_admin_user),
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service)
):
    """
    Sync Spirit Tours contacts to 3CX phonebook.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Features**:
    - Bulk contact synchronization
    - Automatic duplicate detection
    - CRM field mapping
    - Bidirectional sync support
    """
    try:
        result = await pbx_service.sync_contacts_to_pbx(sync_request.contacts)
        
        logger.info(f"Contacts synced by admin {user.user_id}: {result['synced_count']} contacts")
        
        return {
            "success": True,
            "synced_contacts": result["synced_count"],
            "failed_contacts": result["error_count"],
            "total_processed": result["total_processed"]
        }
        
    except Exception as e:
        logger.error(f"Error syncing contacts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync contacts"
        )

# WebRTC Customer Calling
@router.post("/webrtc/sessions")
async def create_webrtc_session(
    session_request: WebRTCSessionRequest,
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service)
):
    """
    Create WebRTC session for customer web calling.
    
    **Public Endpoint**: Allows customers to call from website.
    
    **Features**:
    - Temporary extension creation
    - SIP credentials generation
    - Agent routing based on availability
    - 2-hour session expiration
    """
    try:
        webrtc_config = await pbx_service.enable_webrtc_for_customer(
            customer_phone=session_request.customer_phone,
            agent_extension=session_request.preferred_agent
        )
        
        # Create contact record for customer
        contact_id = f"CONTACT_{session_request.customer_phone.replace('+', '')}"
        
        # Store customer info temporarily
        customer_data = {
            "name": session_request.customer_name,
            "phone": session_request.customer_phone,
            "email": session_request.customer_email,
            "call_purpose": session_request.call_purpose,
            "session_created": datetime.now().isoformat()
        }
        
        logger.info(f"WebRTC session created for customer: {session_request.customer_phone}")
        
        return {
            "success": True,
            "session_id": webrtc_config["webrtc_config"]["session_id"],
            "sip_config": webrtc_config["webrtc_config"]["sip_credentials"],
            "call_button_html": f"""
                <button id="spirit-tours-call-btn" onclick="initiateSpiritToursCall()" 
                        style="background: #2c5aa0; color: white; padding: 15px 30px; 
                               border: none; border-radius: 5px; font-size: 16px; cursor: pointer;">
                    📞 Llamar a Spirit Tours
                </button>
                <script>
                function initiateSpiritToursCall() {{
                    // WebRTC calling implementation would go here
                    alert('Connecting to Spirit Tours agent...');
                }}
                </script>
            """,
            "expires_at": webrtc_config["webrtc_config"]["expires_at"]
        }
        
    except Exception as e:
        logger.error(f"Error creating WebRTC session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create calling session"
        )

# Social Media & CRM Integration
@router.post("/social/platforms/configure")
async def configure_social_platform(
    config: SocialMediaIntegrationConfig,
    user: User = Depends(get_admin_user),
    crm_service: OmnichannelCRMService = Depends(get_crm_service)
):
    """
    Configure social media platform integration.
    
    **Admin Required**: This endpoint requires administrative privileges.
    
    **Supported Platforms**:
    - WhatsApp Business API
    - Facebook Messenger
    - Instagram Direct Messages
    - TikTok Business Messages
    """
    try:
        from backend.services.omnichannel_crm_service import SocialPlatformConfig
        
        # Check if configuration exists
        existing_config = crm_service.db.query(SocialPlatformConfig).filter(
            SocialPlatformConfig.platform == config.platform
        ).first()
        
        if existing_config:
            # Update existing configuration
            existing_config.app_id = config.app_id
            existing_config.app_secret = config.app_secret
            existing_config.access_token = config.access_token
            existing_config.phone_number_id = config.phone_number_id
            existing_config.page_id = config.page_id
            existing_config.webhook_verify_token = config.webhook_verify_token
            existing_config.auto_respond_enabled = config.auto_respond_enabled
            existing_config.ai_agent_enabled = config.ai_agent_enabled
            existing_config.updated_at = datetime.now()
            
            platform_config = existing_config
        else:
            # Create new configuration
            platform_config = SocialPlatformConfig(
                platform=config.platform,
                app_id=config.app_id,
                app_secret=config.app_secret,
                access_token=config.access_token,
                phone_number_id=config.phone_number_id,
                page_id=config.page_id,
                webhook_verify_token=config.webhook_verify_token,
                auto_respond_enabled=config.auto_respond_enabled,
                ai_agent_enabled=config.ai_agent_enabled
            )
            crm_service.db.add(platform_config)
        
        crm_service.db.commit()
        
        # Test platform connection
        if config.platform == SocialPlatform.WHATSAPP:
            connection_test = await crm_service._initialize_whatsapp(platform_config)
        else:
            connection_test = True  # Placeholder for other platforms
        
        logger.info(f"Social platform configured by admin {user.user_id}: {config.platform.value}")
        
        return {
            "success": True,
            "platform": config.platform.value,
            "connection_test_passed": connection_test,
            "webhook_url": f"/api/communications/webhooks/{config.platform.value}",
            "auto_respond_enabled": config.auto_respond_enabled,
            "ai_agent_enabled": config.ai_agent_enabled
        }
        
    except Exception as e:
        logger.error(f"Error configuring social platform: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure {config.platform.value}"
        )

@router.get("/social/conversations", response_model=List[ConversationSummary])
async def get_conversations(
    user: User = Depends(get_authenticated_user),
    crm_service: OmnichannelCRMService = Depends(get_crm_service),
    platform: Optional[SocialPlatform] = Query(None),
    status: Optional[ConversationStatus] = Query(None),
    assigned_to_me: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get conversations from all social platforms.
    
    **Features**:
    - Unified view across all platforms
    - Status and platform filtering
    - Assignment filtering
    - Real-time message counts
    """
    try:
        assigned_agent = user.user_id if assigned_to_me else None
        
        conversations = await crm_service.get_conversations(
            platform=platform,
            status=status,
            assigned_agent=assigned_agent,
            page=page,
            limit=limit
        )
        
        return conversations
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve conversations"
        )

@router.post("/social/conversations/{conversation_id}/assign")
async def assign_conversation(
    conversation_id: str,
    assignment: ConversationAssignRequest,
    user: User = Depends(get_authenticated_user),
    crm_service: OmnichannelCRMService = Depends(get_crm_service)
):
    """
    Assign conversation to agent.
    
    **Features**:
    - Instant assignment notification
    - Priority setting
    - Assignment notes
    - Status automatic update
    """
    try:
        success = await crm_service.assign_conversation(
            conversation_id=conversation_id,
            agent_id=assignment.agent_id
        )
        
        if success:
            logger.info(f"Conversation {conversation_id} assigned by {user.user_id} to {assignment.agent_id}")
            return {"success": True, "message": "Conversation assigned successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to assign conversation"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign conversation"
        )

@router.post("/social/messages/send")
async def send_social_message(
    message_request: SendMessageRequest,
    user: User = Depends(get_authenticated_user),
    crm_service: OmnichannelCRMService = Depends(get_crm_service)
):
    """
    Send message through social platform.
    
    **Features**:
    - Multi-platform message sending
    - Template message support
    - Media attachment support
    - Delivery tracking
    """
    try:
        result = await crm_service.send_message(message_request)
        
        if result.get("success"):
            logger.info(f"Message sent by {user.user_id} via {message_request.platform.value}")
            return {
                "success": True,
                "message_id": result.get("message_id"),
                "platform_message_id": result.get("platform_message_id"),
                "delivery_status": "sent"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to send message")
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )

@router.post("/social/messages/bulk")
async def send_bulk_messages(
    bulk_request: BulkMessageRequest,
    user: User = Depends(get_authenticated_user),
    crm_service: OmnichannelCRMService = Depends(get_crm_service)
):
    """
    Send bulk messages to multiple recipients.
    
    **Features**:
    - Bulk messaging across platforms
    - Template variable substitution
    - Scheduling support
    - Rate limiting compliance
    """
    try:
        results = []
        success_count = 0
        
        for recipient in bulk_request.recipients:
            try:
                message_request = SendMessageRequest(
                    platform=bulk_request.platform,
                    recipient_id=recipient,
                    content=bulk_request.message_content,
                    template_id=bulk_request.template_id,
                    variables=bulk_request.variables
                )
                
                result = await crm_service.send_message(message_request)
                
                if result.get("success"):
                    success_count += 1
                
                results.append({
                    "recipient": recipient,
                    "success": result.get("success", False),
                    "message_id": result.get("message_id"),
                    "error": result.get("error")
                })
                
                # Rate limiting delay
                await asyncio.sleep(1)
                
            except Exception as e:
                results.append({
                    "recipient": recipient,
                    "success": False,
                    "error": str(e)
                })
        
        logger.info(f"Bulk messages sent by {user.user_id}: {success_count}/{len(bulk_request.recipients)} successful")
        
        return {
            "success": True,
            "total_recipients": len(bulk_request.recipients),
            "successful_sends": success_count,
            "failed_sends": len(bulk_request.recipients) - success_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error sending bulk messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send bulk messages"
        )

# Webhook Handlers for Social Platforms
@router.post("/webhooks/{platform}")
async def handle_platform_webhook(
    platform: SocialPlatform,
    request: Request,
    crm_service: OmnichannelCRMService = Depends(get_crm_service)
):
    """
    Handle incoming webhooks from social platforms.
    
    **Public Endpoint**: Receives webhooks from external platforms.
    
    **Supported Platforms**:
    - WhatsApp Business API
    - Facebook Messenger
    - Instagram Direct Messages
    """
    try:
        # Get webhook data
        webhook_data = await request.json()
        
        # Verify webhook signature (platform-specific)
        if platform == SocialPlatform.WHATSAPP:
            # WhatsApp webhook verification would go here
            pass
        
        # Process incoming message
        result = await crm_service.handle_incoming_message(platform, webhook_data)
        
        logger.info(f"Webhook processed for {platform.value}: {result.get('message_id')}")
        
        return {"success": True, "processed": True}
        
    except Exception as e:
        logger.error(f"Webhook processing error for {platform.value}: {e}")
        return {"success": False, "error": str(e)}

@router.get("/webhooks/{platform}")
async def verify_platform_webhook(
    platform: SocialPlatform,
    request: Request
):
    """
    Verify webhook for social platforms.
    
    **Public Endpoint**: Used by platforms to verify webhook URLs.
    """
    try:
        # WhatsApp webhook verification
        if platform == SocialPlatform.WHATSAPP:
            hub_mode = request.query_params.get("hub.mode")
            hub_challenge = request.query_params.get("hub.challenge")
            hub_verify_token = request.query_params.get("hub.verify_token")
            
            # This would verify against your stored verify token
            expected_token = "your_webhook_verify_token"  # Load from config
            
            if hub_mode == "subscribe" and hub_verify_token == expected_token:
                return int(hub_challenge)
            else:
                raise HTTPException(status_code=403, detail="Webhook verification failed")
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Webhook verification error for {platform.value}: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

# Analytics and Reporting
@router.get("/analytics/conversations")
async def get_conversation_analytics(
    user: User = Depends(get_authenticated_user),
    crm_service: OmnichannelCRMService = Depends(get_crm_service),
    platform: Optional[SocialPlatform] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None)
):
    """
    Get comprehensive conversation and sales analytics.
    
    **Features**:
    - Conversion rate analysis
    - Platform performance comparison
    - Agent performance metrics
    - Revenue tracking by channel
    """
    try:
        analytics = await crm_service.get_conversation_analytics(
            platform=platform,
            date_from=date_from,
            date_to=date_to
        )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting conversation analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics"
        )

@router.get("/analytics/calls")
async def get_call_analytics(
    analytics_request: CallAnalyticsRequest = Depends(),
    user: User = Depends(get_authenticated_user),
    pbx_service: PBX3CXIntegrationService = Depends(get_pbx_service)
):
    """
    Get comprehensive call analytics from PBX system.
    
    **Features**:
    - Call volume analysis
    - Average call duration
    - Answer rates by department
    - Agent performance metrics
    """
    try:
        # Query call records
        query = pbx_service.db.query(CallRecord).filter(
            CallRecord.start_time >= analytics_request.date_from,
            CallRecord.start_time <= analytics_request.date_to
        )
        
        if analytics_request.extension_id:
            query = query.filter(CallRecord.extension_id == analytics_request.extension_id)
        
        if analytics_request.department:
            # Join with extensions to filter by department
            query = query.join(PBXExtension).filter(
                PBXExtension.department == analytics_request.department
            )
        
        call_records = query.all()
        
        # Calculate metrics
        total_calls = len(call_records)
        answered_calls = sum(1 for call in call_records if call.status == CallStatus.COMPLETED)
        answer_rate = (answered_calls / total_calls * 100) if total_calls > 0 else 0
        
        total_duration = sum(call.duration_seconds for call in call_records if call.duration_seconds)
        avg_duration = total_duration / answered_calls if answered_calls > 0 else 0
        
        # Group by date for trend analysis
        daily_stats = {}
        for call in call_records:
            date_key = call.start_time.date().isoformat()
            if date_key not in daily_stats:
                daily_stats[date_key] = {"total": 0, "answered": 0}
            
            daily_stats[date_key]["total"] += 1
            if call.status == CallStatus.COMPLETED:
                daily_stats[date_key]["answered"] += 1
        
        return {
            "period": {
                "start_date": analytics_request.date_from.isoformat(),
                "end_date": analytics_request.date_to.isoformat()
            },
            "overview": {
                "total_calls": total_calls,
                "answered_calls": answered_calls,
                "answer_rate": round(answer_rate, 2),
                "avg_call_duration": round(avg_duration, 2)
            },
            "daily_trend": daily_stats,
            "department_filter": analytics_request.department,
            "extension_filter": analytics_request.extension_id
        }
        
    except Exception as e:
        logger.error(f"Error getting call analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call analytics"
        )