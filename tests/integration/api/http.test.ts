import type { ApiResult, ApplicationBuild, DiagramDocument, SessionStatus, TreeSnapshot } from '../../../src/shared/contracts'
import { readFile, rename, symlink, unlink, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, test } from 'bun:test'
import { createApp } from '../../../src/app'
import { loadConfig } from '../../../src/config'
import { createDiagramService } from '../../../src/modules/diagrams'
import { createFixture, removeFixture } from '../files/fixtures'

const token = 'a-private-test-token-that-is-long-enough'
const origin = 'http://127.0.0.1:8787'
const markdown = '\uFEFF# Notes\r\n\r\n```mermaid\r\ngraph TD\r\nA-->B\r\n```\r\n\r\nPreserved text.\r\n\r\n~~~mermaid\r\nsequenceDiagram\r\nAlice->>Bob: Hello\r\n~~~\r\n'
const resources: { root: string, close: () => Promise<void> }[] = []

async function fixture(options: { unsupported?: boolean, environment?: Record<string, string>, time?: { now: number } } = {}) {
  const root = await createFixture('files-api-', options.unsupported)
  await writeFile(`${root}/flow.mmd`, 'graph TD\nA-->B\n')
  await writeFile(`${root}/notes.md`, markdown)
  const config = await loadConfig({ MERDECK_ROOT: root, MERDECK_TOKEN: token, MERDECK_POLL_INTERVAL_MS: '1000', MERDECK_MAX_FILE_BYTES: '1024', ...options.environment })
  const clock = () => options.time?.now ?? Date.now()
  const diagrams = await createDiagramService(config, { clock })
  const assets = new Map([
    ['/index.html', { body: new TextEncoder().encode('<!doctype html><title>Merdeck</title>'), contentType: 'text/html; charset=utf-8' }],
    ['/assets/app.js', { body: new TextEncoder().encode('export {};'), contentType: 'text/javascript; charset=utf-8' }],
  ])
  const app = createApp(config, { diagrams, assets, clock })
  resources.push({ root, close: app.close })
  return { root, config, diagrams, app, request: (path: string, init?: RequestInit) => app.request(`${config.allowedOrigins[0]}${path}`, init) }
}

