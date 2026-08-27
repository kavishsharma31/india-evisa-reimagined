import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'india-evisa-reimagined:p0'

async function openFresh(page: Page) {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.reload()
}

async function loadSeed(page: Page, seedId: string) {
  await page.goto('/?demo=1')
  await page.getByRole('combobox', { name: 'Canonical seed' }).selectOption(seedId)
  await expect(page.getByRole('region', { name: 'Demo controls' }).getByRole('status'))
    .toContainText(`Loaded ${seedId}.`)
}

test('shared shell fills every target viewport without overflow and centers constrained content', async ({ page }) => {
  await openFresh(page)

  for (const width of [360, 390, 430, 768, 1280]) {
    const height = width === 1280 ? 800 : 844
    await page.setViewportSize({ width, height })

    const geometry = await page.evaluate(() => {
      const rect = (element: Element | null) => {
        if (element === null) throw new Error('Expected layout element.')
        const bounds = element.getBoundingClientRect()
        return {
          bottom: bounds.bottom,
          height: bounds.height,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          width: bounds.width,
        }
      }

      return {
        clientHeight: document.documentElement.clientHeight,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        html: rect(document.documentElement),
        body: rect(document.body),
        root: rect(document.querySelector('#root')),
        shell: rect(document.querySelector('[data-testid="app-shell"]')),
        header: rect(document.querySelector('header')),
        main: rect(document.querySelector('[data-testid="app-main"]')),
        footer: rect(document.querySelector('footer')),
        footerCount: document.querySelectorAll('footer').length,
      }
    })

    expect(geometry.clientWidth).toBe(width)
    expect(geometry.html.width).toBeCloseTo(width, 1)
    expect(geometry.body.width).toBeCloseTo(width, 1)
    expect(geometry.root.width).toBeCloseTo(width, 1)
    expect(geometry.shell.width).toBeCloseTo(width, 1)
    expect(geometry.header.width).toBeCloseTo(width, 1)
    expect(geometry.footer.width).toBeCloseTo(width, 1)
    expect(geometry.shell.height).toBeGreaterThanOrEqual(geometry.clientHeight)
    expect(geometry.scrollWidth).toBe(geometry.clientWidth)
    expect(geometry.footerCount).toBe(1)

    const leftGutter = geometry.main.left
    const rightGutter = width - geometry.main.right
    expect(leftGutter).toBeCloseTo(rightGutter, 1)
    if (width === 390) {
      expect(geometry.main.width).toBeGreaterThanOrEqual(374)
      expect(leftGutter).toBeLessThanOrEqual(8)
    }
    if (width === 1280) {
      expect(geometry.main.width).toBeCloseTo(1152, 1)
      expect(leftGutter).toBeCloseTo(64, 1)
    }
  }
})

test('Medical Documents renders each required document and the footer exactly once', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-INTERRUPTED-DRAFT')

  await expect(page.getByRole('heading', { level: 3, name: 'Recent photograph' })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 3, name: 'Passport bio page' })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 3, name: 'Hospital letter' })).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
})

test('ambiguous Payment renders one recovery panel and one footer', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-AMBIGUOUS-PAYMENT')

  await expect(page.getByRole('heading', {
    name: 'Payment status pending',
  })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Check payment status' })).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
})

test('Status renders one Journey Summary and one footer', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-STATUS-RECOVERY')

  await expect(page.getByText('Journey summary', { exact: true })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'What is happening now' })).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
})

test('Action Required reason and correction CTA remain separated inside the status card', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-REUPLOAD-REQUESTED')

  const currentStatus = page.getByRole('region', { name: 'Action required' })
  const reason = currentStatus.getByText(
    'The admission date on the hospital letter could not be confirmed during review.',
    { exact: true },
  )
  const correctionLink = currentStatus.getByRole('link', { name: 'Replace hospital letter' })

  for (const width of [360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 844 })

    const cardBox = await currentStatus.boundingBox()
    const reasonBox = await reason.boundingBox()
    const buttonBox = await correctionLink.boundingBox()

    expect(cardBox).not.toBeNull()
    expect(reasonBox).not.toBeNull()
    expect(buttonBox).not.toBeNull()
    if (cardBox === null || reasonBox === null || buttonBox === null) continue

    expect(buttonBox.y - (reasonBox.y + reasonBox.height)).toBeGreaterThanOrEqual(12)
    expect(reasonBox.x).toBeGreaterThanOrEqual(cardBox.x)
    expect(reasonBox.y).toBeGreaterThanOrEqual(cardBox.y)
    expect(reasonBox.x + reasonBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
    expect(reasonBox.y + reasonBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height)
    expect(buttonBox.x).toBeGreaterThanOrEqual(cardBox.x)
    expect(buttonBox.y).toBeGreaterThanOrEqual(cardBox.y)
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width)
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height)
    if (width <= 430) {
      expect(buttonBox.width).toBeGreaterThan(cardBox.width - 48)
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  }
})

test('Correction renders one corrected replacement and one footer', async ({ page }) => {
  await loadSeed(page, 'SEED-MEDICAL-REUPLOAD-REQUESTED')
  await page.getByRole('link', { name: 'Replace hospital letter' }).click()

  await expect(page.getByText('Corrected hospital letter', { exact: true })).toHaveCount(1)
  await expect(page.getByText('For this prototype, a sample corrected document is provided.')).toHaveCount(1)
  await expect(page.getByText('Synthetic re-upload', { exact: true })).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(1)
})
