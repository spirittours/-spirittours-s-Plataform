"""
Advanced Authentication & Registration Service
Multi-channel OAuth, traditional registration, and B2B approval workflows
"""

import asyncio
import logging
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any
from enum import Enum
from dataclasses import dataclass, field
from decimal import Decimal
import uuid
import json
import re
from urllib.parse import urlencode

import aiohttp
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Enum as SQLEnum, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session

# Configure logging
logger = logging.getLogger(__name__)

Base = declarative_base()

class UserType(str, Enum):
    """Types of users in the system."""
    B2C_CUSTOMER = "b2c_customer"
    B2B_AGENT = "b2b_agent"
    B2B2C_RESELLER = "b2b2c_reseller"
    ADMIN = "admin"

class AccountStatus(str, Enum):
    """Account status for approval workflows."""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"
    INCOMPLETE = "incomplete"

class OAuthProvider(str, Enum):
    """Supported OAuth providers."""
    GOOGLE = "google"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    APPLE = "apple"
    MICROSOFT = "microsoft"
    LINKEDIN = "linkedin"

class RegistrationSource(str, Enum):
    """Registration sources tracking."""
    DIRECT = "direct"
    OAUTH = "oauth"
    INVITATION = "invitation"
    REFERRAL = "referral"

@dataclass
class MarketingConsent:
    """Marketing consent preferences."""
    email_marketing: bool = False
    sms_marketing: bool = False
    push_notifications: bool = True
    partner_offers: bool = False
    newsletter: bool = False
    consent_timestamp: datetime = field(default_factory=datetime.now)
    consent_ip: Optional[str] = None
    opt_out_timestamp: Optional[datetime] = None

@dataclass
class PrivacyConsent:
    """Privacy policy consent tracking."""
    privacy_policy_accepted: bool = False
    terms_of_service_accepted: bool = False
    cookie_consent: bool = False
    data_processing_consent: bool = False
    consent_timestamp: datetime = field(default_factory=datetime.now)
    consent_version: str = "1.0"
    consent_ip: Optional[str] = None

