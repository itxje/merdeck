import type { Page } from '@playwright/test'
import { readFile, realpath, rename, statfs, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, chooseBlock, expect, live, login, settledDialog, test } from './support'

test.use({ trace: 'off' })
const project = process.env.MERDECK_SMOKE_ROOT
const tokenFile = process.env.MERDECK_SMOKE_TOKEN_FILE
if (!project || !tokenFile)
  throw new Error('Set an explicit disposable MERDECK_SMOKE_ROOT and owner-readable MERDECK_SMOKE_TOKEN_FILE.')
const root = project
let original = ''
async function fitBounds(page: Page) {
  await page.getByRole('button', { name: 'Fit', exact: true }).click()
  const bounds = await page.locator('.diagram-graphic svg').evaluate((svg) => {
    const box = (svg as SVGSVGElement).viewBox.baseVal
    const content = (svg as SVGSVGElement).getBBox()
    return { fits: content.x >= box.x && content.y >= box.y && content.x + content.width <= box.x + box.width && content.y + content.height <= box.y + box.height, width: svg.getBoundingClientRect().width }
  })
  expect(bounds.fits).toBe(true)
  expect(bounds.width).toBeGreaterThan(20)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test.beforeAll(async () => {
  expect(await realpath(root)).toBe(root)
  expect(`0x${(await statfs(root)).type.toString(16)}`).toBe(process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630')
  original = await readFile(join(root, 'docs/overview.md'), 'utf8')
})
test.afterAll(async () => {
  await writeFile(join(root, 'docs/overview.md'), original)
})

test('real files, independent Markdown drafts, save snapshots, conflicts, responsive preview and safe rendering', async ({ page }) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 1440, height: 920 })
  await login(page)
  await choose(page, 'overview.md')
  await live(page)
  await fitBounds(page)
  await page.screenshot({ path: '../tmp/ui-desktop-light.png', fullPage: true, animations: 'disabled' })
  const editor = page.getByLabel('Mermaid source', { exact: true })
  const first = await editor.inputValue()
  const firstDraft = `${first}\n  Preview --> Verified\n`
  await editor.fill(firstDraft)
  await chooseBlock(page, 'overview.md', 2)
  const second = await editor.inputValue()
  const secondDraft = `${second}\n  Clean --> Tested\n`
  await editor.fill(secondDraft)
  await chooseBlock(page, 'overview.md', 1)
  await expect(editor).toHaveValue(firstDraft)
  const firstSave = page.waitForResponse(response => response.request().method() === 'PUT')
  await page.getByRole('button', { name: /^Save/ }).click()
  expect((await firstSave).status()).toBe(200)
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
  await expect(editor).toHaveValue(firstDraft)
  expect(await readFile(join(root, 'docs/overview.md'), 'utf8')).toContain('Preview --> Verified')
  await chooseBlock(page, 'overview.md', 2)
  await expect(editor).toHaveValue(secondDraft)
  const secondSave = page.waitForResponse(response => response.request().method() === 'PUT')
  await page.keyboard.press('Control+s')
  expect((await secondSave).status()).toBe(200)
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
  const both = await readFile(join(root, 'docs/overview.md'), 'utf8')
  expect(both).toContain('Clean --> Tested')
  expect(both.replace(firstDraft, first).replace(secondDraft, second)).toBe(original)

  let releaseSave: () => void = () => {}
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve
  })
  await page.route('**/api/diagrams/source', async (route) => {
    await saveGate

    await route.continue()
  }, { times: 1 })
  await editor.fill(`${secondDraft}\n  Tested --> Submitted\n`)
  const pending = page.waitForRequest(request => request.method() === 'PUT')
  await page.getByRole('button', { name: /^Save/ }).click()
  await pending
  await editor.fill(`${secondDraft}\n  Tested --> Newer\n`)
  releaseSave()
  await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
  await expect(editor).toHaveValue(/Tested --> Newer/)
  expect(await readFile(join(root, 'docs/overview.md'), 'utf8')).toContain('Tested --> Submitted')

  const externalBytes = (await readFile(join(root, 'docs/overview.md'), 'utf8')).replace('Submitted', 'External')
  await writeFile(join(root, 'docs/replacement.md'), externalBytes)
  await rename(join(root, 'docs/replacement.md'), join(root, 'docs/overview.md'))
  await expect(page.getByRole('button', { name: 'Review current file', exact: true })).toBeVisible({ timeout: 12000 })
  await expect(editor).toHaveValue(/Tested --> Newer/)
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Review current file', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('External')
  await settledDialog(page)
  await page.screenshot({ path: '../tmp/ui-conflict.png', fullPage: true, animations: 'disabled' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Review current file', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Review current file', exact: true }).click()
  await page.getByRole('button', { name: 'Discard drafts and load file' }).click()
  await expect(editor).toHaveValue(firstDraft)
  await chooseBlock(page, 'overview.md', 2)
  await expect(editor).toHaveValue(/Tested --> External/)
  await live(page)

  await editor.fill('flowchart LR\n  A -->')
  await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
  await expect(page.getByText('Last valid preview', { exact: true })).toBeVisible()
  await editor.fill('flowchart LR\n  A[Recovered] --> B[Preview]')
  await live(page)
  for (const malicious of [
    '%%{init: {"securityLevel":"loose"}}%%\nflowchart LR\nA-->B\nclick A "https://example.test/track"',
    '---\nconfig:\n  securityLevel: loose\n---\nflowchart LR\nA[<img src="https://example.test/track" onerror="window.pwned=1">]',
    'flowchart LR\nA["`![image](/diagram-resource-probe)`"]',
    'flowchart LR\nA@{ img: "https://example.test/track" }',
    'flowchart LR\nA-->B\nclassDef default fill:url(https://example.test/track)',
  ]) {
    await editor.fill(malicious)
    await expect(page.getByText('Rendering…', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
    await expect(page.getByText('Last valid preview', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => Reflect.has(window, 'pwned'))).toBe(false)
    expect(await page.locator('.diagram-graphic script,.diagram-graphic image,.diagram-graphic a,.diagram-graphic foreignObject,[onload],[onerror]').count()).toBe(0)
  }
  await editor.fill('flowchart TD\n  A[Project files] --> B{Markdown?}\n  B --> C[Source]\n  C --> D[Preview]')
  await live(page)
  await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Dark theme', exact: true })).toHaveAttribute('aria-pressed', 'true')
  // Move the pointer off the switch so its tooltip does not cover the screenshots.
  await page.mouse.move(1, 1)
  await expect(page.locator('html')).toHaveClass('dark')
  await live(page)
  await page.screenshot({ path: '../tmp/ui-desktop-dark.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  await fitBounds(page)
  await page.screenshot({ path: '../tmp/ui-narrow-preview.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('tab', { name: 'Source', exact: true }).click()
  await expect(editor).toBeVisible()
  await page.screenshot({ path: '../tmp/ui-narrow-source.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Open project files' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await settledDialog(page)
  await page.screenshot({ path: '../tmp/ui-narrow-files.png', fullPage: true, animations: 'disabled' })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open project files' })).toBeFocused()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('discards all unsaved drafts')
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(editor).toHaveValue(/Project files/)
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('button', { name: 'Discard drafts and log out' }).click()
  await expect(page.getByRole('heading', { name: 'Open your diagram workspace' })).toBeVisible()
})

test('clean external refresh, detected stale save and deletion keep original files and drafts safe', async ({ page, audit }) => {
  test.setTimeout(60000)
  audit.allowHttp(409, '/api/diagrams/source')
  audit.allowHttp(410, '/api/diagrams/document')
  const standalonePath = join(root, 'welcome.mmd')
  const initial = await readFile(standalonePath, 'utf8')
  try {
    await login(page)
    await choose(page, 'welcome.mmd')
    const editor = page.getByLabel('Mermaid source', { exact: true })
    const external = 'flowchart LR\n  External --> Refreshed\n'
    await writeFile(standalonePath, external)
    await expect(editor).toHaveValue(external, { timeout: 12000 })
    await editor.fill('flowchart LR\n  Local --> Draft\n')
    audit.offline = true
    await page.context().setOffline(true)
    await expect(page.getByText(/Connection interrupted/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    await expect(editor).toHaveValue('flowchart LR\n  Local --> Draft\n')
    await page.context().setOffline(false)
    await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/diagrams/source', async (route) => {
      await gate

      await route.continue()
    }, { times: 1 })
    const request = page.waitForRequest(item => item.method() === 'PUT')
    const response = page.waitForResponse(item => item.request().method() === 'PUT')
    await page.getByRole('button', { name: /^Save/ }).click()
    await request
    await writeFile(standalonePath, 'flowchart LR\n  Independent --> Writer\n')
    release()
    expect((await response).status()).toBe(409)
    await expect(editor).toHaveValue('flowchart LR\n  Local --> Draft\n')
    expect(await readFile(standalonePath, 'utf8')).toContain('Independent --> Writer')
    await rename(standalonePath, join(root, 'renamed.mmd'))
    await expect(page.getByRole('alert').filter({ hasText: 'deleted or renamed' })).toBeVisible({ timeout: 12000 })
    await expect(editor).toHaveValue('flowchart LR\n  Local --> Draft\n')
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Refresh files' }).click()
    await expect(page.getByRole('button', { name: 'renamed.mmd', exact: true })).toBeVisible({ timeout: 12000 })
    await page.getByRole('button', { name: 'renamed.mmd', exact: true }).click()
    await expect(editor).toHaveValue('flowchart LR\n  Independent --> Writer\n')
    await page.getByRole('button', { name: 'welcome.mmd', exact: true }).click()
    await expect(editor).toHaveValue('flowchart LR\n  Local --> Draft\n')
  }
  finally {
    await rename(join(root, 'renamed.mmd'), standalonePath).catch(() => {})
    await writeFile(standalonePath, initial)
  }
})

test('lost authentication retains a locked draft and explicit logout clears it', async ({ page, audit }) => {
  test.setTimeout(45000)
  for (const path of ['/api/diagrams/directory', '/api/diagrams/directory/revision', '/api/diagrams/directory/close', '/api/diagrams/document', '/api/diagrams/revision'])
    audit.allowHttp(401, path)
  await login(page)
  await choose(page, 'welcome.mmd')
  const editor = page.getByLabel('Mermaid source', { exact: true })
  await editor.fill('flowchart LR\n  Recover --> Draft')
  await page.context().clearCookies()
  await page.getByRole('button', { name: 'Refresh files' }).click()
  await expect(page.getByRole('heading', { name: 'Reconnect to your project' })).toBeVisible({ timeout: 12000 })
  await page.getByLabel('Access token', { exact: true }).fill((await readFile(tokenFile!, 'utf8')).trim())
  await page.getByRole('button', { name: 'Connect to project' }).click()
  await expect(editor).toHaveValue('flowchart LR\n  Recover --> Draft')
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Review current file', exact: true }).click()
  await page.getByRole('button', { name: 'Use draft with this revision' }).click()
  await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
  await expect(editor).toHaveValue('flowchart LR\n  Recover --> Draft')
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await page.getByRole('button', { name: 'Discard drafts and log out' }).click()
  await expect(page.getByRole('heading', { name: 'Open your diagram workspace' })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage))).not.toContain('token')
})

test('unsupported storage stays browsable and preserves a draft with saving disabled', async ({ page, audit }) => {
  audit.allowHttp(503, '/api/diagrams/source')
  const url = process.env.MERDECK_UNSUPPORTED_URL
  if (!url)
    throw new Error('Set MERDECK_UNSUPPORTED_URL to an actual unsupported-storage service.')
  await page.goto(url)
  await page.getByLabel('Access token', { exact: true }).fill((await readFile(tokenFile!, 'utf8')).trim())
  await page.getByRole('button', { name: 'Connect to project' }).click()
  await choose(page, 'welcome.mmd')
  await expect(page.getByText(/Read-only storage/)).toBeVisible()
  await page.getByLabel('Mermaid source', { exact: true }).fill('flowchart LR\n  Keep --> Draft')
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
  const refusal = await page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json()
    const document = await (await fetch('/api/diagrams/document?path=welcome.mmd')).json()
    const response = await fetch('/api/diagrams/source', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.data.csrfToken }, body: JSON.stringify({ path: 'welcome.mmd', selector: document.data.blocks[0].selector, source: 'flowchart LR\nA-->B', expectedVersion: document.data.version }) })
    const result = await response.json()
    return { status: response.status, code: result.error.code }
  })
  expect(refusal).toEqual({ status: 503, code: 'filesystem_unsupported' })
  await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveValue('flowchart LR\n  Keep --> Draft')
})
