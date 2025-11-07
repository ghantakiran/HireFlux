"""Pytest configuration for integration tests"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.resume import Resume
from app.db.models.job import Job
from app.db.models.application import Application
from app.core.security import get_password_hash, create_access_token
from datetime import datetime, timedelta
import uuid


# Use in-memory SQLite for integration tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """Test client with database override"""

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db):
    """Create a test user"""
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True,
        is_verified=True,
        subscription_tier="plus",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Generate authentication headers for test user"""
    access_token = create_access_token(
        data={"sub": str(test_user.id), "email": test_user.email}
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def test_resume(test_db, test_user):
    """Create a test resume"""
    resume = Resume(
        id=uuid.uuid4(),
        user_id=test_user.id,
        title="Software Engineer Resume",
        version=1,
        is_active=True,
        content={
            "personal_info": {
                "name": "Test User",
                "email": "test@example.com",
                "phone": "123-456-7890",
            },
            "experience": [
                {
                    "company": "Tech Corp",
                    "title": "Senior Engineer",
                    "duration": "2020-2023",
                    "achievements": ["Led team of 5", "Increased performance 40%"],
                }
            ],
            "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        },
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    test_db.add(resume)
    test_db.commit()
    test_db.refresh(resume)
    return resume


@pytest.fixture
def test_jobs(test_db):
    """Create test job postings"""
    jobs = []
    now = datetime.utcnow()

    job_data = [
        {
            "title": "Senior Python Developer",
            "company": "Tech Innovations Inc",
            "location": "San Francisco, CA",
            "job_type": "full_time",
            "salary_min": 150000,
            "salary_max": 200000,
            "is_remote": True,
        },
        {
            "title": "Full Stack Engineer",
            "company": "StartUp XYZ",
            "location": "New York, NY",
            "job_type": "full_time",
            "salary_min": 120000,
            "salary_max": 160000,
            "is_remote": False,
        },
        {
            "title": "Backend Developer",
            "company": "Enterprise Solutions",
            "location": "Austin, TX",
            "job_type": "contract",
            "salary_min": 100000,
            "salary_max": 140000,
            "is_remote": True,
        },
    ]

    for data in job_data:
        job = Job(
            id=uuid.uuid4(),
            title=data["title"],
            company=data["company"],
            location=data["location"],
            job_type=data["job_type"],
            salary_min=data["salary_min"],
            salary_max=data["salary_max"],
            is_remote=data["is_remote"],
            description=f"Looking for {data['title']}",
            requirements=["3+ years experience", "Strong coding skills"],
            posted_date=now - timedelta(days=5),
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        test_db.add(job)
        jobs.append(job)

    test_db.commit()
    for job in jobs:
        test_db.refresh(job)

    return jobs


@pytest.fixture
def test_applications(test_db, test_user, test_jobs, test_resume):
    """Create test applications with various statuses"""
    applications = []
    now = datetime.utcnow()

    statuses = [
        ("applied", 1),
        ("in_review", 3),
        ("interview_scheduled", 5),
        ("rejected", 7),
        ("offer_received", 2),
        ("applied", 4),
    ]

    for i, (status, days_ago) in enumerate(statuses):
        if i < len(test_jobs):
            app = Application(
                id=uuid.uuid4(),
                user_id=test_user.id,
                job_id=test_jobs[i % len(test_jobs)].id,
                resume_id=test_resume.id,
                status=status,
                applied_at=now - timedelta(days=days_ago),
                created_at=now - timedelta(days=days_ago + 1),
                updated_at=now - timedelta(days=days_ago),
                cover_letter_content="Sample cover letter",
                notes="Test application",
            )
            test_db.add(app)
            applications.append(app)

    test_db.commit()
    for app in applications:
        test_db.refresh(app)

    return applications


@pytest.fixture
def unauthorized_headers():
    """Headers without valid authentication"""
    return {"Authorization": "Bearer invalid_token_here"}
