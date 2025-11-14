"""
Authentication API routes
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta

from .models import (
    UserCreate, 
    UserLogin, 
    Token, 
    User, 
    UserResponse,
    UserDB
)
from .password import get_password_hash, verify_password
from .jwt import create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user
    
    Args:
        user_data: User registration data (email, password, name, phone)
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If email already exists or validation fails
    """
    # Check if email already exists
    if UserDB.email_exists(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    password_hash = get_password_hash(user_data.password)
    
    # Create user in database
    user_dict = UserDB.create_user(
        email=user_data.email,
        password_hash=password_hash,
        full_name=user_data.full_name,
        phone=user_data.phone
    )
    
    # Create access token
    access_token = create_access_token(
        data={
            "user_id": user_dict["id"],
            "email": user_dict["email"],
            "role": user_dict["role"]
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Return token and user info
    user_response = UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        role=user_dict["role"],
        is_active=user_dict["is_active"],
        email_verified=user_dict["email_verified"],
        avatar_url=user_dict["avatar_url"],
        created_at=user_dict["created_at"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Login with email and password
    
    Args:
        credentials: User login credentials (email, password)
        
    Returns:
        JWT token and user information
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Get user from database
    user_dict = UserDB.get_user_by_email(credentials.email)
    
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user_dict["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user_dict.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create access token
    access_token = create_access_token(
        data={
            "user_id": user_dict["id"],
            "email": user_dict["email"],
            "role": user_dict["role"]
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Return token and user info
    user_response = UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        role=user_dict["role"],
        is_active=user_dict["is_active"],
        email_verified=user_dict["email_verified"],
        avatar_url=user_dict["avatar_url"],
        created_at=user_dict["created_at"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    
    Args:
        current_user: Current authenticated user (from JWT token)
        
    Returns:
        Current user information
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at
    )


@router.put("/me", response_model=UserResponse)
async def update_me(
    full_name: str = None,
    phone: str = None,
    current_user: User = Depends(get_current_user)
):
    """
    Update current user information
    
    Args:
        full_name: Updated full name (optional)
        phone: Updated phone number (optional)
        current_user: Current authenticated user
        
    Returns:
        Updated user information
    """
    update_data = {}
    if full_name is not None:
        update_data["full_name"] = full_name
    if phone is not None:
        update_data["phone"] = phone
    
    if update_data:
        user_dict = UserDB.update_user(current_user.id, **update_data)
        if user_dict:
            return UserResponse(
                id=user_dict["id"],
                email=user_dict["email"],
                full_name=user_dict["full_name"],
                role=user_dict["role"],
                is_active=user_dict["is_active"],
                email_verified=user_dict["email_verified"],
                avatar_url=user_dict["avatar_url"],
                created_at=user_dict["created_at"]
            )
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user (client should delete token)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    return {
        "message": "Successfully logged out",
        "detail": "Please delete the access token from client storage"
    }
