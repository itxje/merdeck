import { Buffer } from 'node:buffer'
import { constants, openSync } from 'node:fs'
import { endianness } from 'node:os'
import { setImmediate as yieldEventLoop } from 'node:timers/promises'
import { CString, dlopen, FFIType, ptr, read } from 'bun:ffi'
import { AppError } from '../../shared/errors'

export const nativeDirectoryBytes = 4096

// Fixed glibc symbols and LP64 signatures; never accept loader/ABI parameters from transport.
function openLibc() {
  return dlopen('libc.so.6', {
    getdents64: { args: ['i32', 'ptr', 'usize'], returns: FFIType.i64_fast },
    __errno_location: { args: [], returns: 'ptr' },
    gnu_get_libc_version: { args: [], returns: 'ptr' },
    close: { args: ['i32'], returns: 'i32' },
  })
}

export function validateNativePlatform(platform: string, architecture: string, endian: string, bun: string): void {
  if (platform !== 'linux' || !['x64', 'arm64'].includes(architecture) || endian !== 'LE' || bun !== '1.4.2')
    throw new AppError('unavailable')
}

export function validateLibcVersion(version: string): void {
  const parts = /^(\d{1,3})\.(\d{1,3})(?:\.\d{1,3})?$/.exec(version)
  if (!parts || Number(parts[1]) < 2 || (Number(parts[1]) === 2 && Number(parts[2]) < 30))
    throw new AppError('unavailable')
}

export function nativeDirectoryError(errno: number): AppError {
  // EINTR is intentionally not retried. No errno, fd, path or pointer enters the public error.
  return new AppError(errno === 1 || errno === 13 ? 'forbidden' : errno === 2 ? 'directory_changed' : 'unavailable')
}

export function nativeByteCount(value: number | bigint): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > nativeDirectoryBytes)
    throw new AppError('unavailable')
  return value
}

// Loader injection is a trusted test seam; successful production loading is cached for process life.
export function createNativeRuntime(load = openLibc) {
  validateNativePlatform(process.platform, process.arch, endianness(), Bun.version)
  let library: ReturnType<typeof openLibc> | undefined
  try {
    library = load()
    const loaded = library
    const versionAddress = loaded.symbols.gnu_get_libc_version()
    if (!versionAddress)
      throw new AppError('unavailable')
    const version = new CString(versionAddress).toString()
    validateLibcVersion(version)
    return {
      version,
      refill(fd: number, bytes: Uint8Array): number {
        if (bytes.byteLength !== nativeDirectoryBytes)
          throw new AppError('unavailable')
        const address = ptr(bytes)
        const errnoAddress = loaded.symbols.__errno_location()
        if (!errnoAddress)
          throw new AppError('unavailable')
        const count = loaded.symbols.getdents64(fd, address, nativeDirectoryBytes)
        const errno = read.i32(errnoAddress)
        if (count === -1)
          throw nativeDirectoryError(errno)
        return nativeByteCount(count)
      },
      close(fd: number): void {
        const errnoAddress = loaded.symbols.__errno_location()
        if (!errnoAddress)
          throw new AppError('unavailable')
        const result = loaded.symbols.close(fd)
        const errno = read.i32(errnoAddress)
        if (result !== 0)
          throw nativeDirectoryError(errno)
      },
    }
  }
  catch {
    // No stream/native call is in flight during initialization failure.
    try {
      library?.close()
    }
    catch { /* The safe initialization failure remains authoritative. */ }
    throw new AppError('unavailable')
  }
}
export type NativeRuntime = ReturnType<typeof createNativeRuntime>
let runtime: NativeRuntime | undefined
export function initializeNativeDirectory(): NativeRuntime {
  // Keep this successful library and its bridges loaded for process life, including across service restarts.
  // Deliberately no dlclose: a service cannot invalidate symbols used by another service or active stream.
  return runtime ??= createNativeRuntime()
}

export function parseNativeRecord(bytes: Uint8Array, used: number, offset: number): { next: number, name: string } {
  if (!Number.isSafeInteger(used) || used < 0 || used > bytes.byteLength || used > nativeDirectoryBytes
    || !Number.isSafeInteger(offset) || offset < 0 || used - offset < 24) {
    throw new AppError('unavailable')
  }
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset + 16, true)
  if (length < 24 || length % 8 !== 0 || length > used - offset)
    throw new AppError('unavailable')
  const end = offset + length
  const start = offset + 19
  let nul = start
  while (nul < end && bytes[nul] !== 0)
    nul++
  if (nul === start || nul === end)
    throw new AppError('unavailable')
  const raw = bytes.subarray(start, nul)
  if (raw.includes(47))
    throw new AppError('unavailable')
  const name = Buffer.from(raw).toString('utf8')
  // Only an independent string survives the next refill; native d_type/ino/off confer no authority.
  return { next: end, name: Buffer.from(name).equals(raw) ? name : '' }
}

export class NativeDirectory {
  private used = 0
  private offset = 0
  private eof = false
  private active = false
  private closing: Promise<void> | undefined
  private closed = false
  private finished: Promise<void> = Promise.resolve()

  private constructor(readonly descriptor: number, private readonly native: NativeRuntime, private readonly bytes: Uint8Array) {}

  static open(path: string, native: NativeRuntime = initializeNativeDirectory()): NativeDirectory {
    // This internal path is supplied only by the descriptor-anchored repository.
    try {
      const bytes = new Uint8Array(nativeDirectoryBytes)
      const descriptor = openSync(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
      return new NativeDirectory(descriptor, native, bytes)
    }
    catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
      if (['EACCES', 'EPERM', 'ELOOP', 'ENOTDIR'].includes(String(code)))
        throw new AppError('forbidden')
      throw new AppError('unavailable')
    }
  }

  async read(check: () => void): Promise<string | null> {
    if (this.active || this.closed || this.closing)
      throw new AppError('unavailable')
    check()
    this.active = true
    let finish = () => {}
    this.finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    try {
      if (this.eof)
        return null
      if (this.offset === this.used) {
        let failure: unknown
        try {
          this.used = this.native.refill(this.descriptor, this.bytes)
          this.offset = 0
        }
        catch (error) {
          failure = error
        }
        // Synchronous native work blocks callbacks. Let pending abort/shutdown/expiry run before more I/O.
        await yieldEventLoop()
        check()
        if (this.closing)
          throw new AppError('unavailable')
        if (failure)
          throw failure
        if (this.used === 0) {
          this.eof = true
          return null
        }
      }
      const record = parseNativeRecord(this.bytes, this.used, this.offset)
      this.offset = record.next
      return record.name
    }
    finally {
      this.active = false
      finish()
    }
  }

  close(): Promise<void> {
    return this.closing ??= (async () => {
      await this.finished
      // Linux may release an fd even when close reports EINTR/another error. Never close that number again.
      this.closed = true
      this.native.close(this.descriptor)
    })()
  }
}
