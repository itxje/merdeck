import type { Page } from '@playwright/test'
import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

// A phone browser's own toolbars leave a visual viewport well short of the device's height, and the
// panel's fixed chrome — title row, engine row, composer — does not shrink with it. At 55% of 640px
// that chrome took 255px of a 352px sheet and left 38px of conversation: a sliver showing one
// clipped line. Both heights below are measured for that reason, the taller one as the case that
// already worked and must keep working.
const viewports = [{ width: 390, height: 844 }, { width: 390, height: 640 }]
const readableTranscript = 140

interface Geometry {
  headerHeight: number
  pane: number
  paneContent: number
  title: number
  engines: number
  transcript: number
  composer: number
}

// One read of a live layout can catch a frame mid-paint, so every figure is taken twice across
// animation frames, after any running animation has settled, and the two reads must agree.
async function geometry(page: Page): Promise<Geometry> {
  const read = () => page.evaluate(async (): Promise<Geometry> => {
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const height = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().height
    return {
      headerHeight: height('.app-header'),
      pane: height('.agent-pane'),
      // Inside its own border, which the regions below do not span.
      paneContent: document.querySelector<HTMLElement>('.agent-pane')!.clientHeight,
      title: height('.agent-header'),
      engines: height('.agent-provider-row'),
      transcript: height('.agent-transcript'),
      composer: height('.agent-composer'),
    }
  })
  const first = await read()
  expect(await read(), 'the layout must be settled before it is measured').toEqual(first)
  return first
}

async function openPanel(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'More options', exact: true }).click()
  await page.getByRole('menu').getByRole('button', { name: 'Open AI file editor', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'AI file editor', exact: true })).toBeVisible()
}

for (const viewport of viewports) {
  test(`the AI file editor keeps a readable conversation at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto(url!)
    await openPanel(page)
    const measured = await geometry(page)

    // Control: two facts known independently of anything the panel computes — the phone header is
    // 58px tall, and the panel's four regions tile the panel exactly, since they are its only
    // children and none of them overlaps. A reading that fails either is reading the wrong boxes,
    // which is how a single clipped element can otherwise measure as a healthy one.
    expect(measured.headerHeight, 'control: the phone header renders 58px tall').toBeCloseTo(58, 1)
    expect(measured.title + measured.engines + measured.transcript + measured.composer, 'control: the panel regions must tile the panel').toBeCloseTo(measured.paneContent, 0)

    expect(measured.transcript, 'the conversation must stay readable, not a clipped line').toBeGreaterThanOrEqual(readableTranscript)
    expect(measured.transcript / measured.pane, 'the conversation must hold more of the panel than any one piece of its chrome').toBeGreaterThan(1 / 3)
  })
}
