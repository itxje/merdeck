import type { DirectoryPage } from '../../../../src/shared/contracts'
import type { FileDraft } from './drafts'
import type { FileFilter } from './file-filter'
import type { SearchView } from './use-directory-search'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { useFileFilter } from './file-filter'
import { FileTree } from './file-tree'

const tree: DirectoryPage = {
  revision: 'a'.repeat(64),
  path: '',
  parent: null,
  complete: true,
  nextCursor: null,
  expiresAt: null,
  stoppedBy: null,
  visited: 4,
  excluded: 0,
  limit: 100,
  maxPathDepth: 64,
  pollIntervalMs: 30000,
  entries: [
    { kind: 'file', path: 'welcome.mmd', fileKind: 'mermaid', state: 'deferred' },
    { kind: 'directory', path: 'docs', children: 'unloaded' },
    { kind: 'file', path: 'overview.md', fileKind: 'markdown', state: 'deferred' },
    { kind: 'directory', path: 'empty', children: 'unloaded' },
  ],
}

function renderTree(kinds: FileFilter, chooseKinds = vi.fn(), snapshot: DirectoryPage = tree) {
  const browse = vi.fn()
  const onAction = vi.fn()
  const view = render(
    <TooltipProvider>
      <FileTree listing={{ entries: snapshot.entries, firstPage: 1, lastPage: 1, loading: false, stale: false, error: null, notice: '', retryAt: 0, canNext: false, complete: true, depth: false, maxPathDepth: 64, next: vi.fn(), restart: vi.fn(), suspend: vi.fn() }} directory="" browse={browse} drafts={{}} path="" block={0} select={vi.fn()} refresh={vi.fn()} canChange onAction={onAction} kinds={kinds} chooseKinds={chooseKinds} />
    </TooltipProvider>,
  )
  return { ...view, chooseKinds, browse, onAction }
}

it('lists every supported file, its folders and an empty folder by default', () => {
  const { unmount } = renderTree('all')
  expect(screen.getByRole('button', { name: 'welcome.mmd' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'overview.md' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'docs' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'empty' })).toBeVisible()
  expect(screen.getByText('2 loaded files · .mmd · .mermaid · .md')).toBeVisible()
  unmount()
})

it('orders the loaded window with folders first and numbered names by value, whatever order the page arrived in', () => {
  const unordered: DirectoryPage = { ...tree, entries: [
    { kind: 'file', path: '10-late.mmd', fileKind: 'mermaid', state: 'deferred' },
    { kind: 'file', path: 'c01-compare.mmd', fileKind: 'mermaid', state: 'deferred' },
    { kind: 'directory', path: 'zeta', children: 'unloaded' },
    { kind: 'file', path: '02-early.mmd', fileKind: 'mermaid', state: 'deferred' },
    { kind: 'directory', path: 'alpha', children: 'unloaded' },
    { kind: 'file', path: '00-map.mmd', fileKind: 'mermaid', state: 'deferred' },
  ] }
  const { unmount } = renderTree('all', vi.fn(), unordered)
  const rows = screen.getAllByRole('button').map(button => (button.textContent ?? '').replace(/Unopened$/, '')).filter(name => /^(?:alpha|zeta|\d\d-|c01)/.test(name))
  expect(rows).toEqual(['alpha', 'zeta', '00-map.mmd', '02-early.mmd', '10-late.mmd', 'c01-compare.mmd'])
  unmount()
})

it('enters unloaded folders and keeps files in the same icon column', async () => {
  const { container, unmount, browse } = renderTree('all')
  const user = userEvent.setup()
  const folder = screen.getByRole('button', { name: 'docs' })
  expect(folder.querySelector('.lucide-folder')).not.toBeNull()
  await user.click(folder)
  expect(browse).toHaveBeenCalledWith('docs')
  expect(folder.querySelector('.lucide-folder-open')).toBeNull()
  expect(folder.querySelector('.lucide-folder')).not.toBeNull()
  await user.click(folder)
  // A file row reserves the chevron column so its icon lines up with a folder's at the same depth.
  expect(screen.getByRole('button', { name: 'welcome.mmd' }).firstElementChild).toHaveClass('tree-twistie')
  expect(folder.firstElementChild).toHaveClass('tree-twistie')
  const depth = (path: string) => container.querySelector(`button[title="${path}"]`)!.closest('li')!.style.getPropertyValue('--depth')
  expect(depth('welcome.mmd')).toBe('0')
  expect(depth('overview.md')).toBe('0')
  unmount()
})

