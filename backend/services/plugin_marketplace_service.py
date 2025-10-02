"""
Plugin Marketplace Service
Sistema de marketplace para módulos y plugins de terceros
"""

import json
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, asdict
import logging
import hashlib
import tempfile
import zipfile
import os

logger = logging.getLogger(__name__)

class PluginType(Enum):
    INTEGRATION = "integration"
    AI_AGENT = "ai_agent"
    PAYMENT_GATEWAY = "payment_gateway"
    ANALYTICS = "analytics"
    COMMUNICATION = "communication"
    WIDGET = "widget"
    THEME = "theme"
    AUTOMATION = "automation"

class PluginLicense(Enum):
    FREE = "free"
    FREEMIUM = "freemium"
    PAID = "paid"
    SUBSCRIPTION = "subscription"
    ENTERPRISE = "enterprise"

@dataclass
class MarketplacePlugin:
    """Plugin disponible en el marketplace"""
    id: str
    name: str
    description: str
    long_description: str
    vendor: str
    vendor_verified: bool
    version: str
    type: PluginType
    license: PluginLicense
    price: float
    currency: str
    rating: float
    reviews_count: int
    downloads: int
    categories: List[str]
    tags: List[str]
    requirements: Dict[str, Any]
    features: List[str]
    screenshots: List[str]
    icon_url: str
    documentation_url: str
    support_url: str
    repository_url: Optional[str]
    compatibility: Dict[str, str]
    size_mb: float
    last_updated: datetime
    created_at: datetime
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['type'] = self.type.value
        data['license'] = self.license.value
        data['last_updated'] = self.last_updated.isoformat()
        data['created_at'] = self.created_at.isoformat()
        return data

@dataclass
class InstalledPlugin:
    """Plugin instalado en el sistema"""
    plugin_id: str
    name: str
    version: str
    installed_at: datetime
    updated_at: datetime
    enabled: bool
    config: Dict[str, Any]
    license_key: Optional[str]
    auto_update: bool
    
