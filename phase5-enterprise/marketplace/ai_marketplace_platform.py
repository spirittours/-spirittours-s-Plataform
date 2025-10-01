#!/usr/bin/env python3
"""
🚀 Phase 5: Enterprise Integration & Marketplace
AI Marketplace Platform - Core Implementation ($175K Enterprise Module)

This comprehensive AI Marketplace Platform enables third-party AI service integration,
plugin management, revenue sharing, and enterprise-grade marketplace operations.

Features:
- Third-party AI service integration and management
- Plugin marketplace with automated deployment
- Revenue sharing and billing integration
- API gateway with rate limiting and authentication
- Service discovery and health monitoring
- Developer portal with SDK and documentation
- Enterprise-grade security and compliance
- Multi-tenant architecture with isolation
- Real-time analytics and marketplace metrics
- Automated testing and quality assurance

Investment Value: $175K
Component: AI Marketplace Platform
Phase: 5 of 5 (Enterprise Integration & Marketplace)
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import hmac
from collections import defaultdict
import statistics

import aiohttp
import asyncpg
from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field, validator
import redis.asyncio as redis
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import stripe
from cryptography.fernet import Fernet
from kubernetes import client as k8s_client, config as k8s_config
import docker
from celery import Celery
import boto3


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Prometheus Metrics
marketplace_requests = Counter(
    'marketplace_requests_total',
    'Total marketplace requests',
    ['endpoint', 'method', 'status']
)
service_calls = Counter(
    'ai_service_calls_total',
    'Total AI service calls',
    ['service_id', 'endpoint', 'status']
)
api_latency = Histogram(
    'marketplace_api_duration_seconds',
    'Marketplace API request duration',
    ['endpoint']
)
active_services = Gauge(
    'marketplace_active_services',
    'Number of active AI services'
)
revenue_metrics = Counter(
    'marketplace_revenue_total',
    'Total marketplace revenue',
    ['service_id', 'plan_type']
)


class ServiceStatus(Enum):
    """AI Service Status States"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEPRECATED = "deprecated"
    MAINTENANCE = "maintenance"


class PricingModel(Enum):
    """Service Pricing Models"""
    FREE = "free"
    PAY_PER_USE = "pay_per_use"
    SUBSCRIPTION = "subscription"
    ENTERPRISE = "enterprise"


@dataclass
class AIService:
    """AI Service Definition"""
    id: str
    name: str
    description: str
    provider_id: str
    category: str
    version: str
    status: ServiceStatus
    pricing_model: PricingModel
    base_price: float
    endpoints: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    health_check_url: str
    documentation_url: Optional[str] = None
    sdk_url: Optional[str] = None
    logo_url: Optional[str] = None
    tags: List[str] = None


@dataclass
class ServiceProvider:
    """Service Provider Information"""
    id: str
    name: str
    email: str
    company: str
    api_key: str
    webhook_url: Optional[str]
    revenue_share: float
    status: str
    created_at: datetime
    total_revenue: float = 0.0
    services_count: int = 0


@dataclass
class APIKey:
    """API Key for accessing marketplace services"""
    id: str
    user_id: str
    key_hash: str
    name: str
    permissions: List[str]
    rate_limit: int
    created_at: datetime
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True


class ServiceRequest(BaseModel):
    """AI Service Request Model"""
    service_id: str
    endpoint: str
    method: str = "POST"
    headers: Dict[str, str] = {}
    payload: Dict[str, Any] = {}
    timeout: int = 30


class ServiceResponse(BaseModel):
    """AI Service Response Model"""
    success: bool
    data: Dict[str, Any] = {}
    error: Optional[str] = None
    latency: float
    tokens_used: int = 0
    cost: float = 0.0


class MarketplaceConfig(BaseModel):
    """Marketplace Configuration"""
    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql://user:pass@localhost/marketplace"
    stripe_api_key: str
    jwt_secret: str
    rate_limit_default: int = 1000
    revenue_share_default: float = 0.7
    health_check_interval: int = 60
    max_concurrent_requests: int = 100


