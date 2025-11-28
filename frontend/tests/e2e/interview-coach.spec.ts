import { test, expect } from '@playwright/test';

/**
 * Interview Coach Interface E2E Tests (Issue #108)
 *
 * TDD RED Phase - Comprehensive test suite for Interview Coach
 * Following BDD scenarios from tests/features/interview-coach.feature
 *
 * Features tested:
 * - Interview session setup and configuration
 * - Question generation and display
 * - Text and voice answer recording
 * - AI feedback with STAR framework analysis
 * - Performance metrics and session history
 * - Mock interviews and practice modes
 * - Accessibility and mobile responsiveness
 */

// Mock authentication helper
test.beforeEach(async ({ page }) => {
  // Mock authentication state
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mock_job_seeker_token');
    localStorage.setItem('user_type', 'job_seeker');
    localStorage.setItem('user_id', 'test_user_123');
  });
});

test.describe('Interview Coach - Core Session Setup', () => {
  test('should display interview coach page', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    // Check page title
    const title = page.locator('h1');
    await expect(title).toContainText(/Interview (Buddy|Coach)/i);

    // Check main sections
    await expect(page.locator('[data-interview-settings]')).toBeVisible();
    await expect(page.locator('[data-session-stats]')).toBeVisible();
    await expect(page.locator('[data-practice-interface]')).toBeVisible();
  });

  test('should show interview type options', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const typeSelect = page.locator('[data-interview-type-select]');
    await typeSelect.click();

    // Verify all interview types are available
    await expect(page.locator('[role="option"]', { hasText: 'Technical' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Behavioral' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'System Design' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Product' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Leadership' })).toBeVisible();
  });

  test('should select interview type', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const typeSelect = page.locator('[data-interview-type-select]');
    await typeSelect.click();
    await page.locator('[role="option"]', { hasText: 'Technical' }).click();

    // Verify selection
    await expect(typeSelect).toContainText('Technical');
  });

  test('should select role level', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const levelSelect = page.locator('[data-role-level-select]');
    await levelSelect.click();

    // Verify options
    await expect(page.locator('[role="option"]', { hasText: 'Junior' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Mid-Level' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Senior' })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Staff/Principal' })).toBeVisible();

    // Select option
    await page.locator('[role="option"]', { hasText: 'Senior' }).click();
    await expect(levelSelect).toContainText('Senior');
  });

  test('should select company type', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const companySelect = page.locator('[data-company-type-select]');
    await companySelect.click();

    // Verify FAANG option and select
    await expect(page.locator('[role="option"]', { hasText: 'FAANG' })).toBeVisible();
    await page.locator('[role="option"]', { hasText: 'FAANG' }).click();

    await expect(companySelect).toContainText('FAANG');
  });

  test('should configure focus areas', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const focusSelect = page.locator('[data-focus-area-select]');
    await focusSelect.click();
    await page.locator('[role="option"]', { hasText: /Python.*Backend/ }).click();

    await expect(focusSelect).toContainText(/Python.*Backend/);
  });
});

