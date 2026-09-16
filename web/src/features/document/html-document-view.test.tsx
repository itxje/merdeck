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
  expect(screen.getByText(/scripts, styles, forms, media and external resources/)).toBeVisible()
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
        { type: 'placeholder', kind: 'image', label: 'Chart' },
        { type: 'element', tag: 'script', children: [{ type: 'text', value: 'pwned' }] },
      ],
    },
  } } as MessageEvent)
  expect(await screen.findByRole('heading', { name: 'Safe title' })).toBeVisible()
  expect(screen.queryByText('pwned')).toBeNull()
  expect(globalThis.document.querySelector('script,style,img,iframe,object,embed,form,input,button[formaction],svg,math,custom-element')).toBeNull()
  expect(screen.getByText('Image: Chart')).toBeVisible()
  const external = screen.getByRole('link', { name: 'External' })
  expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  expect(external).toHaveAttribute('referrerpolicy', 'no-referrer')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(open).toHaveBeenCalledWith('docs/next.htm')
  fireEvent.click(screen.getByRole('button', { name: 'Top' }))
  expect(scroll).toHaveBeenCalledTimes(1)
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