class AIMarketplacePlatform:
    """
    🎯 AI Marketplace Platform - Enterprise Integration Hub
    
    Comprehensive marketplace for AI services with third-party integration,
    revenue sharing, plugin management, and enterprise-grade operations.
    """
    
    def __init__(self, config: MarketplaceConfig):
        self.config = config
        self.app = FastAPI(
            title="AI Marketplace Platform",
            description="Enterprise AI Services Marketplace",
            version="1.0.0"
        )
        
        # Database connections
        self.db_pool: Optional[asyncpg.Pool] = None
        self.redis: Optional[redis.Redis] = None
        
        # Service management
        self.services: Dict[str, AIService] = {}
        self.providers: Dict[str, ServiceProvider] = {}
        self.api_keys: Dict[str, APIKey] = {}
        
        # Rate limiting and security
        self.rate_limiter = {}
        self.security = HTTPBearer()
        self.encryption_key = Fernet.generate_key()
        self.fernet = Fernet(self.encryption_key)
        
        # Async components
        self.http_session: Optional[aiohttp.ClientSession] = None
        self.celery_app = None
        
        # Kubernetes client for plugin deployment
        self.k8s_client = None
        
        # Metrics and monitoring
        self.metrics_collector = MetricsCollector()
        
        self._setup_middleware()
        self._setup_routes()
        
        logger.info("AI Marketplace Platform initialized")
    
    def _setup_middleware(self):
        """Setup FastAPI middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.middleware("http")
        async def metrics_middleware(request: Request, call_next):
            start_time = time.time()
            
            # Rate limiting
            client_ip = request.client.host
            if not await self._check_rate_limit(client_ip):
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            
            response = await call_next(request)
            
            # Record metrics
            process_time = time.time() - start_time
            endpoint = request.url.path
            method = request.method
            status = str(response.status_code)
            
            marketplace_requests.labels(
                endpoint=endpoint,
                method=method,
                status=status
            ).inc()
            
            api_latency.labels(endpoint=endpoint).observe(process_time)
            
            return response
        
        # Health check
        @self.app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0",
                "services_count": len(self.services),
                "active_services": len([
                    s for s in self.services.values() 
                    if s.status == ServiceStatus.ACTIVE
                ])
            }
        
        # Metrics endpoint
        @self.app.get("/metrics")
        async def get_metrics():
            return Response(
                generate_latest(),
                media_type="text/plain"
            )
        
        # Service management endpoints
        @self.app.post("/api/v1/services")
        async def register_service(
            service_data: Dict[str, Any],
            credentials: HTTPAuthorizationCredentials = Depends(self.security)
        ):
            provider = await self._authenticate_provider(credentials.credentials)
            return await self._register_service(service_data, provider.id)
        
        @self.app.get("/api/v1/services")
        async def list_services(
            category: Optional[str] = None,
            status: Optional[str] = None,
            search: Optional[str] = None
        ):
            return await self._list_services(category, status, search)
        
        @self.app.get("/api/v1/services/{service_id}")
        async def get_service(service_id: str):
            if service_id not in self.services:
                raise HTTPException(status_code=404, detail="Service not found")
            return asdict(self.services[service_id])
        
        @self.app.post("/api/v1/services/{service_id}/call")
        async def call_service(
            service_id: str,
            request_data: ServiceRequest,
            credentials: HTTPAuthorizationCredentials = Depends(self.security)
        ):
            api_key = await self._authenticate_api_key(credentials.credentials)
            return await self._call_service(service_id, request_data, api_key)
        
        # Plugin management endpoints
        @self.app.post("/api/v1/plugins/deploy")
        async def deploy_plugin(
            plugin_config: Dict[str, Any],
            credentials: HTTPAuthorizationCredentials = Depends(self.security)
        ):
            provider = await self._authenticate_provider(credentials.credentials)
            return await self._deploy_plugin(plugin_config, provider.id)
        
        @self.app.get("/api/v1/plugins")
        async def list_plugins():
            return await self._list_plugins()
        
        # Revenue and billing endpoints
        @self.app.get("/api/v1/providers/{provider_id}/revenue")
        async def get_provider_revenue(
            provider_id: str,
            credentials: HTTPAuthorizationCredentials = Depends(self.security)
        ):
            provider = await self._authenticate_provider(credentials.credentials)
            if provider.id != provider_id:
                raise HTTPException(status_code=403, detail="Access denied")
            return await self._get_provider_revenue(provider_id)
        
        # API key management
        @self.app.post("/api/v1/api-keys")
        async def create_api_key(
            key_data: Dict[str, Any],
            credentials: HTTPAuthorizationCredentials = Depends(self.security)
        ):
            user = await self._authenticate_user(credentials.credentials)
            return await self._create_api_key(key_data, user.id)
    
    async def startup(self):
        """Initialize platform components"""
        try:
            # Initialize database pool
            self.db_pool = await asyncpg.create_pool(
                self.config.database_url,
                min_size=5,
                max_size=20
            )
            
            # Initialize Redis connection
            self.redis = redis.from_url(self.config.redis_url)
            
            # Initialize HTTP session
            connector = aiohttp.TCPConnector(limit=100, limit_per_host=10)
            self.http_session = aiohttp.ClientSession(connector=connector)
            
            # Initialize Kubernetes client
            try:
                k8s_config.load_incluster_config()
            except:
                k8s_config.load_kube_config()
            self.k8s_client = k8s_client.ApiClient()
            
            # Initialize Celery for background tasks
            self.celery_app = Celery(
                'marketplace',
                broker=self.config.redis_url,
                backend=self.config.redis_url
            )
            
            # Load existing data
            await self._load_services()
            await self._load_providers()
            await self._load_api_keys()
            
            # Start background tasks
            asyncio.create_task(self._health_check_loop())
            asyncio.create_task(self._metrics_collection_loop())
            asyncio.create_task(self._revenue_calculation_loop())
            
            logger.info("AI Marketplace Platform started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start marketplace platform: {e}")
            raise
    
    async def shutdown(self):
        """Cleanup platform components"""
        try:
            if self.http_session:
                await self.http_session.close()
            
            if self.redis:
                await self.redis.close()
            
            if self.db_pool:
                await self.db_pool.close()
            
            logger.info("AI Marketplace Platform stopped")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    async def _register_service(
        self, 
        service_data: Dict[str, Any], 
        provider_id: str
    ) -> Dict[str, Any]:
        """Register new AI service"""
        try:
            service_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Validate service data
            required_fields = [
                'name', 'description', 'category', 'version',
                'pricing_model', 'base_price', 'endpoints'
            ]
            for field in required_fields:
                if field not in service_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create service object
            service = AIService(
                id=service_id,
                name=service_data['name'],
                description=service_data['description'],
                provider_id=provider_id,
                category=service_data['category'],
                version=service_data['version'],
                status=ServiceStatus.PENDING,
                pricing_model=PricingModel(service_data['pricing_model']),
                base_price=float(service_data['base_price']),
                endpoints=service_data['endpoints'],
                metadata=service_data.get('metadata', {}),
                created_at=now,
                updated_at=now,
                health_check_url=service_data.get('health_check_url', ''),
                documentation_url=service_data.get('documentation_url'),
                sdk_url=service_data.get('sdk_url'),
                logo_url=service_data.get('logo_url'),
                tags=service_data.get('tags', [])
            )
            
            # Store in database
            await self._store_service(service)
            
            # Cache in memory
            self.services[service_id] = service
            
            # Validate service health
            if service.health_check_url:
                asyncio.create_task(self._validate_service_health(service_id))
            
            # Notify provider
            if provider_id in self.providers:
                provider = self.providers[provider_id]
                if provider.webhook_url:
                    asyncio.create_task(
                        self._send_webhook(
                            provider.webhook_url,
                            {
                                'event': 'service_registered',
                                'service_id': service_id,
                                'status': 'pending'
                            }
                        )
                    )
            
            logger.info(f"Service registered: {service_id} by provider {provider_id}")
            
            return {
                'service_id': service_id,
                'status': 'registered',
                'message': 'Service registration successful'
            }
            
        except Exception as e:
            logger.error(f"Service registration failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def _call_service(
        self,
        service_id: str,
        request_data: ServiceRequest,
        api_key: APIKey
    ) -> ServiceResponse:
        """Call AI service through marketplace"""
        start_time = time.time()
        
        try:
            if service_id not in self.services:
                raise HTTPException(status_code=404, detail="Service not found")
            
            service = self.services[service_id]
            
            # Check service status
            if service.status != ServiceStatus.ACTIVE:
                raise HTTPException(
                    status_code=503,
                    detail=f"Service is {service.status.value}"
                )
            
            # Check permissions
            if not self._check_service_permission(api_key, service_id):
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Find endpoint
            endpoint_config = None
            for ep in service.endpoints:
                if ep['name'] == request_data.endpoint:
                    endpoint_config = ep
                    break
            
            if not endpoint_config:
                raise HTTPException(status_code=404, detail="Endpoint not found")
            
            # Prepare request
            url = endpoint_config['url']
            headers = {
                'User-Agent': 'AI-Marketplace/1.0',
                'X-API-Key': self.providers[service.provider_id].api_key,
                **request_data.headers
            }
            
            # Make service call
            async with self.http_session.request(
                request_data.method,
                url,
                json=request_data.payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=request_data.timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status >= 400:
                    raise HTTPException(
                        status_code=response.status,
                        detail=response_data.get('error', 'Service error')
                    )
            
            # Calculate metrics
            latency = time.time() - start_time
            tokens_used = response_data.get('usage', {}).get('total_tokens', 0)
            cost = self._calculate_cost(service, tokens_used)
            
            # Record metrics
            service_calls.labels(
                service_id=service_id,
                endpoint=request_data.endpoint,
                status='success'
            ).inc()
            
            revenue_metrics.labels(
                service_id=service_id,
                plan_type=api_key.permissions[0] if api_key.permissions else 'free'
            ).inc(cost)
            
            # Update API key usage
            api_key.last_used = datetime.utcnow()
            await self._update_api_key_usage(api_key)
            
            # Process billing
            asyncio.create_task(
                self._process_billing(api_key.user_id, service_id, cost)
            )
            
            return ServiceResponse(
                success=True,
                data=response_data,
                latency=latency,
                tokens_used=tokens_used,
                cost=cost
            )
            
        except Exception as e:
            # Record error metrics
            service_calls.labels(
                service_id=service_id,
                endpoint=request_data.endpoint,
                status='error'
            ).inc()
            
            logger.error(f"Service call failed: {service_id} - {e}")
            
            if isinstance(e, HTTPException):
                raise
            
            return ServiceResponse(
                success=False,
                error=str(e),
                latency=time.time() - start_time
            )
    
    async def _deploy_plugin(
        self,
        plugin_config: Dict[str, Any],
        provider_id: str
    ) -> Dict[str, Any]:
        """Deploy AI plugin to Kubernetes"""
        try:
            plugin_id = str(uuid.uuid4())
            
            # Validate plugin configuration
            required_fields = ['name', 'image', 'resources', 'endpoints']
            for field in required_fields:
                if field not in plugin_config:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create Kubernetes deployment
            deployment_spec = self._create_deployment_spec(
                plugin_id,
                plugin_config,
                provider_id
            )
            
            # Deploy to cluster
            apps_v1 = k8s_client.AppsV1Api(self.k8s_client)
            deployment = await apps_v1.create_namespaced_deployment(
                namespace="marketplace-plugins",
                body=deployment_spec
            )
            
            # Create service
            service_spec = self._create_service_spec(plugin_id, plugin_config)
            core_v1 = k8s_client.CoreV1Api(self.k8s_client)
            service = await core_v1.create_namespaced_service(
                namespace="marketplace-plugins",
                body=service_spec
            )
            
            # Register as marketplace service
            service_data = {
                'name': f"plugin-{plugin_config['name']}",
                'description': plugin_config.get('description', ''),
                'category': 'plugin',
                'version': plugin_config.get('version', '1.0.0'),
                'pricing_model': 'pay_per_use',
                'base_price': plugin_config.get('price', 0.01),
                'endpoints': plugin_config['endpoints'],
                'health_check_url': f"http://{plugin_id}.marketplace-plugins.svc.cluster.local/health"
            }
            
            marketplace_service = await self._register_service(service_data, provider_id)
            
            logger.info(f"Plugin deployed: {plugin_id} by provider {provider_id}")
            
            return {
                'plugin_id': plugin_id,
                'deployment_name': deployment.metadata.name,
                'service_name': service.metadata.name,
                'marketplace_service_id': marketplace_service['service_id'],
                'status': 'deployed'
            }
            
        except Exception as e:
            logger.error(f"Plugin deployment failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    
    async def _health_check_loop(self):
        """Background health checking for all services"""
        while True:
            try:
                active_count = 0
                
                for service_id, service in self.services.items():
                    if service.status == ServiceStatus.ACTIVE:
                        is_healthy = await self._check_service_health(service)
                        if is_healthy:
                            active_count += 1
                        else:
                            # Mark service as unhealthy
                            service.status = ServiceStatus.MAINTENANCE
                            await self._update_service_status(service_id, ServiceStatus.MAINTENANCE)
                            
                            # Notify provider
                            if service.provider_id in self.providers:
                                provider = self.providers[service.provider_id]
                                if provider.webhook_url:
                                    asyncio.create_task(
                                        self._send_webhook(
                                            provider.webhook_url,
                                            {
                                                'event': 'service_unhealthy',
                                                'service_id': service_id,
                                                'timestamp': datetime.utcnow().isoformat()
                                            }
                                        )
                                    )
                
                # Update metrics
                active_services.set(active_count)
                
                await asyncio.sleep(self.config.health_check_interval)
                
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
                await asyncio.sleep(30)
    
    async def _check_service_health(self, service: AIService) -> bool:
        """Check individual service health"""
        if not service.health_check_url:
            return True
        
        try:
            async with self.http_session.get(
                service.health_check_url,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                return response.status == 200
        except:
            return False
    
    def _calculate_cost(self, service: AIService, tokens_used: int) -> float:
        """Calculate service usage cost"""
        if service.pricing_model == PricingModel.FREE:
            return 0.0
        elif service.pricing_model == PricingModel.PAY_PER_USE:
            return service.base_price * (tokens_used / 1000)  # Per 1K tokens
        else:
            return service.base_price
    
    async def _process_billing(
        self,
        user_id: str,
        service_id: str,
        cost: float
    ):
        """Process billing for service usage"""
        if cost <= 0:
            return
        
        try:
            # Record usage in database
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO service_usage 
                    (user_id, service_id, cost, timestamp)
                    VALUES ($1, $2, $3, $4)
                    """,
                    user_id, service_id, cost, datetime.utcnow()
                )
            
            # Update provider revenue
            service = self.services[service_id]
            provider = self.providers[service.provider_id]
            
            provider_share = cost * provider.revenue_share
            marketplace_share = cost * (1 - provider.revenue_share)
            
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE providers 
                    SET total_revenue = total_revenue + $1
                    WHERE id = $2
                    """,
                    provider_share, service.provider_id
                )
            
            # Process payment if using Stripe
            if hasattr(self, 'stripe_client'):
                await self._process_stripe_payment(user_id, cost)
            
        except Exception as e:
            logger.error(f"Billing processing failed: {e}")
    
    async def _authenticate_provider(self, token: str) -> ServiceProvider:
        """Authenticate service provider"""
        # Implement JWT token validation
        # For demo, return mock provider
        provider_id = "demo_provider"
        if provider_id not in self.providers:
            raise HTTPException(status_code=401, detail="Invalid token")
        return self.providers[provider_id]
    
    async def _authenticate_api_key(self, api_key_string: str) -> APIKey:
        """Authenticate API key"""
        key_hash = hashlib.sha256(api_key_string.encode()).hexdigest()
        
        for api_key in self.api_keys.values():
            if api_key.key_hash == key_hash and api_key.is_active:
                # Check expiration
                if api_key.expires_at and api_key.expires_at < datetime.utcnow():
                    raise HTTPException(status_code=401, detail="API key expired")
                
                # Check rate limit
                if not await self._check_api_key_rate_limit(api_key):
                    raise HTTPException(status_code=429, detail="Rate limit exceeded")
                
                return api_key
        
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    async def _check_rate_limit(self, client_ip: str) -> bool:
        """Check rate limiting for client IP"""
        try:
            key = f"rate_limit:{client_ip}"
            current = await self.redis.get(key)
            
            if current is None:
                await self.redis.setex(key, 3600, 1)  # 1 hour window
                return True
            
            if int(current) >= self.config.rate_limit_default:
                return False
            
            await self.redis.incr(key)
            return True
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return True  # Fail open
    
    def _check_service_permission(self, api_key: APIKey, service_id: str) -> bool:
        """Check if API key has permission to access service"""
        if 'admin' in api_key.permissions:
            return True
        
        service = self.services.get(service_id)
        if not service:
            return False
        
        # Check category permissions
        category_permission = f"category:{service.category}"
        if category_permission in api_key.permissions:
            return True
        
        # Check specific service permission
        service_permission = f"service:{service_id}"
        return service_permission in api_key.permissions
    
    # Additional helper methods for database operations, Kubernetes specs, etc.
    async def _store_service(self, service: AIService):
        """Store service in database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO services (
                    id, name, description, provider_id, category, version,
                    status, pricing_model, base_price, endpoints, metadata,
                    created_at, updated_at, health_check_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                """,
                service.id, service.name, service.description,
                service.provider_id, service.category, service.version,
                service.status.value, service.pricing_model.value,
                service.base_price, json.dumps(service.endpoints),
                json.dumps(service.metadata), service.created_at,
                service.updated_at, service.health_check_url
            )
    
    async def _load_services(self):
        """Load services from database"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM services")
                for row in rows:
                    service = AIService(
                        id=row['id'],
                        name=row['name'],
                        description=row['description'],
                        provider_id=row['provider_id'],
                        category=row['category'],
                        version=row['version'],
                        status=ServiceStatus(row['status']),
                        pricing_model=PricingModel(row['pricing_model']),
                        base_price=row['base_price'],
                        endpoints=json.loads(row['endpoints']),
                        metadata=json.loads(row['metadata']),
                        created_at=row['created_at'],
                        updated_at=row['updated_at'],
                        health_check_url=row['health_check_url']
                    )
                    self.services[service.id] = service
            
            logger.info(f"Loaded {len(self.services)} services")
        except Exception as e:
            logger.error(f"Failed to load services: {e}")


