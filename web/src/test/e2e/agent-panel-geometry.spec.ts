import type { Page } from '@playwright/test'
import { expect, test } from './support'

const url = process.env.MERDECK_OPEN_URL
test.skip(!url, 'Set MERDECK_OPEN_URL to a disposable service without an access token.')

const viewport = { width: 390, height: 844 }

interface Geometry {
  headerBottom: number
  panelTop: number
  panelBottom: number
  barTop: number
  statusBottom: number
  statusHeight: number
  headerHeight: number
  reportedMaximum: number
  reportedNow: number
  renderedPercent: number
}

// One read of a live layout can catch a frame mid-paint, so every figure below is taken twice across
// animation frames, after any running animation has settled, and the two reads must agree.
async function geometry(page: Page): Promise<Geometry> {
  const read = () => page.evaluate(async (): Promise<Geometry> => {
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const panel = box('.agent-pane')
    const handle = document.querySelector('.agent-resizer')!
    const header = box('.app-header')
    return {
      headerBottom: header.bottom,
      headerHeight: header.height,
      panelTop: panel.top,
      panelBottom: panel.bottom,
      barTop: box('.phone-tabbar').top,
      statusBottom: box('.status-bar').bottom,
      statusHeight: box('.status-bar').height,
      reportedMaximum: Number(handle.getAttribute('aria-valuemax')),
      reportedNow: Number(handle.getAttribute('aria-valuenow')),
      renderedPercent: (panel.height / window.innerHeight) * 100,
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

async function driveToMaximum(page: Page) {
  const handle = page.getByRole('separator', { name: 'Resize AI file editor', exact: true })
  await handle.focus()
  // Well past the reported range, so the clamp rather than the key count decides where it stops.
  for (let index = 0; index < 20; index++) await page.keyboard.press('ArrowUp')
}

// The property this whole area exists to protect is geometric and externally checkable, not an
// agreement between two numbers the component derives from one another: driven to the maximum it
// reports, the panel must sit inside the room the layout actually leaves it — below the header, above
// the phone bar and the status bar — whatever bottom safe area the device reports, and whenever that
// inset changes. Asserting only that the reported value matches the reported maximum passes on a
// shape whose top edge covers a third of the header, so it is asserted here alongside, never alone.
function assertInsideTheLayout(measured: Geometry) {
  expect(measured.panelTop, 'the panel must not climb over the header').toBeGreaterThanOrEqual(measured.headerBottom)
  expect(measured.panelBottom, 'the panel must not cover the phone bar').toBeLessThanOrEqual(measured.barTop)
  expect(measured.statusBottom, 'the status bar must still reach the bottom edge, safe area included').toBeCloseTo(viewport.height, 1)
  expect(measured.reportedNow, 'the reported position must stop at the reported maximum').toBe(Math.round(measured.reportedMaximum))
  expect(measured.renderedPercent, 'the rendered height must match the reported maximum').toBeCloseTo(measured.reportedMaximum, 1)
}

test('the assistant panel stays inside the layout at the maximum it reports, at any bottom safe area', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 0, right: 0 } })
  await page.setViewportSize(viewport)
  await page.goto(url!)
  await openPanel(page)

  // Control: two figures this reading code must produce that are known independently of anything the
  // panel computes — the phone header's own rendered height, and the status bar reaching the bottom
  // edge of the viewport. If these are wrong, the measurements below are measuring the wrong boxes.
  const control = await geometry(page)
  expect(control.headerHeight, 'control: the phone header renders 58px tall').toBeCloseTo(58, 1)
  expect(control.statusBottom, 'control: the status bar ends at the bottom of the viewport').toBeCloseTo(viewport.height, 1)

  await driveToMaximum(page)
  assertInsideTheLayout(await geometry(page))
})

test('the assistant panel stays inside the layout when the bottom safe area is set before it loads', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 34, right: 0 } })
  await page.setViewportSize(viewport)
  await page.goto(url!)
  await openPanel(page)
  await driveToMaximum(page)
  assertInsideTheLayout(await geometry(page))
})

test('the assistant panel stays inside the layout when the bottom safe area changes with no resize after it', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 0, right: 0 } })
  await page.setViewportSize(viewport)
  await page.goto(url!)
  await openPanel(page)
  // Browser chrome collapsing, a standalone display mode being entered or left, or an OS change to
  // the home-indicator area all move this inset without a window resize following it.
  await page.evaluate(() => {
    ;(window as Window & { resized?: number }).resized = 0
    window.addEventListener('resize', () => {
      (window as Window & { resized?: number }).resized! += 1
    })
  })
  await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 0, bottom: 34, right: 0 } })
  const grown = await geometry(page)
  // The layout's own CSS resolves env(safe-area-inset-bottom) with no event at all: the status bar,
  // whose height carries that inset, grows from 30px to 64px on its own. Anything that instead keeps
  // a copy of the inset needs a signal, and there is none here — hence the check that follows.
  expect(grown.statusHeight, 'the layout itself must have taken the new inset').toBeCloseTo(64, 1)
  expect(await page.evaluate(() => (window as Window & { resized?: number }).resized), 'no resize may follow the change').toBe(0)

  await driveToMaximum(page)
  assertInsideTheLayout(await geometry(page))
})
