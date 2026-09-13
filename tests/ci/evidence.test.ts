import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { afterEach, expect, test } from 'bun:test'
import { exportEvidence } from '../../scripts/ci/evidence'

const roots: string[] = []
const commit = 'a'.repeat(40)
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
async function fixture(status: 'passed' | 'failed' = 'passed') {
  const root = await mkdtemp(resolve('tmp/evidence-test-'))
  roots.push(root)
  const source = join(root, 'tmp/directory-physical-private-owner')
  await mkdir(source, { recursive: true })
  await mkdir(join(root, 'src/modules/diagrams'), { recursive: true })
  await mkdir(join(root, 'scripts/directory-streaming'), { recursive: true })
  await writeFile(join(root, 'src/modules/diagrams/native-directory.ts'), 'adapter bytes')
  await writeFile(join(root, 'scripts/directory-streaming/driver.ts'), 'source bytes')
  await writeFile(join(source, 'driver.js'), 'bundle bytes')
  await writeFile(join(source, 'driver'), 'compiled bytes')
  const report = {
    schemaVersion: 1,
    commit,
    sourceClean: true,
    adapterHash: hash('adapter bytes'),
    driverHash: hash('source bytes'),
    bun: '1.4.2',
    architecture: 'arm64',
    filesystemType: '0x794c7630',
    status,
    error: status === 'passed' ? null : 'verification_failed',
    modes: (['source', 'bundle', 'compiled'] as const).map(mode => ({
      mode,
      status,
      buildHash: hash(`${mode} bytes`),
      firstPages: (['small', 'huge'] as const).map(fixture => ({ fixture, calls: 1, capacity: 4096, returnedBytes: 4088, rawRecords: 103, eof: false })),
      traversals: [{ fixture: 'small', pages: 6, visited: 1005, excluded: 2, entries: 1003, complete: true }, { fixture: 'huge', pages: 164, visited: 32773, excluded: 2, entries: 32771, complete: true }, { fixture: 'excluded', pages: 10, visited: 10005, excluded: 10005, entries: 0, complete: true }],
      eintrCalls: 1,
      cancellation: { calls: 1, elapsedMs: 200 },
      audit: { calls: 32, rawRecords: 3200, consumed: 3089, eof: false },
    })),
  }
  await writeFile(join(source, 'report.json'), JSON.stringify(report))
  return { root, source, report }
}
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

test.each(['passed', 'failed'] as const)('exports bounded neutral %s proof with exact identities and no raw evidence', async (status) => {
  const f = await fixture(status)
  for (const name of ['raw.strace', 'source.json', 'private.log', 'config.json', 'cookie'])
    await writeFile(join(f.source, name), '/home/private/secret checkout cookie=value')
  await mkdir(join(f.root, 'tmp/ci-evidence/old-private-owner'), { recursive: true })
  await writeFile(join(f.root, 'tmp/ci-evidence/old-private-owner/raw.strace'), 'STALE SECRET')
  const destination = await exportEvidence(f.root, commit)
  expect(await readdir(destination)).toEqual(['directory-streaming-01.json'])
  const text = await readFile(join(destination, 'directory-streaming-01.json'), 'utf8')
  expect(JSON.parse(text)).toEqual(f.report)
  for (const secret of [f.root, 'private-owner', 'cookie', 'STALE', '.strace'])
    expect(text).not.toContain(secret)
})

test('rejects unsafe report fields, identity mismatch and unbounded numbers', async () => {
  for (const change of [{ sourceClean: false }, { adapterHash: 'b'.repeat(64) }, { driverHash: 'b'.repeat(64) }, { error: '/home/private/secret' }, { rawTrace: 'getdents64(10</tmp/private>)' }, { architecture: 'private-owner' }]) {
    const f = await fixture('failed')
    await writeFile(join(f.source, 'report.json'), JSON.stringify({ ...f.report, ...change }))
    await expect(exportEvidence(f.root, commit)).rejects.toThrow()
  }
  const stale = await fixture()
  await writeFile(join(stale.source, 'report.json'), JSON.stringify({ ...stale.report, commit: 'b'.repeat(40) }))
  expect(await readdir(await exportEvidence(stale.root, commit))).toEqual([])
  const f = await fixture()
  f.report.modes[0]!.buildHash = 'b'.repeat(64)
  await writeFile(join(f.source, 'report.json'), JSON.stringify(f.report))
  await expect(exportEvidence(f.root, commit)).rejects.toThrow()
})

