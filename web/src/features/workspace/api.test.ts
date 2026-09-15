import { expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/lib/http'
import { api, decodeDocument, decodeRevision, decodeSession, decodeTree, errorMessage, sessionCsrf, validPath } from './api'

const version = 'a'.repeat(64)
const doc = { path: 'hello.mmd', version, kind: 'mermaid', blocks: [{ selector: { kind: 'standalone' }, label: 'Diagram', lineStart: 1, lineEnd: 2, source: 'A-->B' }] }
it('decodes the authenticated capability without deriving write eligibility from a filesystem name', () => {
  expect(decodeSession({ authenticated: false })).toEqual({ authenticated: false })
  const capabilities = { version: '0.0.0-test', pollIntervalMs: 3000, storage: { writable: false, identity: 'none', filesystemType: 'unknown', supportedFilesystem: 'future-storage' }, maxSourceBytes: 1000 }
  const token = decodeSession({ authenticated: true, access: 'token', csrfToken: 'csrf', expiresAt: new Date().toISOString(), ...capabilities })
  expect(token).toMatchObject({ access: 'token', storage: { writable: false }, maxSourceBytes: 1000 })
  const open = decodeSession({ authenticated: true, access: 'open', csrfToken: 'ignored', ...capabilities })
  expect(open).toEqual({ authenticated: true, access: 'open', ...capabilities })
  expect(token.authenticated && sessionCsrf(token)).toBe('csrf')
  expect(open.authenticated && sessionCsrf(open)).toBeUndefined()
  for (const value of [null, {}, { authenticated: true }, { authenticated: true, storage: {}, expiresAt: 'bad' }, { authenticated: true, access: 'token', csrfToken: 'csrf', expiresAt: 'bad', ...capabilities }, { authenticated: true, access: 'guest', ...capabilities }, { authenticated: true, access: 'open', ...capabilities, storage: { ...capabilities.storage, identity: 'unknown' } }, { authenticated: true, csrfToken: 'csrf', expiresAt: new Date().toISOString(), ...capabilities }]) expect(() => decodeSession(value)).toThrow(HttpError)
})
it('validates tree and document metadata without importing server schemas', () => {
  expect(decodeDocument(doc)).toEqual(doc)
  const markdown = { ...doc, kind: 'markdown', text: '# Hello', blocks: [{ ...doc.blocks[0], selector: { kind: 'markdown', id: 'md:0:5:9' } }] }
  expect(decodeDocument(markdown).blocks).toHaveLength(1)
  expect(decodeTree({ revision: version, pollIntervalMs: 3000, truncated: true, entries: [{ kind: 'directory', path: 'docs' }, { kind: 'file', path: 'hello.mmd', fileKind: 'mermaid', version, state: 'available', blocks: doc.blocks }, ...['unreadable', 'too_large', 'unsupported'].map(state => ({ kind: 'file', path: `${state}.md`, fileKind: 'markdown', state, blocks: [] }))] }).entries).toHaveLength(5)
  expect(decodeRevision({ path: 'hello.mmd', state: 'present', version })).toMatchObject({ version })
  expect(decodeRevision({ path: 'hello.mmd', state: 'deleted' })).toMatchObject({ state: 'deleted' })
  for (const value of [{ ...doc, path: '../secret' }, { ...doc, version: 'bad' }, { ...doc, kind: 'pdf' }, { ...doc, blocks: null }, { ...doc, kind: 'markdown' }, { ...doc, text: 'nope' }, { ...doc, blocks: [{ ...doc.blocks[0], selector: { kind: 'markdown', id: 'bad' } }] }]) expect(() => decodeDocument(value)).toThrow(HttpError)
  expect(() => decodeTree({ revision: version, pollIntervalMs: 0, entries: [], truncated: true })).toThrow()
  expect(() => decodeTree({ revision: version, pollIntervalMs: 3000, entries: [{ kind: 'bad', path: 'a.mmd' }], truncated: true })).toThrow()
  expect(() => decodeRevision({ path: 'a.mmd', state: 'invalid' })).toThrow()
})
it('rejects unsafe search paths', () => {
  for (const path of ['../secret', '/absolute', 'a//b', 'a\\b', 'a%20b', '', 42]) expect(validPath(path)).toBe(false)
  expect(validPath('docs/hello world.md')).toBe(true)
})
it('preserves actionable typed errors and uses one same-origin client', async () => {
  for (const code of ['filesystem_unsupported', 'conflict', 'deleted', 'unauthorized', 'too_large']) expect(errorMessage(new HttpError(409, code, 'Safe failure'))).toBeTruthy()
  expect(errorMessage(new Error('Network failure'))).toContain('Cannot reach')
  const fetch = vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify({ success: true, data: url.includes('/document') || url.includes('/source') ? doc : url.includes('/revision') ? { path: doc.path, state: 'present', version } : url.includes('/tree') ? { revision: version, entries: [], truncated: false, pollIntervalMs: 3000 } : { authenticated: false } })))
  vi.stubGlobal('fetch', fetch)
  const signal = new AbortController().signal
  await api.session(signal)
  await api.session()
  await api.login('x'.repeat(32))
  await api.logout('csrf')
  await api.tree(signal)
  await api.document(doc.path, signal)
  await api.revision(doc.path, signal)
  await api.save({ path: doc.path, selector: { kind: 'standalone' }, expectedVersion: version, source: 'new' }, 'csrf')
  expect(fetch).toHaveBeenCalledTimes(8)
  expect(fetch.mock.calls.every(([url]) => url.startsWith('/api/'))).toBe(true)
})
