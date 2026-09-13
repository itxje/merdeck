import { Buffer } from 'node:buffer'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

for (const name of ['welcome.mmd', 'sequence.mermaid']) {
  test(`standalone ${name} renders and persists consecutive keyboard saves`, async ({ page }) => {
    const path = join(root, name)
    const original = await readFile(path)
    try {
      await login(page, true)
      await choose(page, name)
      const editor = page.getByLabel('Mermaid source', { exact: true })
      for (const label of ['First', 'Second', 'Third']) {
        const source = `flowchart LR\n  ${label} --> Persisted\n`
        await editor.fill(source)
        await live(page)
        await expect(page.locator('.diagram-graphic svg')).toContainText(label)
        const saved = page.waitForResponse(response => response.request().method() === 'PUT')
        await editor.press('Control+s')
        expect((await saved).status()).toBe(200)
        await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
        expect(await readFile(path, 'utf8')).toBe(source)
      }
      const before = await page.getByLabel('Zoom level').textContent()
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
      await expect(page.getByLabel('Zoom level')).not.toHaveText(before!)
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
      await expect(page.getByLabel('Zoom level')).toHaveText(before!)
      await page.getByRole('button', { name: 'Fit', exact: true }).click()
      await page.reload()
      await expect(editor).toHaveValue('flowchart LR\n  Third --> Persisted\n')
      await live(page)
    }
    finally { await writeFile(path, original) }
  })
}

test('fast selection suppresses an obsolete document load and retains a separate dirty draft', async ({ page }) => {
  await login(page, true)
  let release = () => {}
  let handled = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const finished = new Promise<void>((resolve) => {
    handled = resolve
  })
  await page.route('**/api/diagrams/document?path=welcome.mmd', async (route) => {
    await gate
    await route.continue()
    handled()
  }, { times: 1 })
  try {
    const pending = page.waitForRequest(request => new URL(request.url()).searchParams.get('path') === 'welcome.mmd' && request.url().includes('/document'))
    await page.getByRole('button', { name: 'welcome.mmd', exact: true }).click()
    await pending
    await choose(page, 'sequence.mermaid')
    const editor = page.getByLabel('Mermaid source', { exact: true })
    await expect(editor).toHaveValue(/sequenceDiagram/)
    await editor.fill('flowchart LR\n  Current --> Draft\n')
    release()
    await finished
    await live(page)
    await expect(editor).toHaveValue('flowchart LR\n  Current --> Draft\n')
    await choose(page, 'overview.md')
    await expect(editor).not.toHaveValue('flowchart LR\n  Current --> Draft\n')
    await choose(page, 'sequence.mermaid')
    await expect(editor).toHaveValue('flowchart LR\n  Current --> Draft\n')
  }
  finally { release() }
})

for (const operation of ['in-place', 'atomic', 'delete', 'rename'] as const) {
  for (const dirty of [false, true]) {
    test(`external ${operation} with a ${dirty ? 'dirty' : 'clean'} selection preserves the correct source`, async ({ page, audit }) => {
      audit.allowHttp(410, '/api/diagrams/document')
      const name = `external-${operation}-${dirty ? 'dirty' : 'clean'}.mmd`
      const path = join(root, name)
      const other = join(root, `replacement-${name}`)
      const initial = 'flowchart LR\n  Original --> Source\n'
      const external = 'flowchart LR\n  External --> Source\n'
      const draft = 'flowchart LR\n  Local --> Draft\n'
      await writeFile(path, initial)
      try {
        await login(page, true)
        await choose(page, name)
        const editor = page.getByLabel('Mermaid source', { exact: true })
        await expect(editor).toHaveValue(initial)
        if (dirty)
          await editor.fill(draft)
        if (operation === 'in-place')
          await writeFile(path, external)
        if (operation === 'atomic') {
          await writeFile(other, external)
          await rename(other, path)
        }
        if (operation === 'delete')
          await rm(path)
        if (operation === 'rename')
          await rename(path, other)
        if (operation === 'delete' || operation === 'rename') {
          await expect(page.getByText(/deleted or renamed/i).first()).toBeVisible({ timeout: 12000 })
          expect(await fileExists(path)).toBe(false)
          if (dirty) {
            await expect(editor).toHaveValue(draft)
            await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
          }
        }
        else if (dirty) {
          await expect(page.getByRole('button', { name: 'Review current file', exact: true })).toBeVisible({ timeout: 12000 })
          await expect(editor).toHaveValue(draft)
          await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
          expect(await readFile(path, 'utf8')).toBe(external)
        }
        else {
          await expect(editor).toHaveValue(external, { timeout: 12000 })
          await live(page)
          await expect(page.locator('.diagram-graphic svg')).toContainText('External')
        }
      }
      finally {
        await rm(path, { force: true })
        await rm(other, { force: true })
      }
    })
  }
}
async function fileExists(path: string) {
  try {
    await readFile(path)
    return true
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return false
    throw error
  }
}

