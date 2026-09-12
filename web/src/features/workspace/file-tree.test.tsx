import type { TreeSnapshot } from '../../../../src/shared/contracts'
import type { FileFilter } from './file-filter'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { useFileFilter } from './file-filter'
import { FileTree } from './file-tree'

const tree: TreeSnapshot = {
  revision: 'a'.repeat(64),
  truncated: false,
  pollIntervalMs: 30000,
  entries: [
    { kind: 'file', path: 'welcome.mmd', fileKind: 'mermaid', state: 'available', version: 'b'.repeat(64), blocks: [] },
    { kind: 'directory', path: 'docs' },
    { kind: 'file', path: 'docs/overview.md', fileKind: 'markdown', state: 'available', version: 'c'.repeat(64), blocks: [] },
    { kind: 'directory', path: 'empty' },
  ],
}

function renderTree(kinds: FileFilter, chooseKinds = vi.fn(), snapshot: TreeSnapshot = tree) {
  const view = render(
    <TooltipProvider>
      <FileTree tree={snapshot} drafts={{}} path="" block={0} select={vi.fn()} refresh={vi.fn()} loading={false} failed={false} canChange onAction={vi.fn()} kinds={kinds} chooseKinds={chooseKinds} />
    </TooltipProvider>,
  )
  return { ...view, chooseKinds }
}

it('lists every supported file, its folders and an empty folder by default', () => {
  const { unmount } = renderTree('all')
  expect(screen.getByRole('button', { name: 'welcome.mmd' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'overview.md' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'docs' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'empty' })).toBeVisible()
  expect(screen.getByText('2 files · .mmd · .mermaid · .md')).toBeVisible()
  unmount()
})

it('lists only diagram files and their folders when diagram files are chosen', () => {
  const { unmount } = renderTree('mermaid')
  expect(screen.getByRole('button', { name: 'welcome.mmd' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'overview.md' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'docs' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'empty' })).toBeNull()
  expect(screen.getByText('1 file · .mmd · .mermaid')).toBeVisible()
  unmount()
})

it('lists Markdown files under the folders that hold them', () => {
  const { unmount } = renderTree('markdown')
  expect(screen.getByRole('button', { name: 'overview.md' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'docs' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'welcome.mmd' })).toBeNull()
  expect(screen.getByText('1 file · .md')).toBeVisible()
  unmount()
})

it('reports the chosen file types and names them when nothing is listed', async () => {
  const { chooseKinds, unmount } = renderTree('all')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: '.md files' }))
  expect(chooseKinds).toHaveBeenCalledWith('markdown')
  unmount()

  const empty = renderTree('mermaid', vi.fn(), { ...tree, entries: [tree.entries[2]!] })
  expect(screen.getByText('No .mmd or .mermaid files in this project')).toBeVisible()
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
