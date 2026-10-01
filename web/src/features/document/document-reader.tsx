import { MenuIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'

const contentsWidthKey = 'merdeck.document-contents-width'
const defaultContentsWidth = 240
const minimumContentsWidth = 180
const emptyTargets: readonly string[] = []

function storedContentsWidth(): number {
  try {
    const value = Number(localStorage.getItem(contentsWidthKey))
    return Number.isFinite(value) && value >= minimumContentsWidth ? value : defaultContentsWidth
  }
  catch {
    return defaultContentsWidth
  }
}

export function DocumentReader({ path, contents, contentsTargets = emptyTargets, children }: { path: string, contents?: ((current: string | null) => React.ReactNode) | undefined, contentsTargets?: readonly string[], children: React.ReactNode }) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const pageRef = React.useRef<HTMLDivElement>(null)
  const drawerContentsRef = React.useRef<HTMLDivElement>(null)
  const [currentSection, setCurrentSection] = React.useState<string | null>(null)
  const [narrow, setNarrow] = React.useState(() => window.matchMedia?.('(max-width: 900px)').matches ?? false)
  const [frameWidth, setFrameWidth] = React.useState(0)
  const [preferredContentsWidth, setPreferredContentsWidth] = React.useState(storedContentsWidth)
  const [collapsed, setCollapsed] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const contentsId = React.useId()
  const revealCurrentContents = React.useCallback(() => {
    drawerContentsRef.current?.querySelector<HTMLElement>('[aria-current="location"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [])
  React.useLayoutEffect(() => {
    const article = pageRef.current?.querySelector<HTMLElement>('article')
    if (!article)
      return
    const targets = new Set(contentsTargets)
    const targetId = (element: HTMLElement) => element.dataset.documentSection ?? element.id
    const headings = [...article.querySelectorAll<HTMLElement>('[data-document-section], [id]')].filter(element => targets.has(targetId(element)))
    let frame = 0
    const update = () => {
      frame = 0
      const top = article.getBoundingClientRect().top + Number.parseFloat(getComputedStyle(article).paddingTop || '0')
      const positions = headings
        .filter(heading => heading.getClientRects().length > 0)
        .map(heading => ({ id: targetId(heading), top: heading.getBoundingClientRect().top }))
        .sort((left, right) => left.top - right.top)
      let current = positions[0]?.id ?? null
      for (const heading of positions) {
        if (heading.top > top)
          break
        current = heading.id
      }
      const last = positions.at(-1)
      if (last && article.scrollTop > 0 && Math.ceil(article.scrollTop + article.clientHeight) >= article.scrollHeight)
        current = last.id
      setCurrentSection(current)
    }
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(update)
    }
    update()
    article.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const body = article.firstElementChild
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
    if (body)
      observer?.observe(body)
    return () => {
      cancelAnimationFrame(frame)
      article.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [path, children, contentsTargets])
  React.useLayoutEffect(() => {
    if (drawerOpen)
      revealCurrentContents()
  }, [drawerOpen, currentSection, revealCurrentContents])
  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined')
      return
    // Measure the reader pane, since a desktop editor can leave less room than a phone layout.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry)
        return
      const next = entry.contentRect.width < 760
      setFrameWidth(entry.contentRect.width)
      setNarrow(next)
      if (!next)
        setDrawerOpen(false)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])
  const maximumContentsWidth = frameWidth ? Math.min(520, Math.max(minimumContentsWidth, frameWidth - 326)) : 520
  const contentsWidth = Math.min(maximumContentsWidth, Math.max(minimumContentsWidth, preferredContentsWidth))
  const resizeContents = React.useCallback((next: number) => {
    const bounded = Math.min(maximumContentsWidth, Math.max(minimumContentsWidth, Math.round(next)))
    setPreferredContentsWidth(bounded)
    try {
      localStorage.setItem(contentsWidthKey, String(bounded))
    }
    catch { /* The chosen width still applies when browser storage is unavailable. */ }
  }, [maximumContentsWidth])
  const dragContents = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0)
      return
    event.preventDefault()
    const handle = event.currentTarget
    const origin = event.clientX
    const start = contentsWidth
    handle.setPointerCapture(event.pointerId)
    const move = (moved: PointerEvent) => resizeContents(start + moved.clientX - origin)
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }, [contentsWidth, resizeContents])
  const hasContents = !!contents
  const railVisible = hasContents && !narrow && !collapsed
  const label = path.split('/').pop() ?? path
  return (
    <Dialog
      open={narrow && drawerOpen}
      onOpenChange={setDrawerOpen}
      onOpenChangeComplete={(open) => {
        if (open)
          revealCurrentContents()
      }}
    >
      <div ref={frameRef} className="document-reader" data-contents={railVisible ? 'visible' : 'hidden'} style={{ '--contents-width': `${contentsWidth}px` } as React.CSSProperties}>
        <div className="document-reader-toolbar">
          {hasContents && (narrow
            ? (
                <DialogTrigger render={<Button variant="ghost" className="document-contents-toggle" aria-label="Open contents" />}>
                  <MenuIcon aria-hidden="true" />
                  <span>Contents</span>
                </DialogTrigger>
              )
            : (
                <Button variant="ghost" className="document-contents-toggle" aria-label="Toggle contents" aria-expanded={!collapsed} aria-controls={contentsId} onClick={() => setCollapsed(value => !value)}>
                  <MenuIcon aria-hidden="true" />
                  <span>Contents</span>
                </Button>
              ))}
          <span className="document-reader-title" title={path}>{label}</span>
        </div>
        {railVisible && <div id={contentsId} className="document-reader-contents">{contents?.(currentSection)}</div>}
        {railVisible && (
          <div
            className="document-reader-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize contents"
            aria-controls={contentsId}
            aria-valuenow={contentsWidth}
            aria-valuemin={minimumContentsWidth}
            aria-valuemax={maximumContentsWidth}
            tabIndex={0}
            onPointerDown={dragContents}
            onDoubleClick={() => resizeContents(defaultContentsWidth)}
            onKeyDown={(event) => {
              const step = event.key === 'ArrowLeft' ? -16 : event.key === 'ArrowRight' ? 16 : 0
              if (!step)
                return
              event.preventDefault()
              resizeContents(contentsWidth + step)
            }}
          />
        )}
        <div ref={pageRef} className="document-reader-page">{children}</div>
      </div>
      {narrow && hasContents && (
        /* The popup's centering utility uses the independent translate property. Keep its override
           inline because the production CSS build drops translate:none next to transform:none. */
        <DialogContent className="document-contents-drawer" aria-describedby={undefined} style={{ translate: 'none' }}>
          <DialogTitle>Contents</DialogTitle>
          <div
            ref={drawerContentsRef}
            className="document-reader-contents"
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('a, button'))
                setDrawerOpen(false)
            }}
          >
            {contents?.(currentSection)}
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
