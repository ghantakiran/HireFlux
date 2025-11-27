/**
 * E2E Tests for Two-Way Messaging System (Issue #70)
 *
 * Tests complete user workflows for direct employer-candidate communication
 * Following BDD methodology with comprehensive coverage
 *
 * Test Coverage:
 * - Message sending and receiving
 * - Thread management (list, detail, archive)
 * - Read receipts and unread counts
 * - User blocking and spam prevention
 * - Message flagging
 * - Performance benchmarks
 * - Mobile responsiveness
 * - Accessibility
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

// Mock user credentials
const EMPLOYER_USER = {
  email: 'employer@testcompany.com',
  password: 'Test1234!',
  firstName: 'Jane',
  lastName: 'Recruiter',
  role: 'employer'
};

const CANDIDATE_USER = {
  email: 'candidate@test.com',
  password: 'Test1234!',
  firstName: 'John',
  lastName: 'Doe',
  role: 'candidate'
};

// Helper function to login user
async function loginUser(page: Page, user: typeof EMPLOYER_USER) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

// Helper function to mock API authentication
async function mockAuthToken(page: Page, userId: string, role: string) {
  await page.route('**/api/v1/**', async (route) => {
    const headers = route.request().headers();
    headers['authorization'] = `Bearer mock_jwt_token_${userId}`;
    await route.continue({ headers });
  });
}

// ============================================================================
// FEATURE: Message Inbox & Thread List
// ============================================================================

test.describe('Messaging Inbox - Thread List', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
  });

  test('should display inbox with thread list', async ({ page }) => {
    // Mock API response for thread list
    await page.route('**/api/v1/messages/threads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          threads: [
            {
              id: 'thread-1',
              subject: 'Application for Senior Engineer',
              employer: {
                id: 'emp-1',
                email: 'employer@testcompany.com',
                firstName: 'Jane',
                lastName: 'Recruiter',
                role: 'employer'
              },
              candidate: {
                id: 'cand-1',
                email: 'john@example.com',
                firstName: 'John',
                lastName: 'Doe',
                role: 'candidate'
              },
              last_message_at: '2025-11-26T10:30:00Z',
              unread_count: 2,
              latest_message: {
                id: 'msg-1',
                body: 'Looking forward to discussing the role...',
                sender_id: 'cand-1'
              }
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          unread_count: 2
        })
      });
    });

    // Navigate to messages
    await page.goto(`${BASE_URL}/messages`);

    // Verify inbox elements
    await expect(page.locator('h1')).toContainText('Messages');
    await expect(page.locator('[data-testid="unread-badge"]')).toContainText('2');

    // Verify thread item
    const threadItem = page.locator('[data-testid="thread-item"]').first();
    await expect(threadItem).toBeVisible();
    await expect(threadItem.locator('[data-testid="thread-subject"]')).toContainText('Application for Senior Engineer');
    await expect(threadItem.locator('[data-testid="thread-preview"]')).toContainText('Looking forward to discussing');
    await expect(threadItem.locator('[data-testid="unread-count"]')).toContainText('2');
  });

  test('should filter threads by unread status', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);

    // Mock filtered response
    await page.route('**/api/v1/messages/threads?unread_only=true*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          threads: [
            {
              id: 'thread-1',
              subject: 'Unread Thread',
              unread_count: 3,
              latest_message: { body: 'Unread message' }
            }
          ],
          total: 1
        })
      });
    });

    // Click unread filter
    await page.click('[data-testid="filter-unread"]');

    // Verify filtered results
    await expect(page.locator('[data-testid="thread-item"]')).toHaveCount(1);
  });

  test('should paginate thread list', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);

    // Mock page 2 response
    await page.route('**/api/v1/messages/threads?page=2*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          threads: [],
          total: 25,
          page: 2,
          limit: 20
        })
      });
    });

    // Click next page
    await page.click('[data-testid="pagination-next"]');

    // Verify page parameter in URL
    await expect(page).toHaveURL(/page=2/);
  });

  test('should display empty state when no threads', async ({ page }) => {
    await page.route('**/api/v1/messages/threads*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          threads: [],
          total: 0,
          unread_count: 0
        })
      });
    });

    await page.goto(`${BASE_URL}/messages`);

    // Verify empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('No messages yet');
  });
});

