import { expect, test, type Page } from '@playwright/test'
import { fillMedicalApplication, fillTouristApplication, futureDate } from './application-inputs.js'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'
const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — NO REAL APPLICATIONS OR PAYMENTS'

type SnapshotEvidence = Readonly<{
  currentStep: string
  answers: Readonly<Record<string, string>>
}>

type ApplicationEvidence = Readonly<{
  raw: string
  caseCount: number
  caseId: string
  scenarioId: string
  policyQualifiedVersion: string
  revision: number
  applicationState: string
  snapshots: readonly SnapshotEvidence[]
  eventTypes: readonly string[]
}>

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredRecord(record: Readonly<Record<string, unknown>>, key: string) {
  const value = record[key]
  if (!isRecord(value)) {
    throw new Error(`Persisted A03 evidence is missing ${key}.`)
  }
  return value
}

function requiredString(record: Readonly<Record<string, unknown>>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new Error(`Persisted A03 evidence is missing ${key}.`)
  }
  return value
}

function requiredArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Persisted A03 evidence is missing ${key}.`)
  }
  return value
}

async function openFreshApp(page: Page) {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeVisible()
}

async function startApplication(page: Page, scenario: 'Medical treatment' | 'Tourism') {
  await page.getByText(scenario, { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue application' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
}

async function expectSharedApplicantShell(page: Page) {
  await expect(page.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeVisible()
  await expect(page.getByText('EV', { exact: true })).toBeVisible()
  await expect(page.getByText('e-Visa service', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'India e-Visa Reimagined' })).toBeVisible()
}

async function loadApplicationEvidence(page: Page): Promise<ApplicationEvidence> {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A03 to persist a synthetic envelope.')
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) {
    throw new Error('Persisted A03 envelope is malformed.')
  }
  const cases = requiredArray(parsed, 'cases')
  const firstCase = cases[0]
  if (!isRecord(firstCase)) {
    throw new Error('Persisted A03 Case is malformed.')
  }
  const application = requiredRecord(firstCase, 'application')
  const policyPin = requiredRecord(firstCase, 'policyPin')
  const snapshots = requiredArray(application, 'draftSnapshots').map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error('Persisted A03 snapshot is malformed.')
    }
    const answerCandidate = requiredRecord(candidate, 'answers')
    const answers: Record<string, string> = {}
    for (const [key, value] of Object.entries(answerCandidate)) {
      if (typeof value !== 'string') {
        throw new Error('Persisted A03 answer is malformed.')
      }
      answers[key] = value
    }
    return {
      currentStep: requiredString(candidate, 'currentStep'),
      answers,
    }
  })
  const eventTypes = requiredArray(firstCase, 'auditEvents').map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error('Persisted A03 event is malformed.')
    }
    return requiredString(candidate, 'eventType')
  })

  return {
    raw,
    caseCount: cases.length,
    caseId: requiredString(firstCase, 'caseId'),
    scenarioId: requiredString(firstCase, 'scenarioId'),
    policyQualifiedVersion: requiredString(policyPin, 'qualifiedVersion'),
    revision: typeof firstCase.revision === 'number' ? firstCase.revision : -1,
    applicationState: requiredString(application, 'state'),
    snapshots,
    eventTypes,
  }
}

test('Medical A03 autosaves controlled answers and ends at the Documents handoff', async ({ page }) => {
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
  await startApplication(page, 'Medical treatment')
  await expectSharedApplicantShell(page)
  await expect(page.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeInViewport()
  await expect(page.getByText('Proposed hospital admission date', { exact: true })).toBeVisible()
  await expect(page.getByText('Will a medical attendant travel with you?', { exact: true })).toBeVisible()
  await fillMedicalApplication(page)
  await expect(page.getByText('Saved in this browser', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to documents' }).click()

  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()
  await expectSharedApplicantShell(page)
  await expect(page.getByRole('link', { name: 'Prepare documents' })).toBeVisible()
  const evidence = await loadApplicationEvidence(page)
  expect(evidence).toMatchObject({
    caseCount: 1,
    caseId: 'SYN-CASE-MED-001',
    scenarioId: 'SYN-MEDICAL-001',
    policyQualifiedVersion: 'SYN-EVISA-POLICY@2.1.0',
    revision: 8,
    applicationState: 'IN_PROGRESS',
  })
  expect(evidence.snapshots).toHaveLength(6)
  expect(evidence.snapshots.at(-1)?.currentStep).toBe('DOCUMENTS')
  expect(evidence.eventTypes.filter((eventType) => eventType === 'DraftSnapshotSaved')).toHaveLength(6)
  expect(browserErrors).toEqual([])
  expect(
    requestUrls.every((url) => {
      const hostname = new URL(url).hostname
      return hostname === '127.0.0.1' || hostname === 'localhost'
    }),
  ).toBe(true)
})

test('Medical partial answers survive reload without duplicate Case or draft evidence', async ({ page }) => {
  await openFreshApp(page)
  await startApplication(page, 'Medical treatment')
  await page.getByRole('combobox', { name: /Country of nationality/ }).selectOption('NAT-UNITED-KINGDOM')
  await page.getByLabel('Passport type').selectOption('PASSPORT-ORDINARY')
  const beforeReload = await loadApplicationEvidence(page)

  await page.reload()
  const afterPageLoad = await loadApplicationEvidence(page)
  expect(afterPageLoad.raw).toBe(beforeReload.raw)
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
  await expectSharedApplicantShell(page)
  await expect(page.getByRole('combobox', { name: /Country of nationality/ })).toHaveValue('NAT-UNITED-KINGDOM')
  await expect(page.getByLabel('Passport type')).toHaveValue('PASSPORT-ORDINARY')
  await expect(page.getByLabel('Expected date of arrival')).toHaveValue('')

  const afterResume = await loadApplicationEvidence(page)
  expect(afterResume.raw).toBe(beforeReload.raw)
  expect(afterResume.caseCount).toBe(1)
  expect(afterResume.snapshots).toHaveLength(2)
  expect(afterResume.eventTypes.filter((eventType) => eventType === 'DraftCreated')).toHaveLength(1)
  await page.getByLabel('Expected date of arrival').fill(futureDate(10))
  await expect(page.getByText('Saved in this browser', { exact: true })).toBeVisible()
})

test('Tourist adapts through the same A03 renderer and completes without Medical questions', async ({ page }) => {
  await openFreshApp(page)
  await startApplication(page, 'Tourism')
  await expectSharedApplicantShell(page)

  await expect(page.getByText('Purpose of visit', { exact: true })).toBeVisible()
  await expect(page.getByText('Expected date of departure', { exact: true })).toBeVisible()
  await expect(page.getByText('Proposed hospital admission date', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Will a medical attendant travel with you?', { exact: true })).toHaveCount(0)
  await fillTouristApplication(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()

  const evidence = await loadApplicationEvidence(page)
  expect(evidence.scenarioId).toBe('SYN-TOURIST-001')
  expect(evidence.policyQualifiedVersion).toBe('SYN-EVISA-POLICY@2.1.0')
  expect(evidence.snapshots.at(-1)?.answers).not.toHaveProperty('Q-MEDICAL-ADMISSION-DATE')
})

test('required-answer validation blocks the Documents snapshot and focuses the first question', async ({ page }) => {
  await openFreshApp(page)
  await startApplication(page, 'Medical treatment')
  await page.getByRole('button', { name: 'Continue to documents' }).click()

  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await expectSharedApplicantShell(page)
  await expect(page.getByText('6 required answers need attention.', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: /Country of nationality/ })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toHaveCount(0)
  const evidence = await loadApplicationEvidence(page)
  expect(evidence.snapshots).toEqual([])
  expect(evidence.revision).toBe(2)
})

test('A03 remains usable without horizontal overflow at 360x800', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openFreshApp(page)
  await startApplication(page, 'Medical treatment')
  await page.getByRole('combobox', { name: /Country of nationality/ }).selectOption('NAT-UNITED-KINGDOM')
  await page.getByLabel('Expected date of arrival').fill(futureDate(10))
  await page.getByRole('radio', { name: 'No' }).check()

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    selectHeights: [...document.querySelectorAll('select')].map(
      (control) => control.getBoundingClientRect().height,
    ),
    radioChoiceHeights: [...document.querySelectorAll('label:has(input[type="radio"])')].map(
      (control) => control.getBoundingClientRect().height,
    ),
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
  expect(layout.selectHeights.every((height) => height >= 44)).toBe(true)
  expect(layout.radioChoiceHeights.every((height) => height >= 44)).toBe(true)
})
