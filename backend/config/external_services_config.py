"""
External Services Configuration for Production
Configuración centralizada de servicios externos con gestión segura de API keys
"""

import os
import logging
from typing import Dict, Any, Optional
import asyncio
from dataclasses import dataclass, field
from enum import Enum
import json
import aiohttp
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Status of external services"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"

@dataclass
class ServiceConfig:
    """Configuration for an external service"""
    name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    rate_limit_per_minute: int = 60
    timeout_seconds: int = 30
    retry_attempts: int = 3
    status: ServiceStatus = ServiceStatus.INACTIVE
    last_health_check: Optional[datetime] = None
    error_count: int = 0
    success_count: int = 0
    
    @property
    def success_rate(self) -> float:
        total = self.success_count + self.error_count
        return (self.success_count / total * 100) if total > 0 else 0.0

class ExternalServicesConfig:
    """
    Centralized configuration for all external services used by Spirit Tours:
    - OpenAI GPT (for AI analysis)
    - ElevenLabs (for voice cloning and TTS)
    - Google Calendar (for appointment scheduling)
    - SendGrid (for email notifications)
    - Twilio (for SMS and WhatsApp)
    - Zoom/Google Meet (for video meetings)
    - Payment gateways (Stripe, PayPal)
    """
    
    def __init__(self):
        self.services: Dict[str, ServiceConfig] = {}
        self._initialize_services()
        
        # Rate limiting tracking
        self.rate_limits: Dict[str, Dict[str, Any]] = {}
        
        logger.info("External Services Configuration initialized")
    
    def _initialize_services(self):
        """Initialize all external service configurations"""
        
        # AI Services
        self.services["openai"] = ServiceConfig(
            name="OpenAI GPT",
            api_key=os.getenv("OPENAI_API_KEY"),
            base_url="https://api.openai.com/v1",
            rate_limit_per_minute=50,  # Adjust based on your plan
            timeout_seconds=60,
            status=ServiceStatus.ACTIVE if os.getenv("OPENAI_API_KEY") else ServiceStatus.INACTIVE
        )
        
        self.services["elevenlabs"] = ServiceConfig(
            name="ElevenLabs Voice AI",
            api_key=os.getenv("ELEVENLABS_API_KEY"),
            base_url="https://api.elevenlabs.io/v1",
            rate_limit_per_minute=50,
            timeout_seconds=30,
            status=ServiceStatus.ACTIVE if os.getenv("ELEVENLABS_API_KEY") else ServiceStatus.INACTIVE
        )
        
        # Communication Services
        self.services["twilio"] = ServiceConfig(
            name="Twilio SMS/WhatsApp",
            api_key=os.getenv("TWILIO_AUTH_TOKEN"),
            base_url="https://api.twilio.com/2010-04-01",
            rate_limit_per_minute=100,
            timeout_seconds=20
        )
        
        self.services["sendgrid"] = ServiceConfig(
            name="SendGrid Email",
            api_key=os.getenv("SENDGRID_API_KEY"),
            base_url="https://api.sendgrid.com/v3",
            rate_limit_per_minute=100,
            timeout_seconds=20
        )
        
        # Calendar and Meeting Services
        self.services["google_calendar"] = ServiceConfig(
            name="Google Calendar",
            api_key=os.getenv("GOOGLE_CALENDAR_API_KEY"),
            base_url="https://www.googleapis.com/calendar/v3",
            rate_limit_per_minute=100,
            timeout_seconds=30
        )
        
        self.services["zoom"] = ServiceConfig(
            name="Zoom Meetings",
            api_key=os.getenv("ZOOM_API_KEY"),
            base_url="https://api.zoom.us/v2",
            rate_limit_per_minute=80,
            timeout_seconds=30
        )
        
        # Payment Services
        self.services["stripe"] = ServiceConfig(
            name="Stripe Payments",
            api_key=os.getenv("STRIPE_SECRET_KEY"),
            base_url="https://api.stripe.com/v1",
            rate_limit_per_minute=100,
            timeout_seconds=30
        )
        
        self.services["paypal"] = ServiceConfig(
            name="PayPal Payments",
            api_key=os.getenv("PAYPAL_CLIENT_SECRET"),
            base_url="https://api.paypal.com/v2" if os.getenv("PAYPAL_ENVIRONMENT") == "production" else "https://api.sandbox.paypal.com/v2",
            rate_limit_per_minute=50,
            timeout_seconds=30
        )
        
        # Analytics and Monitoring
        self.services["mixpanel"] = ServiceConfig(
            name="Mixpanel Analytics",
            api_key=os.getenv("MIXPANEL_PROJECT_TOKEN"),
            base_url="https://api.mixpanel.com",
            rate_limit_per_minute=200,
            timeout_seconds=20
        )
        
        # Customer Support
        self.services["zendesk"] = ServiceConfig(
            name="Zendesk Support",
            api_key=os.getenv("ZENDESK_API_TOKEN"),
            base_url=f"https://{os.getenv('ZENDESK_SUBDOMAIN', 'spirittours')}.zendesk.com/api/v2",
            rate_limit_per_minute=40,
            timeout_seconds=25
        )
        
        # CRM Integration
        self.services["hubspot"] = ServiceConfig(
            name="HubSpot CRM",
            api_key=os.getenv("HUBSPOT_API_KEY"),
            base_url="https://api.hubapi.com",
            rate_limit_per_minute=100,
            timeout_seconds=30
        )
        
        logger.info(f"Initialized {len(self.services)} external service configurations")
    
    def get_service_config(self, service_name: str) -> Optional[ServiceConfig]:
        """Get configuration for a specific service"""
        return self.services.get(service_name)
    
    def is_service_available(self, service_name: str) -> bool:
        """Check if a service is available and configured"""
        config = self.services.get(service_name)
        if not config:
            return False
        
        return (config.status == ServiceStatus.ACTIVE and 
                config.api_key is not None and
                config.error_count < 10)  # Too many errors = unavailable
    
    async def health_check_service(self, service_name: str) -> bool:
        """Perform health check for a specific service"""
        config = self.services.get(service_name)
        if not config or not config.api_key:
            return False
        
        try:
            logger.info(f"🔄 Health checking {service_name}...")
            
            # Service-specific health checks
            if service_name == "openai":
                success = await self._health_check_openai(config)
            elif service_name == "elevenlabs":
                success = await self._health_check_elevenlabs(config)
            elif service_name == "twilio":
                success = await self._health_check_twilio(config)
            elif service_name == "sendgrid":
                success = await self._health_check_sendgrid(config)
            elif service_name == "stripe":
                success = await self._health_check_stripe(config)
            else:
                # Generic HTTP health check
                success = await self._generic_health_check(config)
            
            # Update service status
            config.last_health_check = datetime.now()
            if success:
                config.status = ServiceStatus.ACTIVE
                config.success_count += 1
                logger.info(f"✅ {service_name} health check passed")
            else:
                config.error_count += 1
                if config.error_count >= 5:
                    config.status = ServiceStatus.ERROR
                logger.warning(f"⚠️ {service_name} health check failed")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Health check error for {service_name}: {e}")
            config.error_count += 1
            config.status = ServiceStatus.ERROR
            return False
    
    async def _health_check_openai(self, config: ServiceConfig) -> bool:
        """Health check for OpenAI API"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)) as session:
                headers = {
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json"
                }
                
                # Simple models list request
                async with session.get(f"{config.base_url}/models", headers=headers) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return False
    
    async def _health_check_elevenlabs(self, config: ServiceConfig) -> bool:
        """Health check for ElevenLabs API"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)) as session:
                headers = {
                    "xi-api-key": config.api_key,
                    "Content-Type": "application/json"
                }
                
                # Check voices endpoint
                async with session.get(f"{config.base_url}/voices", headers=headers) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"ElevenLabs health check failed: {e}")
            return False
    
    async def _health_check_twilio(self, config: ServiceConfig) -> bool:
        """Health check for Twilio API"""
        try:
            import base64
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            if not account_sid:
                return False
            
            # Create basic auth
            credentials = base64.b64encode(f"{account_sid}:{config.api_key}".encode()).decode()
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)) as session:
                headers = {
                    "Authorization": f"Basic {credentials}",
                }
                
                # Check account endpoint
                async with session.get(f"{config.base_url}/Accounts/{account_sid}.json", headers=headers) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"Twilio health check failed: {e}")
            return False
    
    async def _health_check_sendgrid(self, config: ServiceConfig) -> bool:
        """Health check for SendGrid API"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)) as session:
                headers = {
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json"
                }
                
                # Check API key validity
                async with session.get(f"{config.base_url}/scopes", headers=headers) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"SendGrid health check failed: {e}")
            return False
    
    async def _health_check_stripe(self, config: ServiceConfig) -> bool:
        """Health check for Stripe API"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)) as session:
                headers = {
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
                
                # Check balance endpoint
                async with session.get(f"{config.base_url}/balance", headers=headers) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"Stripe health check failed: {e}")
            return False
    
    async def _generic_health_check(self, config: ServiceConfig) -> bool:
        """Generic HTTP health check"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)) as session:
                async with session.get(config.base_url) as response:
                    return response.status < 500  # Any response except server error
                    
        except Exception as e:
            logger.error(f"Generic health check failed: {e}")
            return False
    
    async def health_check_all_services(self) -> Dict[str, bool]:
        """Perform health check for all configured services"""
        logger.info("🔄 Performing health check for all external services...")
        
        health_results = {}
        
        # Run health checks in parallel
        health_tasks = []
        for service_name in self.services.keys():
            if self.services[service_name].api_key:  # Only check configured services
                task = asyncio.create_task(self.health_check_service(service_name))
                health_tasks.append((service_name, task))
        
        # Wait for all health checks
        for service_name, task in health_tasks:
            try:
                result = await task
                health_results[service_name] = result
            except Exception as e:
                logger.error(f"❌ Health check task failed for {service_name}: {e}")
                health_results[service_name] = False
        
        # Log summary
        healthy_count = sum(1 for result in health_results.values() if result)
        total_count = len(health_results)
        
        logger.info(f"📊 Health check complete: {healthy_count}/{total_count} services healthy")
        
        return health_results
    
    def check_rate_limit(self, service_name: str) -> bool:
        """Check if service is within rate limits"""
        if service_name not in self.rate_limits:
            self.rate_limits[service_name] = {
                "requests": 0,
                "window_start": datetime.now(),
                "blocked_until": None
            }
        
        rate_limit_info = self.rate_limits[service_name]
        current_time = datetime.now()
        
        # Check if currently blocked
        if rate_limit_info["blocked_until"] and current_time < rate_limit_info["blocked_until"]:
            return False
        
        # Reset window if needed (1 minute windows)
        if current_time - rate_limit_info["window_start"] >= timedelta(minutes=1):
            rate_limit_info["requests"] = 0
            rate_limit_info["window_start"] = current_time
            rate_limit_info["blocked_until"] = None
        
        # Check rate limit
        config = self.services.get(service_name)
        if config and rate_limit_info["requests"] >= config.rate_limit_per_minute:
            # Block for remainder of minute
            rate_limit_info["blocked_until"] = rate_limit_info["window_start"] + timedelta(minutes=1)
            logger.warning(f"⚠️ Rate limit exceeded for {service_name}")
            return False
        
        return True
    
    def record_api_request(self, service_name: str, success: bool = True):
        """Record an API request for rate limiting and statistics"""
        if service_name not in self.rate_limits:
            self.rate_limits[service_name] = {
                "requests": 0,
                "window_start": datetime.now(),
                "blocked_until": None
            }
        
        self.rate_limits[service_name]["requests"] += 1
        
        # Update service statistics
        config = self.services.get(service_name)
        if config:
            if success:
                config.success_count += 1
            else:
                config.error_count += 1
    
    def get_service_statistics(self) -> Dict[str, Any]:
        """Get comprehensive statistics for all services"""
        stats = {
            "timestamp": datetime.now().isoformat(),
            "services": {},
            "summary": {
                "total_services": len(self.services),
                "active_services": 0,
                "error_services": 0,
                "overall_success_rate": 0.0
            }
        }
        
        total_requests = 0
        total_successes = 0
        
        for service_name, config in self.services.items():
            service_stats = {
                "name": config.name,
                "status": config.status.value,
                "configured": config.api_key is not None,
                "success_rate": config.success_rate,
                "total_requests": config.success_count + config.error_count,
                "error_count": config.error_count,
                "last_health_check": config.last_health_check.isoformat() if config.last_health_check else None,
                "rate_limit": {
                    "limit_per_minute": config.rate_limit_per_minute,
                    "current_usage": self.rate_limits.get(service_name, {}).get("requests", 0)
                }
            }
            
            stats["services"][service_name] = service_stats
            
            # Update summary
            if config.status == ServiceStatus.ACTIVE:
                stats["summary"]["active_services"] += 1
            elif config.status == ServiceStatus.ERROR:
                stats["summary"]["error_services"] += 1
            
            total_requests += config.success_count + config.error_count
            total_successes += config.success_count
        
        # Calculate overall success rate
        if total_requests > 0:
            stats["summary"]["overall_success_rate"] = round(total_successes / total_requests * 100, 2)
        
        return stats
    
    def get_recommended_api_keys(self) -> Dict[str, str]:
        """Get list of recommended API keys to configure"""
        
        recommendations = {
            "OPENAI_API_KEY": "Required for AI call analysis and intelligent responses",
            "ELEVENLABS_API_KEY": "Required for voice cloning and advanced TTS",
            "TWILIO_ACCOUNT_SID": "Required for SMS and WhatsApp communications",
            "TWILIO_AUTH_TOKEN": "Required for Twilio authentication",
            "SENDGRID_API_KEY": "Required for email notifications and marketing",
            "STRIPE_SECRET_KEY": "Required for payment processing",
            "GOOGLE_CALENDAR_API_KEY": "Optional: For calendar integration",
            "ZOOM_API_KEY": "Optional: For video meeting generation",
            "HUBSPOT_API_KEY": "Optional: For CRM synchronization"
        }
        
        missing_keys = {}
        for key, description in recommendations.items():
            if not os.getenv(key):
                missing_keys[key] = description
        
        return missing_keys
    
    async def initialize_production_services(self) -> bool:
        """Initialize all services for production environment"""
        logger.info("🚀 Initializing external services for production...")
        
        try:
            # Check all service configurations
            health_results = await self.health_check_all_services()
            
            # Identify critical services that must be available
            critical_services = ["openai", "elevenlabs"]
            missing_critical = []
            
            for service in critical_services:
                if service not in health_results or not health_results[service]:
                    missing_critical.append(service)
            
            if missing_critical:
                logger.error(f"❌ Critical services unavailable: {missing_critical}")
                logger.error("Please configure API keys for these services:")
                
                missing_keys = self.get_recommended_api_keys()
                for key, description in missing_keys.items():
                    logger.error(f"  - {key}: {description}")
                
                return False
            
            # Log successful initialization
            healthy_services = [name for name, healthy in health_results.items() if healthy]
            logger.info(f"✅ External services initialized successfully: {healthy_services}")
            
            # Start background health monitoring
            asyncio.create_task(self._background_health_monitoring())
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize external services: {e}")
            return False
    
    async def _background_health_monitoring(self):
        """Background task to monitor service health"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                logger.info("🔄 Background health monitoring...")
                await self.health_check_all_services()
                
            except Exception as e:
                logger.error(f"❌ Background health monitoring error: {e}")

# Global configuration instance
external_services_config = ExternalServicesConfig()

# Utility functions for easy access
def get_openai_config() -> Optional[ServiceConfig]:
    """Get OpenAI configuration"""
    return external_services_config.get_service_config("openai")

def get_elevenlabs_config() -> Optional[ServiceConfig]:
    """Get ElevenLabs configuration"""
    return external_services_config.get_service_config("elevenlabs")

def is_openai_available() -> bool:
    """Check if OpenAI is available"""
    return external_services_config.is_service_available("openai")

def is_elevenlabs_available() -> bool:
    """Check if ElevenLabs is available"""
    return external_services_config.is_service_available("elevenlabs")

async def initialize_all_external_services() -> bool:
    """Initialize all external services"""
    return await external_services_config.initialize_production_services()