type Fixture = Awaited<ReturnType<typeof fixture>>
async function data<T = unknown>(response: Response): Promise<NoInfer<T>> {
  const body = await response.json() as ApiResult<T>
  expect(body.success).toBe(true)
  if (!body.success)
    throw new Error('Expected successful response')
  return body.data
}
async function login(f: Fixture, prefix = '/api') {
  const response = await f.request(`${prefix}/session`, { method: 'POST', headers: { 'Origin': f.config.allowedOrigins[0]!, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
  expect(response.status).toBe(200)
  const session = await data<SessionStatus>(response)
  if (!session.authenticated || session.access !== 'token')
    throw new Error('Expected a token session')
  const setCookie = response.headers.get('set-cookie')!
  const cookie = setCookie.split(';')[0]!
  return { session, setCookie, headers: { 'Cookie': cookie, 'Origin': f.config.allowedOrigins[0]!, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'application/json' } }
}
async function error(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  expect(await response.json()).toMatchObject({ success: false, error: { code } })
  expect(response.headers.get('cache-control')).toBe('no-store')
}
const save = (doc: DiagramDocument, source = 'graph TD\nA-->C\n') => ({ path: doc.path, selector: doc.blocks[0]!.selector, expectedVersion: doc.version, source })

afterEach(async () => {
  for (const resource of resources.splice(0)) {
    await resource.close()
    await removeFixture(resource.root)
  }
})

describe('HTTP file and folder operations', () => {
  test('entry routes require a session, exact Origin and CSRF, POST and strict bounded JSON', async () => {
    const f = await fixture()
    const routes = ['/entries', '/entries/move', '/entries/delete']
    for (const route of routes)
      await error(await f.request(`/api/diagrams${route}`, { method: 'POST', body: '{}' }), 401, 'unauthorized')
    const auth = await login(f)
    for (const route of routes) {
      for (const headers of [{ ...auth.headers, Origin: 'https://evil.test' }, { ...auth.headers, 'X-CSRF-Token': 'b'.repeat(64) }])
        await error(await f.request(`/api/diagrams${route}`, { method: 'POST', headers, body: JSON.stringify({ kind: 'directory', path: 'x' }) }), 403, 'forbidden')
      const wrongMethod = await f.request(`/api/diagrams${route}`, { method: 'PUT', headers: auth.headers, body: '{}' })
      expect(wrongMethod.status).toBe(405)
      expect(wrongMethod.headers.get('allow')).toBe('POST')
    }
    const post = (route: string, body: string) => f.request(`/api/diagrams${route}`, { method: 'POST', headers: auth.headers, body })
    for (const body of ['{', '{"kind":"file","path":"a.mmd","path":"b.mmd"}', JSON.stringify({ kind: 'file', path: 'a.mmd', content: 'x' }), JSON.stringify({ kind: 'file', path: '../a.mmd' })])
      await error(await post('/entries', body), 400, 'invalid_request')
    await error(await post('/entries', JSON.stringify({ kind: 'directory', path: 'x'.repeat(9000) })), 413, 'too_large')
    expect(await readFile(`${f.root}/flow.mmd`, 'utf8')).toBe('graph TD\nA-->B\n')
  })

  test('creates, moves and deletes entries with typed outcomes', async () => {
    const f = await fixture()
    const auth = await login(f)
    const post = (route: string, body: unknown) => f.request(`/api/diagrams${route}`, { method: 'POST', headers: auth.headers, body: JSON.stringify(body) })
    expect(await data(await post('/entries', { kind: 'directory', path: 'docs' }))).toEqual({ kind: 'directory', path: 'docs' })
    expect(await data(await post('/entries', { kind: 'file', path: 'docs/new.mmd' }))).toEqual({ kind: 'file', path: 'docs/new.mmd' })
    await error(await post('/entries', { kind: 'file', path: 'docs/new.mmd' }), 409, 'exists')
    await error(await post('/entries', { kind: 'file', path: 'missing/new.mmd' }), 404, 'not_found')
    const created = await data<DiagramDocument>(await f.request(`/api/diagrams/document?path=${encodeURIComponent('docs/new.mmd')}`, { headers: auth.headers }))
    expect(await data(await post('/entries/move', { kind: 'file', from: 'docs/new.mmd', to: 'docs/renamed.mmd', expectedVersion: created.version }))).toEqual({ kind: 'file', path: 'docs/renamed.mmd' })
    await error(await post('/entries/move', { kind: 'file', from: 'docs/renamed.mmd', to: 'flow.mmd', expectedVersion: created.version }), 409, 'exists')
    await error(await post('/entries/delete', { kind: 'directory', path: 'docs' }), 409, 'not_empty')
    await error(await post('/entries/delete', { kind: 'file', path: 'docs/renamed.mmd', expectedVersion: 'a'.repeat(64) }), 409, 'conflict')
    expect(await data(await post('/entries/delete', { kind: 'file', path: 'docs/renamed.mmd', expectedVersion: created.version }))).toEqual({ kind: 'file', path: 'docs/renamed.mmd' })
    expect(await data(await post('/entries/move', { kind: 'directory', from: 'docs', to: 'guides' }))).toEqual({ kind: 'directory', path: 'guides' })
    expect(await data(await post('/entries/delete', { kind: 'directory', path: 'guides' }))).toEqual({ kind: 'directory', path: 'guides' })
    const tree = await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: auth.headers }))
    expect(tree.entries.map(entry => entry.path)).toEqual(['flow.mmd', 'notes.md'])
  })
})

