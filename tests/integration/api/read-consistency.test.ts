import type { FileHandle } from 'node:fs/promises'
import type { ApiResult, DiagramDocument, DocumentRevision, SessionStatus } from '../../../src/shared/contracts'
import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { createApp } from '../../../src/app'
import { loadConfig } from '../../../src/config'
import { createDiagramService } from '../../../src/modules/diagrams'
import { createFixture, removeFixture } from '../files/fixtures'

const hash = (source: string) => createHash('sha256').update(source).digest('hex')
const currentSource = 'graph TD\nCurrent-->Value\n'

for (const mechanism of ['service-save', 'in-place', 'atomic'] as const) {
  for (const endpoint of ['document', 'revision'] as const) {
    test(`authenticated ${endpoint} stabilizes across ${mechanism} with real descriptor checks`, async () => {
      const root = await createFixture('files-read-http-')
      const path = join(root, 'flow.mmd')
      const token = crypto.randomUUID() + crypto.randomUUID()
      const events: object[] = []
      const handles: FileHandle[] = []
      const opened = Promise.withResolvers<FileHandle>()
      const resume = Promise.withResolvers<void>()
      let armed = false
      let app: ReturnType<typeof createApp> | undefined
      const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: request => app ? app.fetch(request) : new Response(null, { status: 503 }) })
      const origin = `http://127.0.0.1:${server.port}`
      async function request<T>(route: string, init?: RequestInit) {
        const response = await fetch(`${origin}/api/${route}`, { ...init, signal: AbortSignal.timeout(4000) })
        const body = await response.json() as ApiResult<T>
        events.push({ method: init?.method ?? 'GET', route, status: response.status, code: body.success ? undefined : body.error.code })
        return { response, body }
      }
      try {
        await writeFile(path, 'graph TD\nInitial-->Value\n')
        const config = await loadConfig({ MERDECK_ROOT: root, MERDECK_TOKEN: token, PORT: String(server.port), MERDECK_ALLOWED_ORIGINS: origin })
        const diagrams = await createDiagramService(config, { repositoryHooks: {
          afterReadOpen: async (_, handle) => {
            handles.push(handle)
            if (!armed || mechanism !== 'service-save')
              return
            armed = false
            opened.resolve(handle)
            await resume.promise
          },
          afterFileOpen: async () => {
            if (!armed || mechanism === 'service-save')
              return
            armed = false
            const child = Bun.spawn([process.execPath, '-e', 'import {writeFile,rename} from "node:fs/promises"; const [p,mode,source]=process.argv.slice(1); const target=mode==="atomic"?p+".new":p; await writeFile(target,source); if(mode==="atomic") await rename(target,p)', path, mechanism, currentSource], { stdout: 'ignore', stderr: 'pipe', timeout: 3000 })
            expect(await child.exited).toBe(0)
            events.push({ phase: 'independent-writer-completed', mode: mechanism, exit: child.exitCode })
          },
        } })
        events.push({ storage: await diagrams.storageStatus() })
        app = createApp(config, { diagrams })
        const login = await request<SessionStatus>('session', { method: 'POST', headers: { 'Origin': origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        expect(login.response.status).toBe(200)
        if (!login.body.success || !login.body.data.authenticated || login.body.data.access !== 'token')
          throw new Error('Expected private test session')
        const headers = { 'Cookie': login.response.headers.get('set-cookie')!.split(';')[0]!, 'Origin': origin, 'Content-Type': 'application/json', 'X-CSRF-Token': login.body.data.csrfToken }
        const initial = await request<DiagramDocument>('diagrams/document?path=flow.mmd', { headers })
        if (!initial.body.success)
          throw new Error('Expected initial document')
        const document = initial.body.data
        const save = { path: document.path, selector: document.blocks[0]!.selector, expectedVersion: document.version, source: currentSource }
        const beforeReads = handles.length
        expect((await request('diagrams/revision?path=flow.mmd')).response.status).toBe(401)
        expect((await request('diagrams/revision?path=flow.mmd', { headers: { ...headers, Host: 'invalid.test' } })).response.status).toBe(403)
        expect((await request('diagrams/revision?path=flow.mmd', { headers: { ...headers, Origin: 'https://invalid.test' } })).response.status).toBe(403)
        expect((await request('diagrams/source', { method: 'PUT', headers: { ...headers, 'X-CSRF-Token': '' }, body: JSON.stringify(save) })).response.status).toBe(403)
        expect(handles.length).toBe(beforeReads)
        armed = true
        const overlapping = request<DiagramDocument | DocumentRevision>(`diagrams/${endpoint}?path=flow.mmd`, { headers })
        if (mechanism === 'service-save') {
          const held = await Promise.race([opened.promise, overlapping.then(() => {
            throw new Error('Read returned without reaching the descriptor gate')
          })])
          const before = await held.stat({ bigint: true })
          try {
            const put = await request<DiagramDocument>('diagrams/source', { method: 'PUT', headers, body: JSON.stringify(save) })
            expect(put.response.status).toBe(200)
            const after = await held.stat({ bigint: true })
            const current = await stat(path, { bigint: true })
            expect(before.nlink).toBe(1n)
            expect(after.nlink).toBe(0n)
            expect(current.ino).not.toBe(after.ino)
            events.push({ phase: 'successful-put-while-reader-held', device: String(current.dev), beforeInode: String(before.ino), heldInode: String(after.ino), heldLinks: String(after.nlink), currentInode: String(current.ino) })
          }
          finally { resume.resolve() }
        }
        const observed = await overlapping
        expect(observed.response.status).toBe(200)
        expect(observed.body.success).toBe(true)
        if (!observed.body.success)
          throw new Error('Expected stabilized read')
        expect(observed.body.data).toMatchObject({ path: 'flow.mmd', version: hash(currentSource) })
        if (endpoint === 'document')
          expect(observed.body.data).toMatchObject({ blocks: [{ source: currentSource }] })
        else
          expect(observed.body.data).toMatchObject({ state: 'present' })
        expect(handles.length - beforeReads).toBe(2)
        const stable = await request<DiagramDocument>('diagrams/document?path=flow.mmd', { headers })
        expect(stable.response.status).toBe(200)
        expect(stable.body).toMatchObject({ success: true, data: { version: hash(currentSource), blocks: [{ source: currentSource }] } })
        expect(await readFile(path, 'utf8')).toBe(currentSource)
        expect((await request('diagrams/source', { method: 'PUT', headers, body: JSON.stringify(save) })).response.status).toBe(409)
        expect(await readdir(root)).toEqual(['flow.mmd'])
        for (const handle of handles)
          await expect(handle.stat()).rejects.toMatchObject({ code: 'EBADF' })
        events.push({ phase: 'verified', completeContentHash: hash(currentSource), readHandlesClosed: handles.length, staleWriteRefused: true })
      }
      finally {
        resume.resolve()
        await app?.close()
        await server.stop(true)
        await removeFixture(root)
        events.push({ phase: 'cleanup', serverStopped: true, fixtureRemoved: true })
        process.stdout.write(`${JSON.stringify({ readConsistencyHttp: { mechanism, endpoint, events } })}\n`)
      }
    }, 15000)
  }
}
