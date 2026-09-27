import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 4173),
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/merdeck/Merdeck.html')
      return new Response(Bun.file(resolve(directory, 'Merdeck.html')), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    if (path === '/merdeck/Mobile-file-drawer.html')
      return new Response(Bun.file(resolve(directory, 'Mobile-file-drawer.html')), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    if (path === '/merdeck/Mobile-file-drawer-short-screen.html')
      return new Response(Bun.file(resolve(directory, 'Mobile-file-drawer-short-screen.html')), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
    if (path === '/')
      return new Response('<!doctype html><html lang="en"><title>Design previews</title><a href="/merdeck/Merdeck.html">Merdeck</a><a href="/merdeck/Mobile-file-drawer.html">Mobile file drawer</a><a href="/merdeck/Mobile-file-drawer-short-screen.html">Short-screen mobile file drawer</a></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    return new Response('Not found', { status: 404 })
  },
})
process.stdout.write(`Design preview listening on ${server.url}\n`)
