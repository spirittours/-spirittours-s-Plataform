"""
System Configuration Models
Modelos para gestión completa de configuración del sistema desde el dashboard

Incluye:
- Configuración de SMTP para emails
- Configuración de múltiples proveedores de IA (OpenAI, Gemini, Grok, etc.)
- Configuración de servicios externos
- Settings generales del sistema
- Wizard de configuración inicial
"""

from typing import Optional, Dict, Any, List
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid
import enum
from pydantic import BaseModel, Field, validator
from .rbac_models import Base

# ============================================================================
# ENUMS
# ============================================================================

class ConfigurationCategory(enum.Enum):
    """Categorías de configuración"""
    SMTP = "smtp"                    # Configuración de email
    AI_PROVIDER = "ai_provider"      # Proveedores de IA
    STORAGE = "storage"              # S3, CloudFlare, etc.
    PAYMENT = "payment"              # Stripe, PayPal, etc.
    AUTHENTICATION = "authentication" # OAuth, SSO, etc.
    SYSTEM = "system"                # General system settings
    INTEGRATIONS = "integrations"    # APIs externas

class AIProvider(enum.Enum):
    """Proveedores de IA disponibles"""
    OPENAI = "openai"                # OpenAI GPT-4, GPT-3.5
    ANTHROPIC = "anthropic"          # Claude 3
    GOOGLE = "google"                # Gemini Pro, Gemini Ultra
    XAI = "xai"                      # Grok (X.AI)
    META = "meta"                    # Llama 3, Meta AI
    QWEN = "qwen"                    # Qwen (Alibaba Cloud)
    DEEPSEEK = "deepseek"            # DeepSeek
    MISTRAL = "mistral"              # Mistral AI
    COHERE = "cohere"                # Cohere
    LOCAL = "local"                  # Ollama, LM Studio

class ConfigurationStatus(enum.Enum):
    """Estado de la configuración"""
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    ACTIVE = "active"
    ERROR = "error"
    TESTING = "testing"

class WizardStep(enum.Enum):
    """Pasos del wizard de configuración"""
    WELCOME = "welcome"
    SMTP_CONFIG = "smtp_config"
    AI_PROVIDER_CONFIG = "ai_provider_config"
    STORAGE_CONFIG = "storage_config"
    SYSTEM_SETTINGS = "system_settings"
    INITIAL_CONTENT = "initial_content"
    TESTING = "testing"
    COMPLETE = "complete"

# ============================================================================
# DATABASE MODELS
# ============================================================================

class SystemConfiguration(Base):
    """Configuración general del sistema"""
    __tablename__ = 'system_configurations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(SQLEnum(ConfigurationCategory), nullable=False)
    key = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Configuration values
    value_encrypted = Column(Text)  # For sensitive data (passwords, API keys)
    value_plain = Column(Text)      # For non-sensitive data
    value_json = Column(JSONB)      # For complex configurations
    
    # Metadata
    is_required = Column(Boolean, default=False)
    is_sensitive = Column(Boolean, default=False)  # If true, encrypt value
    status = Column(SQLEnum(ConfigurationStatus), default=ConfigurationStatus.NOT_CONFIGURED)
    
    # Validation
    validation_rules = Column(JSONB)  # JSON with validation rules
    default_value = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_tested_at = Column(DateTime(timezone=True))
    
    # Foreign keys
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))

