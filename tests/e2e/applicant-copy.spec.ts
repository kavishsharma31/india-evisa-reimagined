import { expect, test, type Page } from '@playwright/test'
import { fillGenericApplication, fillMedicalApplication } from './application-inputs.js'

const STORAGE_KEY = 'india-evisa-reimagined:p0'
const PROTOTYPE_NOTICE =
  'UNOFFICIAL HACKATHON PROTOTYPE — NO REAL APPLICATIONS OR PAYMENTS'

const PURPOSES = [
  {
    slug: 'tourist',
    title: 'Tourism',
    category: 'e-Tourist Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Purpose of visit', 'Expected date of departure'],
    documents: ['Recent photograph', 'Passport bio page'],
  },
  {
    slug: 'business',
    title: 'Business',
    category: 'e-Business Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Business purpose or activity', 'Indian organisation or company', 'Organisation city', 'Expected date of departure'],
    documents: ['Recent photograph', 'Passport bio page', 'Business card'],
  },
  {
    slug: 'medical',
    title: 'Medical treatment',
    category: 'e-Medical Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Type of medical treatment required', 'Proposed hospital admission date', 'Will a medical attendant travel with you?'],
    documents: ['Recent photograph', 'Passport bio page', 'Hospital letter'],
  },
  {
    slug: 'medical-attendant',
    title: 'Accompanying a medical patient',
    category: 'e-Medical Attendant Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Patient application reference', 'Relationship to the patient', 'Indian hospital', 'Hospital city'],
    documents: ['Recent photograph', 'Passport bio page'],
  },
  {
    slug: 'student',
    title: 'Study',
    category: 'e-Student Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Educational institution', 'Programme or course', 'Course duration', 'Funding source'],
    documents: ['Recent photograph', 'Passport bio page', 'Admission letter', 'Proof of financial support'],
  },
  {
    slug: 'family',
    title: 'Joining a student family member',
    category: 'e-Family Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Student application reference', 'Relationship to the student', 'Student’s educational institution', 'Expected date of departure'],
    documents: ['Recent photograph', 'Passport bio page'],
  },
  {
    slug: 'transit',
    title: 'Transit through India',
    category: 'e-Transit Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Port of arrival in India', 'Onward destination country', 'Onward departure date', 'Confirmed ticket reference', 'Permission to enter your destination country'],
    documents: ['Recent photograph', 'Passport bio page', 'Confirmed travel tickets', 'Proof of permission to enter destination country'],
  },
  {
    slug: 'miscellaneous',
    title: 'Entry / another eligible purpose',
    category: 'e-Miscellaneous Visa',
    prompts: ['Country of nationality', 'Passport type', 'Expected date of arrival', 'Basis for your e-Entry application', 'Relationship to the relevant person', 'Related person or Indian/OCI status basis', 'Expected date of departure'],
    documents: ['Recent photograph', 'Passport bio page', 'Proof supporting your relationship or Indian/OCI status basis', 'Birth or marriage certificate'],
  },
] as const

async function clearApplication(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
}

async function expectNoImplementationLanguage(page: Page) {
  const mainText = await page.locator('main').innerText()
  expect(mainText).not.toMatch(/\b(?:synthetic|demo|fixture|mock|local|bounded|scenario|deterministic|project-created)\b/i)
  expect(mainText).not.toContain('SYNTHETIC_DEMO_CREDITS')
}

async function startMedical(page: Page) {
  await clearApplication(page)
  await page.goto('/apply/medical')
  await page.getByRole('button', { name: 'Continue application' }).click()
  await page.getByRole('button', { name: 'Start application' }).click()
  await fillMedicalApplication(page)
}

