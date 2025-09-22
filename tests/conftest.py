"""
Pytest Configuration and Fixtures
Comprehensive testing setup for the enterprise B2C/B2B/B2B2C booking platform.

Features:
- Database test fixtures with isolation
- Authentication fixtures for different user types
- API client fixtures with mocking capabilities
- WebSocket testing fixtures
- Performance testing utilities
- Test data factories
"""

import asyncio
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Generator, AsyncGenerator
from unittest.mock import Mock, AsyncMock
import tempfile
import os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import Base, get_db
from backend.models.database_models import *
from backend.services.analytics_service import AnalyticsService
from backend.services.notification_service import NotificationService
from backend.services.payment_service import PaymentService
from backend.auth.auth_manager import create_access_token

# Test Database Configuration
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TEST_SYNC_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db_engine():
    """Create async database engine for testing."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        echo=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture(scope="function")
async def db_session(db_engine) -> AsyncSession:
    """Create database session for testing."""
    async_session = sessionmaker(
        db_engine, 
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture(scope="function")
def sync_db_engine():
    """Create sync database engine for testing."""
    engine = create_engine(
        TEST_SYNC_DATABASE_URL,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        echo=False
    )
    
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()

@pytest.fixture(scope="function")
def sync_db_session(sync_db_engine):
    """Create sync database session for testing."""
    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=sync_db_engine
    )
    
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture(scope="function")
def override_get_db(db_session):
    """Override database dependency for testing."""
    async def _override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def client(override_get_db):
    """Create test client."""
    with TestClient(app) as c:
        yield c

# User Fixtures
@pytest.fixture
async def admin_user(db_session):
    """Create admin user for testing."""
    user = User(
        id=1,
        email="admin@spirittours.com",
        first_name="Admin",
        last_name="User",
        hashed_password="$2b$12$test_hashed_password",
        role="admin",
        is_active=True,
        is_verified=True,
        created_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def b2c_user(db_session):
    """Create B2C user for testing."""
    user = User(
        id=2,
        email="customer@example.com",
        first_name="John",
        last_name="Doe",
        hashed_password="$2b$12$test_hashed_password",
        role="customer",
        is_active=True,
        is_verified=True,
        created_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def tour_operator_user(db_session):
    """Create tour operator user for testing."""
    user = User(
        id=3,
        email="operator@tourcompany.com",
        first_name="Tour",
        last_name="Operator",
        hashed_password="$2b$12$test_hashed_password",
        role="tour_operator",
        is_active=True,
        is_verified=True,
        created_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    
    # Create tour operator profile
    operator = TourOperator(
        user_id=user.id,
        company_name="Premium Tours Ltd",
        business_license="LIC123456",
        commission_rate=10.0,
        payment_terms="NET_30",
        is_active=True,
        created_at=datetime.utcnow()
    )
    db_session.add(operator)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def travel_agency_user(db_session):
    """Create travel agency user for testing."""
    user = User(
        id=4,
        email="agency@travelco.com",
        first_name="Travel",
        last_name="Agency",
        hashed_password="$2b$12$test_hashed_password",
        role="travel_agency",
        is_active=True,
        is_verified=True,
        created_at=datetime.utcnow()
    )
    db_session.add(user)
    await db_session.commit()
    
    # Create travel agency profile
    agency = TravelAgency(
        user_id=user.id,
        agency_name="Best Travel Agency",
        license_number="AGN789012",
        commission_rate=8.0,
        payment_terms="NET_15",
        is_active=True,
        created_at=datetime.utcnow()
    )
    db_session.add(agency)
    await db_session.commit()
    await db_session.refresh(user)
    return user

# Authentication Fixtures
@pytest.fixture
def admin_token(admin_user):
    """Create admin authentication token."""
    return create_access_token(
        data={"sub": admin_user.email, "user_id": admin_user.id, "role": admin_user.role}
    )

@pytest.fixture
def b2c_token(b2c_user):
    """Create B2C user authentication token."""
    return create_access_token(
        data={"sub": b2c_user.email, "user_id": b2c_user.id, "role": b2c_user.role}
    )

@pytest.fixture
def tour_operator_token(tour_operator_user):
    """Create tour operator authentication token."""
    return create_access_token(
        data={"sub": tour_operator_user.email, "user_id": tour_operator_user.id, "role": tour_operator_user.role}
    )

@pytest.fixture
def travel_agency_token(travel_agency_user):
    """Create travel agency authentication token."""
    return create_access_token(
        data={"sub": travel_agency_user.email, "user_id": travel_agency_user.id, "role": travel_agency_user.role}
    )

@pytest.fixture
def auth_headers(admin_token):
    """Create authorization headers."""
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def b2c_auth_headers(b2c_token):
    """Create B2C authorization headers."""
    return {"Authorization": f"Bearer {b2c_token}"}

@pytest.fixture
def tour_operator_auth_headers(tour_operator_token):
    """Create tour operator authorization headers."""
    return {"Authorization": f"Bearer {tour_operator_token}"}

# Service Fixtures
@pytest.fixture
def analytics_service(db_session):
    """Create analytics service for testing."""
    return AnalyticsService(db_session)

@pytest.fixture
def notification_service():
    """Create notification service for testing."""
    return NotificationService()

@pytest.fixture
def payment_service():
    """Create payment service for testing."""
    return PaymentService()

# Mock Fixtures
@pytest.fixture
def mock_stripe():
    """Mock Stripe service."""
    mock = Mock()
    mock.PaymentIntent.create = Mock(return_value=Mock(
        id="pi_test_123",
        status="succeeded",
        amount=10000,
        currency="eur",
        client_secret="pi_test_123_secret"
    ))
    mock.PaymentIntent.retrieve = Mock(return_value=Mock(
        id="pi_test_123",
        status="succeeded",
        amount=10000,
        currency="eur"
    ))
    return mock

@pytest.fixture
def mock_sendgrid():
    """Mock SendGrid service."""
    mock = Mock()
    mock.send = AsyncMock(return_value=Mock(status_code=202))
    return mock

@pytest.fixture
def mock_twilio():
    """Mock Twilio service."""
    mock = Mock()
    mock.messages.create = Mock(return_value=Mock(
        sid="SM123456789",
        status="sent",
        to="+1234567890",
        body="Test message"
    ))
    return mock

# Data Fixtures
@pytest.fixture
async def sample_booking_request(db_session, b2c_user):
    """Create sample booking request for testing."""
    booking = BookingRequest(
        user_id=b2c_user.id,
        product_name="Madrid City Tour",
        destination="Madrid, Spain",
        travel_date=datetime.utcnow() + timedelta(days=7),
        participants=2,
        total_amount=150.0,
        currency="EUR",
        status="confirmed",
        booking_reference="BK123456789",
        created_at=datetime.utcnow()
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)
    return booking

@pytest.fixture
async def sample_payment_transaction(db_session, sample_booking_request):
    """Create sample payment transaction for testing."""
    payment = PaymentTransaction(
        booking_id=sample_booking_request.id,
        amount=150.0,
        currency="EUR",
        payment_method="card",
        provider="stripe",
        provider_transaction_id="pi_test_123",
        status="completed",
        created_at=datetime.utcnow()
    )
    db_session.add(payment)
    await db_session.commit()
    await db_session.refresh(payment)
    return payment

@pytest.fixture
async def sample_ai_query_log(db_session, b2c_user):
    """Create sample AI query log for testing."""
    query_log = AIQueryLog(
        user_id=b2c_user.id,
        agent_name="CustomerProphet",
        query_text="What are the best tours in Madrid?",
        response_text="Here are the top-rated tours in Madrid...",
        query_metadata={"intent": "tour_recommendation"},
        response_metadata={"satisfaction": 4.5},
        response_time_ms=250,
        status="completed",
        created_at=datetime.utcnow()
    )
    db_session.add(query_log)
    await db_session.commit()
    await db_session.refresh(query_log)
    return query_log

@pytest.fixture
async def sample_notification_log(db_session, b2c_user):
    """Create sample notification log for testing."""
    notification = NotificationLog(
        user_id=b2c_user.id,
        notification_type="booking_confirmation",
        channel="email",
        recipient="customer@example.com",
        subject="Booking Confirmation",
        content="Your booking has been confirmed",
        delivery_status="delivered",
        provider="sendgrid",
        metadata={"opened": True},
        created_at=datetime.utcnow()
    )
    db_session.add(notification)
    await db_session.commit()
    await db_session.refresh(notification)
    return notification

# WebSocket Testing Fixtures
@pytest.fixture
async def websocket_client():
    """Create WebSocket test client."""
    from starlette.testclient import TestClient as WebSocketTestClient
    
    client = WebSocketTestClient(app)
    yield client

# Performance Testing Fixtures
@pytest.fixture
def performance_config():
    """Configuration for performance testing."""
    return {
        "max_response_time": 500,  # milliseconds
        "concurrent_users": 10,
        "test_duration": 30,  # seconds
        "acceptable_error_rate": 0.01  # 1%
    }

# Test Data Factories
class TestDataFactory:
    """Factory for creating test data objects."""
    
    @staticmethod
    def create_user_data(role="customer", **kwargs):
        """Create user data for testing."""
        base_data = {
            "email": f"test_{role}@example.com",
            "first_name": "Test",
            "last_name": "User",
            "password": "testpassword123",
            "role": role,
            "phone": "+34123456789",
            "country": "ES",
            "language": "es"
        }
        base_data.update(kwargs)
        return base_data
    
    @staticmethod
    def create_booking_data(**kwargs):
        """Create booking data for testing."""
        base_data = {
            "product_name": "Test Tour",
            "destination": "Test City",
            "travel_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "participants": 2,
            "total_amount": 100.0,
            "currency": "EUR",
            "special_requirements": "Test requirements"
        }
        base_data.update(kwargs)
        return base_data
    
    @staticmethod
    def create_payment_data(**kwargs):
        """Create payment data for testing."""
        base_data = {
            "amount": 100.0,
            "currency": "EUR",
            "payment_method": "card",
            "provider": "stripe"
        }
        base_data.update(kwargs)
        return base_data

@pytest.fixture
def test_data_factory():
    """Provide test data factory."""
    return TestDataFactory

# Cleanup Fixtures
@pytest.fixture(autouse=True)
def cleanup_temp_files():
    """Automatically cleanup temporary files after tests."""
    temp_files = []
    
    def add_temp_file(filepath):
        temp_files.append(filepath)
    
    yield add_temp_file
    
    # Cleanup
    for filepath in temp_files:
        if os.path.exists(filepath):
            os.remove(filepath)

# Configuration Fixtures
@pytest.fixture
def test_config():
    """Test configuration settings."""
    return {
        "database_url": TEST_DATABASE_URL,
        "redis_url": "redis://localhost:6379/15",  # Test Redis DB
        "testing": True,
        "jwt_secret": "test_jwt_secret_key",
        "stripe_secret_key": "sk_test_fake_key",
        "sendgrid_api_key": "SG.fake_api_key",
        "twilio_auth_token": "fake_twilio_token"
    }

# Async Testing Utilities
@pytest.fixture
def async_test_runner():
    """Utility for running async tests."""
    def run_async(coro):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    return run_async

# Error Testing Fixtures
@pytest.fixture
def error_scenarios():
    """Common error scenarios for testing."""
    return {
        "database_error": Exception("Database connection failed"),
        "validation_error": ValueError("Invalid input data"),
        "authentication_error": PermissionError("Invalid credentials"),
        "payment_error": Exception("Payment processing failed"),
        "notification_error": Exception("Failed to send notification"),
        "network_error": ConnectionError("Network unavailable")
    }