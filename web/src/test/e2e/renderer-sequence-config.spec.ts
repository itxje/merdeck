import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// A bidirectional message is ordinary sequence syntax whose angle brackets the policy used to refuse.
const sequence = '---\ntitle: Control exchange\n---\nsequenceDiagram\n    autonumber\n    participant A as Member A\n    participant B as Member B\n    A->>B: Signed request\n    A<<->>B: Propagate history and receipt\n    B-->>A: Verified result\n'
// Mermaid draws a bar 20 pixels high by default, so a taller bar proves the configuration arrived.
const gantt = '---\ntitle: Installation\nconfig:\n  gantt:\n    useMaxWidth: true\n    barHeight: 40\n    barGap: 8\n---\ngantt\n    dateFormat YYYY-MM-DD\n    section Power\n    Panels :done, pv, 2020-03-02, 5d\n    Inverter :active, inv, after pv, 4d\n'

test('a bidirectional sequence message renders instead of being refused', async ({ page }) => {
  const name = `renderer-sequence-${randomUUID()}.mmd`
  const path = join(root, name)
  await writeFile(path, sequence, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await choose(page, name)
    await live(page)
    const svg = page.locator('.diagram-graphic svg')
    const text = (await svg.locator('text').allTextContents()).map(item => item.trim())
    expect(text).toEqual(expect.arrayContaining(['Control exchange', 'Member A', 'Member B', 'Signed request', 'Propagate history and receipt', 'Verified result']))
    expect(await svg.textContent()).not.toMatch(/<|&(?:lt|gt|amp);/i)
    await expect(svg.locator('foreignObject, script, image, a, use, style, [href], [style]')).toHaveCount(0)
  }
  finally { await rm(path, { force: true }) }
})

test('a bounded front matter configuration reaches the rendered Gantt chart', async ({ page }) => {
  const name = `renderer-config-${randomUUID()}.mmd`
  const path = join(root, name)
  await writeFile(path, gantt, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await choose(page, name)
    await live(page)
    const svg = page.locator('.diagram-graphic svg')
    await expect(svg.locator('rect.task')).toHaveCount(2)
    expect((await svg.locator('text').allTextContents()).map(item => item.trim())).toEqual(expect.arrayContaining(['Installation', 'Power', 'Panels', 'Inverter']))
    const height = await svg.locator('rect.task').first().evaluate(element => (element as unknown as SVGGraphicsElement).getBBox().height)
    expect(height).toBeGreaterThan(30)
  }
  finally { await rm(path, { force: true }) }
})
