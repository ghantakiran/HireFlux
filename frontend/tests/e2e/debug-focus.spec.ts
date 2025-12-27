import { test } from '@playwright/test';

test('Debug: What gets focused on first Tab in WebKit', async ({ page }) => {
  await page.goto('/dashboard');

  console.log('='.repeat(80));
  console.log('DEBUGGING FOCUS ORDER');
  console.log('='.repeat(80));

  // Check what's focused initially
  const initialFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id,
    class: document.activeElement?.className,
    text: document.activeElement?.textContent?.substring(0, 50),
  }));
  console.log('Initial focus:', initialFocus);

  // Press Tab
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  // Check what's focused after first Tab
  const firstTabFocus = await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    id: document.activeElement?.id,
    class: document.activeElement?.className,
    text: document.activeElement?.textContent?.substring(0, 50),
    href: (document.activeElement as HTMLAnchorElement)?.href,
    tabIndex: document.activeElement?.getAttribute('tabindex'),
  }));
  console.log('After first Tab:', firstTabFocus);

  // Check if SkipLink exists
  const skipLink = await page.locator('a:has-text("Skip to main content")').count();
  console.log('SkipLink count:', skipLink);

  // Check SkipLink properties
  if (skipLink > 0) {
    const skipProps = await page.locator('a:has-text("Skip to main content")').evaluate((el) => ({
      visible: el.offsetParent !== null,
      tabIndex: el.getAttribute('tabindex'),
      style: window.getComputedStyle(el).transform,
    }));
    console.log('SkipLink properties:', skipProps);
  }

  console.log('='.repeat(80));
});
