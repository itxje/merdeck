import { parentDirectory, validPath } from '@/features/workspace/api'

export function resolveProjectLink(path: string, url: string): string | null {
  if (!/^(?:[^:/?#]+\/)*[^/?#]+\.(?:md|mmd|mermaid)(?:#.*)?$/i.test(url))
    return null
  const encoded = url.split('#', 1)[0] ?? ''
  if (/%(?:2f|5c|2e)/i.test(encoded))
    return null
  let target: string
  try {
    target = decodeURIComponent(encoded)
  }
  catch {
    return null
  }
  const normalized = parentDirectory(path).split('/').filter(Boolean)
  for (const part of target.split('/')) {
    if (!part || part === '.')
      continue
    if (part === '..') {
      if (!normalized.length)
        return null
      normalized.pop()
      continue
    }
    if (!validPath(part))
      return null
    normalized.push(part)
  }
  const result = normalized.join('/')
  return validPath(result) ? result : null
}
