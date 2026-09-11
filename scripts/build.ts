import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { snapshotBuildAssets } from '../src/shared/application-build'
import { loadStaticAssets } from '../src/shared/static-assets'

const frontend = Bun.spawn([process.execPath, 'run', '--cwd', 'web', 'build'], { stdout: 'inherit', stderr: 'inherit' })
if (await frontend.exited !== 0)
  process.exit(1)
// Record the build identity in the shell itself, so served, embedded and released shell bytes match the build output.
const { assets } = snapshotBuildAssets(await loadStaticAssets(resolve('web/dist')))
await writeFile(resolve('web/dist/index.html'), assets.get('/index.html')!.body)
const result = await Bun.build({ entrypoints: ['src/index.ts'], outdir: 'dist', target: 'bun', minify: true })
if (!result.success) {
  for (const message of result.logs)
    process.stderr.write(`${message}\n`)
  process.exit(1)
}
