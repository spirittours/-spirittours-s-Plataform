"""
Authentication Tests
Tests for user registration, login, logout, and profile management
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.auth
class TestUserRegistration:
    """Test user registration functionality"""
    
    def test_register_new_user_success(self, client: TestClient):
        """Test successful user registration"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "NewPass123!",
                "full_name": "New User",
                "phone": "+1234567890"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        # Check token fields
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        # Check user fields (nested in 'user' object)
        assert "user" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["full_name"] == "New User"
        assert data["user"]["role"] == "customer"
        assert "id" in data["user"]
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]
    
    def test_register_duplicate_email(self, client: TestClient, test_user: dict):
        """Test registration with existing email fails"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user["email"],
                "password": "AnotherPass123!",
                "full_name": "Another User"
            }
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password fails"""
        # Too short
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "weak",
                "full_name": "Weak User"
            }
        )
        assert response.status_code == 422
        
        # No uppercase
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak2@example.com",
                "password": "weakpass123",
                "full_name": "Weak User"
            }
        )
        assert response.status_code == 422
        
        # No digit
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak3@example.com",
                "password": "WeakPassword",
                "full_name": "Weak User"
            }
        )
        assert response.status_code == 422
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email format"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "ValidPass123!",
                "full_name": "Test User"
            }
        )
        
        assert response.status_code == 422
    
    def test_register_missing_required_fields(self, client: TestClient):
        """Test registration with missing required fields"""
        # Missing email
        response = client.post(
            "/api/v1/auth/register",
            json={
                "password": "ValidPass123!",
                "full_name": "Test User"
            }
        )
        assert response.status_code == 422
        
        # Missing password
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "full_name": "Test User"
            }
        )
        assert response.status_code == 422


@pytest.mark.auth
class TestUserLogin:
    """Test user login functionality"""
    
    def test_login_success(self, client: TestClient, test_user: dict):
        """Test successful login"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0
    
    def test_login_wrong_password(self, client: TestClient, test_user: dict):
        """Test login with wrong password"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user["email"],
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with nonexistent email"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePass123!"
            }
        )
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_invalid_email_format(self, client: TestClient):
        """Test login with invalid email format"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "not-an-email",
                "password": "SomePass123!"
            }
        )
        
        assert response.status_code == 422


@pytest.mark.auth
class TestUserProfile:
    """Test user profile management"""
    
    def test_get_current_user_success(self, client: TestClient, test_user: dict, auth_headers: dict):
        """Test getting current user profile"""
        response = client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["email"]
        assert data["full_name"] == test_user["full_name"]
        assert "password" not in data
        assert "password_hash" not in data
    
    def test_get_current_user_no_token(self, client: TestClient):
        """Test getting profile without authentication"""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 403
    
    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting profile with invalid token"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        
        assert response.status_code == 401
    
    def test_update_profile_success(self, client: TestClient, test_user: dict, auth_headers: dict):
        """Test updating user profile"""
        response = client.put(
            "/api/v1/auth/me",
            headers=auth_headers,
            json={
                "full_name": "Updated Name",
                "phone": "+9876543210"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["phone"] == "+9876543210"
        assert data["email"] == test_user["email"]  # Email unchanged
    
    def test_update_profile_no_auth(self, client: TestClient):
        """Test updating profile without authentication"""
        response = client.put(
            "/api/v1/auth/me",
            json={"full_name": "New Name"}
        )
        
        assert response.status_code == 403


@pytest.mark.auth
class TestUserLogout:
    """Test user logout functionality"""
    
    def test_logout_success(self, client: TestClient, auth_headers: dict):
        """Test successful logout"""
        response = client.post(
            "/api/v1/auth/logout",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "logged out" in data["message"].lower()
    
    def test_logout_no_auth(self, client: TestClient):
        """Test logout without authentication"""
        response = client.post("/api/v1/auth/logout")
        
        assert response.status_code == 403


@pytest.mark.auth
class TestJWTToken:
    """Test JWT token functionality"""
    
    def test_token_contains_user_info(self, client: TestClient, test_user: dict):
        """Test that token contains correct user information"""
        # Login to get token
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        token = response.json()["access_token"]
        
        # Use token to get profile
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user["id"]
        assert data["email"] == test_user["email"]
        assert data["role"] == test_user["role"]
    
    def test_token_works_for_protected_endpoints(self, client: TestClient, test_user: dict):
        """Test that token provides access to protected endpoints"""
        # Login to get token
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        token = response.json()["access_token"]
        
        # Try to access protected endpoint
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


@pytest.mark.auth
class TestRoleBasedAccess:
    """Test role-based access control"""
    
    def test_admin_role_assignment(self, client: TestClient, test_admin: dict):
        """Test that admin role is correctly assigned"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_admin["email"],
                "password": test_admin["password"]
            }
        )
        
        token = response.json()["access_token"]
        
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["role"] == "admin"
    
    def test_user_role_assignment(self, client: TestClient, test_user: dict):
        """Test that user role is correctly assigned"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        token = response.json()["access_token"]
        
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["role"] == "user"


@pytest.mark.auth
class TestPasswordSecurity:
    """Test password security features"""
    
    def test_password_not_returned_in_response(self, client: TestClient):
        """Test that password is never returned in API responses"""
        # Register
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "security@example.com",
                "password": "SecurePass123!",
                "full_name": "Security User"
            }
        )
        
        data = response.json()
        assert "password" not in data
        assert "password_hash" not in data
        
        # Login and get profile
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "security@example.com",
                "password": "SecurePass123!"
            }
        )
        
        token = login_response.json()["access_token"]
        
        profile_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        profile_data = profile_response.json()
        assert "password" not in profile_data
        assert "password_hash" not in profile_data
    
    def test_password_hash_is_bcrypt(self, db: Session):
        """Test that passwords are hashed with bcrypt"""
        from database.models import User as UserModel
        
        # Get user from database
        user = db.query(UserModel).first()
        
        if user:
            # Bcrypt hashes start with $2b$ or $2a$
            assert user.password_hash.startswith("$2")
            assert len(user.password_hash) == 60  # Bcrypt hash length


@pytest.mark.auth
@pytest.mark.integration
class TestAuthenticationFlow:
    """Test complete authentication flow"""
    
    def test_complete_registration_login_profile_flow(self, client: TestClient):
        """Test complete user journey: register -> login -> get profile -> update profile"""
        # Step 1: Register
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "journey@example.com",
                "password": "JourneyPass123!",
                "full_name": "Journey User",
                "phone": "+1111111111"
            }
        )
        
        assert register_response.status_code == 201
        user_id = register_response.json()["id"]
        
        # Step 2: Login
        login_response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "journey@example.com",
                "password": "JourneyPass123!"
            }
        )
        
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Step 3: Get profile
        profile_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["id"] == user_id
        assert profile_data["email"] == "journey@example.com"
        
        # Step 4: Update profile
        update_response = client.put(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Updated Journey User",
                "phone": "+2222222222"
            }
        )
        
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["full_name"] == "Updated Journey User"
        assert updated_data["phone"] == "+2222222222"
        
        # Step 5: Verify changes persisted
        verify_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert verify_response.status_code == 200
        verified_data = verify_response.json()
        assert verified_data["full_name"] == "Updated Journey User"
        assert verified_data["phone"] == "+2222222222"