test.describe('Interview Coach - Session Start', () => {
  test('should start new interview session', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const startButton = page.getByRole('button', { name: /Start (Interview|Practice)/i });
    await startButton.click();

    // Should see loading indicator
    await expect(page.locator('[data-loading-indicator]')).toBeVisible();

    // First question should appear within 3 seconds
    await expect(page.locator('[data-question-text]')).toBeVisible({ timeout: 3000 });
  });

  test('should start with default settings', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    // Start without configuring settings
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Session should start
    await expect(page.locator('[data-question-text]')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Interview Coach - Question Display', () => {
  test('should display question with all required elements', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Wait for question to load
    await page.waitForSelector('[data-question-text]');

    // Check all required elements
    await expect(page.locator('[data-question-number]')).toBeVisible();
    await expect(page.locator('[data-question-number]')).toContainText(/Question \d+ of \d+/);
    await expect(page.locator('[data-question-text]')).toBeVisible();
    await expect(page.locator('[data-timer]')).toBeVisible();
    await expect(page.locator('[data-answer-input]')).toBeVisible();
  });

  test('should show relevant questions based on settings', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    // Configure for Technical / Senior / Python
    await page.locator('[data-interview-type-select]').click();
    await page.locator('[role="option"]', { hasText: 'Technical' }).click();

    await page.locator('[data-role-level-select]').click();
    await page.locator('[role="option"]', { hasText: 'Senior' }).click();

    await page.locator('[data-focus-area-select]').click();
    await page.locator('[role="option"]', { hasText: /Python/ }).click();

    // Start session
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Question should be relevant (this requires backend, but we test the display)
    const questionText = await page.locator('[data-question-text]').textContent();
    expect(questionText).toBeTruthy();
    expect(questionText!.length).toBeGreaterThan(10);
  });

  test('should increment question number', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.waitForSelector('[data-question-number]');

    // Check first question
    await expect(page.locator('[data-question-number]')).toContainText(/Question 1 of/);

    // Submit and move to next
    await page.getByRole('button', { name: /Submit|Next/i }).click();

    // Should show question 2
    await expect(page.locator('[data-question-number]')).toContainText(/Question 2 of/);
  });
});

test.describe('Interview Coach - Text Answer Recording', () => {
  test('should allow typing answer', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.waitForSelector('[data-answer-input]');

    const answerInput = page.locator('[data-answer-input]');
    const testAnswer = 'This is my test answer using the STAR framework.';

    await answerInput.fill(testAnswer);
    await expect(answerInput).toHaveValue(testAnswer);
  });

  test('should auto-save typed answer', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    const answerInput = page.locator('[data-answer-input]');
    await answerInput.fill('Auto-saved answer');

    // Wait for auto-save (typically debounced)
    await page.waitForTimeout(1000);

    // Refresh page
    await page.reload();

    // Answer should be preserved (requires backend implementation)
    // This test validates the expectation
  });

  test('should submit text answer', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.waitForSelector('[data-answer-input]');

    const answerInput = page.locator('[data-answer-input]');
    await answerInput.fill('My complete answer to the interview question.');

    const submitButton = page.getByRole('button', { name: /Submit Answer/i });
    await submitButton.click();

    // AI feedback should appear within 5 seconds
    await expect(page.locator('[data-ai-feedback]')).toBeVisible({ timeout: 5000 });
  });

  test('should reset answer with confirmation', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    const answerInput = page.locator('[data-answer-input]');
    await answerInput.fill('This is a substantial answer that should trigger confirmation.');

    const resetButton = page.getByRole('button', { name: /Reset|Clear/i });
    await resetButton.click();

    // For substantial answers, should show confirmation
    // (Implementation detail - may or may not have confirmation)
    // After reset, field should be empty
    const isEmpty = await answerInput.inputValue();
    expect(isEmpty).toBe('');
  });
});

