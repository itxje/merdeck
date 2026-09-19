import type { Locator, Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// Mirrors the WCAG relative-luminance formula the diagram label check already uses in the browser, but that
// check's fills come from diagram source as rgb() literals. These tokens are authored in oklch, and Chromium
// serialises getComputedStyle().color/.backgroundColor for them in that same function, e.g.
// "oklch(0.55 0.09 195)" — not rgb(). Regex-extracting the first three numbers and treating them as 0-255
// sRGB channels silently misreads that as rgb(0.55, 0.09, 195), a near-black constant regardless of the
// actual colour. Painting the computed colour string onto a canvas and reading the pixel back asks the
// browser itself to do the colour-space conversion, whatever function the value was serialised in, instead of
// hand-rolling (and mis-assuming) a parser for it.
// Each helper below runs entirely inside the browser, since Playwright evaluates it in that context.

async function requireElementHandle(locator: Locator) {
  const node = await locator.elementHandle()
  if (!node)
    throw new Error('No element found for a contrast measurement.')
  return node
}

// Text or icon colour against the painted background behind a (possibly different) element.
async function textContrast(page: Page, subject: Locator, behind: Locator = subject) {
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
    const [light, dark] = [luminance(getComputedStyle(subjectNode).color), luminance(paintedBackground(behindNode))].sort((first, second) => second - first)
    return (light! + 0.05) / (dark! + 0.05)
  }, { subjectNode, behindNode })
}

// A fill with no text of its own (e.g. the unsaved-changes dot) against the painted background behind another element.
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

// Whether a focused element's locally repointed --ring computes to the same colour as the --primary
// token, compared as colours (through the same canvas conversion the other checks use) rather than as
// declaration text: getComputedStyle resolves the var(--primary) reference to a concrete colour function
// (e.g. "oklch(72% .1 195)"), so asserting the literal string "var(--primary)" always fails.
async function focusedRingMatchesPrimary(page: Page) {
  return page.evaluate(() => {
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
    const ring = toSrgbBytes(getComputedStyle(document.activeElement!).getPropertyValue('--ring').trim())
    const primary = toSrgbBytes(getComputedStyle(document.documentElement).getPropertyValue('--primary').trim())
    return ring.every((value, index) => value === primary[index])
  })
}

// Prints the measured ratio for a required pair regardless of pass/fail, so a run's log states the
// actual browser-measured number rather than leaving it inferable only from a single failing case.
function reportRatio(label: string, colorScheme: string, ratio: number) {
  // eslint-disable-next-line no-console -- Deliberate: surfaces the measured number in the run's log.
  console.log(`[accent-contrast] ${label} (${colorScheme}): ${ratio.toFixed(4)}:1`)
}

