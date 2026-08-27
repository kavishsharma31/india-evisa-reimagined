import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requiredArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Persisted A09 evidence is missing ${key}.`)
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
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel(/Choose the synthetic policy cohort/).selectOption('SYN-POLICY-COHORT-A')
  await page.getByLabel(/Choose the synthetic passport class/).selectOption(
    'SYNTHETIC_STANDARD_PASSPORT',
  )
  await page.getByLabel(/Choose the fictional planned arrival date/).selectOption(
    scenario === 'Medical treatment' ? '2099-04-14' : '2099-05-10',
  )
  await page.getByLabel(/Confirm the synthetic (?:Medical treatment|tourism) intent/).selectOption(
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
  const documentNames = [
    'Synthetic portrait',
    'Synthetic passport page',
    ...(scenario === 'Medical treatment' ? ['Synthetic hospital letter'] : []),
  ]
  for (const documentName of documentNames) {
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name: documentName }),
    })
    await card.getByRole('button', { name: 'Run technical check' }).click()
  }
  await page.getByRole('link', { name: 'Review application' }).click()
  await page.getByRole('checkbox', {
    name: 'I confirm these synthetic demo details are ready for simulated submission.',
  }).check()
  await page.getByRole('button', { name: 'Submit demo application' }).click()
  await page.getByRole('button', { name: 'Start mock payment' }).click()
  await page.getByRole('button', { name: 'Check mock payment status' }).click()
  await page.getByRole('link', { name: 'Continue to status' }).click()
  await page.getByRole('button', { name: 'Begin synthetic review' }).click()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
}

async function correctMedicalHospitalLetter(page: Page) {
  await page.getByText('Demo review control').click()
  await page.getByRole('button', { name: 'Simulate hospital-letter review outcome' }).click()
  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  await page.getByRole('button', { name: 'Use corrected demo letter' }).click()
  await page.getByRole('button', { name: 'Submit correction' }).click()
  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
}

async function completeSyntheticReview(page: Page) {
  await page.getByText('Demo review control').click()
  await page.getByRole('button', { name: 'Complete synthetic review' }).click()
  await expect(page).toHaveURL(/\/application\/[^/]+\/eta(?:\?demo=1)?$/)
  await expect(page.getByRole('heading', { name: 'Synthetic ETA issued' })).toBeVisible()
}

async function loadApprovalEvidence(page: Page) {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), P0_STORAGE_KEY)
  if (raw === null) {
    throw new Error('Expected A09 persistence evidence.')
  }
  const envelope: unknown = JSON.parse(raw)
  if (!isRecord(envelope)) {
    throw new Error('Persisted A09 envelope is malformed.')
  }
  const persistedCase = requiredArray(envelope, 'cases')[0]
  if (
    !isRecord(persistedCase) ||
    !isRecord(persistedCase.scrutiny) ||
    !isRecord(persistedCase.eta)
  ) {
    throw new Error('Persisted A09 Case aggregates are malformed.')
  }
  const documents = requiredArray(persistedCase, 'documents').map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error('Persisted A09 document aggregate is malformed.')
    }
    const versions = requiredArray(candidate, 'versions').map((version) => {
      if (!isRecord(version)) {
        throw new Error('Persisted A09 document version is malformed.')
      }
      return {
        id: version.documentVersionId,
        state: version.state,
      }
    })
    const active = versions.find(({ id }) => id === candidate.activeVersionId)
    return {
      requirementId: candidate.requirementId,
      activeVersionId: candidate.activeVersionId,
      activeState: active?.state,
      versions,
    }
  })
  const eventTypes = requiredArray(persistedCase, 'auditEvents').flatMap((event) =>
    isRecord(event) && typeof event.eventType === 'string' ? [event.eventType] : [],
  )
  return {
    raw,
    revision: persistedCase.revision,
    scrutinyState: persistedCase.scrutiny.state,
    etaState: persistedCase.eta.state,
    etaReference: persistedCase.eta.syntheticEtaId,
    documents,
    acceptedCount: eventTypes.filter((type) => type === 'DocumentAccepted').length,
    approvalCount: eventTypes.filter((type) => type === 'SyntheticScrutinyApproved').length,
    etaReadyCount: eventTypes.filter((type) => type === 'SyntheticETAReadyToIssue').length,
    etaIssuedCount: eventTypes.filter((type) => type === 'SyntheticETAIssued').length,
  }
}

test('Medical A09 accepts corrected documents, approves scrutiny, and issues the synthetic ETA', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page)
  await correctMedicalHospitalLetter(page)
  await completeSyntheticReview(page)

  await expect(page.getByText(
    'SYNTHETIC — NOT VALID. This is not a visa or travel document.',
  )).toBeVisible()
  await expect(page.getByText(
    'Entry into India is decided separately at the border.',
  )).toBeVisible()
  await expect(page.getByText('SYN-ETA-MED-001')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Under review' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Action required' })).toHaveCount(0)
  const evidence = await loadApprovalEvidence(page)
  expect(evidence.scrutinyState).toBe('APPROVED')
  expect(evidence.etaState).toBe('ISSUED')
  expect(evidence.documents.map(({ activeState }) => activeState)).toEqual([
    'ACCEPTED',
    'ACCEPTED',
    'ACCEPTED',
  ])
  const hospital = evidence.documents.find(
    ({ requirementId }) => requirementId === 'REQ-HOSPITAL-LETTER-1',
  )
  expect(hospital?.versions.map(({ state }) => state)).toEqual(['SUPERSEDED', 'ACCEPTED'])
  expect(hospital?.activeVersionId).toBe(hospital?.versions[1]?.id)
  expect(evidence.acceptedCount).toBe(3)
  expect(evidence.approvalCount).toBe(1)
  expect(evidence.etaReadyCount).toBe(1)
  expect(evidence.etaIssuedCount).toBe(1)
})

test('A09 issued reload is mutation-free and returns the same deterministic ETA', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page, 'Tourism')
  await completeSyntheticReview(page)
  const issued = await loadApprovalEvidence(page)

  await page.reload()

  await expect(page.getByRole('heading', { name: 'Synthetic ETA issued' })).toBeVisible()
  await expect(page.getByText(String(issued.etaReference))).toBeVisible()
  expect(await loadApprovalEvidence(page)).toEqual(issued)
})

test('Tourist reuses the same A09 approval and ETA outcome with two accepted documents', async ({ page }) => {
  await openFreshApp(page)
  await reachStatus(page, 'Tourism')
  await completeSyntheticReview(page)

  await expect(
    page.getByRole('region', { name: 'Synthetic ETA issued' }).getByText('Tourism'),
  ).toBeVisible()
  await expect(page.getByText('SYN-ETA-TOURIST-001')).toBeVisible()
  await expect(page.getByText(
    'SYNTHETIC — NOT VALID. This is not a visa or travel document.',
  )).toBeVisible()
  const evidence = await loadApprovalEvidence(page)
  expect(evidence.documents.map(({ activeState }) => activeState)).toEqual([
    'ACCEPTED',
    'ACCEPTED',
  ])
  expect(evidence.acceptedCount).toBe(2)
  expect(evidence.approvalCount).toBe(1)
  expect(evidence.etaIssuedCount).toBe(1)
})

test('A09 issued outcome stays full-width, readable, overflow-free, and axe-clean across target viewports', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 })
  await openFreshApp(page)
  await reachStatus(page, 'Tourism')
  await completeSyntheticReview(page)

  for (const width of [360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 900 : 960 })
    const etaPanel = page.getByRole('region', { name: 'Synthetic ETA details' })
    const watermark = etaPanel.getByText('SYNTHETIC — NOT VALID', { exact: true })
    const warning = page.getByText(
      'SYNTHETIC — NOT VALID. This is not a visa or travel document.',
    )
    const etaPageWidth = (await page.getByRole('region', { name: 'Synthetic ETA issued' }).boundingBox())?.width ?? 0
    const etaWidth = (await etaPanel.boundingBox())?.width ?? 0
    expect(etaWidth).toBeGreaterThan(etaPageWidth - 2)
    await expect(watermark).toBeVisible()
    const etaBox = await etaPanel.boundingBox()
    const warningBox = await warning.boundingBox()
    expect((warningBox?.x ?? 0) + (warningBox?.width ?? 0)).toBeLessThanOrEqual(
      (etaBox?.x ?? 0) + (etaBox?.width ?? 0),
    )
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  }
})