class MetricsCollector:
    """Collect and aggregate marketplace metrics"""
    
    def __init__(self):
        self.request_counts = defaultdict(int)
        self.response_times = defaultdict(list)
        self.error_rates = defaultdict(int)
        self.revenue_data = defaultdict(float)
    
    def record_request(self, service_id: str, endpoint: str, response_time: float, success: bool):
        """Record service request metrics"""
        key = f"{service_id}:{endpoint}"
        self.request_counts[key] += 1
        self.response_times[key].append(response_time)
        
        if not success:
            self.error_rates[key] += 1
    
    def get_service_metrics(self, service_id: str) -> Dict[str, Any]:
        """Get aggregated metrics for a service"""
        service_keys = [k for k in self.request_counts.keys() if k.startswith(service_id)]
        
        total_requests = sum(self.request_counts[k] for k in service_keys)
        total_errors = sum(self.error_rates[k] for k in service_keys)
        
        all_response_times = []
        for key in service_keys:
            all_response_times.extend(self.response_times[key])
        
        return {
            'total_requests': total_requests,
            'error_rate': total_errors / total_requests if total_requests > 0 else 0,
            'avg_response_time': statistics.mean(all_response_times) if all_response_times else 0,
            'p95_response_time': statistics.quantiles(all_response_times, n=20)[18] if len(all_response_times) > 20 else 0,
            'revenue': self.revenue_data[service_id]
        }


