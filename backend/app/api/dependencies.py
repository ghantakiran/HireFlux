"""FastAPI dependencies for dependency injection"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.db.session import get_db
from app.db.models.user import User
from app.core.security import decode_token
from app.core.exceptions import UnauthorizedError

# Security scheme
security = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> uuid.UUID:
    """Extract and validate user ID from JWT token"""
    try:
        token = credentials.credentials
        payload = decode_token(token)
        user_id_str = payload.get("sub")

        if not user_id_str:
            raise UnauthorizedError("Token missing user ID")

        return uuid.UUID(user_id_str)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """Get current authenticated user from database"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user (email verified)"""
    # For now, we'll allow unverified users
    # Later, we can enforce email verification for certain endpoints
    return current_user


def require_verified_email(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require email to be verified"""
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email to access this resource.",
        )
    return current_user
