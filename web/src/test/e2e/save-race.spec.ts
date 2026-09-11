import type { Page } from '@playwright/test'
import type { ApiResult, DiagramDocument, DocumentRevision, SaveDiagramRequest } from '../../../../src/shared/contracts'
import { createHash } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { choose, chooseBlock, expect, live, login, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function data<T>(response: { json: () => Promise<unknown> }): Promise<T> {
  const body = await response.json() as ApiResult<T>
  expect(body.success).toBe(true)
  if (!body.success)
    throw new Error('Expected successful file response')
  return body.data
}
async function observeResponses(page: Page, path: string) {
  const received = new Map<string, Set<string>>()
  const waiting = new Map<string, ReturnType<typeof deferred<void>>>()
  const deletion = deferred<void>()
  await page.route(/\/api\/diagrams\/(?:revision|document)\?/, async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('path') !== path) {
      await route.fallback()
      return
    }
    // Inspect the fully received real server response, independent of Chromium's
    // canceled-response body cache. The save response remains held until delivery.
    const response = await route.fetch()
    const document = response.status() === 200 ? await data<DiagramDocument | DocumentRevision>(response) : null
    await route.fulfill({ response })
    if (!document)
      return
    if ('state' in document && document.state === 'deleted') {
      deletion.resolve()
      return
    }
    const version = document.version
    const kinds = received.get(version) ?? new Set<string>()
    kinds.add(url.pathname.endsWith('/revision') ? 'revision' : 'document')
    received.set(version, kinds)
    if (kinds.size === 2)
      waiting.get(version)?.resolve()
  })
  return {
    version(version: string) {
      if (received.get(version)?.size === 2)
        return Promise.resolve()
      const pending = deferred<void>()
      waiting.set(version, pending)
      return pending.promise
    },
    deleted: deletion.promise,
  }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

