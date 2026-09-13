import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 4173),
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/merdeck/Directory-navigation.html')
      return new Response(Bun.file(resolve(directory, 'Directory-navigation.html')), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    if (path === '/')
      return new Response('<!doctype html><html lang="en"><title>Design previews</title><a href="/merdeck/Directory-navigation.html">Merdeck</a></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    return new Response('Not found', { status: 404 })
  },
})
process.stdout.write(`Design preview listening on ${server.url}\n`)
