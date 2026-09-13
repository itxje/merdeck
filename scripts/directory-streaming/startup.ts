import assert from 'node:assert/strict'
import { startService } from '../../src/service'

// Dedicated failing-startup process: observe actual timer disposal without changing service behavior.
const intervals = new Set<ReturnType<typeof setInterval>>()
const originalSet = globalThis.setInterval
const originalClear = globalThis.clearInterval
let created = 0
globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
  const timer = originalSet(...args)
  created++
  intervals.add(timer)
  return timer
}) as typeof setInterval
globalThis.clearInterval = ((timer: ReturnType<typeof setInterval>) => {
  intervals.delete(timer)
  originalClear(timer)
}) as typeof clearInterval
try {
  await startService({ assets: new Map() }) // Missing shell fails after the directory service exists.
  assert.equal(process.exitCode, 1)
  assert.equal(created, 1)
  assert.equal(intervals.size, 0)
  process.stdout.write(`${JSON.stringify({ created, remaining: intervals.size, status: 'cleanup passed' })}\n`)
}
finally {
  globalThis.setInterval = originalSet
  globalThis.clearInterval = originalClear
}