class SMTPConfiguration(Base):
    """Configuración específica de SMTP"""
    __tablename__ = 'smtp_configurations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic settings
    name = Column(String(100), nullable=False)  # e.g., "Production SMTP"
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False, default=587)
    username = Column(String(255), nullable=False)
    password_encrypted = Column(Text, nullable=False)
    
    # Security
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    
    # Sender info
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), default="Spirit Tours")
    reply_to_email = Column(String(255))
    
    # Limits and throttling
    max_emails_per_hour = Column(Integer, default=100)
    max_emails_per_day = Column(Integer, default=1000)
    
    # Status
    is_active = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    status = Column(SQLEnum(ConfigurationStatus), default=ConfigurationStatus.NOT_CONFIGURED)
    last_test_result = Column(JSONB)  # Store test results
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class AIProviderConfiguration(Base):
    """Configuración de proveedores de IA"""
    __tablename__ = 'ai_provider_configurations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Provider info
    provider = Column(SQLEnum(AIProvider), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "OpenAI Production"
    description = Column(Text)
    
    # API Configuration
    api_key_encrypted = Column(Text)
    api_endpoint = Column(String(500))  # Custom endpoint if needed
    organization_id = Column(String(255))  # For OpenAI, etc.
    project_id = Column(String(255))     # For Google Cloud, etc.
    
    # Model settings
    default_model = Column(String(100))  # e.g., "gpt-4", "gemini-pro"
    available_models = Column(JSONB)     # List of available models
    model_settings = Column(JSONB)       # Temperature, max_tokens, etc.
    
    # Usage limits
    max_tokens_per_request = Column(Integer, default=4000)
    max_requests_per_minute = Column(Integer, default=60)
    monthly_budget_usd = Column(Integer)  # Monthly spending limit
    
    # Features
    supports_streaming = Column(Boolean, default=True)
    supports_functions = Column(Boolean, default=False)
    supports_vision = Column(Boolean, default=False)
    supports_audio = Column(Boolean, default=False)
    
    # Priority and fallback
    priority = Column(Integer, default=0)  # Higher = preferred
    fallback_provider_id = Column(UUID(as_uuid=True), ForeignKey('ai_provider_configurations.id'))
    
    # Status
    is_active = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    status = Column(SQLEnum(ConfigurationStatus), default=ConfigurationStatus.NOT_CONFIGURED)
    last_test_result = Column(JSONB)
    
    # Usage tracking
    total_requests = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    estimated_cost_usd = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class ConfigurationWizardProgress(Base):
    """Progreso del wizard de configuración inicial"""
    __tablename__ = 'configuration_wizard_progress'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Wizard state
    current_step = Column(SQLEnum(WizardStep), default=WizardStep.WELCOME)
    completed_steps = Column(JSONB, default=[])  # List of completed steps
    is_completed = Column(Boolean, default=False)
    
    # Configuration status
    smtp_configured = Column(Boolean, default=False)
    ai_provider_configured = Column(Boolean, default=False)
    storage_configured = Column(Boolean, default=False)
    initial_content_created = Column(Boolean, default=False)
    
    # Wizard data (temporary storage)
    wizard_data = Column(JSONB, default={})
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # User
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))

class ConfigurationAuditLog(Base):
    """Audit log para cambios de configuración"""
    __tablename__ = 'configuration_audit_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # What changed
    configuration_key = Column(String(100), nullable=False)
    category = Column(SQLEnum(ConfigurationCategory), nullable=False)
    action = Column(String(50), nullable=False)  # created, updated, deleted, tested
    
    # Changes
    old_value = Column(JSONB)
    new_value = Column(JSONB)
    change_reason = Column(Text)
    
    # Who and when
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    user_name = Column(String(255))
    user_email = Column(String(255))
    ip_address = Column(String(50))
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class SMTPConfigBase(BaseModel):
    """Base para configuración SMTP"""
    name: str
    host: str
    port: int = 587
    username: str
    password: str
    use_tls: bool = True
    use_ssl: bool = False
    from_email: str
    from_name: str = "Spirit Tours"
    reply_to_email: Optional[str] = None
    max_emails_per_hour: int = 100
    max_emails_per_day: int = 1000

class SMTPConfigCreate(SMTPConfigBase):
    """Crear configuración SMTP"""
    pass

