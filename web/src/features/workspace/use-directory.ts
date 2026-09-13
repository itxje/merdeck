import type { DirectoryPage } from '../../../../src/shared/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { HttpError } from '@/shared/lib/http'
import { api } from './api'

interface Page { number: number, data: DirectoryPage }
interface Run {
  id: number
  epoch: number
  csrf: string | undefined
  path: string
  live: boolean
  busy: boolean
  cursor: string | null
  pages: Page[]
  sequence: number
  expires: number
  revision: string | null
  retryAt: number
  stopped: boolean
  notice: string
}
interface View { run: Run | null, pages: Page[], loading: boolean, stale: boolean, error: unknown, notice: string, retryAt: number }
const empty: View = { run: null, pages: [], loading: false, stale: false, error: null, notice: '', retryAt: 0 }

// Page queries are dispatched only by this run. No observer may refetch a consumed cursor.
export function useDirectory(path: string, epoch: number, enabled: boolean, csrf: string | undefined, interval: number, limit = 100) {
  const client = useQueryClient()
  const counterRef = React.useRef(0)
  const currentRef = React.useRef<Run | null>(null)
  const restartNoticeRef = React.useRef('')
  const [view, setView] = React.useState<View>(empty)
  const [restartNumber, setRestartNumber] = React.useState(0)
  const close = React.useCallback((directory: string, cursor: string | null) => {
    if (cursor)
      void api.closeDirectory({ path: directory, cursor }, csrf).catch(() => { /* Unknown or unauthorized streams expire on the service. */ })
  }, [csrf])
  const revision = useQuery({
    queryKey: ['directory-revision', epoch, path],
    queryFn: ({ signal }) => api.directoryRevision(path, signal),
    enabled,
    retry: false,
    refetchInterval: query => query.state.error ? Math.min(interval * 4, 30000) : interval,
  })
  const requestPage = React.useCallback(async (run: Run, cursor?: string) => {
    if (!run.live || run.busy)
      return
    run.busy = true
    run.cursor = null
    const number = ++run.sequence
    const key = ['directory-page', epoch, path, limit, run.id, number] as const
    setView(previous => ({ ...previous, run, loading: true, error: null }))
    try {
      const data = await client.fetchQuery({
        queryKey: key,
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
        networkMode: 'always',
        queryFn: async ({ signal }) => {
          const result = await api.directory({ path, limit, ...(cursor ? { cursor } : {}) }, signal)
          if (!run.live || signal.aborted) {
            close(path, result.nextCursor)
            throw new Error('Directory request abandoned')
          }
          return result
        },
      })
      if (!run.live || run.stopped || currentRef.current !== run) {
        close(path, data.nextCursor)
        return
      }
      if (data.path !== path || data.limit !== limit || (run.revision !== null && data.revision !== run.revision) || data.entries.some(entry => run.pages.some(page => page.data.entries.some(prior => prior.path === entry.path)))) {
        close(path, data.nextCursor)
        throw new HttpError(502, 'invalid_response', 'The listing changed. Restart to continue.')
      }
      run.revision = data.revision
      run.cursor = data.nextCursor
      run.expires = data.expiresAt ? Date.parse(data.expiresAt) : 0
      run.pages = [...run.pages, { number, data }].slice(-5)
      client.removeQueries({ predicate: query => query.queryKey[0] === 'directory-page' && query.queryKey[1] === epoch && query.queryKey[4] === run.id && Number(query.queryKey[5]) <= number - 5 })
      // A fresh successful listing supersedes an older namespace observation.
      client.setQueryData(['directory-revision', epoch, path], { path, revision: data.revision, maxPathDepth: data.maxPathDepth, pollIntervalMs: data.pollIntervalMs })
      setView({ run, pages: run.pages, loading: false, stale: false, error: null, notice: number === 1 ? run.notice : '', retryAt: 0 })
    }
    catch (error) {
      if (!run.live || run.stopped || currentRef.current !== run)
        return
      run.stopped = true
      close(path, cursor ?? null)
      client.removeQueries({ queryKey: key, exact: true })
      run.retryAt = error instanceof HttpError && error.status === 429 ? Date.now() + (error.retryAfterSeconds ?? 60) * 1000 : 0
      const discard = error instanceof HttpError && ['cursor_stale', 'directory_changed'].includes(error.code)
      if (discard) {
        run.pages = []
        client.removeQueries({ queryKey: ['directory-page', epoch, path, limit, run.id] })
      }
      setView(previous => ({ ...previous, pages: discard ? [] : previous.pages, loading: false, stale: true, error, retryAt: run.retryAt }))
    }
    finally {
      run.busy = false
    }
  }, [client, close, epoch, limit, path])
  React.useEffect(() => {
    if (!enabled) {
      currentRef.current = null
      // eslint-disable-next-line react/set-state-in-effect -- Session loss must drop all directory data while document drafts follow their separate lock policy.
      setView(empty)
      return
    }
    const run: Run = { id: ++counterRef.current, epoch, csrf, path, live: true, busy: false, cursor: null, pages: [], sequence: 0, expires: 0, revision: null, retryAt: 0, stopped: false, notice: restartNoticeRef.current }
    restartNoticeRef.current = ''
    currentRef.current = run
    // eslint-disable-next-line react/set-state-in-effect -- A new navigation/session creates a fresh external directory traversal.
    setView((previous) => {
      const sameScope = previous.run?.path === path && previous.run.epoch === epoch && previous.run.csrf === csrf
      return { ...empty, run, pages: sameScope ? previous.pages : [], loading: true, stale: sameScope && previous.pages.length > 0 }
    })
    void requestPage(run)
    return () => {
      run.live = false
      close(path, run.cursor)
      run.cursor = null
      void client.cancelQueries({ queryKey: ['directory-page', epoch, path, limit, run.id] })
      client.removeQueries({ queryKey: ['directory-page', epoch, path, limit, run.id] })
      void client.cancelQueries({ queryKey: ['directory-revision', epoch, path] })
      client.removeQueries({ queryKey: ['directory-revision', epoch, path] })
    }
  }, [enabled, epoch, path, limit, csrf, restartNumber, requestPage, close, client])
  const stop = React.useCallback((notice: string) => {
    const run = currentRef.current
    if (!run?.live)
      return
    run.stopped = true
    close(run.path, run.cursor)
    run.cursor = null
    void client.cancelQueries({ queryKey: ['directory-page', epoch, path, limit, run.id, run.sequence] })
    // eslint-disable-next-line react/set-state-in-effect -- External cursor expiry or revision invalidation must stop this traversal immediately.
    setView(previous => ({ ...previous, loading: false, stale: true, notice }))
  }, [close, client, epoch, path, limit])
  React.useEffect(() => {
    const run = currentRef.current
    if (enabled && run?.live && !run.stopped && run.revision && revision.data && revision.data.path === path && revision.data.revision !== run.revision) {
      stop('Directory changed. Refreshing its files…')
      restartNoticeRef.current = 'Directory changed. Listing restarted from page one.'

      setRestartNumber(value => value + 1)
    }
  }, [enabled, path, revision.data, stop])
  React.useEffect(() => {
    if (!view.retryAt)
      return
    const timer = window.setTimeout(() => {
      if (currentRef.current === view.run) {
        if (currentRef.current)
          currentRef.current.retryAt = 0
        setView(previous => ({ ...previous, retryAt: 0 }))
      }
    }, Math.max(0, view.retryAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [view.retryAt, view.run])
  const latest = view.pages.at(-1)?.data
  React.useEffect(() => {
    if (!latest?.expiresAt || !enabled || view.stale)
      return
    const timer = window.setTimeout(stop, Math.max(0, Date.parse(latest.expiresAt) - Date.now()), 'Listing expired. Restart to continue.')
    return () => window.clearTimeout(timer)
  }, [latest?.expiresAt, enabled, view.stale, stop])
  const valid = enabled && view.run?.live && view.run.path === path && view.run.epoch === epoch && view.run.csrf === csrf && currentRef.current === view.run
  const active = valid ? view : empty
  const stale = active.stale || revision.isError
  const next = () => {
    const run = currentRef.current
    if (!valid || !run?.cursor || run.busy || run.stopped || stale)
      return
    if (run.expires <= Date.now()) {
      stop('Listing expired. Restart to continue.')
      return
    }
    void requestPage(run, run.cursor)
  }
  const restart = React.useCallback(() => {
    if (!enabled || (currentRef.current?.retryAt ?? 0) > Date.now())
      return
    if (currentRef.current) {
      currentRef.current.stopped = true
      close(path, currentRef.current.cursor)
      currentRef.current.cursor = null
    }
    setRestartNumber(value => value + 1)
  }, [enabled, close, path])
  return { entries: active.pages.flatMap(page => page.data.entries), firstPage: active.pages[0]?.number ?? 1, lastPage: active.pages.at(-1)?.number ?? 0, loading: active.loading || (enabled && !valid), stale, error: active.error ?? revision.error, notice: active.notice, retryAt: active.retryAt, canNext: !!valid && !!currentRef.current?.cursor && !active.loading && !stale, complete: !!valid && !!latest?.complete, depth: !!valid && latest?.stoppedBy === 'depth', maxPathDepth: latest?.maxPathDepth ?? 64, next, restart }
}
