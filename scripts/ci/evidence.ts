import { lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { project } from './process'

// Upload only bounded textual reports from synthetic tests. Raw traces/configs/cookies/video never leave the runner.
const destination = join(project, 'tmp/ci-evidence')
await mkdir(destination, { recursive: true })
const redact = (value: string) => value.replaceAll(project, '<checkout>').replace(/\/(?:home|tmp|dev\/shm)\/[^\s"'<>]+/g, '<local-path>')
for (const entry of await readdir(join(project, 'tmp'), { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^(?:hosted-|storage-check-|release-smoke-)/.test(entry.name))
    continue
  const source = join(project, 'tmp', entry.name)
  for (const name of await readdir(source)) {
    if (!/^(?:provenance\.json|exit\.json|result\.json|admission\.json|checks\.log|raw-\d+\.(?:json|stdout|stderr|exit\.json)|files\.(?:stdout|stderr|exit\.json)|http\.(?:stdout|stderr|exit\.json))$/.test(name))
      continue
    const metadata = await lstat(join(source, name))
    if (!metadata.isFile() || metadata.isSymbolicLink())
      throw new Error('Evidence export refuses nonregular entries')
    if (metadata.size > 2 * 1024 * 1024)
      throw new Error('Evidence exceeded the bounded export limit')
    await writeFile(join(destination, `${entry.name}-${name}`), redact(await readFile(join(source, name), 'utf8')))
  }
}

for (const [name, path] of [['backend-coverage.lcov', 'coverage/lcov.info'], ['frontend-coverage.lcov', 'web/coverage/lcov.info']] as const) {
  const source = join(project, path)
  if (!await Bun.file(source).exists())
    continue
  const metadata = await lstat(source)
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 2 * 1024 * 1024)
    throw new Error('Coverage export requires a bounded regular file')
  await writeFile(join(destination, name), redact(await readFile(source, 'utf8')))
}
