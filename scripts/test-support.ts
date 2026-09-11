import { watch } from 'node:fs'
import { lstat, readFile, realpath, statfs } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

export async function identifyFixture(path: string, expected: string) {
  if (!isAbsolute(path) || resolve(path) !== path || await realpath(path) !== path)
    throw new Error('Fixture paths must be canonical absolute directories')
  const metadata = await lstat(path, { bigint: true })
  const filesystem = await statfs(path, { bigint: true })
  const identity = { root: path, filesystemType: `0x${filesystem.type.toString(16)}`, device: String(metadata.dev) }
  if (!metadata.isDirectory() || identity.filesystemType !== expected)
    throw new Error(`Fixture identity mismatch: ${JSON.stringify(identity)}; expected ${expected}`)
  process.stdout.write(`${JSON.stringify(identity)}\n`)
  return identity
}

// Subscribe before launching a service. A marker is written only after an actual health check.
export function markerEvent(directory: string, name: string, timeoutMs = 15000) {
  let watcher: ReturnType<typeof watch> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let cancel = () => {}
  const promise = new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      watcher?.close()
      clearTimeout(timer)
      if (error)
        reject(error)
      else resolve()
    }
    cancel = () => finish()
    watcher = watch(directory, (_event, filename) => {
      if (filename === name)
        finish()
    })
    watcher.on('error', finish)
    timer = setTimeout(() => finish(new Error(`Service event timed out: ${name}`)), timeoutMs)
  })
  return { promise, cancel }
}

export async function health(origin: string) {
  const url = new URL(origin)
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
    throw new Error('Test URL must be an HTTP origin without credentials, query or path')
  const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(5000) })
  const body: unknown = await response.json()
  if (response.status !== 200 || JSON.stringify(body) !== '{"success":true,"data":{"status":"ok","service":"merdeck"}}')
    throw new Error('Test service failed its health contract')
}

export async function privateToken(path: string) {
  const metadata = await lstat(path)
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0 || metadata.uid !== process.getuid?.())
    throw new Error('Token file must be an owner-only regular file')
  const token = (await readFile(path, 'utf8')).trim()
  if (!/^[\x21-\x7E]{32,256}$/.test(token))
    throw new Error('Invalid private test token')
  return token
}
