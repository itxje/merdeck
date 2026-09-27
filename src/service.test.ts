import { expect, test } from 'bun:test'
import { createFixture, removeFixture } from '../tests/integration/files/fixtures'

test('startup failure after repository initialization disposes its directory sweep', async () => {
  const root = await createFixture('files-startup-cleanup-')
  try {
    // Isolate the intentional startup exitCode=1 from the test runner's own exit status.
    const child = Bun.spawn([process.execPath, 'scripts/directory-streaming/startup.ts'], {
      env: { ...process.env, MERDECK_ROOT: root, MERDECK_API_MODE: 'prefixed' },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 5000,
    })
    const [exit, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
    expect(exit).toBe(1)
    expect(child.signalCode).toBeNull()
    expect(stderr).toBe('Service startup failed.\n')
    expect(JSON.parse(stdout)).toEqual({ created: 1, remaining: 0, status: 'cleanup passed' })
  }
  finally { await removeFixture(root) }
})
