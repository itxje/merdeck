import type { DirectoryPage } from '../../../../src/shared/contracts'
import { focusManager, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/lib/http'
import { createQueryClient } from '@/shared/lib/query'
import { api } from './api'
import { useDirectory } from './use-directory'

const revision = 'a'.repeat(64)
function page(path = '', n = 1): DirectoryPage {
  return { path, parent: path ? '' : null, revision, entries: [{ kind: 'file', path: `${path ? `${path}/` : ''}${n}.mmd`, fileKind: 'mermaid', state: 'deferred' }], nextCursor: n.toString(16).padStart(64, '0'), complete: false, stoppedBy: 'entries', visited: 1, excluded: 0, limit: 1, maxPathDepth: 64, pollIntervalMs: 30000, expiresAt: new Date(Date.now() + 100000).toISOString() }
}
function setup() {
  const client = createQueryClient()
  vi.spyOn(api, 'directory').mockImplementation(async request => page(request.path, request.cursor ? Number.parseInt(request.cursor, 16) + 1 : 1))
  vi.spyOn(api, 'directoryRevision').mockImplementation(async path => ({ path, revision, maxPathDepth: 64, pollIntervalMs: 30000 }))
  vi.spyOn(api, 'closeDirectory').mockResolvedValue({ closed: true })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}
it('consumes cursors once, caps rows and cache at five pages, and never replays on focus', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useDirectory('', 0, true, undefined, 30000, 1), { wrapper })
  await waitFor(() => expect(result.current.entries).toHaveLength(1))
  for (let n = 2; n <= 7; n++) {
    act(() => {
      result.current.next()
      result.current.next()
    })
    await waitFor(() => expect(result.current.lastPage).toBe(n))
  }
  expect(result.current.entries.map(entry => entry.path)).toEqual(['3.mmd', '4.mmd', '5.mmd', '6.mmd', '7.mmd'])
  expect(client.getQueryCache().findAll({ queryKey: ['directory-page'] })).toHaveLength(5)
  expect(api.directory).toHaveBeenCalledTimes(7)
  act(() => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
  await act(async () => {})
  expect(api.directory).toHaveBeenCalledTimes(7)
  act(() => result.current.restart())
  await waitFor(() => expect(result.current.lastPage).toBe(1))
  expect(api.closeDirectory).toHaveBeenCalledWith({ path: '', cursor: page('', 7).nextCursor }, undefined)
  unmount()
  client.clear()
  focusManager.setFocused(undefined)
})
it('drops and closes late pages after navigation and session change', async () => {
  const { client, wrapper } = setup()
  let resolve!: (value: DirectoryPage) => void
  vi.mocked(api.directory).mockImplementationOnce(() => new Promise((done) => {
    resolve = done
  }))
  const { result, rerender, unmount } = renderHook(({ path, active }) => useDirectory(path, 0, active, undefined, 30000, 1), { wrapper, initialProps: { path: '', active: true } })
  await waitFor(() => expect(api.directory).toHaveBeenCalledOnce())
  rerender({ path: 'docs', active: true })
  await waitFor(() => expect(result.current.entries[0]?.path).toBe('docs/1.mmd'))
  await act(async () => resolve(page()))
  expect(result.current.entries[0]?.path).toBe('docs/1.mmd')
  expect(api.closeDirectory).toHaveBeenCalledWith({ path: '', cursor: page().nextCursor }, undefined)
  rerender({ path: 'docs', active: false })
  expect(result.current.entries).toEqual([])
  expect(client.getQueryCache().findAll({ queryKey: ['directory-page'] })).toHaveLength(0)
  unmount()
  client.clear()
})
it('keeps empty continuation reachable and requires restart after ambiguous failure', async () => {
  const { client, wrapper } = setup()
  vi.mocked(api.directory).mockResolvedValueOnce({ ...page(), entries: [], stoppedBy: 'visits', visited: 1024, excluded: 1024 })
  const { result, unmount } = renderHook(() => useDirectory('', 0, true, undefined, 30000, 1), { wrapper })
  await waitFor(() => expect(result.current.canNext).toBe(true))
  vi.mocked(api.directory).mockRejectedValueOnce(new HttpError(409, 'cursor_stale', 'Restart'))
  act(() => result.current.next())
  await waitFor(() => expect(result.current.error).toBeTruthy())
  expect(result.current.canNext).toBe(false)
  act(() => result.current.next())
  expect(api.directory).toHaveBeenCalledTimes(2)
  act(() => result.current.restart())
  await waitFor(() => expect(result.current.error).toBeNull())
  expect(result.current.entries).toHaveLength(1)
  unmount()
  client.clear()
})
it('restarts changed directories at page one without replaying consumed page requests', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useDirectory('', 0, true, undefined, 30000, 1), { wrapper })
  await waitFor(() => expect(result.current.canNext).toBe(true))
  vi.mocked(api.directory).mockResolvedValueOnce({ ...page(), revision: 'b'.repeat(64) })
  act(() => client.setQueryData(['directory-revision', 0, ''], { path: '', revision: 'b'.repeat(64), maxPathDepth: 64, pollIntervalMs: 30000 }))
  await waitFor(() => expect(result.current.notice).toContain('Listing restarted'))
  expect(result.current.lastPage).toBe(1)
  expect(result.current.entries).toHaveLength(1)
  expect(api.directory).toHaveBeenCalledTimes(2)
  expect(vi.mocked(api.directory).mock.calls[1]?.[0]).not.toHaveProperty('cursor')
  unmount()
  client.clear()
})

