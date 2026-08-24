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

test('A02 ready and reload-resume states have no automatically detectable accessibility violations', async ({ page }) => {
  await openFreshApp(page)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(page.getByRole('heading', { name: 'Your synthetic application has been created' })).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Your application is ready to continue' })).toBeVisible()
  await expectNoAxeViolations(page)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Continue your application' })).toBeVisible()

  await expectNoAxeViolations(page)
})
