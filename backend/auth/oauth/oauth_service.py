"""
OAuth Service

Unified service for OAuth authentication with multiple providers.
"""

import logging
import jwt
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from .google_oauth import GoogleOAuth
from .facebook_oauth import FacebookOAuth
from .oauth_config import config


logger = logging.getLogger(__name__)


class OAuthService:
    """
    Unified OAuth authentication service.
    
    Manages authentication flow for multiple OAuth providers.
    """
    
    def __init__(self):
        """Initialize OAuth service"""
        self.google = GoogleOAuth()
        self.facebook = FacebookOAuth()
        self.config = config
    
    def get_provider(self, provider_name: str):
        """
        Get OAuth provider instance.
        
        Args:
            provider_name: Provider name (google, facebook)
            
        Returns:
            OAuth provider instance
        """
        providers = {
            'google': self.google,
            'facebook': self.facebook
        }
        
        provider = providers.get(provider_name.lower())
        
        if not provider:
            raise ValueError(f"Unsupported OAuth provider: {provider_name}")
        
        return provider
    
    async def authenticate(
        self,
        provider_name: str,
        code: str,
        state: str
    ) -> Dict[str, Any]:
        """
        Complete OAuth authentication flow.
        
        Args:
            provider_name: OAuth provider name
            code: Authorization code
            state: State token
            
        Returns:
            Authentication result with user data and JWT tokens
        """
        try:
            # Get provider
            provider = self.get_provider(provider_name)
            
            # Verify state token
            if not provider.verify_state(state):
                raise ValueError("Invalid or expired state token")
            
            # Exchange code for token
            token_response = await provider.exchange_code_for_token(code)
            access_token = token_response['access_token']
            
            # Get user info
            user_data = await provider.get_user_info(access_token)
            
            # Transform to application format
            transformed_data = provider.transform_user_data(user_data)
            
            # Generate JWT tokens
            jwt_tokens = self.generate_jwt_tokens(transformed_data)
            
            logger.info(
                f"OAuth authentication successful: {provider_name} - {transformed_data['email']}"
            )
            
            return {
                'success': True,
                'provider': provider_name,
                'user_data': transformed_data,
                'tokens': jwt_tokens,
                'oauth_tokens': {
                    'access_token': access_token,
                    'refresh_token': token_response.get('refresh_token')
                }
            }
            
        except Exception as e:
            logger.error(f"OAuth authentication failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_jwt_tokens(self, user_data: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate JWT access and refresh tokens.
        
        Args:
            user_data: User data to encode in token
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        # Access token payload
        access_payload = {
            'user_id': user_data.get('oauth_id'),
            'email': user_data.get('email'),
            'provider': user_data.get('oauth_provider'),
            'exp': datetime.utcnow() + timedelta(hours=self.config.JWT_EXPIRATION_HOURS),
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        
        # Refresh token payload
        refresh_payload = {
            'user_id': user_data.get('oauth_id'),
            'provider': user_data.get('oauth_provider'),
            'exp': datetime.utcnow() + timedelta(days=self.config.JWT_REFRESH_EXPIRATION_DAYS),
            'iat': datetime.utcnow(),
            'type': 'refresh'
        }
        
        # Encode tokens
        access_token = jwt.encode(
            access_payload,
            self.config.JWT_SECRET_KEY,
            algorithm=self.config.JWT_ALGORITHM
        )
        
        refresh_token = jwt.encode(
            refresh_payload,
            self.config.JWT_SECRET_KEY,
            algorithm=self.config.JWT_ALGORITHM
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': self.config.JWT_EXPIRATION_HOURS * 3600
        }
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token
            
        Returns:
            Decoded payload or None if invalid
        """
        try:
            payload = jwt.decode(
                token,
                self.config.JWT_SECRET_KEY,
                algorithms=[self.config.JWT_ALGORITHM]
            )
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {str(e)}")
            return None
    
    def refresh_jwt_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """
        Refresh JWT access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New tokens or None if invalid
        """
        payload = self.verify_jwt_token(refresh_token)
        
        if not payload or payload.get('type') != 'refresh':
            return None
        
        # Generate new access token
        new_access_payload = {
            'user_id': payload['user_id'],
            'provider': payload['provider'],
            'exp': datetime.utcnow() + timedelta(hours=self.config.JWT_EXPIRATION_HOURS),
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        
        new_access_token = jwt.encode(
            new_access_payload,
            self.config.JWT_SECRET_KEY,
            algorithm=self.config.JWT_ALGORITHM
        )
        
        return {
            'access_token': new_access_token,
            'token_type': 'Bearer',
            'expires_in': self.config.JWT_EXPIRATION_HOURS * 3600
        }
    
    async def link_account(
        self,
        existing_user_id: str,
        provider_name: str,
        oauth_data: Dict[str, Any]
    ) -> bool:
        """
        Link OAuth account to existing user.
        
        Args:
            existing_user_id: Existing user ID
            provider_name: OAuth provider
            oauth_data: OAuth user data
            
        Returns:
            True if successful
        """
        try:
            # In production:
            # 1. Check if OAuth account already linked
            # 2. Create social_account record in database
            # 3. Update user profile with OAuth data if desired
            
            logger.info(
                f"Linked {provider_name} account to user {existing_user_id}"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error linking account: {str(e)}")
            return False
    
    async def unlink_account(
        self,
        user_id: str,
        provider_name: str
    ) -> bool:
        """
        Unlink OAuth account from user.
        
        Args:
            user_id: User ID
            provider_name: OAuth provider
            
        Returns:
            True if successful
        """
        try:
            # In production:
            # 1. Check user has other auth methods
            # 2. Delete social_account record
            # 3. Revoke OAuth tokens
            
            logger.info(
                f"Unlinked {provider_name} account from user {user_id}"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error unlinking account: {str(e)}")
            return False
    
    def get_provider_status(self) -> Dict[str, bool]:
        """
        Get status of OAuth providers.
        
        Returns:
            Dictionary with provider availability
        """
        validation = self.config.validate_config()
        
        return {
            'google_enabled': validation['google_configured'],
            'facebook_enabled': validation['facebook_configured'],
            'jwt_configured': validation['jwt_configured']
        }
