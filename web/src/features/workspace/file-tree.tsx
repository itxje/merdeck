import type { DiagramBlockSummary } from '../../../../src/shared/contracts'
import type { Drafts, FileDraft } from './drafts'
import type { EntryAction } from './entries'
import type { FileFilter } from './file-filter'
import type { useDirectory } from './use-directory'
import type { SearchView } from './use-directory-search'
import { ArrowUp, ChevronRight, FileCode2, FilePlus2, FileText, Folder, FolderPlus, MoreHorizontal, RefreshCw, Search } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { errorMessage, parentDirectory } from './api'
import { dirty } from './drafts'
import { fileExtensions } from './file-filter'

interface Props {
  listing: ReturnType<typeof useDirectory>
  directory: string
  browse: (path: string) => void
  drafts: Drafts
  path: string
  block: number
  select: (path: string, block?: number) => void
  refresh: () => void
  canChange: boolean
  onAction: (action: EntryAction) => void
  kinds: FileFilter
  chooseKinds: (next: FileFilter) => void
  filterRef?: React.Ref<HTMLInputElement>
  // With a search source the filter box and a chosen file type search this folder and its subfolders instead of the loaded window.
  search?: SearchView | undefined
  onQueryChange?: ((query: string) => void) | undefined
}
interface DiagramListProps { file: string, blocks: DiagramBlockSummary[], draft: FileDraft | undefined, open: boolean, block: number, select: Props['select'] }
interface MenuItem { label: string, onSelect: () => void, disabled?: boolean, destructive?: boolean, separated?: boolean }

const fileFilters: { value: FileFilter, text: string, label: string }[] = [
  { value: 'all', text: 'All', label: 'All files' },
  { value: 'mermaid', text: '.mmd', label: '.mmd and .mermaid files' },
  { value: 'markdown', text: '.md', label: '.md files' },
]

