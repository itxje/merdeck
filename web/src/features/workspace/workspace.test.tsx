import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme'
import { HttpError } from '@/shared/lib/http'
import { createQueryClient } from '@/shared/lib/query'
import { api } from './api'
import { Workspace } from './workspace'

vi.mock('@/features/preview/preview', () => ({ Preview: () => <div>Diagram canvas</div> }))
beforeEach(() => {
  const media = Object.assign(new EventTarget(), { matches: false })
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
it('labels login controls, keeps tokens out of persistence and clears failed submissions', async () => {
  vi.spyOn(api, 'session').mockResolvedValue({ authenticated: false })
  vi.spyOn(api, 'login').mockRejectedValue(new HttpError(401, 'unauthorized', 'Invalid token'))
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  const input = await screen.findByLabelText('Access token', { exact: true })
  expect(input).toHaveAttribute('type', 'password')
  expect(input).toHaveAttribute('autocomplete', 'off')
  const user = userEvent.setup()
  await user.click(input)
  await user.type(input, 'private-access-value-private-access-value')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1))
  expect(input).toHaveValue('')
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(localStorage.length).toBe(0)
  await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0))
  unmount()

  client.clear()
})
it('opens directly with open access, without sign-in or Log out, and names the mode in the status bar', async () => {
  vi.spyOn(api, 'session').mockResolvedValue({ authenticated: true, access: 'open', version: '0.0.0-test', pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: { writable: true, identity: 'stable', filesystemType: 'test', supportedFilesystem: 'linux-overlayfs' } })
  vi.spyOn(api, 'directory').mockResolvedValue({ path: '', parent: null, entries: [], revision: 'a'.repeat(64), complete: true, nextCursor: null, expiresAt: null, stoppedBy: null, visited: 0, excluded: 0, limit: 100, maxPathDepth: 64, pollIntervalMs: 30000 })
  vi.spyOn(api, 'directoryRevision').mockResolvedValue({ path: '', revision: 'a'.repeat(64), maxPathDepth: 64, pollIntervalMs: 30000 })
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByText('Open access')).toBeVisible()
  expect(screen.queryByText('Connected')).toBeNull()
  expect(screen.queryByLabelText('Access token')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull()
  unmount()

  client.clear()
})
it('asks for a token only once the session check shows that one is needed', async () => {
  let resolve: (value: { authenticated: false }) => void = () => {}
  vi.spyOn(api, 'session').mockImplementation(() => new Promise((done) => {
    resolve = done
  }))
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByText('Checking your session…')).toBeVisible()
  expect(screen.queryByText(/access token/i)).toBeNull()
  await act(async () => resolve({ authenticated: false }))
  expect(await screen.findByText(/Enter the access token provided by your operator/)).toBeVisible()
  expect(screen.getByLabelText('Access token', { exact: true })).toBeVisible()
  unmount()

  client.clear()
})

it('renders the selected source after Refresh retries a transient document failure with the same revision', async () => {
  const revision = 'a'.repeat(64)
  vi.spyOn(api, 'session').mockResolvedValue({ authenticated: true, access: 'open', version: '0.0.0-test', pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: { writable: true, identity: 'stable', filesystemType: 'test', supportedFilesystem: 'linux-overlayfs' } })
  vi.spyOn(api, 'directory').mockResolvedValue({ path: '', parent: null, entries: [], revision, complete: true, nextCursor: null, expiresAt: null, stoppedBy: null, visited: 0, excluded: 0, limit: 100, maxPathDepth: 64, pollIntervalMs: 30000 })
  vi.spyOn(api, 'directoryRevision').mockResolvedValue({ path: '', revision, maxPathDepth: 64, pollIntervalMs: 30000 })
  vi.spyOn(api, 'revision').mockResolvedValue({ path: 'one.mmd', state: 'present', version: revision })
  vi.spyOn(api, 'document').mockResolvedValue({ path: 'one.mmd', kind: 'mermaid', version: revision, blocks: [{ selector: { kind: 'standalone' }, label: 'Diagram', source: 'flowchart LR\nA-->B', lineStart: 1, lineEnd: 2 }] }).mockRejectedValueOnce(new HttpError(503, 'unavailable', 'Temporary document failure'))
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path="one.mmd" block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByText('Temporary document failure')).toBeVisible()
  expect(screen.queryByLabelText('Mermaid source', { exact: true })).toBeNull()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh files' }))
  expect(await screen.findByLabelText('Mermaid source', { exact: true })).toHaveValue('flowchart LR\nA-->B')
  expect(api.document).toHaveBeenCalledTimes(2)
  unmount()
  client.clear()
})

function markdownDocument(path: string, text: string) {
  return { path, kind: 'markdown' as const, version: 'a'.repeat(64), text, blocks: [{ selector: { kind: 'markdown' as const, id: 'md:0:1:3' }, label: 'Diagram 1', lineStart: 1, lineEnd: 3, source: 'flowchart LR\nA-->B' }] }
}

