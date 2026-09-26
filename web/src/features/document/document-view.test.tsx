import type { DiagramBlock } from '../../../../src/shared/contracts'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  expect(resolveProjectLink('docs/guide.md', './page.html#section')).toBe('docs/page.html')
  expect(resolveProjectLink('docs/guide.md', '../index.htm')).toBe('index.htm')
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

it('renders deferred worker text from decoded MDAST chunks instead of raw Markdown source offsets', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const raw = `${'x'.repeat(5000)} &amp; &#x2A; \\* tail`
  const decoded = `${'x'.repeat(5000)} & * * tail`
  render(<DocumentView path="docs/escaped.md" text={raw} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  workers[0]?.onmessage?.({
    data: {
      id: 1,
      tree: {
        type: 'root',
        children: [{
          type: 'paragraph',
          children: [{ type: 'text', value: '', data: { merdeckTextChunks: [decoded.slice(0, 4096), decoded.slice(4096)] } }],
        }],
      },
    },
  } as MessageEvent)
  const article = await screen.findByRole('article', { name: 'Markdown document' })
  await waitFor(() => expect(article).toHaveTextContent(decoded))
  expect(article).not.toHaveTextContent('&amp;')
  expect(article).not.toHaveTextContent('\\* tail')
  const chunks = article.querySelectorAll('.document-text-chunk')
  expect(chunks).toHaveLength(2)
  expect([...chunks].every(chunk => chunk.parentElement?.tagName === 'P' && getComputedStyle(chunk).display === 'inline')).toBe(true)
  expect(article.querySelector('br')).toBeNull()
})

it('clears document-link errors and ignores late link failures after a path transition', async () => {
  let reject: (reason: Error) => void = () => {}
  const pending = new Promise<string>((_resolve, fail) => {
    reject = fail
  })
  const open = vi.fn(() => pending)
  const view = render(<DocumentView path="docs/a.md" text="# A\n\n[Next](next.md)" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={open} />)
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Next' }))
  view.rerender(<DocumentView path="docs/b.md" text="# B" blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={open} />)
  await screen.findByRole('heading', { name: 'B' })
  await act(async () => reject(new Error('late failure')))
  expect(screen.queryByRole('alert')).toBeNull()
  view.unmount()
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
  await screen.findAllByRole('button', { name: /Select Diagram/ })
  const figures = [...view.container.querySelectorAll<HTMLElement>('figure.document-diagram')]
  expect(renderDiagram).not.toHaveBeenCalled()
  await waitFor(() => expect(intersections).toHaveLength(2))
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
  await waitFor(() => expect(screen.getByRole('button', { name: 'Select Diagram 1' }).closest('figure')?.querySelector('svg text')).toHaveTextContent('second'))
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
  await screen.findAllByRole('button', { name: /Select Diagram/ })
  expect(scroll).not.toHaveBeenCalled()
  view.rerender(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1))
  expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  expect(globalThis.document.activeElement).toBe(focus)
  focus.remove()
  delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView
})