class PluginMarketplaceService:
    """Servicio principal del marketplace de plugins"""
    
    def __init__(self):
        self.marketplace_url = "https://api.spirittours-plugins.com/v1"
        self.installed_plugins: Dict[str, InstalledPlugin] = {}
        self.marketplace_cache: Dict[str, MarketplacePlugin] = {}
        self.cache_expiry = timedelta(hours=6)
        self.last_cache_update = None
        self.session = None
        self.initialize_demo_plugins()
        
    def initialize_demo_plugins(self):
        """Inicializar plugins de demostración"""
        demo_plugins = [
            MarketplacePlugin(
                id="whatsapp_business_pro",
                name="WhatsApp Business Pro Integration",
                description="Integración avanzada con WhatsApp Business API",
                long_description="""
                Complete WhatsApp Business integration with advanced features:
                - Automated responses with AI
                - Multi-agent support
                - Media handling (images, videos, documents)
                - Template messages
                - Broadcast lists
                - Analytics and reporting
                """,
                vendor="Meta Partners",
                vendor_verified=True,
                version="2.5.0",
                type=PluginType.COMMUNICATION,
                license=PluginLicense.SUBSCRIPTION,
                price=49.99,
                currency="USD",
                rating=4.8,
                reviews_count=342,
                downloads=15678,
                categories=["communication", "customer_service"],
                tags=["whatsapp", "messaging", "business", "api", "automation"],
                requirements={
                    "min_version": "2.0.0",
                    "dependencies": ["websocket", "notification_system"],
                    "php_version": None,
                    "node_version": "14.0.0"
                },
                features=[
                    "AI-powered auto-responses",
                    "Multi-language support",
                    "Rich media messages",
                    "Customer segmentation",
                    "Conversation analytics"
                ],
                screenshots=[
                    "/images/plugins/whatsapp_1.png",
                    "/images/plugins/whatsapp_2.png"
                ],
                icon_url="/icons/whatsapp_business.svg",
                documentation_url="https://docs.example.com/whatsapp-business",
                support_url="https://support.example.com",
                repository_url="https://github.com/example/whatsapp-business",
                compatibility={
                    "spirit_tours": "2.0.0+",
                    "os": "linux,windows,macos"
                },
                size_mb=12.5,
                last_updated=datetime.utcnow(),
                created_at=datetime.utcnow() - timedelta(days=180)
            ),
            
            MarketplacePlugin(
                id="google_maps_advanced",
                name="Google Maps Advanced Integration",
                description="Integración completa con Google Maps y Places API",
                long_description="""
                Advanced Google Maps integration for tourism:
                - Interactive route planning
                - Real-time traffic updates
                - Places of interest
                - Street View integration
                - Offline maps support
                """,
                vendor="Google Cloud Partner",
                vendor_verified=True,
                version="3.1.0",
                type=PluginType.INTEGRATION,
                license=PluginLicense.FREEMIUM,
                price=0,
                currency="USD",
                rating=4.6,
                reviews_count=567,
                downloads=23456,
                categories=["maps", "navigation", "location"],
                tags=["google", "maps", "navigation", "places", "routes"],
                requirements={
                    "min_version": "1.5.0",
                    "dependencies": ["booking_system"],
                    "google_api_key": True
                },
                features=[
                    "Interactive maps",
                    "Route optimization",
                    "Places search",
                    "Traffic information",
                    "Offline capabilities"
                ],
                screenshots=[
                    "/images/plugins/gmaps_1.png",
                    "/images/plugins/gmaps_2.png"
                ],
                icon_url="/icons/google_maps.svg",
                documentation_url="https://docs.example.com/google-maps",
                support_url="https://support.example.com",
                repository_url=None,
                compatibility={
                    "spirit_tours": "1.5.0+",
                    "browser": "chrome,firefox,safari,edge"
                },
                size_mb=8.3,
                last_updated=datetime.utcnow() - timedelta(days=7),
                created_at=datetime.utcnow() - timedelta(days=365)
            ),
            
            MarketplacePlugin(
                id="ai_travel_assistant",
                name="AI Travel Assistant Pro",
                description="Asistente de viaje con IA conversacional avanzada",
                long_description="""
                Professional AI travel assistant powered by GPT-4:
                - Natural language understanding
                - Personalized recommendations
                - Multi-language support
                - Voice interaction
                - Learning from preferences
                """,
                vendor="AI Innovations Inc",
                vendor_verified=False,
                version="1.0.0",
                type=PluginType.AI_AGENT,
                license=PluginLicense.PAID,
                price=199.99,
                currency="USD",
                rating=4.9,
                reviews_count=128,
                downloads=4567,
                categories=["ai", "assistant", "automation"],
                tags=["ai", "gpt", "assistant", "nlp", "voice"],
                requirements={
                    "min_version": "2.0.0",
                    "dependencies": ["ai_orchestrator", "voice_service"],
                    "api_keys": ["openai", "elevenlabs"]
                },
                features=[
                    "GPT-4 powered conversations",
                    "Voice interaction",
                    "Context awareness",
                    "Preference learning",
                    "Proactive suggestions"
                ],
                screenshots=[
                    "/images/plugins/ai_assistant_1.png",
                    "/images/plugins/ai_assistant_2.png"
                ],
                icon_url="/icons/ai_assistant.svg",
                documentation_url="https://docs.example.com/ai-assistant",
                support_url="https://support.example.com",
                repository_url=None,
                compatibility={
                    "spirit_tours": "2.0.0+",
                    "min_ram": "4GB",
                    "gpu": "recommended"
                },
                size_mb=156.7,
                last_updated=datetime.utcnow() - timedelta(days=14),
                created_at=datetime.utcnow() - timedelta(days=60)
            ),
            
            MarketplacePlugin(
                id="stripe_advanced_payments",
                name="Stripe Advanced Payment Suite",
                description="Suite completa de pagos con Stripe",
                long_description="""
                Complete Stripe payment integration:
                - Multiple payment methods
                - Subscriptions management
                - Invoice generation
                - Tax calculation
                - Fraud prevention
                """,
                vendor="Stripe Official",
                vendor_verified=True,
                version="4.2.1",
                type=PluginType.PAYMENT_GATEWAY,
                license=PluginLicense.FREE,
                price=0,
                currency="USD",
                rating=4.7,
                reviews_count=892,
                downloads=45678,
                categories=["payments", "finance", "ecommerce"],
                tags=["stripe", "payments", "credit-card", "subscriptions"],
                requirements={
                    "min_version": "1.0.0",
                    "dependencies": ["checkout_system"],
                    "stripe_account": True
                },
                features=[
                    "PCI compliance",
                    "3D Secure authentication",
                    "Subscription billing",
                    "International payments",
                    "Fraud detection"
                ],
                screenshots=[
                    "/images/plugins/stripe_1.png",
                    "/images/plugins/stripe_2.png"
                ],
                icon_url="/icons/stripe.svg",
                documentation_url="https://stripe.com/docs",
                support_url="https://support.stripe.com",
                repository_url="https://github.com/stripe/stripe-node",
                compatibility={
                    "spirit_tours": "1.0.0+",
                    "ssl": "required"
                },
                size_mb=5.8,
                last_updated=datetime.utcnow() - timedelta(days=3),
                created_at=datetime.utcnow() - timedelta(days=500)
            ),
            
            MarketplacePlugin(
                id="analytics_dashboard_pro",
                name="Analytics Dashboard Pro",
                description="Dashboard analítico avanzado con BI integrado",
                long_description="""
                Professional analytics dashboard:
                - Real-time metrics
                - Custom reports
                - Data visualization
                - Predictive analytics
                - Export capabilities
                """,
                vendor="DataViz Solutions",
                vendor_verified=False,
                version="2.0.0",
                type=PluginType.ANALYTICS,
                license=PluginLicense.SUBSCRIPTION,
                price=79.99,
                currency="USD",
                rating=4.5,
                reviews_count=234,
                downloads=8901,
                categories=["analytics", "reporting", "business_intelligence"],
                tags=["analytics", "dashboard", "reports", "metrics", "bi"],
                requirements={
                    "min_version": "1.5.0",
                    "dependencies": ["database", "analytics_api"],
                    "database": "postgresql"
                },
                features=[
                    "Real-time dashboards",
                    "Custom KPIs",
                    "Predictive analytics",
                    "Data export",
                    "Scheduled reports"
                ],
                screenshots=[
                    "/images/plugins/analytics_1.png",
                    "/images/plugins/analytics_2.png"
                ],
                icon_url="/icons/analytics.svg",
                documentation_url="https://docs.example.com/analytics",
                support_url="https://support.example.com",
                repository_url=None,
                compatibility={
                    "spirit_tours": "1.5.0+",
                    "browser": "modern"
                },
                size_mb=23.4,
                last_updated=datetime.utcnow() - timedelta(days=21),
                created_at=datetime.utcnow() - timedelta(days=200)
            )
        ]
        
        # Add to cache
        for plugin in demo_plugins:
            self.marketplace_cache[plugin.id] = plugin
        
        self.last_cache_update = datetime.utcnow()
    
    async def search_marketplace(
        self,
        query: Optional[str] = None,
        plugin_type: Optional[PluginType] = None,
        license_type: Optional[PluginLicense] = None,
        categories: Optional[List[str]] = None,
        max_price: Optional[float] = None,
        min_rating: Optional[float] = None,
        sort_by: str = "popularity",
        limit: int = 20
    ) -> List[MarketplacePlugin]:
        """Buscar plugins en el marketplace"""
        
        # Filter plugins based on criteria
        results = list(self.marketplace_cache.values())
        
        if query:
            query_lower = query.lower()
            results = [
                p for p in results
                if query_lower in p.name.lower() or
                query_lower in p.description.lower() or
                any(query_lower in tag for tag in p.tags)
            ]
        
        if plugin_type:
            results = [p for p in results if p.type == plugin_type]
        
        if license_type:
            results = [p for p in results if p.license == license_type]
        
        if categories:
            results = [
                p for p in results
                if any(cat in p.categories for cat in categories)
            ]
        
        if max_price is not None:
            results = [p for p in results if p.price <= max_price]
        
        if min_rating is not None:
            results = [p for p in results if p.rating >= min_rating]
        
        # Sort results
        if sort_by == "popularity":
            results.sort(key=lambda p: p.downloads, reverse=True)
        elif sort_by == "rating":
            results.sort(key=lambda p: p.rating, reverse=True)
        elif sort_by == "price_low":
            results.sort(key=lambda p: p.price)
        elif sort_by == "price_high":
            results.sort(key=lambda p: p.price, reverse=True)
        elif sort_by == "newest":
            results.sort(key=lambda p: p.created_at, reverse=True)
        elif sort_by == "updated":
            results.sort(key=lambda p: p.last_updated, reverse=True)
        
        return results[:limit]
    
    async def get_plugin_details(self, plugin_id: str) -> Optional[MarketplacePlugin]:
        """Obtener detalles completos de un plugin"""
        return self.marketplace_cache.get(plugin_id)
    
    async def install_plugin(
        self,
        plugin_id: str,
        license_key: Optional[str] = None,
        auto_update: bool = True
    ) -> Dict[str, Any]:
        """Instalar un plugin desde el marketplace"""
        
        plugin = self.marketplace_cache.get(plugin_id)
        if not plugin:
            return {
                "success": False,
                "error": "Plugin not found in marketplace"
            }
        
        # Check if already installed
        if plugin_id in self.installed_plugins:
            return {
                "success": False,
                "error": "Plugin already installed"
            }
        
        # Validate license if required
        if plugin.license in [PluginLicense.PAID, PluginLicense.SUBSCRIPTION]:
            if not license_key:
                return {
                    "success": False,
                    "error": "License key required for this plugin"
                }
            # Here you would validate the license key
        
        # Simulate plugin installation
        installed = InstalledPlugin(
            plugin_id=plugin_id,
            name=plugin.name,
            version=plugin.version,
            installed_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            enabled=True,
            config={},
            license_key=license_key,
            auto_update=auto_update
        )
        
        self.installed_plugins[plugin_id] = installed
        
        logger.info(f"Plugin {plugin.name} v{plugin.version} installed successfully")
        
        return {
            "success": True,
            "message": f"Plugin {plugin.name} installed successfully",
            "plugin": {
                "id": plugin_id,
                "name": plugin.name,
                "version": plugin.version,
                "enabled": True
            }
        }
    
    async def uninstall_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """Desinstalar un plugin"""
        
        if plugin_id not in self.installed_plugins:
            return {
                "success": False,
                "error": "Plugin not installed"
            }
        
        plugin = self.installed_plugins[plugin_id]
        del self.installed_plugins[plugin_id]
        
        logger.info(f"Plugin {plugin.name} uninstalled successfully")
        
        return {
            "success": True,
            "message": f"Plugin {plugin.name} uninstalled successfully"
        }
    
    async def update_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """Actualizar un plugin instalado"""
        
        if plugin_id not in self.installed_plugins:
            return {
                "success": False,
                "error": "Plugin not installed"
            }
        
        marketplace_plugin = self.marketplace_cache.get(plugin_id)
        if not marketplace_plugin:
            return {
                "success": False,
                "error": "Plugin not found in marketplace"
            }
        
        installed = self.installed_plugins[plugin_id]
        
        # Check if update available
        if installed.version >= marketplace_plugin.version:
            return {
                "success": False,
                "error": "Plugin is already up to date"
            }
        
        # Simulate update
        installed.version = marketplace_plugin.version
        installed.updated_at = datetime.utcnow()
        
        logger.info(f"Plugin {installed.name} updated to v{marketplace_plugin.version}")
        
        return {
            "success": True,
            "message": f"Plugin {installed.name} updated to v{marketplace_plugin.version}",
            "new_version": marketplace_plugin.version
        }
    
    async def get_installed_plugins(self) -> List[Dict[str, Any]]:
        """Obtener lista de plugins instalados"""
        
        result = []
        for plugin_id, installed in self.installed_plugins.items():
            marketplace_plugin = self.marketplace_cache.get(plugin_id)
            
            result.append({
                "id": plugin_id,
                "name": installed.name,
                "current_version": installed.version,
                "latest_version": marketplace_plugin.version if marketplace_plugin else installed.version,
                "update_available": marketplace_plugin and marketplace_plugin.version > installed.version,
                "enabled": installed.enabled,
                "installed_at": installed.installed_at.isoformat(),
                "updated_at": installed.updated_at.isoformat(),
                "auto_update": installed.auto_update,
                "has_license": bool(installed.license_key)
            })
        
        return result
    
    async def toggle_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """Activar/desactivar un plugin instalado"""
        
        if plugin_id not in self.installed_plugins:
            return {
                "success": False,
                "error": "Plugin not installed"
            }
        
        plugin = self.installed_plugins[plugin_id]
        plugin.enabled = not plugin.enabled
        
        status = "enabled" if plugin.enabled else "disabled"
        logger.info(f"Plugin {plugin.name} {status}")
        
        return {
            "success": True,
            "message": f"Plugin {plugin.name} {status}",
            "enabled": plugin.enabled
        }
    
    async def configure_plugin(
        self,
        plugin_id: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Configurar un plugin instalado"""
        
        if plugin_id not in self.installed_plugins:
            return {
                "success": False,
                "error": "Plugin not installed"
            }
        
        plugin = self.installed_plugins[plugin_id]
        plugin.config.update(config)
        plugin.updated_at = datetime.utcnow()
        
        logger.info(f"Plugin {plugin.name} configuration updated")
        
        return {
            "success": True,
            "message": f"Plugin {plugin.name} configuration updated",
            "config": plugin.config
        }
    
    async def get_plugin_statistics(self, plugin_id: str) -> Dict[str, Any]:
        """Obtener estadísticas de uso de un plugin"""
        
        # This would connect to your analytics system
        return {
            "plugin_id": plugin_id,
            "usage_today": 547,
            "usage_this_week": 3892,
            "usage_this_month": 14567,
            "errors_today": 2,
            "performance": {
                "avg_response_time": 123,  # ms
                "success_rate": 99.8,  # percentage
                "memory_usage": 45.6,  # MB
                "cpu_usage": 2.3  # percentage
            },
            "top_features_used": [
                {"feature": "auto_response", "usage": 1234},
                {"feature": "media_handling", "usage": 987},
                {"feature": "analytics", "usage": 654}
            ]
        }
    
    async def check_updates(self) -> List[Dict[str, Any]]:
        """Verificar actualizaciones disponibles para plugins instalados"""
        
        updates = []
        for plugin_id, installed in self.installed_plugins.items():
            marketplace_plugin = self.marketplace_cache.get(plugin_id)
            
            if marketplace_plugin and marketplace_plugin.version > installed.version:
                updates.append({
                    "plugin_id": plugin_id,
                    "name": installed.name,
                    "current_version": installed.version,
                    "new_version": marketplace_plugin.version,
                    "auto_update": installed.auto_update,
                    "changelog": f"Version {marketplace_plugin.version} includes bug fixes and improvements"
                })
        
        return updates
    
    async def auto_update_plugins(self) -> Dict[str, Any]:
        """Actualizar automáticamente plugins con auto-update habilitado"""
        
        updated = []
        failed = []
        
        for plugin_id, installed in self.installed_plugins.items():
            if not installed.auto_update:
                continue
            
            marketplace_plugin = self.marketplace_cache.get(plugin_id)
            if marketplace_plugin and marketplace_plugin.version > installed.version:
                result = await self.update_plugin(plugin_id)
                
                if result["success"]:
                    updated.append(plugin_id)
                else:
                    failed.append({
                        "plugin_id": plugin_id,
                        "error": result.get("error", "Unknown error")
                    })
        
        return {
            "success": True,
            "updated": updated,
            "failed": failed,
            "message": f"Updated {len(updated)} plugins, {len(failed)} failed"
        }
    
    async def get_recommendations(
        self,
        based_on_installed: bool = True,
        limit: int = 5
    ) -> List[MarketplacePlugin]:
        """Obtener recomendaciones de plugins"""
        
        recommendations = []
        
        # Get categories from installed plugins
        if based_on_installed and self.installed_plugins:
            installed_categories = set()
            for plugin_id in self.installed_plugins:
                marketplace_plugin = self.marketplace_cache.get(plugin_id)
                if marketplace_plugin:
                    installed_categories.update(marketplace_plugin.categories)
            
            # Find similar plugins not installed
            for plugin in self.marketplace_cache.values():
                if plugin.id not in self.installed_plugins:
                    if any(cat in plugin.categories for cat in installed_categories):
                        recommendations.append(plugin)
        else:
            # Just get top-rated plugins not installed
            for plugin in self.marketplace_cache.values():
                if plugin.id not in self.installed_plugins and plugin.rating >= 4.5:
                    recommendations.append(plugin)
        
        # Sort by rating and downloads
        recommendations.sort(
            key=lambda p: (p.rating * p.downloads),
            reverse=True
        )
        
        return recommendations[:limit]

# Global instance
plugin_marketplace_service = PluginMarketplaceService()