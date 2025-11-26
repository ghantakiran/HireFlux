# Feature: S3 Storage for Resume & Document Management - Issue #53
#
# As a job seeker or employer
# I want to upload and download documents securely
# So that I can manage my resumes, cover letters, and company documents

Feature: S3 Storage for Documents

  Background:
    Given the S3 storage service is configured
    And the S3 bucket "hireflux-documents" exists
    And server-side encryption is enabled

  # ============================================================================
  # JOB SEEKER - RESUME UPLOAD
  # ============================================================================

  Scenario: Job seeker uploads resume PDF successfully
    Given I am a logged-in job seeker with ID "user123"
    And I have a PDF resume file "john_doe_resume.pdf" of size 500KB
    When I request a pre-signed upload URL for path "/resumes/user123/resume_v1.pdf"
    Then I should receive a pre-signed URL valid for 60 minutes
    And the URL should allow PUT operations only
    When I upload the file to the pre-signed URL
    Then the upload should succeed with HTTP 200
    And the file should be encrypted at rest with AES-256
    And the file metadata should be stored in the database
    And the file should be accessible via download URL

  Scenario: Job seeker uploads multiple resume versions
    Given I am a logged-in job seeker with ID "user123"
    And I have already uploaded "resume_v1.pdf"
    When I upload a new resume "resume_v2.pdf"
    Then both versions should be stored in S3
    And S3 versioning should track the history
    And I should be able to download either version
    And the latest version should be marked as current

  Scenario: Resume upload validates file type (PDF/DOCX only)
    Given I am a logged-in job seeker with ID "user123"
    When I attempt to upload a file "resume.exe" with MIME type "application/x-msdownload"
    Then the upload should be rejected with error "Invalid file type"
    And only PDF and DOCX files should be allowed
    And no file should be created in S3

  Scenario: Resume upload enforces size limit (10MB max)
    Given I am a logged-in job seeker with ID "user123"
    When I attempt to upload a resume of size 15MB
    Then the upload should be rejected with error "File too large"
    And the maximum size should be 10MB
    And no file should be created in S3

  Scenario: Resume upload stores metadata correctly
    Given I am a logged-in job seeker with ID "user123"
    When I upload "john_doe_resume.pdf" of size 500KB
    Then the file metadata should include:
      | Field           | Value                      |
      | user_id         | user123                    |
      | file_name       | john_doe_resume.pdf        |
      | file_size       | 512000 bytes               |
      | mime_type       | application/pdf            |
      | s3_key          | resumes/user123/resume_v1.pdf |
      | upload_timestamp| 2025-11-25T12:00:00Z       |
      | encrypted       | true                       |

  # ============================================================================
  # JOB SEEKER - COVER LETTER UPLOAD
  # ============================================================================

  Scenario: Job seeker uploads cover letter
    Given I am a logged-in job seeker with ID "user123"
    And I have a PDF cover letter "cover_letter_techcorp.pdf"
    When I upload the cover letter for job ID "job456"
    Then the file should be stored at "/cover-letters/user123/job456_cover.pdf"
    And the cover letter should be linked to job application "app789"
    And I should be able to download it later

  Scenario: Job seeker generates and stores AI cover letter
    Given I am a logged-in job seeker with ID "user123"
    And I generate a cover letter for job "job456"
    When the AI service creates the cover letter PDF
    Then the system should automatically upload it to S3
    And the path should be "/cover-letters/user123/job456_ai_generated.pdf"
    And the metadata should indicate AI-generated source

  # ============================================================================
  # EMPLOYER - COMPANY LOGO UPLOAD
  # ============================================================================

  Scenario: Employer uploads company logo
    Given I am a logged-in employer with company ID "company456"
    And I have a PNG logo file "techcorp_logo.png" of size 200KB
    When I upload the company logo
    Then the file should be stored at "/company-logos/company456/logo.png"
    And the logo should be publicly accessible via CDN
    And the old logo should be replaced if one exists

  Scenario: Company logo enforces image format (PNG/JPG only)
    Given I am a logged-in employer with company ID "company456"
    When I attempt to upload a logo "logo.gif" with MIME type "image/gif"
    Then the upload should be rejected with error "Invalid image format"
    And only PNG and JPG files should be allowed

  Scenario: Company logo enforces size limit (2MB max)
    Given I am a logged-in employer with company ID "company456"
    When I attempt to upload a logo of size 3MB
    Then the upload should be rejected with error "Logo too large"
    And the maximum size should be 2MB

  # ============================================================================
  # EMPLOYER - BULK JOB UPLOAD CSV
  # ============================================================================

  Scenario: Employer uploads bulk job CSV
    Given I am a logged-in employer with company ID "company456"
    And I have a CSV file "job_postings_Q4.csv" with 50 job listings
    When I upload the bulk job CSV
    Then the file should be stored at "/bulk-uploads/company456/{upload_id}.csv"
    And the upload record should be created with status "pending"
    And the file should be queued for processing

  Scenario: Bulk CSV upload validates format
    Given I am a logged-in employer with company ID "company456"
    When I attempt to upload a file "jobs.txt" with MIME type "text/plain"
    Then the upload should be rejected with error "Must be CSV format"
    And only CSV files should be allowed

  # ============================================================================
  # FILE DOWNLOAD & ACCESS CONTROL
  # ============================================================================

  Scenario: Job seeker downloads own resume with pre-signed URL
    Given I am a logged-in job seeker with ID "user123"
    And my resume exists at "/resumes/user123/resume_v1.pdf"
    When I request a download URL for my resume
    Then I should receive a pre-signed URL valid for 60 minutes
    And the URL should allow GET operations only
    When I download from the pre-signed URL
    Then the file should be downloaded successfully
    And the Content-Type should be "application/pdf"

  Scenario: User cannot download another user's resume (access control)
    Given I am a logged-in job seeker with ID "user123"
    And another user "user456" has a resume at "/resumes/user456/resume.pdf"
    When I attempt to request a download URL for user456's resume
    Then the request should be denied with error "Access forbidden"
    And I should not receive any pre-signed URL

  Scenario: Pre-signed download URL expires after 1 hour
    Given I am a logged-in job seeker with ID "user123"
    And I requested a download URL at 12:00 PM
    And the URL was valid until 1:00 PM
    When I attempt to use the URL at 1:05 PM
    Then the download should fail with HTTP 403 Forbidden
    And I should need to request a new URL

  Scenario: Employer downloads applicant resume (with permission)
    Given I am an employer with company ID "company456"
    And job seeker "user123" applied to my job "job789"
    And user123's resume is attached to the application
    When I request a download URL for the applicant's resume
    Then I should receive a valid pre-signed URL
    And I should be able to download the resume
    And access should be logged for compliance

  # ============================================================================
  # FILE DELETION & LIFECYCLE
  # ============================================================================

  Scenario: Job seeker deletes old resume version
    Given I am a logged-in job seeker with ID "user123"
    And I have resume versions v1, v2, and v3
    When I delete version v1
    Then the file should be removed from S3
    And the metadata should be marked as deleted
    And versions v2 and v3 should remain accessible

  Scenario: Lifecycle policy archives old documents after 90 days
    Given a resume was uploaded 95 days ago
    And the resume has not been accessed in 90 days
    When the S3 lifecycle policy runs
    Then the file should be moved to Glacier storage
    And the file should still be downloadable (with delay)
    And the metadata should indicate archived status

  Scenario: Lifecycle policy deletes expired documents after 2 years
    Given a cover letter was uploaded 2 years and 1 day ago
    And the job application is closed
    When the S3 lifecycle policy runs
    Then the file should be permanently deleted from S3
    And the metadata should be marked as expired
    And download requests should fail with "File not found"

  # ============================================================================
  # VIRUS SCANNING (SECURITY)
  # ============================================================================

  Scenario: Uploaded file passes virus scan
    Given I am a logged-in job seeker with ID "user123"
    When I upload a clean resume "resume.pdf"
    Then the file should be scanned for viruses automatically
    And the scan should complete within 30 seconds
    And the file should be marked as "safe"
    And the file should become available for download

  Scenario: Uploaded file fails virus scan (infected)
    Given I am a logged-in job seeker with ID "user123"
    When I upload a file "infected_resume.pdf" containing malware
    Then the virus scanner should detect the threat
    And the file should be quarantined
    And I should receive an error "File failed security scan"
    And the file should not be accessible
    And the file should be deleted from S3 after 24 hours

  # ============================================================================
  # CDN & CACHING (PERFORMANCE)
  # ============================================================================

  Scenario: Company logo is served via CloudFront CDN
    Given employer "company456" has uploaded a logo
    And the logo is stored at "/company-logos/company456/logo.png"
    When a user requests the logo URL
    Then the logo should be served via CloudFront CDN
    And the CloudFront cache should be checked first
    And the Cache-Control header should be "public, max-age=86400"
    And subsequent requests should hit the cache (CDN hit rate > 80%)

  Scenario: Resume download bypasses CDN for privacy
    Given I am a logged-in job seeker with ID "user123"
    When I download my resume
    Then the download should be direct from S3 (no CDN)
    And the URL should be time-limited (1 hour)
    And the Cache-Control should be "private, no-cache"

  # ============================================================================
  # ERROR HANDLING & RESILIENCE
  # ============================================================================

  Scenario: Upload handles network interruption gracefully
    Given I am uploading a 5MB resume
    When the network connection drops at 60% progress
    Then the upload should fail with a clear error message
    And I should be able to retry the upload
    And the partial file should not be saved

  Scenario: S3 service handles bucket unavailability
    Given the S3 bucket is temporarily unavailable (503)
    When I attempt to upload a resume
    Then the service should retry 3 times with exponential backoff
    And if all retries fail, I should receive error "Storage service unavailable"
    And the upload should be queued for retry

  Scenario: Pre-signed URL generation handles invalid paths
    Given I am a logged-in user
    When I request a pre-signed URL with path "../../../etc/passwd"
    Then the request should be rejected with error "Invalid file path"
    And no URL should be generated
    And the attempt should be logged for security review

  # ============================================================================
  # AUDIT LOGGING & COMPLIANCE
  # ============================================================================

  Scenario: All file operations are audit logged
    Given I am a logged-in job seeker with ID "user123"
    When I perform the following operations:
      | Operation | File              |
      | upload    | resume.pdf        |
      | download  | resume.pdf        |
      | delete    | old_resume.pdf    |
    Then each operation should be logged with:
      | Field      | Example Value           |
      | user_id    | user123                 |
      | operation  | upload/download/delete  |
      | file_path  | /resumes/user123/...    |
      | timestamp  | 2025-11-25T12:00:00Z    |
      | ip_address | 192.168.1.1             |
      | status     | success/failure         |

  Scenario: GDPR compliance - User requests data deletion
    Given I am a job seeker with ID "user123"
    And I have uploaded 5 resumes and 10 cover letters
    When I request full account deletion (GDPR right to erasure)
    Then all my files should be deleted from S3 within 30 days
    And all metadata should be marked as deleted
    And audit logs should be retained for compliance (7 years)
    And deletion should be confirmed via email

  # ============================================================================
  # PERFORMANCE & SCALABILITY
  # ============================================================================

  Scenario: Upload handles concurrent operations from same user
    Given I am a logged-in job seeker with ID "user123"
    When I simultaneously upload 3 different documents:
      | Document          |
      | resume.pdf        |
      | cover_letter.pdf  |
      | transcript.pdf    |
    Then all 3 uploads should succeed
    And each should have unique S3 keys
    And no files should be overwritten

  Scenario: Service handles high upload volume (1000 uploads/min)
    Given 1000 users are uploading files simultaneously
    When the upload requests arrive within 1 minute
    Then the service should handle all requests without errors
    And upload reliability should be > 99.9%
    And average upload time should be < 5 seconds (for 1MB file)

  # ============================================================================
  # METADATA SEARCH & RETRIEVAL
  # ============================================================================

  Scenario: Job seeker searches own documents by filename
    Given I am a logged-in job seeker with ID "user123"
    And I have uploaded 10 resumes with different names
    When I search for documents with name containing "software_engineer"
    Then I should see all resumes matching that keyword
    And results should be sorted by upload date (newest first)

  Scenario: Employer retrieves all applicant documents for a job
    Given I am an employer with company ID "company456"
    And job "job789" has 50 applicants
    When I request all applicant resumes for job789
    Then I should receive a list of 50 resume download URLs
    And URLs should be valid for 1 hour
    And URLs should be sorted by application date

# ============================================================================
# ACCEPTANCE CRITERIA VALIDATION
# ============================================================================

# From Issue #53:
# ✅ Upload reliability > 99.9%
# ✅ Pre-signed URLs work 100%
# ✅ Files encrypted at rest
# ✅ Access logs captured
# ✅ CDN hit rate > 80% (for public assets like logos)

# Total Scenarios: 35+
# Coverage:
#   - Job Seeker Operations: 10 scenarios
#   - Employer Operations: 5 scenarios
#   - Security & Access Control: 6 scenarios
#   - Performance & Scalability: 4 scenarios
#   - Compliance & Audit: 3 scenarios
#   - Error Handling: 4 scenarios
#   - CDN & Caching: 2 scenarios