it('reveals an initial non-zero block and resets a newly opened document to its top once', async () => {
  const reveal = vi.fn()
  const top = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: reveal })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: function scrollTo(this: HTMLElement, options: ScrollToOptions) {
      this.scrollTop = options.top ?? this.scrollTop
      top(options)
    },
  })
  const document = markdownDocument(['first', 'second'])
  const view = render(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await screen.findAllByRole('button', { name: /Select Diagram/ })
  await waitFor(() => expect(reveal).toHaveBeenCalledWith({ block: 'nearest' }))
  view.rerender(<DocumentView path="docs/guide.md" {...document} sources={document.blocks.map(block => block.source)} selected={1} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(reveal).toHaveBeenCalledTimes(1)
  const article = screen.getByRole('article', { name: 'Markdown document' })
  article.scrollTop = 240
  view.rerender(<DocumentView path="docs/new.md" {...document} sources={document.blocks.map(block => block.source)} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await waitFor(() => expect(top).toHaveBeenCalledWith({ top: 0 }))
  expect(article.scrollTop).toBe(0)
  view.rerender(<DocumentView path="docs/new.md" {...document} sources={document.blocks.map(block => block.source)} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(top).toHaveBeenCalledTimes(1)
  delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView
  delete (HTMLElement.prototype as { scrollTo?: () => void }).scrollTo
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
  expect(link.closest('figure')).not.toHaveAttribute('role')
  expect(link.closest('figure')).not.toHaveAttribute('tabindex')
  const selection = screen.getByRole('button', { name: 'Select Diagram 1' })
  expect(selection).toHaveAttribute('aria-pressed', 'true')
  selection.focus()
  await userEvent.setup().keyboard(' ')
  expect(select).toHaveBeenCalledTimes(1)
  fireEvent.click(link)
  fireEvent.keyDown(link, { key: 'Enter' })
  expect(open).toHaveBeenCalledTimes(2)
  expect(select).toHaveBeenCalledTimes(1)
  globalThis.document.documentElement.classList.add('dark')
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledTimes(2))
  globalThis.document.documentElement.classList.remove('dark')
})

it('renders approved Markdown semantics, definitions, images, footnotes, and literal raw HTML', async () => {
  const scroll = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll })
  const text = '# Same\n\n> ## Nested\n\n# Same\n\n`inline` *em* **strong** ~~gone~~  \nnext\n\n3. third\n\n- [x] done\n\n> quote\n\n---\n\n| Left | Right |\n| :--- | ---: |\n| a | b |\n\n[ref][safe] [project][project] [bad](javascript:alert(1)) [fragment](#same%2D1) [nested](#nested)\n\n![inline](https://bad.example/a.png) ![reference][image]\n\n[^note]\n\n[safe]: https://example.test/path\n[project]: next.md\n[image]: https://bad.example/b.png\n\n[^note]: footnote text\n\n<!-- hidden --> <script>bad()</script> <img src=x onerror=bad()> </img> <iframe src=x></iframe> <span>inline html</span>'
  const open = vi.fn()
  const view = render(<DocumentView path="docs/guide.md" text={text} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={open} />)
  expect(await screen.findAllByRole('heading', { name: 'Same' })).toHaveLength(2)
  expect(screen.getByRole('code')).toHaveTextContent('inline')
  expect(screen.getByText('em').tagName).toBe('EM')
  expect(screen.getByText('strong').tagName).toBe('STRONG')
  expect(screen.getByText('gone').tagName).toBe('DEL')
  expect(screen.getByRole('article').querySelector('br')).not.toBeNull()
  expect(screen.getByRole('article').querySelector('.markdown-document-body ol')).toHaveAttribute('start', '3')
  expect(screen.getByRole('checkbox', { name: 'Completed task' })).toBeChecked()
  expect(screen.getByRole('table').querySelector('thead th')).toHaveStyle({ textAlign: 'left' })
  expect(screen.getByRole('table').querySelector('tbody td:last-child')).toHaveStyle({ textAlign: 'right' })
  const external = screen.getByRole('link', { name: 'ref' })
  expect(external).toHaveAttribute('href', 'https://example.test/path')
  expect(external).toHaveAttribute('referrerpolicy', 'no-referrer')
  fireEvent.click(screen.getByRole('button', { name: 'project' }))
  expect(open).toHaveBeenCalledWith('docs/next.md')
  expect(screen.queryByRole('link', { name: 'bad' })).toBeNull()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getAllByText(/Image:/)).toHaveLength(2)
  expect(screen.queryByText('hidden')).toBeNull()
  expect(screen.queryByRole('script')).toBeNull()
  expect(screen.queryByRole('iframe')).toBeNull()
  expect(view.container.querySelector('script, img, iframe')).toBeNull()
  expect(screen.queryByTitle('')).toBeNull()
  expect(screen.getByText('<script>bad()</script>', { exact: false })).toBeVisible()
  expect(screen.getByRole('article')).toHaveTextContent('<span>inline html</span>')
  expect(screen.getByRole('button', { name: 'Footnote 1' })).toBeVisible()
  expect(screen.getByRole('complementary', { name: 'Footnote 1' })).toHaveTextContent('footnote text')
  fireEvent.click(screen.getByRole('button', { name: 'fragment' }))
  // A heading link puts its target at the top of the view, the way the HTML preview's anchors do;
  // 'nearest' left a heading below the fold sitting at the bottom edge instead.
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
  fireEvent.click(screen.getByRole('button', { name: 'nested' }))
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
  fireEvent.click(screen.getByRole('button', { name: 'Footnote 1' }))
  expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
  expect(screen.getAllByRole('heading', { name: 'Same' }).every(heading => !heading.hasAttribute('id'))).toBe(true)
  delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView
})

