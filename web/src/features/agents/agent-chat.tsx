import type { AgentProvider } from '../../../../src/shared/contracts'
import type { Session } from '@/features/workspace/api'
import { Bot, Check, FilePenLine, LoaderCircle, Paperclip, Send, Square, Wrench, X } from 'lucide-react'
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
// The design ceiling: the panel never grows past this share of the viewport even when the viewport
// is tall enough to allow more, so a meaningful sliver of document always stays reachable above it.
const designMaximumHeightPercent = 85
// The fixed chrome outside the docked sheet below the phone breakpoint: the header above it (which
// the sheet must never climb over) and the phone bar plus the status bar its own bottom offset
// reserves (index.css). The device's bottom safe area is not fixed — it is read live below, since a
// hardcoded value would only agree with the CSS env() the layout itself reserves when that inset
// happens to be zero, the same mistake that let the panel overlap the header once the CSS grew an
// inset term the JS clamp never knew about.
const headerHeight = 58
const phoneChromeHeight = 30 + 56

// The device's bottom safe area (env(safe-area-inset-bottom)) has no direct JS accessor; measuring
// it through a probe element is the only way to read the exact value the layout's own CSS reserves,
// so the reachable maximum below can be computed from that same number instead of assuming zero.
function readSafeAreaInsetBottom(): number {
  const probe = document.createElement('div')
  probe.style.position = 'fixed'
  probe.style.bottom = '0'
  probe.style.left = '0'
  probe.style.height = '0'
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  document.body.append(probe)
  const value = Number.parseFloat(getComputedStyle(probe).paddingBottom)
  probe.remove()
  return Number.isFinite(value) ? value : 0
}

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

// The panel's actual rendered height is capped by the same chrome the layout reserves elsewhere —
// including the device's own bottom safe area — so the handle's reported maximum must be computed
// from that same figure, not a fixed percentage the layout cannot reach on every device.
function useMaximumHeightPercent(narrow: boolean): number {
  const [viewportHeight, setViewportHeight] = React.useState(() => window.innerHeight)
  const [safeAreaInsetBottom, setSafeAreaInsetBottom] = React.useState(() => readSafeAreaInsetBottom())
  React.useEffect(() => {
    const update = () => {
      setViewportHeight(window.innerHeight)
      setSafeAreaInsetBottom(readSafeAreaInsetBottom())
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (!narrow)
    return 100
  const reachable = ((viewportHeight - headerHeight - phoneChromeHeight - safeAreaInsetBottom) / viewportHeight) * 100
  return Math.min(designMaximumHeightPercent, Math.max(minimumHeightPercent, reachable))
}

export function AgentChat({ session, open, blockedReason, activePath, onClose, onActiveChange, onFileChanged, onSettled }: AgentChatProps) {
  const blocked = blockedReason !== undefined
  const chat = useAgentChat({ session, open, blocked, activePath, onActiveChange, onFileChanged, onSettled })
  const [prompt, setPrompt] = React.useState('')
  const narrow = useNarrowViewport()
  const maximumHeightPercent = useMaximumHeightPercent(narrow)
  const [width, setWidth] = React.useState(() => {
    const stored = Number(localStorage.getItem('merdeck-agent-width'))
    return Number.isFinite(stored) ? Math.min(maximumWidth, Math.max(minimumWidth, stored)) : 380
  })
  const [heightPercent, setHeightPercent] = React.useState(defaultHeightPercent)
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
    <aside className="agent-pane" aria-label="AI file editor" hidden={!open} data-narrow={narrow || undefined} style={{ '--agent-width': `${width}px`, '--agent-height': `${heightPercent}dvh` } as React.CSSProperties}>
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
        <Button variant="ghost" size="icon-sm" aria-label="Close AI file editor" onClick={onClose}><X /></Button>
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
          if (item.kind === 'approval') {
            const waiting = chat.answering.has(item.approvalId)
            return (
              <section key={item.key} className="agent-approval" aria-label="Agent approval request">
                <strong>{item.approvalKind === 'command' ? 'Command approval' : item.approvalKind === 'file_access' ? 'File access approval' : 'File change approval'}</strong>
                <p>{item.summary}</p>
                {item.answered
                  ? (
                      <span className="agent-decision">
                        <Check />
                        {' '}
                        {item.answered === 'approve' ? 'Approved' : 'Denied'}
                      </span>
                    )
                  : (
                      <div>
                        <Button size="sm" variant="outline" disabled={waiting} onClick={() => void chat.answer(item.approvalId, 'deny')}>Deny</Button>
                        <Button size="sm" disabled={waiting} onClick={() => void chat.answer(item.approvalId, 'approve')}>Approve</Button>
                      </div>
                    )}
              </section>
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
