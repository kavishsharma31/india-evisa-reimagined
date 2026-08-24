import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION'

async function openFreshApp(page: Page) {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'What are you travelling to India for?' }),
  ).toBeVisible()
}

async function chooseMedical(page: Page) {
  await page.getByText('Medical treatment', { exact: true }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Medical treatment' })).toBeVisible()
}

async function createAndStartMedical(page: Page) {
  await chooseMedical(page)
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your synthetic application has been created' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your application is ready to continue' }),
  ).toBeVisible()
}

type StorageEvidence = Readonly<{
  raw: string
  activeCaseId: string | null
  caseCount: number
  caseId: string
  scenarioId: string
  revision: number
  applicationState: string
  eventTypes: readonly string[]
}>

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new Error(`Persisted browser evidence is missing ${key}.`)
  }
  return value
}

async function loadPersistedEvidence(page: Page): Promise<StorageEvidence> {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected the applicant flow to persist its synthetic envelope.')
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed) || !Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new Error('Persisted browser evidence has no synthetic Case.')
  }
  const firstCase: unknown = parsed.cases[0]
  if (!isRecord(firstCase) || !isRecord(firstCase.application) || !Array.isArray(firstCase.auditEvents)) {
    throw new Error('Persisted browser Case evidence is malformed.')
  }
  const eventTypes = firstCase.auditEvents.map((event: unknown) => {
    if (!isRecord(event)) {
      throw new Error('Persisted browser event evidence is malformed.')
    }
    return requiredString(event, 'eventType')
  })
  const activeCaseId = parsed.activeCaseId
  if (activeCaseId !== null && typeof activeCaseId !== 'string') {
    throw new Error('Persisted active Case evidence is malformed.')
  }

  return {
    raw,
    activeCaseId,
    caseCount: parsed.cases.length,
    caseId: requiredString(firstCase, 'caseId'),
    scenarioId: requiredString(firstCase, 'scenarioId'),
    revision: typeof firstCase.revision === 'number' ? firstCase.revision : -1,
    applicationState: requiredString(firstCase.application, 'state'),
    eventTypes,
  }
}

test('Medical fresh-start reaches the A02 ready state without external requests or console errors', async ({ page }) => {
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
  await expect(page.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeVisible()
  await chooseMedical(page)
  await expect(page.getByText('Synthetic hospital letter')).toBeVisible()
  await expect(page.getByText('73 SYNTHETIC_DEMO_CREDITS', { exact: true })).toBeVisible()
  await expect(page.getByText('SYNTHETIC — NOT PAYABLE', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your synthetic application has been created' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your application is ready to continue' }),
  ).toBeVisible()

  const state = await loadPersistedEvidence(page)
  expect(state.activeCaseId).toBe('SYN-CASE-MED-001')
  expect(state.caseCount).toBe(1)
  expect(state).toMatchObject({
    caseId: 'SYN-CASE-MED-001',
    revision: 2,
    applicationState: 'IN_PROGRESS',
  })
  expect(state.eventTypes).toEqual([
    'DraftCreated',
    'DraftWorkStarted',
  ])
  expect(browserErrors).toEqual([])
  expect(
    requestUrls.every((url) => {
      const hostname = new URL(url).hostname
      return hostname === '127.0.0.1' || hostname === 'localhost'
    }),
  ).toBe(true)
})

test('reload presents resume and preserves the same Medical case without duplicate evidence', async ({ page }) => {
  await openFreshApp(page)
  await createAndStartMedical(page)
  const beforeReload = await loadPersistedEvidence(page)

  await page.reload()

  await expect(page.getByRole('heading', { name: 'Continue your application' })).toBeVisible()
  await expect(page.getByText('Medical treatment', { exact: true })).toBeVisible()
  await expect(page.getByText('SYN-CASE-MED-001', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resume application' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your application is ready to continue' }),
  ).toBeVisible()

  const afterResume = await loadPersistedEvidence(page)
  expect(afterResume.raw).toBe(beforeReload.raw)
  expect(afterResume.caseCount).toBe(1)
  expect(afterResume.eventTypes.filter((eventType) => eventType === 'DraftCreated')).toHaveLength(1)
})

test('Tourist reuses the applicant path with Tourist policy guidance', async ({ page }) => {
  await openFreshApp(page)

  await page.getByText('Tourism', { exact: true }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Tourism' })).toBeVisible()
  await expect(page.getByText('41 SYNTHETIC_DEMO_CREDITS', { exact: true })).toBeVisible()
  await expect(page.getByText('Synthetic portrait')).toBeVisible()
  await expect(page.getByText('Synthetic passport page')).toBeVisible()
  await expect(page.getByText('Synthetic hospital letter')).toHaveCount(0)
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your synthetic application has been created' }),
  ).toBeVisible()

  const state = await loadPersistedEvidence(page)
  expect(state.caseCount).toBe(1)
  expect(state).toMatchObject({
    caseId: 'SYN-CASE-TOURIST-001',
    scenarioId: 'SYN-TOURIST-001',
  })
})
