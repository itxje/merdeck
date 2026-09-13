import type { BigIntStats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import type { AppConfig } from '../../config'
import type { DirectoryPageEntry } from '../../shared/contracts'
import type { StorageIdentity } from './filesystem'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { link, lstat, mkdir, open, opendir, realpath, rename, rmdir, unlink } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { setImmediate as yieldEventLoop } from 'node:timers/promises'
import { relativePathSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { inspectFilesystem, requireWritableFilesystem, retained } from './filesystem'
import { initializeNativeDirectory, NativeDirectory } from './native-directory'
import { contentVersion, fileKind } from './parser'

export type FileConfig = Pick<AppConfig, 'projectRoot' | 'limits'>
export interface RepositoryHooks {
  beforeDirectoryRead?: () => void
  afterMoveAudit?: () => Promise<void>
  afterDirectoryRead?: (relative: string, name: string | null) => Promise<void>
  directoryStreamOpened?: () => void
  directoryStreamClosed?: () => void
  afterReadOpen?: (relativePath: string, handle: FileHandle) => Promise<void>
  afterDirectoryOpen?: (relativeDirectory: string) => Promise<void>
  afterFileOpen?: (relativePath: string) => Promise<void>
  afterTempWrite?: (relativePath: string) => Promise<void>
  writeTemporary?: (handle: FileHandle, bytes: Buffer) => Promise<void>
}
export interface DirectoryStream {
  directory: Directory
  read: (check: () => void) => Promise<string | null>
  close: () => Promise<void>
}
export interface DirectoryView {
  sample: (stream?: DirectoryStream) => Promise<string>
  entry: (name: string) => Promise<DirectoryPageEntry | undefined>
  open: () => Promise<DirectoryStream>
}
interface Directory {
  handle: FileHandle
  relative: string
  anchor: string
}
export interface FileRead {
  bytes: Buffer
  stat: BigIntStats
  version: string
}
export interface DirectoryEntry {
  name: string
  kind: 'directory' | 'file' | 'unsupported'
}

const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW
const readFlags = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
const ignoredDirectories = new Set(['.git', '.hg', '.svn', 'node_modules', 'vendor', 'dist', 'build', 'target', '__pycache__', 'coverage', '.cache', '.next', '.nuxt', '.output', '.turbo', '.vite', 'secrets'])

// Only read() consumes this internal signal; public errors and writes are never retried.
class ReadChanged extends AppError {
  constructor() { super('conflict') }
}

function consistencyError(forWrite: boolean, before: BigIntStats, current: BigIntStats): AppError {
  return !forWrite && current.isFile() && current.nlink === 1n && current.dev === before.dev
    ? new ReadChanged()
    : new AppError('conflict')
}

export function allowedDirectoryPath(path: string): string {
  if (!relativePathSchema.safeParse(path).success)
    throw new AppError('invalid_request')
  if (path.split('/').some(part => part.startsWith('.') || ignoredDirectories.has(part)))
    throw new AppError('forbidden')
  return path
}

export function allowedPath(path: string): string {
  allowedDirectoryPath(path)
  fileKind(path)
  return path
}

function sameIdentity(a: BigIntStats, b: BigIntStats): boolean {
  return a.dev === b.dev && a.ino === b.ino
}
function unchanged(a: BigIntStats, b: BigIntStats): boolean {
  return sameIdentity(a, b) && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs
}
function fsError(error: unknown): AppError {
  if (error instanceof AppError)
    return error
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (code === 'ENOENT')
    return new AppError('deleted')
  if (['ELOOP', 'ENOTDIR', 'EACCES', 'EPERM'].includes(String(code)))
    return new AppError('forbidden')
  return new AppError('unavailable')
}
function entryError(error: unknown, notEmpty: 'exists' | 'not_empty' = 'not_empty'): AppError {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  if (code === 'EEXIST')
    return new AppError('exists')
  if (code === 'ENOTEMPTY')
    return new AppError(notEmpty)
  // Links and renames never cross mounts; refuse instead of copying.
  if (code === 'EXDEV')
    return new AppError('forbidden')
  return fsError(error)
}
function anchor(handle: FileHandle): string {
  return `/proc/self/fd/${handle.fd}`
}

async function closeDirectories(directories: Directory[]): Promise<void> {
  const closures = await Promise.allSettled(directories.map(directory => directory.handle.close()))
  const failed = closures.find(result => result.status === 'rejected')
  if (failed?.status === 'rejected')
    throw fsError(failed.reason)
}

export class FileRepository {
  private constructor(private readonly config: FileConfig, private readonly rootIdentity: BigIntStats, private readonly hooks: RepositoryHooks) {}

  static async create(config: FileConfig, hooks: RepositoryHooks = {}): Promise<FileRepository> {
    try {
      if (process.platform !== 'linux' || !isAbsolute(config.projectRoot) || resolve(config.projectRoot) !== config.projectRoot)
        throw new AppError('unavailable')
      const stat = await lstat(config.projectRoot, { bigint: true })
      if (stat.isSymbolicLink() || !stat.isDirectory() || await realpath(config.projectRoot) !== config.projectRoot)
        throw new AppError('unavailable')
      initializeNativeDirectory()
      const repository = new FileRepository(config, stat, hooks)
      await repository.withDirectory('', async () => {})
      return repository
    }
    catch {
      throw new AppError('unavailable')
    }
  }

  private async validateDirectory(directory: Directory, check: () => void = () => {}): Promise<void> {
    const expected = join(this.config.projectRoot, directory.relative)
    check()
    await this.validateRoot(check)
    try {
      check()
      if (await realpath(directory.anchor) !== expected)
        throw new AppError(directory.relative ? 'forbidden' : 'unavailable')
      check()
      const actual = await lstat(expected, { bigint: true })
      check()
      if (!actual.isDirectory() || !sameIdentity(actual, await directory.handle.stat({ bigint: true })))
        throw new AppError('forbidden')
    }
    catch (error) {
      if (error instanceof AppError && ['directory_changed', 'cursor_stale', 'unauthorized'].includes(error.code))
        throw error
      if (!directory.relative)
        throw new AppError('unavailable')
      throw fsError(error)
    }
  }

  private async validateRoot(check: () => void = () => {}): Promise<void> {
    try {
      check()
      const root = await lstat(this.config.projectRoot, { bigint: true })
      check()
      if (!sameIdentity(root, this.rootIdentity) || root.birthtimeNs !== this.rootIdentity.birthtimeNs || !root.isDirectory() || await realpath(this.config.projectRoot) !== this.config.projectRoot)
        throw new AppError('unavailable')
    }
    catch (error) {
      if (error instanceof AppError && ['directory_changed', 'cursor_stale', 'unauthorized'].includes(error.code))
        throw error
      throw new AppError('unavailable')
    }
  }

  private async withDirectory<T>(relative: string, action: (directory: Directory, chain: Directory[]) => Promise<T>, missing: 'deleted' | 'not_found' = 'deleted', check: () => void = () => {}): Promise<T> {
    this.checkDirectoryPath(relative)
    const opened: Directory[] = []
    try {
      check()
      const rootHandle = await open(this.config.projectRoot, directoryFlags).catch(() => {
        throw new AppError('unavailable')
      })
      let directory: Directory = { handle: rootHandle, relative: '', anchor: anchor(rootHandle) }
      opened.push(directory)
      await this.validateDirectory(directory, check)
      for (const component of relative ? relative.split('/') : []) {
        check()
        const handle = await open(`${directory.anchor}/${component}`, directoryFlags).catch((error: unknown) => {
          const mapped = fsError(error)
          throw mapped.code === 'deleted' ? new AppError(missing) : mapped
        })
        directory = { handle, relative: directory.relative ? `${directory.relative}/${component}` : component, anchor: anchor(handle) }
        opened.push(directory)
        await this.hooks.afterDirectoryOpen?.(directory.relative)
        await this.validateDirectory(directory, check)
      }
      check()
      return await action(directory, opened)
    }
    catch (error) {
      throw fsError(error)
    }
    finally {
      await closeDirectories(opened)
    }
  }

  private async readIn(directory: Directory, name: string, relative: string, forWrite = false): Promise<FileRead> {
    await this.validateDirectory(directory)
    const path = `${directory.anchor}/${name}`
    const handle = await open(path, readFlags)
    try {
      if (!forWrite)
        await this.hooks.afterReadOpen?.(relative, handle)
      const before = await handle.stat({ bigint: true })
      if (!before.isFile())
        throw new AppError('unsupported')
      if (!forWrite && before.nlink === 0n)
        throw new ReadChanged()
      if (before.nlink !== 1n)
        throw new AppError('forbidden')
      if (forWrite)
        await requireWritableFilesystem(handle, before.dev, this.rootIdentity.dev)
      if (before.size > BigInt(this.config.limits.maxFileBytes))
        throw new AppError('too_large')
      await this.hooks.afterFileOpen?.(relative)
      await this.validateDirectory(directory)
      const current = await lstat(path, { bigint: true })
      if (!sameIdentity(before, current))
        throw consistencyError(forWrite, before, current)
      const buffer = Buffer.alloc(this.config.limits.maxFileBytes + 1)
      let length = 0
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length)
        if (!bytesRead)
          break
        length += bytesRead
      }
      if (length > this.config.limits.maxFileBytes)
        throw new AppError('too_large')
      const after = await handle.stat({ bigint: true })
      await this.validateDirectory(directory)
      // Preserve the write-side short circuit and its original error semantics.
      if (forWrite && !unchanged(before, after))
        throw new AppError('conflict')
      const final = await lstat(path, { bigint: true })
      if (!unchanged(before, after) || !unchanged(after, final))
        throw consistencyError(forWrite, before, final)
      const bytes = buffer.subarray(0, length)
      return { bytes, stat: after, version: contentVersion(bytes) }
    }
    finally {
      await handle.close()
    }
  }

  checkDirectoryPath(relative: string): void {
    if (relative)
      allowedDirectoryPath(relative)
    if (relative && relative.split('/').length > this.config.limits.maxPathDepth)
      throw new AppError('forbidden')
  }

  // Each page gets a fresh ancestor chain; only the stream target survives this callback.
  async withListingDirectory<T>(relative: string, check: () => void, action: (view: DirectoryView) => Promise<T>): Promise<T> {
    return this.withDirectory(relative, async (directory, chain) => {
      const identity = (stat: BigIntStats) => [stat.dev, stat.ino, stat.birthtimeNs].map(String)
      const metadata = (stat: BigIntStats) => [...identity(stat), ...[stat.mtimeNs, stat.ctimeNs, stat.size, stat.nlink].map(String)]
      const sample = async (stream?: DirectoryStream) => {
        check()
        const before = await directory.handle.stat({ bigint: true })
        const ancestors: string[][] = []
        for (const item of chain) {
          check()
          await this.validateDirectory(item, check)
          check()
          ancestors.push(identity(await item.handle.stat({ bigint: true })))
        }
        if (stream) {
          check()
          const retained = await stream.directory.handle.stat({ bigint: true })
          if (JSON.stringify(metadata(before)) !== JSON.stringify(metadata(retained)))
            throw new AppError('directory_changed')
        }
        check()
        const after = await directory.handle.stat({ bigint: true })
        if (JSON.stringify(metadata(before)) !== JSON.stringify(metadata(after)))
          throw new AppError('directory_changed')
        return JSON.stringify([ancestors, metadata(after)])
      }
      return action({
        sample,
        entry: async (name) => {
          check()
          if (!this.isVisible(name))
            return undefined
          const path = relative ? `${relative}/${name}` : name
          if (!relativePathSchema.safeParse(path).success)
            return undefined
          await this.validateDirectory(directory, check)
          check()
          let stat: BigIntStats
          try {
            stat = await lstat(`${directory.anchor}/${name}`, { bigint: true })
          }
          catch (error) {
            const mapped = fsError(error)
            throw mapped.code === 'deleted' ? new AppError('directory_changed') : mapped
          }
          if (stat.isDirectory())
            return { kind: 'directory', path, children: 'unloaded' }
          if (!stat.isFile() || stat.nlink !== 1n)
            return undefined
          try {
            return { kind: 'file', path, fileKind: fileKind(path), state: 'deferred' }
          }
          catch {
            return undefined
          }
        },
        open: async () => {
          check()
          const handle = await open(`${directory.anchor}/.`, directoryFlags)
          const owned: Directory = { handle, anchor: anchor(handle), relative }
          let iterator: NativeDirectory | undefined
          try {
            check()
            await this.validateDirectory(owned, check)
            check()
            iterator = NativeDirectory.open(`${owned.anchor}/.`)
            await yieldEventLoop()
            check()
            const nativeStat = await lstat(`/proc/self/fd/${iterator.descriptor}/.`, { bigint: true })
            check()
            const ownedStat = await handle.stat({ bigint: true })
            if (!sameIdentity(nativeStat, ownedStat) || nativeStat.birthtimeNs !== ownedStat.birthtimeNs)
              throw new AppError('directory_changed')
            await this.validateDirectory(owned, check)
            this.hooks.directoryStreamOpened?.()
            const stream = iterator
            let closing: Promise<void> | undefined
            return {
              directory: owned,
              read: async (currentCheck) => {
                this.hooks.beforeDirectoryRead?.()
                const name = await stream.read(currentCheck)
                await this.hooks.afterDirectoryRead?.(relative, name)
                return name
              },
              close: () => closing ??= (async () => {
                try {
                  await stream.close()
                }
                finally {
                  await handle.close()
                  this.hooks.directoryStreamClosed?.()
                }
              })(),
            }
          }
          catch (error) {
            try {
              await iterator?.close()
            }
            finally {
              await handle.close()
            }
            throw error
          }
        },
      })
    }, 'not_found', check)
  }

  async read(path: string): Promise<FileRead> {
    allowedPath(path)
    const parts = path.split('/')
    if (parts.length > this.config.limits.maxPathDepth)
      throw new AppError('forbidden')
    const name = parts.pop()!
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // The entire directory/target chain closes before a new attempt opens it.
        return await this.withDirectory(parts.join('/'), directory => this.readIn(directory, name, path))
      }
      catch (error) {
        if (!(error instanceof ReadChanged))
          throw error
      }
    }
    throw new AppError('conflict')
  }

  async entries(relative: string, remaining: number): Promise<{ entries: DirectoryEntry[], truncated: boolean }> {
    if (relative && (!relativePathSchema.safeParse(relative).success || relative.split('/').some(part => !this.isVisible(part))))
      throw new AppError('invalid_request')
    return this.withDirectory(relative, async (directory) => {
      const result: DirectoryEntry[] = []
      await this.validateDirectory(directory)
      const iterator = await opendir(directory.anchor, { bufferSize: 1 })
      for await (const entry of iterator) {
        await this.validateDirectory(directory)
        if (result.length >= remaining)
          return { entries: result, truncated: true }
        // Count every visited name, even excluded files, to bound traversal work.
        result.push({ name: entry.name, kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'unsupported' })
      }
      return { entries: result, truncated: false }
    })
  }

  isVisible(name: string): boolean {
    return !name.startsWith('.') && !ignoredDirectories.has(name) && relativePathSchema.safeParse(name).success
  }

  async assertAvailable(check: () => void = () => {}): Promise<void> {
    await this.withDirectory('', async () => {}, 'deleted', check)
  }

  async storageStatus() {
    return this.withDirectory('', async (directory) => {
      const stat = await directory.handle.stat({ bigint: true })
      const status = await inspectFilesystem(directory.handle, stat.dev, this.rootIdentity.dev)
      await this.validateDirectory(directory)
      return status
    })
  }

  private async assertWritable(directory: Directory): Promise<StorageIdentity> {
    await this.validateDirectory(directory)
    const stat = await directory.handle.stat({ bigint: true })
    return requireWritableFilesystem(directory.handle, stat.dev, this.rootIdentity.dev)
  }

  // The staged bytes are proven by their own hash where an inode cannot prove them.
  private async stagedIsOurs(identity: StorageIdentity, temporary: string, staged: BigIntStats, bytes: Buffer): Promise<boolean> {
    const current = await lstat(temporary, { bigint: true })
    if (identity === 'stable')
      return sameIdentity(staged, current)
    if (current.dev !== staged.dev || current.nlink !== 1n || current.size !== BigInt(bytes.length))
      return false
    const handle = await open(temporary, readFlags)
    try {
      return contentVersion(await handle.readFile()) === contentVersion(bytes)
    }
    finally {
      await handle.close()
    }
  }

  // Where the rename cannot be confirmed by identity, the published name is read back instead.
  private async confirmPublication(identity: StorageIdentity, directory: Directory, name: string, bytes: Buffer): Promise<void> {
    if (identity === 'stable')
      return
    const handle = await open(`${directory.anchor}/${name}`, readFlags)
    try {
      const published = contentVersion(await handle.readFile())
      if (published !== contentVersion(bytes))
        throw new AppError('conflict', published)
    }
    finally {
      await handle.close()
    }
  }

  async replace(path: string, expectedVersion: string, transform: (bytes: Buffer) => Buffer): Promise<Buffer> {
    allowedPath(path)
    const parts = path.split('/')
    if (parts.length > this.config.limits.maxPathDepth)
      throw new AppError('forbidden')
    const name = parts.pop()!
    return this.withDirectory(parts.join('/'), async (directory) => {
      const identity = await this.assertWritable(directory)
      const original = await this.readIn(directory, name, path, true)
      if (original.version !== expectedVersion)
        throw new AppError('conflict', original.version)
      const bytes = transform(original.bytes)
      const tempName = `.merdeck-${randomUUID()}.tmp`
      const temporary = `${directory.anchor}/${tempName}`
      let tempHandle: FileHandle | undefined
      let owned = false
      try {
        await this.assertWritable(directory)
        tempHandle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
        owned = true
        if (this.hooks.writeTemporary)
          await this.hooks.writeTemporary(tempHandle, bytes)
        else
          await tempHandle.writeFile(bytes)
        const tempStat = await tempHandle.stat({ bigint: true })
        if (tempStat.uid !== original.stat.uid || tempStat.gid !== original.stat.gid)
          await tempHandle.chown(Number(original.stat.uid), Number(original.stat.gid))
        await tempHandle.chmod(Number(original.stat.mode & 0o777n))
        await tempHandle.sync()
        await this.hooks.afterTempWrite?.(path)
        const current = await this.readIn(directory, name, path, true)
        if (current.version !== expectedVersion || !retained(identity, original.stat, current.stat))
          throw new AppError('conflict', current.version)
        await this.assertWritable(directory)
        if (!await this.stagedIsOurs(identity, temporary, tempStat, bytes))
          throw new AppError('forbidden')
        await rename(temporary, `${directory.anchor}/${name}`)
        owned = false
        await directory.handle.sync()
        await this.confirmPublication(identity, directory, name, bytes)
        return bytes
      }
      finally {
        try {
          if (owned && tempHandle) {
            const current = await lstat(temporary, { bigint: true }).catch((error: unknown) => {
              if (fsError(error).code === 'deleted')
                return undefined
              throw error
            })
            const staged = await tempHandle.stat({ bigint: true })
            // The name was created here with a random component, so device, link count and size
            // identify it where an inode cannot.
            if (current && (identity === 'stable' ? sameIdentity(current, staged) : current.dev === staged.dev && current.nlink === 1n && current.size === staged.size))
              await unlink(temporary)
          }
        }
        finally {
          await tempHandle?.close()
        }
      }
    })
  }

  private split(path: string): { parent: string, name: string } {
    const parts = path.split('/')
    if (parts.length > this.config.limits.maxPathDepth)
      throw new AppError('forbidden')
    const name = parts.pop()!
    return { parent: parts.join('/'), name }
  }

  async createFile(path: string, bytes: Buffer): Promise<void> {
    allowedPath(path)
    const { parent, name } = this.split(path)
    await this.withDirectory(parent, async (directory) => {
      await this.assertWritable(directory)
      const target = `${directory.anchor}/${name}`
      const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o666).catch((error: unknown) => {
        throw entryError(error)
      })
      try {
        await handle.writeFile(bytes)
        await handle.sync()
      }
      catch (error) {
        // Remove only the file this call created.
        const created = await handle.stat({ bigint: true })
        const current = await lstat(target, { bigint: true }).catch(() => undefined)
        if (current && sameIdentity(created, current))
          await unlink(target)
        throw error
      }
      finally {
        await handle.close()
      }
      await directory.handle.sync()
    }, 'not_found')
  }

  async createDirectory(path: string): Promise<void> {
    allowedDirectoryPath(path)
    const { parent, name } = this.split(path)
    await this.withDirectory(parent, async (directory) => {
      await this.assertWritable(directory)
      await mkdir(`${directory.anchor}/${name}`).catch((error: unknown) => {
        throw entryError(error)
      })
      await directory.handle.sync()
    }, 'not_found')
  }

  async moveFile(from: string, to: string, expectedVersion: string): Promise<void> {
    allowedPath(from)
    allowedPath(to)
    if (from === to || fileKind(from) !== fileKind(to))
      throw new AppError('invalid_request')
    const source = this.split(from)
    const target = this.split(to)
    await this.withDirectory(source.parent, sourceDirectory => this.withDirectory(target.parent, async (targetDirectory) => {
      const identity = await this.assertWritable(sourceDirectory)
      await this.assertWritable(targetDirectory)
      const original = await this.readIn(sourceDirectory, source.name, from, true)
      if (original.version !== expectedVersion)
        throw new AppError('conflict', original.version)
      const sourcePath = `${sourceDirectory.anchor}/${source.name}`
      const targetPath = `${targetDirectory.anchor}/${target.name}`
      // A hard link never replaces an existing name, so the destination cannot be overwritten.
      await link(sourcePath, targetPath).catch((error: unknown) => {
        throw entryError(error)
      })
      try {
        const [linked, current] = await Promise.all([lstat(targetPath, { bigint: true }), lstat(sourcePath, { bigint: true })])
        // A hard link raises the link count, so its change time moves; the link itself is what must be proven.
        const sameFile = identity === 'stable'
          ? sameIdentity(original.stat, linked) && sameIdentity(original.stat, current)
          : linked.dev === original.stat.dev && current.dev === original.stat.dev && linked.size === original.stat.size
            && linked.mtimeNs === original.stat.mtimeNs && linked.nlink === 2n && current.nlink === 2n
        if (!sameFile || current.size !== original.stat.size || current.mtimeNs !== original.stat.mtimeNs)
          throw new AppError('conflict')
        await this.validateDirectory(sourceDirectory)
        await unlink(sourcePath)
      }
      catch (error) {
        // Remove the extra link only while the source name still holds the file.
        const linked = await lstat(targetPath, { bigint: true }).catch(() => undefined)
        if (linked && (identity === 'stable' ? sameIdentity(linked, original.stat) : linked.dev === original.stat.dev && linked.size === original.stat.size && linked.mtimeNs === original.stat.mtimeNs) && linked.nlink > 1n)
          await unlink(targetPath)
        throw error
      }
      await sourceDirectory.handle.sync()
      await targetDirectory.handle.sync()
    }, 'not_found'))
  }

  private async auditMove(from: string, to: string): Promise<() => Promise<void>> {
    if (to.length <= from.length && to.split('/').length <= from.split('/').length)
      return async () => {}
    const started = Date.now()
    const check = () => {
      if (Date.now() - started >= 5000)
        throw new AppError('too_large')
    }
    const observations: { path: string, sample: string }[] = []
    const stack = [from]
    let visits = 0
    let directories = 1
    while (stack.length) {
      check()
      const path = stack.pop()!
      await this.withListingDirectory(path, check, async (view) => {
        const sample = await view.sample()
        observations.push({ path, sample })
        const stream = await view.open()
        try {
          while (true) {
            check()
            // Refuse before an additional read; reaching the exact bound does not prove EOF.
            if (visits >= 8192)
              throw new AppError('too_large')
            const name = await stream.read(check)
            if (name === null)
              break
            visits++
            if (!this.isVisible(name))
              continue
            const child = `${path}/${name}`
            if (!relativePathSchema.safeParse(child).success || child.split('/').length > this.config.limits.maxPathDepth)
              continue
            await this.validateDirectory(stream.directory)
            check()
            const stat = await lstat(`${stream.directory.anchor}/${name}`, { bigint: true }).catch((error: unknown) => {
              const mapped = fsError(error)
              throw mapped.code === 'deleted' ? new AppError('conflict') : mapped
            })
            if (!stat.isDirectory() && !stat.isFile())
              continue
            const projected = `${to}${child.slice(from.length)}`
            if (projected.length > 1024 || projected.split('/').length > this.config.limits.maxPathDepth)
              throw new AppError('forbidden')
            if (stat.isDirectory()) {
              if (++directories > 1024)
                throw new AppError('too_large')
              stack.push(child)
            }
          }
          if (await view.sample(stream) !== sample)
            throw new AppError('conflict')
        }
        finally {
          await stream.close()
        }
      })
    }
    await this.hooks.afterMoveAudit?.()
    return async () => {
      for (const observation of observations) {
        check()
        try {
          await this.withListingDirectory(observation.path, check, async (view) => {
            if (await view.sample() !== observation.sample)
              throw new AppError('conflict')
          })
        }
        catch (error) {
          if (error instanceof AppError && ['not_found', 'directory_changed'].includes(error.code))
            throw new AppError('conflict')
          throw error
        }
      }
    }
  }

  async moveDirectory(from: string, to: string): Promise<void> {
    allowedDirectoryPath(from)
    allowedDirectoryPath(to)
    if (from === to || to.startsWith(`${from}/`))
      throw new AppError('invalid_request')
    const source = this.split(from)
    const target = this.split(to)
    const verifyAudit = await this.auditMove(from, to)
    await this.withDirectory(source.parent, sourceDirectory => this.withDirectory(target.parent, async (targetDirectory) => {
      await this.assertWritable(sourceDirectory)
      await this.assertWritable(targetDirectory)
      const sourcePath = `${sourceDirectory.anchor}/${source.name}`
      const targetPath = `${targetDirectory.anchor}/${target.name}`
      const original = await lstat(sourcePath, { bigint: true })
      if (!original.isDirectory() || original.dev !== this.rootIdentity.dev)
        throw new AppError('forbidden')
      await verifyAudit()
      // An empty placeholder claims the name; renaming onto it fails if anything appears inside.
      await mkdir(targetPath).catch((error: unknown) => {
        throw entryError(error)
      })
      const placeholder = await lstat(targetPath, { bigint: true })
      try {
        if (!sameIdentity(original, await lstat(sourcePath, { bigint: true })))
          throw new AppError('conflict')
        await this.validateDirectory(sourceDirectory)
        await verifyAudit()
        await rename(sourcePath, targetPath)
      }
      catch (error) {
        const current = await lstat(targetPath, { bigint: true }).catch(() => undefined)
        if (current && sameIdentity(current, placeholder))
          await rmdir(targetPath).catch(() => {})
        throw entryError(error, 'exists')
      }
      await sourceDirectory.handle.sync()
      await targetDirectory.handle.sync()
    }, 'not_found'))
  }

  async deleteFile(path: string, expectedVersion: string): Promise<void> {
    allowedPath(path)
    const { parent, name } = this.split(path)
    await this.withDirectory(parent, async (directory) => {
      const identity = await this.assertWritable(directory)
      const original = await this.readIn(directory, name, path, true)
      if (original.version !== expectedVersion)
        throw new AppError('conflict', original.version)
      const target = `${directory.anchor}/${name}`
      await this.validateDirectory(directory)
      if (!retained(identity, original.stat, await lstat(target, { bigint: true })))
        throw new AppError('conflict')
      await unlink(target)
      await directory.handle.sync()
    })
  }

  async deleteDirectory(path: string): Promise<void> {
    allowedDirectoryPath(path)
    const { parent, name } = this.split(path)
    await this.withDirectory(parent, async (directory) => {
      await this.assertWritable(directory)
      const target = `${directory.anchor}/${name}`
      const stat = await lstat(target, { bigint: true })
      if (!stat.isDirectory() || stat.dev !== this.rootIdentity.dev)
        throw new AppError('forbidden')
      await rmdir(target).catch((error: unknown) => {
        throw entryError(error)
      })
      await directory.handle.sync()
    })
  }
}