test('all eight A01 routes use citizen-facing requirements and fee copy', async ({ page }) => {
  await clearApplication(page)

  for (const purpose of PURPOSES) {
    await page.goto(`/apply/${purpose.slug}`)
    await expect(page.getByRole('heading', { level: 2, name: purpose.title })).toBeVisible()
    await expect(page.getByText(purpose.category, { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'What you’ll need to provide' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Required documents' })).toBeVisible()
    await expect(page.getByText('Visa fees vary by nationality and visa category.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue application' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Choose a different purpose' })).toBeVisible()
    await expect(page.getByText('Policy version')).toHaveCount(0)
    await expectNoImplementationLanguage(page)
  }

  await expect(page.getByText(PROTOTYPE_NOTICE, { exact: true })).toBeVisible()
})

test('all eight A03 and A04 routes translate prompts and document names at the UI boundary', async ({ page }) => {
  for (const purpose of PURPOSES) {
    await clearApplication(page)
    await page.goto(`/apply/${purpose.slug}`)
    await page.getByRole('button', { name: 'Continue application' }).click()
    await page.getByRole('button', { name: 'Start application' }).click()

    for (const prompt of purpose.prompts) {
      await expect(page.getByText(prompt, { exact: true })).toBeVisible()
    }
    await expectNoImplementationLanguage(page)

    await fillGenericApplication(page)
    await page.getByRole('button', { name: 'Continue to documents' }).click()
    await page.getByRole('link', { name: 'Prepare documents' }).click()

    for (const documentName of purpose.documents) {
      await expect(page.getByRole('heading', { level: 3, name: documentName })).toHaveCount(1)
    }
    await expect(page.getByText('For this prototype, sample documents are provided instead of real uploads.')).toBeVisible()
    await expectNoImplementationLanguage(page)
  }
})

test('normal Medical A05 to A09 keeps citizen copy and only the required safety disclosures', async ({ page }) => {
  await startMedical(page)
  await page.getByRole('button', { name: 'Continue to documents' }).click()
  await page.getByRole('link', { name: 'Prepare documents' }).click()
  for (const name of ['Recent photograph', 'Passport bio page', 'Hospital letter']) {
    const card = page.locator('article').filter({
      has: page.getByRole('heading', { level: 3, name }),
    })
    await card.getByRole('button', { name: 'Check document' }).click()
  }
  await page.getByRole('link', { name: 'Review application' }).click()
  await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Not calculated in this prototype' })).toBeVisible()
  await expectNoImplementationLanguage(page)

  await page.getByRole('checkbox', { name: 'I confirm these application details are complete and ready to submit.' }).check()
  await page.getByRole('button', { name: 'Submit application' }).click()
  await expect(page.getByRole('heading', { name: 'Pay visa fee' })).toBeVisible()
  await expect(page.getByText('No real payment will be processed in this prototype.')).toBeVisible()
  await expectNoImplementationLanguage(page)

  await page.getByRole('button', { name: 'Pay visa fee' }).click()
  await expect(page.getByRole('heading', { name: 'Payment status pending' })).toBeVisible()
  await expect(page.getByText('Do not make another payment.')).toBeVisible()
  await expectNoImplementationLanguage(page)
  await page.getByRole('button', { name: 'Check payment status' }).click()
  await page.getByRole('link', { name: 'Continue to status' }).click()
  await page.getByRole('button', { name: 'Begin review' }).click()
  await expect(page.getByText('Your application is currently under review. No action is required.')).toBeVisible()
  await expectNoImplementationLanguage(page)

  await page.getByText('Review update').click()
  await page.getByRole('button', { name: 'Check application status' }).click()
  await expect(page.getByText('Your hospital letter needs one correction.')).toBeVisible()
  await expect(page.getByText('The admission date on the hospital letter could not be confirmed during review.')).toBeVisible()
  await expectNoImplementationLanguage(page)

  await page.getByRole('link', { name: 'Replace hospital letter' }).click()
  await expect(page.getByRole('heading', { name: 'Replace your hospital letter' })).toBeVisible()
  await expect(page.getByText('For this prototype, a sample corrected document is provided.')).toBeVisible()
  await expectNoImplementationLanguage(page)
  await page.getByRole('button', { name: 'Use corrected letter' }).click()
  await page.getByRole('button', { name: 'Submit correction' }).click()
  await page.getByText('Review update').click()
  await page.getByRole('button', { name: 'Check application status' }).click()

  await expect(page.getByRole('heading', { name: 'Electronic Travel Authorization issued' })).toBeVisible()
  await expect(page.getByText('SAMPLE — NOT VALID. This is not a visa or travel document.')).toBeVisible()
  await expect(page.getByText('Policy version')).toHaveCount(0)
  await expectNoImplementationLanguage(page)
})
