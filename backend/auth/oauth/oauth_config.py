"""
OAuth Configuration

Configuration for OAuth 2.0 providers.
"""

import os
from typing import Dict, Any


class OAuthConfig:
    """
    OAuth 2.0 configuration for social authentication.
    
    Supports Google and Facebook OAuth providers.
    """
    
    # Base URLs
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:8000')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_REDIRECT_URI = f"{BASE_URL}/api/auth/oauth/google/callback"
    
    GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
    GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
    GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
    
    GOOGLE_SCOPES = [
        'openid',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]
    
    # Facebook OAuth
    FACEBOOK_APP_ID = os.getenv('FACEBOOK_APP_ID', '')
    FACEBOOK_APP_SECRET = os.getenv('FACEBOOK_APP_SECRET', '')
    FACEBOOK_REDIRECT_URI = f"{BASE_URL}/api/auth/oauth/facebook/callback"
    
    FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
    FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
    FACEBOOK_USERINFO_URL = 'https://graph.facebook.com/me'
    
    FACEBOOK_SCOPES = ['email', 'public_profile']
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = 24
    JWT_REFRESH_EXPIRATION_DAYS = 30
    
    # Session Configuration
    SESSION_COOKIE_NAME = 'spirit_tours_session'
    SESSION_MAX_AGE = 86400  # 24 hours
    
    # Security
    STATE_TOKEN_LENGTH = 32
    STATE_TOKEN_EXPIRATION = 600  # 10 minutes
    
    @classmethod
    def get_google_config(cls) -> Dict[str, Any]:
        """Get Google OAuth configuration"""
        return {
            'client_id': cls.GOOGLE_CLIENT_ID,
            'client_secret': cls.GOOGLE_CLIENT_SECRET,
            'redirect_uri': cls.GOOGLE_REDIRECT_URI,
            'auth_url': cls.GOOGLE_AUTH_URL,
            'token_url': cls.GOOGLE_TOKEN_URL,
            'userinfo_url': cls.GOOGLE_USERINFO_URL,
            'scopes': cls.GOOGLE_SCOPES
        }
    
    @classmethod
    def get_facebook_config(cls) -> Dict[str, Any]:
        """Get Facebook OAuth configuration"""
        return {
            'client_id': cls.FACEBOOK_APP_ID,
            'client_secret': cls.FACEBOOK_APP_SECRET,
            'redirect_uri': cls.FACEBOOK_REDIRECT_URI,
            'auth_url': cls.FACEBOOK_AUTH_URL,
            'token_url': cls.FACEBOOK_TOKEN_URL,
            'userinfo_url': cls.FACEBOOK_USERINFO_URL,
            'scopes': cls.FACEBOOK_SCOPES
        }
    
    @classmethod
    def validate_config(cls) -> Dict[str, bool]:
        """
        Validate OAuth configuration.
        
        Returns:
            Dictionary with validation results
        """
        return {
            'google_configured': bool(cls.GOOGLE_CLIENT_ID and cls.GOOGLE_CLIENT_SECRET),
            'facebook_configured': bool(cls.FACEBOOK_APP_ID and cls.FACEBOOK_APP_SECRET),
            'jwt_configured': bool(cls.JWT_SECRET_KEY != 'your-secret-key-change-in-production')
        }


# Export config instance
config = OAuthConfig()
