import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Persisted A05 evidence is missing ${key}.`)
  }
  return value
}

async function openFreshApp(page: Page) {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()
}

async function reachReview(
  page: Page,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await page.getByText(scenario, { exact: true }).click()
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel(/Choose the synthetic policy cohort/).selectOption('SYN-POLICY-COHORT-A')
  await page.getByLabel(/Choose the synthetic passport class/).selectOption('SYNTHETIC_STANDARD_PASSPORT')
  await page
    .getByLabel(/Choose the fictional planned arrival date/)
    .selectOption(scenario === 'Medical treatment' ? '2099-04-14' : '2099-05-10')
  await page
    .getByLabel(/Confirm the synthetic (?:Medical treatment|tourism) intent/)
    .selectOption(
      scenario === 'Medical treatment'
        ? 'SYNTHETIC_MEDICAL_TREATMENT'
        : 'SYNTHETIC_TOURISM',
    )
  if (scenario === 'Medical treatment') {
    await page.getByLabel(/Choose the fictional proposed admission date/).selectOption('2099-04-18')
    await page.getByRole('radio', { name: 'Yes' }).check()
  } else {
    await page.getByLabel(/Choose the fictional planned exit date/).selectOption('2099-05-17')
  }
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('button', { name: 'Prepare documents' }).click()
  const documentNames = [
    'Synthetic portrait',
    'Synthetic passport page',
    ...(scenario === 'Medical treatment' ? ['Synthetic hospital letter'] : []),
  ]
  for (const documentName of documentNames) {
    const documentCard = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name: documentName }),
    })
    await documentCard.getByRole('button', { name: 'Run technical check' }).click()
  }
  await page.getByRole('button', { name: 'Review application' }).click()
  await expect(page.getByRole('heading', { name: 'Review your demo application' })).toBeVisible()
}

async function loadCaseEvidence(page: Page) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A05 persistence evidence.')
  }
  const envelope: unknown = JSON.parse(raw)
  if (!isRecord(envelope)) {
    throw new Error('Persisted A05 envelope is malformed.')
  }
  const persistedCase = requiredArray(envelope, 'cases')[0]
  if (!isRecord(persistedCase)) {
    throw new Error('Persisted A05 Case is malformed.')
  }
  const application = persistedCase.application
  const policyPin = persistedCase.policyPin
  const events = requiredArray(persistedCase, 'auditEvents').map((event) => {
    if (!isRecord(event) || typeof event.eventType !== 'string') {
      throw new Error('Persisted A05 event is malformed.')
    }
    return event.eventType
  })
  const documents = requiredArray(persistedCase, 'documents').map((document) => {
    if (!isRecord(document)) {
      throw new Error('Persisted A05 document is malformed.')
    }
    const versions = requiredArray(document, 'versions')
    const activeVersion = versions.find(
      (version) => isRecord(version) && version.documentVersionId === document.activeVersionId,
    )
    return {
      requirementId: document.requirementId,
      state: isRecord(activeVersion) ? activeVersion.state : 'UNKNOWN',
      versionCount: versions.length,
    }
  })
  return {
    raw,
    caseCount: requiredArray(envelope, 'cases').length,
    revision: typeof persistedCase.revision === 'number' ? persistedCase.revision : -1,
    applicationState:
      isRecord(application) && typeof application.state === 'string'
        ? application.state
        : 'UNKNOWN',
    policyQualifiedVersion:
      isRecord(policyPin) && typeof policyPin.qualifiedVersion === 'string'
        ? policyPin.qualifiedVersion
        : 'UNKNOWN',
    events,
    documents,
  }
}

async function submitReview(page: Page) {
  await page
    .getByRole('checkbox', {
      name: 'I confirm these synthetic demo details are ready for simulated submission.',
    })
    .check()
  await page.getByRole('button', { name: 'Submit demo application' }).click()
  await expect(page.getByRole('heading', { name: 'Application submitted in demo' })).toBeVisible()
}

test('Medical A05 reviews authoritative details and reaches one locked simulated submission', async ({ page }) => {
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
  await reachReview(page)
  await expect(page.getByRole('heading', { name: 'Medical treatment' })).toBeVisible()
  await expect(page.getByText('73 SYNTHETIC_DEMO_CREDITS')).toBeVisible()
  await expect(page.getByText('SYNTHETIC — NOT PAYABLE')).toBeVisible()
  await expect(page.getByText('Ready', { exact: true })).toHaveCount(3)
  await expect(page.getByText('Confirm the synthetic Medical treatment intent.')).toBeVisible()

  await submitReview(page)
  await expect(page.getByText('Payment', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Edit application details|Edit documents/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Mock payment|Payment details/i })).toHaveCount(0)

  const evidence = await loadCaseEvidence(page)
  expect(evidence.applicationState).toBe('LOCKED')
  expect(evidence.policyQualifiedVersion).toBe('SYN-EVISA-POLICY@1.0.0')
  expect(evidence.documents.map(({ state }) => state)).toEqual([
    'SUBMITTED',
    'SUBMITTED',
    'SUBMITTED',
  ])
  expect(evidence.events.filter((event) => event === 'ApplicationSubmitted')).toHaveLength(1)
  expect(evidence.events.filter((event) => event === 'ApplicationLocked')).toHaveLength(1)
  expect(browserErrors).toEqual([])
  expect(
    requestUrls.every((url) => {
      const hostname = new URL(url).hostname
      return hostname === '127.0.0.1' || hostname === 'localhost'
    }),
  ).toBe(true)
})

test('A05 edit paths preserve the Case and refresh authoritative review values', async ({ page }) => {
  await openFreshApp(page)
  await reachReview(page)
  const before = await loadCaseEvidence(page)

  await page.getByRole('button', { name: 'Edit application details' }).click()
  await page.getByRole('radio', { name: 'No' }).check()
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('button', { name: 'Prepare documents' }).click()
  await page.getByRole('button', { name: 'Review application' }).click()
  await expect(page.getByText('No', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Edit documents' }).click()
  await expect(page.getByRole('heading', { name: 'Prepare your demo documents' })).toBeVisible()
  await page.getByRole('button', { name: 'Return to review' }).click()
  await expect(page.getByRole('heading', { name: 'Review your demo application' })).toBeVisible()

  const after = await loadCaseEvidence(page)
  expect(after.caseCount).toBe(1)
  expect(after.documents.map(({ versionCount }) => versionCount)).toEqual(
    before.documents.map(({ versionCount }) => versionCount),
  )
  expect(after.events.filter((event) => event === 'DraftCreated')).toHaveLength(1)
})

test('locked A05 reload is read-only and does not duplicate the submission sequence', async ({ page }) => {
  await openFreshApp(page)
  await reachReview(page)
  await submitReview(page)
  const before = await loadCaseEvidence(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Application submitted in demo' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Edit application details|Edit documents/ })).toHaveCount(0)
  const after = await loadCaseEvidence(page)
  expect(after.raw).toBe(before.raw)
  expect(after.revision).toBe(before.revision)
  expect(after.events.filter((event) => event === 'ApplicationSubmitted')).toHaveLength(1)
  expect(after.events.filter((event) => event === 'ApplicationLocked')).toHaveLength(1)
})

test('Tourist reuses A05 with five answers, two documents, and 41 credits', async ({ page }) => {
  await openFreshApp(page)
  await reachReview(page, 'Tourism')
  await expect(page.getByRole('heading', { name: 'Tourism' })).toBeVisible()
  await expect(page.getByText('41 SYNTHETIC_DEMO_CREDITS')).toBeVisible()
  await expect(page.getByText('Ready', { exact: true })).toHaveCount(2)
  await expect(page.getByText(/Medical treatment intent/i)).toHaveCount(0)
  await expect(page.getByText('Synthetic hospital letter')).toHaveCount(0)
  await submitReview(page)
  await expect(page.getByText('Payment', { exact: true })).toBeVisible()
})

test('A05 review and submission remain usable without horizontal overflow at 360x800', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openFreshApp(page)
  await reachReview(page)

  const reviewPanel = page.getByRole('region', { name: 'Review your demo application' })
  const feePanel = page.getByRole('region', { name: '73 SYNTHETIC_DEMO_CREDITS' })
  const confirmationPanel = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Ready for simulated submission?' }),
  })
  const submitButton = page.getByRole('button', { name: 'Submit demo application' })
  const checkbox = page.getByRole('checkbox', {
    name: 'I confirm these synthetic demo details are ready for simulated submission.',
  })

  const [reviewBox, feeBox, confirmationBox, submitBox] = await Promise.all([
    reviewPanel.boundingBox(),
    feePanel.boundingBox(),
    confirmationPanel.boundingBox(),
    submitButton.boundingBox(),
  ])
  expect(reviewBox).not.toBeNull()
  expect(feeBox).not.toBeNull()
  expect(confirmationBox).not.toBeNull()
  expect(submitBox).not.toBeNull()
  expect(feeBox?.width ?? 0).toBeGreaterThanOrEqual((reviewBox?.width ?? 0) * 0.98)
  expect(confirmationBox?.width ?? 0).toBeGreaterThanOrEqual(
    (reviewBox?.width ?? 0) * 0.98,
  )
  expect(submitBox?.width ?? 0).toBeGreaterThanOrEqual(
    (confirmationBox?.width ?? 0) * 0.84,
  )

  const before = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    checkboxHeight: document
      .getElementById('demo-submission-confirmation')
      ?.closest('label')
      ?.getBoundingClientRect().height ?? 0,
    buttonHeight: document
      .querySelector<HTMLButtonElement>('button[type="submit"]')
      ?.getBoundingClientRect().height ?? 0,
  }))
  expect(before.scrollWidth).toBeLessThanOrEqual(before.clientWidth)
  expect(before.checkboxHeight).toBeGreaterThanOrEqual(44)
  expect(before.buttonHeight).toBeGreaterThanOrEqual(44)

  await page
    .getByText(
      'I confirm these synthetic demo details are ready for simulated submission.',
      { exact: true },
    )
    .click()
  await expect(checkbox).toBeChecked()
  await expect(submitButton).toBeEnabled()
  await submitButton.click()
  await expect(page.getByRole('heading', { name: 'Application submitted in demo' })).toBeVisible()
  const after = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(after.scrollWidth).toBeLessThanOrEqual(after.clientWidth)
})