# Database Models
class User(Base):
    """Enhanced user model with OAuth and consent tracking."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)  # Null for OAuth-only users
    
    # Personal Information
    first_name = Column(String)
    last_name = Column(String)
    phone = Column(String, nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    profile_image_url = Column(String, nullable=True)
    
    # Account Management
    user_type = Column(SQLEnum(UserType))
    account_status = Column(SQLEnum(AccountStatus), default=AccountStatus.PENDING)
    registration_source = Column(SQLEnum(RegistrationSource))
    
    # OAuth Information
    oauth_provider = Column(SQLEnum(OAuthProvider), nullable=True)
    oauth_provider_id = Column(String, nullable=True)
    oauth_access_token = Column(Text, nullable=True)
    oauth_refresh_token = Column(Text, nullable=True)
    oauth_profile_data = Column(JSON, nullable=True)
    
    # Consent & Preferences
    marketing_consent = Column(JSON, nullable=True)
    privacy_consent = Column(JSON, nullable=True)
    
    # B2B Specific Fields
    company_name = Column(String, nullable=True)
    company_registration = Column(String, nullable=True)
    business_license = Column(String, nullable=True)
    commission_rate = Column(Numeric(5, 4), nullable=True)
    partner_tier = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    phone_verified_at = Column(DateTime, nullable=True)
    
    # Security
    email_verification_token = Column(String, nullable=True)
    password_reset_token = Column(String, nullable=True)
    two_factor_secret = Column(String, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

class PartnerApplication(Base):
    """Partner applications for B2B/B2B2C approval."""
    __tablename__ = "partner_applications"
    
    id = Column(Integer, primary_key=True)
    application_id = Column(String, unique=True, index=True)
    user_id = Column(String, index=True)
    
    # Application Details
    company_name = Column(String)
    business_type = Column(String)  # travel_agency, tour_operator, reseller, etc.
    company_registration_number = Column(String)
    tax_id = Column(String)
    business_address = Column(Text)
    website_url = Column(String, nullable=True)
    
    # Contact Information
    contact_person = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    
    # Business Information
    years_in_business = Column(Integer)
    annual_booking_volume = Column(String)  # Expected volume range
    target_markets = Column(JSON)  # Geographic markets
    specializations = Column(JSON)  # Travel specializations
    
    # Documents
    business_license_url = Column(String, nullable=True)
    insurance_certificate_url = Column(String, nullable=True)
    references = Column(JSON, nullable=True)
    
    # Commission & Partnership
    requested_commission_rate = Column(Numeric(5, 4))
    partnership_type = Column(String)  # B2B or B2B2C
    integration_requirements = Column(JSON, nullable=True)
    
    # Application Status
    status = Column(SQLEnum(AccountStatus), default=AccountStatus.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    approved_commission_rate = Column(Numeric(5, 4), nullable=True)

# Pydantic Models
class OAuthUserInfo(BaseModel):
    """OAuth user information from providers."""
    provider_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    profile_image: Optional[str] = None
    provider_data: Dict[str, Any] = {}

class B2CRegistrationRequest(BaseModel):
    """B2C customer registration request."""
    email: EmailStr
    password: Optional[str] = None  # Optional for OAuth registration
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    
    # OAuth Information
    oauth_provider: Optional[OAuthProvider] = None
    oauth_code: Optional[str] = None  # Authorization code from OAuth flow
    
    # Consent Management
    privacy_policy_accepted: bool = Field(..., description="Must accept privacy policy")
    terms_of_service_accepted: bool = Field(..., description="Must accept terms of service")
    marketing_consent: Dict[str, bool] = Field(default={
        'email_marketing': False,
        'sms_marketing': False,
        'push_notifications': True,
        'newsletter': False
    })
    
    # Registration Context
    referral_code: Optional[str] = None
    utm_source: Optional[str] = None
    registration_ip: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if v is not None:
            if len(v) < 8:
                raise ValueError('Password must be at least 8 characters long')
            if not re.search(r'[A-Z]', v):
                raise ValueError('Password must contain at least one uppercase letter')
            if not re.search(r'[a-z]', v):
                raise ValueError('Password must contain at least one lowercase letter')
            if not re.search(r'\d', v):
                raise ValueError('Password must contain at least one digit')
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Basic international phone validation
            if not re.match(r'^\+[1-9]\d{1,14}$', v):
                raise ValueError('Phone must be in international format (+1234567890)')
        return v

class B2BRegistrationRequest(BaseModel):
    """B2B/B2B2C partner registration request."""
    # Personal Information
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., description="Contact phone number")
    
    # Company Information
    company_name: str = Field(..., min_length=2, max_length=100)
    business_type: str = Field(..., description="travel_agency, tour_operator, reseller, etc.")
    company_registration_number: str
    tax_id: Optional[str] = None
    business_address: str
    website_url: Optional[str] = None
    
    # Business Details
    years_in_business: int = Field(..., ge=0, le=100)
    annual_booking_volume: str = Field(..., description="Expected volume range")
    target_markets: List[str] = Field(..., min_items=1)
    specializations: List[str] = Field(..., min_items=1)
    
    # Partnership Details
    partnership_type: str = Field(..., description="B2B or B2B2C")
    requested_commission_rate: float = Field(..., ge=0.01, le=0.30, description="0.01-0.30 (1%-30%)")
    integration_requirements: Optional[Dict[str, Any]] = None
    
    # References
    business_references: Optional[List[Dict[str, str]]] = None
    
    # Consent
    privacy_policy_accepted: bool = True
    terms_of_service_accepted: bool = True
    marketing_consent: Dict[str, bool] = Field(default={
        'email_marketing': True,
        'partner_updates': True,
        'training_materials': True
    })
    
    # Registration Context
    registration_ip: Optional[str] = None

class RegistrationResponse(BaseModel):
    """Registration response model."""
    success: bool
    user_id: Optional[str] = None
    message: str
    requires_verification: bool = False
    requires_approval: bool = False
    verification_method: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_type: Optional[UserType] = None
    account_status: Optional[AccountStatus] = None
    
class LoginRequest(BaseModel):
    """Login request model."""
    email: EmailStr
    password: Optional[str] = None
    oauth_provider: Optional[OAuthProvider] = None
    oauth_code: Optional[str] = None
    remember_me: bool = False
    login_ip: Optional[str] = None

class LoginResponse(BaseModel):
    """Login response model."""
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_info: Optional[Dict[str, Any]] = None
    requires_2fa: bool = False
    account_status: Optional[AccountStatus] = None

class AdvancedAuthService:
    """Advanced authentication and registration service."""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.jwt_secret = "your-super-secret-jwt-key"  # Should be from environment
        self.jwt_algorithm = "HS256"
        self.jwt_expiration = timedelta(hours=24)
        
        # OAuth configurations
        self.oauth_configs = {
            OAuthProvider.GOOGLE: {
                'client_id': 'your-google-client-id',
                'client_secret': 'your-google-client-secret',
                'auth_url': 'https://accounts.google.com/o/oauth2/auth',
                'token_url': 'https://oauth2.googleapis.com/token',
                'userinfo_url': 'https://www.googleapis.com/oauth2/v2/userinfo',
                'scope': 'openid email profile'
            },
            OAuthProvider.FACEBOOK: {
                'client_id': 'your-facebook-app-id',
                'client_secret': 'your-facebook-app-secret',
                'auth_url': 'https://www.facebook.com/v18.0/dialog/oauth',
                'token_url': 'https://graph.facebook.com/v18.0/oauth/access_token',
                'userinfo_url': 'https://graph.facebook.com/v18.0/me',
                'scope': 'email,public_profile'
            },
            OAuthProvider.MICROSOFT: {
                'client_id': 'your-microsoft-client-id',
                'client_secret': 'your-microsoft-client-secret',
                'auth_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
                'token_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                'userinfo_url': 'https://graph.microsoft.com/v1.0/me',
                'scope': 'openid email profile User.Read'
            }
        }
    
    async def register_b2c_customer(self, request: B2CRegistrationRequest, db: Session) -> RegistrationResponse:
        """Register B2C customer with OAuth or traditional registration."""
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == request.email).first()
            if existing_user:
                return RegistrationResponse(
                    success=False,
                    message="Un usuario con este email ya existe"
                )
            
            user_id = str(uuid.uuid4())
            
            # Handle OAuth registration
            if request.oauth_provider and request.oauth_code:
                oauth_user_info = await self._process_oauth_callback(
                    request.oauth_provider,
                    request.oauth_code
                )
                
                if not oauth_user_info:
                    return RegistrationResponse(
                        success=False,
                        message="Error en la autenticación con redes sociales"
                    )
                
                # Create user with OAuth information
                user = User(
                    user_id=user_id,
                    email=request.email,
                    first_name=oauth_user_info.first_name or request.first_name,
                    last_name=oauth_user_info.last_name or request.last_name,
                    user_type=UserType.B2C_CUSTOMER,
                    account_status=AccountStatus.ACTIVE,  # OAuth users are immediately active
                    registration_source=RegistrationSource.OAUTH,
                    oauth_provider=request.oauth_provider,
                    oauth_provider_id=oauth_user_info.provider_id,
                    oauth_profile_data=oauth_user_info.provider_data,
                    profile_image_url=oauth_user_info.profile_image,
                    email_verified_at=datetime.utcnow()  # OAuth emails are pre-verified
                )
                
                requires_verification = False
                
            else:
                # Traditional email/password registration
                if not request.password:
                    return RegistrationResponse(
                        success=False,
                        message="Password is required for traditional registration"
                    )
                
                password_hash = self.pwd_context.hash(request.password)
                email_verification_token = secrets.token_urlsafe(32)
                
                user = User(
                    user_id=user_id,
                    email=request.email,
                    password_hash=password_hash,
                    first_name=request.first_name,
                    last_name=request.last_name,
                    phone=request.phone,
                    date_of_birth=request.date_of_birth,
                    user_type=UserType.B2C_CUSTOMER,
                    account_status=AccountStatus.PENDING,  # Requires email verification
                    registration_source=RegistrationSource.DIRECT,
                    email_verification_token=email_verification_token
                )
                
                requires_verification = True
            
            # Set consent information
            privacy_consent = PrivacyConsent(
                privacy_policy_accepted=request.privacy_policy_accepted,
                terms_of_service_accepted=request.terms_of_service_accepted,
                consent_ip=request.registration_ip
            )
            
            marketing_consent = MarketingConsent(
                email_marketing=request.marketing_consent.get('email_marketing', False),
                sms_marketing=request.marketing_consent.get('sms_marketing', False),
                push_notifications=request.marketing_consent.get('push_notifications', True),
                newsletter=request.marketing_consent.get('newsletter', False),
                consent_ip=request.registration_ip
            )
            
            user.privacy_consent = privacy_consent.__dict__
            user.marketing_consent = marketing_consent.__dict__
            
            # Save user to database
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Send verification email if needed
            if requires_verification:
                await self._send_verification_email(user.email, user.email_verification_token)
            
            # Generate tokens for OAuth users
            access_token = None
            refresh_token = None
            if not requires_verification:
                access_token = self._generate_access_token(user)
                refresh_token = self._generate_refresh_token(user)
            
            # Send welcome notification
            await self._send_welcome_notification(user)
            
            return RegistrationResponse(
                success=True,
                user_id=user_id,
                message="Registro exitoso" if not requires_verification else "Registro exitoso. Verifica tu email para activar tu cuenta.",
                requires_verification=requires_verification,
                verification_method="email" if requires_verification else None,
                access_token=access_token,
                refresh_token=refresh_token,
                user_type=UserType.B2C_CUSTOMER,
                account_status=user.account_status
            )
            
        except Exception as e:
            logger.error(f"B2C registration error: {e}")
            db.rollback()
            return RegistrationResponse(
                success=False,
                message="Error interno del servidor durante el registro"
            )
    
    async def register_b2b_partner(self, request: B2BRegistrationRequest, db: Session) -> RegistrationResponse:
        """Register B2B/B2B2C partner with approval workflow."""
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == request.email).first()
            if existing_user:
                return RegistrationResponse(
                    success=False,
                    message="Ya existe una cuenta con este email"
                )
            
            # Check if company is already registered
            existing_company = db.query(PartnerApplication).filter(
                PartnerApplication.company_registration_number == request.company_registration_number
            ).first()
            if existing_company:
                return RegistrationResponse(
                    success=False,
                    message="Esta empresa ya tiene una aplicación registrada"
                )
            
            user_id = str(uuid.uuid4())
            application_id = str(uuid.uuid4())
            
            # Determine user type based on partnership type
            user_type = UserType.B2B_AGENT if request.partnership_type == "B2B" else UserType.B2B2C_RESELLER
            
            # Create user account (pending approval)
            user = User(
                user_id=user_id,
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name,
                phone=request.phone,
                user_type=user_type,
                account_status=AccountStatus.PENDING,
                registration_source=RegistrationSource.DIRECT,
                company_name=request.company_name
            )
            
            # Set consent information
            privacy_consent = PrivacyConsent(
                privacy_policy_accepted=request.privacy_policy_accepted,
                terms_of_service_accepted=request.terms_of_service_accepted,
                consent_ip=request.registration_ip
            )
            
            marketing_consent = MarketingConsent(
                email_marketing=request.marketing_consent.get('email_marketing', True),
                partner_offers=True,
                consent_ip=request.registration_ip
            )
            
            user.privacy_consent = privacy_consent.__dict__
            user.marketing_consent = marketing_consent.__dict__
            
            # Create partner application
            application = PartnerApplication(
                application_id=application_id,
                user_id=user_id,
                company_name=request.company_name,
                business_type=request.business_type,
                company_registration_number=request.company_registration_number,
                tax_id=request.tax_id,
                business_address=request.business_address,
                website_url=request.website_url,
                contact_person=f"{request.first_name} {request.last_name}",
                contact_email=request.email,
                contact_phone=request.phone,
                years_in_business=request.years_in_business,
                annual_booking_volume=request.annual_booking_volume,
                target_markets=request.target_markets,
                specializations=request.specializations,
                requested_commission_rate=request.requested_commission_rate,
                partnership_type=request.partnership_type,
                integration_requirements=request.integration_requirements,
                references=request.business_references
            )
            
            # Save to database
            db.add(user)
            db.add(application)
            db.commit()
            db.refresh(user)
            db.refresh(application)
            
            # Send application confirmation email
            await self._send_application_confirmation_email(user.email, application_id)
            
            # Notify administrators
            await self._notify_admins_new_application(application)
            
            return RegistrationResponse(
                success=True,
                user_id=user_id,
                message="Solicitud de partner enviada exitosamente. Recibirás una notificación cuando sea revisada.",
                requires_approval=True,
                user_type=user_type,
                account_status=AccountStatus.PENDING
            )
            
        except Exception as e:
            logger.error(f"B2B registration error: {e}")
            db.rollback()
            return RegistrationResponse(
                success=False,
                message="Error interno durante el registro de partner"
            )
    
    async def login_user(self, request: LoginRequest, db: Session) -> LoginResponse:
        """Authenticate user with email/password or OAuth."""
        try:
            # Handle OAuth login
            if request.oauth_provider and request.oauth_code:
                return await self._oauth_login(request, db)
            
            # Traditional email/password login
            user = db.query(User).filter(User.email == request.email).first()
            
            if not user:
                return LoginResponse(
                    success=False,
                    message="Email o contraseña incorrectos"
                )
            
            # Check account status
            if user.account_status == AccountStatus.PENDING:
                if user.user_type == UserType.B2C_CUSTOMER:
                    return LoginResponse(
                        success=False,
                        message="Cuenta pendiente de verificación. Revisa tu email."
                    )
                else:
                    return LoginResponse(
                        success=False,
                        message="Cuenta pendiente de aprobación administrativa."
                    )
            
            if user.account_status == AccountStatus.SUSPENDED:
                return LoginResponse(
                    success=False,
                    message="Cuenta suspendida. Contacta con soporte."
                )
            
            if user.account_status == AccountStatus.REJECTED:
                return LoginResponse(
                    success=False,
                    message="Solicitud de cuenta rechazada."
                )
            
            # Check account lockout
            if user.locked_until and user.locked_until > datetime.utcnow():
                return LoginResponse(
                    success=False,
                    message="Cuenta temporalmente bloqueada por intentos fallidos."
                )
            
            # Verify password
            if not user.password_hash or not self.pwd_context.verify(request.password, user.password_hash):
                # Increment failed attempts
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                db.commit()
                
                return LoginResponse(
                    success=False,
                    message="Email o contraseña incorrectos"
                )
            
            # Successful login
            user.last_login = datetime.utcnow()
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()
            
            # Generate tokens
            access_token = self._generate_access_token(user)
            refresh_token = self._generate_refresh_token(user) if request.remember_me else None
            
            # Prepare user info
            user_info = {
                'user_id': user.user_id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type.value,
                'account_status': user.account_status.value,
                'profile_image_url': user.profile_image_url
            }
            
            return LoginResponse(
                success=True,
                message="Login exitoso",
                access_token=access_token,
                refresh_token=refresh_token,
                user_info=user_info,
                account_status=user.account_status
            )
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            return LoginResponse(
                success=False,
                message="Error interno durante el login"
            )
    
    async def _process_oauth_callback(self, provider: OAuthProvider, auth_code: str) -> Optional[OAuthUserInfo]:
        """Process OAuth callback and get user information."""
        try:
            config = self.oauth_configs.get(provider)
            if not config:
                logger.error(f"OAuth provider {provider} not configured")
                return None
            
            # Exchange authorization code for access token
            async with aiohttp.ClientSession() as session:
                token_data = {
                    'client_id': config['client_id'],
                    'client_secret': config['client_secret'],
                    'code': auth_code,
                    'grant_type': 'authorization_code'
                }
                
                async with session.post(config['token_url'], data=token_data) as response:
                    if response.status != 200:
                        logger.error(f"OAuth token exchange failed: {response.status}")
                        return None
                    
                    token_response = await response.json()
                    access_token = token_response.get('access_token')
                    
                    if not access_token:
                        logger.error("No access token received from OAuth provider")
                        return None
                
                # Get user information
                headers = {'Authorization': f'Bearer {access_token}'}
                userinfo_url = config['userinfo_url']
                
                if provider == OAuthProvider.FACEBOOK:
                    userinfo_url += '?fields=id,email,first_name,last_name,picture'
                
                async with session.get(userinfo_url, headers=headers) as response:
                    if response.status != 200:
                        logger.error(f"OAuth userinfo request failed: {response.status}")
                        return None
                    
                    user_data = await response.json()
                    
                    # Extract user information based on provider
                    if provider == OAuthProvider.GOOGLE:
                        return OAuthUserInfo(
                            provider_id=user_data['id'],
                            email=user_data['email'],
                            first_name=user_data.get('given_name'),
                            last_name=user_data.get('family_name'),
                            profile_image=user_data.get('picture'),
                            provider_data=user_data
                        )
                    elif provider == OAuthProvider.FACEBOOK:
                        return OAuthUserInfo(
                            provider_id=user_data['id'],
                            email=user_data.get('email'),
                            first_name=user_data.get('first_name'),
                            last_name=user_data.get('last_name'),
                            profile_image=user_data.get('picture', {}).get('data', {}).get('url'),
                            provider_data=user_data
                        )
                    elif provider == OAuthProvider.MICROSOFT:
                        return OAuthUserInfo(
                            provider_id=user_data['id'],
                            email=user_data.get('mail') or user_data.get('userPrincipalName'),
                            first_name=user_data.get('givenName'),
                            last_name=user_data.get('surname'),
                            profile_image=None,  # Would need additional API call
                            provider_data=user_data
                        )
            
        except Exception as e:
            logger.error(f"OAuth processing error: {e}")
            return None
    
    async def _oauth_login(self, request: LoginRequest, db: Session) -> LoginResponse:
        """Handle OAuth login flow."""
        try:
            oauth_user_info = await self._process_oauth_callback(
                request.oauth_provider,
                request.oauth_code
            )
            
            if not oauth_user_info:
                return LoginResponse(
                    success=False,
                    message="Error en la autenticación OAuth"
                )
            
            # Find existing user by OAuth provider ID or email
            user = db.query(User).filter(
                (User.oauth_provider == request.oauth_provider) & 
                (User.oauth_provider_id == oauth_user_info.provider_id) |
                (User.email == oauth_user_info.email)
            ).first()
            
            if not user:
                return LoginResponse(
                    success=False,
                    message="No se encontró cuenta asociada. Por favor regístrate primero."
                )
            
            # Update OAuth information if needed
            if not user.oauth_provider_id:
                user.oauth_provider = request.oauth_provider
                user.oauth_provider_id = oauth_user_info.provider_id
                user.oauth_profile_data = oauth_user_info.provider_data
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            
            # Generate tokens
            access_token = self._generate_access_token(user)
            refresh_token = self._generate_refresh_token(user) if request.remember_me else None
            
            # Prepare user info
            user_info = {
                'user_id': user.user_id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type.value,
                'account_status': user.account_status.value,
                'profile_image_url': user.profile_image_url
            }
            
            return LoginResponse(
                success=True,
                message="Login OAuth exitoso",
                access_token=access_token,
                refresh_token=refresh_token,
                user_info=user_info,
                account_status=user.account_status
            )
            
        except Exception as e:
            logger.error(f"OAuth login error: {e}")
            return LoginResponse(
                success=False,
                message="Error interno durante el login OAuth"
            )
    
    def _generate_access_token(self, user: User) -> str:
        """Generate JWT access token."""
        payload = {
            'user_id': user.user_id,
            'email': user.email,
            'user_type': user.user_type.value,
            'exp': datetime.utcnow() + self.jwt_expiration,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _generate_refresh_token(self, user: User) -> str:
        """Generate JWT refresh token."""
        payload = {
            'user_id': user.user_id,
            'type': 'refresh',
            'exp': datetime.utcnow() + timedelta(days=30),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    async def _send_verification_email(self, email: str, token: str):
        """Send email verification."""
        # Integration with notification service
        # This would send an email with verification link
        pass
    
    async def _send_welcome_notification(self, user: User):
        """Send welcome notification to new user."""
        # Integration with notification service
        # Welcome email/SMS based on user preferences
        pass
    
    async def _send_application_confirmation_email(self, email: str, application_id: str):
        """Send partner application confirmation email."""
        # Confirmation email for B2B applications
        pass
    
    async def _notify_admins_new_application(self, application: PartnerApplication):
        """Notify administrators of new partner application."""
        # Send notifications to admin users
        pass