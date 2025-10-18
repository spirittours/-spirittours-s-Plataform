"""
Configuration API
API REST para configuración completa del sistema desde el dashboard

Endpoints para:
- SMTP configuration
- AI provider configuration
- Configuration wizard
- Testing connections
- System status
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from backend.models.system_configuration_models import (
    SMTPConfigCreate, SMTPConfigUpdate, SMTPConfigResponse,
    AIProviderConfigCreate, AIProviderConfigUpdate, AIProviderConfigResponse,
    WizardProgressResponse, TestConnectionRequest, TestConnectionResponse,
    ConfigurationCategory, AIProvider, WizardStep
)
from backend.models.rbac_models import User
from backend.services.configuration_service import ConfigurationService

router = APIRouter(prefix="/api/configuration", tags=["System Configuration"])

# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_db():
    """Dependency para obtener sesión de base de datos"""
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user() -> User:
    """Dependency para obtener usuario actual"""
    # TODO: Implementar autenticación JWT
    pass

def get_configuration_service(db: Session = Depends(get_db)) -> ConfigurationService:
    """Dependency para obtener servicio de configuración"""
    return ConfigurationService(db)

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class SystemStatusResponse(BaseModel):
    """Estado general del sistema"""
    smtp: Dict[str, Any]
    ai_providers: Dict[str, Any]
    wizard_completed: bool

class ProviderTemplatesResponse(BaseModel):
    """Templates de proveedores de IA"""
    providers: Dict[str, Any]

# ============================================================================
# SYSTEM STATUS ENDPOINTS
# ============================================================================

@router.get("/status", response_model=SystemStatusResponse)
async def get_system_status(
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el estado general de configuración del sistema
    
    Returns:
        Estado de SMTP, AI providers, y wizard
    """
    # TODO: Check admin permission
    status = service.get_system_status()
    return SystemStatusResponse(**status)

@router.get("/ai-providers/templates", response_model=ProviderTemplatesResponse)
async def get_ai_provider_templates(
    service: ConfigurationService = Depends(get_configuration_service)
):
    """
    Obtiene templates de configuración para proveedores de IA
    
    Returns:
        Templates con configuración predeterminada para cada proveedor
    """
    templates = service.get_provider_templates()
    return ProviderTemplatesResponse(providers=templates)

# ============================================================================
# SMTP CONFIGURATION ENDPOINTS
# ============================================================================