async function customPropertyColor(page: Page, name: string) {
  return page.evaluate((property) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${property})`
    document.body.append(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  }, name)
}

for (const colorScheme of ['light', 'dark'] as const) {
  // Confirms the measurement route itself before trusting any accent number: body text on the canvas
  // against its own background is an independently known, very high ratio (~19.8:1 light, ~19.0:1 dark)
  // regardless of which CSS colour function getComputedStyle happens to serialise it in.
  test(`the contrast measurement route is sound in the ${colorScheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/index.html')
    const ratio = await textContrast(page, page.locator('body'))
    expect(ratio).toBeGreaterThanOrEqual(15)
  })

  test(`the accent-filled surfaces meet 4.5:1 contrast in the ${colorScheme} scheme`, async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width: 1440, height: 900 })

    // The primary button (login screen, before a session exists) carries the accent as its own fill.
    await page.goto('/index.html')
    await expect(page).toHaveURL(url => url.pathname === '/')
    const primaryButton = page.getByRole('button', { name: 'Connect to project', exact: true })
    await expect(primaryButton).toBeVisible()
    const primaryButtonRatio = await textContrast(page, primaryButton)
    reportRatio('primary button label', colorScheme, primaryButtonRatio)
    expect(primaryButtonRatio).toBeGreaterThanOrEqual(4.5)

    await login(page, true)
    await choose(page, 'welcome.mmd')
    await live(page)
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(colorScheme === 'dark')

    // Tabbing to a control repoints the shared focus-ring token to the accent for that element only.
    await page.keyboard.press('Tab')
    expect(await focusedRingMatchesPrimary(page)).toBe(true)

    // Make the open file dirty, so its selected row carries the accent, the accent foreground and the marker together.
    const source = page.getByLabel('Mermaid source', { exact: true })
    const original = await source.inputValue()
    await source.fill(`${original}\nZ[Draft]`)
    const selectedRow = page.getByRole('button', { name: /^welcome\.mmd(?: Unsaved changes)?$/ })
    await expect(selectedRow).toHaveAttribute('aria-current', 'true')
    const marker = selectedRow.locator('.dirty-dot')
    await expect(marker).toBeVisible()
    const rowTextRatio = await textContrast(page, selectedRow.locator('.truncate'), selectedRow)
    reportRatio('selected row text', colorScheme, rowTextRatio)
    expect(rowTextRatio).toBeGreaterThanOrEqual(4.5)
    const rowIconRatio = await textContrast(page, selectedRow.locator('svg'), selectedRow)
    reportRatio('selected row icon', colorScheme, rowIconRatio)
    expect(rowIconRatio).toBeGreaterThanOrEqual(4.5)
    const rowMarkerRatio = await fillContrast(page, marker, selectedRow)
    reportRatio('selected row unsaved marker', colorScheme, rowMarkerRatio)
    expect(rowMarkerRatio).toBeGreaterThanOrEqual(4.5)

    // Selecting another file leaves welcome.mmd open-but-unselected: still dirty, no longer accent-filled.
    await choose(page, 'sequence.mermaid')
    const openRow = page.getByRole('button', { name: /^welcome\.mmd(?: Unsaved changes)?$/ })
    await expect(openRow).not.toHaveAttribute('aria-current', 'true')
    const [openBg, selectedBg] = await Promise.all([
      openRow.evaluate(element => getComputedStyle(element).backgroundColor),
      customPropertyColor(page, '--primary'),
    ])
    expect(openBg).not.toBe(selectedBg)
    const openMarker = openRow.locator('.dirty-dot')
    await expect(openMarker).toBeVisible()
    expect(await fillContrast(page, openMarker, openRow)).toBeGreaterThanOrEqual(4.5)

    // A hovered, unselected row stays on the neutral hover fill, never the accent.
    await openRow.hover()
    const hoveredBg = await openRow.evaluate(element => getComputedStyle(element).backgroundColor)
    expect(hoveredBg).not.toBe(selectedBg)
  })

  test(`the live-preview indicator and the last-valid-render warning meet 4.5:1 contrast in the ${colorScheme} scheme, and neither reads in red`, async ({ page }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width: 1440, height: 900 })
    await login(page, true)
    await choose(page, 'welcome.mmd')
    await live(page)
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(colorScheme === 'dark')

    const status = page.locator('.pane-heading').getByRole('status')
    await expect(status).toHaveText('Live preview')
    const [primaryColor, warningColor, destructiveColor] = await Promise.all([
      customPropertyColor(page, '--primary'),
      customPropertyColor(page, '--warning'),
      customPropertyColor(page, '--destructive'),
    ])
    expect(await status.evaluate(element => getComputedStyle(element).color)).toBe(primaryColor)
    expect(await textContrast(page, status)).toBeGreaterThanOrEqual(4.5)

    const source = page.getByLabel('Mermaid source', { exact: true })
    await source.fill('this is not valid mermaid syntax {{{')
    const warning = page.locator('.preview-warning')
    await expect(warning).toBeVisible({ timeout: 15000 })
    await expect(status).toHaveText('Last valid preview')
    const warningTextColor = await status.evaluate(element => getComputedStyle(element).color)
    expect(warningTextColor).toBe(warningColor)
    expect(warningTextColor).not.toBe(destructiveColor)
    expect(await textContrast(page, status)).toBeGreaterThanOrEqual(4.5)

    const bannerColor = await warning.evaluate(element => getComputedStyle(element).color)
    expect(bannerColor).toBe(warningColor)
    expect(bannerColor).not.toBe(destructiveColor)
    expect(await textContrast(page, warning)).toBeGreaterThanOrEqual(4.5)
  })

  test(`an inline document link meets 4.5:1 contrast against the surface behind it in the ${colorScheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width: 1440, height: 900 })
    const name = `accent-link-${randomUUID()}.md`
    const path = join(root, name)
    await writeFile(path, '# Heading\n\nSee the [linked section](#heading) inline.\n', { flag: 'wx' })
    try {
      await login(page, true)
      await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
      await page.getByRole('button', { name, exact: true }).click()
      const article = page.getByRole('article', { name: 'Markdown document', exact: true })
      await expect(article).toBeVisible()
      const link = article.getByRole('button', { name: 'linked section', exact: true })
      await expect(link).toBeVisible()
      expect(await textContrast(page, link)).toBeGreaterThanOrEqual(4.5)
    }
    finally {
      await rm(path, { force: true })
    }
  })
}

const openRoot = process.env.MERDECK_OPEN_ROOT
const openUrl = process.env.MERDECK_OPEN_URL

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the person's chat bubble text meets 4.5:1 contrast on its filled accent background in the ${colorScheme} scheme`, async ({ page }) => {
    test.skip(process.env.MERDECK_TEST_AGENTS !== 'true' || !openRoot || !openUrl, 'Set MERDECK_TEST_AGENTS=true, MERDECK_OPEN_URL and MERDECK_OPEN_ROOT to run the fake-provider acceptance.')
    await page.emulateMedia({ colorScheme })
    const path = join(openRoot!, `accent-chat-${randomUUID()}.mmd`)
    // The deterministic provider used by browser acceptance is spawned with the open-access root as its
    // working directory and writes every accepted file change to this one relative path, whichever file the
    // turn actually named. Any case that sends a turn against that root therefore produces this file as
    // well as its own fixture, and has to remove both: the cases that do own that path exclusive-create it,
    // so a copy left behind here fails them before they open a page.
    const provided = join(openRoot!, 'agent-live.mmd')
    await writeFile(path, 'flowchart LR\nA[Before]-->B[Preview]\n', { flag: 'wx' })
    try {
      await page.goto(openUrl!)
      await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
      await choose(page, path.split('/').at(-1)!)
      await live(page)
      await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
      const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
      await editor.getByLabel('Agent instruction', { exact: true }).fill('Update the diagram.')
      await editor.getByRole('button', { name: 'Send', exact: true }).click()
      const conversation = editor.getByRole('log', { name: 'AI conversation', exact: true })
      const bubble = conversation.locator('.agent-user p')
      await expect(bubble).toBeVisible({ timeout: 15000 })
      const bubbleRatio = await textContrast(page, bubble, bubble.locator('..'))
      reportRatio('chat bubble text', colorScheme, bubbleRatio)
      expect(bubbleRatio).toBeGreaterThanOrEqual(4.5)
      // The provider writes the file before it reports the change, so waiting for the reported target puts
      // the clean-up below after that write rather than in a race with it.
      await expect(conversation.locator('code', { hasText: 'agent-live.mmd' })).toBeVisible({ timeout: 15000 })
    }
    finally {
      await rm(path, { force: true })
      await rm(provided, { force: true })
    }
  })
}
