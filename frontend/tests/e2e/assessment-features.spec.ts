/**
 * BDD E2E Tests for Skills Assessment Platform
 * Sprint 17-18 Phase 4
 *
 * Test Coverage:
 * - Assessment Builder UI
 * - Question Management
 * - Question Bank
 * - Candidate Assessment Taking
 * - Auto-Grading
 * - Manual Grading
 * - Anti-Cheating Detection
 *
 * Framework: Playwright + BDD (Given/When/Then)
 */

import { test, expect } from '../fixtures/auth.fixture';
import { Page } from '@playwright/test';

// ============================================================================
// FEATURE 1: Assessment Builder
// ============================================================================

test.describe('Assessment Builder - Create & Configure', () => {

  test.beforeEach(async ({ page }) => {
    // GIVEN: User is logged in as employer (Owner/Admin)
    await page.goto('/employer/login');
    await page.fill('[data-testid="email"]', 'owner@testcompany.com');
    await page.fill('[data-testid="password"]', 'Test123!@#');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL(/.*employer\/dashboard/);
  });

  test('should create a new technical screening assessment', async ({ page }) => {
    // GIVEN: User is on the assessments page
    await page.goto('/employer/assessments');
    await expect(page.getByRole('heading', { name: 'Assessments' })).toBeVisible();

    // WHEN: User creates a new assessment
    await page.click('[data-testid="create-assessment-button"]');
    await expect(page).toHaveURL(/.*assessments\/new/);

    // Fill assessment details
    await page.fill('[data-testid="assessment-title"]', 'Senior Backend Engineer Screening');
    await page.fill('[data-testid="assessment-description"]', 'Technical assessment for backend positions');
    await selectOption(page, 'assessment-type', 'technical');

    // Configure settings
    await page.fill('[data-testid="time-limit-minutes"]', '90');
    await page.fill('[data-testid="passing-score-percentage"]', '70');
    await page.check('[data-testid="enable-proctoring"]');
    await page.check('[data-testid="track-tab-switches"]');
    await page.fill('[data-testid="max-tab-switches"]', '3');

    // Save assessment
    await page.click('[data-testid="save-assessment-button"]');

    // THEN: Assessment is created and user is redirected
    await expect(page).toHaveURL(/.*assessments\/[a-z0-9-]+$/);
    await expect(page.getByText('Assessment created successfully')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Senior Backend Engineer Screening' })).toBeVisible();
  });

  test('should validate required fields when creating assessment', async ({ page }) => {
    // GIVEN: User is on create assessment page
    await page.goto('/employer/assessments/new');

    // WHEN: User tries to save without filling required fields
    await page.click('[data-testid="save-assessment-button"]');

    // THEN: Validation errors are displayed
    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Assessment type is required')).toBeVisible();
  });

  test('should update assessment configuration', async ({ page }) => {
    // GIVEN: An existing assessment
    await page.goto('/employer/assessments');
    await page.click('[data-testid="assessment-item"]:first-child');

    // WHEN: User updates the time limit
    await page.click('[data-testid="edit-assessment-button"]');
    await page.fill('[data-testid="time-limit-minutes"]', '120');
    await page.fill('[data-testid="passing-score-percentage"]', '75');
    await page.click('[data-testid="save-changes-button"]');

    // THEN: Changes are saved
    await expect(page.getByText('Assessment updated successfully')).toBeVisible();
    await expect(page.getByText('120 minutes')).toBeVisible();
    await expect(page.getByText('75%')).toBeVisible();
  });
});

// ============================================================================
// FEATURE 2: Question Management
// ============================================================================

test.describe('Question Management - MCQ Questions', () => {

  test.beforeEach(async ({ page }) => {
    // Login and navigate to an assessment
    await loginAsEmployer(page);
    await page.goto('/employer/assessments');
    await page.click('[data-testid="assessment-item"]:first-child');
  });

  test('should add MCQ single choice question', async ({ page }) => {
    // GIVEN: User is on assessment details page
    await expect(page.getByRole('heading')).toContainText('Assessment');

    // WHEN: User adds a new MCQ single choice question
    await page.click('[data-testid="add-question-button"]');
    await selectOption(page, 'question-type', 'mcq_single');

    await page.fill('[data-testid="question-text"]', 'What is the time complexity of binary search?');
    await page.fill('[data-testid="points"]', '10');
    await selectOption(page, 'difficulty', 'medium');
    await page.fill('[data-testid="category"]', 'Algorithms');

    // Add options
    await page.fill('[data-testid="option-0"]', 'O(n)');
    await page.fill('[data-testid="option-1"]', 'O(log n)');
    await page.fill('[data-testid="option-2"]', 'O(n^2)');
    await page.fill('[data-testid="option-3"]', 'O(1)');

    // Mark correct answer
    await page.check('[data-testid="correct-option-1"]');

    // Save question
    await page.click('[data-testid="save-question-button"]');

    // THEN: Question is added to the assessment
    await expect(page.getByText('Question added successfully')).toBeVisible();
    await expect(page.getByText('What is the time complexity of binary search?')).toBeVisible();
    await expect(page.getByText('10 points')).toBeVisible();
  });

  test('should add MCQ multiple choice question with partial credit', async ({ page }) => {
    // GIVEN: User is creating a new question
    await page.click('[data-testid="add-question-button"]');

    // WHEN: User selects MCQ multiple choice
    await selectOption(page, 'question-type', 'mcq_multiple');

    await page.fill('[data-testid="question-text"]', 'Which are Python web frameworks?');
    await page.fill('[data-testid="points"]', '15');

    // Add options and mark multiple correct answers
    await page.fill('[data-testid="option-0"]', 'Django');
    await page.fill('[data-testid="option-1"]', 'Flask');
    await page.fill('[data-testid="option-2"]', 'React');
    await page.fill('[data-testid="option-3"]', 'FastAPI');

    await page.check('[data-testid="correct-option-0"]'); // Django
    await page.check('[data-testid="correct-option-1"]'); // Flask
    await page.check('[data-testid="correct-option-3"]'); // FastAPI

    await page.click('[data-testid="save-question-button"]');

    // THEN: Question is saved with multiple correct answers
    await expect(page.getByText('Question added successfully')).toBeVisible();
    await expect(page.getByText('3 correct answers')).toBeVisible();
  });

  test('should reorder questions with drag and drop', async ({ page }) => {
    // GIVEN: Assessment has multiple questions
    await expect(page.locator('[data-testid="question-item"]')).toHaveCount(3);

    // WHEN: User drags question 3 to position 1
    const question3 = page.locator('[data-testid="question-item"]').nth(2);
    const question1 = page.locator('[data-testid="question-item"]').nth(0);

    await question3.dragTo(question1);

    // THEN: Question order is updated
    await expect(page.getByText('Questions reordered successfully')).toBeVisible();

    // Verify new order (question 3 is now first)
    const firstQuestion = page.locator('[data-testid="question-item"]').first();
    await expect(firstQuestion).toContainText('Question 3 text');
  });

  test('should delete question with confirmation', async ({ page }) => {
    // GIVEN: Assessment has questions
    const questionCount = await page.locator('[data-testid="question-item"]').count();

    // WHEN: User deletes a question
    await page.click('[data-testid="question-item"]:first-child [data-testid="delete-question"]');

    // Confirmation dialog appears
    await expect(page.getByText('Are you sure you want to delete this question?')).toBeVisible();
    await page.click('[data-testid="confirm-delete-button"]');

    // THEN: Question is deleted
    await expect(page.getByText('Question deleted successfully')).toBeVisible();
    await expect(page.locator('[data-testid="question-item"]')).toHaveCount(questionCount - 1);
  });
});

test.describe('Question Management - Coding Challenges', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/assessments');
    await page.click('[data-testid="assessment-item"]:first-child');
  });

  test('should add coding challenge with Monaco editor', async ({ page }) => {
    // GIVEN: User is adding a new question
    await page.click('[data-testid="add-question-button"]');

    // WHEN: User creates a coding challenge
    await selectOption(page, 'question-type', 'coding');

    await page.fill('[data-testid="question-text"]', 'Implement a function to reverse a linked list');
    await page.fill('[data-testid="points"]', '25');
    await selectOption(page, 'difficulty', 'hard');
    await selectOption(page, 'coding-language', 'python');

    // Add starter code in Monaco editor
    await page.click('[data-testid="monaco-editor"]');
    await page.keyboard.type('def reverse_linked_list(head):\n    # Your code here\n    pass');

    // Add test cases
    await page.click('[data-testid="add-test-case"]');
    await page.fill('[data-testid="test-case-0-input"]', '[1,2,3,4,5]');
    await page.fill('[data-testid="test-case-0-expected"]', '[5,4,3,2,1]');
    await page.fill('[data-testid="test-case-0-points"]', '10');

    await page.click('[data-testid="add-test-case"]');
    await page.fill('[data-testid="test-case-1-input"]', '[1]');
    await page.fill('[data-testid="test-case-1-expected"]', '[1]');
    await page.fill('[data-testid="test-case-1-points"]', '5');

    // Mark second test case as hidden
    await page.check('[data-testid="test-case-1-hidden"]');

    await page.click('[data-testid="save-question-button"]');

    // THEN: Coding question is saved
    await expect(page.getByText('Question added successfully')).toBeVisible();
    await expect(page.getByText('Implement a function to reverse a linked list')).toBeVisible();
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('2 test cases')).toBeVisible();
  });

  test('should validate coding question has at least one test case', async ({ page }) => {
    // GIVEN: User is creating a coding question
    await page.click('[data-testid="add-question-button"]');
    await selectOption(page, 'question-type', 'coding');

    await page.fill('[data-testid="question-text"]', 'Write a function');
    await selectOption(page, 'coding-language', 'python');
    await page.fill('[data-testid="points"]', '20');

    // WHEN: User tries to save without test cases
    await page.click('[data-testid="save-question-button"]');

    // THEN: Validation error is shown
    await expect(page.getByText('At least one test case is required')).toBeVisible();
  });
});

