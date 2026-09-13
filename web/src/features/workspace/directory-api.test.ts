import { expect, it, vi } from 'vitest'
import { requestApi } from '@/shared/lib/http'
import { decodeDirectoryPage, decodeDirectoryRevision } from './api'

export const directoryPage = (overrides = {}) => ({ path: '', parent: null, revision: 'a'.repeat(64), entries: [], nextCursor: null, complete: true, stoppedBy: null, visited: 0, excluded: 0, limit: 100, maxPathDepth: 64, pollIntervalMs: 3000, expiresAt: null, ...overrides })
it('decodes exact directory shapes including empty continuations and depth boundaries', () => {
  expect(decodeDirectoryPage(directoryPage())).toEqual(directoryPage())
  const more = directoryPage({ complete: false, stoppedBy: 'visits', nextCursor: 'b'.repeat(64), expiresAt: new Date(Date.now() + 100000).toISOString(), visited: 1024, excluded: 1024 })
  expect(decodeDirectoryPage(more)).toEqual(more)
  expect(decodeDirectoryPage(directoryPage({ path: 'docs', parent: '', maxPathDepth: 1, complete: false, stoppedBy: 'depth' })).stoppedBy).toBe('depth')
  expect(decodeDirectoryRevision({ path: 'docs', revision: 'a'.repeat(64), maxPathDepth: 64, pollIntervalMs: 1000 }).path).toBe('docs')
})
it.each([
  { parent: '' },
  { entries: [{ kind: 'directory', path: 'docs/deep', children: 'unloaded' }] },
  { entries: [{ kind: 'directory', path: 'docs', children: 'loaded' }] },
  { entries: [{ kind: 'file', path: 'a.mmd', fileKind: 'mermaid', state: 'deferred', blocks: [] }] },
  { entries: Array.from({ length: 2 }, () => ({ kind: 'directory', path: 'docs', children: 'unloaded' })) },
  { complete: false },
  { nextCursor: 'x' },
  { excluded: 1 },
  { visited: 1025 },
  { limit: 201 },
  { stoppedBy: 'depth', complete: false },
  { expiresAt: 'tomorrow' },
  { revision: 'x' },
])('refuses malformed pages without partial results: %j', (change) => {
  expect(() => decodeDirectoryPage(directoryPage(change))).toThrow()
})
it('preserves a bounded Retry-After hint for rate limiting', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: 'rate_limited', message: 'Try later.' } }), { status: 429, headers: { 'Retry-After': '60' } })))
  await expect(requestApi('/diagrams/directory', value => value)).rejects.toMatchObject({ retryAfterSeconds: 60 })
})

it('uses scoped page, revision and close transport with the actual shared contract', async () => {
  const fetch = vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify({ success: true, data: url.includes('/close') ? { closed: true } : url.includes('/revision') ? { path: 'docs', revision: 'a'.repeat(64), maxPathDepth: 64, pollIntervalMs: 3000 } : directoryPage({ path: 'docs', parent: '', limit: 1 }) })))
  vi.stubGlobal('fetch', fetch)
  const { api } = await import('./api')
  const signal = new AbortController().signal
  await api.directory({ path: 'docs', limit: 1, cursor: 'b'.repeat(64) }, signal)
  await api.directoryRevision('docs', signal)
  await api.closeDirectory({ path: 'docs', cursor: 'b'.repeat(64) }, 'csrf')
  expect(fetch.mock.calls[0]?.[0]).toBe(`/api/diagrams/directory?path=docs&limit=1&cursor=${'b'.repeat(64)}`)
  expect(fetch.mock.calls[1]?.[0]).toBe('/api/diagrams/directory/revision?path=docs')
  expect(fetch.mock.calls[2]?.[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ path: 'docs', cursor: 'b'.repeat(64) }) })
  expect((fetch.mock.calls[2]?.[1] as RequestInit).headers).toBeInstanceOf(Headers)
})

it('refuses a success that hides the depth boundary or exceeds the emitted-entry budget', () => {
  expect(() => decodeDirectoryPage(directoryPage({ path: 'docs', parent: '', maxPathDepth: 1 }))).toThrow()
  expect(() => decodeDirectoryPage(directoryPage({ limit: 1, entries: [{ kind: 'directory', path: 'one', children: 'unloaded' }, { kind: 'directory', path: 'two', children: 'unloaded' }] }))).toThrow()
  expect(() => decodeDirectoryRevision({ path: 'docs/deep', revision: 'a'.repeat(64), maxPathDepth: 1, pollIntervalMs: 1000 })).toThrow()
})
