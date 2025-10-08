"""
Agency Sandbox Environment System
Provides isolated testing environment for travel agencies
"""

import os
import uuid
import json
import random
import secrets
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import asyncio
import aiohttp
from faker import Faker
from enum import Enum
import docker
import kubernetes
from kubernetes import client, config
import redis
import postgresql
import logging

logger = logging.getLogger(__name__)
fake = Faker()

class SandboxStatus(Enum):
    """Sandbox environment status"""
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    TERMINATED = "terminated"


@dataclass
class SandboxConfig:
    """Sandbox environment configuration"""
    agency_id: str
    sandbox_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    environment_name: str = "sandbox"
    
    # Resource limits
    max_requests_per_minute: int = 100
    max_bookings: int = 1000
    max_users: int = 10
    data_retention_days: int = 30
    
    # Features
    enabled_providers: List[str] = field(default_factory=lambda: ["amadeus", "hotelbeds"])
    enabled_products: List[str] = field(default_factory=lambda: ["flight", "hotel", "activity"])
    mock_payments: bool = True
    mock_gds_responses: bool = True
    
    # URLs
    api_base_url: str = ""
    dashboard_url: str = ""
    documentation_url: str = ""
    
    # Credentials
    sandbox_api_key: str = ""
    sandbox_api_secret: str = ""
    
    # Expiration
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = field(default_factory=lambda: datetime.utcnow() + timedelta(days=90))


