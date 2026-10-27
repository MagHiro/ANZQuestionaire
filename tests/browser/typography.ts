import { expect, type Page } from '@playwright/test'

export async function expectCompactTypography(page: Page) {
  const violations = await page.locator('body').evaluate((body) => {
    return [...body.querySelectorAll<HTMLElement>('*')]
      .filter((el) => {
        if (el.closest('svg') || !el.getClientRects().length) return false
        return [...el.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        )
      })
      .flatMap((el) => {
        const size = parseFloat(getComputedStyle(el).fontSize)
        return size < 13 || size > 24 ? [`${el.tagName}.${el.className}: ${size}px`] : []
      })
  })
  expect(violations).toEqual([])
}
