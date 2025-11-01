"""Pytest configuration for unit tests"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.schemas.company import CompanyCreate

# Use in-memory SQLite for unit tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def company_create_data():
    """Sample company creation data"""
    return CompanyCreate(
        name="Test Company Inc",
        email="founder@testcompany.com",
        password="SecurePass123",
        industry="Technology",
        size="1-10",
        location="San Francisco, CA",
        website="https://testcompany.com"
    )


@pytest.fixture
def sample_company(db_session, company_create_data):
    """Create a sample company in the database"""
    from app.services.employer_service import EmployerService
    service = EmployerService(db_session)
    company = service.create_company(company_create_data)
    return company