class SMTPConfigUpdate(BaseModel):
    """Actualizar configuración SMTP"""
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    reply_to_email: Optional[str] = None
    max_emails_per_hour: Optional[int] = None
    max_emails_per_day: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class SMTPConfigResponse(SMTPConfigBase):
    """Response de configuración SMTP (sin password)"""
    id: str
    is_active: bool
    is_default: bool
    status: str
    last_test_result: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AIProviderConfigBase(BaseModel):
    """Base para configuración de proveedor de IA"""
    provider: str
    name: str
    description: Optional[str] = None
    api_key: str
    api_endpoint: Optional[str] = None
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    default_model: str
    available_models: List[str] = []
    model_settings: Dict[str, Any] = {}
    max_tokens_per_request: int = 4000
    max_requests_per_minute: int = 60
    monthly_budget_usd: Optional[int] = None
    supports_streaming: bool = True
    supports_functions: bool = False
    supports_vision: bool = False
    supports_audio: bool = False
    priority: int = 0

class AIProviderConfigCreate(AIProviderConfigBase):
    """Crear configuración de proveedor IA"""
    pass

class AIProviderConfigUpdate(BaseModel):
    """Actualizar configuración de proveedor IA"""
    name: Optional[str] = None
    description: Optional[str] = None
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    default_model: Optional[str] = None
    available_models: Optional[List[str]] = None
    model_settings: Optional[Dict[str, Any]] = None
    max_tokens_per_request: Optional[int] = None
    max_requests_per_minute: Optional[int] = None
    monthly_budget_usd: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class AIProviderConfigResponse(BaseModel):
    """Response de configuración de proveedor IA (sin API key)"""
    id: str
    provider: str
    name: str
    description: Optional[str]
    api_endpoint: Optional[str]
    organization_id: Optional[str]
    default_model: str
    available_models: List[str]
    model_settings: Dict[str, Any]
    max_tokens_per_request: int
    max_requests_per_minute: int
    monthly_budget_usd: Optional[int]
    supports_streaming: bool
    supports_functions: bool
    supports_vision: bool
    supports_audio: bool
    priority: int
    is_active: bool
    is_default: bool
    status: str
    last_test_result: Optional[Dict[str, Any]]
    total_requests: int
    total_tokens_used: int
    estimated_cost_usd: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WizardProgressResponse(BaseModel):
    """Response de progreso del wizard"""
    id: str
    current_step: str
    completed_steps: List[str]
    is_completed: bool
    smtp_configured: bool
    ai_provider_configured: bool
    storage_configured: bool
    initial_content_created: bool
    started_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class TestConnectionRequest(BaseModel):
    """Request para probar conexión"""
    test_email: Optional[str] = None  # For SMTP test
    test_prompt: Optional[str] = None  # For AI provider test

class TestConnectionResponse(BaseModel):
    """Response de test de conexión"""
    success: bool
    message: str
    details: Dict[str, Any]
    timestamp: datetime

# ============================================================================
# AI PROVIDER TEMPLATES
# ============================================================================

