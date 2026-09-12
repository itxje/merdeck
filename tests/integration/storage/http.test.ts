import type { ApiResult, DiagramDocument, SessionStatus } from '../../../src/shared/contracts'
import { randomBytes } from 'node:crypto'
import { readFile, rename, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { createApp } from '../../../src/app'
import { loadConfig } from '../../../src/config'
import { createDiagramService } from '../../../src/modules/diagrams'
import { createFixture, removeFixture } from '../files/fixtures'

test.each([false, true])('HTTP storage contract uses actual writable capability; unsupported=%s', async (unsupported) => {
  const root = await createFixture('files-storage-http-', unsupported)
  let close = () => {}
  const original = '\uFEFF# Keep\r\n```mermaid\r\ngraph TD\r\n```\r\nMiddle\r\n~~~mermaid\r\ngraph LR\r\n~~~\r\nTail'
  try {
    await writeFile(join(root, 'guide.md'), original)
    const token = randomBytes(32).toString('hex')
    const config = await loadConfig({ MERDECK_ROOT: root, MERDECK_TOKEN: token })
    const diagrams = await createDiagramService(config)
    const storage = await diagrams.storageStatus()
    expect(storage.writable).toBe(!unsupported)
    expect(storage.filesystemType).toBe(unsupported ? process.env.MERDECK_TEST_UNSUPPORTED_FS ?? '0x6a656a63' : process.env.MERDECK_TEST_EXPECTED_FS ?? '0x794c7630')
    const app = createApp(config, { diagrams })
    close = app.close
    const origin = config.allowedOrigins[0]!
    const request = (path: string, init?: RequestInit) => app.request(`${origin}/api${path}`, init)
    const data = async <T>(response: Response) => {
      expect(response.status).toBe(200)
      const body = await response.json() as ApiResult<T>
      if (!body.success)
        throw new Error('Expected successful HTTP envelope')
      return body.data
    }
    expect(await data<SessionStatus>(await request('/session'))).toEqual({ authenticated: false })
    expect((await request('/diagrams/tree')).status).toBe(401)
    const login = await request('/session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const session = await data<SessionStatus>(login)
    if (!session.authenticated || session.access !== 'token')
      throw new Error('Expected a token session')
    expect(session.storage).toEqual({ writable: storage.writable, identity: storage.identity, filesystemType: storage.filesystemType, supportedFilesystem: storage.supportedFilesystem })
    expect(JSON.stringify(session)).not.toContain(root)
    expect(session.storage).not.toHaveProperty('device')
    const headers = { 'Origin': origin, 'Content-Type': 'application/json', 'Cookie': login.headers.get('set-cookie')!.split(';')[0]!, 'X-CSRF-Token': session.csrfToken }
    const doc = await data<DiagramDocument>(await request('/diagrams/document?path=guide.md', { headers }))
    const payload = { path: doc.path, expectedVersion: doc.version, selector: doc.blocks[1]!.selector, source: 'graph LR\nSaved-->Bytes\n' }
    const save = () => request('/diagrams/source', { method: 'PUT', headers, body: JSON.stringify(payload) })
    if (unsupported) {
      const result = await save()
      expect(result.status).toBe(503)
      expect(await result.json()).toEqual({ success: false, error: { code: 'filesystem_unsupported', message: 'Saving is unavailable on this filesystem. Ask the operator to verify write support for the configured project.' } })
      expect(await readFile(join(root, doc.path), 'utf8')).toBe(original)
    }
    else {
      const saved = await data<DiagramDocument>(await save())
      const bytes = original.replace('graph LR\r\n', payload.source.replaceAll('\n', '\r\n'))
      expect(await readFile(join(root, doc.path), 'utf8')).toBe(bytes)
      payload.expectedVersion = saved.version
      payload.selector = saved.blocks[1]!.selector
      for (const mode of ['in-place', 'atomic']) {
        const external = `${bytes}\r\nExternal ${mode}`
        const path = join(root, doc.path)
        await writeFile(mode === 'atomic' ? `${path}.external` : path, external)
        if (mode === 'atomic')
          await rename(`${path}.external`, path)
        expect((await save()).status).toBe(409)
        expect(await readFile(path, 'utf8')).toBe(external)
      }
    }
    const entry = (route: string, body: unknown) => request(`/diagrams/entries${route}`, { method: 'POST', headers, body: JSON.stringify(body) })
    if (unsupported) {
      for (const [route, body] of [['', { kind: 'directory', path: 'folder' }], ['/move', { kind: 'file', from: doc.path, to: 'moved.md', expectedVersion: doc.version }], ['/delete', { kind: 'file', path: doc.path, expectedVersion: doc.version }]] as const) {
        const result = await entry(route, body)
        expect(result.status).toBe(503)
        expect(await result.json()).toMatchObject({ success: false, error: { code: 'filesystem_unsupported' } })
      }
      expect(await readFile(join(root, doc.path), 'utf8')).toBe(original)
    }
    else {
      expect((await entry('', { kind: 'directory', path: 'folder' })).status).toBe(200)
      expect((await entry('/delete', { kind: 'directory', path: 'folder' })).status).toBe(200)
    }
    await symlink(join(root, 'guide.md'), join(root, 'alias.md'))
    expect((await request('/diagrams/document?path=alias.md', { headers })).status).toBe(403)
    expect((await request('/diagrams/document?path=..%2Foutside.mmd', { headers })).status).toBe(400)
    expect((await request('/session', { method: 'DELETE', headers })).status).toBe(200)
    expect((await request('/diagrams/tree', { headers })).status).toBe(401)
  }
  finally {
    close()
    await removeFixture(root)
  }
})
