import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Persisted A08 evidence is missing ${key}.`)
  }
  return value
}

async function openFreshApp(page: Page) {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.goto('/')
}

async function reachStatus(
  page: Page,
  scenario: 'Medical treatment' | 'Tourism' = 'Medical treatment',
) {
  await page.getByText(scenario, { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue application' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel('Country of nationality').selectOption('SYN-POLICY-COHORT-A')
  await page.getByLabel('Passport type').selectOption('SYNTHETIC_STANDARD_PASSPORT')
  await page.getByLabel('Expected date of arrival').selectOption(
    scenario === 'Medical treatment' ? '2099-04-14' : '2099-05-10',
  )
  await page.getByLabel(scenario === 'Medical treatment' ? 'Purpose of medical visit' : 'Purpose of visit').selectOption(
    scenario === 'Medical treatment' ? 'SYNTHETIC_MEDICAL_TREATMENT' : 'SYNTHETIC_TOURISM',
  )
  if (scenario === 'Medical treatment') {
    await page.getByLabel('Proposed hospital admission date').selectOption('2099-04-18')
    await page.getByRole('radio', { name: 'Yes' }).check()
  } else {
    await page.getByLabel('Expected date of departure').selectOption('2099-05-17')
  }
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
  await page.getByRole('link', { name: 'Continue to status' }).click()
  await page.getByRole('button', { name: 'Begin review' }).click()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
}

async function triggerMedicalCorrection(page: Page) {
  await page.getByText('Review update').click()
  await page.getByRole('button', { name: 'Check application status' }).click()
  await expect(page.getByRole('heading', { name: 'Action required' })).toBeVisible()
}

async function loadCorrectionEvidence(page: Page) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A08 persistence evidence.')
  }
  const envelope: unknown = JSON.parse(raw)
  if (!isRecord(envelope)) {
    throw new Error('Persisted A08 envelope is malformed.')
  }
  const persistedCase = requiredArray(envelope, 'cases')[0]
  if (!isRecord(persistedCase) || !isRecord(persistedCase.scrutiny)) {
    throw new Error('Persisted A08 Case aggregates are malformed.')
  }
  const hospital = requiredArray(persistedCase, 'documents').find(
    (document) => isRecord(document) && document.requirementId === 'REQ-HOSPITAL-LETTER-1',
  )
  if (!isRecord(hospital)) {
    throw new Error('Persisted A08 hospital-letter aggregate is missing.')
  }
  const versions = requiredArray(hospital, 'versions').map((version) => {
    if (!isRecord(version)) {
      return { id: 'UNKNOWN', state: 'UNKNOWN' }
    }
    return {
      id: typeof version.documentVersionId === 'string' ? version.documentVersionId : 'UNKNOWN',
      state: typeof version.state === 'string' ? version.state : 'UNKNOWN',
    }
  })
  const events = requiredArray(persistedCase, 'auditEvents').flatMap((event) => {
    if (!isRecord(event) || typeof event.eventType !== 'string') {
      return []
    }
    const payload = isRecord(event.payload) ? event.payload : {}
    return [{ type: event.eventType, outcomeCode: payload.outcomeCode }]
  })
  return {
    raw,
    revision: persistedCase.revision,
    scrutinyState: persistedCase.scrutiny.state,
    activeVersionId: hospital.activeVersionId,
    versions,
    correctionReasonCount: events.filter(
      ({ outcomeCode }) =>
        outcomeCode === 'DOC_HOSPITAL_ADMISSION_DATE_UNCLEAR_SYNTHETIC',
    ).length,
    actionRequiredCount: events.filter(({ type }) => type === 'ScrutinyActionRequired').length,
    reuploadCount: events.filter(({ type }) => type === 'DocumentReuploadRequested').length,
    resubmittedCount: events.filter(({ type }) => type === 'ScrutinyResubmitted').length,
    resumedCount: events.filter(({ type }) => type === 'ScrutinyResumed').length,
  }
}

test('Medical A08 preserves V1, prepares only V2, and resumes unified no-action status', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page)
  await triggerMedicalCorrection(page)

  await expect(page.getByText('Your hospital letter needs one correction.')).toBeVisible()
  await expect(page.getByText(/admission date on the hospital letter/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Replace hospital letter' })).toHaveCount(1)
  const requested = await loadCorrectionEvidence(page)
  expect(requested.scrutinyState).toBe('ACTION_REQUIRED')
  expect(requested.versions.map(({ state }) => state)).toEqual(['REUPLOAD_REQUESTED'])
  expect(requested.correctionReasonCount).toBe(2)

  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  await expect(page.getByRole('heading', { name: 'Replace your hospital letter' })).toBeVisible()
  await expect(page.getByText('Corrected hospital letter')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Use corrected letter' })).toBeVisible()
  await page.getByRole('button', { name: 'Use corrected letter' }).click()
  await expect(page.getByText('Correction ready')).toBeVisible()
  const ready = await loadCorrectionEvidence(page)
  expect(ready.versions.map(({ state }) => state)).toEqual(['SUPERSEDED', 'PREFLIGHT_PASSED'])

  await page.getByRole('button', { name: 'Submit correction' }).click()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await expect(page.getByText('Nothing needed from you')).toBeVisible()
  await expect(page.getByText(/review is complete or if we need more information/)).toBeVisible()
  await expect(page.getByText('Review update')).toHaveCount(1)
  const resumed = await loadCorrectionEvidence(page)
  expect(resumed.scrutinyState).toBe('IN_REVIEW')
  expect(resumed.versions.map(({ state }) => state)).toEqual(['SUPERSEDED', 'UNDER_REVIEW'])
  expect(resumed.actionRequiredCount).toBe(1)
  expect(resumed.reuploadCount).toBe(1)
  expect(resumed.resubmittedCount).toBe(1)
  expect(resumed.resumedCount).toBe(1)
})

test('A08 reloads action-required, V2-ready, and resumed states without mutation', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page)
  await triggerMedicalCorrection(page)
  const actionRequired = await loadCorrectionEvidence(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Action required' })).toBeVisible()
  expect(await loadCorrectionEvidence(page)).toEqual(actionRequired)

  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  await page.getByRole('button', { name: 'Use corrected letter' }).click()
  const ready = await loadCorrectionEvidence(page)
  await page.reload()
  await expect(page.getByText('Correction ready')).toBeVisible()
  expect(await loadCorrectionEvidence(page)).toEqual(ready)

  await page.getByRole('button', { name: 'Submit correction' }).click()
  const resumed = await loadCorrectionEvidence(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  expect(await loadCorrectionEvidence(page)).toEqual(resumed)
})

test('Tourist remains in the ordinary A07 no-action status without Medical correction controls', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page, 'Tourism')

  await expect(page.getByText('Tourism')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await expect(page.getByText('Nothing needed from you')).toBeVisible()
  await expect(page.getByText('Review update')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Replace hospital letter' })).toHaveCount(0)
})

test('A08 action, correction, ready, and resumed states use the mobile width and remain axe-clean', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openFreshApp(page)
  await reachStatus(page)
  await triggerMedicalCorrection(page)

  const statusPage = page.getByRole('region', { name: 'Track your application' })
  const actionPanel = page.getByRole('region', { name: 'Action required' })
  expect((await statusPage.boundingBox())?.width ?? 0).toBeGreaterThan(310)
  expect((await actionPanel.boundingBox())?.width ?? 0).toBeGreaterThan(310)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  const correctionPage = page.getByRole('region', { name: 'Replace your hospital letter' })
  const replacementButton = page.getByRole('button', { name: 'Use corrected letter' })
  const correctionPageWidth = (await correctionPage.boundingBox())?.width ?? 0
  const replacementPanelWidth = (await replacementButton.locator('..').boundingBox())?.width ?? 0
  const replacementButtonWidth = (await replacementButton.boundingBox())?.width ?? 0
  expect(correctionPageWidth).toBeGreaterThan(310)
  expect(replacementButtonWidth).toBeGreaterThan(replacementPanelWidth - 35)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  await replacementButton.click()
  await expect(page.getByText('Correction ready')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Submit correction' }).click()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})
