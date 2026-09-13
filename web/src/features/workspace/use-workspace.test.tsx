import type { DiagramDocument } from '../../../../src/shared/contracts'
import type { Session } from './api'
import { focusManager, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/lib/http'
import { createQueryClient } from '@/shared/lib/query'
import { api } from './api'
import { warningMessage } from './drafts'
import { useWorkspace } from './use-workspace'

const session: Session = { authenticated: true, access: 'token', version: '0.0.0-test', csrfToken: 'csrf', expiresAt: new Date(Date.now() + 3600000).toISOString(), pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: { writable: true, identity: 'stable' as const, filesystemType: 'test', supportedFilesystem: 'linux-overlayfs' } }
const version = 'a'.repeat(64)
function doc(path = 'one.mmd', source = 'A-->B', next = version): DiagramDocument {
  return { path, version: next, kind: 'mermaid', blocks: [{ selector: { kind: 'standalone' }, label: 'Diagram', source, lineStart: 1, lineEnd: 2 }] }
}
function setup() {
  const client = createQueryClient()
  vi.spyOn(api, 'session').mockResolvedValue(session)
  vi.spyOn(api, 'directory').mockImplementation(async request => ({ path: request.path, parent: request.path ? '' : null, entries: [], revision: version, complete: true, nextCursor: null, expiresAt: null, stoppedBy: null, visited: 0, excluded: 0, limit: 100, maxPathDepth: 64, pollIntervalMs: 30000 }))
  vi.spyOn(api, 'directoryRevision').mockImplementation(async path => ({ path, revision: version, maxPathDepth: 64, pollIntervalMs: 30000 }))
  vi.spyOn(api, 'closeDirectory').mockResolvedValue({ closed: true })
  vi.spyOn(api, 'revision').mockImplementation(async path => ({ path, version, state: 'present' }))
  vi.spyOn(api, 'document').mockImplementation(async path => doc(path))
  return { client, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }
}
it('keeps selection-specific drafts with delayed loads and protects unload', async () => {
  const { client, wrapper } = setup()
  let resolveOld: (value: DiagramDocument) => void = () => {}
  vi.mocked(api.document).mockImplementation(path => path === 'one.mmd'
    ? new Promise((resolve) => {
        resolveOld = resolve
      })
    : Promise.resolve(doc(path, 'new selection')))
  const { result, rerender, unmount } = renderHook(({ path }) => useWorkspace(path, 0), { wrapper, initialProps: { path: 'one.mmd' } })
  await waitFor(() => expect(api.document).toHaveBeenCalled())
  rerender({ path: 'two.mmd' })
  await waitFor(() => expect(result.current.file?.sources[0]).toBe('new selection'))
  act(() => resolveOld(doc('one.mmd', 'stale response')))
  expect(result.current.file?.baseline.path).toBe('two.mmd')
  act(() => result.current.dispatch({ type: 'edit', path: 'two.mmd', block: 0, source: 'draft' }))
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  rerender({ path: 'one.mmd' })
  rerender({ path: 'two.mmd' })
  expect(result.current.file?.sources[0]).toBe('draft')
  unmount()

  client.clear()
})
it('guards duplicate saves, keeps new typing and reports conflicts without overwriting', async () => {
  const { client, wrapper } = setup()
  let complete: (value: DiagramDocument) => void = () => {}
  vi.spyOn(api, 'save').mockImplementation(() => new Promise((resolve) => {
    complete = resolve
  }))
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'submitted' }))
  let saving: Promise<void>
  act(() => {
    saving = result.current.save()

    void result.current.save()
  })
  await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'newer' }))
  await act(async () => {
    complete(doc('one.mmd', 'submitted', 'b'.repeat(64)))

    await saving
  })
  expect(result.current.file?.sources[0]).toBe('newer')
  expect(result.current.file?.baseline.version).toBe('b'.repeat(64))
  vi.mocked(api.save).mockRejectedValueOnce(new HttpError(409, 'conflict', 'Conflict'))
  await act(() => result.current.save())
  expect(warningMessage(result.current.file?.warning)).toContain('changed outside')
  expect(result.current.file?.sources[0]).toBe('newer')
  unmount()

  client.clear()
})
it('clears server cache on auth expiration while locking recoverable drafts and rejecting late saves', async () => {
  const { client, wrapper } = setup()
  let complete: (value: DiagramDocument) => void = () => {}
  vi.spyOn(api, 'save').mockImplementation(() => new Promise((resolve) => {
    complete = resolve
  }))
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'recoverable' }))
  let saving: Promise<void>
  act(() => {
    saving = result.current.save()
  })
  await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
  vi.mocked(api.revision).mockRejectedValue(new HttpError(401, 'unauthorized', 'Expired'))
  await act(() => client.refetchQueries({ queryKey: ['revision'] }))
  await waitFor(() => expect(result.current.session).toBeNull())
  expect(result.current.file?.locked).toBe(true)
  expect(result.current.file?.sources[0]).toBe('recoverable')
  await act(async () => {
    complete(doc('one.mmd', 'recoverable', 'b'.repeat(64)))

    await saving
  })
  expect(client.getQueryData(['document', 0, 'one.mmd', 'b'.repeat(64)])).toBeUndefined()
  expect(result.current.file?.baseline.version).toBe(version)
  unmount()

  client.clear()
})
it('confirmed logout clears draft state and session data', async () => {
  const { client, wrapper } = setup()
  vi.spyOn(api, 'logout').mockResolvedValue({ authenticated: false })
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'draft' }))
  await act(() => result.current.logout.mutateAsync())
  await waitFor(() => expect(result.current.drafts).toEqual({}))
  expect(client.getQueryData(['session'])).toEqual({ authenticated: false })
  unmount()

  client.clear()
})
it('treats a rotated session as a new authorization boundary', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'keep across sessions' }))
  act(() => client.setQueryData(['session'], { ...session, csrfToken: 'a-different-session' }))
  await waitFor(() => expect(result.current.session).toBeNull())
  expect(result.current.file?.locked).toBe(true)
  expect(result.current.file?.sources[0]).toBe('keep across sessions')
  unmount()

  client.clear()
})
it('explicit logout also discards local data when the server session already expired', async () => {
  const { client, wrapper } = setup()
  vi.spyOn(api, 'logout').mockRejectedValue(new HttpError(401, 'unauthorized', 'Expired'))
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'explicitly discarded' }))
  await act(() => result.current.logout.mutateAsync())
  await waitFor(() => expect(result.current.drafts).toEqual({}))
  unmount()

  client.clear()
})
it('pauses polling while hidden and coalesces an in-flight revision request', async () => {
  const { client, wrapper } = setup()
  vi.mocked(api.session).mockResolvedValue({ ...session, pollIntervalMs: 1000 })
  const { unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(api.document).toHaveBeenCalled())
  const before = vi.mocked(api.revision).mock.calls.length
  vi.useFakeTimers()
  act(() => focusManager.setFocused(false))
  await act(() => vi.advanceTimersByTimeAsync(5000))
  expect(api.revision).toHaveBeenCalledTimes(before)
  let complete: (value: { path: string, state: 'present', version: string }) => void = () => {}
  vi.mocked(api.revision).mockImplementation(() => new Promise((resolve) => {
    complete = resolve
  }))
  act(() => focusManager.setFocused(true))
  await act(() => vi.advanceTimersByTimeAsync(5000))
  expect(api.revision).toHaveBeenCalledTimes(before + 1)
  await act(async () => complete({ path: 'one.mmd', state: 'present', version }))
  unmount()

  client.clear()

  focusManager.setFocused(undefined)

  vi.useRealTimers()
})
const openSession: Session = { authenticated: true, access: 'open', version: '0.0.0-test', pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: session.storage }
it('saves and changes entries without a CSRF token when the service has open access', async () => {
  const { client, wrapper } = setup()
  vi.mocked(api.session).mockResolvedValue(openSession)
  vi.spyOn(api, 'save').mockResolvedValue(doc('one.mmd', 'saved openly', 'b'.repeat(64)))
  vi.spyOn(api, 'createEntry').mockResolvedValue({ kind: 'directory', path: 'docs' })
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  expect(result.current.session).toEqual(openSession)
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'saved openly' }))
  await act(() => result.current.save())
  expect(api.save).toHaveBeenCalledWith({ path: 'one.mmd', selector: { kind: 'standalone' }, expectedVersion: version, source: 'saved openly' }, undefined)
  expect(result.current.file?.baseline.version).toBe('b'.repeat(64))
  await act(() => result.current.entries.mutateAsync({ type: 'create', request: { kind: 'directory', path: 'docs' } }))
  expect(api.createEntry).toHaveBeenCalledWith({ kind: 'directory', path: 'docs' }, undefined)
  unmount()

  client.clear()
})
it('reopens the workspace with drafts locked for review when the service stops requiring a token', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'kept for review' }))
  vi.mocked(api.session).mockResolvedValue(openSession)
  act(() => client.setQueryData(['session'], openSession))
  await waitFor(() => expect(result.current.file?.locked).toBe(true))
  await waitFor(() => expect(result.current.session).toEqual(openSession))
  expect(result.current.expired).toBe(false)
  expect(result.current.file?.locked).toBe(true)
  expect(result.current.file?.sources[0]).toBe('kept for review')
  unmount()

  client.clear()
})
it('allows an application reload only when no work would be lost, and starts no save afterwards', async () => {
  const { client, wrapper } = setup()
  let complete: (value: DiagramDocument) => void = () => {}
  vi.spyOn(api, 'save').mockImplementation(() => new Promise((resolve) => {
    complete = resolve
  }))
  const navigate = vi.fn()
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  expect(result.current.reloadBlocked).toBe(false)
  act(() => {
    result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'unsaved' })
    // The action-time guard already sees an edit that the current render does not show yet.
    expect(result.current.reloadApplication(false, navigate)).toBe(false)
  })
  expect(result.current.reloadBlocked).toBe(true)
  let saving: Promise<void>
  act(() => {
    saving = result.current.save()
  })
  await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
  expect(result.current.reloadApplication(false, navigate)).toBe(false)
  await act(async () => {
    complete(doc('one.mmd', 'unsaved', 'b'.repeat(64)))

    await saving
  })
  await waitFor(() => expect(result.current.reloadBlocked).toBe(false))
  expect(result.current.reloadApplication(true, navigate)).toBe(false)
  expect(navigate).not.toHaveBeenCalled()
  expect(result.current.reloadApplication(false, navigate)).toBe(true)
  expect(navigate).toHaveBeenCalledOnce()
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'typed after reload was chosen' }))
  await act(() => result.current.save())
  expect(api.save).toHaveBeenCalledTimes(1)
  unmount()

  client.clear()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function markdown(next = version, first = 'Original', second = 'Sibling'): DiagramDocument {
  return { path: 'race.md', version: next, kind: 'markdown', blocks: [first, second].map((source, index) => ({ source, label: `Diagram ${index + 1}`, selector: { kind: 'markdown', id: `md:${index}:${first.length + index * 100}:${first.length + index * 100 + 50}` }, lineStart: index * 4 + 1, lineEnd: index * 4 + 3 })) }
}

