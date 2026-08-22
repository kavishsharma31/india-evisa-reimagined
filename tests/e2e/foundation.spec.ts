import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 360, height: 800 } })

test('renders the foundation without console errors or horizontal overflow', async ({ page }) => {
  const browserErrors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    browserErrors.push(error.message)
  })

  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'India e-Visa Reimagined' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Application foundation initialized. Product implementation has not started.',
      { exact: true },
    ),
  ).toBeVisible()

  const pageWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth)
  expect(browserErrors).toEqual([])
})
