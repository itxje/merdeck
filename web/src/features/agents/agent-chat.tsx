import type { AgentProvider } from '../../../../src/shared/contracts'
import type { Session } from '@/features/workspace/api'
import { Bot, Check, FilePenLine, LoaderCircle, Send, ShieldAlert, Square, Wrench, X } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useAgentChat } from './use-agent-chat'

interface AgentChatProps {
  session: Extract<Session, { access: 'token' }>
  open: boolean
  blockedReason: string | undefined
  onClose: () => void
  onActiveChange: (active: boolean) => void
  onFileChanged: (path: string) => void
  onSettled: () => void
}

const minimumWidth = 300
const maximumWidth = 560

export function AgentChat({ session, open, blockedReason, onClose, onActiveChange, onFileChanged, onSettled }: AgentChatProps) {
  const blocked = blockedReason !== undefined
  const chat = useAgentChat({ session, open, blocked, onActiveChange, onFileChanged, onSettled })
  const [prompt, setPrompt] = React.useState('')
  const [width, setWidth] = React.useState(() => {
    const stored = Number(localStorage.getItem('merdeck-agent-width'))
    return Number.isFinite(stored) ? Math.min(maximumWidth, Math.max(minimumWidth, stored)) : 380
  })
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    transcriptRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' })
  }, [chat.items.length])
  const submit = async () => {
    const sent = await chat.send(prompt)
    if (sent)
      setPrompt('')
  }
  const resize = (event: React.PointerEvent<HTMLDivElement>) => {
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
  const unavailable = !chat.capabilities.isPending && !chat.providers.length
  return (
    <aside className="agent-pane" aria-label="AI file editor" hidden={!open} style={{ '--agent-width': `${width}px` } as React.CSSProperties}>
      <div
        className="agent-resizer"
        role="separator"
        aria-label="Resize AI file editor"
        aria-orientation="vertical"
        aria-valuemin={minimumWidth}
        aria-valuemax={maximumWidth}
        aria-valuenow={width}
        tabIndex={0}
        onPointerDown={resize}
        onKeyDown={(event) => {
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
      <div className="agent-boundary" role="note">
        <ShieldAlert aria-hidden="true" />
        <span>Prompts and selected project context are sent to the chosen provider. Provider edits write directly to this project; review every approval request.</span>
      </div>
      <div className="agent-provider-row">
        <label htmlFor="agent-provider">Engine</label>
        <select
          id="agent-provider"
          aria-label="Engine"
          value={chat.provider ?? ''}
          disabled={chat.active || chat.pending || chat.providerLocked || unavailable}
          onChange={event => chat.setProvider(event.target.value as AgentProvider)}
        >
          {!chat.providers.length && <option value="">Not configured</option>}
          {chat.providers.map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
        </select>
      </div>
      <div className="agent-provider-row">
        <label htmlFor="agent-model">Model</label>
        <select
          id="agent-model"
          aria-label="Model"
          value={chat.model ?? ''}
          disabled={chat.active || chat.pending || chat.providerLocked || unavailable || !chat.models.length}
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
        {unavailable && <p className="agent-empty">No provider is configured. Set an approved executable path on the service and restart it.</p>}
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
                <span>{item.label}</span>
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
