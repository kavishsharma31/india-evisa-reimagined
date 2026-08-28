import { expect, test, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

import { fillGenericApplication } from './application-inputs.js'
import {
  belowMinimumDimensionsPhoto,
  documentCard,
  invalidNonSquarePhoto,
  invalidPng,
  oversizedPdf,
  oversizedPhoto,
  onePixelPhoto,
  selectAllVisibleDocuments,
  undersizedPdf,
  undersizedPhoto,
  validPdf,
  validPhoto,
  wrongPdfType,
} from './test-files.js'

const STORAGE_KEY = 'india-evisa-reimagined:p0'
const VISUAL_QA_DIRECTORY = process.env.STAGE2_VISUAL_QA_DIR
const PURPOSES = [
  'tourist', 'business', 'medical', 'medical-attendant',
  'student', 'family', 'transit', 'miscellaneous',
] as const

async function captureVisualQa(page: Page, fileName: string): Promise<void> {
  if (VISUAL_QA_DIRECTORY === undefined) return
  await page.screenshot({ path: `${VISUAL_QA_DIRECTORY}/${fileName}`, fullPage: false })
}

async function openDocuments(page: Page, slug = 'medical') {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.goto(`/apply/${slug}`)
  await page.getByRole('button', { name: 'Continue application' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await fillGenericApplication(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await expect(page.getByRole('heading', { name: 'Prepare your documents' })).toBeVisible()
}

test('normal mode uses native file inputs while demo mode retains sample fixtures', async ({ page }) => {
  await openDocuments(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await captureVisualQa(page, 'medical-documents-before-desktop.png')
  await page.setViewportSize({ width: 390, height: 844 })
  await captureVisualQa(page, 'medical-documents-before-mobile.png')
  const mobileLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(mobileLayout.clientWidth)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await expect(page.locator('input[type="file"]')).toHaveCount(3)
  await expect(page.getByRole('combobox', { name: 'Sample document' })).toHaveCount(0)
  await expect(page.getByText('Files are checked in your browser for this prototype and are not uploaded.')).toBeVisible()

  await page.goto(`${page.url()}?demo=1`)
  await expect(page.getByRole('combobox', { name: 'Sample document' })).toHaveCount(3)
  await expect(page.locator('input[type="file"]')).toHaveCount(0)
})

test('local JPEG and PDF validation is precise, mutation-safe, private, and replaceable', async ({ page }) => {
  await openDocuments(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const photo = documentCard(page, 'Recent photograph')
  const passport = documentCard(page, 'Passport bio page')
  const photoInput = photo.getByLabel('Choose file')
  const pdfInput = passport.getByLabel('Choose file')
  const initialStorage = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)

  await photoInput.setInputFiles(invalidPng())
  await expect(photo.getByText('Upload a JPEG photograph.')).toBeVisible()
  await photoInput.setInputFiles(undersizedPhoto())
  await expect(photo.getByText('Photograph must be between 10 KB and 1 MB.')).toBeVisible()
  await photoInput.setInputFiles(oversizedPhoto())
  await expect(photo.getByText('Photograph must be between 10 KB and 1 MB.')).toBeVisible()
  await photoInput.setInputFiles(onePixelPhoto())
  await expect(photo.getByText('Photograph must be at least 350 × 350 pixels.')).toBeVisible()
  await photoInput.setInputFiles(belowMinimumDimensionsPhoto())
  await expect(photo.getByText('Photograph must be at least 350 × 350 pixels.')).toBeVisible()
  await photoInput.setInputFiles(invalidNonSquarePhoto())
  await expect(photo.getByText('Photograph must be square.')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(initialStorage)

  const networkRequests: string[] = []
  page.on('request', (request) => networkRequests.push(request.url()))
  await photoInput.setInputFiles(validPhoto('applicant-visible-name.jpg'))
  await expect(photo.getByText('Ready', { exact: true })).toBeVisible()
  await expect(photo.getByText('350 × 350 px', { exact: false })).toBeVisible()
  expect(networkRequests.filter((url) => !url.startsWith('blob:'))).toEqual([])
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await photo.scrollIntoViewIfNeeded()
  await captureVisualQa(page, 'valid-photograph-350-mobile.png')

  await pdfInput.setInputFiles(wrongPdfType())
  await expect(passport.getByText('Upload this document as a PDF.')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await passport.scrollIntoViewIfNeeded()
  await captureVisualQa(page, 'invalid-document-error.png')
  await pdfInput.setInputFiles(undersizedPdf())
  await expect(passport.getByText('PDF must be between 10 KB and 300 KB.')).toBeVisible()
  await pdfInput.setInputFiles(oversizedPdf())
  await expect(passport.getByText('PDF must be between 10 KB and 300 KB.')).toBeVisible()
  await pdfInput.setInputFiles(validPdf('applicant-visible-passport.pdf'))
  await expect(passport.getByText('Ready', { exact: true })).toBeVisible()
  await documentCard(page, 'Hospital letter').getByLabel('Choose file').setInputFiles(
    validPdf('synthetic-hospital-letter.pdf'),
  )
  await expect(documentCard(page, 'Hospital letter').getByText('Ready', { exact: true })).toBeVisible()
  await page.getByText('3 of 3 required documents ready').scrollIntoViewIfNeeded()
  await captureVisualQa(page, 'all-medical-documents-ready.png')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

  const stored = await page.evaluate((key) => localStorage.getItem(key) ?? '', STORAGE_KEY)
  expect(stored).not.toContain('applicant-visible-name.jpg')
  expect(stored).not.toContain('applicant-visible-passport.pdf')
  expect(stored).not.toContain('base64')
  expect(stored).not.toContain('blob:')
})

test('prepared local metadata survives refresh without duplicate versions or file claims', async ({ page }) => {
  await openDocuments(page, 'tourist')
  await selectAllVisibleDocuments(page)
  const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  await page.reload()
  await expect(page.getByText('Document checked')).toHaveCount(2)
  await expect(page.getByText('The original file is not retained after refresh.')).toHaveCount(2)
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(before)
  await page.getByRole('link', { name: 'Review application' }).click()
  await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible()
  const mainText = await page.locator('main').innerText()
  expect(mainText).not.toContain('blob:')
  expect(mainText).not.toMatch(/[A-Z]:\\/)
})

test('all eight policy manifests accept normal local files through one renderer', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  for (const slug of PURPOSES) {
    await openDocuments(page, slug)
    const inputs = page.locator('input[type="file"]')
    expect(await inputs.count()).toBeGreaterThanOrEqual(2)
    if (slug === 'student' || slug === 'transit') {
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
      await page.locator('main article').last().scrollIntoViewIfNeeded()
      await captureVisualQa(page, `${slug}-documents.png`)
    }
    await selectAllVisibleDocuments(page)
    await expect(page.getByText(/required documents ready$/)).toContainText(/\d+ of \d+/)
    await expect(page.getByRole('link', { name: 'Review application' })).toBeVisible()
  }
})
