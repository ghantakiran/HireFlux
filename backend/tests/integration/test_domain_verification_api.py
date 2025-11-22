"""Integration tests for Domain Verification API Endpoints
Issue #67: Company Domain Verification - Prevent Fake Companies

Following TDD/BDD approach:
- Test complete API request/response flows
- Test authentication and authorization
- Test error handling and edge cases
- Test all 5 API endpoints

Test Coverage:
- POST /employer/domain-verification/initiate
- POST /employer/domain-verification/verify
- GET /employer/domain-verification/status
- POST /employer/domain-verification/resend
- GET /employer/domain-verification/badge
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import patch

from app.main import app
from app.db.models.user import User
from app.db.models.company import Company, CompanyMember
from app.core.security import create_access_token


class TestDomainVerificationAPIIntegration:
    """Integration test suite for domain verification API"""

    @pytest.fixture
    def employer_user(self, test_db):
        """Create employer user"""
        user = User(
            id=uuid4(),
            email="owner@testcompany.com",
            password_hash="hashed_password_123",
            full_name="Company Owner",
            is_active=True,
            is_verified=True,
            user_type="employer",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user

    @pytest.fixture
    def test_company(self, test_db):
        """Create test company"""
        company = Company(
            id=uuid4(),
            name="Test Company Inc",
            domain="testcompany.com",
            domain_verified=False,
            verification_token=None,
            verification_method=None,
            verification_attempts=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_db.add(company)
        test_db.commit()
        test_db.refresh(company)
        return company

    @pytest.fixture
    def company_owner(self, test_db, employer_user, test_company):
        """Create company owner membership"""
        member = CompanyMember(
            id=uuid4(),
            company_id=test_company.id,
            user_id=employer_user.id,
            role="owner",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        test_db.add(member)
        test_db.commit()
        test_db.refresh(member)
        return member

    @pytest.fixture
    def employer_auth_headers(self, employer_user):
        """Create authentication headers for employer"""
        access_token = create_access_token(
            data={"sub": str(employer_user.id), "email": employer_user.email}
        )
        return {"Authorization": f"Bearer {access_token}"}

    # =========================================================================
    # POST /employer/domain-verification/initiate Tests
    # =========================================================================

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_initiate_email_verification_success(
        self, mock_send, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given authenticated company owner, when initiating email verification,
        then should return success with verification token"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["method"] == "email"
        assert "verification_token" in data
        assert len(data["verification_token"]) == 64
        assert "admin@testcompany.com" in data["instructions"]
        assert mock_send.call_count == 3

    def test_initiate_dns_verification_success(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given authenticated company owner, when initiating DNS verification,
        then should return TXT record instructions"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "dns"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["method"] == "dns"
        assert "txt_record" in data
        assert "hireflux-verification=" in data["txt_record"]
        assert "txt_record_value" in data
        assert len(data["txt_record_value"]) == 32

    def test_initiate_file_verification_success(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given authenticated company owner, when initiating file verification,
        then should return file upload instructions"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "file"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["method"] == "file"
        assert data["filename"] == "hireflux-verification.txt"
        assert "file_content" in data
        assert "https://testcompany.com/hireflux-verification.txt" in data["instructions"]

    def test_initiate_verification_unauthorized(self, client):
        """Given no authentication, when initiating verification,
        then should return 401 Unauthorized"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            }
        )

        assert response.status_code == 401

    def test_initiate_verification_not_company_member(
        self, client, test_db, employer_auth_headers
    ):
        """Given user not associated with company, when initiating verification,
        then should return 403 Forbidden"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 403
        assert "not associated with any company" in response.json()["detail"]

    def test_initiate_verification_insufficient_permissions(
        self, client, test_db, employer_user, test_company, employer_auth_headers
    ):
        """Given company member with viewer role, when initiating verification,
        then should return 403 Forbidden"""

        # Create viewer member
        member = CompanyMember(
            id=uuid4(),
            company_id=test_company.id,
            user_id=test_user.id,
            role="viewer"
        )
        test_db.add(member)
        test_db.commit()

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]
        assert "viewer" in response.json()["detail"]

    def test_initiate_verification_domain_mismatch(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given domain different from company domain, when initiating verification,
        then should return 400 Bad Request"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "fake-google.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 400
        assert "Domain mismatch" in response.json()["detail"]

    def test_initiate_verification_rate_limit(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given 5 verification attempts in 24h, when attempting 6th,
        then should return 429 Too Many Requests"""

        # Set up rate limited company
        test_company.verification_attempts = 5
        test_company.last_verification_attempt = datetime.utcnow()
        test_db.commit()

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 429
        assert "Too many verification attempts" in response.json()["detail"]

    def test_initiate_verification_invalid_method(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given invalid verification method, when initiating verification,
        then should return 422 Validation Error"""

        response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "invalid_method"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 422

    # =========================================================================
    # POST /employer/domain-verification/verify Tests
    # =========================================================================

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_verify_email_success(
        self, mock_send, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given valid email verification token, when verifying,
        then should mark domain as verified"""

        # First initiate verification
        initiate_response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )
        token = initiate_response.json()["verification_token"]

        # Now verify with token
        verify_response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "email",
                "token": token
            },
            headers=employer_auth_headers
        )

        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] is True
        assert data["verified"] is True
        assert data["method"] == "email"
        assert "successfully" in data["message"].lower()

        # Verify company is now verified in DB
        test_db.refresh(test_company)
        assert test_company.domain_verified is True
        assert test_company.verified_at is not None

    def test_verify_email_invalid_token(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given invalid verification token, when verifying,
        then should return 404 Not Found"""

        response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "email",
                "token": "invalid_token_12345"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 404
        assert "Invalid verification token" in response.json()["detail"]

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_verify_email_expired_token(
        self, mock_send, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given expired verification token, when verifying,
        then should return 410 Gone"""

        # Set up expired token
        test_company.verification_token = "expired_token_123"
        test_company.verification_method = "email"
        test_company.verification_token_expires_at = datetime.utcnow() - timedelta(hours=1)
        test_db.commit()

        response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "email",
                "token": "expired_token_123"
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 410
        assert "expired" in response.json()["detail"].lower()

    @patch('app.services.domain_verification_service.check_dns_txt_record')
    def test_verify_dns_success(
        self, mock_dns_check, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given correct DNS TXT record, when verifying DNS,
        then should mark domain as verified"""

        # First initiate DNS verification
        client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "dns"
            },
            headers=employer_auth_headers
        )

        # Mock DNS check returning success
        mock_dns_check.return_value = True

        # Verify DNS
        verify_response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "dns"
            },
            headers=employer_auth_headers
        )

        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] is True
        assert data["verified"] is True
        assert data["method"] == "dns"

    @patch('app.services.domain_verification_service.check_dns_txt_record')
    def test_verify_dns_record_not_found(
        self, mock_dns_check, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given missing DNS TXT record, when verifying,
        then should return failure response"""

        # First initiate DNS verification
        client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "dns"
            },
            headers=employer_auth_headers
        )

        # Mock DNS check returning failure
        mock_dns_check.return_value = False

        # Verify DNS
        verify_response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "dns"
            },
            headers=employer_auth_headers
        )

        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] is False
        assert data["verified"] is False
        assert "not found" in data["message"].lower()

    @patch('app.services.domain_verification_service.fetch_verification_file')
    def test_verify_file_success(
        self, mock_fetch, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given correct verification file on website, when verifying,
        then should mark domain as verified"""

        # First initiate file verification
        initiate_response = client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "file"
            },
            headers=employer_auth_headers
        )
        file_content = initiate_response.json()["file_content"]

        # Mock file fetch returning correct content
        mock_fetch.return_value = file_content

        # Verify file
        verify_response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "file"
            },
            headers=employer_auth_headers
        )

        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] is True
        assert data["verified"] is True
        assert data["method"] == "file"

    def test_verify_email_missing_token(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given email verification without token, when verifying,
        then should return 400 Bad Request"""

        response = client.post(
            "/api/v1/employer/domain-verification/verify",
            json={
                "method": "email"
                # Missing token
            },
            headers=employer_auth_headers
        )

        assert response.status_code == 400
        assert "Token is required" in response.json()["detail"]

    # =========================================================================
    # GET /employer/domain-verification/status Tests
    # =========================================================================

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_get_status_after_initiation(
        self, mock_send, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given verification initiated, when checking status,
        then should return current status"""

        # Initiate verification
        client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        # Check status
        response = client.get(
            "/api/v1/employer/domain-verification/status",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False
        assert data["domain"] == "testcompany.com"
        assert data["method"] == "email"
        assert data["attempts"] >= 1
        assert data["can_retry"] is True
        assert data["remaining_attempts"] <= 4

    def test_get_status_verified_company(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given verified company, when checking status,
        then should return verified status"""

        # Mark company as verified
        test_company.domain_verified = True
        test_company.verification_method = "email"
        test_company.verified_at = datetime.utcnow()
        test_db.commit()

        response = client.get(
            "/api/v1/employer/domain-verification/status",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True
        assert data["verified_at"] is not None

    def test_get_status_rate_limited(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given rate limited company, when checking status,
        then should indicate cannot retry"""

        # Set up rate limited company
        test_company.verification_attempts = 5
        test_company.last_verification_attempt = datetime.utcnow()
        test_db.commit()

        response = client.get(
            "/api/v1/employer/domain-verification/status",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["can_retry"] is False
        assert data["remaining_attempts"] == 0

    # =========================================================================
    # POST /employer/domain-verification/resend Tests
    # =========================================================================

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_resend_verification_email_success(
        self, mock_send, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given email verification initiated, when resending email,
        then should send new email with same token"""

        # Initiate verification
        client.post(
            "/api/v1/employer/domain-verification/initiate",
            json={
                "domain": "testcompany.com",
                "method": "email"
            },
            headers=employer_auth_headers
        )

        # Reset mock
        mock_send.reset_mock()

        # Resend
        response = client.post(
            "/api/v1/employer/domain-verification/resend",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["emails_sent"] == 3
        assert mock_send.call_count == 3

    def test_resend_not_initiated(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given email verification not initiated, when resending,
        then should return 400 Bad Request"""

        response = client.post(
            "/api/v1/employer/domain-verification/resend",
            headers=employer_auth_headers
        )

        assert response.status_code == 400
        assert "not initiated" in response.json()["detail"].lower()

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_resend_expired_token(
        self, mock_send, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given expired verification token, when resending,
        then should return 410 Gone"""

        # Set up expired token
        test_company.verification_token = "expired_token"
        test_company.verification_method = "email"
        test_company.verification_token_expires_at = datetime.utcnow() - timedelta(hours=1)
        test_db.commit()

        response = client.post(
            "/api/v1/employer/domain-verification/resend",
            headers=employer_auth_headers
        )

        assert response.status_code == 410
        assert "expired" in response.json()["detail"].lower()

    # =========================================================================
    # GET /employer/domain-verification/badge Tests
    # =========================================================================

    def test_get_badge_verified_company(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given verified company, when getting badge,
        then should return verified badge HTML"""

        # Mark company as verified
        test_company.domain_verified = True
        test_company.verified_at = datetime.utcnow()
        test_db.commit()

        response = client.get(
            "/api/v1/employer/domain-verification/badge",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True
        assert data["verified_at"] is not None
        assert data["badge_html"] is not None
        assert "Verified" in data["badge_html"]

    def test_get_badge_unverified_company(
        self, client, test_db, employer_user, test_company, company_owner, employer_auth_headers
    ):
        """Given unverified company, when getting badge,
        then should return null badge"""

        response = client.get(
            "/api/v1/employer/domain-verification/badge",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False
        assert data["badge_html"] is None

    def test_get_badge_other_company(
        self, client, test_db, employer_user, employer_auth_headers
    ):
        """Given company_id parameter, when getting badge,
        then should return that company's badge"""

        # Create another verified company
        other_company = Company(
            id=uuid4(),
            name="Other Company",
            domain="othercompany.com",
            domain_verified=True,
            verified_at=datetime.utcnow(),
        )
        test_db.add(other_company)
        test_db.commit()

        response = client.get(
            f"/api/v1/employer/domain-verification/badge?company_id={str(other_company.id)}",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is True

    def test_get_badge_invalid_company_id(
        self, client, test_db, employer_user, employer_auth_headers
    ):
        """Given invalid company_id, when getting badge,
        then should return unverified badge"""

        response = client.get(
            f"/api/v1/employer/domain-verification/badge?company_id={str(uuid4())}",
            headers=employer_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["verified"] is False
        assert data["badge_html"] is None
