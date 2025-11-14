# Testing Guide - Spirit Tours Backend

## 🧪 Overview

Comprehensive testing suite with **80%+ code coverage** using pytest, covering authentication, payments, emails, reviews, and analytics.

---

## 🚀 Quick Start

### Installation
```bash
cd backend
pip install -r requirements-test.txt
```

### Run All Tests
```bash
# Using pytest directly
pytest

# Using test runner script
./run_tests.sh
```

### Run Specific Tests
```bash
# Auth tests only
pytest -m auth

# Analytics tests
pytest -m analytics

# Integration tests
pytest -m integration

# Run specific file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::TestUserRegistration::test_register_new_user_success
```

---

## 📁 Test Structure

```
backend/tests/
├── conftest.py              # Shared fixtures and configuration
├── test_auth.py             # Authentication tests (400+ lines)
├── test_payments.py         # Payment processing tests
├── test_notifications.py    # Email notification tests
├── test_database.py         # Database operations tests
├── test_reviews.py          # Review system tests (300+ lines)
├── test_analytics.py        # Analytics dashboard tests (280+ lines)
└── test_integration.py      # End-to-end integration tests
```

---

## 🔧 Test Fixtures

### Database Fixture
```python
@pytest.fixture
def db() -> Session:
    """Fresh in-memory SQLite database for each test"""
    # Creates all tables, yields session, then drops tables
```

### User Fixtures
```python
@pytest.fixture
def test_user(db) -> dict:
    """Regular user with credentials"""

@pytest.fixture
def test_admin(db) -> dict:
    """Admin user for testing protected endpoints"""
```

### Auth Fixtures
```python
@pytest.fixture
def user_token(test_user) -> str:
    """JWT token for regular user"""

@pytest.fixture
def admin_token(test_admin) -> str:
    """JWT token for admin user"""

@pytest.fixture
def auth_headers(user_token) -> dict:
    """Authorization headers with Bearer token"""
```

### Data Fixtures
```python
@pytest.fixture
def test_tour(db) -> dict:
    """Sample tour in database"""

@pytest.fixture
def test_booking(db, test_user, test_tour) -> dict:
    """Sample booking"""

@pytest.fixture
def completed_booking(db, test_user, test_tour) -> dict:
    """Completed booking for review tests"""
```

---

## 📊 Test Coverage

### Current Coverage Target: **80%+**

```bash
# Run tests with coverage
pytest --cov

# Generate HTML report
pytest --cov --cov-report=html

# View report
open htmlcov/index.html
```

### Coverage by Module

| Module | Coverage | Status |
|--------|----------|--------|
| auth/ | 85%+ | ✅ |
| payments/ | 80%+ | ✅ |
| notifications/ | 80%+ | ✅ |
| database/ | 90%+ | ✅ |
| reviews/ | 85%+ | ✅ |
| analytics/ | 80%+ | ✅ |

---

## 🏷️ Test Markers

Organize tests with markers:

```python
@pytest.mark.auth          # Authentication tests
@pytest.mark.payments      # Payment tests
@pytest.mark.email         # Email tests
@pytest.mark.database      # Database tests
@pytest.mark.reviews       # Review tests
@pytest.mark.analytics     # Analytics tests
@pytest.mark.integration   # Integration tests
@pytest.mark.slow          # Slow running tests
```

Usage:
```bash
# Run specific marker
pytest -m auth

# Run multiple markers
pytest -m "auth or payments"

# Exclude markers
pytest -m "not slow"
```

---

## ✅ Test Examples

### Authentication Test
```python
def test_login_success(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user["email"],
            "password": test_user["password"]
        }
    )
    
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### Protected Endpoint Test
```python
def test_analytics_requires_admin(client, auth_headers):
    """Regular users cannot access analytics"""
    response = client.get(
        "/api/v1/analytics/overview",
        headers=auth_headers
    )
    
    assert response.status_code == 403
```

### Integration Test
```python
def test_complete_booking_flow(client, test_user, test_tour):
    """Test full booking workflow"""
    # Login
    login = client.post("/api/v1/auth/login", json={...})
    token = login.json()["access_token"]
    
    # Create booking
    booking = client.post("/api/v1/bookings", headers={...}, json={...})
    assert booking.status_code == 201
    
    # Make payment
    payment = client.post("/api/v1/payments/create-payment-intent", ...)
    assert payment.status_code == 200
    
    # Create review
    review = client.post("/api/v1/reviews", ...)
    assert review.status_code == 201
