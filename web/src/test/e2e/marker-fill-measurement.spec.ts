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
  // Shell controls carry `transition-all`, so moving the selection fades a row out of the accent over
  // 150ms instead of swapping its fill. A handle taken straight after a click would still point at the
  // outgoing colour, so every transition on the element and its contents is allowed to finish first.
  // Endless animations never settle and never decide a fill, so they are left running; a transition
  // replaced part-way through rejects and is simply re-read on the next pass.
  await locator.evaluate(async (element) => {
    for (let pass = 0; pass < 10; pass++) {
      const running = element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY)
      if (!running.length)
        return
      await Promise.all(running.map(animation => animation.finished.catch(() => undefined)))
    }
  })
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
    // Painting a stack bottom-up leaves the browser to do the source-over compositing as well as the
    // colour-space conversion, so a translucent layer measures as the pixel it actually produces. A
    // single translucent layer painted alone would instead keep its own colour channels and record its
    // transparency only in the alpha channel, which no contrast formula reads.
    const toSrgbBytes = (layers: string[]): [number, number, number] => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      for (const color of [...layers].reverse()) {
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
      }
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
      return [red!, green!, blue!]
    }
    const channel = (value: number) => value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
    const luminance = (layers: string[]) => {
      const [red, green, blue] = toSrgbBytes(layers)
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    }
    // Every painted layer from the element up to and including the first opaque one behind it.
    const paintedBackground = (node: Element) => {
      const layers: string[] = []
      for (let element: Element | null = node; element; element = element.parentElement) {
        const color = getComputedStyle(element).backgroundColor
        const alpha = Number(color.match(/[\d.]+/g)?.[3] ?? '1')
        if (alpha <= 0)
          continue
        layers.push(color)
        if (alpha >= 1)
          return layers
      }
      layers.push(getComputedStyle(document.body).backgroundColor)
      return layers
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
