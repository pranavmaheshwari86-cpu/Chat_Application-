import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/FlashChat/);
});

test('redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/direct/inbox');
  
  // Wait for redirect to happen
  await page.waitForURL('**/login*');
  
  // Verify login form is visible
  await expect(page.locator('form')).toBeVisible();
});