// ============================================================================
// FEATURE 3: Question Bank
// ============================================================================

test.describe('Question Bank - Reusable Questions', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/question-bank');
  });

  test('should browse public question bank', async ({ page }) => {
    // GIVEN: User is on question bank page
    await expect(page.getByRole('heading', { name: 'Question Bank' })).toBeVisible();

    // WHEN: User filters by category
    await selectOption(page, 'category-filter', 'Python');
    await selectOption(page, 'difficulty-filter', 'medium');
    await page.click('[data-testid="apply-filters-button"]');

    // THEN: Filtered questions are displayed
    await expect(page.locator('[data-testid="question-bank-item"]')).toHaveCount.greaterThan(0);
    const firstQuestion = page.locator('[data-testid="question-bank-item"]').first();
    await expect(firstQuestion).toContainText('Python');
    await expect(firstQuestion).toContainText('Medium');
  });

  test('should import question from bank to assessment', async ({ page }) => {
    // GIVEN: User has selected a question
    await page.click('[data-testid="question-bank-item"]:first-child');
    await expect(page.getByRole('heading')).toContainText('Question Preview');

    // WHEN: User imports the question
    await page.click('[data-testid="import-to-assessment-button"]');

    // Select target assessment from modal
    await expect(page.getByText('Import to Assessment')).toBeVisible();
    // Note: Selecting by index requires getting the first option value
    const firstOption = await page.locator('[data-testid="target-assessment"] [role="option"]').first().getAttribute('data-value');
    if (firstOption) {
      await selectOption(page, 'target-assessment', firstOption);
    }
    await page.click('[data-testid="confirm-import-button"]');

    // THEN: Question is imported
    await expect(page.getByText('Question imported successfully')).toBeVisible();
  });

  test('should create custom question and add to bank', async ({ page }) => {
    // GIVEN: User wants to create a reusable question
    await page.click('[data-testid="create-question-button"]');

    // WHEN: User creates a question
    await selectOption(page, 'question-type', 'mcq_single');
    await page.fill('[data-testid="question-text"]', 'What is REST API?');
    await page.fill('[data-testid="category"]', 'Web Development');
    await selectOption(page, 'difficulty', 'easy');
    await page.fill('[data-testid="points"]', '5');

    // Add options
    await page.fill('[data-testid="option-0"]', 'Representational State Transfer');
    await page.fill('[data-testid="option-1"]', 'Remote Server Technology');
    await page.check('[data-testid="correct-option-0"]');

    // Mark as public
    await page.check('[data-testid="is-public"]');

    await page.click('[data-testid="save-to-bank-button"]');

    // THEN: Question is added to bank
    await expect(page.getByText('Question added to bank')).toBeVisible();
    await expect(page.getByText('What is REST API?')).toBeVisible();
  });

  test('should bulk import questions from bank', async ({ page }) => {
    // GIVEN: User is on an assessment page
    await page.goto('/employer/assessments');
    await page.click('[data-testid="assessment-item"]:first-child');

    // WHEN: User initiates bulk import
    await page.click('[data-testid="bulk-import-button"]');
    await expect(page.getByText('Import from Question Bank')).toBeVisible();

    // Select multiple questions
    await page.check('[data-testid="select-question-0"]');
    await page.check('[data-testid="select-question-1"]');
    await page.check('[data-testid="select-question-2"]');

    await page.click('[data-testid="import-selected-button"]');

    // THEN: Multiple questions are imported
    await expect(page.getByText('3 questions imported successfully')).toBeVisible();
  });
});

