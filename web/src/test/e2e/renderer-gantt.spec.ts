import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// The tasks sit years away from today, so Mermaid draws its today marker far to the right of every
// bar. The fitted diagram must be the chart, not the distance to that marker.
const source = 'gantt\n    title Installation\n    dateFormat YYYY-MM-DD\n    section Power\n    Panels :done, pv, 2020-03-02, 5d\n    Inverter :active, inv, after pv, 4d\n    section Trials\n    Sea trial :milestone, sea, after inv, 0d\n'

test('a Gantt chart renders its bars and fits without its far-away today marker', async ({ page }) => {
  const name = `renderer-gantt-${randomUUID()}.mmd`
  const path = join(root, name)
  await writeFile(path, source, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await choose(page, name)
    await live(page)
    const svg = page.locator('.diagram-graphic svg')
    await expect(svg.locator('rect.task')).toHaveCount(3)
    await expect(svg.locator('.today')).toHaveCount(2)
    expect((await svg.locator('text').allTextContents()).map(text => text.trim())).toEqual(expect.arrayContaining(['Installation', 'Power', 'Trials', 'Panels', 'Inverter']))
    const width = await svg.evaluate(element => (element as unknown as SVGSVGElement).viewBox.baseVal.width)
    expect(width).toBeGreaterThan(0)
    expect(width).toBeLessThan(4000)
    const zoom = await page.locator('.preview-controls').getByRole('status').textContent()
    expect(Number.parseInt(zoom ?? '0', 10)).toBeGreaterThanOrEqual(20)
  }
  finally { await rm(path, { force: true }) }
})
