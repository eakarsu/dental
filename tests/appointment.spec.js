const { test, expect } = require('@playwright/test')

test.describe('Appointment Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'admin@dentalclinic.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')

    // Navigate to appointments page
    await page.goto('http://localhost:3000/dashboard/appointments')
    await page.waitForLoadState('networkidle')
  })

  test('should create a new appointment successfully', async ({ page }) => {
    // Click "New Appointment" button
    await page.click('button:has-text("New Appointment")')

    // Wait for dialog to open
    await page.waitForSelector('text=New Appointment', { timeout: 5000 })

    // Select a patient from autocomplete
    const patientAutocomplete = page.locator('div[role="combobox"]:has(input) >> nth=0')
    await patientAutocomplete.click()
    await page.waitForTimeout(500)

    // Type to search for patient and select first option
    await patientAutocomplete.type('a', { delay: 100 })
    await page.waitForTimeout(1000)

    // Click the first patient option
    const firstPatientOption = page.locator('li[role="option"]').first()
    await firstPatientOption.waitFor({ state: 'visible', timeout: 5000 })
    await firstPatientOption.click()

    // Select a dentist from autocomplete
    const dentistAutocomplete = page.locator('div[role="combobox"]:has(input) >> nth=1')
    await dentistAutocomplete.click()
    await page.waitForTimeout(500)

    // Type to search for dentist and select first option
    await dentistAutocomplete.type('Dr', { delay: 100 })
    await page.waitForTimeout(1000)

    // Click the first dentist option
    const firstDentistOption = page.locator('li[role="option"]').first()
    await firstDentistOption.waitFor({ state: 'visible', timeout: 5000 })
    await firstDentistOption.click()

    // Select appointment type
    await page.click('div[role="combobox"]:has-text("Checkup")')
    await page.click('li[role="option"]:has-text("Cleaning")')

    // Fill in reason
    await page.fill('textarea[name="reason"], input[label="Reason"]', 'Regular dental cleaning')

    // Click Save button
    await page.click('button:has-text("Save")')

    // Wait for dialog to close and appointment to be created
    await page.waitForTimeout(2000)

    // Verify dialog is closed
    await expect(page.locator('text=New Appointment')).not.toBeVisible()

    console.log('✓ Appointment created successfully')
  })

  test('should show validation error when patient is not selected', async ({ page }) => {
    // Click "New Appointment" button
    await page.click('button:has-text("New Appointment")')

    // Wait for dialog to open
    await page.waitForSelector('text=New Appointment', { timeout: 5000 })

    // Don't select patient or dentist, just click Save
    await page.click('button:has-text("Save")')

    // Wait to see if error appears
    await page.waitForTimeout(2000)

    // Dialog should still be visible because form is invalid
    await expect(page.locator('text=New Appointment')).toBeVisible()

    console.log('✓ Validation works - cannot save without patient')
  })

  test('should be able to cancel appointment creation', async ({ page }) => {
    // Click "New Appointment" button
    await page.click('button:has-text("New Appointment")')

    // Wait for dialog to open
    await page.waitForSelector('text=New Appointment', { timeout: 5000 })

    // Click Cancel button
    await page.click('button:has-text("Cancel")')

    // Wait for dialog to close
    await page.waitForTimeout(1000)

    // Verify dialog is closed
    await expect(page.locator('text=New Appointment')).not.toBeVisible()

    console.log('✓ Can cancel appointment creation')
  })
})
