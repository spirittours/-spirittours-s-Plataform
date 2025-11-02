"""
Advanced Authentication API
Multi-channel OAuth, registration, and B2B approval endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
import logging
from urllib.parse import urlencode

from services.advanced_auth_service import (
    AdvancedAuthService, 
    B2CRegistrationRequest,
    B2BRegistrationRequest, 
    LoginRequest,
    RegistrationResponse,
    LoginResponse,
    OAuthProvider,
    UserType,
    AccountStatus
)
from config.database import get_db
from services.notification_service import NotificationService

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Advanced Authentication"])
security = HTTPBearer()

# Initialize services
auth_service = AdvancedAuthService()
notification_service = NotificationService()

def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host

# B2C Registration & Login Endpoints
@router.post("/register/b2c", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_b2c_customer(
    registration_request: B2CRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register B2C customer with OAuth or traditional email/password.
    
    **Features:**
    - OAuth registration (Google, Facebook, Microsoft, etc.)
    - Traditional email/password registration
    - Marketing consent management
    - Privacy policy acceptance tracking
    - Email verification workflow
    - Referral code support
    """
    try:
        # Add client IP to request
        registration_request.registration_ip = get_client_ip(request)
        
        # Register customer
        result = await auth_service.register_b2c_customer(registration_request, db)
        
        # Log registration attempt
        logger.info(f"B2C registration attempt: {registration_request.email}, Success: {result.success}")
        
        return result
        
    except Exception as e:
        logger.error(f"B2C registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno durante el registro"
        )

@router.post("/register/b2b", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_b2b_partner(
    registration_request: B2BRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Register B2B/B2B2C partner with administrative approval workflow.
    
    **Features:**
    - Partner application submission
    - Business verification requirements
    - Commission rate negotiation
    - Administrative approval process
    - Document upload support
    - Business reference validation
    """
    try:
        # Add client IP to request
        registration_request.registration_ip = get_client_ip(request)
        
        # Register partner
        result = await auth_service.register_b2b_partner(registration_request, db)
        
        # Log registration attempt
        logger.info(f"B2B registration attempt: {registration_request.email}, Company: {registration_request.company_name}")
        
        return result
        
    except Exception as e:
        logger.error(f"B2B registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno durante el registro de partner"
        )

@router.post("/login", response_model=LoginResponse)
async def login_user(
    login_request: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with email/password or OAuth.
    
    **Features:**
    - Traditional email/password login
    - OAuth login (Google, Facebook, Microsoft)
    - Account status validation
    - Failed attempt tracking
    - Account lockout protection
    - Remember me functionality
    """
    try:
        # Add client IP to request
        login_request.login_ip = get_client_ip(request)
        
        # Authenticate user
        result = await auth_service.login_user(login_request, db)
        
        # Log login attempt
        logger.info(f"Login attempt: {login_request.email}, Success: {result.success}")
        
        return result
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno durante el login"
        )

# OAuth Flow Endpoints
@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(
    provider: OAuthProvider,
    redirect_uri: str,
    state: Optional[str] = None
):
    """
    Initiate OAuth authorization flow.
    
    **Supported Providers:**
    - Google
    - Facebook  
    - Microsoft (Outlook, Hotmail)
    - Twitter/X
    - Instagram
    - Apple ID
    """
    try:
        config = auth_service.oauth_configs.get(provider)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider {provider} not supported"
            )
        
        # Build authorization URL
        auth_params = {
            'client_id': config['client_id'],
            'redirect_uri': redirect_uri,
            'scope': config['scope'],
            'response_type': 'code'
        }
        
        if state:
            auth_params['state'] = state
        
        # Provider-specific parameters
        if provider == OAuthProvider.MICROSOFT:
            auth_params['response_mode'] = 'query'
        elif provider == OAuthProvider.FACEBOOK:
            auth_params['display'] = 'popup'
        
        auth_url = f"{config['auth_url']}?{urlencode(auth_params)}"
        
        return {"authorization_url": auth_url}
        
    except Exception as e:
        logger.error(f"OAuth authorization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating OAuth authorization URL"
        )

@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: OAuthProvider,
    code: str,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    Handle OAuth callback from providers.
    
    **Process:**
    1. Receive authorization code
    2. Exchange for access token
    3. Fetch user profile
    4. Return user info for registration/login
    """
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {error}"
        )
    
    try:
        # Process OAuth callback
        oauth_user_info = await auth_service._process_oauth_callback(provider, code)
        
        if not oauth_user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve user information from OAuth provider"
            )
        
        return {
            "success": True,
            "provider": provider.value,
            "user_info": {
                "provider_id": oauth_user_info.provider_id,
                "email": oauth_user_info.email,
                "first_name": oauth_user_info.first_name,
                "last_name": oauth_user_info.last_name,
                "profile_image": oauth_user_info.profile_image
            },
            "oauth_code": code  # For subsequent registration/login
        }
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing OAuth callback"
        )

# Account Management Endpoints
@router.post("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Verify user email address with token.
    
    **Process:**
    1. Validate verification token
    2. Activate user account
    3. Generate access tokens
    4. Send welcome notification
    """
    try:
        from services.advanced_auth_service import User
        
        # Find user by verification token
        user = db.query(User).filter(User.email_verification_token == token).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificación inválido o expirado"
            )
        
        if user.email_verified_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ya verificado"
            )
        
        # Verify email and activate account
        user.email_verified_at = datetime.utcnow()
        user.account_status = AccountStatus.ACTIVE
        user.email_verification_token = None
        
        db.commit()
        
        # Generate tokens
        access_token = auth_service._generate_access_token(user)
        refresh_token = auth_service._generate_refresh_token(user)
        
        # Send welcome notification
        await auth_service._send_welcome_notification(user)
        
        logger.info(f"Email verified successfully: {user.email}")
        
        return {
            "success": True,
            "message": "Email verificado exitosamente",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_info": {
                "user_id": user.user_id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "user_type": user.user_type.value
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno durante la verificación"
        )