test('UTF-8 source cap and authoritative Markdown file limit retain unsaved text', async ({ page, audit }) => {
  audit.allowHttp(413, '/api/diagrams/source')
  await login(page, true)
  const cap: number = await page.evaluate(async () => (await (await fetch('/api/session')).json()).data.maxSourceBytes)
  expect(cap).toBeGreaterThanOrEqual(1024)
  await choose(page, 'welcome.mmd')
  const editor = page.getByLabel('Mermaid source', { exact: true })
  const oversized = '\u754C'.repeat(Math.floor(cap / 3) + 1)
  await editor.fill(oversized)
  await expect(page.getByText('Source exceeds the service limit', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
  await expect(editor).toHaveValue(oversized)
  const name = 'full-file-cap.md'
  const path = join(root, name)
  const original = `${'P'.repeat(cap - 100)}\n\n\`\`\`mermaid\nflowchart LR\nA-->B\n\`\`\`\n`
  await writeFile(path, original)
  try {
    await page.getByRole('button', { name: 'Refresh files' }).click()
    await choose(page, name)
    const replacement = `flowchart LR\nA-->B\n%% ${'x'.repeat(cap - 100)}`
    await editor.fill(replacement)
    await expect(page.getByRole('button', { name: /^Save/ })).toBeEnabled()
    const response = page.waitForResponse(item => item.request().method() === 'PUT')
    await page.getByRole('button', { name: /^Save/ }).click()
    expect((await response).status()).toBe(413)
    await expect(editor).toHaveValue(replacement)
    expect(await readFile(path, 'utf8')).toBe(original)
  }
  finally { await rm(path, { force: true }) }
})

test('empty Markdown and unsupported file states remain readable and recoverable', async ({ page, audit }) => {
  audit.allowHttp(415, '/api/diagrams/revision')
  const path = join(root, 'no-diagrams.md')
  const binary = join(root, 'binary.mmd')
  await writeFile(path, '# Ordinary prose\n\nNo fenced diagrams here.\n')
  await writeFile(binary, Buffer.from([0, 1, 2]))
  try {
    await login(page, true)
    await page.getByRole('button', { name: 'no-diagrams.md', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'No Mermaid blocks', exact: true })).toBeVisible()
    await page.getByRole('button', { name: /^binary\.mmd/ }).click()
    await expect(page.getByRole('heading', { name: /File unavailable|Unable to open this file/ })).toBeVisible()
    await choose(page, 'welcome.mmd')
    await live(page)
    await page.getByLabel('Filter files').fill('does-not-exist')
    // Typing searches this folder and its subfolders rather than only the loaded window.
    await expect(page.getByText('No matches in this folder or below', { exact: true })).toBeVisible()
  }
  finally {
    await rm(path, { force: true })
    await rm(binary, { force: true })
  }
})
