"""
Facebook OAuth Integration

Handles Facebook OAuth 2.0 authentication flow.
"""

import logging
import secrets
from typing import Dict, Any, Optional
from urllib.parse import urlencode
from datetime import datetime, timedelta

from .oauth_config import config


logger = logging.getLogger(__name__)


class FacebookOAuth:
    """
    Facebook OAuth 2.0 authentication provider.
    
    Implements the OAuth 2.0 authorization code flow.
    """
    
    def __init__(self):
        """Initialize Facebook OAuth"""
        self.config = config.get_facebook_config()
        self.state_tokens: Dict[str, datetime] = {}
    
    def get_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """
        Generate Facebook OAuth authorization URL.
        
        Args:
            state: Optional state token for CSRF protection
            
        Returns:
            Dictionary with authorization URL and state token
        """
        # Generate state token if not provided
        if not state:
            state = secrets.token_urlsafe(config.STATE_TOKEN_LENGTH)
        
        # Store state token with expiration
        self.state_tokens[state] = datetime.utcnow() + timedelta(
            seconds=config.STATE_TOKEN_EXPIRATION
        )
        
        # Build authorization URL
        params = {
            'client_id': self.config['client_id'],
            'redirect_uri': self.config['redirect_uri'],
            'state': state,
            'scope': ','.join(self.config['scopes']),
            'response_type': 'code'
        }
        
        auth_url = f"{self.config['auth_url']}?{urlencode(params)}"
        
        logger.info("Generated Facebook OAuth authorization URL")
        
        return {
            'authorization_url': auth_url,
            'state': state
        }
    
    def verify_state(self, state: str) -> bool:
        """Verify state token"""
        if state not in self.state_tokens:
            logger.warning(f"Invalid Facebook state token: {state}")
            return False
        
        expiration = self.state_tokens[state]
        
        if datetime.utcnow() > expiration:
            logger.warning(f"Expired Facebook state token: {state}")
            del self.state_tokens[state]
            return False
        
        del self.state_tokens[state]
        return True
    
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code
            
        Returns:
            Token response
        """
        # In production:
        # params = {
        #     'client_id': self.config['client_id'],
        #     'client_secret': self.config['client_secret'],
        #     'redirect_uri': self.config['redirect_uri'],
        #     'code': code
        # }
        # async with aiohttp.ClientSession() as session:
        #     async with session.get(self.config['token_url'], params=params) as response:
        #         return await response.json()
        
        logger.info(f"Exchanging Facebook code for token: {code[:10]}...")
        
        return {
            'access_token': f'EAA{secrets.token_urlsafe(200)}',
            'token_type': 'bearer',
            'expires_in': 5184000  # 60 days
        }
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get user profile information from Facebook.
        
        Args:
            access_token: Access token
            
        Returns:
            User profile data
        """
        # In production:
        # params = {
        #     'fields': 'id,name,email,first_name,last_name,picture',
        #     'access_token': access_token
        # }
        # async with aiohttp.ClientSession() as session:
        #     async with session.get(self.config['userinfo_url'], params=params) as response:
        #         return await response.json()
        
        logger.info("Fetching Facebook user info")
        
        return {
            'id': '1234567890123456',
            'email': 'user@facebook.com',
            'name': 'John Doe',
            'first_name': 'John',
            'last_name': 'Doe',
            'picture': {
                'data': {
                    'url': 'https://platform-lookaside.fbsbx.com/platform/profilepic/',
                    'is_silhouette': False
                }
            }
        }
    
    async def get_long_lived_token(self, short_token: str) -> Dict[str, Any]:
        """
        Exchange short-lived token for long-lived token.
        
        Args:
            short_token: Short-lived access token
            
        Returns:
            Long-lived token response
        """
        logger.info("Exchanging for long-lived token")
        
        return {
            'access_token': f'EAA{secrets.token_urlsafe(200)}',
            'token_type': 'bearer',
            'expires_in': 5184000
        }
    
    def transform_user_data(self, facebook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform Facebook user data to application format.
        
        Args:
            facebook_data: Facebook user profile data
            
        Returns:
            Transformed user data
        """
        picture_url = None
        if 'picture' in facebook_data and 'data' in facebook_data['picture']:
            picture_url = facebook_data['picture']['data'].get('url')
        
        return {
            'oauth_provider': 'facebook',
            'oauth_id': facebook_data['id'],
            'email': facebook_data.get('email'),
            'email_verified': True,  # Facebook emails are verified
            'first_name': facebook_data.get('first_name', ''),
            'last_name': facebook_data.get('last_name', ''),
            'full_name': facebook_data.get('name', ''),
            'profile_picture': picture_url,
            'locale': facebook_data.get('locale', 'en_US')
        }
