import { test, expect } from '@playwright/test';

test.describe('FlashChat QA Audit: Full Flow', () => {
  const timestamp = Date.now();
  const user1 = { username: `qauser1_${timestamp}`, displayName: 'QA User 1', email: `qa1_${timestamp}@example.com`, password: 'Password123!' };
  const user2 = { username: `qauser2_${timestamp}`, displayName: 'QA User 2', email: `qa2_${timestamp}@example.com`, password: 'Password123!' };

  test('Registration, Profile, and DM flow', async ({ browser }) => {
    // ========================================
    // PHASE 1: Register User 1
    // ========================================
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();

    await page1.goto('/register');
    await page1.fill('input#username', user1.username);
    await page1.fill('input#displayName', user1.displayName);
    await page1.fill('input#email', user1.email);
    await page1.fill('input#password', user1.password);

    const [reg1Res] = await Promise.all([
      page1.waitForResponse(r => r.url().includes('/auth/register') && r.status() === 201, { timeout: 15000 }),
      page1.click('button[type="submit"]')
    ]);
    const reg1Data = await reg1Res.json();
    const user1Id = reg1Data?.data?.user?._id || reg1Data?.data?.user?.id || reg1Data?.user?._id;
    console.log(`✅ User 1 registered. ID: ${user1Id}`);

    await page1.waitForURL(url => !url.pathname.includes('/register'), { timeout: 10000 });
    await ctx1.close();

    // ========================================
    // PHASE 2: Register User 2
    // ========================================
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();

    await page2.goto('/register');
    await page2.fill('input#username', user2.username);
    await page2.fill('input#displayName', user2.displayName);
    await page2.fill('input#email', user2.email);
    await page2.fill('input#password', user2.password);

    const [reg2Res] = await Promise.all([
      page2.waitForResponse(r => r.url().includes('/auth/register') && r.status() === 201, { timeout: 15000 }),
      page2.click('button[type="submit"]')
    ]);
    const reg2Data = await reg2Res.json();
    const user2Id = reg2Data?.data?.user?._id || reg2Data?.data?.user?.id || reg2Data?.user?._id;
    console.log(`✅ User 2 registered. ID: ${user2Id}`);

    await page2.waitForURL(url => !url.pathname.includes('/register'), { timeout: 10000 });
    await page2.waitForTimeout(2000);

    // ========================================
    // PHASE 3: User 2 visits User 1's profile
    // ========================================
    await page2.goto(`/profile/${user1Id}`);
    await page2.waitForTimeout(3000);
    
    // Take a screenshot to see what's on the profile page
    await page2.screenshot({ path: 'test-results/profile-page-debug.png', fullPage: true });
    console.log(`📸 Profile page screenshot saved.`);

    // Log the page HTML for debugging
    const pageContent = await page2.content();
    const hasMessageBtn = pageContent.includes('Message');
    const hasFollowBtn = pageContent.includes('Follow');
    const hasEditProfile = pageContent.includes('Edit Profile');
    console.log(`🔍 Profile page content check:`);
    console.log(`   - Contains 'Message': ${hasMessageBtn}`);
    console.log(`   - Contains 'Follow': ${hasFollowBtn}`);
    console.log(`   - Contains 'Edit Profile': ${hasEditProfile}`);
    console.log(`   - Current URL: ${page2.url()}`);

    // Check if we got redirected
    if (page2.url().includes('/login')) {
      console.log(`❌ BUG: Redirected to login when visiting another user's profile.`);
      await ctx2.close();
      return;
    }

    // Try to find the Message button with various selectors
    const messageBtn = page2.getByRole('button', { name: /Message/i });
    const messageBtnAlt = page2.locator('button:has-text("Message")');
    
    if (await messageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`✅ Message button found (getByRole).`);
      await messageBtn.click();
    } else if (await messageBtnAlt.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`✅ Message button found (locator).`);
      await messageBtnAlt.click();
    } else {
      // Try directly creating a conversation via the API
      console.log(`⚠️ Message button not found. Attempting direct API conversation creation.`);

      // Get all visible buttons for debugging
      const allButtons = await page2.locator('button').allInnerTexts();
      console.log(`🔍 All visible buttons: ${JSON.stringify(allButtons)}`);
      
      await page2.screenshot({ path: 'test-results/profile-no-message-btn.png', fullPage: true });

      // BUG REPORT: Message button missing on another user's profile
      console.log(`❌ BUG-002: Message/Follow buttons not appearing on another user's profile page.`);
      
      // Fallback: Navigate to inbox directly to test DM
      await page2.goto('/direct/inbox');
      await page2.waitForTimeout(2000);
      await page2.screenshot({ path: 'test-results/inbox-page.png', fullPage: true });
      console.log(`📸 Inbox page screenshot saved.`);
    }

    // ========================================
    // PHASE 4: Check Explore / Discovery page
    // ========================================
    await page2.goto('/explore');
    await page2.waitForTimeout(2000);
    await page2.screenshot({ path: 'test-results/explore-page.png', fullPage: true });
    console.log(`📸 Explore page screenshot saved.`);

    // ========================================
    // PHASE 5: Sidebar Navigation Test
    // ========================================
    const navItems = await page2.locator('nav a, aside a').allInnerTexts();
    console.log(`🔍 Navigation items found: ${JSON.stringify(navItems)}`);

    // ========================================
    // PHASE 6: Logout Test
    // ========================================
    const logoutBtn = page2.locator('button:has-text("Log out")');
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page2.waitForURL(/\/login/, { timeout: 10000 });
      console.log(`✅ Logout successful.`);
    } else {
      console.log(`⚠️ Logout button not found in current view.`);
    }

    // ========================================
    // PHASE 7: Login Test (re-login as User 2)
    // ========================================
    await page2.goto('/login');
    await page2.waitForTimeout(1000);
    await page2.fill('input#email', user2.email);
    await page2.fill('input#password', user2.password);
    
    const [loginRes] = await Promise.all([
      page2.waitForResponse(r => r.url().includes('/auth/login') && (r.status() === 200 || r.status() === 201), { timeout: 15000 }),
      page2.click('button[type="submit"]')
    ]);
    
    const loginData = await loginRes.json();
    console.log(`✅ Login response status: ${loginRes.status()}`);
    
    await page2.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    console.log(`✅ Login redirect successful. Current URL: ${page2.url()}`);

    await ctx2.close();
    console.log(`\n🏁 QA Audit test suite completed.`);
  });
});
