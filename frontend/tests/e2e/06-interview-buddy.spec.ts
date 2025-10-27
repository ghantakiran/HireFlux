import { test, expect } from '@playwright/test';

test.describe('Interview Buddy Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');
  });

  test('should display interview buddy dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Interview Coach/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Practice/i })).toBeVisible();
  });

  test('should create new technical interview session', async ({ page }) => {
    await page.getByRole('button', { name: /Start Practice/i }).click();

    // Select interview type
    await page.getByLabel(/Interview Type/i).click();
    await page.getByRole('option', { name: /Technical/i }).click();

    // Select role level
    await page.getByLabel(/Role Level/i).click();
    await page.getByRole('option', { name: /Senior/i }).click();

    // Select company type
    await page.getByLabel(/Company Type/i).click();
    await page.getByRole('option', { name: /Tech Company/i }).click();

    // Set number of questions
    await page.getByLabel(/Number of Questions/i).fill('5');

    // Start session
    await page.getByRole('button', { name: /Begin Interview/i }).click();

    // Should generate questions
    await expect(page.getByText(/Generating questions/i)).toBeVisible();

    // Should show first question
    await expect(page.getByRole('heading', { name: /Question 1 of 5/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('should create behavioral interview session', async ({ page }) => {
    await page.getByRole('button', { name: /Start Practice/i }).click();

    await page.getByLabel(/Interview Type/i).click();
    await page.getByRole('option', { name: /Behavioral/i }).click();

    await page.getByLabel(/Role Level/i).click();
    await page.getByRole('option', { name: /Mid-Level/i }).click();

    await page.getByRole('button', { name: /Begin Interview/i }).click();

    // Should show behavioral question
    await expect(page.getByText(/Tell me about a time/i)).toBeVisible({ timeout: 15000 });
  });

  test('should answer question with text input', async ({ page }) => {
    // Assume we're in an active interview session
    await page.goto('/dashboard/interview-buddy/session/123');

    // Type answer
    const answerField = page.getByLabel(/Your Answer/i);
    await answerField.fill(`
      In my previous role at Tech Corp, I led the migration of our monolithic
      application to microservices. This was a critical project that impacted
      the entire engineering team.
    `);

    // Submit answer
    await page.getByRole('button', { name: /Submit Answer/i }).click();

    // Should show analyzing state
    await expect(page.getByText(/Analyzing your answer/i)).toBeVisible();

    // Should show AI feedback
    await expect(page.getByRole('heading', { name: /Feedback/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('should show STAR framework analysis for behavioral questions', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    // Submit a behavioral answer
    const answerField = page.getByLabel(/Your Answer/i);
    await answerField.fill(`
      Situation: Our API response times were exceeding 3 seconds...
      Task: I was tasked with reducing latency to under 500ms...
      Action: I implemented caching and optimized database queries...
      Result: Response times dropped to 200ms, improving user satisfaction by 45%.
    `);

    await page.getByRole('button', { name: /Submit Answer/i }).click();

    // Should show STAR framework breakdown
    await expect(page.getByText(/STAR Framework Analysis/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Situation.*covered/i)).toBeVisible();
    await expect(page.getByText(/Task.*covered/i)).toBeVisible();
    await expect(page.getByText(/Action.*covered/i)).toBeVisible();
    await expect(page.getByText(/Result.*covered/i)).toBeVisible();
  });

  test('should show score and feedback for answer', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    await page.getByLabel(/Your Answer/i).fill('Sample answer to technical question');
    await page.getByRole('button', { name: /Submit Answer/i }).click();

    // Should show score
    const scoreDisplay = page.locator('[data-testid="answer-score"]');
    await expect(scoreDisplay).toBeVisible({ timeout: 15000 });
    await expect(scoreDisplay).toContainText(/\d+\/10/);

    // Should show feedback sections
    await expect(page.getByText(/Strengths/i)).toBeVisible();
    await expect(page.getByText(/Areas for Improvement/i)).toBeVisible();
    await expect(page.getByText(/Sample Answer/i)).toBeVisible();
  });

  test('should allow retrying a question', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    // Submit first answer
    await page.getByLabel(/Your Answer/i).fill('First attempt at answer');
    await page.getByRole('button', { name: /Submit Answer/i }).click();

    // Wait for feedback
    await expect(page.getByRole('heading', { name: /Feedback/i })).toBeVisible({
      timeout: 15000,
    });

    // Click retry
    await page.getByRole('button', { name: /Retry Question/i }).click();

    // Should clear answer and allow new attempt
    await expect(page.getByLabel(/Your Answer/i)).toHaveValue('');
    await expect(page.getByRole('button', { name: /Submit Answer/i })).toBeEnabled();
  });

  test('should navigate through questions', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    // Answer first question
    await page.getByLabel(/Your Answer/i).fill('Answer to question 1');
    await page.getByRole('button', { name: /Submit Answer/i }).click();

    // Wait for feedback
    await expect(page.getByRole('heading', { name: /Feedback/i })).toBeVisible({
      timeout: 15000,
    });

    // Go to next question
    await page.getByRole('button', { name: /Next Question/i }).click();

    // Should show question 2
    await expect(page.getByRole('heading', { name: /Question 2 of/i })).toBeVisible();
  });

  test('should show progress through session', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    // Should show progress bar
    const progressBar = page.locator('[data-testid="session-progress"]');
    await expect(progressBar).toBeVisible();

    // Should show answered count
    await expect(page.getByText(/\d+ of \d+ answered/i)).toBeVisible();
  });

  test('should complete session and show summary', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    // Navigate to last question (assuming 5 questions)
    for (let i = 0; i < 4; i++) {
      await page.getByLabel(/Your Answer/i).fill(`Answer to question ${i + 1}`);
      await page.getByRole('button', { name: /Submit Answer/i }).click();
      await expect(page.getByRole('heading', { name: /Feedback/i })).toBeVisible({
        timeout: 15000,
      });
      await page.getByRole('button', { name: /Next Question/i }).click();
    }

    // Answer final question
    await page.getByLabel(/Your Answer/i).fill('Final answer');
    await page.getByRole('button', { name: /Submit Answer/i }).click();

    await expect(page.getByRole('heading', { name: /Feedback/i })).toBeVisible({
      timeout: 15000,
    });

    // Complete session
    await page.getByRole('button', { name: /Complete Session/i }).click();

    // Should show session summary
    await expect(page.getByRole('heading', { name: /Session Complete/i })).toBeVisible();
    await expect(page.getByText(/Overall Score/i)).toBeVisible();
    await expect(page.getByText(/\d+\/10/)).toBeVisible();

    // Should show performance breakdown
    await expect(page.getByText(/Questions Answered/i)).toBeVisible();
    await expect(page.getByText(/Average Score/i)).toBeVisible();
  });

  test('should save session for later', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123');

    // Click save for later
    await page.getByRole('button', { name: /Save.*Later/i }).click();

    // Should show confirmation
    await expect(page.getByText(/Session saved/i)).toBeVisible();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*interview-buddy$/);

    // Should show saved session
    await expect(page.getByText(/Resume Session/i)).toBeVisible();
  });

  test('should resume saved session', async ({ page }) => {
    // Assume there's a saved session
    await page.getByRole('button', { name: /Resume Session/i }).click();

    // Should return to session at correct question
    await expect(page.getByRole('heading', { name: /Question \d+ of \d+/i })).toBeVisible();

    // Previous answers should be saved
    const previousAnswers = page.locator('[data-testid="answered-indicator"]');
    await expect(previousAnswers.first()).toBeVisible();
  });

  test('should view session history', async ({ page }) => {
    // Navigate to history
    await page.getByRole('link', { name: /Practice History/i }).click();

    // Should show completed sessions
    const sessionCards = page.locator('[data-testid="session-card"]');
    await expect(sessionCards.first()).toBeVisible();

    // Should show session details
    await expect(page.getByText(/Technical/i)).toBeVisible();
    await expect(page.getByText(/Senior Level/i)).toBeVisible();
    await expect(page.getByText(/Score:/i)).toBeVisible();
  });

  test('should view detailed session results', async ({ page }) => {
    await page.getByRole('link', { name: /Practice History/i }).click();

    // Click on a session
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    await sessionCard.click();

    // Should show all questions and answers
    await expect(page.getByRole('heading', { name: /Session Results/i })).toBeVisible();

    // Should show each question with feedback
    const questionCards = page.locator('[data-testid="question-card"]');
    await expect(questionCards.first()).toBeVisible();
  });

  test('should retry session with same questions', async ({ page }) => {
    await page.getByRole('link', { name: /Practice History/i }).click();

    const sessionCard = page.locator('[data-testid="session-card"]').first();
    await sessionCard.getByRole('button', { name: /Retry/i }).click();

    // Should create new session with same configuration
    await expect(page.getByRole('heading', { name: /Question 1 of/i })).toBeVisible();
  });

  test('should compare performance across sessions', async ({ page }) => {
    await page.getByRole('link', { name: /Practice History/i }).click();

    // Click analytics
    await page.getByRole('button', { name: /Analytics/i }).click();

    // Should show performance trends
    await expect(page.getByText(/Performance Over Time/i)).toBeVisible();

    // Should show chart
    const chart = page.locator('[data-testid="performance-chart"]');
    await expect(chart).toBeVisible();

    // Should show statistics
    await expect(page.getByText(/Total Sessions/i)).toBeVisible();
    await expect(page.getByText(/Average Score/i)).toBeVisible();
    await expect(page.getByText(/Improvement/i)).toBeVisible();
  });

  test('should share session results', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy/session/123/results');

    // Click share button
    await page.getByRole('button', { name: /Share/i }).click();

    // Should show share options
    await expect(page.getByText(/Share Results/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy Link/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download PDF/i })).toBeVisible();
  });

  test('should customize interview settings', async ({ page }) => {
    await page.getByRole('button', { name: /Start Practice/i }).click();

    // Open advanced settings
    await page.getByRole('button', { name: /Advanced Settings/i }).click();

    // Customize difficulty
    await page.getByLabel(/Difficulty/i).click();
    await page.getByRole('option', { name: /Hard/i }).click();

    // Enable timer
    await page.getByLabel(/Enable Timer/i).check();
    await page.getByLabel(/Time per Question/i).fill('5');

    // Apply settings
    await page.getByRole('button', { name: /Begin Interview/i }).click();

    // Should show timer during session
    await expect(page.locator('[data-testid="question-timer"]')).toBeVisible({ timeout: 15000 });
  });
});
