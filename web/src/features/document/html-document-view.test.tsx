import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { HtmlDocumentView } from './html-document-view'

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
  vi.restoreAllMocks()
  workers.length = 0
})

it('uses a module Worker and renders only the inert application vocabulary', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const open = vi.fn()
  const scroll = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll })
  render(<HtmlDocumentView path="docs/page.html" text="<h1>ignored until parsed</h1>" onOpenFile={open} />)
  expect(screen.getByText('Loading document…')).toBeVisible()
  expect(workers[0]?.args[0] as URL).not.toBeNull()
  expect((workers[0]?.args[0] as URL).pathname).toContain('html-worker.ts')
  expect(workers[0]?.args[1]).toEqual({ type: 'module' })
  expect(workers[0]?.messages).toEqual([{ id: 1, text: '<h1>ignored until parsed</h1>' }])
  workers[0]?.onmessage?.({ data: {
    id: 1,
    projection: {
      truncated: false,
      stats: { visitedNodes: 10, textCharacters: 30 },
      children: [
        { type: 'element', tag: 'h1', sourceId: 'top', children: [{ type: 'text', value: 'Safe title' }] },
        { type: 'element', tag: 'p', children: [
          { type: 'element', tag: 'a', href: '#top', children: [{ type: 'text', value: 'Top' }] },
          { type: 'element', tag: 'a', href: 'next.htm', children: [{ type: 'text', value: 'Next' }] },
          { type: 'element', tag: 'a', href: 'https://example.test/', children: [{ type: 'text', value: 'External' }] },
        ] },
        { type: 'element', tag: 'img', src: 'https://example.test/chart.png', alt: 'Chart', children: [] },
        { type: 'element', tag: 'script', children: [{ type: 'text', value: 'pwned' }] },
      ],
    },
  } } as MessageEvent)
  const heading = await screen.findByRole('heading', { name: 'Safe title' })
  expect(heading).toBeVisible()
  expect(heading).toHaveAttribute('id', 'top')
  expect(screen.queryByText('pwned')).toBeNull()
  expect(globalThis.document.querySelector('script,iframe,object,embed,form,input,button[formaction],svg,math,custom-element')).toBeNull()
  const chartImg = screen.getByRole('img', { name: 'Chart' })
  expect(chartImg).toBeVisible()
  expect(chartImg).toHaveAttribute('src', 'https://example.test/chart.png')
  const external = screen.getByRole('link', { name: 'External' })
  expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  expect(external).toHaveAttribute('referrerpolicy', 'no-referrer')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(open).toHaveBeenCalledWith('docs/next.htm')
  fireEvent.click(screen.getByRole('button', { name: 'Top' }))
  expect(scroll).toHaveBeenCalledTimes(1)
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
  expect(workers[0]?.terminated).toBe(true)
})

it('shows bounded truncation and fails closed when the Worker fails', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const view = render(<HtmlDocumentView path="page.html" text="first" onOpenFile={vi.fn()} />)
  workers[0]?.onmessage?.({ data: { id: 1, projection: { children: [], truncated: true, stats: { visitedNodes: 12000, textCharacters: 1 } } } } as MessageEvent)
  expect(await screen.findByText(/Preview truncated/)).toBeVisible()
  view.rerender(<HtmlDocumentView path="page.html" text="second" onOpenFile={vi.fn()} />)
  workers[1]?.onerror?.(new Event('error'))
  expect(await screen.findByRole('alert')).toHaveTextContent('safe HTML preview is unavailable')
  expect(screen.queryByText('second')).toBeNull()
})

it('keeps unsafe link targets as text and contains rejected project navigation', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  const open = vi.fn().mockRejectedValue(new Error('private detail'))
  render(<HtmlDocumentView path="docs/page.html" text="links" onOpenFile={open} />)
  workers[0]?.onmessage?.({ data: { id: 1, projection: { truncated: false, stats: { visitedNodes: 3, textCharacters: 10 }, children: [
    { type: 'element', tag: 'a', href: 'javascript:alert(1)', children: [{ type: 'text', value: 'Unsafe' }] },
    { type: 'element', tag: 'a', href: '../next.html', children: [{ type: 'text', value: 'Project' }] },
  ] } } } as MessageEvent)
  expect(await screen.findByText('Unsafe')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Unsafe' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Unsafe' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Project' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('That file cannot be opened')
  expect(screen.queryByText('private detail')).toBeNull()
})

