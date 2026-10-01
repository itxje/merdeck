import type { FileDraft } from './drafts'
import { Circle, CircleAlert, CircleCheck, RefreshCw } from 'lucide-react'
import { dirty } from './drafts'

export function FileSyncStatus({ file }: { file: FileDraft }) {
  const state = file.saving ? 'saving' : file.warning || file.locked ? 'failed' : dirty(file) ? 'pending' : 'synced'
  const label = state === 'saving' ? 'Syncing' : state === 'pending' ? 'Not synced' : state === 'synced' ? 'Synced' : file.warning?.kind === 'mutation' || file.warning?.kind === 'layout' ? 'Sync failed' : 'Sync needs attention'
  return (
    <span className="save-status file-sync-status" role="status" data-sync-state={state}>
      <RefreshCw className="sync-arrows" aria-hidden="true" />
      {state === 'synced' && <CircleCheck className="sync-marker" aria-hidden="true" />}
      {state === 'pending' && <Circle className="sync-marker" fill="currentColor" aria-hidden="true" />}
      {state === 'failed' && <CircleAlert className="sync-marker" aria-hidden="true" />}
      <span className="sr-only">{label}</span>
    </span>
  )
}
