import type { Session } from './api'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { api, sessionCsrf } from './api'

export function FilePathCopy({ path, session }: { path: string, session: Session }) {
  const location = useQuery({
    queryKey: ['file-location', sessionCsrf(session) ?? 'open', path],
    queryFn: ({ signal }) => api.fileLocation(path, signal),
    staleTime: Infinity,
    retry: false,
  })
  const [copying, setCopying] = React.useState(false)
  const [feedback, setFeedback] = React.useState('')
  const copy = async () => {
    if (!location.data || copying)
      return
    setCopying(true)
    setFeedback('')
    try {
      await navigator.clipboard.writeText(location.data.absolutePath)
      setFeedback('Path copied')
    }
    catch {
      setFeedback('Copy failed')
    }
    finally {
      setCopying(false)
    }
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={<Button className="header-path-copy" variant="ghost" size="icon-sm" aria-label="Copy absolute path" disabled={!location.isSuccess || copying} onClick={() => void copy()} />}>
          {feedback === 'Path copied' ? <Check /> : <Copy />}
        </TooltipTrigger>
        <TooltipContent side="bottom">{location.isPending ? 'Loading file path…' : location.isError ? 'File path unavailable' : 'Copy absolute path'}</TooltipContent>
      </Tooltip>
      <span className={location.isError || feedback === 'Copy failed' ? 'header-path-status' : 'sr-only'} role="status">{location.isError ? 'File path unavailable' : feedback}</span>
    </>
  )
}
