Feature: AI Cover Letter Generation
  As a user
  I want to generate tailored cover letters using AI
  So that I can customize my application for each job

  Background:
    Given the user is authenticated
    And the user has a resume uploaded

  Scenario: Generate cover letter for specific job
    Given the user has a job posting
    When the user requests cover letter generation with:
      | field           | value                      |
      | job_title       | Senior Software Engineer   |
      | company_name    | Google                     |
      | tone            | formal                     |
    Then the AI should generate a tailored cover letter
    And the cover letter should reference the job title
    And the cover letter should mention the company
    And the cover letter should be saved to database
    And the user should receive the cover letter ID

  Scenario: Generate cover letter from job description
    Given the user provides a job description
    When the user requests cover letter generation
    Then the AI should extract key requirements from JD
    And the AI should highlight matching qualifications
    And the AI should address specific requirements
    And the cover letter should demonstrate cultural fit

  Scenario: Generate cover letter with formal tone
    Given the user selects tone "formal"
    When the user requests cover letter generation
    Then the cover letter should use professional language
    And the cover letter should avoid casual expressions
    And the cover letter should maintain formal structure
    And the cover letter should include proper salutation

  Scenario: Generate cover letter with conversational tone
    Given the user selects tone "conversational"
    When the user requests cover letter generation
    Then the cover letter should be engaging and personable
    And the cover letter should maintain professionalism
    And the cover letter should tell a compelling story
    And the cover letter should feel authentic

  Scenario: Generate cover letter emphasizing specific skills
    Given the user wants to highlight specific skills:
      | skill           |
      | Python          |
      | Leadership      |
      | System Design   |
    When the user requests cover letter generation
    Then the cover letter should prominently feature these skills
    And the cover letter should provide concrete examples
    And the cover letter should connect skills to job requirements

  Scenario: Generate cover letter from resume version
    Given the user has multiple resume versions
    And the user selects version "Software Engineer Resume"
    When the user requests cover letter generation
    Then the AI should use that specific resume version
    And the cover letter should align with resume content
    And the cover letter should reference experiences from that version

  Scenario: AI avoids fabricating information
    Given the user has enabled strict factual mode
    When the user requests cover letter generation
    Then the AI should only use information from resume
    And the AI should not invent experiences or skills
    And the AI should not make unsubstantiated claims
    And the AI should indicate when information is limited

  Scenario: Generate cover letter with custom intro
    Given the user provides a custom introduction:
      """
      I was excited to learn about this opportunity through Sarah Johnson,
      who spoke highly of Google's engineering culture.
      """
    When the user requests cover letter generation
    Then the cover letter should incorporate the custom intro
    And the rest should be AI-generated
    And the tone should remain consistent throughout

  Scenario: Generate multiple cover letter variations
    Given the user wants 3 variations
    When the user requests cover letter generation
    Then the AI should generate 3 different versions
    And each version should emphasize different strengths
    And all versions should be saved
    And the user can select their preferred version

  Scenario: Track token usage and cost
    Given the user generates a cover letter
    When AI processing completes
    Then the system should track tokens used
    And the system should calculate cost
    And the system should deduct credits from user account
    And the user should see remaining credits

  Scenario: Cover letter respects length preferences
    Given the user selects length "brief" (200-250 words)
    When the user requests cover letter generation
    Then the cover letter should be 200-250 words
    And the cover letter should be concise and impactful
    And the cover letter should include all key elements

  Scenario: Cover letter respects length preferences - standard
    Given the user selects length "standard" (300-400 words)
    When the user requests cover letter generation
    Then the cover letter should be 300-400 words
    And the cover letter should provide detailed examples

  Scenario: Cover letter respects length preferences - detailed
    Given the user selects length "detailed" (450-600 words)
    When the user requests cover letter generation
    Then the cover letter should be 450-600 words
    And the cover letter should include comprehensive background

  Scenario: Reference specific achievements from resume
    Given the user's resume includes achievement "Led team of 10 engineers to deliver project 2 months early"
    When the user requests cover letter generation
    Then the cover letter should reference this achievement
    And the achievement should be contextualized for the role
    And the achievement should demonstrate relevant skills

  Scenario: Generate cover letter for different industries
    Given the user targets industry "fintech"
    When the user requests cover letter generation
    Then the cover letter should use industry-appropriate language
    And the cover letter should highlight relevant experience
    And the cover letter should demonstrate industry knowledge

  Scenario: Edit and regenerate cover letter
    Given the user has a generated cover letter
    When the user edits the introduction
    And the user requests regeneration of body paragraphs
    Then the AI should regenerate only the body
    And the custom introduction should be preserved
    And the tone should remain consistent

  Scenario: Compare cover letter variations
    Given the user has 3 cover letter variations
    When the user views comparison
    Then the system should highlight key differences
    And the system should show unique strengths of each
    And the user can select the best version

  Scenario: Export cover letter in different formats
    Given the user has a generated cover letter
    When the user requests export
    Then the user should be able to download as:
      | format |
      | PDF    |
      | DOCX   |
      | TXT    |
      | HTML   |

  Scenario: Cover letter addresses employment gaps
    Given the user has an employment gap in resume
    And the user provides explanation "Sabbatical for personal development"
    When the user requests cover letter generation
    Then the cover letter should address the gap positively
    And the cover letter should frame it as growth opportunity
    And the cover letter should emphasize readiness to contribute

  Scenario: Generate cover letter for career change
    Given the user is changing careers from "Finance" to "Software Engineering"
    When the user requests cover letter generation
    Then the cover letter should acknowledge career transition
    And the cover letter should highlight transferable skills
    And the cover letter should demonstrate passion for new field
    And the cover letter should address potential concerns

  Scenario: Cover letter generation fails gracefully
    Given the user requests cover letter generation
    And the OpenAI API is unavailable
    When the generation is attempted
    Then the system should handle error gracefully
    And the user should receive clear error message
    And the user should be offered to retry
    And no credits should be deducted

  Scenario: Auto-save draft cover letters
    Given the user is generating a cover letter
    When the user provides partial information
    Then the system should save as draft
    And the user can return to complete later
    And drafts should not consume credits until finalized

  Scenario: User provides company research
    Given the user provides company insights:
      """
      Google emphasizes innovation and data-driven decision making.
      Recent focus on AI and sustainable computing.
      """
    When the user requests cover letter generation
    Then the cover letter should incorporate these insights
    And the cover letter should demonstrate company knowledge
    And the cover letter should align with company values

  Scenario: Generate cover letter for referral
    Given the user has a referral from "Jane Smith, Senior Engineer"
    When the user requests cover letter generation
    Then the cover letter should mention the referral prominently
    And the cover letter should leverage the connection
    And the cover letter should thank the referrer subtly

  Scenario: Version control for cover letters
    Given the user has an existing cover letter
    When the user requests modifications
    Then the system should save as new version
    And the user can access version history
    And the user can restore previous versions
    And each version should show creation date and parameters

  Scenario: Bulk cover letter generation
    Given the user has 5 job applications
    When the user provides basic info for each job
    Then the system should generate 5 cover letters
    And each should be customized for the specific role
    And all should be saved with job references
    And the user should see total cost before confirming

  Scenario: Cover letter quality scoring
    Given the user has a generated cover letter
    When the user requests quality analysis
    Then the AI should score the cover letter (0-100)
    And provide specific feedback on strengths
    And suggest improvements
    And highlight any potential issues

  Scenario: Reuse cover letter structure
    Given the user has a successful cover letter
    When the user requests generation for new job
    Then the user can choose to reuse structure
    And the AI should maintain similar flow
    And update content for new role
    And preserve effective phrasing patterns
