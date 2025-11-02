"""
Module Configuration API
Endpoints para gestión dinámica de módulos
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from services.module_configuration_service import (
    module_configuration_service,
    ModuleCategory,
    ModuleStatus,
    ModuleConfig
)
from auth import get_current_user, require_role

router = APIRouter(
    prefix="/api/v1/modules",
    tags=["Module Configuration"],
    dependencies=[Depends(get_current_user)]
)

# Pydantic Models
class ModuleSettingsUpdate(BaseModel):
    """Modelo para actualización de configuración de módulo"""
    enabled: Optional[bool] = None
    settings: Dict[str, Any] = Field(default_factory=dict)
    
class ModuleCreateRequest(BaseModel):
    """Modelo para crear módulo personalizado"""
    id: str
    name: str
    description: str
    category: str = "experimental"
    settings: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)
    permissions_required: List[str] = Field(default_factory=list)
    resource_usage: Dict[str, float] = Field(default_factory=dict)

class ModuleResponse(BaseModel):
    """Respuesta de módulo"""
    id: str
    name: str
    description: str
    category: str
    status: str
    version: str
    enabled: bool
    settings: Dict[str, Any]
    dependencies: List[str]
    permissions_required: List[str]
    resource_usage: Dict[str, float]
    last_updated: str
    created_at: str
    health_status: Optional[Dict] = None
    statistics: Optional[Dict] = None

# Endpoints

@router.get("/", response_model=List[ModuleResponse])
async def get_all_modules(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    enabled: Optional[bool] = Query(None, description="Filter by enabled state"),
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener todos los módulos configurables del sistema
    """
    try:
        # Get modules
        modules = await module_configuration_service.get_all_modules()
        
        # Apply filters
        if category:
            modules = [m for m in modules if m.category.value == category]
        if status:
            modules = [m for m in modules if m.status.value == status]
        if enabled is not None:
            modules = [m for m in modules if m.enabled == enabled]
        
        # Convert to response format
        response = []
        for module in modules:
            module_dict = module.to_dict()
            
            # Add health status
            health = await module_configuration_service.get_module_health(module.id)
            module_dict["health_status"] = health
            
            response.append(ModuleResponse(**module_dict))
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_module_categories(
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener todas las categorías de módulos disponibles
    """
    return {
        "categories": [
            {
                "value": cat.value,
                "name": cat.name.replace("_", " ").title(),
                "description": {
                    "ai_agents": "Agentes de Inteligencia Artificial",
                    "payment": "Sistemas de Pago y Facturación",
                    "communication": "Canales de Comunicación",
                    "booking": "Sistema de Reservas",
                    "analytics": "Análisis y Reportes",
                    "security": "Seguridad y Protección",
                    "integration": "Integraciones Externas",
                    "marketing": "Marketing y Promociones",
                    "support": "Soporte al Cliente",
                    "experimental": "Funciones Experimentales"
                }.get(cat.value, cat.value)
            }
            for cat in ModuleCategory
        ]
    }

@router.get("/resource-usage")
async def get_resource_usage(
    current_user=Depends(require_role(["admin"]))
):
    """
    Obtener uso total de recursos del sistema
    """
    try:
        usage = await module_configuration_service.get_resource_usage()
        
        # Add system limits
        usage["limits"] = {
            "cpu_percent": 100,
            "memory_mb": 32768,  # 32GB
            "storage_gb": 1000    # 1TB
        }
        
        # Calculate percentages
        usage["usage_percentages"] = {
            "cpu": (usage["cpu_percent"] / usage["limits"]["cpu_percent"]) * 100,
            "memory": (usage["memory_mb"] / usage["limits"]["memory_mb"]) * 100,
            "storage": (usage["storage_gb"] / usage["limits"]["storage_gb"]) * 100
        }
        
        # Add recommendations
        if usage["cpu_percent"] > 80:
            usage["warnings"] = usage.get("warnings", [])
            usage["warnings"].append("CPU usage is high. Consider disabling non-essential modules.")
        
        if usage["memory_mb"] > 28000:
            usage["warnings"] = usage.get("warnings", [])
            usage["warnings"].append("Memory usage is critical. System may become unstable.")
        
        return usage
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{module_id}", response_model=ModuleResponse)
async def get_module(
    module_id: str,
    include_statistics: bool = Query(False, description="Include usage statistics"),
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener información detallada de un módulo específico
    """
    try:
        module = await module_configuration_service.get_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        module_dict = module.to_dict()
        
        # Add health status
        health = await module_configuration_service.get_module_health(module_id)
        module_dict["health_status"] = health
        
        # Add statistics if requested
        if include_statistics:
            stats = await module_configuration_service.get_module_statistics(module_id)
            module_dict["statistics"] = stats
        
        return ModuleResponse(**module_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{module_id}/settings")
async def update_module_settings(
    module_id: str,
    settings_update: ModuleSettingsUpdate,
    current_user=Depends(require_role(["admin"]))
):
    """
    Actualizar configuración de un módulo
    """
    try:
        # Prepare update data
        update_data = {}
        if settings_update.enabled is not None:
            update_data["enabled"] = settings_update.enabled
        update_data.update(settings_update.settings)
        
        # Update module
        success = await module_configuration_service.update_module_settings(
            module_id, update_data
        )
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        # Get updated module
        module = await module_configuration_service.get_module(module_id)
        
        return {
            "status": "success",
            "message": f"Module {module_id} settings updated successfully",
            "module": module.to_dict()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{module_id}/toggle")
async def toggle_module(
    module_id: str,
    current_user=Depends(require_role(["admin"]))
):
    """
    Activar/desactivar un módulo rápidamente
    """
    try:
        success = await module_configuration_service.toggle_module(module_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        # Get updated module
        module = await module_configuration_service.get_module(module_id)
        
        return {
            "status": "success",
            "message": f"Module {module_id} toggled to {module.status.value}",
            "enabled": module.enabled,
            "module": module.to_dict()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{module_id}/dependencies")
async def get_module_dependencies(
    module_id: str,
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener dependencias y módulos dependientes
    """
    try:
        module = await module_configuration_service.get_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        # Get modules that depend on this one
        dependents = await module_configuration_service.get_dependent_modules(module_id)
        
        # Get dependency status
        dependencies_status = []
        for dep_id in module.dependencies:
            dep_module = await module_configuration_service.get_module(dep_id)
            if dep_module:
                dependencies_status.append({
                    "id": dep_id,
                    "name": dep_module.name,
                    "enabled": dep_module.enabled,
                    "status": dep_module.status.value
                })
        
        # Get dependent modules status
        dependents_status = []
        for dep_id in dependents:
            dep_module = await module_configuration_service.get_module(dep_id)
            if dep_module:
                dependents_status.append({
                    "id": dep_id,
                    "name": dep_module.name,
                    "enabled": dep_module.enabled,
                    "status": dep_module.status.value
                })
        
        return {
            "module_id": module_id,
            "dependencies": dependencies_status,
            "dependents": dependents_status,
            "can_disable": len(dependents_status) == 0,
            "dependencies_met": await module_configuration_service.check_dependencies(module_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{module_id}/health")
async def get_module_health(
    module_id: str,
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener estado de salud detallado de un módulo
    """
    try:
        health = await module_configuration_service.get_module_health(module_id)
        if not health:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        return health
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{module_id}/statistics")
async def get_module_statistics(
    module_id: str,
    period: str = Query("today", description="Period: today, week, month"),
    current_user=Depends(require_role(["admin", "operator", "analytics"]))
):
    """
    Obtener estadísticas de uso de un módulo
    """
    try:
        stats = await module_configuration_service.get_module_statistics(module_id)
        
        # Add period-specific data
        stats["period"] = period
        stats["generated_at"] = datetime.utcnow().isoformat()
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_configuration(
    current_user=Depends(require_role(["admin"]))
):
    """
    Exportar configuración completa del sistema
    """
    try:
        config = await module_configuration_service.export_configuration()
        
        return {
            "status": "success",
            "message": "Configuration exported successfully",
            "configuration": config
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_configuration(
    configuration: Dict[str, Any],
    current_user=Depends(require_role(["admin"]))
):
    """
    Importar configuración desde backup
    """
    try:
        success = await module_configuration_service.import_configuration(configuration)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to import configuration")
        
        return {
            "status": "success",
            "message": "Configuration imported successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom")
async def add_custom_module(
    module_request: ModuleCreateRequest,
    current_user=Depends(require_role(["admin"]))
):
    """
    Añadir módulo personalizado
    """
    try:
        # Create module config
        module_config = ModuleConfig(
            id=module_request.id,
            name=module_request.name,
            description=module_request.description,
            category=ModuleCategory[module_request.category.upper()],
            status=ModuleStatus.INACTIVE,
            version="1.0.0",
            enabled=False,
            settings=module_request.settings,
            dependencies=module_request.dependencies,
            permissions_required=module_request.permissions_required,
            resource_usage=module_request.resource_usage,
            last_updated=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        success = await module_configuration_service.add_custom_module(module_config)
        
        if not success:
            raise HTTPException(status_code=400, detail=f"Module {module_request.id} already exists")
        
        return {
            "status": "success",
            "message": f"Custom module {module_request.id} added successfully",
            "module": module_config.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{module_id}")
async def remove_module(
    module_id: str,
    current_user=Depends(require_role(["admin"]))
):
    """
    Eliminar módulo personalizado
    """
    try:
        success = await module_configuration_service.remove_custom_module(module_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        return {
            "status": "success",
            "message": f"Module {module_id} removed successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{module_id}/restart")
async def restart_module(
    module_id: str,
    current_user=Depends(require_role(["admin"]))
):
    """
    Reiniciar un módulo (desactivar y activar)
    """
    try:
        module = await module_configuration_service.get_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
        
        if not module.enabled:
            raise HTTPException(status_code=400, detail="Module is not enabled")
        
        # Disable
        await module_configuration_service.toggle_module(module_id)
        
        # Wait a moment
        import asyncio
        await asyncio.sleep(1)
        
        # Enable
        await module_configuration_service.toggle_module(module_id)
        
        return {
            "status": "success",
            "message": f"Module {module_id} restarted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))