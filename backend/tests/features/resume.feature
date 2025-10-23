Feature: Resume Upload and Parsing
  As a user
  I want to upload my resume
  So that I can extract my professional information automatically

  Background:
    Given the user is authenticated
    And the user has completed onboarding

  Scenario: User uploads a PDF resume successfully
    Given the user has a valid PDF resume file
    When the user uploads the resume
    Then the resume should be saved successfully
    And the resume should be parsed for key information
    And the user should see extracted contact information
    And the user should see extracted work experience
    And the user should see extracted education
    And the user should see extracted skills

  Scenario: User uploads a DOCX resume successfully
    Given the user has a valid DOCX resume file
    When the user uploads the resume
    Then the resume should be saved successfully
    And the resume should be parsed for key information
    And the extracted data should be stored in the database

  Scenario: User uploads multiple resume versions
    Given the user has uploaded a resume previously
    When the user uploads a new resume version
    Then both resume versions should be available
    And the new version should be marked as latest
    And the user can view all resume versions

  Scenario: User retrieves their resume
    Given the user has uploaded a resume
    When the user requests to view their resume
    Then the resume metadata should be returned
    And the parsed data should be included
    And the original file URL should be provided

  Scenario: User downloads their original resume file
    Given the user has uploaded a resume
    When the user requests to download the original file
    Then the original file should be returned
    And the file content type should match the upload

  Scenario: User deletes a resume
    Given the user has uploaded multiple resumes
    When the user deletes a specific resume
    Then the resume should be marked as deleted
    And the file should be removed from storage
    And the resume should not appear in the user's list

  Scenario: Resume parsing extracts contact information
    Given a resume with complete contact information
    When the resume is parsed
    Then the parser should extract the full name
    And the parser should extract the email address
    And the parser should extract the phone number
    And the parser should extract the location
    And the parser should extract the LinkedIn URL if present

  Scenario: Resume parsing extracts work experience
    Given a resume with work experience section
    When the resume is parsed
    Then the parser should extract company names
    And the parser should extract job titles
    And the parser should extract employment dates
    And the parser should extract job descriptions
    And the experience should be ordered chronologically

  Scenario: Resume parsing extracts education
    Given a resume with education section
    When the resume is parsed
    Then the parser should extract institution names
    And the parser should extract degree types
    And the parser should extract fields of study
    And the parser should extract graduation dates

  Scenario: Resume parsing extracts skills
    Given a resume with skills section
    When the resume is parsed
    Then the parser should extract technical skills
    And the parser should extract soft skills
    And the parser should categorize skills appropriately
    And duplicate skills should be removed

  Scenario: User uploads an unsupported file type
    Given the user has an unsupported file (e.g., .txt, .jpg)
    When the user attempts to upload the file
    Then the upload should be rejected
    And an error message should indicate supported formats
    And the error should specify PDF and DOCX are supported

  Scenario: User uploads a file that is too large
    Given the user has a resume file larger than 10MB
    When the user attempts to upload the file
    Then the upload should be rejected
    And an error message should indicate the size limit
    And the error should specify the maximum allowed size

  Scenario: Resume parsing handles malformed files gracefully
    Given the user uploads a corrupted or malformed file
    When the system attempts to parse the resume
    Then the system should handle the error gracefully
    And the user should receive a clear error message
    And the file should still be saved if structurally valid

  Scenario: User sets a default resume
    Given the user has multiple resumes
    When the user marks one resume as default
    Then that resume should be marked as the default
    And the previous default should be unmarked
    And the default resume should be used for applications

  Scenario: Resume parsing with minimal information
    Given a resume with only basic information
    When the resume is parsed
    Then the parser should extract available information
    And missing fields should be marked as null
    And the user should be notified of missing information

  Scenario: User updates parsed resume data manually
    Given the user has a parsed resume with extracted data
    When the user manually updates the parsed data
    Then the updated data should be saved
    And the original file should remain unchanged
    And the manual edits should be preserved

  Scenario: Resume parsing detects and extracts certifications
    Given a resume with certifications section
    When the resume is parsed
    Then the parser should extract certification names
    And the parser should extract issuing organizations
    And the parser should extract certification dates

  Scenario: User exports resume data as JSON
    Given the user has a parsed resume
    When the user requests to export the data
    Then the system should return the data in JSON format
    And all extracted fields should be included
    And the format should be structured and readable

  Scenario: System tracks resume parsing success rate
    Given multiple users are uploading resumes
    When resumes are parsed
    Then the system should track successful parses
    And the system should track failed parses
    And parsing errors should be logged for improvement