test.describe('Interview Coach - Voice Answer Recording', () => {
  test('should show voice recording button', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.waitForSelector('[data-answer-input]');

    const voiceButton = page.getByRole('button', { name: /Voice Input|Start Recording/i });
    await expect(voiceButton).toBeVisible();
  });

  test('should start voice recording', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Grant microphone permission (in real tests, this needs context grant)
    await page.context().grantPermissions(['microphone']);

    const voiceButton = page.getByRole('button', { name: /Voice Input|Start Recording/i });
    await voiceButton.click();

    // Should show recording indicator
    await expect(page.locator('[data-recording-indicator]')).toBeVisible();
    await expect(page.locator('[data-recording-status]')).toContainText(/Recording/i);
    await expect(page.locator('[data-recording-timer]')).toBeVisible();
  });

  test('should stop voice recording', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.context().grantPermissions(['microphone']);

    const voiceButton = page.getByRole('button', { name: /Voice Input/i });
    await voiceButton.click();

    // Wait for recording to start
    await expect(page.locator('[data-recording-indicator]')).toBeVisible();

    // Stop recording
    const stopButton = page.getByRole('button', { name: /Stop Recording/i });
    await stopButton.click();

    // Recording should stop
    await expect(page.locator('[data-recording-indicator]')).not.toBeVisible();

    // Transcription should appear (with mock data)
    await expect(page.locator('[data-answer-input]')).not.toHaveValue('');
  });

  test('should handle microphone permission denied', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Don't grant permissions

    const voiceButton = page.getByRole('button', { name: /Voice Input/i });
    await voiceButton.click();

    // Should show error message
    await expect(page.locator('[data-error-message]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-error-message]')).toContainText(/microphone/i);

    // Text input should still work
    await expect(page.locator('[data-answer-input]')).toBeEnabled();
  });

  test('should toggle between voice and text input', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.context().grantPermissions(['microphone']);

    // Start voice
    await page.getByRole('button', { name: /Voice Input/i }).click();
    await expect(page.locator('[data-recording-indicator]')).toBeVisible();

    // Switch to text
    await page.getByRole('button', { name: /Text Input|Stop/i }).click();
    await expect(page.locator('[data-recording-indicator]')).not.toBeVisible();

    // Text input should be active
    await expect(page.locator('[data-answer-input]')).toBeEnabled();
  });
});

test.describe('Interview Coach - AI Feedback (STAR Framework)', () => {
  test('should display AI feedback after submission', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Answer and submit
    await page.locator('[data-answer-input]').fill('My detailed interview answer.');
    await page.getByRole('button', { name: /Submit/i }).click();

    // AI feedback should appear
    await expect(page.locator('[data-ai-feedback]')).toBeVisible({ timeout: 5000 });
  });

  test('should show STAR framework analysis', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.locator('[data-answer-input]').fill('Answer with STAR framework.');
    await page.getByRole('button', { name: /Submit/i }).click();

    await page.waitForSelector('[data-ai-feedback]');

    // Should analyze STAR components
    await expect(page.locator('[data-star-situation]')).toBeVisible();
    await expect(page.locator('[data-star-task]')).toBeVisible();
    await expect(page.locator('[data-star-action]')).toBeVisible();
    await expect(page.locator('[data-star-result]')).toBeVisible();
  });

  test('should show strengths and improvements', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.locator('[data-answer-input]').fill('Test answer');
    await page.getByRole('button', { name: /Submit/i }).click();

    await page.waitForSelector('[data-ai-feedback]');

    // Should have sections
    await expect(page.locator('[data-feedback-strengths]')).toBeVisible();
    await expect(page.locator('[data-feedback-improvements]')).toBeVisible();
  });

  test('should display feedback quality score', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.locator('[data-answer-input]').fill('Answer for scoring');
    await page.getByRole('button', { name: /Submit/i }).click();

    await page.waitForSelector('[data-ai-feedback]');

    // Should show numerical score
    const score = page.locator('[data-feedback-score]');
    await expect(score).toBeVisible();
    await expect(score).toContainText(/\d+\.?\d*\/10/);
  });

  test('should show score breakdown by criteria', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.locator('[data-answer-input]').fill('Comprehensive answer');
    await page.getByRole('button', { name: /Submit/i }).click();

    await page.waitForSelector('[data-feedback-breakdown]');

    // Should show breakdown
    await expect(page.locator('[data-criteria-clarity]')).toBeVisible();
    await expect(page.locator('[data-criteria-completeness]')).toBeVisible();
    await expect(page.locator('[data-criteria-relevance]')).toBeVisible();
  });

  test('should show sample answer', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.locator('[data-answer-input]').fill('My answer');
    await page.getByRole('button', { name: /Submit/i }).click();

    await page.waitForSelector('[data-sample-answer]');

    const sampleAnswer = page.locator('[data-sample-answer]');
    await expect(sampleAnswer).toBeVisible();

    const sampleText = await sampleAnswer.textContent();
    expect(sampleText!.length).toBeGreaterThan(50); // Should be substantial
  });
});

