"""
Social Media Credentials Management API
Admin-only endpoints for managing social media platform credentials
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime

from backend.services.social_credentials_service import SocialCredentialsService
from backend.database import get_db
from backend.auth import get_current_admin_user, AdminUser

router = APIRouter(
    prefix="/api/admin/social-media/credentials",
    tags=["Social Media Credentials - Admin Only"]
)


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PlatformCredentialsRequest(BaseModel):
    """Request model for adding/updating platform credentials"""
    
    platform: str = Field(..., description="Platform identifier (facebook, instagram, etc.)")
    
    # Facebook/Instagram fields
    app_id: Optional[str] = Field(None, description="Facebook/Instagram App ID")
    app_secret: Optional[str] = Field(None, description="Facebook/Instagram App Secret")
    page_id: Optional[str] = Field(None, description="Facebook Page ID")
    instagram_business_account_id: Optional[str] = Field(None, description="Instagram Business Account ID")
    
    # Twitter/X fields
    api_key: Optional[str] = Field(None, description="Twitter API Key")
    api_secret: Optional[str] = Field(None, description="Twitter API Secret")
    bearer_token: Optional[str] = Field(None, description="Twitter Bearer Token")
    
    # LinkedIn fields
    client_id: Optional[str] = Field(None, description="LinkedIn Client ID")
    client_secret: Optional[str] = Field(None, description="LinkedIn Client Secret")
    organization_id: Optional[str] = Field(None, description="LinkedIn Organization ID")
    
    # TikTok fields
    client_key: Optional[str] = Field(None, description="TikTok Client Key")
    
    # YouTube fields
    channel_id: Optional[str] = Field(None, description="YouTube Channel ID")
    
    # Common fields
    access_token: Optional[str] = Field(None, description="Access Token")
    access_token_secret: Optional[str] = Field(None, description="Access Token Secret (Twitter)")
    refresh_token: Optional[str] = Field(None, description="Refresh Token")
    
    # Account info
    account_name: Optional[str] = Field(None, description="Account display name")
    account_username: Optional[str] = Field(None, description="Account username")
    
    @validator('platform')
    def validate_platform(cls, v):
        valid_platforms = ['facebook', 'instagram', 'twitter_x', 'linkedin', 'tiktok', 'youtube']
        if v not in valid_platforms:
            raise ValueError(f"Platform must be one of: {', '.join(valid_platforms)}")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "platform": "facebook",
                "app_id": "123456789012345",
                "app_secret": "abc123def456ghi789",
                "access_token": "EAAxxxxxxxxxxxxxxxxxxxxxxxxxx",
                "page_id": "987654321098765"
            }
        }


class PlatformCredentialsResponse(BaseModel):
    """Response model for credential operations"""
    success: bool
    action: Optional[str] = None
    platform: str
    credential_id: Optional[int] = None
    message: str


class PlatformStatusResponse(BaseModel):
    """Response model for platform connection status"""
    platform: str
    platform_display_name: str
    is_active: bool
    is_connected: bool
    connection_status: str
    last_connection_test: Optional[str] = None
    account_name: Optional[str] = None
    account_username: Optional[str] = None
    error_message: Optional[str] = None
    token_expires_at: Optional[str] = None


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    success: bool
    connected: bool
    platform: str
    account_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    tested_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AuditLogEntry(BaseModel):
    """Audit log entry model"""
    id: int
    platform: str
    action: str
    changed_fields: Optional[Dict] = None
    admin_id: Optional[int] = None
    admin_email: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/add", response_model=PlatformCredentialsResponse)
async def add_platform_credentials(
    credentials: PlatformCredentialsRequest,
    request: Request,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    🔐 Add or update credentials for a social media platform
    
    **Admin only** - Requires authentication
    
    All sensitive credentials are encrypted using Fernet encryption before storage.
    
    ### Supported Platforms:
    - **facebook**: Requires app_id, app_secret, access_token, page_id
    - **instagram**: Requires app_id, app_secret, access_token, instagram_business_account_id
    - **twitter_x**: Requires api_key, api_secret, bearer_token
    - **linkedin**: Requires client_id, client_secret
    - **tiktok**: Requires client_key, client_secret, access_token
    - **youtube**: Requires client_id, client_secret, api_key
    
    ### Example Request:
    ```json
    {
        "platform": "facebook",
        "app_id": "123456789012345",
        "app_secret": "abc123def456",
        "access_token": "EAAxxxxxxxxxx",
        "page_id": "987654321098765"
    }
    ```
    
    ### Security:
    - All credentials are encrypted with Fernet
    - Audit trail logged with admin ID, IP address, timestamp
    - Only accessible by admin users
    
    ### Returns:
    Operation result with credential ID and success message
    """
    service = SocialCredentialsService(db)
    
    # Get client IP and user agent for audit
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get('user-agent')
    
    try:
        # Convert Pydantic model to dict, excluding None values
        creds_dict = credentials.dict(exclude_none=True)
        platform = creds_dict.pop('platform')
        
        result = await service.add_platform_credentials(
            platform=platform,
            credentials=creds_dict,
            admin_id=current_admin.id,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save credentials: {str(e)}"
        )


