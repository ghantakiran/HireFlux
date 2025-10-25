"""
Security Utilities - JWT, Password Hashing, etc.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings
from app.core.exceptions import UnauthorizedError


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # Convert password to bytes and hash with bcrypt
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    # Return as string for database storage
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    # Convert both to bytes for bcrypt
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token"""
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return create_access_token(data, expires_delta)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise UnauthorizedError(f"Invalid token: {str(e)}")


def get_user_id_from_token(token: str) -> str:
    """Extract user ID from token"""
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token missing user ID")
    return user_id