@router.post("/smtp", response_model=SMTPConfigResponse, status_code=201)
async def create_smtp_config(
    config_data: SMTPConfigCreate,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nueva configuración SMTP
    
    Admin only: Configura servidor SMTP para envío de emails
    """
    # TODO: Check admin permission
    
    try:
        config = service.create_smtp_config(
            name=config_data.name,
            host=config_data.host,
            port=config_data.port,
            username=config_data.username,
            password=config_data.password,
            from_email=config_data.from_email,
            from_name=config_data.from_name,
            reply_to_email=config_data.reply_to_email,
            use_tls=config_data.use_tls,
            use_ssl=config_data.use_ssl,
            max_emails_per_hour=config_data.max_emails_per_hour,
            max_emails_per_day=config_data.max_emails_per_day
        )
        
        return SMTPConfigResponse(
            id=str(config.id),
            name=config.name,
            host=config.host,
            port=config.port,
            username=config.username,
            password="***hidden***",  # Never return password
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            from_email=config.from_email,
            from_name=config.from_name,
            reply_to_email=config.reply_to_email,
            max_emails_per_hour=config.max_emails_per_hour,
            max_emails_per_day=config.max_emails_per_day,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/smtp", response_model=List[SMTPConfigResponse])
async def list_smtp_configs(
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas las configuraciones SMTP
    
    Admin only: Ver todas las configuraciones SMTP
    """
    # TODO: Check admin permission
    
    configs = service.list_smtp_configs()
    
    return [
        SMTPConfigResponse(
            id=str(config.id),
            name=config.name,
            host=config.host,
            port=config.port,
            username=config.username,
            password="***hidden***",
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            from_email=config.from_email,
            from_name=config.from_name,
            reply_to_email=config.reply_to_email,
            max_emails_per_hour=config.max_emails_per_hour,
            max_emails_per_day=config.max_emails_per_day,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
        for config in configs
    ]

@router.get("/smtp/{config_id}", response_model=SMTPConfigResponse)
async def get_smtp_config(
    config_id: str,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene una configuración SMTP específica
    
    Args:
        config_id: ID de la configuración
    """
    # TODO: Check admin permission
    
    try:
        config_uuid = uuid.UUID(config_id)
        config = service.get_smtp_config(config_uuid)
        
        if not config:
            raise HTTPException(status_code=404, detail="SMTP configuration not found")
        
        return SMTPConfigResponse(
            id=str(config.id),
            name=config.name,
            host=config.host,
            port=config.port,
            username=config.username,
            password="***hidden***",
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            from_email=config.from_email,
            from_name=config.from_name,
            reply_to_email=config.reply_to_email,
            max_emails_per_hour=config.max_emails_per_hour,
            max_emails_per_day=config.max_emails_per_day,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID format")

@router.put("/smtp/{config_id}", response_model=SMTPConfigResponse)
async def update_smtp_config(
    config_id: str,
    config_data: SMTPConfigUpdate,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza una configuración SMTP
    
    Admin only: Actualizar configuración existente
    """
    # TODO: Check admin permission
    
    try:
        config_uuid = uuid.UUID(config_id)
        updates = config_data.dict(exclude_unset=True)
        
        config = service.update_smtp_config(config_uuid, **updates)
        
        return SMTPConfigResponse(
            id=str(config.id),
            name=config.name,
            host=config.host,
            port=config.port,
            username=config.username,
            password="***hidden***",
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            from_email=config.from_email,
            from_name=config.from_name,
            reply_to_email=config.reply_to_email,
            max_emails_per_hour=config.max_emails_per_hour,
            max_emails_per_day=config.max_emails_per_day,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/smtp/{config_id}/test", response_model=TestConnectionResponse)
async def test_smtp_config(
    config_id: str,
    test_request: TestConnectionRequest,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Prueba una configuración SMTP
    
    Args:
        config_id: ID de la configuración
        test_request: Email de prueba opcional
    
    Returns:
        Resultado del test
    """
    # TODO: Check admin permission
    
    try:
        config_uuid = uuid.UUID(config_id)
        result = service.test_smtp_connection(config_uuid, test_request.test_email)
        
        return TestConnectionResponse(
            success=result['success'],
            message=result['message'],
            details=result['details'],
            timestamp=datetime.now()
        )
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID format")

@router.delete("/smtp/{config_id}")
async def delete_smtp_config(
    config_id: str,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina una configuración SMTP
    
    Admin only: Eliminar configuración
    """
    # TODO: Check admin permission
    
    try:
        config_uuid = uuid.UUID(config_id)
        service.delete_smtp_config(config_uuid)
        
        return JSONResponse(
            status_code=200,
            content={"message": "SMTP configuration deleted successfully"}
        )
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID format")

# ============================================================================
# AI PROVIDER CONFIGURATION ENDPOINTS
# ============================================================================

@router.post("/ai-providers", response_model=AIProviderConfigResponse, status_code=201)
async def create_ai_provider_config(
    config_data: AIProviderConfigCreate,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nueva configuración de proveedor de IA
    
    Admin only: Configura proveedor de IA (OpenAI, Gemini, Grok, etc.)
    """
    # TODO: Check admin permission
    
    try:
        config = service.create_ai_provider_config(
            provider=config_data.provider,
            name=config_data.name,
            api_key=config_data.api_key,
            default_model=config_data.default_model,
            description=config_data.description,
            api_endpoint=config_data.api_endpoint,
            organization_id=config_data.organization_id,
            project_id=config_data.project_id,
            available_models=config_data.available_models,
            model_settings=config_data.model_settings,
            max_tokens_per_request=config_data.max_tokens_per_request,
            max_requests_per_minute=config_data.max_requests_per_minute,
            monthly_budget_usd=config_data.monthly_budget_usd,
            supports_streaming=config_data.supports_streaming,
            supports_functions=config_data.supports_functions,
            supports_vision=config_data.supports_vision,
            supports_audio=config_data.supports_audio,
            priority=config_data.priority
        )
        
        return AIProviderConfigResponse(
            id=str(config.id),
            provider=config.provider.value,
            name=config.name,
            description=config.description,
            api_endpoint=config.api_endpoint,
            organization_id=config.organization_id,
            default_model=config.default_model,
            available_models=config.available_models,
            model_settings=config.model_settings,
            max_tokens_per_request=config.max_tokens_per_request,
            max_requests_per_minute=config.max_requests_per_minute,
            monthly_budget_usd=config.monthly_budget_usd,
            supports_streaming=config.supports_streaming,
            supports_functions=config.supports_functions,
            supports_vision=config.supports_vision,
            supports_audio=config.supports_audio,
            priority=config.priority,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            total_requests=config.total_requests,
            total_tokens_used=config.total_tokens_used,
            estimated_cost_usd=config.estimated_cost_usd,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/ai-providers", response_model=List[AIProviderConfigResponse])
async def list_ai_provider_configs(
    provider: Optional[str] = None,
    active_only: bool = False,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Lista configuraciones de proveedores de IA
    
    Args:
        provider: Filtrar por proveedor específico
        active_only: Solo proveedores activos
    """
    # TODO: Check admin permission
    
    configs = service.list_ai_provider_configs(provider, active_only)
    
    return [
        AIProviderConfigResponse(
            id=str(config.id),
            provider=config.provider.value,
            name=config.name,
            description=config.description,
            api_endpoint=config.api_endpoint,
            organization_id=config.organization_id,
            default_model=config.default_model,
            available_models=config.available_models,
            model_settings=config.model_settings,
            max_tokens_per_request=config.max_tokens_per_request,
            max_requests_per_minute=config.max_requests_per_minute,
            monthly_budget_usd=config.monthly_budget_usd,
            supports_streaming=config.supports_streaming,
            supports_functions=config.supports_functions,
            supports_vision=config.supports_vision,
            supports_audio=config.supports_audio,
            priority=config.priority,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            total_requests=config.total_requests,
            total_tokens_used=config.total_tokens_used,
            estimated_cost_usd=config.estimated_cost_usd,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
        for config in configs
    ]

@router.put("/ai-providers/{config_id}", response_model=AIProviderConfigResponse)
async def update_ai_provider_config(
    config_id: str,
    config_data: AIProviderConfigUpdate,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza una configuración de proveedor de IA
    """
    # TODO: Check admin permission
    
    try:
        config_uuid = uuid.UUID(config_id)
        updates = config_data.dict(exclude_unset=True)
        
        config = service.update_ai_provider_config(config_uuid, **updates)
        
        return AIProviderConfigResponse(
            id=str(config.id),
            provider=config.provider.value,
            name=config.name,
            description=config.description,
            api_endpoint=config.api_endpoint,
            organization_id=config.organization_id,
            default_model=config.default_model,
            available_models=config.available_models,
            model_settings=config.model_settings,
            max_tokens_per_request=config.max_tokens_per_request,
            max_requests_per_minute=config.max_requests_per_minute,
            monthly_budget_usd=config.monthly_budget_usd,
            supports_streaming=config.supports_streaming,
            supports_functions=config.supports_functions,
            supports_vision=config.supports_vision,
            supports_audio=config.supports_audio,
            priority=config.priority,
            is_active=config.is_active,
            is_default=config.is_default,
            status=config.status.value,
            last_test_result=config.last_test_result,
            total_requests=config.total_requests,
            total_tokens_used=config.total_tokens_used,
            estimated_cost_usd=config.estimated_cost_usd,
            created_at=config.created_at,
            updated_at=config.updated_at
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ai-providers/{config_id}/test", response_model=TestConnectionResponse)
async def test_ai_provider_config(
    config_id: str,
    test_request: TestConnectionRequest,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Prueba una configuración de proveedor de IA
    """
    # TODO: Check admin permission
    
    try:
        config_uuid = uuid.UUID(config_id)
        test_prompt = test_request.test_prompt or "Hello, this is a test. Please respond with 'Test successful.'"
        
        result = service.test_ai_provider_connection(config_uuid, test_prompt)
        
        return TestConnectionResponse(
            success=result['success'],
            message=result['message'],
            details=result['details'],
            timestamp=datetime.now()
        )
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid config ID format")

# ============================================================================
# CONFIGURATION WIZARD ENDPOINTS
# ============================================================================

@router.get("/wizard/progress", response_model=WizardProgressResponse)
async def get_wizard_progress(
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el progreso actual del wizard de configuración
    """
    progress = service.get_wizard_progress(current_user.id)
    
    return WizardProgressResponse(
        id=str(progress.id),
        current_step=progress.current_step.value,
        completed_steps=progress.completed_steps,
        is_completed=progress.is_completed,
        smtp_configured=progress.smtp_configured,
        ai_provider_configured=progress.ai_provider_configured,
        storage_configured=progress.storage_configured,
        initial_content_created=progress.initial_content_created,
        started_at=progress.started_at,
        completed_at=progress.completed_at
    )

@router.post("/wizard/step")
async def update_wizard_step(
    step: str,
    step_data: Optional[Dict[str, Any]] = None,
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza el paso actual del wizard
    
    Args:
        step: Paso del wizard (welcome, smtp_config, ai_provider_config, etc.)
        step_data: Datos del paso actual
    """
    try:
        wizard_step = WizardStep(step)
        progress = service.update_wizard_step(current_user.id, wizard_step, step_data)
        
        return WizardProgressResponse(
            id=str(progress.id),
            current_step=progress.current_step.value,
            completed_steps=progress.completed_steps,
            is_completed=progress.is_completed,
            smtp_configured=progress.smtp_configured,
            ai_provider_configured=progress.ai_provider_configured,
            storage_configured=progress.storage_configured,
            initial_content_created=progress.initial_content_created,
            started_at=progress.started_at,
            completed_at=progress.completed_at
        )
    
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid wizard step: {step}")

@router.get("/wizard/requirements")
async def check_wizard_requirements(
    service: ConfigurationService = Depends(get_configuration_service),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica los requisitos del wizard
    
    Returns:
        Estado de cada requisito para completar el wizard
    """
    requirements = service.check_wizard_requirements()
    return requirements

# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check para el servicio de configuración"""
    return {
        "status": "healthy",
        "service": "Configuration API",
        "version": "1.0.0"
    }