it('lists only diagram files and their folders when diagram files are chosen', () => {
  const { unmount } = renderTree('mermaid')
  expect(screen.getByRole('button', { name: 'welcome.mmd' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'overview.md' })).toBeNull()
  expect(screen.getByRole('button', { name: 'docs' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'empty' })).toBeVisible()
  expect(screen.getByText('1 loaded file · .mmd · .mermaid')).toBeVisible()
  unmount()
})

it('lists Markdown files under the folders that hold them', () => {
  const { unmount } = renderTree('markdown')
  expect(screen.getByRole('button', { name: 'overview.md' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'docs' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'welcome.mmd' })).toBeNull()
  expect(screen.getByText('1 loaded file · .md')).toBeVisible()
  unmount()
})

it('reports the chosen file types and names them when nothing is listed', async () => {
  const { chooseKinds, unmount } = renderTree('all')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '.md files' }))
  expect(chooseKinds).toHaveBeenCalledWith('markdown')
  unmount()

  const empty = renderTree('mermaid', vi.fn(), { ...tree, entries: [tree.entries[2]!] })
  expect(screen.getByText('No .mmd or .mermaid files in this page window')).toBeVisible()
  empty.unmount()
})

it('remembers the chosen file types in this browser', () => {
  const first = renderHook(() => useFileFilter())
  expect(first.result.current[0]).toBe('all')
  act(() => first.result.current[1]('mermaid'))
  expect(first.result.current[0]).toBe('mermaid')
  first.unmount()

  const second = renderHook(() => useFileFilter())
  expect(second.result.current[0]).toBe('mermaid')
  second.unmount()
})

it('keeps every folder reachable under a nonmatching file search and delegates delete to the service', async () => {
  const { onAction, unmount } = renderTree('markdown')
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Filter files' }), 'missing')
  expect(screen.getByRole('button', { name: 'docs' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'docs' }))
  await user.keyboard('{Delete}')
  expect(onAction).toHaveBeenCalledWith({ type: 'delete', kind: 'directory', path: 'docs' })
  unmount()
})

