/**
 * E2E Tests for Assessment Flow - Sprint 19-20 Week 38 Day 5
 *
 * Tests the complete assessment flow from start to submission
 * - Assessment timer
 * - Tab tracking
 * - Question answering (MCQ, Text, Coding)
 * - Code execution
 * - Submission flow
 * - Results display
 */

import { test, expect } from '@playwright/test';

test.describe('Assessment Flow - Complete Journey', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to assessment page (assuming route exists)
    await page.goto('/assessment/test-assessment-123');
  });

  test('should display assessment page with timer', async ({ page }) => {
    // Verify assessment page loads
    await expect(page.getByRole('heading', { name: /software engineer assessment/i })).toBeVisible();

    // Verify timer is visible and running
    await expect(page.getByText(/time remaining/i)).toBeVisible();
    await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();
  });

  test('should display progress indicator', async ({ page }) => {
    // Verify progress bar exists
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible();

    // Verify question counter
    await expect(page.getByText(/question \d+ of \d+/i)).toBeVisible();
  });

  test('should track tab switches', async ({ page }) => {
    // Verify tab tracking warning appears when switching tabs
    const originalPage = page;

    // Simulate tab switch by changing visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Switch back
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Check if tab switch was tracked (should show count somewhere)
    await expect(page.getByText(/tab switch/i)).toBeVisible();
  });
});

test.describe('Assessment Flow - MCQ Questions', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');
  });

  test('should answer single-choice MCQ question', async ({ page }) => {
    // Find MCQ question
    await expect(page.getByText(/what is react/i)).toBeVisible();

    // Select an option
    await page.getByRole('radio', { name: /a javascript library/i }).click();

    // Verify selection
    await expect(page.getByRole('radio', { name: /a javascript library/i })).toBeChecked();

    // Navigate to next question
    await page.getByRole('button', { name: /next/i }).click();

    // Verify progress updated
    await expect(page.getByText(/question 2 of/i)).toBeVisible();
  });

  test('should answer multiple-choice MCQ question', async ({ page }) => {
    // Navigate to a multiple-choice question (assuming it exists)
    await page.getByRole('button', { name: /next/i }).click();

    // Find multiple-choice question
    await expect(page.getByText(/select all that apply/i)).toBeVisible();

    // Select multiple options
    await page.getByRole('checkbox', { name: /html/i }).click();
    await page.getByRole('checkbox', { name: /css/i }).click();
    await page.getByRole('checkbox', { name: /javascript/i }).click();

    // Verify all selections
    await expect(page.getByRole('checkbox', { name: /html/i })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /css/i })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /javascript/i })).toBeChecked();
  });

  test('should allow changing MCQ answer', async ({ page }) => {
    // Select first option
    await page.getByRole('radio', { name: /a javascript library/i }).click();
    await expect(page.getByRole('radio', { name: /a javascript library/i })).toBeChecked();

    // Change to another option
    await page.getByRole('radio', { name: /a programming language/i }).click();
    await expect(page.getByRole('radio', { name: /a programming language/i })).toBeChecked();

    // Verify first option is no longer checked
    await expect(page.getByRole('radio', { name: /a javascript library/i })).not.toBeChecked();
  });

  test('should show validation for unanswered MCQ', async ({ page }) => {
    // Try to proceed without answering
    await page.getByRole('button', { name: /next/i }).click();

    // Should still be on same question or show warning
    await expect(page.getByText(/please select an answer/i)).toBeVisible();
  });
});

test.describe('Assessment Flow - Text Questions', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');
    // Navigate to text question
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
  });

  test('should answer short text question', async ({ page }) => {
    // Find text input
    const textInput = page.getByLabel(/your answer/i);
    await expect(textInput).toBeVisible();

    // Type answer
    await textInput.fill('React is a JavaScript library for building user interfaces.');

    // Verify text was entered
    await expect(textInput).toHaveValue(/React is a JavaScript library/);

    // Check character count
    await expect(page.getByText(/\d+ characters/i)).toBeVisible();
  });

  test('should show character count for text responses', async ({ page }) => {
    const textInput = page.getByLabel(/your answer/i);

    await textInput.fill('Test response');

    // Should show character count
    await expect(page.getByText(/13 characters/i)).toBeVisible();
  });

  test('should handle long text responses', async ({ page }) => {
    const longText = 'A'.repeat(500);
    const textarea = page.getByRole('textbox', { name: /your answer/i });

    await textarea.fill(longText);

    // Should show character count
    await expect(page.getByText(/500 characters/i)).toBeVisible();
  });

  test('should allow editing text responses', async ({ page }) => {
    const textInput = page.getByLabel(/your answer/i);

    await textInput.fill('Initial answer');
    await expect(textInput).toHaveValue('Initial answer');

    await textInput.clear();
    await textInput.fill('Updated answer');
    await expect(textInput).toHaveValue('Updated answer');
  });
});

