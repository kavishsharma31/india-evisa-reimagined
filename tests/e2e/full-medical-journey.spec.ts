import { expect, test, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { fillMedicalApplication } from './application-inputs.js'
import { selectAllVisibleDocuments, validPdf } from './test-files.js'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'
const VISUAL_QA_DIRECTORY = process.env.STAGE2_VISUAL_QA_DIR

async function captureVisualQa(page: Page, fileName: string): Promise<void> {
  if (VISUAL_QA_DIRECTORY === undefined) return
  await page.screenshot({ path: `${VISUAL_QA_DIRECTORY}/${fileName}`, fullPage: false })
}

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

  await expect(page.locator('input[type="file"]')).toHaveCount(3)
  await expect(page.getByRole('combobox', { name: 'Sample document' })).toHaveCount(0)
  await selectAllVisibleDocuments(page)
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
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel('Choose corrected hospital letter').scrollIntoViewIfNeeded()
  await captureVisualQa(page, 'correction-file-selector.png')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByLabel('Choose corrected hospital letter').setInputFiles(
    validPdf('synthetic-corrected-hospital-letter.pdf'),
  )
  await expect(page.getByText('Correction ready')).toBeVisible()
  await page.getByText('Correction ready').scrollIntoViewIfNeeded()
  await captureVisualQa(page, 'corrected-document-ready.png')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const correctionEvidence = await page.evaluate((storageKey) => {
    const envelope = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as {
      cases?: Array<{ documents?: Array<{ requirementId?: string; versions?: Array<{ state?: string; localFileMetadata?: { source?: string } }> }> }>
    }
    return envelope.cases?.[0]?.documents?.find(
      ({ requirementId }) => requirementId === 'REQ-HOSPITAL-LETTER-1',
    )?.versions
  }, P0_STORAGE_KEY)
  expect(correctionEvidence).toEqual([
    expect.objectContaining({ state: 'SUPERSEDED', localFileMetadata: expect.objectContaining({ source: 'LOCAL_FILE' }) }),
    expect.objectContaining({ state: 'PREFLIGHT_PASSED', localFileMetadata: expect.objectContaining({ source: 'LOCAL_FILE' }) }),
  ])
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
