Feature: Job Template Management
  As an employer
  I want to create and manage reusable job templates
  So that I can quickly post similar jobs without starting from scratch

  Background:
    Given I am logged in as an employer
    And I have a Growth plan subscription

  @job-templates @creation
  Scenario: Create a private job template
    Given I am on the Job Templates page
    When I click the "Create Template" button
    And I fill in the template form with:
      | Field          | Value                              |
      | Name           | Senior Software Engineer Template  |
      | Category       | Engineering                        |
      | Visibility     | Private                            |
      | Title          | Senior Software Engineer           |
      | Department     | Engineering                        |
      | Employment Type| Full-time                          |
      | Experience     | Senior                             |
    And I add the following requirements:
      | Requirement                                           |
      | 5+ years of professional software development         |
      | Strong proficiency in Python, JavaScript, or similar |
      | Experience with cloud platforms (AWS, GCP, Azure)    |
    And I add the following responsibilities:
      | Responsibility                        |
      | Design and build scalable systems     |
      | Lead technical design discussions     |
      | Mentor junior engineers               |
    And I add the following skills:
      | Skill       |
      | Python      |
      | React       |
      | AWS         |
      | Docker      |
      | PostgreSQL  |
    And I click "Save Template"
    Then I should see a success message "Template created successfully"
    And the template "Senior Software Engineer Template" should appear in my templates list
    And the template should have visibility "Private"
    And the usage count should be 0

  @job-templates @public-templates
  Scenario: Browse public templates
    Given there are 5 public templates in the system
    And I am on the Job Templates page
    When I click the "Public Templates" tab
    Then I should see 5 public templates
    And each template should have a "Use Template" button
    And I should not see any "Edit" or "Delete" buttons

  @job-templates @filtering
  Scenario: Filter templates by category
    Given I have created the following private templates:
      | Name                  | Category    |
      | Software Engineer     | Engineering |
      | Product Manager       | Product     |
      | UX Designer           | Design      |
      | Sales Representative  | Sales       |
    When I am on the Job Templates page
    And I select "Engineering" from the category filter
    Then I should see only 1 template
    And the template "Software Engineer" should be visible
    And the templates "Product Manager", "UX Designer", "Sales Representative" should not be visible

  @job-templates @apply-template
  Scenario: Apply template to new job posting
    Given I have a template named "Senior Software Engineer Template"
    And I am on the "Create Job" page
    When I click "Use Template"
    And I select "Senior Software Engineer Template" from the dropdown
    Then the job form should be pre-filled with:
      | Field          | Value                    |
      | Title          | Senior Software Engineer |
      | Department     | Engineering              |
      | Employment Type| Full-time                |
      | Experience     | Senior                   |
    And the requirements should be pre-filled with 3 items
    And the responsibilities should be pre-filled with 3 items
    And the skills should be pre-filled with 5 items
    And I can edit any field before posting
    When I click "Post Job"
    Then the job should be created successfully
    And the template usage count should increment to 1

  @job-templates @edit
  Scenario: Edit an existing template
    Given I have a template named "Software Engineer Template"
    When I am on the Job Templates page
    And I click the "Edit" button for "Software Engineer Template"
    And I change the template name to "Updated Software Engineer Template"
    And I add a new requirement "Knowledge of TypeScript"
    And I click "Save Changes"
    Then I should see a success message "Template updated successfully"
    And the template name should be "Updated Software Engineer Template"
    And the requirements should include "Knowledge of TypeScript"

  @job-templates @delete
  Scenario: Delete a template
    Given I have a template named "Old Template"
    And the template has usage count of 0
    When I am on the Job Templates page
    And I click the "Delete" button for "Old Template"
    And I confirm the deletion in the modal
    Then I should see a success message "Template deleted successfully"
    And the template "Old Template" should not appear in the list

  @job-templates @authorization
  Scenario: Cannot edit another company's private template
    Given another company has a private template named "Private Template"
    When I try to access the edit page for "Private Template" directly via URL
    Then I should see an authorization error
    And I should be redirected to my templates page

  @job-templates @usage-tracking
  Scenario: Template usage count increments when applied
    Given I have a template named "Popular Template" with usage count of 5
    When I create a new job using "Popular Template"
    Then the template usage count should be 6
    And the usage count should be visible in the templates list

  @job-templates @subscription-limits
  Scenario: Starter plan can create templates
    Given I have a Starter plan subscription
    When I try to create a new template
    Then I should be able to create the template successfully
    And the template should be saved

  @job-templates @bulk-operations
  Scenario: Duplicate a template
    Given I have a template named "Senior Software Engineer Template"
    When I click the "Duplicate" button for the template
    Then a new template should be created with name "Senior Software Engineer Template (Copy)"
    And all fields should be identical to the original
    And the usage count should be 0

  @job-templates @validation
  Scenario: Cannot create template with missing required fields
    Given I am on the Create Template page
    When I leave the "Name" field empty
    And I leave the "Title" field empty
    And I click "Save Template"
    Then I should see validation errors:
      | Field | Error                      |
      | Name  | Template name is required  |
      | Title | Job title is required      |
    And the template should not be created

  @job-templates @search
  Scenario: Search templates by name
    Given I have created 10 templates
    And one template is named "React Developer Template"
    When I am on the Job Templates page
    And I type "React" in the search box
    Then I should see only the "React Developer Template"
    And other templates should be filtered out

  @job-templates @responsive
  Scenario: Mobile view of templates
    Given I am using a mobile device
    And I have 5 templates
    When I navigate to the Job Templates page
    Then the templates should display in a mobile-friendly card layout
    And I can scroll through templates
    And action buttons should be easily tappable
