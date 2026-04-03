import { test, expect } from '@playwright/test';

test('load app and print DOM', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:8080');
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  console.log("HTML:", html.substring(0, 1000));
  console.log("ERRORS:", errors);
});
