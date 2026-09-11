import type { StaticAssets } from './static-assets'
import { createHash } from 'node:crypto'

/** How often an open page compares the build it loaded with the deployed one. */
export const buildPollIntervalMs = 60000
const identityElement = /<meta name="merdeck-build" content="[a-f0-9]{64}">/g

/**
 * Identifies the complete frontend build from every resource path, content type and byte, after removing the
 * shell's own identity element. Returns copied assets whose shell carries that identity, so applying it again at
 * build time, when embedding or when the service starts yields the same identity and the same bytes.
 */
export function snapshotBuildAssets(input: StaticAssets) {
  const assets = new Map([...input].map(([path, asset]) => [path, { contentType: asset.contentType, body: new Uint8Array(asset.body) }]))
  const shell = assets.get('/index.html')
  if (!shell)
    throw new Error('Built page shell is missing')
  const html = new TextDecoder().decode(shell.body).replace(identityElement, '')
  shell.body = new TextEncoder().encode(html)
  const inventory = [...assets.keys()].sort().map(path => [path, assets.get(path)!.contentType, createHash('sha256').update(assets.get(path)!.body).digest('hex')])
  const identity = createHash('sha256').update(JSON.stringify(inventory)).digest('hex')
  const element = `<meta name="merdeck-build" content="${identity}">`
  shell.body = new TextEncoder().encode(html.includes('</head>') ? html.replace('</head>', `${element}</head>`) : `${element}${html}`)
  return { identity, assets }
}
