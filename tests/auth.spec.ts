import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'admin@dentalclinic.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('.MuiAlert-message')).toContainText('Invalid')
  })

  test('should logout successfully', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@dentalclinic.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/dashboard/)

    await page.click('[aria-label*="account"]')
    await page.click('text=Logout')

    await expect(page).toHaveURL(/\/login/)
  })
})
