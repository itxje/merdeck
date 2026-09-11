import type { MiddlewareHandler } from 'hono'
import type { AppConfig } from '../../config'
import { AppError } from '../errors'

export interface HttpEnvironment { Variables: { origin: string } }

export function boundary(config: AppConfig): MiddlewareHandler<HttpEnvironment> {
  return async (c, next) => {
    c.header('Cache-Control', 'no-store')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Referrer-Policy', 'no-referrer')
    c.header('X-Frame-Options', 'DENY')
    c.header('Cross-Origin-Resource-Policy', 'same-origin')
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    c.header('Content-Security-Policy', 'default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; object-src \'none\'; base-uri \'none\'; frame-ancestors \'none\'; form-action \'self\'')
    const request = c.req.raw
    const url = new URL(request.url)
    if (request.url.length > 8192 || [...request.headers].reduce((size, [key, value]) => size + key.length + value.length, 0) > 16384)
      throw new AppError('too_large')
    if (['GET', 'HEAD'].includes(request.method) && (request.body || request.headers.has('transfer-encoding') || (request.headers.has('content-length') && request.headers.get('content-length') !== '0')))
      throw new AppError('invalid_request')
    const host = request.headers.get('host') ?? url.host
    const origin = config.allowedOrigins.find(value => new URL(value).host === host)
    if (!origin || url.host !== host || url.username || url.password)
      throw new AppError('forbidden')
    const suppliedOrigin = request.headers.get('origin')
    if (suppliedOrigin !== null && suppliedOrigin !== origin)
      throw new AppError('forbidden')
    const site = request.headers.get('sec-fetch-site')
    if (site && site !== 'same-origin' && site !== 'none')
      throw new AppError('forbidden')
    if (request.headers.has('authorization'))
      throw new AppError('invalid_request')
    if (origin.startsWith('https:'))
      c.header('Strict-Transport-Security', 'max-age=31536000')
    c.set('origin', origin)
    await next()
  }
}

export function requireOrigin(request: Request, origin: string): void {
  if (request.headers.get('origin') !== origin)
    throw new AppError('forbidden')
}
