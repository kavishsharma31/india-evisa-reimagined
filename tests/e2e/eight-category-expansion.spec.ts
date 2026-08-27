import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'india-evisa-reimagined:p0'

const NEW_SCENARIOS = [
  { name: 'Business', slug: 'business', caseId: 'SYN-CASE-BUSINESS-001', category: 'e-Business Visa', documents: ['Synthetic portrait', 'Synthetic passport page', 'Synthetic business card'] },
  { name: 'Accompanying a medical patient', slug: 'medical-attendant', caseId: 'SYN-CASE-MEDICAL-ATTENDANT-001', category: 'e-Medical Attendant Visa', documents: ['Synthetic portrait', 'Synthetic passport page'] },
  { name: 'Study', slug: 'student', caseId: 'SYN-CASE-STUDENT-001', category: 'e-Student Visa', documents: ['Synthetic portrait', 'Synthetic passport page', 'Synthetic admission letter', 'Synthetic financial-support evidence'] },
  { name: 'Joining a student family member', slug: 'family', caseId: 'SYN-CASE-FAMILY-001', category: 'e-Family Visa', documents: ['Synthetic portrait', 'Synthetic passport page'] },
  { name: 'Transit through India', slug: 'transit', caseId: 'SYN-CASE-TRANSIT-001', category: 'e-Transit Visa', documents: ['Synthetic portrait', 'Synthetic passport page', 'Synthetic confirmed journey tickets', 'Synthetic destination-entry evidence'] },
  { name: 'Entry / another eligible purpose', slug: 'miscellaneous', caseId: 'SYN-CASE-MISCELLANEOUS-001', category: 'e-Miscellaneous Visa', documents: ['Synthetic portrait', 'Synthetic passport page', 'Synthetic relationship or Indian-status evidence', 'Synthetic birth or marriage certificate'] },
] as const

async function clearAndOpen(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
}

async function persistedBytes(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
}

for (const scenario of NEW_SCENARIOS) {
  test(`${scenario.category} completes the shared normal applicant journey`, async ({ page }) => {
    await clearAndOpen(page)
    await expect(page.getByRole('radio')).toHaveCount(8)
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await page.getByText(scenario.name, { exact: true }).click()
    await page.getByRole('link', { name: 'Continue' }).click()
    await expect(page).toHaveURL(`/apply/${scenario.slug}`)
    await expect(page.getByText(scenario.category, { exact: true })).toBeVisible()

    if (scenario.slug === 'business') {
      await page.goBack()
      await expect(page).toHaveURL('/')
      await page.goForward()
      await expect(page).toHaveURL('/apply/business')
    }

    await page.getByRole('button', { name: 'Continue with this demo' }).click()
    await expect(page).toHaveURL(`/application/${scenario.caseId}`)
    await page.getByRole('button', { name: 'Start application' }).click()

    const selects = page.locator('form select')
    for (let index = 0; index < await selects.count(); index += 1) {
      await selects.nth(index).selectOption({ index: 1 })
    }
    await page.getByRole('button', { name: 'Continue to documents' }).click()
    await page.getByRole('link', { name: 'Prepare documents' }).click()
    await expect(page).toHaveURL(`/application/${scenario.caseId}/documents`)

    if (scenario.slug === 'student') {
      const beforeRefresh = await persistedBytes(page)
      await page.reload()
      expect(await persistedBytes(page)).toBe(beforeRefresh)
    }

    for (const documentName of scenario.documents) {
      const card = page.locator('article').filter({
        has: page.getByRole('heading', { level: 3, name: documentName }),
      })
      await expect(card).toHaveCount(1)
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
    await expect(page.getByRole('link', { name: 'Replace hospital letter' })).toHaveCount(0)
    await page.getByText('Demo review control').click()
    await page.getByRole('button', { name: 'Complete synthetic review' }).click()

    await expect(page).toHaveURL(`/application/${scenario.caseId}/eta`)
    await expect(page.getByRole('heading', { name: 'Synthetic ETA issued' })).toBeVisible()
    await expect(page.getByText(scenario.category, { exact: true })).toBeVisible()
    await expect(page.getByText('SYNTHETIC — NOT VALID. This is not a visa or travel document.')).toBeVisible()
  })
}

test('all eight purpose deep links resolve through the same route tree', async ({ page }) => {
  for (const slug of ['tourist', 'business', 'medical', 'medical-attendant', 'student', 'family', 'transit', 'miscellaneous']) {
    await page.goto(`/apply/${slug}`)
    await expect(page).toHaveURL(`/apply/${slug}`)
    await expect(page.getByRole('link', { name: 'Back to visa purposes' })).toBeVisible()
  }

  await page.goto('/apply/business')
  await expect(page.getByText(/specialised sports, GIAN, conference and film-related purposes/i)).toBeVisible()
  await page.goto('/apply/student')
  await expect(page.getByText(/medical or paramedical study can have additional official requirements/i)).toBeVisible()
  await page.goto('/apply/family')
  await expect(page.getByText(/representative Student Dependent demo path/i)).toBeVisible()
  await expect(page.getByText(/not a generic family-visiting category/i)).toBeVisible()
  await page.goto('/apply/miscellaneous')
  await expect(page.getByText(/representative relationship-based e-Entry demo/i)).toBeVisible()
  await expect(page.getByText(/not a generic legal catch-all/i)).toBeVisible()
})

test('eight-card service catalog is responsive and overflow-free at target widths', async ({ page }) => {
  for (const width of [360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 800 })
    await clearAndOpen(page)
    const cards = page.locator('label:has(input[type="radio"])')
    await expect(cards).toHaveCount(8)
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await expect(page.getByText('Recommended demo')).toHaveCount(0)
    await expect(page.getByText('Shared journey check')).toHaveCount(0)

    const first = await cards.nth(0).boundingBox()
    const second = await cards.nth(1).boundingBox()
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    if (width < 1280) {
      expect(Math.abs((first?.x ?? 0) - (second?.x ?? 0))).toBeLessThanOrEqual(1)
      if (width <= 430) {
        expect(first?.width ?? 0).toBeGreaterThan(width - 64)
      }
    } else {
      expect((second?.x ?? 0) - (first?.x ?? 0)).toBeGreaterThan(100)
      expect(Math.abs((first?.y ?? 0) - (second?.y ?? 0))).toBeLessThanOrEqual(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  }
})
