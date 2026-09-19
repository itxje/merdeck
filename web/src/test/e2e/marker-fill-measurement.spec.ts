import type { Locator, Page } from '@playwright/test'
import { choose, expect, live, login, test } from './support'

// Isolates the two facts that make the unsaved marker of an open-but-unselected explorer row measure
// against the accent instead of against the sidebar. Both helpers below are the accent checks' own
// measurement route, reduced to what this pair needs.
//
// The shell's rows are buttons carrying `transition-all`, so moving the selection fades the outgoing
// row's fill from the accent to transparent over 150ms rather than swapping it, and a handle taken
// straight after the click still points at a translucent accent. A route that then takes the first
// background whose alpha is above zero and paints it on an empty canvas reads that translucent accent
// back as the opaque accent: the canvas keeps the colour channels and records the fade only in the
// alpha channel, which is never read.

async function requireElementHandle(locator: Locator) {
  const node = await locator.elementHandle()
  if (!node)
    throw new Error('No element found for a contrast measurement.')
  return node
}

// A fill with no text of its own against the painted background behind another element.
async function fillContrast(page: Page, subject: Locator, behind: Locator) {
  const subjectNode = await requireElementHandle(subject)
  const behindNode = await requireElementHandle(behind)
  return page.evaluate(({ subjectNode, behindNode }) => {
    const toSrgbBytes = (color: string): [number, number, number] => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
      return [red!, green!, blue!]
    }
    const channel = (value: number) => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
    const luminance = (color: string) => {
      const [red, green, blue] = toSrgbBytes(color)
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    }
    const paintedBackground = (node: Element) => {
      for (let element: Element | null = node; element; element = element.parentElement) {
        const color = getComputedStyle(element).backgroundColor
        const alpha = Number(color.match(/[\d.]+/g)?.[3] ?? '1')
        if (alpha > 0)
          return color
      }
      return getComputedStyle(document.body).backgroundColor
    }
    const [light, dark] = [luminance(paintedBackground(subjectNode)), luminance(paintedBackground(behindNode))].sort((first, second) => second - first)
    return (light! + 0.05) / (dark! + 0.05)
  }, { subjectNode, behindNode })
}

// Every transition still running on a measured element or its contents. Endless animations are
// excluded; they never settle and never decide a fill.
async function runningTransitions(page: Page, locator: Locator) {
  const node = await requireElementHandle(locator)
  return page.evaluate(element => element
    .getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
    .map(animation => animation.constructor.name), node)
}

async function openUnselectedRow(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, true)
  await choose(page, 'welcome.mmd')
  await live(page)
  const source = page.getByLabel('Mermaid source', { exact: true })
  await source.fill(`${await source.inputValue()}\nZ[Draft]`)
  const row = page.getByRole('button', { name: /^welcome\.mmd(?: Unsaved changes)?$/ })
  await expect(row).toHaveAttribute('aria-current', 'true')
  await choose(page, 'sequence.mermaid')
  await expect(row).not.toHaveAttribute('aria-current', 'true')
  return row
}

test('a handle taken for a measurement points at a row that has finished fading', async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ colorScheme: 'light' })
  const row = await openUnselectedRow(page)
  expect(await runningTransitions(page, row)).toEqual([])
})

test('the unsaved marker of an open-but-unselected row measures against the fill that row shows', async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ colorScheme: 'light' })
  const row = await openUnselectedRow(page)
  const marker = row.locator('.dirty-dot')
  await expect(marker).toBeVisible()
  expect(await fillContrast(page, marker, row)).toBeGreaterThanOrEqual(4.5)
})