// ============================================================================
// FEATURE: Message Composition & Sending
// ============================================================================

test.describe('Message Composition', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
  });

  test('should send a new message successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/compose`);

    // Mock send message API
    await page.route('**/api/v1/messages', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              id: 'msg-new',
              body: 'Hello, we would like to invite you for an interview...',
              sender_id: 'emp-1',
              recipient_id: 'cand-1',
              created_at: '2025-11-26T12:00:00Z',
              is_read: false
            },
            thread: {
              id: 'thread-new',
              subject: 'Interview Invitation'
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Fill message form
    await page.fill('[data-testid="recipient-select"]', 'John Doe');
    await page.fill('[data-testid="message-subject"]', 'Interview Invitation');
    await page.fill('[data-testid="message-body"]', 'Hello, we would like to invite you for an interview...');

    // Click send
    await page.click('[data-testid="send-message-btn"]');

    // Verify success notification
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Message sent successfully');

    // Verify redirect to thread
    await page.waitForURL(/\/messages\/thread-new/);
  });

  test('should validate message body is not empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/compose`);

    // Fill empty body
    await page.fill('[data-testid="recipient-select"]', 'John Doe');
    await page.fill('[data-testid="message-subject"]', 'Test');
    await page.fill('[data-testid="message-body"]', '   '); // Whitespace only

    // Try to send
    await page.click('[data-testid="send-message-btn"]');

    // Verify validation error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Message body cannot be empty');
  });

  test('should handle rate limiting error (10 messages/day)', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/compose`);

    // Mock rate limit error
    await page.route('**/api/v1/messages', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Rate limit exceeded. Maximum 10 messages per day.'
        })
      });
    });

    // Fill and send
    await page.fill('[data-testid="recipient-select"]', 'John Doe');
    await page.fill('[data-testid="message-body"]', 'Test message');
    await page.click('[data-testid="send-message-btn"]');

    // Verify rate limit error
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('Rate limit exceeded');
  });

  test('should support message attachments (max 5 files)', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/compose`);

    // Upload attachments
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      { name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDF content') }
    ]);

    // Verify attachment preview
    await expect(page.locator('[data-testid="attachment-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="attachment-item"]')).toContainText('resume.pdf');
  });
});

// ============================================================================
// FEATURE: Thread Detail & Message History
// ============================================================================

test.describe('Thread Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
  });

  test('should display thread with message history', async ({ page }) => {
    // Mock thread detail API
    await page.route('**/api/v1/messages/threads/thread-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          thread: {
            id: 'thread-1',
            subject: 'Interview Discussion',
            employer: { firstName: 'Jane', lastName: 'Recruiter' },
            candidate: { firstName: 'John', lastName: 'Doe' }
          },
          messages: [
            {
              id: 'msg-1',
              sender_id: 'emp-1',
              recipient_id: 'cand-1',
              body: 'Hi John, we would like to schedule an interview.',
              created_at: '2025-11-26T09:00:00Z',
              is_read: true,
              read_at: '2025-11-26T09:05:00Z'
            },
            {
              id: 'msg-2',
              sender_id: 'cand-1',
              recipient_id: 'emp-1',
              body: 'Thank you! I am available next week.',
              created_at: '2025-11-26T10:00:00Z',
              is_read: false
            }
          ],
          total_messages: 2
        })
      });
    });

    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Verify thread header
    await expect(page.locator('[data-testid="thread-subject"]')).toContainText('Interview Discussion');
    await expect(page.locator('[data-testid="participant-name"]')).toContainText('John Doe');

    // Verify messages
    const messages = page.locator('[data-testid="message-item"]');
    await expect(messages).toHaveCount(2);

    // Verify first message
    await expect(messages.nth(0).locator('[data-testid="message-body"]')).toContainText('Hi John, we would like to schedule an interview');
    await expect(messages.nth(0).locator('[data-testid="read-receipt"]')).toContainText('Read');

    // Verify second message (unread)
    await expect(messages.nth(1).locator('[data-testid="message-body"]')).toContainText('Thank you! I am available next week');
    await expect(messages.nth(1).locator('[data-testid="unread-indicator"]')).toBeVisible();
  });

  test('should mark message as read when viewing', async ({ page }) => {
    // Mock mark as read API
    await page.route('**/api/v1/messages/msg-2/read', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-2',
            is_read: true,
            read_at: '2025-11-26T12:00:00Z'
          })
        });
      }
    });

    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Wait for mark as read API call
    const readRequest = page.waitForRequest(req =>
      req.url().includes('/msg-2/read') && req.method() === 'PUT'
    );

    await readRequest;

    // Verify read receipt displayed
    await expect(page.locator('[data-testid="message-item"]').nth(1).locator('[data-testid="read-receipt"]')).toBeVisible();
  });

  test('should reply to existing thread', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Fill reply
    await page.fill('[data-testid="reply-input"]', 'Sure, how about Monday at 2 PM?');

    // Mock send reply
    await page.route('**/api/v1/messages', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: {
            id: 'msg-3',
            body: 'Sure, how about Monday at 2 PM?',
            created_at: '2025-11-26T12:30:00Z'
          }
        })
      });
    });

    // Send reply
    await page.click('[data-testid="send-reply-btn"]');

    // Verify new message appears
    await expect(page.locator('[data-testid="message-item"]')).toHaveCount(3);
  });
});