@router.get("/status", response_model=List[PlatformStatusResponse])
async def get_all_platforms_status(
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    📊 Get connection status for all social media platforms
    
    **Admin only** - Requires authentication
    
    Returns status for all 6 supported platforms:
    - Facebook
    - Instagram
    - Twitter/X
    - LinkedIn
    - TikTok
    - YouTube
    
    ### Response Fields:
    - **is_active**: Platform enabled/disabled
    - **is_connected**: Connection test passed
    - **connection_status**: connected | disconnected | error | not_configured
    - **last_connection_test**: Timestamp of last test
    - **account_name**: Connected account name
    - **token_expires_at**: Token expiration date (if applicable)
    
    ### Use Case:
    Display platform cards in admin dashboard with visual status indicators
    """
    service = SocialCredentialsService(db)
    
    try:
        statuses = await service.get_all_platforms_status()
        return statuses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch platform status: {str(e)}"
        )


@router.get("/{platform}", response_model=Dict[str, Any])
async def get_platform_credentials(
    platform: str,
    decrypt: bool = False,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    🔍 Get credentials for a specific platform
    
    **Admin only** - Requires authentication
    
    ### Parameters:
    - **platform**: Platform identifier (facebook, instagram, twitter_x, linkedin, tiktok, youtube)
    - **decrypt**: If true, returns decrypted credentials (default: false)
    
    ### Security:
    By default, credentials are masked (e.g., "••••••••1234").
    Use `decrypt=true` only when needed for API calls.
    
    ### Returns:
    Platform credentials with connection status and account info
    """
    service = SocialCredentialsService(db)
    
    try:
        creds = await service.get_platform_credentials(platform, decrypt=decrypt)
        
        if not creds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Credentials for {platform} not found"
            )
        
        return creds
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch credentials: {str(e)}"
        )


