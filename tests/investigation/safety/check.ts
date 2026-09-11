import type { BaselineModule, Evidence } from './support'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { lstat, mkdir, mkdtemp, readdir, realpath, rm, statfs, writeFile } from 'node:fs/promises'
import { release } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { baselineScenarios } from './baseline-scenarios'
import { candidateScenarios } from './candidates'
import { childEvidence, children, stopOwnedChildren } from './process'
import { absent, baseline, hash, inside, original, project, safeScratch, schedule, scratch } from './support'

const files = ['src/modules/diagrams/index.ts', 'src/modules/diagrams/parser.ts', 'src/modules/diagrams/repository.ts', 'src/modules/diagrams/service.ts', 'src/config.ts', 'src/shared/contracts.ts', 'src/shared/errors.ts']
const expectedIds = [
  ...['observe', 'write', 'replace', 'delete', 'hold'].map(value => `publication-${value}`),
  'earlier-write-control',
  'earlier-delete-control',
  'markdown-control',
  ...['before-directory-validation', 'after-read-validation', 'publish-directory', 'publish-root'].map(value => `move-${value}`),
  'path-and-symlink-controls',
  'native-mode-capability',
  ...['copy-write', 'link-write', 'link-replace', 'cleanup-late-descriptor', 'cleanup-replacement-before-unlink', 'quarantine-conflict', 'rollback-overwrite'].map(value => `candidate-${value}`),
]

async function extract(runDirectory: string, readInstrumentation: boolean) {
  const sourceHashes: Record<string, string> = {}
  const patches = [
    // eslint-disable-next-line no-template-curly-in-string -- Match the pinned source bytes without evaluating them.
    ['        await rename(temporary, `${directory.anchor}/${name}`)', '        await schedule.hit(\'publish\')\n        await rename(temporary, `${directory.anchor}/${name}`)\n        await schedule.hit(\'published\')'],
    ['      const buffer = Buffer.alloc(this.config.limits.maxFileBytes + 1)', '      await schedule.hit(\'read\')\n      const buffer = Buffer.alloc(this.config.limits.maxFileBytes + 1)'],
    ['        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length)', '        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length)\n        await schedule.hit(\'read-complete\')'],
  ] as const
  for (const path of files) {
    const bytes = execFileSync('git', ['show', `${baseline}:${path}`], { cwd: project, timeout: 3000, maxBuffer: 128 * 1024 })
    sourceHashes[path] = hash(bytes)
    let source = bytes.toString('utf8')
    if (path.endsWith('/repository.ts')) {
      for (const [search, replace] of readInstrumentation ? patches : patches.slice(0, 1)) {
        assert.equal(source.split(search).length, 2, 'Pinned seam must match exactly once')
        source = source.replace(search, replace)
      }
      source = `import { schedule } from ${JSON.stringify(pathToFileURL(join(import.meta.dir, 'support.ts')).href)}\n${source}`
    }
    const target = join(runDirectory, 'baseline', path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, source, { flag: 'wx' })
  }
  return { sourceHashes, seams: (readInstrumentation ? patches : patches.slice(0, 1)).map(([point]) => point.trim()), module: await import(pathToFileURL(join(runDirectory, 'baseline/src/modules/diagrams/index.ts')).href) as BaselineModule }
}

