import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { project } from '../../scripts/ci/process'
import { embedAssets } from '../../scripts/embed-assets'
import { sha256 } from '../../scripts/release/manifest'
import { snapshotBuildAssets } from '../../src/shared/application-build'
import { loadStaticAssets } from '../../src/shared/static-assets'

test('embedded inventories record the bytes the executable serves, whether or not the built shell carries its identity', async () => {
  await mkdir(join(project, 'tmp'), { recursive: true })
  const directory = await mkdtemp(join(project, 'tmp/embed-test-'))
  try {
    const build = join(directory, 'build')
    await mkdir(join(build, 'assets'), { recursive: true })
    await writeFile(join(build, 'index.html'), '<!doctype html><html><head><title>Merdeck</title></head><body></body></html>')
    await writeFile(join(build, 'favicon.svg'), '<svg></svg>')
    await writeFile(join(build, 'assets/app.js'), 'export {}')
    const served = snapshotBuildAssets(await loadStaticAssets(build)).assets
    for (const variant of ['unmarked', 'marked']) {
      if (variant === 'marked')
        await writeFile(join(build, 'index.html'), served.get('/index.html')!.body)
      const scratch = join(directory, variant)
      await mkdir(scratch)
      const inventory = await embedAssets(build, scratch)
      expect(inventory.map(asset => asset.path)).toEqual(['/assets/app.js', '/favicon.svg', '/index.html'])
      for (const [index, asset] of inventory.entries()) {
        expect(asset.sha256).toBe(sha256(served.get(asset.path)!.body))
        expect(sha256(await readFile(join(scratch, 'assets', `asset-${index}.bin`)))).toBe(asset.sha256)
      }
    }
  }
  finally { await rm(directory, { recursive: true, force: true }) }
})
