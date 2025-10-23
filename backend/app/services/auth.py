"""Authentication service"""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, Dict, Any
import uuid

from app.db.models.user import User, Profile
from app.db.models.billing import CreditWallet, Subscription
from app.schemas.auth import UserCreate, UserLogin, Token, OAuthUserInfo
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.exceptions import BadRequestError, UnauthorizedError, NotFoundError


class AuthService:
    """Service for authentication operations"""

    def __init__(self, db: Session):
        self.db = db

    def register(self, user_data: UserCreate) -> Dict[str, Any]:
        """Register a new user"""
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise BadRequestError("User with this email already exists")

        # Create user
        user = User(
            id=uuid.uuid4(),
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            email_verified=False,
        )

        try:
            self.db.add(user)
            self.db.flush()  # Get the user ID

            # Create associated profile
            profile = Profile(
                id=uuid.uuid4(),
                user_id=user.id,
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                onboarding_complete=False,
            )
            self.db.add(profile)

            # Create credit wallet with 0 balance
            wallet = CreditWallet(
                id=uuid.uuid4(),
                user_id=user.id,
                balance=0,
            )
            self.db.add(wallet)

            # Create free subscription
            subscription = Subscription(
                id=uuid.uuid4(),
                user_id=user.id,
                plan="free",
                status="active",
            )
            self.db.add(subscription)

            self.db.commit()
            self.db.refresh(user)

            # Generate tokens
            tokens = self._generate_tokens(user)

            return {
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "email_verified": user.email_verified,
                },
                "tokens": tokens,
            }

        except IntegrityError as e:
            self.db.rollback()
            raise BadRequestError(f"Failed to create user: {str(e)}")

    def login(self, credentials: UserLogin) -> Dict[str, Any]:
        """Authenticate user and return tokens"""
        # Find user by email
        user = self.db.query(User).filter(User.email == credentials.email).first()

        if not user:
            raise UnauthorizedError("Invalid email or password")

        # Verify password
        if not user.password_hash or not verify_password(credentials.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password")

        # Generate tokens
        tokens = self._generate_tokens(user)

        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "email_verified": user.email_verified,
            },
            "tokens": tokens,
        }

    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def verify_email(self, user_id: uuid.UUID) -> User:
        """Mark user email as verified"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")

        user.email_verified = True
        self.db.commit()
        self.db.refresh(user)
        return user

    def _generate_tokens(self, user: User) -> Token:
        """Generate access and refresh tokens"""
        token_data = {
            "sub": str(user.id),
            "email": user.email,
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )

    def refresh_access_token(self, user_id: uuid.UUID) -> Token:
        """Generate new access token from refresh token"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise UnauthorizedError("User not found")

        return self._generate_tokens(user)

    def oauth_login_or_register(self, oauth_user: OAuthUserInfo) -> Dict[str, Any]:
        """
        Login or register user via OAuth

        If user exists, login. If not, create new user with OAuth provider.

        Args:
            oauth_user: User information from OAuth provider

        Returns:
            Dict with user info and tokens
        """
        # Check if user exists by email
        user = self.db.query(User).filter(User.email == oauth_user.email).first()

        if user:
            # User exists, update OAuth info if needed
            if not user.oauth_provider:
                user.oauth_provider = oauth_user.provider
                user.oauth_id = oauth_user.provider_user_id
                user.email_verified = oauth_user.email_verified or user.email_verified
                self.db.commit()
                self.db.refresh(user)
        else:
            # Create new user with OAuth
            user = User(
                id=uuid.uuid4(),
                email=oauth_user.email,
                password_hash=None,  # No password for OAuth users
                oauth_provider=oauth_user.provider,
                oauth_id=oauth_user.provider_user_id,
                email_verified=oauth_user.email_verified,
            )

            try:
                self.db.add(user)
                self.db.flush()  # Get the user ID

                # Create associated profile
                profile = Profile(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    first_name=oauth_user.first_name,
                    last_name=oauth_user.last_name,
                    onboarding_complete=False,
                )
                self.db.add(profile)

                # Create credit wallet with 0 balance
                wallet = CreditWallet(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    balance=0,
                )
                self.db.add(wallet)

                # Create free subscription
                subscription = Subscription(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    plan="free",
                    status="active",
                )
                self.db.add(subscription)

                self.db.commit()
                self.db.refresh(user)

            except IntegrityError as e:
                self.db.rollback()
                raise BadRequestError(f"Failed to create user: {str(e)}")

        # Generate tokens
        tokens = self._generate_tokens(user)

        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "email_verified": user.email_verified,
                "oauth_provider": user.oauth_provider,
            },
            "tokens": tokens,
        }
