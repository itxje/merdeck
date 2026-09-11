import type { Page } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

async function main() {
  const directory = dirname(fileURLToPath(import.meta.url))
  const root = resolve(directory, '../..')
  const scratch = resolve(root, 'tmp/design')
  await mkdir(scratch, { recursive: true })
  const html = await readFile(resolve(directory, 'Merdeck.html'), 'utf8')
  const metadata = JSON.parse(await readFile(resolve(directory, '_d_meta.json'), 'utf8')) as {
    type: string
    designSystems: unknown[]
    primaryDesignSystem: null
    assets: Record<string, { versions: { path: string, status: string }[] }>
  }
  assert.equal(metadata.type, 'design')
  assert.deepEqual(metadata.designSystems, [])
  assert.equal(metadata.primaryDesignSystem, null)
  const assets = Object.values(metadata.assets).flatMap(asset => asset.versions)
  assert.deepEqual(assets.map(asset => asset.path).sort(), ['Merdeck.html', 'brand.html'])
  const expectedStatus: Record<string, string> = { 'Merdeck.html': 'needs-review', 'brand.html': 'approved' }
  for (const asset of assets)
    assert.equal(asset.status, expectedStatus[asset.path], `${asset.path} must stay ${expectedStatus[asset.path]}`)
  const brand = await readFile(resolve(directory, 'brand.html'), 'utf8')
  assert.equal((brand.match(/<script/gi) ?? []).length, 0, 'Brand sheet carries script')
  assert.ok(!/\b(?:src|href)\s*=\s*["'](?!#|data:)/i.test(brand), 'Brand sheet references an external resource')
  assert.ok(!/@import\s/.test(brand), 'Brand sheet imports an external stylesheet')
  for (const match of brand.matchAll(/url\(["']?([^)'"\s]+)/g))
    assert.match(match[1] ?? '', /^(?:data:|#)/, 'External brand-sheet resource')
  const envelope = html.replace(/<script>[\s\S]*<\/script>/, '<script></script>')
  assert.equal((envelope.match(/<script>/g) ?? []).length, 1)
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1)
  assert.equal((envelope.match(/<style>/g) ?? []).length, 1)
  const embeddedCss = html.split('<style>')[1]?.split('</style>')[0] ?? ''
  assert.ok(embeddedCss.length > 1000)
  assert.ok(!/@import\s/.test(embeddedCss), 'Unbundled stylesheet import')
  for (const match of embeddedCss.matchAll(/url\(["']?([^)'"\s]+)/g))
    assert.match(match[1] ?? '', /^(?:data:|#)/, 'External CSS resource')

  process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(root, '.cache/playwright')
  const fromWeb = createRequire(resolve(root, 'web/package.json'))
  const { chromium, expect } = await import(fromWeb.resolve('@playwright/test')) as typeof import('@playwright/test')
  const browser = await chromium.launch({ headless: true })
  const consoleErrors: string[] = []
  const externalRequests: string[] = []
  const checks: string[] = ['Single inline script/style, no CSS imports or external assets; metadata at Merdeck.html=needs-review, brand.html=approved, without fabricated system bindings']
  const target = process.env.MERDECK_DESIGN_URL ?? pathToFileURL(resolve(directory, 'Merdeck.html')).href
  const targetUrl = new URL(target)
  assert.ok(targetUrl.protocol === 'file:' || (targetUrl.protocol === 'http:' && targetUrl.hostname.endsWith('.localhost')), 'Use a local design preview URL')
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'light', reducedMotion: 'reduce' })
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.protocol === 'file:' || url.protocol === 'data:' || (url.origin === targetUrl.origin && url.pathname === targetUrl.pathname))
      return route.continue()
    externalRequests.push(url.href)
    return route.abort()
  })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error')
      consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

  async function rendered() {
    await expect(page.getByText('Live preview', { exact: true })).toBeVisible()
    await expect(page.locator('.diagram-graphic svg')).toBeVisible()
    assert.ok(await page.locator('.diagram-graphic svg').evaluate((element) => {
      const svg = element as SVGSVGElement
      const content = svg.getBBox()
      const box = svg.viewBox.baseVal
      return content.x >= box.x && content.y >= box.y && content.x + content.width <= box.x + box.width && content.y + content.height <= box.y + box.height
    }), 'Diagram content is cropped by its SVG viewBox')
  }
  async function reviewScenario(name: string) {
    await page.getByRole('button', { name: 'Prototype review', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name, exact: true }).click()
  }
  async function screenshot(name: string) {
    const dialog = page.getByRole('dialog')
    if (await dialog.count())
      await expect(dialog).toHaveCSS('opacity', '1')
    await page.screenshot({ path: resolve(scratch, name), fullPage: true, animations: 'disabled' })
  }
  async function noOverflow(subject: Page) {
    assert.ok(await subject.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows horizontally')
  }

  try {
    await page.goto(target)
    await rendered()
    await noOverflow(page)
    await expect(page.locator('.diagram-graphic')).toContainText('Project files')
    await screenshot('desktop-light.png')
    checks.push('1440x960 desktop: project tree, source, live SVG, no horizontal page overflow')
    const source = page.getByRole('textbox', { name: 'Mermaid source' })
    const original = await source.inputValue()
    await page.getByRole('tab', { name: '2. Edit lifecycle' }).click()
    await rendered()
    await expect(source).toHaveValue(/stateDiagram-v2/)
    await page.getByRole('tab', { name: '1. Diagram pipeline' }).click()
    await rendered()
    await source.fill(original.replace('Project files', 'Scoped project files'))
    await rendered()
    await expect(page.locator('.diagram-graphic')).toContainText('Scoped project files')
    await expect(page.getByText('Unsaved', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'sequence.mermaid', exact: true }).click()
    await rendered()
    await expect(source).toHaveValue(/sequenceDiagram/)
    await page.getByRole('button', { name: /01Diagram pipeline|01 Diagram pipeline/ }).click()
    await rendered()
    await expect(source).toHaveValue(/Scoped project files/)
    await source.fill('flowchart TD\n    A --> [')
    await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
    await expect(page.getByText('Last valid preview', { exact: true })).toBeVisible()
    await expect(page.locator('.diagram-graphic')).toContainText('Scoped project files')
    await expect(source).toHaveAttribute('aria-invalid', 'true')
    await screenshot('syntax-error.png')
    await source.fill(original.replace('Project files', 'Reviewed project files'))
    await rendered()
    await source.press('Control+s')
    await expect(page.getByText('Saving…', { exact: true })).toBeVisible()
    await source.fill(original.replace('Project files', 'Newer draft'))
    await expect(page.getByText('Unsaved', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.locator('.status-bar')).toContainText('Saved just now')
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    checks.push('Markdown block/standalone selection, independent drafts, live edit, syntax error/stale preview, keyboard save, typing during save remains dirty')

    await source.fill(original.replace('Project files', 'Keep this draft'))
    await rendered()
    await reviewScenario('Simulate external change')
    await expect(page.getByText('This file changed outside the editor. Your draft is safe.')).toBeVisible()
    await page.getByRole('button', { name: /^Save/ }).click()
    await expect(page.getByRole('dialog')).toContainText('Keep this draft')
    await screenshot('conflict.png')
    await page.getByRole('button', { name: 'Keep draft', exact: true }).click()
    await expect(source).toHaveValue(/Keep this draft/)
    await page.getByRole('button', { name: 'Review change', exact: true }).click()
    await page.getByRole('button', { name: 'Discard draft and load file', exact: true }).click()
    await expect(source).toHaveValue(/Updated outside this editor/)
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    checks.push('External-change banner and conflict dialog preserve draft; explicit discard loads simulated file snapshot')

    await rendered()
    const beforeZoom = await page.getByLabel('Zoom level').textContent()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    assert.notEqual(await page.getByLabel('Zoom level').textContent(), beforeZoom)
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
    await page.getByRole('button', { name: 'Fit', exact: true }).click()
    await expect(page.getByLabel('Zoom level')).toHaveText(beforeZoom ?? '')
    await page.getByRole('button', { name: 'Prototype review', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Dark', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).toHaveClass('dark')
    await rendered()
    await screenshot('desktop-dark.png')
    await page.getByRole('button', { name: 'Prototype review', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'System', exact: true }).click()
    await page.keyboard.press('Escape')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass('dark')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).not.toHaveClass('dark')
    checks.push('Zoom in/out/fit, light/dark/system and live OS preference change')

    await page.getByRole('button', { name: 'README.md', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'No Mermaid blocks' })).toBeVisible()
    for (const [name, heading] of [['Loading', 'Opening project…'], ['Empty project', 'No diagrams here yet'], ['No selection', 'Choose a diagram'], ['Session expired', 'Your session has expired']]) {
      assert.ok(name && heading)
      await reviewScenario(name)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: 'Reconnect to project', exact: true }).click()
    await rendered()
    await reviewScenario('Disconnected')
    await expect(page.getByText('Connection lost. Your draft is kept here until you reconnect.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Reconnect', exact: true }).click()
    await reviewScenario('File deleted')
    await expect(page.getByText('This file was deleted. Your draft is kept here; saving is unavailable.')).toBeVisible()
    await page.getByRole('button', { name: 'Restore preview', exact: true }).click()
    checks.push('No-block, loading, empty project, no selection, session expiry, disconnection and deletion review states')

    await source.fill('flowchart TD\n A[<img src="https://example.invalid/x" onerror="alert(1)">]')
    await expect(page.getByText('Unable to render', { exact: true })).toBeVisible()
    assert.equal(await page.locator('.diagram-graphic script, .diagram-graphic foreignObject, .diagram-graphic image, .diagram-graphic a').count(), 0)
    await source.fill(original)
    await rendered()
    checks.push('Hostile HTML/resource source rejected; sanitized preview has no executable/link/image elements')

    await page.setViewportSize({ width: 390, height: 844 })
    await noOverflow(page)
    await page.getByRole('tab', { name: 'Preview', exact: true }).click()
    await rendered()
    await screenshot('narrow-preview.png')
    await page.getByRole('tab', { name: 'Source', exact: true }).click()
    await expect(source).toBeVisible()
    await source.fill(original.replace('Project files', 'Narrow draft'))
    await screenshot('narrow-source.png')
    await page.getByRole('button', { name: 'Open project files', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await screenshot('narrow-files.png')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open project files', exact: true })).toBeFocused()
    assert.ok(await page.getByRole('button', { name: 'Open project files', exact: true }).evaluate(element => getComputedStyle(element).boxShadow !== 'none'), 'Missing visible focus ring')
    await page.getByRole('button', { name: 'Open project files', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'welcome.mmd', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('tab', { name: 'Preview', exact: true }).click()
    await rendered()
    await noOverflow(page)
    checks.push('390x844 narrow pane switching, source editing, file drawer selection, Escape and focus restoration with visible focus ring')

    const resources = await page.evaluate(() => ({
      scripts: [...document.scripts].map(script => script.src).filter(Boolean),
      styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href')),
      requests: performance.getEntriesByType('resource').map(resource => resource.name),
    }))
    assert.deepEqual(resources.scripts, [])
    assert.deepEqual(resources.styles, [])
    assert.equal(externalRequests.length, 0, externalRequests.join('\n'))
    assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'))
    const offline = await browser.newContext({ offline: true, viewport: { width: 1440, height: 960 } })
    const offlinePage = await offline.newPage()
    offlinePage.on('pageerror', error => consoleErrors.push(error.message))
    offlinePage.on('console', (message) => {
      if (message.type() === 'error')
        consoleErrors.push(message.text())
    })
    await offlinePage.goto(pathToFileURL(resolve(directory, 'Merdeck.html')).href)
    await expect(offlinePage.locator('.diagram-graphic svg')).toBeVisible()
    await expect(offlinePage.getByText('Live preview', { exact: true })).toBeVisible()
    await offlinePage.getByRole('textbox', { name: 'Mermaid source' }).fill('flowchart LR\n Offline --> Works')
    await expect(offlinePage.locator('.diagram-graphic')).toContainText('Works')
    assert.equal(consoleErrors.length, 0, consoleErrors.join('\n'))
    await offline.close()
    checks.push('All external requests blocked during primary browser checks; standalone file opens and re-renders fully offline; zero console/runtime errors')
    await writeFile(resolve(scratch, 'check-results.json'), `${JSON.stringify({ status: 'passed', url: target, scope: targetUrl.protocol === 'file:' ? 'Offline export verification only' : 'Local-machine .localhost preview only', checks, consoleErrors, externalRequests, resources }, null, 2)}\n`)
    process.stdout.write(`${checks.join('\n')}\nPASS: ${checks.length} verification groups\n`)
  }
  catch (error) {
    await page.screenshot({ path: resolve(scratch, 'failure.png'), fullPage: true })
    await writeFile(resolve(scratch, 'failure.txt'), `${await page.locator('body').textContent()}\n${JSON.stringify(consoleErrors)}`)
    throw error
  }
  finally {
    await browser.close()
  }
}
main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
