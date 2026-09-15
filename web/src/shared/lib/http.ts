import type { ApiError } from '../../../../src/shared/contracts'

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly retryAfterSeconds?: number) {
    super(message)
    this.name = 'HttpError'
  }
}
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  csrfToken?: string | undefined
  signal?: AbortSignal
}
function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string' && 'message' in value && typeof value.message === 'string'
}

export async function requestApi<T>(path: string, decode: (data: unknown) => T, options: RequestOptions = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('API paths must start with a single slash')
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined)
    headers.set('Content-Type', 'application/json')
  if (options.csrfToken)
    headers.set('X-CSRF-Token', options.csrfToken)
  const timeout = AbortSignal.timeout(10000)
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  })
  if (path.startsWith('/diagrams/document'))
    performance.mark('merdeck-markdown:api-response')
  const jsonStarted = performance.now()
  const result: unknown = await response.json()
  if (path.startsWith('/diagrams/document'))
    performance.measure('merdeck-markdown:api-json', { start: jsonStarted })
  if (typeof result !== 'object' || result === null || !('success' in result))
    throw new HttpError(response.status, 'invalid_response', 'The service returned an invalid response.')
  if (!response.ok || result.success !== true) {
    const error = 'error' in result && isApiError(result.error) ? result.error : { code: 'invalid_response', message: 'The request failed.' }
    const retry = response.headers.get('Retry-After') ?? ''
    const seconds = /^\d{1,3}$/.test(retry) && Number(retry) <= 300 ? Number(retry) : undefined
    throw new HttpError(response.status, error.code, error.message, seconds)
  }
  if (!('data' in result))
    throw new HttpError(response.status, 'invalid_response', 'The service returned an invalid response.')
  const decoded = decode(result.data)
  if (path.startsWith('/diagrams/document'))
    performance.measure('merdeck-markdown:api-decode', { start: jsonStarted })
  return decoded
}
