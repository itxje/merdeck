import DOMPurify from 'dompurify'
import { Maximize, Minus, Plus } from 'lucide-react'
import mermaid from 'mermaid'
import * as React from 'react'
import { Button } from '../../web/src/shared/components/ui/button'

let sequence = 0
let renderQueue: Promise<unknown> = Promise.resolve()

function tokenHex(name: string) {
  const context = document.createElement('canvas').getContext('2d')
  if (!context)
    throw new Error('Color conversion is unavailable')
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  context.fillRect(0, 0, 1, 1)
  return `#${Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`
}

async function renderSource(source: string) {
  if (source.length > 16000)
    throw new Error('This preview supports up to 16,000 source characters.')
  if (/%%\{|^\s*---|https?:|\bclick\s|<|@\{|\$\$/im.test(source))
    throw new Error('Use plain Mermaid syntax. Directives, links, HTML and external resources are disabled.')
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    htmlLabels: false,
    suppressErrorRendering: true,
    theme: 'base',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    flowchart: { curve: 'basis', padding: 16, nodeSpacing: 30, rankSpacing: 40 },
    themeVariables: {
      fontSize: '14px',
      primaryColor: tokenHex('--muted'),
      primaryTextColor: tokenHex('--foreground'),
      primaryBorderColor: tokenHex('--ring'),
      lineColor: tokenHex('--muted-foreground'),
      secondaryColor: tokenHex('--card'),
      tertiaryColor: tokenHex('--background'),
      background: tokenHex('--background'),
    },
  })
  await mermaid.parse(source)
  const { svg } = await mermaid.render(`diagram-${++sequence}`, source)
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ['a', 'foreignObject', 'image', 'script'], FORBID_ATTR: ['href', 'xlink:href'] })
}

export function Preview({ source, title, onError }: { source: string, title: string, onError: (error: string) => void }) {
  const [svg, setSvg] = React.useState('')
  const markup = React.useMemo(() => ({ __html: svg }), [svg])
  const [error, setError] = React.useState('')
  const [rendering, setRendering] = React.useState(true)
  const [settledSource, setSettledSource] = React.useState('')
  const [themeRevision, setThemeRevision] = React.useState(0)
  const [settledThemeRevision, setSettledThemeRevision] = React.useState(-1)
  const [zoom, setZoom] = React.useState<number | null>(null)
  const [fit, setFit] = React.useState(1)
  const surface = React.useRef<HTMLDivElement>(null)
  const graphic = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState({ width: 600, height: 520 })

  React.useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision(value => value + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      setRendering(true)
      renderQueue = renderQueue.then(async () => {
        if (cancelled)
          return
        try {
          const result = await renderSource(source)
          if (!cancelled) {
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
      })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source, themeRevision, onError])

  React.useLayoutEffect(() => {
    const node = graphic.current?.querySelector('svg')
    const host = surface.current
    if (!node || !host)
      return
    const content = node.getBBox()
    if (content.width > 0 && content.height > 0)
      node.setAttribute('viewBox', `${content.x - 16} ${content.y - 16} ${content.width + 32} ${content.height + 32}`)
    const box = node.viewBox.baseVal
    const width = box.width || 600
    const height = box.height || 520
    setDimensions({ width, height })
    const resize = () => setFit(Math.min(1.35, Math.max(0.1, Math.min((host.clientWidth - 64) / width, (host.clientHeight - 118) / height))))
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    return () => observer.disconnect()
  }, [svg])

  const scale = zoom ?? fit
  return (
    <section className="preview-pane" aria-label="Diagram preview">
      <div className="pane-heading">
        <span>Preview</span>
        <span className="muted text-xs" role="status">{rendering || settledSource !== source || settledThemeRevision !== themeRevision ? 'Rendering…' : error ? 'Last valid preview' : 'Live preview'}</span>
      </div>
      {error && (
        <div className="preview-warning" role="alert">
          <strong>Unable to render</strong>
          <span>{svg ? 'Showing the last valid diagram. Fix the source to update.' : 'Check the source to see a diagram.'}</span>
        </div>
      )}
      <div ref={surface} className="preview-surface" tabIndex={0} aria-label="Scrollable diagram canvas">
        {svg
          ? <div className="diagram-space" style={{ width: dimensions.width * scale + 64, height: dimensions.height * scale + 64 }}><div ref={graphic} className="diagram-graphic" role="img" aria-label={title} style={{ width: dimensions.width, height: dimensions.height, transform: `scale(${scale})` }} dangerouslySetInnerHTML={markup} /></div>
          : <div className="empty-state muted">{rendering ? 'Rendering your diagram…' : 'No valid preview yet'}</div>}
      </div>
      <div className="preview-controls" aria-label="Preview navigation">
        <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={scale <= 0.25} onClick={() => setZoom(Math.max(0.25, scale - 0.2))}><Minus /></Button>
        <output aria-label="Zoom level">
          {Math.round(scale * 100)}
          %
        </output>
        <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={scale >= 3} onClick={() => setZoom(Math.min(3, scale + 0.2))}><Plus /></Button>
        <span className="control-divider" />
        <Button
          variant="ghost"
          onClick={() => {
            setZoom(null)
            surface.current?.scrollTo({ top: 0, left: 0 })
          }}
        >
          <Maximize />
          Fit
        </Button>
      </div>
      <div className="pane-footer">
        <span>{title}</span>
        <span>Scroll to pan</span>
      </div>
    </section>
  )
}
