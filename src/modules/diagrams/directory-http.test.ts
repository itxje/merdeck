import type { DirectoryPage } from '../../shared/contracts'
import { mkdir, readdir, readlink, writeFile } from 'node:fs/promises'
import { afterEach, expect, test } from 'bun:test'
import { createFixture, removeFixture } from '../../../tests/integration/files/fixtures'
import { createApp } from '../../app'
import { loadConfig } from '../../config'
import { createDiagramService } from './service'

const origin = 'http://127.0.0.1:8787'
const token = 'directory-test-token-with-32-characters'
const cleanup: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const close of cleanup.splice(0))
    await close()
})
async function fixture(mode: 'prefixed' | 'stripped', authenticated = false) {
  const root = await createFixture('files-directory-http-')
  await mkdir(`${root}/folder`)
  await writeFile(`${root}/folder/a.md`, '')
  await writeFile(`${root}/folder/b.md`, '')
  const config = await loadConfig({ MERDECK_ROOT: root, MERDECK_API_MODE: mode, NODE_ENV: mode === 'stripped' ? 'development' : 'test', ...(authenticated ? { MERDECK_TOKEN: token } : {}) })
  let handles = 0
  let now = Date.now()
  const diagrams = await createDiagramService(config, { clock: () => now, repositoryHooks: { directoryStreamOpened: () => {
    handles++
  }, directoryStreamClosed: () => {
    handles--
  } } })
  const app = createApp(config, { diagrams, clock: () => now })
  cleanup.push(async () => {
    await app.close()
    await removeFixture(root)
  })
  const prefix = mode === 'prefixed' ? '/api' : ''
  return { app, config, handles: () => handles, advance: (ms: number) => {
    now += ms
  }, request: (path: string, init?: RequestInit) => app.request(`${origin}${prefix}${path}`, init) }
}

test.each(['prefixed', 'stripped'] as const)('strict directory contract on %s mount preserves legacy routing', async (mode) => {
  const f = await fixture(mode)
  const response = await f.request('/diagrams/directory?path=folder&limit=1')
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  const body = await response.json() as { success: boolean, data: DirectoryPage }
  const page = body.data as DirectoryPage
  expect(Object.keys(body).sort()).toEqual(['data', 'success'])
  expect(Object.keys(page).sort()).toEqual(['complete', 'entries', 'excluded', 'expiresAt', 'limit', 'maxPathDepth', 'nextCursor', 'parent', 'path', 'pollIntervalMs', 'revision', 'stoppedBy', 'visited'])
  expect(page).toMatchObject({ path: 'folder', parent: '', limit: 1, complete: false, stoppedBy: 'entries', maxPathDepth: 64 })
  expect(page.entries[0]).toMatchObject({ kind: 'file', fileKind: 'markdown', state: 'deferred' })
  expect(Object.keys(page.entries[0]!).sort()).toEqual(['fileKind', 'kind', 'path', 'state'])
  const revision = await (await f.request('/diagrams/directory/revision?path=folder')).json() as { data: { revision: string } }
  expect(revision.data.revision).toBe(page.revision)
  expect((await f.request('/diagrams/tree')).status).toBe(200)
  expect((await f.request('/diagrams/tree?path=folder')).status).toBe(400)
  for (const query of ['limit=01', 'limit=201', 'limit=0', 'limit=1.5', 'limit=+1', 'limit=1e2', 'limit=', 'cursor=', 'cursor=xyz', 'offset=0', 'path=folder&path=folder', 'path=%ZZ', 'path=%252e%252e'])
    expect((await f.request(`/diagrams/directory?${query}`)).status).toBe(400)
  expect((await f.request('/diagrams/directory/revision?limit=1')).status).toBe(400)
  for (const [path, method, allow] of [['/diagrams/directory', 'POST', 'GET'], ['/diagrams/directory/revision', 'HEAD', 'GET'], ['/diagrams/directory/close', 'GET', 'POST']]) {
    const result = await f.request(path!, { method: method! })
    expect(result.status).toBe(405)
    expect(result.headers.get('allow')).toBe(allow!)
  }
  const close = (body: object, extra: Record<string, string> = {}) => f.request('/diagrams/directory/close', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) })
  expect((await close({ path: 'folder', cursor: page.nextCursor, extra: true })).status).toBe(400)
  expect((await close({ path: 'folder', cursor: page.nextCursor }, { Origin: 'http://evil.test' })).status).toBe(403)
  expect((await close({ path: 'folder', cursor: page.nextCursor }, { 'Content-Type': 'text/plain' })).status).toBe(415)
  expect(await (await close({ path: 'folder', cursor: page.nextCursor })).json()).toEqual({ success: true, data: { closed: true } })
  expect(f.handles()).toBe(0)
  const stale = await f.request(`/diagrams/directory?path=folder&limit=1&cursor=${page.nextCursor}`)
  expect(stale.status).toBe(409)
  expect(await stale.json()).toEqual({ success: false, error: { code: 'cursor_stale', message: 'The directory cursor is no longer valid. Restart its listing.' } })
})

