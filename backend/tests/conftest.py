"""
Test Configuration and Fixtures
Provides shared fixtures for all test modules
"""

import pytest
import os
import sys
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set test environment variables before importing modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["USE_SQLITE"] = "true"
os.environ["TESTING"] = "true"
os.environ["SECRET_KEY"] = "test-secret-32chars-minimum!"  # Shorter for bcrypt (max 72 bytes)
os.environ["STRIPE_SECRET_KEY"] = "sk_test_fake"
os.environ["SENDGRID_API_KEY"] = "SG.fake_test_key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-key-32-chars-min!"  # Shorter for bcrypt
os.environ["JWT_ALGORITHM"] = "HS256"

# Import ALL models before Base to ensure they're registered
from database.models import (
    Base, User as UserModel, Tour as TourModel, 
    Booking as BookingModel, Review as ReviewModel,
    Payment as PaymentModel, EmailLog as EmailLogModel,
    AnalyticsEvent as AnalyticsEventModel
)
from auth.models import User  # Pydantic model
from auth.password import get_password_hash
from auth.jwt import create_access_token

# Test database URL (SQLite in-memory)
TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine with proper configuration for SQLite
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30
    },
    pool_pre_ping=True,
    echo=False  # Set to True for debugging
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create all tables at module level
Base.metadata.create_all(bind=test_engine)

# Monkey-patch the database.connection module to use test engine
import database.connection as db_conn
db_conn.engine = test_engine
db_conn.SessionLocal = TestingSessionLocal

# Create minimal test app
from fastapi import FastAPI
app = FastAPI()

# Import routes after database is patched
from auth.routes import router as auth_router
from reviews.routes import router as reviews_router
from analytics.routes import router as analytics_router

app.include_router(auth_router)
app.include_router(reviews_router)
app.include_router(analytics_router)


@pytest.fixture(scope="function", autouse=False)
def db() -> Generator[Session, None, None]:
    """
    Create a fresh database session for each test
    Tables are already created at module level
    """
    # Create connection and begin transaction
    connection = test_engine.connect()
    transaction = connection.begin()
    
    # Create session bound to connection
    session = Session(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        # Rollback transaction to clean up data
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with database dependency override
    """
    from database.connection import get_db
    
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> dict:
    """
    Create a test user in the database
    """
    from database.models import User as UserModel
    
    user_data = {
        "email": "test@example.com",
        "password": "TestPass123!",
        "full_name": "Test User",
        "phone": "+1234567890",
        "role": "user"
    }
    
    user = UserModel(
        email=user_data["email"],
        password_hash=get_password_hash(user_data["password"]),
        full_name=user_data["full_name"],
        phone=user_data["phone"],
        role=user_data["role"]
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "password": user_data["password"],  # Plain password for login
        "full_name": user.full_name,
        "role": user.role
    }


@pytest.fixture
def test_admin(db: Session) -> dict:
    """
    Create a test admin user in the database
    """
    from database.models import User as UserModel
    
    admin_data = {
        "email": "admin@example.com",
        "password": "AdminPass123!",
        "full_name": "Admin User",
        "phone": "+1234567891",
        "role": "admin"
    }
    
    admin = UserModel(
        email=admin_data["email"],
        password_hash=get_password_hash(admin_data["password"]),
        full_name=admin_data["full_name"],
        phone=admin_data["phone"],
        role=admin_data["role"]
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return {
        "id": admin.id,
        "email": admin.email,
        "password": admin_data["password"],  # Plain password for login
        "full_name": admin.full_name,
        "role": admin.role
    }


@pytest.fixture
def user_token(test_user: dict) -> str:
    """
    Generate JWT token for test user
    """
    return create_access_token(
        data={
            "user_id": test_user["id"],
            "email": test_user["email"],
            "role": test_user["role"]
        }
    )


@pytest.fixture
def admin_token(test_admin: dict) -> str:
    """
    Generate JWT token for test admin
    """
    return create_access_token(
        data={
            "user_id": test_admin["id"],
            "email": test_admin["email"],
            "role": test_admin["role"]
        }
    )


@pytest.fixture
def auth_headers(user_token: str) -> dict:
    """
    Create authorization headers with user token
    """
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """
    Create authorization headers with admin token
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def test_tour(db: Session) -> dict:
    """
    Create a test tour in the database
    """
    from database.models import Tour as TourModel
    
    tour_data = {
        "id": "TOUR-TEST-001",
        "name": "Test Tour Madrid",
        "description": "A test tour in Madrid",
        "price": 99.99,
        "duration": 180,
        "location": "Madrid, Spain",
        "rating_average": 4.5,
        "review_count": 10
    }
    
    tour = TourModel(**tour_data)
    db.add(tour)
    db.commit()
    db.refresh(tour)
    
    return {
        "id": tour.id,
        "name": tour.name,
        "description": tour.description,
        "price": float(tour.price),
        "duration": tour.duration,
        "location": tour.location,
        "rating_average": float(tour.rating_average),
        "review_count": tour.review_count
    }


@pytest.fixture
def test_booking(db: Session, test_user: dict, test_tour: dict) -> dict:
    """
    Create a test booking in the database
    """
    from database.models import Booking as BookingModel
    from datetime import datetime, timedelta
    
    booking_data = {
        "user_id": test_user["id"],
        "tour_id": test_tour["id"],
        "booking_date": datetime.utcnow(),
        "tour_date": datetime.utcnow() + timedelta(days=30),
        "participants": 2,
        "status": "confirmed",
        "total_amount": test_tour["price"] * 2
    }
    
    booking = BookingModel(**booking_data)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "tour_id": booking.tour_id,
        "booking_date": booking.booking_date,
        "tour_date": booking.tour_date,
        "participants": booking.participants,
        "status": booking.status,
        "total_amount": float(booking.total_amount)
    }