test.each(['symlink', 'directory', 'oversize'] as const)('refuses %s reports without publishing stale evidence', async (kind) => {
  const f = await fixture()
  const path = join(f.source, 'report.json')
  await rm(path)
  if (kind === 'symlink') {
    await writeFile(join(f.root, 'secret'), '{}')
    await symlink(join(f.root, 'secret'), path)
  }
  else if (kind === 'directory') {
    await mkdir(path)
  }
  else {
    await writeFile(path, 'x'.repeat(65537))
  }
  await mkdir(join(f.root, 'tmp/ci-evidence'), { recursive: true })
  await writeFile(join(f.root, 'tmp/ci-evidence/stale.strace'), 'PRIVATE')
  await expect(exportEvidence(f.root, commit)).rejects.toThrow()
  expect(await Bun.file(join(f.root, 'tmp/ci-evidence/stale.strace')).exists()).toBe(false)
})

test('legacy bounded reports retain path redaction and neutral filenames', async () => {
  const f = await fixture('failed')
  await mkdir(join(f.root, 'tmp/hosted-private-owner'))
  await writeFile(join(f.root, 'tmp/hosted-private-owner/checks.log'), `${f.root}/tmp/local /home/private/worktree /tmp/token /dev/shm/project`)
  const destination = await exportEvidence(f.root, commit)
  const names = await readdir(destination)
  expect(names.some(name => name.includes('private'))).toBe(false)
  const log = names.find(name => name.endsWith('checks.log'))!
  const text = await readFile(join(destination, log), 'utf8')
  expect(text).not.toContain('private')
  expect(text).not.toContain(f.root)
  expect(text).toContain('<local-path>')
})

test('bounded reports reject impossible physical counts and incomplete passing modes', async () => {
  const f = await fixture()
  for (const count of [-1, 4097, 1.5]) {
    f.report.modes[0]!.firstPages[0]!.returnedBytes = count
    await writeFile(join(f.source, 'report.json'), JSON.stringify(f.report))
    await expect(exportEvidence(f.root, commit)).rejects.toThrow()
  }
  f.report.modes[0]!.firstPages = []
  await writeFile(join(f.source, 'report.json'), JSON.stringify(f.report))
  await expect(exportEvidence(f.root, commit)).rejects.toThrow()
})

test('build identity reads reject symlinks and legacy reads retain byte limits', async () => {
  const f = await fixture()
  await rm(join(f.source, 'driver.js'))
  await symlink(join(f.source, 'driver'), join(f.source, 'driver.js'))
  await expect(exportEvidence(f.root, commit)).rejects.toThrow()
  await rm(join(f.source, 'driver.js'))
  await writeFile(join(f.source, 'driver.js'), 'bundle bytes')
  const legacy = join(f.root, 'tmp/hosted-private')
  await mkdir(legacy)
  await writeFile(join(legacy, 'checks.log'), 'x'.repeat(2 * 1024 * 1024 + 1))
  await expect(exportEvidence(f.root, commit)).rejects.toThrow()
})

test('failure report redaction omits raw syscall and credential/source diagnostic lines', async () => {
  const f = await fixture('failed')
  const source = join(f.root, 'tmp/hosted-private')
  await mkdir(source)
  await writeFile(join(source, 'checks.log'), 'getdents64(10</private/path>, pointer, 4096)\nSet-Cookie: secret=value\nAuthorization: Bearer secret\n15 | private source code\nsafe failure\n')
  const destination = await exportEvidence(f.root, commit)
  const name = (await readdir(destination)).find(name => name.endsWith('checks.log'))!
  const text = await readFile(join(destination, name), 'utf8')
  expect(text).toContain('safe failure')
  for (const secret of ['getdents64', 'secret', 'private source', '/private'])
    expect(text).not.toContain(secret)
})

test('redacted output is bounded after expansion, and arbitrary fixture/runtime paths are removed', async () => {
  const f = await fixture('failed')
  const source = join(f.root, 'tmp/hosted-private')
  await mkdir(source)
  await writeFile(join(source, 'checks.log'), 'Cookie:\n'.repeat(80000))
  await expect(exportEvidence(f.root, commit)).rejects.toThrow('Sanitized evidence exceeds its export limit')
  await writeFile(join(source, 'checks.log'), '/mnt/private-fixture /usr/local/runtime https://example.test/report')
  const destination = await exportEvidence(f.root, commit)
  const name = (await readdir(destination)).find(name => name.endsWith('checks.log'))!
  const text = await readFile(join(destination, name), 'utf8')
  expect(text).not.toContain('/mnt/private-fixture')
  expect(text).not.toContain('/usr/local/runtime')
  expect(text).toContain('https://example.test/report')
})
