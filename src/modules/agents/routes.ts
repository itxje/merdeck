import type { AgentEvent } from '../../shared/contracts'
import type { HttpEnvironment } from '../../shared/middleware/boundary'
import type { Sessions } from '../auth/sessions'
import type { DiagramService } from '../diagrams'
import type { AgentManager, AgentPrincipal } from './manager'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { agentApprovalRequestSchema, agentOpaqueIdSchema, agentTurnRequestSchema, createAgentConversationRequestSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { jsonInput, queryInput } from '../../shared/lib/http-input'
import { requireMutation, requireSession } from '../auth/routes'

const emptyRequestSchema = z.strictObject({})
const eventQuerySchema = z.strictObject({ after: z.string().regex(/^\d{1,15}$/).transform(Number).pipe(z.number().safe().int().nonnegative()).default(0) })
const maximumQueuedEvents = 256

interface AgentRouteOptions {
  openAccessTtlMs: number
  clock?: () => number
}

function owner(session: ReturnType<typeof requireSession>, origin: string, openAccessExpiresAt: () => number): AgentPrincipal {
  return session
    ? { id: session.id, origin, expiresAt: session.expiresAt }
    : { id: 'open', origin, expiresAt: openAccessExpiresAt() }
}

function validateId(value: string | undefined): string {
  const parsed = agentOpaqueIdSchema.safeParse(value)
  if (!parsed.success)
    throw new AppError('not_found')
  return parsed.data
}

export function agentRoutes(diagrams: DiagramService, sessions: Sessions | undefined, agents: AgentManager, options: AgentRouteOptions) {
  const router = new Hono<HttpEnvironment>()
  const clock = options.clock ?? Date.now
  const principal = (request: Request, origin: string) => owner(requireSession(sessions, request, origin), origin, () => clock() + options.openAccessTtlMs)

  router.get('/agents/capabilities', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    principal(c.req.raw, c.get('origin'))
    return c.json({ success: true as const, data: await agents.capabilities() })
  })

  router.post('/agents/conversations', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    requireMutation(c.req.raw, c.get('origin'), session)
    const request = await jsonInput(c.req.raw, 4096, createAgentConversationRequestSchema)
    return c.json({ success: true as const, data: await agents.create(request.provider, request.model, owner(session, c.get('origin'), () => clock() + options.openAccessTtlMs)) })
  })

  router.post('/agents/conversations/:id/turns', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    requireMutation(c.req.raw, c.get('origin'), session)
    const request = await jsonInput(c.req.raw, 65536, agentTurnRequestSchema)
    if (!(await diagrams.storageStatus()).writable)
      throw new AppError('filesystem_unsupported')
    const id = validateId(c.req.param('id'))
    return c.json({ success: true as const, data: await agents.startTurn(id, owner(session, c.get('origin'), () => clock() + options.openAccessTtlMs), request.prompt) })
  })

  router.post('/agents/conversations/:id/approvals/:approvalId', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    requireMutation(c.req.raw, c.get('origin'), session)
    const request = await jsonInput(c.req.raw, 4096, agentApprovalRequestSchema)
    return c.json({ success: true as const, data: await agents.approve(
      validateId(c.req.param('id')),
      owner(session, c.get('origin'), () => clock() + options.openAccessTtlMs),
      validateId(c.req.param('approvalId')),
      request.decision,
    ) })
  })

  router.post('/agents/conversations/:id/cancel', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    requireMutation(c.req.raw, c.get('origin'), session)
    await jsonInput(c.req.raw, 256, emptyRequestSchema)
    return c.json({ success: true as const, data: await agents.cancel(validateId(c.req.param('id')), owner(session, c.get('origin'), () => clock() + options.openAccessTtlMs)) })
  })

  router.get('/agents/conversations/:id/events', (c) => {
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    const principal = owner(session, c.get('origin'), () => clock() + options.openAccessTtlMs)
    const query = queryInput(new URL(c.req.url), eventQuerySchema)
    const lastHeader = c.req.header('last-event-id')
    if (lastHeader !== undefined && !/^\d{1,15}$/.test(lastHeader))
      throw new AppError('invalid_request')
    const after = lastHeader === undefined ? query.after : Number(lastHeader)
    const queue: AgentEvent[] = []
    let ended = false
    let wake: (() => void) | undefined
    const subscription = agents.listen(validateId(c.req.param('id')), principal, after, (event) => {
      if (event && !ended && queue.length < maximumQueuedEvents)
        queue.push(event)
      else
        ended = true
      wake?.()
      wake = undefined
    })
    queue.push(...subscription.events)
    return streamSSE(c, async (stream) => {
      try {
        while (!c.req.raw.signal.aborted) {
          const event = queue.shift()
          if (event) {
            await stream.writeSSE({ id: String(event.id), event: event.type, data: JSON.stringify(event) })
            continue
          }
          if (ended)
            break
          let keepaliveTimer: ReturnType<typeof setTimeout> | undefined
          const activity = new Promise<'activity'>((resolve) => {
            wake = () => resolve('activity')
          })
          const keepalive = new Promise<'keepalive'>((resolve) => {
            keepaliveTimer = setTimeout(resolve, 15000, 'keepalive')
          })
          const next = await Promise.race([activity, keepalive])
          if (keepaliveTimer)
            clearTimeout(keepaliveTimer)
          if (next === 'keepalive' && !ended)
            await stream.writeSSE({ event: 'keepalive', data: '{}' })
        }
      }
      finally {
        subscription.unsubscribe()
      }
    })
  })

  router.all('/agents/*', (c) => {
    c.header('Allow', c.req.path.endsWith('/events') || c.req.path.endsWith('/capabilities') ? 'GET' : 'POST')
    throw new AppError('method_not_allowed')
  })

  return router
}
