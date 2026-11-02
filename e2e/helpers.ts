import { fileURLToPath } from 'node:url'

import { expect, type Page } from '@playwright/test'

/**
 * Saves a full-page screenshot as `e2e/screenshots/<name>.png` for visual
 * review. The folder is git-ignored and rewritten on every run.
 */
export async function capture(page: Page, name: string) {
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: fileURLToPath(new URL(`screenshots/${name}.png`, import.meta.url)),
  })
}

/** Types the text into the editor, analyzes it, and waits for the results. */
export async function analyze(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Text to inspect' }).fill(text)
  await page.getByRole('button', { name: 'Analyze text' }).click()
  await expect(page.locator('#results-title')).toBeVisible()
}
