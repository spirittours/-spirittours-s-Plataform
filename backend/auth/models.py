"""
User authentication models
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, validator
import re


class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    """User creation model"""
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str


class User(UserBase):
    """Complete user model"""
    id: int
    role: str = "customer"
    is_active: bool = True
    email_verified: bool = False
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """User response model (without sensitive data)"""
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    email_verified: bool
    avatar_url: Optional[str]
    created_at: datetime


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Token payload data"""
    user_id: int
    email: str
    role: str


# Mock database (replace with SQLAlchemy models in production)
class UserDB:
    """Simple in-memory user database for development"""
    
    users: dict = {}  # email -> user_data
    next_id: int = 1
    
    @classmethod
    def create_user(cls, email: str, password_hash: str, full_name: str = None, phone: str = None) -> dict:
        """Create a new user"""
        user = {
            "id": cls.next_id,
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "phone": phone,
            "role": "customer",
            "is_active": True,
            "email_verified": False,
            "avatar_url": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        cls.users[email] = user
        cls.next_id += 1
        return user
    
    @classmethod
    def get_user_by_email(cls, email: str) -> Optional[dict]:
        """Get user by email"""
        return cls.users.get(email)
    
    @classmethod
    def get_user_by_id(cls, user_id: int) -> Optional[dict]:
        """Get user by ID"""
        for user in cls.users.values():
            if user["id"] == user_id:
                return user
        return None
    
    @classmethod
    def update_user(cls, user_id: int, **kwargs) -> Optional[dict]:
        """Update user data"""
        user = cls.get_user_by_id(user_id)
        if user:
            user.update(kwargs)
            user["updated_at"] = datetime.now()
            return user
        return None
    
    @classmethod
    def email_exists(cls, email: str) -> bool:
        """Check if email already exists"""
        return email in cls.users
