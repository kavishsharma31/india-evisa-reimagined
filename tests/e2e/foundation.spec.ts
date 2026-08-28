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
      'UNOFFICIAL HACKATHON PROTOTYPE — NO REAL APPLICATIONS OR PAYMENTS',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Why are you travelling to India?' })).toBeVisible()
  await expect(page.getByText('Medical treatment', { exact: true })).toBeInViewport()
  await expect(page.getByText('Tourism', { exact: true })).toBeInViewport()
  const scenarioTargetHeights = await page
    .locator('label:has(input[type="radio"])')
    .evaluateAll((choices) => choices.map((choice) => choice.getBoundingClientRect().height))
  expect(scenarioTargetHeights.every((height) => height >= 44)).toBe(true)
  await expectNoHorizontalOverflow()

  await page.getByText('Medical treatment', { exact: true }).click()
  await page.getByRole('link', { name: 'Continue' }).click()
  await expect(page.getByText('Varies by nationality and category', { exact: true })).toBeVisible()
  await expect(page.getByText('Hospital letter')).toBeVisible()
  await expectNoHorizontalOverflow()

  await page.getByRole('button', { name: 'Continue application' }).click()
  await expect(page.getByRole('heading', { name: 'Your application has been created' })).toBeVisible()
  await expectNoHorizontalOverflow()

  await page.getByRole('button', { name: 'Start application' }).click()
  await expect(page.getByRole('heading', { name: 'Tell us about this trip' })).toBeVisible()
  await expectNoHorizontalOverflow()

  expect(browserErrors).toEqual([])
})

test.describe('desktop A00 shell', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('centers the two-column catalog and lets its static footer follow long content', async ({ page }) => {
    await page.goto('/')
    await page.evaluate((storageKey) => localStorage.removeItem(storageKey), P0_STORAGE_KEY)
    await page.reload()

    const layout = await page.evaluate(() => {
      const main = document.querySelector('main')
      const footer = document.querySelector('footer')
      const question = document.querySelector('main h2')
      const scenarioCards = [...document.querySelectorAll('label:has(input[type="radio"])')]
      if (main === null || footer === null || question === null || scenarioCards.length !== 8) {
        throw new Error('Expected the complete A00 layout.')
      }

      const mainRect = main.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()
      const questionRect = question.getBoundingClientRect()
      const firstCardRect = scenarioCards[0]?.getBoundingClientRect()
      const secondCardRect = scenarioCards[1]?.getBoundingClientRect()
      if (firstCardRect === undefined || secondCardRect === undefined) {
        throw new Error('Expected the first row of scenario cards.')
      }

      return {
        mainWidth: mainRect.width,
        leftMargin: mainRect.left,
        rightMargin: window.innerWidth - mainRect.right,
        questionLeft: questionRect.left,
        firstCardLeft: firstCardRect.left,
        firstCardWidth: firstCardRect.width,
        secondCardLeft: secondCardRect.left,
        firstCardTop: firstCardRect.top,
        secondCardTop: secondCardRect.top,
        footerTop: footerRect.top,
        mainBottom: mainRect.bottom,
        footerBottom: footerRect.bottom,
        viewportHeight: window.innerHeight,
        footerPosition: getComputedStyle(footer).position,
      }
    })

    expect(layout.mainWidth).toBeGreaterThanOrEqual(1040)
    expect(layout.mainWidth).toBeLessThanOrEqual(1160)
    expect(Math.abs(layout.leftMargin - layout.rightMargin)).toBeLessThanOrEqual(1)
    expect(Math.abs(layout.firstCardLeft - layout.questionLeft)).toBeLessThanOrEqual(1)
    expect(layout.secondCardLeft).toBeGreaterThan(layout.firstCardLeft)
    expect(Math.abs(layout.firstCardTop - layout.secondCardTop)).toBeLessThanOrEqual(1)
    expect(layout.firstCardWidth).toBeGreaterThan(500)
    expect(layout.footerTop).toBeGreaterThanOrEqual(layout.mainBottom)
    expect(layout.footerBottom).toBeGreaterThan(layout.viewportHeight)
    expect(layout.footerPosition).toBe('static')
  })
})
