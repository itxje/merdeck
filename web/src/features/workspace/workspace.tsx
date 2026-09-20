import type { EntryAction } from './entries'
import type { EntryOperation } from './use-workspace'
import { Bot, Check, Code2, FileCode2, FolderOpen, GitBranch, LockOpen, LogOut, MoreHorizontal, PanelLeft, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { useDefaultLayout, usePanelRef } from 'react-resizable-panels'
import { ThemeToggle } from '@/app/theme-toggle'
import { AgentChat } from '@/features/agents/agent-chat'
import { DocumentView } from '@/features/document/document-view'
import { HtmlDocumentView } from '@/features/document/html-document-view'
import { Preview } from '@/features/preview/preview'
import { UpdateNotice } from '@/features/update/update-notice'
import { MerdeckMark } from '@/shared/components/brand/merdeck-mark'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { absoluteSourceLimit, errorMessage, parentDirectory, sessionCsrf, validPath } from './api'
import { warningMessage } from './drafts'
import { EntryDialog } from './entry-dialog'
import { boundedWidth, explorerWidth as explorerBounds, useExplorerWidth } from './explorer-width'
import { useFileFilter } from './file-filter'
import { FileTree } from './file-tree'
import { useDirectorySearch } from './use-directory-search'
import { useWorkspace } from './use-workspace'

const introduction = 'Browse, edit and preview diagrams in your project files.'
const collapsedSourceWidth = 40
// Below this width the header controls collapse into an overflow menu, the pane tabs move into a
// bottom bar, and the assistant docks to the bottom edge instead of the side.
const narrowViewportQuery = '(max-width: 700px)'

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

export function Workspace({ path, block, directory = parentDirectory(path), browse = () => {}, navigate }: { path: string, block: number, directory?: string, browse?: (directory: string) => void, navigate: (path: string, block: number, directory?: string) => void }) {
  const narrow = useNarrowViewport()
  // The AI file editor is docked open by default; an operator who closes it keeps it closed across
  // reloads. Below the phone breakpoint it always starts closed, whatever that stored preference
  // says, without writing over it, so a desktop preference set on a later visit is unaffected.
  const [agentOpen, setAgentOpen] = React.useState(() => window.matchMedia(narrowViewportQuery).matches ? false : localStorage.getItem('merdeck-agent-open') !== 'false')
  const showAgent = React.useCallback((open: boolean) => {
    localStorage.setItem('merdeck-agent-open', String(open))
    setAgentOpen(open)
  }, [])
  const [agentActive, setAgentActive] = React.useState(false)
  const agentActiveRef = React.useRef(false)
  const updateAgentActive = React.useCallback((active: boolean) => {
    agentActiveRef.current = active
    setAgentActive(active)
  }, [])
  const state = useWorkspace(path, block, directory, { active: agentActive, activeRef: agentActiveRef })
  const [kinds, chooseKinds] = useFileFilter()
  const search = useDirectorySearch(directory, kinds, !!state.session)
  const [token, setToken] = React.useState('')
  const [loginError, setLoginError] = React.useState('')
  const [treeOpen, setTreeOpen] = React.useState(false)
  const [overflowOpen, setOverflowOpen] = React.useState(false)
  const [logoutOpen, setLogoutOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [entryDialog, setEntryDialog] = React.useState<{ action: EntryAction, key: number } | null>(null)
  const [entryOpen, setEntryOpen] = React.useState(false)
  const drawerFilterRef = React.useRef<HTMLInputElement>(null)
  const [pane, setPane] = React.useState('preview')
  // View selection belongs to a Markdown document, never to the previously opened file.
  const [markdownViews, setMarkdownViews] = React.useState<Record<string, 'document' | 'diagram'>>({})
  const [syntaxError, setSyntaxError] = React.useState('')
  const linesRef = React.useRef<HTMLPreElement>(null)
  const sourceRef = React.useRef<HTMLTextAreaElement>(null)
  const locate = React.useCallback(({ start, end }: { start: number, end: number }) => {
    const editor = sourceRef.current
    if (!editor)
      return
    editor.focus({ preventScroll: true })
    editor.setSelectionRange(start, end)
    // Bring the selected label into the upper third of the source editor.
    const line = editor.value.slice(0, start).split('\n').length - 1
    editor.scrollTop = Math.max(0, line * (Number.parseFloat(getComputedStyle(editor).lineHeight) || 26) - editor.clientHeight / 3)
  }, [])
  const sourcePanel = usePanelRef()
  // The default panel layout starts collapsed; match it before the first resize observation.
  const [sourceCollapsed, setSourceCollapsed] = React.useState(true)
  const [explorerWidth, resizeExplorer] = useExplorerWidth()
  const dragExplorer = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget
    const origin = event.clientX
    const start = explorerWidth
    handle.setPointerCapture(event.pointerId)
    const move = (moved: PointerEvent) => resizeExplorer(start + moved.clientX - origin)
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }, [explorerWidth, resizeExplorer])
  const paneLayout = useDefaultLayout({ id: 'merdeck-panes', storage: localStorage })
  const showSource = React.useCallback(() => {
    sourcePanel.current?.expand()
    setSourceCollapsed(false)
  }, [sourcePanel])
  const file = state.file
  const selected = file?.baseline.blocks[block]
  const markdownView = file?.baseline.kind === 'markdown' ? markdownViews[path] ?? 'document' : 'document'
  const effectiveMarkdownView = file?.baseline.kind === 'markdown' && !selected ? 'document' : markdownView
  const chooseMarkdownView = React.useCallback((value: 'document' | 'diagram') => {
    if (file?.baseline.kind === 'markdown')
      setMarkdownViews(views => views[path] === value ? views : { ...views, [path]: value })
  }, [file?.baseline.kind, path])
  const source = file?.sources[block] ?? ''
  const changed = !!selected && source !== selected.source
  const sourceBytes = new TextEncoder().encode(source).length
  const maxBytes = state.session?.maxSourceBytes ?? absoluteSourceLimit
  const tooLarge = sourceBytes > maxBytes
  const hasWarning = !!file?.warning || !!file?.locked
  const disconnected = !state.online || state.revision.isError
  const agentBlockedReason = state.hasUnsaved || state.savePending
    ? 'Save or discard browser drafts before starting an agent turn.'
    : !state.session?.storage.writable
        ? 'AI editing is unavailable while project storage is read-only.'
        : disconnected
          ? 'Reconnect to the project before starting an agent turn.'
          : undefined
  const canSave = !agentActive && !!state.session?.storage.writable && changed && !file?.saving && !state.savePending && !hasWarning && !tooLarge && !disconnected
  const save = state.save
  const doSave = React.useCallback(() => {
    if (canSave)
      void save()
  }, [canSave, save])
  React.useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()

        doSave()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [doSave])
  const linkSession = state.session
  const readTarget = state.readTarget
  const linkReadRef = React.useRef<AbortController | null>(null)
  const linkedRequestRef = React.useRef(0)
  const linkScopeRef = React.useRef<AbortController | null>(null)
  const csrf = state.session ? sessionCsrf(state.session) : undefined
  React.useLayoutEffect(() => {
    const controller = new AbortController()
    linkScopeRef.current = controller
    return () => controller.abort()
  }, [path, block, source, state.session?.access, csrf])
  const navigationRef = React.useRef({ path, block, directory, access: state.session?.access, csrf })
  React.useLayoutEffect(() => {
    navigationRef.current = { path, block, directory, access: state.session?.access, csrf }
  }, [path, block, directory, state.session?.access, csrf])
  const openResolvedLinkedFile = React.useCallback(async (resolved: string) => {
    const request = ++linkedRequestRef.current
    const controller = linkScopeRef.current
    let read: AbortController | null = null
    if (!linkSession || !controller || controller.signal.aborted || !validPath(resolved))
      return 'That file cannot be opened.'
    try {
      linkReadRef.current?.abort()
      read = new AbortController()
      linkReadRef.current = read
      const document = await readTarget(resolved, AbortSignal.any([controller.signal, read.signal]))
      if (controller.signal.aborted || linkScopeRef.current !== controller || request !== linkedRequestRef.current)
        return undefined
      if (document.path !== resolved)
        return 'That file cannot be opened.'
      navigate(resolved, 0)
      return undefined
    }
    catch (error) {
      if (controller.signal.aborted || read?.signal.aborted || request !== linkedRequestRef.current)
        return undefined
      return errorMessage(error)
    }
  }, [navigate, linkSession, readTarget])
  const openLinkedFile = React.useCallback((target: string) => {
    const base = parentDirectory(path)
    return openResolvedLinkedFile(`${base ? `${base}/` : ''}${target}`)
  }, [openResolvedLinkedFile, path])

  const select = (next: string, index = 0) => {
    navigate(next, index)

    setTreeOpen(false)

    setSyntaxError('')

    setReviewOpen(false)

    state.review.reset()
  }
  const openEntry = (action: EntryAction) => {
    setTreeOpen(false)
    setEntryDialog(previous => ({ action, key: (previous?.key ?? 0) + 1 }))
    setEntryOpen(true)
  }
  const submitEntry = async (operation: EntryOperation) => {
    const start = navigationRef.current
    await state.entries.mutateAsync(operation)
    search.refresh()
    const current = navigationRef.current
    if (!current.access || current.access !== start.access || current.csrf !== start.csrf)
      return
    setEntryOpen(false)
    const { path, block, directory } = current
    // Reconcile browsing independently from the selected file and retained drafts.
    if (operation.type === 'create') {
      if (operation.request.kind === 'file' && current === start)
        select(operation.request.path)
    }
    else if (operation.type === 'move') {
      const { kind, from, to } = operation.request
      const remap = (value: string) => value === from || (kind === 'directory' && value.startsWith(`${from}/`)) ? `${to}${value.slice(from.length)}` : value
      navigate(remap(path), block, kind === 'file' && path === from ? parentDirectory(to) : remap(directory))
    }
    else {
      const removed = operation.request.path
      const inFolder = operation.request.kind === 'directory' && (directory === removed || directory.startsWith(`${removed}/`))
      navigate(path === removed ? '' : path, path === removed ? 0 : block, inFolder ? parentDirectory(removed) : directory)
    }
  }

  const canChange = !agentActive && !!state.session?.storage.writable && state.online && !state.listing.stale && !state.listing.error && !state.entries.isPending && !state.savePending
  const treeProps = { listing: state.listing, directory, browse, drafts: state.drafts, path, block, select, refresh: state.refresh, canChange, onAction: openEntry, kinds, chooseKinds, search: search.view, onQueryChange: search.onQueryChange }
  const openReview = () => {
    state.review.reset()

    setReviewOpen(true)

    state.review.mutate(path)
  }
  const activeError = state.documentQuery.error ?? state.revision.error
  const deleted = state.revision.data?.state === 'deleted'
  // Reloading would close these dialogs and forget a typed token.
  const dialogsOpen = treeOpen || logoutOpen || reviewOpen || entryOpen || !!token
  // The same control sits in the header at wider sizes and in the phone bottom bar below the
  // breakpoint; it is rendered in exactly one of the two places, never both.
  // In the header it sits among other icon controls and reads as one of them; alone at the left of
  // the phone bar it needs a word, or it reads as a stray glyph beside an empty strip.
  const filesTrigger = (labelled: boolean) => (
    <Button className="tree-toggle" variant="ghost" size={labelled ? 'default' : 'icon'} aria-label="Open project files" onClick={() => setTreeOpen(true)}>
      <PanelLeft />
      {labelled && 'Files'}
    </Button>
  )
  const assistantToggle = state.session && (
    <Tooltip>
      <TooltipTrigger render={<Button variant={agentOpen ? 'secondary' : 'ghost'} size="icon" aria-label="Open AI file editor" aria-pressed={agentOpen} onClick={() => showAgent(!agentOpen)} />}>
        <Bot />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">AI file editor</TooltipContent>
    </Tooltip>
  )
  const signOut = state.session?.access === 'token' && (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Log out" onClick={() => setLogoutOpen(true)} />}>
        <LogOut />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">Log out</TooltipContent>
    </Tooltip>
  )
  return (
    <div className="workspace" data-screen-label="Diagram workspace">
      <header className="app-header">
        <div className="brand">
          <MerdeckMark className="brand-symbol" aria-hidden="true" />
          <span className="brand-name">Merdeck</span>
        </div>
        {/* The open file and its save controls share the header, so no second bar takes height from the diagram. */}
        {state.session && (
          <div className="header-file">
            {/* Below the phone breakpoint this same control moves into the bottom bar instead of duplicating it here. */}
            {!narrow && filesTrigger(false)}
            {/* Without an open file the header names nothing: the explorer and the empty state already say what to do. */}
            {path && (
              <>
                <FileCode2 className="desktop-only" />
                <h1 title={selected ? `${path} · ${file?.baseline.kind === 'markdown' ? 'Markdown diagram' : 'Mermaid file'}` : file?.baseline.kind === 'html' ? `${path} · HTML document` : path}>{path}</h1>
              </>
            )}
          </div>
        )}
        <div className="header-actions">
          {state.session && file && file.baseline.kind !== 'html' && (
            <>
              <span className="save-status" role="status">
                {file?.saving
                  ? 'Saving…'
                  : changed
                    ? (
                        <>
                          <span className="dirty-dot" />
                          Unsaved
                        </>
                      )
                    : selected
                      ? (
                          <>
                            <Check />
                            {file?.saved ? 'Saved' : 'Up to date'}
                          </>
                        )
                      : ''}
              </span>
              <Button disabled={!canSave} onClick={doSave}>
                Save
                <kbd>⌘ / Ctrl S</kbd>
              </Button>
              <span className="control-divider" aria-hidden="true" />
            </>
          )}
          {narrow
            ? (
                <>
                  {/* Opening the assistant is the one thing done often enough on a phone to keep in
                      the header itself; the theme switch and log out stay one tap further in. */}
                  {assistantToggle}
                  {/* The theme switch inside is a plain control, not a menu item, so nothing tells
                      this menu a selection happened; closing it explicitly on any click inside is
                      what keeps its backdrop from outliving the choice that was made. */}
                  <DropdownMenu open={overflowOpen} onOpenChange={setOverflowOpen}>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More options" />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="header-menu" onClick={() => setOverflowOpen(false)}>
                      <ThemeToggle />
                      {signOut && <DropdownMenuSeparator />}
                      {signOut}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )
            : (
                <>
                  {assistantToggle}
                  <ThemeToggle />
                  {signOut && (
                    <>
                      <span className="control-divider" aria-hidden="true" />
                      {signOut}
                    </>
                  )}
                </>
              )}
        </div>
      </header>
      <UpdateNotice blocked={state.reloadBlocked || dialogsOpen} reload={() => state.reloadApplication(dialogsOpen)} />
      {!state.session
        ? (
            <main className="login-page">
              <div className="login-card">
                <MerdeckMark className="login-mark" aria-hidden="true" />
                <h1>{state.hasUnsaved || state.expired ? 'Reconnect to your project' : 'Open your diagram workspace'}</h1>
                {/* A service with open access passes through this card while its status loads, so ask for a token only once it is needed. */}
                <p>{state.sessionQuery.isPending ? introduction : `${introduction} Enter the access token provided by your operator.`}</p>
                {state.hasUnsaved && <p role="status">Your unsaved work is kept in this tab. Sign in to review it against the current project before saving.</p>}
                {state.sessionQuery.isPending
                  ? <p role="status">Checking your session…</p>
                  : (
                      <form onSubmit={(event) => {
                        event.preventDefault()
                        if (state.login.isPending)
                          return
                        setLoginError('')
                        const value = token
                        setToken('')
                        state.login.mutate(value, { onError: error => setLoginError(errorMessage(error)), onSettled: () => state.login.reset() })
                      }}
                      >
                        <label htmlFor="access-token">Access token</label>
                        <Input id="access-token" type="password" autoComplete="off" minLength={32} maxLength={256} required value={token} onChange={event => setToken(event.target.value)} aria-describedby="login-help" />
                        <p id="login-help" className="muted">The token is used only to start this session.</p>
                        {(loginError || state.sessionQuery.isError) && <p role="alert">{loginError || errorMessage(state.sessionQuery.error)}</p>}
                        <Button type="submit" disabled={state.login.isPending}>{state.login.isPending ? 'Connecting…' : 'Connect to project'}</Button>
                      </form>
                    )}
              </div>
            </main>
          )
        : (
            <>
              <div className="workspace-body" style={{ '--explorer-width': `${explorerWidth}px` } as React.CSSProperties}>
                <FileTree {...treeProps} />
                {/* An ordinary window splitter: drag with a pointer, or step it with the arrow keys. */}
                <div
                  className="explorer-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize project files"
                  aria-valuenow={explorerWidth}
                  aria-valuemin={explorerBounds.minimum}
                  aria-valuemax={explorerBounds.maximum}
                  tabIndex={0}
                  onPointerDown={dragExplorer}
                  onDoubleClick={() => resizeExplorer(explorerBounds.default)}
                  onKeyDown={(event) => {
                    const step = event.key === 'ArrowLeft' ? -16 : event.key === 'ArrowRight' ? 16 : 0
                    if (!step)
                      return
                    event.preventDefault()
                    resizeExplorer(boundedWidth(explorerWidth + step))
                  }}
                />
                <main className="editor-workspace">
                  {!state.session.storage.writable && <div className="notice" role="status"><span>Read-only storage. Browsing and drafts are available; saving is disabled. Ask the operator to verify write support for this project.</span></div>}
                  {disconnected && (
                    <div className="notice" role="alert">
                      <span>Connection interrupted. Drafts are kept here. Reconnect to refresh the file state.</span>
                      <Button variant="outline" onClick={state.refresh}>Reconnect</Button>
                    </div>
                  )}
                  {hasWarning && (
                    <div className="notice" role="alert">
                      <span>{warningMessage(file?.warning)}</span>
                      <Button variant="outline" disabled={!!file?.saving} onClick={openReview}>Review current file</Button>
                    </div>
                  )}
                  {(selected && file) || file?.baseline.kind === 'markdown' || file?.baseline.kind === 'html'
                    ? (
                        <>
                          {file?.baseline.kind === 'markdown' && (
                            <Tabs className="view-switch" value={effectiveMarkdownView} onValueChange={value => chooseMarkdownView(value as 'document' | 'diagram')}>
                              <TabsList aria-label="Markdown view">
                                <TabsTrigger value="document">Document</TabsTrigger>
                                <TabsTrigger value="diagram" disabled={!selected}>Diagram</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          )}
                          {file?.baseline.kind === 'html'
                            ? <HtmlDocumentView text={file.baseline.text} path={path} onOpenFile={openResolvedLinkedFile} />
                            : !selected && file?.baseline.kind === 'markdown'
                                ? (
                                    <DocumentView
                                      text={file.baseline.text}
                                      path={path}
                                      blocks={file.baseline.blocks}
                                      sources={file.sources}
                                      selected={block}
                                      onSelect={index => select(path, index)}
                                      onOpenFile={openResolvedLinkedFile}
                                      onOpenDiagramFile={openLinkedFile}
                                    />
                                  )
                                : (
                                    <ResizablePanelGroup className="panes" data-pane={pane} orientation="horizontal" defaultLayout={paneLayout.defaultLayout} onLayoutChanged={paneLayout.onLayoutChanged}>
                                      <ResizablePanel id="source-panel" className="pane-slot" panelRef={sourcePanel} collapsible collapsedSize={collapsedSourceWidth} minSize="20%" defaultSize={collapsedSourceWidth} onResize={size => setSourceCollapsed(size.inPixels <= collapsedSourceWidth)}>
                                        {sourceCollapsed && (
                                          <div className="source-rail">
                                            <Button variant="ghost" size="icon-sm" aria-label="Show source" title="Show source" onClick={showSource}><PanelLeftOpen /></Button>
                                          </div>
                                        )}
                                        {/* The collapsed editor stays mounted so its scroll position and selection survive. */}
                                        <section className="source-pane" aria-label="Source editor" data-collapsed={sourceCollapsed || undefined}>
                                          <div className="pane-heading">
                                            <label htmlFor="diagram-source">Source</label>
                                            <span className="pane-actions">
                                              <span className="muted">Mermaid</span>
                                              <Button className="pane-collapse" variant="ghost" size="icon-xs" aria-label="Hide source" title="Hide source" onClick={() => sourcePanel.current?.collapse()}><PanelLeftClose /></Button>
                                            </span>
                                          </div>
                                          <div className="source-body">
                                            <pre ref={linesRef} className="line-numbers" aria-hidden="true">{source.split('\n').map((_line, index) => index + 1).join('\n')}</pre>
                                            <Textarea
                                              ref={sourceRef}
                                              id="diagram-source"
                                              aria-label="Mermaid source"
                                              aria-invalid={!!syntaxError || tooLarge}
                                              aria-describedby={syntaxError || tooLarge ? 'source-error' : undefined}
                                              spellCheck={false}
                                              className="source-input"
                                              maxLength={absoluteSourceLimit}
                                              value={source}
                                              onScroll={(event) => {
                                                if (linesRef.current)
                                                  linesRef.current.scrollTop = event.currentTarget.scrollTop
                                              }}
                                              onChange={event => state.dispatch({ type: 'edit', path, block, source: event.target.value })}
                                            />
                                          </div>
                                          {(syntaxError || tooLarge) && (
                                            <div id="source-error" className="source-error" role="status">
                                              <strong>{tooLarge ? 'Source exceeds the service limit' : 'Preview needs attention'}</strong>
                                              <pre>{tooLarge ? `Limit: ${maxBytes.toLocaleString()} UTF-8 bytes. Your text is kept; shorten it before saving.` : syntaxError.slice(0, 800)}</pre>
                                            </div>
                                          )}
                                          <div className="pane-footer">
                                            <span>
                                              {source.split('\n').length}
                                              {' '}
                                              lines · UTF-8 ·
                                              {' '}
                                              {sourceBytes.toLocaleString()}
                                              {' '}
                                              bytes
                                            </span>
                                            <span>{file.baseline.kind === 'markdown' ? `Line ${selected?.lineStart ?? 1}` : 'Entire file'}</span>
                                          </div>
                                        </section>
                                      </ResizablePanel>
                                      <ResizableHandle withHandle aria-label="Resize source and preview" />
                                      <ResizablePanel id="preview-panel" className="pane-slot" minSize="30%">
                                        {file?.baseline.kind === 'markdown' && effectiveMarkdownView === 'document'
                                          ? <DocumentView text={file.baseline.text} path={path} blocks={file.baseline.blocks} sources={file.sources} selected={block} onSelect={index => select(path, index)} onOpenFile={openResolvedLinkedFile} onOpenDiagramFile={openLinkedFile} />
                                          : <Preview key={`${path}:${block}`} source={source} title={selected?.label ?? 'Diagram'} onError={setSyntaxError} onSourceChange={next => state.dispatch({ type: 'edit', path, block, source: next })} onLocate={locate} onOpenFile={openLinkedFile} />}
                                      </ResizablePanel>
                                    </ResizablePanelGroup>
                                  )}
                        </>
                      )
                    : (
                        <div className="empty-state">
                          <FolderOpen />
                          <h2>{!path ? 'Choose a diagram' : deleted ? 'File deleted or renamed' : activeError ? 'Unable to open this file' : !file ? 'Opening file…' : 'No Mermaid blocks'}</h2>
                          <p>{!path ? 'Select a file or an individual Markdown diagram from the explorer.' : deleted ? 'The original path is no longer available. Renamed files appear separately in the explorer.' : activeError ? errorMessage(activeError) : !file ? 'Reading the current project file.' : 'This Markdown file has no supported top-level Mermaid fences, or this block no longer exists.'}</p>
                          <Button variant="outline" onClick={() => setTreeOpen(true)}>Browse files</Button>
                          {path && <Button variant="ghost" onClick={state.refresh}>Refresh file</Button>}
                        </div>
                      )}
                </main>
                {state.session && (
                  <AgentChat
                    key={state.session.access === 'token' ? state.session.csrfToken : 'open'}
                    session={state.session}
                    open={agentOpen}
                    blockedReason={agentBlockedReason}
                    activePath={path || undefined}
                    onClose={() => showAgent(false)}
                    onActiveChange={updateAgentActive}
                    onFileChanged={state.reconcileAgentChange}
                    onSettled={state.reconcileAgentChange}
                  />
                )}
              </div>
              {/* Below the phone breakpoint this replaces the top pane tab strip: the project-files control
                  moved down from the header, always present once signed in, beside the source/preview tabs
                  that appear once a source pane exists. It sits above the status bar and is otherwise hidden. */}
              <div className="phone-tabbar">
                {narrow && filesTrigger(true)}
                {selected && (
                  <Tabs value={pane} onValueChange={value => setPane(String(value))}>
                    <TabsList aria-label="Workspace pane">
                      <TabsTrigger value="source">
                        <Code2 />
                        Source
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        <GitBranch />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="source" className="sr-only">Source editor</TabsContent>
                    <TabsContent value="preview" className="sr-only">Diagram preview</TabsContent>
                  </Tabs>
                )}
              </div>
              <footer className="status-bar">
                <span>
                  {state.session.access === 'open' ? <LockOpen /> : <ShieldCheck />}
                  {disconnected ? 'Disconnected' : state.session.access === 'open' ? 'Open access' : 'Connected'}
                </span>
                <span>
                  {agentActive ? 'Agent editing project files' : state.hasUnsaved ? 'Drafts kept in this tab' : <span className="desktop-only">External edits refresh automatically</span>}
                </span>
                <span title="Running version">{`Merdeck ${state.session.version}`}</span>
              </footer>
            </>
          )}
      <Dialog open={treeOpen && !!state.session} onOpenChange={setTreeOpen}>
        <DialogContent className="file-drawer" initialFocus={drawerFilterRef}>
          <DialogTitle className="sr-only">Project files</DialogTitle>
          <FileTree {...treeProps} filterRef={drawerFilterRef} />
        </DialogContent>
      </Dialog>
      <EntryDialog entry={entryDialog} open={entryOpen && !!state.session} onOpenChange={setEntryOpen} onSubmit={submitEntry} />
      <Dialog open={logoutOpen && state.session?.access === 'token'} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogTitle>Log out of this project?</DialogTitle>
          <DialogDescription>{state.hasUnsaved ? 'Logging out discards all unsaved drafts in this tab. Keep editing to preserve them.' : 'Your session will end and cached project files will be cleared.'}</DialogDescription>
          {state.logout.isError && <p role="alert">{errorMessage(state.logout.error)}</p>}
          <div className="review-actions">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Keep editing</Button>
            <Button disabled={state.logout.isPending || state.savePending} onClick={() => state.logout.mutate(undefined, { onSuccess: () => setLogoutOpen(false) })}>{state.hasUnsaved ? 'Discard drafts and log out' : 'Confirm log out'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reviewOpen && !!state.session} onOpenChange={setReviewOpen}>
        <DialogContent className="review-content">
          <DialogTitle>Review current file</DialogTitle>
          <DialogDescription>Drafts belong to the original file revision. Loading the current file discards all drafts for this file, including other Markdown blocks.</DialogDescription>
          {state.review.isPending && <p role="status">Reading current file…</p>}
          {state.review.error && <p role="alert">{errorMessage(state.review.error)}</p>}
          {state.review.data?.path === path && (
            <>
              <strong>
                Current file ·
                {state.review.data.blocks.length}
                {' '}
                diagrams
              </strong>
              <pre className="compare-source">{state.review.data.blocks[block]?.source ?? 'This block is no longer present.'}</pre>
            </>
          )}
          <strong>Your draft</strong>
          <pre className="compare-source">{source}</pre>
          <div className="review-actions">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Keep draft</Button>
            {file && state.review.data?.path === path && state.review.data.version === file.baseline.version && (
              <Button
                variant="outline"
                onClick={() => {
                  if (state.review.data) {
                    state.dispatch({ type: 'retain', document: state.review.data })
                    setReviewOpen(false)
                  }
                }}
              >
                Use draft with this revision
              </Button>
            )}
            <Button
              disabled={state.review.data?.path !== path || state.review.isPending || !!file?.saving}
              onClick={() => {
                if (state.review.data) {
                  state.reload(state.review.data)

                  navigate(path, 0, directory)

                  setSyntaxError('')

                  setReviewOpen(false)
                }
              }}
            >
              Discard drafts and load file
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
