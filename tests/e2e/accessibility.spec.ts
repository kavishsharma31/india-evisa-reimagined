import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

async function openFreshApp(page: Page) {
  await page.goto('/')
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

  await expectNoAxeViolations(page)
})

async function answerMedicalApplication(page: Page) {
  await page.getByLabel(/Choose the synthetic policy cohort/).selectOption('SYN-POLICY-COHORT-A')
  await page.getByLabel(/Choose the synthetic passport class/).selectOption('SYNTHETIC_STANDARD_PASSPORT')
  await page.getByLabel(/Choose the fictional planned arrival date/).selectOption('2099-04-14')
  await page.getByLabel(/Confirm the synthetic Medical treatment intent/).selectOption('SYNTHETIC_MEDICAL_TREATMENT')
  await page.getByLabel(/Choose the fictional proposed admission date/).selectOption('2099-04-18')
  await page.getByRole('radio', { name: 'Yes' }).check()
}

test('A02 and A03 states have no automatically detectable accessibility violations', async ({ page }) => {
  await openFreshApp(page)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(page.getByRole('heading', { name: 'Your synthetic application has been created' })).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await expectNoAxeViolations(page)

  await answerMedicalApplication(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Application details saved' })).toBeVisible()

  await expectNoAxeViolations(page)
})
