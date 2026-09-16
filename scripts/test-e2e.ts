import { createHash, randomBytes } from 'node:crypto'
import { chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { basename, join, resolve } from 'node:path'
import { health, identifyFixture, markerEvent, privateToken } from './test-support'

const project = resolve(import.meta.dir, '..')
const session = `${basename(project).replaceAll('.', '-')}-${createHash('md5').update(project).digest('hex').slice(0, 6)}`
const expected = process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630'
const unsupportedExpected = process.env.MERDECK_TEST_UNSUPPORTED_FS ?? '0x6a656a63'
const parent = process.env.MERDECK_TEST_FIXTURE_PARENT
const unsupportedParent = process.env.MERDECK_TEST_UNSUPPORTED_PARENT
if (Bun.version !== '1.4.2' || !process.env.TMUX || process.cwd() !== project)
  throw new Error('Run from the project root inside its tmux session using Bun 1.4.2')
if (!parent || !unsupportedParent || expected === unsupportedExpected)
  throw new Error('Explicit supported and unsupported fixture parents with distinct expected filesystems are required')
await identifyFixture(parent, expected)
await identifyFixture(unsupportedParent, unsupportedExpected)
process.stdout.write(`${JSON.stringify({ bun: Bun.version, node: Bun.spawnSync(['node', '--version']).stdout.toString().trim(), platform: process.platform, architecture: process.arch })}\n`)

function tmux(args: string[]) {
  const result = Bun.spawnSync(['tmux', ...args], { cwd: project })
  if (result.exitCode !== 0)
    throw new Error(`tmux operation failed: ${args[0]}`)
  return result.stdout.toString().trim()
}
if (tmux(['display-message', '-p', '#S']) !== session)
  throw new Error(`Use the project tmux session: ${session}`)

async function availableOrigin() {
  const socket = createServer()
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.listen(0, '127.0.0.1', resolve)
  })
  const address = socket.address()
  if (!address || typeof address === 'string')
    throw new Error('Unable to allocate an acceptance port')
  await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve()))
  return `http://127.0.0.1:${address.port}`
}
const quote = (value: string) => `'${value.replaceAll('\'', '\'\\\'\'')}'`
await mkdir(join(project, 'tmp'), { recursive: true })
const scratch = await mkdtemp(join(project, 'tmp/e2e-'))
const ownedRoots: string[] = []
const windows: { id: string, marker: string }[] = []
const tokenFile = join(scratch, 'token')
let fakeCodex: string | undefined
if (process.env.MERDECK_TEST_AGENTS === 'true') {
  fakeCodex = join(scratch, 'fake-codex')
  await writeFile(fakeCodex, `#!${process.execPath}\n${String.raw`
let pending = ''
let turn = 0
const decoder = new TextDecoder()
for await (const chunk of Bun.stdin.stream()) {
  pending += decoder.decode(chunk, { stream: true })
  let newline
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (!line) continue
    const message = JSON.parse(line)
    if (message.method === 'initialize')
      console.log(JSON.stringify({ id: message.id, result: { userAgent: 'merdeck-browser-fake' } }))
    else if (message.method === 'thread/start')
      console.log(JSON.stringify({ id: message.id, result: { thread: { id: 'browser-thread' } } }))
    else if (message.method === 'model/list')
      console.log(JSON.stringify({ id: message.id, result: { data: [{ model: 'browser-model', displayName: 'Browser model', description: 'Deterministic browser fixture', hidden: false, isDefault: true }], nextCursor: null } }))
    else if (message.method === 'turn/start') {
      turn++
      const turnId = 'browser-turn-' + turn
      console.log(JSON.stringify({ id: message.id, result: { turn: { id: turnId } } }))
      console.log(JSON.stringify({ method: 'item/agentMessage/delta', params: { threadId: 'browser-thread', turnId, itemId: 'message-' + turn, delta: turn === 1 ? '<img src=x onerror=alert(1)> Updated the diagram.' : 'Waiting for cancellation.' } }))
      if (turn === 1)
        console.log(JSON.stringify({ id: 'browser-approval', method: 'item/fileChange/requestApproval', params: { threadId: 'browser-thread', turnId, itemId: 'change-1', startedAtMs: Date.now(), reason: 'Update agent-live.mmd' } }))
    }
    else if (message.id === 'browser-approval') {
      if (message.result?.decision === 'accept') {
        await Bun.write('agent-live.mmd', 'flowchart LR\nA[AI]-->B[Live]\n')
        console.log(JSON.stringify({ method: 'item/fileChange/patchUpdated', params: { threadId: 'browser-thread', turnId: 'browser-turn-1', itemId: 'change-1', changes: [{ path: 'agent-live.mmd', kind: { type: 'update', move_path: null }, diff: 'updated' }] } }))
      }
      console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'browser-thread', turn: { id: 'browser-turn-1', status: 'completed' } } }))
    }
    else if (message.method === 'turn/interrupt') {
      console.log(JSON.stringify({ id: message.id, result: {} }))
      console.log(JSON.stringify({ method: 'turn/completed', params: { threadId: 'browser-thread', turn: { id: message.params.turnId, status: 'interrupted' } } }))
    }
  }
}
`}`, { mode: 0o700 })
  await chmod(fakeCodex, 0o700)
}
let status = 1
async function start(root: string, role: string, withToken = true) {
  const origin = await availableOrigin()
  const marker = join(scratch, `${role}.ready`)
  const configFile = join(scratch, `${role}.json`)
  // A service started without the token file runs with open access.
  const maxFileBytes = process.env.MERDECK_TEST_MAX_FILE_BYTES
  await writeFile(configFile, JSON.stringify({ root, origin, tokenFile: withToken ? tokenFile : undefined, marker, ...(role === 'supported' && fakeCodex ? { codexPath: fakeCodex } : {}), ...(maxFileBytes ? { maxFileBytes: Number(maxFileBytes) } : {}) }), { mode: 0o600 })
  const ready = markerEvent(scratch, basename(marker))
  try {
    const command = `${quote(process.execPath)} ${quote(join(project, 'scripts/test-service.ts'))} ${quote(configFile)} > ${quote(join(scratch, `${role}.log`))} 2>&1`
    const id = tmux(['new-window', '-d', '-P', '-F', '#{window_id}', '-t', session, '-n', `acceptance-${role}`, '-c', project, 'bash', '-c', command])
    windows.push({ id, marker })
    await ready.promise
    if (await readFile(marker, 'utf8') !== 'ready')
      throw new Error(`Acceptance ${role} service failed to start`)
    await health(origin)
    process.stdout.write(`${JSON.stringify({ role, origin, reachability: 'local machine only' })}\n`)
    return origin
  }
  finally { ready.cancel() }
}
try {
  let root = process.env.MERDECK_SMOKE_ROOT
  let origin = process.env.MERDECK_TEST_URL
  let unsupportedOrigin = process.env.MERDECK_UNSUPPORTED_URL
  let secretFile = process.env.MERDECK_SMOKE_TOKEN_FILE
  let openRoot = process.env.MERDECK_OPEN_ROOT
  let openOrigin = process.env.MERDECK_OPEN_URL
  const external = [root, origin, unsupportedOrigin, secretFile].some(Boolean)
  if (external) {
    if (!root || !origin || !unsupportedOrigin || !secretFile || process.env.MERDECK_TEST_DISPOSABLE !== 'true')
      throw new Error('Existing-service mode requires both URLs, disposable sample root, private token file and MERDECK_TEST_DISPOSABLE=true')
    // An open-access service is optional here; without one the open-access spec is skipped.
    if (Boolean(openRoot) !== Boolean(openOrigin))
      throw new Error('An existing open-access service requires both MERDECK_OPEN_URL and its disposable MERDECK_OPEN_ROOT')
    await identifyFixture(root, expected)
    await privateToken(secretFile)
    await health(origin)
    await health(unsupportedOrigin)
    if (openRoot && openOrigin) {
      await identifyFixture(openRoot, expected)
      await health(openOrigin)
    }
  }
  else {
    if (!await Bun.file(join(project, 'dist/index.js')).exists() || !await Bun.file(join(project, 'web/dist/index.html')).exists())
      throw new Error('Build both production outputs before running browser acceptance')
    await writeFile(tokenFile, randomBytes(32).toString('hex'), { mode: 0o600 })
    root = await mkdtemp(join(parent, 'browser-supported-'))
    ownedRoots.push(root)
    const unsupportedRoot = await mkdtemp(join(unsupportedParent, 'browser-unsupported-'))
    ownedRoots.push(unsupportedRoot)
    openRoot = await mkdtemp(join(parent, 'browser-open-'))
    ownedRoots.push(openRoot)
    for (const fixture of ownedRoots)
      await cp(join(project, 'examples/project'), fixture, { recursive: true })
    await identifyFixture(root, expected)
    await identifyFixture(unsupportedRoot, unsupportedExpected)
    await identifyFixture(openRoot, expected)
    origin = await start(root, 'supported')
    unsupportedOrigin = await start(unsupportedRoot, 'unsupported')
    openOrigin = await start(openRoot, 'open', false)
    secretFile = tokenFile
  }
  await writeFile(join(scratch, 'environment.json'), JSON.stringify({ root, origin, unsupportedOrigin, openRoot, openOrigin, expected, unsupportedExpected }, null, 2))
  const child = Bun.spawn([process.execPath, 'run', '--cwd', 'web', 'test:e2e', ...process.argv.slice(2)], {
    cwd: project,
    env: { ...process.env, MERDECK_SMOKE_ROOT: root, MERDECK_TEST_URL: origin, MERDECK_UNSUPPORTED_URL: unsupportedOrigin, MERDECK_SMOKE_TOKEN_FILE: secretFile, MERDECK_TEST_EXPECTED_FS: expected, ...(openRoot && openOrigin ? { MERDECK_OPEN_ROOT: openRoot, MERDECK_OPEN_URL: openOrigin } : {}) },
    stdout: 'inherit',
    stderr: 'inherit',
    timeout: 360000,
  })
  status = await child.exited
  process.stdout.write(`${JSON.stringify({ browserExit: status, evidence: scratch })}\n`)
}
finally {
  const failures: string[] = []
  for (const window of windows.reverse()) {
    if (await Bun.file(`${window.marker}.stopped`).exists())
      continue
    const stopped = markerEvent(scratch, `${basename(window.marker)}.stopped`)
    try {
      tmux(['send-keys', '-t', window.id, 'C-c'])
      await stopped.promise
      process.stdout.write(`${JSON.stringify({ serviceStopped: basename(window.marker) })}\n`)
    }
    catch { failures.push(`Service stop could not be verified: ${basename(window.marker)}`) }
    finally { stopped.cancel() }
  }
  try {
    if (failures.length === 0) {
      for (const root of ownedRoots) {
        await rm(root, { recursive: true, force: true })
        process.stdout.write(`${JSON.stringify({ fixtureRemoved: root })}\n`)
      }
    }
    else {
      process.stderr.write('Fixture roots retained because service shutdown was not confirmed.\n')
    }
  }
  finally {
    for (const role of ['supported', 'unsupported', 'open'])
      await rm(join(scratch, `${role}.json`), { force: true })
    await rm(tokenFile, { force: true })
  }
  if (failures.length) {
    process.stderr.write(`${failures.join('; ')}\n`)
    status = 1
  }
}
process.exitCode = status