class MockDataGenerator:
    """Generates realistic mock data for sandbox testing"""
    
    def __init__(self):
        self.faker = Faker()
        self.airlines = ["AA", "UA", "DL", "BA", "LH", "AF", "EK", "SQ", "QR", "TK"]
        self.hotel_chains = ["Marriott", "Hilton", "Hyatt", "IHG", "Accor", "Wyndham"]
        self.airports = self._load_airports()
        
    def _load_airports(self) -> List[Dict]:
        """Load common airports for mock data"""
        return [
            {"code": "JFK", "city": "New York", "country": "US"},
            {"code": "LAX", "city": "Los Angeles", "country": "US"},
            {"code": "LHR", "city": "London", "country": "GB"},
            {"code": "CDG", "city": "Paris", "country": "FR"},
            {"code": "DXB", "city": "Dubai", "country": "AE"},
            {"code": "HKG", "city": "Hong Kong", "country": "HK"},
            {"code": "SIN", "city": "Singapore", "country": "SG"},
            {"code": "NRT", "city": "Tokyo", "country": "JP"},
            {"code": "SYD", "city": "Sydney", "country": "AU"},
            {"code": "MAD", "city": "Madrid", "country": "ES"}
        ]
    
    def generate_flight_search_results(self, search_params: Dict) -> List[Dict]:
        """Generate mock flight search results"""
        results = []
        num_results = random.randint(5, 15)
        
        for i in range(num_results):
            base_price = random.uniform(200, 2000)
            
            result = {
                "offer_id": f"MOCK-FL-{uuid.uuid4().hex[:8].upper()}",
                "airline": random.choice(self.airlines),
                "flight_number": f"{random.choice(self.airlines)}{random.randint(100, 999)}",
                "origin": search_params.get("origin", "JFK"),
                "destination": search_params.get("destination", "LAX"),
                "departure_time": self._random_datetime(days_ahead=30),
                "arrival_time": self._random_datetime(days_ahead=30, hours_ahead=random.randint(2, 15)),
                "duration": f"{random.randint(2, 15)}h {random.randint(0, 59)}m",
                "stops": random.choice([0, 0, 1, 1, 2]),
                "cabin_class": search_params.get("cabin_class", "economy"),
                "price": {
                    "base": base_price,
                    "taxes": base_price * 0.15,
                    "total": base_price * 1.15,
                    "currency": "USD"
                },
                "availability": random.randint(1, 9),
                "baggage": {
                    "cabin": "7kg",
                    "checked": random.choice(["0kg", "23kg", "2x23kg"])
                }
            }
            results.append(result)
        
        return sorted(results, key=lambda x: x["price"]["total"])
    
    def generate_hotel_search_results(self, search_params: Dict) -> List[Dict]:
        """Generate mock hotel search results"""
        results = []
        num_results = random.randint(10, 25)
        
        for i in range(num_results):
            nightly_rate = random.uniform(50, 500)
            nights = (search_params.get("check_out") - search_params.get("check_in")).days if search_params.get("check_in") else 1
            
            result = {
                "hotel_id": f"MOCK-HT-{uuid.uuid4().hex[:8].upper()}",
                "name": f"{random.choice(self.hotel_chains)} {self.faker.city()}",
                "chain": random.choice(self.hotel_chains),
                "address": self.faker.address(),
                "city": search_params.get("city", self.faker.city()),
                "country": self.faker.country_code(),
                "star_rating": random.choice([3, 3.5, 4, 4.5, 5]),
                "review_score": round(random.uniform(7.0, 9.8), 1),
                "review_count": random.randint(100, 5000),
                "amenities": random.sample([
                    "WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar",
                    "Business Center", "Pet Friendly", "Parking", "Airport Shuttle"
                ], k=random.randint(4, 8)),
                "room_types": self._generate_room_types(nightly_rate),
                "images": [f"https://mock-images.com/hotel/{i}/{j}.jpg" for j in range(5)],
                "cancellation_policy": random.choice([
                    "Free cancellation until 24 hours before",
                    "Free cancellation until 48 hours before",
                    "Non-refundable",
                    "Free cancellation"
                ]),
                "price": {
                    "nightly_rate": nightly_rate,
                    "total": nightly_rate * nights,
                    "taxes": nightly_rate * nights * 0.15,
                    "total_with_taxes": nightly_rate * nights * 1.15,
                    "currency": "USD"
                }
            }
            results.append(result)
        
        return sorted(results, key=lambda x: x["price"]["total"])
    
    def _generate_room_types(self, base_rate: float) -> List[Dict]:
        """Generate mock room types for a hotel"""
        room_types = []
        types = ["Standard", "Deluxe", "Suite", "Executive", "Presidential"]
        
        for i, room_type in enumerate(random.sample(types, k=random.randint(2, 4))):
            multiplier = 1 + (i * 0.3)
            room_types.append({
                "type": room_type,
                "beds": random.choice(["1 King", "2 Queens", "1 Queen", "2 Doubles"]),
                "max_occupancy": random.randint(2, 4),
                "size_sqm": random.randint(25, 80),
                "rate": base_rate * multiplier,
                "available": random.randint(1, 10)
            })
        
        return room_types
    
    def generate_booking_confirmation(self, booking_request: Dict) -> Dict:
        """Generate mock booking confirmation"""
        booking_id = f"MOCK-BK-{uuid.uuid4().hex[:10].upper()}"
        pnr = f"MOCK{random.randint(100000, 999999)}"
        
        return {
            "booking_id": booking_id,
            "pnr": pnr,
            "status": "confirmed",
            "created_at": datetime.utcnow().isoformat(),
            "product_type": booking_request.get("product_type"),
            "provider": "sandbox_mock",
            "total_amount": booking_request.get("amount", random.uniform(100, 2000)),
            "currency": "USD",
            "commission": {
                "rate": 0.10,
                "amount": booking_request.get("amount", 1000) * 0.10
            },
            "passenger_details": booking_request.get("passengers", []),
            "contact_info": booking_request.get("contact", {}),
            "payment_status": "completed" if booking_request.get("mock_payments") else "pending",
            "confirmation_email_sent": True,
            "documents": [
                f"https://sandbox.spirittours.com/documents/{booking_id}/ticket.pdf",
                f"https://sandbox.spirittours.com/documents/{booking_id}/invoice.pdf"
            ]
        }
    
    def _random_datetime(self, days_ahead: int = 30, hours_ahead: int = 0) -> str:
        """Generate random datetime string"""
        future = datetime.utcnow() + timedelta(
            days=random.randint(1, days_ahead),
            hours=random.randint(0, hours_ahead)
        )
        return future.isoformat()