// Diagram rows of one Markdown file; only the selected diagram is the current row.
function DiagramList({ file, blocks, draft, open, block, select }: DiagramListProps) {
  return (
    <ul className="nested" aria-label={`Diagrams in ${file.split('/').at(-1)}`}>
      {blocks.map((item, index) => (
        <li key={item.selector.kind === 'markdown' ? item.selector.id : 'standalone'}>
          <Button variant="ghost" className="tree-row" aria-current={open && block === index} title={item.label} onClick={() => select(file, index)}>
            <span className="block-number">{String(index + 1).padStart(2, '0')}</span>
            {' '}
            <span className="truncate">{item.label}</span>
            {draft && draft.sources[index] !== draft.baseline.blocks[index]?.source && <span className="dirty-dot" aria-label="Unsaved changes" />}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function HeadingAction({ label, disabled, onClick, children }: { label: string, disabled?: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

// One menu per row; right-click opens the same menu through its controlled state.
function RowMenu({ name, open, onOpenChange, items }: { name: string, open: boolean, onOpenChange: (open: boolean) => void, items: MenuItem[] }) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="row-actions" aria-label={`Actions for ${name}`} />}>
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {items.map(item => (
          <React.Fragment key={item.label}>
            {item.separated && <DropdownMenuSeparator />}
            <DropdownMenuItem variant={item.destructive ? 'destructive' : 'default'} disabled={item.disabled} onClick={item.onSelect}>{item.label}</DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function shortcuts(rename: MenuItem, remove: MenuItem) {
  return (event: React.KeyboardEvent) => {
    const item = event.key === 'F2' ? rename : event.key === 'Delete' ? remove : undefined
    if (!item || item.disabled)
      return
    event.preventDefault()
    item.onSelect()
  }
}

const names = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
function byName(a: { kind: string, path: string }, b: { kind: string, path: string }) {
  if (a.kind !== b.kind)
    return a.kind === 'directory' ? -1 : 1
  return names.compare(a.path.slice(a.path.lastIndexOf('/') + 1), b.path.slice(b.path.lastIndexOf('/') + 1)) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
}

export function FileTree({ listing, directory, browse, drafts, path, block, select, refresh, canChange, onAction, kinds, chooseKinds, filterRef, search, onQueryChange }: Props) {
  const crumbsRef = React.useRef<HTMLElement>(null)
  const focusDirectoryRef = React.useRef(false)
  const openDirectory = (next: string) => {
    focusDirectoryRef.current = next !== directory
    browse(next)
  }
  React.useEffect(() => {
    if (focusDirectoryRef.current) {
      focusDirectoryRef.current = false
      crumbsRef.current?.querySelector<HTMLButtonElement>('[aria-current="location"]')?.focus()
    }
  }, [directory])
  const [filter, setFilter] = React.useState('')
  const [menu, setMenu] = React.useState<string | null>(null)
  const { entries, loading, error } = listing
  const failed = !!error
  const files = entries.filter(item => item.kind === 'file')
  const listed = files.filter(item => kinds === 'all' || item.fileKind === kinds)
  const matches = (value: string) => value.toLowerCase().includes(filter.toLowerCase())
  const shown = listed.filter(item => matches(item.path))
  // Unloaded descendants never hide a folder, even while file filters are active. The server pages in
  // native directory order, so the loaded window is sorted here: folders first, then names with numbers
  // compared by value, so `2-a` precedes `10-a`.
  const visible = entries.filter(item => item.kind === 'directory' || shown.includes(item)).sort(byName)
  const typed = filter.trim()
  const searching = !!search && (typed.length > 0 || kinds !== 'all')
  // A result only belongs to the folder, text and file type it was searched for.
  const found = search?.result && search.result.path === directory && search.result.query === typed && (search.result.kind ?? 'all') === kinds ? search.result : undefined
  const results = found && [...found.entries].sort((a, b) => names.compare(a.path, b.path))
  // Drafts whose files have no row on screen stay reachable below the listing or the search results alike.
  const rows = searching ? results ?? [] : shown
  const retained = Object.entries(drafts).filter(([name, file]) => (dirty(file) || file.locked) && !rows.some(entry => entry.path === name))
  // An empty settled folder can size its mobile drawer to its controls and status instead of reserving list space.
  const compact = !searching && !loading && !failed && !listing.depth && !visible.length && !retained.length
  const retainedDrafts = retained.length > 0 && (
    <>
      <div className="tree-heading">RETAINED DRAFTS</div>
      <ul>
        {retained.map(([name, draft]) => {
          const open = path === name
          const diagrams = draft.baseline.kind === 'markdown' && draft.baseline.blocks.length > 0
          return (
            <li key={name}>
              <Button variant="ghost" className="tree-row" aria-current={open && !diagrams} data-open={(open && diagrams) || undefined} onClick={() => select(name)}>
                <span className="tree-twistie" />
                <FileText />
                <span className="truncate">{name}</span>
                <span className="dirty-dot" />
              </Button>
              {diagrams && <DiagramList file={name} blocks={draft.baseline.blocks} draft={draft} open={open} block={block} select={select} />}
            </li>
          )
        })}
      </ul>
    </>
  )
  const folder = directory
  const rowMenu = (target: string) => ({
    open: menu === target,
    onOpenChange: (open: boolean) => setMenu(open ? target : null),
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault()
      setMenu(target)
    },
  })
  return (
    <aside className="file-tree" data-compact={compact || undefined} aria-label="Project files">
      <div className="tree-heading">
        <span>EXPLORER</span>
        <span className="tree-heading-actions">
          <HeadingAction label="New file" disabled={!canChange || listing.depth} onClick={() => onAction({ type: 'create', kind: 'file', parent: folder })}><FilePlus2 /></HeadingAction>
          <HeadingAction label="New folder" disabled={!canChange || listing.depth} onClick={() => onAction({ type: 'create', kind: 'directory', parent: folder })}><FolderPlus /></HeadingAction>
          <HeadingAction label="Refresh files" onClick={refresh}><RefreshCw /></HeadingAction>
        </span>
      </div>
      <nav ref={crumbsRef} className="directory-crumbs" aria-label="Directory breadcrumbs">
        <Button variant="ghost" size="sm" aria-current={!directory ? 'location' : undefined} onClick={() => openDirectory('')}>Root</Button>
        {directory.split('/').filter(Boolean).map((part, index, parts) => (
          <React.Fragment key={parts.slice(0, index + 1).join('/')}>
            <ChevronRight aria-hidden="true" />
            <Button variant="ghost" size="sm" title={parts.slice(0, index + 1).join('/')} aria-current={index === parts.length - 1 ? 'location' : undefined} onClick={() => openDirectory(parts.slice(0, index + 1).join('/'))}>{part}</Button>
          </React.Fragment>
        ))}
      </nav>
      <div className="directory-tools">
        <Button variant="outline" size="sm" disabled={!directory} onClick={() => openDirectory(parentDirectory(directory))}>
          <ArrowUp />
          Up
        </Button>
        <Button variant="ghost" size="sm" disabled={listing.loading || listing.retryAt > 0} onClick={listing.restart}>Restart</Button>
      </div>
      <div className="tree-search">
        <Search aria-hidden="true" />
        <Input
          ref={filterRef}
          aria-label="Filter files"
          placeholder={search ? 'Search this folder and below…' : 'Find in loaded files…'}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value)
            onQueryChange?.(event.target.value)
          }}
        />
      </div>
      <div className="tree-kinds">
        <ToggleGroup
          size="sm"
          aria-label="File types"
          value={[kinds]}
          onValueChange={(value) => {
            // Pressing the current choice again reports no value; keep exactly one choice.
            const next = fileFilters.find(option => option.value === value[0])
            if (next)
              chooseKinds(next.value)
          }}
        >
          {fileFilters.map(option => (
            <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>{option.text}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="directory-scope">{search ? 'Search and file types look in this folder and its subfolders.' : 'Filters apply to loaded files. Folders stay visible.'}</p>
      {searching && search && (
        <nav aria-label="Search results" aria-busy={search.pending}>
          {search.pending && <p className="tree-hint" role="status">Searching…</p>}
          {!search.pending && !!search.error && <p className="tree-hint" role="alert">{errorMessage(search.error)}</p>}
          {!search.pending && results && !results.length && <p className="tree-hint" role="status">{typed ? 'No matches in this folder or below' : `No ${fileExtensions[kinds].join(' or ')} files in this folder or below`}</p>}
          {!search.pending && found && !found.complete && (
            <p className="tree-hint" role="status">
              {found.stoppedBy !== 'matches' ? 'The search stopped before every subfolder was read. Refine it or open a subfolder.' : typed ? 'Showing the first 200 matches. Refine the search to see the rest.' : 'Showing the first 200 files. Type a name or open a subfolder to see the rest.'}
            </p>
          )}
          {results && results.length > 0 && (
            <ul>
              {results.map((entry) => {
                const below = directory ? entry.path.slice(directory.length + 1) : entry.path
                const draft = entry.kind === 'file' ? drafts[entry.path] : undefined
                return (
                  <li key={entry.path} className="tree-entry" style={{ '--depth': 0 } as React.CSSProperties}>
                    <div className="tree-item">
                      <Button
                        variant="ghost"
                        className="tree-row"
                        title={entry.path}
                        aria-current={entry.kind === 'file' && path === entry.path}
                        onClick={() => {
                          if (entry.kind === 'directory') {
                            setFilter('')
                            onQueryChange?.('')
                            openDirectory(entry.path)
                          }
                          else {
                            select(entry.path)
                          }
                        }}
                      >
                        <span className="tree-twistie" />
                        {entry.kind === 'directory' ? <Folder className="folder-icon" /> : entry.fileKind === 'markdown' ? <FileText /> : <FileCode2 />}
                        <span className="truncate">{below}</span>
                        {draft && dirty(draft) && <span className="dirty-dot" aria-label="Unsaved changes" />}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {retainedDrafts}
        </nav>
      )}
      {/* The folder listing steps aside while a search is active, so its rows never duplicate a result. */}
      {!searching && (
        <nav aria-label="Files and diagrams" aria-busy={loading}>
          {loading && <p className="tree-hint" role="status">Loading directory…</p>}
          {failed && (
            <p className="tree-hint" role="alert">
              {errorMessage(error)}
              {' '}
              Restart, or use Up / Root.
            </p>
          )}
          {listing.retryAt > 0 && <p className="tree-hint" role="status">Too many requests. Restart will be available shortly.</p>}
          {listing.notice && <p className="tree-hint" role="status">{listing.notice}</p>}
          {listing.stale && <p className="tree-hint" role="status">Listing is not current.</p>}
          {listing.depth && <p className="tree-hint" role="status">Directory depth limit reached. Use Up / Root.</p>}
          <ul data-stale={listing.stale || undefined}>
            {visible.map((entry) => {
              const parts = entry.path.split('/')
              const depth = 0
              // Indentation and its guides come from the depth, so every row at one level shares a column.
              const indent = { '--depth': depth } as React.CSSProperties
              const name = parts.at(-1)!
              const menuState = rowMenu(entry.path)
              if (entry.kind === 'directory') {
                const rename: MenuItem = { label: 'Rename or move…', disabled: !canChange, separated: true, onSelect: () => onAction({ type: 'move', kind: 'directory', path: entry.path }) }
                const remove: MenuItem = { label: 'Delete…', destructive: true, disabled: !canChange, onSelect: () => onAction({ type: 'delete', kind: 'directory', path: entry.path }) }
                return (
                  <li key={entry.path} className="tree-entry" style={indent}>
                    <div className="tree-item" onContextMenu={menuState.onContextMenu}>
                      <Button
                        variant="ghost"
                        className="tree-row"
                        onKeyDown={shortcuts(rename, remove)}
                        onClick={() => openDirectory(entry.path)}
                      >
                        <span className="tree-twistie"><ChevronRight /></span>
                        <Folder className="folder-icon" />
                        <span className="truncate">{name}</span>
                      </Button>
                      <RowMenu
                        name={name}
                        open={menuState.open}
                        onOpenChange={menuState.onOpenChange}
                        items={[
                          { label: 'New file here…', disabled: !canChange || parts.length >= listing.maxPathDepth, onSelect: () => onAction({ type: 'create', kind: 'file', parent: entry.path }) },
                          { label: 'New folder here…', disabled: !canChange || parts.length >= listing.maxPathDepth, onSelect: () => onAction({ type: 'create', kind: 'directory', parent: entry.path }) },
                          rename,
                          remove,
                        ]}
                      />
                    </div>
                  </li>
                )
              }
              const draft = drafts[entry.path]
              const blocks = draft?.baseline.blocks ?? []
              const open = path === entry.path
              // Only the selected file or diagram is current; an open Markdown file with diagrams is marked as open instead.
              const diagrams = entry.fileKind === 'markdown' && blocks.length > 0
              const version = draft?.baseline.version
              const changeable = canChange && !draft?.saving
              const rename: MenuItem = { label: 'Rename or move…', disabled: !changeable, onSelect: () => onAction({ type: 'move', kind: 'file', path: entry.path, ...(version ? { version } : {}) }) }
              const remove: MenuItem = { label: 'Delete…', destructive: true, disabled: !changeable, onSelect: () => onAction({ type: 'delete', kind: 'file', path: entry.path, unsaved: !!draft && (dirty(draft) || draft.locked), ...(version ? { version } : {}) }) }
              return (
                <li key={entry.path} className="tree-entry" style={indent}>
                  <div className="tree-item" onContextMenu={menuState.onContextMenu}>
                    <Button variant="ghost" className="tree-row" aria-current={open && !diagrams} data-open={(open && diagrams) || undefined} title={entry.path} onKeyDown={shortcuts(rename, remove)} onClick={() => select(entry.path)}>
                      {/* An empty chevron column keeps a file's icon in line with the folders beside it. */}
                      <span className="tree-twistie" />
                      {entry.fileKind === 'markdown' ? <FileText /> : <FileCode2 />}
                      <span className="truncate">{name}</span>
                      {draft && dirty(draft) && <span className="dirty-dot" aria-label="Unsaved changes" />}
                      {!draft && <span className="file-count" aria-hidden="true">Unopened</span>}
                    </Button>
                    <RowMenu name={name} open={menuState.open} onOpenChange={menuState.onOpenChange} items={[rename, remove]} />
                  </div>
                  {draft && entry.fileKind === 'markdown' && !blocks.length && <p className="tree-hint">No Mermaid blocks</p>}
                  {diagrams && <DiagramList file={entry.path} blocks={blocks} draft={draft} open={open} block={block} select={select} />}
                </li>
              )
            })}
          </ul>
          {!loading && !failed && !listing.depth && !shown.length && (filter || !visible.length) && <p className="tree-hint">{filter ? 'No matching files in the loaded window' : kinds === 'all' ? 'No supported entries in this page window' : `No ${fileExtensions[kinds].join(' or ')} files in this page window`}</p>}
          {retainedDrafts}
        </nav>
      )}
      <div className="tree-bottom">
        <span className="muted">
          {listed.length}
          {' '}
          {listed.length === 1 ? 'loaded file' : 'loaded files'}
          {` · ${fileExtensions[kinds].join(' · ')}`}
        </span>
        <span>{`Pages ${listing.firstPage}–${listing.lastPage || 1}`}</span>
        {listing.firstPage > 1 && <span role="status">Earlier pages are no longer shown. Restart to see them.</span>}
        <Button variant="outline" disabled={!listing.canNext} onClick={listing.next}>Next page</Button>
        <span>{listing.depth ? 'Contents not listed.' : listing.complete && !listing.stale ? 'End of this listing.' : 'More entries may exist.'}</span>
      </div>
    </aside>
  )
}
