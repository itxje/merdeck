import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

async function main() {
  const root = resolve(import.meta.dirname, '../..')
  const scratch = resolve(root, 'tmp/mobile-drawer-design')
  await mkdir(scratch, { recursive: true })
  const target = process.env.MERDECK_MOBILE_DRAWER_DESIGN_URL
  assert.ok(target, 'MERDECK_MOBILE_DRAWER_DESIGN_URL must identify the HTTP prototype')
  const targetUrl = new URL(target)
  assert.equal(targetUrl.protocol, 'http:')
  assert.ok(targetUrl.hostname.endsWith('.localhost'))
  const fromWeb = createRequire(resolve(root, 'web/package.json'))
  const { chromium, expect } = await import(fromWeb.resolve('@playwright/test')) as typeof import('@playwright/test')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', reducedMotion: 'reduce' })
  const errors: string[] = []
  const requests: string[] = []
  const checks: string[] = []
  await context.route('**/*', (route) => {
    const requestUrl = new URL(route.request().url())
    if (requestUrl.origin === targetUrl.origin && requestUrl.pathname === targetUrl.pathname)
      return route.continue()
    requests.push(requestUrl.href)
    return route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push(message.text())
  })

  try {
    const response = await page.goto(target)
    assert.equal(response?.status(), 200)
    const drawer = page.getByRole('dialog', { name: 'Project files', exact: true })
    await expect(drawer).toBeVisible()
    await expect(page.getByText('No supported entries', { exact: true })).toBeVisible()
    const emptyBounds = await drawer.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return { bottom: bounds.bottom, height: bounds.height, viewportHeight: innerHeight }
    })
    assert.ok(emptyBounds.bottom >= emptyBounds.viewportHeight - 1, 'Empty drawer is not aligned with the viewport edge')
    assert.ok(emptyBounds.height <= emptyBounds.viewportHeight * 0.78 + 1, 'Empty drawer exceeds its bounded sheet height')
    assert.equal(await page.locator('.file-list > li:visible').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: resolve(scratch, 'empty.png'), fullPage: true, animations: 'disabled' })
    checks.push('390x844 empty sheet is bottom-aligned, bounded and has no hidden-list reservation')

    await page.getByRole('button', { name: 'Show populated state', exact: true }).click()
    await expect(page.locator('.file-list > li:visible')).toHaveCount(7)
    const filter = page.getByRole('searchbox', { name: 'Filter files', exact: true })
    await filter.fill('welcome')
    await expect(page.locator('.file-list > li:visible')).toHaveCount(1)
    await expect(page.locator('.file-list').getByRole('button', { name: 'welcome.mmd mmd', exact: true })).toBeVisible()
    await page.screenshot({ path: resolve(scratch, 'populated-filtered.png'), fullPage: true, animations: 'disabled' })
    checks.push('Populated state exposes file rows and the local filter narrows them without external resources')

    await filter.fill('')
    await expect(page.locator('.file-list > li:visible')).toHaveCount(7)
    await page.setViewportSize({ width: 315, height: 533 })
    const listing = page.getByRole('navigation', { name: 'Files and diagrams', exact: true })
    const shortMetrics = await listing.evaluate((node) => {
      const list = node as HTMLElement
      const first = list.querySelector<HTMLElement>('.file-row')!
      const listBox = list.getBoundingClientRect()
      const firstBox = first.getBoundingClientRect()
      return { clientHeight: list.clientHeight, scrollHeight: list.scrollHeight, listTop: listBox.top, listBottom: listBox.bottom, firstTop: firstBox.top, firstBottom: firstBox.bottom }
    })
    assert.ok(shortMetrics.clientHeight >= 88, 'Short drawer reserves fewer than two touch-target rows')
    assert.ok(shortMetrics.scrollHeight > shortMetrics.clientHeight, 'Short populated drawer does not scroll')
    assert.ok(shortMetrics.firstTop >= shortMetrics.listTop - 1 && shortMetrics.firstBottom <= shortMetrics.listBottom + 1, 'First short-screen row is clipped')
    await listing.evaluate((node) => {
      node.scrollTop = node.scrollHeight
    })
    const last = page.locator('.file-list > li').last()
    await expect(last).toBeVisible()
    const lastMetrics = await last.evaluate((row) => {
      const list = row.closest('.listing')!
      const listBox = list.getBoundingClientRect()
      const rowBox = row.getBoundingClientRect()
      return { listTop: listBox.top, listBottom: listBox.bottom, rowTop: rowBox.top, rowBottom: rowBox.bottom }
    })
    await writeFile(resolve(scratch, 'short-metrics.json'), `${JSON.stringify({ shortMetrics, lastMetrics }, null, 2)}\n`)
    await page.screenshot({ path: resolve(scratch, 'populated-short.png'), fullPage: true, animations: 'disabled' })
    assert.ok(lastMetrics.rowTop >= lastMetrics.listTop - 1 && lastMetrics.rowBottom <= lastMetrics.listBottom + 1, 'Later short-screen row is not reachable')
    await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeHidden()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    checks.push('315x533 populated sheet reserves two rows, reaches later rows and removes a disabled pagination control')

    await page.getByRole('button', { name: 'Close project files', exact: true }).click()
    await expect(page.locator('#file-drawer')).toBeHidden()
    const opener = page.getByRole('button', { name: 'Open project files', exact: true })
    await expect(opener).toBeFocused()
    await opener.click()
    await expect(drawer).toBeVisible()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    checks.push('Close and reopen preserve a reachable sheet trigger and narrow viewport containment')
    assert.deepEqual(errors, [])
    assert.deepEqual(requests, [])
    await writeFile(resolve(scratch, 'check-results.json'), `${JSON.stringify({ target, checks, errors, requests, viewports: ['390x844', '315x533'] }, null, 2)}\n`)
    process.stdout.write(`PASS ${checks.length} mobile drawer prototype groups at ${target}\n`)
  }
  finally {
    await writeFile(resolve(scratch, 'browser-diagnostics.json'), `${JSON.stringify({ errors, requests, checks }, null, 2)}\n`)
    await browser.close()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
