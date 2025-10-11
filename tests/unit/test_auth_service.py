"""
Unit tests for Authentication Service
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

from backend.services.auth_service import AuthService
from backend.models.user import User

class TestAuthService:
    """Test suite for AuthService"""
    
    @pytest.fixture
    def auth_service(self):
        """Create auth service instance for testing."""
        return AuthService()
    
    @pytest.fixture
    def pwd_context(self):
        """Create password context for testing."""
        return CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def test_password_hashing(self, auth_service, pwd_context):
        """Test password hashing and verification."""
        plain_password = "SecurePassword123!"
        
        # Hash password
        hashed = auth_service.hash_password(plain_password)
        assert hashed != plain_password
        assert hashed.startswith("$2b$")
        
        # Verify correct password
        assert auth_service.verify_password(plain_password, hashed) is True
        
        # Verify incorrect password
        assert auth_service.verify_password("WrongPassword", hashed) is False
    
    def test_create_access_token(self, auth_service):
        """Test JWT access token creation."""
        user_id = "user-123"
        token = auth_service.create_access_token(
            data={"sub": user_id},
            expires_delta=timedelta(hours=1)
        )
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify token
        payload = jwt.decode(token, "test_secret_key", algorithms=["HS256"])
        assert payload["sub"] == user_id
        assert "exp" in payload
        assert "iat" in payload
    
    def test_create_refresh_token(self, auth_service):
        """Test JWT refresh token creation."""
        user_id = "user-123"
        token = auth_service.create_refresh_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        
        # Decode and verify token
        payload = jwt.decode(token, "test_refresh_secret", algorithms=["HS256"])
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"
        assert "exp" in payload
    
    def test_decode_token_valid(self, auth_service):
        """Test decoding valid JWT token."""
        user_id = "user-123"
        token = auth_service.create_access_token(
            data={"sub": user_id, "role": "user"}
        )
        
        decoded = auth_service.decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == user_id
        assert decoded["role"] == "user"
    
    def test_decode_token_expired(self, auth_service):
        """Test decoding expired JWT token."""
        user_id = "user-123"
        # Create token that expires immediately
        token = auth_service.create_access_token(
            data={"sub": user_id},
            expires_delta=timedelta(seconds=-1)
        )
        
        with pytest.raises(jwt.ExpiredSignatureError):
            auth_service.decode_token(token)
    
    def test_decode_token_invalid(self, auth_service):
        """Test decoding invalid JWT token."""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(jwt.InvalidTokenError):
            auth_service.decode_token(invalid_token)
    
    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, auth_service, db_session):
        """Test successful user authentication."""
        # Create test user
        hashed_password = auth_service.hash_password("TestPassword123")
        user = User(
            id="user-456",
            email="test@example.com",
            username="testuser",
            password_hash=hashed_password,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Authenticate user
        authenticated = await auth_service.authenticate_user(
            db_session,
            "test@example.com",
            "TestPassword123"
        )
        
        assert authenticated is not None
        assert authenticated.id == "user-456"
        assert authenticated.email == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, auth_service, db_session, test_user):
        """Test authentication with wrong password."""
        authenticated = await auth_service.authenticate_user(
            db_session,
            test_user.email,
            "WrongPassword"
        )
        
        assert authenticated is None
    
    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, auth_service, db_session):
        """Test authentication with non-existent user."""
        authenticated = await auth_service.authenticate_user(
            db_session,
            "nonexistent@example.com",
            "SomePassword"
        )
        
        assert authenticated is None
    
    @pytest.mark.asyncio
    async def test_authenticate_user_inactive(self, auth_service, db_session):
        """Test authentication with inactive user."""
        # Create inactive user
        hashed_password = auth_service.hash_password("TestPassword123")
        user = User(
            id="inactive-user",
            email="inactive@example.com",
            username="inactiveuser",
            password_hash=hashed_password,
            is_active=False
        )
        db_session.add(user)
        db_session.commit()
        
        authenticated = await auth_service.authenticate_user(
            db_session,
            "inactive@example.com",
            "TestPassword123"
        )
        
        assert authenticated is None
    
    def test_validate_token_permissions(self, auth_service):
        """Test token permission validation."""
        # Create token with admin role
        admin_token = auth_service.create_access_token(
            data={"sub": "admin-123", "role": "admin", "permissions": ["read", "write", "delete"]}
        )
        
        # Validate permissions
        has_permission = auth_service.validate_permission(admin_token, "delete")
        assert has_permission is True
        
        # Create token with user role
        user_token = auth_service.create_access_token(
            data={"sub": "user-123", "role": "user", "permissions": ["read"]}
        )
        
        # Check lacking permission
        has_permission = auth_service.validate_permission(user_token, "delete")
        assert has_permission is False
    
    @pytest.mark.asyncio
    async def test_password_reset_token(self, auth_service, db_session, test_user):
        """Test password reset token generation and validation."""
        # Generate reset token
        reset_token = await auth_service.create_password_reset_token(
            db_session,
            test_user.email
        )
        
        assert reset_token is not None
        assert len(reset_token) > 20
        
        # Validate reset token
        is_valid = await auth_service.validate_reset_token(
            db_session,
            reset_token,
            test_user.email
        )
        
        assert is_valid is True
        
        # Test invalid token
        is_valid = await auth_service.validate_reset_token(
            db_session,
            "invalid_token",
            test_user.email
        )
        
        assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_two_factor_authentication(self, auth_service, db_session, test_user):
        """Test 2FA setup and verification."""
        # Generate 2FA secret
        secret, qr_code = await auth_service.generate_2fa_secret(
            test_user.email
        )
        
        assert secret is not None
        assert len(secret) == 32  # Base32 encoded secret
        assert qr_code is not None
        assert qr_code.startswith("data:image/png")
        
        # Store secret for user
        test_user.two_factor_secret = secret
        db_session.commit()
        
        # Generate valid TOTP code
        import pyotp
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()
        
        # Verify valid code
        is_valid = await auth_service.verify_2fa_code(
            db_session,
            test_user.email,
            valid_code
        )
        
        assert is_valid is True
        
        # Verify invalid code
        is_valid = await auth_service.verify_2fa_code(
            db_session,
            test_user.email,
            "000000"
        )
        
        assert is_valid is False
    
    def test_oauth_token_exchange(self, auth_service):
        """Test OAuth token exchange."""
        # Mock OAuth provider response
        oauth_data = {
            "access_token": "oauth_token_123",
            "email": "oauth@example.com",
            "name": "OAuth User",
            "provider": "google"
        }
        
        # Exchange for internal token
        internal_token = auth_service.exchange_oauth_token(oauth_data)
        
        assert internal_token is not None
        decoded = auth_service.decode_token(internal_token)
        assert decoded["email"] == "oauth@example.com"
        assert decoded["provider"] == "google"
    
    @pytest.mark.asyncio
    async def test_session_management(self, auth_service, db_session, test_user):
        """Test user session management."""
        # Create session
        session_id = await auth_service.create_session(
            db_session,
            test_user.id,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        
        assert session_id is not None
        assert len(session_id) == 36  # UUID format
        
        # Validate session
        is_valid = await auth_service.validate_session(
            db_session,
            session_id
        )
        
        assert is_valid is True
        
        # Revoke session
        await auth_service.revoke_session(db_session, session_id)
        
        # Check revoked session
        is_valid = await auth_service.validate_session(
            db_session,
            session_id
        )
        
        assert is_valid is False
    
    def test_role_based_access_control(self, auth_service):
        """Test RBAC functionality."""
        # Define roles and permissions
        roles = {
            "admin": ["read", "write", "delete", "admin"],
            "manager": ["read", "write", "delete"],
            "user": ["read", "write"],
            "guest": ["read"]
        }
        
        # Test admin access
        admin_token = auth_service.create_access_token(
            data={"sub": "admin-1", "role": "admin"}
        )
        assert auth_service.check_role(admin_token, "admin") is True
        assert auth_service.check_role(admin_token, "user") is False
        
        # Test hierarchical permissions
        manager_token = auth_service.create_access_token(
            data={"sub": "manager-1", "role": "manager"}
        )
        can_delete = auth_service.has_permission(manager_token, "delete", roles)
        assert can_delete is True
        
        can_admin = auth_service.has_permission(manager_token, "admin", roles)
        assert can_admin is False