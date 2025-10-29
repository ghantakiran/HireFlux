"""
Unit tests for Authentication System (US-002)
Following TDD approach - tests written first
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
import jwt

from app.main import app
from app.db.session import get_db, Base
from app.db.models.user import User
from app.core.config import settings

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    from app.api.v1.auth import get_password_hash

    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        is_active=True,
        terms_accepted_at=datetime.utcnow(),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestUserRegistration:
    """Test user registration functionality"""

    def test_register_success(self, db_session):
        """Test successful user registration"""
        response = client.post(
            "/auth/register",
            json={
                "name": "New User",
                "email": "newuser@example.com",
                "password": "password123",
                "terms_accepted": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New User"
        assert data["email"] == "newuser@example.com"
        assert data["is_active"] is True
        assert "id" in data

    def test_register_duplicate_email(self, test_user):
        """Test registration with duplicate email"""
        response = client.post(
            "/auth/register",
            json={
                "name": "Another User",
                "email": "test@example.com",  # Same email as test_user
                "password": "password123",
                "terms_accepted": True,
            },
        )

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_register_weak_password(self):
        """Test registration with weak password"""
        response = client.post(
            "/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "123",  # Too short
                "terms_accepted": True,
            },
        )

        assert response.status_code == 400
        assert "Password must be at least 8 characters" in response.json()["detail"]

    def test_register_without_terms(self):
        """Test registration without accepting terms"""
        response = client.post(
            "/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "password123",
                "terms_accepted": False,
            },
        )

        assert response.status_code == 400
        assert "Terms and conditions must be accepted" in response.json()["detail"]

    def test_register_invalid_email(self):
        """Test registration with invalid email format"""
        response = client.post(
            "/auth/register",
            json={
                "name": "Test User",
                "email": "invalid-email",
                "password": "password123",
                "terms_accepted": True,
            },
        )

        assert response.status_code == 422  # Validation error


class TestUserLogin:
    """Test user login functionality"""

    def test_login_success(self, test_user):
        """Test successful login"""
        response = client.post(
            "/auth/login",
            data={"username": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, test_user):
        """Test login with invalid credentials"""
        response = client.post(
            "/auth/login",
            data={"username": "test@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        response = client.post(
            "/auth/login",
            data={"username": "nonexistent@example.com", "password": "password123"},
        )

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_inactive_user(self, db_session):
        """Test login with inactive user"""
        from app.api.v1.auth import get_password_hash

        user = User(
            name="Inactive User",
            email="inactive@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/auth/login",
            data={"username": "inactive@example.com", "password": "password123"},
        )

        assert response.status_code == 400
        assert "Inactive user" in response.json()["detail"]


class TestTokenValidation:
    """Test JWT token validation"""

    def test_get_current_user_success(self, test_user):
        """Test getting current user with valid token"""
        # First login to get token
        login_response = client.post(
            "/auth/login",
            data={"username": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Use token to get user info
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"

    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token"""
        response = client.get(
            "/auth/me", headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    def test_get_current_user_no_token(self):
        """Test getting current user without token"""
        response = client.get("/auth/me")

        assert response.status_code == 401

    def test_get_current_user_expired_token(self, test_user):
        """Test getting current user with expired token"""
        # Create expired token
        expired_time = datetime.utcnow() - timedelta(minutes=1)
        token_data = {"sub": str(test_user.id), "exp": expired_time}
        expired_token = jwt.encode(
            token_data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
        )

        response = client.get(
            "/auth/me", headers={"Authorization": f"Bearer {expired_token}"}
        )

        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]


class TestTokenRefresh:
    """Test token refresh functionality"""

    def test_refresh_token_success(self, test_user):
        """Test successful token refresh"""
        # First login to get tokens
        login_response = client.post(
            "/auth/login",
            data={"username": "test@example.com", "password": "password123"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Refresh token
        response = client.post("/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_token_invalid(self):
        """Test refresh with invalid token"""
        response = client.post("/auth/refresh", json={"refresh_token": "invalid_token"})

        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]

    def test_refresh_token_wrong_type(self, test_user):
        """Test refresh with access token instead of refresh token"""
        # Get access token
        login_response = client.post(
            "/auth/login",
            data={"username": "test@example.com", "password": "password123"},
        )
        access_token = login_response.json()["access_token"]

        # Try to use access token as refresh token
        response = client.post("/auth/refresh", json={"refresh_token": access_token})

        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]


class TestPasswordReset:
    """Test password reset functionality"""

    def test_forgot_password_success(self, test_user):
        """Test successful forgot password request"""
        response = client.post(
            "/auth/forgot-password", json={"email": "test@example.com"}
        )

        assert response.status_code == 200
        assert "reset link has been sent" in response.json()["message"]

    def test_forgot_password_nonexistent_user(self):
        """Test forgot password with non-existent user"""
        response = client.post(
            "/auth/forgot-password", json={"email": "nonexistent@example.com"}
        )

        # Should not reveal if user exists
        assert response.status_code == 200
        assert "reset link has been sent" in response.json()["message"]

    def test_reset_password_success(self, db_session):
        """Test successful password reset"""
        from app.api.v1.auth import get_password_hash

        user = User(
            name="Test User",
            email="test@example.com",
            hashed_password=get_password_hash("oldpassword"),
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        # Generate reset token
        reset_token = "valid_reset_token"
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db_session.commit()

        # Reset password
        response = client.post(
            "/auth/reset-password",
            json={"token": reset_token, "new_password": "newpassword123"},
        )

        assert response.status_code == 200
        assert "Password reset successfully" in response.json()["message"]

    def test_reset_password_invalid_token(self):
        """Test password reset with invalid token"""
        response = client.post(
            "/auth/reset-password",
            json={"token": "invalid_token", "new_password": "newpassword123"},
        )

        assert response.status_code == 400
        assert "Invalid or expired reset token" in response.json()["detail"]

    def test_reset_password_weak_password(self, db_session):
        """Test password reset with weak password"""
        from app.api.v1.auth import get_password_hash

        user = User(
            name="Test User",
            email="test@example.com",
            hashed_password=get_password_hash("oldpassword"),
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()

        # Generate reset token
        reset_token = "valid_reset_token"
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db_session.commit()

        # Reset password with weak password
        response = client.post(
            "/auth/reset-password",
            json={"token": reset_token, "new_password": "123"},  # Too short
        )

        assert response.status_code == 400
        assert "Password must be at least 8 characters" in response.json()["detail"]


class TestLogout:
    """Test logout functionality"""

    def test_logout_success(self, test_user):
        """Test successful logout"""
        # First login
        login_response = client.post(
            "/auth/login",
            data={"username": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["access_token"]

        # Logout
        response = client.post(
            "/auth/logout", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        assert "Successfully logged out" in response.json()["message"]

    def test_logout_without_token(self):
        """Test logout without token"""
        response = client.post("/auth/logout")

        assert response.status_code == 401
