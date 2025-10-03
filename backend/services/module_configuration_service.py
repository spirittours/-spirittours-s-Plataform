"""
Module Configuration Service
Sistema dinámico de configuración de módulos para administradores
"""

import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

class ModuleStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    BETA = "beta"
    DEPRECATED = "deprecated"

class ModuleCategory(Enum):
    AI_AGENTS = "ai_agents"
    PAYMENT = "payment"
    COMMUNICATION = "communication"
    BOOKING = "booking"
    ANALYTICS = "analytics"
    SECURITY = "security"
    INTEGRATION = "integration"
    MARKETING = "marketing"
    SUPPORT = "support"
    EXPERIMENTAL = "experimental"

@dataclass
class ModuleConfig:
    """Configuración de un módulo individual"""
    id: str
    name: str
    description: str
    category: ModuleCategory
    status: ModuleStatus
    version: str
    enabled: bool
    settings: Dict[str, Any]
    dependencies: List[str]
    permissions_required: List[str]
    resource_usage: Dict[str, float]
    last_updated: datetime
    created_at: datetime
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['category'] = self.category.value
        data['status'] = self.status.value
        data['last_updated'] = self.last_updated.isoformat()
        data['created_at'] = self.created_at.isoformat()
        return data

class ModuleConfigurationService:
    """Servicio principal de configuración de módulos"""
    
    def __init__(self):
        self.modules: Dict[str, ModuleConfig] = {}
        self.module_registry: Dict[str, Any] = {}
        self.config_cache: Dict[str, Any] = {}
        self.feature_flags: Dict[str, bool] = {}
        self.module_health: Dict[str, Dict] = {}
        self.initialize_default_modules()
        
    def initialize_default_modules(self):
        """Inicializar módulos por defecto del sistema"""
        
        # AI Agents Modules
        ai_agents = [
            {
                "id": "multi_channel_hub",
                "name": "Multi-Channel Communication Hub",
                "description": "Sistema unificado de comunicación multicanal",
                "category": ModuleCategory.AI_AGENTS,
                "settings": {
                    "whatsapp_enabled": True,
                    "telegram_enabled": True,
                    "facebook_enabled": True,
                    "instagram_enabled": True,
                    "response_time_limit": 30,
                    "auto_routing": True,
                    "ai_responses": True,
                    "channels": {
                        "whatsapp": {
                            "api_key": "",
                            "webhook_url": "",
                            "business_id": "",
                            "rate_limit": 100
                        },
                        "telegram": {
                            "bot_token": "",
                            "webhook_url": "",
                            "rate_limit": 30
                        }
                    }
                },
                "dependencies": ["notification_system"],
                "permissions_required": ["admin", "agent"],
                "resource_usage": {"cpu": 15, "memory": 512, "storage": 100}
            },
            {
                "id": "content_master",
                "name": "ContentMaster AI",
                "description": "Generación automática de contenido SEO-optimizado",
                "category": ModuleCategory.AI_AGENTS,
                "settings": {
                    "auto_generation": True,
                    "languages": ["es", "en", "fr", "de"],
                    "seo_optimization": True,
                    "content_types": ["blog", "social", "email", "landing"],
                    "ai_model": "gpt-4",
                    "generation_schedule": "daily",
                    "quality_threshold": 0.8
                },
                "dependencies": [],
                "permissions_required": ["admin", "marketing"],
                "resource_usage": {"cpu": 20, "memory": 1024, "storage": 500}
            },
            {
                "id": "revenue_maximizer",
                "name": "RevenueMaximizer AI",
                "description": "Optimización dinámica de precios y revenue management",
                "category": ModuleCategory.AI_AGENTS,
                "settings": {
                    "dynamic_pricing": True,
                    "competitor_monitoring": True,
                    "demand_forecasting": True,
                    "price_elasticity_analysis": True,
                    "optimization_frequency": "hourly",
                    "max_price_change_percent": 20,
                    "min_margin_percent": 15,
                    "algorithms": {
                        "pricing": "ml_gradient_boost",
                        "forecasting": "lstm_neural_net"
                    }
                },
                "dependencies": ["booking_system", "analytics"],
                "permissions_required": ["admin", "finance"],
                "resource_usage": {"cpu": 25, "memory": 2048, "storage": 1000}
            },
            {
                "id": "customer_prophet",
                "name": "CustomerProphet AI",
                "description": "Predicción de comportamiento y personalización avanzada",
                "category": ModuleCategory.AI_AGENTS,
                "settings": {
                    "behavior_prediction": True,
                    "churn_detection": True,
                    "clv_calculation": True,
                    "segmentation_auto": True,
                    "real_time_scoring": True,
                    "prediction_models": ["random_forest", "neural_network", "xgboost"],
                    "update_frequency": "real_time",
                    "data_retention_days": 365
                },
                "dependencies": ["analytics", "crm"],
                "permissions_required": ["admin", "marketing", "sales"],
                "resource_usage": {"cpu": 30, "memory": 3072, "storage": 2000}
            }
        ]
        
        # Payment Modules
        payment_modules = [
            {
                "id": "stripe_integration",
                "name": "Stripe Payment Gateway",
                "description": "Procesamiento de pagos con Stripe",
                "category": ModuleCategory.PAYMENT,
                "settings": {
                    "enabled": True,
                    "test_mode": True,
                    "api_key": "",
                    "webhook_secret": "",
                    "supported_currencies": ["USD", "EUR", "GBP", "MXN"],
                    "payment_methods": ["card", "sepa", "ideal"],
                    "3d_secure": True,
                    "auto_capture": False,
                    "retry_failed_payments": True
                },
                "dependencies": ["checkout_system"],
                "permissions_required": ["admin", "finance"],
                "resource_usage": {"cpu": 5, "memory": 256, "storage": 50}
            },
            {
                "id": "paypal_integration",
                "name": "PayPal Integration",
                "description": "Pagos con PayPal y PayPal Express",
                "category": ModuleCategory.PAYMENT,
                "settings": {
                    "enabled": True,
                    "sandbox_mode": True,
                    "client_id": "",
                    "client_secret": "",
                    "express_checkout": True,
                    "recurring_payments": True,
                    "instant_payment_notification": True
                },
                "dependencies": ["checkout_system"],
                "permissions_required": ["admin", "finance"],
                "resource_usage": {"cpu": 5, "memory": 256, "storage": 50}
            },
            {
                "id": "crypto_payments",
                "name": "Cryptocurrency Payments",
                "description": "Aceptar pagos en Bitcoin, Ethereum y otras criptomonedas",
                "category": ModuleCategory.PAYMENT,
                "settings": {
                    "enabled": False,
                    "accepted_currencies": ["BTC", "ETH", "USDT"],
                    "payment_processor": "coinbase_commerce",
                    "api_key": "",
                    "webhook_secret": "",
                    "auto_conversion": True,
                    "volatility_protection": True
                },
                "dependencies": ["checkout_system"],
                "permissions_required": ["admin", "finance"],
                "resource_usage": {"cpu": 10, "memory": 512, "storage": 100}
            }
        ]
        
        # Communication Modules
        communication_modules = [
            {
                "id": "email_marketing",
                "name": "Email Marketing System",
                "description": "Sistema de email marketing y automatización",
                "category": ModuleCategory.COMMUNICATION,
                "settings": {
                    "enabled": True,
                    "provider": "sendgrid",
                    "api_key": "",
                    "from_email": "info@spirittours.com",
                    "campaigns_enabled": True,
                    "automation_enabled": True,
                    "templates": {
                        "welcome": True,
                        "booking_confirmation": True,
                        "abandoned_cart": True,
                        "newsletter": True
                    },
                    "segmentation": True,
                    "a_b_testing": True
                },
                "dependencies": ["crm", "analytics"],
                "permissions_required": ["admin", "marketing"],
                "resource_usage": {"cpu": 10, "memory": 512, "storage": 1000}
            },
            {
                "id": "sms_notifications",
                "name": "SMS Notification System",
                "description": "Notificaciones SMS para clientes",
                "category": ModuleCategory.COMMUNICATION,
                "settings": {
                    "enabled": True,
                    "provider": "twilio",
                    "account_sid": "",
                    "auth_token": "",
                    "from_number": "",
                    "notification_types": ["booking", "reminder", "promotion"],
                    "opt_in_required": True,
                    "rate_limiting": True
                },
                "dependencies": ["notification_system"],
                "permissions_required": ["admin", "support"],
                "resource_usage": {"cpu": 5, "memory": 256, "storage": 100}
            },
            {
                "id": "live_chat",
                "name": "Live Chat System",
                "description": "Chat en vivo con soporte de IA",
                "category": ModuleCategory.COMMUNICATION,
                "settings": {
                    "enabled": True,
                    "ai_assistant_enabled": True,
                    "business_hours": {
                        "monday": "09:00-18:00",
                        "tuesday": "09:00-18:00",
                        "wednesday": "09:00-18:00",
                        "thursday": "09:00-18:00",
                        "friday": "09:00-18:00",
                        "saturday": "10:00-14:00",
                        "sunday": "closed"
                    },
                    "auto_assignment": True,
                    "chat_history_retention": 90,
                    "file_sharing": True,
                    "video_calls": False
                },
                "dependencies": ["websocket_system", "ai_assistant"],
                "permissions_required": ["admin", "support", "agent"],
                "resource_usage": {"cpu": 15, "memory": 768, "storage": 500}
            }
        ]
        
        # Analytics Modules
        analytics_modules = [
            {
                "id": "google_analytics",
                "name": "Google Analytics Integration",
                "description": "Integración con Google Analytics 4",
                "category": ModuleCategory.ANALYTICS,
                "settings": {
                    "enabled": True,
                    "measurement_id": "",
                    "api_secret": "",
                    "enhanced_ecommerce": True,
                    "custom_dimensions": [],
                    "custom_metrics": [],
                    "user_id_tracking": True,
                    "cross_domain_tracking": False
                },
                "dependencies": [],
                "permissions_required": ["admin", "analytics"],
                "resource_usage": {"cpu": 2, "memory": 128, "storage": 50}
            },
            {
                "id": "business_intelligence",
                "name": "Business Intelligence Dashboard",
                "description": "Dashboards avanzados y reportes ejecutivos",
                "category": ModuleCategory.ANALYTICS,
                "settings": {
                    "enabled": True,
                    "real_time_updates": True,
                    "custom_dashboards": True,
                    "export_formats": ["pdf", "excel", "csv"],
                    "scheduled_reports": True,
                    "data_warehouse": "postgresql",
                    "etl_frequency": "hourly",
                    "kpis": [
                        "revenue",
                        "bookings",
                        "conversion_rate",
                        "customer_satisfaction",
                        "agent_performance"
                    ]
                },
                "dependencies": ["database", "reporting"],
                "permissions_required": ["admin", "executive", "analytics"],
                "resource_usage": {"cpu": 20, "memory": 2048, "storage": 5000}
            }
        ]
        
        # Security Modules
        security_modules = [
            {
                "id": "two_factor_auth",
                "name": "Two-Factor Authentication",
                "description": "Autenticación de dos factores para usuarios",
                "category": ModuleCategory.SECURITY,
                "settings": {
                    "enabled": True,
                    "methods": ["totp", "sms", "email"],
                    "mandatory_for_admins": True,
                    "backup_codes": True,
                    "remember_device_days": 30,
                    "qr_code_generation": True
                },
                "dependencies": ["auth_system"],
                "permissions_required": ["admin"],
                "resource_usage": {"cpu": 5, "memory": 256, "storage": 100}
            },
            {
                "id": "fraud_detection",
                "name": "Fraud Detection System",
                "description": "Detección de fraude con IA",
                "category": ModuleCategory.SECURITY,
                "settings": {
                    "enabled": True,
                    "ml_models": ["isolation_forest", "autoencoder"],
                    "risk_scoring": True,
                    "auto_block_threshold": 0.9,
                    "manual_review_threshold": 0.7,
                    "ip_geolocation": True,
                    "device_fingerprinting": True,
                    "velocity_checks": True
                },
                "dependencies": ["payment_system", "analytics"],
                "permissions_required": ["admin", "security"],
                "resource_usage": {"cpu": 25, "memory": 1024, "storage": 500}
            }
        ]
        
        # Experimental Modules
        experimental_modules = [
            {
                "id": "vr_tours",
                "name": "Virtual Reality Tours",
                "description": "Tours virtuales en realidad virtual",
                "category": ModuleCategory.EXPERIMENTAL,
                "settings": {
                    "enabled": False,
                    "platforms": ["oculus", "htc_vive", "webxr"],
                    "360_video_support": True,
                    "interactive_elements": True,
                    "multiplayer_tours": False,
                    "content_library_size": 50,
                    "streaming_quality": "4k"
                },
                "dependencies": ["media_server", "cdn"],
                "permissions_required": ["admin", "content"],
                "resource_usage": {"cpu": 40, "memory": 4096, "storage": 10000}
            },
            {
                "id": "blockchain_loyalty",
                "name": "Blockchain Loyalty Program",
                "description": "Programa de lealtad basado en blockchain",
                "category": ModuleCategory.EXPERIMENTAL,
                "settings": {
                    "enabled": False,
                    "blockchain": "ethereum",
                    "token_name": "SPIRIT",
                    "smart_contract_address": "",
                    "rewards_per_booking": 100,
                    "redemption_rate": 0.01,
                    "nft_rewards": True
                },
                "dependencies": ["loyalty_program", "crypto_payments"],
                "permissions_required": ["admin"],
                "resource_usage": {"cpu": 30, "memory": 2048, "storage": 1000}
            },
            {
                "id": "voice_assistant",
                "name": "Voice Assistant Integration",
                "description": "Asistente de voz con IA para reservas",
                "category": ModuleCategory.EXPERIMENTAL,
                "settings": {
                    "enabled": False,
                    "platforms": ["alexa", "google_assistant", "siri"],
                    "languages": ["es", "en"],
                    "booking_capability": True,
                    "information_queries": True,
                    "voice_authentication": False,
                    "custom_wake_word": "spirit"
                },
                "dependencies": ["ai_assistant", "booking_system"],
                "permissions_required": ["admin"],
                "resource_usage": {"cpu": 20, "memory": 1024, "storage": 500}
            }
        ]
        
        # Initialize all modules
        all_modules = (
            ai_agents + payment_modules + communication_modules + 
            analytics_modules + security_modules + experimental_modules
        )
        
        for module_data in all_modules:
            module_config = ModuleConfig(
                id=module_data["id"],
                name=module_data["name"],
                description=module_data["description"],
                category=module_data["category"],
                status=ModuleStatus.ACTIVE if module_data.get("settings", {}).get("enabled", True) else ModuleStatus.INACTIVE,
                version="1.0.0",
                enabled=module_data.get("settings", {}).get("enabled", True),
                settings=module_data.get("settings", {}),
                dependencies=module_data.get("dependencies", []),
                permissions_required=module_data.get("permissions_required", []),
                resource_usage=module_data.get("resource_usage", {}),
                last_updated=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            self.modules[module_config.id] = module_config
            
            # Initialize health status
            self.module_health[module_config.id] = {
                "status": "healthy",
                "uptime": 0,
                "last_check": datetime.utcnow(),
                "errors": [],
                "performance": {
                    "response_time": 0,
                    "success_rate": 100,
                    "throughput": 0
                }
            }
    
    async def get_all_modules(self, category: Optional[ModuleCategory] = None) -> List[ModuleConfig]:
        """Obtener todos los módulos o filtrar por categoría"""
        if category:
            return [m for m in self.modules.values() if m.category == category]
        return list(self.modules.values())
    
    async def get_module(self, module_id: str) -> Optional[ModuleConfig]:
        """Obtener configuración de un módulo específico"""
        return self.modules.get(module_id)
    
    async def update_module_settings(self, module_id: str, settings: Dict[str, Any]) -> bool:
        """Actualizar configuración de un módulo"""
        if module_id not in self.modules:
            return False
        
        module = self.modules[module_id]
        
        # Validate dependencies before enabling
        if settings.get("enabled") and not await self.check_dependencies(module_id):
            raise ValueError(f"Cannot enable {module_id}: Missing dependencies")
        
        # Update settings
        module.settings.update(settings)
        module.enabled = settings.get("enabled", module.enabled)
        module.status = ModuleStatus.ACTIVE if module.enabled else ModuleStatus.INACTIVE
        module.last_updated = datetime.utcnow()
        
        # Clear cache
        if module_id in self.config_cache:
            del self.config_cache[module_id]
        
        # Notify dependent modules
        await self.notify_dependents(module_id, module.enabled)
        
        logger.info(f"Module {module_id} settings updated")
        return True
    
    async def toggle_module(self, module_id: str) -> bool:
        """Activar/desactivar un módulo"""
        if module_id not in self.modules:
            return False
        
        module = self.modules[module_id]
        new_state = not module.enabled
        
        # Check dependencies if enabling
        if new_state and not await self.check_dependencies(module_id):
            raise ValueError(f"Cannot enable {module_id}: Missing dependencies")
        
        # Check if any modules depend on this one when disabling
        if not new_state:
            dependents = await self.get_dependent_modules(module_id)
            if dependents:
                raise ValueError(f"Cannot disable {module_id}: Required by {', '.join(dependents)}")
        
        module.enabled = new_state
        module.status = ModuleStatus.ACTIVE if new_state else ModuleStatus.INACTIVE
        module.last_updated = datetime.utcnow()
        
        logger.info(f"Module {module_id} toggled to {module.status.value}")
        return True
    
    async def check_dependencies(self, module_id: str) -> bool:
        """Verificar si las dependencias de un módulo están activas"""
        if module_id not in self.modules:
            return False
        
        module = self.modules[module_id]
        for dep in module.dependencies:
            if dep not in self.modules or not self.modules[dep].enabled:
                return False
        return True
    
    async def get_dependent_modules(self, module_id: str) -> List[str]:
        """Obtener módulos que dependen del módulo especificado"""
        dependents = []
        for mod_id, module in self.modules.items():
            if module_id in module.dependencies and module.enabled:
                dependents.append(mod_id)
        return dependents
    
    async def notify_dependents(self, module_id: str, enabled: bool):
        """Notificar a módulos dependientes sobre cambios"""
        dependents = await self.get_dependent_modules(module_id)
        for dep_id in dependents:
            if dep_id in self.modules:
                logger.info(f"Notifying {dep_id} about {module_id} status change to {enabled}")
                # Aquí podrías implementar lógica específica de notificación
    
    async def get_module_health(self, module_id: str) -> Dict:
        """Obtener estado de salud de un módulo"""
        return self.module_health.get(module_id, {})
    
    async def update_module_health(self, module_id: str, health_data: Dict):
        """Actualizar estado de salud de un módulo"""
        if module_id in self.module_health:
            self.module_health[module_id].update(health_data)
            self.module_health[module_id]["last_check"] = datetime.utcnow()
    
    async def get_resource_usage(self) -> Dict:
        """Calcular uso total de recursos"""
        total_cpu = 0
        total_memory = 0
        total_storage = 0
        
        for module in self.modules.values():
            if module.enabled:
                total_cpu += module.resource_usage.get("cpu", 0)
                total_memory += module.resource_usage.get("memory", 0)
                total_storage += module.resource_usage.get("storage", 0)
        
        return {
            "cpu_percent": total_cpu,
            "memory_mb": total_memory,
            "storage_gb": total_storage / 1000,
            "modules_active": sum(1 for m in self.modules.values() if m.enabled),
            "modules_total": len(self.modules)
        }
    
    async def export_configuration(self) -> Dict:
        """Exportar configuración completa"""
        config = {
            "version": "1.0.0",
            "exported_at": datetime.utcnow().isoformat(),
            "modules": {},
            "feature_flags": self.feature_flags
        }
        
        for module_id, module in self.modules.items():
            config["modules"][module_id] = module.to_dict()
        
        return config
    
    async def import_configuration(self, config: Dict) -> bool:
        """Importar configuración desde backup"""
        try:
            # Validate configuration version
            if config.get("version") != "1.0.0":
                raise ValueError("Incompatible configuration version")
            
            # Import feature flags
            self.feature_flags = config.get("feature_flags", {})
            
            # Import modules
            for module_id, module_data in config.get("modules", {}).items():
                if module_id in self.modules:
                    await self.update_module_settings(
                        module_id, 
                        module_data.get("settings", {})
                    )
            
            logger.info("Configuration imported successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to import configuration: {e}")
            return False
    
    async def add_custom_module(self, module_config: ModuleConfig) -> bool:
        """Añadir módulo personalizado"""
        if module_config.id in self.modules:
            return False
        
        self.modules[module_config.id] = module_config
        self.module_health[module_config.id] = {
            "status": "healthy",
            "uptime": 0,
            "last_check": datetime.utcnow(),
            "errors": [],
            "performance": {
                "response_time": 0,
                "success_rate": 100,
                "throughput": 0
            }
        }
        
        logger.info(f"Custom module {module_config.id} added successfully")
        return True
    
    async def remove_custom_module(self, module_id: str) -> bool:
        """Eliminar módulo personalizado"""
        if module_id not in self.modules:
            return False
        
        # Check if it's a system module
        if self.modules[module_id].category != ModuleCategory.EXPERIMENTAL:
            raise ValueError("Cannot remove system modules")
        
        # Check dependencies
        dependents = await self.get_dependent_modules(module_id)
        if dependents:
            raise ValueError(f"Cannot remove {module_id}: Required by {', '.join(dependents)}")
        
        del self.modules[module_id]
        if module_id in self.module_health:
            del self.module_health[module_id]
        
        logger.info(f"Module {module_id} removed successfully")
        return True
    
    async def get_module_statistics(self, module_id: str) -> Dict:
        """Obtener estadísticas de uso de un módulo"""
        # This would connect to your analytics system
        return {
            "module_id": module_id,
            "usage_today": 1247,
            "usage_this_week": 8934,
            "usage_this_month": 35678,
            "avg_response_time": 234,  # ms
            "success_rate": 98.7,  # percentage
            "error_count": 12,
            "top_errors": [
                {"code": "TIMEOUT", "count": 5},
                {"code": "RATE_LIMIT", "count": 4}
            ],
            "peak_usage_hour": 14,  # 2 PM
            "user_satisfaction": 4.6  # out of 5
        }

# Global instance
module_configuration_service = ModuleConfigurationService()