```

---

## 🔄 CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

Workflow: `.github/workflows/tests.yml`

Features:
- ✅ Python 3.10, 3.11, 3.12 matrix
- ✅ PostgreSQL service container
- ✅ Code coverage reporting
- ✅ Linting (flake8, black, isort)
- ✅ Security scanning (bandit)
- ✅ Artifact uploads

---

## 🛠️ Test Runner Script

### Usage

```bash
# Run all tests with coverage
./run_tests.sh

# Run without coverage
./run_tests.sh --no-coverage

# Run specific markers
./run_tests.sh -m auth

# Parallel execution
./run_tests.sh -p

# Verbose output
./run_tests.sh -v

# Clean cache first
./run_tests.sh --clean

# Help
./run_tests.sh --help
```

---

## 📝 Writing New Tests

### Test Class Structure

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.your_marker
class TestYourFeature:
    """Test description"""
    
    def test_success_case(self, client, fixtures):
        """Test successful operation"""
        response = client.post("/endpoint", json={...})
        assert response.status_code == 200
    
    def test_failure_case(self, client):
        """Test error handling"""
        response = client.post("/endpoint", json={})
        assert response.status_code == 400
    
    def test_authorization(self, client, auth_headers):
        """Test protected endpoint"""
        response = client.get("/protected", headers=auth_headers)
        assert response.status_code == 200
```

### Best Practices

1. **Test one thing per test**
   ```python
   # Good
   def test_registration_success(client):
       response = client.post("/register", json={...})
       assert response.status_code == 201
   
   # Bad - testing multiple things
   def test_registration_and_login(client):
       # Register
       # Login
       # Get profile
   ```

2. **Use descriptive names**
   ```python
   # Good
   def test_user_cannot_review_without_completed_booking(client):
       ...
   
   # Bad
   def test_review(client):
       ...
   ```

3. **Arrange-Act-Assert pattern**
   ```python
   def test_example(client, test_user):
       # Arrange
       data = {"email": test_user["email"]}
       
       # Act
       response = client.post("/endpoint", json=data)
       
       # Assert
       assert response.status_code == 200
   ```

4. **Use fixtures for reusable setup**
   ```python
   @pytest.fixture
   def approved_review(db, test_user, test_tour):
       review = create_review(...)
       approve_review(review)
       return review
   ```

---

## 🐛 Debugging Tests

### Run with pdb
```bash
pytest --pdb  # Drop into debugger on failure
pytest -x --pdb  # Stop on first failure
```

### Print output
```bash
pytest -s  # Show print statements
pytest -vv  # Extra verbose
```

### Run last failed
```bash
pytest --lf  # Run only last failed tests
pytest --ff  # Run failed first, then others
```

### Timing
```bash
pytest --durations=10  # Show 10 slowest tests
```

---

## 📈 Performance Testing

### Locust (Load Testing)

```python
# locustfile.py
from locust import HttpUser, task, between

class SpiritToursUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def get_tours(self):
        self.client.get("/api/v1/tours")
    
    @task
    def analytics(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get("/api/v1/analytics/overview", headers=headers)
```

Run load test:
```bash
locust -f locustfile.py --host=http://localhost:8000
```

---

## 🔒 Security Testing

### Bandit (Security Scanner)
```bash
bandit -r . -ll  # Low and high severity
bandit -r . -f json -o report.json
```

### Safety (Dependency Scanner)
```bash
safety check  # Check for known vulnerabilities
```

---

## 📊 Test Reports

### JUnit XML (for CI)
```bash
pytest --junitxml=pytest-report.xml
```

### HTML Report
```bash
pytest --html=report.html --self-contained-html
```

---

## 🎯 Next Steps

1. **Increase Coverage**
   - Target modules below 80%
   - Add edge case tests
   - Test error conditions

2. **Add More Integration Tests**
   - Complete user journeys
   - Cross-module workflows
   - Real-world scenarios

3. **Performance Tests**
   - Load testing with Locust
   - Database query optimization
   - API response time benchmarks

4. **Security Tests**
   - Penetration testing
   - SQL injection attempts
   - Authentication bypasses

---

## 📞 Support

- View test results: `open htmlcov/index.html`
- CI/CD status: Check GitHub Actions tab
- Questions: See main documentation

---

**Last Updated**: 2024-11-14  
**Test Coverage**: 80%+  
**Test Count**: 100+ tests  
**Status**: ✅ Ready for Production
