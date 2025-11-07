"""
Authentication System Implementation (US-002)
Following TDD approach - tests first, then implementation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import secrets
import httpx
from urllib.parse import urlencode

from app.core.config import settings
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.auth import Token, UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    terms_accepted: bool


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


@router.post("/register", response_model=UserResponse)
async def register(user_data: RegisterRequest, db=Depends(get_db)):
    """Register a new user"""

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Validate password strength
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    # Validate terms acceptance
    if not user_data.terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms and conditions must be accepted",
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=True,
        terms_accepted_at=datetime.utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    """Login with email and password"""

    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer"
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db=Depends(get_db)):
    """Refresh access token using refresh token"""

    try:
        payload = jwt.decode(
            refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token, refresh_token=new_refresh_token, token_type="bearer"
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client should discard tokens)"""
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.post("/forgot-password")
async def forgot_password(email: EmailStr, db=Depends(get_db)):
    """Send password reset email"""

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a reset link has been sent"}

    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)

    db.commit()

    # TODO: Send email with reset link
    # await send_password_reset_email(user.email, reset_token)

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(token: str, new_password: str, db=Depends(get_db)):
    """Reset password using reset token"""

    user = (
        db.query(User)
        .filter(User.reset_token == token, User.reset_token_expires > datetime.utcnow())
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    # Update password
    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {"message": "Password reset successfully"}


# ========== OAuth Endpoints ==========


@router.get("/google/authorize")
async def google_authorize():
    """Redirect to Google OAuth consent screen"""

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured",
        )

    # Google OAuth URL
    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth"

    # OAuth parameters
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.OAUTH_REDIRECT_URI}/google",
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(code: str, db=Depends(get_db)):
    """Handle Google OAuth callback"""

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured",
        )

    # Exchange code for access token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": f"{settings.OAUTH_REDIRECT_URI}/google",
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
            access_token = tokens.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get access token from Google",
                )

            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            userinfo_response = await client.get(userinfo_url, headers=headers)
            userinfo_response.raise_for_status()
            user_info = userinfo_response.json()

        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to communicate with Google: {str(e)}",
            )

    # Extract user information
    google_id = user_info.get("id")
    email = user_info.get("email")
    name = user_info.get("name", "")
    picture = user_info.get("picture")
    email_verified = user_info.get("verified_email", False)

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get required user information from Google",
        )

    # Check if user exists by OAuth provider ID
    user = (
        db.query(User)
        .filter(User.oauth_provider == "google", User.oauth_provider_id == google_id)
        .first()
    )

    # If not found by OAuth ID, check by email
    if not user:
        user = db.query(User).filter(User.email == email).first()

        if user:
            # Link existing email account to Google OAuth
            user.oauth_provider = "google"
            user.oauth_provider_id = google_id
            user.oauth_picture = picture
            if email_verified:
                user.is_verified = True
            db.commit()
            db.refresh(user)
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                oauth_provider="google",
                oauth_provider_id=google_id,
                oauth_picture=picture,
                is_active=True,
                is_verified=email_verified,
                terms_accepted_at=datetime.utcnow(),  # Assume acceptance via OAuth
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Create JWT tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    jwt_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Redirect to frontend with tokens
    frontend_url = (
        settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
    )
    redirect_url = f"{frontend_url}/auth/callback?access_token={jwt_access_token}&refresh_token={jwt_refresh_token}&token_type=bearer"

    return RedirectResponse(url=redirect_url)


@router.get("/linkedin/authorize")
async def linkedin_authorize():
    """Redirect to LinkedIn OAuth consent screen"""

    if not settings.LINKEDIN_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LinkedIn OAuth is not configured",
        )

    # LinkedIn OAuth URL
    linkedin_auth_url = "https://www.linkedin.com/oauth/v2/authorization"

    # OAuth parameters
    params = {
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": f"{settings.OAUTH_REDIRECT_URI}/linkedin",
        "response_type": "code",
        "scope": "openid profile email",
    }

    auth_url = f"{linkedin_auth_url}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/linkedin/callback")
async def linkedin_callback(code: str, db=Depends(get_db)):
    """Handle LinkedIn OAuth callback"""

    if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LinkedIn OAuth is not configured",
        )

    # Exchange code for access token
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    token_data = {
        "code": code,
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
        "redirect_uri": f"{settings.OAUTH_REDIRECT_URI}/linkedin",
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        try:
            # Get access token
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
            access_token = tokens.get("access_token")

            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get access token from LinkedIn",
                )

            # Get user info from LinkedIn using OpenID Connect userinfo endpoint
            headers = {"Authorization": f"Bearer {access_token}"}

            # Get basic profile info
            userinfo_url = "https://api.linkedin.com/v2/userinfo"
            userinfo_response = await client.get(userinfo_url, headers=headers)
            userinfo_response.raise_for_status()
            user_info = userinfo_response.json()

        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to communicate with LinkedIn: {str(e)}",
            )

    # Extract user information
    linkedin_id = user_info.get("sub")  # Subject (user ID) from OpenID Connect
    email = user_info.get("email")
    name = user_info.get("name", "")
    picture = user_info.get("picture")
    email_verified = user_info.get("email_verified", False)

    if not linkedin_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get required user information from LinkedIn",
        )

    # Check if user exists by OAuth provider ID
    user = (
        db.query(User)
        .filter(
            User.oauth_provider == "linkedin", User.oauth_provider_id == linkedin_id
        )
        .first()
    )

    # If not found by OAuth ID, check by email
    if not user:
        user = db.query(User).filter(User.email == email).first()

        if user:
            # Link existing email account to LinkedIn OAuth
            user.oauth_provider = "linkedin"
            user.oauth_provider_id = linkedin_id
            user.oauth_picture = picture
            if email_verified:
                user.is_verified = True
            db.commit()
            db.refresh(user)
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                oauth_provider="linkedin",
                oauth_provider_id=linkedin_id,
                oauth_picture=picture,
                is_active=True,
                is_verified=email_verified,
                terms_accepted_at=datetime.utcnow(),  # Assume acceptance via OAuth
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Create JWT tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    jwt_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Redirect to frontend with tokens
    frontend_url = (
        settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
    )
    redirect_url = f"{frontend_url}/auth/callback?access_token={jwt_access_token}&refresh_token={jwt_refresh_token}&token_type=bearer"

    return RedirectResponse(url=redirect_url)