describe('HTTP authentication boundary', () => {
  test('public status and health expose no project metadata; every file action requires auth', async () => {
    const f = await fixture()
    expect(await data(await f.request('/api/session'))).toEqual({ authenticated: false })
    expect(await data(await f.request('/api/health'))).toEqual({ status: 'ok', service: 'merdeck' })
    for (const path of ['/tree', '/document?path=flow.mmd', '/revision?path=flow.mmd', '/missing'])
      await error(await f.request(`/api/diagrams${path}`), 401, 'unauthorized')
    await error(await f.request('/api/diagrams/source', { method: 'PUT', body: '{}' }), 401, 'unauthorized')
    await error(await f.request('/api/session', { method: 'DELETE' }), 401, 'unauthorized')
  })

  test('login and session inspection expose the configured source byte cap only while authenticated', async () => {
    const f = await fixture({ environment: { MERDECK_MAX_FILE_BYTES: '32768' } })
    expect(await data(await f.request('/api/session'))).toEqual({ authenticated: false })
    const auth = await login(f)
    expect(auth.session.access).toBe('token')
    expect(auth.session.maxSourceBytes).toBe(32768)
    expect(auth.setCookie).toContain('HttpOnly')
    expect(auth.setCookie).toContain('SameSite=Strict')
    expect(auth.setCookie).toContain('Path=/api')
    expect(auth.setCookie).not.toContain('Secure')
    expect(auth.session.storage).toEqual({ writable: true, identity: (await f.diagrams.storageStatus()).identity, filesystemType: process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630', supportedFilesystem: (await f.diagrams.storageStatus()).supportedFilesystem })
    expect(JSON.stringify(auth.session)).not.toContain(f.root)
    expect(JSON.stringify(auth.session)).not.toContain('device')
    expect(await data(await f.request('/api/session', { headers: auth.headers }))).toEqual(auth.session)
    const logout = await f.request('/api/session', { method: 'DELETE', headers: auth.headers })
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(await data(logout)).toEqual({ authenticated: false })
    await error(await f.request('/api/diagrams/tree', { headers: auth.headers }), 401, 'unauthorized')
  })

  test('expiry and application shutdown invalidate sessions without timers', async () => {
    const time = { now: 10000 }
    const f = await fixture({ time, environment: { MERDECK_SESSION_TTL_SECONDS: '60' } })
    const auth = await login(f)
    time.now += 60000
    expect(await data(await f.request('/api/session', { headers: auth.headers }))).toEqual({ authenticated: false })
    await error(await f.request('/api/diagrams/tree', { headers: auth.headers }), 401, 'unauthorized')
    await f.app.close()
    await error(await f.request('/api/health'), 503, 'unavailable')
  })

  test('wrong secrets are rejected and attempts are globally bounded despite spoofed forwarding', async () => {
    const time = { now: 0 }
    const f = await fixture({ time })
    for (let index = 0; index < 10; index++) {
      await error(await f.request('/api/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json', 'X-Forwarded-For': `192.0.2.${index}` }, body: JSON.stringify({ token: `${token}wrong` }) }), 401, 'unauthorized')
    }
    const limited = await f.request('/api/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    expect(limited.headers.get('retry-after')).toBe('60')
    await error(limited, 429, 'rate_limited')
    time.now = 60000
    await login(f)
  })

  test('session capacity is bounded and expired sessions free capacity', async () => {
    const time = { now: 0 }
    const f = await fixture({ time, environment: { MERDECK_MAX_SESSIONS: '1', MERDECK_SESSION_TTL_SECONDS: '60' } })
    await login(f)
    await error(await f.request('/api/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }), 429, 'rate_limited')
    time.now = 60000
    await login(f)
  })

  test('Host, Origin, fetch metadata and CSRF independently protect mutations and reads', async () => {
    const f = await fixture()
    const auth = await login(f)
    for (const headers of [
      { Host: 'evil.test', Origin: origin },
      { 'Host': 'evil.test', 'Origin': origin, 'X-Forwarded-Host': '127.0.0.1:8787' },
      { Origin: 'https://evil.test' },
      { Origin: 'null' },
      { Origin: `${origin}, ${origin}` },
      { 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'same-site' },
    ])
      await error(await f.request('/api/session', { headers }), 403, 'forbidden')
    const attempts = [
      { ...auth.headers, Origin: '' },
      { ...auth.headers, Origin: 'https://evil.test' },
      { ...auth.headers, 'X-CSRF-Token': '' },
      { ...auth.headers, 'X-CSRF-Token': 'b'.repeat(64) },
    ]
    for (const headers of attempts) {
      await error(await f.request('/api/session', { method: 'DELETE', headers }), 403, 'forbidden')
      await error(await f.request('/api/diagrams/source', { method: 'PUT', headers, body: '{}' }), 403, 'forbidden')
    }
    await error(await f.request('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }), 403, 'forbidden')
    const response = await f.request('/api/diagrams/tree', { headers: auth.headers })
    expect(response.headers.has('access-control-allow-origin')).toBe(false)
    expect(response.headers.get('content-security-policy')).toContain('connect-src \'self\'')
  })

  test('HTTPS cookies are explicit and forwarding cannot upgrade an HTTP deployment', async () => {
    const f = await fixture({ environment: { MERDECK_ALLOWED_ORIGINS: 'https://diagrams.test', MERDECK_COOKIE_SECURE: 'true' } })
    expect((await login(f)).setCookie).toContain('; Secure')
    const normal = await fixture()
    const response = await normal.request('/api/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' }, body: JSON.stringify({ token }) })
    expect(response.headers.get('set-cookie')).not.toContain('Secure')
  })

  test('duplicate/malformed cookies, bearer headers, and oversized headers fail safely', async () => {
    const f = await fixture()
    const auth = await login(f)
    for (const Cookie of [`${auth.headers.Cookie}; ${auth.headers.Cookie}`, 'merdeck_session=bad'])
      await error(await f.request('/api/session', { headers: { Cookie } }), 400, 'invalid_request')
    await error(await f.request('/api/session', { headers: { Authorization: `Bearer ${token}` } }), 400, 'invalid_request')
    await error(await f.request('/api/session', { headers: { 'X-Large': 'a'.repeat(17000) } }), 413, 'too_large')
  })

  test('signed sessions survive a restart with the same token and root, and logout still revokes them', async () => {
    const f = await fixture()
    const auth = await login(f)
    await f.app.close()
    const restarted = createApp(f.config, { diagrams: await createDiagramService(f.config) })
    try {
      const request = (path: string, init?: RequestInit) => restarted.request(`${f.config.allowedOrigins[0]}${path}`, init)
      expect(await data(await request('/api/session', { headers: auth.headers }))).toEqual(auth.session)
      expect((await request('/api/diagrams/tree', { headers: auth.headers })).status).toBe(200)
      expect(await data(await request('/api/session', { method: 'DELETE', headers: auth.headers }))).toEqual({ authenticated: false })
      await error(await request('/api/diagrams/tree', { headers: auth.headers }), 401, 'unauthorized')
    }
    finally {
      await restarted.close()
    }
  })

  test('tampered, legacy, other-origin, other-token and other-root cookies do not authenticate', async () => {
    const f = await fixture()
    const auth = await login(f)
    const value = auth.headers.Cookie.slice('merdeck_session='.length)
    const [id, expiry, signature] = value.split('.') as [string, string, string]
    const flip = (hex: string) => `${hex.slice(0, -1)}${hex.endsWith('0') ? '1' : '0'}`
    for (const tampered of [`${id}.${expiry}.${flip(signature)}`, `${id}.${Number(expiry) + 1000}.${signature}`, `${flip(id)}.${expiry}.${signature}`, id])
      expect(await data(await f.request('/api/session', { headers: { Cookie: `merdeck_session=${tampered}` } }))).toEqual({ authenticated: false })
    const variants = [
      { MERDECK_ALLOWED_ORIGINS: 'http://127.0.0.1:9797' },
      { MERDECK_TOKEN: `${token}-rotated` },
    ]
    for (const environment of variants) {
      const config = await loadConfig({ MERDECK_ROOT: f.root, MERDECK_TOKEN: token, MERDECK_POLL_INTERVAL_MS: '1000', MERDECK_MAX_FILE_BYTES: '1024', ...environment })
      const other = createApp(config, { diagrams: await createDiagramService(config) })
      try {
        expect(await data(await other.request(`${config.allowedOrigins[0]}/api/session`, { headers: { Cookie: auth.headers.Cookie } }))).toEqual({ authenticated: false })
      }
      finally {
        await other.close()
      }
    }
    const otherRoot = await fixture()
    expect(await data(await otherRoot.request('/api/session', { headers: { Cookie: auth.headers.Cookie } }))).toEqual({ authenticated: false })
    expect(await data(await f.request('/api/session', { headers: { Cookie: auth.headers.Cookie } }))).toEqual(auth.session)
  })
})

describe('HTTP open access', () => {
  const open = () => fixture({ environment: { MERDECK_TOKEN: '' } })

  test('reports open access without a cookie and offers no sign-in or sign-out', async () => {
    const f = await open()
    const response = await f.request('/api/session')
    expect(response.headers.has('set-cookie')).toBe(false)
    const status = await data<SessionStatus>(response)
    expect(status).toMatchObject({ authenticated: true, access: 'open', pollIntervalMs: 1000, maxSourceBytes: 1024, storage: { writable: true } })
    expect(Object.keys(status).sort()).toEqual(['access', 'authenticated', 'maxSourceBytes', 'pollIntervalMs', 'storage', 'version'])
    expect(status.authenticated && status.version).toBe('development')
    for (const init of [
      { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) },
      { method: 'DELETE', headers: { Origin: origin } },
    ]) {
      const refused = await f.request('/api/session', init)
      expect(refused.headers.get('allow')).toBe('GET')
      await error(refused, 405, 'method_not_allowed')
    }
    await f.app.close()
    await error(await f.request('/api/session'), 503, 'unavailable')
  })

  test('reads need no session, and mutations need the exact Origin but no CSRF token', async () => {
    const f = await open()
    const doc = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd'))
    expect((await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: { Cookie: 'merdeck_session=bad' } }))).entries.map(entry => entry.path)).toEqual(['flow.mmd', 'notes.md'])
    for (const headers of [{ 'Sec-Fetch-Site': 'same-site' }, { Host: 'evil.test' }])
      await error(await f.request('/api/diagrams/tree', { headers }), 403, 'forbidden')
    const json = { 'Content-Type': 'application/json' }
    for (const headers of [json, { ...json, Origin: 'https://evil.test' }, { ...json, 'Origin': origin, 'Sec-Fetch-Site': 'cross-site' }, { ...json, Host: 'evil.test', Origin: origin }]) {
      await error(await f.request('/api/diagrams/source', { method: 'PUT', headers, body: JSON.stringify(save(doc)) }), 403, 'forbidden')
      await error(await f.request('/api/diagrams/entries', { method: 'POST', headers, body: JSON.stringify({ kind: 'directory', path: 'docs' }) }), 403, 'forbidden')
    }
    expect(await readFile(`${f.root}/flow.mmd`, 'utf8')).toBe('graph TD\nA-->B\n')
    const headers = { ...json, Origin: origin }
    const saved = await data<DiagramDocument>(await f.request('/api/diagrams/source', { method: 'PUT', headers, body: JSON.stringify(save(doc)) }))
    expect(await readFile(`${f.root}/flow.mmd`, 'utf8')).toBe('graph TD\nA-->C\n')
    const post = (route: string, body: unknown) => f.request(`/api/diagrams${route}`, { method: 'POST', headers, body: JSON.stringify(body) })
    expect(await data(await post('/entries', { kind: 'directory', path: 'docs' }))).toEqual({ kind: 'directory', path: 'docs' })
    expect(await data(await post('/entries/move', { kind: 'file', from: 'flow.mmd', to: 'docs/flow.mmd', expectedVersion: saved.version }))).toEqual({ kind: 'file', path: 'docs/flow.mmd' })
    expect(await data(await post('/entries/delete', { kind: 'file', path: 'docs/flow.mmd', expectedVersion: saved.version }))).toEqual({ kind: 'file', path: 'docs/flow.mmd' })
  })
})

