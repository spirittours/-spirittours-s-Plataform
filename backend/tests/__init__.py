"""
Backend Tests Module
Spirit Tours Platform
"""

# Test configuration
TEST_DATABASE_URL = "sqlite:///:memory:"
TEST_REDIS_URL = "redis://localhost:6379/1"
TEST_ENV = "testing"

# Test user credentials
TEST_USER = {
    "email": "test@spirittours.com",
    "password": "Test123!@#",
    "name": "Test User",
    "role": "customer"
}

TEST_ADMIN = {
    "email": "admin@spirittours.com", 
    "password": "Admin123!@#",
    "name": "Admin User",
    "role": "admin"
}

TEST_AGENT = {
    "email": "agent@spirittours.com",
    "password": "Agent123!@#",
    "name": "Agent User",
    "role": "agent"
}