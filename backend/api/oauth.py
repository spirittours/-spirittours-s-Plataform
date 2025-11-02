"""
OAuth API Routes

FastAPI endpoints for social authentication (Google, Facebook).
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..auth.oauth import OAuthService
from ..database import get_db


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth/oauth", tags=["oauth"])


# Initialize OAuth service
oauth_service = OAuthService()


@router.get("/google/login")
async def google_login():
    """
    Initiate Google OAuth login.
    
    Redirects user to Google's OAuth consent screen.
    
    **Flow:**
    1. User clicks "Login with Google"
    2. Redirected to this endpoint
    3. Redirected to Google OAuth
    4. User grants permission
    5. Redirected back to callback
    """
    try:
        result = oauth_service.google.get_authorization_url()
        
        return {
            'authorization_url': result['authorization_url'],
            'state': result['state']
        }
        
    except Exception as e:
        logger.error(f"Error initiating Google login: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/google/callback")
async def google_callback(
    code: str = Query(..., description="Authorization code"),
    state: str = Query(..., description="State token"),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Google OAuth callback handler.
    
    Handles the redirect from Google after user authorization.
    """
    try:
        # Check for errors
        if error:
            logger.warning(f"Google OAuth error: {error}")
            return RedirectResponse(
                url=f"{oauth_service.config.FRONTEND_URL}/login?error={error}"
            )
        
        # Authenticate with Google
        result = await oauth_service.authenticate('google', code, state)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # TODO: Create or update user in database
        # user = get_or_create_user(db, result['user_data'])
        
        # Redirect to frontend with tokens
        tokens = result['tokens']
        redirect_url = (
            f"{oauth_service.config.FRONTEND_URL}/oauth/success"
            f"?access_token={tokens['access_token']}"
            f"&refresh_token={tokens['refresh_token']}"
        )
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        logger.error(f"Error in Google callback: {str(e)}")
        return RedirectResponse(
            url=f"{oauth_service.config.FRONTEND_URL}/login?error=authentication_failed"
        )


@router.get("/facebook/login")
async def facebook_login():
    """
    Initiate Facebook OAuth login.
    
    Redirects user to Facebook's OAuth consent screen.
    """
    try:
        result = oauth_service.facebook.get_authorization_url()
        
        return {
            'authorization_url': result['authorization_url'],
            'state': result['state']
        }
        
    except Exception as e:
        logger.error(f"Error initiating Facebook login: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/facebook/callback")
async def facebook_callback(
    code: str = Query(..., description="Authorization code"),
    state: str = Query(..., description="State token"),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Facebook OAuth callback handler.
    
    Handles the redirect from Facebook after user authorization.
    """
    try:
        # Check for errors
        if error:
            logger.warning(f"Facebook OAuth error: {error}")
            return RedirectResponse(
                url=f"{oauth_service.config.FRONTEND_URL}/login?error={error}"
            )
        
        # Authenticate with Facebook
        result = await oauth_service.authenticate('facebook', code, state)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # TODO: Create or update user in database
        
        # Redirect to frontend with tokens
        tokens = result['tokens']
        redirect_url = (
            f"{oauth_service.config.FRONTEND_URL}/oauth/success"
            f"?access_token={tokens['access_token']}"
            f"&refresh_token={tokens['refresh_token']}"
        )
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        logger.error(f"Error in Facebook callback: {str(e)}")
        return RedirectResponse(
            url=f"{oauth_service.config.FRONTEND_URL}/login?error=authentication_failed"
        )


@router.post("/refresh")
async def refresh_token(
    refresh_token: str
):
    """
    Refresh JWT access token.
    
    **Request Body:**
    ```json
    {
      "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
    }
    ```
    
    **Response:**
    ```json
    {
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "token_type": "Bearer",
      "expires_in": 86400
    }
    ```
    """
    try:
        new_tokens = oauth_service.refresh_jwt_token(refresh_token)
        
        if not new_tokens:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        return new_tokens
        
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/link/{provider}")
async def link_social_account(
    provider: str,
    code: str,
    state: str,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Link social account to existing user.
    
    Allows users to connect their Google/Facebook account
    to their existing Spirit Tours account.
    
    **Parameters:**
    - provider: OAuth provider (google, facebook)
    - code: Authorization code
    - state: State token
    - user_id: Existing user ID
    """
    try:
        # Authenticate with provider
        result = await oauth_service.authenticate(provider, code, state)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Link account
        success = await oauth_service.link_account(
            user_id,
            provider,
            result['user_data']
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to link account")
        
        return {
            'success': True,
            'message': f'{provider.title()} account linked successfully',
            'provider': provider
        }
        
    except Exception as e:
        logger.error(f"Error linking account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/unlink/{provider}")
async def unlink_social_account(
    provider: str,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Unlink social account from user.
    
    **Warning:** User must have another authentication method
    (password or other OAuth provider) before unlinking.
    """
    try:
        # TODO: Verify user has other auth methods
        
        success = await oauth_service.unlink_account(user_id, provider)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to unlink account")
        
        return {
            'success': True,
            'message': f'{provider.title()} account unlinked successfully'
        }
        
    except Exception as e:
        logger.error(f"Error unlinking account: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_oauth_status():
    """
    Get OAuth providers status.
    
    Returns which OAuth providers are configured and enabled.
    
    **Response:**
    ```json
    {
      "google_enabled": true,
      "facebook_enabled": true,
      "jwt_configured": true
    }
    ```
    """
    try:
        status = oauth_service.get_provider_status()
        return status
        
    except Exception as e:
        logger.error(f"Error getting OAuth status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def oauth_health_check():
    """
    Check OAuth service health.
    
    Returns status of OAuth configuration and services.
    """
    try:
        status = oauth_service.get_provider_status()
        
        return {
            'status': 'healthy',
            'providers': status,
            'timestamp': '2025-11-02T14:00:00Z'
        }
        
    except Exception as e:
        logger.error(f"OAuth health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'error': str(e)
        }
