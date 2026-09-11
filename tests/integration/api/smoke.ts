import type { ApiResult, DiagramDocument, SessionStatus, TreeSnapshot } from '../../../src/shared/contracts'
import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, realpath, rm, stat, statfs, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { inspectFilesystem } from '../../../src/modules/diagrams/filesystem'

// Run only against an explicitly selected disposable copy of examples/project.
async function main() {
  const root = process.env.MERDECK_SMOKE_ROOT
  const origin = process.env.MERDECK_SMOKE_URL
  const tokenFile = process.env.MERDECK_SMOKE_TOKEN_FILE
  if (!root || !origin || !tokenFile || new URL(origin).origin !== origin || await realpath(root) !== root)
    throw new Error('Explicit smoke root, origin and private token file are required')
  const filesystem = await statfs(root, { bigint: true })
  const expected = process.env.MERDECK_TEST_EXPECTED_FS
  assert(expected, 'An explicit expected smoke filesystem type is required')
  assert.equal(`0x${filesystem.type.toString(16)}`, expected, 'Smoke root must match the actual expected filesystem')
  const device = (await stat(root, { bigint: true })).dev
  assert.equal((await inspectFilesystem(root, device, device)).writable, true, 'Production must admit writes on the actual smoke root')
  process.stdout.write(`${JSON.stringify({ root, filesystemType: `0x${filesystem.type.toString(16)}`, device: String((await stat(root, { bigint: true })).dev), origin })}\n`)
  const scratch = await mkdtemp(resolve('tmp/api-http-smoke-'))
  let cookie = ''
  let csrf = ''
  let serial = 0
  const request = async (path: string, method = 'GET', body?: unknown, authenticated = true) => {
    const prefix = join(scratch, String(++serial))
    const config = [
      'silent',
      'show-error',
      'max-time = 20',
      `url = ${JSON.stringify(`${origin}${path}`)}`,
      `request = ${JSON.stringify(method)}`,
      `output = ${JSON.stringify(`${prefix}.response`)}`,
      `dump-header = ${JSON.stringify(`${prefix}.headers`)}`,
      'write-out = "%{http_code}"',
      `header = ${JSON.stringify(`Origin: ${origin}`)}`,
    ]
    if (authenticated && cookie) {
      config.push(`header = ${JSON.stringify(`Cookie: ${cookie}`)}`)
      config.push(`header = ${JSON.stringify(`X-CSRF-Token: ${csrf}`)}`)
    }
    if (body !== undefined) {
      await writeFile(`${prefix}.body`, JSON.stringify(body), { mode: 0o600 })
      config.push('header = "Content-Type: application/json"')
      config.push(`data-binary = ${JSON.stringify(`@${prefix}.body`)}`)
    }
    await writeFile(`${prefix}.config`, `${config.join('\n')}\n`, { mode: 0o600 })
    const child = Bun.spawn(['curl', '--config', `${prefix}.config`], { stdout: 'pipe', stderr: 'pipe' })
    const code = Number(await new Response(child.stdout).text())
    assert.equal(await child.exited, 0, 'HTTP transport must succeed')
    const bytes = await readFile(`${prefix}.response`)
    const headers = await readFile(`${prefix}.headers`, 'utf8')
    process.stdout.write(`${JSON.stringify({ method, path, status: code })}\n`)
    return { code, bytes, headers }
  }
  const data = <T>(bytes: Uint8Array): T => {
    const envelope = JSON.parse(new TextDecoder().decode(bytes)) as ApiResult<T>
    assert(envelope.success, 'Expected successful API envelope')
    return envelope.data
  }
  const path = 'docs/overview.md'
  const original = await readFile(join(root, path))
  try {
    assert.deepEqual(data((await request('/api/session')).bytes), { authenticated: false })
    assert.equal((await request('/api/diagrams/tree')).code, 401)
    const loggedIn = await request('/api/session', 'POST', { token: (await readFile(tokenFile, 'utf8')).trim() }, false)
    assert.equal(loggedIn.code, 200)
    const session = data<SessionStatus>(loggedIn.bytes)
    assert(session.authenticated && session.access === 'token')
    assert(session.storage.writable)
    cookie = /^set-cookie: ([^;\r\n]+)/im.exec(loggedIn.headers)?.[1] ?? ''
    csrf = session.csrfToken
    assert(cookie)
    const tree = data<TreeSnapshot>((await request('/api/diagrams/tree')).bytes)
    assert(tree.entries.some(entry => entry.path === path))
    const doc = data<DiagramDocument>((await request(`/api/diagrams/document?path=${encodeURIComponent(path)}`)).bytes)
    assert(doc.blocks.length >= 2)
    const source = 'flowchart TD\n  Smoke --> Verified\n'
    const payload = { path, selector: doc.blocks[0]!.selector, expectedVersion: doc.version, source }
    const saved = await request('/api/diagrams/source', 'PUT', payload)
    assert.equal(saved.code, 200)
    const updated = data<DiagramDocument>(saved.bytes)
    assert.notEqual(updated.version, doc.version)
    assert.equal(updated.blocks[1]!.source, doc.blocks[1]!.source)
    const persisted = await readFile(join(root, path), 'utf8')
    assert.equal(persisted, original.toString().replace(doc.blocks[0]!.source, source))
    await writeFile(join(root, path), `${persisted}\nExternal smoke update.\n`)
    const revision = data<{ version: string }>((await request(`/api/diagrams/revision?path=${encodeURIComponent(path)}`)).bytes)
    assert.notEqual(revision.version, updated.version)
    const conflict = await request('/api/diagrams/source', 'PUT', { ...payload, selector: updated.blocks[0]!.selector, expectedVersion: updated.version })
    assert.equal(conflict.code, 409)
    assert.match((await readFile(join(root, path))).toString(), /External smoke update\./)
    if (process.env.MERDECK_SMOKE_STATIC !== 'false') {
      const shell = await request('/')
      assert.equal(shell.code, 200)
      assert.match(shell.headers, /content-security-policy:/i)
      const asset = /src="(\/assets\/[^"\s]+\.js)"/.exec(shell.bytes.toString())?.[1]
      assert(asset, 'Built page must reference a local JavaScript asset')
      const javascript = await request(asset)
      assert.equal(javascript.code, 200)
      assert.match(javascript.headers, /content-type: text\/javascript/i)
      assert.equal((await request('/assets/missing.js')).code, 404)
    }
    assert.equal((await request('/api/session', 'DELETE')).code, 200)
    assert.equal((await request('/api/diagrams/tree')).code, 401)
    process.stdout.write('HTTP smoke passed; source bytes, conflict preservation, session invalidation and selected mount verified.\n')
  }
  finally {
    await writeFile(join(root, path), original)
    await rm(scratch, { recursive: true, force: true })
  }
}

main().catch(() => {
  process.stderr.write('HTTP smoke failed; inspect safe status evidence.\n')
  process.exitCode = 1
})
