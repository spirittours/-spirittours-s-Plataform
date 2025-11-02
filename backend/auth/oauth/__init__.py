"""
OAuth Authentication Module

Social authentication integration for Google and Facebook.
"""

from .oauth_config import OAuthConfig
from .oauth_service import OAuthService
from .google_oauth import GoogleOAuth
from .facebook_oauth import FacebookOAuth

__all__ = [
    'OAuthConfig',
    'OAuthService',
    'GoogleOAuth',
    'FacebookOAuth'
]
