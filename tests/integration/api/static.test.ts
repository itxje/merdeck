import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { expect, test } from 'bun:test'
import { snapshotBuildAssets } from '../../../src/shared/application-build'
import { loadStaticAssets, staticResponse } from '../../../src/shared/static-assets'
import { createFixture, removeFixture } from '../files/fixtures'

test('built asset loader snapshots bytes and rejects symlinks, source files and missing shell', async () => {
  const root = await createFixture('files-api-static-')
  try {
    await expect(loadStaticAssets(root)).rejects.toThrow('shell')
    await writeFile(`${root}/index.html`, '<!doctype html><title>Page</title>')
    await mkdir(`${root}/assets`)
    await writeFile(`${root}/assets/app.js`, 'export {};')
    const assets = await loadStaticAssets(root)
    expect(assets.size).toBe(2)
    await writeFile(`${root}/assets/app.js`, 'changed')
    expect(new TextDecoder().decode(assets.get('/assets/app.js')!.body)).toBe('export {};')
    await symlink(`${root}/index.html`, `${root}/assets/escape.html`)
    await expect(loadStaticAssets(root)).rejects.toThrow('Unexpected built asset')
  }
  finally {
    await removeFixture(root)
  }
})

test('built asset loader refuses hidden configuration and unexpected directory trees', async () => {
  const root = await createFixture('files-api-static-')
  try {
    await writeFile(`${root}/index.html`, 'page')
    await writeFile(`${root}/.env`, 'private')
    await expect(loadStaticAssets(root)).rejects.toThrow('Invalid built asset name')
  }
  finally {
    await removeFixture(root)
  }
  const other = await createFixture('files-api-static-')
  try {
    await mkdir(`${other}/source`)
    await expect(loadStaticAssets(other)).rejects.toThrow('Unexpected built asset directory')
  }
  finally {
    await removeFixture(other)
  }
})

test('static response serves the root favicon and still refuses an unknown root path', async () => {
  const root = await createFixture('files-api-static-')
  try {
    await writeFile(`${root}/index.html`, '<!doctype html><title>Page</title>')
    await writeFile(`${root}/favicon.svg`, '<svg></svg>')
    const assets = await loadStaticAssets(root)
    const favicon = staticResponse(new Request('http://127.0.0.1/favicon.svg'), assets)
    expect(favicon?.status).toBe(200)
    expect(favicon?.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(await favicon?.text()).toBe('<svg></svg>')
    expect(staticResponse(new Request('http://127.0.0.1/robots.txt'), assets)).toBeUndefined()
  }
  finally {
    await removeFixture(root)
  }
})

test('the build identity covers every resource and is stable when applied again', () => {
  const bytes = (value: string) => new TextEncoder().encode(value)
  const original = new Map([
    ['/index.html', { body: bytes('<html><head></head><body>Page</body></html>'), contentType: 'text/html' }],
    ['/assets/app.js', { body: bytes('export {};'), contentType: 'text/javascript' }],
    ['/assets/app.css', { body: bytes(':root {color:black}'), contentType: 'text/css' }],
  ])
  const first = snapshotBuildAssets(original)
  expect(first.identity).toMatch(/^[a-f0-9]{64}$/)
  expect(new TextDecoder().decode(first.assets.get('/index.html')!.body)).toBe(`<html><head><meta name="merdeck-build" content="${first.identity}"></head><body>Page</body></html>`)
  expect(snapshotBuildAssets(first.assets)).toEqual(first)
  expect(snapshotBuildAssets(new Map([...original].reverse()))).toEqual(first)
  original.get('/assets/app.css')!.body.fill(65)
  expect(snapshotBuildAssets(original).identity).not.toBe(first.identity)
  expect(new TextDecoder().decode(first.assets.get('/assets/app.css')!.body)).toBe(':root {color:black}')
  original.set('/assets/lazy.js', { body: bytes('export const lazy = 1'), contentType: 'text/javascript' })
  expect(snapshotBuildAssets(original).identity).not.toBe(first.identity)
  const headless = snapshotBuildAssets(new Map([['/index.html', { body: bytes('<p>Page</p>'), contentType: 'text/html' }]]))
  expect(new TextDecoder().decode(headless.assets.get('/index.html')!.body)).toBe(`<meta name="merdeck-build" content="${headless.identity}"><p>Page</p>`)
  expect(() => snapshotBuildAssets(new Map())).toThrow('shell')
})
