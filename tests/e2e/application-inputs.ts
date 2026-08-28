import type { Page } from '@playwright/test'

export function futureDate(days: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function fillMedicalApplication(page: Page) {
  await page.getByRole('combobox', { name: /Country of nationality/ }).selectOption('NAT-UNITED-KINGDOM')
  await page.getByLabel('Passport type').selectOption('PASSPORT-ORDINARY')
  await page.getByLabel('Expected date of arrival').fill(futureDate(10))
  await page
    .getByLabel('Type of medical treatment required')
    .fill('Cardiac consultation and diagnostic treatment')
  await page.getByLabel('Proposed hospital admission date').fill(futureDate(12))
  await page.getByRole('radio', { name: 'Yes' }).check()
}

export async function fillTouristApplication(page: Page) {
  await page.getByRole('combobox', { name: /Country of nationality/ }).selectOption('NAT-UNITED-KINGDOM')
  await page.getByLabel('Passport type').selectOption('PASSPORT-ORDINARY')
  await page.getByLabel('Expected date of arrival').fill(futureDate(10))
  await page.getByLabel('Purpose of visit').selectOption('TOURIST-LEISURE')
  await page.getByLabel('Expected date of departure').fill(futureDate(17))
}

export async function fillGenericApplication(page: Page) {
  const selects = page.locator('form select')
  for (let index = 0; index < (await selects.count()); index += 1) {
    await selects.nth(index).selectOption({ index: 1 })
  }

  const dates = page.locator('form input[type="date"]')
  for (let index = 0; index < (await dates.count()); index += 1) {
    await dates.nth(index).fill(futureDate(10 + index * 3))
  }

  const textFields = page.locator('form input[type="text"]')
  for (let index = 0; index < (await textFields.count()); index += 1) {
    await textFields.nth(index).fill(`Applicant response ${index + 1}`)
  }

  const uncheckedRadios = page.locator('form fieldset').filter({ has: page.locator('input[type="radio"]') })
  for (let index = 0; index < (await uncheckedRadios.count()); index += 1) {
    await uncheckedRadios.nth(index).locator('input[type="radio"]').first().check()
  }
}
