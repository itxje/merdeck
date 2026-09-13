import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { createFixture, describeFixture, removeFixture } from '../tests/integration/files/fixtures'
import { project, requireSession } from './ci/process'

requireSession()
const evidence = await mkdtemp(join(project, 'tmp/directory-physical-'))
const commit = Bun.spawnSync(['git', 'rev-parse', 'HEAD'], { cwd: project })
assert.equal(commit.exitCode, 0)
await writeFile(join(evidence, 'source.json'), `${JSON.stringify({ commit: commit.stdout.toString().trim(), startedAt: new Date().toISOString(), adapterHash: createHash('sha256').update(await readFile(join(project, 'src/modules/diagrams/native-directory.ts'))).digest('hex') })}\n`)
const root = await createFixture('files-physical-directory-')
const identity = await describeFixture(root)
async function command(args: string[], name: string) {
  const child = Bun.spawn(args, { cwd: project, stdout: 'pipe', stderr: 'pipe', timeout: 180000 })
  const [exit, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  await writeFile(join(evidence, `${name}.log`), stdout + stderr)
  assert.equal(exit, 0, `${name} failed; evidence: ${evidence}`)
  assert.equal(child.signalCode, null)
  return stdout
}
try {
  if (identity.filesystemType !== process.env.MERDECK_TEST_EXPECTED_FS)
    throw new Error('Physical streaming requires the explicitly measured fixture filesystem')
  for (const [path, count] of [['small', 1003], ['huge', 32771], ['excluded', 10003]] as const) {
    await mkdir(join(root, path))
    for (let start = 0; start < count; start += 64) {
      await Promise.all(Array.from({ length: Math.min(64, count - start) }, (_, i) =>
        writeFile(join(root, path, `${path === 'excluded' ? '.' : ''}diagram-${String(start + i).padStart(6, '0')}.md`), 'graph TD\nA-->B\n')))
    }
  }
  const source = join(project, 'scripts/directory-streaming/driver.ts')
  const bundle = join(evidence, 'driver.js')
  const compiled = join(evidence, 'driver')
  await command([process.execPath, 'build', source, '--target=bun', '--minify', '--outfile', bundle], 'build-bundle')
  await command([process.execPath, 'build', source, '--compile', '--minify', '--outfile', compiled], 'build-compiled')
  const summaries = []
  for (const [mode, invocation] of [['source', [process.execPath, source]], ['bundle', [process.execPath, bundle]], ['compiled', [compiled]]] as const) {
    const trace = join(evidence, `${mode}.strace`)
    await command(['strace', '-f', '-yy', '-s', '256', '-e', 'trace=getdents64', '-o', trace, ...invocation, root, 'first'], `${mode}-first`)
    const lines = (await readFile(trace, 'utf8')).split('\n')
    const calls = lines.filter(line => line.includes('getdents64(') && ['small', 'huge'].some(path => line.includes(`<${root}/${path}>`)))
    for (const path of ['small', 'huge']) {
      const matching = calls.filter(line => line.includes(`<${root}/${path}>`))
      assert.equal(matching.length, 1, `${mode}/${path}: first page must issue exactly one fixed refill before EOF`)
      assert.match(matching[0]!, /, 4096\)\s+= [1-9]\d*$/)
    }
    const traversal = await command([...invocation, root, 'traverse'], `${mode}-traverse`)
    for (const [action, injection] of [['fault', 'error=EINTR'], ['cancel', 'delay_exit=200ms']] as const) {
      const faultTrace = join(evidence, `${mode}-${action}.strace`)
      await command(['strace', '-f', '-yy', '-e', 'trace=getdents64', '-e', `inject=getdents64:${injection}:when=1`, '-P', join(root, 'small'), '-o', faultTrace, ...invocation, root, action], `${mode}-${action}`)
      const faultCalls = (await readFile(faultTrace, 'utf8')).split('\n').filter(line => line.includes('getdents64('))
      assert.equal(faultCalls.length, 1, `${mode}/${action}: native call must not retry after cancellation/error`)
      assert.match(faultCalls[0]!, action === 'fault' ? /EINTR.*INJECTED/ : /DELAYED/)
    }
    const auditTrace = join(evidence, `${mode}-audit.strace`)
    await command(['strace', '-f', '-yy', '-e', 'trace=getdents64', '-P', join(root, 'huge'), '-o', auditTrace, ...invocation, root, 'audit'], `${mode}-audit`)
    const auditCalls = (await readFile(auditTrace, 'utf8')).split('\n').filter(line => line.includes('getdents64('))
    assert(auditCalls.length > 0 && auditCalls.length <= 8192)
    for (const line of auditCalls)
      assert.match(line, /, 4096\)\s+= [1-9]\d*$/)
    const rawRecords = auditCalls.reduce((sum, line) => {
      const match = /\/\* (\d+) entries \*\//.exec(line)
      assert(match, 'Trace must expose the actual raw record count')
      return sum + Number(match[1])
    }, 0)
    assert(rawRecords <= 8192 + 170, 'Audit cannot read the entire directory or an unbounded prefix')
    summaries.push({ mode, firstPageCalls: calls, traversal: traversal.trim().split('\n').map(line => JSON.parse(line)), sha256: createHash('sha256').update(await readFile(mode === 'source' ? source : mode === 'bundle' ? bundle : compiled)).digest('hex') })
  }
  const adapterHash = createHash('sha256').update(await readFile(join(project, 'src/modules/diagrams/native-directory.ts'))).digest('hex')
  await writeFile(join(evidence, 'summary.json'), `${JSON.stringify({ status: 'passed', identity, adapterHash, bun: Bun.version, architecture: process.arch, nativeAcceptance: 'not established by this adapter harness', summaries }, null, 2)}\n`)
  process.stdout.write(`Physical application-adapter source/bundle/compiled checks passed: ${evidence}\n`)
}
finally {
  try {
    // The existing hosted uploader collects this directory; keep large build intermediates outside it.
    const retained = join(project, 'tmp/ci-evidence', basename(evidence))
    await mkdir(retained, { recursive: true })
    for (const name of await readdir(evidence)) {
      if (/\.(?:log|json|strace)$/.test(name))
        await copyFile(join(evidence, name), join(retained, name))
    }
  }
  finally { await removeFixture(root) }
}
