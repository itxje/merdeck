import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, login, tableHeaderIsFramed, test } from './support'

const root = process.env.MERDECK_SMOKE_ROOT
if (!root)
  throw new Error('An explicit disposable sample root is required')

test('HTML preview stays inert, navigates safely, responds narrowly and preserves exact bytes', async ({ page }) => {
  test.setTimeout(90000)
  const id = randomUUID()
  const name = `html-document-${id}.html`
  const target = `html-target-${id}.htm`
  const path = join(root, name)
  const targetPath = join(root, target)
  const source = `\uFEFF<!doctype html>\r\n<html><head>\r\n<base href="https://bad.example/base/">\r\n<meta http-equiv="refresh" content="0;url=https://bad.example/refresh">\r\n<link rel="stylesheet" href="https://bad.example/style.css">\r\n<style>body { background: url(https://bad.example/css); } h1 { display:none }</style>\r\n<script>window.htmlPwned = true</script>\r\n</head><body>\r\n<h1 id="top" class="danger" style="display:none" onclick="window.htmlPwned=true">Safe HTML title &amp; entities</h1>\r\n<p>Readable <strong>semantic</strong> content.</p>\r\n<table><caption>Safe table</caption><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>prose</td><td>2</td></tr></tbody></table>\r\n<a href="#top">Top</a> <a href="./${target}">Project target</a> <a href="https://example.test/safe">External</a> <a href="javascript:window.htmlPwned=true">Unsafe</a>\r\n<img src="https://bad.example/image.png" srcset="https://bad.example/image-2x.png 2x" onerror="window.htmlPwned=true" alt="Remote chart">\r\n<picture><source srcset="https://bad.example/picture.png"><img src="https://bad.example/fallback.png"></picture>\r\n<video poster="https://bad.example/poster.png" src="https://bad.example/video.mp4"></video>\r\n<form action="https://bad.example/form"><label>Name <input autofocus name="name"></label><button formaction="https://bad.example/submit">Submit label</button></form>\r\n<iframe src="https://bad.example/frame">hidden fallback</iframe><object data="https://bad.example/object">hidden fallback</object><embed src="https://bad.example/embed">\r\n<svg onload="window.htmlPwned=true"><script>window.htmlPwned=true</script><text>foreign svg</text></svg><math><mtext>foreign math</mtext></math>\r\n<custom-element data-secret="x">Safe custom child</custom-element>\r\n</body></html>\r\n`
  const targetSource = '<!doctype html>\n<h1>Linked HTML target</h1>\n'
  await writeFile(path, source, { flag: 'wx' })
  await writeFile(targetPath, targetSource, { flag: 'wx' })
  const original = await readFile(path)
  const requested: string[] = []
  page.on('request', request => requested.push(request.url()))
  try {
    await page.setViewportSize({ width: 1440, height: 920 })
    await login(page)
    await page.getByRole('button', { name: 'Refresh files', exact: true }).click()
    await page.getByRole('button', { name, exact: true }).click()
    const article = page.getByRole('article', { name: 'HTML document', exact: true })
    await expect(article.getByRole('heading', { name: 'Safe HTML title & entities', exact: true })).toBeVisible()
    await expect(article).toContainText('Readable semantic content.')
    await expect(article).toContainText('Safe custom child')
    const table = article.getByRole('table', { name: 'Safe table', exact: true })
    await expect(table).toBeVisible()
    expect(await tableHeaderIsFramed(table)).toBe(true)
    await expect(article).toContainText('Image: Remote chart')
    await expect(article).toContainText('Media: media')
    await expect(article).toContainText('Submit label')
    await expect(article.locator('script, style, img, iframe, object, embed, form, input, select, textarea, svg, math, custom-element')).toHaveCount(0)
    expect(await page.evaluate(() => Reflect.has(window, 'htmlPwned'))).toBe(false)
    await expect(article.getByRole('link', { name: 'External', exact: true })).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(article.getByRole('link', { name: 'Unsafe', exact: true })).toHaveCount(0)
    await expect(article.getByRole('button', { name: 'Unsafe', exact: true })).toHaveCount(0)
    await article.getByRole('button', { name: 'Top', exact: true }).click()
    await article.getByRole('button', { name: 'Project target', exact: true }).click()
    await expect(page.getByRole('article', { name: 'HTML document', exact: true })).toContainText('Linked HTML target')
    await page.getByRole('button', { name, exact: true }).click()
    await expect(article).toContainText('Safe HTML title')

    const response = await page.request.get(`/api/diagrams/document?path=${encodeURIComponent(name)}`)
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.data).toMatchObject({ kind: 'html', path: name, text: source.slice(1), blocks: [] })
    expect(await readFile(path)).toEqual(original)
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Mermaid source', { exact: true })).toHaveCount(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(article).toContainText('Safe HTML title')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
    await expect(page.locator('html')).toHaveClass('dark')
    expect(await tableHeaderIsFramed(table)).toBe(true)
    await expect(article.getByRole('heading', { name: 'Safe HTML title & entities', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.reload()
    await expect(page.getByRole('article', { name: 'HTML document', exact: true })).toContainText('Safe HTML title')
    expect(await readFile(path)).toEqual(original)
    expect(requested.some(url => url.includes('bad.example'))).toBe(false)
    expect(requested.some(url => url.includes('example.test/safe'))).toBe(false)
  }
  finally {
    await rm(path, { force: true })
    await rm(targetPath, { force: true })
  }
})
