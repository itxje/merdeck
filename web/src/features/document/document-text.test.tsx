import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DocumentText } from './document-text'

afterEach(() => vi.unstubAllGlobals())

it('restarts progressive materialization when a same-sized chunk set replaces the document', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const first = Array.from({ length: 16 }, () => 'a'.repeat(4096))
  const second = Array.from({ length: 16 }, () => 'b'.repeat(4096))
  const view = render(<DocumentText value="" chunks={first} />)
  expect(view.container.textContent).toHaveLength(8 * 4096)
  act(() => frames.shift()?.(0))
  expect(view.container.textContent).toHaveLength(16 * 4096)
  expect(view.container.querySelector('[data-document-text-complete]')).not.toBeNull()

  view.rerender(<DocumentText value="" chunks={second} />)
  expect(view.container.textContent).toBe('b'.repeat(8 * 4096))
  expect(view.container.querySelector('[data-document-text-complete]')).toBeNull()
})
