/* eslint-disable react/dom-no-dangerously-set-innerhtml -- Mermaid SVG arrives from the existing sanitized renderer. */
import { Minus, Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'

export type ZoomMedia
  = | { kind: 'diagram', svg: string, width: number, height: number }
    | { kind: 'image', src: string, alt: string, width: number, height: number }

const minimumZoom = 0.25
const maximumZoom = 4
const dragThreshold = 4

export function DocumentMediaZoom({ media, onClose }: { media: ZoomMedia, onClose: () => void }) {
  const [zoom, setZoom] = React.useState(1)
  const [fit, setFit] = React.useState(1)
  const zoomRef = React.useRef(1)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{ pointerId: number, x: number, y: number, left: number, top: number, active: boolean } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const updateFit = React.useCallback(() => {
    const viewport = viewportRef.current
    if (viewport?.clientWidth && viewport.clientHeight)
      setFit(Math.min(viewport.clientWidth / Math.max(1, media.width), viewport.clientHeight / Math.max(1, media.height)))
  }, [media.width, media.height])
  React.useEffect(() => {
    window.addEventListener('resize', updateFit)
    return () => window.removeEventListener('resize', updateFit)
  }, [updateFit])
  const changeZoom = React.useCallback((next: number, point?: { x: number, y: number }) => {
    const viewport = viewportRef.current
    const previous = zoomRef.current
    const bounded = Math.max(minimumZoom, Math.min(maximumZoom, next))
    if (bounded === previous)
      return
    const x = point?.x ?? (viewport?.clientWidth ?? 0) / 2
    const y = point?.y ?? (viewport?.clientHeight ?? 0) / 2
    const contentX = (viewport?.scrollLeft ?? 0) + x
    const contentY = (viewport?.scrollTop ?? 0) + y
    zoomRef.current = bounded
    setZoom(bounded)
    requestAnimationFrame(() => {
      if (!viewport?.isConnected)
        return
      viewport.scrollLeft = contentX * bounded / previous - x
      viewport.scrollTop = contentY * bounded / previous - y
    })
  }, [])
  const wheel = React.useCallback((event: WheelEvent) => {
    const viewport = viewportRef.current
    if (!viewport)
      return
    event.preventDefault()
    const box = viewport.getBoundingClientRect()
    changeZoom(zoomRef.current * (event.deltaY < 0 ? 1.15 : 1 / 1.15), {
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    })
  }, [changeZoom])
  const attachViewport = React.useCallback((viewport: HTMLDivElement | null) => {
    viewportRef.current?.removeEventListener('wheel', wheel)
    viewportRef.current = viewport
    viewport?.addEventListener('wheel', wheel, { passive: false })
    updateFit()
  }, [wheel, updateFit])
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      setDragging(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open)
          onClose()
      }}
    >
      <DialogContent className="document-media-zoom" aria-describedby={undefined}>
        <div className="document-media-zoom-toolbar">
          <DialogTitle>{media.kind === 'diagram' ? 'Diagram zoom' : 'Image zoom'}</DialogTitle>
          <div className="document-media-zoom-controls">
            <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom out" disabled={zoom <= minimumZoom} onClick={() => changeZoom(zoom / 1.25)}><Minus aria-hidden="true" /></Button>
            <span aria-live="polite">
              {Math.round(zoom * 100)}
              %
            </span>
            <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom in" disabled={zoom >= maximumZoom} onClick={() => changeZoom(zoom * 1.25)}><Plus aria-hidden="true" /></Button>
          </div>
        </div>
        <div
          ref={attachViewport}
          className="document-media-zoom-viewport"
          aria-label="Zoomed media"
          data-pan={dragging ? 'active' : 'ready'}
          onPointerDown={(event) => {
            const viewport = event.currentTarget
            const bounds = viewport.getBoundingClientRect()
            if (event.button !== 0 || event.pointerType === 'touch' || event.clientX - bounds.left >= viewport.clientWidth || event.clientY - bounds.top >= viewport.clientHeight)
              return
            dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, active: false }
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId)
              return
            if (!drag.active) {
              if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < dragThreshold)
                return
              drag.active = true
              event.currentTarget.setPointerCapture(event.pointerId)
              setDragging(true)
            }
            event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x)
            event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y)
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onDragStart={event => event.preventDefault()}
        >
          <div className="document-media-zoom-media" style={{ width: `${Math.max(1, media.width) * fit * zoom}px`, height: `${Math.max(1, media.height) * fit * zoom}px` }}>
            {media.kind === 'diagram'
              ? <div dangerouslySetInnerHTML={{ __html: media.svg }} />
              : <img src={media.src} alt={media.alt} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
