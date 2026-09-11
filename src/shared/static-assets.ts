import { constants } from 'node:fs'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
import { join } from 'node:path'

export interface StaticAsset {
  body: Uint8Array
  contentType: string
}
export type StaticAssets = ReadonlyMap<string, StaticAsset>

const contentTypes: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  woff: 'font/woff',
  webp: 'image/webp',
}

// Load only trusted build output once. Requests never resolve filesystem paths.
// Compiled delivery can inject the same map directly from embedded bytes.
export async function loadStaticAssets(directory: string): Promise<StaticAssets> {
  const root = await realpath(directory)
  if (root !== directory || !(await lstat(root)).isDirectory())
    throw new Error('Invalid built asset directory')
  const assets = new Map<string, StaticAsset>()
  let bytes = 0
  const visit = async (relative: string, depth: number): Promise<void> => {
    if (depth > 8)
      throw new Error('Built asset nesting limit exceeded')
    for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
      if (!/^[\w.-]+$/.test(entry.name) || entry.name.startsWith('.'))
        throw new Error('Invalid built asset name')
      const path = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (!path.startsWith('assets'))
          throw new Error('Unexpected built asset directory')
        await visit(path, depth + 1)
        continue
      }
      const contentType = contentTypes[entry.name.split('.').at(-1)!]
      if (!entry.isFile() || !contentType || (path.endsWith('.html') && path !== 'index.html'))
        throw new Error('Unexpected built asset')
      const handle = await open(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
      try {
        const stat = await handle.stat()
        bytes += stat.size
        if (!stat.isFile() || assets.size >= 4096 || bytes > 64 * 1024 * 1024)
          throw new Error('Built asset size limit exceeded')
        assets.set(`/${path}`, { body: new Uint8Array(await handle.readFile()), contentType })
      }
      finally {
        await handle.close()
      }
    }
  }
  await visit('', 0)
  if (!assets.has('/index.html'))
    throw new Error('Built page shell is missing')
  return assets
}

export function staticResponse(request: Request, assets: StaticAssets): Response | undefined {
  const url = new URL(request.url)
  if (url.pathname === '/api' || url.pathname.startsWith('/api/'))
    return undefined
  // The current frontend has one route, with selection represented in its query.
  const shell = url.pathname === '/' || url.pathname === '/index.html'
  // The build emits one root-level brand icon beside the hashed asset directory.
  const icon = url.pathname === '/favicon.svg'
  if (!shell && !icon && (!url.pathname.startsWith('/assets/') || !/^\/assets\/[\w./-]+$/.test(url.pathname) || url.pathname.split('/').some(part => part.startsWith('.') || part === '..')))
    return undefined
  const asset = assets.get(shell ? '/index.html' : url.pathname)
  if (!asset || !['GET', 'HEAD'].includes(request.method))
    return undefined
  return new Response(request.method === 'HEAD' ? null : asset.body, {
    headers: { 'Content-Type': asset.contentType, 'Cache-Control': shell ? 'no-store' : 'public, max-age=3600' },
  })
}
