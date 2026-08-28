import { expect, test } from '@playwright/test'
import { fillMedicalApplication } from './application-inputs.js'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

test('Medical completes the full applicant A00 through A09 journey without seed bypasses', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toHaveCount(0)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await expect(page).toHaveURL('/apply/medical')
  await page.getByRole('button', { name: 'Continue application' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001')
  await expect(page.getByRole('heading', { name: 'Your application has been created' })).toBeVisible()
  await page.getByRole('button', { name: 'Start application' }).click()

  await fillMedicalApplication(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/documents')

  for (const documentName of [
    'Recent photograph',
    'Passport bio page',
    'Hospital letter',
  ]) {
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name: documentName }),
    })
    await card.getByRole('button', { name: 'Check document' }).click()
  }
  await page.getByRole('link', { name: 'Review application' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/review')
  await page.getByRole('checkbox', {
    name: 'I confirm these application details are complete and ready to submit.',
  }).check()
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/payment')

  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  await expect(page.getByRole('heading', { name: 'Payment status pending' })).toBeVisible()
  await page.getByRole('button', { name: 'Check payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  await page.getByRole('link', { name: 'Continue to status' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/status')
  await page.getByRole('button', { name: 'Begin review' }).click()

  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await page.getByText('Review update').click()
  await page.getByRole('button', { name: 'Check application status' }).click()
  await expect(page.getByRole('heading', { name: 'Action required' })).toBeVisible()
  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/correction')
  await page.getByRole('button', { name: 'Use corrected letter' }).click()
  await page.getByRole('button', { name: 'Submit correction' }).click()
  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/status')

  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await page.getByText('Review update').click()
  await page.getByRole('button', { name: 'Check application status' }).click()

  await expect(page).toHaveURL('/application/SYN-CASE-MED-001/eta')
  await expect(page.getByRole('heading', { name: 'Electronic Travel Authorization issued' })).toBeVisible()
  await expect(page.getByText(
    'SAMPLE — NOT VALID. This is not a visa or travel document.',
  )).toBeVisible()
})
