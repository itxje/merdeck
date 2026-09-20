import type { Page } from '@playwright/test'
import { browse, expect, login, test } from './support'

// The Document/Diagram switch is the first thing a Markdown file shows. Its triggers take the 44px
// touch floor below the phone breakpoint while its list kept a fixed 32px height, so each trigger
// overflowed its own list by 12px, upward into the header, and the pair sat flush against the left
// edge of the screen. Both are geometric and checkable here.
const viewport = { width: 390, height: 844 }

interface Geometry {
  headerBottom: number
  headerHeight: number
  rowTop: number
  listTop: number
  listBottom: number
  listLeft: number
  listRight: number
  triggers: Array<{ top: number, bottom: number, width: number }>
  articleTop: number
  rowBottom: number
}

// One read of a live layout can catch a frame mid-paint, so the figures are taken twice across
// animation frames, after any running animation has settled, and the two reads must agree.
async function geometry(page: Page): Promise<Geometry> {
  const read = () => page.evaluate(async (): Promise<Geometry> => {
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const header = box('.app-header')
    const row = box('.view-switch')
    const list = box('.view-switch [data-slot="tabs-list"]')
    return {
      headerBottom: header.bottom,
      headerHeight: header.height,
      rowTop: row.top,
      rowBottom: row.bottom,
      listTop: list.top,
      listBottom: list.bottom,
      listLeft: list.left,
      listRight: list.right,
      triggers: [...document.querySelectorAll('.view-switch [data-slot="tabs-trigger"]')].map((trigger) => {
        const item = trigger.getBoundingClientRect()
        return { top: item.top, bottom: item.bottom, width: item.width }
      }),
      articleTop: box('article').top,
    }
  })
  const first = await read()
  expect(await read(), 'the layout must be settled before it is measured').toEqual(first)
  return first
}

test('the Markdown view switch holds its own triggers and keeps the reading gutter on a phone', async ({ page }) => {
  await page.setViewportSize(viewport)
  await login(page)
  await browse(page, 'docs')
  await page.getByRole('button', { name: /^overview\.md/ }).first().click()
  await expect(page.getByRole('article', { name: 'Markdown document', exact: true })).toBeVisible()
  const measured = await geometry(page)

  // Control: two facts known independently of anything this row computes — the phone header renders
  // 58px tall, and the row begins exactly where the header ends. A reading that fails either is
  // reading the wrong boxes, which is how an overflowing trigger can otherwise measure as contained.
  expect(measured.headerHeight, 'control: the phone header renders 58px tall').toBeCloseTo(58, 1)
  expect(measured.rowTop, 'control: the row starts where the header ends').toBeCloseTo(measured.headerBottom, 1)

  expect(measured.triggers.length, 'both views are offered').toBe(2)
  for (const trigger of measured.triggers) {
    expect(trigger.top, 'a trigger must not climb out of its own list').toBeGreaterThanOrEqual(measured.listTop)
    expect(trigger.bottom, 'a trigger must not fall out of its own list').toBeLessThanOrEqual(measured.listBottom)
    expect(trigger.width, 'the two views share the width rather than huddling in the corner').toBeGreaterThan((measured.listRight - measured.listLeft) * 0.4)
  }
  expect(measured.listLeft, 'the switch keeps a gutter from the edge of the screen').toBeGreaterThanOrEqual(8)
  expect(viewport.width - measured.listRight, 'the switch keeps a gutter from the edge of the screen').toBeGreaterThanOrEqual(8)
  expect(measured.articleTop, 'the document starts below the row, not under it').toBeGreaterThanOrEqual(measured.rowBottom)
})
