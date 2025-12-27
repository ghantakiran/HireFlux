import { test } from '@playwright/test';

test('Debug: Tab order after SkipLink in WebKit', async ({ page }) => {
  await page.goto('/dashboard');

  console.log('='.repeat(80));
  console.log('DEBUGGING TAB ORDER IN WEBKIT');
  console.log('='.repeat(80));

  for (let i = 1; i <= 10; i++) {
    await page.keyboard.press('Tab');

    const focusInfo = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        text: el?.textContent?.substring(0, 50),
        href: (el as HTMLAnchorElement)?.href,
        id: el?.id,
        class: el?.className?.substring(0, 80),
        ariaLabel: el?.getAttribute('aria-label'),
        role: el?.getAttribute('role'),
      };
    });

    console.log(`Tab ${i}:`, JSON.stringify(focusInfo, null, 2));
  }

  console.log('='.repeat(80));
});
