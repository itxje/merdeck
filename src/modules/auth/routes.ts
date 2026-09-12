import type { AppConfig } from '../../config'
import type { SessionStatus } from '../../shared/contracts'
import type { HttpEnvironment } from '../../shared/middleware/boundary'
import type { DiagramService } from '../diagrams'
import type { Session, Sessions } from './sessions'
import { Hono } from 'hono'
import { z } from 'zod'
import { loginRequestSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { jsonInput, queryInput } from '../../shared/lib/http-input'
import { requireOrigin } from '../../shared/middleware/boundary'
import { secretEqual, sessionCookie } from './sessions'

/** Without `sessions` the service runs with open access, so there is no session to require. */
export function requireSession(sessions: Sessions | undefined, request: Request, origin: string): Session | undefined {
  if (!sessions)
    return undefined
  const session = sessions.get(request, origin)
  if (!session)
    throw new AppError('unauthorized')
  return session
}

export function requireMutation(request: Request, origin: string, session: Session | undefined): void {
  requireOrigin(request, origin)
  // Open access has no ambient credential for a forged request to borrow; the Host, Origin and fetch metadata checks remain.
  if (!session)
    return
  const csrf = request.headers.get('x-csrf-token') ?? ''
  if (!/^[a-f0-9]{64}$/.test(csrf) || !secretEqual(csrf, session.csrfToken))
    throw new AppError('forbidden')
}

function cookie(config: AppConfig, value = ''): string {
  const secure = config.secureCookie ? '; Secure' : ''
  return `${sessionCookie}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${value ? config.limits.sessionTtlSeconds : 0}${secure}`
}

export function authRoutes(config: AppConfig, diagrams: DiagramService, sessions: Sessions | undefined, version: string) {
  const router = new Hono<HttpEnvironment>()
  const methods = sessions ? ['GET', 'POST', 'DELETE'] : ['GET']
  const status = async (session?: Session): Promise<SessionStatus> => {
    const { writable, identity, filesystemType, supportedFilesystem } = await diagrams.storageStatus()
    const capabilities = { version, pollIntervalMs: config.limits.pollIntervalMs, maxSourceBytes: config.limits.maxFileBytes, storage: { writable, identity, filesystemType, supportedFilesystem } }
    return session
      ? { authenticated: true, access: 'token', csrfToken: session.csrfToken, expiresAt: new Date(session.expiresAt).toISOString(), ...capabilities }
      : { authenticated: true, access: 'open', ...capabilities }
  }
  router.use('/session', async (c, next) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    if (!methods.includes(c.req.method)) {
      c.header('Allow', methods.join(', '))
      throw new AppError('method_not_allowed')
    }
    if (c.req.method !== 'POST' && (c.req.raw.body || (c.req.header('content-length') && c.req.header('content-length') !== '0')))
      throw new AppError('invalid_request')
    await next()
  })
  router.get('/session', async (c) => {
    if (!sessions)
      return c.json({ success: true as const, data: await status() })
    const session = sessions.get(c.req.raw, c.get('origin'))
    return c.json({ success: true as const, data: session ? await status(session) : { authenticated: false as const } })
  })
  // Open access has nothing to sign in to or out of.
  if (!sessions)
    return router
  router.post('/session', async (c) => {
    requireOrigin(c.req.raw, c.get('origin'))
    sessions.attempt()
    const { token } = await jsonInput(c.req.raw, 4096, loginRequestSchema)
    const old = sessions.get(c.req.raw, c.get('origin'))
    const session = sessions.create(token, c.get('origin'))
    try {
      const data = await status(session)
      sessions.remove(old)
      c.header('Set-Cookie', cookie(config, sessions.cookieValue(session)))
      return c.json({ success: true as const, data })
    }
    catch (error) {
      sessions.remove(session)
      throw error
    }
  })
  router.delete('/session', (c) => {
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    requireMutation(c.req.raw, c.get('origin'), session)
    sessions.remove(session)
    c.header('Set-Cookie', cookie(config))
    return c.json({ success: true as const, data: { authenticated: false as const } })
  })
  return router
}