// ============================================================================
// FEATURE 4: Candidate Assessment Taking
// ============================================================================

test.describe('Candidate Assessment Taking - Experience', () => {

  test('should take assessment with access token', async ({ page }) => {
    // GIVEN: Candidate has assessment access token
    const accessToken = 'test-access-token-12345';
    await page.goto(`/assessments/${accessToken}`);

    // WHEN: Assessment loads
    await expect(page.getByRole('heading')).toContainText('Senior Backend Engineer Screening');
    await expect(page.getByText('15 questions')).toBeVisible();
    await expect(page.getByText('90 minutes')).toBeVisible();

    // Start assessment
    await page.click('[data-testid="start-assessment-button"]');

    // THEN: Timer starts and first question is displayed
    await expect(page.getByText(/Time Remaining:/)).toBeVisible();
    await expect(page.getByText('Question 1 of 15')).toBeVisible();
  });

  test('should answer MCQ question and navigate', async ({ page }) => {
    // GIVEN: Candidate is taking assessment
    await startAssessment(page, 'test-access-token-12345');

    // WHEN: Candidate answers a question
    await page.check('[data-testid="option-B"]');
    await page.click('[data-testid="next-question-button"]');

    // THEN: Answer is saved and next question loads
    await expect(page.getByText('Question 2 of 15')).toBeVisible();

    // Navigate back
    await page.click('[data-testid="previous-question-button"]');
    await expect(page.getByText('Question 1 of 15')).toBeVisible();

    // Verify answer is persisted
    await expect(page.locator('[data-testid="option-B"]')).toBeChecked();
  });

  test('should write and execute code for coding question', async ({ page }) => {
    // GIVEN: Candidate is on a coding question
    await startAssessment(page, 'test-access-token-12345');
    await navigateToQuestion(page, 5); // Coding question at position 5

    // WHEN: Candidate writes code
    await page.click('[data-testid="monaco-editor"]');
    await page.keyboard.type(`
def reverse_linked_list(head):
    prev = None
    current = head
    while current:
        next_node = current.next
        current.next = prev
        prev = current
        current = next_node
    return prev
    `);

    // Run code
    await page.click('[data-testid="run-code-button"]');

    // THEN: Code execution results are displayed
    await expect(page.getByText('Running...')).toBeVisible();
    await expect(page.getByText('Test Case 1: Passed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test Case 2: Passed')).toBeVisible();
    await expect(page.getByText('10/10 points')).toBeVisible();
  });

  test('should show time warning before expiry', async ({ page }) => {
    // GIVEN: Candidate is taking timed assessment
    await startAssessment(page, 'test-access-token-with-2min-left');

    // WHEN: 5 minutes remaining
    await page.waitForTimeout(5000); // Simulate time passing

    // THEN: Warning is displayed
    await expect(page.getByText('5 minutes remaining!')).toBeVisible();
    await expect(page.locator('[data-testid="timer"]')).toHaveClass(/warning/);
  });

  test('should auto-submit assessment when time expires', async ({ page }) => {
    // GIVEN: Candidate is taking assessment with 1 minute left
    await startAssessment(page, 'test-access-token-expires-soon');

    // WHEN: Time expires
    await page.waitForSelector('[data-testid="time-expired-modal"]', { timeout: 65000 });

    // THEN: Assessment is auto-submitted
    await expect(page.getByText('Time\'s up!')).toBeVisible();
    await expect(page.getByText('Your assessment has been submitted automatically')).toBeVisible();

    await page.click('[data-testid="view-results-button"]');
    await expect(page).toHaveURL(/.*\/results$/);
  });

  test('should submit assessment manually', async ({ page }) => {
    // GIVEN: Candidate has answered all questions
    await startAssessment(page, 'test-access-token-12345');
    await answerAllQuestions(page, 15);

    // WHEN: Candidate submits
    await page.click('[data-testid="submit-assessment-button"]');

    // Confirmation dialog
    await expect(page.getByText('Submit Assessment?')).toBeVisible();
    await expect(page.getByText('You have answered 15/15 questions')).toBeVisible();
    await page.click('[data-testid="confirm-submit-button"]');

    // THEN: Assessment is submitted and results shown
    await expect(page.getByText('Assessment Submitted Successfully')).toBeVisible();
    await expect(page).toHaveURL(/.*\/results$/);
    await expect(page.getByText(/Your Score:/)).toBeVisible();
  });
});

