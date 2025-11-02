"""
Email Configuration

Configuration settings for email providers and SMTP.
"""

import os
from typing import Optional
from pydantic import BaseSettings, EmailStr


class EmailConfig(BaseSettings):
    """Email configuration settings"""
    
    # Default sender
    DEFAULT_FROM_EMAIL: str = os.getenv('EMAIL_FROM', 'noreply@spirittours.com')
    DEFAULT_FROM_NAME: str = os.getenv('EMAIL_FROM_NAME', 'Spirit Tours')
    DEFAULT_REPLY_TO: Optional[str] = os.getenv('EMAIL_REPLY_TO', None)
    
    # SMTP Configuration
    SMTP_HOST: str = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME: Optional[str] = os.getenv('SMTP_USERNAME')
    SMTP_PASSWORD: Optional[str] = os.getenv('SMTP_PASSWORD')
    SMTP_USE_TLS: bool = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    SMTP_USE_SSL: bool = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
    
    # SendGrid Configuration
    SENDGRID_API_KEY: Optional[str] = os.getenv('SENDGRID_API_KEY')
    SENDGRID_WEBHOOK_SECRET: Optional[str] = os.getenv('SENDGRID_WEBHOOK_SECRET')
    
    # AWS SES Configuration
    AWS_SES_REGION: str = os.getenv('AWS_SES_REGION', 'us-east-1')
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv('AWS_SECRET_ACCESS_KEY')
    
    # Mailgun Configuration
    MAILGUN_API_KEY: Optional[str] = os.getenv('MAILGUN_API_KEY')
    MAILGUN_DOMAIN: Optional[str] = os.getenv('MAILGUN_DOMAIN')
    MAILGUN_WEBHOOK_SECRET: Optional[str] = os.getenv('MAILGUN_WEBHOOK_SECRET')
    
    # Email Provider Selection
    EMAIL_PROVIDER: str = os.getenv('EMAIL_PROVIDER', 'smtp')  # smtp, sendgrid, aws_ses, mailgun
    
    # Email Queue Configuration
    EMAIL_QUEUE_ENABLED: bool = os.getenv('EMAIL_QUEUE_ENABLED', 'true').lower() == 'true'
    EMAIL_QUEUE_BATCH_SIZE: int = int(os.getenv('EMAIL_QUEUE_BATCH_SIZE', '100'))
    EMAIL_QUEUE_PROCESS_INTERVAL: int = int(os.getenv('EMAIL_QUEUE_PROCESS_INTERVAL', '60'))  # seconds
    
    # Retry Configuration
    EMAIL_MAX_RETRIES: int = int(os.getenv('EMAIL_MAX_RETRIES', '3'))
    EMAIL_RETRY_DELAY: int = int(os.getenv('EMAIL_RETRY_DELAY', '300'))  # seconds
    
    # Rate Limiting
    EMAIL_RATE_LIMIT_ENABLED: bool = os.getenv('EMAIL_RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    EMAIL_RATE_LIMIT_PER_HOUR: int = int(os.getenv('EMAIL_RATE_LIMIT_PER_HOUR', '1000'))
    
    # Tracking Configuration
    EMAIL_TRACKING_ENABLED: bool = os.getenv('EMAIL_TRACKING_ENABLED', 'true').lower() == 'true'
    EMAIL_TRACKING_DOMAIN: Optional[str] = os.getenv('EMAIL_TRACKING_DOMAIN')
    EMAIL_OPEN_TRACKING: bool = os.getenv('EMAIL_OPEN_TRACKING', 'true').lower() == 'true'
    EMAIL_CLICK_TRACKING: bool = os.getenv('EMAIL_CLICK_TRACKING', 'true').lower() == 'true'
    
    # Template Configuration
    EMAIL_TEMPLATES_DIR: str = os.getenv('EMAIL_TEMPLATES_DIR', 'backend/email/templates')
    EMAIL_TEMPLATES_CACHE: bool = os.getenv('EMAIL_TEMPLATES_CACHE', 'true').lower() == 'true'
    
    # Testing
    EMAIL_TEST_MODE: bool = os.getenv('EMAIL_TEST_MODE', 'false').lower() == 'true'
    EMAIL_TEST_RECIPIENT: Optional[str] = os.getenv('EMAIL_TEST_RECIPIENT')
    
    # Logging
    EMAIL_LOG_LEVEL: str = os.getenv('EMAIL_LOG_LEVEL', 'INFO')
    
    class Config:
        case_sensitive = True


# Global email configuration instance
email_config = EmailConfig()
