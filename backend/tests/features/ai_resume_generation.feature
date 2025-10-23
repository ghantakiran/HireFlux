Feature: AI Resume Generation and Optimization
  As a user
  I want to generate optimized resumes using AI
  So that I can tailor my resume for specific job applications

  Background:
    Given the user is authenticated
    And the user has completed onboarding
    And the user has uploaded a resume

  Scenario: Generate ATS-optimized resume from uploaded resume
    Given the user has a parsed resume
    When the user requests an ATS-optimized resume
    Then the AI should generate an optimized version
    And the resume should be formatted for ATS compatibility
    And the resume should maintain factual accuracy
    And the resume should be saved as a new version

  Scenario: Generate resume tailored for specific job title
    Given the user has a parsed resume
    And the user specifies a target job title "Senior Software Engineer"
    When the user requests a tailored resume
    Then the AI should emphasize relevant skills for the role
    And the AI should reorder experience to prioritize relevance
    And the AI should use industry-appropriate keywords
    And the resume should be saved with the target title

  Scenario: Generate resume with specific tone
    Given the user has a parsed resume
    And the user selects tone "formal"
    When the user requests resume generation
    Then the AI should use professional, formal language
    And the resume should maintain consistency in tone
    And the resume should avoid casual expressions

  Scenario: Generate resume with conversational tone
    Given the user has a parsed resume
    And the user selects tone "conversational"
    When the user requests resume generation
    Then the AI should use approachable, engaging language
    And the resume should be personable yet professional
    And the resume should tell a compelling career story

  Scenario: Generate resume with concise tone
    Given the user has a parsed resume
    And the user selects tone "concise"
    When the user requests resume generation
    Then the AI should use brief, impactful statements
    And the resume should eliminate unnecessary words
    And the resume should maximize information density

  Scenario: Enhance work experience descriptions
    Given the user has basic work experience descriptions
    When the user requests AI enhancement
    Then the AI should add quantifiable achievements
    And the AI should use action verbs
    And the AI should highlight impact and results
    And the AI should avoid fabricating information

  Scenario: Generate multiple resume versions
    Given the user has a parsed resume
    When the user creates versions for different roles:
      | role                    | tone          |
      | Software Engineer       | formal        |
      | Tech Lead              | conversational |
      | Engineering Manager     | formal        |
    Then all versions should be created successfully
    And each version should be tailored appropriately
    And the user should be able to access all versions

  Scenario: Optimize resume for specific company
    Given the user has a parsed resume
    And the user provides company information "Google"
    When the user requests company-specific optimization
    Then the AI should research company culture
    And the AI should align resume with company values
    And the AI should use company-relevant keywords

  Scenario: AI respects user's no-hallucination preference
    Given the user has enabled strict factual mode
    When the user requests resume generation
    Then the AI should only use information from the original resume
    And the AI should not add experiences not provided
    And the AI should not fabricate achievements
    And the AI should mark assumptions clearly

  Scenario: Handle resume generation with minimal information
    Given the user has a resume with sparse information
    When the user requests AI generation
    Then the AI should work with available information
    And the AI should suggest areas for improvement
    And the AI should not fabricate missing information

  Scenario: Generate resume section by section
    Given the user wants to regenerate specific sections
    When the user selects "work experience" for regeneration
    Then the AI should only regenerate that section
    And other sections should remain unchanged
    And the user can review and accept changes

  Scenario: AI provides suggestions for improvement
    Given the user has a generated resume
    When the user requests improvement suggestions
    Then the AI should analyze the resume
    And the AI should provide actionable feedback
    And the AI should suggest missing skills or keywords
    And the AI should highlight weak areas

  Scenario: Cost tracking for AI generation
    Given the user generates multiple resumes
    When AI processing occurs
    Then the system should track token usage
    And the system should calculate costs
    And the system should deduct credits from user account
    And the user should see remaining credits

  Scenario: Resume generation fails gracefully
    Given the user requests resume generation
    And the OpenAI API is unavailable
    When the generation is attempted
    Then the system should handle the error gracefully
    And the user should receive a clear error message
    And the original resume should remain unchanged
    And the user should be offered to retry later

  Scenario: User reviews and edits AI-generated resume
    Given the AI has generated a resume
    When the user reviews the generated content
    Then the user should be able to edit any section
    And the user should be able to revert to original
    And the user should be able to regenerate specific parts
    And edits should be saved immediately

  Scenario: Compare original vs AI-generated resume
    Given the user has both original and AI-generated resumes
    When the user views comparison
    Then the system should highlight differences
    And the system should show improvements made
    And the user can choose which version to keep

  Scenario: AI maintains professional formatting
    Given the user requests resume generation
    When the AI generates the resume
    Then the output should be well-structured
    And sections should be properly organized
    And bullet points should be consistent
    And formatting should follow best practices

  Scenario: Handle rate limiting from OpenAI
    Given multiple users are generating resumes
    And OpenAI rate limits are approached
    When a user requests generation
    Then the system should queue the request
    And the user should be notified of expected wait time
    And the generation should proceed when possible

  Scenario: User sets default generation preferences
    Given the user has preferred settings
    When the user saves default preferences:
      | preference | value          |
      | tone       | formal         |
      | length     | one_page       |
      | style      | ats_optimized  |
    Then future generations should use these defaults
    And the user can override for specific generations

  Scenario: Version control for generated resumes
    Given the user has multiple generated versions
    When the user views version history
    Then all versions should be listed chronologically
    And each version should show metadata (date, tone, target)
    And the user can restore any previous version
    And the user can delete unwanted versions

  Scenario: AI generation respects credit limits
    Given the user has limited AI credits
    When the user attempts generation that exceeds credits
    Then the system should prevent generation
    And the user should be notified of insufficient credits
    And the user should be offered to purchase more credits
