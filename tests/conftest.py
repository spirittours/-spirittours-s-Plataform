"""
Configuración global de pytest para todos los tests
"""
import pytest
import asyncio
import os
import sys
from typing import Generator, AsyncGenerator
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timedelta

# Agregar el directorio backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from fastapi.testclient import TestClient
from fastapi import FastAPI
import jwt

# Import models and database
from backend.models.base import Base
from backend.models.user import User
from backend.models.booking import Booking
from backend.models.payment import Payment
from backend.models.notification import NotificationLog
from backend.config import settings

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TEST_DATABASE_URL_SYNC = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def async_engine():
    """Create async test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture(scope="function")
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create async database session for testing."""
    async_session_maker = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_maker() as session:
        yield session

@pytest.fixture(scope="function")
def sync_engine():
    """Create sync test database engine."""
    engine = create_engine(TEST_DATABASE_URL_SYNC, echo=False)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(sync_engine) -> Generator[Session, None, None]:
    """Create sync database session for testing."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def test_app() -> FastAPI:
    """Create FastAPI test application."""
    from backend.main import app
    return app

@pytest.fixture
def client(test_app, db_session) -> TestClient:
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for testing."""
    token = create_test_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_user(db_session) -> User:
    """Create a test user."""
    user = User(
        id="test-user-123",
        email="test@example.com",
        username="testuser",
        password_hash="$2b$12$test_password_hash",
        full_name="Test User",
        role="user",
        is_active=True,
        created_at=datetime.utcnow()
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def test_admin_user(db_session) -> User:
    """Create a test admin user."""
    admin = User(
        id="admin-user-123",
        email="admin@example.com",
        username="adminuser",
        password_hash="$2b$12$admin_password_hash",
        full_name="Admin User",
        role="admin",
        is_active=True,
        created_at=datetime.utcnow()
    )
    db_session.add(admin)
    db_session.commit()
    return admin

@pytest.fixture
def test_booking(db_session, test_user) -> Booking:
    """Create a test booking."""
    booking = Booking(
        id="booking-123",
        user_id=test_user.id,
        tour_id="tour-456",
        booking_date=datetime.utcnow().date(),
        total_amount=1000.00,
        status="confirmed",
        created_at=datetime.utcnow()
    )
    db_session.add(booking)
    db_session.commit()
    return booking

@pytest.fixture
def mock_payment_service():
    """Mock payment service for testing."""
    mock_service = AsyncMock()
    mock_service.process_payment.return_value = {
        "success": True,
        "transaction_id": "txn_123456",
        "status": "completed",
        "amount": 1000.00
    }
    mock_service.refund_payment.return_value = {
        "success": True,
        "refund_id": "ref_123456",
        "status": "refunded"
    }
    return mock_service

@pytest.fixture
def mock_notification_service():
    """Mock notification service for testing."""
    mock_service = AsyncMock()
    mock_service.send_email.return_value = {
        "success": True,
        "message_id": "msg_123456"
    }
    mock_service.send_sms.return_value = {
        "success": True,
        "message_id": "sms_123456"
    }
    return mock_service

@pytest.fixture
def mock_ai_service():
    """Mock AI orchestrator service for testing."""
    mock_service = AsyncMock()
    mock_service.query_agent.return_value = {
        "success": True,
        "response": "AI generated response",
        "agent_id": "agent_123",
        "confidence": 0.95
    }
    return mock_service

@pytest.fixture
def mock_redis_client():
    """Mock Redis client for testing."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = True
    mock_redis.exists.return_value = False
    return mock_redis

def create_test_token(user_id: str, expires_in: int = 3600) -> str:
    """Create a test JWT token."""
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(seconds=expires_in),
        "iat": datetime.utcnow(),
        "type": "access"
    }
    return jwt.encode(payload, "test_secret_key", algorithm="HS256")

@pytest.fixture
def sample_tour_data():
    """Sample tour data for testing."""
    return {
        "id": "tour-789",
        "name": "Amazing Tour Package",
        "description": "A wonderful tour experience",
        "price": 1500.00,
        "duration_days": 5,
        "max_participants": 20,
        "destination": "Paris, France",
        "includes": ["Hotel", "Transport", "Meals"],
        "category": "adventure"
    }

@pytest.fixture
def sample_payment_data():
    """Sample payment data for testing."""
    return {
        "booking_id": "booking-123",
        "amount": 1000.00,
        "currency": "USD",
        "payment_method": "stripe",
        "card_token": "tok_test_123456",
        "customer_email": "test@example.com"
    }

@pytest.fixture
def sample_notification_data():
    """Sample notification data for testing."""
    return {
        "recipient": "test@example.com",
        "subject": "Booking Confirmation",
        "template": "booking_confirmation",
        "variables": {
            "booking_id": "booking-123",
            "customer_name": "Test User",
            "tour_name": "Amazing Tour",
            "booking_date": "2024-01-15"
        }
    }

# Environment variable fixtures
@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Setup test environment variables."""
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL_SYNC)
    monkeypatch.setenv("JWT_SECRET", "test_secret_key")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123456")
    monkeypatch.setenv("SENDGRID_API_KEY", "test_sendgrid_key")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("ENVIRONMENT", "test")