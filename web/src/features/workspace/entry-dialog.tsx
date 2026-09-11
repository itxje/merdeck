import type { EntryAction } from './entries'
import type { EntryOperation } from './use-workspace'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { entryErrorMessage } from './api'
import { entryOperation, entryPathProblem, initialEntryPath } from './entries'

const titles = {
  create: { file: 'New file', directory: 'New folder' },
  move: { file: 'Rename or move file', directory: 'Rename or move folder' },
  delete: { file: 'Delete file', directory: 'Delete folder' },
}

function description(action: EntryAction): string {
  if (action.type === 'create')
    return action.kind === 'file' ? 'Create a Mermaid (.mmd, .mermaid) or Markdown (.md) file. It starts with a small example diagram.' : 'Create an empty folder inside the project.'
  if (action.type === 'move') {
    return action.kind === 'file'
      ? 'Change the name or folder. The destination folder must already exist, and the file keeps its type.'
      : 'Change the name or parent folder. Everything inside moves with it, including files the explorer does not show.'
  }
  if (action.kind === 'directory')
    return `Permanently delete the empty folder ${action.path}?`
  return `Permanently delete ${action.path} from the project folder? This cannot be undone here.${action.unsaved ? ' Unsaved changes to this file in this tab are discarded.' : ''}`
}

interface FormProps { action: EntryAction, onCancel: () => void, onSubmit: (operation: EntryOperation) => Promise<void> }
function EntryForm({ action, onCancel, onSubmit }: FormProps) {
  const [value, setValue] = React.useState(() => initialEntryPath(action))
  const [error, setError] = React.useState('')
  const [pending, setPending] = React.useState(false)
  // Select the name without its folder and extension, ready to type over.
  const selectName = React.useCallback((element: HTMLInputElement | null) => {
    if (!element)
      return
    const start = element.value.lastIndexOf('/') + 1
    const dot = action.kind === 'file' ? element.value.lastIndexOf('.') : -1
    element.focus()
    element.setSelectionRange(start, dot > start ? dot : element.value.length)
  }, [action.kind])
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending)
      return
    const target = value.trim()
    const problem = action.type === 'delete' ? '' : entryPathProblem(target, action.kind, action.type === 'move' ? action.path : undefined)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setPending(true)
    try {
      await onSubmit(entryOperation(action, target))
    }
    catch (failure) {
      setError(entryErrorMessage(failure))
      setPending(false)
    }
  }
  return (
    <form className="entry-form" onSubmit={event => void submit(event)}>
      <DialogTitle>{titles[action.type][action.kind]}</DialogTitle>
      <DialogDescription>{description(action)}</DialogDescription>
      {action.type !== 'delete' && (
        <div className="entry-field">
          <label htmlFor="entry-path">Path</label>
          <Input id="entry-path" ref={selectName} value={value} autoComplete="off" spellCheck={false} aria-invalid={!!error} aria-describedby={error ? 'entry-error' : undefined} onChange={event => setValue(event.target.value)} />
        </div>
      )}
      {error && <p id="entry-error" className="entry-error" role="alert">{error}</p>}
      <div className="review-actions">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant={action.type === 'delete' ? 'destructive' : 'default'} disabled={pending}>
          {pending ? 'Working…' : action.type === 'create' ? 'Create' : action.type === 'move' ? 'Move' : 'Delete'}
        </Button>
      </div>
    </form>
  )
}

interface Props { entry: { action: EntryAction, key: number } | null, open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (operation: EntryOperation) => Promise<void> }
export function EntryDialog({ entry, open, onOpenChange, onSubmit }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {entry && <EntryForm key={entry.key} action={entry.action} onCancel={() => onOpenChange(false)} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}