test('verified sessions bind cursors; logout and expiry dispose stream resources', async () => {
  const f = await fixture('prefixed', true)
  expect((await f.request('/diagrams/directory')).status).toBe(401)
  const login = async () => {
    const response = await f.request('/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const session = (await response.json() as { data: { csrfToken: string } }).data
    return { 'Cookie': response.headers.get('set-cookie')!.split(';')[0]!, 'Origin': origin, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'application/json' }
  }
  const first = await login()
  const second = await login()
  const page = (await (await f.request('/diagrams/directory?path=folder&limit=1', { headers: first })).json() as { data: DirectoryPage }).data
  const query = `/diagrams/directory?path=folder&limit=1&cursor=${page.nextCursor}`
  expect((await f.request(query, { headers: second })).status).toBe(403)
  expect((await f.request('/diagrams/directory/close', { method: 'POST', headers: { ...first, 'X-CSRF-Token': '' }, body: JSON.stringify({ path: 'folder', cursor: page.nextCursor }) })).status).toBe(403)
  expect(f.handles()).toBe(1)
  expect((await f.request('/session', { method: 'DELETE', headers: first })).status).toBe(200)
  expect(f.handles()).toBe(0)
  expect((await f.request(query, { headers: first })).status).toBe(401)
  await f.request('/diagrams/directory?path=folder&limit=1', { headers: second })
  f.advance(3600000)
  expect((await f.request('/diagrams/directory?path=folder', { headers: second })).status).toBe(401)
  await f.app.close()
  expect(f.handles()).toBe(0)
})

test('HTTP cancellation after a native read and quota rejection release actual descriptors', async () => {
  const root = await createFixture('files-directory-http-abort-')
  await writeFile(`${root}/a.md`, '')
  await writeFile(`${root}/b.md`, '')
  const config = await loadConfig({ MERDECK_ROOT: root })
  const abort = new AbortController()
  let cancel = false
  const diagrams = await createDiagramService(config, { repositoryHooks: {
    afterDirectoryRead: async () => {
      if (cancel)
        abort.abort()
    },
  } })
  const app = createApp(config, { diagrams })
  cleanup.push(async () => {
    await app.close()
    await removeFixture(root)
  })
  for (let index = 0; index < 32; index++)
    expect((await app.request(`${origin}/api/diagrams/directory?limit=1`)).status).toBe(200)
  expect((await app.request(`${origin}/api/diagrams/directory?limit=1`)).status).toBe(429)
  await diagrams.closePrincipal('open', origin)
  cancel = true
  expect((await app.request(new Request(`${origin}/api/diagrams/directory?limit=1`, { signal: abort.signal }))).status).toBe(503)
  await app.close()
  const links = await Promise.all((await readdir('/proc/self/fd')).map(async (fd) => {
    try {
      return await readlink(`/proc/self/fd/${fd}`)
    }
    catch { return '' }
  }))
  expect(links.filter(link => link === root)).toHaveLength(0)
})

test('search answers over HTTP, closes every stream it opened and refuses other methods and unknown keys', async () => {
  const f = await fixture('prefixed')
  const response = await f.request('/diagrams/search?path=folder&query=A.md')
  expect(response.status).toBe(200)
  const body = await response.json() as { success: boolean, data: { entries: { path: string }[], complete: boolean } }
  expect(body.success).toBe(true)
  expect(body.data.entries.map(entry => entry.path)).toEqual(['folder/a.md'])
  expect(body.data.complete).toBe(true)
  expect(f.handles()).toBe(0)
  expect((await f.request('/diagrams/search?path=folder&query=a', { method: 'POST', headers: { Origin: origin } })).status).toBe(405)
  expect((await f.request('/diagrams/search?path=folder&query=a&limit=5')).status).toBe(400)
  expect((await f.request('/diagrams/search?path=folder')).status).toBe(400)
})