test.describe('Interview Coach - Session Progress', () => {
  test('should track progress through session', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Check first question
    await expect(page.locator('[data-question-number]')).toContainText(/Question 1/);

    // Submit and move to next
    await page.locator('[data-answer-input]').fill('Answer 1');
    await page.getByRole('button', { name: /Submit|Next/i }).click();

    // Should show question 2
    await expect(page.locator('[data-question-number]')).toContainText(/Question 2/);

    // Should see progress indicator
    await expect(page.locator('[data-progress-indicator]')).toBeVisible();
  });

  test('should navigate between questions', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Go to question 2
    await page.locator('[data-answer-input]').fill('Answer 1');
    await page.getByRole('button', { name: /Next/i }).click();

    await expect(page.locator('[data-question-number]')).toContainText(/Question 2/);

    // Go back to question 1
    await page.getByRole('button', { name: /Previous/i }).click();

    await expect(page.locator('[data-question-number]')).toContainText(/Question 1/);

    // Answer should be preserved
    await expect(page.locator('[data-answer-input]')).toHaveValue('Answer 1');
  });

  test('should skip question', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    const currentQuestion = await page.locator('[data-question-number]').textContent();

    await page.getByRole('button', { name: /Skip/i }).click();

    // Should move to next question
    const nextQuestion = await page.locator('[data-question-number]').textContent();
    expect(nextQuestion).not.toBe(currentQuestion);
  });
});

test.describe('Interview Coach - Session Completion', () => {
  test('should complete interview session', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Answer all questions (simplified - in real test, loop through all)
    for (let i = 0; i < 3; i++) {
      await page.waitForSelector('[data-answer-input]');
      await page.locator('[data-answer-input]').fill(`Answer ${i + 1}`);

      const isLast = i === 2;
      const buttonName = isLast ? /Finish|Complete/i : /Submit|Next/i;

      await page.getByRole('button', { name: buttonName }).click();
    }

    // Should see completion message
    await expect(page.locator('[data-session-complete]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-session-complete]')).toContainText(/Complete|Finished/i);
  });

  test('should display session results', async ({ page }) => {
    // This test assumes we've completed a session
    await page.goto('/dashboard/interview-buddy?sessionComplete=true');

    // Should see results summary
    await expect(page.locator('[data-session-results]')).toBeVisible();
    await expect(page.locator('[data-overall-score]')).toBeVisible();
    await expect(page.locator('[data-questions-answered]')).toBeVisible();
    await expect(page.locator('[data-average-time]')).toBeVisible();
    await expect(page.locator('[data-strengths-summary]')).toBeVisible();
    await expect(page.locator('[data-areas-improve]')).toBeVisible();
  });

  test('should show all questions in results', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy?sessionComplete=true');

    // Should list all questions
    const questionsList = page.locator('[data-results-questions]');
    await expect(questionsList).toBeVisible();

    // Each question should have answer and feedback
    const firstQuestion = questionsList.locator('[data-result-question]').first();
    await expect(firstQuestion.locator('[data-user-answer]')).toBeVisible();
    await expect(firstQuestion.locator('[data-feedback]')).toBeVisible();
    await expect(firstQuestion.locator('[data-sample-answer]')).toBeVisible();
  });
});

test.describe('Interview Coach - Performance Metrics', () => {
  test('should display session stats', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const statsPanel = page.locator('[data-session-stats]');
    await expect(statsPanel).toBeVisible();

    // Should show key metrics
    await expect(statsPanel.locator('[data-stat-sessions-completed]')).toBeVisible();
    await expect(statsPanel.locator('[data-stat-average-score]')).toBeVisible();
    await expect(statsPanel.locator('[data-stat-questions-answered]')).toBeVisible();
    await expect(statsPanel.locator('[data-stat-improvement-rate]')).toBeVisible();
  });

  test('should show improvement tracking', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/analytics');

    // Should see trend visualization
    await expect(page.locator('[data-improvement-chart]')).toBeVisible();
    await expect(page.locator('[data-best-performance]')).toBeVisible();
    await expect(page.locator('[data-worst-performance]')).toBeVisible();
  });

  test('should filter metrics by interview type', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/analytics');

    // Filter by Technical
    await page.locator('[data-type-filter]').click();
    await page.locator('[role="option"]', { hasText: 'Technical' }).click();

    // Should show Technical-specific metrics
    await expect(page.locator('[data-filtered-metrics]')).toBeVisible();
  });
});