@pytest.fixture
def completed_booking(db: Session, test_user: dict, test_tour: dict) -> dict:
    """
    Create a completed booking (for testing reviews)
    """
    from database.models import Booking as BookingModel
    from datetime import datetime, timedelta
    
    booking_data = {
        "user_id": test_user["id"],
        "tour_id": test_tour["id"],
        "booking_date": datetime.utcnow() - timedelta(days=10),
        "tour_date": datetime.utcnow() - timedelta(days=5),
        "participants": 2,
        "status": "completed",
        "total_amount": test_tour["price"] * 2
    }
    
    booking = BookingModel(**booking_data)
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    return {
        "id": booking.id,
        "user_id": booking.user_id,
        "tour_id": booking.tour_id,
        "booking_date": booking.booking_date,
        "tour_date": booking.tour_date,
        "participants": booking.participants,
        "status": booking.status,
        "total_amount": float(booking.total_amount)
    }


@pytest.fixture
def test_payment(db: Session, test_booking: dict, test_user: dict) -> dict:
    """
    Create a test payment in the database
    """
    from database.models import Payment as PaymentModel
    
    payment_data = {
        "booking_id": test_booking["id"],
        "user_id": test_user["id"],
        "amount": test_booking["total_amount"],
        "currency": "USD",
        "status": "succeeded",
        "payment_method": "card",
        "stripe_payment_intent_id": "pi_test_123456"
    }
    
    payment = PaymentModel(**payment_data)
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return {
        "id": payment.id,
        "booking_id": payment.booking_id,
        "user_id": payment.user_id,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status,
        "payment_method": payment.payment_method,
        "stripe_payment_intent_id": payment.stripe_payment_intent_id
    }


# Pytest configuration
def pytest_configure(config):
    """
    Configure pytest
    """
    config.addinivalue_line(
        "markers", "auth: mark test as authentication test"
    )
    config.addinivalue_line(
        "markers", "payments: mark test as payments test"
    )
    config.addinivalue_line(
        "markers", "email: mark test as email test"
    )
    config.addinivalue_line(
        "markers", "database: mark test as database test"
    )
    config.addinivalue_line(
        "markers", "reviews: mark test as reviews test"
    )
    config.addinivalue_line(
        "markers", "analytics: mark test as analytics test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