describe('HTTP file contracts', () => {
  test('independent Markdown edits preserve all unrelated bytes and update versions/selectors', async () => {
    const f = await fixture()
    const auth = await login(f)
    const original = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=notes.md', { headers: auth.headers }))
    expect(original.kind).toBe('markdown')
    expect(original.text).toBe(markdown.slice(1))
    expect(original.blocks).toHaveLength(2)
    const updated = await data<DiagramDocument>(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(original, 'graph TD\nFirst-->Second\n')) }))
    expect(updated.version).not.toBe(original.version)
    expect(updated.kind).toBe('markdown')
    expect(updated.text).toBe(markdown.replace('A-->B', 'First-->Second').slice(1))
    expect(updated.blocks[1]!.selector).not.toEqual(original.blocks[1]!.selector)
    expect(await readFile(`${f.root}/notes.md`, 'utf8')).toBe(markdown.replace('A-->B', 'First-->Second'))
    const second = { path: updated.path, expectedVersion: updated.version, selector: updated.blocks[1]!.selector, source: 'sequenceDiagram\nBob->>Alice: Goodbye\n' }
    expect((await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(second) })).status).toBe(200)
    expect(await readFile(`${f.root}/notes.md`, 'utf8')).toBe(markdown.replace('A-->B', 'First-->Second').replace('Alice->>Bob: Hello', 'Bob->>Alice: Goodbye'))
  })

  test('never emits Markdown text for standalone Mermaid documents or saves', async () => {
    const f = await fixture()
    const auth = await login(f)
    const original = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }))
    expect(original.kind).toBe('mermaid')
    expect(original).not.toHaveProperty('text')
    const saved = await data<DiagramDocument>(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(original)) }))
    expect(saved.kind).toBe('mermaid')
    expect(saved).not.toHaveProperty('text')
  })

  test('external edits and replacements conflict; detected deletion returns 410 and revisions report rename', async () => {
    const time = { now: 0 }
    const f = await fixture({ time })
    const auth = await login(f)
    const doc = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }))
    const initialTree = await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: auth.headers }))
    await writeFile(`${f.root}/flow.mmd`, 'graph TD\nExternal-->Update\n')
    const stale = await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(doc)) })
    await error(stale, 409, 'conflict')
    const current = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }))
    await writeFile(`${f.root}/replacement.mmd`, 'graph TD\nReplacement-->Update\n')
    await rename(`${f.root}/replacement.mmd`, `${f.root}/flow.mmd`)
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(current)) }), 409, 'conflict')
    time.now += 1000
    const changedTree = await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: auth.headers }))
    expect(changedTree.revision).not.toBe(initialTree.revision)
    await rename(`${f.root}/flow.mmd`, `${f.root}/renamed.mmd`)
    expect(await data(await f.request('/api/diagrams/revision?path=flow.mmd', { headers: auth.headers }))).toEqual({ path: 'flow.mmd', state: 'deleted' })
    expect(await data(await f.request('/api/diagrams/revision?path=renamed.mmd', { headers: auth.headers }))).toMatchObject({ state: 'present' })
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(current)) }), 410, 'deleted')
    await error(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }), 410, 'deleted')
    time.now += 1000
    const renamedTree = await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: auth.headers }))
    expect(renamedTree.revision).not.toBe(changedTree.revision)
    await unlink(`${f.root}/renamed.mmd`)
    time.now += 1000
    expect((await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: auth.headers }))).revision).not.toBe(renamedTree.revision)
  })

  test('two concurrent HTTP saves serialize to a success and a conflict', async () => {
    const f = await fixture()
    const auth = await login(f)
    const doc = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }))
    const responses = await Promise.all(['One', 'Two'].map(value => f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(doc, `graph TD\nA-->${value}\n`)) })))
    expect(responses.map(response => response.status).sort()).toEqual([200, 409])
  })

  test('unsupported storage remains readable and refuses writes with actionable typed status', async () => {
    const f = await fixture({ unsupported: true })
    const auth = await login(f)
    expect(auth.session.storage.writable).toBe(false)
    const doc = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }))
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify(save(doc)) }), 503, 'filesystem_unsupported')
    expect(await readFile(`${f.root}/flow.mmd`, 'utf8')).toBe(doc.blocks[0]!.source)
  })

  test('HTTP paths decode once and reject escapes, duplicate queries and symlink targets', async () => {
    const f = await fixture()
    const outside = await fixture()
    const auth = await login(f)
    for (const path of ['../flow.mmd', '/etc/passwd', 'a/../b.mmd', 'a\\b.mmd', 'a\0.mmd', '%2e%2e/flow.mmd', 'a//b.mmd']) {
      await error(await f.request(`/api/diagrams/document?path=${encodeURIComponent(path)}`, { headers: auth.headers }), 400, 'invalid_request')
      await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify({ path, selector: { kind: 'standalone' }, expectedVersion: 'a'.repeat(64), source: 'graph TD' }) }), 400, 'invalid_request')
    }
    for (const query of ['path=%GG', 'path=%C0%AF', 'path=flow.mmd&path=notes.md', 'path=flow.mmd&root=x', 'path=flow.mmd&token=x'])
      await error(await f.request(`/api/diagrams/document?${query}`, { headers: auth.headers }), 400, 'invalid_request')
    await symlink(`${outside.root}/flow.mmd`, `${f.root}/escape.mmd`)
    await error(await f.request('/api/diagrams/document?path=escape.mmd', { headers: auth.headers }), 403, 'forbidden')
    await symlink(outside.root, `${f.root}/escape`)
    await error(await f.request('/api/diagrams/document?path=escape/flow.mmd', { headers: auth.headers }), 403, 'forbidden')
    await writeFile(`${f.root}/space name.mmd`, 'graph TD\nA-->B\n')
    expect((await f.request('/api/diagrams/document?path=space%20name.mmd', { headers: auth.headers })).status).toBe(200)
  })

  test('replacing the configured root fails closed through HTTP and never discloses the replacement', async () => {
    const f = await fixture()
    const outside = await fixture()
    const auth = await login(f)
    const moved = `${f.root}-held`
    await rename(f.root, moved)
    try {
      await symlink(outside.root, f.root)
      for (const path of ['/api/session', '/api/diagrams/tree', '/api/diagrams/document?path=flow.mmd', '/api/diagrams/revision?path=flow.mmd'])
        await error(await f.request(path, { headers: auth.headers }), 503, 'unavailable')
      await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: JSON.stringify({ path: 'flow.mmd', selector: { kind: 'standalone' }, expectedVersion: 'a'.repeat(64), source: 'graph TD' }) }), 503, 'unavailable')
      expect(await data(await f.request('/api/session'))).toEqual({ authenticated: false })
    }
    finally {
      await unlink(f.root)
      await rename(moved, f.root)
    }
  })

  test('failed project metadata during login does not consume session capacity', async () => {
    const f = await fixture({ environment: { MERDECK_MAX_SESSIONS: '1' } })
    const moved = `${f.root}-held`
    await rename(f.root, moved)
    try {
      const response = await f.request('/api/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      expect(response.headers.has('set-cookie')).toBe(false)
      await error(response, 503, 'unavailable')
    }
    finally {
      await rename(moved, f.root)
    }
    await login(f)
  })

  test('unknown methods, bad media, malformed/duplicate JSON and byte limits are enforced', async () => {
    const f = await fixture()
    const auth = await login(f)
    for (const [path, method] of [['/api/diagrams/tree', 'POST'], ['/api/diagrams/document?path=flow.mmd', 'HEAD'], ['/api/diagrams/source', 'GET'], ['/api/session', 'PATCH'], ['/api/health', 'OPTIONS']]) {
      const response = await f.request(path!, { method: method!, headers: auth.headers })
      expect(response.status).toBe(405)
      expect(response.headers.has('allow')).toBe(true)
    }
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: { ...auth.headers, 'Content-Type': 'text/plain' }, body: '{}' }), 415, 'unsupported_media_type')
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: { ...auth.headers, 'Content-Encoding': 'gzip' }, body: '{}' }), 415, 'unsupported_media_type')
    const doc = await data<DiagramDocument>(await f.request('/api/diagrams/document?path=flow.mmd', { headers: auth.headers }))
    const valid = JSON.stringify(save(doc))
    for (const body of ['{', 'null', '[]', `${valid.slice(0, -1)},"force":true}`, valid.replace('"source":', '"source":"x","source":'), valid.replace('"standalone"', '"standalone","kind":"standalone"')])
      await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body }), 400, 'invalid_request')
    for (const body of [JSON.stringify(save(doc, 'a'.repeat(20000))), JSON.stringify(save(doc, '😀'.repeat(300)))])
      await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body }), 413, 'too_large')
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: { ...auth.headers, 'Content-Length': '999999' }, body: valid }), 413, 'too_large')
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: { ...auth.headers, 'Content-Length': '1' }, body: valid }), 400, 'invalid_request')
    await error(await f.request('/api/diagrams/source', { method: 'PUT', headers: auth.headers, body: new Uint8Array([0xFF]) }), 400, 'invalid_request')
  })

  test('truncated trees remain explicitly incomplete and cannot imply selected-file deletion', async () => {
    const f = await fixture({ environment: { MERDECK_MAX_TREE_ENTRIES: '1' } })
    const auth = await login(f)
    expect((await data<TreeSnapshot>(await f.request('/api/diagrams/tree', { headers: auth.headers }))).truncated).toBe(true)
    expect(await data(await f.request('/api/diagrams/revision?path=notes.md', { headers: auth.headers }))).toMatchObject({ state: 'present' })
  })
})