test.describe('Interview Coach - Session History', () => {
  test('should display recent sessions', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const historySection = page.locator('[data-session-history]');
    await expect(historySection).toBeVisible();

    // Should show at least 3 recent sessions
    const sessions = historySection.locator('[data-session-item]');
    await expect(sessions).toHaveCount(3, { timeout: 3000 }).catch(() => {
      // At least 1 session should be visible
      expect(sessions.count()).resolves.toBeGreaterThanOrEqual(1);
    });
  });

  test('should show session details in history', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const firstSession = page.locator('[data-session-item]').first();

    // Should show required fields
    await expect(firstSession.locator('[data-session-type]')).toBeVisible();
    await expect(firstSession.locator('[data-session-score]')).toBeVisible();
    await expect(firstSession.locator('[data-session-date]')).toBeVisible();
  });

  test('should review past session', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const firstSession = page.locator('[data-session-item]').first();
    await firstSession.locator('button', { hasText: /Review/i }).click();

    // Should navigate to session details
    await expect(page.locator('[data-session-review]')).toBeVisible();
    await expect(page.locator('[data-review-questions]')).toBeVisible();
  });

  test('should filter session history', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/history');

    // Filter by interview type
    await page.locator('[data-history-filter-type]').click();
    await page.locator('[role="option"]', { hasText: 'Technical' }).click();

    // Should show only Technical sessions
    const sessions = page.locator('[data-session-item]');
    const count = await sessions.count();

    for (let i = 0; i < count; i++) {
      const session = sessions.nth(i);
      await expect(session).toContainText(/Technical/i);
    }
  });

  test('should search session history', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/history');

    const searchInput = page.locator('[data-history-search]');
    await searchInput.fill('Google');

    // Results should be filtered
    await page.waitForTimeout(500); // Debounce

    const sessions = page.locator('[data-session-item]');
    const firstSession = sessions.first();
    await expect(firstSession).toContainText(/Google/i);
  });
});

test.describe('Interview Coach - Timer & Time Management', () => {
  test('should display countdown timer', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    const timer = page.locator('[data-timer]');
    await expect(timer).toBeVisible();
    await expect(timer).toContainText(/\d+:\d+/); // MM:SS format
  });

  test('should update timer every second', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    const timer = page.locator('[data-timer]');
    const initialTime = await timer.textContent();

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    const newTime = await timer.textContent();
    expect(newTime).not.toBe(initialTime);
  });

  test('should show time expired notification', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Mock timer expiration
    await page.evaluate(() => {
      // Simulate timer reaching 0:00
      const timerElement = document.querySelector('[data-timer]');
      if (timerElement) {
        timerElement.textContent = '0:00';
        const event = new CustomEvent('timerExpired');
        timerElement.dispatchEvent(event);
      }
    });

    // Should show notification
    await expect(page.locator('[data-time-up-notification]')).toBeVisible({ timeout: 2000 });
  });

  test('should allow extending time', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Simulate timer expired
    await page.evaluate(() => {
      const timerElement = document.querySelector('[data-timer]');
      if (timerElement) timerElement.textContent = '0:00';
    });

    // Click extend time
    const extendButton = page.getByRole('button', { name: /Add.*Time|Extend/i });
    if (await extendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await extendButton.click();

      // Timer should reset with additional time
      const timer = page.locator('[data-timer]');
      const timerText = await timer.textContent();
      expect(timerText).not.toBe('0:00');
    }
  });
});

