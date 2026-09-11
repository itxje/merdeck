import { resolve } from 'node:path'
import { expect, test } from 'bun:test'

test('missing procfs facilities fail closed in an isolated runtime', async () => {
  const child = Bun.spawn([process.execPath, resolve(import.meta.dir, 'procfs-unavailable.ts')], { stdout: 'pipe', stderr: 'pipe', timeout: 10000 })
  const [stdout, stderr, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  expect(stderr).toBe('')
  expect(exit).toBe(0)
  expect(stdout).toContain('"missingProcfsStartup":"unavailable"')
  expect(stdout).toContain('"fixtureRemoved":')
})