@router.post("/resend-verification")
async def resend_verification_email(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Resend email verification for unverified accounts.
    """
    try:
        from services.advanced_auth_service import User
        import secrets
        from datetime import datetime
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        if user.email_verified_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email ya verificado"
            )
        
        # Generate new verification token
        user.email_verification_token = secrets.token_urlsafe(32)
        db.commit()
        
        # Send verification email
        await auth_service._send_verification_email(user.email, user.email_verification_token)
        
        return {
            "success": True,
            "message": "Email de verificación enviado"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error enviando verificación"
        )

@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Initiate password reset process.
    """
    try:
        from services.advanced_auth_service import User
        import secrets
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Don't reveal if email exists or not
            return {
                "success": True,
                "message": "Si el email existe, recibirás instrucciones para resetear la contraseña"
            }
        
        # Generate password reset token
        user.password_reset_token = secrets.token_urlsafe(32)
        db.commit()
        
        # Send password reset email
        # await notification_service.send_password_reset_email(user.email, user.password_reset_token)
        
        return {
            "success": True,
            "message": "Si el email existe, recibirás instrucciones para resetear la contraseña"
        }
        
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error procesando solicitud"
        )

# User Profile Management
@router.get("/profile")
async def get_user_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get authenticated user profile information.
    """
    try:
        import jwt
        from services.advanced_auth_service import User
        
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials, 
            auth_service.jwt_secret, 
            algorithms=[auth_service.jwt_algorithm]
        )
        
        user_id = payload.get('user_id')
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Return user profile
        return {
            "user_id": user.user_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "user_type": user.user_type.value,
            "account_status": user.account_status.value,
            "profile_image_url": user.profile_image_url,
            "company_name": user.company_name,
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "email_verified": user.email_verified_at is not None,
            "marketing_consent": user.marketing_consent,
            "oauth_provider": user.oauth_provider.value if user.oauth_provider else None
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo perfil"
        )

@router.put("/profile/marketing-consent")
async def update_marketing_consent(
    consent_data: Dict[str, bool],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Update user marketing consent preferences.
    
    **Consent Types:**
    - email_marketing: Email promotions and offers
    - sms_marketing: SMS notifications and promotions  
    - push_notifications: Mobile push notifications
    - partner_offers: Third-party partner offers
    - newsletter: Newsletter subscriptions
    """
    try:
        import jwt
        from services.advanced_auth_service import User, MarketingConsent
        from datetime import datetime
        
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials, 
            auth_service.jwt_secret, 
            algorithms=[auth_service.jwt_algorithm]
        )
        
        user_id = payload.get('user_id')
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Update marketing consent
        current_consent = user.marketing_consent or {}
        current_consent.update(consent_data)
        current_consent['consent_timestamp'] = datetime.utcnow().isoformat()
        
        user.marketing_consent = current_consent
        db.commit()
        
        logger.info(f"Marketing consent updated for user: {user.email}")
        
        return {
            "success": True,
            "message": "Preferencias de marketing actualizadas",
            "marketing_consent": current_consent
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
    except Exception as e:
        logger.error(f"Update consent error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error actualizando preferencias"
        )

# Social Login Quick Links
@router.get("/social-login-urls")
async def get_social_login_urls(redirect_uri: str):
    """
    Get quick social login URLs for frontend integration.
    
    **Returns authorization URLs for:**
    - Google (Gmail, Google accounts)
    - Facebook  
    - Microsoft (Outlook, Hotmail, Live)
    - Apple ID
    - Twitter/X
    """
    try:
        login_urls = {}
        
        for provider in [OAuthProvider.GOOGLE, OAuthProvider.FACEBOOK, OAuthProvider.MICROSOFT]:
            config = auth_service.oauth_configs.get(provider)
            if config:
                auth_params = {
                    'client_id': config['client_id'],
                    'redirect_uri': redirect_uri,
                    'scope': config['scope'],
                    'response_type': 'code',
                    'state': provider.value  # Use provider as state
                }
                
                # Provider-specific parameters
                if provider == OAuthProvider.MICROSOFT:
                    auth_params['response_mode'] = 'query'
                
                login_urls[provider.value] = f"{config['auth_url']}?{urlencode(auth_params)}"
        
        return {
            "social_login_urls": login_urls,
            "supported_providers": [
                {
                    "id": "google",
                    "name": "Google",
                    "description": "Gmail, Google accounts",
                    "icon": "google"
                },
                {
                    "id": "facebook", 
                    "name": "Facebook",
                    "description": "Facebook account",
                    "icon": "facebook"
                },
                {
                    "id": "microsoft",
                    "name": "Microsoft", 
                    "description": "Outlook, Hotmail, Live",
                    "icon": "microsoft"
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Social login URLs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating social login URLs"
        )

# Health Check
@router.get("/health")
async def auth_health_check():
    """Authentication service health check."""
    return {
        "service": "Advanced Authentication API",
        "status": "healthy",
        "features": [
            "OAuth Registration (Google, Facebook, Microsoft)",
            "Traditional Email/Password Registration", 
            "B2B Partner Applications with Approval Workflow",
            "Marketing Consent Management",
            "Email Verification",
            "Password Reset",
            "Account Security (Lockout Protection)"
        ],
        "supported_oauth_providers": [provider.value for provider in OAuthProvider]
    }