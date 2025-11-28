# Feature: Cover Letter Generator (Issue #107)
#
# As a job seeker
# I want to generate AI-powered cover letters for job applications
# So that I can create compelling, personalized cover letters quickly

Feature: Cover Letter Generator

  Background:
    Given I am logged in as a job seeker
    And I have a complete profile with resume

  # Core Generation Flow
  Scenario: Generate cover letter for a job posting
    Given I am on a job details page
    When I click "Generate Cover Letter"
    Then I should see a cover letter generation form
    And I should see job details pre-filled
    And I should see my profile information displayed
    And I should see tone selection options

  Scenario: Select tone before generation
    Given I am on the cover letter generation form
    When I select "Formal" tone
    Then the tone should be marked as selected
    When I select "Conversational" tone
    Then the "Conversational" tone should be marked as selected
    And the "Formal" tone should be deselected

  Scenario: Generate cover letter with selected tone
    Given I am on the cover letter generation form
    And I have selected "Formal" tone
    When I click "Generate Cover Letter"
    Then I should see a loading indicator
    And the generation should complete in less than 6 seconds
    And I should see the generated cover letter
    And the cover letter should use formal language

  Scenario: Generate cover letter with conversational tone
    Given I am on the cover letter generation form
    And I have selected "Conversational" tone
    When I click "Generate Cover Letter"
    Then I should see a loading indicator
    And the generation should complete in less than 6 seconds
    And I should see the generated cover letter
    And the cover letter should use conversational language

  # Cover Letter Content
  Scenario: View generated cover letter structure
    Given I have generated a cover letter
    Then the cover letter should include:
      | Section                | Present |
      | Salutation             | Yes     |
      | Opening Paragraph      | Yes     |
      | Body Paragraphs        | Yes     |
      | Closing Paragraph      | Yes     |
      | Signature              | Yes     |

  Scenario: Cover letter includes job-specific details
    Given I have generated a cover letter for "Senior Frontend Engineer at TechCorp"
    Then the cover letter should mention "Senior Frontend Engineer"
    And the cover letter should mention "TechCorp"
    And the cover letter should reference relevant skills from the job description

  Scenario: Cover letter includes profile details
    Given I have generated a cover letter
    Then the cover letter should include my name
    And the cover letter should reference my relevant experience
    And the cover letter should highlight my matching skills

  # Editing & Customization
  Scenario: Edit generated cover letter
    Given I have generated a cover letter
    When I click on the cover letter text
    Then the cover letter should become editable
    And I should see a text editor interface

  Scenario: Make inline edits to cover letter
    Given I am editing a generated cover letter
    When I change "Dear Hiring Manager" to "Dear John Smith"
    And I click "Save Changes"
    Then the cover letter should be updated
    And I should see a success message

  Scenario: Undo changes to cover letter
    Given I have edited a generated cover letter
    When I click "Undo"
    Then the cover letter should revert to the previous version
    And my edits should be discarded

  Scenario: Redo changes to cover letter
    Given I have undone changes to a cover letter
    When I click "Redo"
    Then the cover letter should restore my edits

  # Multiple Versions
  Scenario: Save current version of cover letter
    Given I have generated a cover letter
    When I click "Save as Version"
    Then I should see a version name input
    When I enter "Version 1 - Formal"
    And I click "Save"
    Then the version should be saved
    And I should see "Version 1 - Formal" in my versions list

  Scenario: Generate a new version with different tone
    Given I have saved a cover letter as "Version 1 - Formal"
    When I select "Conversational" tone
    And I click "Generate New Version"
    Then a new cover letter should be generated
    And I should see both versions in my versions list

  Scenario: Switch between cover letter versions
    Given I have multiple cover letter versions
    When I click on "Version 1 - Formal"
    Then I should see the formal version displayed
    When I click on "Version 2 - Conversational"
    Then I should see the conversational version displayed

  Scenario: Compare cover letter versions
    Given I have multiple cover letter versions
    When I click "Compare Versions"
    Then I should see a side-by-side comparison view
    And I should see "Version 1 - Formal" on the left
    And I should see "Version 2 - Conversational" on the right

  Scenario: Delete a cover letter version
    Given I have multiple cover letter versions
    When I click the delete button on "Version 1 - Formal"
    And I confirm the deletion
    Then "Version 1 - Formal" should be removed from my versions list
    And I should see a confirmation message

  # Export & Download
  Scenario: Export cover letter as PDF
    Given I have generated a cover letter
    When I click "Export"
    And I select "PDF" format
    Then a PDF file should be downloaded
    And the PDF should contain the cover letter text
    And the PDF should be formatted professionally

  Scenario: Export cover letter as TXT
    Given I have generated a cover letter
    When I click "Export"
    And I select "TXT" format
    Then a TXT file should be downloaded
    And the TXT file should contain the cover letter text

  Scenario: Export cover letter as DOCX
    Given I have generated a cover letter
    When I click "Export"
    And I select "DOCX" format
    Then a DOCX file should be downloaded
    And the DOCX file should contain the cover letter text
    And the DOCX file should preserve formatting

  Scenario: Copy cover letter to clipboard
    Given I have generated a cover letter
    When I click "Copy to Clipboard"
    Then the cover letter should be copied
    And I should see a "Copied!" confirmation message

  # Re-generation
  Scenario: Regenerate cover letter
    Given I have generated a cover letter
    When I click "Regenerate"
    Then I should see a confirmation dialog
    When I confirm regeneration
    Then a new cover letter should be generated
    And the previous version should be discarded

  Scenario: Regenerate with different tone
    Given I have generated a formal cover letter
    When I select "Conversational" tone
    And I click "Regenerate"
    Then a new conversational cover letter should be generated

  # Job Information Management
  Scenario: Manually enter job details
    Given I am on the cover letter generation form
    And I am not applying from a specific job posting
    When I click "Enter Job Details Manually"
    Then I should see input fields for:
      | Field               | Required |
      | Job Title           | Yes      |
      | Company Name        | Yes      |
      | Job Description     | Yes      |
      | Hiring Manager Name | No       |
      | Company Culture     | No       |

  Scenario: Generate cover letter from manual job details
    Given I have manually entered job details
    When I click "Generate Cover Letter"
    Then a cover letter should be generated
    And the cover letter should use the manually entered details

  # AI Suggestions During Editing
  Scenario: View AI suggestions while editing
    Given I am editing a generated cover letter
    When I highlight a paragraph
    Then I should see an "AI Improve" button
    When I click "AI Improve"
    Then I should see AI-suggested improvements
    And I should be able to accept or reject suggestions

  Scenario: Accept AI improvement suggestion
    Given I see an AI improvement suggestion
    When I click "Accept"
    Then the original text should be replaced with the suggestion
    And the suggestion should be marked as applied

  Scenario: Reject AI improvement suggestion
    Given I see an AI improvement suggestion
    When I click "Reject"
    Then the original text should remain unchanged
    And the suggestion should be dismissed

  # Template Selection
  Scenario: Choose from cover letter templates
    Given I am on the cover letter generation form
    When I click "Choose Template"
    Then I should see a list of templates:
      | Template         | Style        |
      | Classic          | Traditional  |
      | Modern           | Contemporary |
      | Creative         | Unique       |
      | Technical        | Tech-focused |

  Scenario: Generate cover letter with selected template
    Given I have selected the "Modern" template
    When I click "Generate Cover Letter"
    Then the cover letter should follow the modern template structure
    And the cover letter should have modern formatting

  # History & Saved Cover Letters
  Scenario: View cover letter history
    Given I have generated multiple cover letters
    When I navigate to "My Cover Letters"
    Then I should see a list of all my cover letters
    And each entry should show:
      | Field          | Displayed |
      | Job Title      | Yes       |
      | Company Name   | Yes       |
      | Generated Date | Yes       |
      | Tone Used      | Yes       |
      | Status         | Yes       |

  Scenario: Search cover letter history
    Given I am viewing my cover letter history
    When I search for "TechCorp"
    Then I should see only cover letters for TechCorp
    And other cover letters should be hidden

  Scenario: Filter cover letters by tone
    Given I am viewing my cover letter history
    When I filter by "Formal" tone
    Then I should see only formal cover letters
    And conversational cover letters should be hidden

  # Character & Word Count
  Scenario: View character count while editing
    Given I am editing a cover letter
    Then I should see a live character count
    And the count should update as I type

  Scenario: View word count while editing
    Given I am editing a cover letter
    Then I should see a live word count
    And the count should update as I type

  Scenario: Warning for excessively long cover letter
    Given I am editing a cover letter
    When the word count exceeds 500 words
    Then I should see a warning message
    And the warning should suggest keeping it concise

  # Performance
  Scenario: Generate cover letter in less than 6 seconds
    Given I am on the cover letter generation form
    When I click "Generate Cover Letter"
    Then the generation should start immediately
    And the cover letter should be displayed within 6 seconds

  Scenario: Show progress during generation
    Given I am generating a cover letter
    Then I should see a progress indicator
    And I should see status messages like "Analyzing job requirements..."
    And I should see status messages like "Matching your skills..."
    And I should see status messages like "Crafting your cover letter..."

  # Error Handling
  Scenario: Handle generation error gracefully
    Given I am generating a cover letter
    When the AI service fails
    Then I should see an error message
    And I should see a "Retry" button
    And I should see a "Contact Support" link

  Scenario: Retry failed generation
    Given a cover letter generation failed
    When I click "Retry"
    Then the generation should be attempted again

  # Mobile Responsiveness
  Scenario: Generate cover letter on mobile
    Given I am on a mobile device
    When I navigate to the cover letter generator
    Then the form should be mobile-optimized
    And I should be able to scroll through the generated letter
    And editing tools should be accessible

  Scenario: View cover letter on mobile
    Given I have generated a cover letter on mobile
    Then the cover letter should be readable
    And the text should wrap appropriately
    And buttons should be easy to tap

  # Accessibility
  Scenario: Navigate cover letter generator with keyboard
    Given I am on the cover letter generation form
    Then I should be able to tab through all form fields
    And I should be able to select tone with keyboard
    And I should be able to submit with Enter key

  Scenario: Use cover letter generator with screen reader
    Given I am using a screen reader
    When I navigate to the cover letter generator
    Then all form fields should be announced
    And the generated cover letter should be readable
    And all buttons should have clear labels

  # Integration with Applications
  Scenario: Attach cover letter to job application
    Given I have generated a cover letter
    When I click "Use for Application"
    Then I should be taken to the application form
    And the cover letter should be attached
    And I should be able to submit the application

  Scenario: Generate cover letter from job application flow
    Given I am applying for a job
    When I reach the cover letter step
    And I click "Generate with AI"
    Then the cover letter generator should open
    And the job details should be pre-filled

  # Customization Options
  Scenario: Adjust cover letter length preference
    Given I am on the cover letter generation form
    When I select "Brief" length option
    Then the generated cover letter should be 200-300 words
    When I select "Standard" length option
    Then the generated cover letter should be 300-400 words
    When I select "Detailed" length option
    Then the generated cover letter should be 400-500 words

  Scenario: Add custom talking points
    Given I am on the cover letter generation form
    When I click "Add Custom Talking Point"
    And I enter "I have experience with remote team collaboration"
    And I click "Generate Cover Letter"
    Then the cover letter should include my custom talking point

  # Quality Indicators
  Scenario: View cover letter quality score
    Given I have generated a cover letter
    Then I should see a quality score (0-100)
    And I should see score breakdown:
      | Criterion          | Weight |
      | Job Match          | 30%    |
      | Clarity            | 25%    |
      | Professionalism    | 20%    |
      | Personalization    | 15%    |
      | Length Appropriate | 10%    |

  Scenario: View AI confidence level
    Given I have generated a cover letter
    Then I should see an AI confidence indicator
    And high confidence should be marked as "High (90%+)"
    And medium confidence should be marked as "Medium (70-89%)"
    And low confidence should be marked as "Low (<70%)"