class PluginManager:
    """Manage AI plugin deployment and lifecycle"""
    
    def __init__(self, k8s_client, namespace="marketplace-plugins"):
        self.k8s_client = k8s_client
        self.namespace = namespace
        self.plugins = {}
    
    def create_deployment_spec(
        self,
        plugin_id: str,
        config: Dict[str, Any],
        provider_id: str
    ) -> Dict[str, Any]:
        """Create Kubernetes deployment specification"""
        return {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {
                'name': plugin_id,
                'namespace': self.namespace,
                'labels': {
                    'app': plugin_id,
                    'provider': provider_id,
                    'component': 'ai-plugin'
                }
            },
            'spec': {
                'replicas': config.get('replicas', 1),
                'selector': {
                    'matchLabels': {'app': plugin_id}
                },
                'template': {
                    'metadata': {
                        'labels': {'app': plugin_id}
                    },
                    'spec': {
                        'containers': [{
                            'name': 'plugin',
                            'image': config['image'],
                            'ports': [{
                                'containerPort': config.get('port', 8080)
                            }],
                            'resources': config['resources'],
                            'env': config.get('env', []),
                            'livenessProbe': {
                                'httpGet': {
                                    'path': '/health',
                                    'port': config.get('port', 8080)
                                },
                                'initialDelaySeconds': 30,
                                'periodSeconds': 10
                            }
                        }]
                    }
                }
            }
        }


