import { expect, test, type Page } from '@playwright/test'
import { fillMedicalApplication, futureDate } from './application-inputs.js'
import { selectAllVisibleDocuments } from './test-files.js'

const STORAGE_KEY = 'india-evisa-reimagined:p0'

async function startFreshMedicalApplication(page: Page) {
  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), STORAGE_KEY)
  await page.reload()
  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue application' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
}

function readableDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

test('nationality and passport catalogues expose real options and supported guidance', async ({ page }) => {
  await startFreshMedicalApplication(page)

  const nationality = page.getByRole('combobox', { name: /Country of nationality/ })
  const eligibleOptions = nationality.locator(
    'option:not([value=""]):not([value="NAT-NOT-LISTED"])',
  )
  await expect(eligibleOptions).toHaveCount(173)
  await expect(nationality.locator('option', { hasText: 'Albania' })).toHaveCount(1)
  await expect(nationality.locator('option', { hasText: 'Kenya' })).toHaveCount(1)
  await expect(nationality.locator('option', { hasText: 'Zimbabwe' })).toHaveCount(1)
  await expect(page.getByLabel('Search country of nationality')).toBeVisible()

  await nationality.selectOption('NAT-NOT-LISTED')
  await expect(page.getByText(
    'This nationality or region may not currently be eligible for e-Visa. Check the regular visa service for available options.',
    { exact: true },
  )).toBeVisible()

  const passport = page.getByLabel('Passport type')
  await expect(passport.locator('option')).toHaveText([
    'Choose an option',
    'Ordinary Passport',
    'Official Passport',
    'Diplomatic Passport',
    'Service Passport',
    'Special Passport',
  ])
  const passportGuidance =
    'This passport type is not eligible for the e-Visa service under current published guidance. You may need to use the regular visa service.'
  await passport.selectOption('PASSPORT-OFFICIAL')
  await expect(page.getByText(passportGuidance, { exact: true })).toBeVisible()
  await passport.selectOption('PASSPORT-DIPLOMATIC')
  await expect(page.getByText(passportGuidance, { exact: true })).toBeVisible()
  await passport.selectOption('PASSPORT-ORDINARY')
  await expect(page.getByText(passportGuidance, { exact: true })).toHaveCount(0)
  await expect(passport).toHaveValue('PASSPORT-ORDINARY')
})

test('Medical date, text, and yes-no controls validate and resume real values', async ({ page }) => {
  await startFreshMedicalApplication(page)

  const arrival = page.getByLabel('Expected date of arrival')
  const admission = page.getByLabel('Proposed hospital admission date')
  const treatment = page.getByLabel('Type of medical treatment required')
  await expect(arrival).toHaveAttribute('type', 'date')
  await expect(admission).toHaveAttribute('type', 'date')
  await expect(treatment).toHaveAttribute('type', 'text')
  await expect(page.getByRole('radio', { name: 'Yes' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'No' })).toBeVisible()

  await arrival.fill(futureDate(-1))
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByText(/Choose a date at least 4 days from today/)).toBeVisible()

  const validArrival = futureDate(10)
  const invalidAdmission = futureDate(9)
  await page.getByRole('combobox', { name: /Country of nationality/ }).selectOption('NAT-UNITED-KINGDOM')
  await page.getByLabel('Passport type').selectOption('PASSPORT-ORDINARY')
  await arrival.fill(validArrival)
  await treatment.fill('Cardiac consultation and diagnostic treatment')
  await admission.fill(invalidAdmission)
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await expect(page.getByText(
    'Proposed hospital admission date cannot be before expected date of arrival.',
    { exact: true },
  )).toBeVisible()

  const validAdmission = futureDate(12)
  await admission.fill(validAdmission)
  await page.reload()
  await expect(arrival).toHaveValue(validArrival)
  await expect(treatment).toHaveValue('Cardiac consultation and diagnostic treatment')
  await expect(admission).toHaveValue(validAdmission)
  await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked()
})

test('Medical Review presents applicant labels and readable persisted values', async ({ page }) => {
  await startFreshMedicalApplication(page)
  const arrival = futureDate(10)
  const admission = futureDate(12)
  await fillMedicalApplication(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  await selectAllVisibleDocuments(page)
  await page.getByRole('link', { name: 'Review application' }).click()

  const answers = page.getByRole('region', { name: 'Your answers' })
  await expect(answers.getByText('Country of nationality', { exact: true })).toBeVisible()
  await expect(answers.getByText('United Kingdom', { exact: true })).toBeVisible()
  await expect(answers.getByText('Passport type', { exact: true })).toBeVisible()
  await expect(answers.getByText('Ordinary Passport', { exact: true })).toBeVisible()
  await expect(answers.getByText(readableDate(arrival), { exact: true })).toBeVisible()
  await expect(answers.getByText('Cardiac consultation and diagnostic treatment', { exact: true })).toBeVisible()
  await expect(answers.getByText(readableDate(admission), { exact: true })).toBeVisible()
  await expect(answers.getByText('Yes', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Not calculated in this prototype' })).toBeVisible()
  await expect(page.getByText('Visa fees vary by nationality and visa category.', { exact: true })).toBeVisible()

  await page.setViewportSize({ width: 1280, height: 800 })
  await answers.scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'artifacts/stage1-visual-qa/medical-review.png' })
})
