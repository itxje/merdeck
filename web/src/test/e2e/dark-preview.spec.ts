import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { browse, choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

const styled = `flowchart LR
  subgraph G[Light authored group]
    A[Default node] --> B[Blue node]
  end
  style G fill:#f8fafc,stroke:#cbd5e1,color:#334155
  classDef blue fill:#dbeafe,stroke:#1d4ed8,color:#111111
  class B blue
`

test('dark interface keeps an authored light diagram on a readable paper canvas', async ({ page }, info) => {
  const owned = await mkdtemp(join(root, 'dark-preview-'))
  const path = `${basename(owned)}/paper.mmd`
  await writeFile(join(owned, 'paper.mmd'), styled)
  await writeFile(join(owned, 'paper.md'), '# Overview\n\n```mermaid\nflowchart LR\nA[Inline] --> B[Diagram]\n```\n')
  try {
    await page.addInitScript(() => localStorage.setItem('merdeck.theme', 'dark'))
    await page.setViewportSize({ width: 1200, height: 800 })
    await login(page, true)
    await choose(page, path)
    await live(page)
    await expect(page.locator('html')).toHaveClass('dark')

    const colours = async () => page.locator('.preview-surface').evaluate((surface) => {
      const sample = (value: string): number[] => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')!
        context.fillStyle = value
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      const svg = surface.querySelector('svg')!
      return {
        paper: sample(getComputedStyle(surface).backgroundColor),
        group: sample(getComputedStyle(svg.querySelector<SVGRectElement>('g.cluster rect')!).fill),
        blue: sample(getComputedStyle([...svg.querySelectorAll<SVGGElement>('g.node')].find(node => node.textContent?.includes('Blue node'))!.querySelector('rect, polygon, path')!).fill),
        line: sample(getComputedStyle(svg.querySelector<SVGPathElement>('path.flowchart-link')!).stroke),
        label: sample(getComputedStyle(svg.querySelector<SVGTextElement>('g.cluster-label text')!).fill),
      }
    })
    const dark = await colours()
    expect(dark.paper.every(channel => channel >= 245)).toBe(true)
    expect(dark.group).toEqual([248, 250, 252])
    expect(dark.blue).toEqual([219, 234, 254])
    expect(dark.line.every(channel => channel < 180)).toBe(true)
    expect(dark.label.every(channel => channel < 140)).toBe(true)

    await page.getByRole('button', { name: 'Light theme', exact: true }).click()
    await live(page)
    expect((await colours()).paper.every(channel => channel >= 245)).toBe(true)
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
    await live(page)
    await page.setViewportSize({ width: 390, height: 844 })
    expect((await colours()).paper.every(channel => channel >= 245)).toBe(true)
    await page.screenshot({ path: info.outputPath('dark-paper-phone.png'), fullPage: true, animations: 'disabled' })
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.getByLabel('Mermaid source', { exact: true }).fill('flowchart LR\nA[Unstyled] --> B[Default]\n')
    await live(page)
    const unstyled = await page.locator('.preview-surface').evaluate((surface) => {
      const text = surface.querySelector<SVGTextElement>('g.node text')!
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = getComputedStyle(text).fill
      context.fillRect(0, 0, 1, 1)
      return { paper: getComputedStyle(surface).backgroundColor, ink: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3) }
    })
    expect(unstyled.paper).not.toBe('rgba(0, 0, 0, 0)')
    expect(unstyled.ink.every(channel => channel < 140)).toBe(true)

    await browse(page, basename(owned))
    await page.getByRole('button', { name: 'paper.md', exact: true }).click()
    const inline = page.locator('.document-diagram')
    await expect(inline.locator('svg')).toBeVisible()
    const inlinePaper = await inline.evaluate((element) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = getComputedStyle(element).backgroundColor
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
    })
    expect(inlinePaper.every(channel => channel >= 245)).toBe(true)
  }
  finally {
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})
