"""
Notifications Module
Email notification system using SendGrid
"""

from .email_service import email_service, EmailService
from .routes import router

__all__ = [
    'email_service',
    'EmailService',
    'router',
]
