import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DocumentMediaZoom } from './document-media-zoom'

it.each([
  [{ kind: 'diagram', svg: '<svg><text>diagram</text></svg>', width: 1200, height: 800 } as const, 'Diagram zoom'],
  [{ kind: 'image', src: 'data:image/png;base64,aGVsbG8=', alt: 'Chart', width: 1200, height: 800 } as const, 'Image zoom'],
])('pans zoomed %s with a mouse drag and ends on cancellation', (media, title) => {
  render(<DocumentMediaZoom media={media} onClose={vi.fn()} />)
  const viewport = screen.getByRole('dialog', { name: title }).querySelector<HTMLElement>('.document-media-zoom-viewport')!
  Object.defineProperties(viewport, { clientWidth: { value: 600 }, clientHeight: { value: 400 } })
  viewport.scrollLeft = 100
  viewport.scrollTop = 80
  const capture = vi.fn()
  viewport.setPointerCapture = capture

  fireEvent.pointerDown(viewport, { pointerId: 7, pointerType: 'mouse', button: 0, clientX: 200, clientY: 180 })
  fireEvent.pointerMove(viewport, { pointerId: 7, pointerType: 'mouse', clientX: 150, clientY: 140 })
  expect(capture).toHaveBeenCalledWith(7)
  expect(viewport.scrollLeft).toBe(150)
  expect(viewport.scrollTop).toBe(120)

  fireEvent.pointerCancel(viewport, { pointerId: 7, pointerType: 'mouse' })
  fireEvent.pointerMove(viewport, { pointerId: 7, pointerType: 'mouse', clientX: 100, clientY: 100 })
  expect(viewport.scrollLeft).toBe(150)
  expect(viewport.scrollTop).toBe(120)
})