it('rejects duplicate, foreign and wrong-revision continuation results without mixing rows', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useDirectory('', 0, true, undefined, 30000, 1), { wrapper })
  await waitFor(() => expect(result.current.canNext).toBe(true))
  vi.mocked(api.directory).mockResolvedValueOnce(page())
  act(() => result.current.next())
  await waitFor(() => expect(result.current.error).toBeTruthy())
  expect(result.current.entries.map(entry => entry.path)).toEqual(['1.mmd'])
  expect(result.current.canNext).toBe(false)
  expect(api.closeDirectory).toHaveBeenCalled()
  unmount()
  client.clear()
})
it('respects Retry-After without retrying the consumed request', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useDirectory('', 0, true, undefined, 30000, 1), { wrapper })
  await waitFor(() => expect(result.current.canNext).toBe(true))
  vi.mocked(api.directory).mockRejectedValueOnce(new HttpError(429, 'rate_limited', 'Wait', 1))
  act(() => result.current.next())
  await waitFor(() => expect(result.current.retryAt).toBeGreaterThan(0))
  act(() => result.current.restart())
  expect(api.directory).toHaveBeenCalledTimes(2)
  await waitFor(() => expect(result.current.retryAt).toBe(0), { timeout: 2000 })
  act(() => result.current.restart())
  await waitFor(() => expect(api.directory).toHaveBeenCalledTimes(3))
  expect(vi.mocked(api.directory).mock.calls[2]?.[0]).not.toHaveProperty('cursor')
  unmount()
  client.clear()
})

it('never reveals an old session directory while a replacement session is loading', async () => {
  const { client, wrapper } = setup()
  const { result, rerender, unmount } = renderHook(({ active, epoch }) => useDirectory('', epoch, active, 'csrf', 30000, 1), { wrapper, initialProps: { active: true, epoch: 0 } })
  await waitFor(() => expect(result.current.entries).toHaveLength(1))
  rerender({ active: false, epoch: 0 })
  vi.mocked(api.directory).mockImplementation(() => new Promise(() => {}))
  rerender({ active: true, epoch: 1 })
  await waitFor(() => expect(result.current.loading).toBe(true))
  expect(result.current.entries).toEqual([])
  unmount()
  client.clear()
})

it('closes an expired cursor and requires a fresh run without losing the displayed rows', async () => {
  const { client, wrapper } = setup()
  vi.mocked(api.directory).mockResolvedValueOnce({ ...page(), expiresAt: new Date(Date.now() + 150).toISOString() })
  const { result, unmount } = renderHook(() => useDirectory('', 0, true, undefined, 30000, 1), { wrapper })
  await waitFor(() => expect(result.current.entries).toHaveLength(1))
  await waitFor(() => expect(result.current.notice).toContain('expired'))
  expect(result.current.canNext).toBe(false)
  expect(result.current.entries).toHaveLength(1)
  expect(api.closeDirectory).toHaveBeenCalledWith({ path: '', cursor: page().nextCursor }, undefined)
  unmount()
  client.clear()
})