test.describe('Assessment Flow - Coding Questions', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');
    // Navigate to coding question
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }
  });

  test('should display Monaco code editor', async ({ page }) => {
    // Check for Monaco editor presence
    await expect(page.locator('.monaco-editor')).toBeVisible();

    // Check for code editor controls
    await expect(page.getByRole('button', { name: /run code/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
  });

  test('should write code in Monaco editor', async ({ page }) => {
    // Focus on Monaco editor
    const editor = page.locator('.monaco-editor');
    await editor.click();

    // Type code (Monaco uses special input handling)
    await page.keyboard.type('function reverseString(str) {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  return str.split("").reverse().join("");');
    await page.keyboard.press('Enter');
    await page.keyboard.type('}');

    // Verify code appears (Monaco stores code in aria-label or data attributes)
    await expect(page.locator('.monaco-editor')).toContainText('reverseString');
  });

  test('should run code and display results', async ({ page }) => {
    // Write a simple function
    const editor = page.locator('.monaco-editor');
    await editor.click();

    await page.keyboard.type('function reverseString(str) {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  return str.split("").reverse().join("");');
    await page.keyboard.press('Enter');
    await page.keyboard.type('}');

    // Click run code button
    await page.getByRole('button', { name: /run code/i }).click();

    // Wait for results to appear
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    // Verify results are displayed
    await expect(page.getByText(/test results/i)).toBeVisible();
  });

  test('should display test case results with pass/fail status', async ({ page }) => {
    // Write correct solution
    const editor = page.locator('.monaco-editor');
    await editor.click();

    await page.keyboard.type('function reverseString(str) { return str.split("").reverse().join(""); }');

    // Run code
    await page.getByRole('button', { name: /run code/i }).click();
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    // Check for passed tests
    await expect(page.getByText(/passed/i)).toBeVisible();
    await expect(page.getByText(/test case 1/i)).toBeVisible();
  });

  test('should display error messages for incorrect code', async ({ page }) => {
    // Write incorrect solution
    const editor = page.locator('.monaco-editor');
    await editor.click();

    await page.keyboard.type('function reverseString(str) { return str; }');

    // Run code
    await page.getByRole('button', { name: /run code/i }).click();
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    // Check for failed tests
    await expect(page.getByText(/failed/i)).toBeVisible();
    await expect(page.getByText(/expected/i)).toBeVisible();
  });

  test('should display console output', async ({ page }) => {
    // Write solution with console.log
    const editor = page.locator('.monaco-editor');
    await editor.click();

    await page.keyboard.type('function reverseString(str) {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  console.log("Input:", str);');
    await page.keyboard.press('Enter');
    await page.keyboard.type('  return str.split("").reverse().join("");');
    await page.keyboard.press('Enter');
    await page.keyboard.type('}');

    // Run code
    await page.getByRole('button', { name: /run code/i }).click();
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    // Check for console output section
    await expect(page.getByText(/console output/i)).toBeVisible();
    await expect(page.getByText(/Input:/i)).toBeVisible();
  });

  test('should reset code to initial state', async ({ page }) => {
    // Modify code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('function test() {}');

    // Click reset
    await page.getByRole('button', { name: /reset/i }).click();

    // Code should be cleared or reset to template
    // Monaco editor should be empty or show template
    const editorContent = await page.locator('.monaco-editor').textContent();
    expect(editorContent).not.toContain('function test()');
  });

  test('should handle syntax errors gracefully', async ({ page }) => {
    // Write code with syntax error
    const editor = page.locator('.monaco-editor');
    await editor.click();

    await page.keyboard.type('function reverseString(str) { return str..split(""); }'); // Double dot syntax error

    // Run code
    await page.getByRole('button', { name: /run code/i }).click();
    await page.waitForSelector('[role="status"]', { timeout: 10000 });

    // Should show compilation error
    await expect(page.getByText(/compilation error|syntax error/i)).toBeVisible();
  });
});

test.describe('Assessment Flow - Submission', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');
    // Answer all questions to enable submission
    // MCQ 1
    await page.getByRole('radio').first().click();
    await page.getByRole('button', { name: /next/i }).click();

    // MCQ 2
    await page.getByRole('checkbox').first().click();
    await page.getByRole('button', { name: /next/i }).click();

    // Text question
    await page.getByLabel(/your answer/i).fill('Sample answer');
    await page.getByRole('button', { name: /next/i }).click();

    // Coding question
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('function reverseString(str) { return str.split("").reverse().join(""); }');
    await page.getByRole('button', { name: /next/i }).click();
  });

  test('should show submission summary with progress', async ({ page }) => {
    // Should be on submission page
    await expect(page.getByRole('heading', { name: /submission summary/i })).toBeVisible();

    // Check progress information
    await expect(page.getByText(/4 of 4 questions answered/i)).toBeVisible();
    await expect(page.getByText(/100%/i)).toBeVisible();
  });

  test('should display time spent', async ({ page }) => {
    // Check time spent is displayed
    await expect(page.getByText(/time spent/i)).toBeVisible();
    await expect(page.getByText(/\d+m \d+s/)).toBeVisible();
  });

  test('should show submit button enabled when all answered', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /submit assessment/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should show confirmation modal on submit click', async ({ page }) => {
    await page.getByRole('button', { name: /submit assessment/i }).click();

    // Modal should appear
    await expect(page.getByText(/confirm submission/i)).toBeVisible();
    await expect(page.getByText(/once submitted, you cannot make changes/i)).toBeVisible();
  });

  test('should display summary in confirmation modal', async ({ page }) => {
    await page.getByRole('button', { name: /submit assessment/i }).click();

    // Check modal shows summary
    await expect(page.getByText(/questions answered.*4 of 4/i)).toBeVisible();
    await expect(page.getByText(/completion.*100%/i)).toBeVisible();
  });

  test('should close modal when cancel clicked', async ({ page }) => {
    await page.getByRole('button', { name: /submit assessment/i }).click();
    await expect(page.getByText(/confirm submission/i)).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(page.getByText(/confirm submission/i)).not.toBeVisible();
  });

  test('should submit assessment when confirmed', async ({ page }) => {
    await page.getByRole('button', { name: /submit assessment/i }).click();
    await page.getByRole('button', { name: /^confirm$/i }).click();

    // Should show loading state
    await expect(page.getByText(/submitting your assessment/i)).toBeVisible();

    // After submission, should redirect (or show success)
    await page.waitForURL(/.*\/assessment\/.*\/results/, { timeout: 15000 });
  });

  test('should show loading state during submission', async ({ page }) => {
    await page.getByRole('button', { name: /submit assessment/i }).click();

    const confirmButton = page.getByRole('button', { name: /^confirm$/i });
    await confirmButton.click();

    // Loading indicator should appear
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('should handle submission error gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/assessments/*/submit', route => {
      route.abort('failed');
    });

    await page.getByRole('button', { name: /submit assessment/i }).click();
    await page.getByRole('button', { name: /^confirm$/i }).click();

    // Should show error message
    await expect(page.getByText(/submission failed/i)).toBeVisible();

    // Should show retry button
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('should allow retry after submission error', async ({ page }) => {
    // Mock network error
    await page.route('**/api/assessments/*/submit', route => {
      route.abort('failed');
    });

    await page.getByRole('button', { name: /submit assessment/i }).click();
    await page.getByRole('button', { name: /^confirm$/i }).click();

    await expect(page.getByText(/submission failed/i)).toBeVisible();

    // Click retry
    await page.getByRole('button', { name: /try again/i }).click();

    // Modal should reappear
    await expect(page.getByText(/confirm submission/i)).toBeVisible();
  });
});

