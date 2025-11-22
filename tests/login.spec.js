const { test, expect } = require('@playwright/test');

test.describe('Login Flow', () => {
  test('should successfully login and redirect to dashboard', async ({ page }) => {
    console.log('🧪 Starting login test...\n');

    // Step 1: Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded');

    // Step 2: Check that we're on the login page
    console.log('\n2️⃣ Verifying login page elements...');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const signInButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();
    console.log('✅ All form elements are visible');

    // Step 3: Fill in credentials
    console.log('\n3️⃣ Filling in credentials...');
    await emailInput.fill('admin@dentalclinic.com');
    await passwordInput.fill('password123');
    console.log('✅ Credentials filled');

    // Step 4: Listen for console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Sign in result') || text.includes('Login') || text.includes('🔐')) {
        console.log('   Browser console:', text);
      }
    });

    // Step 5: Click sign in and wait for navigation
    console.log('\n4️⃣ Clicking sign in button...');

    // Wait for the API call to complete
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/callback/credentials'),
      { timeout: 10000 }
    );

    await signInButton.click();
    console.log('✅ Sign in button clicked');

    // Wait for the auth callback
    console.log('\n5️⃣ Waiting for authentication...');
    const response = await responsePromise;
    console.log('   Auth response status:', response.status());

    if (response.status() === 200) {
      console.log('✅ Authentication successful (200 OK)');
    } else {
      console.error('❌ Authentication failed with status:', response.status());
    }

    // Step 6: Wait for navigation to dashboard
    console.log('\n6️⃣ Waiting for redirect to dashboard...');
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Successfully redirected to dashboard!');

      const currentUrl = page.url();
      console.log('   Current URL:', currentUrl);

      // Verify we're on the dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      console.log('✅ URL verification passed');

      // Check for dashboard content
      console.log('\n7️⃣ Verifying dashboard content...');
      await page.waitForSelector('text=/Dashboard Overview|Total Patients|Appointments/i', { timeout: 5000 });
      console.log('✅ Dashboard content loaded');

      console.log('\n✨ TEST PASSED! Login flow works correctly!');
    } catch (error) {
      console.error('\n❌ TEST FAILED! Did not redirect to dashboard');
      console.error('   Current URL:', page.url());
      console.error('   Error:', error.message);

      // Take a screenshot for debugging
      await page.screenshot({ path: 'login-test-failure.png', fullPage: true });
      console.log('   Screenshot saved: login-test-failure.png');

      throw error;
    }
  });

  test('should show error for invalid credentials', async ({ page }) => {
    console.log('\n🧪 Testing invalid credentials...\n');

    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill('wrong@email.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    await page.locator('button[type="submit"]').click();

    // Should show error message
    await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/.*login/);

    console.log('✅ Error handling works correctly');
  });
});
