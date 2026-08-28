import path from 'node:path'

import { expect, test, type Page } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'
const SCREENSHOT_DIR = process.env.RETURNING_USER_SCREENSHOT_DIR

async function screenshot(page: Page, filename: string) {
  if (SCREENSHOT_DIR === undefined) return
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: false,
  })
}

async function persistedBytes(page: Page) {
  const raw = await page.evaluate(
    (storageKey) => localStorage.getItem(storageKey),
    P0_STORAGE_KEY,
  )
  if (raw === null) {
    throw new Error('Expected a persisted application envelope.')
  }
  return raw
}

async function policyPin(page: Page) {
  const raw = await persistedBytes(page)
  const envelope = JSON.parse(raw) as {
    cases: Array<{ policyPin: { qualifiedVersion: string; digest: string } }>
  }
  return envelope.cases[0]?.policyPin
}

async function openFresh(page: Page) {
  await page.goto('/')
  await page.evaluate(
    (storageKey) => localStorage.removeItem(storageKey),
    P0_STORAGE_KEY,
  )
  await page.reload()
}

test('returning 1.0.0 Medical applicant resumes from A01 byte-stably under active code', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openFresh(page)
  await page.goto('/?demo=1')
  await page.getByRole('combobox', { name: 'Canonical seed' }).selectOption(
    'SEED-MEDICAL-START',
  )
  await expect(
    page.getByRole('region', { name: 'Demo controls' }).getByRole('status'),
  ).toContainText('Loaded SEED-MEDICAL-START.')
  const beforeResume = await persistedBytes(page)
  expect(await policyPin(page)).toEqual({
    qualifiedVersion: 'SYN-EVISA-POLICY@1.0.0',
    digest: 'SYN-POLICY-DIGEST-1-0-0',
  })

  await page.goto('/apply/medical')
  await expect(page.getByRole('button', { name: 'Resume application' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'Resume application' }).scrollIntoViewIfNeeded()
  await screenshot(page, 'medical-existing-case.png')
  await page.getByRole('button', { name: 'Resume application' }).click()

  await expect(page).toHaveURL(/\/application\/SYN-CASE-MED-001$/)
  await expect(
    page.getByRole('heading', { name: 'Continue your application' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue application' })).toBeVisible()
  await expect(page.getByText(
    'Continue where you left off. Nothing will be submitted until you review and submit your application.',
    { exact: true },
  )).toBeVisible()
  await screenshot(page, 'medical-after-resume.png')
  expect(await persistedBytes(page)).toBe(beforeResume)
  expect(await policyPin(page)).toEqual({
    qualifiedVersion: 'SYN-EVISA-POLICY@1.0.0',
    digest: 'SYN-POLICY-DIGEST-1-0-0',
  })
})

test('fresh Medical applicant still creates a new active 2.1.0 case', async ({ page }) => {
  await openFresh(page)
  await page.goto('/apply/medical')
  await page.getByRole('button', { name: 'Continue application' }).click()

  await expect(
    page.getByRole('heading', { name: 'Your application has been created' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start application' })).toBeVisible()
  await expect(page.getByText(
    'Start providing your application details. Nothing will be submitted until you review and submit your application.',
    { exact: true },
  )).toBeVisible()
  expect(await policyPin(page)).toEqual({
    qualifiedVersion: 'SYN-EVISA-POLICY@2.1.0',
    digest: 'SYN-POLICY-DIGEST-2-1-0-REAL-INPUTS',
  })
})

test('a returning active-policy Tourist applicant uses the same generic resume path', async ({ page }) => {
  await openFresh(page)
  await page.goto('/apply/tourist')
  await page.getByRole('button', { name: 'Continue application' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your application has been created' }),
  ).toBeVisible()
  const beforeResume = await persistedBytes(page)

  await page.goto('/apply/tourist')
  await page.getByRole('button', { name: 'Resume application' }).click()

  await expect(page).toHaveURL(/\/application\/SYN-CASE-TOURIST-001$/)
  await expect(page.getByRole('button', { name: 'Continue application' })).toBeVisible()
  expect(await persistedBytes(page)).toBe(beforeResume)
  expect(await policyPin(page)).toMatchObject({
    qualifiedVersion: 'SYN-EVISA-POLICY@2.1.0',
  })
})
