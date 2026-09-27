import type { CloseDirectoryRequest, CreateEntryRequest, DeleteEntryRequest, DiagramDocument, DirectoryRequest, DirectorySearchRequest, DocumentRevision, EntryChange, MoveEntryRequest, SaveDiagramRequest, TreeEntry, TreeSnapshot } from '../../shared/contracts'
import type { DirectoryContext, DirectoryOptions } from './directory'
import type { FileConfig, RepositoryHooks } from './repository'
import { Buffer } from 'node:buffer'
import { createEntryRequestSchema, deleteEntryRequestSchema, moveEntryRequestSchema, relativePathSchema, saveDiagramRequestSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { DirectoryPager } from './directory'
import { contentVersion, fileKind, parseDocument, replaceSource } from './parser'
import { FileRepository } from './repository'

export interface DiagramServiceOptions {
  directory?: DirectoryOptions
  clock?: () => number
  repositoryHooks?: RepositoryHooks
}

const diagramTemplate = 'flowchart TD\n  A[Start] --> B[End]\n'
const htmlTemplate = '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>Untitled</title>\n</head>\n<body>\n  <h1>Untitled</h1>\n  <p>Edit this file with an external editor.</p>\n</body>\n</html>\n'

// New files start with one small valid diagram; requests never carry file content.
function template(path: string): Buffer {
  const kind = fileKind(path)
  return Buffer.from(kind === 'markdown' ? `\`\`\`mermaid\n${diagramTemplate}\`\`\`\n` : kind === 'html' ? htmlTemplate : diagramTemplate)
}

export class DiagramService {
  private mutations: Promise<void> = Promise.resolve()
  private snapshot: { value: TreeSnapshot, expiresAt: number } | undefined
  private refreshing: Promise<TreeSnapshot> | undefined
  private generation = 0
  private closed = false
  private readonly directories: DirectoryPager

  private constructor(private readonly config: FileConfig, private readonly repository: FileRepository, private readonly clock: () => number, options: DiagramServiceOptions) {
    this.directories = new DirectoryPager(config, repository, clock, options.directory)
  }

  static async create(config: FileConfig, options: DiagramServiceOptions = {}): Promise<DiagramService> {
    return new DiagramService(config, await FileRepository.create(config, options.repositoryHooks), options.clock ?? Date.now, options)
  }

  directoryPage(request: DirectoryRequest, context: DirectoryContext) {
    return this.directories.directoryPage(request, context)
  }

  searchDirectory(request: DirectorySearchRequest, context: DirectoryContext) {
    return this.directories.searchDirectory(request, context)
  }

  directoryRevision(path: string, context: DirectoryContext) {
    return this.directories.directoryRevision(path, context)
  }

  closeDirectory(request: CloseDirectoryRequest, context: DirectoryContext) {
    return this.directories.closeDirectory(request, context)
  }

  closePrincipal(principal: string, origin: string) {
    return this.directories.closePrincipal(principal, origin)
  }

  async close(): Promise<void> {
    this.closed = true
    const results = await Promise.allSettled([this.directories.close(), this.mutations])
    const failed = results.find(result => result.status === 'rejected')
    if (failed?.status === 'rejected')
      throw failed.reason
  }

  async storageStatus() {
    if (this.closed)
      throw new AppError('unavailable')
    return this.repository.storageStatus()
  }

  async readDocument(path: string): Promise<DiagramDocument> {
    if (this.closed)
      throw new AppError('unavailable')
    const { bytes } = await this.repository.read(path)
    return parseDocument(path, bytes, this.config.limits.maxBlocks).document
  }

  async documentRevision(path: string): Promise<DocumentRevision> {
    try {
      const { version } = await this.readDocument(path)
      return { path, state: 'present', version }
    }
    catch (error) {
      if (error instanceof AppError && error.code === 'deleted')
        return { path, state: 'deleted' }
      throw error
    }
  }

  // Saves and file operations run one at a time, so a folder move cannot interleave with a save beneath it.
  private async mutate<T>(paths: string[], subtrees: string[], action: () => Promise<T>): Promise<T> {
    const previous = this.mutations
    let release: () => void = () => {}
    this.mutations = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    const affected = (directory: string) => paths.some(path => path.split('/').slice(0, -1).join('/') === directory)
      || subtrees.some(path => directory === path || directory.startsWith(`${path}/`))
    this.directories.mutationStarted(affected)
    try {
      const result = await action()
      this.snapshot = undefined
      this.generation++
      return result
    }
    finally {
      this.directories.mutationFinished(affected)
      release()
    }
  }

  async saveDiagram(request: SaveDiagramRequest): Promise<DiagramDocument> {
    if (this.closed)
      throw new AppError('unavailable')
    const parsed = saveDiagramRequestSchema.safeParse(request)
    if (!parsed.success)
      throw new AppError('invalid_request')
    const { path, source, selector, expectedVersion } = parsed.data
    if (fileKind(path) === 'html')
      throw new AppError('unsupported')
    if (Buffer.byteLength(source) > this.config.limits.maxFileBytes)
      throw new AppError('too_large')
    const bytes = await this.mutate([path], [], () => this.repository.replace(path, expectedVersion, original => replaceSource(path, original, selector, source, this.config.limits.maxBlocks, this.config.limits.maxFileBytes)))
    return parseDocument(path, bytes, this.config.limits.maxBlocks).document
  }

  async createEntry(request: CreateEntryRequest): Promise<EntryChange> {
    if (this.closed)
      throw new AppError('unavailable')
    const parsed = createEntryRequestSchema.safeParse(request)
    if (!parsed.success)
      throw new AppError('invalid_request')
    const { kind, path } = parsed.data
    await this.mutate([path], kind === 'directory' ? [path] : [], () => kind === 'file' ? this.repository.createFile(path, template(path)) : this.repository.createDirectory(path))
    return { kind, path }
  }

  async moveEntry(request: MoveEntryRequest): Promise<EntryChange> {
    if (this.closed)
      throw new AppError('unavailable')
    const parsed = moveEntryRequestSchema.safeParse(request)
    if (!parsed.success)
      throw new AppError('invalid_request')
    const move = parsed.data
    await this.mutate([move.from, move.to], move.kind === 'directory' ? [move.from, move.to] : [], () => move.kind === 'file' ? this.repository.moveFile(move.from, move.to, move.expectedVersion) : this.repository.moveDirectory(move.from, move.to))
    return { kind: move.kind, path: move.to }
  }

  async deleteEntry(request: DeleteEntryRequest): Promise<EntryChange> {
    if (this.closed)
      throw new AppError('unavailable')
    const parsed = deleteEntryRequestSchema.safeParse(request)
    if (!parsed.success)
      throw new AppError('invalid_request')
    const entry = parsed.data
    await this.mutate([entry.path], entry.kind === 'directory' ? [entry.path] : [], () => entry.kind === 'file' ? this.repository.deleteFile(entry.path, entry.expectedVersion) : this.repository.deleteDirectory(entry.path))
    return { kind: entry.kind, path: entry.path }
  }

  async treeSnapshot(options: { refresh?: boolean } = {}): Promise<TreeSnapshot> {
    if (this.closed)
      throw new AppError('unavailable')
    await this.repository.assertAvailable()
    if (!options.refresh && this.snapshot && this.clock() < this.snapshot.expiresAt)
      return structuredClone(this.snapshot.value)
    if (!this.refreshing) {
      const generation = this.generation
      this.refreshing = this.scanTree().then((value) => {
        if (generation === this.generation)
          this.snapshot = { value, expiresAt: this.clock() + this.config.limits.pollIntervalMs }
        return value
      }).finally(() => { this.refreshing = undefined })
    }
    return structuredClone(await this.refreshing)
  }

  private async scanTree(): Promise<TreeSnapshot> {
    const entries: TreeEntry[] = []
    const versions: [string, string][] = []
    const queue = [{ path: '', depth: 0 }]
    const { maxTreeEntries, maxTreeDepth, maxFileBytes, pollIntervalMs } = this.config.limits
    let remainingVisits = maxTreeEntries * 8
    let remainingBytes = 32 * 1024 * 1024
    let truncated = false
    while (queue.length && entries.length < maxTreeEntries && remainingVisits > 0) {
      const directory = queue.shift()!
      let listing
      try {
        listing = await this.repository.entries(directory.path, remainingVisits)
      }
      catch (error) {
        if (!directory.path || (error instanceof AppError && error.code === 'unavailable'))
          throw error
        truncated = true
        continue
      }
      remainingVisits -= listing.entries.length
      truncated ||= listing.truncated
      listing.entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
      for (const entry of listing.entries) {
        if (!this.repository.isVisible(entry.name))
          continue
        const path = directory.path ? `${directory.path}/${entry.name}` : entry.name
        if (!relativePathSchema.safeParse(path).success) {
          truncated = true
          continue
        }
        if (entries.length >= maxTreeEntries) {
          truncated = true
          break
        }
        if (entry.kind === 'directory') {
          entries.push({ kind: 'directory', path })
          if (directory.depth + 1 < Math.min(maxTreeDepth, this.config.limits.maxPathDepth))
            queue.push({ path, depth: directory.depth + 1 })
          else
            truncated = true
          continue
        }
        let kind
        try {
          kind = fileKind(path)
        }
        catch {
          continue
        }
        if (entry.kind === 'unsupported') {
          entries.push({ kind: 'file', path, fileKind: kind, state: 'unsupported', blocks: [] })
          continue
        }
        if (remainingBytes < maxFileBytes) {
          truncated = true
          continue
        }
        try {
          const { bytes } = await this.repository.read(path)
          remainingBytes -= bytes.length
          versions.push([path, contentVersion(bytes)])
          const document = parseDocument(path, bytes, this.config.limits.maxBlocks).document
          entries.push({
            kind: 'file',
            path,
            fileKind: kind,
            state: 'available',
            version: document.version,
            blocks: document.blocks.map(({ source: _source, ...summary }) => summary),
          })
        }
        catch (error) {
          if (!(error instanceof AppError) || error.code === 'unavailable')
            throw error
          entries.push({ kind: 'file', path, fileKind: kind, state: error.code === 'too_large' ? 'too_large' : error.code === 'unsupported' ? 'unsupported' : 'unreadable', blocks: [] })
        }
      }
    }
    truncated ||= queue.length > 0
    entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    versions.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    await this.repository.assertAvailable()
    const revision = contentVersion(Buffer.from(JSON.stringify({ entries, versions, truncated })))
    return { entries, revision, truncated, pollIntervalMs }
  }
}

export const createDiagramService = DiagramService.create
