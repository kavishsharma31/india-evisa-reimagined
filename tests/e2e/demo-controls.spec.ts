import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'
const UNRELATED_STORAGE_KEY = 'd01:unrelated-preference'

type PersistenceEvidence = Readonly<{
  raw: string
  activeCaseId: string | null
  caseCount: number
  scenarioId: string | null
  eventCount: number
  uniqueEventCount: number
  latestAnswers: Readonly<Record<string, unknown>>
}>

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function openFreshDemo(page: Page) {
  await page.goto('/?demo=1')
  await page.evaluate(
    ({ projectKey, unrelatedKey }) => {
      localStorage.removeItem(projectKey)
      localStorage.setItem(unrelatedKey, 'keep-me')
    },
    { projectKey: P0_STORAGE_KEY, unrelatedKey: UNRELATED_STORAGE_KEY },
  )
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toBeVisible()
}

async function loadPersistenceEvidence(page: Page): Promise<PersistenceEvidence> {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected D01 to persist a validated envelope.')
  }
  const envelope: unknown = JSON.parse(raw)
  if (!isRecord(envelope) || !Array.isArray(envelope.cases)) {
    throw new Error('D01 persistence evidence is malformed.')
  }
  const persistedCase = envelope.cases[0]
  if (persistedCase === undefined) {
    return {
      raw,
      activeCaseId: envelope.activeCaseId === null ? null : String(envelope.activeCaseId),
      caseCount: 0,
      scenarioId: null,
      eventCount: 0,
      uniqueEventCount: 0,
      latestAnswers: {},
    }
  }
  if (!isRecord(persistedCase) || !Array.isArray(persistedCase.auditEvents)) {
    throw new Error('D01 Case evidence is malformed.')
  }
  const eventIds = persistedCase.auditEvents.flatMap((event) =>
    isRecord(event) && typeof event.eventId === 'string' ? [event.eventId] : [],
  )
  const application = isRecord(persistedCase.application) ? persistedCase.application : {}
  const snapshots = Array.isArray(application.draftSnapshots) ? application.draftSnapshots : []
  const latestSnapshot = snapshots.at(-1)
  const latestAnswers = isRecord(latestSnapshot) && isRecord(latestSnapshot.answers)
    ? latestSnapshot.answers
    : {}
  return {
    raw,
    activeCaseId: envelope.activeCaseId === null ? null : String(envelope.activeCaseId),
    caseCount: envelope.cases.length,
    scenarioId: typeof persistedCase.scenarioId === 'string' ? persistedCase.scenarioId : null,
    eventCount: eventIds.length,
    uniqueEventCount: new Set(eventIds).size,
    latestAnswers,
  }
}

async function chooseSeed(page: Page, seedId: string) {
  await page.getByRole('combobox', { name: 'Canonical seed' }).selectOption(seedId)
  await expect(
    page.getByRole('region', { name: 'Demo controls' }).getByRole('status'),
  ).toContainText(`Loaded ${seedId}.`)
  const evidence = await loadPersistenceEvidence(page)
  expect(evidence.caseCount).toBe(1)
  expect(evidence.eventCount).toBe(evidence.uniqueEventCount)
  return evidence
}

test('D01 controls are absent from the normal applicant URL', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toHaveCount(0)
  await expect(page.getByText('Demo-only controls', { exact: true })).toHaveCount(0)
})

