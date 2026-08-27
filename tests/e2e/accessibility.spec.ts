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
  await page.getByRole('link', { name: 'Continue' }).click()

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
  await page.getByRole('link', { name: 'Continue' }).click()
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
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await expectNoAxeViolations(page)

  const passportCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: 'Synthetic passport page' }),
  })
  await passportCard.getByRole('combobox', { name: 'Bundled demo file' }).selectOption(
    'SYN-FIXTURE-PASSPORT-UNCLEAR-001',
  )
  await passportCard.getByRole('button', { name: 'Run technical check' }).click()
  await expect(passportCard.getByText('Needs attention')).toBeVisible()
  await expectNoAxeViolations(page)

  await passportCard.getByRole('combobox', { name: 'Bundled demo file' }).selectOption(
    'SYN-FIXTURE-PASSPORT-VALID-001',
  )
  await passportCard.getByRole('button', { name: 'Check replacement' }).click()
  const portraitCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: 'Synthetic portrait' }),
  })
  const hospitalCard = page.locator('article').filter({
    has: page.getByRole('heading', { level: 3, name: 'Synthetic hospital letter' }),
  })
  await portraitCard.getByRole('button', { name: 'Run technical check' }).click()
  await hospitalCard.getByRole('button', { name: 'Run technical check' }).click()
  await expect(page.getByRole('heading', { name: 'Documents ready' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('link', { name: 'Review application' }).click()
  await expect(page.getByRole('heading', { name: 'Review your demo application' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Submit demo application' }).click()
  await expect(page.getByRole('heading', { name: 'Complete the demo payment' })).toBeVisible()
  await expectNoAxeViolations(page)
})
