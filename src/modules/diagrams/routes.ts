import type { AppConfig } from '../../config'
import type { HttpEnvironment } from '../../shared/middleware/boundary'
import type { Sessions } from '../auth/sessions'
import type { DiagramService } from './service'
import { Hono } from 'hono'
import { z } from 'zod'
import { createEntryRequestSchema, deleteEntryRequestSchema, moveEntryRequestSchema, readDocumentRequestSchema, saveDiagramRequestSchema } from '../../shared/contracts'
import { AppError } from '../../shared/errors'
import { jsonInput, queryInput } from '../../shared/lib/http-input'
import { requireMutation, requireSession } from '../auth/routes'

// Entry requests carry at most two paths and a version.
const entryBodyLimit = 8192

export function diagramRoutes(config: AppConfig, diagrams: DiagramService, sessions: Sessions | undefined) {
  const router = new Hono<HttpEnvironment>()
  router.use('/diagrams/*', async (c, next) => {
    const session = requireSession(sessions, c.req.raw, c.get('origin'))
    const path = new URL(c.req.url).pathname
    const method = path.endsWith('/source') ? 'PUT' : /\/diagrams\/entries(?:\/move|\/delete)?$/.test(path) ? 'POST' : 'GET'
    if (c.req.method !== method) {
      c.header('Allow', method)
      throw new AppError('method_not_allowed')
    }
    if (method !== 'GET')
      requireMutation(c.req.raw, c.get('origin'), session)
    else if (c.req.raw.body || (c.req.header('content-length') && c.req.header('content-length') !== '0'))
      throw new AppError('invalid_request')
    await next()
  })
  router.get('/diagrams/tree', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    return c.json({ success: true as const, data: await diagrams.treeSnapshot() })
  })
  router.get('/diagrams/document', async (c) => {
    const { path } = queryInput(new URL(c.req.url), readDocumentRequestSchema)
    return c.json({ success: true as const, data: await diagrams.readDocument(path) })
  })
  router.get('/diagrams/revision', async (c) => {
    const { path } = queryInput(new URL(c.req.url), readDocumentRequestSchema)
    return c.json({ success: true as const, data: await diagrams.documentRevision(path) })
  })
  router.put('/diagrams/source', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const request = await jsonInput(c.req.raw, config.limits.maxFileBytes * 6 + 8192, saveDiagramRequestSchema)
    return c.json({ success: true as const, data: await diagrams.saveDiagram(request) })
  })
  router.post('/diagrams/entries', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const request = await jsonInput(c.req.raw, entryBodyLimit, createEntryRequestSchema)
    return c.json({ success: true as const, data: await diagrams.createEntry(request) })
  })
  router.post('/diagrams/entries/move', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const request = await jsonInput(c.req.raw, entryBodyLimit, moveEntryRequestSchema)
    return c.json({ success: true as const, data: await diagrams.moveEntry(request) })
  })
  router.post('/diagrams/entries/delete', async (c) => {
    queryInput(new URL(c.req.url), z.strictObject({}))
    const request = await jsonInput(c.req.raw, entryBodyLimit, deleteEntryRequestSchema)
    return c.json({ success: true as const, data: await diagrams.deleteEntry(request) })
  })
  return router
}