it.each(['own save', 'external revision', 'deletion', 'session change'] as const)('reconciles a committed save after revision and document queries: %s', async (scenario) => {
  const { client, wrapper } = setup()
  const committed = markdown('b'.repeat(64), 'Submitted')
  let current = markdown()
  vi.mocked(api.document).mockImplementation(async () => current)
  vi.mocked(api.revision).mockImplementation(async () => ({ path: current.path, state: 'present', version: current.version }))
  const response = deferred<DiagramDocument>()
  const started = deferred<void>()
  vi.spyOn(api, 'save').mockImplementationOnce(() => {
    current = committed
    started.resolve()
    return response.promise
  })
  const { result, unmount } = renderHook(() => useWorkspace('race.md', 0), { wrapper })
  try {
    await waitFor(() => expect(result.current.file).toBeDefined())
    act(() => {
      result.current.dispatch({ type: 'edit', path: 'race.md', block: 0, source: 'Submitted' })
      result.current.dispatch({ type: 'edit', path: 'race.md', block: 1, source: 'Sibling draft' })
    })
    let saving!: Promise<void>
    await act(async () => {
      saving = result.current.save()
      await started.promise
    })
    act(() => result.current.dispatch({ type: 'edit', path: 'race.md', block: 0, source: 'Newer typing' }))
    await act(() => client.refetchQueries({ queryKey: ['revision'] }))
    await waitFor(() => expect(result.current.documentQuery.data?.version).toBe(committed.version))
    await waitFor(() => expect(result.current.file?.warning).not.toBeNull())
    expect(result.current.file?.baseline.version).toBe(version)
    if (scenario === 'external revision') {
      current = markdown('c'.repeat(64), 'External')
      await act(() => client.refetchQueries({ queryKey: ['revision'] }))
      await waitFor(() => expect(result.current.documentQuery.data?.version).toBe(current.version))
    }
    if (scenario === 'deletion') {
      vi.mocked(api.revision).mockResolvedValue({ path: 'race.md', state: 'deleted' })
      await act(() => client.refetchQueries({ queryKey: ['revision'] }))
      await waitFor(() => expect(result.current.revision.data?.state).toBe('deleted'))
    }
    if (scenario === 'session change') {
      act(() => client.setQueryData(['session'], { ...session, csrfToken: 'rotated' }))
      await waitFor(() => expect(result.current.session).toBeNull())
    }
    await act(async () => {
      response.resolve(committed)
      await saving
    })
    expect(result.current.file?.sources).toEqual(['Newer typing', 'Sibling draft'])
    if (scenario === 'own save') {
      expect(result.current.file?.warning).toBeNull()
      expect(result.current.file?.baseline.blocks[1]?.selector).toEqual(committed.blocks[1]?.selector)
      vi.mocked(api.save).mockResolvedValueOnce(markdown('d'.repeat(64), 'Newer typing'))
      await act(() => result.current.save())
      expect(api.save).toHaveBeenLastCalledWith({ path: 'race.md', selector: committed.blocks[0]?.selector, expectedVersion: committed.version, source: 'Newer typing' }, session.csrfToken)
      expect(api.save).toHaveBeenCalledTimes(2)
      expect(result.current.file?.sources[1]).toBe('Sibling draft')
    }
    else {
      expect(result.current.file?.warning).not.toBeNull()
      await act(() => result.current.save())
      expect(api.save).toHaveBeenCalledTimes(1)
      if (scenario === 'external revision')
        expect(result.current.revision.data).toEqual({ path: 'race.md', state: 'present', version: current.version })
      if (scenario === 'deletion')
        expect(result.current.revision.data).toEqual({ path: 'race.md', state: 'deleted' })
      if (scenario === 'session change') {
        expect(result.current.file?.locked).toBe(true)
        expect(client.getQueryData(['document', 0, 'race.md', committed.version])).toBeUndefined()
      }
    }
  }
  finally {
    response.resolve(committed)
    unmount()
    client.clear()
  }
})

