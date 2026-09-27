import type { AgentProvider } from '../../../../src/shared/contracts'
import type { Session } from '@/features/workspace/api'
import { Bot, FilePenLine, LoaderCircle, MessageSquarePlus, Paperclip, Send, Square, Wrench, X } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useAgentChat } from './use-agent-chat'

interface AgentChatProps {
  session: Session
  open: boolean
  blockedReason: string | undefined
  activePath: string | undefined
  onClose: () => void
  onActiveChange: (active: boolean) => void
  onFileChanged: (path: string) => void
  onSettled: () => void
}

const minimumWidth = 300
const maximumWidth = 560
// Below the phone breakpoint the panel docks to the bottom edge instead of the side, sized as a
// share of the viewport height instead of a stored pixel width; that height is a session-only
// preference, never written to storage.
const narrowViewportQuery = '(max-width: 700px)'
const minimumHeightPercent = 30
const defaultHeightPercent = 55
// The sheet's own chrome — the title row, the engine row and the composer — comes to about 255px on
// a phone, so a share on its own leaves almost no conversation on the short visual viewport a phone
// browser's toolbars produce: 55% of 640px is a 352px sheet holding 96px of transcript. The panel
// therefore opens at whichever is taller, the design share or the height that leaves a readable
// conversation, still bounded below by what the content area allows and still freely draggable.
const readableSheetHeight = 420
const initialHeightPercent = () => Math.max(defaultHeightPercent, (readableSheetHeight / window.innerHeight) * 100)
// The design ceiling: the panel never grows past this share of the viewport even when the viewport
// is tall enough to allow more, so a meaningful sliver of document always stays reachable above it.
const designMaximumHeightPercent = 85

