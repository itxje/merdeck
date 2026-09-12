import { randomBytes } from 'node:crypto'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { project, requireSession, run } from './ci/process'
import { releaseVersion } from './release-version'
import { archiveEntries, archiveName, bundleEntry } from './release/archive'
import { bundleFiles } from './release/bundle-manifest'
import { sha256 } from './release/manifest'
import { health, identifyFixture, privateToken } from './test-support'

async function availableOrigin() {
  const socket = createServer()
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const address = socket.address()
  if (!address || typeof address === 'string')
    throw new Error('Port allocation failed')
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  return `http://127.0.0.1:${address.port}`
}

async function treeInventory(directory: string, relative = ''): Promise<string[]> {
  const lines: string[] = []
  for (const entry of (await readdir(join(directory, relative), { withFileTypes: true })).sort((first, second) => (first.name < second.name ? -1 : 1))) {
    const path = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.isDirectory())
      lines.push(...await treeInventory(directory, path))
    else lines.push(`${path} ${sha256(new Uint8Array(await readFile(join(directory, path))))}`)
  }
  return lines
}

// The published bundle is started by this runtime, serves its own archived interface and keeps its extracted tree unchanged.
export async function smokeBundle(directory: string, tag: string) {
  requireSession()
  const { manifest } = await bundleFiles(directory, tag)
  if (process.platform !== 'linux')
    throw new Error('The bundle runs on Linux, where the service admits project storage')
  const parent = process.env.MERDECK_TEST_FIXTURE_PARENT
  const unsupported = process.env.MERDECK_TEST_UNSUPPORTED_PARENT
  const expected = process.env.MERDECK_TEST_EXPECTED_FS
  const refusal = process.env.MERDECK_TEST_UNSUPPORTED_FS
  if (!parent || !unsupported || !expected || !refusal)
    throw new Error('Explicit observed supported/refusal fixture parents and filesystem types are required')
  const positiveIdentity = await identifyFixture(parent, expected)
  const negativeIdentity = await identifyFixture(unsupported, refusal)
  const scratch = await mkdtemp('/tmp/merdeck-bundle-')
  const runtime = join(scratch, 'runtime')
  await mkdir(runtime)
  for (const entry of archiveEntries(new Uint8Array(await readFile(join(directory, archiveName))))) {
    await mkdir(join(runtime, dirname(entry.path)), { recursive: true })
    await writeFile(join(runtime, entry.path), entry.bytes, { mode: 0o644 })
  }
  const extracted = await treeInventory(runtime)
  const tokenFile = join(scratch, 'token')
  await writeFile(tokenFile, randomBytes(32).toString('hex'), { mode: 0o600 })
  const token = await privateToken(tokenFile)
  const roots: string[] = []
  const services: { role: string, origin: string, child: ReturnType<typeof Bun.spawn> }[] = []
  let failure: unknown
  let checkedFiles = 0
  async function start(root: string, role: string) {
    const origin = await availableOrigin()
    const child = Bun.spawn([process.execPath, join(runtime, bundleEntry)], {
      cwd: runtime,
      env: { PATH: '', TZ: 'UTC', LANG: 'C', NODE_ENV: 'production', MERDECK_ROOT: root, MERDECK_TOKEN: token, MERDECK_HOST: '127.0.0.1', PORT: new URL(origin).port, MERDECK_ALLOWED_ORIGINS: origin, MERDECK_API_MODE: 'prefixed', MERDECK_COOKIE_SECURE: 'auto', MERDECK_MAX_FILE_BYTES: '8192', MERDECK_MAX_TREE_ENTRIES: '100', MERDECK_POLL_INTERVAL_MS: '1000' },
      stdout: 'inherit',
      stderr: 'inherit',
    })
    services.push({ role, origin, child })
    const deadline = Date.now() + 20000
    while (true) {
      try {
        if ((await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(2000) })).ok)
          break
      }
      catch {}
      if (child.exitCode !== null || Date.now() > deadline)
        throw new Error('Bundle service startup failed')
      await Bun.sleep(200)
    }
    await health(origin)
    process.stdout.write(`${JSON.stringify({ bundleOrigin: origin, reachability: 'loopback on this machine only', runtime: manifest.runtime })}\n`)
    return origin
  }
  try {
    for (const [fixtureParent, role] of [[parent, 'supported'], [unsupported, 'unsupported']] as const) {
      const root = await mkdtemp(join(fixtureParent, `bundle-${role}-`))
      roots.push(root)
      await cp(join(project, 'examples/project'), root, { recursive: true })
    }
    const origin = await start(roots[0]!, 'supported')
    const unsupportedOrigin = await start(roots[1]!, 'unsupported')
    const login = await fetch(`${origin}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': origin }, body: JSON.stringify({ token }) })
    const status = await login.json() as { data?: { version?: string } }
    if (login.status !== 200 || status.data?.version !== manifest.version)
      throw new Error('Bundle-reported version mismatch')
    for (const file of manifest.files.filter(item => item.path.startsWith('web/'))) {
      const path = file.path === 'web/index.html' ? '/' : file.path.slice('web'.length)
      const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(10000) })
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (response.status !== 200 || bytes.byteLength !== file.size || sha256(bytes) !== file.sha256 || response.headers.get('x-content-type-options') !== 'nosniff' || !response.headers.get('content-security-policy')?.includes('script-src \'self\''))
        throw new Error(`Bundle asset HTTP mismatch: ${file.path}`)
      checkedFiles++
    }
    for (const path of ['/api/diagrams/tree', '/api/diagrams/document?path=welcome.mmd']) {
      if ((await fetch(`${origin}${path}`)).status !== 401)
        throw new Error('Bundle authentication boundary failed')
    }
    for (const path of ['/api/missing', '/assets/missing.js', '/src/index.ts', '/.env']) {
      if ((await fetch(`${origin}${path}`)).status !== 404)
        throw new Error('Bundle static/API containment boundary failed')
    }
    await run(['run', 'test:e2e'], 360000, { ...process.env, MERDECK_TEST_URL: origin, MERDECK_UNSUPPORTED_URL: unsupportedOrigin, MERDECK_SMOKE_ROOT: roots[0]!, MERDECK_SMOKE_TOKEN_FILE: tokenFile, MERDECK_TEST_DISPOSABLE: 'true' }, [token])
    // Running the bundle must not add, remove or rewrite anything it was extracted from.
    if (JSON.stringify(await treeInventory(runtime)) !== JSON.stringify(extracted))
      throw new Error('The extracted bundle changed while it ran')
  }
  catch (error) { failure = error }
  let stopped = true
  for (const service of services.reverse()) {
    try {
      service.child.kill('SIGTERM')
      const exit = await Promise.race([service.child.exited, Bun.sleep(15000).then(() => 'timeout' as const)])
      if (exit === 'timeout')
        throw new Error('Bundle service did not stop')
      try {
        await fetch(`${service.origin}/api/health`, { signal: AbortSignal.timeout(2000) })
        throw new Error('Bundle listener is still reachable')
      }
      catch (error) {
        if (error instanceof Error && error.message === 'Bundle listener is still reachable')
          throw error
      }
    }
    catch (error) {
      failure ??= error
      stopped = false
    }
  }
  let cleaned = stopped
  try {
    await rm(tokenFile, { force: true })
    if (stopped) {
      for (const root of roots)
        await rm(root, { recursive: true, force: true })
      await rm(scratch, { recursive: true, force: true })
    }
  }
  catch (error) {
    failure ??= error
    cleaned = false
  }
  const result = { runtime: `${manifest.runtime} ${manifest.bun}`, host: process.arch, version: manifest.version, files: manifest.files.length, checkedFiles, origins: services.map(item => item.origin), accessScope: 'loopback only; configured disposable sample roots', positiveIdentity, negativeIdentity, extractionUnchanged: !failure, cleanup: cleaned, result: failure ? 'failed' : 'passed' }
  process.stdout.write(`${JSON.stringify(result)}\n`)
  if (failure)
    throw failure
}

if (import.meta.main) {
  const values = process.argv.slice(2)
  if (values.length !== 2 || values[0] !== '--tag' || !values[1])
    throw new Error('Usage: --tag vMAJOR.MINOR.PATCH[-prerelease]')
  await smokeBundle(join(project, 'dist/bundle'), releaseVersion(values[1]).tag)
}