@router.post("/{platform}/test", response_model=ConnectionTestResponse)
async def test_platform_connection(
    platform: str,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    🧪 Test connection to a social media platform
    
    **Admin only** - Requires authentication
    
    Tests the connection using stored credentials and returns:
    - Connection success/failure
    - Account information (if successful)
    - Error details (if failed)
    
    ### How it works:
    1. Retrieves encrypted credentials
    2. Decrypts them
    3. Calls platform API to verify connection
    4. Updates connection status in database
    5. Returns test results
    
    ### Example Success Response:
    ```json
    {
        "success": true,
        "connected": true,
        "platform": "facebook",
        "account_info": {
            "id": "987654321098765",
            "name": "Spirit Tours",
            "username": "spirittours"
        }
    }
    ```
    
    ### Example Error Response:
    ```json
    {
        "success": false,
        "connected": false,
        "platform": "facebook",
        "error": "Invalid OAuth access token"
    }
    ```
    
    ### Use Case:
    - Verify credentials after adding/updating
    - Diagnose connection issues
    - Confirm token validity
    """
    service = SocialCredentialsService(db)
    
    try:
        # Import platform adapter dynamically
        from backend.services.social_media_adapters import get_platform_adapter
        
        adapter = get_platform_adapter(platform)
        result = await service.test_connection(platform, adapter)
        
        return {
            'platform': platform,
            **result
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Connection test failed: {str(e)}"
        )


@router.put("/{platform}/toggle")
async def toggle_platform(
    platform: str,
    is_active: bool,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    🔄 Enable or disable a platform
    
    **Admin only** - Requires authentication
    
    ### Parameters:
    - **platform**: Platform identifier
    - **is_active**: true to enable, false to disable
    
    ### Effect:
    When disabled:
    - Platform won't be used for auto-posting
    - Scheduled posts will be skipped
    - Auto-replies disabled
    - Credentials remain stored (can re-enable anytime)
    
    ### Use Case:
    - Temporarily pause posting to a platform
    - Disable platform during maintenance
    - Quick on/off toggle without deleting credentials
    """
    service = SocialCredentialsService(db)
    
    try:
        result = await service.toggle_platform(
            platform=platform,
            is_active=is_active,
            admin_id=current_admin.id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle platform: {str(e)}"
        )


@router.delete("/{platform}")
async def delete_platform_credentials(
    platform: str,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    🗑️ Delete credentials for a platform
    
    **Admin only** - Requires authentication
    
    ⚠️ **Warning**: This permanently deletes the credentials.
    Consider using toggle (disable) instead if you might need them later.
    
    ### Cascade Effects:
    - Credentials deleted
    - Linked accounts removed
    - Audit trail preserved
    - Scheduled posts remain (but won't be posted)
    
    ### Returns:
    Success message confirming deletion
    """
    service = SocialCredentialsService(db)
    
    try:
        result = await service.delete_platform_credentials(
            platform=platform,
            admin_id=current_admin.id
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete credentials: {str(e)}"
        )


@router.get("/audit/log", response_model=List[AuditLogEntry])
async def get_audit_log(
    platform: Optional[str] = None,
    limit: int = 100,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    📝 Get audit log for credential changes
    
    **Admin only** - Requires authentication
    
    ### Parameters:
    - **platform**: Filter by specific platform (optional)
    - **limit**: Maximum number of records (default: 100, max: 500)
    
    ### Log Entries Include:
    - Action performed (created, updated, deleted, activated, deactivated)
    - Admin who made the change
    - IP address
    - Timestamp
    - Fields changed (but not the values for security)
    
    ### Use Cases:
    - Security auditing
    - Troubleshooting credential issues
    - Compliance reporting
    - Track who changed what and when
    """
    if limit > 500:
        limit = 500
    
    service = SocialCredentialsService(db)
    
    try:
        logs = await service.get_audit_log(platform=platform, limit=limit)
        return logs
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit log: {str(e)}"
        )


@router.get("/expiring/tokens")
async def check_expiring_tokens(
    days: int = 7,
    current_admin: AdminUser = Depends(get_current_admin_user),
    db = Depends(get_db)
):
    """
    ⚠️ Check for tokens expiring soon
    
    **Admin only** - Requires authentication
    
    ### Parameters:
    - **days**: Check for tokens expiring within this many days (default: 7)
    
    ### Returns:
    List of platforms with tokens expiring soon
    
    ### Use Case:
    - Proactive token renewal
    - Email alerts for expiring tokens
    - Prevent service interruptions
    
    ### Example Response:
    ```json
    [
        {
            "platform": "linkedin",
            "platform_display_name": "LinkedIn",
            "token_expires_at": "2025-10-11T10:00:00",
            "days_until_expiry": 7
        }
    ]
    ```
    """
    service = SocialCredentialsService(db)
    
    try:
        expiring = await service.check_expiring_tokens(days_threshold=days)
        return {
            'count': len(expiring),
            'platforms': expiring
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check expiring tokens: {str(e)}"
        )


@router.get("/platforms/config")
async def get_platforms_config(
    current_admin: AdminUser = Depends(get_current_admin_user)
):
    """
    📋 Get configuration for all supported platforms
    
    **Admin only** - Requires authentication
    
    Returns required and optional fields for each platform.
    Useful for dynamically building credential input forms.
    
    ### Response Example:
    ```json
    {
        "facebook": {
            "display_name": "Facebook",
            "required_fields": ["app_id", "app_secret", "access_token", "page_id"],
            "optional_fields": ["page_name"]
        },
        ...
    }
    ```
    
    ### Use Case:
    - Build dynamic forms in frontend
    - Validate user input
    - Show helpful field descriptions
    """
    return SocialCredentialsService.get_all_platforms()


# ============================================================================
# HELPER ENDPOINTS
# ============================================================================

@router.get("/health")
async def credentials_api_health():
    """
    ✅ Health check endpoint
    
    No authentication required.
    Used to verify API is running.
    """
    return {
        'status': 'healthy',
        'service': 'social_media_credentials_api',
        'timestamp': datetime.utcnow().isoformat()
    }