async function main(): Promise<void> {
  assert.equal(Bun.version, '1.4.2', 'Use the project-local pinned Bun')
  assert.equal(execFileSync('node', ['--version'], { timeout: 3000 }).toString().trim(), 'v24.20.0')
  assert.equal(process.platform, 'linux')
  assert.equal(await realpath(project), project)
  // Refuse symlinked scratch parents before creating any nested paths.
  await mkdir(join(project, 'tmp'), { recursive: true })
  assert(!(await lstat(join(project, 'tmp'))).isSymbolicLink())
  await mkdir(scratch, { recursive: true })
  await safeScratch()
  execFileSync('git', ['check-ignore', '--quiet', 'tmp/safety/'], { cwd: project, timeout: 3000 })
  const runDirectory = await mkdtemp(join(scratch, 'run-'))
  inside(scratch, runDirectory)
  const started = Date.now()
  const evidence: Evidence[] = []
  const summary: Record<string, unknown> = {
    schemaVersion: 1,
    purpose: 'Pinned loss diagnostics and bounded research evidence; NOT application safety acceptance',
    baseline,
    runtime: { bun: Bun.version, node: '24.20.0', platform: process.platform, kernel: release(), filesystemType: `0x${(await statfs(runDirectory)).type.toString(16)}`, uid: process.getuid?.() },
    limits: { scenarios: expectedIds.length, totalMilliseconds: 45000, childMilliseconds: 4000, fixtureFileBytes: 4096 },
    evidence,
    childEvidence,
    applicationSafetyPassed: false,
    scope: 'Only generated fixtures; scheduled same-uid processes; no HTTP/browser/other-account or power-loss test',
  }
  const resultPath = join(scratch, 'evidence.json')
  await writeFile(resultPath, `${JSON.stringify({ ...summary, diagnosticCompletenessPassed: false, inProgress: true })}\n`)
  const deadline = setTimeout(() => {
    for (const child of children)
      child.kill('SIGKILL')
    summary.diagnosticCompletenessPassed = false
    summary.failure = 'Investigation exceeded the 45-second deadline'
    summary.remainingOwnedChildren = children.size
    try {
      rmSync(runDirectory, { recursive: true, force: true })
      summary.runCleanupVerified = !existsSync(runDirectory)
    }
    catch (error) {
      summary.runCleanupVerified = false
      summary.cleanupError = String(error)
    }
    writeFileSync(resultPath, `${JSON.stringify(summary, null, 2)}\n`)
    console.error('Finite investigation exceeded 45 seconds; only owned children were terminated')
    process.exit(1)
  }, 45000)
  let failure: unknown
  try {
    const extracted = await extract(join(runDirectory, 'publication-only'), false)
    const readProbe = await extract(join(runDirectory, 'read-boundaries'), true)
    summary.sourceHashes = extracted.sourceHashes
    assert.deepEqual(extracted.sourceHashes, readProbe.sourceHashes)
    summary.injectedSeams = { publicationOnly: extracted.seams, readBoundaries: readProbe.seams }
    const run: Parameters<typeof baselineScenarios>[2] = async (id, action) => {
      assert(expectedIds.includes(id) && !evidence.some(item => item.id === id))
      summary.activeScenario = id
      const base = join(runDirectory, 'fixtures', id)
      const root = join(base, 'project')
      const path = 'docs/diagram.mmd'
      await mkdir(join(root, 'docs'), { recursive: true })
      const target = join(root, path)
      await writeFile(target, original, { flag: 'wx' })
      let item: Evidence | undefined
      try {
        item = await action({ base, root, target, path })
        assert.equal(item.id, id)
        assert.equal(children.size, 0, 'No child may outlive its scenario')
        evidence.push(item)
      }
      finally {
        schedule.hit = async () => {}
        await stopOwnedChildren()
        inside(runDirectory, base)
        assert.equal(await realpath(base), base)
        await rm(base, { recursive: true })
        const cleanupVerified = await absent(base)
        assert(cleanupVerified)
        if (item)
          item.fixtureCleanupVerified = cleanupVerified
      }
    }
    await baselineScenarios(extracted.module, readProbe.module, run)
    await candidateScenarios(run)
    assert.deepEqual(evidence.map(item => item.id), expectedIds)
    assert.equal(evidence.filter(item => item.classification === 'loss-diagnostic').length, 3)
    assert(evidence.every(item => item.fixtureCleanupVerified === true))
    // Expected capability denials are structured results; an actor crash always fails the driver.
    assert(childEvidence.every(item => !item.timedOut && item.pid > 0 && item.code === 0))
    summary.diagnosticCompletenessPassed = true
    summary.activeScenario = null
  }
  catch (error) {
    failure = error
    summary.diagnosticCompletenessPassed = false
    summary.failure = error instanceof Error ? error.message : String(error)
  }
  finally {
    await stopOwnedChildren()
    inside(scratch, runDirectory)
    await rm(runDirectory, { recursive: true })
    clearTimeout(deadline)
    summary.runCleanupVerified = await absent(runDirectory)
    assert(summary.runCleanupVerified)
    summary.durationMilliseconds = Date.now() - started
    summary.remainingOwnedChildren = children.size
    summary.scratchEntriesAfterCleanup = await readdir(scratch)
    await writeFile(resultPath, `${JSON.stringify(summary, null, 2)}\n`)
    process.stdout.write(`${summary.diagnosticCompletenessPassed ? 'DIAGNOSTICS COMPLETE' : 'DIAGNOSTICS FAILED'}: ${relative(project, resultPath)}; applicationSafetyPassed=false\n`)
  }
  if (failure)
    throw failure
}
main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