for (const scenario of ['own save', 'in-place', 'atomic', 'deletion', 'auth change'] as const) {
  test(`committed save response follows real revision and document observations: ${scenario}`, async ({ page, audit }, info) => {
    test.setTimeout(60000)
    const name = `save-race-${scenario.replaceAll(' ', '-')}.md`
    const path = join(root, name)
    const replacement = `${path}.replacement`
    const initialFirst = 'flowchart LR\n  Original --> First\n'
    const initialSecond = 'flowchart LR\n  Original --> Sibling\n'
    const initial = `\uFEFF# Original project Ω\r\n\r\n\`\`\`mermaid\r\n${initialFirst.replaceAll('\n', '\r\n')}\`\`\`\r\n\r\nProse stays byte-for-byte.\r\n\r\n~~~mermaid\r\n${initialSecond.replaceAll('\n', '\r\n')}~~~\r\n`
    const submitted = 'flowchart LR\n  Submitted --> Persisted\n'
    const newer = 'flowchart LR\n  Newer --> Draft\n'
    const sibling = 'flowchart LR\n  Sibling --> Draft\n'
    const bytes = (first: string, second = initialSecond) => initial.replace(initialFirst.replaceAll('\n', '\r\n'), first.replaceAll('\n', '\r\n')).replace(initialSecond.replaceAll('\n', '\r\n'), second.replaceAll('\n', '\r\n'))
    const committedBytes = bytes(submitted)
    const committedVersion = hash(committedBytes)
    const responseGate = deferred<void>()
    const committed = deferred<{ document: DiagramDocument, request: SaveDiagramRequest }>()
    const delivered = deferred<void>()
    const observations: { at: string, event: string, method?: string, path?: string, status?: number, reason?: string }[] = []
    page.on('requestfailed', request => observations.push({ at: new Date().toISOString(), event: 'failed', method: request.method(), path: new URL(request.url()).pathname, reason: request.failure()?.errorText ?? '(unspecified)' }))
    page.on('response', response => observations.push({ at: new Date().toISOString(), event: 'response', method: response.request().method(), path: new URL(response.url()).pathname, status: response.status() }))
    page.on('framenavigated', () => observations.push({ at: new Date().toISOString(), event: 'navigation' }))
    let puts = 0
    page.on('request', (request) => {
      if (request.method() === 'PUT')
        puts++
    })
    await writeFile(path, initial)
    try {
      await login(page, true)
      await choose(page, name)
      const editor = page.getByLabel('Mermaid source', { exact: true })
      const save = page.getByRole('button', { name: /^Save/ })
      await expect(editor).toHaveValue(initialFirst)
      await editor.fill(submitted)
      await chooseBlock(page, name, 2)
      await editor.fill(sibling)
      await chooseBlock(page, name, 1)
      await page.route('**/api/diagrams/source', async (route) => {
        const response = await route.fetch()
        expect(response.status()).toBe(200)
        committed.resolve({ document: await data<DiagramDocument>(response), request: route.request().postDataJSON() as SaveDiagramRequest })
        await responseGate.promise
        await route.fulfill({ response })
        delivered.resolve()
      }, { times: 1 })
      const observedResponses = await observeResponses(page, name)
      const observedOwnSave = observedResponses.version(committedVersion)
      await save.click()
      const receipt = await committed.promise
      expect(receipt.document.version).toBe(committedVersion)
      expect(receipt.request.expectedVersion).toBe(hash(initial))
      expect(await readFile(path, 'utf8')).toBe(committedBytes)
      await editor.fill(newer)
      await observedOwnSave
      await expect(page.getByText('Saving…', { exact: true })).toBeVisible()
      await expect(page.getByRole('alert').filter({ hasText: 'changed outside' })).toBeVisible()
      await expect(editor).toHaveValue(newer)
      let external = ''
      if (scenario === 'in-place' || scenario === 'atomic') {
        external = bytes('flowchart LR\n  Independent --> External\n')
        const observedExternal = observedResponses.version(hash(external))
        if (scenario === 'atomic') {
          await writeFile(replacement, external)
          await rename(replacement, path)
        }
        else {
          await writeFile(path, external)
        }
        await observedExternal
      }
      if (scenario === 'deletion') {
        audit.allowHttp(410, '/api/diagrams/document')
        const deleted = observedResponses.deleted
        await rm(path)
        await deleted
        await expect(page.getByRole('alert').filter({ hasText: 'deleted or renamed' })).toBeVisible()
      }
      if (scenario === 'auth change') {
        for (const kind of ['tree', 'revision', 'document'])
          audit.allowHttp(401, `/api/diagrams/${kind}`)
        await page.context().clearCookies()
        await page.getByRole('button', { name: 'Refresh files' }).click()
        await expect(page.getByRole('heading', { name: 'Reconnect to your project' })).toBeVisible()
      }
      responseGate.resolve()
      await delivered.promise
      if (scenario === 'auth change') {
        const tokenFile = process.env.MERDECK_SMOKE_TOKEN_FILE
        if (!tokenFile)
          throw new Error('A private token file is required')
        await page.getByLabel('Access token', { exact: true }).fill((await readFile(tokenFile, 'utf8')).trim())
        await page.getByRole('button', { name: 'Connect to project' }).click()
        await expect(page.getByRole('alert').filter({ hasText: 'Session changed' })).toBeVisible()
      }
      await expect(page.getByText('Saving…', { exact: true })).toHaveCount(0)
      await expect(editor).toHaveValue(newer)
      await chooseBlock(page, name, 2)
      await expect(editor).toHaveValue(sibling)
      if (scenario === 'own save') {
        await expect(page.getByRole('button', { name: 'Review current file', exact: true })).toHaveCount(0)
        await expect(save).toBeEnabled()
        const secondResponse = page.waitForResponse(response => response.request().method() === 'PUT')
        await editor.press('Control+s')
        const response = await secondResponse
        expect(response.status()).toBe(200)
        const request = response.request().postDataJSON() as SaveDiagramRequest
        expect(request.expectedVersion).toBe(receipt.document.version)
        expect(request.selector).toEqual(receipt.document.blocks[1]?.selector)
        expect(await readFile(path, 'utf8')).toBe(bytes(submitted, sibling))
        await expect(page.getByText('Saved', { exact: true })).toBeVisible()
        await chooseBlock(page, name, 1)
        await expect(editor).toHaveValue(newer)
        await expect(save).toBeEnabled()
        const thirdResponse = page.waitForResponse(item => item.request().method() === 'PUT')
        await editor.press('Control+s')
        expect((await thirdResponse).status()).toBe(200)
        await expect(page.getByText('Saved', { exact: true })).toBeVisible()
        expect(await readFile(path, 'utf8')).toBe(bytes(newer, sibling))
        expect(puts).toBe(3)
        await live(page)
        await page.screenshot({ path: '../tmp/ui-save-race.png', animations: 'disabled', fullPage: true })
      }
      else {
        await expect(save).toBeDisabled()
        await editor.press('Control+s')
        await chooseBlock(page, name, 1)
        await expect(editor).toHaveValue(newer)
        await expect(save).toBeDisabled()
        expect(puts).toBe(1)
        if (scenario === 'deletion')
          await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' })
        else expect(await readFile(path, 'utf8')).toBe(external || committedBytes)
      }
      process.stdout.write(`${JSON.stringify({ saveResponseRace: scenario, realRevisionAndDocument: true, submittedVersion: committedVersion, puts, bytePreservation: true })}\n`)
    }
    finally {
      responseGate.resolve()
      try {
        await writeFile(info.outputPath('request-lifecycle.json'), JSON.stringify(observations, null, 2))
      }
      finally {
        try {
          await page.unrouteAll({ behavior: 'wait' })
        }
        finally {
          await Promise.all([rm(path, { force: true }), rm(replacement, { force: true })])
        }
      }
    }
  })
}
