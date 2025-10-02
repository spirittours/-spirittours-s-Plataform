"""
Plugin Marketplace API
Endpoints para el marketplace de plugins
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from ..services.plugin_marketplace_service import (
    plugin_marketplace_service,
    PluginType,
    PluginLicense
)
from ..auth import get_current_user, require_role

router = APIRouter(
    prefix="/api/v1/marketplace",
    tags=["Plugin Marketplace"],
    dependencies=[Depends(get_current_user)]
)

# Pydantic Models
class PluginInstallRequest(BaseModel):
    """Request para instalar un plugin"""
    plugin_id: str
    license_key: Optional[str] = None
    auto_update: bool = True

class PluginConfigRequest(BaseModel):
    """Request para configurar un plugin"""
    config: Dict[str, Any]

class PluginSearchRequest(BaseModel):
    """Request para buscar plugins"""
    query: Optional[str] = None
    plugin_type: Optional[str] = None
    license_type: Optional[str] = None
    categories: Optional[List[str]] = None
    max_price: Optional[float] = None
    min_rating: Optional[float] = None
    sort_by: str = "popularity"
    limit: int = 20

# Endpoints

@router.post("/search")
async def search_plugins(
    search_request: PluginSearchRequest,
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Buscar plugins en el marketplace
    """
    try:
        # Convert string types to enums
        plugin_type = None
        if search_request.plugin_type:
            try:
                plugin_type = PluginType[search_request.plugin_type.upper()]
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Invalid plugin type: {search_request.plugin_type}")
        
        license_type = None
        if search_request.license_type:
            try:
                license_type = PluginLicense[search_request.license_type.upper()]
            except KeyError:
                raise HTTPException(status_code=400, detail=f"Invalid license type: {search_request.license_type}")
        
        # Search plugins
        results = await plugin_marketplace_service.search_marketplace(
            query=search_request.query,
            plugin_type=plugin_type,
            license_type=license_type,
            categories=search_request.categories,
            max_price=search_request.max_price,
            min_rating=search_request.min_rating,
            sort_by=search_request.sort_by,
            limit=search_request.limit
        )
        
        return {
            "status": "success",
            "total": len(results),
            "plugins": [plugin.to_dict() for plugin in results]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/featured")
async def get_featured_plugins(
    limit: int = Query(10, description="Number of featured plugins to return"),
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener plugins destacados
    """
    try:
        # Get high-rated and popular plugins
        results = await plugin_marketplace_service.search_marketplace(
            min_rating=4.5,
            sort_by="popularity",
            limit=limit
        )
        
        return {
            "status": "success",
            "plugins": [plugin.to_dict() for plugin in results]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_plugin_categories(
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener todas las categorías de plugins disponibles
    """
    return {
        "plugin_types": [
            {
                "value": pt.value,
                "name": pt.name.replace("_", " ").title(),
                "description": {
                    "integration": "Integraciones con servicios externos",
                    "ai_agent": "Agentes de Inteligencia Artificial",
                    "payment_gateway": "Pasarelas de pago",
                    "analytics": "Análisis y reportes",
                    "communication": "Comunicación y mensajería",
                    "widget": "Widgets y componentes UI",
                    "theme": "Temas y personalización visual",
                    "automation": "Automatización de procesos"
                }.get(pt.value, pt.value)
            }
            for pt in PluginType
        ],
        "license_types": [
            {
                "value": pl.value,
                "name": pl.name.title(),
                "description": {
                    "free": "Gratis para siempre",
                    "freemium": "Gratis con opciones premium",
                    "paid": "Pago único",
                    "subscription": "Suscripción mensual/anual",
                    "enterprise": "Licencia empresarial"
                }.get(pl.value, pl.value)
            }
            for pl in PluginLicense
        ]
    }

@router.get("/plugin/{plugin_id}")
async def get_plugin_details(
    plugin_id: str,
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener detalles completos de un plugin
    """
    try:
        plugin = await plugin_marketplace_service.get_plugin_details(plugin_id)
        
        if not plugin:
            raise HTTPException(status_code=404, detail=f"Plugin {plugin_id} not found")
        
        # Check if installed
        installed_plugins = await plugin_marketplace_service.get_installed_plugins()
        is_installed = any(p["id"] == plugin_id for p in installed_plugins)
        
        plugin_dict = plugin.to_dict()
        plugin_dict["is_installed"] = is_installed
        
        # Get usage statistics if installed
        if is_installed:
            stats = await plugin_marketplace_service.get_plugin_statistics(plugin_id)
            plugin_dict["statistics"] = stats
        
        return {
            "status": "success",
            "plugin": plugin_dict
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/install")
async def install_plugin(
    install_request: PluginInstallRequest,
    current_user=Depends(require_role(["admin"]))
):
    """
    Instalar un plugin desde el marketplace
    """
    try:
        result = await plugin_marketplace_service.install_plugin(
            plugin_id=install_request.plugin_id,
            license_key=install_request.license_key,
            auto_update=install_request.auto_update
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Installation failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/plugin/{plugin_id}")
async def uninstall_plugin(
    plugin_id: str,
    current_user=Depends(require_role(["admin"]))
):
    """
    Desinstalar un plugin
    """
    try:
        result = await plugin_marketplace_service.uninstall_plugin(plugin_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Uninstallation failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/plugin/{plugin_id}/update")
async def update_plugin(
    plugin_id: str,
    current_user=Depends(require_role(["admin"]))
):
    """
    Actualizar un plugin instalado
    """
    try:
        result = await plugin_marketplace_service.update_plugin(plugin_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Update failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plugin/{plugin_id}/toggle")
async def toggle_plugin(
    plugin_id: str,
    current_user=Depends(require_role(["admin"]))
):
    """
    Activar/desactivar un plugin instalado
    """
    try:
        result = await plugin_marketplace_service.toggle_plugin(plugin_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Toggle failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/plugin/{plugin_id}/configure")
async def configure_plugin(
    plugin_id: str,
    config_request: PluginConfigRequest,
    current_user=Depends(require_role(["admin"]))
):
    """
    Configurar un plugin instalado
    """
    try:
        result = await plugin_marketplace_service.configure_plugin(
            plugin_id=plugin_id,
            config=config_request.config
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Configuration failed"))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/installed")
async def get_installed_plugins(
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener lista de plugins instalados
    """
    try:
        plugins = await plugin_marketplace_service.get_installed_plugins()
        
        return {
            "status": "success",
            "total": len(plugins),
            "plugins": plugins
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/updates")
async def check_plugin_updates(
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Verificar actualizaciones disponibles
    """
    try:
        updates = await plugin_marketplace_service.check_updates()
        
        return {
            "status": "success",
            "total_updates": len(updates),
            "updates": updates
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-update")
async def auto_update_plugins(
    current_user=Depends(require_role(["admin"]))
):
    """
    Actualizar automáticamente plugins con auto-update habilitado
    """
    try:
        result = await plugin_marketplace_service.auto_update_plugins()
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommendations")
async def get_plugin_recommendations(
    based_on_installed: bool = Query(True, description="Base recommendations on installed plugins"),
    limit: int = Query(5, description="Number of recommendations"),
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener recomendaciones de plugins
    """
    try:
        recommendations = await plugin_marketplace_service.get_recommendations(
            based_on_installed=based_on_installed,
            limit=limit
        )
        
        return {
            "status": "success",
            "total": len(recommendations),
            "recommendations": [plugin.to_dict() for plugin in recommendations]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plugin/{plugin_id}/statistics")
async def get_plugin_statistics(
    plugin_id: str,
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener estadísticas de uso de un plugin instalado
    """
    try:
        # Check if plugin is installed
        installed_plugins = await plugin_marketplace_service.get_installed_plugins()
        if not any(p["id"] == plugin_id for p in installed_plugins):
            raise HTTPException(status_code=404, detail="Plugin not installed")
        
        stats = await plugin_marketplace_service.get_plugin_statistics(plugin_id)
        
        return {
            "status": "success",
            "statistics": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trending")
async def get_trending_plugins(
    period: str = Query("week", description="Period: today, week, month"),
    limit: int = Query(10, description="Number of plugins"),
    current_user=Depends(require_role(["admin", "operator"]))
):
    """
    Obtener plugins en tendencia
    """
    try:
        # Get plugins sorted by recent downloads/activity
        results = await plugin_marketplace_service.search_marketplace(
            sort_by="popularity",
            limit=limit
        )
        
        return {
            "status": "success",
            "period": period,
            "plugins": [plugin.to_dict() for plugin in results]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))