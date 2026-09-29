import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// Mermaid sizes each family's title its own way, from the 14 px body size up to 4ex; the preview gives them one size.
const titled = {
  'flowchart': '---\ntitle: Diagram title\n---\nflowchart LR\n  A[Alpha] --> B[Beta]\n',
  'sequence': 'sequenceDiagram\n  title Diagram title\n  Alice->>Bob: Hello\n',
  'state': '---\ntitle: Diagram title\n---\nstateDiagram-v2\n  [*] --> Idle\n',
  'class': '---\ntitle: Diagram title\n---\nclassDiagram\n  Animal <|-- Dog\n',
  'entity relationship': '---\ntitle: Diagram title\n---\nerDiagram\n  CUSTOMER ||--o{ ORDER : places\n',
  'requirement': '---\ntitle: Diagram title\n---\nrequirementDiagram\n  requirement r1 {\n    id: 1\n    text: t\n  }\n',
  'gantt': 'gantt\n  title Diagram title\n  dateFormat YYYY-MM-DD\n  section S\n  Task :a1, 2026-01-01, 3d\n',
  'git': '---\ntitle: Diagram title\n---\ngitGraph\n  commit\n',
  'pie': 'pie title Diagram title\n  "A" : 40\n  "B" : 60\n',
  'journey': 'journey\n  title Diagram title\n  section Go\n    Walk: 5: Me\n',
  'timeline': 'timeline\n  title Diagram title\n  2025 : One\n',
  'quadrant': 'quadrantChart\n  title Diagram title\n  x-axis Low --> High\n  y-axis Low --> High\n  A: [0.3, 0.6]\n',
  'xy': 'xychart-beta\n  title "Diagram title"\n  x-axis [a, b]\n  bar [1, 2]\n',
}
// Messages, sequence numbers and journey legends are also direct children of the diagram.
const untitled = {
  sequence: 'sequenceDiagram\n  autonumber\n  Alice->>Bob: Hello\n',
  journey: 'journey\n  section Go\n    Walk: 5: Me, Cat\n',
}

test('every diagram family draws its title at one size above the body text', async ({ page }) => {
  const sources: Record<string, string> = { ...titled, ...Object.fromEntries(Object.entries(untitled).map(([family, source]) => [`untitled ${family}`, source])) }
  const names = Object.fromEntries(Object.keys(sources).map(family => [family, `renderer-title-${randomUUID()}.mmd`]))
  try {
    for (const [family, source] of Object.entries(sources))
      await writeFile(join(root, names[family]!), source, { flag: 'wx' })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    const sizes: Record<string, string | null> = {}
    for (const family of Object.keys(titled)) {
      await choose(page, names[family]!)
      await live(page)
      sizes[family] = await page.locator('.diagram-graphic svg').evaluate((svg) => {
        const title = [...svg.querySelectorAll('text')].find(text => text.textContent?.trim() === 'Diagram title')
        return title ? getComputedStyle(title).fontSize : null
      })
    }
    expect(sizes).toEqual(Object.fromEntries(Object.keys(titled).map(family => [family, '18px'])))
    for (const family of Object.keys(untitled)) {
      await choose(page, names[`untitled ${family}`]!)
      await live(page)
      const direct = await page.locator('.diagram-graphic svg').evaluate(svg => [...svg.querySelectorAll(':scope > text')].map(text => getComputedStyle(text).fontSize))
      expect(direct.length).toBeGreaterThan(0)
      expect(direct).not.toContain('18px')
    }
  }
  finally {
    for (const name of Object.values(names))
      await rm(join(root, name), { force: true })
  }
})
