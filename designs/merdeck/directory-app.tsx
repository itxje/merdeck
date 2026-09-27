import { ChevronRight, FileCode2, FileText, Folder, PanelLeft } from 'lucide-react'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/app/theme'
import { ThemeToggle } from '@/app/theme-toggle'
import { Preview } from '@/features/preview/preview'
import { MerdeckMark } from '@/shared/components/brand/merdeck-mark'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { fixturePages, fixtureSources, loadedRows, visibleRows } from './directory-model'
import './directory-style.css'

// Fixture-only state: no filesystem, API request, wire cursor or persistent draft storage.
function DirectoryApp() {
  const [directory, setDirectory] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [kind, setKind] = React.useState('all')
  const [path, setPath] = React.useState('overview.mmd')
  const [block, setBlock] = React.useState(0)
  const [drafts, setDrafts] = React.useState<Record<string, string[]>>({})
  const [saved, setSaved] = React.useState<Record<string, string[]>>({})
  const [read, setRead] = React.useState<Record<string, boolean>>({ 'overview.mmd': true })
  const [reading, setReading] = React.useState('')
  const [mode, setMode] = React.useState('ready')
  const [drawer, setDrawer] = React.useState(false)
  const [review, setReview] = React.useState(false)
  const [pane, setPane] = React.useState('preview')
  const [syntax, setSyntax] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => () => {
    if (pending.current)
      clearTimeout(pending.current)
  }, [])
  const baseline = saved[path] ?? fixtureSources(path)
  const sources = drafts[path] ?? baseline
  const source = sources[block] ?? ''
  const dirty = sources.some((value, index) => value !== baseline[index])
  const pages = fixturePages(directory)
  const rows = loadedRows(directory, page)
  const shown = visibleRows(rows, search, kind)
  const busy = mode === 'loading'
  const stale = mode === 'stale' || mode === 'error'
  const browse = (next: string) => {
    setDirectory(next)
    setPage(1)
    setMode('ready')
    setSearch('')
    setNotice('')
  }
  const restart = () => {
    setMode('ready')
    setPage(1)
    setNotice('Listing restarted from page 1. Your editor is unchanged.')
  }
  const select = (next: string, index = 0) => {
    const parent = next.split('/').slice(0, -1).join('/')
    if (parent !== directory)
      browse(parent)
    setPath(next)
    setBlock(index)
    setDrawer(false)
    setSyntax('')
    if (!read[next]) {
      if (pending.current)
        clearTimeout(pending.current)
      setReading(next)
      pending.current = setTimeout(() => {
        setRead(previous => ({ ...previous, [next]: true }))
        setReading('')
      }, 400)
    }
  }
  const edit = (value: string) => setDrafts(previous => ({ ...previous, [path]: sources.map((item, index) => index === block ? value : item) }))
  const save = React.useCallback(() => {
    if (!dirty)
      return
    setSaved(previous => ({ ...previous, [path]: [...sources] }))
  }, [dirty, path, sources])
  React.useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [save])
  const retained = Object.keys(drafts).filter(name => drafts[name]?.some((value, index) => value !== (saved[name] ?? fixtureSources(name))[index]))
  const explorer = (
    <aside className="file-tree directory-tree" aria-label="Project files">
      <div className="tree-heading">
        <span>EXPLORER</span>
        <span className="muted">Directory view</span>
      </div>
      <nav className="directory-crumbs" aria-label="Directory ancestors">
        <Button variant="ghost" size="sm" onClick={() => browse('')} aria-current={directory === '' ? 'location' : undefined}>Root</Button>
        {directory.split('/').filter(Boolean).map((part, index, parts) => (
          <React.Fragment key={parts.slice(0, index + 1).join('/')}>
            <ChevronRight aria-hidden="true" />
            <Button variant="ghost" size="sm" onClick={() => browse(parts.slice(0, index + 1).join('/'))} aria-current={index === parts.length - 1 ? 'location' : undefined}>{part}</Button>
          </React.Fragment>
        ))}
      </nav>
      <div className="directory-tools">
        <Button variant="outline" size="sm" disabled={!directory} onClick={() => browse(directory.split('/').slice(0, -1).join('/'))}>Up</Button>
        <Button variant="ghost" size="sm" onClick={restart}>Restart</Button>
      </div>
      <div className="directory-filter">
        <Input aria-label="Filter loaded files" placeholder="Filter loaded files…" value={search} onChange={event => setSearch(event.target.value)} />
        <Tabs value={kind} onValueChange={value => setKind(String(value))}>
          <TabsList aria-label="File types">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mermaid">Mermaid</TabsTrigger>
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
          </TabsList>
        </Tabs>
        <p>Loaded window only. Folders always shown.</p>
      </div>
      <div className="directory-rows" aria-busy={busy}>
        {busy && <p className="tree-hint" role="status">Loading directory… Editor and drafts are kept.</p>}
        {stale && (
          <p className="tree-hint" role="alert">
            {mode === 'stale' ? 'Listing expired or changed. Rows are stale.' : 'Directory unavailable. Rows are stale.'}
            {' '}
            Restart, or use Up / Root. Your draft is kept.
          </p>
        )}
        {mode === 'depth' && <p className="tree-hint" role="status">Directory depth limit reached. Contents are not listed. Use Up / Root.</p>}
        {notice && <p className="tree-hint" role="status">{notice}</p>}
        {!busy && mode !== 'depth' && (
          <ul className="directory-list" data-stale={stale || undefined}>
            {shown.map((row) => {
              const name = directory ? `${directory}/${row.name}` : row.name
              const Icon = row.folder ? Folder : row.markdown ? FileText : FileCode2
              return (
                <li key={name}>
                  <Button className="tree-row" variant="ghost" aria-current={path === name ? 'true' : undefined} onClick={() => row.folder ? browse(name) : select(name)}>
                    <Icon className={row.folder ? 'folder-icon' : ''} />
                    <span className="truncate">{row.name}</span>
                    {row.folder ? <ChevronRight className="directory-chevron" /> : !read[name] && <span className="file-count">Unopened</span>}
                  </Button>
                  {row.markdown && read[name] && path === name && !name.endsWith('unreadable.md') && (
                    <div className="directory-blocks">
                      {fixtureSources(name).map((_value, index) => <Button key={index} variant="ghost" size="sm" aria-current={block === index ? 'true' : undefined} onClick={() => select(name, index)}>{`Diagram ${index + 1}`}</Button>)}
                      {!fixtureSources(name).length && <span className="muted">No Mermaid blocks</span>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {!busy && !stale && mode !== 'depth' && !shown.length && (
          <p className="tree-hint">
            {rows.length ? 'No matching files in the loaded window.' : 'No supported entries in this directory.'}
            {' '}
            This does not prove the folder is empty on disk.
          </p>
        )}
      </div>
      <div className="directory-pagination">
        <span>{`Pages ${Math.max(1, page - 4)}–${page} · ${rows.filter(row => !row.folder).length} loaded files`}</span>
        {page > 5 && <p role="status">Earlier pages are no longer shown. Restart to see them.</p>}
        <Button
          variant="outline"
          disabled={busy || stale || mode === 'depth' || page >= pages.length}
          onClick={() => {
            setPage(value => value + 1)
            setNotice('')
          }}
        >
          Next page
        </Button>
        <span className="muted">{mode === 'depth' ? 'Contents not enumerated.' : busy || stale ? 'Listing is not current.' : page < pages.length ? 'More entries may exist.' : 'End of this listing.'}</span>
      </div>
      {retained.length > 0 && (
        <div className="directory-drafts">
          <strong>UNSAVED DRAFTS</strong>
          {retained.map(name => (
            <Button key={name} variant="ghost" size="sm" onClick={() => select(name)}>
              <span className="dirty-dot" />
              {name}
            </Button>
          ))}
        </div>
      )}
    </aside>
  )
  return (
    <div className="workspace directory-workspace" data-screen-label="Directory navigation">
      <header className="app-header">
        <div className="brand">
          <MerdeckMark className="brand-symbol" aria-hidden="true" />
          <span className="brand-name">Merdeck</span>
        </div>
        <div className="header-file">
          <Dialog open={drawer} onOpenChange={setDrawer}>
            <DialogTrigger render={<Button className="tree-toggle" variant="ghost" size="icon" aria-label="Open project files" />}><PanelLeft /></DialogTrigger>
            <DialogContent className="file-drawer directory-drawer">
              <DialogTitle>Project files</DialogTitle>
              <DialogDescription>Browse folders without closing your editor.</DialogDescription>
              {explorer}
            </DialogContent>
          </Dialog>
          <h1>{path}</h1>
        </div>
        <div className="header-actions">
          <span className="save-status" role="status">{dirty ? 'Unsaved' : 'Up to date'}</span>
          <Button disabled={!dirty} onClick={save}>Save</Button>
          <ThemeToggle />
        </div>
      </header>
      <div className="workspace-body">
        {explorer}
        <main className="editor-workspace">
          <Tabs className="mobile-panes" value={pane} onValueChange={value => setPane(String(value))}>
            <TabsList aria-label="Workspace pane">
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="directory-editor-context"><span>{`Browsing /${directory} · Editor stays on ${path}`}</span></div>
          {reading === path
            ? (
                <div className="empty-state" role="status">
                  <h2>Reading document…</h2>
                  <p>Diagram blocks are loaded when you open a file.</p>
                </div>
              )
            : path.endsWith('unreadable.md')
              ? (
                  <div className="empty-state" role="alert">
                    <h2>Document unavailable</h2>
                    <p>This fixture demonstrates a failed document read. Other files and retained drafts remain accessible.</p>
                    <Button variant="outline" onClick={() => select('overview.mmd')}>Open overview</Button>
                  </div>
                )
              : !sources.length
                  ? (
                      <div className="empty-state">
                        <h2>No Mermaid blocks</h2>
                        <p>The document was read successfully. Choose another file from the explorer.</p>
                      </div>
                    )
                  : (
                      <div className="panes directory-panes" data-pane={pane}>
                        <section className="source-pane" aria-label="Source editor">
                          <div className="pane-heading">
                            <label htmlFor="directory-source">Source</label>
                            <span className="muted">{path.endsWith('.md') ? `Diagram ${block + 1}` : 'Mermaid'}</span>
                          </div>
                          <div className="source-body">
                            <pre className="line-numbers" aria-hidden="true">{source.split('\n').map((_line, index) => index + 1).join('\n')}</pre>
                            <Textarea id="directory-source" aria-label="Mermaid source" className="source-input" spellCheck={false} value={source} onChange={event => edit(event.target.value)} />
                          </div>
                          {syntax && <p className="source-error" role="status">{syntax}</p>}
                          <div className="pane-footer">Drafts stay in this tab · Ctrl / ⌘ S saves the fixture</div>
                        </section>
                        <Preview source={source} title={path} onError={setSyntax} onSourceChange={edit} />
                      </div>
                    )}
        </main>
      </div>
      <footer className="status-bar">
        <span>0.8.4 · Directory prototype · No server writes</span>
        <Dialog open={review} onOpenChange={setReview}>
          <DialogTrigger render={<Button variant="ghost" size="sm" />}>Prototype states</DialogTrigger>
          <DialogContent>
            <DialogTitle>Directory review</DialogTitle>
            <DialogDescription>Assumed visual defaults. This fixture is needs-review, not an approved design. Refresh resets draft and navigation state.</DialogDescription>
            <div className="directory-review">
              {['ready', 'loading', 'error', 'stale', 'depth'].map(value => (
                <Button
                  key={value}
                  variant="outline"
                  onClick={() => {
                    setMode(value)
                    setReview(false)
                  }}
                >
                  {value}
                </Button>
              ))}
            </div>
            <p className="muted">Explore archive for seven small fixture pages, docs for deferred Markdown, and empty for no supported entries. Production pages use the existing bounded contract.</p>
          </DialogContent>
        </Dialog>
      </footer>
    </div>
  )
}
const root = document.getElementById('root')
if (!root)
  throw new Error('Missing root')
createRoot(root).render(<ThemeProvider><TooltipProvider><DirectoryApp /></TooltipProvider></ThemeProvider>)
