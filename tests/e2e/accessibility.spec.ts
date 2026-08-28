import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fillMedicalApplication } from './application-inputs.js'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

async function openFreshApp(page: Page) {
  await page.goto('/?demo=1')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()
}

async function expectNoAxeViolations(page: Page) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
  expect(accessibilityScanResults.violations).toEqual([])
}

test('A00 has no automatically detectable accessibility violations', async ({ page }) => {
  await openFreshApp(page)

  await expectNoAxeViolations(page)
})

test('Medical A01 has no automatically detectable accessibility violations', async ({ page }) => {
  await openFreshApp(page)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()

  await expectNoAxeViolations(page)
})

test('A02 and A03 states have no automatically detectable accessibility violations', async ({ page }) => {
  await openFreshApp(page)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue application' }).click()
  await expect(page.getByRole('heading', { name: 'Your application has been created' })).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await expectNoAxeViolations(page)

  await fillMedicalApplication(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await expectNoAxeViolations(page)

  const passportCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: 'Passport bio page' }),
  })
  await passportCard.getByRole('combobox', { name: 'Sample document' }).selectOption(
    'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  )
  await passportCard.getByRole('button', { name: 'Check document' }).click()
  await expect(passportCard.getByText('Needs attention')).toBeVisible()
  await expectNoAxeViolations(page)

  await passportCard.getByRole('combobox', { name: 'Sample document' }).selectOption(
    'SYN-FIXTURE-PASSPORT-VALID-001',
  )
  await passportCard.getByRole('button', { name: 'Check replacement' }).click()
  const portraitCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: 'Recent photograph' }),
  })
  const hospitalCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: 'Hospital letter' }),
  })
  await portraitCard.getByRole('button', { name: 'Check document' }).click()
  await hospitalCard.getByRole('button', { name: 'Check document' }).click()
  await expect(page.getByRole('heading', { name: 'Documents ready' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('link', { name: 'Review application' }).click()
  await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByRole('heading', { name: 'Pay visa fee' })).toBeVisible()
  await expectNoAxeViolations(page)
})
