import { expect, test } from '@playwright/test'

import { analyze, capture } from './helpers.js'

// An invisible character, an unusual space, and a word that mixes Latin and
// Cyrillic letters ("p\u0430ypal" uses a Cyrillic "a").
const suspiciousText =
  'Pay\u200Bment is due on Fri\u00A0day for your p\u0430ypal account.'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('shows the empty state before any text is entered', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Meet CharAIcter.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Analyze text' }),
  ).toBeDisabled()
  await expect(page.getByText('Results appear here')).toBeVisible()
  await capture(page, '01-empty-state')
})

test('reports nothing unusual for ordinary text', async ({ page }) => {
  await analyze(
    page,
    'The quick brown fox jumps over the lazy dog near the river bank.',
  )

  await expect(page.locator('#results-title')).toHaveText(
    'Nothing unusual found.',
  )
  await expect(page.locator('.language-result')).toContainText('English')
  await capture(page, '02-clean-text')
})

test('lists invisible, whitespace, and mixed-script findings', async ({
  page,
}) => {
  await analyze(page, suspiciousText)

  await expect(page.locator('#results-title')).toHaveText(
    '3 findings to review',
  )
  const findings = page.locator('.finding-list').getByRole('button')
  await expect(findings).toHaveCount(3)
  await expect(findings.nth(0)).toContainText('zero-width space')
  await expect(findings.nth(1)).toContainText('non-breaking space')
  await expect(findings.nth(2)).toContainText('mixes Latin and Cyrillic')
  await capture(page, '03-findings')
})

test('highlights a selected finding in the text', async ({ page }) => {
  await analyze(page, suspiciousText)

  const finding = page.getByRole('button', {
    name: /mixes Latin and Cyrillic/,
  })
  await finding.click()

  await expect(finding).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.text-overlay .editor-highlight')).toHaveText(
    'p\u0430ypal',
  )
  await capture(page, '04-finding-selected')
})

test('decodes text hidden in Unicode tag characters', async ({ page }) => {
  await analyze(page, 'Hello there\u{E0068}\u{E0069}\u{E0021} friend.')

  await expect(page.locator('#results-title')).toHaveText('1 finding to review')
  await expect(page.getByRole('button', { name: /Hidden text/ })).toContainText(
    'hide this text: "hi!"',
  )
  await capture(page, '05-hidden-text')
})

test('shows symbols and dashes in their own tabs', async ({ page }) => {
  await analyze(page, 'Price: $5 (approx) \u2014 50% off! Email: a@b.c')

  await expect(page.locator('#results-title')).toHaveText(
    'Nothing unusual found.',
  )
  await page.getByRole('tab', { name: /Symbols/ }).click()
  await expect(page.getByRole('row', { name: /colon/ })).toContainText('2')
  await expect(page.getByRole('row', { name: /dollar sign/ })).toBeVisible()
  await capture(page, '06-symbols-tab')

  await page.getByRole('tab', { name: /Dashes/ }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Em dash')
})

test('analyzes the text with Ctrl+Enter', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'Text to inspect' })
  await editor.fill(suspiciousText)
  await editor.press('Control+Enter')

  await expect(page.locator('#results-title')).toHaveText(
    '3 findings to review',
  )
})

test('clears the results when the text changes', async ({ page }) => {
  await analyze(page, suspiciousText)

  await page
    .getByRole('textbox', { name: 'Text to inspect' })
    .pressSequentially(' More')

  await expect(page.locator('#results-title')).toHaveCount(0)
  await expect(page.getByText('Results appear here')).toBeVisible()
})

test('explains when the analysis service fails', async ({ page }) => {
  await page.route('**/analyze', (route) => route.fulfill({ status: 500 }))

  await page
    .getByRole('textbox', { name: 'Text to inspect' })
    .fill(suspiciousText)
  await page.getByRole('button', { name: 'Analyze text' }).click()

  await expect(page.getByRole('alert')).toHaveText(
    'The analysis service returned an error (500). Please try again.',
  )
  await capture(page, '07-api-error')
})

for (const width of [960, 400]) {
  test(`fits a ${width}px wide screen without sideways scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width })
    await analyze(page, suspiciousText)

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflows).toBe(false)
    await capture(page, `08-findings-${width}px`)
  })
}
