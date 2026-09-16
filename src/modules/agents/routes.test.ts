import type { AgentProviderAdapter } from './types'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { createApp } from '../../app'
import { loadConfig } from '../../config'
import { createDiagramService } from '../diagrams'
import { AgentManager } from './manager'

const token = 'agent-route-test-token-with-32-characters'
const origin = 'http://127.0.0.1:8787'
const roots: string[] = []
const apps: Array<ReturnType<typeof createApp>> = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map(app => app.close()))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture() {
  const root = await mkdtemp('/tmp/merdeck-agent-route-')
  roots.push(root)
  await writeFile(join(root, 'flow.mmd'), 'flowchart LR\nA-->B\n')
  let closed = 0
  const adapter: AgentProviderAdapter = {
    id: 'codex',
    label: 'Fake agent',
    open: async ({ emit }) => ({
      startTurn: async () => {
        emit({ type: 'assistant.delta', text: '<script>inert</script>' })
        emit({ type: 'file.changed', path: 'flow.mmd', change: 'update' })
        emit({ type: 'turn.completed' })
      },
      approve: async () => {},
      cancel: async () => {},
      close: async () => { closed++ },
    }),
  }
  const config = await loadConfig({ MERDECK_ROOT: root, MERDECK_TOKEN: token })
  const agents = new AgentManager({ projectRoot: root, providers: [{ adapter, executable: '/fake' }] })
  const app = createApp(config, { diagrams: await createDiagramService(config), agents })
  apps.push(app)
  return { app, closed: () => closed }
}

async function login(app: ReturnType<typeof createApp>) {
  const response = await app.request(`${origin}/api/session`, {
    method: 'POST',
    headers: { 'Origin': origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await response.json() as { data: { csrfToken: string } }
  return { cookie: response.headers.get('set-cookie')!.split(';')[0]!, csrf: data.data.csrfToken }
}

function headers(session: Awaited<ReturnType<typeof login>>, mutation = false) {
  return {
    Cookie: session.cookie,
    ...(mutation ? { 'Origin': origin, 'X-CSRF-Token': session.csrf, 'Content-Type': 'application/json' } : {}),
  }
}

describe('agent HTTP boundary', () => {
  test('refuses every agent capability under open access', async () => {
    const root = await mkdtemp('/tmp/merdeck-agent-open-route-')
    roots.push(root)
    const adapter: AgentProviderAdapter = {
      id: 'codex',
      label: 'Injected agent',
      open: async () => ({ startTurn: async () => {}, approve: async () => {}, cancel: async () => {}, close: async () => {} }),
    }
    const config = await loadConfig({ MERDECK_ROOT: root })
    const agents = new AgentManager({ projectRoot: root, providers: [{ adapter, executable: '/fake' }] })
    const app = createApp(config, { diagrams: await createDiagramService(config), agents })
    apps.push(app)
    expect((await app.request(`${origin}/api/agents/capabilities`)).status).toBe(403)
  })

  test('requires a session and CSRF, validates bodies and isolates conversations', async () => {
    const { app } = await fixture()
    expect((await app.request(`${origin}/api/agents/capabilities`)).status).toBe(401)
    const first = await login(app)
    const capability = await app.request(`${origin}/api/agents/capabilities`, { headers: headers(first) })
    expect(await capability.json()).toEqual({ success: true, data: { enabled: true, providers: [{ id: 'codex', label: 'Fake agent', models: [{ id: 'default', label: 'Provider default', description: 'Use the model configured by the provider.', isDefault: true }] }] } })

    const refused = await app.request(`${origin}/api/agents/conversations`, {
      method: 'POST',
      headers: { 'Cookie': first.cookie, 'Origin': origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'codex', model: 'default' }),
    })
    expect(refused.status).toBe(403)

    const missingModel = await app.request(`${origin}/api/agents/conversations`, {
      method: 'POST',
      headers: headers(first, true),
      body: JSON.stringify({ provider: 'codex' }),
    })
    expect(missingModel.status).toBe(400)

    const mismatchedModel = await app.request(`${origin}/api/agents/conversations`, {
      method: 'POST',
      headers: headers(first, true),
      body: JSON.stringify({ provider: 'codex', model: 'unadvertised' }),
    })
    expect(mismatchedModel.status).toBe(400)

    const created = await app.request(`${origin}/api/agents/conversations`, {
      method: 'POST',
      headers: headers(first, true),
      body: JSON.stringify({ provider: 'codex', model: 'default' }),
    })
    expect(created.status).toBe(200)
    const conversation = (await created.json() as { data: { id: string } }).data

    const invalidApproval = await app.request(`${origin}/api/agents/conversations/${conversation.id}/approvals/not-an-opaque-id`, {
      method: 'POST',
      headers: headers(first, true),
      body: JSON.stringify({ decision: 'deny' }),
    })
    expect(invalidApproval.status).toBe(404)

    const invalidEventHeader = await app.request(`${origin}/api/agents/conversations/${conversation.id}/events`, {
      headers: { ...headers(first), 'Last-Event-ID': 'not-a-sequence' },
    })
    expect(invalidEventHeader.status).toBe(400)

    const wrongMethod = await app.request(`${origin}/api/agents/capabilities`, {
      method: 'PUT',
      headers: headers(first),
    })
    expect(wrongMethod.status).toBe(405)
    expect(wrongMethod.headers.get('allow')).toBe('GET')

    const invalid = await app.request(`${origin}/api/agents/conversations/${conversation.id}/turns`, {
      method: 'POST',
      headers: headers(first, true),
      body: JSON.stringify({ prompt: 'edit', path: '/etc/passwd' }),
    })
    expect(invalid.status).toBe(400)

    const second = await login(app)
    const isolated = await app.request(`${origin}/api/agents/conversations/${conversation.id}/cancel`, {
      method: 'POST',
      headers: headers(second, true),
      body: '{}',
    })
    expect(isolated.status).toBe(404)
  })

  test('streams normalized events and reaps the provider on logout', async () => {
    const { app, closed } = await fixture()
    const session = await login(app)
    const created = await app.request(`${origin}/api/agents/conversations`, {
      method: 'POST',
      headers: headers(session, true),
      body: JSON.stringify({ provider: 'codex', model: 'default' }),
    })
    const { id } = (await created.json() as { data: { id: string } }).data
    const turn = await app.request(`${origin}/api/agents/conversations/${id}/turns`, {
      method: 'POST',
      headers: headers(session, true),
      body: JSON.stringify({ prompt: 'Update the file' }),
    })
    expect(turn.status).toBe(200)

    const controller = new AbortController()
    const response = await app.request(new Request(`${origin}/api/agents/conversations/${id}/events`, { headers: headers(session), signal: controller.signal }))
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const reader = response.body!.getReader()
    let text = ''
    for (let index = 0; index < 10 && !text.includes('event: turn.completed'); index++) {
      const chunk = await reader.read()
      if (chunk.done)
        break
      text += new TextDecoder().decode(chunk.value)
    }
    controller.abort()
    expect(text).toContain('event: conversation.started')
    expect(text).toContain('event: assistant.delta')
    expect(text).toContain('"text":"<script>inert</script>"')
    expect(text).toContain('event: file.changed')
    expect(text).toContain('event: turn.completed')

    const logout = await app.request(`${origin}/api/session`, { method: 'DELETE', headers: { 'Cookie': session.cookie, 'Origin': origin, 'X-CSRF-Token': session.csrf } })
    expect(logout.status).toBe(200)
    expect(closed()).toBe(1)
  })
})
