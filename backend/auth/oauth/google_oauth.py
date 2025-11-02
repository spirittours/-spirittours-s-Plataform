"""
Google OAuth Integration

Handles Google OAuth 2.0 authentication flow.
"""

import logging
import secrets
from typing import Dict, Any, Optional
from urllib.parse import urlencode
from datetime import datetime, timedelta

from .oauth_config import config


logger = logging.getLogger(__name__)


class GoogleOAuth:
    """
    Google OAuth 2.0 authentication provider.
    
    Implements the OAuth 2.0 authorization code flow.
    """
    
    def __init__(self):
        """Initialize Google OAuth"""
        self.config = config.get_google_config()
        self.state_tokens: Dict[str, datetime] = {}
    
    def get_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """
        Generate Google OAuth authorization URL.
        
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
            'response_type': 'code',
            'scope': ' '.join(self.config['scopes']),
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent'
        }
        
        auth_url = f"{self.config['auth_url']}?{urlencode(params)}"
        
        logger.info("Generated Google OAuth authorization URL")
        
        return {
            'authorization_url': auth_url,
            'state': state
        }
    
    def verify_state(self, state: str) -> bool:
        """
        Verify state token to prevent CSRF attacks.
        
        Args:
            state: State token to verify
            
        Returns:
            True if valid
        """
        if state not in self.state_tokens:
            logger.warning(f"Invalid state token: {state}")
            return False
        
        expiration = self.state_tokens[state]
        
        if datetime.utcnow() > expiration:
            logger.warning(f"Expired state token: {state}")
            del self.state_tokens[state]
            return False
        
        # Remove used token
        del self.state_tokens[state]
        return True
    
    async def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code
            
        Returns:
            Token response with access_token, refresh_token, etc.
        """
        # In production, make HTTP request to token endpoint:
        # import aiohttp
        # async with aiohttp.ClientSession() as session:
        #     data = {
        #         'code': code,
        #         'client_id': self.config['client_id'],
        #         'client_secret': self.config['client_secret'],
        #         'redirect_uri': self.config['redirect_uri'],
        #         'grant_type': 'authorization_code'
        #     }
        #     async with session.post(self.config['token_url'], data=data) as response:
        #         return await response.json()
        
        # Simulated response for development
        logger.info(f"Exchanging code for token: {code[:10]}...")
        
        return {
            'access_token': f'ya29.{secrets.token_urlsafe(100)}',
            'token_type': 'Bearer',
            'expires_in': 3600,
            'refresh_token': f'1//{secrets.token_urlsafe(50)}',
            'scope': ' '.join(self.config['scopes'])
        }
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get user profile information from Google.
        
        Args:
            access_token: Access token
            
        Returns:
            User profile data
        """
        # In production, make HTTP request:
        # async with aiohttp.ClientSession() as session:
        #     headers = {'Authorization': f'Bearer {access_token}'}
        #     async with session.get(self.config['userinfo_url'], headers=headers) as response:
        #         return await response.json()
        
        # Simulated user info for development
        logger.info("Fetching Google user info")
        
        return {
            'id': '1234567890',
            'email': 'user@gmail.com',
            'verified_email': True,
            'name': 'John Doe',
            'given_name': 'John',
            'family_name': 'Doe',
            'picture': 'https://lh3.googleusercontent.com/a/default-user',
            'locale': 'en'
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New token response
        """
        # In production, make HTTP request:
        # data = {
        #     'refresh_token': refresh_token,
        #     'client_id': self.config['client_id'],
        #     'client_secret': self.config['client_secret'],
        #     'grant_type': 'refresh_token'
        # }
        
        logger.info("Refreshing Google access token")
        
        return {
            'access_token': f'ya29.{secrets.token_urlsafe(100)}',
            'token_type': 'Bearer',
            'expires_in': 3600
        }
    
    async def revoke_token(self, token: str) -> bool:
        """
        Revoke access token.
        
        Args:
            token: Token to revoke
            
        Returns:
            True if successful
        """
        # In production, make HTTP request to revoke endpoint
        logger.info("Revoking Google token")
        return True
    
    def transform_user_data(self, google_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform Google user data to application format.
        
        Args:
            google_data: Google user profile data
            
        Returns:
            Transformed user data
        """
        return {
            'oauth_provider': 'google',
            'oauth_id': google_data['id'],
            'email': google_data['email'],
            'email_verified': google_data.get('verified_email', False),
            'first_name': google_data.get('given_name', ''),
            'last_name': google_data.get('family_name', ''),
            'full_name': google_data.get('name', ''),
            'profile_picture': google_data.get('picture'),
            'locale': google_data.get('locale', 'en')
        }
