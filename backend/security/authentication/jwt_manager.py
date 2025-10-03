#!/usr/bin/env python3
"""
Advanced JWT Authentication Manager for Spirit Tours
Implements secure JWT token management with refresh tokens, blacklisting, and advanced security features
"""

import asyncio
import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import jwt
import redis
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from passlib.hash import bcrypt
import uuid


class TokenType(Enum):
    """JWT token types"""
    ACCESS = "access"
    REFRESH = "refresh"
    RESET_PASSWORD = "reset_password"
    EMAIL_VERIFICATION = "email_verification"
    API = "api"


class TokenStatus(Enum):
    """Token validation status"""
    VALID = "valid"
    EXPIRED = "expired"
    INVALID = "invalid"
    BLACKLISTED = "blacklisted"
    REVOKED = "revoked"


@dataclass
class TokenClaims:
    """JWT token claims structure"""
    user_id: str
    email: str
    roles: List[str]
    permissions: List[str]
    session_id: str
    token_type: TokenType
    issued_at: datetime
    expires_at: datetime
    issuer: str = "spirittours"
    audience: str = "spirittours-api"
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    additional_claims: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TokenPair:
    """Access and refresh token pair"""
    access_token: str
    refresh_token: str
    access_expires_at: datetime
    refresh_expires_at: datetime
    token_type: str = "Bearer"


class JWTSecurityConfig:
    """JWT security configuration"""
    
    def __init__(self):
        # Token expiration times
        self.ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)  # Short-lived access tokens
        self.REFRESH_TOKEN_LIFETIME = timedelta(days=30)   # Longer refresh tokens
        self.PASSWORD_RESET_TOKEN_LIFETIME = timedelta(hours=1)
        self.EMAIL_VERIFICATION_TOKEN_LIFETIME = timedelta(hours=24)
        self.API_TOKEN_LIFETIME = timedelta(days=365)
        
        # Security settings
        self.MAX_REFRESH_ATTEMPTS = 5
        self.TOKEN_BLACKLIST_DURATION = timedelta(days=1)
        self.SESSION_CLEANUP_INTERVAL = timedelta(hours=1)
        self.MAX_CONCURRENT_SESSIONS = 5
        
        # Algorithms and keys
        self.ALGORITHM = "HS256"
        self.ISSUER = "spirittours"
        self.AUDIENCE = "spirittours-api"
        
        # Security features
        self.ENABLE_TOKEN_ROTATION = True
        self.ENABLE_DEVICE_TRACKING = True
        self.ENABLE_IP_VALIDATION = True
        self.ENABLE_RATE_LIMITING = True


