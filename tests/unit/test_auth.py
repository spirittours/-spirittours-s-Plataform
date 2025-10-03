"""
Unit Tests for Authentication System
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.advanced_auth_service import AuthService

client = TestClient(app)

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_register_user(self):
        """Test user registration"""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "SecurePass123!",
                "name": "Test User"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "test@example.com"
    
    def test_login_user(self):
        """Test user login"""
        # First register
        client.post(
            "/api/auth/register",
            json={
                "email": "login@example.com",
                "password": "SecurePass123!",
                "name": "Login User"
            }
        )
        
        # Then login
        response = client.post(
            "/api/auth/login",
            json={
                "email": "login@example.com",
                "password": "SecurePass123!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "WrongPassword"
            }
        )
        assert response.status_code == 401
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # Register and get token
        register_response = client.post(
            "/api/auth/register",
            json={
                "email": "current@example.com",
                "password": "SecurePass123!",
                "name": "Current User"
            }
        )
        token = register_response.json()["token"]
        
        # Get current user
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "current@example.com"
    
    def test_change_password(self):
        """Test password change"""
        # Register
        register_response = client.post(
            "/api/auth/register",
            json={
                "email": "changepass@example.com",
                "password": "OldPass123!",
                "name": "Change Pass User"
            }
        )
        token = register_response.json()["token"]
        
        # Change password
        response = client.post(
            "/api/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "currentPassword": "OldPass123!",
                "newPassword": "NewPass123!"
            }
        )
        assert response.status_code == 200
        
        # Login with new password
        login_response = client.post(
            "/api/auth/login",
            json={
                "email": "changepass@example.com",
                "password": "NewPass123!"
            }
        )
        assert login_response.status_code == 200
