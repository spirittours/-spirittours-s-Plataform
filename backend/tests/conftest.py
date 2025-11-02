"""
Pytest Configuration and Fixtures

Provides shared fixtures for all tests.
"""

import pytest
import asyncio
from typing import Generator, AsyncGenerator
from decimal import Decimal
from datetime import date, datetime, timedelta

# Test fixtures
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_customer_data():
    """Sample customer data for testing."""
    return {
        "customer_id": "CUST-TEST-001",
        "name": "Juan Pérez",
        "email": "juan.perez@example.com",
        "phone": "+34600123456",
        "nif": "12345678A",
        "address": {
            "street": "Calle Mayor 123",
            "city": "Madrid",
            "postal_code": "28001",
            "country": "España"
        }
    }


@pytest.fixture
def sample_booking_data():
    """Sample booking data for testing."""
    return {
        "booking_id": "BK-TEST-001",
        "customer_id": "CUST-TEST-001",
        "booking_date": date.today().isoformat(),
        "travel_date": (date.today() + timedelta(days=30)).isoformat(),
        "destination": "Barcelona",
        "status": "confirmed",
        "total_amount": Decimal("1500.00"),
        "products": [
            {
                "type": "flight",
                "description": "Vuelo Madrid-Barcelona",
                "price": Decimal("150.00")
            },
            {
                "type": "hotel",
                "description": "Hotel 4* Barcelona - 3 noches",
                "price": Decimal("450.00")
            }
        ]
    }


@pytest.fixture
def sample_invoice_data():
    """Sample invoice data for testing."""
    return {
        "invoice_number": "INV-TEST-001",
        "issue_date": date.today().isoformat(),
        "due_date": (date.today() + timedelta(days=30)).isoformat(),
        "customer": {
            "name": "Juan Pérez",
            "nif": "12345678A",
            "address": "Calle Mayor 123, Madrid"
        },
        "lines": [
            {
                "description": "Paquete turístico Barcelona",
                "quantity": Decimal("1"),
                "unit_price": Decimal("1500.00"),
                "tax_rate": Decimal("21"),
                "total": Decimal("1815.00")
            }
        ],
        "subtotal": Decimal("1500.00"),
        "tax_amount": Decimal("315.00"),
        "total_amount": Decimal("1815.00")
    }


@pytest.fixture
def sample_agent_data():
    """Sample agent data for testing."""
    return {
        "agent_code": "AG-TEST-001",
        "name": "Agencia Test",
        "email": "agencia@test.com",
        "phone": "+34600999888",
        "commission_rate": Decimal("10"),
        "status": "active",
        "tier": "bronze"
    }


@pytest.fixture
def sample_commission_data():
    """Sample commission data for testing."""
    return {
        "commission_code": "COMM-TEST-001",
        "agent_id": 1,
        "booking_id": "BK-TEST-001",
        "booking_amount": Decimal("1500.00"),
        "commission_rate": Decimal("10"),
        "commission_amount": Decimal("150.00"),
        "status": "pending",
        "generated_at": datetime.now().isoformat()
    }


@pytest.fixture
def sample_bundle_data():
    """Sample bundle data for testing."""
    return {
        "bundle_id": "BUNDLE-TEST-001",
        "bundle_name": "Paquete Barcelona Premium",
        "bundle_type": "premium",
        "products": [
            {
                "product_id": "PROD-001",
                "type": "flight",
                "name": "Vuelo MAD-BCN",
                "price": 150.00
            },
            {
                "product_id": "PROD-002",
                "type": "hotel",
                "name": "Hotel 4* Barcelona",
                "price": 450.00
            },
            {
                "product_id": "PROD-003",
                "type": "transport",
                "name": "Traslados aeropuerto",
                "price": 50.00
            }
        ],
        "base_price": 650.00,
        "discounted_price": 520.00,
        "discount_percentage": 20.0
    }


@pytest.fixture
def sample_recommendation_data():
    """Sample AI recommendation data for testing."""
    return {
        "recommendation_id": "REC-TEST-001",
        "customer_id": "CUST-TEST-001",
        "type": "destination",
        "destination": "Barcelona",
        "estimated_price": 1500.00,
        "confidence_score": 85.0,
        "reasoning": [
            "Basado en tu historial de viajes",
            "Dentro de tu rango de presupuesto",
            "Alta valoración de clientes similares"
        ]
    }


# Mock database fixtures
@pytest.fixture
def mock_db_session():
    """Mock database session for testing."""
    class MockSession:
        def __init__(self):
            self.data = {}
            self.committed = False
            self.rolled_back = False
        
        async def commit(self):
            self.committed = True
        
        async def rollback(self):
            self.rolled_back = False
        
        async def close(self):
            pass
    
    return MockSession()


@pytest.fixture
def mock_cache():
    """Mock cache for testing."""
    class MockCache:
        def __init__(self):
            self.data = {}
        
        async def get(self, key):
            return self.data.get(key)
        
        async def set(self, key, value, expire=None):
            self.data[key] = value
        
        async def delete(self, key):
            if key in self.data:
                del self.data[key]
        
        async def clear(self):
            self.data.clear()
    
    return MockCache()


# API client fixtures
@pytest.fixture
def api_client():
    """Mock API client for testing."""
    from fastapi.testclient import TestClient
    # This would import your actual FastAPI app
    # from main import app
    # return TestClient(app)
    
    # For now, return a mock
    class MockClient:
        async def get(self, url, **kwargs):
            return MockResponse(200, {"status": "success"})
        
        async def post(self, url, **kwargs):
            return MockResponse(201, {"status": "created"})
        
        async def put(self, url, **kwargs):
            return MockResponse(200, {"status": "updated"})
        
        async def delete(self, url, **kwargs):
            return MockResponse(204, {})
    
    class MockResponse:
        def __init__(self, status_code, data):
            self.status_code = status_code
            self.data = data
        
        def json(self):
            return self.data
    
    return MockClient()


# Performance testing fixtures
@pytest.fixture
def performance_threshold():
    """Performance thresholds for tests."""
    return {
        "api_response_time_ms": 200,  # Max 200ms for API responses
        "database_query_time_ms": 100,  # Max 100ms for DB queries
        "cache_hit_rate": 0.80,  # Min 80% cache hit rate
        "memory_usage_mb": 512,  # Max 512MB memory usage
    }


# Security testing fixtures
@pytest.fixture
def security_headers():
    """Required security headers for testing."""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
    }


# Parametrize fixtures for comprehensive testing
@pytest.fixture(params=["credit_card", "debit_card", "paypal", "bank_transfer"])
def payment_methods(request):
    """Parametrized payment methods for testing."""
    return request.param


@pytest.fixture(params=[10, 50, 100, 500, 1000])
def load_test_users(request):
    """Parametrized user counts for load testing."""
    return request.param


# Cleanup fixtures
@pytest.fixture(autouse=True)
async def cleanup():
    """Cleanup after each test."""
    yield
    # Cleanup code here
    # Clear test data, close connections, etc.
    pass