// ============================================================================
// FEATURE: User Blocking & Spam Prevention
// ============================================================================

test.describe('User Blocking', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
  });

  test('should block a user successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Mock block API
    await page.route('**/api/v1/messages/block', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          blocked_user_id: 'cand-1',
          reason: 'spam'
        })
      });
    });

    // Open block modal
    await page.click('[data-testid="thread-actions-menu"]');
    await page.click('[data-testid="block-user-option"]');

    // Select reason
    await page.selectOption('[data-testid="block-reason-select"]', 'spam');

    // Confirm block
    await page.click('[data-testid="confirm-block-btn"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('User blocked successfully');
  });

  test('should prevent sending messages to blocked user', async ({ page }) => {
    // Mock block check
    await page.route('**/api/v1/messages', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'You have been blocked by this user'
        })
      });
    });

    await page.goto(`${BASE_URL}/messages/compose?recipient=cand-blocked`);

    // Try to send message
    await page.fill('[data-testid="message-body"]', 'Test message');
    await page.click('[data-testid="send-message-btn"]');

    // Verify blocked error
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('blocked by this user');
  });

  test('should unblock a user', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/blocked-users`);

    // Mock unblock API
    await page.route('**/api/v1/messages/block/cand-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    // Click unblock
    await page.click('[data-testid="unblock-user-cand-1"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('User unblocked');
  });
});

// ============================================================================
// FEATURE: Message Flagging (Spam/Inappropriate)
// ============================================================================

test.describe('Message Flagging', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, CANDIDATE_USER);
  });

  test('should flag a message as spam', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Mock flag API
    await page.route('**/api/v1/messages/msg-1/flag*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-1',
          is_flagged: true,
          flagged_reason: 'spam'
        })
      });
    });

    // Open message menu
    await page.click('[data-testid="message-item"]').first().locator('[data-testid="message-menu"]');
    await page.click('[data-testid="flag-message-option"]');

    // Select reason
    await page.click('[data-testid="flag-reason-spam"]');

    // Verify flagged
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Message flagged');
  });
});

// ============================================================================
// FEATURE: Thread Management (Archive/Delete)
// ============================================================================

test.describe('Thread Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
  });

  test('should archive a thread', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Mock archive API
    await page.route('**/api/v1/messages/threads/thread-1/archive', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'thread-1',
          archived_by_employer: true
        })
      });
    });

    // Archive thread
    await page.click('[data-testid="thread-actions-menu"]');
    await page.click('[data-testid="archive-thread-option"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Thread archived');
  });

  test('should delete a thread (soft delete)', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages/thread-1`);

    // Mock delete API
    await page.route('**/api/v1/messages/threads/thread-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 });
      }
    });

    // Delete thread
    await page.click('[data-testid="thread-actions-menu"]');
    await page.click('[data-testid="delete-thread-option"]');

    // Confirm delete
    await page.click('[data-testid="confirm-delete-btn"]');

    // Verify redirect and success
    await page.waitForURL(/\/messages$/);
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Thread deleted');
  });
});

// ============================================================================
// FEATURE: Unread Count Badge
// ============================================================================

