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
    throw new Error(`Persisted A06 evidence is missing ${key}.`)
  }
  return value
}

async function openFreshApp(page: Page) {
  await page.goto('/?demo=1')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.goto('/?demo=1')
}

async function reachSubmittedApplication(
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
  await expect(page.getByRole('heading', { name: 'Pay visa fee' })).toBeVisible()
}

async function reachPayment(
  page: Page,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await reachSubmittedApplication(page, scenario)
  await expect(page.getByRole('heading', { name: 'Pay visa fee' })).toBeVisible()
}

async function loadPaymentEvidence(page: Page) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A06 persistence evidence.')
  }
  const envelope: unknown = JSON.parse(raw)
  if (!isRecord(envelope)) {
    throw new Error('Persisted A06 envelope is malformed.')
  }
  const persistedCase = requiredArray(envelope, 'cases')[0]
  if (!isRecord(persistedCase) || !isRecord(persistedCase.payment)) {
    throw new Error('Persisted A06 Case or payment aggregate is malformed.')
  }
  const paymentEvents = requiredArray(persistedCase, 'auditEvents').flatMap((event) =>
    isRecord(event) &&
    typeof event.eventType === 'string' &&
    event.domain === 'PAYMENT'
      ? [event.eventType]
      : [],
  )
  return {
    raw,
    caseCount: requiredArray(envelope, 'cases').length,
    applicationState:
      isRecord(persistedCase.application) && typeof persistedCase.application.state === 'string'
        ? persistedCase.application.state
        : 'UNKNOWN',
    revision: typeof persistedCase.revision === 'number' ? persistedCase.revision : -1,
    paymentState:
      typeof persistedCase.payment.state === 'string'
        ? persistedCase.payment.state
        : 'UNKNOWN',
    attemptId: persistedCase.payment.mockPaymentAttemptId,
    syntheticReference: persistedCase.payment.syntheticReference,
    paymentEvents,
  }
}

test('Medical A06 recovers one ambiguous payment to confirmed without a duplicate attempt', async ({ page }) => {
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
  await reachPayment(page)
  await expect(page.getByText('Not calculated in this prototype')).toBeVisible()
  await expect(page.getByText('No real payment will be processed in this prototype.')).toBeVisible()
  expect((await loadPaymentEvidence(page)).paymentState).toBe('NOT_STARTED')

  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  await expect(page.getByRole('heading', {
    name: 'Payment status pending',
  })).toBeVisible()
  await expect(page.getByText(
    'Do not make another payment.',
  )).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pay visa fee' })).toHaveCount(0)

  const uncertain = await loadPaymentEvidence(page)
  expect(uncertain.caseCount).toBe(1)
  expect(uncertain.applicationState).toBe('LOCKED')
  expect(uncertain.paymentState).toBe('RECONCILIATION_REQUIRED')
  expect(uncertain.attemptId).toBe('SYN-PAYMENT-ATTEMPT-MED-001')
  expect(uncertain.paymentEvents).toEqual([
    'MockPaymentInitiated',
    'MockPaymentPending',
    'PaymentReconciliationRequired',
  ])

  await page.getByRole('button', { name: 'Check payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue to status' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /scrutiny|case status/i })).toHaveCount(0)
  const confirmed = await loadPaymentEvidence(page)
  expect(confirmed.attemptId).toBe(uncertain.attemptId)
  expect(confirmed.syntheticReference).toBe(uncertain.syntheticReference)
  expect(confirmed.paymentEvents).toEqual([
    ...uncertain.paymentEvents,
    'PaymentReconciledConfirmed',
  ])
  expect(browserErrors).toEqual([])
  expect(requestUrls.every((url) => url.startsWith('http://127.0.0.1:4173'))).toBe(true)
})

test('uncertain payment reload preserves the same attempt and does not reconcile automatically', async ({ page }) => {
  await openFreshApp(page)
  await reachPayment(page)
  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  const beforeReload = await loadPaymentEvidence(page)

  await page.reload()
  await expect(page.getByRole('heading', {
    name: 'Payment status pending',
  })).toBeVisible()
  const afterReload = await loadPaymentEvidence(page)
  expect(afterReload).toEqual(beforeReload)

  await page.getByRole('button', { name: 'Check payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
})

test('confirmed payment reload is byte-stable and does not repeat reconciliation', async ({ page }) => {
  await openFreshApp(page)
  await reachPayment(page)
  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  await page.getByRole('button', { name: 'Check payment status' }).click()
  const beforeReload = await loadPaymentEvidence(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Pay visa fee|Check payment status/ })).toHaveCount(0)
  expect(await loadPaymentEvidence(page)).toEqual(beforeReload)
})

test('Tourist reuses A06 with the policy-derived 41-credit ambiguous recovery', async ({ page }) => {
  await openFreshApp(page)
  await reachPayment(page, 'Tourism')
  await expect(page.getByText('Not calculated in this prototype')).toBeVisible()
  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  await expect(page.getByText(
    'Do not make another payment.',
  )).toBeVisible()
  await page.getByRole('button', { name: 'Check payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
})

test('A06 uses the mobile width well and stays axe-clean in every payment state', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openFreshApp(page)
  await reachPayment(page)

  const paymentPage = page.getByRole('region', { name: 'Pay visa fee' })
  const summary = page.getByRole('region', { name: 'Application submitted' })
  const paymentBox = await paymentPage.boundingBox()
  const summaryBox = await summary.boundingBox()
  expect(paymentBox).not.toBeNull()
  expect(summaryBox).not.toBeNull()
  expect(paymentBox?.width ?? 0).toBeGreaterThan(310)
  expect(Math.abs((paymentBox?.width ?? 0) - (summaryBox?.width ?? 0))).toBeLessThan(2)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  const uncertainPanel = page.getByRole('region', {
    name: 'Payment status pending',
  })
  const uncertainBox = await uncertainPanel.boundingBox()
  const statusButton = page.getByRole('button', { name: 'Check payment status' })
  const buttonBox = await statusButton.boundingBox()
  expect(uncertainBox?.width ?? 0).toBeGreaterThan(310)
  expect(buttonBox?.width ?? 0).toBeGreaterThan((uncertainBox?.width ?? 0) - 55)
  expect(buttonBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await statusButton.click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBe(0)
})
