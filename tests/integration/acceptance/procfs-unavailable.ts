import * as filesystem from 'node:fs/promises'
import { mock } from 'bun:test'
import { createFixture, fixtureLimits, removeFixture } from '../files/fixtures'

async function main() {
  const root = await createFixture('files-procfs-')
  const originalRealpath = filesystem.realpath
  let unavailableLinks = 0
  try {
    await filesystem.writeFile(`${root}/welcome.mmd`, 'flowchart LR\nA-->B\n')
    mock.module('node:fs/promises', () => ({
      ...filesystem,
      realpath: async (path: Parameters<typeof filesystem.realpath>[0]) => {
        if (String(path).startsWith('/proc/self/fd/')) {
          unavailableLinks += 1
          throw Object.assign(new Error('Unavailable descriptor links'), { code: 'ENOENT' })
        }
        return originalRealpath(path)
      },
    }))
    const { createDiagramService } = await import('../../../src/modules/diagrams')
    let code: unknown
    try {
      await createDiagramService({ projectRoot: root, limits: fixtureLimits })
    }
    catch (error) { code = error && typeof error === 'object' && 'code' in error ? error.code : undefined }
    if (code !== 'unavailable' || unavailableLinks !== 1)
      throw new Error('Missing descriptor facilities must prevent startup')
    process.stdout.write(`${JSON.stringify({ missingProcfsStartup: 'unavailable', faultInjection: 'descriptor realpath ENOENT in isolated process' })}\n`)
  }
  finally {
    mock.restore()
    await removeFixture(root)
  }
}
void main().catch(() => {
  process.stderr.write('Missing-procfs acceptance failed.\n')
  process.exitCode = 1
})
