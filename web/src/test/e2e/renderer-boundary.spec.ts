import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { browse, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

// Ordinary syntax that sits outside the preview's security boundary, one diagram per family.
const diagrams: Record<string, { source: string, text: string[] }> = {
  'class.mmd': { source: 'classDiagram\n    Animal <|-- Duck\n    Shape <.. Painter : draws & fills\n    class Shape {\n        <<interface>>\n        +draw() bool\n    }\n', text: ['Animal', 'Duck', 'draws & fills', 'interface'] },
  'state.mmd': { source: 'stateDiagram-v2\n    state check <<choice>>\n    [*] --> check\n    check --> Ready: a < b & c\n    check --> Failed: otherwise\n', text: ['Ready', 'Failed', 'a < b & c'] },
  'sequence.mmd': { source: 'sequenceDiagram\n    participant A as Client & Agent\n    A->>B: R&D uses CSS, links and style guides\n    B-->>A: see https://example.invalid/a and C:\\temp\\x\n    A->>B: x < y\n', text: ['Client & Agent', 'R&D uses CSS, links and style guides', 'see https://example.invalid/a and C:\\temp\\x', 'x < y'] },
  'table.mmd': { source: 'flowchart TB\n    classDef hdr fill:#e8e8e8,stroke:#666,color:#000,font-weight:bold\n    H1["Tailcat"]:::hdr ~~~ H2["keynet v0.3"]:::hdr\n    Deploy["mos-deploy"] --> Data["DATA: staging, metadata and transaction lock"]\n', text: ['Tailcat', 'keynet v0.3', 'DATA: staging, metadata and transaction lock'] },
}
const compact = (value: string) => value.replace(/\s+/g, '')

// The automatic browser audit also fails the case on any outbound request, so displayed addresses stay inert.
test('ordinary syntax outside the boundary renders in every family, with class font weight', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'boundary-'))
  const folder = basename(owned)
  await Promise.all(Object.entries(diagrams).map(([name, { source }]) => writeFile(join(owned, name), source)))
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await browse(page, folder)
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    for (const [name, { text }] of Object.entries(diagrams)) {
      await explorer.locator(`button[title="${folder}/${name}"]`).click()
      await live(page)
      const svg = page.locator('.diagram-graphic svg')
      await expect.poll(async () => compact((await svg.textContent()) ?? '')).toContain(compact(text[0]!))
      const drawn = compact((await svg.textContent()) ?? '')
      for (const item of text)
        expect(drawn).toContain(compact(item))
      await expect(svg.locator('foreignObject, script, image, a, use, style, [href], [style]')).toHaveCount(0)
    }
    // A class's font weight reaches the words of its labels; an unstyled label keeps the normal weight.
    const weights = await page.locator('.diagram-graphic svg').evaluate(svg => ['Tailcat', 'mos-deploy'].map((label) => {
      const text = [...svg.querySelectorAll('text')].find(item => item.textContent?.includes(label))!
      const word = [...text.querySelectorAll('tspan')].find(span => !span.querySelector('tspan'))!
      return Number(getComputedStyle(word).fontWeight)
    }))
    expect(weights[0]).toBeGreaterThanOrEqual(700)
    expect(weights[1]).toBe(400)
  }
  finally { await rm(owned, { recursive: true, force: true }) }
})

// The browser services cap sources at 8 KiB, so two-character identifiers keep 600 edges inside it.
test('a diagram beyond the former 500-edge limit renders', async ({ page }) => {
  test.setTimeout(90000)
  const id = (index: number) => index.toString(36).padStart(2, '0')
  const lines = ['flowchart TB']
  for (let index = 0; index < 600; index++)
    lines.push(`${id(Math.floor(index / 2))}-->${id(index + 1)}`)
  const name = `renderer-edges-${randomUUID()}.mmd`
  const path = join(root, name)
  await writeFile(path, `${lines.join('\n')}\n`, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await page.getByRole('complementary', { name: 'Project files', exact: true }).locator(`button[title="${name}"]`).click()
    await expect(page.getByText('Live preview', { exact: true })).toBeVisible({ timeout: 60000 })
    await expect(page.locator('.diagram-graphic svg .flowchart-link')).toHaveCount(600, { timeout: 60000 })
  }
  finally { await rm(path, { force: true }) }
})
