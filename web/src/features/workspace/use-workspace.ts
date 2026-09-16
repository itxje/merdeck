import type { CreateEntryRequest, DeleteEntryRequest, DiagramDocument, DocumentRevision, MoveEntryRequest, SaveDiagramRequest } from '../../../../src/shared/contracts'
import type { Session } from './api'
import type { DraftAction, Drafts } from './drafts'
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { protectedWork } from '@/features/update/reload-guard'
import { HttpError } from '@/shared/lib/http'
import { api, errorMessage, parentDirectory, sessionCsrf } from './api'
import { dirty, draftsReducer } from './drafts'
import { affectsDirectory } from './entries'
import { useDirectory } from './use-directory'

export type EntryOperation
  = | { type: 'create', request: CreateEntryRequest }
    | { type: 'move', request: MoveEntryRequest }
    | { type: 'delete', request: DeleteEntryRequest }

function subscribeOnline(listener: () => void) {
  return onlineManager.subscribe(listener)
}

export function useWorkspace(path: string, block: number, directory = '', agent: { active: boolean, activeRef: React.RefObject<boolean> } = { active: false, activeRef: { current: false } }) {
  const online = React.useSyncExternalStore(subscribeOnline, () => onlineManager.isOnline())
  const client = useQueryClient()
  const [drafts, applyDraftAction] = React.useReducer(draftsReducer, {})
  // The reload guard must see the latest drafts at the moment of a click, before React commits them.
  const draftsRef = React.useRef<Drafts>({})
  const dispatch = React.useCallback((action: DraftAction) => {
    draftsRef.current = draftsReducer(draftsRef.current, action)
    applyDraftAction(action)
  }, [])
  const [expired, setExpired] = React.useState(false)
  const [epoch, setEpoch] = React.useState(0)
  const generationRef = React.useRef(0)
  const busyRef = React.useRef(false)
  const activeSavesRef = React.useRef(0)
  const navigatingRef = React.useRef(false)
  const counterRef = React.useRef(0)
  const sessionIdentityRef = React.useRef<string | null>(null)
  const sessionQuery = useQuery({ queryKey: ['session'], queryFn: ({ signal }) => api.session(signal), retry: false, refetchInterval: 30000 })
  const session: Session | null = !expired && sessionQuery.data?.authenticated ? sessionQuery.data : null
  const expire = React.useCallback(() => {
    generationRef.current++
    sessionIdentityRef.current = null
    busyRef.current = false
    // eslint-disable-next-line react/set-state-in-effect -- Session expiry is an external authorization change that must lock the UI immediately.
    setExpired(true)
    dispatch({ type: 'expire' })
    void client.cancelQueries()
    client.removeQueries({ predicate: query => query.queryKey[0] !== 'session' })
    client.getMutationCache().clear()
    client.setQueryData(['session'], { authenticated: false })
  }, [client, dispatch])
  // Starts a fresh project view for a new session; retained drafts stay locked for review.
  const reopen = React.useCallback(async (data: Session) => {
    generationRef.current++
    sessionIdentityRef.current = null
    await client.cancelQueries()
    client.clear()
    setEpoch(value => value + 1)
    setExpired(false)
    client.setQueryData(['session'], data)
  }, [client])
  React.useEffect(() => {
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error' && event.query.state.error instanceof HttpError && event.query.state.error.status === 401)
        expire()
    })
    return unsubscribe
  }, [client, expire])
  React.useEffect(() => {
    if (!session)
      return
    const identity = session.access === 'token' ? session.csrfToken : 'open'
    if (sessionIdentityRef.current && sessionIdentityRef.current !== identity) {
      expire()
      // Learn at once whether the service still needs a token; open access reopens the workspace.
      void client.invalidateQueries({ queryKey: ['session'] })
      return
    }
    sessionIdentityRef.current = identity
    // Open access has no session to expire.
    if (session.access === 'open')
      return
    const timer = window.setTimeout(expire, Math.max(0, Date.parse(session.expiresAt) - Date.now()))
    return () => window.clearTimeout(timer)
  }, [session, expire, client])
  React.useEffect(() => {
    const data = sessionQuery.data
    if (expired && data?.authenticated && data.access === 'open')
      void reopen(data)
  }, [expired, sessionQuery.data, reopen])
  React.useEffect(() => {
    if (sessionQuery.data?.authenticated === false && Object.values(drafts).some(file => !file.locked)) {
      expire()
    }
  }, [sessionQuery.data, drafts, expire])
  const interval = session?.pollIntervalMs ?? 3000
  const listing = useDirectory(directory, epoch, !!session, session ? sessionCsrf(session) : undefined, interval)
  const restartDirectory = listing.restart
  const suspendDirectory = listing.suspend
  const revisionKey = ['revision', epoch, path] as const
  const revision = useQuery({ queryKey: revisionKey, queryFn: ({ signal }) => api.revision(path, signal), enabled: !!session && !!path, refetchInterval: query => query.state.error ? Math.min(interval * 4, 30000) : agent.active ? 500 : interval, retry: false })
  const observed = revision.data?.state === 'present' ? revision.data.version : ''
  const documentQuery = useQuery({
    queryKey: ['document', epoch, path, observed],
    queryFn: ({ signal }) => api.document(path, signal),
    enabled: !!session && !!path && revision.data?.state === 'present',
    staleTime: Infinity,
    retry: false,
  })
  React.useEffect(() => {
    // Evict again after observers commit their disabled state. An observer from
    // the expiring render may otherwise rebuild a query removed by expire().
    if (expired)
      client.removeQueries({ predicate: query => query.queryKey[0] !== 'session' })
  }, [expired, client])
  React.useEffect(() => {
    if (revision.data && session)
      dispatch({ type: 'revision', revision: revision.data })
  }, [revision.data, session, dispatch])
  React.useEffect(() => {
    const document = documentQuery.data
    if (session && document && document.path === path && document.version === observed)
      dispatch({ type: 'load', document })
    else if (session && document && document.version !== observed)
      void client.invalidateQueries({ queryKey: ['revision', epoch, path] })
  }, [documentQuery.data, observed, session, path, client, epoch, dispatch])
  const login = useMutation({
    networkMode: 'always',
    mutationFn: api.login,
    onSuccess: async (data) => {
      if (data.authenticated)
        await reopen(data)
    },
    onSettled: () => { /* Mutation variables are removed by the form after completion. */ },
    gcTime: 0,
  })
  const logout = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      if (session?.access !== 'token')
        return { authenticated: false as const }
      try {
        return await api.logout(session.csrfToken)
      }
      catch (error) {
        if (error instanceof HttpError && error.status === 401)
          return { authenticated: false as const }
        throw error
      }
    },
    onSuccess: async () => {
      generationRef.current++
      sessionIdentityRef.current = null
      await client.cancelQueries()
      client.clear()
      dispatch({ type: 'clear' })
      setExpired(false)
      setEpoch(value => value + 1)
      client.setQueryData(['session'], { authenticated: false })
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 401)
        expire()
    },
  })
  const saveMutation = useMutation({
    networkMode: 'always',
    mutationFn: ({ request, csrf }: { request: SaveDiagramRequest, csrf: string | undefined }) => api.save(request, csrf),
    gcTime: 0,
  })
  const file = drafts[path]
  const save = React.useCallback(async () => {
    const selected = file?.baseline.blocks[block]
    const source = file?.sources[block]
    if (agent.activeRef.current || navigatingRef.current || !online || !session || !session.storage.writable || !file || !selected || source === undefined || source === selected.source || file.saving || file.warning || file.locked || busyRef.current || new TextEncoder().encode(source).length > session.maxSourceBytes)
      return
    busyRef.current = true
    activeSavesRef.current++
    const id = ++counterRef.current
    const currentGeneration = generationRef.current
    dispatch({ type: 'saving', path, id, block })
    let resumeDirectory = () => {}
    try {
      if (parentDirectory(path) === directory)
        resumeDirectory = await suspendDirectory()
      await client.cancelQueries({ predicate: query => query.queryKey[0] === 'document' || query.queryKey[0] === 'revision' })
      const document = await saveMutation.mutateAsync({ request: { path, selector: selected.selector, expectedVersion: file.baseline.version, source }, csrf: sessionCsrf(session) })
      if (currentGeneration !== generationRef.current)
        return
      await client.cancelQueries({ predicate: query => query.queryKey[0] === 'document' || query.queryKey[0] === 'revision' })
      if (currentGeneration !== generationRef.current)
        return
      const latest = client.getQueryData<DocumentRevision>(['revision', epoch, path])
      if (latest)
        dispatch({ type: 'revision', revision: latest })
      dispatch({ type: 'saved', path, id, document })
      // A completed mutation does not supersede a newer external observation.
      if (!latest || (latest.state === 'present' && (latest.version === file.baseline.version || latest.version === document.version)))
        client.setQueryData(['revision', epoch, path], { path, state: 'present', version: document.version })
      client.setQueryData(['document', epoch, path, document.version], document)
    }
    catch (error) {
      if (currentGeneration !== generationRef.current)
        return
      if (error instanceof HttpError && error.status === 401)
        expire()
      else dispatch({ type: 'error', path, id, message: errorMessage(error) })
    }
    finally {
      resumeDirectory()
      activeSavesRef.current--
      if (currentGeneration === generationRef.current)
        busyRef.current = false
    }
  }, [file, block, path, session, client, epoch, saveMutation, expire, online, dispatch, directory, suspendDirectory, agent.activeRef])
  const review = useMutation({
    networkMode: 'always',
    mutationFn: async (filePath: string) => {
      const data = await client.fetchQuery({ queryKey: ['review', epoch, filePath], queryFn: ({ signal }) => api.document(filePath, signal), staleTime: 0 })
      return data
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 401)
        expire()
    },
  })
  const entries = useMutation({
    networkMode: 'always',
    onMutate: () => ({ generation: generationRef.current }),
    mutationFn: async (operation: EntryOperation) => {
      if (!session)
        throw new HttpError(401, 'unauthorized', 'Sign in to continue.')
      if (agent.activeRef.current)
        throw new HttpError(409, 'conflict', 'Wait for the agent turn to finish.')
      const resumeDirectory = affectsDirectory(operation, directory) ? await suspendDirectory() : () => {}
      try {
        await client.cancelQueries({ predicate: query => query.queryKey[0] === 'document' || query.queryKey[0] === 'revision' })
        if (operation.type === 'create')
          return await api.createEntry(operation.request, sessionCsrf(session))
        const generation = generationRef.current
        if (operation.request.kind === 'file' && !operation.request.expectedVersion) {
          const filePath = operation.type === 'move' ? operation.request.from : operation.request.path
          const document = await api.document(filePath, new AbortController().signal)
          if (generation !== generationRef.current || document.path !== filePath)
            throw new HttpError(409, 'conflict', 'The file state changed. Try again.')
          if (operation.type === 'move')
            return await api.moveEntry({ ...operation.request, expectedVersion: document.version }, sessionCsrf(session))
          return await api.deleteEntry({ ...operation.request, expectedVersion: document.version }, sessionCsrf(session))
        }
        if (operation.type === 'move')
          return await api.moveEntry(operation.request, sessionCsrf(session))
        return await api.deleteEntry(operation.request, sessionCsrf(session))
      }
      finally {
        resumeDirectory()
      }
    },
    onSuccess: (_change, operation, context) => {
      if (context.generation !== generationRef.current)
        return
      // Drafts follow a moved file or folder; a confirmed file deletion discards that file's drafts.
      if (operation.type === 'move')
        dispatch({ type: 'move', kind: operation.request.kind, from: operation.request.from, to: operation.request.to })
      if (operation.type === 'delete' && operation.request.kind === 'file')
        dispatch({ type: 'remove', path: operation.request.path })
    },
    onError: (error) => {
      if (error instanceof HttpError && error.status === 401)
        expire()
    },
    gcTime: 0,
  })
  const reload = (document: DiagramDocument) => {
    if (!session || document.path !== path)
      return
    dispatch({ type: 'reload', document })
    client.setQueryData(['revision', epoch, path], { path, state: 'present', version: document.version })
    client.setQueryData(['document', epoch, path, document.version], document)
  }
  const readTarget = React.useCallback(async (target: string, signal: AbortSignal) => {
    try {
      return await api.document(target, signal)
    }
    catch (error) {
      if (error instanceof HttpError && error.status === 401)
        expire()
      throw error
    }
  }, [expire])
  const refresh = () => {
    restartDirectory()
    void client.invalidateQueries({ queryKey: ['revision', epoch, path] })
    void client.invalidateQueries({ queryKey: ['document', epoch, path, observed], exact: true })
    void client.invalidateQueries({ queryKey: ['session'] })
  }
  const reconcileAgentChange = React.useCallback((target?: string) => {
    restartDirectory()
    if (!target || target === path) {
      void client.invalidateQueries({ queryKey: ['revision', epoch, path] })
      void client.invalidateQueries({ predicate: query => query.queryKey[0] === 'document' && query.queryKey[2] === path })
    }
  }, [restartDirectory, client, epoch, path])
  const hasUnsaved = Object.values(drafts).some(item => dirty(item) || item.saving)
  const reloadBlocked = agent.active || !online || protectedWork(drafts) || saveMutation.isPending || entries.isPending || review.isPending || login.isPending || logout.isPending
  // Re-checks the latest drafts and pending work when reload is chosen, and then lets no save start.
  const reloadApplication = (uiBlocked: boolean, navigate = () => window.location.reload()) => {
    if (uiBlocked || reloadBlocked || navigatingRef.current || busyRef.current || activeSavesRef.current > 0 || protectedWork(draftsRef.current) || client.isMutating() > 0)
      return false
    navigatingRef.current = true
    navigate()
    return true
  }
  React.useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        event.preventDefault()

        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [hasUnsaved])
  return { online, drafts, dispatch, session, sessionQuery, login, logout, file, listing, revision, documentQuery, save, savePending: saveMutation.isPending, review, entries, reload, refresh, reconcileAgentChange, readTarget, hasUnsaved, expired, reloadBlocked, reloadApplication }
}