AI_PROVIDER_TEMPLATES = {
    AIProvider.OPENAI: {
        'name': 'OpenAI',
        'description': 'GPT-4, GPT-3.5 Turbo',
        'api_endpoint': 'https://api.openai.com/v1',
        'default_model': 'gpt-4',
        'available_models': ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 2000,
            'top_p': 1.0,
            'frequency_penalty': 0.0,
            'presence_penalty': 0.0
        },
        'supports_streaming': True,
        'supports_functions': True,
        'supports_vision': True,
        'docs_url': 'https://platform.openai.com/docs'
    },
    
    AIProvider.GOOGLE: {
        'name': 'Google Gemini',
        'description': 'Gemini Pro, Gemini Ultra',
        'api_endpoint': 'https://generativelanguage.googleapis.com/v1beta',
        'default_model': 'gemini-pro',
        'available_models': ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'],
        'model_settings': {
            'temperature': 0.7,
            'top_p': 0.95,
            'top_k': 40,
            'max_output_tokens': 2048
        },
        'supports_streaming': True,
        'supports_functions': True,
        'supports_vision': True,
        'docs_url': 'https://ai.google.dev/docs'
    },
    
    AIProvider.ANTHROPIC: {
        'name': 'Anthropic Claude',
        'description': 'Claude 3 Opus, Sonnet, Haiku',
        'api_endpoint': 'https://api.anthropic.com/v1',
        'default_model': 'claude-3-opus-20240229',
        'available_models': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        'model_settings': {
            'temperature': 1.0,
            'max_tokens': 4096,
            'top_p': 1.0
        },
        'supports_streaming': True,
        'supports_functions': False,
        'supports_vision': True,
        'docs_url': 'https://docs.anthropic.com/claude/docs'
    },
    
    AIProvider.XAI: {
        'name': 'X.AI Grok',
        'description': 'Grok-1',
        'api_endpoint': 'https://api.x.ai/v1',
        'default_model': 'grok-1',
        'available_models': ['grok-1'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 2000
        },
        'supports_streaming': True,
        'supports_functions': False,
        'supports_vision': False,
        'docs_url': 'https://x.ai/api/docs'
    },
    
    AIProvider.META: {
        'name': 'Meta AI',
        'description': 'Llama 3, Llama 2',
        'api_endpoint': 'https://api.meta.ai/v1',
        'default_model': 'llama-3-70b',
        'available_models': ['llama-3-70b', 'llama-3-8b', 'llama-2-70b', 'llama-2-13b'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 2000,
            'top_p': 0.9
        },
        'supports_streaming': True,
        'supports_functions': False,
        'supports_vision': False,
        'docs_url': 'https://ai.meta.com/llama/docs'
    },
    
    AIProvider.QWEN: {
        'name': 'Qwen (Alibaba)',
        'description': 'Qwen-72B, Qwen-14B',
        'api_endpoint': 'https://dashscope.aliyuncs.com/api/v1',
        'default_model': 'qwen-72b-chat',
        'available_models': ['qwen-72b-chat', 'qwen-14b-chat', 'qwen-7b-chat'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 2000,
            'top_p': 0.9
        },
        'supports_streaming': True,
        'supports_functions': False,
        'supports_vision': False,
        'docs_url': 'https://help.aliyun.com/zh/dashscope/'
    },
    
    AIProvider.DEEPSEEK: {
        'name': 'DeepSeek',
        'description': 'DeepSeek-V2, DeepSeek-Coder',
        'api_endpoint': 'https://api.deepseek.com/v1',
        'default_model': 'deepseek-chat',
        'available_models': ['deepseek-chat', 'deepseek-coder'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 4000,
            'top_p': 0.95
        },
        'supports_streaming': True,
        'supports_functions': False,
        'supports_vision': False,
        'docs_url': 'https://platform.deepseek.com/docs'
    },
    
    AIProvider.MISTRAL: {
        'name': 'Mistral AI',
        'description': 'Mistral Large, Medium, Small',
        'api_endpoint': 'https://api.mistral.ai/v1',
        'default_model': 'mistral-large-latest',
        'available_models': ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 2000,
            'top_p': 1.0
        },
        'supports_streaming': True,
        'supports_functions': True,
        'supports_vision': False,
        'docs_url': 'https://docs.mistral.ai/'
    },
    
    AIProvider.COHERE: {
        'name': 'Cohere',
        'description': 'Command, Command Light',
        'api_endpoint': 'https://api.cohere.ai/v1',
        'default_model': 'command',
        'available_models': ['command', 'command-light', 'command-nightly'],
        'model_settings': {
            'temperature': 0.7,
            'max_tokens': 2000,
            'p': 0.75,
            'k': 0
        },
        'supports_streaming': True,
        'supports_functions': False,
        'supports_vision': False,
        'docs_url': 'https://docs.cohere.com/'
    }
}
