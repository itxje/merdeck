import type { DiagramBlock } from '../../../../src/shared/contracts'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { renderDiagram } from '@/features/preview/renderer'
import { resolveProjectLink } from './document-links'
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
const intersections: FakeIntersectionObserver[] = []
class FakeIntersectionObserver {
  observed: Element[] = []
  disconnected = false
  constructor(private callback: IntersectionObserverCallback) {
    intersections.push(this)
  }

  observe(element: Element) { this.observed.push(element) }
  unobserve(element: Element) { this.observed = this.observed.filter(item => item !== element) }
  disconnect() { this.disconnected = true }
  trigger(element: Element, isIntersecting = true) {
    this.callback([{ target: element, isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
}
function markdownDocument(sources: string[]) {
  return {
    text: '# Diagrams\n\n```mermaid\nfirst\n```\n\n```mermaid\nsecond\n```',
    blocks: sources.map((source, index) => ({ selector: { kind: 'markdown' as const, id: `md:0:${index}:1` }, label: `Diagram ${index + 1}`, lineStart: index ? 8 : 4, lineEnd: index ? 8 : 4, source })),
  }
}
afterEach(() => {
  vi.unstubAllGlobals()
  workers.length = 0
  intersections.length = 0
  vi.mocked(renderDiagram).mockReset()
  vi.mocked(renderDiagram).mockResolvedValue('<svg><text>diagram</text></svg>')
})
it('resolves only contained, valid project-document links', () => {
  expect(resolveProjectLink('docs/guide.md', './next.md')).toBe('docs/next.md')
  expect(resolveProjectLink('docs/guide.md', '../index.mmd')).toBe('index.mmd')
  expect(resolveProjectLink('docs/guide.md', '../../secret.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', '%2e%2e/secret.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', 'next%2fsecret.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', '%GG.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', '/secret.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', '//host/secret.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', 'javascript:alert(1)')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', 'data:text/plain,hello')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', 'file:///secret.md')).toBeNull()
  expect(resolveProjectLink('docs/guide.md', 'nested/diagram.mermaid#section')).toBe('docs/nested/diagram.mermaid')
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

it('renders offscreen inline diagrams only after intersection while selected diagrams take priority', async () => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  const document = markdownDocument(['first', 'second'])
  const view = render(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={-1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  const figures = await screen.findAllByRole('button', { name: /Diagram/ })
  expect(renderDiagram).not.toHaveBeenCalled()
  expect(intersections).toHaveLength(2)
  await act(async () => intersections[0]?.trigger(figures[0]!))
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledTimes(1))
  view.rerender(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledTimes(2))
  expect(intersections[1]?.disconnected).toBe(true)
  view.unmount()
  expect(intersections.every(observer => observer.disconnected)).toBe(true)
})

it('uses the asynchronous inline-render fallback when IntersectionObserver is unavailable', async () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const document = markdownDocument(['first'])
  render(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={-1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledTimes(1))
})

it('keeps a selected last valid inline diagram through a draft failure and drops obsolete completions', async () => {
  const pending: { source: string, resolve: (svg: string) => void, reject: (error: Error) => void }[] = []
  vi.mocked(renderDiagram).mockImplementation(source => new Promise((resolve, reject) => pending.push({ source, resolve, reject })))
  const first = markdownDocument(['first'])
  const view = render(<DocumentView path="docs/guide.md" {...first} sources={['first']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(pending).toHaveLength(1))
  await act(async () => pending[0]?.resolve('<svg><text>first</text></svg>'))
  expect(await screen.findByText('first')).toBeVisible()
  view.rerender(<DocumentView path="docs/guide.md" {...first} sources={['invalid']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(pending).toHaveLength(2))
  await act(async () => pending[1]?.reject(new Error('invalid draft')))
  expect(screen.getByText('first')).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Showing the last valid diagram')
  view.rerender(<DocumentView path="docs/guide.md" {...first} sources={['second']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(pending).toHaveLength(3))
  await act(async () => pending[2]?.resolve('<svg><text>second</text></svg>'))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Diagram 1' }).querySelector('svg text')).toHaveTextContent('second'))
  expect(screen.queryByText('first')).toBeNull()
})

it('ignores inline render completions after a source revision', async () => {
  const pending: { resolve: (svg: string) => void }[] = []
  vi.mocked(renderDiagram).mockImplementation(() => new Promise(resolve => pending.push({ resolve })))
  const document = markdownDocument(['first'])
  const view = render(<DocumentView path="docs/guide.md" {...document} sources={['first']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(pending).toHaveLength(1))
  view.rerender(<DocumentView path="docs/guide.md" {...document} sources={['second']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(pending).toHaveLength(2))
  await act(async () => pending[0]?.resolve('<svg><text>obsolete</text></svg>'))
  expect(screen.queryByText('obsolete')).toBeNull()
  await act(async () => pending[1]?.resolve('<svg><text>current</text></svg>'))
  expect(await screen.findByText('current')).toBeVisible()
})

it('reveals only a newly selected inline diagram without moving focus', async () => {
  const scroll = vi.fn()
  const focus = globalThis.document.createElement('button')
  globalThis.document.body.append(focus)
  focus.focus()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll })
  const document = markdownDocument(['first', 'second'])
  const view = render(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await screen.findAllByRole('button', { name: /Diagram/ })
  expect(scroll).not.toHaveBeenCalled()
  view.rerender(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1))
  expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  expect(globalThis.document.activeElement).toBe(focus)
  focus.remove()
  delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView
})

it('annotates only safe inline file links, follows them by click or keyboard, and rerenders for theme changes', async () => {
  vi.mocked(renderDiagram).mockResolvedValue('<svg><g class="node" id="diagram-1-flowchart-A-0"><text>A</text></g></svg>')
  const open = vi.fn()
  const select = vi.fn()
  const markdown = markdownDocument(['flowchart LR\nA-->B\nclick A "next.mmd"'])
  render(<DocumentView path="docs/guide.md" {...markdown} sources={markdown.blocks.map(block => block.source)} selected={0} onSelect={select} onOpenFile={vi.fn()} onOpenDiagramFile={open} />)
  const link = await screen.findByRole('link', { name: 'Open next.mmd' })
  expect(link).toHaveAttribute('data-file-link', 'next.mmd')
  expect(link.closest('a')).toBeNull()
  fireEvent.keyDown(screen.getByRole('button', { name: 'Diagram 1' }), { key: ' ' })
  expect(select).toHaveBeenCalledTimes(1)
  fireEvent.click(link)
  fireEvent.keyDown(link, { key: 'Enter' })
  expect(open).toHaveBeenCalledTimes(2)
  expect(select).toHaveBeenCalledTimes(1)
  globalThis.document.documentElement.classList.add('dark')
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledTimes(2))
  globalThis.document.documentElement.classList.remove('dark')
})
