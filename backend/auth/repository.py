"""
User Repository - Database operations for User model
Replaces the in-memory UserDB with PostgreSQL operations
"""

from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime

from database.models import User as UserModel
from .password import get_password_hash


class UserRepository:
    """
    Repository pattern for User database operations
    Handles all CRUD operations for users
    """
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        phone: Optional[str] = None
    ) -> UserModel:
        """
        Create a new user in database
        
        Args:
            db: Database session
            email: User email
            password: Plain text password (will be hashed)
            full_name: User's full name
            phone: User's phone number
            
        Returns:
            Created User model
        """
        password_hash = get_password_hash(password)
        
        user = UserModel(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            phone=phone,
            role="customer",
            is_active=True,
            email_verified=False
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[UserModel]:
        """
        Get user by email address
        
        Args:
            db: Database session
            email: User email
            
        Returns:
            User model or None if not found
        """
        return db.query(UserModel).filter(UserModel.email == email).first()
    
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[UserModel]:
        """
        Get user by ID
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            User model or None if not found
        """
        return db.query(UserModel).filter(UserModel.id == user_id).first()
    
    
    @staticmethod
    def email_exists(db: Session, email: str) -> bool:
        """
        Check if email already exists in database
        
        Args:
            db: Database session
            email: Email to check
            
        Returns:
            True if email exists, False otherwise
        """
        return db.query(UserModel).filter(UserModel.email == email).first() is not None
    
    
    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        **kwargs
    ) -> Optional[UserModel]:
        """
        Update user data
        
        Args:
            db: Database session
            user_id: User ID to update
            **kwargs: Fields to update
            
        Returns:
            Updated User model or None if not found
        """
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        
        if not user:
            return None
        
        # Update allowed fields
        allowed_fields = ['full_name', 'phone', 'avatar_url', 'email_verified', 'is_active']
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        
        return user
    
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """
        Delete user (soft delete by setting is_active=False)
        
        Args:
            db: Database session
            user_id: User ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        
        if not user:
            return False
        
        user.is_active = False
        db.commit()
        
        return True
    
    
    @staticmethod
    def get_all_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True
    ) -> list[UserModel]:
        """
        Get all users with pagination
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            active_only: Only return active users
            
        Returns:
            List of User models
        """
        query = db.query(UserModel)
        
        if active_only:
            query = query.filter(UserModel.is_active == True)
        
        return query.offset(skip).limit(limit).all()
    
    
    @staticmethod
    def count_users(db: Session, active_only: bool = True) -> int:
        """
        Count total users
        
        Args:
            db: Database session
            active_only: Only count active users
            
        Returns:
            Total count of users
        """
        query = db.query(UserModel)
        
        if active_only:
            query = query.filter(UserModel.is_active == True)
        
        return query.count()


# Export
__all__ = ['UserRepository']
