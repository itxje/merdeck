import type { ApplicationBuild } from '../../../../src/shared/contracts'
import { QueryClient, useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { requestApi } from '@/shared/lib/http'

const cadence = 60000
const eventThrottle = 5000
const key = ['application-build'] as const

/** The build this document was loaded with; development pages have none and never check. */
export function loadedBuild() {
  const value = document.querySelector<HTMLMetaElement>('meta[name="merdeck-build"]')?.content
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null
}

export function decodeBuild(value: unknown): ApplicationBuild {
  if (!value || typeof value !== 'object' || !('identity' in value) || !('pollIntervalMs' in value) || value.pollIntervalMs !== cadence || !(value.identity === null || (typeof value.identity === 'string' && /^[a-f0-9]{64}$/.test(value.identity))))
    throw new Error('Invalid application build response')
  return { identity: value.identity, pollIntervalMs: cadence }
}

const fetchBuild = ({ signal }: { signal: AbortSignal }) => requestApi('/build', decodeBuild, { signal })

export function useApplicationUpdate() {
  // The baseline belongs to this document, never to a later fetch from a replacement service.
  const [loaded] = React.useState(loadedBuild)
  const [dismissed, setDismissed] = React.useState<string | null>(null)
  // Build checks are public and must survive the workspace clearing its session cache.
  const [client] = React.useState(() => new QueryClient())
  const query = useQuery({ queryKey: key, queryFn: fetchBuild, enabled: false, retry: false, networkMode: 'always', gcTime: Infinity }, client)
  React.useEffect(() => {
    if (!loaded)
      return
    let lastStarted = -Infinity
    const check = () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine || client.isFetching() > 0 || Date.now() - lastStarted < eventThrottle)
        return
      lastStarted = Date.now()
      void client.fetchQuery({ queryKey: key, queryFn: fetchBuild, retry: false, networkMode: 'always' }).catch(() => { /* A failed check keeps all work and the last observed deployment. */ })
    }
    const interval = window.setInterval(check, cadence)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    window.addEventListener('online', check)
    check()
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      window.removeEventListener('online', check)
      void client.cancelQueries()
    }
  }, [client, loaded])
  const deployed = query.data?.identity
  const available = !!loaded && !!deployed && deployed !== loaded && deployed !== dismissed
  return { available, failed: query.isError, dismiss: () => setDismissed(deployed ?? null) }
}