function mockMarkdownWorkspace(document: ReturnType<typeof markdownDocument>) {
  const revision = 'a'.repeat(64)
  vi.spyOn(api, 'session').mockResolvedValue({ authenticated: true, access: 'open', version: '0.0.0-test', pollIntervalMs: 30000, maxSourceBytes: 1048576, storage: { writable: true, identity: 'stable', filesystemType: 'test', supportedFilesystem: 'linux-overlayfs' } })
  vi.spyOn(api, 'directory').mockResolvedValue({ path: 'docs', parent: '', entries: [], revision, complete: true, nextCursor: null, expiresAt: null, stoppedBy: null, visited: 0, excluded: 0, limit: 100, maxPathDepth: 64, pollIntervalMs: 30000 })
  vi.spyOn(api, 'directoryRevision').mockResolvedValue({ path: 'docs', revision, maxPathDepth: 64, pollIntervalMs: 30000 })
  vi.spyOn(api, 'revision').mockResolvedValue({ path: document.path, state: 'present', version: revision })
  return vi.spyOn(api, 'document').mockImplementation(async target => target === document.path ? document : Promise.reject(new HttpError(404, 'not_found', 'Missing file')))
}

it('keeps the source pane in Markdown Document view and reports guarded document-link failures', async () => {
  const current = markdownDocument('docs/guide.md', '# Guide\n\n[Next](next.md)\n\n```mermaid\nflowchart LR\nA-->B\n```')
  const document = mockMarkdownWorkspace(current)
  document.mockImplementation(async target => target === current.path ? current : Promise.reject(new HttpError(404, 'not_found', 'Missing linked file')))
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path={current.path} block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByLabelText('Mermaid source', { exact: true })).toHaveValue('flowchart LR\nA-->B')
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Missing linked file')).toHaveAttribute('role', 'alert')
  unmount()
  client.clear()
})

it('keeps a Markdown document without diagrams in Document view', async () => {
  const current = { ...markdownDocument('docs/notes.md', '# Notes\n\nNo diagrams.'), blocks: [] }
  mockMarkdownWorkspace(current)
  const client = createQueryClient()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path={current.path} block={0} navigate={vi.fn()} /></ThemeProvider></QueryClientProvider>)
  expect(await screen.findByRole('heading', { name: 'Notes' })).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Document' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: 'Diagram' })).toHaveAttribute('aria-disabled', 'true')
  expect(screen.queryByLabelText('Mermaid source', { exact: true })).toBeNull()
  unmount()
  client.clear()
})

it('ignores a document-link read that resolves after navigation scope changes', async () => {
  const current = markdownDocument('docs/guide.md', '# Guide\n\n[Next](next.md)')
  const document = mockMarkdownWorkspace(current)
  let resolveTarget: (value: ReturnType<typeof markdownDocument>) => void = () => {}
  document.mockImplementation((target) => {
    if (target === current.path)
      return Promise.resolve(current)
    if (target === 'docs/next.md')
      return new Promise((done) => { resolveTarget = done })
    return Promise.resolve(markdownDocument(String(target), '# Other'))
  })
  const client = createQueryClient()
  const navigate = vi.fn()
  const view = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path={current.path} block={0} navigate={navigate} /></ThemeProvider></QueryClientProvider>)
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Next' }))
  view.rerender(<QueryClientProvider client={client}><ThemeProvider><Workspace path="docs/other.md" block={0} navigate={navigate} /></ThemeProvider></QueryClientProvider>)
  await act(async () => resolveTarget(markdownDocument('docs/next.md', '# Next')))
  expect(navigate).not.toHaveBeenCalled()
  view.unmount()
  client.clear()
})

it('silently supersedes an aborted document-link read with the later target', async () => {
  const current = markdownDocument('docs/guide.md', '# Guide\n\n[One](one.md) [Two](two.md)')
  const document = mockMarkdownWorkspace(current)
  let firstAborted = false
  document.mockImplementation((target, signal) => {
    if (target === current.path)
      return Promise.resolve(current)
    if (target === 'docs/one.md') {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          firstAborted = true
          reject(new DOMException('Aborted', 'AbortError'))
        }, { once: true })
      })
    }
    return Promise.resolve(markdownDocument('docs/two.md', '# Two'))
  })
  const client = createQueryClient()
  const navigate = vi.fn()
  const { unmount } = render(<QueryClientProvider client={client}><ThemeProvider><Workspace path={current.path} block={0} navigate={navigate} /></ThemeProvider></QueryClientProvider>)
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'One' }))
  await user.click(screen.getByRole('button', { name: 'Two' }))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('docs/two.md', 0))
  expect(firstAborted).toBe(true)
  expect(screen.queryByText('Aborted')).toBeNull()
  unmount()
  client.clear()
})