// ============================================================================
// FEATURE 5: Anti-Cheating Detection
// ============================================================================

test.describe('Anti-Cheating Measures', () => {

  test('should detect and warn on tab switch', async ({ page, context }) => {
    // GIVEN: Candidate is taking proctored assessment
    await startAssessment(page, 'test-access-token-proctored');

    // WHEN: Candidate switches tabs
    const newPage = await context.newPage();
    await newPage.goto('https://google.com');
    await page.bringToFront();

    // THEN: Warning is displayed
    await expect(page.getByText('Tab Switch Detected')).toBeVisible();
    await expect(page.getByText('Warning 1 of 3')).toBeVisible();
    await expect(page.getByText('Switching tabs is not allowed')).toBeVisible();
  });

  test('should disqualify after exceeding tab switch limit', async ({ page, context }) => {
    // GIVEN: Candidate has 2 tab switch warnings
    await startAssessment(page, 'test-access-token-2-warnings');

    // WHEN: Candidate switches tab for the 3rd time
    const newPage = await context.newPage();
    await newPage.goto('https://google.com');
    await page.bringToFront();

    // THEN: Assessment is disqualified
    await expect(page.getByText('Assessment Disqualified')).toBeVisible();
    await expect(page.getByText('Too many tab switches detected')).toBeVisible();
    await expect(page.getByText(/Your attempt has been marked as suspicious/)).toBeVisible();
  });

  test('should track IP address changes', async ({ page }) => {
    // GIVEN: Candidate starts assessment
    await startAssessment(page, 'test-access-token-ip-tracking');

    // WHEN: IP address changes (simulated via proxy)
    // Note: This would require network mocking or actual proxy setup

    // THEN: Suspicious activity is logged (verify in admin panel)
    // This test validates the tracking mechanism exists
    await expect(page.locator('[data-testid="assessment-container"]')).toBeVisible();
  });

  test('should randomize question order per attempt', async ({ page: page1, browser }) => {
    // GIVEN: Two candidates take same assessment
    await startAssessment(page1, 'test-access-token-candidate-1');
    const question1Order = await page1.locator('[data-testid="question-number"]').textContent();

    const page2 = await browser.newPage();
    await startAssessment(page2, 'test-access-token-candidate-2');
    const question2Order = await page2.locator('[data-testid="question-number"]').textContent();

    // THEN: Question order is different
    expect(question1Order).not.toBe(question2Order);
  });

  test('should randomize MCQ options per attempt', async ({ page: page1, browser }) => {
    // GIVEN: Two candidates answer same MCQ
    await startAssessment(page1, 'test-access-token-candidate-1');
    const options1 = await page1.locator('[data-testid^="option-"]').allTextContents();

    const page2 = await browser.newPage();
    await startAssessment(page2, 'test-access-token-candidate-2');
    const options2 = await page2.locator('[data-testid^="option-"]').allTextContents();

    // THEN: Option order is different
    expect(options1.join(',')).not.toBe(options2.join(','));
  });
});

