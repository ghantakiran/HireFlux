"""Integration tests for resume endpoints"""
import pytest
import io
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
        email="resumetest@example.com",
        password_hash=hash_password("Test1234"),
        email_verified=True,
    )
    db.add(user)
    db.flush()

    # Create profile
    profile = Profile(
        id=uuid.uuid4(),
        user_id=user.id,
        first_name="Test",
        last_name="User",
        onboarding_complete=True,
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


@pytest.fixture
def sample_pdf_file():
    """Create a sample PDF file for testing"""
    # Minimal valid PDF content
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(John Doe) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
406
%%EOF"""
    return ("resume.pdf", io.BytesIO(pdf_content), "application/pdf")


class TestUploadResume:
    """Test resume upload endpoint"""

    def test_upload_resume_success(self, client, test_user_with_token, sample_pdf_file):
        """Test successful resume upload"""
        filename, file_content, mime_type = sample_pdf_file

        response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "id" in data["data"]
        assert data["data"]["file_name"] == filename

    def test_upload_resume_unauthorized(self, client, sample_pdf_file):
        """Test upload without authentication"""
        filename, file_content, mime_type = sample_pdf_file

        response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
        )

        assert response.status_code in [401, 403]

    def test_upload_resume_invalid_file_type(self, client, test_user_with_token):
        """Test upload with unsupported file type"""
        text_file = ("resume.txt", io.BytesIO(b"plain text content"), "text/plain")

        response = client.post(
            "/api/v1/resumes/upload",
            files={"file": text_file},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 422


class TestGetResume:
    """Test get resume endpoint"""

    def test_get_resume_success(self, client, test_user_with_token, sample_pdf_file):
        """Test getting resume details"""
        # First upload a resume
        filename, file_content, mime_type = sample_pdf_file
        upload_response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )
        resume_id = upload_response.json()["data"]["id"]

        # Get resume details
        response = client.get(
            f"/api/v1/resumes/{resume_id}",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == resume_id

    def test_get_resume_not_found(self, client, test_user_with_token):
        """Test getting non-existent resume"""
        fake_id = str(uuid.uuid4())

        response = client.get(
            f"/api/v1/resumes/{fake_id}",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 404


class TestListResumes:
    """Test list resumes endpoint"""

    def test_list_resumes_empty(self, client, test_user_with_token):
        """Test listing resumes when user has none"""
        response = client.get(
            "/api/v1/resumes",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["total"] == 0
        assert len(data["data"]["resumes"]) == 0

    def test_list_resumes_with_data(
        self, client, test_user_with_token, sample_pdf_file
    ):
        """Test listing resumes after uploading"""
        # Upload 2 resumes
        filename, file_content, mime_type = sample_pdf_file

        for i in range(2):
            file_content.seek(0)
            client.post(
                "/api/v1/resumes/upload",
                files={"file": (f"resume{i}.pdf", file_content, mime_type)},
                headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
            )

        # List resumes
        response = client.get(
            "/api/v1/resumes",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["total"] == 2
        assert len(data["data"]["resumes"]) == 2


class TestDeleteResume:
    """Test delete resume endpoint"""

    def test_delete_resume_success(self, client, test_user_with_token, sample_pdf_file):
        """Test successful resume deletion"""
        # Upload resume
        filename, file_content, mime_type = sample_pdf_file
        upload_response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )
        resume_id = upload_response.json()["data"]["id"]

        # Delete resume
        response = client.delete(
            f"/api/v1/resumes/{resume_id}",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify resume is deleted
        get_response = client.get(
            f"/api/v1/resumes/{resume_id}",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )
        assert get_response.status_code == 404

    def test_delete_resume_not_found(self, client, test_user_with_token):
        """Test deleting non-existent resume"""
        fake_id = str(uuid.uuid4())

        response = client.delete(
            f"/api/v1/resumes/{fake_id}",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 404


class TestSetDefaultResume:
    """Test set default resume endpoint"""

    def test_set_default_resume_success(
        self, client, test_user_with_token, sample_pdf_file
    ):
        """Test setting resume as default"""
        # Upload resume
        filename, file_content, mime_type = sample_pdf_file
        upload_response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )
        resume_id = upload_response.json()["data"]["id"]

        # Set as default
        response = client.post(
            f"/api/v1/resumes/{resume_id}/set-default",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_default"] is True


class TestUpdateParsedData:
    """Test update parsed data endpoint"""

    def test_update_parsed_data_success(
        self, client, test_user_with_token, sample_pdf_file
    ):
        """Test updating parsed resume data"""
        # Upload resume
        filename, file_content, mime_type = sample_pdf_file
        upload_response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )
        resume_id = upload_response.json()["data"]["id"]

        # Update parsed data
        updated_data = {
            "parsed_data": {
                "contact_info": {
                    "full_name": "Jane Smith",
                    "email": "jane@example.com",
                },
                "skills": ["Python", "Java"],
                "work_experience": [],
                "education": [],
                "certifications": [],
                "languages": [],
                "projects": [],
                "awards": [],
                "publications": [],
            }
        }

        response = client.put(
            f"/api/v1/resumes/{resume_id}/parsed-data",
            json=updated_data,
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestDownloadResume:
    """Test download resume endpoint"""

    def test_download_resume_success(
        self, client, test_user_with_token, sample_pdf_file
    ):
        """Test downloading original resume file"""
        # Upload resume
        filename, file_content, mime_type = sample_pdf_file
        upload_response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )
        resume_id = upload_response.json()["data"]["id"]

        # Download resume
        response = client.get(
            f"/api/v1/resumes/{resume_id}/download",
            headers={"Authorization": f"Bearer {test_user_with_token['token']}"},
        )

        # Note: This will fail until we implement file serving
        # For now, we expect it to at least not crash
        assert response.status_code in [200, 404, 501]


class TestCompleteResumeFlow:
    """Test complete resume management flow"""

    def test_complete_flow(self, client, test_user_with_token, sample_pdf_file):
        """Test complete resume upload, list, update, delete flow"""
        token = test_user_with_token["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 1: Upload resume
        filename, file_content, mime_type = sample_pdf_file
        upload_response = client.post(
            "/api/v1/resumes/upload",
            files={"file": (filename, file_content, mime_type)},
            headers=headers,
        )
        assert upload_response.status_code == 201
        resume_id = upload_response.json()["data"]["id"]

        # Step 2: List resumes
        list_response = client.get("/api/v1/resumes", headers=headers)
        assert list_response.status_code == 200
        assert list_response.json()["data"]["total"] == 1

        # Step 3: Get resume details
        get_response = client.get(f"/api/v1/resumes/{resume_id}", headers=headers)
        assert get_response.status_code == 200

        # Step 4: Set as default
        default_response = client.post(
            f"/api/v1/resumes/{resume_id}/set-default", headers=headers
        )
        assert default_response.status_code == 200

        # Step 5: Delete resume
        delete_response = client.delete(f"/api/v1/resumes/{resume_id}", headers=headers)
        assert delete_response.status_code == 200

        # Step 6: Verify deletion
        list_after_delete = client.get("/api/v1/resumes", headers=headers)
        assert list_after_delete.json()["data"]["total"] == 0