it('searches this folder and its subfolders once text is typed, and returns to the folder view when cleared', async () => {
  const user = userEvent.setup()
  const onQueryChange = vi.fn()
  const select = vi.fn()
  const browse = vi.fn()
  const result = { path: 'nsiod', query: 'relay', kind: null, complete: false, stoppedBy: 'matches' as const, visited: 900, skipped: 0, entries: [
    { kind: 'file' as const, path: 'nsiod/mermaid/mesh-v1/13-relay-gantt.mmd', fileKind: 'mermaid' as const, state: 'deferred' as const },
    { kind: 'directory' as const, path: 'nsiod/relay-notes', children: 'unloaded' as const },
    { kind: 'file' as const, path: 'nsiod/mermaid/mesh-v1/03-relay-state.mmd', fileKind: 'mermaid' as const, state: 'deferred' as const },
  ] }
  const view = (search: SearchView, kinds: FileFilter = 'all') => (
    <TooltipProvider>
      <FileTree listing={{ entries: tree.entries, firstPage: 1, lastPage: 1, loading: false, stale: false, error: null, notice: '', retryAt: 0, canNext: false, complete: true, depth: false, maxPathDepth: 64, next: vi.fn(), restart: vi.fn(), suspend: vi.fn() }} directory="nsiod" browse={browse} drafts={{}} path="" block={0} select={select} refresh={vi.fn()} canChange onAction={vi.fn()} kinds={kinds} chooseKinds={vi.fn()} search={search} onQueryChange={onQueryChange} />
    </TooltipProvider>
  )
  const { rerender, unmount } = render(view({ query: '', pending: false, error: null, result: undefined }))
  expect(screen.getByText('Search and file types look in this folder and its subfolders.')).toBeVisible()
  expect(screen.getByRole('navigation', { name: 'Files and diagrams' })).toBeVisible()
  expect(screen.queryByRole('navigation', { name: 'Search results' })).toBeNull()
  await user.type(screen.getByRole('textbox', { name: 'Filter files' }), 'relay')
  expect(onQueryChange).toHaveBeenLastCalledWith('relay')
  rerender(view({ query: 'relay', pending: true, error: null, result: undefined }))
  expect(screen.getByText('Searching…')).toBeVisible()

  rerender(view({ query: 'relay', pending: false, error: null, result }))
  const results = screen.getByRole('navigation', { name: 'Search results' })
  // Paths show below the browsed folder, in natural order.
  const rows = [...results.querySelectorAll('button')].map(button => button.textContent)
  expect(rows).toEqual(['mermaid/mesh-v1/03-relay-state.mmd', 'mermaid/mesh-v1/13-relay-gantt.mmd', 'relay-notes'])
  expect(screen.getByText('Showing the first 200 matches. Refine the search to see the rest.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'mermaid/mesh-v1/13-relay-gantt.mmd' }))
  expect(select).toHaveBeenCalledWith('nsiod/mermaid/mesh-v1/13-relay-gantt.mmd')
  await user.click(screen.getByRole('button', { name: 'relay-notes' }))
  expect(browse).toHaveBeenCalledWith('nsiod/relay-notes')
  expect(onQueryChange).toHaveBeenLastCalledWith('')
  expect(screen.getByRole('textbox', { name: 'Filter files' })).toHaveValue('')
  unmount()
})

it('lists the chosen file type from this folder and its subfolders without any text', async () => {
  const user = userEvent.setup()
  const select = vi.fn()
  const draft = (file: string): FileDraft => ({ baseline: { path: file, kind: 'markdown', version: 'b'.repeat(64), blocks: [{ selector: { kind: 'markdown', id: 'md:0:8:17' }, label: 'Diagram 1', lineStart: 2, lineEnd: 2, source: 'graph TD\n' }] }, sources: ['graph LR\n'], warning: null, locked: false, saving: null, saved: false })
  const drafts = { 'nsiod/guide.md': draft('nsiod/guide.md'), 'elsewhere/draft.md': draft('elsewhere/draft.md') }
  const result = { path: 'nsiod', query: '', kind: 'markdown' as const, complete: false, stoppedBy: 'matches' as const, visited: 4000, skipped: 0, entries: [
    { kind: 'file' as const, path: 'nsiod/mermaid/mesh-v1/notes.md', fileKind: 'markdown' as const, state: 'deferred' as const },
    { kind: 'file' as const, path: 'nsiod/guide.md', fileKind: 'markdown' as const, state: 'deferred' as const },
  ] }
  const view = (kinds: FileFilter, search: SearchView) => (
    <TooltipProvider>
      <FileTree listing={{ entries: tree.entries, firstPage: 1, lastPage: 1, loading: false, stale: false, error: null, notice: '', retryAt: 0, canNext: false, complete: true, depth: false, maxPathDepth: 64, next: vi.fn(), restart: vi.fn(), suspend: vi.fn() }} directory="nsiod" browse={vi.fn()} drafts={drafts} path="" block={0} select={select} refresh={vi.fn()} canChange onAction={vi.fn()} kinds={kinds} chooseKinds={vi.fn()} search={search} onQueryChange={vi.fn()} />
    </TooltipProvider>
  )
  const { rerender, unmount } = render(view('all', { query: '', pending: false, error: null, result: undefined }))
  expect(screen.getByRole('navigation', { name: 'Files and diagrams' })).toBeVisible()

  // A chosen file type searches below the folder with an empty box, in place of the folder listing.
  rerender(view('markdown', { query: '', pending: true, error: null, result: undefined }))
  expect(screen.queryByRole('navigation', { name: 'Files and diagrams' })).toBeNull()
  expect(screen.getByText('Searching…')).toBeVisible()
  rerender(view('markdown', { query: '', pending: false, error: null, result }))
  const rows = [...screen.getByRole('navigation', { name: 'Search results' }).querySelector('ul')!.querySelectorAll('button')].map(button => button.textContent)
  expect(rows).toEqual(['guide.md', 'mermaid/mesh-v1/notes.md'])
  expect(screen.getByText('Showing the first 200 files. Type a name or open a subfolder to see the rest.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'mermaid/mesh-v1/notes.md' }))
  expect(select).toHaveBeenCalledWith('nsiod/mermaid/mesh-v1/notes.md')
  // Unsaved drafts stay reachable beside the results, without repeating a file that already has a result row.
  const retained = screen.getAllByRole('button', { name: /draft\.md|guide\.md/ }).map(button => button.textContent)
  expect(retained).toEqual(['guide.md', 'elsewhere/draft.md'])
  expect(screen.getByText('RETAINED DRAFTS')).toBeVisible()

  // A result for another file type is never shown as this one's, and an empty result names the type.
  rerender(view('mermaid', { query: '', pending: false, error: null, result }))
  expect(screen.queryByRole('button', { name: 'guide.md' })).toBeNull()
  rerender(view('mermaid', { query: '', pending: false, error: null, result: { ...result, kind: 'mermaid' as const, complete: true, stoppedBy: null, entries: [] } }))
  expect(screen.getByText('No .mmd or .mermaid files in this folder or below')).toBeVisible()
  unmount()
})
