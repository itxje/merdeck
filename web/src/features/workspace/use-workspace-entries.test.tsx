import type { DiagramDocument } from '../../../../src/shared/contracts'
import type { Session } from './api'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { HttpError } from '@/shared/lib/http'
import { createQueryClient } from '@/shared/lib/query'
import { api } from './api'
import { useWorkspace } from './use-workspace'

const session: Session = { authenticated: true, access: 'token', version: '0.0.0-test', csrfToken: 'csrf', expiresAt: new Date(Date.now() + 3600000).toISOString(), pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: { writable: true, identity: 'stable' as const, filesystemType: 'test', supportedFilesystem: 'linux-overlayfs' } }
const version = 'a'.repeat(64)
function doc(path: string, source = 'A-->B'): DiagramDocument {
  return { path, version, kind: 'mermaid', blocks: [{ selector: { kind: 'standalone' }, label: 'Diagram', source, lineStart: 1, lineEnd: 2 }] }
}

it('file operations send the session token, move drafts, remove deleted drafts and end expired sessions', async () => {
  const client = createQueryClient()
  vi.spyOn(api, 'session').mockResolvedValue(session)
  vi.spyOn(api, 'tree').mockResolvedValue({ entries: [], revision: version, truncated: false, pollIntervalMs: 30000 })
  vi.spyOn(api, 'revision').mockImplementation(async path => ({ path, version, state: 'present' }))
  vi.spyOn(api, 'document').mockImplementation(async path => doc(path))
  const moveEntry = vi.spyOn(api, 'moveEntry').mockImplementation(async request => ({ kind: request.kind, path: request.to }))
  const deleteEntry = vi.spyOn(api, 'deleteEntry').mockImplementation(async request => ({ kind: request.kind, path: request.path }))
  const createEntry = vi.spyOn(api, 'createEntry').mockRejectedValue(new HttpError(401, 'unauthorized', 'Sign in to continue.'))
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result, unmount } = renderHook(() => useWorkspace('docs/a.mmd', 0), { wrapper })
  await waitFor(() => expect(result.current.file).toBeDefined())
  act(() => result.current.dispatch({ type: 'edit', path: 'docs/a.mmd', block: 0, source: 'draft' }))
  await act(async () => {
    await result.current.entries.mutateAsync({ type: 'move', request: { kind: 'directory', from: 'docs', to: 'guides' } })
  })
  expect(moveEntry).toHaveBeenCalledWith({ kind: 'directory', from: 'docs', to: 'guides' }, 'csrf')
  expect(result.current.drafts['guides/a.mmd']).toMatchObject({ sources: ['draft'], baseline: { path: 'guides/a.mmd' } })
  await act(async () => {
    await result.current.entries.mutateAsync({ type: 'delete', request: { kind: 'file', path: 'guides/a.mmd', expectedVersion: version } })
  })
  expect(deleteEntry).toHaveBeenCalledWith({ kind: 'file', path: 'guides/a.mmd', expectedVersion: version }, 'csrf')
  expect(result.current.drafts['guides/a.mmd']).toBeUndefined()
  await act(async () => {
    await expect(result.current.entries.mutateAsync({ type: 'create', request: { kind: 'file', path: 'new.mmd' } })).rejects.toBeInstanceOf(HttpError)
  })
  expect(createEntry).toHaveBeenCalledWith({ kind: 'file', path: 'new.mmd' }, 'csrf')
  await waitFor(() => expect(result.current.session).toBeNull())
  unmount()
  client.clear()
})