describe('mount and static boundaries', () => {
  test('production serves only built shell/assets, preserves headers, and has no API fallback', async () => {
    const f = await fixture()
    const shell = await f.request('/?file=notes.md')
    expect(shell.status).toBe(200)
    expect(await shell.text()).toContain('<title>Merdeck</title>')
    expect(shell.headers.get('content-security-policy')).toContain('frame-ancestors \'none\'')
    const asset = await f.request('/assets/app.js')
    expect(asset.headers.get('content-type')).toContain('javascript')
    expect((await f.request('/assets/app.js', { method: 'HEAD' })).status).toBe(200)
    for (const path of ['/api', '/api/missing', '/assets/missing.js', '/assets/%252e%252e/.env', '/.env', '/src/index.ts', '/flow.mmd', '/missing', '/health', '/session'])
      await error(await f.request(path), 404, 'not_found')
    expect((await f.request('/', { method: 'POST' })).status).toBe(404)
  })

  test('development stripped mount authenticates the same routes without duplicate prefixed routes or SPA', async () => {
    const f = await fixture({ environment: { NODE_ENV: 'development', MERDECK_API_MODE: 'stripped' } })
    const auth = await login(f, '')
    expect(auth.setCookie).toContain('Path=/api')
    expect((await f.request('/diagrams/tree', { headers: auth.headers })).status).toBe(200)
    expect((await f.request('/health')).status).toBe(200)
    for (const path of ['/api/health', '/api/diagrams/tree', '/', '/assets/app.js'])
      expect((await f.request(path, { headers: auth.headers })).status).toBe(404)
  })

  test('the build identity is public, matches the served shell and discloses nothing else', async () => {
    for (const environment of [{ MERDECK_POLL_INTERVAL_MS: '1000' }, { MERDECK_TOKEN: '' }]) {
      const f = await fixture({ environment })
      const response = await f.request('/api/build')
      expect(response.headers.get('cache-control')).toBe('no-store')
      const build = await data<ApplicationBuild>(response)
      expect(Object.keys(build).sort()).toEqual(['identity', 'pollIntervalMs'])
      expect(build.identity).toMatch(/^[a-f0-9]{64}$/)
      expect(build.pollIntervalMs).toBe(60000)
      expect(await (await f.request('/')).text()).toContain(`<meta name="merdeck-build" content="${build.identity}">`)
      await error(await f.request('/api/build?root=private'), 400, 'invalid_request')
      const post = await f.request('/api/build', { method: 'POST', headers: { Origin: origin } })
      expect(post.headers.get('allow')).toBe('GET')
      await error(post, 405, 'method_not_allowed')
      await error(await f.request('/api/build', { headers: { Origin: 'https://evil.test' } }), 403, 'forbidden')
      await error(await f.request('/api/build', { headers: { Host: 'evil.test' } }), 403, 'forbidden')
    }
    const f = await fixture()
    const bare = createApp(f.config, { diagrams: await createDiagramService(f.config) })
    try {
      expect(await data(await bare.request(`${origin}/api/build`))).toEqual({ identity: null, pollIntervalMs: 60000 })
    }
    finally {
      await bare.close()
    }
  })
})
