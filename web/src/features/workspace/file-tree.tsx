import type { DiagramBlockSummary, TreeSnapshot } from '../../../../src/shared/contracts'
import type { Drafts, FileDraft } from './drafts'
import type { EntryAction } from './entries'
import { ChevronDown, ChevronRight, FileCode2, FilePlus2, FileText, FolderOpen, FolderPlus, MoreHorizontal, RefreshCw, Search } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { dirty } from './drafts'

interface Props {
  tree: TreeSnapshot | undefined
  drafts: Drafts
  path: string
  block: number
  select: (path: string, block?: number) => void
  refresh: () => void
  loading: boolean
  failed: boolean
  canChange: boolean
  onAction: (action: EntryAction) => void
  filterRef?: React.Ref<HTMLInputElement>
}
interface DiagramListProps { file: string, blocks: DiagramBlockSummary[], draft: FileDraft | undefined, open: boolean, block: number, select: Props['select'] }
interface MenuItem { label: string, onSelect: () => void, disabled?: boolean, destructive?: boolean, separated?: boolean }

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

export function FileTree({ tree, drafts, path, block, select, refresh, loading, failed, canChange, onAction, filterRef }: Props) {
  const [filter, setFilter] = React.useState('')
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set())
  const [menu, setMenu] = React.useState<string | null>(null)
  const entries = tree?.entries ?? []
  const files = entries.filter(item => item.kind === 'file')
  const visible = entries.filter(item => item.path.toLowerCase().includes(filter.toLowerCase()) || (item.kind === 'directory' && files.some(file => file.path.startsWith(`${item.path}/`) && file.path.toLowerCase().includes(filter.toLowerCase()))))
  const retained = Object.entries(drafts).filter(([name, file]) => (dirty(file) || file.locked) && !files.some(entry => entry.path === name))
  const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  const rowMenu = (target: string) => ({
    open: menu === target,
    onOpenChange: (open: boolean) => setMenu(open ? target : null),
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault()
      setMenu(target)
    },
  })
  return (
    <aside className="file-tree" aria-label="Project files">
      <div className="tree-heading">
        <span>EXPLORER</span>
        <span className="tree-heading-actions">
          <HeadingAction label="New file" disabled={!canChange} onClick={() => onAction({ type: 'create', kind: 'file', parent: folder })}><FilePlus2 /></HeadingAction>
          <HeadingAction label="New folder" disabled={!canChange} onClick={() => onAction({ type: 'create', kind: 'directory', parent: folder })}><FolderPlus /></HeadingAction>
          <HeadingAction label="Refresh files" onClick={refresh}><RefreshCw /></HeadingAction>
        </span>
      </div>
      <div className="tree-search">
        <Search aria-hidden="true" />
        <Input ref={filterRef} aria-label="Filter files" placeholder="Find a file…" value={filter} onChange={event => setFilter(event.target.value)} />
      </div>
      <nav aria-label="Files and diagrams">
        {loading && <p className="tree-hint" role="status">Reading project files…</p>}
        {failed && <p className="tree-hint" role="alert">File list unavailable. Reconnect to refresh.</p>}
        <ul>
          {visible.map((entry) => {
            const parts = entry.path.split('/')
            if (!filter && parts.slice(0, -1).some((_, index) => collapsed.has(parts.slice(0, index + 1).join('/'))))
              return null
            const depth = Math.min(parts.length - 1, 6)
            const name = parts.at(-1)!
            const menuState = rowMenu(entry.path)
            if (entry.kind === 'directory') {
              const rename: MenuItem = { label: 'Rename or move…', disabled: !canChange, separated: true, onSelect: () => onAction({ type: 'move', kind: 'directory', path: entry.path }) }
              const remove: MenuItem = { label: 'Delete…', destructive: true, disabled: !canChange || entries.some(item => item.path.startsWith(`${entry.path}/`)), onSelect: () => onAction({ type: 'delete', kind: 'directory', path: entry.path }) }
              return (
                <li key={entry.path} style={{ paddingLeft: depth * 12 }}>
                  <div className="tree-item" onContextMenu={menuState.onContextMenu}>
                    <Button
                      variant="ghost"
                      className="tree-row"
                      aria-expanded={!collapsed.has(entry.path)}
                      onKeyDown={shortcuts(rename, remove)}
                      onClick={() => setCollapsed((previous) => {
                        const next = new Set(previous)

                        if (next.has(entry.path))
                          next.delete(entry.path); else
                          next.add(entry.path)

                        return next
                      })}
                    >
                      {collapsed.has(entry.path) ? <ChevronRight /> : <ChevronDown />}
                      <FolderOpen />
                      <span className="truncate">{name}</span>
                    </Button>
                    <RowMenu
                      name={name}
                      open={menuState.open}
                      onOpenChange={menuState.onOpenChange}
                      items={[
                        { label: 'New file here…', disabled: !canChange, onSelect: () => onAction({ type: 'create', kind: 'file', parent: entry.path }) },
                        { label: 'New folder here…', disabled: !canChange, onSelect: () => onAction({ type: 'create', kind: 'directory', parent: entry.path }) },
                        rename,
                        remove,
                      ]}
                    />
                  </div>
                </li>
              )
            }
            const draft = drafts[entry.path]
            const blocks = draft && (dirty(draft) || draft.locked || draft.saving) ? draft.baseline.blocks : entry.blocks
            const open = path === entry.path
            // Only the selected file or diagram is current; an open Markdown file with diagrams is marked as open instead.
            const diagrams = entry.fileKind === 'markdown' && blocks.length > 0
            const version = draft?.baseline.version ?? (entry.state === 'available' ? entry.version : undefined)
            const changeable = canChange && !!version && !draft?.saving
            const rename: MenuItem = { label: 'Rename or move…', disabled: !changeable, onSelect: () => onAction({ type: 'move', kind: 'file', path: entry.path, ...(version ? { version } : {}) }) }
            const remove: MenuItem = { label: 'Delete…', destructive: true, disabled: !changeable, onSelect: () => onAction({ type: 'delete', kind: 'file', path: entry.path, unsaved: !!draft && (dirty(draft) || draft.locked), ...(version ? { version } : {}) }) }
            return (
              <li key={entry.path} style={{ paddingLeft: depth * 12 }}>
                <div className="tree-item" onContextMenu={menuState.onContextMenu}>
                  <Button variant="ghost" className="tree-row" aria-current={open && !diagrams} data-open={(open && diagrams) || undefined} title={entry.path} onKeyDown={shortcuts(rename, remove)} onClick={() => select(entry.path)}>
                    {entry.fileKind === 'markdown' ? <FileText /> : <FileCode2 />}
                    <span className="truncate">{name}</span>
                    {draft && dirty(draft) && <span className="dirty-dot" aria-label="Unsaved changes" />}
                    {entry.state !== 'available' && <span className="file-count">{entry.state.replace('_', ' ')}</span>}
                  </Button>
                  <RowMenu name={name} open={menuState.open} onOpenChange={menuState.onOpenChange} items={[rename, remove]} />
                </div>
                {diagrams && <DiagramList file={entry.path} blocks={blocks} draft={draft} open={open} block={block} select={select} />}
              </li>
            )
          })}
        </ul>
        {!loading && !failed && !visible.length && <p className="tree-hint">{filter ? 'No matching files' : 'No supported files in this project'}</p>}
        {retained.length > 0 && (
          <>
            <div className="tree-heading">RETAINED DRAFTS</div>
            <ul>
              {retained.map(([name, draft]) => {
                const open = path === name
                const diagrams = draft.baseline.kind === 'markdown' && draft.baseline.blocks.length > 0
                return (
                  <li key={name}>
                    <Button variant="ghost" className="tree-row" aria-current={open && !diagrams} data-open={(open && diagrams) || undefined} onClick={() => select(name)}>
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
        )}
      </nav>
      <div className="tree-bottom">
        <span className="muted">
          {files.length}
          {' '}
          {files.length === 1 ? 'file' : 'files'}
          {' · .mmd · .mermaid · .md'}
        </span>
        {tree?.truncated && <span role="status">Partial file list. Select known files directly.</span>}
      </div>
    </aside>
  )
}
