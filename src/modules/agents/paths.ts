import type { RelativePath } from '../../shared/contracts'
import { randomBytes } from 'node:crypto'
import { isAbsolute, relative, resolve } from 'node:path'
import { relativePathSchema } from '../../shared/contracts'

export const opaqueId = () => randomBytes(24).toString('hex')

export function providerPath(projectRoot: string, value: unknown): RelativePath | undefined {
  if (typeof value !== 'string' || !value || value.includes('\0'))
    return undefined
  const absolute = isAbsolute(value) ? resolve(value) : resolve(projectRoot, value)
  const candidate = relative(projectRoot, absolute).split('\\').join('/')
  if (!candidate || candidate.startsWith('../') || isAbsolute(candidate))
    return undefined
  const parsed = relativePathSchema.safeParse(candidate)
  return parsed.success ? parsed.data : undefined
}

export function safeLabel(value: unknown, fallback: string, maximum = 500): string {
  if (typeof value !== 'string')
    return fallback
  // eslint-disable-next-line no-control-regex -- Provider strings are display-only and must stay on one inert line.
  const cleaned = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, maximum) : fallback
}