it('keeps dirty documents and saving independent of a failed browse directory', async () => {
  const { client, wrapper } = setup()
  vi.spyOn(api, 'save').mockResolvedValue(doc('one.mmd', 'retained', 'b'.repeat(64)))
  const { result, rerender, unmount } = renderHook(({ directory }) => useWorkspace('one.mmd', 0, directory), { wrapper, initialProps: { directory: '' } })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'retained' }))
  vi.mocked(api.directory).mockRejectedValue(new HttpError(404, 'not_found', 'Directory unavailable'))
  vi.mocked(api.directoryRevision).mockRejectedValue(new HttpError(404, 'not_found', 'Directory unavailable'))
  rerender({ directory: 'missing' })
  await waitFor(() => expect(result.current.listing.error).toBeTruthy())
  expect(result.current.file?.sources[0]).toBe('retained')
  expect(result.current.file?.warning).toBeNull()
  await act(() => result.current.save())
  expect(api.save).toHaveBeenCalledOnce()
  expect(result.current.file?.saved).toBe(true)
  unmount()
  client.clear()
})

it('manual refresh retries only the selected failed document with an unchanged revision and never replays a cursor', async () => {
  const { client, wrapper } = setup()
  vi.mocked(api.document).mockRejectedValueOnce(new HttpError(503, 'unavailable', 'Temporary read failure'))
  const first = { path: '', parent: null, entries: [], revision: version, complete: false, nextCursor: 'c'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString(), stoppedBy: 'entries' as const, visited: 0, excluded: 0, limit: 100, maxPathDepth: 64, pollIntervalMs: 30000 }
  vi.mocked(api.directory).mockResolvedValueOnce(first)
  vi.spyOn(api, 'closeDirectory').mockResolvedValue({ closed: true })
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.documentQuery.isError).toBe(true))
  await waitFor(() => expect(result.current.listing.canNext).toBe(true))
  act(() => result.current.listing.next())
  await waitFor(() => expect(api.directory).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(result.current.listing.loading).toBe(false))
  act(() => result.current.refresh())
  await waitFor(() => expect(result.current.file?.sources[0]).toBe('A-->B'))
  expect(api.document).toHaveBeenCalledTimes(2)
  expect(vi.mocked(api.directory).mock.calls.map(([request]) => request.cursor)).toEqual([undefined, first.nextCursor, undefined])
  expect(vi.mocked(api.document).mock.calls.every(([path]) => path === 'one.mmd')).toBe(true)
  unmount()
  client.clear()
})

