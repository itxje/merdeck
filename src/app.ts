import type { AppConfig } from './config'
import type { AgentManager } from './modules/agents'
import type { DiagramService } from './modules/diagrams'
import type { BuildInfo } from './shared/build-info'
import type { ApplicationBuild, HealthStatus } from './shared/contracts'
import type { HttpEnvironment } from './shared/middleware/boundary'
import type { StaticAssets } from './shared/static-assets'
import { Hono } from 'hono'
import { z } from 'zod'
import { agentRoutes, createAgentManager } from './modules/agents'
import { authRoutes } from './modules/auth/routes'
import { Sessions } from './modules/auth/sessions'
import { diagramRoutes } from './modules/diagrams/routes'
import { buildPollIntervalMs, snapshotBuildAssets } from './shared/application-build'
import { developmentBuild } from './shared/build-info'
import { AppError, errorStatus, safeError } from './shared/errors'
import { queryInput } from './shared/lib/http-input'
import { boundary } from './shared/middleware/boundary'
import { staticResponse } from './shared/static-assets'

export interface AppServices {
  diagrams: DiagramService
  assets?: StaticAssets
  clock?: () => number
  buildInfo?: BuildInfo
  agents?: AgentManager
}

export function createApp(config: AppConfig, services: AppServices) {
  const app = new Hono<HttpEnvironment>()
  const api = new Hono<HttpEnvironment>()
  // Without an access token the service runs with open access and keeps no sessions.
  const sessions = config.token === undefined ? undefined : new Sessions(config, config.token, services.clock)
  const agents = services.agents ?? createAgentManager(config, services.clock)
  // The served interface is fixed for the life of the service, and so is its build identity.
  const build = config.apiBasePath === '/api' && services.assets ? snapshotBuildAssets(services.assets) : null
  let closed = false
  app.use('*', boundary(config))
  app.use('*', async (_, next) => {
    if (closed)
      throw new AppError('unavailable')
    await next()
  })
  api.all('/health', (c) => {
    if (c.req.method !== 'GET') {
      c.header('Allow', 'GET')
      throw new AppError('method_not_allowed')
    }
    queryInput(new URL(c.req.url), z.strictObject({}))
    return c.json({ success: true as const, data: { status: 'ok', service: 'merdeck' } satisfies HealthStatus })
  })
  api.all('/build', (c) => {
    if (c.req.method !== 'GET') {
      c.header('Allow', 'GET')
      throw new AppError('method_not_allowed')
    }
    queryInput(new URL(c.req.url), z.strictObject({}))
    return c.json({ success: true as const, data: { identity: build?.identity ?? null, pollIntervalMs: buildPollIntervalMs } satisfies ApplicationBuild })
  })
  api.route('/', authRoutes(config, services.diagrams, sessions, (services.buildInfo ?? developmentBuild).version, (id, origin) => agents.closePrincipal(id, origin)))
  api.route('/', agentRoutes(services.diagrams, sessions, agents))
  api.route('/', diagramRoutes(config, services.diagrams, sessions))
  app.route(config.apiBasePath, api)
  app.notFound((c) => {
    if (build) {
      const response = staticResponse(c.req.raw, build.assets)
      if (response)
        return c.newResponse(response.body, { status: 200, headers: response.headers })
    }
    return c.json({ success: false as const, error: new AppError('not_found').toResponse() }, 404)
  })
  app.onError((error, c) => {
    const safe = safeError(error)
    if (safe.code === 'rate_limited')
      c.header('Retry-After', '60')
    return c.json({ success: false as const, error: safe.toResponse() }, errorStatus[safe.code])
  })
  return Object.assign(app, { close: () => {
    closed = true
    sessions?.close()
    return Promise.all([agents.close(), services.diagrams.close()]).then(() => undefined)
  } })
}