class AdvancedJWTManager:
    """
    Advanced JWT authentication manager with comprehensive security features
    """
    
    def __init__(self, secret_key: str, redis_client: redis.Redis, config: JWTSecurityConfig = None):
        self.secret_key = secret_key
        self.redis_client = redis_client
        self.config = config or JWTSecurityConfig()
        self.logger = logging.getLogger(__name__)
        
        # Initialize crypto components
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.fernet = Fernet(Fernet.generate_key())  # For sensitive data encryption
        
        # Session management
        self.active_sessions = {}
        self.blacklisted_tokens = set()
        
        # Rate limiting
        self.rate_limiter = {}
        
        # Start background tasks
        asyncio.create_task(self._cleanup_expired_sessions())
    
    async def create_token_pair(self, 
                               user_id: str, 
                               email: str,
                               roles: List[str],
                               permissions: List[str],
                               device_info: Optional[Dict[str, str]] = None) -> TokenPair:
        """
        Create a new access/refresh token pair with enhanced security
        """
        try:
            session_id = str(uuid.uuid4())
            current_time = datetime.now(timezone.utc)
            
            # Create device fingerprint
            device_fingerprint = None
            ip_address = None
            user_agent = None
            
            if device_info:
                device_fingerprint = self._generate_device_fingerprint(device_info)
                ip_address = device_info.get('ip_address')
                user_agent = device_info.get('user_agent')
            
            # Create access token claims
            access_claims = TokenClaims(
                user_id=user_id,
                email=email,
                roles=roles,
                permissions=permissions,
                session_id=session_id,
                token_type=TokenType.ACCESS,
                issued_at=current_time,
                expires_at=current_time + self.config.ACCESS_TOKEN_LIFETIME,
                device_fingerprint=device_fingerprint,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Create refresh token claims
            refresh_claims = TokenClaims(
                user_id=user_id,
                email=email,
                roles=roles,
                permissions=permissions,
                session_id=session_id,
                token_type=TokenType.REFRESH,
                issued_at=current_time,
                expires_at=current_time + self.config.REFRESH_TOKEN_LIFETIME,
                device_fingerprint=device_fingerprint,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Generate tokens
            access_token = self._create_jwt_token(access_claims)
            refresh_token = self._create_jwt_token(refresh_claims)
            
            # Store session information
            await self._store_session_info(session_id, user_id, device_info)
            
            # Track concurrent sessions
            await self._manage_concurrent_sessions(user_id, session_id)
            
            self.logger.info(f"Created token pair for user {user_id} with session {session_id}")
            
            return TokenPair(
                access_token=access_token,
                refresh_token=refresh_token,
                access_expires_at=access_claims.expires_at,
                refresh_expires_at=refresh_claims.expires_at
            )
            
        except Exception as e:
            self.logger.error(f"Failed to create token pair for user {user_id}: {str(e)}")
            raise
    
    async def validate_token(self, 
                            token: str, 
                            expected_type: TokenType = TokenType.ACCESS,
                            device_info: Optional[Dict[str, str]] = None) -> Tuple[TokenStatus, Optional[TokenClaims]]:
        """
        Validate JWT token with comprehensive security checks
        """
        try:
            # Check if token is blacklisted
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            if await self._is_token_blacklisted(token_hash):
                return TokenStatus.BLACKLISTED, None
            
            # Decode and validate token
            try:
                payload = jwt.decode(
                    token, 
                    self.secret_key, 
                    algorithms=[self.config.ALGORITHM],
                    audience=self.config.AUDIENCE,
                    issuer=self.config.ISSUER
                )
            except jwt.ExpiredSignatureError:
                return TokenStatus.EXPIRED, None
            except (jwt.InvalidTokenError, jwt.InvalidSignatureError, jwt.InvalidAudienceError, jwt.InvalidIssuerError):
                return TokenStatus.INVALID, None
            
            # Parse claims
            claims = self._parse_token_claims(payload)
            
            # Validate token type
            if claims.token_type != expected_type:
                return TokenStatus.INVALID, None
            
            # Validate session
            if not await self._is_session_active(claims.session_id, claims.user_id):
                return TokenStatus.REVOKED, None
            
            # Device validation (if enabled and device info provided)
            if self.config.ENABLE_DEVICE_TRACKING and device_info and claims.device_fingerprint:
                current_fingerprint = self._generate_device_fingerprint(device_info)
                if current_fingerprint != claims.device_fingerprint:
                    self.logger.warning(f"Device fingerprint mismatch for user {claims.user_id}")
                    return TokenStatus.INVALID, None
            
            # IP validation (if enabled and device info provided)
            if self.config.ENABLE_IP_VALIDATION and device_info and claims.ip_address:
                current_ip = device_info.get('ip_address')
                if current_ip != claims.ip_address:
                    self.logger.warning(f"IP address mismatch for user {claims.user_id}: expected {claims.ip_address}, got {current_ip}")
                    # Don't reject immediately for IP changes, just log
            
            # Update last activity
            await self._update_session_activity(claims.session_id)
            
            return TokenStatus.VALID, claims
            
        except Exception as e:
            self.logger.error(f"Token validation error: {str(e)}")
            return TokenStatus.INVALID, None
    
    async def refresh_token_pair(self, 
                                refresh_token: str,
                                device_info: Optional[Dict[str, str]] = None) -> Optional[TokenPair]:
        """
        Refresh access token using refresh token
        """
        try:
            # Validate refresh token
            status, claims = await self.validate_token(refresh_token, TokenType.REFRESH, device_info)
            
            if status != TokenStatus.VALID or not claims:
                return None
            
            # Check refresh attempts rate limiting
            if not await self._check_refresh_rate_limit(claims.user_id):
                self.logger.warning(f"Refresh rate limit exceeded for user {claims.user_id}")
                return None
            
            # Blacklist old refresh token (if rotation is enabled)
            if self.config.ENABLE_TOKEN_ROTATION:
                await self._blacklist_token(refresh_token)
            
            # Create new token pair
            new_token_pair = await self.create_token_pair(
                user_id=claims.user_id,
                email=claims.email,
                roles=claims.roles,
                permissions=claims.permissions,
                device_info=device_info
            )
            
            self.logger.info(f"Refreshed token pair for user {claims.user_id}")
            return new_token_pair
            
        except Exception as e:
            self.logger.error(f"Failed to refresh token: {str(e)}")
            return None
    
    async def revoke_token(self, token: str) -> bool:
        """
        Revoke a specific token by blacklisting it
        """
        try:
            await self._blacklist_token(token)
            self.logger.info("Token revoked successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to revoke token: {str(e)}")
            return False
    
    async def revoke_all_user_tokens(self, user_id: str) -> bool:
        """
        Revoke all tokens for a specific user by invalidating all sessions
        """
        try:
            # Get all user sessions
            session_keys = await self._get_user_sessions(user_id)
            
            # Invalidate all sessions
            for session_key in session_keys:
                await self.redis_client.delete(session_key)
            
            # Remove from active sessions tracking
            if user_id in self.active_sessions:
                del self.active_sessions[user_id]
            
            self.logger.info(f"Revoked all tokens for user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to revoke all tokens for user {user_id}: {str(e)}")
            return False
    
    async def create_special_token(self, 
                                  user_id: str, 
                                  token_type: TokenType,
                                  additional_claims: Dict[str, Any] = None) -> str:
        """
        Create special purpose tokens (password reset, email verification, etc.)
        """
        try:
            current_time = datetime.now(timezone.utc)
            
            # Determine token lifetime based on type
            lifetime_map = {
                TokenType.PASSWORD_RESET: self.config.PASSWORD_RESET_TOKEN_LIFETIME,
                TokenType.EMAIL_VERIFICATION: self.config.EMAIL_VERIFICATION_TOKEN_LIFETIME,
                TokenType.API: self.config.API_TOKEN_LIFETIME
            }
            
            lifetime = lifetime_map.get(token_type, timedelta(hours=1))
            
            claims = TokenClaims(
                user_id=user_id,
                email="",  # Will be filled from user data if needed
                roles=[],
                permissions=[],
                session_id=str(uuid.uuid4()),
                token_type=token_type,
                issued_at=current_time,
                expires_at=current_time + lifetime,
                additional_claims=additional_claims or {}
            )
            
            token = self._create_jwt_token(claims)
            
            # Store special token info for validation
            await self._store_special_token(token, claims)
            
            self.logger.info(f"Created {token_type.value} token for user {user_id}")
            return token
            
        except Exception as e:
            self.logger.error(f"Failed to create {token_type.value} token: {str(e)}")
            raise
    
    async def validate_special_token(self, 
                                   token: str, 
                                   expected_type: TokenType) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Validate special purpose tokens
        """
        try:
            status, claims = await self.validate_token(token, expected_type)
            
            if status != TokenStatus.VALID or not claims:
                return False, None
            
            # Return additional claims for special tokens
            return True, claims.additional_claims
            
        except Exception as e:
            self.logger.error(f"Failed to validate {expected_type.value} token: {str(e)}")
            return False, None
    
    def _create_jwt_token(self, claims: TokenClaims) -> str:
        """
        Create JWT token from claims
        """
        payload = {
            "sub": claims.user_id,
            "email": claims.email,
            "roles": claims.roles,
            "permissions": claims.permissions,
            "session_id": claims.session_id,
            "token_type": claims.token_type.value,
            "iat": int(claims.issued_at.timestamp()),
            "exp": int(claims.expires_at.timestamp()),
            "iss": claims.issuer,
            "aud": claims.audience,
            "jti": str(uuid.uuid4())  # JWT ID for tracking
        }
        
        # Add optional claims
        if claims.device_fingerprint:
            payload["device_fp"] = claims.device_fingerprint
        if claims.ip_address:
            payload["ip"] = claims.ip_address
        if claims.user_agent:
            payload["ua_hash"] = hashlib.sha256(claims.user_agent.encode()).hexdigest()[:16]
        if claims.additional_claims:
            payload.update(claims.additional_claims)
        
        return jwt.encode(payload, self.secret_key, algorithm=self.config.ALGORITHM)
    
    def _parse_token_claims(self, payload: Dict[str, Any]) -> TokenClaims:
        """
        Parse JWT payload into TokenClaims object
        """
        return TokenClaims(
            user_id=payload["sub"],
            email=payload.get("email", ""),
            roles=payload.get("roles", []),
            permissions=payload.get("permissions", []),
            session_id=payload["session_id"],
            token_type=TokenType(payload["token_type"]),
            issued_at=datetime.fromtimestamp(payload["iat"], timezone.utc),
            expires_at=datetime.fromtimestamp(payload["exp"], timezone.utc),
            issuer=payload.get("iss", ""),
            audience=payload.get("aud", ""),
            device_fingerprint=payload.get("device_fp"),
            ip_address=payload.get("ip"),
            user_agent=payload.get("ua_hash"),
            additional_claims={k: v for k, v in payload.items() 
                             if k not in ["sub", "email", "roles", "permissions", "session_id", 
                                        "token_type", "iat", "exp", "iss", "aud", "device_fp", "ip", "ua_hash"]}
        )
    
    def _generate_device_fingerprint(self, device_info: Dict[str, str]) -> str:
        """
        Generate device fingerprint from device information
        """
        fingerprint_data = {
            "user_agent": device_info.get("user_agent", ""),
            "screen_resolution": device_info.get("screen_resolution", ""),
            "timezone": device_info.get("timezone", ""),
            "language": device_info.get("language", ""),
            "platform": device_info.get("platform", "")
        }
        
        fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
        return hashlib.sha256(fingerprint_string.encode()).hexdigest()
    
    async def _store_session_info(self, 
                                 session_id: str, 
                                 user_id: str, 
                                 device_info: Optional[Dict[str, str]]):
        """
        Store session information in Redis
        """
        session_data = {
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "device_info": device_info or {}
        }
        
        session_key = f"session:{session_id}"
        await self.redis_client.setex(
            session_key,
            int(self.config.REFRESH_TOKEN_LIFETIME.total_seconds()),
            json.dumps(session_data)
        )
        
        # Track user sessions
        user_sessions_key = f"user_sessions:{user_id}"
        await self.redis_client.sadd(user_sessions_key, session_id)
        await self.redis_client.expire(user_sessions_key, int(self.config.REFRESH_TOKEN_LIFETIME.total_seconds()))
    
    async def _manage_concurrent_sessions(self, user_id: str, new_session_id: str):
        """
        Manage concurrent sessions per user
        """
        user_sessions_key = f"user_sessions:{user_id}"
        sessions = await self.redis_client.smembers(user_sessions_key)
        
        if len(sessions) >= self.config.MAX_CONCURRENT_SESSIONS:
            # Remove oldest sessions
            sessions_to_remove = len(sessions) - self.config.MAX_CONCURRENT_SESSIONS + 1
            oldest_sessions = list(sessions)[:sessions_to_remove]
            
            for session_id in oldest_sessions:
                await self.redis_client.delete(f"session:{session_id}")
                await self.redis_client.srem(user_sessions_key, session_id)
            
            self.logger.info(f"Removed {sessions_to_remove} old sessions for user {user_id}")
    
    async def _is_session_active(self, session_id: str, user_id: str) -> bool:
        """
        Check if session is still active
        """
        session_key = f"session:{session_id}"
        session_data = await self.redis_client.get(session_key)
        
        if not session_data:
            return False
        
        try:
            data = json.loads(session_data)
            return data.get("user_id") == user_id
        except:
            return False
    
    async def _update_session_activity(self, session_id: str):
        """
        Update last activity timestamp for session
        """
        session_key = f"session:{session_id}"
        session_data = await self.redis_client.get(session_key)
        
        if session_data:
            try:
                data = json.loads(session_data)
                data["last_activity"] = datetime.now(timezone.utc).isoformat()
                
                await self.redis_client.setex(
                    session_key,
                    int(self.config.REFRESH_TOKEN_LIFETIME.total_seconds()),
                    json.dumps(data)
                )
            except:
                pass
    
    async def _blacklist_token(self, token: str):
        """
        Add token to blacklist
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        blacklist_key = f"blacklisted_token:{token_hash}"
        
        await self.redis_client.setex(
            blacklist_key,
            int(self.config.TOKEN_BLACKLIST_DURATION.total_seconds()),
            "1"
        )
    
    async def _is_token_blacklisted(self, token_hash: str) -> bool:
        """
        Check if token is blacklisted
        """
        blacklist_key = f"blacklisted_token:{token_hash}"
        return bool(await self.redis_client.exists(blacklist_key))
    
    async def _check_refresh_rate_limit(self, user_id: str) -> bool:
        """
        Check refresh rate limiting
        """
        if not self.config.ENABLE_RATE_LIMITING:
            return True
        
        rate_key = f"refresh_rate:{user_id}"
        current_attempts = await self.redis_client.get(rate_key)
        
        if not current_attempts:
            await self.redis_client.setex(rate_key, 3600, 1)  # 1 hour window
            return True
        
        attempts = int(current_attempts)
        if attempts >= self.config.MAX_REFRESH_ATTEMPTS:
            return False
        
        await self.redis_client.incr(rate_key)
        return True
    
    async def _get_user_sessions(self, user_id: str) -> List[str]:
        """
        Get all session keys for a user
        """
        user_sessions_key = f"user_sessions:{user_id}"
        sessions = await self.redis_client.smembers(user_sessions_key)
        return [f"session:{session_id}" for session_id in sessions]
    
    async def _store_special_token(self, token: str, claims: TokenClaims):
        """
        Store special token information
        """
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        special_token_key = f"special_token:{token_hash}"
        
        token_data = {
            "user_id": claims.user_id,
            "token_type": claims.token_type.value,
            "created_at": claims.issued_at.isoformat(),
            "expires_at": claims.expires_at.isoformat(),
            "additional_claims": claims.additional_claims
        }
        
        ttl = int((claims.expires_at - datetime.now(timezone.utc)).total_seconds())
        await self.redis_client.setex(special_token_key, ttl, json.dumps(token_data))
    
    async def _cleanup_expired_sessions(self):
        """
        Background task to cleanup expired sessions
        """
        while True:
            try:
                await asyncio.sleep(self.config.SESSION_CLEANUP_INTERVAL.total_seconds())
                
                # Get all session keys
                session_keys = await self.redis_client.keys("session:*")
                
                for session_key in session_keys:
                    session_data = await self.redis_client.get(session_key)
                    if session_data:
                        try:
                            data = json.loads(session_data)
                            last_activity = datetime.fromisoformat(data["last_activity"])
                            
                            # Remove sessions inactive for too long
                            if (datetime.now(timezone.utc) - last_activity) > self.config.REFRESH_TOKEN_LIFETIME:
                                await self.redis_client.delete(session_key)
                                
                                # Remove from user sessions set
                                session_id = session_key.split(":", 1)[1]
                                user_sessions_key = f"user_sessions:{data['user_id']}"
                                await self.redis_client.srem(user_sessions_key, session_id)
                                
                        except:
                            # Remove corrupted session data
                            await self.redis_client.delete(session_key)
                
            except Exception as e:
                self.logger.error(f"Session cleanup error: {str(e)}")


# Password utilities for authentication
class PasswordManager:
    """
    Secure password management utilities
    """
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.logger = logging.getLogger(__name__)
    
    def hash_password(self, password: str) -> str:
        """
        Hash password securely
        """
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify password against hash
        """
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def generate_secure_password(self, length: int = 16) -> str:
        """
        Generate cryptographically secure password
        """
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def check_password_strength(self, password: str) -> Dict[str, Any]:
        """
        Check password strength and return recommendations
        """
        issues = []
        score = 0
        
        if len(password) >= 8:
            score += 1
        else:
            issues.append("Password should be at least 8 characters long")
        
        if any(c.islower() for c in password):
            score += 1
        else:
            issues.append("Password should contain lowercase letters")
        
        if any(c.isupper() for c in password):
            score += 1
        else:
            issues.append("Password should contain uppercase letters")
        
        if any(c.isdigit() for c in password):
            score += 1
        else:
            issues.append("Password should contain numbers")
        
        if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            score += 1
        else:
            issues.append("Password should contain special characters")
        
        strength_levels = ["Very Weak", "Weak", "Fair", "Good", "Strong"]
        strength = strength_levels[min(score, len(strength_levels) - 1)]
        
        return {
            "strength": strength,
            "score": score,
            "max_score": 5,
            "issues": issues,
            "is_strong": score >= 4
        }


# Example usage and testing
async def main():
    """
    Example usage of the JWT authentication system
    """
    import redis.asyncio as redis
    
    # Initialize Redis client
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    
    # Initialize JWT manager
    secret_key = secrets.token_urlsafe(32)
    jwt_manager = AdvancedJWTManager(secret_key, redis_client)
    
    # Example user data
    user_id = "user123"
    email = "user@spirittours.com"
    roles = ["agent", "sales"]
    permissions = ["read_calls", "write_bookings", "view_dashboard"]
    
    device_info = {
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "screen_resolution": "1920x1080",
        "timezone": "UTC-5",
        "language": "en-US",
        "platform": "Win32"
    }
    
    try:
        # Create token pair
        print("Creating token pair...")
        token_pair = await jwt_manager.create_token_pair(
            user_id=user_id,
            email=email,
            roles=roles,
            permissions=permissions,
            device_info=device_info
        )
        
        print(f"Access token: {token_pair.access_token[:50]}...")
        print(f"Refresh token: {token_pair.refresh_token[:50]}...")
        print(f"Access expires at: {token_pair.access_expires_at}")
        print(f"Refresh expires at: {token_pair.refresh_expires_at}")
        
        # Validate access token
        print("\nValidating access token...")
        status, claims = await jwt_manager.validate_token(token_pair.access_token, TokenType.ACCESS, device_info)
        print(f"Validation status: {status}")
        if claims:
            print(f"User ID: {claims.user_id}")
            print(f"Roles: {claims.roles}")
            print(f"Permissions: {claims.permissions}")
        
        # Refresh token
        print("\nRefreshing token...")
        new_token_pair = await jwt_manager.refresh_token_pair(token_pair.refresh_token, device_info)
        if new_token_pair:
            print(f"New access token: {new_token_pair.access_token[:50]}...")
            print("Token refresh successful!")
        
        # Create special token
        print("\nCreating password reset token...")
        reset_token = await jwt_manager.create_special_token(
            user_id=user_id,
            token_type=TokenType.PASSWORD_RESET,
            additional_claims={"reset_reason": "user_request"}
        )
        print(f"Reset token: {reset_token[:50]}...")
        
        # Validate special token
        print("Validating reset token...")
        is_valid, reset_claims = await jwt_manager.validate_special_token(reset_token, TokenType.PASSWORD_RESET)
        print(f"Reset token valid: {is_valid}")
        if reset_claims:
            print(f"Reset claims: {reset_claims}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    
    finally:
        await redis_client.close()


if __name__ == "__main__":
    asyncio.run(main())