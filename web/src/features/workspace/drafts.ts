import type { DiagramDocument, DocumentRevision } from '../../../../src/shared/contracts'

export type DraftWarning
  = | { kind: 'revision', version: string, divergent: boolean }
    | { kind: 'deleted' | 'session' | 'layout' }
    | { kind: 'mutation', message: string }

export function warningMessage(warning: DraftWarning | null | undefined): string {
  switch (warning?.kind) {
    case 'revision': return 'This file changed outside the editor. Your draft is kept. Review the current file before saving.'
    case 'deleted': return 'This file was deleted or renamed. Your draft is kept; saving is unavailable.'
    case 'session': return 'Session changed. Review this retained draft against the current project before saving.'
    case 'layout': return 'Save returned a different document layout. Your drafts are kept. Review the current file.'
    case 'mutation': return warning.message
    default: return ''
  }
}

export interface FileDraft {
  baseline: DiagramDocument
  sources: string[]
  warning: DraftWarning | null
  locked: boolean
  saving: { id: number, block: number, source: string, version: string } | null
  saved: boolean
}
export type Drafts = Record<string, FileDraft>
export function dirty(file: FileDraft): boolean {
  return file.sources.some((source, index) => source !== file.baseline.blocks[index]?.source)
}
function fresh(document: DiagramDocument): FileDraft {
  return { baseline: document, sources: document.blocks.map(block => block.source), warning: null, locked: false, saving: null, saved: false }
}
// Keep conflicting observations sticky until explicit review, even if a later
// cached document repeats the save's own revision. Memory stays bounded.
function observe(file: FileDraft, revision: DocumentRevision): FileDraft {
  const warning = file.warning
  if (warning && warning.kind !== 'revision')
    return revision.state === 'deleted' && warning.kind === 'mutation' ? { ...file, warning: { kind: 'deleted' } } : file
  if (revision.state === 'deleted')
    return { ...file, warning: { kind: 'deleted' } }
  if (warning?.kind === 'revision') {
    if (warning.version === revision.version)
      return file
    return { ...file, warning: { kind: 'revision', version: revision.version, divergent: true } }
  }
  if (revision.version === file.baseline.version || !(dirty(file) || file.saving || file.locked))
    return file
  return { ...file, warning: { kind: 'revision', version: revision.version, divergent: false } }
}

export type DraftAction
  = | { type: 'load', document: DiagramDocument }
    | { type: 'edit', path: string, block: number, source: string }
    | { type: 'revision', revision: DocumentRevision }
    | { type: 'saving', path: string, id: number, block: number }
    | { type: 'saved', path: string, id: number, document: DiagramDocument }
    | { type: 'error', path: string, id?: number, message: string }
    | { type: 'reload', document: DiagramDocument }
    | { type: 'retain', document: DiagramDocument }
    | { type: 'move', kind: 'file' | 'directory', from: string, to: string }
    | { type: 'remove', path: string }
    | { type: 'expire' }
    | { type: 'clear' }

export function draftsReducer(state: Drafts, action: DraftAction): Drafts {
  if (action.type === 'clear')
    return {}
  if (action.type === 'expire')
    return Object.fromEntries(Object.entries(state).filter(([, file]) => dirty(file) || file.saving).map(([path, file]) => [path, { ...file, locked: true, saving: null, warning: { kind: 'session' as const } }]))
  if (action.type === 'move') {
    const destination = (name: string) => name === action.from ? action.to : action.kind === 'directory' && name.startsWith(`${action.from}/`) ? `${action.to}${name.slice(action.from.length)}` : undefined
    const moves = Object.keys(state).map(name => [name, destination(name)] as const).filter((move): move is readonly [string, string] => move[1] !== undefined)
    if (!moves.length)
      return state
    const sources = new Set(moves.map(([name]) => name))
    const next: Drafts = { ...state }
    for (const [name, moved] of moves) {
      // Never replace a retained draft that already uses the destination path.
      if (state[moved] && !sources.has(moved))
        continue
      delete next[name]
    }
    for (const [name, moved] of moves) {
      const file = state[name]!
      if (state[moved] && !sources.has(moved))
        continue
      // The service moved the file itself, so a deletion observed at the old path no longer applies.
      next[moved] = { ...file, baseline: { ...file.baseline, path: moved }, warning: file.warning?.kind === 'deleted' ? null : file.warning }
    }
    return next
  }
  if (action.type === 'remove') {
    if (!state[action.path])
      return state
    const next: Drafts = { ...state }
    delete next[action.path]
    return next
  }
  if (action.type === 'retain') {
    const old = state[action.document.path]
    if (!old || old.saving || old.baseline.version !== action.document.version)
      return state
    return { ...state, [action.document.path]: { ...old, locked: false, warning: null } }
  }
  if (action.type === 'load' || action.type === 'reload') {
    const old = state[action.document.path]
    if (action.type === 'load' && old && (old.locked || old.saving || old.warning || dirty(old))) {
      const next = observe(old, { path: action.document.path, state: 'present', version: action.document.version })
      return next === old ? state : { ...state, [action.document.path]: next }
    }
    if (action.type === 'load' && old?.baseline.version === action.document.version)
      return state
    return { ...state, [action.document.path]: fresh(action.document) }
  }
  const path = action.type === 'revision' ? action.revision.path : action.path
  const file = state[path]
  if (!file)
    return state
  let next: FileDraft = file
  if (action.type === 'edit' && file.sources[action.block] !== undefined) {
    next = { ...file, sources: file.sources.map((source, index) => index === action.block ? action.source : source), saved: false }
  }
  if (action.type === 'revision')
    next = observe(file, action.revision)
  if (action.type === 'saving' && !file.saving && !file.locked && !file.warning) {
    const source = file.sources[action.block]
    if (source !== undefined)
      next = { ...file, saving: { id: action.id, block: action.block, source, version: file.baseline.version }, saved: false }
  }
  if (action.type === 'saved' && file.saving?.id === action.id) {
    const submitted = file.saving
    const canReconcile = action.document.path === path && file.baseline.version === submitted.version && file.baseline.blocks.length === action.document.blocks.length && file.baseline.blocks.every((block, index) => index === submitted.block || block.source === action.document.blocks[index]?.source)
    if (!canReconcile || file.locked) {
      next = { ...file, saving: null, warning: file.locked ? file.warning : { kind: 'layout' } }
    }
    else {
      next = {
        ...file,
        baseline: action.document,
        warning: file.warning?.kind === 'revision' && !file.warning.divergent && file.warning.version === action.document.version ? null : file.warning,
        sources: file.sources.map((source, index) => index === submitted.block && source === submitted.source ? (action.document.blocks[index]?.source ?? source) : source),
        saving: null,
        saved: true,
      }
    }
  }
  if (action.type === 'error' && (action.id === undefined || file.saving?.id === action.id))
    next = { ...file, saving: null, warning: { kind: 'mutation', message: action.message } }
  return next === file ? state : { ...state, [path]: next }
}
