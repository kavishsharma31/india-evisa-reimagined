import { expect, test } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

test('Medical completes the full applicant A00 through A09 journey without seed bypasses', async ({ page }) => {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'What are you travelling to India for?' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Demo controls' })).toHaveCount(0)
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(page.getByRole('heading', { name: 'Your synthetic application has been created' })).toBeVisible()
  await page.getByRole('button', { name: 'Start application' }).click()

  await page.getByLabel(/Choose the synthetic policy cohort/).selectOption('SYN-POLICY-COHORT-A')
  await page.getByLabel(/Choose the synthetic passport class/).selectOption('SYNTHETIC_STANDARD_PASSPORT')
  await page.getByLabel(/Choose the fictional planned arrival date/).selectOption('2099-04-14')
  await page.getByLabel(/Confirm the synthetic Medical treatment intent/).selectOption('SYNTHETIC_MEDICAL_TREATMENT')
  await page.getByLabel(/Choose the fictional proposed admission date/).selectOption('2099-04-18')
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('button', { name: 'Prepare documents' }).click()

  for (const documentName of [
    'Synthetic portrait',
    'Synthetic passport page',
    'Synthetic hospital letter',
  ]) {
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name: documentName }),
    })
    await card.getByRole('button', { name: 'Run technical check' }).click()
  }
  await page.getByRole('button', { name: 'Review application' }).click()
  await page.getByRole('checkbox', {
    name: 'I confirm these synthetic demo details are ready for simulated submission.',
  }).check()
  await page.getByRole('button', { name: 'Submit demo application' }).click()

  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await page.getByRole('button', { name: 'Start mock payment' }).click()
  await expect(page.getByRole('heading', { name: 'Mock payment is pending. No real payment was made.' })).toBeVisible()
  await page.getByRole('button', { name: 'Check mock payment status' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to status' }).click()

  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await page.getByText('Demo review control').click()
  await page.getByRole('button', { name: 'Simulate hospital-letter review outcome' }).click()
  await expect(page.getByRole('heading', { name: 'Action required' })).toBeVisible()
  await page.getByRole('button', { name: 'Replace hospital letter' }).click()
  await page.getByRole('button', { name: 'Use corrected demo letter' }).click()
  await page.getByRole('button', { name: 'Submit correction' }).click()

  await expect(page.getByRole('heading', { name: 'Under review' })).toBeVisible()
  await page.getByText('Demo review control').click()
  await page.getByRole('button', { name: 'Complete synthetic review' }).click()

  await expect(page.getByRole('heading', { name: 'Demo application approved' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Synthetic ETA issued' })).toBeVisible()
  await expect(page.getByText(
    'SYNTHETIC — NOT VALID. This is not a visa or travel document.',
  )).toBeVisible()
})