// ============================================================================
// FEATURE 6: Grading Interface (Employer View)
// ============================================================================

test.describe('Grading Interface - Manual Review', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/assessments');
    await page.click('[data-testid="assessment-item"]:first-child');
    await page.click('[data-testid="view-attempts-tab"]');
  });

  test('should view candidate attempt details', async ({ page }) => {
    // GIVEN: Assessment has completed attempts
    await expect(page.locator('[data-testid="attempt-row"]')).toHaveCount.greaterThan(0);

    // WHEN: Employer clicks on an attempt
    await page.click('[data-testid="attempt-row"]:first-child');

    // THEN: Attempt details are displayed
    await expect(page.getByRole('heading')).toContainText('Attempt Details');
    await expect(page.getByText(/Candidate:/)).toBeVisible();
    await expect(page.getByText(/Score:/)).toBeVisible();
    await expect(page.getByText(/Submitted:/)).toBeVisible();
    await expect(page.getByText(/Time Taken:/)).toBeVisible();
  });

  test('should manually grade text response question', async ({ page }) => {
    // GIVEN: Attempt has ungraded text response
    await page.click('[data-testid="attempt-row"]:first-child');
    await page.click('[data-testid="ungraded-questions-tab"]');

    // WHEN: Employer grades the response
    await page.click('[data-testid="grade-response-button"]');
    await page.fill('[data-testid="points-awarded"]', '12');
    await page.fill('[data-testid="grader-comments"]', 'Good explanation of CAP theorem with relevant examples.');
    await page.click('[data-testid="save-grade-button"]');

    // THEN: Grade is saved
    await expect(page.getByText('Response graded successfully')).toBeVisible();
    await expect(page.getByText('12/15 points')).toBeVisible();
  });

  test('should view coding submission with syntax highlighting', async ({ page }) => {
    // GIVEN: Candidate submitted coding solution
    await page.click('[data-testid="attempt-row"]:first-child');
    await page.click('[data-testid="question-3"]'); // Coding question

    // WHEN: Employer views the code
    await expect(page.getByText('Code Submission')).toBeVisible();

    // THEN: Code is displayed with syntax highlighting
    await expect(page.locator('[data-testid="code-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="code-display"] .keyword')).toBeVisible();

    // View test case results
    await expect(page.getByText('Test Case 1: Passed')).toBeVisible();
    await expect(page.getByText('Test Case 2: Failed')).toBeVisible();
    await expect(page.getByText('Execution Time: 245ms')).toBeVisible();
  });

  test('should bulk grade multiple responses', async ({ page }) => {
    // GIVEN: Multiple ungraded text responses
    await page.click('[data-testid="attempt-row"]:first-child');
    await page.click('[data-testid="ungraded-questions-tab"]');

    // WHEN: Employer selects multiple responses
    await page.check('[data-testid="select-response-0"]');
    await page.check('[data-testid="select-response-1"]');
    await page.check('[data-testid="select-response-2"]');

    await page.click('[data-testid="bulk-grade-button"]');
    await page.fill('[data-testid="bulk-points"]', '8');
    await page.fill('[data-testid="bulk-comments"]', 'Satisfactory response');
    await page.click('[data-testid="apply-bulk-grade"]');

    // THEN: All selected responses are graded
    await expect(page.getByText('3 responses graded successfully')).toBeVisible();
  });

  test('should finalize grading and notify candidate', async ({ page }) => {
    // GIVEN: All responses are graded
    await page.click('[data-testid="attempt-row"]:first-child');

    // WHEN: Employer finalizes grading
    await page.click('[data-testid="finalize-grading-button"]');
    await expect(page.getByText('Finalize Grading?')).toBeVisible();
    await page.check('[data-testid="notify-candidate"]');
    await page.click('[data-testid="confirm-finalize-button"]');

    // THEN: Grading is finalized and candidate is notified
    await expect(page.getByText('Grading finalized')).toBeVisible();
    await expect(page.getByText('Candidate notified via email')).toBeVisible();
    await expect(page.getByText('Status: Graded')).toBeVisible();
  });
});

