import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')
const openRoot = process.env.MERDECK_OPEN_ROOT
const openUrl = process.env.MERDECK_OPEN_URL

// The fake provider script (scripts/test-e2e.ts, out of scope) is spawned with the open-access root as
// its cwd and always writes its edit to the literal relative path "agent-live.mmd", regardless of which
// file the browser actually has open — so every open-access case that drives a real provider turn against
// that fixture must use that exact root-level path, and two such cases can only share it by taking turns,
// never by using a different name or directory for either. This lock file gives them that turn.
async function withAgentLiveLock<T>(action: () => Promise<T>): Promise<T> {
  const lock = join(openRoot!, '.agent-live.lock')
  const deadline = Date.now() + 60000
  for (;;) {
    try {
      await writeFile(lock, String(process.pid), { flag: 'wx' })
      break
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || Date.now() > deadline)
        throw error
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  try {
    return await action()
  }
  finally {
    await rm(lock, { force: true })
  }
}

test.skip(process.env.MERDECK_TEST_AGENTS !== 'true', 'Set MERDECK_TEST_AGENTS=true to run the fake-provider acceptance.')

test('an agent edit changes exact bytes and rerenders live', async ({ page }) => {
  const path = join(root, 'agent-live.mmd')
  const initial = 'flowchart LR\nA[Before]-->B[Preview]\n'
  const updated = 'flowchart LR\nA[AI]-->B[Live]\n'
  await writeFile(path, initial, { flag: 'wx' })
  try {
    await login(page)
    await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
    await choose(page, 'agent-live.mmd')
    await live(page)
    const source = page.getByLabel('Mermaid source', { exact: true })
    const baseline = await source.inputValue()
    await source.fill(`${baseline}\nC[Draft]`)
    await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
    const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
    await expect(editor).toBeVisible()
    const engine = editor.getByLabel('Engine', { exact: true })
    const model = editor.getByLabel('Model', { exact: true })
    await expect(engine).toHaveValue('codex')
    await expect(model).toHaveValue('browser-model')
    await expect(model.getByRole('option', { name: 'Browser model', exact: true })).toHaveCount(1)
    await editor.getByLabel('Agent instruction', { exact: true }).fill('Update the diagram through the configured provider.')
    await expect(editor.getByRole('button', { name: 'Send', exact: true })).toBeDisabled()
    await expect(editor.getByText('Save or discard browser drafts before starting an agent turn.', { exact: true })).toBeVisible()
    await source.fill(baseline)
    await expect(editor.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
    await expect(editor.getByLabel('Attached file', { exact: true })).toContainText('agent-live.mmd')
    const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/api/agents/conversations')
    const turnRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/turns'))
    await editor.getByRole('button', { name: 'Send', exact: true }).click()
    expect(JSON.parse((await createRequest).postData() ?? '{}')).toEqual({ provider: 'codex', model: 'browser-model' })
    expect(JSON.parse((await turnRequest).postData() ?? '{}')).toEqual({ prompt: 'Update the diagram through the configured provider.', context: { path: 'agent-live.mmd' } })
    await expect(engine).toBeDisabled()
    await expect(model).toBeDisabled()
    await expect(editor.getByText('<img src=x onerror=alert(1)> Updated the diagram.', { exact: true })).toBeVisible()
    await expect(editor.locator('img')).toHaveCount(0)
    // In-project file changes no longer stop for an approval.
    await expect(editor.getByRole('region', { name: 'Agent approval request', exact: true })).toHaveCount(0)
    await expect(source).toHaveValue(updated, { timeout: 15000 })
    await expect(page.locator('.diagram-graphic svg')).toContainText('AI')
    await expect(page.locator('.diagram-graphic svg')).toContainText('Live')
    expect(await readFile(path, 'utf8')).toBe(updated)

    // A reload keeps the same tab's transcript instead of opening an empty conversation.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Refresh files', exact: true })).toBeVisible()
    // The shared fixture forces the panel closed on every load, so reopen it before reading the transcript.
    await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
    await expect(editor.getByText('<img src=x onerror=alert(1)> Updated the diagram.', { exact: true })).toBeVisible()
    await expect(editor.getByRole('log', { name: 'AI conversation', exact: true })).toContainText('agent-live.mmd')

    await page.setViewportSize({ width: 390, height: 844 })
    const mobilePane = await editor.boundingBox()
    expect(mobilePane).not.toBeNull()
    expect(mobilePane!.x).toBe(0)
    expect(mobilePane!.width).toBe(390)
    expect(mobilePane!.y).toBe(58)
    expect(mobilePane!.y + mobilePane!.height).toBeLessThanOrEqual(814)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(engine).toBeVisible()
    await expect(model).toBeVisible()

    await editor.getByLabel('Agent instruction', { exact: true }).fill('Wait until stopped.')
    await editor.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(editor.getByText('Waiting for cancellation.', { exact: true })).toBeVisible()
    await editor.getByRole('button', { name: 'Stop', exact: true }).click()
    await expect(editor.getByText('The turn was stopped.', { exact: true })).toBeVisible()
    expect(await readFile(path, 'utf8')).toBe(updated)

    await editor.getByLabel('Agent instruction', { exact: true }).fill('Fail without leaking provider details. [provider-failure]')
    await editor.getByRole('button', { name: 'Send', exact: true }).click()
    await expect(editor.getByText('The provider could not complete the turn.', { exact: true })).toBeVisible()
    await editor.getByLabel('Agent instruction', { exact: true }).fill('Start a recovery turn.')
    await expect(editor.getByRole('button', { name: 'Send', exact: true })).toBeEnabled()
    expect(await readFile(path, 'utf8')).toBe(updated)
  }
  finally {
    await rm(path, { force: true })
  }
})

test('open access runs a provider edit without a token or CSRF credential', async ({ page }) => {
  test.skip(!openRoot || !openUrl, 'An open-access service and disposable root are required.')
  await withAgentLiveLock(async () => {
    const path = join(openRoot!, 'agent-live.mmd')
    const initial = 'flowchart LR\nA[Open]-->B[Before]\n'
    const updated = 'flowchart LR\nA[AI]-->B[Live]\n'
    await writeFile(path, initial, { flag: 'wx' })
    try {
      await page.goto(openUrl!)
      await expect(page.getByText('Open access', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Access token', { exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
      await choose(page, 'agent-live.mmd')
      await live(page)
      await page.getByRole('button', { name: 'Open AI file editor', exact: true }).click()
      const editor = page.getByRole('complementary', { name: 'AI file editor', exact: true })
      await expect(editor).toBeVisible()
      await expect(editor.getByLabel('Engine', { exact: true })).toHaveValue('codex')
      await expect(editor.getByLabel('Model', { exact: true })).toHaveValue('browser-model')
      await editor.getByLabel('Agent instruction', { exact: true }).fill('Update the open-access diagram.')
      const createRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/api/agents/conversations')
      await editor.getByRole('button', { name: 'Send', exact: true }).click()
      const request = await createRequest
      const requestHeaders = await request.allHeaders()
      expect(requestHeaders.origin).toBe(openUrl)
      expect(requestHeaders['x-csrf-token']).toBeUndefined()
      const source = page.getByLabel('Mermaid source', { exact: true })
      await expect(source).toHaveValue(updated, { timeout: 15000 })
      await expect(page.locator('.diagram-graphic svg')).toContainText('AI')
      await expect(page.locator('.diagram-graphic svg')).toContainText('Live')
      expect(await readFile(path, 'utf8')).toBe(updated)
      expect(await page.context().cookies()).toEqual([])
    }
    finally {
      await rm(path, { force: true })
    }
  })
})