it.each([
  ['https://example.test/path', 'anchor'],
  ['http://example.test/path', 'anchor'],
  ['mailto:hello@example.test', 'anchor'],
  ['next.md', 'project'],
  ['javascript:alert(1)', 'inert'],
  ['data:text/plain,hello', 'inert'],
  ['file:///secret.md', 'inert'],
  ['//example.test/path', 'inert'],
  ['/secret.md', 'inert'],
  ['#missing', 'inert'],
  ['#%GG', 'inert'],
])('applies the target policy to %s', async (target, expected) => {
  const open = vi.fn()
  render(<DocumentView path="docs/guide.md" text={`# Heading\n\n[target](${target})`} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={open} />)
  const label = await screen.findByText('target')
  if (expected === 'anchor') {
    expect(label).toHaveRole('link')
    expect(label).toHaveAttribute('target', '_blank')
    expect(label).toHaveAttribute('rel', 'noopener noreferrer')
    expect(label).toHaveAttribute('referrerpolicy', 'no-referrer')
  }
  else if (expected === 'project') {
    expect(label).toHaveRole('button')
    fireEvent.click(label)
    expect(open).toHaveBeenCalledWith('docs/next.md')
  }
  else {
    expect(label.tagName).not.toBe('A')
    expect(label.tagName).not.toBe('BUTTON')
    expect(open).not.toHaveBeenCalled()
  }
})

it('keeps malformed and missing fragments inert without taking focus', async () => {
  const focus = globalThis.document.createElement('button')
  globalThis.document.body.append(focus)
  focus.focus()
  render(<DocumentView path="docs/guide.md" text={'# Heading\n\n[good](#heading) [missing](#missing) [bad](#%GG)'} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'good' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'missing' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'bad' })).toBeNull()
  expect(globalThis.document.activeElement).toBe(focus)
  focus.remove()
})

it('uses the first reference definition and numbers repeated footnotes by first reference', async () => {
  const targets: HTMLElement[] = []
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: function scrollIntoView(this: HTMLElement) {
      targets.push(this)
    },
  })
  const view = render(<DocumentView path="docs/guide.md" text={'[first][same]\n\n[^second] then [^first] then [^second]\n\n[same]: https://first.example.test\n[same]: https://second.example.test\n\n[^first]: first definition\n[^second]: second definition'} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('link', { name: 'first' })).toHaveAttribute('href', 'https://first.example.test')
  const secondReferences = screen.getAllByRole('button', { name: 'Footnote 1' })
  expect(secondReferences).toHaveLength(2)
  expect(secondReferences[0]).toHaveTextContent('1')
  expect(screen.getByRole('button', { name: 'Footnote 2' })).toHaveTextContent('2')
  const back = screen.getByRole('button', { name: 'Back to footnote 1' })
  fireEvent.click(back)
  expect(targets.at(-1)).toBe(secondReferences[0])
  view.rerender(<DocumentView path="docs/replaced.md" text={'# Replacement\n\n[^missing]'} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  await screen.findByRole('heading', { name: 'Replacement' })
  expect(screen.queryByRole('button', { name: /Footnote/ })).toBeNull()
  const calls = targets.length
  fireEvent.click(back)
  expect(targets).toHaveLength(calls)
  delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView
})

