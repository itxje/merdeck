import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { snapshotBuildAssets } from '../src/shared/application-build'
import { loadStaticAssets } from '../src/shared/static-assets'

export async function embedAssets(directory: string, scratch: string) {
  // The executable serves the shell with its build identity; record those bytes even when the build output lacks it.
  const { assets } = snapshotBuildAssets(await loadStaticAssets(resolve(directory)))
  const inventory = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, asset]) => ({ path, contentType: asset.contentType, size: asset.body.byteLength, sha256: createHash('sha256').update(asset.body).digest('hex') }))
  await mkdir(join(scratch, 'assets'))
  const imports: string[] = []
  const entries: string[] = []
  // Snapshot the already validated bytes, not later unchecked paths in the build tree.
  for (const [index, asset] of inventory.entries()) {
    const filename = `asset-${index}.bin`
    await writeFile(join(scratch, 'assets', filename), assets.get(asset.path)!.body)
    imports.push(`import asset${index} from ${JSON.stringify(`./assets/${filename}`)} with { type: "file" };`)
    entries.push(`[${JSON.stringify(asset.path)}, { contentType: ${JSON.stringify(asset.contentType)}, body: new Uint8Array(await Bun.file(asset${index}).arrayBuffer()) }]`)
  }
  await writeFile(join(scratch, 'assets.ts'), `${imports.join('\n')}\nexport const assets = new Map([${entries.join(',\n')}]);\n`)
  return inventory
}
