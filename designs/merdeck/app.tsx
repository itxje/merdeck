import type { Draft, ProjectFile, Scenario } from './data'
import { Check, ChevronDown, ChevronRight, Code2, FileCode2, FileText, Folder, FolderOpen, GitBranch, Info, Monitor, Moon, PanelLeft, Search, ShieldCheck, Sun, Unplug } from 'lucide-react'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, useTheme } from '../../web/src/app/theme'
import { MerdeckMark } from '../../web/src/shared/components/brand/merdeck-mark'
import { Button } from '../../web/src/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../web/src/shared/components/ui/dialog'
import { Input } from '../../web/src/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../web/src/shared/components/ui/tabs'
import { Textarea } from '../../web/src/shared/components/ui/textarea'
import { files, initialDrafts, scenarios } from './data'
import { Preview } from './preview'
import './style.css'

function FileTree({ selected, blockId, drafts, onSelect, empty }: { selected: string, blockId: string, drafts: Record<string, Draft>, onSelect: (file: ProjectFile, id?: string) => void, empty: boolean }) {
  const [filter, setFilter] = React.useState('')
  const [expanded, setExpanded] = React.useState(true)
  const visible = empty ? [] : files.filter(file => file.path.toLowerCase().includes(filter.toLowerCase()))
  return (
    <aside className="file-tree" aria-label="Project files">
      <div className="tree-heading">
        <span>EXPLORER</span>
        <span>{empty ? '0 FILES' : '4 FILES'}</span>
      </div>
      <div className="tree-search">
        <Search aria-hidden="true" />
        <Input aria-label="Filter files" placeholder="Find a file…" value={filter} onChange={event => setFilter(event.target.value)} />
      </div>
      <nav aria-label="Files and diagrams">
        <ul>
          {visible.some(file => file.path.startsWith('docs/')) && (
            <li>
              <Button variant="ghost" className="tree-row" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                {expanded ? <ChevronDown /> : <ChevronRight />}
                <FolderOpen />
                docs
              </Button>
              {expanded && (
                <ul className="nested">
                  {visible.filter(file => file.path.startsWith('docs/')).map(file => (
                    <li key={file.path}>
                      <Button variant="ghost" className="tree-row" aria-current={selected === file.path && !blockId} onClick={() => onSelect(file)}>
                        <FileText />
                        overview.md
                        <span className="file-count">2</span>
                      </Button>
                      <ul className="nested">
                        {file.blocks.map((block, index) => (
                          <li key={block.id}>
                            <Button variant="ghost" className="tree-row" aria-current={blockId === block.id} onClick={() => onSelect(file, block.id)}>
                              <span className="block-number">
                                0
                                {index + 1}
                              </span>
                              {block.title}
                              {drafts[block.id]?.source !== drafts[block.id]?.saved && <span className="dirty-dot" aria-label="Unsaved changes" />}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
          {visible.filter(file => !file.path.startsWith('docs/')).map(file => (
            <li key={file.path}>
              <Button variant="ghost" className="tree-row" aria-current={selected === file.path} onClick={() => onSelect(file)}>
                {file.blocks.length ? <FileCode2 /> : <FileText />}
                {file.path}
              </Button>
            </li>
          ))}
        </ul>
        {visible.length === 0 && <p className="muted text-xs p-2">{empty ? 'No supported files' : 'No matching files'}</p>}
      </nav>
      <div className="tree-bottom">
        <span>Project files</span>
        <span className="muted">.mmd · .mermaid · .md</span>
      </div>
    </aside>
  )
}

function App() {
  const { theme, setTheme } = useTheme()
  const [selected, setSelected] = React.useState(files[0]?.path ?? '')
  const [blockId, setBlockId] = React.useState('pipeline')
  const [drafts, setDrafts] = React.useState(initialDrafts)
  const [pane, setPane] = React.useState('preview')
  const [reviewOpen, setReviewOpen] = React.useState(false)
  const [treeOpen, setTreeOpen] = React.useState(false)
  const [conflictOpen, setConflictOpen] = React.useState(false)
  const [scenario, setScenario] = React.useState<Scenario>('Ready')
  const [error, setError] = React.useState('')
  const [saveMessage, setSaveMessage] = React.useState('All changes saved')
  const lines = React.useRef<HTMLPreElement>(null)
  const timers = React.useRef(new Set<number>())
  const file = files.find(item => item.path === selected)
  const block = file?.blocks.find(item => item.id === blockId)
  const draft = drafts[blockId]
  const dirty = !!draft && draft.source !== draft.saved
  const canEdit = !!block && !['Empty project', 'No selection', 'Loading', 'Session expired'].includes(scenario)
  const save = React.useCallback(() => {
    if (!draft || !dirty || draft.saving || scenario !== 'Ready')
      return
    if (draft.remote !== null) {
      setConflictOpen(true)
      return
    }
    const submitted = draft.source
    const submittedId = blockId
    setDrafts(previous => ({ ...previous, [submittedId]: { ...draft, saving: true } }))
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      setDrafts((previous) => {
        const current = previous[submittedId]
        if (!current)
          return previous
        return { ...previous, [submittedId]: { ...current, saved: current.remote === null ? submitted : current.saved, saving: false } }
      })
      setSaveMessage('Saved just now')
    }, 650)
    timers.current.add(timer)
  }, [draft, dirty, scenario, blockId])

  React.useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        save()
      }
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.values(drafts).some(item => item.source !== item.saved))
        event.preventDefault()
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [save, drafts])
  React.useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(timer => window.clearTimeout(timer))
  }, [])

  function selectFile(next: ProjectFile, id?: string) {
    setSelected(next.path)
    setBlockId(id ?? next.blocks[0]?.id ?? '')
    setError('')
    setTreeOpen(false)
    setScenario('Ready')
  }
  function externalChange() {
    if (!draft)
      return
    const remote = `${draft.saved}\n    %% Updated outside this editor`
    setDrafts(previous => ({ ...previous, [blockId]: { ...draft, remote } }))
    setReviewOpen(false)
  }
  function useRemote() {
    if (!draft || draft.remote === null)
      return
    setDrafts(previous => ({ ...previous, [blockId]: { source: draft.remote ?? draft.saved, saved: draft.remote ?? draft.saved, remote: null, saving: false } }))
    setConflictOpen(false)
    setSaveMessage('File version loaded')
  }
  const treeProps = { selected, blockId, drafts, onSelect: selectFile, empty: scenario === 'Empty project' }
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  return (
    <div className="workspace" data-screen-label="Diagram workspace">
      <header className="app-header">
        <div className="brand">
          <MerdeckMark className="brand-symbol" />
          <span className="brand-name">Merdeck</span>
          <span className="project-crumb">
            /
            <Folder size={14} />
            <strong>sample-project</strong>
          </span>
        </div>
        <div className="header-actions">
          <span className="prototype-tag">PROTOTYPE</span>
          <Button variant="ghost" aria-label={`Theme: ${theme}`} onClick={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')}>
            <ThemeIcon />
            <span className="theme-label">
              {theme[0]?.toUpperCase()}
              {theme.slice(1)}
            </span>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Prototype review" onClick={() => setReviewOpen(true)}><Info /></Button>
        </div>
      </header>
      <div className="workspace-body">
        <FileTree {...treeProps} />
        <main className="editor-workspace">
          <div className="file-bar">
            <div className="file-title">
              <Button className="tree-toggle" variant="ghost" size="icon" aria-label="Open project files" onClick={() => setTreeOpen(true)}><PanelLeft /></Button>
              <FileCode2 className="desktop-only" />
              <div>
                <h1>{file?.path ?? 'Project files'}</h1>
                <p>{block ? `${block.title} · ${file?.blocks.length === 2 ? 'Markdown diagram' : 'Mermaid file'}` : 'Choose a diagram to begin'}</p>
              </div>
            </div>
            <div className="file-actions">
              <span className="save-status" role="status">
                {draft?.saving
                  ? 'Saving…'
                  : dirty
                    ? (
                        <>
                          <span className="dirty-dot" />
                          Unsaved
                        </>
                      )
                    : (
                        <>
                          <Check />
                          Saved
                        </>
                      )}
              </span>
              <Button disabled={!dirty || draft?.saving || scenario !== 'Ready'} onClick={save}>
                Save
                <kbd>⌘ S</kbd>
              </Button>
            </div>
          </div>
          {draft?.remote !== null && draft?.remote !== undefined && (
            <div className="notice" role="alert">
              <Info size={16} />
              <span>This file changed outside the editor. Your draft is safe.</span>
              <Button variant="outline" size="sm" onClick={() => setConflictOpen(true)}>Review change</Button>
            </div>
          )}
          {['Disconnected', 'File deleted'].includes(scenario) && (
            <div className="notice" role="alert">
              <Unplug size={16} />
              <span>{scenario === 'Disconnected' ? 'Connection lost. Your draft is kept here until you reconnect.' : 'This file was deleted. Your draft is kept here; saving is unavailable.'}</span>
              <Button variant="outline" onClick={() => setScenario('Ready')}>{scenario === 'Disconnected' ? 'Reconnect' : 'Restore preview'}</Button>
            </div>
          )}
          {canEdit && block && draft
            ? (
                <>
                  {file && file.blocks.length > 1 && (
                    <div className="block-bar">
                      <span>DIAGRAM</span>
                      <Tabs value={blockId} onValueChange={value => selectFile(file, String(value))}>
                        <TabsList variant="line" aria-label="Markdown blocks">
                          {file.blocks.map((item, index) => (
                            <TabsTrigger key={item.id} value={item.id}>
                              {index + 1}
                              .
                              {' '}
                              {item.title}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {file.blocks.map(item => <TabsContent key={item.id} value={item.id} className="sr-only">{item.title}</TabsContent>)}
                      </Tabs>
                    </div>
                  )}
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
                  <div className="panes" data-pane={pane}>
                    <section className="source-pane" aria-label="Source editor">
                      <div className="pane-heading">
                        <label htmlFor="diagram-source">Source</label>
                        <span className="muted">Mermaid</span>
                      </div>
                      <div className="source-body">
                        <pre ref={lines} className="line-numbers" aria-hidden="true">{draft.source.split('\n').map((_line, index) => index + 1).join('\n')}</pre>
                        <Textarea
                          id="diagram-source"
                          aria-label="Mermaid source"
                          aria-invalid={!!error}
                          aria-describedby={error ? 'source-error' : undefined}
                          spellCheck={false}
                          className="source-input"
                          value={draft.source}
                          onScroll={(event) => {
                            if (lines.current)
                              lines.current.scrollTop = event.currentTarget.scrollTop
                          }}
                          onChange={(event) => {
                            const source = event.target.value
                            setDrafts(previous => ({ ...previous, [blockId]: { ...draft, source } }))
                          }}
                        />
                      </div>
                      {error && (
                        <div id="source-error" className="source-error">
                          <strong>Syntax needs attention</strong>
                          <pre>{error.slice(0, 800)}</pre>
                        </div>
                      )}
                      <div className="pane-footer">
                        <span>
                          {draft.source.split('\n').length}
                          {' '}
                          lines · UTF-8
                        </span>
                        <span>{file?.blocks.length === 2 ? `Block starts at line ${block.line}` : 'Entire file'}</span>
                      </div>
                    </section>
                    <Preview key={blockId} source={draft.source} title={block.title} onError={setError} />
                  </div>
                </>
              )
            : (
                <div className="empty-state">
                  <FolderOpen />
                  <h2>{scenario === 'Loading' ? 'Opening project…' : scenario === 'Session expired' ? 'Your session has expired' : scenario === 'Empty project' ? 'No diagrams here yet' : scenario === 'No selection' ? 'Choose a diagram' : 'No Mermaid blocks'}</h2>
                  <p>{scenario === 'Session expired' ? 'Reconnect to your project to continue. Your unsaved drafts are still here.' : scenario === 'Empty project' ? 'This project has no .mmd, .mermaid or Markdown diagrams.' : scenario === 'No selection' ? 'Select a file or a Markdown block from the explorer.' : scenario === 'Loading' ? 'Reading the project file list.' : 'This Markdown file has no Mermaid fences. Choose another file from the explorer.'}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      selectFile(files[0]!)
                      setScenario('Ready')
                    }}
                  >
                    {scenario === 'Session expired' ? 'Reconnect to project' : 'Open overview.md'}
                  </Button>
                </div>
              )}
        </main>
      </div>
      <footer className="status-bar">
        <span>
          <ShieldCheck />
          {scenario === 'Disconnected' ? 'Disconnected' : 'sample-project'}
          <span className="desktop-only">
            /
            {selected}
          </span>
        </span>
        <span aria-live="polite">
          {draft?.remote ? 'External change detected' : dirty ? 'Draft kept in this session' : saveMessage}
          <span className="desktop-only">· Local prototype</span>
        </span>
      </footer>
      <Dialog open={treeOpen} onOpenChange={setTreeOpen}>
        <DialogContent className="file-drawer">
          <DialogTitle>Project files</DialogTitle>
          <DialogDescription>Select a file or a diagram block.</DialogDescription>
          <FileTree {...treeProps} />
        </DialogContent>
      </Dialog>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="review-content">
          <DialogTitle>Prototype review</DialogTitle>
          <DialogDescription>Explore the editing experience. Design status: needs review.</DialogDescription>
          <p>This standalone prototype renders real Mermaid. Files, saves, connection events and conflicts are simulated in memory. It never reads or writes server files. Refreshing resets drafts and saves.</p>
          <div className="review-section">
            <strong>Appearance</strong>
            <div className="review-actions">
              {(['light', 'dark', 'system'] as const).map(value => (
                <Button key={value} variant={theme === value ? 'secondary' : 'outline'} onClick={() => setTheme(value)}>
                  {value[0]?.toUpperCase()}
                  {value.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <div className="review-section">
            <strong>Workspace states</strong>
            <div className="review-actions">
              {scenarios.map(value => (
                <Button
                  key={value}
                  variant={scenario === value ? 'secondary' : 'outline'}
                  onClick={() => {
                    setScenario(value)
                    setReviewOpen(false)
                  }}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
          <div className="review-section">
            <strong>External change</strong>
            <p className="muted">Edit the source, then simulate a file change to explore conflict recovery. The file version replaces your draft only after an explicit choice.</p>
            <Button variant="outline" disabled={!draft} onClick={externalChange}>Simulate external change</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="review-content">
          <DialogTitle>Review the file change</DialogTitle>
          <DialogDescription>Saving is paused because the file version changed. Keep your draft to review it, or discard it and load the file version.</DialogDescription>
          <div>
            <strong>Your draft</strong>
            <pre className="compare-source">{draft?.source}</pre>
            <strong>File version</strong>
            <pre className="compare-source">{draft?.remote}</pre>
          </div>
          <div className="review-actions">
            <Button variant="outline" onClick={() => setConflictOpen(false)}>Keep draft</Button>
            <Button onClick={useRemote}>Discard draft and load file</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const root = document.getElementById('root')
if (!root)
  throw new Error('Missing prototype root')
createRoot(root).render(<ThemeProvider><App /></ThemeProvider>)
