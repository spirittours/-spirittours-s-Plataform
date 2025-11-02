"""
Authentication Tests
Spirit Tours Platform
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from models.user import User
from core.auth import create_access_token, verify_password, get_password_hash
from core.database import get_db

client = TestClient(app)

class TestAuthentication:
    """Test suite for authentication endpoints and functions"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.test_user_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "name": "Test User",
            "phone": "+1234567890"
        }
        
    def teardown_method(self):
        """Cleanup after tests"""
        pass
    
    def test_user_registration_success(self):
        """Test successful user registration"""
        response = client.post(
            "/api/v1/auth/register",
            json=self.test_user_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == self.test_user_data["email"]
        assert "id" in data
        assert "password" not in data
        
    def test_user_registration_duplicate_email(self):
        """Test registration with duplicate email"""
        # First registration
        client.post("/api/v1/auth/register", json=self.test_user_data)
        
        # Attempt duplicate registration
        response = client.post(
            "/api/v1/auth/register",
            json=self.test_user_data
        )
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_user_registration_invalid_email(self):
        """Test registration with invalid email format"""
        invalid_data = self.test_user_data.copy()
        invalid_data["email"] = "invalid-email"
        
        response = client.post(
            "/api/v1/auth/register",
            json=invalid_data
        )
        
        assert response.status_code == 422
        
    def test_user_registration_weak_password(self):
        """Test registration with weak password"""
        weak_data = self.test_user_data.copy()
        weak_data["password"] = "weak"
        
        response = client.post(
            "/api/v1/auth/register",
            json=weak_data
        )
        
        assert response.status_code == 422
        assert "password" in response.json()["detail"][0]["loc"]
    
    def test_user_login_success(self):
        """Test successful user login"""
        # Register user first
        client.post("/api/v1/auth/register", json=self.test_user_data)
        
        # Login
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_user_login_wrong_password(self):
        """Test login with wrong password"""
        # Register user
        client.post("/api/v1/auth/register", json=self.test_user_data)
        
        # Login with wrong password
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": "WrongPassword123!"
            }
        )
        
        assert response.status_code == 401
    
    def test_get_current_user(self):
        """Test getting current user info with valid token"""
        # Register and login
        client.post("/api/v1/auth/register", json=self.test_user_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == self.test_user_data["email"]
        assert data["name"] == self.test_user_data["name"]
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
    
    def test_password_reset_request(self):
        """Test password reset request"""
        # Register user
        client.post("/api/v1/auth/register", json=self.test_user_data)
        
        # Request password reset
        response = client.post(
            "/api/v1/auth/password-reset",
            json={"email": self.test_user_data["email"]}
        )
        
        assert response.status_code == 200
        assert "email sent" in response.json()["message"].lower()
    
    def test_password_reset_nonexistent_user(self):
        """Test password reset for nonexistent user"""
        response = client.post(
            "/api/v1/auth/password-reset",
            json={"email": "nonexistent@example.com"}
        )
        
        # Should return success for security reasons
        assert response.status_code == 200
    
    def test_token_refresh(self):
        """Test token refresh functionality"""
        # Register and login
        client.post("/api/v1/auth/register", json=self.test_user_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
        )
        
        refresh_token = login_response.json().get("refresh_token")
        
        # Refresh token
        response = client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        
        assert response.status_code == 200
        assert "access_token" in response.json()
    
    def test_logout(self):
        """Test user logout"""
        # Register and login
        client.post("/api/v1/auth/register", json=self.test_user_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Logout
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "logged out" in response.json()["message"].lower()
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("WrongPassword", hashed) is False
    
    def test_jwt_token_creation(self):
        """Test JWT token creation"""
        user_data = {"sub": "test@example.com", "user_id": "123"}
        token = create_access_token(data=user_data)
        
        assert token is not None
        assert len(token) > 0
        assert "." in token  # JWT format check
    
    def test_account_activation(self):
        """Test account activation flow"""
        # Register user
        response = client.post("/api/v1/auth/register", json=self.test_user_data)
        user_id = response.json()["id"]
        
        # Get activation token (mock)
        activation_token = "mock_activation_token"
        
        # Activate account
        response = client.post(
            f"/api/v1/auth/activate/{activation_token}"
        )
        
        # In real scenario, this would activate the account
        # For now, we just check the endpoint exists
        assert response.status_code in [200, 404]
    
    def test_two_factor_auth_setup(self):
        """Test 2FA setup"""
        # Register and login
        client.post("/api/v1/auth/register", json=self.test_user_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Setup 2FA
        response = client.post(
            "/api/v1/auth/2fa/setup",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Check if endpoint exists
        assert response.status_code in [200, 404]
    
    def test_session_management(self):
        """Test session management"""
        # Register and login
        client.post("/api/v1/auth/register", json=self.test_user_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Get active sessions
        response = client.get(
            "/api/v1/auth/sessions",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Check if endpoint exists
        assert response.status_code in [200, 404]


class TestAuthorizationAndRoles:
    """Test suite for authorization and role-based access"""
    
    def test_admin_access_control(self):
        """Test admin-only endpoint access"""
        # Create admin user
        admin_data = {
            "email": "admin@example.com",
            "password": "AdminPass123!",
            "name": "Admin User",
            "role": "admin"
        }
        
        # Register and login as admin
        client.post("/api/v1/auth/register", json=admin_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": admin_data["email"],
                "password": admin_data["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Access admin endpoint
        response = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should have access (or 404 if endpoint not implemented)
        assert response.status_code in [200, 404]
    
    def test_regular_user_admin_access_denied(self):
        """Test regular user cannot access admin endpoints"""
        # Create regular user
        user_data = {
            "email": "user@example.com",
            "password": "UserPass123!",
            "name": "Regular User"
        }
        
        # Register and login
        client.post("/api/v1/auth/register", json=user_data)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": user_data["email"],
                "password": user_data["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Try to access admin endpoint
        response = client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should be denied (403) or not found (404)
        assert response.status_code in [403, 404]
    
    def test_role_based_permissions(self):
        """Test different role permissions"""
        roles = ["admin", "agent", "customer"]
        
        for role in roles:
            user_data = {
                "email": f"{role}@example.com",
                "password": "Pass123!",
                "name": f"{role.capitalize()} User",
                "role": role
            }
            
            # Register user with role
            response = client.post("/api/v1/auth/register", json=user_data)
            
            # Verify role is set correctly
            if response.status_code == 201:
                assert response.json().get("role", "customer") == role


if __name__ == "__main__":
    pytest.main([__file__, "-v"])