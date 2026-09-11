import { Button } from '@/shared/components/ui/button'
import { useApplicationUpdate } from './use-application-update'

export function UpdateNotice({ blocked, reload }: { blocked: boolean, reload: () => void }) {
  const update = useApplicationUpdate()
  if (!update.available)
    return null
  return (
    <aside className="notice" aria-label="Application update">
      <span role="status">
        <strong>Application update available.</strong>
        {' '}
        {blocked ? 'Save or resolve the drafts in every file and finish open dialogs and pending actions before reloading. Your work stays in this tab.' : 'Reload to use the new version. The selected file stays open.'}
      </span>
      <Button variant="outline" disabled={blocked} onClick={reload}>Reload application</Button>
      <Button variant="ghost" onClick={update.dismiss}>Dismiss update</Button>
    </aside>
  )
}
