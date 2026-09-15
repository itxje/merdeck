import type { DiagramBlock } from '../../../../src/shared/contracts'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentView } from './document-view'

vi.mock('@/features/preview/renderer', () => ({ renderDiagram: vi.fn().mockResolvedValue('<svg><text>diagram</text></svg>') }))
const blocks: DiagramBlock[] = [{ selector: { kind: 'markdown', id: 'md:0:20:30' }, label: 'Diagram 1', lineStart: 8, lineEnd: 9, source: 'flowchart LR\nA-->B' }]
const workers: FakeWorker[] = []
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  terminated = false
  messages: unknown[] = []
  args: unknown[]
  constructor(...args: unknown[]) {
    this.args = args
    workers.push(this)
  }

  postMessage(message: unknown) { this.messages.push(message) }
  terminate() { this.terminated = true }
}
afterEach(() => {
  vi.unstubAllGlobals()
  workers.length = 0
})
it('renders safe Markdown as React elements and places matching diagrams', async () => {
  const open = vi.fn()
  const select = vi.fn()
  render(<DocumentView path="docs/guide.md" text={'# Title\n\n<script>alert(1)</script>\n\n![remote](https://bad.example/i.png)\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n[Next](next.md)'} blocks={blocks} sources={blocks.map(block => block.source)} selected={0} onSelect={select} onOpenFile={open} />)
  expect(await screen.findByRole('heading', { name: 'Title' })).toBeVisible()
  expect(screen.queryByRole('script')).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText(/Image:\s*remote/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(open).toHaveBeenCalledWith('docs/next.md')
  await waitFor(() => expect(screen.getByText('diagram')).toBeVisible())
})

it('keeps unsafe targets inert, supports GFM prose, and visibly falls back on fence mismatch', async () => {
  render(<DocumentView path="docs/guide.md" text={'---\ntitle: ignored\n---\n\n- [x] task\n\n| A | B |\n| :- | -: |\n| 1 | 2 |\n\n[bad](javascript:alert(1)) [root](/secret.md) [mail](mailto:hello@example.test)\n\n```mermaid\nA-->B\n```'} blocks={[{ ...blocks[0]!, lineStart: 1, lineEnd: 1 }]} sources={['A-->B']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('checkbox')).toBeChecked()
  expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.queryByRole('link', { name: 'bad' })).toBeNull()
  expect(screen.getByRole('alert')).toHaveTextContent('placement could not be verified')
  expect(screen.getByText('A-->B')).toBeVisible()
})

it('uses a module worker, ignores stale revisions, and falls back once on worker errors', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const { rerender } = render(<DocumentView path="docs/a.md" text="# First" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(screen.getByText('Loading document…')).toBeVisible()
  expect(workers[0]?.args[0]).toBeInstanceOf(URL)
  expect((workers[0]?.args[0] as URL).pathname).toContain('markdown-worker.ts')
  expect(workers[0]?.args[1]).toEqual({ type: 'module' })
  expect(workers[0]?.messages).toEqual([{ id: 1, text: '# First' }])
  rerender(<DocumentView path="docs/a.md" text="# Second" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(workers[0]?.terminated).toBe(true)
  workers[0]?.onmessage?.({ data: { id: 1, tree: { children: [{ type: 'heading', depth: 1, children: [{ type: 'text', value: 'stale' }] }] } } } as MessageEvent)
  workers[1]?.onmessage?.({ data: { id: 1, tree: { children: [{ type: 'heading', depth: 1, children: [{ type: 'text', value: 'Second' }] }] } } } as MessageEvent)
  expect(await screen.findByRole('heading', { name: 'Second' })).toBeVisible()
  expect(workers[1]?.terminated).toBe(true)
  workers[1]?.onerror?.(new Event('error'))
  expect(screen.getByRole('heading', { name: 'Second' })).toBeVisible()
})

it('falls back when Worker construction or posting fails and when Worker is unavailable', async () => {
  class BrokenWorker extends FakeWorker {
    postMessage() {
      throw new Error('post failed')
    }
  }
  vi.stubGlobal('Worker', BrokenWorker)
  const view = render(<DocumentView path="docs/a.md" text="# Fallback" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await view.findByRole('heading', { name: 'Fallback' })).toBeVisible()
  vi.unstubAllGlobals()
  view.rerender(<DocumentView path="docs/a.md" text="# Native fallback" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading document…')
  expect(await view.findByRole('heading', { name: 'Native fallback' })).toBeVisible()
})

it('falls back once when a worker runtime error fires before a response', async () => {
  const queued: (() => void)[] = []
  vi.stubGlobal('queueMicrotask', (callback: () => void) => queued.push(callback))
  vi.stubGlobal('Worker', FakeWorker)
  render(<DocumentView path="docs/a.md" text="# Error fallback" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  workers[0]?.onerror?.(new Event('error'))
  workers[0]?.onerror?.(new Event('error'))
  expect(queued).toHaveLength(1)
  queued[0]!()
  expect(await screen.findByRole('heading', { name: 'Error fallback' })).toBeVisible()
  expect(workers[0]?.terminated).toBe(true)
})

it('falls back when the worker reports a parse error', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  render(<DocumentView path="docs/a.md" text="# Reported fallback" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  workers[0]?.onmessage?.({ data: { id: 1, error: 'worker failed' } } as MessageEvent)
  expect(await screen.findByRole('heading', { name: 'Reported fallback' })).toBeVisible()
  expect(workers[0]?.terminated).toBe(true)
})

it('falls back when worker construction throws', async () => {
  vi.stubGlobal('Worker', class {
    constructor() {
      throw new Error('constructor failed')
    }
  })
  render(<DocumentView path="docs/a.md" text="# Constructor fallback" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: 'Constructor fallback' })).toBeVisible()
})
