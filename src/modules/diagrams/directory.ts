import type { CloseDirectoryRequest, DirectoryPage, DirectoryPageEntry, DirectoryRequest, DirectoryRevision } from '../../shared/contracts'
import type { DirectoryStream, DirectoryView, FileConfig, FileRepository } from './repository'
import { Buffer } from 'node:buffer'
import { randomBytes } from 'node:crypto'
import { setImmediate as yieldEventLoop } from 'node:timers/promises'
import { closeDirectoryRequestSchema, directoryRequestSchema, directoryRevisionRequestSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { contentVersion } from './parser'

export interface DirectoryContext {
  origin: string
  principal: string
  expiresAt: number | null
  signal?: AbortSignal
}
export interface DirectoryOptions {
  // Trusted verification seams may only tighten production budgets.
  pageBytes?: number
  deadlineMs?: number
}
interface Operation {
  principal: string
  origin: string
  path: string
  invalidated: boolean
  started: number
  finished: Promise<void>
  finish: () => void
}
interface Traversal {
  path: string
  limit: number
  principal: string
  origin: string
  created: number
  expires: number
  absolute: number
  revision: string
  stream?: DirectoryStream
  pending?: DirectoryPageEntry
  cursor?: string
  active: boolean
  reason?: 'directory_changed' | 'cursor_stale' | 'unavailable'
  disposal?: Promise<void>
  finished: Promise<void>
  finish: () => void
}
const parent = (path: string) => path ? path.split('/').slice(0, -1).join('/') : null
function completion() {
  let finish = () => {}
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  return { finished, finish }
}

/** Forward-only traversals retain no pages and never rescan a consumed prefix. */
export class DirectoryPager {
  private readonly cursors = new Map<string, Traversal>()
  private readonly states = new Set<Traversal>()
  private readonly operations = new Set<Operation>()
  private readonly nonce = randomBytes(32).toString('hex')
  private readonly timer: ReturnType<typeof setInterval>
  private readonly pageBytes: number
  private readonly deadlineMs: number
  private closed = false
  private cleanupFailed = false
  private changing: ((path: string) => boolean) | undefined
  private closing: Promise<void> | undefined

  constructor(private readonly config: FileConfig, private readonly repository: FileRepository, private readonly clock: () => number, options: DirectoryOptions = {}) {
    this.pageBytes = Math.min(262144, options.pageBytes ?? 262144)
    this.deadlineMs = Math.min(5000, options.deadlineMs ?? 5000)
    this.timer = setInterval(() => this.reap(), 5000)
    this.timer.unref()
  }

  private revision(path: string, sample: string): string {
    return contentVersion(Buffer.from(JSON.stringify(['directory-v1', this.nonce, path, this.config.limits.maxPathDepth, sample])))
  }

  private dispose(state: Traversal): Promise<void> {
    if (state.cursor) {
      this.cursors.delete(state.cursor)
      delete state.cursor
    }
    return state.disposal ??= (async () => {
      try {
        await state.stream?.close()
      }
      catch (error) {
        this.closed = true
        this.cleanupFailed = true
        clearInterval(this.timer)
        throw error
      }
      finally {
        // A failed close cannot prove release; retain its reservation and refuse new work.
        if (!this.cleanupFailed)
          this.states.delete(state)
        state.finish()
      }
    })()
  }

  private invalidate(state: Traversal, reason: NonNullable<Traversal['reason']>): void {
    state.reason ??= reason
    if (state.cursor) {
      this.cursors.delete(state.cursor)
      delete state.cursor
    }
    if (!state.active) {
      void this.dispose(state).catch(() => {
        this.closed = true
      })
    }
  }

  private reap(): void {
    const now = this.clock()
    for (const state of this.states) {
      if (now >= state.expires)
        this.invalidate(state, 'cursor_stale')
    }
  }

  mutationStarted(matches: (path: string) => boolean): void {
    this.changing = matches
    this.invalidatePaths(matches)
  }

  mutationFinished(matches: (path: string) => boolean): void {
    this.invalidatePaths(matches)
    this.changing = undefined
  }

  private invalidatePaths(matches: (path: string) => boolean): void {
    for (const state of this.states) {
      if (matches(state.path))
        this.invalidate(state, 'directory_changed')
    }
    for (const operation of this.operations) {
      if (matches(operation.path))
        operation.invalidated = true
    }
  }

  async closePrincipal(principal: string, origin: string): Promise<void> {
    const pending: Promise<void>[] = []
    for (const operation of this.operations) {
      if (operation.principal === principal && operation.origin === origin) {
        operation.invalidated = true
        pending.push(operation.finished)
      }
    }
    for (const state of this.states) {
      if (state.principal === principal && state.origin === origin) {
        this.invalidate(state, 'cursor_stale')
        pending.push(state.finished)
      }
    }
    await Promise.all(pending)
  }

  close(): Promise<void> {
    this.closed = true
    clearInterval(this.timer)
    for (const state of this.states)
      this.invalidate(state, 'unavailable')
    return this.closing ??= Promise.all([...this.states].map(state => state.finished).concat([...this.operations].map(operation => operation.finished))).then(() => {
      if (this.cleanupFailed)
        throw new AppError('unavailable')
    })
  }

  private begin(path: string, context: DirectoryContext): Operation {
    if (this.closed)
      throw new AppError('unavailable')
    if (context.expiresAt !== null && this.clock() >= context.expiresAt)
      throw new AppError('unauthorized')
    this.reap()
    if (this.operations.size >= 4)
      throw new AppError('rate_limited')
    const operation = { path, principal: context.principal, origin: context.origin, started: this.clock(), invalidated: false, ...completion() }
    this.operations.add(operation)
    return operation
  }

  private check(operation: Operation, context: DirectoryContext, state?: Traversal): void {
    if (this.closed || context.signal?.aborted || this.clock() - operation.started >= this.deadlineMs)
      throw new AppError('unavailable')
    if (state?.reason)
      throw new AppError(state.reason)
    if (operation.invalidated || this.changing?.(operation.path))
      throw new AppError('directory_changed')
    if (context.expiresAt !== null && this.clock() >= context.expiresAt)
      throw new AppError('unauthorized')
    if (state && this.clock() >= state.expires)
      throw new AppError('cursor_stale')
  }

  private binding(state: Traversal, path: string, context: DirectoryContext, limit?: number): void {
    if (state.principal !== context.principal || state.origin !== context.origin)
      throw new AppError('forbidden')
    if (state.path !== path || (limit !== undefined && state.limit !== limit))
      throw new AppError('invalid_request')
  }

  private async root(check: () => void): Promise<void> {
    try {
      await this.repository.assertAvailable(check)
    }
    catch (error) {
      if (error instanceof AppError && error.code === 'unavailable') {
        for (const state of this.states)
          this.invalidate(state, 'unavailable')
      }
      throw error
    }
  }

  async closeDirectory(request: CloseDirectoryRequest, context: DirectoryContext): Promise<{ closed: true }> {
    const parsed = closeDirectoryRequestSchema.safeParse(request)
    if (!parsed.success)
      throw new AppError('invalid_request')
    if (context.expiresAt !== null && this.clock() >= context.expiresAt)
      throw new AppError('unauthorized')
    this.reap()
    const state = this.cursors.get(parsed.data.cursor)
    if (state) {
      this.binding(state, parsed.data.path, context)
      this.invalidate(state, 'cursor_stale')
      await state.finished
    }
    return { closed: true }
  }

  async directoryRevision(path: string, context: DirectoryContext): Promise<DirectoryRevision> {
    const parsed = directoryRevisionRequestSchema.safeParse({ path })
    if (!parsed.success)
      throw new AppError('invalid_request')
    this.repository.checkDirectoryPath(path)
    const operation = this.begin(path, context)
    const check = () => this.check(operation, context)
    try {
      await this.root(check)
      check()
      const result = await this.repository.withListingDirectory(path, check, async (view) => {
        const sample = await view.sample()
        check()
        return { path, revision: this.revision(path, sample), maxPathDepth: this.config.limits.maxPathDepth, pollIntervalMs: this.config.limits.pollIntervalMs }
      })
      check()
      return result
    }
    finally {
      this.operations.delete(operation)
      operation.finish()
    }
  }

  async directoryPage(request: DirectoryRequest, context: DirectoryContext): Promise<DirectoryPage> {
    const parsed = directoryRequestSchema.safeParse(request)
    if (!parsed.success)
      throw new AppError('invalid_request')
    const { path, limit, cursor } = parsed.data
    if (!cursor)
      this.repository.checkDirectoryPath(path)
    const operation = this.begin(path, context)
    let state: Traversal | undefined
    const check = () => this.check(operation, context, state)
    try {
      await this.root(check)
      check()
      if (cursor) {
        const owned = this.cursors.get(cursor)
        if (!owned)
          throw new AppError('cursor_stale')
        this.binding(owned, path, context, limit)
        // No await between lookup and consumption: concurrent reuse cannot advance the stream.
        this.cursors.delete(cursor)
        delete owned.cursor
        owned.active = true
        state = owned
      }
      else {
        const perPrincipal = [...this.states].filter(item => item.principal === context.principal && item.origin === context.origin).length
        if (this.states.size >= 32 || (context.principal !== 'open' && perPrincipal >= 4))
          throw new AppError('rate_limited')
        const now = this.clock()
        const absolute = Math.min(now + 3600000, context.expiresAt ?? Infinity)
        state = { path, limit, principal: context.principal, origin: context.origin, created: now, absolute, expires: Math.min(now + 120000, absolute), revision: '', active: true, ...completion() }
        this.states.add(state)
      }
      const current = state
      const page = await this.repository.withListingDirectory(path, check, async (view) => {
        const sample = await view.sample(current.stream)
        const revision = this.revision(path, sample)
        if (current.revision && current.revision !== revision)
          throw new AppError('directory_changed')
        current.revision = revision
        if (!current.stream && (!path || path.split('/').length < this.config.limits.maxPathDepth)) {
          current.stream = await view.open()
          if (await view.sample(current.stream) !== sample)
            throw new AppError('directory_changed')
        }
        const page = await this.readPage(current, view, check)
        await yieldEventLoop()
        check()
        if (await view.sample(current.stream) !== sample)
          throw new AppError('directory_changed')
        check()
        return page
      })
      check()
      if (!page.complete && page.stoppedBy !== 'depth') {
        current.expires = Math.min(this.clock() + 120000, current.absolute)
        current.cursor = randomBytes(32).toString('hex')
        page.nextCursor = current.cursor
        page.expiresAt = new Date(current.expires).toISOString()
        this.cursors.set(current.cursor, current)
      }
      else {
        await this.dispose(current)
        check()
      }
      return page
    }
    catch (error) {
      if (state) {
        await this.dispose(state)
        if (cursor && error instanceof AppError && error.code === 'not_found')
          throw new AppError('directory_changed')
      }
      throw error
    }
    finally {
      try {
        if (state) {
          state.active = false
          if (state.reason)
            await this.dispose(state)
        }
      }
      finally {
        this.operations.delete(operation)
        operation.finish()
      }
    }
  }

  private async readPage(state: Traversal, view: DirectoryView, check: () => void): Promise<DirectoryPage> {
    const page: DirectoryPage = { path: state.path, parent: parent(state.path), revision: state.revision, entries: [], nextCursor: null, complete: false, stoppedBy: null, visited: 0, excluded: 0, limit: state.limit, maxPathDepth: this.config.limits.maxPathDepth, pollIntervalMs: this.config.limits.pollIntervalMs, expiresAt: null }
    if (!state.stream) {
      page.stoppedBy = 'depth'
      return page
    }
    // Reserve the largest possible envelope before adding entries, including the next token/date.
    const reserved = Buffer.byteLength(JSON.stringify({ success: true, data: { ...page, nextCursor: 'f'.repeat(64), expiresAt: '9999-12-31T23:59:59.999Z', stoppedBy: 'entries', visited: 1024, excluded: 1024 } }))
    let bytes = reserved
    while (true) {
      check()
      if (page.entries.length >= state.limit) {
        page.stoppedBy = 'entries'
        break
      }
      if (page.visited >= 1024) {
        page.stoppedBy = 'visits'
        break
      }
      let entry: DirectoryPageEntry | undefined
      if (state.pending) {
        const pending = state.pending
        delete state.pending
        entry = await view.entry(pending.path.split('/').at(-1)!)
        if (JSON.stringify(entry) !== JSON.stringify(pending))
          throw new AppError('directory_changed')
      }
      else {
        const name = await state.stream.read(check)
        if (name === null) {
          page.complete = true
          break
        }
        page.visited++
        entry = await view.entry(name)
        if (!entry) {
          page.excluded++
          continue
        }
      }
      const added = Buffer.byteLength(JSON.stringify(entry)) + (page.entries.length ? 1 : 0)
      if (bytes + added > this.pageBytes) {
        if (!page.entries.length)
          throw new AppError('unavailable')
        state.pending = entry!
        page.stoppedBy = 'bytes'
        break
      }
      page.entries.push(entry!)
      bytes += added
    }
    return page
  }
}
