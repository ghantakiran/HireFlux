"""Integration tests for onboarding endpoints"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db.models.user import User, Profile
from app.db.models.billing import CreditWallet, Subscription
from app.core.security import hash_password, create_access_token
import uuid


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def test_db():
    """Create test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user_with_token(test_db):
    """Create test user with authentication token"""
    db = TestingSessionLocal()

    # Create user
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        password_hash=hash_password("Test1234"),
        email_verified=True,
    )
    db.add(user)
    db.flush()

    # Create profile
    profile = Profile(
        id=uuid.uuid4(),
        user_id=user.id,
        onboarding_complete=False,
    )
    db.add(profile)

    # Create wallet
    wallet = CreditWallet(
        id=uuid.uuid4(),
        user_id=user.id,
        balance=0,
    )
    db.add(wallet)

    # Create subscription
    subscription = Subscription(
        id=uuid.uuid4(),
        user_id=user.id,
        plan="free",
        status="active",
    )
    db.add(subscription)

    db.commit()

    # Generate token
    token = create_access_token({"sub": str(user.id), "email": user.email})

    db.close()

    return {"user_id": user.id, "token": token, "email": user.email}


class TestUpdateBasicProfile:
    """Test basic profile update endpoint"""

    def test_update_basic_profile_success(self, client, test_user_with_token):
        """Test successful basic profile update"""
        response = client.put(
            "/api/v1/onboarding/profile",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "phone": "+1234567890",
                "location": "New York, NY"
            },
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["first_name"] == "John"
        assert data["data"]["last_name"] == "Doe"

    def test_update_basic_profile_unauthorized(self, client):
        """Test update without authentication"""
        response = client.put(
            "/api/v1/onboarding/profile",
            json={
                "first_name": "John",
                "last_name": "Doe"
            }
        )

        assert response.status_code in [401, 403]

    def test_update_basic_profile_validation_error(self, client, test_user_with_token):
        """Test update with invalid data"""
        response = client.put(
            "/api/v1/onboarding/profile",
            json={
                "first_name": "",  # Empty first name
                "last_name": "Doe"
            },
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 422  # Validation error


class TestUpdateJobPreferences:
    """Test job preferences update endpoint"""

    def test_update_job_preferences_success(self, client, test_user_with_token):
        """Test successful job preferences update"""
        response = client.put(
            "/api/v1/onboarding/preferences",
            json={
                "target_titles": ["Software Engineer", "Developer"],
                "salary_min": 80000,
                "salary_max": 150000,
                "industries": ["Technology", "Finance"]
            },
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["target_titles"]) == 2
        assert data["data"]["salary_min"] == 80000

    def test_update_job_preferences_invalid_salary_range(self, client, test_user_with_token):
        """Test update with invalid salary range"""
        response = client.put(
            "/api/v1/onboarding/preferences",
            json={
                "target_titles": ["Software Engineer"],
                "salary_min": 150000,
                "salary_max": 80000  # Max less than min
            },
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 422


class TestUpdateSkills:
    """Test skills update endpoint"""

    def test_update_skills_success(self, client, test_user_with_token):
        """Test successful skills update"""
        response = client.put(
            "/api/v1/onboarding/skills",
            json={
                "skills": [
                    {"name": "Python", "proficiency": "expert"},
                    {"name": "JavaScript", "proficiency": "advanced"},
                    {"name": "React", "proficiency": "intermediate"}
                ]
            },
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["skills"]) == 3

    def test_update_skills_empty_list(self, client, test_user_with_token):
        """Test update with empty skills list"""
        response = client.put(
            "/api/v1/onboarding/skills",
            json={"skills": []},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 422


class TestUpdateWorkPreferences:
    """Test work preferences update endpoint"""

    def test_update_work_preferences_success(self, client, test_user_with_token):
        """Test successful work preferences update"""
        response = client.put(
            "/api/v1/onboarding/work-preferences",
            json={
                "remote": True,
                "visa_friendly": True,
                "relocation": False,
                "contract": False,
                "part_time": False
            },
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["preferences"]["remote"] is True


class TestGetOnboardingProgress:
    """Test getting onboarding progress"""

    def test_get_progress_initial(self, client, test_user_with_token):
        """Test progress for new user"""
        response = client.get(
            "/api/v1/onboarding/progress",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["current_step"] == 1
        assert data["data"]["onboarding_complete"] is False

    def test_get_progress_after_profile_update(self, client, test_user_with_token):
        """Test progress after completing basic profile"""
        # Complete basic profile
        client.put(
            "/api/v1/onboarding/profile",
            json={"first_name": "John", "last_name": "Doe"},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        # Check progress
        response = client.get(
            "/api/v1/onboarding/progress",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["current_step"] == 2
        assert data["data"]["profile_completed"] is True


class TestGetCompleteProfile:
    """Test getting complete profile"""

    def test_get_complete_profile_success(self, client, test_user_with_token):
        """Test successful profile retrieval"""
        # Setup profile
        client.put(
            "/api/v1/onboarding/profile",
            json={"first_name": "John", "last_name": "Doe"},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        # Get profile
        response = client.get(
            "/api/v1/onboarding/profile",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["first_name"] == "John"
        assert data["data"]["last_name"] == "Doe"


class TestCompleteOnboardingFlow:
    """Test complete onboarding flow"""

    def test_complete_onboarding_flow(self, client, test_user_with_token):
        """Test completing all onboarding steps"""
        token = test_user_with_token['token']
        headers = {"Authorization": f"Bearer {token}"}

        # Step 1: Basic profile
        response1 = client.put(
            "/api/v1/onboarding/profile",
            json={"first_name": "John", "last_name": "Doe", "location": "NYC"},
            headers=headers
        )
        assert response1.status_code == 200

        # Step 2: Job preferences
        response2 = client.put(
            "/api/v1/onboarding/preferences",
            json={
                "target_titles": ["Software Engineer"],
                "salary_min": 100000,
                "salary_max": 150000
            },
            headers=headers
        )
        assert response2.status_code == 200

        # Step 3: Skills
        response3 = client.put(
            "/api/v1/onboarding/skills",
            json={
                "skills": [{"name": "Python", "proficiency": "expert"}]
            },
            headers=headers
        )
        assert response3.status_code == 200

        # Step 4: Work preferences
        response4 = client.put(
            "/api/v1/onboarding/work-preferences",
            json={"remote": True, "visa_friendly": False},
            headers=headers
        )
        assert response4.status_code == 200

        # Verify onboarding complete
        progress = client.get("/api/v1/onboarding/progress", headers=headers)
        assert progress.json()["data"]["onboarding_complete"] is True