it('places only exact top-level Mermaid fences and falls back to code on mismatch', async () => {
  const text = '\uFEFF```mermaid\r\nA\r\n```\r\n```mermaid\r\nB\r\n```\r\n\r\n| A |\r\n| - |\r\n| b |\r\n```mermaid\r\nC\r\n```\r\n\r\n[^n]: note\r\n```mermaid\r\nD\r\n```\r\n\r\n- ```mermaid\r\n  nested\r\n  ```\r\n\r\n> ```mermaid\r\n> quote\r\n> ```\r\n\r\n\t```mermaid\r\n\ttab\r\n\t```\r\n\r\n```mermaid\r\nunclosed'
  const selected: DiagramBlock[] = [
    { selector: { kind: 'markdown', id: 'md:0:1:2' }, label: 'Diagram 1', lineStart: 2, lineEnd: 2, source: 'A\r\n' },
    { selector: { kind: 'markdown', id: 'md:1:4:5' }, label: 'Diagram 2', lineStart: 5, lineEnd: 5, source: 'B\r\n' },
    { selector: { kind: 'markdown', id: 'md:2:10:11' }, label: 'Diagram 3', lineStart: 12, lineEnd: 12, source: 'C\r\n' },
    { selector: { kind: 'markdown', id: 'md:3:15:16' }, label: 'Diagram 4', lineStart: 17, lineEnd: 17, source: 'D\r\n' },
  ]
  const view = render(<DocumentView path="docs/fences.md" text={text} blocks={selected} sources={selected.map(block => block.source)} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect((await screen.findAllByRole('button', { name: /Select Diagram/ })).length).toBe(4)
  expect(screen.getByText(/nested/)).toBeVisible()
  expect(screen.getByText(/quote/)).toBeVisible()
  expect(screen.getByText(/tab/)).toBeVisible()
  expect(screen.getByText(/unclosed/)).toBeVisible()
  view.rerender(<DocumentView path="docs/fences.md" text={text} blocks={[selected[0]!, { ...selected[1]!, lineStart: 99 }]} sources={['A\r\n', 'B\r\n']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Diagram placement could not be verified')
  expect(screen.queryByRole('button', { name: /Select Diagram/ })).toBeNull()
  for (const source of ['A', 'B', 'C', 'D'])
    expect(screen.getAllByRole('code').some(code => code.textContent === source)).toBe(true)
})

it('places an empty closed top-level Mermaid fence while retaining the exact mismatch fallback', async () => {
  const empty: DiagramBlock = { selector: { kind: 'markdown', id: 'md:0:1:1' }, label: 'Diagram 1', lineStart: 2, lineEnd: 2, source: '' }
  const view = render(<DocumentView path="docs/empty.md" text={'```mermaid\n```\n'} blocks={[empty]} sources={['']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('button', { name: 'Select Diagram 1' })).toBeVisible()
  expect(screen.queryByRole('alert')).toBeNull()
  await waitFor(() => expect(renderDiagram).toHaveBeenCalledWith('', expect.any(Function)))
  view.rerender(<DocumentView path="docs/empty.md" text={'```mermaid\n```\n'} blocks={[{ ...empty, lineEnd: 3 }]} sources={['']} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Diagram placement could not be verified')
  expect(screen.queryByRole('button', { name: 'Select Diagram 1' })).toBeNull()
  expect(screen.getByRole('code')).toHaveTextContent('')
})

it('lists the document headings beside the body and scrolls to the chosen one', async () => {
  const scrollIntoView = vi.fn()
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
  const text = '# Guide\n\nIntro.\n\n## Install\n\nSteps.\n\n### Details\n\nMore.\n\n#### Skipped\n\nDeep.\n'
  render(<DocumentView path="docs/guide.md" text={text} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  const contents = await screen.findByRole('navigation', { name: 'Contents' })
  // Headings deeper than the third level would crowd the list, so they stay out of it.
  expect([...contents.querySelectorAll('button')].map(item => item.textContent)).toEqual(['Guide', 'Install', 'Details'])
  await userEvent.setup().click(screen.getByRole('button', { name: 'Install' }))
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
})

it('omits the contents list from a document with fewer than two listed headings', async () => {
  render(<DocumentView path="docs/short.md" text={'# Only\n\nBody.\n\n#### Deep\n'} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  expect(await screen.findByRole('heading', { name: 'Only' })).toBeVisible()
  expect(screen.queryByRole('navigation', { name: 'Contents' })).toBeNull()
})

it('offers a contents toggle without removing the Markdown article or its scroll position', async () => {
  render(<DocumentView path="guide.md" text={'# Guide\n\n## Install\n\nSteps.'} blocks={[]} sources={[]} selected={0} onSelect={vi.fn()} onOpenFile={vi.fn()} />)
  const article = screen.getByRole('article', { name: 'Markdown document' })
  const resetScroll = vi.fn((options: ScrollToOptions) => {
    article.scrollTop = options.top ?? article.scrollTop
  })
  Object.defineProperty(article, 'scrollTo', { configurable: true, value: resetScroll })
  const contents = await screen.findByRole('navigation', { name: 'Contents' })
  await waitFor(() => expect(resetScroll).toHaveBeenCalledWith({ top: 0 }))
  resetScroll.mockClear()
  article.scrollTop = 200
  expect(article.contains(contents)).toBe(false)
  const toggle = screen.getByRole('button', { name: 'Toggle contents' })
  expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await userEvent.setup().click(toggle)
  expect(screen.queryByRole('navigation', { name: 'Contents' })).toBeNull()
  expect(screen.getByRole('article', { name: 'Markdown document' })).toBe(article)
  expect(article.scrollTop).toBe(200)
  expect(resetScroll).not.toHaveBeenCalled()
  await userEvent.setup().click(toggle)
  expect(screen.getByRole('navigation', { name: 'Contents' })).toBeVisible()
})
