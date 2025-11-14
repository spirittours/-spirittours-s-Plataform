#!/usr/bin/env python3
"""
Application Settings and Configuration
Configuración completa del sistema Spirit Tours
"""

import os
from typing import List, Optional, Dict, Any
try:
    from pydantic_settings import BaseSettings
    from pydantic import validator, ConfigDict
except ImportError:
    from pydantic import BaseSettings, validator
    ConfigDict = None  # Fallback for older Pydantic versions
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Pydantic v2 configuration - Allow extra fields for backward compatibility
    if ConfigDict is not None:
        model_config = ConfigDict(
            extra='allow',
            env_file='.env',
            env_file_encoding='utf-8',
            case_sensitive=False,
            env_prefix=''
        )
    
    # ============================
    # BASIC APPLICATION SETTINGS
    # ============================
    app_name: str = "Spirit Tours CRM & AI Platform"
    app_version: str = "2.0.0"
    environment: str = "development"
    debug: bool = False
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    
    # ============================
    # DATABASE CONFIGURATION  
    # ============================
    database_url: str = "postgresql://spirittours:spirit2024@localhost:5432/spirittours_db"
    test_database_url: str = "sqlite:///./test_spirittours.db"
    db_echo: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 10
    
    # ============================
    # SECURITY CONFIGURATION
    # ============================
    secret_key: str = "spirit-tours-super-secret-key-2024"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Password Requirements
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_symbols: bool = True
    
    # 2FA Configuration
    totp_issuer: str = "Spirit Tours"
    totp_valid_window: int = 1
    backup_codes_count: int = 10
    
    # ============================
    # CORS CONFIGURATION
    # ============================
    allowed_origins: List[str] = ["http://localhost:3000", "https://localhost:3000"]
    allowed_methods: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    allowed_headers: List[str] = ["*"]
    allow_credentials: bool = True
    
    # ============================
    # AI AGENTS CONFIGURATION
    # ============================
    # OpenAI Configuration
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4"
    openai_max_tokens: int = 2000
    openai_temperature: float = 0.7
    
    # Anthropic Configuration
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-3-sonnet-20240229"
    
    # AI Rate Limiting
    ai_requests_per_minute: int = 60
    ai_requests_per_hour: int = 1000
    ai_requests_per_day: int = 10000
    
    # ============================
    # BUSINESS CONFIGURATION
    # ============================
    # Default Business Settings
    default_currency: str = "EUR"
    default_language: str = "es"
    default_country: str = "España"
    default_timezone: str = "Europe/Madrid"
    
    # B2B Configuration
    default_commission_rate: float = 0.10  # 10%
    max_tour_operators: int = 100
    max_agencies_per_operator: int = 50
    max_agents_per_agency: int = 20
    
    # Payment Configuration
    payment_timeout_minutes: int = 30
    booking_hold_minutes: int = 15
    default_payment_terms_days: int = 30
    
    # ============================
    # EXTERNAL INTEGRATIONS
    # ============================
    # Email Configuration (SMTP)
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    email_from: str = "noreply@spirittours.com"
    
    # SMS Configuration (Twilio or similar)
    sms_provider: str = "twilio"
    sms_api_key: Optional[str] = None
    sms_api_secret: Optional[str] = None
    sms_from_number: Optional[str] = None
    
    # ============================
    # 3CX PBX CONFIGURATION
    # ============================
    PBX_3CX_SERVER_URL: Optional[str] = None
    PBX_3CX_USERNAME: Optional[str] = None
    PBX_3CX_PASSWORD: Optional[str] = None
    PBX_3CX_PORT: int = 5060
    PBX_3CX_WS_PORT: int = 5065
    PBX_3CX_API_PORT: int = 5001
    PBX_3CX_TENANT: Optional[str] = None
    PBX_3CX_EXTENSION: Optional[str] = None
    
    # ============================
    # SOCIAL MEDIA PLATFORMS CONFIGURATION
    # ============================
    # WhatsApp Business API
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    WHATSAPP_WEBHOOK_SECRET: Optional[str] = None
    
    # Facebook Messenger
    FACEBOOK_PAGE_ACCESS_TOKEN: Optional[str] = None
    FACEBOOK_VERIFY_TOKEN: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    FACEBOOK_PAGE_ID: Optional[str] = None
    
    # Instagram Direct
    INSTAGRAM_ACCESS_TOKEN: Optional[str] = None
    INSTAGRAM_ACCOUNT_ID: Optional[str] = None
    
    # TikTok Business API
    TIKTOK_ACCESS_TOKEN: Optional[str] = None
    TIKTOK_APP_ID: Optional[str] = None
    TIKTOK_APP_SECRET: Optional[str] = None
    
    # Twitter API v2
    TWITTER_BEARER_TOKEN: Optional[str] = None
    TWITTER_API_KEY: Optional[str] = None
    TWITTER_API_SECRET: Optional[str] = None
    TWITTER_ACCESS_TOKEN: Optional[str] = None
    TWITTER_ACCESS_TOKEN_SECRET: Optional[str] = None
    
    # LinkedIn API
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_ACCESS_TOKEN: Optional[str] = None
    
    # Payment Gateway Configuration
    stripe_public_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None
    paypal_mode: str = "sandbox"  # sandbox or live
    
    # ============================
    # REDIS CONFIGURATION
    # ============================
    redis_url: str = "redis://localhost:6379"
    redis_password: Optional[str] = None
    redis_db: int = 0
    
    # ============================
    # FILE STORAGE CONFIGURATION
    # ============================
    # Local Storage
    upload_path: str = "./uploads"
    max_file_size_mb: int = 10
    allowed_file_types: List[str] = ["jpg", "jpeg", "png", "pdf", "doc", "docx"]
    
    # Cloud Storage (S3 or similar)
    cloud_storage_enabled: bool = False
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_bucket_name: Optional[str] = None
    aws_region: str = "eu-west-1"
    
    # ============================
    # MONITORING AND LOGGING
    # ============================
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    enable_file_logging: bool = True
    log_file_path: str = "./logs/spirittours.log"
    log_max_bytes: int = 10485760  # 10MB
    log_backup_count: int = 5
    
    # Sentry Configuration
    sentry_dsn: Optional[str] = None
    sentry_environment: str = "development"
    
    # Metrics and Analytics
    enable_metrics: bool = True
    metrics_retention_days: int = 90
    
    # ============================
    # API CONFIGURATION
    # ============================
    api_rate_limit_per_minute: int = 100
    api_rate_limit_per_hour: int = 1000
    api_docs_url: str = "/docs"
    api_redoc_url: str = "/redoc"
    
    # ============================
    # BUSINESS RULES
    # ============================
    # Booking Rules
    min_booking_advance_hours: int = 24
    max_booking_advance_days: int = 365
    default_cancellation_hours: int = 48
    
    # Customer Rules
    max_participants_per_booking: int = 20
    loyalty_tiers: Dict[str, Dict[str, Any]] = {
        "bronze": {"min_bookings": 0, "discount": 0.0},
        "silver": {"min_bookings": 5, "discount": 0.05},
        "gold": {"min_bookings": 15, "discount": 0.10},
        "platinum": {"min_bookings": 30, "discount": 0.15}
    }
    
    # ============================
    # VALIDATORS
    # ============================
    @validator('allowed_origins', pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    @validator('environment')
    def validate_environment(cls, v):
        allowed_envs = ['development', 'testing', 'staging', 'production']
        if v not in allowed_envs:
            raise ValueError(f'Environment must be one of: {allowed_envs}')
        return v
    
    @validator('default_commission_rate')
    def validate_commission_rate(cls, v):
        if not (0.0 <= v <= 1.0):
            raise ValueError('Commission rate must be between 0.0 and 1.0')
        return v
    
    # Pydantic v2 configuration (replaces old Config class)
    # Note: model_config was already added at class level for extra='allow'
    # The old Config class has been removed to avoid conflicts

class DevelopmentSettings(Settings):
    """Development environment settings"""
    environment: str = "development"
    debug: bool = True
    log_level: str = "DEBUG"
    db_echo: bool = True

class ProductionSettings(Settings):
    """Production environment settings"""
    environment: str = "production" 
    debug: bool = False
    log_level: str = "INFO"
    db_echo: bool = False
    
    # Production security
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_symbols: bool = True
    password_min_length: int = 12

class TestingSettings(Settings):
    """Testing environment settings"""
    environment: str = "testing"
    database_url: str = "sqlite:///./test_spirittours.db"
    debug: bool = True
    log_level: str = "DEBUG"

# Settings factory
@lru_cache()
def get_settings() -> Settings:
    """Get settings instance based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()

# Create global settings instance
settings = get_settings()

# Export commonly used settings
DATABASE_URL = settings.database_url
SECRET_KEY = settings.secret_key
ENVIRONMENT = settings.environment
DEBUG = settings.debug

# Business configuration shortcuts
class BusinessConfig:
    """Business configuration shortcuts"""
    
    # Commission rates by customer type
    B2C_COMMISSION = 0.0  # No commission for direct customers
    B2B_TOUR_OPERATOR_COMMISSION = settings.default_commission_rate
    B2B_TRAVEL_AGENCY_COMMISSION = settings.default_commission_rate * 0.8  # 80% of operator rate
    
    # Payment terms by customer type
    B2C_PAYMENT_TERMS = 0  # Immediate payment
    B2B_PAYMENT_TERMS = settings.default_payment_terms_days
    
    # Booking limits
    MAX_PARTICIPANTS = settings.max_participants_per_booking
    MIN_ADVANCE_HOURS = settings.min_booking_advance_hours
    MAX_ADVANCE_DAYS = settings.max_booking_advance_days
    
    # Loyalty configuration
    LOYALTY_TIERS = settings.loyalty_tiers

# Create business config instance
business_config = BusinessConfig()

__all__ = [
    'Settings',
    'DevelopmentSettings', 
    'ProductionSettings',
    'TestingSettings',
    'get_settings',
    'settings',
    'business_config',
    'DATABASE_URL',
    'SECRET_KEY',
    'ENVIRONMENT',
    'DEBUG'
]