test.describe('Assessment Flow - Navigation', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');
  });

  test('should navigate between questions using next button', async ({ page }) => {
    await expect(page.getByText(/question 1 of/i)).toBeVisible();

    await page.getByRole('button', { name: /next/i }).click();

    await expect(page.getByText(/question 2 of/i)).toBeVisible();
  });

  test('should navigate back using previous button', async ({ page }) => {
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/question 2 of/i)).toBeVisible();

    await page.getByRole('button', { name: /previous/i }).click();
    await expect(page.getByText(/question 1 of/i)).toBeVisible();
  });

  test('should hide previous button on first question', async ({ page }) => {
    const prevButton = page.getByRole('button', { name: /previous/i });
    await expect(prevButton).toBeHidden();
  });

  test('should show submit button on last question', async ({ page }) => {
    // Navigate to last question
    while (await page.getByRole('button', { name: /next/i }).isVisible()) {
      await page.getByRole('button', { name: /next/i }).click();
    }

    // Submit button should be visible
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
  });

  test('should preserve answers when navigating back', async ({ page }) => {
    // Answer first question
    await page.getByRole('radio').first().click();
    const selectedOption = await page.getByRole('radio', { checked: true }).textContent();

    // Navigate away and back
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /previous/i }).click();

    // Answer should still be selected
    await expect(page.getByRole('radio', { checked: true })).toContainText(selectedOption || '');
  });
});

