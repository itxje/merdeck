import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('a node that names a project file opens it, and a missing target only explains itself', async ({ page }) => {
  const target = `linked-target-${randomUUID()}.mmd`
  const index = `linked-index-${randomUUID()}.mmd`
  await writeFile(join(root, target), 'flowchart LR\n  Target[Opened] --> Done\n', { flag: 'wx' })
  await writeFile(join(root, index), `flowchart TB\n  A1["Architecture"] --> B1["Missing"]\n  click A1 "${target}"\n  click B1 "linked-absent.mmd"\n`, { flag: 'wx' })
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await login(page, true)
    await choose(page, index)
    await live(page)
    const linked = page.locator('.diagram-graphic [data-file-link]').first()
    await expect(linked).toHaveAttribute('aria-label', `Open ${target}`)
    await expect(page.locator('.diagram-graphic [data-file-link]')).toHaveCount(2)

    // A target that is not in the project explains itself and leaves the diagram alone. The keyboard
    // path is the one a reader without a pointer takes.
    await page.locator('.diagram-graphic [data-file-link="linked-absent.mmd"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: 'That file is not in this project.' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(index)

    await linked.locator('rect').first().click({ position: { x: 4, y: 4 } })
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target)
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue('flowchart LR\n  Target[Opened] --> Done\n')
  }
  finally {
    await rm(join(root, index), { force: true })
    await rm(join(root, target), { force: true })
  }
})

for (const title of ['', '---\ntitle: File overview\n---\n']) {
  test(`relative node navigation retains source and drafts ${title ? 'with' : 'without'} title front matter`, async ({ page }) => {
    const directory = `navigation-${randomUUID()}`
    const fixture = join(root, directory)
    const index = `index-${randomUUID()}.mmd`
    const targetSource = 'flowchart LR\nTarget[Target file] --> Done\n'
    const noteSource = 'sequenceDiagram\nReader->>Notes: First block\n'
    const boundarySource = 'stateDiagram-v2\n[*] --> Boundary\n'
    const source = `${title}flowchart TB
  subgraph GROUP["Related diagrams"]
    A1["Details"] --> B1["Notes"] --> C1["Missing"]
  end
  OUT["Boundary"]
  GROUP --> OUT
  click A1 "details/target.mmd"
  click B1 "notes.md"
  click C1 "missing.mmd"
  click OUT "boundary.mermaid"
`
    await mkdir(join(fixture, 'details'), { recursive: true })
    await writeFile(join(fixture, index), source, { flag: 'wx' })
    await writeFile(join(fixture, 'details/target.mmd'), targetSource, { flag: 'wx' })
    await writeFile(join(fixture, 'notes.md'), `# Notes\n\n\`\`\`mermaid\n${noteSource}\`\`\`\n\n\`\`\`mermaid\nflowchart LR\nSecond --> Block\n\`\`\`\n`, { flag: 'wx' })
    await writeFile(join(fixture, 'boundary.mermaid'), boundarySource, { flag: 'wx' })
    const writes: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'PUT')
        writes.push(request.postData() ?? '')
    })
    try {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await login(page, true)
      await choose(page, index)
      await live(page)
      const editor = page.getByLabel('Mermaid source', { exact: true })
      const linked = (target: string) => page.locator(`.diagram-graphic [data-file-link="${target}"]`)
      await expect(page.locator('.diagram-graphic [data-file-link]')).toHaveCount(4)
      await expect(linked('details/target.mmd')).toHaveAttribute('role', 'link')
      await expect(linked('details/target.mmd')).toHaveAttribute('aria-label', 'Open details/target.mmd')
      await expect(linked('details/target.mmd')).toHaveAttribute('tabindex', '0')
      await expect(editor).toHaveValue(source)

      // Normal tab traversal reaches the nodes; Enter on a missing file leaves the draft intact.
      const canvas = page.getByRole('region', { name: 'Scrollable diagram canvas' })
      await canvas.focus()
      await page.keyboard.press('Tab')
      await expect(page.locator('.diagram-graphic [data-file-link]:focus')).toHaveCount(1)
      await linked('missing.mmd').focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('status').filter({ hasText: 'That file is not in this project.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${directory}/${index}`)

      const draft = `${source}%% Unsaved index note\n`
      await editor.fill(draft)
      await live(page)
      await linked('details/target.mmd').click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${directory}/details/target.mmd`)
      await expect(page).toHaveURL(url => url.searchParams.get('path') === `${directory}/details/target.mmd`)
      await expect(editor).toHaveValue(targetSource)
      const targetDraft = `${targetSource}%% Unsaved target note\n`
      await editor.fill(targetDraft)
      await choose(page, index)
      await expect(editor).toHaveValue(draft)
      await live(page)

      await linked('notes.md').focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${directory}/notes.md`)
      await expect(editor).toHaveValue(noteSource)
      await choose(page, index)
      await live(page)
      await linked('boundary.mermaid').focus()
      await page.keyboard.press('Space')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${directory}/boundary.mermaid`)
      await expect(editor).toHaveValue(boundarySource)
      await choose(page, index)
      await live(page)
      await linked('details/target.mmd').click()
      await expect(editor).toHaveValue(targetDraft)
      await choose(page, index)
      await expect(editor).toHaveValue(draft)
      await live(page)

      // Last-valid diagrams stay visible, but rejected source cannot leave actionable stale links.
      await editor.fill(`${draft}click A1 "../outside.mmd"\n`)
      await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
      await expect(page.locator('.diagram-graphic [data-file-link]')).toHaveCount(0)
      await page.locator('.diagram-graphic g.node[id*="-flowchart-A1-"]').click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${directory}/${index}`)
      await editor.fill(draft)
      await live(page)
      expect(writes).toEqual([])
      expect(await readFile(join(fixture, index), 'utf8')).toBe(source)
      expect(await readFile(join(fixture, 'details/target.mmd'), 'utf8')).toBe(targetSource)

      const saved = page.waitForResponse(response => response.request().method() === 'PUT')
      await page.getByRole('button', { name: /^Save/ }).click()
      expect((await saved).status()).toBe(200)
      await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
      expect(JSON.parse(writes[0]!)).toMatchObject({ path: `${directory}/${index}`, source: draft })
      expect(await readFile(join(fixture, index), 'utf8')).toBe(draft)
      expect(writes).toHaveLength(1)
    }
    finally { await rm(fixture, { recursive: true, force: true }) }
  })
}