class SandboxEnvironment:
    """Manages sandbox environment for agencies"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        self.mock_generator = MockDataGenerator()
        self.docker_client = None
        self.k8s_client = None
        self.redis_client = None
        
    async def initialize(self):
        """Initialize sandbox infrastructure"""
        try:
            # Initialize Docker client for container management
            self.docker_client = docker.from_env()
            
            # Initialize Kubernetes client
            config.load_incluster_config()
            self.k8s_client = client.CoreV1Api()
            
            # Initialize Redis for caching
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=6379,
                db=1  # Use separate DB for sandbox
            )
            
            logger.info("Sandbox infrastructure initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize sandbox infrastructure: {e}")
            raise
    
    async def create_sandbox(self, agency_id: str, config_overrides: Dict = None) -> Dict:
        """Create new sandbox environment for agency"""
        
        # Create sandbox configuration
        sandbox_config = SandboxConfig(agency_id=agency_id)
        
        # Apply any configuration overrides
        if config_overrides:
            for key, value in config_overrides.items():
                if hasattr(sandbox_config, key):
                    setattr(sandbox_config, key, value)
        
        # Generate sandbox credentials
        sandbox_config.sandbox_api_key = f"sb_pk_{secrets.token_urlsafe(32)}"
        sandbox_config.sandbox_api_secret = f"sb_sk_{secrets.token_urlsafe(48)}"
        
        # Create isolated namespace in Kubernetes
        namespace_name = f"sandbox-{agency_id[:8]}-{sandbox_config.sandbox_id[:8]}"
        await self._create_kubernetes_namespace(namespace_name)
        
        # Deploy sandbox services
        services = await self._deploy_sandbox_services(namespace_name, sandbox_config)
        
        # Configure sandbox URLs
        sandbox_config.api_base_url = f"https://sandbox-{sandbox_config.sandbox_id[:8]}.api.spirittours.com"
        sandbox_config.dashboard_url = f"https://sandbox-{sandbox_config.sandbox_id[:8]}.spirittours.com"
        sandbox_config.documentation_url = "https://docs.spirittours.com/sandbox"
        
        # Store sandbox configuration
        await self._store_sandbox_config(sandbox_config)
        
        # Create sample data
        await self._create_sample_data(sandbox_config)
        
        # Send sandbox credentials
        await self._send_sandbox_credentials(agency_id, sandbox_config)
        
        return {
            "sandbox_id": sandbox_config.sandbox_id,
            "status": SandboxStatus.ACTIVE.value,
            "api_base_url": sandbox_config.api_base_url,
            "dashboard_url": sandbox_config.dashboard_url,
            "credentials": {
                "api_key": sandbox_config.sandbox_api_key,
                "api_secret": sandbox_config.sandbox_api_secret[:10] + "..."  # Partial display
            },
            "expires_at": sandbox_config.expires_at.isoformat(),
            "limits": {
                "max_requests_per_minute": sandbox_config.max_requests_per_minute,
                "max_bookings": sandbox_config.max_bookings,
                "max_users": sandbox_config.max_users
            },
            "enabled_features": {
                "providers": sandbox_config.enabled_providers,
                "products": sandbox_config.enabled_products,
                "mock_payments": sandbox_config.mock_payments
            }
        }
    
    async def _create_kubernetes_namespace(self, namespace_name: str):
        """Create isolated Kubernetes namespace for sandbox"""
        namespace = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=namespace_name,
                labels={
                    "type": "sandbox",
                    "managed-by": "spirit-tours"
                }
            )
        )
        
        try:
            self.k8s_client.create_namespace(namespace)
            logger.info(f"Created namespace: {namespace_name}")
        except Exception as e:
            logger.error(f"Failed to create namespace: {e}")
    
    async def _deploy_sandbox_services(self, namespace: str, config: SandboxConfig) -> Dict:
        """Deploy sandbox services in isolated namespace"""
        services = {}
        
        # Deploy sandbox API service
        api_deployment = {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": "sandbox-api",
                "namespace": namespace
            },
            "spec": {
                "replicas": 1,
                "selector": {
                    "matchLabels": {"app": "sandbox-api"}
                },
                "template": {
                    "metadata": {
                        "labels": {"app": "sandbox-api"}
                    },
                    "spec": {
                        "containers": [{
                            "name": "api",
                            "image": "spirittours/sandbox-api:latest",
                            "env": [
                                {"name": "SANDBOX_ID", "value": config.sandbox_id},
                                {"name": "AGENCY_ID", "value": config.agency_id},
                                {"name": "MOCK_MODE", "value": "true"}
                            ],
                            "resources": {
                                "limits": {
                                    "cpu": "500m",
                                    "memory": "512Mi"
                                },
                                "requests": {
                                    "cpu": "100m",
                                    "memory": "128Mi"
                                }
                            }
                        }]
                    }
                }
            }
        }
        
        # Store deployment configuration
        services["api"] = api_deployment
        
        return services
    
    async def _create_sample_data(self, config: SandboxConfig):
        """Create sample data for sandbox testing"""
        
        # Create sample bookings
        sample_bookings = []
        for i in range(10):
            booking = {
                "id": f"SAMPLE-{uuid.uuid4().hex[:8].upper()}",
                "type": random.choice(["flight", "hotel", "package"]),
                "status": random.choice(["confirmed", "pending", "cancelled"]),
                "amount": random.uniform(100, 5000),
                "date": (datetime.utcnow() - timedelta(days=random.randint(1, 30))).isoformat(),
                "passenger": self.mock_generator.faker.name(),
                "commission": random.uniform(10, 500)
            }
            sample_bookings.append(booking)
        
        # Store in sandbox database
        sandbox_key = f"sandbox:{config.sandbox_id}:bookings"
        self.redis_client.set(sandbox_key, json.dumps(sample_bookings))
        
        # Create sample search templates
        search_templates = {
            "flights": [
                {"origin": "JFK", "destination": "LAX", "date": "2024-06-15"},
                {"origin": "LHR", "destination": "CDG", "date": "2024-07-20"},
                {"origin": "DXB", "destination": "SIN", "date": "2024-08-10"}
            ],
            "hotels": [
                {"city": "New York", "check_in": "2024-06-15", "check_out": "2024-06-18"},
                {"city": "Paris", "check_in": "2024-07-20", "check_out": "2024-07-25"},
                {"city": "Dubai", "check_in": "2024-08-10", "check_out": "2024-08-15"}
            ]
        }
        
        templates_key = f"sandbox:{config.sandbox_id}:templates"
        self.redis_client.set(templates_key, json.dumps(search_templates))
    
    async def _store_sandbox_config(self, config: SandboxConfig):
        """Store sandbox configuration"""
        config_key = f"sandbox:config:{config.sandbox_id}"
        config_data = {
            "agency_id": config.agency_id,
            "sandbox_id": config.sandbox_id,
            "created_at": config.created_at.isoformat(),
            "expires_at": config.expires_at.isoformat(),
            "api_key": config.sandbox_api_key,
            "api_secret": config.sandbox_api_secret,
            "api_base_url": config.api_base_url,
            "dashboard_url": config.dashboard_url,
            "limits": {
                "max_requests_per_minute": config.max_requests_per_minute,
                "max_bookings": config.max_bookings,
                "max_users": config.max_users
            },
            "features": {
                "providers": config.enabled_providers,
                "products": config.enabled_products,
                "mock_payments": config.mock_payments
            }
        }
        
        self.redis_client.set(config_key, json.dumps(config_data))
        self.redis_client.expire(config_key, 86400 * config.data_retention_days)
    
    async def _send_sandbox_credentials(self, agency_id: str, config: SandboxConfig):
        """Send sandbox credentials to agency"""
        # Implementation depends on your notification service
        logger.info(f"Sandbox credentials sent to agency {agency_id}")


class SandboxAPI:
    """API endpoints for sandbox environment"""
    
    def __init__(self, sandbox_env: SandboxEnvironment):
        self.sandbox_env = sandbox_env
        self.mock_generator = MockDataGenerator()
    
    async def handle_search_request(self, sandbox_id: str, request_type: str, params: Dict) -> Dict:
        """Handle search request in sandbox environment"""
        
        # Verify sandbox exists and is active
        config = await self._get_sandbox_config(sandbox_id)
        if not config:
            return {"error": "Sandbox not found"}
        
        # Check rate limits
        if not await self._check_rate_limit(sandbox_id):
            return {"error": "Rate limit exceeded"}
        
        # Generate mock response based on request type
        if request_type == "flight_search":
            results = self.mock_generator.generate_flight_search_results(params)
        elif request_type == "hotel_search":
            results = self.mock_generator.generate_hotel_search_results(params)
        else:
            return {"error": "Unsupported search type"}
        
        # Log request for analytics
        await self._log_request(sandbox_id, request_type, params)
        
        return {
            "success": True,
            "sandbox_mode": True,
            "results": results,
            "meta": {
                "total_results": len(results),
                "search_id": f"SB-SEARCH-{uuid.uuid4().hex[:8].upper()}",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    
    async def handle_booking_request(self, sandbox_id: str, booking_data: Dict) -> Dict:
        """Handle booking request in sandbox environment"""
        
        # Verify sandbox
        config = await self._get_sandbox_config(sandbox_id)
        if not config:
            return {"error": "Sandbox not found"}
        
        # Check booking limits
        booking_count = await self._get_booking_count(sandbox_id)
        if booking_count >= config.get("limits", {}).get("max_bookings", 1000):
            return {"error": "Booking limit reached for sandbox"}
        
        # Generate mock booking confirmation
        confirmation = self.mock_generator.generate_booking_confirmation(booking_data)
        
        # Store booking in sandbox
        await self._store_booking(sandbox_id, confirmation)
        
        # Log for analytics
        await self._log_booking(sandbox_id, confirmation)
        
        return {
            "success": True,
            "sandbox_mode": True,
            "booking": confirmation,
            "message": "This is a sandbox booking and will not be processed in production"
        }
    
    async def get_sandbox_statistics(self, sandbox_id: str) -> Dict:
        """Get usage statistics for sandbox"""
        
        config = await self._get_sandbox_config(sandbox_id)
        if not config:
            return {"error": "Sandbox not found"}
        
        stats = {
            "sandbox_id": sandbox_id,
            "created_at": config.get("created_at"),
            "expires_at": config.get("expires_at"),
            "usage": {
                "total_requests": await self._get_request_count(sandbox_id),
                "total_bookings": await self._get_booking_count(sandbox_id),
                "requests_today": await self._get_request_count(sandbox_id, today=True),
                "bookings_today": await self._get_booking_count(sandbox_id, today=True)
            },
            "limits": config.get("limits", {}),
            "popular_routes": await self._get_popular_routes(sandbox_id),
            "api_performance": {
                "average_response_time": "125ms",
                "uptime": "99.9%"
            }
        }
        
        return stats
    
    async def _get_sandbox_config(self, sandbox_id: str) -> Optional[Dict]:
        """Retrieve sandbox configuration"""
        config_key = f"sandbox:config:{sandbox_id}"
        config_data = self.sandbox_env.redis_client.get(config_key)
        
        if config_data:
            return json.loads(config_data)
        return None
    
    async def _check_rate_limit(self, sandbox_id: str) -> bool:
        """Check if request is within rate limits"""
        rate_key = f"sandbox:rate:{sandbox_id}:{datetime.utcnow().minute}"
        current_count = self.sandbox_env.redis_client.incr(rate_key)
        self.sandbox_env.redis_client.expire(rate_key, 60)
        
        config = await self._get_sandbox_config(sandbox_id)
        max_rpm = config.get("limits", {}).get("max_requests_per_minute", 100)
        
        return current_count <= max_rpm
    
    async def _log_request(self, sandbox_id: str, request_type: str, params: Dict):
        """Log API request for analytics"""
        log_key = f"sandbox:logs:{sandbox_id}:{datetime.utcnow().strftime('%Y%m%d')}"
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": request_type,
            "params": params
        }
        self.sandbox_env.redis_client.lpush(log_key, json.dumps(log_entry))
        self.sandbox_env.redis_client.expire(log_key, 86400 * 30)  # 30 days retention
    
    async def _log_booking(self, sandbox_id: str, booking: Dict):
        """Log booking for analytics"""
        booking_key = f"sandbox:bookings:{sandbox_id}"
        self.sandbox_env.redis_client.lpush(booking_key, json.dumps(booking))
    
    async def _store_booking(self, sandbox_id: str, booking: Dict):
        """Store booking in sandbox"""
        booking_key = f"sandbox:booking:{sandbox_id}:{booking['booking_id']}"
        self.sandbox_env.redis_client.set(booking_key, json.dumps(booking))
        self.sandbox_env.redis_client.expire(booking_key, 86400 * 30)
    
    async def _get_request_count(self, sandbox_id: str, today: bool = False) -> int:
        """Get request count for sandbox"""
        if today:
            log_key = f"sandbox:logs:{sandbox_id}:{datetime.utcnow().strftime('%Y%m%d')}"
        else:
            log_key = f"sandbox:logs:{sandbox_id}:*"
        
        # Implementation depends on your counting logic
        return random.randint(100, 1000)  # Placeholder
    
    async def _get_booking_count(self, sandbox_id: str, today: bool = False) -> int:
        """Get booking count for sandbox"""
        booking_key = f"sandbox:bookings:{sandbox_id}"
        count = self.sandbox_env.redis_client.llen(booking_key)
        return count
    
    async def _get_popular_routes(self, sandbox_id: str) -> List[Dict]:
        """Get popular routes from sandbox usage"""
        # Placeholder implementation
        return [
            {"route": "JFK-LAX", "searches": 45},
            {"route": "LHR-CDG", "searches": 38},
            {"route": "DXB-SIN", "searches": 27}
        ]


# Export classes
__all__ = [
    'SandboxStatus',
    'SandboxConfig',
    'MockDataGenerator',
    'SandboxEnvironment',
    'SandboxAPI'
]