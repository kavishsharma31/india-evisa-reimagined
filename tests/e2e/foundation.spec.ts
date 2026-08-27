import { expect, test } from '@playwright/test'

const P0_STORAGE_KEY = 'india-evisa-reimagined:p0'

test.use({ viewport: { width: 360, height: 800 } })

test('completes A00 to A02 at 360x800 without console errors or horizontal overflow', async ({ page }) => {
  const browserErrors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    browserErrors.push(error.message)
  })

  async function expectNoHorizontalOverflow() {
    const pageWidth = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth)
  }

  await page.goto('/')
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
  await page.reload()

  await expect(
    page.getByRole('heading', { level: 1, name: 'India e-Visa Reimagined' }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'UNOFFICIAL HACKATHON PROTOTYPE — SYNTHETIC DATA ONLY — CANNOT SUBMIT A VISA APPLICATION',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What are you travelling to India for?' })).toBeVisible()
  await expect(page.getByText('Medical treatment', { exact: true })).toBeInViewport()
  await expect(page.getByText('Tourism', { exact: true })).toBeInViewport()
  const scenarioTargetHeights = await page
    .locator('label:has(input[type="radio"])')
    .evaluateAll((choices) => choices.map((choice) => choice.getBoundingClientRect().height))
  expect(scenarioTargetHeights.every((height) => height >= 44)).toBe(true)
  await expectNoHorizontalOverflow()

  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await expect(page.getByText('73 SYNTHETIC_DEMO_CREDITS', { exact: true })).toBeVisible()
  await expect(page.getByText('Synthetic hospital letter')).toBeVisible()
  await expectNoHorizontalOverflow()

  await page.getByRole('button', { name: 'Continue with this demo' }).click()
  await expect(page.getByRole('heading', { name: 'Your synthetic application has been created' })).toBeVisible()
  await expectNoHorizontalOverflow()

  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
  await expectNoHorizontalOverflow()

  expect(browserErrors).toEqual([])
})

test.describe('desktop A00 shell', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('centers the two-column decision and rests the static footer at the viewport edge', async ({ page }) => {
    await page.goto('/')
    await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
    await page.reload()

    const layout = await page.evaluate(() => {
      const main = document.querySelector('main')
      const footer = document.querySelector('footer')
      const question = document.querySelector('main h2')
      const scenarioCards = [...document.querySelectorAll('label:has(input[type="radio"])')]
      if (main === null || footer === null || question === null || scenarioCards.length !== 2) {
        throw new Error('Expected the complete A00 layout.')
      }

      const mainRect = main.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()
      const questionRect = question.getBoundingClientRect()
      const medicalCardRect = scenarioCards[0]?.getBoundingClientRect()
      if (medicalCardRect === undefined) {
        throw new Error('Expected the Medical scenario card.')
      }

      return {
        mainWidth: mainRect.width,
        leftMargin: mainRect.left,
        rightMargin: window.innerWidth - mainRect.right,
        questionLeft: questionRect.left,
        medicalCardLeft: medicalCardRect.left,
        medicalCardWidth: medicalCardRect.width,
        footerGap: window.innerHeight - footerRect.bottom,
        footerPosition: getComputedStyle(footer).position,
      }
    })

    expect(layout.mainWidth).toBeGreaterThanOrEqual(1040)
    expect(layout.mainWidth).toBeLessThanOrEqual(1160)
    expect(Math.abs(layout.leftMargin - layout.rightMargin)).toBeLessThanOrEqual(1)
    expect(layout.medicalCardLeft).toBeGreaterThan(layout.questionLeft)
    expect(layout.medicalCardWidth).toBeGreaterThan(440)
    expect(Math.abs(layout.footerGap)).toBeLessThanOrEqual(1)
    expect(layout.footerPosition).toBe('static')
  })
})