function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = React.useState(() => window.matchMedia(narrowViewportQuery).matches)
  React.useEffect(() => {
    const media = window.matchMedia(narrowViewportQuery)
    const update = () => setNarrow(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return narrow
}

// Below the phone breakpoint the panel is positioned inside the content area between the header and
// the bottom bars, and index.css caps it at that area's own height, so the browser — not a number
// here — keeps it off the header and off the bars, at whatever the header, the bars and
// env(safe-area-inset-bottom) actually come to. This reads that same box back to report the range,
// rather than reconstructing it from copies of those heights: copies need every term to be listed
// and every change to be mirrored, and each term that was missing or stale let the reported range
// and the reachable height drift apart again.
function useReachableHeightPercent(narrow: boolean, paneRef: React.RefObject<HTMLElement | null>): number {
  const [reachable, setReachable] = React.useState(designMaximumHeightPercent)
  React.useLayoutEffect(() => {
    const area = narrow ? paneRef.current?.parentElement : undefined
    if (!area)
      return
    const measure = () => setReachable((area.getBoundingClientRect().height / window.innerHeight) * 100)
    measure()
    // The safe-area inset has no event of its own — it can change with no resize following it — but
    // it is part of the bars below, so any change to it resizes this area. Observing the area is
    // therefore the signal, and it covers a changed header or bar height just as well.
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [narrow, paneRef])
  if (!narrow)
    return 100
  return Math.min(designMaximumHeightPercent, Math.max(minimumHeightPercent, reachable))
}

export function AgentChat({ session, open, blockedReason, activePath, onClose, onActiveChange, onFileChanged, onSettled }: AgentChatProps) {
  const blocked = blockedReason !== undefined
  const chat = useAgentChat({ session, open, blocked, activePath, onActiveChange, onFileChanged, onSettled })
  const [prompt, setPrompt] = React.useState('')
  const narrow = useNarrowViewport()
  const paneRef = React.useRef<HTMLElement>(null)
  const maximumHeightPercent = useReachableHeightPercent(narrow, paneRef)
  const [width, setWidth] = React.useState(() => {
    const stored = Number(localStorage.getItem('merdeck-agent-width'))
    return Number.isFinite(stored) ? Math.min(maximumWidth, Math.max(minimumWidth, stored)) : 380
  })
  const [heightPercent, setHeightPercent] = React.useState(initialHeightPercent)
  // A viewport that shrinks (e.g. rotation) can drop the reachable maximum below the current value.
  React.useEffect(() => {
    setHeightPercent(current => Math.min(current, maximumHeightPercent))
  }, [maximumHeightPercent])
  const [noticeDismissed, setNoticeDismissed] = React.useState(false)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    transcriptRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' })
  }, [chat.items.length])
  const submit = async () => {
    const sent = await chat.send(prompt)
    if (sent)
      setPrompt('')
  }
  const resizeWidth = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget
    const origin = event.clientX
    const start = width
    handle.setPointerCapture(event.pointerId)
    const move = (moved: PointerEvent) => setWidth(Math.min(maximumWidth, Math.max(minimumWidth, start + origin - moved.clientX)))
    const stop = () => {
      const current = Number.parseFloat(getComputedStyle(handle.parentElement!).width)
      if (Number.isFinite(current))
        localStorage.setItem('merdeck-agent-width', String(Math.round(current)))
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }
  const resizeHeight = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget
    const origin = event.clientY
    const start = heightPercent
    const viewportHeight = window.innerHeight
    handle.setPointerCapture(event.pointerId)
    const move = (moved: PointerEvent) => {
      const delta = ((origin - moved.clientY) / viewportHeight) * 100
      setHeightPercent(Math.min(maximumHeightPercent, Math.max(minimumHeightPercent, start + delta)))
    }
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }
  const unavailable = !chat.capabilities.isPending && !chat.providers.length
  return (
    <aside ref={paneRef} className="agent-pane" aria-label="AI file editor" hidden={!open} data-narrow={narrow || undefined} style={{ '--agent-width': `${width}px`, '--agent-height': `${heightPercent}dvh` } as React.CSSProperties}>
      <div
        className="agent-resizer"
        role="separator"
        aria-label="Resize AI file editor"
        aria-orientation={narrow ? 'horizontal' : 'vertical'}
        aria-valuemin={narrow ? minimumHeightPercent : minimumWidth}
        aria-valuemax={narrow ? maximumHeightPercent : maximumWidth}
        aria-valuenow={narrow ? Math.round(heightPercent) : width}
        tabIndex={0}
        onPointerDown={narrow ? resizeHeight : resizeWidth}
        onKeyDown={(event) => {
          if (narrow) {
            const change = event.key === 'ArrowUp' ? 5 : event.key === 'ArrowDown' ? -5 : 0
            if (!change)
              return
            event.preventDefault()
            setHeightPercent(current => Math.min(maximumHeightPercent, Math.max(minimumHeightPercent, current + change)))
            return
          }
          const change = event.key === 'ArrowLeft' ? 16 : event.key === 'ArrowRight' ? -16 : 0
          if (!change)
            return
          event.preventDefault()
          setWidth((current) => {
            const next = Math.min(maximumWidth, Math.max(minimumWidth, current + change))
            localStorage.setItem('merdeck-agent-width', String(next))
            return next
          })
        }}
      />
      <header className="agent-header">
        <div>
          <Bot aria-hidden="true" />
          <div>
            <strong>AI file editor</strong>
            <span>{chat.active ? 'Editing project files…' : chat.connection === 'reconnecting' ? 'Reconnecting…' : 'Direct local CLI session'}</span>
          </div>
        </div>
        <div className="agent-header-actions">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New conversation"
            title="New conversation"
            disabled={chat.active || chat.pending || (!chat.conversation && !chat.items.length)}
            onClick={() => void chat.startNew()}
          >
            <MessageSquarePlus />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Close AI file editor" onClick={onClose}><X /></Button>
        </div>
      </header>
      <div className="agent-provider-row">
        <label className="sr-only" htmlFor="agent-provider">Engine</label>
        <select
          id="agent-provider"
          aria-label="Engine"
          value={chat.provider ?? ''}
          disabled={chat.active || chat.pending || unavailable}
          onChange={event => chat.setProvider(event.target.value as AgentProvider)}
        >
          {!chat.providers.length && <option value="">Not configured</option>}
          {chat.providers.map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="agent-model">Model</label>
        <select
          id="agent-model"
          aria-label="Model"
          value={chat.model ?? ''}
          disabled={chat.active || chat.pending || unavailable || !chat.models.length}
          onChange={event => chat.setModel(event.target.value)}
        >
          {!chat.models.length && <option value="">Not available</option>}
          {chat.models.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
        </select>
      </div>
      <div ref={transcriptRef} className="agent-transcript" role="log" aria-live="polite" aria-label="AI conversation">
        {chat.capabilities.isPending && (
          <p className="agent-empty">
            <LoaderCircle className="spin" />
            {' '}
            Checking configured providers…
          </p>
        )}
        {chat.capabilities.isError && <p className="agent-error" role="alert">The agent capability check failed.</p>}
        {unavailable && !noticeDismissed && (
          <div className="agent-notice" role="status">
            <p>No provider is configured. Set an approved executable path on the service and restart it.</p>
            <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setNoticeDismissed(true)}><X /></Button>
          </div>
        )}
        {!chat.capabilities.isPending && !unavailable && !chat.items.length && <p className="agent-empty">Ask the agent to update a diagram or document. File changes refresh the current preview automatically.</p>}
        {chat.items.map((item) => {
          if (item.kind === 'user') {
            return (
              <div key={item.key} className="agent-message agent-user">
                <span>You</span>
                <p>{item.text}</p>
              </div>
            )
          }
          if (item.kind === 'assistant') {
            return (
              <div key={item.key} className="agent-message agent-assistant">
                <span>Assistant</span>
                <p>{item.text}</p>
              </div>
            )
          }
          if (item.kind === 'tool') {
            return (
              <div key={item.key} className="agent-event">
                <Wrench />
                <code>{item.label}</code>
              </div>
            )
          }
          if (item.kind === 'file') {
            return (
              <div key={item.key} className="agent-event">
                <FilePenLine />
                <span>
                  {item.change}
                  :
                  {' '}
                  <code>{item.path}</code>
                </span>
              </div>
            )
          }
          return <p key={item.key} className="agent-error" role="alert">{item.text}</p>
        })}
      </div>
      <div className="agent-composer">
        {blockedReason && <p role="status">{blockedReason}</p>}
        {chat.attached && (
          <p className="agent-attachment" aria-label="Attached file">
            <Paperclip />
            {' '}
            <code>{chat.attached}</code>
          </p>
        )}
        <label className="sr-only" htmlFor="agent-prompt">Agent instruction</label>
        <Textarea
          id="agent-prompt"
          aria-label="Agent instruction"
          placeholder="Describe the file change…"
          maxLength={16000}
          value={prompt}
          disabled={unavailable}
          onChange={event => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              void submit()
            }
          }}
        />
        <div>
          <span>
            {prompt.length.toLocaleString()}
            {' '}
            / 16,000
          </span>
          {chat.active
            ? (
                <Button variant="outline" disabled={chat.pending} onClick={() => void chat.cancel()}>
                  <Square />
                  {' '}
                  Stop
                </Button>
              )
            : (
                <Button disabled={blocked || chat.pending || unavailable || !prompt.trim()} onClick={() => void submit()}>
                  <Send />
                  {' '}
                  Send
                </Button>
              )}
        </div>
      </div>
    </aside>
  )
}