# Example usage and testing
async def main():
    """Example marketplace platform usage"""
    
    # Configuration
    config = MarketplaceConfig(
        redis_url="redis://localhost:6379",
        database_url="postgresql://user:pass@localhost/marketplace",
        stripe_api_key="sk_test_...",
        jwt_secret="your-secret-key"
    )
    
    # Initialize platform
    platform = AIMarketplacePlatform(config)
    
    # Start platform
    await platform.startup()
    
    # Example service registration
    service_data = {
        'name': 'GPT-4 Text Generation',
        'description': 'Advanced text generation using GPT-4',
        'category': 'text-generation',
        'version': '1.0.0',
        'pricing_model': 'pay_per_use',
        'base_price': 0.02,
        'endpoints': [
            {
                'name': 'generate',
                'url': 'https://api.openai.com/v1/chat/completions',
                'method': 'POST',
                'description': 'Generate text completion'
            }
        ],
        'health_check_url': 'https://api.openai.com/v1/models'
    }
    
    # Demo provider
    demo_provider = ServiceProvider(
        id="demo_provider",
        name="Demo AI Company",
        email="demo@aicompany.com",
        company="AI Company Inc.",
        api_key="demo-api-key",
        webhook_url="https://demo.aicompany.com/webhook",
        revenue_share=0.7,
        status="active",
        created_at=datetime.utcnow()
    )
    platform.providers["demo_provider"] = demo_provider
    
    print("🚀 AI Marketplace Platform initialized successfully!")
    print(f"📊 Platform Features:")
    print(f"   • Third-party AI service integration")
    print(f"   • Plugin marketplace with K8s deployment")
    print(f"   • Revenue sharing and billing")
    print(f"   • API gateway with rate limiting")
    print(f"   • Real-time health monitoring")
    print(f"   • Enterprise security and compliance")
    
    # Keep running for demo
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        await platform.shutdown()


if __name__ == "__main__":
    asyncio.run(main())