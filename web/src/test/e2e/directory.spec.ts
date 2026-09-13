import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { browse, choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

const source = 'flowchart LR\n  Original --> Diagram\n'

test('directory history, ancestors, deep save and legacy links preserve an independently selected draft', async ({ page }) => {
  const owned = await mkdtemp(join(root, 'directory-'))
  const top = basename(owned)
  const deep = `${top}/a/b/c/d/e`
  await mkdir(join(root, deep), { recursive: true })
  await writeFile(join(root, deep, 'deep.mmd'), source)
  try {
    await login(page, true)
    await choose(page, 'welcome.mmd')
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const draft = `${await editor.inputValue()}\n%% Retained while browsing\n`
    await editor.fill(draft)
    await browse(page, deep)
    await expect(editor).toHaveValue(draft)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('welcome.mmd')
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    await explorer.getByRole('button', { name: 'Up', exact: true }).click()
    await expect(page).toHaveURL(url => url.searchParams.get('directory') === `${top}/a/b/c/d`)
    await page.goBack()
    await expect(page).toHaveURL(url => url.searchParams.get('directory') === deep)
    await page.goForward()
    await expect(page).toHaveURL(url => url.searchParams.get('directory') === `${top}/a/b/c/d`)
    await explorer.getByRole('navigation', { name: 'Directory breadcrumbs' }).getByRole('button', { name: 'a', exact: true }).click()
    await expect(page).toHaveURL(url => url.searchParams.get('directory') === `${top}/a`)
    await browse(page, deep)
    await choose(page, 'deep.mmd')
    const saved = `${source}%% Deep save\n`
    await editor.fill(saved)
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()
    expect(await readFile(join(root, deep, 'deep.mmd'), 'utf8')).toBe(saved)
    await browse(page, '')
    await expect(explorer.getByText('RETAINED DRAFTS', { exact: true })).toHaveCount(0)
    await choose(page, 'welcome.mmd')
    await expect(editor).toHaveValue(draft)
    // Restore before a real reload; internal navigation never discarded this draft.
    await editor.fill(draft.replace('\n%% Retained while browsing\n', ''))
    await browse(page, deep)
    await page.reload()
    await expect(page).toHaveURL(url => url.searchParams.get('directory') === deep && url.searchParams.get('path') === 'welcome.mmd')
    await expect(explorer.getByRole('button', { name: 'deep.mmd', exact: true })).toBeVisible()
    await page.goto(`/?path=${encodeURIComponent(`${deep}/deep.mmd`)}&block=0`)
    await expect(editor).toHaveValue(saved)
    await expect(explorer.getByRole('button', { name: 'deep.mmd', exact: true })).toBeVisible()
    await expect(explorer.getByRole('navigation', { name: 'Directory breadcrumbs' }).getByRole('button', { name: 'e', exact: true })).toHaveAttribute('aria-current', 'location')
  }
  finally {
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})

test('directory pages advance past the old root budget with a five-page window and unlisted links', async ({ page }, info) => {
  const owned = await mkdtemp(join(root, 'pages-'))
  const top = basename(owned)
  await mkdir(join(owned, 'deep'))
  await writeFile(join(owned, 'deep', 'target.mmd'), source)
  // Six hundred siblings exceed the acceptance service's old recursive listing budget.
  for (let i = 0; i < 620; i++)
    await writeFile(join(owned, `entry-${String(i).padStart(3, '0')}.mmd`), `flowchart LR\nA-->B\nclick A "deep/target.mmd"\n`)
  const batches: string[][] = []
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname === '/api/diagrams/directory' && response.ok()) {
      const body = await response.json().catch(() => null)
      if (body?.data?.path === top)
        batches.push(body.data.entries.map((entry: { path: string }) => entry.path))
    }
  })
  try {
    await login(page, true)
    await browse(page, top)
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    await expect(explorer.getByText('Pages 1–1', { exact: true })).toBeVisible()
    const files = explorer.getByRole('navigation', { name: 'Files and diagrams' }).locator('button[title$=".mmd"]')
    const first = await files.first().getAttribute('title')
    expect(first).toBeTruthy()
    await choose(page, basename(first!))
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await expect(editor).toBeVisible()
    const draft = `${await editor.inputValue()}%% Window draft\n`
    await editor.fill(draft)
    for (let n = 2; n <= 7; n++) {
      await explorer.getByRole('button', { name: 'Next page', exact: true }).click()
      await expect(explorer.getByText(`Pages ${Math.max(1, n - 4)}–${n}`, { exact: true })).toBeVisible()
    }
    await expect(explorer.getByText('Earlier pages are no longer shown. Restart to see them.', { exact: true })).toBeVisible()
    await expect(explorer.getByText('End of this listing.', { exact: true })).toBeVisible()
    await expect(explorer.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
    expect(new Set(batches.flat()).size).toBe(621)
    expect(batches.flat()).toHaveLength(621)
    expect(await files.count()).toBeLessThanOrEqual(500)
    await expect(editor).toHaveValue(draft)
    await expect(explorer.getByText('RETAINED DRAFTS', { exact: true })).toBeVisible()
    await live(page)
    await page.locator('.diagram-graphic [data-file-link="deep/target.mmd"]').click()
    await expect(editor).toHaveValue(source)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${top}/deep/target.mmd`)
    await browse(page, top)
    await expect(explorer.getByText('Pages 1–1', { exact: true })).toBeVisible()
    await expect(explorer.getByRole('navigation', { name: 'Files and diagrams' })).toHaveAttribute('aria-busy', 'false')
    await live(page)
    await page.screenshot({ path: info.outputPath('directory-desktop.png'), fullPage: true, animations: 'disabled' })
  }
  finally {
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})

test('excluded-only continuations and filtered folders remain navigable, with deferred Markdown states', async ({ page, audit }) => {
  audit.allowHttp(415, '/api/diagrams/revision')
  const owned = await mkdtemp(join(root, 'excluded-'))
  const top = basename(owned)
  await mkdir(join(owned, 'only-hidden'))
  await mkdir(join(owned, 'empty'))
  for (let i = 0; i < 1100; i++)
    await writeFile(join(owned, 'only-hidden', `.ignored-${i}`), '')
  await writeFile(join(owned, 'prose.md'), '# No diagrams\n')
  await writeFile(join(owned, 'binary.md'), Buffer.from([0, 1]))
  await writeFile(join(owned, 'blocks.md'), '# Blocks\n```mermaid\nflowchart LR\nA-->B\n```\n```mermaid\nflowchart LR\nC-->D\n```\n')
  try {
    await login(page, true)
    await browse(page, top)
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    await expect(explorer.getByRole('list', { name: 'Diagrams in blocks.md' })).toHaveCount(0)
    await explorer.getByRole('button', { name: '.mmd and .mermaid files', exact: true }).click()
    await expect(explorer.getByRole('button', { name: 'empty', exact: true })).toBeVisible()
    await explorer.getByRole('button', { name: 'only-hidden', exact: true }).click()
    await expect(explorer.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled()
    await explorer.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(explorer.getByText('End of this listing.', { exact: true })).toBeVisible()
    await explorer.getByRole('button', { name: 'Up', exact: true }).click()
    await explorer.getByRole('button', { name: 'All files', exact: true }).click()
    await explorer.getByRole('button', { name: 'prose.md', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'No Mermaid blocks', exact: true })).toBeVisible()
    await explorer.getByRole('button', { name: 'binary.md', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Unable to open this file', exact: true })).toBeVisible()
    await explorer.getByRole('button', { name: 'blocks.md', exact: true }).click()
    await expect(explorer.getByRole('list', { name: 'Diagrams in blocks.md' }).getByRole('button')).toHaveCount(2)
  }
  finally {
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})

test('narrow source theme changes preserve fitted preview geometry and directory keyboard navigation', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, true)
  await page.getByRole('button', { name: 'Open project files', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Project files', exact: true })
  await drawer.getByRole('button', { name: 'docs', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(drawer.getByRole('button', { name: 'overview.md', exact: true })).toBeVisible()
  await drawer.getByRole('button', { name: 'overview.md', exact: true }).click()
  await page.getByRole('tab', { name: 'Source', exact: true }).click()
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(page.getByText('Live preview', { exact: true })).toBeAttached()
  await page.getByRole('tab', { name: 'Preview', exact: true }).click()
  await live(page)
  await expect(page.locator('.diagram-graphic svg g.node')).not.toHaveCount(0)
  const inside = await page.locator('.diagram-graphic svg').evaluate((svg) => {
    const box = (svg as SVGSVGElement).viewBox.baseVal
    return [...svg.querySelectorAll<SVGGraphicsElement>('g.node')].every((node) => {
      const bounds = node.getBBox()
      const matrix = node.getCTM()!
      const inverse = (svg as SVGSVGElement).getCTM()!.inverse()
      return [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y + bounds.height]].every(([x, y]) => {
        const point = new DOMPoint(x, y).matrixTransform(matrix).matrixTransform(inverse)
        return point.x >= box.x - 1 && point.y >= box.y - 1 && point.x <= box.x + box.width + 1 && point.y <= box.y + box.height + 1
      })
    })
  })
  expect(inside).toBe(true)
  await page.screenshot({ path: info.outputPath('directory-narrow-preview.png'), fullPage: true, animations: 'disabled' })
})

test('stale directory responses cannot replace a new location and external removal preserves the editor', async ({ page, audit }) => {
  audit.allowHttp(404, '/api/diagrams/directory')
  audit.allowHttp(404, '/api/diagrams/directory/revision')
  const owned = await mkdtemp(join(root, 'late-'))
  const top = basename(owned)
  await writeFile(join(owned, 'late.mmd'), source)
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await login(page, true)
    await choose(page, 'welcome.mmd')
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const draft = `${await editor.inputValue()}%% Independent draft\n`
    await editor.fill(draft)
    await page.route('**/api/diagrams/directory?*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('path') !== top) {
        await route.continue()
        return
      }
      const response = await route.fetch()
      await held
      await route.fulfill({ response }).catch(() => {})
    }, { times: 1 })
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    const pending = page.waitForRequest(request => new URL(request.url()).pathname === '/api/diagrams/directory' && new URL(request.url()).searchParams.get('path') === top)
    await explorer.getByRole('button', { name: top, exact: true }).click()
    await pending
    await explorer.getByRole('button', { name: 'Root', exact: true }).click()
    release()
    await expect(explorer.getByRole('navigation', { name: 'Files and diagrams', exact: true })).toHaveAttribute('aria-busy', 'false')
    await expect(explorer.getByRole('button', { name: /^welcome\.mmd(?: Unsaved changes)?$/ })).toBeVisible()
    await expect(explorer.getByRole('button', { name: 'late.mmd' })).toHaveCount(0)
    await expect(editor).toHaveValue(draft)
    await browse(page, top)
    await expect(explorer.getByRole('button', { name: 'late.mmd', exact: true })).toBeVisible()
    await rm(owned, { recursive: true })
    await explorer.getByRole('button', { name: 'Refresh files', exact: true }).click()
    await expect(explorer.getByRole('alert')).toBeVisible()
    await expect(editor).toHaveValue(draft)
    await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
    await explorer.getByRole('button', { name: 'Up', exact: true }).click()
    await expect(explorer.getByRole('navigation', { name: 'Files and diagrams', exact: true })).toHaveAttribute('aria-busy', 'false')
    await expect(explorer.getByRole('button', { name: /^welcome\.mmd(?: Unsaved changes)?$/ })).toBeVisible()
  }
  finally {
    release()
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})

test('a real namespace change rejects one continuation and Restart recovers without replay or draft loss', async ({ page, audit }) => {
  // Only this deliberately induced page conflict is expected; assert its exact
  // code and count below. Revision conflicts and rate limits remain unexpected.
  audit.allowHttp(409, '/api/diagrams/directory')
  const owned = await mkdtemp(join(root, 'namespace-'))
  const top = basename(owned)
  for (let n = 0; n < 110; n++)
    await writeFile(join(owned, `${n}.mmd`), source)
  const conflicts: number[] = []
  const requests: boolean[] = []
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === '/api/diagrams/directory' && response.status() >= 400)
      conflicts.push(response.status())
  })
  try {
    await login(page, true)
    await choose(page, 'welcome.mmd')
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const draft = `${await editor.inputValue()}%% Namespace race draft\n`
    await editor.fill(draft)
    await browse(page, top)
    const explorer = page.getByRole('complementary', { name: 'Project files', exact: true })
    await expect(explorer.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled()
    await page.route('**/api/diagrams/directory?*', async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('path') === top) {
        const continuation = url.searchParams.has('cursor')
        requests.push(continuation)
        if (continuation && requests.length === 1)
          await writeFile(join(owned, 'external.mmd'), source)
      }
      await route.continue()
    })
    const changed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/diagrams/directory' && response.status() === 409)
    await explorer.getByRole('button', { name: 'Next page', exact: true }).click()
    expect(await (await changed).json()).toMatchObject({ success: false, error: { code: 'directory_changed' } })
    await expect(explorer.getByRole('status').filter({ hasText: 'Listing is not current' })).toBeVisible()
    await expect(editor).toHaveValue(draft)
    await expect(explorer.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled()
    await explorer.getByRole('button', { name: 'Restart', exact: true }).click()
    await expect(explorer.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled()
    expect(requests).toEqual([true, false])
    expect(conflicts).toEqual([409])
    await expect(editor).toHaveValue(draft)
  }
  finally {
    await page.close()
    await rm(owned, { recursive: true, force: true })
  }
})
