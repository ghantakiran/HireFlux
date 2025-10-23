"""Authentication endpoints"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse, OAuthProvider
from app.services.auth import AuthService
from app.services.oauth import OAuthService
from app.api.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new user account.

    Creates a new user with:
    - User account with hashed password
    - User profile
    - Free subscription
    - Credit wallet (0 balance)

    Returns user info and JWT tokens.
    """
    auth_service = AuthService(db)
    result = auth_service.register(user_data)
    return {
        "success": True,
        "message": "User registered successfully",
        "data": result,
    }


@router.post("/login", response_model=dict)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticate user and return JWT tokens.

    Returns:
    - Access token (expires in 24 hours by default)
    - Refresh token (expires in 30 days by default)
    """
    auth_service = AuthService(db)
    result = auth_service.login(credentials)
    return {
        "success": True,
        "message": "Login successful",
        "data": result,
    }


@router.get("/me", response_model=dict)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current authenticated user information.

    Requires valid JWT token in Authorization header.
    """
    # Get user profile
    profile = db.query(User).filter(User.id == current_user.id).first()

    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "email": current_user.email,
            "email_verified": current_user.email_verified,
            "created_at": current_user.created_at.isoformat(),
            "profile": {
                "first_name": current_user.profile.first_name if current_user.profile else None,
                "last_name": current_user.profile.last_name if current_user.profile else None,
                "onboarding_complete": current_user.profile.onboarding_complete if current_user.profile else False,
            } if current_user.profile else None,
        },
    }


@router.post("/refresh", response_model=dict)
def refresh_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Refresh access token using refresh token.

    Requires valid refresh token in Authorization header.
    Returns new access and refresh tokens.
    """
    auth_service = AuthService(db)
    tokens = auth_service.refresh_access_token(current_user.id)
    return {
        "success": True,
        "message": "Token refreshed successfully",
        "data": {
            "tokens": tokens,
        },
    }


@router.post("/verify-email/{user_id}", response_model=dict)
def verify_email(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Verify user email address.

    In production, this would be called from an email verification link.
    For MVP, we'll allow direct verification.
    """
    import uuid
    auth_service = AuthService(db)
    user = auth_service.verify_email(uuid.UUID(user_id))

    return {
        "success": True,
        "message": "Email verified successfully",
        "data": {
            "email": user.email,
            "email_verified": user.email_verified,
        },
    }


@router.post("/oauth/login", response_model=dict, status_code=status.HTTP_200_OK)
async def oauth_login(
    oauth_data: OAuthProvider,
    db: Session = Depends(get_db),
):
    """
    Login or register user via OAuth (Google, Facebook, Apple).

    This endpoint handles both login and registration for OAuth users.
    If the user doesn't exist, a new account is created.
    If the user exists, they are logged in.

    **Supported Providers:**
    - google: Requires `access_token`
    - facebook: Requires `access_token`
    - apple: Requires both `access_token` and `id_token`

    **Request Body:**
    - provider: OAuth provider name (google, facebook, apple)
    - access_token: Access token from OAuth provider
    - id_token: ID token (required only for Apple Sign In)

    **Returns:**
    - User information
    - JWT access and refresh tokens

    **Example for Google:**
    ```json
    {
        "provider": "google",
        "access_token": "ya29.a0AfH6SMB..."
    }
    ```

    **Example for Apple:**
    ```json
    {
        "provider": "apple",
        "access_token": "...",
        "id_token": "eyJraWQiOiJlWGF1bm..."
    }
    ```
    """
    # Verify OAuth token and get user info
    oauth_user = await OAuthService.verify_oauth_token(
        provider=oauth_data.provider,
        access_token=oauth_data.access_token,
        id_token=oauth_data.id_token,
    )

    # Login or register user
    auth_service = AuthService(db)
    result = auth_service.oauth_login_or_register(oauth_user)

    return {
        "success": True,
        "message": f"Successfully authenticated with {oauth_data.provider}",
        "data": result,
    }
