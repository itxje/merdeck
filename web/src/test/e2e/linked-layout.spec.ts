import type { Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { linkedGroups, linkedIndex, linkedTopology } from '../linked-flowchart'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

async function geometry(page: Page) {
  const svg = page.locator('.diagram-graphic svg')
  await expect(svg.locator('g.node')).toHaveCount(18)
  await expect(svg.locator('g.cluster')).toHaveCount(4)
  await expect(svg.locator('path.flowchart-link')).toHaveCount(7)
  return svg.evaluate((element) => {
    const canvas = element.closest('.preview-surface')!
    const bounds = (node: Element) => {
      const box = node.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    }
    return {
      viewBox: element.getAttribute('viewBox'),
      canvas: bounds(canvas),
      nodes: [...element.querySelectorAll('g.node')].map(node => ({
        id: /-flowchart-(.+)-\d+$/.exec(node.id)![1]!,
        ...bounds(node),
        visible: getComputedStyle(node).visibility === 'visible' && getComputedStyle(node).display !== 'none',
      })).sort((a, b) => a.id.localeCompare(b.id)),
      groups: [...element.querySelectorAll('g.cluster')].map(group => ({ id: group.id.replace(/^diagram-\d+-/, ''), ...bounds(group.querySelector('rect')!) })),
    }
  })
}

function checkGeometry(observed: Awaited<ReturnType<typeof geometry>>) {
  const overlaps: string[] = []
  for (const [index, node] of observed.nodes.entries()) {
    expect(node.visible, `${node.id} visible`).toBe(true)
    expect(node.width, `${node.id} width`).toBeGreaterThan(1)
    expect(node.height, `${node.id} height`).toBeGreaterThan(1)
    expect(node.x).toBeGreaterThanOrEqual(observed.canvas.x - 1)
    expect(node.y).toBeGreaterThanOrEqual(observed.canvas.y - 1)
    expect(node.x + node.width).toBeLessThanOrEqual(observed.canvas.x + observed.canvas.width + 1)
    expect(node.y + node.height).toBeLessThanOrEqual(observed.canvas.y + observed.canvas.height + 1)
    for (const other of observed.nodes.slice(index + 1)) {
      if (Math.min(node.x + node.width, other.x + other.width) - Math.max(node.x, other.x) > 0.5
        && Math.min(node.y + node.height, other.y + other.height) - Math.max(node.y, other.y) > 0.5) {
        overlaps.push(`${node.id}:${other.id}`)
      }
    }
  }
  expect(overlaps, 'node bounding boxes must not overlap').toEqual([])
  for (const [id, members] of Object.entries(linkedGroups)) {
    const group = observed.groups.find(item => item.id === id)!
    for (const member of members) {
      const node = observed.nodes.find(item => item.id === member)!
      expect(node.x, `${member} inside ${id} left`).toBeGreaterThanOrEqual(group.x - 0.5)
      expect(node.y, `${member} inside ${id} top`).toBeGreaterThanOrEqual(group.y - 0.5)
      expect(node.x + node.width, `${member} inside ${id} right`).toBeLessThanOrEqual(group.x + group.width + 0.5)
      expect(node.y + node.height, `${member} inside ${id} bottom`).toBeLessThanOrEqual(group.y + group.height + 0.5)
    }
  }
}

for (const title of ['', '---\ntitle: Diagram overview\n---\n']) {
  test(`relative node links preserve grouped and ungrouped geometry ${title ? 'with' : 'without'} title front matter`, async ({ page }, info) => {
    const name = `linked-layout-${randomUUID()}.mmd`
    const path = join(root, name)
    const source = title + linkedIndex
    await writeFile(path, source, { flag: 'wx' })
    try {
      await page.setViewportSize({ width: 1600, height: 1000 })
      await login(page, true)
      await choose(page, name)
      await live(page)
      const editor = page.getByLabel('Mermaid source', { exact: true })
      const linked = await geometry(page)
      await writeFile(info.outputPath('linked-geometry.json'), JSON.stringify(linked, null, 2))
      await writeFile(info.outputPath('linked.svg'), await page.locator('.diagram-graphic').innerHTML())
      await page.screenshot({ path: info.outputPath('linked-layout.png'), animations: 'disabled' })
      checkGeometry(linked)
      await expect(page.locator('.diagram-graphic [data-file-link]')).toHaveCount(17)
      await expect(page.locator('.diagram-graphic a, .diagram-graphic [href], .diagram-graphic foreignObject')).toHaveCount(0)
      await expect(editor).toHaveValue(source)
      expect(await readFile(path, 'utf8')).toBe(source)

      // Compare actual geometry in the same browser, beyond just finding labels or transforms.
      await editor.fill(title + linkedTopology)
      await live(page)
      const plain = await geometry(page)
      await writeFile(info.outputPath('plain-geometry.json'), JSON.stringify(plain, null, 2))
      await writeFile(info.outputPath('plain.svg'), await page.locator('.diagram-graphic').innerHTML())
      checkGeometry(plain)
      await expect(page.locator('.diagram-graphic [data-file-link]')).toHaveCount(0)
      // Title text measurement can move the fitted viewBox slightly between renders.
      // Compare node layout relative to ROOT at the same scale, retaining the visible geometry checks above.
      const linkedRoot = linked.nodes.find(node => node.id === 'ROOT')!
      const plainRoot = plain.nodes.find(node => node.id === 'ROOT')!
      const ratio = linkedRoot.width / plainRoot.width
      for (const [index, node] of linked.nodes.entries()) {
        const other = plain.nodes[index]!
        expect(other.id).toBe(node.id)
        for (const property of ['x', 'y'] as const)
          expect((other[property] - plainRoot[property]) * ratio, `${node.id} ${property}`).toBeCloseTo(node[property] - linkedRoot[property], 1)
        for (const property of ['width', 'height'] as const)
          expect(other[property] * ratio, `${node.id} ${property}`).toBeCloseTo(node[property], 1)
      }
      await editor.fill(source)
      await live(page)
      expect(await readFile(path, 'utf8')).toBe(source)
    }
    finally { await rm(path, { force: true }) }
  })
}