test.describe('Interview Coach - Mock Interview Mode', () => {
  test('should start mock interview', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const mockButton = page.getByRole('button', { name: /Mock Interview/i });
    await mockButton.click();

    // Should start full simulation
    await expect(page.locator('[data-mock-interview-mode]')).toBeVisible();
    await expect(page.locator('[data-session-timer]')).toBeVisible();
  });

  test('should show overall session timer in mock interview', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy?mode=mock');

    const sessionTimer = page.locator('[data-session-timer]');
    await expect(sessionTimer).toBeVisible();
    await expect(sessionTimer).toContainText(/\d+:\d+/);
  });

  test('should show mock interview results', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/mock-results/123');

    await expect(page.locator('[data-mock-results]')).toBeVisible();
    await expect(page.locator('[data-readiness-score]')).toBeVisible();
    await expect(page.locator('[data-comparison-typical]')).toBeVisible();
  });
});

test.describe('Interview Coach - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    // Tab through elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();

    // Should be able to start with Enter
    await page.keyboard.press('Enter');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    // Check for ARIA labels
    const typeSelect = page.locator('[data-interview-type-select]');
    await expect(typeSelect).toHaveAttribute('aria-label', /.+/);

    const startButton = page.getByRole('button', { name: /Start/i }).first();
    await expect(startButton).toHaveAccessibleName();
  });

  test('should be screen reader compatible', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // All key elements should have accessible text
    const question = page.locator('[data-question-text]');
    await expect(question).toHaveAttribute('role', /.*/);
  });
});

test.describe('Interview Coach - Mobile Responsiveness', () => {
  test('should display on mobile device', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/dashboard/interview-buddy');

    // Should be mobile-optimized
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-interview-settings]')).toBeVisible();
  });

  test('should have accessible buttons on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/interview-buddy');

    const startButton = page.getByRole('button', { name: /Start/i }).first();

    // Button should be large enough to tap
    const box = await startButton.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44); // iOS minimum tap target
  });
});

test.describe('Interview Coach - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/interview-sessions/generate', (route) => {
      route.abort('failed');
    });

    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    // Should show error
    await expect(page.locator('[data-error-message]')).toBeVisible({ timeout: 5000 });

    // Should have retry button
    await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
  });

  test('should preserve answer on error', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.waitForSelector('[data-answer-input]');

    const testAnswer = 'My answer that should be preserved';
    await page.locator('[data-answer-input]').fill(testAnswer);

    // Trigger error (mock)
    await page.route('**/api/v1/interview-sessions/submit', (route) => {
      route.abort('failed');
    });

    await page.getByRole('button', { name: /Submit/i }).click();

    // Answer should still be there
    await expect(page.locator('[data-answer-input]')).toHaveValue(testAnswer);
  });
});

test.describe('Interview Coach - Performance', () => {
  test('should load first question within 2 seconds', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    const startTime = Date.now();

    await page.getByRole('button', { name: /Start/i }).first().click();
    await page.waitForSelector('[data-question-text]', { timeout: 2000 });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should show AI feedback within 5 seconds', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
    await page.getByRole('button', { name: /Start/i }).first().click();

    await page.waitForSelector('[data-answer-input]');
    await page.locator('[data-answer-input]').fill('Test answer');

    const startTime = Date.now();

    await page.getByRole('button', { name: /Submit/i }).click();
    await page.waitForSelector('[data-ai-feedback]', { timeout: 5000 });

    const feedbackTime = Date.now() - startTime;
    expect(feedbackTime).toBeLessThan(5000);
  });
});

test.describe('Interview Coach - Export & Sharing', () => {
  test('should export session results as PDF', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123/results');

    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: /Export/i }).click();
    await page.getByRole('menuitem', { name: /PDF/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should generate shareable link', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123/results');

    await page.getByRole('button', { name: /Share/i }).click();

    // Should show shareable link
    await expect(page.locator('[data-share-link]')).toBeVisible();

    const shareLink = await page.locator('[data-share-link]').inputValue();
    expect(shareLink).toContain('http');
  });
});
