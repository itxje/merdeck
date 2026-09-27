import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdtemp, open, readdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { directoryEvidenceSchema } from './directory-evidence'
import { project } from './process'
import { redactReport } from './redact'

// Every exported byte passes the same bounded descriptor read, allowlist and redaction boundary.
async function regularBytes(path: string, maximum: number, digest = false): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const before = await file.stat({ bigint: true })
    if (!before.isFile() || before.size > BigInt(maximum))
      throw new Error('Evidence export requires a bounded regular file')
    const hash = createHash('sha256')
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const buffer = new Uint8Array(Math.min(65536, maximum + 1 - total))
      const { bytesRead } = await file.read(buffer)
      if (!bytesRead)
        break
      total += bytesRead
      if (total > maximum)
        throw new Error('Evidence exceeded the bounded export limit')
      const bytes = buffer.subarray(0, bytesRead)
      if (digest)
        hash.update(bytes)
      else chunks.push(bytes)
    }
    const after = await file.stat({ bigint: true })
    if (before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || BigInt(total) !== before.size)
      throw new Error('Evidence changed during export')
    return digest ? hash.digest('hex') : new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
  }
  finally { await file.close() }
}
const textLimit = 2 * 1024 * 1024
async function writeReport(path: string, text: string, root: string, maximum: number) {
  const sanitized = redactReport(text, root)
  if (Buffer.byteLength(sanitized) > maximum)
    throw new Error('Sanitized evidence exceeds its export limit')
  await writeFile(path, sanitized)
}
async function directory(path: string) {
  const metadata = await lstat(path)
  if (!metadata.isDirectory() || metadata.isSymbolicLink())
    throw new Error('Evidence export refuses nonregular directories')
}
export async function exportEvidence(root: string, expectedCommit: string): Promise<string> {
  if (!/^[a-f0-9]{40}$/.test(expectedCommit))
    throw new Error('Evidence export requires exact source identity')
  const scratch = join(root, 'tmp')
  await directory(scratch)
  const destination = join(scratch, 'ci-evidence')
  // Quarantine previous output before any new export; an old raw file can never survive into an upload.
  try {
    await directory(destination)
    const archive = await mkdtemp(join(scratch, 'prior-evidence-'))
    await rename(destination, join(archive, 'reports'))
  }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      throw error
  }
  const staging = await mkdtemp(join(scratch, 'evidence-stage-'))
  let reportNumber = 0
  let legacyNumber = 0
  for (const entry of (await readdir(scratch, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!/^(?:directory-physical-|hosted-|storage-check-|release-smoke-)/.test(entry.name))
      continue
    const source = join(scratch, entry.name)
    await directory(source)
    if (entry.name.startsWith('directory-physical-')) {
      const path = join(source, 'report.json')
      if (!(await readdir(source)).includes('report.json'))
        continue
      const input = JSON.parse(await regularBytes(path, 65536))
      if (input && typeof input.commit === 'string' && /^[a-f0-9]{40}$/.test(input.commit) && input.commit !== expectedCommit)
        continue // Stale runs cannot become evidence for this source commit.
      const report = directoryEvidenceSchema.parse(input)
      if (!report.sourceClean)
        throw new Error('Directory evidence requires clean source provenance')
      if (report.adapterHash !== await regularBytes(join(root, 'src/modules/diagrams/native-directory.ts'), textLimit, true)
        || report.driverHash !== await regularBytes(join(root, 'scripts/directory-streaming/driver.ts'), textLimit, true)) {
        throw new Error('Directory evidence source hash mismatch')
      }
      for (const mode of report.modes) {
        if (mode.buildHash !== null) {
          const actual = mode.mode === 'source' ? report.driverHash : await regularBytes(join(source, mode.mode === 'bundle' ? 'driver.js' : 'driver'), 512 * 1024 * 1024, true)
          if (mode.buildHash !== actual)
            throw new Error('Directory evidence build hash mismatch')
        }
      }
      const sanitized = `${JSON.stringify(report, null, 2)}\n`
      if (sanitized.length > 65536)
        throw new Error('Directory evidence exceeds its export limit')
      await writeReport(join(staging, `directory-streaming-${String(++reportNumber).padStart(2, '0')}.json`), sanitized, root, 65536)
      continue
    }
    const prefix = `${entry.name.startsWith('hosted-') ? 'hosted' : entry.name.startsWith('storage-check-') ? 'storage' : 'release'}-${String(++legacyNumber).padStart(2, '0')}`
    for (const name of await readdir(source)) {
      if (!/^(?:provenance\.json|exit\.json|result\.json|admission\.json|checks\.log|raw-\d+\.(?:json|stdout|stderr|exit\.json)|files\.(?:stdout|stderr|exit\.json)|http\.(?:stdout|stderr|exit\.json))$/.test(name))
        continue
      await writeReport(join(staging, `${prefix}-${name}`), await regularBytes(join(source, name), textLimit), root, textLimit)
    }
  }
  for (const [name, path] of [['backend-coverage.lcov', 'coverage/lcov.info'], ['frontend-coverage.lcov', 'web/coverage/lcov.info']] as const) {
    const source = join(root, path)
    try {
      await lstat(source)
    }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        continue
      throw error
    }
    await writeReport(join(staging, name), await regularBytes(source, textLimit), root, textLimit)
  }
  await rename(staging, destination)
  return destination
}
if (import.meta.main) {
  const commit = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: project })
  if (commit.exitCode !== 0)
    throw new Error('Evidence source identity unavailable')
  await exportEvidence(project, commit.stdout.toString().trim())
}
