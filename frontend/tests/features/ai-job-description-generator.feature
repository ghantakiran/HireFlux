# Feature: AI Job Description Generator (Issue #115)
#
# As an employer
# I want to generate professional job descriptions with AI from minimal input
# So that I can quickly create compelling, detailed job postings

Feature: AI Job Description Generator

  Background:
    Given I am logged in as an employer
    And I have a company profile setup

  # Core Generation Flow
  Scenario: Access job description generator
    Given I am on the employer dashboard
    When I click "Create Job" or "New Job Posting"
    Then I should see the job description generator form
    And I should see minimal input fields (title + key points)
    And I should see tone selection options
    And I should see a "Generate with AI" button

  Scenario: Enter minimal job information
    Given I am on the job description generator form
    When I enter job title "Senior Full-Stack Engineer"
    And I add key point "Experience with React and Node.js"
    And I add key point "5+ years professional experience"
    And I add key point "Strong communication skills"
    Then I should see 3 key points listed
    And the "Generate with AI" button should be enabled

  Scenario: Select tone before generation
    Given I am on the job description generator form
    When I click on tone dropdown
    Then I should see tone options:
      | Tone            |
      | Professional    |
      | Conversational  |
      | Technical       |
      | Formal          |
      | Friendly        |
    When I select "Professional" tone
    Then the tone should be marked as selected

  Scenario: Generate job description with minimal input
    Given I have entered job title "Senior Full-Stack Engineer"
    And I have added 3-5 key points
    And I have selected "Professional" tone
    When I click "Generate with AI"
    Then I should see a loading indicator
    And the generation should complete in less than 6 seconds
    And I should see the generated job description
    And the job description should use professional language

  Scenario: Generate job description with conversational tone
    Given I have entered job title "Software Developer"
    And I have added key points
    And I have selected "Conversational" tone
    When I click "Generate with AI"
    Then I should see a loading indicator
    And the generation should complete in less than 6 seconds
    And I should see the generated job description
    And the job description should use conversational language

  # Generated Content Structure
  Scenario: View generated job description structure
    Given I have generated a job description
    Then the job description should include:
      | Section                        | Present |
      | Job Title                      | Yes     |
      | Job Overview/Summary           | Yes     |
      | Key Responsibilities           | Yes     |
      | Required Qualifications        | Yes     |
      | Preferred Qualifications       | Yes     |
      | Benefits & Perks               | Yes     |
      | About the Company (optional)   | Maybe   |

  Scenario: Job description includes input details
    Given I generated a JD for "Senior Frontend Engineer"
    And I included key point "Experience with React and TypeScript"
    Then the job description should mention "Senior Frontend Engineer"
    And the job description should reference React
    And the job description should reference TypeScript
    And the job description should include relevant technical requirements

  Scenario: Job description is detailed and comprehensive
    Given I have generated a job description
    Then the job overview should be 2-3 paragraphs
    And the responsibilities section should have 5-8 bullet points
    And the requirements section should have 5-8 bullet points
    And the qualifications should distinguish required vs. preferred
    And the benefits section should have 3-5 bullet points

  # Editing & Customization
  Scenario: Edit generated job description
    Given I have generated a job description
    When I click on the job description text
    Then the job description should become editable
    And I should see editing tools (bold, italic, lists)

  Scenario: Edit job title inline
    Given I am viewing a generated job description
    When I click on the job title field
    And I change it to "Staff Software Engineer"
    And I click "Save" or press Enter
    Then the job title should be updated to "Staff Software Engineer"

  Scenario: Edit responsibilities section
    Given I am viewing a generated job description
    When I click on the responsibilities section
    And I add a new bullet point "Lead architectural decisions"
    And I click "Save Changes"
    Then the responsibilities should include the new bullet point
    And I should see a success message

  Scenario: Edit requirements section
    Given I am viewing a generated job description
    When I click on the requirements section
    And I modify a requirement from "3+ years" to "5+ years"
    And I save the changes
    Then the requirement should show "5+ years"
    And the change should be persisted

  Scenario: Add custom section to job description
    Given I am editing a generated job description
    When I click "Add Custom Section"
    And I enter section title "Work Schedule"
    And I enter section content "Monday-Friday, 9am-5pm EST"
    And I save the custom section
    Then I should see "Work Schedule" as a new section
    And the content should be displayed

  # Multiple Versions & Regeneration
  Scenario: Save job description as version
    Given I have generated a job description
    When I click "Save as Version"
    Then I should see a version name input
    When I enter "Version 1 - Professional"
    And I click "Save"
    Then the version should be saved
    And I should see "Version 1 - Professional" in versions list

  Scenario: Regenerate with different tone
    Given I have saved a JD as "Version 1 - Professional"
    When I select "Conversational" tone
    And I click "Regenerate"
    Then a new job description should be generated
    And I should see both versions in the versions list

  Scenario: Switch between versions
    Given I have multiple JD versions
    When I click on "Version 1 - Professional"
    Then I should see the professional version displayed
    When I click on "Version 2 - Conversational"
    Then I should see the conversational version displayed

  Scenario: Compare versions side-by-side
    Given I have multiple JD versions
    When I click "Compare Versions"
    Then I should see a side-by-side comparison view
    And I should see "Version 1" on the left
    And I should see "Version 2" on the right
    And differences should be highlighted

  Scenario: Delete a version
    Given I have multiple JD versions
    When I click delete on "Version 1 - Professional"
    And I confirm the deletion
    Then "Version 1 - Professional" should be removed from versions list
    And I should see a confirmation message

  # Template Management
  Scenario: Save job description as template
    Given I have generated a job description
    When I click "Save as Template"
    Then I should see a template name input
    When I enter "Software Engineer Template"
    And I click "Save Template"
    Then the template should be saved
    And I should see it in my templates library

  Scenario: Use template for new job
    Given I have saved templates in my library
    When I create a new job
    And I click "Use Template"
    Then I should see my templates list
    When I select "Software Engineer Template"
    Then the job description should be pre-filled with template content
    And I should be able to customize it

  Scenario: Edit saved template
    Given I have a saved template "Software Engineer Template"
    When I navigate to templates library
    And I click "Edit" on the template
    Then I should see the template content
    When I modify the content
    And I click "Save Template"
    Then the template should be updated
    And the changes should be reflected

  Scenario: Delete template
    Given I have saved templates
    When I click delete on "Software Engineer Template"
    And I confirm deletion
    Then the template should be removed from library
    And I should see a confirmation message

  # AI Quality & Suggestions
  Scenario: View AI-generated quality score
    Given I have generated a job description
    Then I should see a quality score (0-100)
    And I should see score breakdown:
      | Criterion          | Weight |
      | Clarity            | 25%    |
      | Completeness       | 25%    |
      | Professionalism    | 20%    |
      | SEO Optimization   | 15%    |
      | ATS Compatibility  | 15%    |

  Scenario: Receive AI improvement suggestions
    Given I have generated a job description with score 75
    When I click "Show Suggestions"
    Then I should see AI improvement suggestions
    And suggestions should be specific and actionable
    And I should be able to apply suggestions with one click

  Scenario: Apply AI suggestion
    Given I see an AI improvement suggestion
    When I click "Apply Suggestion"
    Then the job description should be updated with the suggestion
    And the quality score should improve
    And I should see the updated score

  # Export & Publishing
  Scenario: Export job description as PDF
    Given I have generated a job description
    When I click "Export"
    And I select "PDF" format
    Then a PDF file should be downloaded
    And the PDF should contain the complete job description
    And the PDF should be professionally formatted

  Scenario: Export job description as TXT
    Given I have generated a job description
    When I click "Export"
    And I select "TXT" format
    Then a TXT file should be downloaded
    And the TXT file should contain the job description text

  Scenario: Export job description as DOCX
    Given I have generated a job description
    When I click "Export"
    And I select "DOCX" format
    Then a DOCX file should be downloaded
    And the DOCX file should preserve formatting

  Scenario: Copy job description to clipboard
    Given I have generated a job description
    When I click "Copy to Clipboard"
    Then the job description should be copied
    And I should see a "Copied!" confirmation message

  Scenario: Proceed to job posting
    Given I have generated and finalized a job description
    When I click "Create Job Posting"
    Then I should be taken to the job posting form
    And the job description should be pre-filled
    And I should be able to add additional details (salary, location, etc.)

  # Character & Word Count
  Scenario: View character count while editing
    Given I am editing a job description
    Then I should see a live character count
    And the count should update as I type

  Scenario: View word count while editing
    Given I am editing a job description
    Then I should see a live word count
    And the count should update as I type

  Scenario: Warning for excessively long job description
    Given I am editing a job description
    When the word count exceeds 800 words
    Then I should see a warning message
    And the warning should suggest keeping it concise

  Scenario: Warning for too short job description
    Given I am editing a job description
    When the word count is less than 200 words
    Then I should see a warning message
    And the warning should suggest adding more details

  # Input Validation
  Scenario: Require job title
    Given I am on the job description generator form
    When I try to generate without entering a job title
    Then I should see an error message "Job title is required"
    And the "Generate with AI" button should be disabled

  Scenario: Require at least 3 key points
    Given I have entered a job title
    And I have only 2 key points
    When I try to generate a job description
    Then I should see an error "Please add at least 3 key points"
    And generation should not proceed

  Scenario: Limit maximum key points
    Given I have entered a job title
    When I try to add more than 10 key points
    Then I should see a message "Maximum 10 key points allowed"
    And the add button should be disabled

  # Regeneration
  Scenario: Regenerate job description
    Given I have generated a job description
    When I click "Regenerate"
    Then I should see a confirmation dialog
    When I confirm regeneration
    Then a new job description should be generated
    And the previous version should be replaced (unless saved as version)

  Scenario: Regenerate with same inputs
    Given I have generated a job description
    When I click "Regenerate" without changing inputs
    Then a new variation should be generated
    And the new version should be different from the first

  # Manual Entry Fallback
  Scenario: Create job description manually
    Given I am on the job description generator form
    When I click "Create Manually" or "Skip AI Generation"
    Then I should see an empty job description editor
    And I should see section templates (overview, responsibilities, etc.)
    And I should be able to fill in each section manually

  # History & Saved Jobs
  Scenario: View job description history
    Given I have generated multiple job descriptions
    When I navigate to "My Job Descriptions"
    Then I should see a list of all my job descriptions
    And each entry should show:
      | Field          | Displayed |
      | Job Title      | Yes       |
      | Company Name   | Yes       |
      | Generated Date | Yes       |
      | Tone Used      | Yes       |
      | Status         | Yes       |

  Scenario: Search job description history
    Given I am viewing my job description history
    When I search for "Engineer"
    Then I should see only job descriptions with "Engineer" in the title
    And other job descriptions should be hidden

  Scenario: Filter job descriptions by tone
    Given I am viewing my job description history
    When I filter by "Professional" tone
    Then I should see only professional tone job descriptions
    And other tones should be hidden

  Scenario: Filter job descriptions by status
    Given I am viewing my job description history
    When I filter by "Published" status
    Then I should see only published job descriptions
    And draft/unpublished should be hidden

  # Performance
  Scenario: Generate job description in less than 6 seconds
    Given I am on the job description generator form
    When I click "Generate with AI"
    Then the generation should start immediately
    And the job description should be displayed within 6 seconds

  Scenario: Show progress during generation
    Given I am generating a job description
    Then I should see a progress indicator
    And I should see status messages like "Analyzing requirements..."
    And I should see status messages like "Generating responsibilities..."
    And I should see status messages like "Finalizing job description..."

  # Error Handling
  Scenario: Handle generation error gracefully
    Given I am generating a job description
    When the AI service fails
    Then I should see an error message
    And I should see a "Retry" button
    And I should see an option to "Create Manually"
    And my input data should be preserved

  Scenario: Retry failed generation
    Given a job description generation failed
    When I click "Retry"
    Then the generation should be attempted again
    And I should see the loading indicator

  Scenario: Network interruption during generation
    Given I am generating a job description
    When I lose internet connection
    Then I should see a network error message
    And my input should be saved locally
    When connection is restored
    And I click "Retry"
    Then the generation should complete successfully

  # Mobile Responsiveness
  Scenario: Generate job description on mobile
    Given I am on a mobile device
    When I navigate to the job description generator
    Then the form should be mobile-optimized
    And I should be able to scroll through the generated description
    And editing tools should be accessible

  Scenario: View job description on mobile
    Given I have generated a job description on mobile
    Then the job description should be readable
    And the text should wrap appropriately
    And buttons should be easy to tap

  # Accessibility
  Scenario: Navigate job description generator with keyboard
    Given I am on the job description generator form
    Then I should be able to tab through all form fields
    And I should be able to select tone with keyboard
    And I should be able to submit with Enter key

  Scenario: Use job description generator with screen reader
    Given I am using a screen reader
    When I navigate to the job description generator
    Then all form fields should be announced
    And the generated job description should be readable
    And all buttons should have clear labels

  # Collaboration (if applicable)
  Scenario: Share draft job description with team
    Given I have generated a job description
    When I click "Share with Team"
    Then I should see a team member selection list
    When I select team members
    And I click "Share"
    Then selected team members should receive a notification
    And they should be able to view and comment

  Scenario: Receive feedback on job description
    Given I shared a job description with my team
    When a team member adds a comment
    Then I should receive a notification
    And I should see the comment on the job description
    And I should be able to reply

  # SEO & ATS Optimization
  Scenario: View SEO optimization suggestions
    Given I have generated a job description
    When I click "SEO Analysis"
    Then I should see keyword suggestions
    And I should see keyword density analysis
    And I should see recommendations to improve searchability

  Scenario: View ATS compatibility score
    Given I have generated a job description
    Then I should see an ATS compatibility score (0-100)
    And I should see suggestions to improve ATS parsing
    And I should see flagged issues (special characters, formatting)

  Scenario: Apply SEO recommendations
    Given I see SEO keyword suggestions
    When I click "Apply Keyword Suggestions"
    Then the job description should be updated with keywords
    And the SEO score should improve

  # Tone Consistency
  Scenario: Maintain tone throughout job description
    Given I selected "Conversational" tone
    When I generate a job description
    Then the job overview should use conversational language
    And the responsibilities should use conversational language
    And the requirements should use conversational language
    And the benefits should use conversational language

  # Company Branding Integration
  Scenario: Include company values in job description
    Given my company profile includes values "Innovation, Collaboration, Growth"
    When I generate a job description
    Then the job description should subtly reference company values
    And the "About the Company" section should mention values

  Scenario: Use company tone preferences
    Given my company profile has "Friendly" as preferred tone
    When I create a new job description
    Then the tone should default to "Friendly"
    And I should still be able to override it

  # Duplicate Detection
  Scenario: Warn when creating similar job description
    Given I have an existing JD for "Senior Software Engineer"
    When I try to generate a new JD for "Senior Software Engineer"
    Then I should see a warning "Similar job description exists"
    And I should see an option to "View Existing" or "Continue Anyway"

  # Preview Before Publishing
  Scenario: Preview job description as applicant would see it
    Given I have generated a job description
    When I click "Preview"
    Then I should see how the job posting would appear to applicants
    And I should see the full job description
    And I should see the apply button (inactive in preview)
