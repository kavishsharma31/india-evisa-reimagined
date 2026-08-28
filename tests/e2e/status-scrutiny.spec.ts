import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fillMedicalApplication, fillTouristApplication } from './application-inputs.js'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Persisted A07 evidence is missing ${key}.`)
  }
  return value
}

async function openFreshApp(page: Page) {
  await page.goto('/?demo=1')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.goto('/?demo=1')
}

async function reachConfirmedPayment(
  page: Page,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await page.getByText(scenario, { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue application' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await (scenario === 'Medical treatment'
    ? fillMedicalApplication(page)
    : fillTouristApplication(page))
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  const documentNames = [
    'Recent photograph',
    'Passport bio page',
    ...(scenario === 'Medical treatment' ? ['Hospital letter'] : []),
  ]
  for (const documentName of documentNames) {
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name: documentName }),
    })
    await card.getByRole('button', { name: 'Check document' }).click()
  }
  await page.getByRole('link', { name: 'Review application' }).click()
  await page.getByRole('checkbox', {
    name: 'I confirm these application details are complete and ready to submit.',
  }).check()
  await page.getByRole('button', { name: 'Submit application' }).click()
  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  await page.getByRole('button', { name: 'Check payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
}

async function reachStatus(
  page: Page,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await reachConfirmedPayment(page, scenario)
  await page.getByRole('link', { name: 'Continue to status' }).click()
  await expect(page.getByRole('heading', { name: 'Track your application' })).toBeVisible()
  await page.getByRole('button', { name: 'Begin review' }).click()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
}

async function loadStatusEvidence(page: Page) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A07 persistence evidence.')
  }
  const envelope: unknown = JSON.parse(raw)
  if (!isRecord(envelope)) {
    throw new Error('Persisted A07 envelope is malformed.')
  }
  const persistedCase = requiredArray(envelope, 'cases')[0]
  if (
    !isRecord(persistedCase) ||
    !isRecord(persistedCase.application) ||
    !isRecord(persistedCase.payment) ||
    !isRecord(persistedCase.scrutiny) ||
    !isRecord(persistedCase.eta)
  ) {
    throw new Error('Persisted A07 Case aggregates are malformed.')
  }
  const documents = requiredArray(persistedCase, 'documents')
  const activeDocumentStates = documents.map((document) => {
    if (!isRecord(document)) {
      return 'UNKNOWN'
    }
    const activeVersionId = document.activeVersionId
    const version = requiredArray(document, 'versions').find(
      (candidate) => isRecord(candidate) && candidate.documentVersionId === activeVersionId,
    )
    return isRecord(version) && typeof version.state === 'string' ? version.state : 'UNKNOWN'
  })
  const eventTypes = requiredArray(persistedCase, 'auditEvents').flatMap((event) =>
    isRecord(event) && typeof event.eventType === 'string' ? [event.eventType] : [],
  )
  return {
    raw,
    revision: typeof persistedCase.revision === 'number' ? persistedCase.revision : -1,
    applicationState: persistedCase.application.state,
    paymentState: persistedCase.payment.state,
    scrutinyState: persistedCase.scrutiny.state,
    etaState: persistedCase.eta.state,
    activeDocumentStates,
    scrutinyQueuedCount: eventTypes.filter((type) => type === 'ScrutinyQueued').length,
    scrutinyStartedCount: eventTypes.filter((type) => type === 'ScrutinyStarted').length,
    documentReviewStartedCount: eventTypes.filter((type) => type === 'DocumentReviewStarted').length,
  }
}

test('Medical A07 enters one legal scrutiny review and projects an explicit no-action status', async ({ page }) => {
  const browserErrors: string[] = []
  const requestUrls: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  page.on('request', (request) => requestUrls.push(request.url()))

  await openFreshApp(page)
  await reachStatus(page)
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await expect(page.getByText('Your application is currently under review. No action is required.')).toBeVisible()
  await expect(page.getByText('Nothing needed from you')).toBeVisible()
  await expect(page.getByText(/review is complete or if we need more information/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Replace hospital letter' })).toHaveCount(0)
  const evidence = await loadStatusEvidence(page)
  expect(evidence.applicationState).toBe('LOCKED')
  expect(evidence.paymentState).toBe('CONFIRMED')
  expect(evidence.scrutinyState).toBe('IN_REVIEW')
  expect(evidence.etaState).toBe('NOT_READY')
  expect(evidence.activeDocumentStates).toEqual(['UNDER_REVIEW', 'UNDER_REVIEW', 'UNDER_REVIEW'])
  expect(evidence.scrutinyQueuedCount).toBe(1)
  expect(evidence.scrutinyStartedCount).toBe(1)
  expect(evidence.documentReviewStartedCount).toBe(3)
  expect(browserErrors).toEqual([])
  expect(requestUrls.every((url) => url.startsWith('http://127.0.0.1:4173'))).toBe(true)
})

test('A07 reload is byte-stable and does not queue or start scrutiny again', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page)
  const before = await loadStatusEvidence(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await expect(page.getByText(/review is complete or if we need more information/)).toBeVisible()
  expect(await loadStatusEvidence(page)).toEqual(before)
})

test('Tourist reuses the unified A07 status and reviews two submitted documents', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page, 'Tourism')

  await expect(page.getByText('Tourism')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  const evidence = await loadStatusEvidence(page)
  expect(evidence.activeDocumentStates).toEqual(['UNDER_REVIEW', 'UNDER_REVIEW'])
  expect(evidence.documentReviewStartedCount).toBe(2)
})

test('A07 uses the mobile width well and remains axe-clean at 360x800', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openFreshApp(page)
  await reachStatus(page)

  const statusPage = page.getByRole('region', { name: 'Track your application' })
  const currentStatus = page.getByRole('region', { name: 'Under review' })
  const statusBox = await statusPage.boundingBox()
  const currentBox = await currentStatus.boundingBox()
  expect(statusBox?.width ?? 0).toBeGreaterThan(310)
  expect(currentBox?.width ?? 0).toBeGreaterThan(310)
  expect(Math.abs((statusBox?.width ?? 0) - (currentBox?.width ?? 0))).toBeLessThan(2)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})
