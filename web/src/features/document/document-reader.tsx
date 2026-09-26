import { MenuIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'

export function DocumentReader({ path, contents, children }: { path: string, contents?: React.ReactNode, children: React.ReactNode }) {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = React.useState(() => window.matchMedia?.('(max-width: 900px)').matches ?? false)
  const [collapsed, setCollapsed] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const contentsId = React.useId()
  React.useEffect(() => {
    const frame = frameRef.current
    if (!frame || typeof ResizeObserver === 'undefined')
      return
    // Measure the reader pane, since a desktop editor can leave less room than a phone layout.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry)
        return
      const next = entry.contentRect.width < 760
      setNarrow(next)
      if (!next)
        setDrawerOpen(false)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])
  const hasContents = !!contents
  const railVisible = hasContents && !narrow && !collapsed
  const label = path.split('/').pop() ?? path
  return (
    <Dialog open={narrow && drawerOpen} onOpenChange={setDrawerOpen}>
      <div ref={frameRef} className="document-reader" data-contents={railVisible ? 'visible' : 'hidden'}>
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
        {railVisible && <div id={contentsId} className="document-reader-contents">{contents}</div>}
        <div className="document-reader-page">{children}</div>
      </div>
      {narrow && hasContents && (
        <DialogContent className="document-contents-drawer" aria-describedby={undefined}>
          <DialogTitle>Contents</DialogTitle>
          <div
            className="document-reader-contents"
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('a, button'))
                setDrawerOpen(false)
            }}
          >
            {contents}
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
