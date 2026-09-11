import type { Buffer } from 'node:buffer'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { Snapshot } from './support'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

export interface ActorResult {
  pid: number
  operation: string
  operationError: string | null
  before: Snapshot
  after: Snapshot
  descriptor: { openedDev: string, openedIno: string, dev: string | null, ino: string | null, nlink: string | null, hash: string | null, writeError: string | null } | null
}
export const children = new Set<ChildProcessWithoutNullStreams>()
export const childEvidence: { pid: number, code: number | null, timedOut: boolean }[] = []
export function startActor(base: string, operation: string, path: string, value?: string) {
  const child = spawn(process.execPath, [resolve(import.meta.dir, 'actor.ts'), base, operation, path, ...(value === undefined ? [] : [value])], { cwd: base, stdio: 'pipe' })
  children.add(child)
  let output = ''
  let errors = ''
  let timedOut = false
  let readyResolve: () => void = () => {}
  let readyReject: (error: Error) => void = () => {}
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve
    readyReject = reject
  })
  // Non-held actors do not wait for a readiness handshake.
  void ready.catch(() => {})
  const timeout = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
  }, 4000)
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString()
    if (output.startsWith('ready\n'))
      readyResolve()
  })
  child.stderr.on('data', (chunk: Buffer) => {
    errors += chunk.toString()
  })
  const done = new Promise<ActorResult>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => {
      clearTimeout(timeout)
      children.delete(child)
      childEvidence.push({ pid: child.pid ?? -1, code, timedOut })
      if (code !== 0 || timedOut) {
        const error = new Error(`Owned actor failed: ${code}; ${errors}`)
        readyReject(error)
        reject(error)
        return
      }
      try {
        const result = JSON.parse(output.trim().split('\n').at(-1) ?? '') as ActorResult
        assert.equal(result.pid, child.pid)
        resolve(result)
      }
      catch (error) {
        reject(error)
      }
    })
  })
  void done.catch(() => {})
  return { ready, done, release: () => {
    child.stdin.end('write')
  } }
}
export async function actor(base: string, operation: string, path: string, value?: string): Promise<ActorResult> {
  return startActor(base, operation, path, value).done
}
export async function stopOwnedChildren(): Promise<void> {
  await Promise.all([...children].map(child => new Promise<void>((resolve) => {
    child.once('close', () => resolve())
    child.kill('SIGKILL')
  })))
}
