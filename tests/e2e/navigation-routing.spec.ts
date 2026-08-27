import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'india-evisa-reimagined:p0'
const MEDICAL_CASE = 'SYN-CASE-MED-001'

async function persistedBytes(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
}

async function openFresh(page: Page, path = '/') {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.goto(path)
}

async function loadSeed(page: Page, seedId: string) {
  await openFresh(page, '/?demo=1')
  await page.getByRole('combobox', { name: 'Canonical seed' }).selectOption(seedId)
  await expect(page.getByRole('region', { name: 'Demo controls' }).getByRole('status'))
    .toContainText(`Loaded ${seedId}.`)
}

async function completeMedicalApplication(page: Page) {
  await openFresh(page)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await page.getByLabel(/Choose the synthetic policy cohort/).selectOption('SYN-POLICY-COHORT-A')
  await page.getByLabel(/Choose the synthetic passport class/).selectOption('SYNTHETIC_STANDARD_PASSPORT')
  await page.getByLabel(/Choose the fictional planned arrival date/).selectOption('2099-04-14')
  await page.getByLabel(/Confirm the synthetic Medical treatment intent/).selectOption('SYNTHETIC_MEDICAL_TREATMENT')
  await page.getByLabel(/Choose the fictional proposed admission date/).selectOption('2099-04-18')
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page.getByRole('button', { name: 'Continue to documents' }).click()
}

test('purpose routes are deep-linkable and A00/A01 use native browser history', async ({ page }) => {
  await openFresh(page)
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'What are you travelling to India for?' })).toBeVisible()

  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await expect(page).toHaveURL('/apply/medical')
  await expect(page.getByRole('heading', { name: 'Medical treatment' })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL('/')
  await page.goForward()
  await expect(page).toHaveURL('/apply/medical')

  await page.goto('/apply/tourist')
  await expect(page.getByRole('heading', { name: 'Tourism' })).toBeVisible()
  await page.goto('/apply/not-a-scenario')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'What are you travelling to India for?' })).toBeVisible()
})

test('application, documents, and review routes preserve bytes across reload and browser history', async ({ page }) => {
  await completeMedicalApplication(page)
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}`)
  const applicationBytes = await persistedBytes(page)
  await page.reload()
  expect(await persistedBytes(page)).toBe(applicationBytes)
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()

  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/documents`)
  const documentBytes = await persistedBytes(page)
  await page.reload()
  expect(await persistedBytes(page)).toBe(documentBytes)

  await page.goBack()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}`)
  await page.goForward()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/documents`)

  for (const name of ['Synthetic portrait', 'Synthetic passport page', 'Synthetic hospital letter']) {
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name }),
    })
    await card.getByRole('button', { name: 'Run technical check' }).click()
  }
  await page.getByRole('link', { name: 'Review application' }).click()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/review`)
  await page.goBack()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/documents`)
})

test('locked review and confirmed payment remain authoritative through Back, Forward, and reload', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-AMBIGUOUS-PAYMENT')
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/payment?demo=1`)
  const pendingBytes = await persistedBytes(page)
  await page.reload()
  expect(await persistedBytes(page)).toBe(pendingBytes)
  await expect(page.getByRole('button', { name: 'Start mock payment' })).toHaveCount(0)

  await page.goto(`/application/${MEDICAL_CASE}/review?demo=1`)
  await expect(page.getByRole('heading', { name: 'Application submitted in demo' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Edit application details|Edit documents/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/payment?demo=1`)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Application submitted in demo' })).toBeVisible()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Complete the demo payment' })).toBeVisible()

  await page.getByRole('button', { name: 'Check mock payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  const confirmedBytes = await persistedBytes(page)
  await page.getByRole('link', { name: 'Continue to status' }).click()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  expect(await persistedBytes(page)).toBe(confirmedBytes)
  await expect(page.getByRole('button', { name: 'Start mock payment' })).toHaveCount(0)
  await page.goForward()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
})

test('correction and ETA guards cannot grant capabilities or replay mutations', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-STATUS-RECOVERY')
  const reviewBytes = await persistedBytes(page)
  await page.goto(`/application/${MEDICAL_CASE}/correction?demo=1`)
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
  await page.goto(`/application/${MEDICAL_CASE}/eta?demo=1`)
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
  expect(await persistedBytes(page)).toBe(reviewBytes)

  await loadSeed(page, 'SEED-MEDICAL-REUPLOAD-REQUESTED')
  const actionRequiredBytes = await persistedBytes(page)
  await page.reload()
  expect(await persistedBytes(page)).toBe(actionRequiredBytes)
  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/correction?demo=1`)
  await page.goBack()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
  await page.goForward()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/correction?demo=1`)

  await page.getByRole('button', { name: 'Use corrected demo letter' }).click()
  await page.getByRole('button', { name: 'Submit correction' }).click()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
  const correctedBytes = await persistedBytes(page)
  await page.goBack()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
  expect(await persistedBytes(page)).toBe(correctedBytes)
  await expect(page.getByRole('button', { name: 'Submit correction' })).toHaveCount(0)

  await page.getByText('Demo review control').click()
  await page.getByRole('button', { name: 'Complete synthetic review' }).click()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/eta?demo=1`)
  const etaBytes = await persistedBytes(page)
  await page.reload()
  expect(await persistedBytes(page)).toBe(etaBytes)
  await page.goBack()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/status?demo=1`)
  await page.goForward()
  await expect(page).toHaveURL(`/application/${MEDICAL_CASE}/eta?demo=1`)
  expect(await persistedBytes(page)).toBe(etaBytes)
})

test('unknown cases are mutation-free and demo mode is preserved only when active', async ({ page }) => {
  await openFresh(page)
  const beforeUnknown = await persistedBytes(page)
  await page.goto('/application/UNKNOWN/documents')
  await expect(page).toHaveURL('/application/UNKNOWN/documents')
  await expect(page.getByRole('heading', { name: 'Application not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to visa purposes' })).toHaveAttribute('href', '/')
  expect(await persistedBytes(page)).toBe(beforeUnknown)
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toHaveCount(0)

  await page.goto('/?demo=1')
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await expect(page).toHaveURL('/apply/medical?demo=1')
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to visa purposes' }).click()
  await expect(page).toHaveURL('/?demo=1')

  await page.goto('/apply/medical')
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toHaveCount(0)
})