it('settles namespace polling before a local write and restarts once after its response', async () => {
  const { client, wrapper } = setup()
  const { result, unmount } = renderHook(() => useWorkspace('one.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  let probeSignal!: AbortSignal
  vi.mocked(api.directoryRevision).mockImplementation((_path, signal) => {
    probeSignal = signal
    return new Promise(() => {})
  })
  act(() => {
    void client.refetchQueries({ queryKey: ['directory-revision'] })
  })
  await waitFor(() => expect(probeSignal).toBeDefined())
  let complete!: (document: DiagramDocument) => void
  let canceledBeforeWrite = false
  vi.spyOn(api, 'save').mockImplementation(() => {
    canceledBeforeWrite = probeSignal.aborted
    return new Promise((resolve) => {
      complete = resolve
    })
  })
  act(() => result.current.dispatch({ type: 'edit', path: 'one.mmd', block: 0, source: 'Changed' }))
  let pending!: Promise<void>
  act(() => {
    pending = result.current.save()
  })
  await waitFor(() => expect(api.save).toHaveBeenCalledOnce())
  expect(canceledBeforeWrite).toBe(true)
  const probes = vi.mocked(api.directoryRevision).mock.calls.length
  const pages = vi.mocked(api.directory).mock.calls.length
  await act(() => client.refetchQueries({ queryKey: ['directory-revision'] }))
  expect(api.directoryRevision).toHaveBeenCalledTimes(probes)
  expect(api.directory).toHaveBeenCalledTimes(pages)
  await act(async () => {
    complete(doc('one.mmd', 'Changed', 'b'.repeat(64)))
    await pending
  })
  await waitFor(() => expect(result.current.listing.loading).toBe(false))
  expect(api.directory).toHaveBeenCalledTimes(pages + 1)
  expect(vi.mocked(api.directory).mock.calls.every(([request]) => !request.cursor)).toBe(true)
  unmount()
  client.clear()
})