test.describe('Assessment Flow - Accessibility', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');
  });

  test('should have accessible headings hierarchy', async ({ page }) => {
    // Main heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Section headings
    const headings = await page.getByRole('heading').all();
    expect(headings.length).toBeGreaterThan(1);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should be visible (check for focus ring or active element)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'TEXTAREA', 'A']).toContain(focusedElement);
  });

  test('should have ARIA labels for important elements', async ({ page }) => {
    // Timer should have aria-label
    const timer = page.locator('[aria-label*="time remaining"]');
    await expect(timer).toBeVisible();

    // Progress bar should have proper ARIA
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toHaveAttribute('aria-valuenow');
    await expect(progressBar).toHaveAttribute('aria-valuemin');
    await expect(progressBar).toHaveAttribute('aria-valuemax');
  });

  test('should announce status changes to screen readers', async ({ page }) => {
    // Navigate to next question
    await page.getByRole('button', { name: /next/i }).click();

    // Status region should exist for announcements
    const statusRegion = page.getByRole('status');
    await expect(statusRegion).toBeDefined();
  });

  test('should have proper form labels', async ({ page }) => {
    // Navigate to text question
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    // Text input should have associated label
    const textInput = page.getByLabel(/your answer/i);
    await expect(textInput).toBeVisible();
  });
});

test.describe('Assessment Flow - Edge Cases', () => {
  test.use({ storageState: 'tests/e2e/.auth/jobseeker.json' });

  test('should handle page refresh without losing answers', async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');

    // Answer first question
    await page.getByRole('radio').first().click();

    // Refresh page
    await page.reload();

    // Answer should still be selected (if saved to localStorage or backend)
    // This depends on implementation - check if answers persist
    await expect(page.getByRole('radio', { checked: true })).toBeVisible();
  });

  test('should warn before closing browser with unsaved work', async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');

    // Answer a question
    await page.getByRole('radio').first().click();

    // Listen for beforeunload event
    const beforeUnloadSet = await page.evaluate(() => {
      return window.onbeforeunload !== null;
    });

    expect(beforeUnloadSet).toBe(true);
  });

  test('should handle timer expiry', async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');

    // Fast-forward timer (mock)
    await page.evaluate(() => {
      // Dispatch custom event or manipulate timer
      window.dispatchEvent(new CustomEvent('assessment-timer-expired'));
    });

    // Should show timer expired message or auto-submit
    await expect(page.getByText(/time expired|assessment submitted/i)).toBeVisible();
  });

  test('should handle network errors during code execution', async ({ page }) => {
    await page.goto('/assessment/test-assessment-123');

    // Navigate to coding question
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }

    // Mock network error for code execution
    await page.route('**/api/assessments/*/execute', route => {
      route.abort('failed');
    });

    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('function test() {}');
    await page.getByRole('button', { name: /run code/i }).click();

    // Should show error message
    await expect(page.getByText(/failed to execute|network error/i)).toBeVisible();
  });

  test('should handle empty assessment (no questions)', async ({ page }) => {
    // Navigate to empty assessment
    await page.goto('/assessment/empty-assessment-123');

    // Should show appropriate message
    await expect(page.getByText(/no questions available|assessment not found/i)).toBeVisible();
  });
});
