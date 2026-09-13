import type { DirectoryPage } from '../../../../src/shared/contracts'
import type { FileFilter } from './file-filter'
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