it('renders void elements like hr and br without children', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  render(<HtmlDocumentView path="docs/page.html" text="<p>Before<br>Break</p><hr>" onOpenFile={vi.fn()} />)
  workers[0]?.onmessage?.({ data: {
    id: 1,
    projection: {
      truncated: false,
      stats: { visitedNodes: 5, textCharacters: 11 },
      children: [
        { type: 'element', tag: 'p', children: [
          { type: 'text', value: 'Before' },
          { type: 'element', tag: 'br', children: [] },
          { type: 'text', value: 'Break' },
        ] },
        { type: 'element', tag: 'hr', sourceId: 'divider', children: [] },
      ],
    },
  } } as MessageEvent)
  expect(await screen.findByText(/Before/)).toBeVisible()
  expect(globalThis.document.querySelector('br')).not.toBeNull()
  expect(globalThis.document.querySelector('hr#divider')).not.toBeNull()
})

it('attaches sourceId to rendered elements including container and media tags', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  render(<HtmlDocumentView path="docs/page.html" text="sample" onOpenFile={vi.fn()} />)
  workers[0]?.onmessage?.({ data: {
    id: 1,
    projection: {
      truncated: false,
      stats: { visitedNodes: 4, textCharacters: 5 },
      children: [
        { type: 'element', tag: 'div', sourceId: 'topbar', children: [{ type: 'text', value: 'Title' }] },
        { type: 'element', tag: 'video', sourceId: 'player', src: 'https://example.test/v.mp4', children: [] },
      ],
    },
  } } as MessageEvent)
  expect(await screen.findByText('Title')).toBeVisible()
  expect(globalThis.document.querySelector('div#topbar')).not.toBeNull()
  expect(globalThis.document.querySelector('video#player')).not.toBeNull()
})

it('lifts the contents list beside one body column and frames tables for scrolling', async () => {
  vi.stubGlobal('Worker', FakeWorker)
  render(<HtmlDocumentView path="docs/page.html" text="contents" onOpenFile={vi.fn()} />)
  workers[0]?.onmessage?.({ data: {
    id: 1,
    projection: {
      truncated: false,
      stats: { visitedNodes: 9, textCharacters: 20 },
      children: [
        { type: 'element', tag: 'h1', sourceId: 'alpha', children: [{ type: 'text', value: 'Alpha' }] },
        { type: 'element', tag: 'table', children: [
          { type: 'element', tag: 'tbody', children: [
            { type: 'element', tag: 'tr', children: [{ type: 'element', tag: 'td', children: [{ type: 'text', value: 'Cell' }] }] },
          ] },
        ] },
        { type: 'element', tag: 'nav', sourceId: 'toc', children: [
          { type: 'element', tag: 'ul', children: [
            { type: 'element', tag: 'li', children: [{ type: 'element', tag: 'a', href: '#alpha', children: [{ type: 'text', value: 'Alpha' }] }] },
          ] },
        ] },
      ],
    },
  } } as MessageEvent)
  const article = await screen.findByRole('article', { name: 'HTML document' })
  // Contents scroll independently outside the article; all other nodes share its body.
  expect([...article.children].map(child => child.tagName.toLowerCase())).toEqual(['div'])
  expect(article.contains(screen.getByRole('navigation'))).toBe(false)
  expect(screen.getByRole('navigation')).toHaveAttribute('id', 'toc')
  fireEvent.click(screen.getByRole('button', { name: 'Toggle contents' }))
  expect(screen.queryByRole('navigation')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Toggle contents' }))
  const body = article.querySelector('.html-document-body')
  expect(body?.querySelector('h1#alpha')).not.toBeNull()
  expect(body?.querySelector('.html-document-table > table')).not.toBeNull()
  expect(screen.getByRole('table')).toBeVisible()
  expect(screen.getAllByRole('button', { name: 'Alpha' })).toHaveLength(1)
})
