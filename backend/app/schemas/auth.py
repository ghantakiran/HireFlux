"""Authentication schemas"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload"""
    user_id: Optional[uuid.UUID] = None
    email: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user response"""
    id: uuid.UUID
    email: str
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordReset(BaseModel):
    """Schema for password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class OAuthProvider(BaseModel):
    """Schema for OAuth provider information"""
    provider: str = Field(..., description="OAuth provider name (google, facebook, apple)")
    access_token: str = Field(..., description="Access token from OAuth provider")
    id_token: Optional[str] = Field(None, description="ID token from OAuth provider (required for Apple)")


class OAuthUserInfo(BaseModel):
    """Schema for user information from OAuth provider"""
    email: EmailStr
    email_verified: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    provider: str
    provider_user_id: str