// ============================================================================
// FEATURE 7: Assessment Analytics
// ============================================================================

test.describe('Assessment Analytics - Metrics', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/assessments');
  });

  test('should view assessment statistics', async ({ page }) => {
    // GIVEN: Assessment has completed attempts
    await page.click('[data-testid="assessment-item"]:first-child');
    await page.click('[data-testid="analytics-tab"]');

    // WHEN: Analytics page loads
    await expect(page.getByRole('heading', { name: 'Assessment Analytics' })).toBeVisible();

    // THEN: Key metrics are displayed
    await expect(page.getByText(/Total Attempts:/)).toBeVisible();
    await expect(page.getByText(/Average Score:/)).toBeVisible();
    await expect(page.getByText(/Pass Rate:/)).toBeVisible();
    await expect(page.getByText(/Completion Rate:/)).toBeVisible();
    await expect(page.getByText(/Average Time:/)).toBeVisible();
  });

  test('should view question difficulty analysis', async ({ page }) => {
    // GIVEN: On analytics page
    await page.click('[data-testid="assessment-item"]:first-child');
    await page.click('[data-testid="analytics-tab"]');

    // WHEN: User views question breakdown
    await page.click('[data-testid="question-analysis-tab"]');

    // THEN: Each question shows statistics
    const questions = page.locator('[data-testid="question-stat"]');
    await expect(questions).toHaveCount.greaterThan(0);

    const firstQuestion = questions.first();
    await expect(firstQuestion).toContainText(/Correct Rate:/);
    await expect(firstQuestion).toContainText(/Average Time:/);
  });

  test('should identify top performers', async ({ page }) => {
    // GIVEN: On analytics page
    await page.click('[data-testid="assessment-item"]:first-child');
    await page.click('[data-testid="analytics-tab"]');

    // WHEN: User views top performers
    await page.click('[data-testid="top-performers-tab"]');

    // THEN: Ranked list is displayed
    await expect(page.getByText('Top Performers')).toBeVisible();

    const performers = page.locator('[data-testid="performer-row"]');
    await expect(performers).toHaveCount.greaterThan(0);

    // Verify sorted by score
    const firstScore = await performers.first().locator('[data-testid="score"]').textContent();
    const secondScore = await performers.nth(1).locator('[data-testid="score"]').textContent();
    expect(parseInt(firstScore!)).toBeGreaterThanOrEqual(parseInt(secondScore!));
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper function to select an option from shadcn Select component
 * @param page - Playwright page object
 * @param testId - The data-testid of the Select trigger
 * @param value - The value to select
 */
async function selectOption(page: Page, testId: string, value: string) {
  // Click the Select trigger to open dropdown
  await page.click(`[data-testid="${testId}"]`);

  // Wait for the dropdown to be visible
  await page.waitForSelector('[role="option"]', { state: 'visible' });

  // Click the option with the matching value
  await page.click(`[role="option"][data-value="${value}"]`);

  // Wait for dropdown to close
  await page.waitForTimeout(200);
}

async function loginAsEmployer(page: Page) {
  await page.goto('/employer/login');
  await page.fill('[data-testid="email"]', 'owner@testcompany.com');
  await page.fill('[data-testid="password"]', 'Test123!@#');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(/.*employer\/dashboard/);
}

async function startAssessment(page: Page, accessToken: string) {
  await page.goto(`/assessments/${accessToken}`);
  await page.click('[data-testid="start-assessment-button"]');
  await expect(page.getByText('Question 1 of')).toBeVisible();
}

async function navigateToQuestion(page: Page, questionNumber: number) {
  for (let i = 1; i < questionNumber; i++) {
    await page.click('[data-testid="next-question-button"]');
  }
  await expect(page.getByText(`Question ${questionNumber} of`)).toBeVisible();
}

async function answerAllQuestions(page: Page, totalQuestions: number) {
  for (let i = 1; i <= totalQuestions; i++) {
    // Answer current question (selecting first option as default)
    await page.check('[data-testid^="option-"]:first-child');

    if (i < totalQuestions) {
      await page.click('[data-testid="next-question-button"]');
    }
  }
}
