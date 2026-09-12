import type { EntryAction } from './entries'
import type { EntryOperation } from './use-workspace'
import { Check, Code2, FileCode2, FolderOpen, GitBranch, LockOpen, LogOut, PanelLeft, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { useDefaultLayout, usePanelRef } from 'react-resizable-panels'
import { ThemeToggle } from '@/app/theme-toggle'
import { Preview } from '@/features/preview/preview'
import { UpdateNotice } from '@/features/update/update-notice'
import { MerdeckMark } from '@/shared/components/brand/merdeck-mark'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { absoluteSourceLimit, errorMessage } from './api'
import { warningMessage } from './drafts'
import { EntryDialog } from './entry-dialog'
import { boundedWidth, explorerWidth as explorerBounds, useExplorerWidth } from './explorer-width'
import { useFileFilter } from './file-filter'
import { FileTree } from './file-tree'
import { useWorkspace } from './use-workspace'

const introduction = 'Browse, edit and preview diagrams in your project files.'

export function Workspace({ path, block, navigate }: { path: string, block: number, navigate: (path: string, block: number) => void }) {
  const state = useWorkspace(path, block)
  const [token, setToken] = React.useState('')
  const [loginError, setLoginError] = React.useState('')
  const [treeOpen, setTreeOpen] = React.useState(false)
  const [logoutOpen, setLogoutOpen] = React.useState(false)
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [entryDialog, setEntryDialog] = React.useState<{ action: EntryAction, key: number } | null>(null)
  const [entryOpen, setEntryOpen] = React.useState(false)
  const drawerFilterRef = React.useRef<HTMLInputElement>(null)
  const [pane, setPane] = React.useState('preview')
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
  const [sourceCollapsed, setSourceCollapsed] = React.useState(false)
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
  const file = state.file
  const selected = file?.baseline.blocks[block]
  const source = file?.sources[block] ?? ''
  const changed = !!selected && source !== selected.source
  const sourceBytes = new TextEncoder().encode(source).length
  const maxBytes = state.session?.maxSourceBytes ?? absoluteSourceLimit
  const tooLarge = sourceBytes > maxBytes
  const hasWarning = !!file?.warning || !!file?.locked
  const disconnected = !state.online || state.tree.isError || state.revision.isError
  const canSave = !!state.session?.storage.writable && changed && !file?.saving && !state.savePending && !hasWarning && !tooLarge && !disconnected
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
    await state.entries.mutateAsync(operation)
    setEntryOpen(false)
    // The selection follows a created, moved or deleted file.
    if (operation.type === 'create') {
      if (operation.request.kind === 'file')
        select(operation.request.path)
    }
    else if (operation.type === 'move') {
      const { kind, from, to } = operation.request
      if (path === from)
        navigate(to, block)
      else if (kind === 'directory' && path.startsWith(`${from}/`))
        navigate(`${to}${path.slice(from.length)}`, block)
    }
    else if (operation.request.kind === 'file' && path === operation.request.path) {
      navigate('', 0)
    }
  }
  const canChange = !!state.session?.storage.writable && !disconnected && !state.entries.isPending && !state.savePending
  const [kinds, chooseKinds] = useFileFilter()
  const treeProps = { tree: state.tree.data, drafts: state.drafts, path, block, select, refresh: state.refresh, loading: state.tree.isPending, failed: state.tree.isError, canChange, onAction: openEntry, kinds, chooseKinds }
  const openReview = () => {
    state.review.reset()

    setReviewOpen(true)

    state.review.mutate(path)
  }
  const activeError = state.documentQuery.error ?? state.revision.error
  const entry = state.tree.data?.entries.find(item => item.path === path)
  const unsupported = entry?.kind === 'file' && entry.state !== 'available'
  const deleted = state.revision.data?.state === 'deleted'
  // Reloading would close these dialogs and forget a typed token.
  const dialogsOpen = treeOpen || logoutOpen || reviewOpen || entryOpen || !!token
  return (
    <div className="workspace" data-screen-label="Diagram workspace">
      <header className="app-header">
        <div className="brand">
          <MerdeckMark className="brand-symbol" aria-hidden="true" />
          <span className="brand-name">Merdeck</span>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          {state.session?.access === 'token' && (
            <>
              <span className="control-divider" aria-hidden="true" />
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Log out" onClick={() => setLogoutOpen(true)} />}>
                  <LogOut />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">Log out</TooltipContent>
              </Tooltip>
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
                  <div className="file-bar">
                    <div className="file-title">
                      <Button className="tree-toggle" variant="ghost" size="icon" aria-label="Open project files" onClick={() => setTreeOpen(true)}><PanelLeft /></Button>
                      <FileCode2 className="desktop-only" />
                      <div className="min-w-0">
                        <h1 title={path}>{path || 'Project files'}</h1>
                        <p>{selected ? `${selected.label} · ${file?.baseline.kind === 'markdown' ? 'Markdown diagram' : 'Mermaid file'}` : 'Choose a diagram to begin'}</p>
                      </div>
                    </div>
                    <div className="file-actions">
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
                    </div>
                  </div>
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
                  {selected && file
                    ? (
                        <>
                          <Tabs className="mobile-panes" value={pane} onValueChange={value => setPane(String(value))}>
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
                          <ResizablePanelGroup className="panes" data-pane={pane} orientation="horizontal" defaultLayout={paneLayout.defaultLayout} onLayoutChanged={paneLayout.onLayoutChanged}>
                            <ResizablePanel id="source-panel" className="pane-slot" panelRef={sourcePanel} collapsible collapsedSize={40} minSize="20%" defaultSize="42.5%" onResize={size => setSourceCollapsed(sourcePanel.current?.isCollapsed() ?? size.inPixels < 120)}>
                              {sourceCollapsed && (
                                <div className="source-rail">
                                  <Button variant="ghost" size="icon-sm" aria-label="Show source" title="Show source" onClick={() => sourcePanel.current?.expand()}><PanelLeftOpen /></Button>
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
                                  <span>{file.baseline.kind === 'markdown' ? `Line ${selected.lineStart}` : 'Entire file'}</span>
                                </div>
                              </section>
                            </ResizablePanel>
                            <ResizableHandle withHandle aria-label="Resize source and preview" />
                            <ResizablePanel id="preview-panel" className="pane-slot" minSize="30%">
                              <Preview key={`${path}:${block}`} source={source} title={selected.label} onError={setSyntaxError} onSourceChange={next => state.dispatch({ type: 'edit', path, block, source: next })} onLocate={locate} />
                            </ResizablePanel>
                          </ResizablePanelGroup>
                        </>
                      )
                    : (
                        <div className="empty-state">
                          <FolderOpen />
                          <h2>{!path ? 'Choose a diagram' : deleted ? 'File deleted or renamed' : activeError ? 'Unable to open this file' : unsupported ? 'File unavailable' : !file ? 'Opening file…' : 'No Mermaid blocks'}</h2>
                          <p>{!path ? 'Select a file or an individual Markdown diagram from the explorer.' : deleted ? 'The original path is no longer available. Renamed files appear separately in the explorer.' : activeError ? errorMessage(activeError) : unsupported ? 'This file is unreadable, unsupported or exceeds the configured size limit.' : !file ? 'Reading the current project file.' : 'This Markdown file has no supported top-level Mermaid fences, or this block no longer exists.'}</p>
                          <Button variant="outline" onClick={() => setTreeOpen(true)}>Browse files</Button>
                          {path && <Button variant="ghost" onClick={state.refresh}>Refresh file</Button>}
                        </div>
                      )}
                </main>
              </div>
              <footer className="status-bar">
                <span>
                  {state.session.access === 'open' ? <LockOpen /> : <ShieldCheck />}
                  {disconnected ? 'Disconnected' : state.session.access === 'open' ? 'Open access' : 'Connected'}
                </span>
                <span>
                  {state.hasUnsaved ? 'Drafts kept in this tab' : <span className="desktop-only">External edits refresh automatically</span>}
                </span>
                <span title="Running version">{`Merdeck ${state.session.version}`}</span>
              </footer>
            </>
          )}
      <Dialog open={treeOpen && !!state.session} onOpenChange={setTreeOpen}>
        <DialogContent className="file-drawer" initialFocus={drawerFilterRef}>
          <DialogTitle>Project files</DialogTitle>
          <DialogDescription>Select a file or a diagram block. Your drafts stay in this tab.</DialogDescription>
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

                  navigate(path, 0)

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
