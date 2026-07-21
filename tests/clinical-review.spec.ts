import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test('persisted tenant-safe FHIR intake and independent escalation journey', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  await login(page, 'receptionist@dentalclinic.com')

  const intake = await page.request.post('/api/clinical/intake', { data: {
    fhirPatient: {
      resourceType: 'Patient',
      id: `patient-${suffix}`,
      meta: { versionId: '1' },
      identifier: [{ system: 'https://e2e.invalid/mrn', value: `MRN-${suffix}` }],
      name: [{ family: 'Safety', given: ['Case'] }],
      birthDate: '1980-01-01',
      telecom: [{ system: 'phone', value: '555-0100' }],
    },
    sourceSystem: 'https://e2e.invalid/fhir',
    consent: {
      scope: 'clinical-care',
      source: `synthetic-e2e-consent-${suffix}`,
      effectiveAt: new Date().toISOString(),
      provenance: { testRun: suffix },
    },
    clinicalContext: {},
    proposedTreatment: 'Evaluate patient before routine cleaning.',
    evidence: [{ source: 'synthetic-guideline', reference: `evidence-${suffix}`, retrievedAt: new Date().toISOString() }],
    provenance: { authoringSystem: 'Playwright E2E', modelVersion: 'none', generatedAt: new Date().toISOString() },
  } })
  expect(intake.status()).toBe(201)
  const created = await intake.json()
  expect(created.riskLevel).toBe('HIGH')
  expect(created.status).toBe('PENDING_REVIEW')

  const receptionistQueue = await page.request.get('/api/clinical/reviews')
  const receptionistRows = await receptionistQueue.json()
  const receptionistCase = receptionistRows.find((row: { id: string }) => row.id === created.reviewId)
  expect(receptionistCase.patient.firstName).toBe('Restricted')
  expect(receptionistCase.recommendation).toBeUndefined()

  await page.context().clearCookies()
  await login(page, 'dentist@isolation.invalid')
  const isolatedQueue = await page.request.get('/api/clinical/reviews')
  expect((await isolatedQueue.json()).some((row: { id: string }) => row.id === created.reviewId)).toBe(false)
  const crossTenantDecision = await page.request.post(`/api/clinical/reviews/${created.reviewId}/decision`, { data: { decision: 'ESCALATED', rationale: 'Cross-tenant attempt must not find this review.' } })
  expect(crossTenantDecision.status()).toBe(404)

  await page.context().clearCookies()
  await login(page, 'dr.smith@dentalclinic.com')
  const prohibitedApproval = await page.request.post(`/api/clinical/reviews/${created.reviewId}/decision`, { data: { decision: 'APPROVED', rationale: 'Attempting to approve a missing-data high-risk case.' } })
  expect(prohibitedApproval.status()).toBe(403)
  const escalation = await page.request.post(`/api/clinical/reviews/${created.reviewId}/decision`, { data: { decision: 'ESCALATED', rationale: 'Medication and allergy status must be obtained before treatment.' } })
  expect(escalation.status()).toBe(200)
  expect((await escalation.json()).status).toBe('ESCALATED')
  const secondDecision = await page.request.post(`/api/clinical/reviews/${created.reviewId}/decision`, { data: { decision: 'REJECTED', rationale: 'A second final decision must not overwrite the first.' } })
  expect(secondDecision.status()).toBe(409)
})
