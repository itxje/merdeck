import type { BigIntStats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { statfsSync, writeFileSync } from 'node:fs'
import * as filesystem from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { afterAll, mock } from 'bun:test'
import { metadata } from './inode-metadata.ts'

// Isolated diagnostic preload only. Record existing calls; do not add target I/O.
const real = { ...filesystem }
const fixtures = new Set<string>()
const handles = new Map<number, string>()
const events: object[] = []
const prefix = resolve('tmp/files-markdown-context-')
const output = process.env.MERDECK_INODE_TRACE
if (!output || !resolve(output).startsWith(`${resolve('tmp')}/`))
  throw new Error('Diagnostic output must be inside project scratch')

function record(event: object) {
  if (events.length >= 50000)
    throw new Error('Diagnostic event bound exceeded')
  events.push({ sequence: events.length + 1, ...event })
}

function label(path: unknown): string | undefined {
  if (typeof path !== 'string')
    return undefined
  const descriptor = /^\/proc\/self\/fd\/(\d+)(\/.*)?$/.exec(path)
  if (descriptor) {
    const parent = handles.get(Number(descriptor[1]))
    return parent === undefined ? undefined : `fd:${descriptor[1]}:${parent}${descriptor[2] ?? ''}`
  }
  for (const fixture of fixtures) {
    if (path === fixture || path.startsWith(`${fixture}/`))
      return relative(resolve('tmp'), path)
  }
  return undefined
}

function digest(value: unknown): object {
  if (typeof value === 'string' || value instanceof Uint8Array)
    return { hash: createHash('sha256').update(value).digest('hex') }
  return {}
}

function tracedHandle(handle: FileHandle, path: string): FileHandle {
  const fd = handle.fd
  handles.set(fd, path)
  const methods = new Set(['stat', 'read', 'readFile', 'write', 'writeFile', 'sync', 'datasync', 'chmod', 'chown', 'close', 'truncate'])
  return new Proxy(handle, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function')
        return value
      if (typeof key !== 'string' || !methods.has(key))
        return value.bind(target)
      return async (...args: unknown[]) => {
        record({ operation: `${key}:begin`, fd, path, ...(key === 'writeFile' ? digest(args[0]) : {}) })
        try {
          const result: unknown = await Reflect.apply(value, target, args)
          record({
            operation: `${key}:end`,
            fd,
            path,
            ...(key === 'stat' ? { metadata: metadata(result as BigIntStats) } : {}),
            ...(key === 'readFile' ? digest(result) : {}),
            ...(key === 'read' && result && typeof result === 'object' && 'bytesRead' in result ? { bytesRead: result.bytesRead } : {}),
          })
          if (key === 'close')
            handles.delete(fd)
          return result
        }
        catch (error) {
          record({ operation: `${key}:error`, fd, path, code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown' })
          throw error
        }
      }
    },
  })
}

mock.module('node:fs/promises', () => ({
  ...real,
  mkdtemp: async (...args: Parameters<typeof real.mkdtemp>) => {
    const result = await real.mkdtemp(...args)
    if (typeof result === 'string' && result.startsWith(prefix)) {
      fixtures.add(result)
      record({ operation: 'mkdtemp', path: label(result), filesystemType: `0x${statfsSync(result, { bigint: true }).type.toString(16)}` })
    }
    return result
  },
  open: async (...args: Parameters<typeof real.open>) => {
    const path = label(args[0])
    const handle = await real.open(...args)
    if (!path)
      return handle
    record({ operation: 'open', path, fd: handle.fd, flags: args[1] })
    return tracedHandle(handle, path)
  },
  lstat: async (...args: Parameters<typeof real.lstat>) => {
    const result = await real.lstat(...args)
    const path = label(args[0])
    if (path)
      record({ operation: 'lstat', path, metadata: metadata(result as BigIntStats) })
    return result
  },
  rename: async (...args: Parameters<typeof real.rename>) => {
    const path = label(args[0])
    if (path)
      record({ operation: 'rename:begin', path, destination: label(args[1]) })
    await real.rename(...args)
    if (path)
      record({ operation: 'rename:end', path, destination: label(args[1]) })
  },
  writeFile: async (...args: Parameters<typeof real.writeFile>) => {
    const path = label(args[0])
    if (path)
      record({ operation: 'writeFile:path', path, ...digest(args[1]) })
    await real.writeFile(...args)
  },
  readFile: async (...args: Parameters<typeof real.readFile>) => {
    const result = await real.readFile(...args)
    const path = label(args[0])
    if (path)
      record({ operation: 'readFile:path', path, ...digest(result) })
    return result
  },
  unlink: async (...args: Parameters<typeof real.unlink>) => {
    const path = label(args[0])
    if (path)
      record({ operation: 'unlink:begin', path })
    await real.unlink(...args)
    if (path)
      record({ operation: 'unlink:end', path })
  },
  rm: async (...args: Parameters<typeof real.rm>) => {
    const path = label(args[0])
    if (path)
      record({ operation: 'rm:begin', path })
    await real.rm(...args)
    if (path)
      record({ operation: 'rm:end', path })
  },
}))

afterAll(() => {
  writeFileSync(output, `${JSON.stringify({ pid: process.pid, versions: { bun: process.versions.bun, node: process.versions.node }, openDescriptors: [...handles.keys()], events }, null, 2)}\n`)
})