test.describe('Unread Count Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
  });

  test('should display unread count badge in navigation', async ({ page }) => {
    // Mock unread count API
    await page.route('**/api/v1/messages/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          unread_count: 5,
          unread_threads: 2
        })
      });
    });

    await page.goto(`${BASE_URL}/dashboard`);

    // Verify badge in navigation
    const messagesBadge = page.locator('[data-testid="nav-messages-badge"]');
    await expect(messagesBadge).toBeVisible();
    await expect(messagesBadge).toContainText('5');
  });

  test('should update unread count after marking as read', async ({ page }) => {
    // Mock initial count
    await page.route('**/api/v1/messages/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          unread_count: 3,
          unread_threads: 1
        })
      });
    });

    await page.goto(`${BASE_URL}/messages`);

    // Verify initial count
    await expect(page.locator('[data-testid="unread-badge"]')).toContainText('3');

    // Mock updated count after reading
    await page.route('**/api/v1/messages/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          unread_count: 0,
          unread_threads: 0
        })
      });
    });

    // Click thread to read
    await page.click('[data-testid="thread-item"]').first();

    // Verify count updated
    await expect(page.locator('[data-testid="unread-badge"]')).not.toBeVisible();
  });
});

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

test.describe('Performance Benchmarks', () => {
  test('should load inbox within 2 seconds', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);

    const startTime = Date.now();
    await page.goto(`${BASE_URL}/messages`);
    await page.waitForSelector('[data-testid="thread-item"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    console.log(`Inbox load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(2000);
  });

  test('should send message within 1 second', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
    await page.goto(`${BASE_URL}/messages/compose`);

    await page.fill('[data-testid="recipient-select"]', 'John Doe');
    await page.fill('[data-testid="message-body"]', 'Quick message test');

    const startTime = Date.now();
    await page.click('[data-testid="send-message-btn"]');
    await page.waitForSelector('[data-testid="success-toast"]', { timeout: 5000 });
    const sendTime = Date.now() - startTime;

    console.log(`Message send time: ${sendTime}ms`);
    expect(sendTime).toBeLessThan(1000);
  });
});

// ============================================================================
// MOBILE RESPONSIVENESS
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile-optimized inbox', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
    await page.goto(`${BASE_URL}/messages`);

    // Verify mobile layout
    const threadList = page.locator('[data-testid="thread-list"]');
    await expect(threadList).toBeVisible();

    // Verify touch-friendly elements (minimum 44px height)
    const threadItem = page.locator('[data-testid="thread-item"]').first();
    const box = await threadItem.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('should support swipe to archive on mobile', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
    await page.goto(`${BASE_URL}/messages`);

    // Simulate swipe gesture
    const threadItem = page.locator('[data-testid="thread-item"]').first();
    await threadItem.hover();
    await page.mouse.down();
    await page.mouse.move(-100, 0);
    await page.mouse.up();

    // Verify archive action visible
    await expect(page.locator('[data-testid="swipe-archive-btn"]')).toBeVisible();
  });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

test.describe('Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
    await page.goto(`${BASE_URL}/messages`);

    // Tab through thread list
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus on first thread
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBe('thread-item');

    // Press Enter to open thread
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/messages\/thread-/);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);
    await page.goto(`${BASE_URL}/messages`);

    // Verify ARIA labels
    await expect(page.locator('[aria-label="Messages inbox"]')).toBeVisible();
    await expect(page.locator('[aria-label="Compose new message"]')).toBeVisible();
    await expect(page.locator('[aria-label="Unread messages count"]')).toBeVisible();
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

test.describe('Error Handling', () => {
  test('should display error when API fails', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);

    // Mock API error
    await page.route('**/api/v1/messages/threads*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    await page.goto(`${BASE_URL}/messages`);

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load messages');
  });

  test('should handle unauthorized access (401)', async ({ page }) => {
    // Don't login
    await page.goto(`${BASE_URL}/messages`);

    // Should redirect to login
    await page.waitForURL(/\/login/);
  });

  test('should handle forbidden access to thread (403)', async ({ page }) => {
    await loginUser(page, EMPLOYER_USER);

    // Mock 403 error
    await page.route('**/api/v1/messages/threads/thread-forbidden', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'You are not a participant in this thread' })
      });
    });

    await page.goto(`${BASE_URL}/messages/thread-forbidden`);

    // Verify error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('not a participant');
  });
});
