import { expect, test, type Locator, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Persisted A04 evidence is missing ${key}.`)
  }
  return value
}

async function openFreshApp(page: Page) {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()
}

async function completeA03(
  page: Page,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await page.getByText(scenario, { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
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
      scenario === 'Medical treatment' ? 'SYNTHETIC_MEDICAL_TREATMENT' : 'SYNTHETIC_TOURISM',
    )
  if (scenario === 'Medical treatment') {
    await page.getByLabel(/Choose the fictional proposed admission date/).selectOption('2099-04-18')
    await page.getByRole('radio', { name: 'Yes' }).check()
  } else {
    await page.getByLabel(/Choose the fictional planned exit date/).selectOption('2099-05-17')
  }
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await expect(page.getByRole('heading', { name: 'Prepare your demo documents' })).toBeVisible()
}

function documentCard(page: Page, name: string): Locator {
  return page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name }),
  })
}

async function checkCurrentFixture(page: Page, name: string) {
  await documentCard(page, name)
    .getByRole('button', { name: /Run technical check|Check replacement/ })
    .click()
}

async function loadDocumentEvidence(page: Page) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A04 persistence evidence.')
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) {
    throw new Error('Persisted A04 envelope is malformed.')
  }
  const persistedCase = requiredArray(parsed, 'cases')[0]
  if (!isRecord(persistedCase)) {
    throw new Error('Persisted A04 Case is malformed.')
  }
  const documents = requiredArray(persistedCase, 'documents').map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error('Persisted A04 document aggregate is malformed.')
    }
    const versions = requiredArray(candidate, 'versions').map((version) => {
      if (!isRecord(version) || typeof version.state !== 'string') {
        throw new Error('Persisted A04 document version is malformed.')
      }
      return version.state
    })
    return {
      requirementId:
        typeof candidate.requirementId === 'string' ? candidate.requirementId : 'UNKNOWN',
      versions,
    }
  })
  const events = requiredArray(persistedCase, 'auditEvents').map((candidate) => {
    if (!isRecord(candidate) || typeof candidate.eventType !== 'string') {
      throw new Error('Persisted A04 event is malformed.')
    }
    return candidate.eventType
  })
  const policyPin = persistedCase.policyPin
  return {
    raw,
    revision: typeof persistedCase.revision === 'number' ? persistedCase.revision : -1,
    caseCount: requiredArray(parsed, 'cases').length,
    policyQualifiedVersion:
      isRecord(policyPin) && typeof policyPin.qualifiedVersion === 'string'
        ? policyPin.qualifiedVersion
        : 'UNKNOWN',
    documents,
    events,
  }
}

test('Medical A04 prepares all policy-required bundled files and hands off to Review', async ({ page }) => {
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
  await completeA03(page)
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3)
  await expect(page.getByRole('option', { name: 'Bundled demo hospital letter' })).toHaveCount(1)
  await expect(page.getByText(/hospital letter V2/i)).toHaveCount(0)

  await checkCurrentFixture(page, 'Synthetic portrait')
  await checkCurrentFixture(page, 'Synthetic passport page')
  await checkCurrentFixture(page, 'Synthetic hospital letter')

  await expect(page.getByRole('heading', { name: 'Documents ready' })).toBeVisible()
  await expect(page.getByText('All required demo documents passed the local technical check.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Review Available' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Review your application/i })).toHaveCount(0)
  const evidence = await loadDocumentEvidence(page)
  expect(evidence.documents).toHaveLength(3)
  expect(evidence.policyQualifiedVersion).toBe('SYN-EVISA-POLICY@1.0.0')
  expect(browserErrors).toEqual([])
  expect(
    requestUrls.every((url) => {
      const hostname = new URL(url).hostname
      return hostname === '127.0.0.1' || hostname === 'localhost'
    }),
  ).toBe(true)
})

test('unclear passport fails locally and the clear replacement preserves version history', async ({ page }) => {
  await openFreshApp(page)
  await completeA03(page)

  const passport = documentCard(page, 'Synthetic passport page')
  await passport.getByRole('combobox', { name: 'Bundled demo file' }).selectOption(
    'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  )
  await checkCurrentFixture(page, 'Synthetic passport page')
  await expect(passport.getByText('Needs attention')).toBeVisible()
  await expect(
    passport.getByText(
      'This demo passport page is too unclear to check. Choose the clearer bundled file and try again.',
    ),
  ).toBeVisible()

  await passport.getByRole('combobox', { name: 'Bundled demo file' }).selectOption(
    'SYN-FIXTURE-PASSPORT-VALID-001',
  )
  await checkCurrentFixture(page, 'Synthetic passport page')
  await expect(passport.getByText('Ready')).toBeVisible()

  const evidence = await loadDocumentEvidence(page)
  const passportEvidence = evidence.documents.find(
    ({ requirementId }) => requirementId === 'REQ-PASSPORT-PAGE-1',
  )
  expect(passportEvidence?.versions).toEqual(['SUPERSEDED', 'PREFLIGHT_PASSED'])
  expect(evidence.events).toContain('DocumentVersionSuperseded')
})

test('prepared A04 state survives reload without another version or event', async ({ page }) => {
  await openFreshApp(page)
  await completeA03(page)
  await checkCurrentFixture(page, 'Synthetic portrait')
  const beforeReload = await loadDocumentEvidence(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Prepare your demo documents' })).toBeVisible()
  await expect(documentCard(page, 'Synthetic portrait').getByText('Ready')).toBeVisible()
  const afterReload = await loadDocumentEvidence(page)
  expect(afterReload.raw).toBe(beforeReload.raw)
  expect(afterReload.caseCount).toBe(1)
  expect(afterReload.revision).toBe(beforeReload.revision)
  expect(afterReload.events).toEqual(beforeReload.events)
})

test('Tourist reuses A04 with portrait and passport only', async ({ page }) => {
  await openFreshApp(page)
  await completeA03(page, 'Tourism')
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(2)
  await expect(page.getByRole('heading', { level: 3, name: 'Synthetic hospital letter' })).toHaveCount(0)

  await checkCurrentFixture(page, 'Synthetic portrait')
  await checkCurrentFixture(page, 'Synthetic passport page')
  await expect(page.getByRole('heading', { name: 'Documents ready' })).toBeVisible()
})

test('A04 controls remain usable without horizontal overflow at 360x800', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openFreshApp(page)
  await completeA03(page)
  const passport = documentCard(page, 'Synthetic passport page')
  await passport.getByRole('combobox', { name: 'Bundled demo file' }).selectOption(
    'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  )
  await checkCurrentFixture(page, 'Synthetic passport page')

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    selectHeights: [...document.querySelectorAll('main select')].map(
      (control) => control.getBoundingClientRect().height,
    ),
    buttonHeights: [...document.querySelectorAll('main article button')].map(
      (control) => control.getBoundingClientRect().height,
    ),
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
  expect(layout.selectHeights.every((height) => height >= 44)).toBe(true)
  expect(layout.buttonHeights.every((height) => height >= 44)).toBe(true)
  await expect(passport.getByText('Needs attention')).toBeVisible()
})