test('D01 loads all seven canonical seeds, switches byte-stably, reloads, and resets safely', async ({ page }) => {
  await openFreshDemo(page)
  const seedSelect = page.getByRole('combobox', { name: 'Canonical seed' })
  const seedValues = await seedSelect.getByRole('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value).filter((value) => value.startsWith('SEED-')),
  )
  expect(seedValues).toEqual([
    'SEED-MEDICAL-START',
    'SEED-TOURIST-START',
    'SEED-MEDICAL-INTERRUPTED-DRAFT',
    'SEED-MEDICAL-DOCUMENT-DEFECT',
    'SEED-MEDICAL-AMBIGUOUS-PAYMENT',
    'SEED-MEDICAL-REUPLOAD-REQUESTED',
    'SEED-MEDICAL-STATUS-RECOVERY',
  ])

  expect((await chooseSeed(page, 'SEED-MEDICAL-START')).scenarioId).toBe('SYN-MEDICAL-001')
  await expect(page.getByRole('heading', { name: 'Continue your application' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start application' })).toBeVisible()

  expect((await chooseSeed(page, 'SEED-TOURIST-START')).scenarioId).toBe('SYN-TOURIST-001')
  await expect(page.getByRole('heading', { name: 'Continue your application' })).toBeVisible()
  await expect(page.getByText('Tourism', { exact: true })).toBeVisible()

  const interruptedDraft = await chooseSeed(page, 'SEED-MEDICAL-INTERRUPTED-DRAFT')
  await expect(page.getByRole('heading', { name: 'Prepare your demo documents' })).toBeVisible()
  expect(interruptedDraft.latestAnswers).toMatchObject({
    'Q-SHARED-POLICY-COHORT': 'SYN-POLICY-COHORT-A',
    'Q-MEDICAL-ADMISSION-DATE': '2099-04-18',
  })

  await chooseSeed(page, 'SEED-MEDICAL-DOCUMENT-DEFECT')
  await expect(page.getByRole('heading', { name: 'Prepare your demo documents' })).toBeVisible()
  await expect(page.getByText(/passport page is too unclear to check/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose a replacement to retry' })).toBeVisible()

  await chooseSeed(page, 'SEED-MEDICAL-AMBIGUOUS-PAYMENT')
  await expect(page.getByRole('heading', { name: 'Complete the demo payment' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mock payment is pending. No real payment was made.' })).toBeVisible()

  await chooseSeed(page, 'SEED-MEDICAL-REUPLOAD-REQUESTED')
  await expect(page.getByRole('heading', { name: 'Action required' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Replace hospital letter' })).toBeVisible()

  const firstStatusSeed = await chooseSeed(page, 'SEED-MEDICAL-STATUS-RECOVERY')
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await expect(page.getByText('Nothing needed from you', { exact: true })).toBeVisible()

  await chooseSeed(page, 'SEED-TOURIST-START')
  const repeatedStatusSeed = await chooseSeed(page, 'SEED-MEDICAL-STATUS-RECOVERY')
  expect(repeatedStatusSeed.raw).toBe(firstStatusSeed.raw)
  expect(repeatedStatusSeed.caseCount).toBe(1)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  expect((await loadPersistenceEvidence(page)).raw).toBe(firstStatusSeed.raw)
  expect(await page.evaluate((key) => localStorage.getItem(key), UNRELATED_STORAGE_KEY)).toBe('keep-me')

  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Demo controls' }).getByRole('status'),
  ).toContainText('Reset to the canonical clean demo state.')
  const reset = await loadPersistenceEvidence(page)
  expect(reset.activeCaseId).toBeNull()
  expect(reset.caseCount).toBe(0)
  expect(await page.evaluate((key) => localStorage.getItem(key), UNRELATED_STORAGE_KEY)).toBe('keep-me')
})

test('D01 controls remain full-width, overflow-free, keyboard-visible, and axe-clean at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 })
  await openFreshDemo(page)

  const panel = page.getByRole('region', { name: 'Demo controls' })
  const select = page.getByRole('combobox', { name: 'Canonical seed' })
  const reset = page.getByRole('button', { name: 'Reset demo' })
  const panelWidth = (await panel.boundingBox())?.width ?? 0
  expect(panelWidth).toBeGreaterThan(340)
  expect((await select.boundingBox())?.width ?? 0).toBeGreaterThan(panelWidth - 30)
  expect((await reset.boundingBox())?.width ?? 0).toBeGreaterThan(panelWidth - 30)
  await select.focus()
  await expect(select).toBeFocused()
  const outlineStyle = await select.evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outlineStyle).not.toBe('none')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})
