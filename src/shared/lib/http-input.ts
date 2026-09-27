import type { z } from 'zod'
import { AppError } from '../errors'

export function queryInput<T>(url: URL, schema: z.ZodType<T>): T {
  const values: Record<string, string> = Object.create(null)
  for (const pair of url.search.slice(1).split('&').filter(Boolean)) {
    const parts = pair.split('=')
    if (parts.length !== 2)
      throw new AppError('invalid_request')
    let key: string
    let value: string
    try {
      key = decodeURIComponent(parts[0]!.replaceAll('+', ' '))
      value = decodeURIComponent(parts[1]!.replaceAll('+', ' '))
    }
    catch {
      throw new AppError('invalid_request')
    }
    if (Object.hasOwn(values, key))
      throw new AppError('invalid_request')
    values[key] = value
  }
  const result = schema.safeParse(values)
  if (!result.success)
    throw new AppError('invalid_request')
  return result.data
}

function rejectDuplicateKeys(text: string): void {
  const stack: (Set<string> | null)[] = []
  for (const token of text.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}[\]:,]/g)) {
    const value = token[0]
    if (value === '{') {
      stack.push(new Set())
    }
    else if (value === '[') {
      stack.push(null)
    }
    else if (value === '}' || value === ']') {
      stack.pop()
    }
    else if (value.startsWith('"') && /^\s*:/.test(text.slice(token.index + value.length))) {
      const keys = stack.at(-1)
      const key: unknown = JSON.parse(value)
      if (!keys || typeof key !== 'string' || keys.has(key))
        throw new AppError('invalid_request')
      keys.add(key)
    }
  }
}

export async function jsonInput<T>(request: Request, maximum: number, schema: z.ZodType<T>): Promise<T> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '') || request.headers.has('content-encoding'))
    throw new AppError('unsupported_media_type')
  const declared = request.headers.get('content-length')
  if (declared !== null && !/^(?:0|[1-9]\d*)$/.test(declared))
    throw new AppError('invalid_request')
  if (declared !== null && Number(declared) > maximum)
    throw new AppError('too_large')
  const reader = request.body?.getReader()
  if (!reader)
    throw new AppError('invalid_request')
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const read = async () => {
      const chunks: Uint8Array[] = []
      let length = 0
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done)
          break
        length += chunk.value.length
        if (length > maximum)
          throw new AppError('too_large')
        chunks.push(chunk.value)
      }
      if (declared !== null && length !== Number(declared))
        throw new AppError('invalid_request')
      const bytes = new Uint8Array(length)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      const value: unknown = JSON.parse(text)
      rejectDuplicateKeys(text)
      const result = schema.safeParse(value)
      if (!result.success)
        throw new AppError('invalid_request')
      return result.data
    }
    return await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new AppError('invalid_request'))
        }, 10000)
      }),
    ])
  }
  catch (error) {
    throw error instanceof AppError ? error : new AppError('invalid_request')
  }
  finally {
    clearTimeout(timeout)
    // Cancellation is best effort; a hostile stream must not extend the deadline.
    void reader.cancel().catch(() => {})
  }
}
