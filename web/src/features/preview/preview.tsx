/* eslint-disable react/dom-no-dangerously-set-innerhtml -- Only renderer.ts sanitized SVG enters this preview boundary. */
import type { LabelSite } from './flowchart-labels'
import { Maximize, Minus, Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { sourceOnlyLabelMessage } from './flowchart-labels'
import { editFlowchartLabel, inspectFlowchart, renderDiagram } from './renderer'
import { bareLabelBreak, flowchartHeader } from './source-policy'

const minZoom = 0.25
const maxZoom = 3
// Pointer travel below this distance stays a click, so nodes remain selectable on a pannable canvas.
const dragThreshold = 4

interface LabelEditor { source: string, site: LabelSite, initial: string, value: string, x: number, y: number, width: number, height: number, pending: boolean, error: string }
interface PreviewProps {
  source: string
  title: string
  onError: (error: string) => void
  onSourceChange?: (source: string) => void
  onLocate?: (range: { start: number, end: number }) => void
}

export function Preview({ source, title, onError, onSourceChange, onLocate }: PreviewProps) {
  const [svg, setSvg] = React.useState('')
  const markup = React.useMemo(() => ({ __html: svg }), [svg])
  const [error, setError] = React.useState('')
  const [rendering, setRendering] = React.useState(true)
  const [settledSource, setSettledSource] = React.useState('')
  const [themeRevision, setThemeRevision] = React.useState(0)
  const [settledThemeRevision, setSettledThemeRevision] = React.useState(-1)
  const [zoom, setZoom] = React.useState<number | null>(null)
  const [fit, setFit] = React.useState(1)
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const graphicRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState({ width: 600, height: 520 })
  const scaleRef = React.useRef(1)
  const anchorRef = React.useRef<{ x: number, y: number, pointerX: number, pointerY: number } | null>(null)
  const dragRef = React.useRef<{ pointerId: number, x: number, y: number, left: number, top: number, active: boolean } | null>(null)
  const draggedRef = React.useRef(false)
  const [dragging, setDragging] = React.useState(false)
  const [labels, setLabels] = React.useState<{ source: string, sites: Map<string, LabelSite> } | null>(null)
  const [editor, setEditor] = React.useState<LabelEditor | null>(null)
  const [note, setNote] = React.useState<{ source: string, text: string } | null>(null)
  const editorRef = React.useRef<HTMLTextAreaElement>(null)
  const cancelRef = React.useRef(false)
  const liveSourceRef = React.useRef<string | null>(source)

  React.useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision(value => value + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setRendering(true)
      void (async () => {
        if (cancelled)
          return
        try {
          const result = source.trim() ? await renderDiagram(source, () => !cancelled) : ''
          if (!cancelled && result !== null) {
            setSvg(result)
            setError('')
            onError('')
          }
        }
        catch (cause) {
          if (!cancelled) {
            const message = cause instanceof Error ? cause.message : 'Check the diagram syntax.'
            setError(message)
            onError(message)
          }
        }
        finally {
          if (!cancelled) {
            setSettledSource(source)
            setSettledThemeRevision(themeRevision)
            setRendering(false)
          }
        }
      })()
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source, themeRevision, onError])

  React.useLayoutEffect(() => {
    const node = graphicRef.current?.querySelector('svg')
    const host = surfaceRef.current
    if (!node || !host)
      return
    const content = node.getBBox()
    if (content.width > 0 && content.height > 0)
      node.setAttribute('viewBox', `${content.x - 16} ${content.y - 16} ${content.width + 32} ${content.height + 32}`)
    const box = node.viewBox.baseVal
    const width = box.width || 600
    const height = box.height || 520
    // eslint-disable-next-line react/set-state-in-effect -- SVG geometry must be measured after its sanitized DOM is mounted.
    setDimensions({ width, height })
    // eslint-disable-next-line react/set-state-in-effect -- Recompute fit after layout and whenever the viewport changes.
    const resize = () => setFit(Math.min(1.35, Math.max(0.01, Math.min((host.clientWidth - 64) / width, (host.clientHeight - 118) / height))))
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    return () => observer.disconnect()
  }, [svg])

  const scale = zoom ?? fit
  const settled = !!svg && !error && !rendering && settledSource === source && settledThemeRevision === themeRevision
  const labelEditing = !!onSourceChange && flowchartHeader.test(source)
  const sites = labels?.source === source ? labels.sites : null
  const activeEditor = editor?.source === source ? editor : null
  const activeNote = note?.source === source ? note.text : ''
  const editorOpen = !!activeEditor

  React.useLayoutEffect(() => {
    scaleRef.current = scale
    const anchor = anchorRef.current
    const surface = surfaceRef.current
    const space = graphicRef.current?.parentElement
    anchorRef.current = null
    if (!anchor || !surface || !space)
      return
    // Keep the diagram point that was under the pointer in place after a wheel zoom.
    surface.scrollLeft = space.offsetLeft + 32 + anchor.x * scale - anchor.pointerX
    surface.scrollTop = space.offsetTop + 32 + anchor.y * scale - anchor.pointerY
  }, [scale])

  React.useEffect(() => {
    const surface = surfaceRef.current
    if (!surface)
      return
    // React registers wheel handlers as passive, so only a native listener can stop the canvas scrolling while zooming.
    const zoomAtPointer = (event: WheelEvent) => {
      const space = graphicRef.current?.parentElement
      if (!space || event.deltaY === 0 || (event.target instanceof Element && event.target.closest('.label-editor')))
        return
      event.preventDefault()
      const current = scaleRef.current
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? surface.clientHeight : 1
      // Stay within the button bounds without jumping when a small fit already sits outside them.
      const next = Math.min(Math.max(maxZoom, current), Math.max(Math.min(minZoom, current), current * Math.exp(-event.deltaY * unit * 0.002)))
      if (next === current)
        return
      const bounds = surface.getBoundingClientRect()
      const pointerX = event.clientX - bounds.left
      const pointerY = event.clientY - bounds.top
      anchorRef.current = { x: (surface.scrollLeft + pointerX - space.offsetLeft - 32) / current, y: (surface.scrollTop + pointerY - space.offsetTop - 32) / current, pointerX, pointerY }
      setZoom(next)
    }
    surface.addEventListener('wheel', zoomAtPointer, { passive: false })
    return () => surface.removeEventListener('wheel', zoomAtPointer)
  }, [])

  // Updated during commit, so a label edit that resolves after the draft changed or the preview unmounted is dropped.
  React.useLayoutEffect(() => {
    liveSourceRef.current = source
    return () => {
      liveSourceRef.current = null
    }
  }, [source])

  React.useEffect(() => {
    if (!labelEditing || !settled)
      return
    let cancelled = false
    // A failed inspection leaves every label source-only instead of reporting a preview that never finishes updating.
    void inspectFlowchart(source, () => !cancelled).then((next) => {
      if (!cancelled)
        setLabels({ source, sites: next ?? new Map() })
    }, () => {
      if (!cancelled)
        setLabels({ source, sites: new Map() })
    })
    return () => {
      cancelled = true
    }
  }, [labelEditing, settled, source])

  React.useEffect(() => {
    if (!editorOpen)
      return
    editorRef.current?.focus()
    editorRef.current?.select()
  }, [editorOpen])

  const nodeAt = (target: EventTarget) => {
    const node = target instanceof Element ? target.closest('g.node') : null
    return node && graphicRef.current?.contains(node) ? node : null
  }
  const insideEditor = (target: EventTarget) => target instanceof Element && !!target.closest('.label-editor')
  const siteOf = (node: Element) => settled ? sites?.get(node.id.replace(/^diagram-\d+-/, '')) : undefined

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId)
      return
    // A drag must not also select the node it started on.
    draggedRef.current = dragRef.current.active
    dragRef.current = null
    setDragging(false)
  }

  const commit = () => {
    const current = activeEditor
    if (!current || current.pending || !onSourceChange)
      return
    if (current.value === current.initial) {
      setEditor(null)
      return
    }
    setEditor({ ...current, pending: true, error: '' })
    void editFlowchartLabel(current.source, current.site.nodeId, current.value).then((next) => {
      setEditor(null)
      if (liveSourceRef.current === current.source)
        onSourceChange(next)
    }, (cause: unknown) => {
      setEditor(value => value?.source === current.source ? { ...value, pending: false, error: cause instanceof Error ? cause.message : 'This label could not be changed.' } : value)
    })
  }

  const editNode = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = onSourceChange && !insideEditor(event.target) ? nodeAt(event.target) : null
    const graphic = graphicRef.current
    if (!node || !graphic)
      return
    const site = siteOf(node)
    if (!labelEditing || !site?.editable) {
      let text = sourceOnlyLabelMessage
      if (!labelEditing)
        text = 'Only flowchart node labels can be edited on the diagram.'
      else if (error)
        text = 'Fix the source before editing on the diagram.'
      else if (!settled || !sites)
        text = 'The preview is still updating. Try again in a moment.'
      setNote({ source, text })
      return
    }
    const bounds = graphic.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    const initial = site.text.trim().replace(bareLabelBreak, '\n')
    cancelRef.current = false
    setNote(null)
    setEditor({ source, site, initial, value: initial, x: (box.left - bounds.left) / scale, y: (box.top - bounds.top) / scale, width: box.width / scale, height: box.height / scale, pending: false, error: '' })
  }

  return (
    <section className="preview-pane" aria-label="Diagram preview">
      <div className="pane-heading">
        <span>Preview</span>
        <span className="muted text-xs" role="status">{rendering || settledSource !== source || settledThemeRevision !== themeRevision ? 'Rendering…' : error ? (svg ? 'Last valid preview' : 'Preview unavailable') : source.trim() ? 'Live preview' : 'Empty source'}</span>
      </div>
      {error && (
        <div className="preview-warning" role="alert">
          <strong>Unable to render</strong>
          <span>{svg ? 'Showing the last valid diagram. Fix the source to update.' : 'Check the source to see a diagram.'}</span>
        </div>
      )}
      {activeNote && <div className="preview-note" role="status">{activeNote}</div>}
      <div
        ref={surfaceRef}
        className="preview-surface"
        role="region"
        tabIndex={0}
        aria-label="Scrollable diagram canvas"
        data-pan={svg ? (dragging ? 'active' : 'ready') : undefined}
        data-editable={labelEditing ? (settled && sites ? 'ready' : 'pending') : undefined}
        onPointerDown={(event) => {
          draggedRef.current = false
          if (note)
            setNote(null)
          const surface = event.currentTarget
          const bounds = surface.getBoundingClientRect()
          // Touch keeps native scrolling, and presses on the scrollbars or the label editor keep their own behaviour.
          if (!svg || insideEditor(event.target) || event.button !== 0 || event.pointerType === 'touch' || event.clientX - bounds.left >= surface.clientWidth || event.clientY - bounds.top >= surface.clientHeight)
            return
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: surface.scrollLeft, top: surface.scrollTop, active: false }
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
        onClick={(event) => {
          if (draggedRef.current) {
            draggedRef.current = false
            return
          }
          const node = onLocate && event.detail < 2 ? nodeAt(event.target) : null
          const site = node && siteOf(node)
          if (site)
            onLocate?.({ start: site.start, end: site.end })
        }}
        onDoubleClick={editNode}
      >
        {svg
          ? (
              <div className="diagram-space" style={{ width: dimensions.width * scale + 64, height: dimensions.height * scale + 64 }}>
                <div ref={graphicRef} className="diagram-graphic" role="img" aria-label={title} style={{ width: dimensions.width, height: dimensions.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={markup} />
                {activeEditor && (
                  <div className="label-editor" style={{ left: 32 + activeEditor.x * scale, top: 32 + activeEditor.y * scale, width: Math.max(180, activeEditor.width * scale) }}>
                    <Textarea
                      ref={editorRef}
                      aria-label="Node label"
                      aria-invalid={!!activeEditor.error}
                      aria-describedby={activeEditor.error ? 'label-editor-error' : undefined}
                      readOnly={activeEditor.pending}
                      rows={1}
                      spellCheck={false}
                      style={{ minHeight: Math.max(36, activeEditor.height * scale) }}
                      value={activeEditor.value}
                      onChange={event => setEditor({ ...activeEditor, value: event.target.value, error: '' })}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelRef.current = true
                          setEditor(null)
                          surfaceRef.current?.focus({ preventScroll: true })
                        }
                        else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault()
                          commit()
                        }
                      }}
                      onBlur={() => {
                        if (cancelRef.current)
                          cancelRef.current = false
                        else if (activeEditor.error)
                          setEditor(null)
                        else
                          commit()
                      }}
                    />
                    {activeEditor.error && <p id="label-editor-error" role="alert">{activeEditor.error}</p>}
                  </div>
                )}
              </div>
            )
          : <div className="empty-state muted">{rendering ? 'Rendering your diagram…' : source.trim() ? 'No valid preview yet' : 'Add Mermaid source to see your diagram'}</div>}
      </div>
      <div className="preview-controls" aria-label="Preview navigation">
        <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={scale <= minZoom} onClick={() => setZoom(Math.max(minZoom, scale - 0.2))}><Minus /></Button>
        <output aria-label="Zoom level">
          {Math.round(scale * 100)}
          %
        </output>
        <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={scale >= maxZoom} onClick={() => setZoom(Math.min(maxZoom, scale + 0.2))}><Plus /></Button>
        <span className="control-divider" />
        <Button
          variant="ghost"
          onClick={() => {
            setZoom(null)
            surfaceRef.current?.scrollTo({ top: 0, left: 0 })
          }}
        >
          <Maximize />
          Fit
        </Button>
      </div>
      <div className="pane-footer">
        <span>{title}</span>
        <span>
          Drag to pan, scroll to zoom
          {labelEditing && <span className="desktop-only">, double-click a node to edit</span>}
        </span>
      </div>
    </section>
  )
}
